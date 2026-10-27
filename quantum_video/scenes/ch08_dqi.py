import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import *  # noqa: E402,F403


def flow_box(text, color, w=2.6, h=1.3, size=24):
    r = RoundedRectangle(corner_radius=0.12, width=w, height=h, color=color, stroke_width=2.5).set_fill(color, 0.08)
    t = T(text, size, color)
    fit(t, w - 0.2).move_to(r)
    return VGroup(r, t)


class Ch08Dqi(VScene):
    def construct(self):
        chapter_card(self, 8, "Benchmark II:  Reed–Solomon decoding", "the bottleneck of decoded quantum interferometry")

        with self.say("Benchmark two is the most mathematical of the three, so let's take it slowly. It "
                      "comes from an algorithm called decoded quantum interferometry, or D Q I, proposed "
                      "by researchers at Google in twenty twenty four. It's one of the most promising "
                      "candidates for a useful quantum advantage in optimization.") as b:
            t = T("Decoded Quantum Interferometry (DQI)", 40, QYELLOW, weight=BOLD)
            s = T("optimization → decoding", 30, INK).next_to(t, DOWN, 0.4)
            self.play(Write(t), run_time=b.rt(0.4))
            self.play(FadeIn(s), run_time=b.rt(0.2))
        self.clear_all()

        # -- OPI picture
        npts, nval = 11, 9
        ox, oy = -5.2, -2.4
        dx, dy = 0.75, 0.5
        rng = np.random.default_rng(11)
        allowed = [set(rng.choice(nval, 4, replace=False).tolist()) for _ in range(npts)]
        poly_vals = [int(v) for v in rng.integers(0, nval, npts)]
        for i in [0, 2, 3, 5, 6, 8, 10]:
            allowed[i].add(poly_vals[i])
        grid = VGroup()
        for i in range(npts):
            for v in range(nval):
                d = Dot([ox + i * dx, oy + v * dy, 0], radius=0.05, color=MUTED)
                if v in allowed[i]:
                    d = RoundedRectangle(corner_radius=0.05, width=0.32, height=0.32, color=QBLUE, stroke_width=2).set_fill(QBLUE, 0.25).move_to(d)
                grid.add(d)
        xl = T("evaluation points  α₀ … α_{m−1}", 22, MUTED).next_to(grid, DOWN, 0.25)
        yl = T("field values", 22, MUTED).rotate(PI / 2).next_to(grid, LEFT, 0.25)
        with self.say("The optimization problem is called optimal polynomial intersection. You're given a "
                      "list of points. At each point there's a set of allowed values, the blue squares. "
                      "The goal: find a polynomial of low degree whose value lands inside the allowed set "
                      "at as many points as possible.") as b:
            self.play(FadeIn(grid), FadeIn(xl), FadeIn(yl), run_time=b.rt(0.4))
        hits = VGroup()
        for i, v in enumerate(poly_vals):
            ok = v in allowed[i]
            hits.add(Dot([ox + i * dx, oy + v * dy, 0], radius=0.11, color=QGREEN if ok else QRED))
        path = VMobject(color=QYELLOW, stroke_width=2).set_points_as_corners([h.get_center() for h in hits])
        score = T(f"f(x) = {sum(v in allowed[i] for i, v in enumerate(poly_vals))} of {npts} constraints satisfied", 28, QGREEN)
        score.move_to(RIGHT * 3.6 + UP * 1.2)
        note = T("(in a finite field the 'curve' is just\na list of values — the picture is a cartoon)", 20, MUTED).next_to(score, DOWN, 0.3)
        with self.say("Checking a candidate is easy: evaluate the polynomial and count the hits. Finding a "
                      "really good one is believed to be hard for classical computers at these sizes. "
                      "Easy to check, hard to find: that's what makes it a candidate for verifiable "
                      "quantum advantage.") as b:
            self.play(Create(path), LaggedStart(*[FadeIn(h, scale=1.5) for h in hits], lag_ratio=0.1), run_time=b.rt(0.5))
            self.play(FadeIn(score), FadeIn(note), run_time=b.rt(0.25))
        self.clear_all()

        # -- finite field GF(2^12)
        title = title_bar("The finite field GF(2¹²)")
        e1 = [1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 1]
        e2 = [0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 1]
        r1 = BitRow(e1[::-1], size=0.5, color=QBLUE, font=24, label="a")
        r2 = BitRow(e2[::-1], size=0.5, color=QBLUE, font=24, label="b")
        r3 = BitRow([x ^ y for x, y in zip(e1, e2)][::-1], size=0.5, color=QGREEN, font=24, label="a+b")
        grp = VGroup(r1, r2, r3).arrange(DOWN, buff=0.25, aligned_edge=RIGHT).shift(UP * 0.8)
        pw = VGroup(*[MathTex(f"\\alpha^{{{11 - j}}}", font_size=22, color=MUTED).next_to(r1.cells[j], UP, 0.12) for j in range(12)])
        line = Line(r2.get_corner(DL) + DOWN * 0.1, r2.get_corner(DR) + DOWN * 0.1, color=MUTED)
        with self.say("Everything happens in a finite field. Here, G F two to the twelve, which has four "
                      "thousand and ninety six elements. Each element is a twelve-bit string, thought of "
                      "as a polynomial in a symbol alpha, with bits as coefficients.") as b:
            self.play(FadeIn(title), FadeIn(r1), FadeIn(pw), run_time=b.rt(0.5))
        xor = T("addition = bitwise XOR, no carries  →  CNOTs  →  free", 28, QGREEN).next_to(grp, DOWN, 0.5)
        with self.say("Adding two elements is just XOR, bit by bit, with no carries. In a circuit, that's "
                      "CNOT gates. Free.") as b:
            self.play(FadeIn(r2), Create(line), run_time=b.rt(0.25))
            self.play(FadeIn(r3), FadeIn(xor), run_time=b.rt(0.4))
        self.play(FadeOut(VGroup(grp, pw, line, xor)), run_time=0.6)
        ops = VGroup(
            VGroup(T("multiply", 28, INK), M(r"a\cdot b \bmod (\alpha^{12}+\alpha^6+\alpha^4+\alpha+1)", 34)).arrange(RIGHT, buff=0.4),
            VGroup(T("× known constant", 28, INK), T("linear  →  CNOTs only  →  free", 28, QGREEN)).arrange(RIGHT, buff=0.4),
            VGroup(T("× two quantum registers", 28, INK), T("63 Toffolis  (Karatsuba)", 28, QORANGE)).arrange(RIGHT, buff=0.4),
            VGroup(T("inverse  1/a", 28, INK), T("315 Toffolis  (Itoh–Tsujii)", 28, QRED)).arrange(RIGHT, buff=0.4),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.45).shift(DOWN * 0.2)
        with self.say("Multiplication is polynomial multiplication, then reduction by a fixed degree-twelve "
                      "polynomial. Multiplying by a known constant is linear, so it's also just CNOTs. "
                      "Multiplying two quantum registers costs Toffolis: sixty three in the reference "
                      "circuit's Karatsuba multiplier. And inversion, one over a, is the expensive one: "
                      "three hundred and fifteen Toffolis, using the Itoh Tsujii method.") as b:
            for o in ops:
                self.play(FadeIn(o, shift=RIGHT * 0.2), run_time=b.rt(0.18))
        self.clear_all()

        # -- Reed-Solomon codes and syndromes
        title = title_bar("Reed–Solomon codes and syndromes")
        msg = T("message = coefficients of a low-degree polynomial", 26, INK).shift(UP * 2.2)
        cw = VGroup(*[Square(0.42, color=QBLUE, stroke_width=2).set_fill(QBLUE, 0.3) for _ in range(20)]).arrange(RIGHT, buff=0.06)
        cw.shift(UP * 1.2)
        cwl = T("codeword = its values at many points", 24, QBLUE).next_to(cw, DOWN, 0.2)
        with self.say("Now, Reed Solomon codes. They're used everywhere, from QR codes to deep-space probes. "
                      "Take a message, treat it as the coefficients of a low-degree polynomial, and store "
                      "the polynomial's values at many points. A low-degree polynomial is pinned down by "
                      "just a few of its values, so the extra values are redundancy.") as b:
            self.play(FadeIn(title), FadeIn(msg), run_time=b.rt(0.25))
            self.play(LaggedStart(*[FadeIn(c) for c in cw], lag_ratio=0.05), FadeIn(cwl), run_time=b.rt(0.4))
        errs = [3, 11, 16]
        with self.say("If a few stored values get corrupted, the redundancy lets you find and fix them.") as b:
            self.play(*[cw[i].animate.set_fill(QRED, 0.8).set_stroke(QRED) for i in errs], run_time=b.rt(0.5))
        e_vec = VGroup(*[Square(0.42, color=MUTED, stroke_width=1.5) for _ in range(20)]).arrange(RIGHT, buff=0.06).shift(DOWN * 0.6)
        for i in errs:
            e_vec[i].set_fill(QRED, 0.8).set_stroke(QRED)
        el = T("error e: long and sparse  (m = 4095 symbols, at most 35 nonzero)", 24, QRED).next_to(e_vec, DOWN, 0.2)
        s_vec = VGroup(*[Square(0.42, color=QYELLOW, stroke_width=2).set_fill(QYELLOW, 0.3) for _ in range(6)]).arrange(RIGHT, buff=0.06)
        s_vec.shift(DOWN * 2.3 + RIGHT * 2)
        arr = Arrow(e_vec.get_bottom() + DOWN * 0.45 + LEFT * 2, s_vec.get_left(), color=INK, buff=0.1)
        bt = M(r"s = B^{T} e", 38, QYELLOW).next_to(arr, LEFT, 0.2)
        sl = T("syndrome: short  (70 symbols = 840 bits)", 24, QYELLOW).next_to(s_vec, DOWN, 0.2)
        with self.say("The tool for that is the syndrome: a short fingerprint of the error, computed from "
                      "the received word by a fixed linear map. It's zero exactly when there are no "
                      "errors, and different small error patterns give different syndromes. Decoding "
                      "means: given the syndrome, work out the error.") as b:
            self.play(FadeIn(e_vec), FadeIn(el), run_time=b.rt(0.3))
            self.play(GrowArrow(arr), FadeIn(bt), run_time=b.rt(0.2))
            self.play(FadeIn(s_vec), FadeIn(sl), run_time=b.rt(0.2))
        self.clear_all()

        # -- DQI pipeline
        boxes = VGroup(flow_box("superposition of\nsparse errors e", QBLUE),
                       flow_box("compute the\nsyndrome Bᵀe", QBLUE),
                       flow_box("DECODE:\nerase e using s", QORANGE),
                       flow_box("quantum Fourier\ntransform", QBLUE),
                       flow_box("measure:\na good polynomial", QGREEN)).arrange(RIGHT, buff=0.35)
        fit(boxes, 13.4).shift(UP * 0.8)
        arrows = VGroup(*[Arrow(boxes[i].get_right(), boxes[i + 1].get_left(), buff=0.03, color=INK, stroke_width=3)
                          for i in range(4)])
        with self.say("Here's D Q I's big idea, at a high level. The quantum Fourier transform turns the "
                      "optimization problem into a decoding problem. D Q I prepares a superposition of "
                      "sparse error patterns e, and computes their syndromes.") as b:
            self.play(FadeIn(boxes[0]), run_time=b.rt(0.3))
            self.play(GrowArrow(arrows[0]), FadeIn(boxes[1]), run_time=b.rt(0.3))
        why = T("erasing e without looking at it = computing e from s, reversibly, in superposition", 26, QORANGE).shift(DOWN * 1.1)
        fit(why, 13)
        bench = T("← this is Benchmark II", 30, QORANGE, weight=BOLD).next_to(boxes[2], DOWN, 1.4)
        with self.say("Then it must erase e, keeping only the syndrome. But erasing e without looking at it "
                      "means computing e from its syndrome. That's decoding: done reversibly, in "
                      "superposition. Finally, a Fourier transform produces a state whose measurement "
                      "gives good polynomials. The decoder is by far the most expensive part, so it's "
                      "the benchmark.") as b:
            self.play(GrowArrow(arrows[1]), FadeIn(boxes[2]), run_time=b.rt(0.2))
            self.play(FadeIn(why), run_time=b.rt(0.2))
            self.play(GrowArrow(arrows[2]), FadeIn(boxes[3]), GrowArrow(arrows[3]), FadeIn(boxes[4]), run_time=b.rt(0.25))
            self.play(FadeOut(why), FadeIn(bench), Indicate(boxes[2], color=QORANGE), run_time=b.rt(0.2))
        self.clear_all()

        # -- the sign twist and the task
        sgn = M(r"\sum_e a_e\,|e\rangle|B^Te\rangle \;\xrightarrow{\text{erase } e \text{ by measurement}}\; \sum_e a_e\,(-1)^{c\cdot \mathrm{bin}(e)}\,|B^Te\rangle", 40).shift(UP * 2)
        fit(sgn, 13)
        sgl = T("c = random measurement record (classical)", 26, QPURPLE).next_to(sgn, DOWN, 0.3)
        with self.say("There's a twist. The improved construction erases the error symbols one at a time, "
                      "by measurement: our old friend, measurement-based uncomputation. Each measurement "
                      "leaves behind a sign: minus one to the c dot e, where c is the random record of "
                      "measurement outcomes. Those signs must be cancelled before the final Fourier "
                      "transform. And cancelling them still requires knowing e, which means decoding.") as b:
            self.play(Write(sgn), run_time=b.rt(0.4))
            self.play(FadeIn(sgl), run_time=b.rt(0.2))
        task = M(r"U_c\,|s\rangle|0\rangle_W = (-1)^{\,c\,\cdot\,\mathrm{bin}(e(s))}\;|s\rangle|0\rangle_W", 50, QYELLOW).shift(DOWN * 0.3)
        req = VGroup(T("input: syndrome s (840 qubits) + classical record c (49,140 bits)", 26, INK),
                     T("e(s): the unique error of weight ≤ 35 with syndrome s — never given to you", 26, QRED),
                     T("keep s unchanged, return all workspace W to 0, apply exactly that sign", 26, INK)).arrange(DOWN, buff=0.2)
        fit(req, 13).next_to(task, DOWN, 0.5)
        with self.say("So here's the benchmark. Your circuit receives a syndrome s in eight hundred and "
                      "forty qubits, and a classical record c of about forty nine thousand bits. It must "
                      "apply the sign, minus one to the c dot e of s, where e of s is the unique error "
                      "of weight at most thirty five with that syndrome. It must leave s unchanged, and "
                      "return all workspace to zero. The error itself is never given to you. Your circuit "
                      "has to find it.") as b:
            self.play(Write(task), run_time=b.rt(0.3))
            self.play(LaggedStart(*[FadeIn(r) for r in req], lag_ratio=0.5), run_time=b.rt(0.5))
        self.clear_all()

        params = VGroup(stat_card("positions m", "4,095", QBLUE, 3.1), stat_card("syndrome symbols n", "70", QYELLOW, 3.1),
                        stat_card("field", "GF(2¹²)", QGREEN, 3.1), stat_card("max errors ℓ", "35", QRED, 3.1))
        params.arrange(RIGHT, buff=0.25).shift(UP * 1.2)
        dist = T("code distance 71  →  any 35 errors give a unique syndrome", 28, INK).next_to(params, DOWN, 0.6)
        with self.say("The numbers: four thousand and ninety five positions, seventy syndrome symbols, the "
                      "field G F two to the twelve, and up to thirty five errors. The code has minimum "
                      "distance seventy one, which is why any thirty five errors give a unique syndrome.") as b:
            self.play(LaggedStart(*[FadeIn(p, shift=UP * 0.2) for p in params], lag_ratio=0.25), run_time=b.rt(0.6))
            self.play(FadeIn(dist), run_time=b.rt(0.2))
        self.clear_all()

        # -- reference decoder
        title = title_bar("The reference decoder")
        st = VGroup(flow_box("1. Extended Euclid\nsolve the key equation", QBLUE, w=3.7, h=1.5, size=24),
                    flow_box("2. Chien search + Forney\nfind errors, apply signs", QYELLOW, w=3.7, h=1.5, size=24),
                    flow_box("3. Euclid in reverse\nrestore s, clean workspace", QGREEN, w=3.7, h=1.5, size=24)).arrange(RIGHT, buff=0.45)
        st.shift(UP * 1.0)
        ar = VGroup(*[Arrow(st[i].get_right(), st[i + 1].get_left(), buff=0.05, color=INK) for i in range(2)])
        key = M(r"\sigma(z)\,S(z) \equiv \Omega(z) \pmod{z^{70}}", 42, QBLUE).shift(DOWN * 0.9)
        keyl = T("σ: error locator (its roots mark error positions)   Ω: error evaluator", 24, MUTED).next_to(key, DOWN, 0.3)
        with self.say("The reference decoder has three stages. First, solve the so-called key equation "
                      "with the extended Euclidean algorithm, run on polynomials. That gives two "
                      "polynomials: the error locator, sigma, whose roots mark where the errors are, and "
                      "the error evaluator, omega.") as b:
            self.play(FadeIn(title), FadeIn(st[0]), run_time=b.rt(0.3))
            self.play(Write(key), FadeIn(keyl), run_time=b.rt(0.4))
        with self.say("Second, a Chien search: evaluate sigma at all four thousand and ninety five "
                      "positions. A zero marks an error. There, Forney's formula gives the error value, "
                      "and Z gates, chosen by the record bits, apply the sign. Third, run the Euclidean "
                      "algorithm backwards, to restore the syndrome and clean up.") as b:
            self.play(GrowArrow(ar[0]), FadeIn(st[1]), run_time=b.rt(0.35))
            self.play(GrowArrow(ar[1]), FadeIn(st[2]), run_time=b.rt(0.35))
        self.clear_all()

        cards = VGroup(stat_card("qubits Q", "1,893", QBLUE, 3.6), stat_card("Toffolis T", "5,725,461", QORANGE, 3.6))
        cards.arrange(RIGHT, buff=0.5).shift(UP * 1.5)
        why2 = T("e.g. one field inversion at each of 4,095 positions in the Chien search", 26, MUTED).next_to(cards, DOWN, 0.4)
        with self.say("The reference costs one thousand eight hundred ninety three qubits, and about five "
                      "point seven million Toffolis. A lot of that goes on doing a field inversion at every "
                      "one of the four thousand ninety five positions.") as b:
            self.play(LaggedStart(*[FadeIn(c) for c in cards], lag_ratio=0.4), run_time=b.rt(0.5))
            self.play(FadeIn(why2), run_time=b.rt(0.2))
        score = M(r"\text{cost} = R(\varepsilon_+)\cdot Q^2\cdot T", 54, QYELLOW).shift(DOWN * 1.0)
        q2 = T("qubits count double: −1% qubits = −2% Toffolis", 28, QGREEN).next_to(score, DOWN, 0.4)
        with self.say("The cost formula is R of epsilon, times Q squared, times T. Qubits are squared, so "
                      "cutting qubits by one percent is worth as much as cutting Toffolis by two "
                      "percent.") as b:
            self.play(Write(score), run_time=b.rt(0.4))
            self.play(FadeIn(q2), run_time=b.rt(0.3))
        self.clear_all()

        # -- repetition penalty curve
        # x axis is log10(eps) + 5, so it starts at 0 and the y axis sits on the left
        ax = Axes(x_range=[0, 4, 1], y_range=[1, 2.2, 0.5], x_length=6.8, y_length=3.8,
                  axis_config={"color": MUTED, "font_size": 22}, tips=False).shift(LEFT * 2.9 + DOWN * 0.4)
        ax.add_coordinates({0: r"$10^{-5}$", 1: r"$10^{-4}$", 2: r"$10^{-3}$", 3: r"$10^{-2}$", 4: r"$10^{-1}$"}, {1.5: "1.5", 2: "2"})
        Rf = lambda x: math.log(2) / (-math.log(0.5 + 2 * math.sqrt(10 ** (x - 5))))
        curve = ax.plot(Rf, x_range=[0, 3.1, 0.01], color=QYELLOW, stroke_width=4)
        lab = T("repetition penalty R(ε₊)", 24, QYELLOW).next_to(ax, UP, 0.15)
        xl = T("certified failure rate ε₊", 22, MUTED).next_to(ax, DOWN, 0.4)
        floor = Dot(ax.c2p(math.log10(8.66e-4) + 5, Rf(math.log10(8.66e-4) + 5)), color=QGREEN, radius=0.1)
        expl = VGroup(T("102,400 test syndromes", 26, INK),
                      T("errors drawn as DQI would draw them", 22, MUTED),
                      T("(average weight ≈ 31; weight 35 ≈ 2.8%)", 22, MUTED),
                      T("perfect decoder: R ≈ 1.19", 26, QGREEN),
                      T("1% failures: R ≈ 1.94", 26, QORANGE),
                      T("≥ 1/16 failures: no score", 26, QRED)).arrange(DOWN, aligned_edge=LEFT, buff=0.22)
        fit(expl, 5.2).move_to(RIGHT * 4.0)
        with self.say("R is a repetition penalty. Approximate decoders are allowed: if your decoder fails "
                      "sometimes, D Q I just has to be run more times. The verifier tests one hundred and "
                      "two thousand four hundred syndromes, with errors drawn the way D Q I would actually "
                      "produce them, and turns the failure count into a certified bound epsilon plus.") as b:
            self.play(Create(ax), FadeIn(lab), FadeIn(xl), run_time=b.rt(0.25))
            self.play(Create(curve), run_time=b.rt(0.3))
            self.play(FadeIn(expl[:3]), run_time=b.rt(0.2))
        with self.say("Even a perfect decoder pays R of about one point one nine, because a hundred thousand "
                      "shots can't certify anything better. One percent failures nearly doubles the cost. "
                      "And failing more than one time in sixteen gets no score at all.") as b:
            self.play(FadeIn(floor), FadeIn(expl[3]), run_time=b.rt(0.3))
            self.play(FadeIn(expl[4]), run_time=b.rt(0.2))
            self.play(FadeIn(expl[5]), run_time=b.rt(0.2))
        self.clear_all()

        # -- where the points are
        res = VGroup(T("public notebooks (Oct 2026)", 28, MUTED),
                     T("≈ 880 qubits, under 1 million Toffolis", 34, QGREEN, weight=BOLD),
                     T("≈ 27× cheaper than the reference — and leaders are higher still", 28, QGREEN)).arrange(DOWN, buff=0.3).shift(UP * 2)
        ideas = VGroup(T("· work in place: reuse the 840 syndrome qubits as workspace", 26, INK),
                       T("· fewer field inversions: share, batch, or avoid them", 26, INK),
                       T("· cheaper multipliers and smarter polynomial bookkeeping", 26, INK),
                       T("· design for the typical error weight; accept rare failures if R stays small", 26, INK)).arrange(DOWN, aligned_edge=LEFT, buff=0.25)
        fit(ideas, 13).shift(DOWN * 1.2)
        with self.say("Where are the points? Public notebooks report around eight hundred and eighty "
                      "qubits and under a million Toffolis. That's roughly twenty seven times cheaper than "
                      "the reference, and the leaders are higher still.") as b:
            self.play(LaggedStart(*[FadeIn(r) for r in res], lag_ratio=0.4), run_time=b.rt(0.6))
        with self.say("The ideas: work almost entirely in place, reusing the eight hundred and forty syndrome "
                      "qubits as workspace. Do fewer field inversions, by sharing them, batching them, or "
                      "avoiding them. Use cheaper multipliers and smarter bookkeeping for the polynomials. "
                      "And design for the typical case: most error patterns have fewer than thirty five "
                      "errors, and rare failures are allowed, as long as R stays small.") as b:
            self.play(LaggedStart(*[FadeIn(i, shift=RIGHT * 0.2) for i in ideas], lag_ratio=0.5), run_time=b.rt(0.8))
        self.clear_all()
