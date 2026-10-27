"""Shared style, narration sync and drawing helpers for every chapter."""

from __future__ import annotations

import json
from contextlib import contextmanager
from pathlib import Path

import numpy as np
from manim import *  # noqa: F401,F403  (scenes import everything from here)

import tts

ROOT = Path(__file__).resolve().parent
TIMINGS = ROOT / "build" / "timings"

# ---------------------------------------------------------------- palette
BG = "#0e1116"
INK = "#ece6d8"          # main text
MUTED = "#8b929c"
QBLUE = "#58c4dd"        # qubits / quantum things
QYELLOW = "#ffd25a"      # highlights, phases
QGREEN = "#83c167"       # correct / pass
QRED = "#fc6255"         # wrong / fail / cost
QPURPLE = "#b07cf0"      # classical bits / records
QORANGE = "#ff9f43"      # Toffolis / expensive

GAP = 0.35               # silence after each narration line (s)

config.background_color = BG


def T(text, size=32, color=INK, **kw):
    """Plain text in the video's font."""
    return Text(text, font_size=size, color=color, **kw)


def fit(mob, width):
    """Shrink a mobject to at most `width` wide."""
    if mob.width > width:
        mob.scale_to_fit_width(width)
    return mob


def M(tex, size=40, color=INK, **kw):
    return MathTex(tex, font_size=size, color=color, **kw)


def ket(label, size=40, color=INK):
    return MathTex(r"|" + label + r"\rangle", font_size=size, color=color)


class Beat:
    """Handle returned by VScene.say: the narration's duration and helpers."""

    def __init__(self, scene, duration, start):
        self.scene, self.duration, self.start = scene, duration, start

    def rt(self, frac):
        return max(0.2, self.duration * frac)

    def left(self):
        return self.start + self.duration - self.scene.renderer.time


class VScene(Scene):
    """A scene whose animations are paced by narration lines."""

    def setup(self):
        self.camera.background_color = BG
        self._log = []

    @contextmanager
    def say(self, text):
        path, dur = tts.synth(text)
        start = self.renderer.time
        self.add_sound(str(path))
        beat = Beat(self, dur, start)
        yield beat
        remaining = start + dur + GAP - self.renderer.time
        if remaining > 1 / 30:
            self.wait(remaining)
        self._log.append({"start": start, "duration": dur, "text": " ".join(text.split())})

    def narrate(self, text, *anims, frac=0.6):
        """One line of narration while `anims` play for `frac` of it."""
        with self.say(text) as b:
            if anims:
                self.play(*anims, run_time=b.rt(frac))

    def clear_all(self, run_time=0.8):
        if self.mobjects:
            self.play(*[FadeOut(m) for m in self.mobjects], run_time=run_time)

    def tear_down(self):
        TIMINGS.mkdir(parents=True, exist_ok=True)
        (TIMINGS / f"{type(self).__name__}.json").write_text(
            json.dumps({"total": self.renderer.time, "lines": self._log}, indent=1)
        )


def chapter_card(scene, number, title, subtitle=""):
    num = T(f"Chapter {number}", 30, MUTED)
    ttl = T(title, 56, INK, weight=BOLD)
    grp = VGroup(num, ttl).arrange(DOWN, buff=0.35)
    if subtitle:
        grp.add(T(subtitle, 28, QBLUE))
        grp.arrange(DOWN, buff=0.35)
    line = Line(LEFT * 4, RIGHT * 4, color=QBLUE, stroke_width=2).next_to(ttl, DOWN, 0.2)
    scene.play(FadeIn(num, shift=UP * 0.2), Write(ttl), Create(line), run_time=1.5)
    if subtitle:
        scene.play(FadeIn(grp[2]), run_time=0.6)
    scene.wait(1.2)
    scene.play(FadeOut(grp), FadeOut(line), run_time=0.7)


def title_bar(text, color=INK):
    t = fit(T(text, 34, color, weight=BOLD), 13).to_edge(UP, buff=0.35)
    return t


# ---------------------------------------------------------------- bits and registers
class BitRow(VGroup):
    """A row of boxed bits, bits[0] drawn at the right (little-endian)."""

    def __init__(self, bits, size=0.5, color=QPURPLE, font=28, label=None):
        super().__init__()
        self.size, self.color, self.font = size, color, font
        self.cells = VGroup()
        for b in bits:
            sq = Square(size, color=color, stroke_width=2)
            sq.set_fill(color, opacity=0.25 if b else 0.0)
            d = T(str(b), font, INK).move_to(sq)
            self.cells.add(VGroup(sq, d))
        self.cells.arrange(RIGHT, buff=0.06)
        self.add(self.cells)
        if label is not None:
            lab = label if isinstance(label, Mobject) else T(label, font - 4, MUTED)
            lab.next_to(self.cells, LEFT, buff=0.25)
            self.add(lab)

    def set_bits(self, bits):
        anims = []
        for cell, b in zip(self.cells, bits):
            sq, d = cell
            new = T(str(b), self.font, INK).move_to(sq)
            anims.append(Transform(d, new))
            anims.append(sq.animate.set_fill(self.color, opacity=0.25 if b else 0.0))
        return anims


# ---------------------------------------------------------------- circuit diagrams
class QCircuit(VGroup):
    """Minimal quantum-circuit diagram builder (wires, gates, controls)."""

    def __init__(self, labels, cols, width=9.0, spacing=0.85, label_size=34,
                 wire_color=MUTED, classical=()):
        super().__init__()
        self.n, self.cols, self.width, self.spacing = len(labels), cols, width, spacing
        self.x0 = -width / 2
        self.wires = VGroup()
        self.labels = VGroup()
        for i, lab in enumerate(labels):
            y = -i * spacing
            if i in classical:
                w = VGroup(Line([self.x0, y + 0.04, 0], [self.x0 + width, y + 0.04, 0]),
                           Line([self.x0, y - 0.04, 0], [self.x0 + width, y - 0.04, 0]))
                w.set_stroke(QPURPLE, 2)
            else:
                w = Line([self.x0, y, 0], [self.x0 + width, y, 0], color=wire_color, stroke_width=2.5)
            self.wires.add(w)
            m = lab if isinstance(lab, Mobject) else MathTex(lab, font_size=label_size, color=INK)
            m.next_to(w, LEFT, buff=0.2)
            self.labels.add(m)
        self.add(self.wires, self.labels)
        self.center_offset = np.array([0.0, (self.n - 1) * spacing / 2, 0.0])

    # positions are computed from the wires so the circuit can be moved/scaled first
    def pos(self, col, row):
        w = self.wires[row]
        start, end = (w[0].get_start(), w[0].get_end()) if isinstance(w, VGroup) else (w.get_start(), w.get_end())
        y = (w.get_center())[1]
        x = start[0] + (end[0] - start[0]) * (col + 0.5) / self.cols
        return np.array([x, y, 0.0])

    def unit(self):
        return self.wires[0].get_width() / self.width if self.n else 1.0

    def box(self, col, row, label, color=QBLUE, rows=None, size=0.62, font=40):
        rows = rows or [row]
        top, bot = self.pos(col, min(rows)), self.pos(col, max(rows))
        s = self.unit()
        t = label if isinstance(label, Mobject) else MathTex(label, font_size=font * s, color=color)
        h = (top[1] - bot[1]) + size * s
        r = Rectangle(width=max(size * s, t.width + 0.3 * s), height=max(h, t.height + 0.25 * s),
                      color=color, stroke_width=2.5)
        r.set_fill(BG, 1).move_to((top + bot) / 2)
        t.move_to(r)
        return VGroup(r, t)

    def ctrl(self, col, row, color=INK, open_=False):
        d = Dot(self.pos(col, row), radius=0.09 * self.unit(), color=color)
        if open_:
            d.set_fill(BG, 1).set_stroke(color, 2)
        return d

    def targ(self, col, row, color=INK):
        c = Circle(radius=0.2 * self.unit(), color=color, stroke_width=2.5).move_to(self.pos(col, row))
        p = VGroup(Line(c.get_top(), c.get_bottom()), Line(c.get_left(), c.get_right())).set_stroke(color, 2.5)
        return VGroup(c, p)

    def vline(self, col, r1, r2, color=INK):
        return Line(self.pos(col, r1), self.pos(col, r2), color=color, stroke_width=2.5)

    def cnot(self, col, controls, target, color=INK):
        rows = list(controls) + [target]
        g = VGroup(self.vline(col, min(rows), max(rows), color))
        g.add(*[self.ctrl(col, c, color) for c in controls])
        g.add(self.targ(col, target, color))
        return g

    def cz(self, col, rows, color=QYELLOW):
        g = VGroup(self.vline(col, min(rows), max(rows), color))
        g.add(*[self.ctrl(col, r, color) for r in rows])
        return g

    def controlled_box(self, col, controls, row, label, color=QBLUE):
        rows = list(controls) + [row]
        g = VGroup(self.vline(col, min(rows), max(rows), color))
        g.add(*[self.ctrl(col, c, color) for c in controls])
        g.add(self.box(col, row, label, color))
        return g

    def meter(self, col, row, color=QPURPLE):
        s = self.unit()
        r = Rectangle(width=0.62 * s, height=0.5 * s, color=color, stroke_width=2.5).set_fill(BG, 1)
        r.move_to(self.pos(col, row))
        arc = Arc(radius=0.2 * s, start_angle=PI * 0.15, angle=PI * 0.7, color=color, stroke_width=2)
        arc.move_to(r.get_center() + DOWN * 0.04 * s)
        needle = Line(r.get_center() + DOWN * 0.12 * s, r.get_center() + (UP * 0.17 + RIGHT * 0.14) * s,
                      color=color, stroke_width=2)
        return VGroup(r, arc, needle)


def bracket_label(mob, text, direction=DOWN, color=MUTED, size=24):
    b = Brace(mob, direction, color=color)
    t = b.get_text(text) if False else T(text, size, color).next_to(b, direction, 0.1)
    return VGroup(b, t)


def stat_card(title, value, color=QBLUE, width=3.4):
    box = RoundedRectangle(corner_radius=0.15, width=width, height=1.3, color=color, stroke_width=2)
    box.set_fill(color, 0.08)
    v = T(value, 34, color, weight=BOLD)
    t = T(title, 20, MUTED)
    fit(v, width - 0.3), fit(t, width - 0.3)
    VGroup(v, t).arrange(DOWN, buff=0.12).move_to(box)
    return VGroup(box, v, t)


def amplitude_bars(amps, labels, width=0.55, height=2.2, color=QBLUE, show_prob=False):
    """Bar chart of (real) amplitudes with ket labels underneath."""
    g = VGroup()
    axis = Line(LEFT * (len(amps) * (width + 0.25)) / 2, RIGHT * (len(amps) * (width + 0.25)) / 2,
                color=MUTED, stroke_width=2)
    g.add(axis)
    bars = VGroup()
    for i, (a, lab) in enumerate(zip(amps, labels)):
        val = a * a if show_prob else a
        h = max(abs(val) * height, 0.001)
        bar = Rectangle(width=width, height=h, stroke_width=0)
        bar.set_fill(color if val >= 0 else QRED, 0.85)
        x = axis.get_left()[0] + (i + 0.5) * (width + 0.25)
        bar.move_to([x, h / 2 if val >= 0 else -h / 2, 0])
        k = MathTex(r"|" + lab + r"\rangle", font_size=26, color=INK).move_to([x, -0.35 if val >= 0 else 0.3, 0])
        k.set_y(-abs(val) * height * (val < 0) - 0.35)
        bars.add(VGroup(bar, k))
    g.add(bars)
    return g
