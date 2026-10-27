import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import *  # noqa: E402,F403


class Ch03Cost(VScene):
    def construct(self):
        chapter_card(self, 3, "Why Toffolis are expensive", "the fault-tolerant cost model")

        # -- noisy physical qubits
        rng = np.random.default_rng(7)
        grid = VGroup(*[Dot(radius=0.11, color=QBLUE) for _ in range(12 * 7)]).arrange_in_grid(7, 12, buff=0.42)
        grid.shift(UP * 0.4)
        rate = T("today's best physical qubits: roughly 1 error per 1,000 operations", 28, INK).shift(DOWN * 2.4)
        need = T("useful algorithms: billions of operations", 28, QRED).next_to(rate, DOWN, 0.25)
        with self.say("Why does the competition count Toffoli gates, rather than all gates equally? "
                      "Because real qubits are noisy. Today's best physical qubits make an error roughly "
                      "once every thousand operations, and the algorithms in this competition need "
                      "billions of operations.") as b:
            self.play(LaggedStart(*[FadeIn(d) for d in grid], lag_ratio=0.01), run_time=b.rt(0.25))
            self.play(FadeIn(rate), run_time=b.rt(0.15))
            for _ in range(4):
                pick = rng.choice(len(grid), 6, replace=False)
                self.play(*[grid[i].animate.set_color(QRED).scale(1.4) for i in pick], run_time=0.25)
                self.play(*[grid[i].animate.set_color(QBLUE).scale(1 / 1.4) for i in pick], run_time=0.25)
            self.play(FadeIn(need), run_time=b.rt(0.1))
        self.play(FadeOut(rate), FadeOut(need), run_time=0.5)

        # -- logical qubit
        patch = VGroup(*grid[:]).copy()
        box = SurroundingRectangle(grid, color=QGREEN, buff=0.25, corner_radius=0.2)
        lq = T("1 logical qubit", 34, QGREEN, weight=BOLD).next_to(box, DOWN, 0.3)
        sub = T("(e.g. a surface-code patch of hundreds to ~1,000 physical qubits)", 24, MUTED).next_to(lq, DOWN, 0.15)
        with self.say("The fix is quantum error correction. Many physical qubits, hundreds up to a "
                      "thousand or so, are woven together into one logical qubit that is far more "
                      "reliable, for example a patch of the surface code. Algorithms, including every "
                      "circuit in this competition, are written in terms of logical qubits.") as b:
            self.play(Create(box), run_time=b.rt(0.3))
            self.play(FadeIn(lq), FadeIn(sub), run_time=b.rt(0.3))
        self.clear_all()
        del patch

        # -- Clifford vs non-Clifford
        left = VGroup(T("Clifford gates", 34, QGREEN, weight=BOLD),
                      M(r"X,\; Z,\; H,\; S,\; \text{CNOT},\; \text{CZ}", 40, QGREEN),
                      T("cheap on an error-corrected machine", 26, INK),
                      T("but: Clifford-only circuits are", 24, MUTED),
                      T("easy to simulate classically", 24, MUTED)).arrange(DOWN, buff=0.3)
        right = VGroup(T("non-Clifford gates", 34, QORANGE, weight=BOLD),
                       M(r"T,\;\; \text{Toffoli (CCX, CCZ, CSWAP)}", 40, QORANGE),
                       T("needed for universal computing", 26, INK),
                       T("each one consumes a 'magic state'", 24, MUTED),
                       T("from a distillation factory", 24, MUTED)).arrange(DOWN, buff=0.3)
        VGroup(left, right).arrange(RIGHT, buff=1.2).shift(UP * 0.3)
        div = Line(UP * 2.5, DOWN * 2, color=MUTED).move_to((left.get_right() + right.get_left()) / 2)
        with self.say("Error-corrected computers can do some gates cheaply. These are the Clifford "
                      "gates: X, Z, H, S, CNOT and CZ. On the surface code, they're nearly free. But "
                      "Clifford gates alone aren't enough: circuits made only of Cliffords can be "
                      "simulated efficiently on an ordinary computer, so they can't give any quantum "
                      "advantage.") as b:
            self.play(FadeIn(left[0:2]), run_time=b.rt(0.3))
            self.play(FadeIn(left[2:]), run_time=b.rt(0.3))
        with self.say("To go beyond, you need a non-Clifford gate, like T or Toffoli. These need special "
                      "resource states called magic states, which are produced in factories that take "
                      "up a big chunk of the machine and a lot of time. So the number of non-Clifford "
                      "gates largely sets the runtime of the whole algorithm.") as b:
            self.play(Create(div), FadeIn(right[0:2]), run_time=b.rt(0.3))
            self.play(FadeIn(right[2:]), run_time=b.rt(0.3))
        self.clear_all()

        # -- magic state factory animation
        fac = RoundedRectangle(corner_radius=0.2, width=3.2, height=2.2, color=QORANGE, stroke_width=3)
        fac.set_fill(QORANGE, 0.12).shift(LEFT * 4 + UP * 0.3)
        flab = T("magic-state\nfactory", 28, QORANGE).move_to(fac)
        comp = QCircuit(["", "", ""], cols=6, width=6.5).shift(RIGHT * 2 + UP * 0.8)
        tofs = VGroup(*[comp.cnot(c, [0, 1], 2, QORANGE) for c in (1, 3, 5)])
        cl = VGroup(comp.cnot(0, [2], 0), comp.box(2, 1, "H", QGREEN), comp.cnot(4, [0], 1))
        with self.say("You can picture it like this. The computation runs Clifford gates freely, but "
                      "every Toffoli has to wait for a magic state to arrive from the factory.") as b:
            self.play(FadeIn(fac), FadeIn(flab), Create(comp.wires), FadeIn(cl), FadeIn(tofs), run_time=b.rt(0.35))
            for t in tofs:
                st = Dot(fac.get_right(), color=QYELLOW, radius=0.12)
                self.play(st.animate.move_to(t[-1].get_center()), run_time=0.7)
                self.play(Flash(t[-1], color=QYELLOW), FadeOut(st), run_time=0.4)
        self.clear_all()

        # -- the cost model
        title = title_bar("The cost model")
        rows = [
            ("CCX, CCZ, CSWAP", "1 Toffoli", QORANGE),
            ("T gate", "¼ Toffoli", QORANGE),
            ("rotation  Zᵗ", "≈ 0.56·log₂(1/ε) + 5.3  T gates", QRED),
            ("X, CNOT, Z, CZ, S", "free", QGREEN),
            ("measurement, classical logic", "free", QGREEN),
            ("each logical qubit", "counts toward Q", QBLUE),
        ]
        tbl = VGroup()
        for a, c, col in rows:
            tbl.add(VGroup(T(a, 28, INK), T(c, 28, col)))
        for r in tbl:
            r[0].move_to(LEFT * 3.2, aligned_edge=LEFT)
            r[1].next_to(LEFT * 1.0 + RIGHT * 1.6, RIGHT, 0)
        tbl.arrange(DOWN, buff=0.35)
        for r in tbl:
            r[0].set_x(-5.3, LEFT)
            r[1].set_x(1.2, LEFT)
        tbl.shift(DOWN * 0.3)
        with self.say("So here's the cost model this competition uses. Count the Toffoli-like gates: "
                      "C C X, C C Z, and the controlled swap. Count T gates, at a quarter of a Toffoli "
                      "each.") as b:
            self.play(FadeIn(title), FadeIn(tbl[0]), run_time=b.rt(0.4))
            self.play(FadeIn(tbl[1]), run_time=b.rt(0.3))
        with self.say("Arbitrary rotations have to be built out of many T gates, and the more precise "
                      "the rotation, the more T gates it takes. In benchmark one, a rotation with error "
                      "epsilon is priced at zero point five six times log base two of one over epsilon, "
                      "plus five point three, T gates.") as b:
            self.play(FadeIn(tbl[2]), run_time=b.rt(0.4))
            self.play(Indicate(tbl[2][1], color=QRED), run_time=b.rt(0.2))
        with self.say("Clifford gates, measurement and classical logic are free. And qubits are counted "
                      "too, because each logical qubit costs hundreds of physical ones.") as b:
            self.play(FadeIn(tbl[3]), FadeIn(tbl[4]), run_time=b.rt(0.35))
            self.play(FadeIn(tbl[5]), run_time=b.rt(0.3))
        self.clear_all()

        # -- rotation cost graph
        ax = Axes(x_range=[0, 40, 10], y_range=[0, 30, 10], x_length=7.5, y_length=4.2,
                  axis_config={"color": MUTED, "include_numbers": True, "font_size": 24},
                  tips=False).shift(DOWN * 0.3 + LEFT * 0.5)
        xl = T("bits of precision  log₂(1/ε)", 24, MUTED).next_to(ax, DOWN, 0.3)
        yl = T("T gates per rotation", 24, MUTED).rotate(PI / 2).next_to(ax, LEFT, 0.3)
        g = ax.plot(lambda x: 0.56 * x + 5.3, x_range=[0, 40], color=QRED, stroke_width=4)
        p30 = Dot(ax.c2p(30, 0.56 * 30 + 5.3), color=QYELLOW)
        p30l = T("1 part in a billion → ≈ 22 T gates", 26, QYELLOW).next_to(p30, UP + LEFT, 0.2)
        with self.say("For example, a rotation accurate to one part in a billion, about thirty bits, "
                      "costs around twenty two T gates. That's five and a half Toffolis' worth, for a "
                      "single rotation. So fewer rotations, and looser precision where you can afford "
                      "it, both save cost.") as b:
            self.play(Create(ax), FadeIn(xl), FadeIn(yl), run_time=b.rt(0.25))
            self.play(Create(g), run_time=b.rt(0.25))
            self.play(FadeIn(p30), FadeIn(p30l), run_time=b.rt(0.25))
        self.clear_all()

        # -- spacetime volume
        q = ValueTracker(3.0)
        tt = ValueTracker(8.0)
        rect = always_redraw(lambda: Rectangle(width=tt.get_value(), height=q.get_value(), color=QBLUE,
                                               stroke_width=3).set_fill(QBLUE, 0.2).move_to(DOWN * 0.3))
        ql = always_redraw(lambda: T("qubits  Q", 28, QBLUE).rotate(PI / 2).next_to(rect, LEFT, 0.25))
        tl = always_redraw(lambda: T("Toffolis  (≈ time)", 28, QORANGE).next_to(rect, DOWN, 0.25))
        vol = T("cost ≈ Q × Toffolis  =  space-time volume", 32, QYELLOW).to_edge(UP, buff=0.6)
        with self.say("Each benchmark combines these into one number. Roughly speaking: qubits times "
                      "Toffolis. Think of it as a space-time volume. How much machine you need, times "
                      "how long you need it for.") as b:
            self.add(rect, ql, tl)
            self.play(FadeIn(vol), run_time=b.rt(0.4))
        with self.say("Halve the qubits, or halve the Toffolis, and the cost halves either way.") as b:
            self.play(q.animate.set_value(1.5), run_time=b.rt(0.4))
            self.play(q.animate.set_value(3.0), tt.animate.set_value(4.0), run_time=b.rt(0.4))
        self.clear_all()

        free = VGroup(T("free:", 34, QGREEN, weight=BOLD),
                      T("X   CNOT   Z   CZ   SWAP   measurement   classical logic", 30, QGREEN)).arrange(RIGHT, buff=0.4)
        fit(free, 12.5)
        rule = fit(T("Any trick that replaces a Toffoli with a few free gates is a pure win.", 30, INK), 12.5).next_to(free, DOWN, 0.6)
        with self.say("And notice what's free: X, CNOT, Z, C Z, swaps, measurement, and classical "
                      "logic. Any trick that replaces a Toffoli with a handful of free gates is a pure "
                      "win. And as you're about to see, measurement is the most valuable free tool you "
                      "have.") as b:
            self.play(FadeIn(free), run_time=b.rt(0.35))
            self.play(FadeIn(rule), run_time=b.rt(0.3))
        self.clear_all()
