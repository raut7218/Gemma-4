import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import *  # noqa: E402,F403


class Ch04Kickmix(VScene):
    def construct(self):
        chapter_card(self, 4, "kickmix circuits", "and measurement-based uncomputation")

        # -- the four instruction classes
        specs = [("reversible classical", "X  CX  CCX  SWAP", "permute bit strings", QBLUE),
                 ("diagonal phase", "Z  CZ  CCZ  Z_POW  NEG", "multiply by a phase", QYELLOW),
                 ("measure & reset", "HMR   R", "X-basis measure / reset to 0", QPURPLE),
                 ("classical bits", "BIT_STORE0/1  BIT_INVERT", "set or flip record bits", QGREEN)]
        cards = VGroup()
        for name, ops, what, col in specs:
            box = RoundedRectangle(corner_radius=0.15, width=6.6, height=2.0, color=col, stroke_width=2.5)
            box.set_fill(col, 0.07)
            g = VGroup(T(name, 34, col, weight=BOLD), T(ops, 30, INK), T(what, 26, MUTED)).arrange(DOWN, buff=0.16)
            fit(g, 6.2).move_to(box)
            cards.add(VGroup(box, g))
        cards.arrange_in_grid(2, 2, buff=0.35).shift(DOWN * 0.3)
        head = T("A kickmix circuit uses only four kinds of instruction", 32, INK).to_edge(UP, buff=0.5)
        with self.say("Now we can define kickmix circuits. A kickmix circuit is allowed only four kinds "
                      "of instruction. Reversible classical gates: X, CNOT, Toffoli and swap. Diagonal "
                      "phase gates: Z, C Z, C C Z, Z POW, and NEG, which flips the overall sign.") as b:
            self.play(FadeIn(head), run_time=b.rt(0.15))
            self.play(FadeIn(cards[0]), run_time=b.rt(0.3))
            self.play(FadeIn(cards[1]), run_time=b.rt(0.3))
        with self.say("Measurement and reset: HMR and R. And operations on classical bits, which store "
                      "measurement results. On top of that, any instruction can be conditioned on "
                      "classical bits, so you can say: do this only if that measurement gave one.") as b:
            self.play(FadeIn(cards[2]), run_time=b.rt(0.3))
            self.play(FadeIn(cards[3]), run_time=b.rt(0.3))
        self.clear_all()

        # -- simulation: one bit per qubit plus a phase
        qc = QCircuit([r"q_0", r"q_1", r"q_2", r"q_3"], cols=6, width=8).shift(UP * 0.6 + LEFT * 0.6)
        ops = [qc.box(0, 0, "X"), qc.cnot(1, [0], 1), qc.cnot(2, [0, 1], 3, QORANGE), qc.cz(3, [1, 3]),
               qc.cnot(4, [3], 2), qc.box(5, 2, "Z", QYELLOW)]
        state = [0, 0, 1, 0]
        phase = 1
        bitv = VGroup(*[T(str(v), 34, QBLUE) for v in state])
        for i, m in enumerate(bitv):
            m.move_to(qc.pos(0, i)).set_x(qc.wires[0].get_left()[0] - 1.3)
        ph = VGroup(T("phase:", 28, MUTED), T("+1", 34, QYELLOW)).arrange(RIGHT).next_to(qc, DOWN, 0.7)
        with self.say("Feed a kickmix circuit a basis state, and every instruction maps it to a single "
                      "basis state, times a phase. So to simulate it, you only need to store one bit "
                      "per qubit, plus one number for the phase.") as b:
            self.play(Create(qc.wires), FadeIn(qc.labels), *[FadeIn(o) for o in ops], run_time=b.rt(0.3))
            self.play(FadeIn(bitv), FadeIn(ph), run_time=b.rt(0.3))
        cursor = Line(UP * 0.5, DOWN * 3.2, color=QYELLOW, stroke_width=3).move_to(qc.pos(0, 0) + DOWN * 1.27)
        cursor.set_x(qc.wires[0].get_left()[0])
        steps = []
        # X q0
        state[0] ^= 1; steps.append((list(state), phase))
        state[1] ^= state[0]; steps.append((list(state), phase))
        state[3] ^= state[0] & state[1]; steps.append((list(state), phase))
        if state[1] and state[3]:
            phase = -phase
        steps.append((list(state), phase))
        state[2] ^= state[3]; steps.append((list(state), phase))
        if state[2]:
            phase = -phase
        steps.append((list(state), phase))
        with self.say("Simulating a gate is just flipping a bit, or flipping the sign. The time grows "
                      "linearly with the number of gates, not exponentially with the number of "
                      "qubits.") as b:
            self.play(FadeIn(cursor), run_time=0.3)
            for c, (st, p) in enumerate(steps):
                x = qc.pos(c, 0)[0]
                anims = [cursor.animate.set_x(x)]
                for i, v in enumerate(st):
                    if bitv[i].text != str(v):
                        new = T(str(v), 34, QBLUE).move_to(bitv[i])
                        anims.append(Transform(bitv[i], new))
                newp = T("+1" if p > 0 else "−1", 34, QYELLOW).move_to(ph[1])
                anims.append(Transform(ph[1], newp))
                self.play(*anims, run_time=max(0.35, b.duration * 0.12))
        self.clear_all()

        stats = VGroup(stat_card("shots packed per SIMD batch", "64 – 512", QBLUE, 4.2),
                       stat_card("gates per second, one CPU core", "≈ 6 × 10¹⁰", QGREEN, 4.2),
                       stat_card("86M-gate circuit built in", "< 5 s", QYELLOW, 4.2)).arrange(RIGHT, buff=0.3)
        lib = T("kickmix: C++20 with Python bindings, inside Google's Qualtran", 28, INK).next_to(stats, UP, 0.7)
        with self.say("And kickmix is fast. It's a C plus plus library with Python bindings, inside "
                      "Google's Qualtran package. It packs between sixty four and five hundred twelve "
                      "independent runs, called shots, into the CPU's vector registers, and simulates "
                      "tens of billions of gate applications per second on a single core.") as b:
            self.play(FadeIn(lib), run_time=b.rt(0.2))
            self.play(LaggedStart(*[FadeIn(s, shift=UP * 0.2) for s in stats], lag_ratio=0.3), run_time=b.rt(0.5))
        self.clear_all()

        # -- HMR
        hc = QCircuit([r"|x\rangle", r"|f(x)\rangle", r"b"], cols=3, width=6, classical=(2,)).shift(UP * 1.2 + LEFT * 2.5)
        hmr = VGroup(hc.box(0, 1, "H", QPURPLE), hc.meter(1, 1), hc.box(2, 1, r"|0\rangle", QPURPLE))
        conn = DoubleArrow if False else None
        cl_line = VGroup(Line(hc.pos(1, 1) + DOWN * 0.25 + LEFT * 0.04, hc.pos(1, 2) + LEFT * 0.04),
                         Line(hc.pos(1, 1) + DOWN * 0.25 + RIGHT * 0.04, hc.pos(1, 2) + RIGHT * 0.04)).set_stroke(QPURPLE, 2)
        name = VGroup(T("HMR", 40, QPURPLE, weight=BOLD), T("“hammer”", 28, MUTED),
                      T("Hadamard · Measure · Reset", 26, INK)).arrange(DOWN, buff=0.2).move_to(RIGHT * 4 + UP * 1.2)
        with self.say("The most interesting instruction is HMR, pronounced hammer: Hadamard, measure, "
                      "reset. It measures a qubit in the X basis, records a random bit b, and resets the "
                      "qubit to zero.") as b:
            self.play(Create(hc.wires), FadeIn(hc.labels), run_time=b.rt(0.2))
            self.play(LaggedStart(*[FadeIn(h) for h in hmr], lag_ratio=0.3), Create(cl_line), run_time=b.rt(0.35))
            self.play(FadeIn(name), run_time=b.rt(0.2))
        eq = M(r"|x\rangle\,|f(x)\rangle \;\xrightarrow{\;\text{HMR}\;}\; (-1)^{\,b\cdot f(x)}\;|x\rangle\,|0\rangle",
               48, INK).shift(DOWN * 1.6)
        with self.say("Here's why it matters. Suppose a scratch qubit holds a function of the other "
                      "qubits, f of x. Hammer it. The qubit comes back as zero, cleanly disentangled. "
                      "In exchange, you get a random bit b, and the state picks up a phase: minus one to "
                      "the power b times f of x.") as b:
            self.play(Write(eq), run_time=b.rt(0.5))
            self.play(Indicate(eq[0][17:27], color=QYELLOW), run_time=b.rt(0.2))
        fix = VGroup(T("b = 0:  nothing to do", 30, QGREEN),
                     T("b = 1:  wrong sign wherever f(x) = 1  →  fix it with a phase gate, conditioned on b", 28, QYELLOW))
        fix.arrange(DOWN, aligned_edge=LEFT, buff=0.3).next_to(eq, DOWN, 0.5)
        fit(fix, 13)
        with self.say("If b is zero, nothing happened. You're done. If b is one, there's a wrong sign on "
                      "exactly the states where f of x is one. But you know b. It's a classical bit. So "
                      "you can undo the sign with a phase gate on the qubits that f was computed from, "
                      "conditioned on b.") as b:
            self.play(FadeIn(fix[0]), run_time=b.rt(0.3))
            self.play(FadeIn(fix[1]), run_time=b.rt(0.3))
        self.clear_all()

        # -- temporary AND: compute with a Toffoli, uncompute with HMR + CZ
        title = title_bar("Example: the temporary AND")
        ac = QCircuit([r"a", r"b", r"|0\rangle", r"m"], cols=7, width=10, classical=(3,)).shift(DOWN * 0.2)
        tof = ac.cnot(0, [0, 1], 2, QORANGE)
        use = ac.box(2, 2, r"\text{use } a\wedge b", QBLUE)
        usel = ac.vline(2, 2, 2)
        h1 = ac.box(4, 2, "H", QPURPLE)
        mt = ac.meter(5, 2)
        ml = VGroup(Line(ac.pos(5, 2) + DOWN * 0.25 + LEFT * 0.04, ac.pos(5, 3) + LEFT * 0.04),
                    Line(ac.pos(5, 2) + DOWN * 0.25 + RIGHT * 0.04, ac.pos(5, 3) + RIGHT * 0.04)).set_stroke(QPURPLE, 2)
        czg = ac.cz(6, [0, 1], QYELLOW)
        czc = VGroup(Line(ac.pos(6, 1), ac.pos(6, 3) + UP * 0.05, color=QPURPLE, stroke_width=2),
                     Dot(ac.pos(6, 3), color=QPURPLE, radius=0.09))
        c1 = T("1 Toffoli", 26, QORANGE).next_to(ac.pos(0, 3), DOWN, 0.4)
        c2 = T("0 Toffolis  (HMR + CZ if m = 1)", 26, QGREEN).next_to(ac.pos(5, 3), DOWN, 0.4)
        with self.say("The classic example is the temporary AND. Computing a and b into a fresh qubit "
                      "costs one Toffoli. You use the result for a while.") as b:
            self.play(FadeIn(title), Create(ac.wires), FadeIn(ac.labels), run_time=b.rt(0.3))
            self.play(FadeIn(tof), FadeIn(c1), run_time=b.rt(0.25))
            self.play(FadeIn(use), run_time=b.rt(0.2))
        old = T("textbook uncompute: another Toffoli", 26, QRED).next_to(title, DOWN, 0.4)
        with self.say("Uncomputing it the textbook way, by running the Toffoli again, costs a second "
                      "Toffoli. Instead: hammer it. If the measurement gives one, apply a C Z between a "
                      "and b. That cancels the stray sign exactly, because the sign was on a AND b.") as b:
            self.play(FadeIn(old), run_time=b.rt(0.2))
            self.play(FadeIn(h1), FadeIn(mt), Create(ml), run_time=b.rt(0.25))
            self.play(FadeIn(czg), FadeIn(czc), run_time=b.rt(0.25))
            self.play(FadeIn(c2), run_time=b.rt(0.15))
        with self.say("A C Z is a Clifford gate. It's free. You've just halved the cost of every "
                      "temporary value in your circuit. This trick is due to Craig Gidney, one of the "
                      "authors of the competition paper, and it's everywhere: in the reference circuits, "
                      "and in every top solution.") as b:
            self.play(Circumscribe(c2, color=QGREEN), FadeOut(old), run_time=b.rt(0.4))
        self.clear_all()

        # -- forgetting the fix-up fails loudly
        shots = VGroup(*[Square(0.32, stroke_width=1.5, color=MUTED) for _ in range(64)]).arrange_in_grid(4, 16, buff=0.08)
        shots.shift(DOWN * 0.3)
        head = T("hammer without the fix-up: 64 shots", 30, INK).next_to(shots, UP, 0.6)
        rng = np.random.default_rng(5)
        bad = rng.random(64) < 0.5
        res = T(f"{int(bad.sum())} of 64 shots have the wrong sign  →  FAIL", 30, QRED).next_to(shots, DOWN, 0.6)
        with self.say("What if you hammer a qubit and forget the fix-up? Then the phase is wrong whenever "
                      "the random bit comes out one, which is half the time. The simulator draws those "
                      "bits at random, so the bug shows up in about half the shots, and the verifier "
                      "catches it.") as b:
            self.play(FadeIn(head), FadeIn(shots), run_time=b.rt(0.25))
            self.play(LaggedStart(*[s.animate.set_fill(QRED if x else QGREEN, 0.7) for s, x in zip(shots, bad)],
                                  lag_ratio=0.02), run_time=b.rt(0.4))
            self.play(FadeIn(res), run_time=b.rt(0.15))
        r_rule = T("R (reset) on a qubit that isn't 0  →  random sign flip  →  caught the same way", 28, QYELLOW)
        fit(r_rule, 13).next_to(res, DOWN, 0.4)
        with self.say("The plain reset instruction, R, works the same way. Resetting a qubit that isn't "
                      "zero gives a random sign flip. Garbage can't be quietly thrown away. Every bit "
                      "of it has to be genuinely uncomputed.") as b:
            self.play(FadeIn(r_rule), run_time=b.rt(0.4))
        self.clear_all()

        rule = VGroup(T("computing a value: costs Toffolis", 32, QORANGE),
                      T("erasing a value you could recompute: often free", 32, QGREEN),
                      T("(HMR + a cheap phase fix-up)", 26, MUTED)).arrange(DOWN, buff=0.35).shift(UP * 1.2)
        with self.say("This is measurement-based uncomputation. The general lesson: computing a value "
                      "costs Toffolis. Erasing a value, by measuring it and fixing up the phase, is often "
                      "nearly free, as long as the fix-up itself is cheap.") as b:
            self.play(LaggedStart(*[FadeIn(r) for r in rule], lag_ratio=0.4), run_time=b.rt(0.6))

        mean = VGroup(T("the score counts Toffolis actually executed, averaged over shots", 28, INK),
                      T("a gate conditioned on a measured bit counts only when it runs", 28, QYELLOW)).arrange(DOWN, buff=0.25)
        mean.shift(DOWN * 1.5)
        with self.say("One subtle point that matters for scoring. The verifier counts the Toffolis "
                      "actually executed in each shot, then averages over shots. A Toffoli that's "
                      "conditioned on a measured bit only counts on the shots where it runs. So clever "
                      "classical control can lower your average cost.") as b:
            self.play(FadeIn(mean[0]), run_time=b.rt(0.3))
            self.play(FadeIn(mean[1]), run_time=b.rt(0.3))
        self.clear_all()
