import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import *  # noqa: E402,F403


def truth_table(header, rows, highlight=None, col_colors=None, size=30):
    cols = len(header)
    cells = [[T(h, size - 4, MUTED) for h in header]]
    for r in rows:
        cells.append([T(str(v), size, INK) for v in r])
    tbl = VGroup(*[VGroup(*row) for row in cells])
    for j in range(cols):
        for i, row in enumerate(cells):
            row[j].move_to([j * 1.25, -i * 0.55, 0])
    if col_colors:
        for j, c in col_colors.items():
            for row in cells[1:]:
                row[j].set_color(c)
    sep = Line([-0.5, -0.27, 0], [(cols - 1) * 1.25 + 0.5, -0.27, 0], color=MUTED, stroke_width=1.5)
    g = VGroup(tbl, sep)
    if highlight is not None:
        for h in ([highlight] if isinstance(highlight, int) else highlight):
            g.add(SurroundingRectangle(tbl[h + 1], color=QYELLOW, buff=0.08))
    return g.center()


class Ch02Gates(VScene):
    def construct(self):
        chapter_card(self, 2, "Gates, circuits and reversible logic")

        # -- reading a circuit
        qc = QCircuit([r"q_0", r"q_1", r"q_2"], cols=6, width=9).center()
        gates = VGroup(qc.box(0, 0, "H"), qc.cnot(1, [0], 1), qc.box(2, 2, "X"),
                       qc.cnot(3, [0, 1], 2), qc.box(4, 1, "Z", QYELLOW), qc.meter(5, 2))
        time_arrow = Arrow(qc.pos(0, 2) + DOWN * 0.9 + LEFT * 0.6, qc.pos(5, 2) + DOWN * 0.9 + RIGHT * 0.6,
                           color=MUTED, buff=0)
        tlab = T("time", 24, MUTED).next_to(time_arrow, DOWN, 0.1)
        with self.say("A quantum computation is a sequence of gates applied to qubits, drawn as a "
                      "circuit. Each horizontal line is one qubit. Time flows from left to right, and "
                      "each symbol on a line is a gate acting on that qubit.") as b:
            self.play(Create(qc.wires), FadeIn(qc.labels), run_time=b.rt(0.25))
            self.play(LaggedStart(*[FadeIn(g) for g in gates], lag_ratio=0.25), run_time=b.rt(0.45))
            self.play(GrowArrow(time_arrow), FadeIn(tlab), run_time=b.rt(0.15))
        self.clear_all()

        # -- X gate
        xc = QCircuit([""], cols=1, width=3).shift(LEFT * 3.5 + UP * 1.5)
        xg = xc.box(0, 0, "X")
        inp = ket("0", 44, QBLUE).next_to(xc.wires[0], LEFT, 0.3)
        out = ket("1", 44, QYELLOW).next_to(xc.wires[0], RIGHT, 0.3)
        with self.say("The simplest gate is X, the quantum NOT. It turns ket zero into ket one, and ket "
                      "one into ket zero.") as b:
            self.play(Create(xc.wires), FadeIn(xg), FadeIn(inp), run_time=b.rt(0.3))
            self.play(TransformFromCopy(inp, out), run_time=b.rt(0.4))
        before = amplitude_bars([0.8, 0.6], ["0", "1"], width=0.8, height=2).move_to(RIGHT * 1.5 + DOWN * 1.2)
        after = amplitude_bars([0.6, 0.8], ["0", "1"], width=0.8, height=2).move_to(RIGHT * 4.6 + DOWN * 1.2)
        arr = Arrow(before.get_right(), after.get_left(), color=INK)
        xl = MathTex("X", font_size=36).next_to(arr, UP, 0.1)
        with self.say("On a superposition, it simply swaps the two amplitudes.") as b:
            self.play(FadeIn(before), run_time=b.rt(0.3))
            self.play(GrowArrow(arr), FadeIn(xl), TransformFromCopy(before, after), run_time=b.rt(0.5))
        self.clear_all()

        # -- CNOT
        cc = QCircuit([r"a", r"b"], cols=1, width=2.6).shift(LEFT * 4 + UP * 0.3)
        cg = cc.cnot(0, [0], 1)
        ctl = T("control", 24, QBLUE).next_to(cc.pos(0, 0), UP, 0.35)
        tgt = T("target", 24, QYELLOW).next_to(cc.pos(0, 1), DOWN, 0.4)
        tt = truth_table(["a", "b", "→ a", "b ⊕ a"], [(0, 0, 0, 0), (0, 1, 0, 1), (1, 0, 1, 1), (1, 1, 1, 0)],
                         col_colors={3: QYELLOW}).shift(RIGHT * 2.2)
        with self.say("Next, the controlled NOT, or CNOT. The dot is the control, and the circle with "
                      "the plus is the target. If the control is one, the target flips. Otherwise, "
                      "nothing happens. Put another way: the target becomes target XOR control.") as b:
            self.play(Create(cc.wires), FadeIn(cc.labels), FadeIn(cg), run_time=b.rt(0.25))
            self.play(FadeIn(ctl), FadeIn(tgt), run_time=b.rt(0.2))
            self.play(FadeIn(tt), run_time=b.rt(0.3))
        self.clear_all()

        # -- Toffoli
        tc = QCircuit([r"a", r"b", r"t"], cols=1, width=2.6).shift(LEFT * 4.2 + UP * 0.5)
        tg = tc.cnot(0, [0, 1], 2)
        rows = [(a, b_, t, a, b_, t ^ (a & b_)) for a in (0, 1) for b_ in (0, 1) for t in (0, 1)]
        tt2 = truth_table(["a", "b", "t", "→ a", "b", "t ⊕ ab"], rows, highlight=[6, 7],
                          col_colors={5: QYELLOW}, size=26).shift(RIGHT * 2.2)
        name = T("Toffoli  (CCX)", 30, QORANGE).next_to(tc, DOWN, 0.6)
        with self.say("Then the Toffoli gate, also called C C X: two controls and one target. The target "
                      "flips only when both controls are one.") as b:
            self.play(Create(tc.wires), FadeIn(tc.labels), FadeIn(tg), FadeIn(name), run_time=b.rt(0.35))
            self.play(FadeIn(tt2), run_time=b.rt(0.35))
        and_lab = M(r"|a\rangle|b\rangle|0\rangle \mapsto |a\rangle|b\rangle|a \wedge b\rangle", 40, QYELLOW)
        and_lab.next_to(name, DOWN, 0.4).shift(RIGHT * 0.6)
        with self.say("If the target starts at zero, the Toffoli computes the AND of the two controls. "
                      "Remember this gate. It's the currency of the whole competition: most of your "
                      "score is the number of Toffolis your circuit uses.") as b:
            self.play(Write(and_lab), run_time=b.rt(0.4))
            self.play(Indicate(name, color=QORANGE), run_time=b.rt(0.25))
        self.clear_all()

        # -- reversibility: permutations of basis states
        ins = VGroup(*[ket(format(i, "03b"), 30) for i in range(8)]).arrange(DOWN, buff=0.18).shift(LEFT * 2.5)
        outs = VGroup(*[ket(format(i, "03b"), 30) for i in range(8)]).arrange(DOWN, buff=0.18).shift(RIGHT * 2.5)
        perm = [0, 1, 2, 3, 4, 5, 7, 6]  # Toffoli
        lines = VGroup(*[Arrow(ins[i].get_right(), outs[perm[i]].get_left(), buff=0.15, stroke_width=3,
                               color=QYELLOW if perm[i] != i else MUTED, max_tip_length_to_length_ratio=0.06)
                         for i in range(8)])
        lab = T("Toffoli: a permutation of basis states", 28, INK).to_edge(UP, buff=0.5)
        with self.say("These gates permute basis states. Each input bit string goes to exactly one output "
                      "bit string, and no two inputs collide, so no information is ever lost. That's "
                      "what makes them reversible: run the circuit backwards, and you undo it exactly. "
                      "Quantum mechanics demands this. Every gate, apart from measurement, must be "
                      "reversible.") as b:
            self.play(FadeIn(lab), FadeIn(ins), FadeIn(outs), run_time=b.rt(0.2))
            self.play(LaggedStart(*[GrowArrow(l) for l in lines], lag_ratio=0.1), run_time=b.rt(0.4))
            self.play(lines.animate.set_opacity(0.4), run_time=b.rt(0.1))
        self.clear_all()

        # -- reversible classical computing with ancillas
        fc = QCircuit([r"|x\rangle", r"|0\rangle"], cols=1, width=4).shift(UP * 0.8)
        fb = fc.box(0, 0, r"U_f", QBLUE, rows=[0, 1], size=1.0)
        outx = ket("x", 40).next_to(fc.wires[0], RIGHT, 0.2)
        outf = ket("f(x)", 40, QYELLOW).next_to(fc.wires[1], RIGHT, 0.2)
        exs = T("adders · multipliers · comparators · square roots · whole decoders", 26, MUTED).shift(DOWN * 1.6)
        with self.say("With X, CNOT and Toffoli you can build any classical computation reversibly: "
                      "adders, multipliers, comparisons, even a complete error-correction decoder. The "
                      "trick is never to overwrite anything. Each result is written into fresh qubits "
                      "that start at zero. Those extra qubits are called ancillas, or scratch qubits.") as b:
            self.play(Create(fc.wires), FadeIn(fc.labels), FadeIn(fb), run_time=b.rt(0.3))
            self.play(FadeIn(outx), FadeIn(outf), run_time=b.rt(0.2))
            self.play(FadeIn(exs), run_time=b.rt(0.2))
        self.clear_all()

        # -- Bennett: compute, copy, uncompute
        bc = QCircuit([r"x", r"\text{scratch}", r"\text{out}"], cols=3, width=8).shift(UP * 0.4)
        comp = bc.box(0, 0, r"U_f", QBLUE, rows=[0, 1], size=0.9)
        copy = bc.cnot(1, [1], 2)
        unc = bc.box(2, 0, r"U_f^{-1}", QGREEN, rows=[0, 1], size=0.9)
        tags = VGroup(T("compute", 24, QBLUE).next_to(comp, UP, 0.25),
                      T("copy", 24, INK).next_to(bc.pos(1, 0), UP, 0.5),
                      T("uncompute", 24, QGREEN).next_to(unc, UP, 0.25))
        garbage = T("garbage", 26, QRED).next_to(bc.pos(0.62, 1), UP, 0.12)
        clean = M(r"|0\rangle", 36, QGREEN).next_to(bc.wires[1], RIGHT, 0.2)
        cost = T("cost: about 2× the Toffolis of computing f", 26, QORANGE).shift(DOWN * 2.4)
        with self.say("There's a catch, and it's the central theme of this competition. Scratch qubits "
                      "fill up with intermediate values: garbage. If garbage stays entangled with your "
                      "data, it ruins the interference later in the algorithm. So every scratch qubit "
                      "must be returned to zero. That's uncomputation.") as b:
            self.play(Create(bc.wires), FadeIn(bc.labels), FadeIn(comp), FadeIn(tags[0]), run_time=b.rt(0.3))
            self.play(FadeIn(garbage, shift=DOWN * 0.2), run_time=b.rt(0.2))
        with self.say("The classic recipe, due to Charles Bennett: compute, copy the answer out with "
                      "CNOTs, then run the computation backwards. The scratch returns to zero. But you "
                      "paid for the computation twice.") as b:
            self.play(FadeIn(copy), FadeIn(tags[1]), run_time=b.rt(0.25))
            self.play(FadeIn(unc), FadeIn(tags[2]), FadeOut(garbage), FadeIn(clean), run_time=b.rt(0.3))
            self.play(FadeIn(cost), run_time=b.rt(0.15))
        self.clear_all()

        # -- phase gates
        title = title_bar("Phase gates: change signs, not bits")
        zrow = VGroup(M(r"Z:", 44), M(r"|0\rangle \mapsto |0\rangle", 40), M(r"|1\rangle \mapsto -|1\rangle", 40, QYELLOW))
        zrow.arrange(RIGHT, buff=0.5)
        czrow = VGroup(M(r"CZ:", 44), M(r"|11\rangle \mapsto -|11\rangle", 40, QYELLOW), T("(others unchanged)", 26, MUTED))
        czrow.arrange(RIGHT, buff=0.5)
        cczrow = VGroup(M(r"CCZ:", 44), M(r"|111\rangle \mapsto -|111\rangle", 40, QYELLOW), T("(others unchanged)", 26, MUTED))
        cczrow.arrange(RIGHT, buff=0.5)
        grp = VGroup(zrow, czrow, cczrow).arrange(DOWN, aligned_edge=LEFT, buff=0.55).shift(UP * 0.4)
        with self.say("Now the second family: phase gates. The Z gate leaves ket zero alone, and "
                      "multiplies ket one by minus one. It changes no bits at all, only a sign. The "
                      "controlled Z, or C Z, puts a minus sign only on ket one one. And C C Z, only on "
                      "ket one one one.") as b:
            self.play(FadeIn(title), FadeIn(zrow), run_time=b.rt(0.3))
            self.play(FadeIn(czrow), run_time=b.rt(0.25))
            self.play(FadeIn(cczrow), run_time=b.rt(0.25))
        zp = M(r"Z^{t}:\; |1\rangle \mapsto e^{i\pi t}\,|1\rangle \qquad (\texttt{Z\_POW})", 44, QBLUE).shift(DOWN * 1.9)
        with self.say("More generally, Z to the power t multiplies ket one by e to the i pi t. In kickmix "
                      "this gate is called Z underscore POW.") as b:
            self.play(Write(zp), run_time=b.rt(0.6))
        self.clear_all()

        cc0 = LEFT * 3 + DOWN * 0.2
        uc = Circle(radius=2.2, color=MUTED, stroke_width=2).move_to(cc0)
        marks = VGroup()
        for t, name_, col in [(1, "Z  (t = 1)", QGREEN), (0.5, "S  (t = 1/2)", QGREEN), (0.25, "T  (t = 1/4)", QORANGE),
                              (0.1, "t = 0.1: a rotation", QRED)]:
            p = cc0 + 2.2 * np.array([np.cos(PI * t), np.sin(PI * t), 0])
            d = Dot(p, color=col, radius=0.09)
            l = T(name_, 24, col).next_to(p, (p - cc0) / np.linalg.norm(p - cc0), 0.2)
            marks.add(VGroup(Line(cc0, p, color=col, stroke_width=2), d, l))
        one = Dot(cc0 + RIGHT * 2.2, color=INK)
        lst = VGroup(T("t = 1, 1/2:  Clifford gates — cheap", 28, QGREEN),
                     T("t = 1/4:  the T gate — expensive", 28, QORANGE),
                     T("other t:  rotations — very expensive", 28, QRED)).arrange(DOWN, aligned_edge=LEFT, buff=0.4)
        lst.move_to(RIGHT * 3.2)
        with self.say("For t equal to one, it's Z. For one half, it's called the S gate. For one quarter, "
                      "the T gate. Any other angle is a general rotation. As we'll see in the next "
                      "chapter, these have wildly different prices.") as b:
            self.play(Create(uc), FadeIn(one), run_time=b.rt(0.15))
            self.play(LaggedStart(*[FadeIn(m) for m in marks], lag_ratio=0.3), run_time=b.rt(0.45))
            self.play(LaggedStart(*[FadeIn(l, shift=LEFT * 0.2) for l in lst], lag_ratio=0.3), run_time=b.rt(0.3))
        self.clear_all()

        # -- the key property
        prop = M(r"|x\rangle \;\longmapsto\; e^{i\varphi(x)}\,|\pi(x)\rangle", 64, QYELLOW).shift(UP * 0.8)
        expl = VGroup(T("permutation gates (X, CNOT, Toffoli) move the bit string", 28, INK),
                      T("diagonal phase gates (Z, CZ, CCZ, Z_POW) only attach a phase", 28, INK),
                      T("→ one basis state in, one basis state out", 28, QGREEN)).arrange(DOWN, buff=0.3).shift(DOWN * 1.4)
        with self.say("Here's the key property. Phase gates are diagonal: each basis state goes to itself, "
                      "times a phase. Permutation gates move one basis state to another. So a circuit "
                      "built only from these two kinds of gates sends every basis state to a single "
                      "basis state, times a phase. Remember the seed from chapter one? This is the "
                      "property the whole verifier is built on.") as b:
            self.play(Write(prop), run_time=b.rt(0.3))
            self.play(LaggedStart(*[FadeIn(e) for e in expl], lag_ratio=0.5), run_time=b.rt(0.5))
        self.clear_all()

        # -- Hadamard
        h = M(r"H|0\rangle = \frac{|0\rangle + |1\rangle}{\sqrt 2} \qquad H|1\rangle = \frac{|0\rangle - |1\rangle}{\sqrt 2}", 46).shift(UP * 1.5)
        hb = amplitude_bars([1 / np.sqrt(2), 1 / np.sqrt(2)], ["0", "1"], width=0.8, height=2).shift(DOWN * 1.3)
        with self.say("One more gate: the Hadamard, H. This is the gate that creates superpositions. It "
                      "turns ket zero into an equal mix of zero and one. Hadamards, and the quantum "
                      "Fourier transform built from them, are where interference happens in an "
                      "algorithm.") as b:
            self.play(Write(h), run_time=b.rt(0.4))
            self.play(FadeIn(hb), run_time=b.rt(0.3))
        note = fit(T("inside the competition's circuits, H appears only inside a measurement (HMR)", 26, MUTED), 12.5).shift(DOWN * 3.1)
        with self.say("But those parts of the algorithm aren't in this competition. Inside the "
                      "competition's circuits, H only appears in one disguised form, as part of a "
                      "special measurement. We'll meet it in chapter four.") as b:
            self.play(FadeIn(note), run_time=b.rt(0.3))
        self.clear_all()

        # -- compute, phase, uncompute
        pc = QCircuit([r"|x\rangle", r"|0\rangle"], cols=3, width=8.5).shift(UP * 0.5)
        c1 = pc.box(0, 0, r"\text{compute } f", QBLUE, rows=[0, 1], size=1.0)
        c2 = pc.box(1, 1, r"\text{phase}", QYELLOW)
        c3 = pc.box(2, 0, r"\text{uncompute}", QGREEN, rows=[0, 1], size=1.0)
        res = M(r"|x\rangle|0\rangle \;\longmapsto\; e^{2\pi i\, f(x)}\,|x\rangle|0\rangle", 50, QYELLOW).shift(DOWN * 1.8)
        with self.say("Put it together, and you get the pattern you'll see everywhere in this "
                      "competition: compute, phase, uncompute. To multiply each basis state ket x by a "
                      "phase that depends on some function f of x: compute f of x into scratch qubits. "
                      "Apply phase gates to the bits of f of x. Then uncompute f.") as b:
            self.play(Create(pc.wires), FadeIn(pc.labels), run_time=b.rt(0.15))
            self.play(FadeIn(c1), run_time=b.rt(0.2))
            self.play(FadeIn(c2), run_time=b.rt(0.2))
            self.play(FadeIn(c3), run_time=b.rt(0.2))
        with self.say("The scratch returns to zero, and only the phase is left behind. Benchmark one is "
                      "exactly this pattern, with f of x equal to one over the square root of x.") as b:
            self.play(Write(res), run_time=b.rt(0.5))
        self.clear_all()
