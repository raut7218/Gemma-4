import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import *  # noqa: E402,F403


class Ch01Qubits(VScene):
    def construct(self):
        chapter_card(self, 1, "Bits, qubits and amplitudes")

        # -- classical bits
        bits = BitRow([1, 0, 1], size=0.9, font=40).shift(UP * 1.5)
        with self.say("Let's start with what a quantum computer stores: qubits. And to understand a "
                      "qubit, start with an ordinary bit.") as b:
            self.play(FadeIn(bits.cells[1]), run_time=b.rt(0.4))
        values = VGroup(*[T(format(i, "03b"), 30, INK) for i in range(8)])
        values.arrange(RIGHT, buff=0.45).shift(DOWN * 0.6)
        idx = VGroup(*[T(str(i), 22, MUTED).next_to(v, DOWN, 0.15) for i, v in enumerate(values)])
        with self.say("A bit is either zero or one. A register of n bits holds exactly one of two to "
                      "the n possible values. Three bits hold one of eight values: for example "
                      "one, zero, one, which is the number five.") as b:
            self.play(FadeIn(bits.cells[0]), FadeIn(bits.cells[2]), run_time=b.rt(0.25))
            self.play(LaggedStart(*[FadeIn(v) for v in values], lag_ratio=0.1), FadeIn(idx), run_time=b.rt(0.35))
            box = SurroundingRectangle(VGroup(values[5], idx[5]), color=QYELLOW)
            self.play(Create(box), values[5].animate.set_color(QYELLOW), run_time=b.rt(0.2))
        self.clear_all()

        # -- a qubit: two amplitudes
        state = M(r"|\psi\rangle = \alpha\,|0\rangle + \beta\,|1\rangle", 56).shift(UP * 2.4)
        with self.say("A qubit is described differently. Its state is a pair of numbers called "
                      "amplitudes: one for zero, and one for one. We write it like this: alpha, "
                      "ket zero, plus beta, ket one. The angled bracket, called a ket, is just a "
                      "label for one of the basis states.") as b:
            self.play(Write(state), run_time=b.rt(0.5))
            self.play(Indicate(state[0][7:10], color=QBLUE), Indicate(state[0][12:15], color=QBLUE),
                      run_time=b.rt(0.3))

        center = LEFT * 3 + DOWN * 1.0
        R = 2.2
        circ = Circle(radius=R, color=MUTED, stroke_width=2).move_to(center)
        ax_x = Line(center + LEFT * (R + 0.4), center + RIGHT * (R + 0.4), color=MUTED, stroke_width=1.5)
        ax_y = Line(center + DOWN * (R + 0.4), center + UP * (R + 0.4), color=MUTED, stroke_width=1.5)
        l0 = ket("0", 34).next_to(center + RIGHT * R, RIGHT, 0.2).shift(DOWN * 0.25)
        l1 = ket("1", 34).next_to(center + UP * R, UP, 0.1).shift(RIGHT * 0.35)
        theta = ValueTracker(0.0)
        arrow = always_redraw(lambda: Arrow(center, center + R * np.array([np.cos(theta.get_value()),
                                                                           np.sin(theta.get_value()), 0]),
                                            buff=0, color=QYELLOW, stroke_width=6))
        proj_x = always_redraw(lambda: DashedLine(
            center + R * np.array([np.cos(theta.get_value()), np.sin(theta.get_value()), 0]),
            center + R * np.array([np.cos(theta.get_value()), 0, 0]), color=QBLUE, stroke_width=2))
        proj_y = always_redraw(lambda: DashedLine(
            center + R * np.array([np.cos(theta.get_value()), np.sin(theta.get_value()), 0]),
            center + R * np.array([0, np.sin(theta.get_value()), 0]), color=QBLUE, stroke_width=2))
        a_lab = M(r"\alpha =", 40)
        b_lab = M(r"\beta =", 40)
        a_val = always_redraw(lambda: DecimalNumber(np.cos(theta.get_value()), num_decimal_places=2,
                                                    font_size=40, color=QBLUE).next_to(a_lab, RIGHT, 0.2))
        readout = VGroup(a_lab, b_lab).arrange(DOWN, aligned_edge=LEFT, buff=0.4).move_to(RIGHT * 2.2 + UP * 0.6)
        b_val = always_redraw(lambda: DecimalNumber(np.sin(theta.get_value()), num_decimal_places=2,
                                                    font_size=40, color=QBLUE).next_to(b_lab, RIGHT, 0.2))
        with self.say("Picture the state as an arrow of length one. Pointing along the horizontal axis, "
                      "it is ket zero. Pointing straight up, it is ket one. Anywhere in between, it's a "
                      "superposition: a bit of each.") as b:
            self.play(Create(circ), Create(ax_x), Create(ax_y), FadeIn(l0), FadeIn(l1), run_time=b.rt(0.25))
            self.add(arrow, proj_x, proj_y)
            self.play(FadeIn(readout), FadeIn(a_val), FadeIn(b_val), run_time=0.5)
            self.play(theta.animate.set_value(PI / 2), run_time=b.rt(0.25))
            self.play(theta.animate.set_value(PI / 3), run_time=b.rt(0.25))

        probs = VGroup(
            M(r"P(0) = \alpha^2", 38, QBLUE), M(r"P(1) = \beta^2", 38, QBLUE),
            M(r"\alpha^2 + \beta^2 = 1", 38, QYELLOW)).arrange(DOWN, aligned_edge=LEFT, buff=0.3)
        probs.next_to(readout, DOWN, 0.7, aligned_edge=LEFT)
        with self.say("When you measure a qubit, you never see the amplitudes. You see zero, with "
                      "probability alpha squared, or one, with probability beta squared, and the "
                      "state collapses to whatever you saw. That's why the arrow has length one: the "
                      "two probabilities must add up to one.") as b:
            self.play(FadeIn(probs[0]), FadeIn(probs[1]), run_time=b.rt(0.35))
            self.play(Write(probs[2]), run_time=b.rt(0.25))
        # measurement histogram
        rng = np.random.default_rng(1)
        p1 = np.sin(PI / 3) ** 2
        outcomes = (rng.random(40) < p1).astype(int)
        hist = VGroup()
        cnt = [0, 0]
        dots = VGroup()
        for o in outcomes:
            d = Dot(radius=0.07, color=QGREEN if o else QPURPLE)
            k = cnt[o]
            d.move_to(RIGHT * (4.45 + o * 1.2 + (k % 3) * 0.15) + DOWN * (2.95 - (k // 3) * 0.15))
            cnt[o] += 1
            dots.add(d)
        hl = VGroup(T("0", 26, QPURPLE).move_to(RIGHT * 4.6 + DOWN * 3.3),
                    T("1", 26, QGREEN).move_to(RIGHT * 5.8 + DOWN * 3.3))
        with self.say("Measure many copies of this state and roughly a quarter of the results are "
                      "zero, and three quarters are one.") as b:
            self.play(FadeIn(hl), LaggedStart(*[FadeIn(d, scale=2) for d in dots], lag_ratio=0.05),
                      run_time=b.rt(0.9))
        self.clear_all()

        # -- negative amplitudes and interference
        title = title_bar("Amplitudes can cancel")
        left = VGroup(T("path A", 26, QBLUE), M(r"+\tfrac{1}{2}", 44, QBLUE)).arrange(DOWN)
        right = VGroup(T("path B", 26, QRED), M(r"-\tfrac{1}{2}", 44, QRED)).arrange(DOWN)
        tot = VGroup(T("total amplitude", 26, INK), M(r"0", 44, QYELLOW)).arrange(DOWN)
        row = VGroup(left, M("+", 50), right, M("=", 50), tot).arrange(RIGHT, buff=0.6).shift(UP * 0.3)
        pr = T("probabilities can only add up; amplitudes can cancel", 28, MUTED).shift(DOWN * 1.8)
        with self.say("Amplitudes can be negative, and in general they're complex numbers. That's the "
                      "real difference from ordinary probabilities. Two ways of reaching the same "
                      "outcome can cancel each other out. This is called interference, and it's where "
                      "every quantum speedup comes from.") as b:
            self.play(FadeIn(title), FadeIn(left), run_time=b.rt(0.2))
            self.play(FadeIn(row[1]), FadeIn(right), run_time=b.rt(0.2))
            self.play(FadeIn(row[3]), FadeIn(tot), run_time=b.rt(0.2))
            self.play(FadeIn(pr), run_time=b.rt(0.15))
        self.clear_all()

        # -- phases on the unit circle
        cc = LEFT * 3.4 + DOWN * 0.3
        uc = Circle(radius=2, color=MUTED, stroke_width=2).move_to(cc)
        ph = ValueTracker(0.0)
        ph_arrow = always_redraw(lambda: Arrow(cc, cc + 2 * np.array([np.cos(ph.get_value()), np.sin(ph.get_value()), 0]),
                                               buff=0, color=QYELLOW, stroke_width=6))
        ph_lab = M(r"e^{i\theta}", 40, QYELLOW).next_to(uc, UP, 0.2)
        g1 = M(r"e^{i\theta}\big(\alpha|0\rangle + \beta|1\rangle\big)", 44).move_to(RIGHT * 2.8 + UP * 1.4)
        g1n = T("global phase: undetectable", 26, MUTED).next_to(g1, DOWN, 0.2)
        g2 = M(r"\alpha|0\rangle + e^{i\theta}\beta|1\rangle", 44).move_to(RIGHT * 2.8 + DOWN * 0.8)
        g2n = T("relative phase: changes interference", 26, QYELLOW).next_to(g2, DOWN, 0.2)
        with self.say("Amplitudes are also where phases live. A phase is a complex number of size one, "
                      "e to the i theta, a point on the unit circle. Multiplying a whole state by a "
                      "phase changes nothing you could ever measure.") as b:
            self.play(Create(uc), FadeIn(ph_lab), run_time=b.rt(0.2))
            self.add(ph_arrow)
            self.play(ph.animate.set_value(2 * PI * 0.8), run_time=b.rt(0.35))
            self.play(FadeIn(g1), FadeIn(g1n), run_time=b.rt(0.25))
        with self.say("But a phase on one part of a superposition, relative to another part, changes how "
                      "those parts interfere later on. Keep this in mind. Two of the three benchmarks "
                      "are about putting exactly the right phase on each basis state.") as b:
            self.play(FadeIn(g2), FadeIn(g2n), run_time=b.rt(0.3))
            self.play(ph.animate.set_value(2 * PI * 0.8 + 1.2), Circumscribe(g2, color=QYELLOW), run_time=b.rt(0.4))
        self.clear_all()

        # -- many qubits: 2^n amplitudes
        labels = [format(i, "03b") for i in range(8)]
        amps = np.array([0.1, 0.45, -0.25, 0.3, 0.5, -0.35, 0.2, 0.45])
        amps = amps / np.linalg.norm(amps)
        bars = amplitude_bars(amps, labels, width=0.7, height=2.6).shift(DOWN * 0.2)
        three = T("3 qubits → 8 amplitudes", 32, INK).to_edge(UP, buff=0.6)
        with self.say("Now take several qubits. With n qubits there are two to the n basis states, one "
                      "for every n-bit string, and a general state has an amplitude for every one of "
                      "them. Three qubits: eight amplitudes.") as b:
            self.play(FadeIn(three), Create(bars[0]), run_time=b.rt(0.3))
            self.play(LaggedStart(*[GrowFromEdge(br[0], DOWN if a >= 0 else UP) for br, a in zip(bars[1], amps)],
                                  lag_ratio=0.1), LaggedStart(*[FadeIn(br[1]) for br in bars[1]]),
                      run_time=b.rt(0.5))
        table = VGroup()
        for n, txt in [(3, "8"), (10, "1,024"), (50, "≈ 10¹⁵  (a million billion)"),
                       (300, "≈ 10⁹⁰  (more than atoms in the universe)")]:
            table.add(VGroup(T(f"{n} qubits", 30, QBLUE), T(txt, 30, INK)).arrange(RIGHT, buff=0.6))
        table.arrange(DOWN, aligned_edge=LEFT, buff=0.35).move_to(DOWN * 0.3)
        with self.say("Fifty qubits: about a million billion amplitudes. A few hundred qubits: more "
                      "numbers than there are atoms in the universe. That's why simulating a quantum "
                      "computer in general is exponentially hard.") as b:
            self.play(FadeOut(bars), FadeOut(three), run_time=0.6)
            self.play(LaggedStart(*[FadeIn(r, shift=RIGHT * 0.3) for r in table], lag_ratio=0.35),
                      run_time=b.rt(0.7))
        self.clear_all()

        # -- the seed: a basis state is cheap
        amps2 = np.zeros(8)
        amps2[5] = 1.0
        bars2 = amplitude_bars(amps2, labels, width=0.7, height=2.2).shift(UP * 0.4 + LEFT * 2.5)
        desc = VGroup(BitRow([1, 0, 1], size=0.7, font=34), M(r"\text{phase } = e^{i\varphi}", 40, QYELLOW))
        desc.arrange(DOWN, buff=0.5).move_to(RIGHT * 4 + UP * 0.6)
        brace_t = T("3 bits + 1 phase", 28, QGREEN).next_to(desc, DOWN, 0.5)
        with self.say("But notice something. If the state is a single basis state, like ket one, zero, "
                      "one, then only one amplitude is non-zero. You can describe the whole state with "
                      "three bits, plus one number for its phase. Hold on to this idea. It's the seed "
                      "of everything the verifier does.") as b:
            self.play(Create(bars2[0]), *[GrowFromEdge(br[0], DOWN) for br in bars2[1]],
                      *[FadeIn(br[1]) for br in bars2[1]], run_time=b.rt(0.3))
            self.play(Indicate(bars2[1][5], color=QYELLOW), run_time=b.rt(0.15))
            self.play(TransformFromCopy(bars2[1][5][1], desc[0]), run_time=b.rt(0.15))
            self.play(FadeIn(desc[1]), FadeIn(brace_t), run_time=b.rt(0.15))
        self.clear_all()

        # -- entanglement and garbage
        bell = M(r"\frac{|00\rangle + |11\rangle}{\sqrt 2}", 60).shift(UP * 1.5)
        cant = M(r"\neq \big(a|0\rangle + b|1\rangle\big)\otimes\big(c|0\rangle + d|1\rangle\big)", 42, QRED).next_to(bell, DOWN, 0.5)
        with self.say("One last idea: entanglement. A two-qubit state like ket zero zero plus ket one "
                      "one, over root two, can't be split into a separate state for each qubit. Measure "
                      "one qubit, and you instantly know the other.") as b:
            self.play(Write(bell), run_time=b.rt(0.35))
            self.play(FadeIn(cant), run_time=b.rt(0.3))
        garb = M(r"\sum_x \alpha_x |x\rangle|0\rangle \;\longrightarrow\; \sum_x \alpha_x |x\rangle|f(x)\rangle",
                 44).shift(DOWN * 1.3)
        gn = T("scratch is now entangled with the data — it must be cleaned up", 26, QYELLOW).next_to(garb, DOWN, 0.35)
        with self.say("In this competition you'll meet entanglement in a specific form. A circuit "
                      "computes some function f of x into scratch qubits, which entangles the scratch "
                      "with the input. Before it finishes, the circuit must disentangle them again. "
                      "That's called uncomputation, and it's where a lot of the cost, and a lot of the "
                      "cleverness, lives.") as b:
            self.play(Write(garb), run_time=b.rt(0.4))
            self.play(FadeIn(gn), run_time=b.rt(0.2))
        self.clear_all()
