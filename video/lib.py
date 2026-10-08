"""Shared helpers: theme, text/box builders, and a scene base class that syncs animation to narration audio."""
import json
from pathlib import Path

from manim import *  # noqa: F401,F403

HERE = Path(__file__).parent
AUD = HERE / "audio"
D = json.loads((AUD / "durations.json").read_text()) if (AUD / "durations.json").exists() else {}

BG = "#0f141b"
SERIF, MONO = "C059", "DejaVu Sans Mono"
BLUE, YEL, GRN, RED, ORG, GREY, PUR, TEAL = "#58C4DD", "#FFD166", "#83C167", "#FC6255", "#FF9F43", "#8b949e", "#B392F0", "#3DDBD9"
PANEL = "#1a212b"


def T(s, size=28, color=WHITE, font=SERIF, **kw):
    return Text(s, font=font, font_size=size, color=color, **kw)


def M(s, size=20, color=WHITE, **kw):
    return Text(s, font=MONO, font_size=size, color=color, **kw)


def box(label, w=None, h=0.7, color=BLUE, size=24, mono=False, fill=0.14, sw=2.5):
    t = M(label, size) if mono else T(label, size)
    w = w or t.width + 0.55
    r = RoundedRectangle(corner_radius=0.12, width=w, height=max(h, t.height + 0.3), stroke_color=color,
                         fill_color=color, fill_opacity=fill, stroke_width=sw)
    t.move_to(r)
    return VGroup(r, t)


def panel(w, h, color=GREY, fill=PANEL, sw=1.5):
    return RoundedRectangle(corner_radius=0.15, width=w, height=h, stroke_color=color, stroke_width=sw,
                            fill_color=fill, fill_opacity=1)


def arrow(a, b, color=GREY, **kw):
    return Arrow(a, b, buff=0.08, color=color, stroke_width=3, max_tip_length_to_length_ratio=0.15, **kw)


_CW = {}


def _cw(size):
    if size not in _CW:
        _CW[size] = M("M" * 20, size).width / 20
    return _CW[size]


def mline(s, size=20, color=WHITE):
    """Monospace line that keeps leading indentation (Pango strips it)."""
    n = len(s) - len(s.lstrip(" "))
    t = M(s.strip(" ") or "·", size, color if s.strip(" ") else BG)
    if not n:
        return t
    pad = Rectangle(width=n * _cw(size), height=0.01, stroke_width=0, fill_opacity=0)
    return VGroup(pad, t).arrange(RIGHT, buff=0)


def code_lines(lines, size=18, colors=None, buff=0.13):
    """lines: list of str or (str, color). Left-aligned monospace block."""
    g = VGroup()
    for ln in lines:
        s, c = (ln if isinstance(ln, tuple) else (ln, WHITE))
        g.add(mline(s, size, c))
    return g.arrange(DOWN, aligned_edge=LEFT, buff=buff)


class NS(Scene):
    """Scene whose animation is paced by narration segments: say(key) ... until(frac) ... done()."""

    def setup(self):
        self.camera.background_color = BG
        self.t0, self.dur, self.key = 0.0, 0.0, ""

    def say(self, key):
        self.key, self.t0, self.dur = key, self.time, D[key]
        self.add_sound(str(AUD / f"{key}.wav"))

    def until(self, frac=1.0):
        target = self.t0 + frac * self.dur
        if target > self.time + 0.02:
            self.wait(target - self.time)

    def done(self, pad=0.6):
        self.until(1.0)
        if self.time > self.t0 + self.dur + 0.25:
            print(f"!! DRIFT {self.key}: {self.time - self.t0 - self.dur:+.2f}s")
        self.wait(pad)

    def open(self, num, title, sub=""):
        n = T(f"Part {num}", 30, GREY)
        t = T(title, 60, YEL)
        s = T(sub, 28, GREY) if sub else VGroup()
        g = VGroup(n, t, s).arrange(DOWN, buff=0.35)
        self.play(FadeIn(g, shift=UP * 0.3), run_time=1.0)
        self.wait(1.4)
        h = T(title, 34, YEL).to_corner(UL, buff=0.45)
        ln = Line(h.get_corner(DL) + DOWN * 0.1, [h.get_right()[0] + 0.3, h.get_bottom()[1] - 0.1, 0], color=YEL, stroke_width=2)
        ln.move_to(h.get_corner(DL) + DOWN * 0.12, aligned_edge=LEFT)
        self.play(ReplacementTransform(t, h), FadeOut(n), FadeOut(s), Create(ln), run_time=1.0)
        self.hdr = VGroup(h, ln)
        return self.hdr

    def clear(self, keep_header=True, rt=0.7):
        mobs = [m for m in self.mobjects if not (keep_header and hasattr(self, "hdr") and m in self.hdr.submobjects)]
        if mobs:
            self.play(*[FadeOut(m) for m in mobs], run_time=rt)

    def close(self):
        self.play(*[FadeOut(m) for m in self.mobjects], run_time=0.8)
