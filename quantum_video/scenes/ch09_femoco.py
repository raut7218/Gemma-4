import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import *  # noqa: E402,F403


def flow_box(text, color, w=2.6, h=1.3, size=24):
    r = RoundedRectangle(corner_radius=0.12, width=w, height=h, color=color, stroke_width=2.5).set_fill(color, 0.08)
    t = T(text, size, color)
    fit(t, w - 0.2).move_to(r)
    return VGroup(r, t)


class Ch09Femoco(VScene):
    def construct(self):
        chapter_card(self, 9, "Benchmark III:  FeMoCo", "lookups and rotations for quantum chemistry")

        # -- the molecule (cartoon)
        rng = np.random.default_rng(4)
        fe = [np.array([np.cos(a), np.sin(a), 0]) * 1.1 + LEFT * 3.2 for a in np.linspace(0, 2 * PI, 7, endpoint=False)]
        atoms = VGroup(*[Circle(radius=0.28, color=QORANGE, stroke_width=2).set_fill(QORANGE, 0.5).move_to(p) for p in fe])
        mo = Circle(radius=0.34, color=QPURPLE, stroke_width=2).set_fill(QPURPLE, 0.6).move_to(LEFT * 3.2 + RIGHT * 2.0)
        c = Circle(radius=0.2, color=MUTED).set_fill(MUTED, 0.8).move_to(LEFT * 3.2)
        s_atoms = VGroup(*[Circle(radius=0.2, color=QYELLOW).set_fill(QYELLOW, 0.5).move_to(
            LEFT * 3.2 + 1.9 * np.array([np.cos(a), np.sin(a), 0])) for a in np.linspace(0.3, 2 * PI + 0.3, 9, endpoint=False)])
        bonds = VGroup(*[Line(c.get_center(), a.get_center(), color=MUTED, stroke_width=1.5) for a in atoms])
        bonds.add(*[Line(fe[i], s_atoms[i % 9].get_center(), color=MUTED, stroke_width=1.5) for i in range(7)])
        mol = VGroup(bonds, atoms, s_atoms, mo, c)
        leg = VGroup(T("Fe", 22, QORANGE), T("Mo", 22, QPURPLE), T("S", 22, QYELLOW), T("C", 22, MUTED)).arrange(RIGHT, buff=0.4).next_to(mol, DOWN, 0.4)
        cart = T("(cartoon, not to scale)", 18, MUTED).next_to(leg, DOWN, 0.15)
        txt = VGroup(T("FeMoCo: the iron–molybdenum cofactor", 28, INK, weight=BOLD),
                     T("heart of nitrogenase, the enzyme bacteria use", 24, INK),
                     T("to turn N₂ from the air into ammonia", 24, INK),
                     T("industry: the Haber–Bosch process,", 24, MUTED),
                     T("roughly 1–2% of the world's energy", 24, MUTED)).arrange(DOWN, aligned_edge=LEFT, buff=0.2).move_to(RIGHT * 3)
        with self.say("Benchmark three is quantum chemistry. The target is FeMoCo, the iron molybdenum "
                      "cofactor at the heart of nitrogenase. That's the enzyme bacteria use to turn "
                      "nitrogen from the air into ammonia, at room temperature. Industry does the same "
                      "job with the Haber Bosch process, which consumes something like one to two "
                      "percent of the world's energy. Understanding FeMoCo is one of the famous goals "
                      "for quantum computers.") as b:
            self.play(FadeIn(mol), FadeIn(leg), FadeIn(cart), run_time=b.rt(0.3))
            self.play(LaggedStart(*[FadeIn(t) for t in txt], lag_ratio=0.4), run_time=b.rt(0.55))
        self.clear_all()

        # -- the Hamiltonian
        nums = VGroup(stat_card("spatial orbitals N", "76", QBLUE, 3.4), stat_card("electrons η", "113", QBLUE, 3.4)).arrange(RIGHT, buff=0.5).shift(UP * 2)
        h = M(r"H = \sum_{pq} h^{(1)}_{pq}\,E_{pq} \;+\; \tfrac12\!\sum_{pqrs} h^{(2)}_{pqrs}\,E_{pq}E_{rs}", 44).shift(UP * 0.2)
        cnt = VGroup(T("h⁽¹⁾: 76² ≈ 5,800 numbers", 28, INK), T("h⁽²⁾: 76⁴ ≈ 33 million numbers", 28, QORANGE)).arrange(DOWN, buff=0.3).shift(DOWN * 1.6)
        with self.say("We want its ground state energy. The model uses seventy six orbitals, and one "
                      "hundred and thirteen electrons. The Hamiltonian is defined by one-body integrals, "
                      "with about six thousand numbers, and two-body integrals, with seventy six to the "
                      "fourth: about thirty three million numbers.") as b:
            self.play(FadeIn(nums), run_time=b.rt(0.25))
            self.play(Write(h), run_time=b.rt(0.35))
            self.play(FadeIn(cnt), run_time=b.rt(0.25))
        self.clear_all()

        # -- block encoding
        big = Square(4, color=MUTED, stroke_width=2).shift(LEFT * 3)
        blk = Square(2, color=QYELLOW, stroke_width=3).set_fill(QYELLOW, 0.15).move_to(big.get_corner(UL), aligned_edge=UL)
        bl = M(r"H/\lambda", 46, QYELLOW).move_to(blk)
        rest = M(r"\ast", 50, MUTED).move_to(big.get_center() + DR * 1)
        ul = T("a bigger unitary U", 24, MUTED).next_to(big, DOWN, 0.2)
        right = VGroup(T("block encoding: H hidden in a corner of a unitary", 28, INK),
                       T("phase estimation calls U  ∝ λ / (target accuracy)  times", 28, INK),
                       T("smaller λ  →  fewer calls  →  faster algorithm", 28, QGREEN)).arrange(DOWN, aligned_edge=LEFT, buff=0.4)
        fit(right, 7).move_to(RIGHT * 3.3)
        with self.say("Energies are estimated with quantum phase estimation, applied to a block encoding "
                      "of H. That's a unitary circuit that holds H, divided by a normalization lambda, in "
                      "one corner of a bigger matrix. The algorithm calls this circuit a number of times "
                      "proportional to lambda over the accuracy you want. So a smaller lambda means a "
                      "faster algorithm, and a cheaper circuit means each call costs less.") as b:
            self.play(Create(big), FadeIn(ul), run_time=b.rt(0.15))
            self.play(FadeIn(blk), Write(bl), FadeIn(rest), run_time=b.rt(0.2))
            self.play(LaggedStart(*[FadeIn(r) for r in right], lag_ratio=0.5), run_time=b.rt(0.5))
        self.clear_all()

        lcu = M(r"H = \sum_k w_k\, U_k \qquad \lambda = \sum_k |w_k|", 50).shift(UP * 1.8)
        prep = VGroup(flow_box("PREPARE\namplitudes √(w_k / λ)", QBLUE, 3.6, 1.4, 26),
                      flow_box("SELECT\napply U_k for index k", QGREEN, 3.6, 1.4, 26),
                      flow_box("PREPARE†\nunprepare", QBLUE, 3.6, 1.4, 26)).arrange(RIGHT, buff=0.5).shift(DOWN * 0.6)
        ars = VGroup(*[Arrow(prep[i].get_right(), prep[i + 1].get_left(), buff=0.05, color=INK) for i in range(2)])
        with self.say("The standard construction is a linear combination of unitaries. Write H as a "
                      "weighted sum of simple pieces. Prepare a state whose amplitudes are the square "
                      "roots of the weights. Apply the piece chosen by the index. Then unprepare. Lambda "
                      "is the sum of the weights.") as b:
            self.play(Write(lcu), run_time=b.rt(0.3))
            self.play(FadeIn(prep[0]), run_time=b.rt(0.15))
            self.play(GrowArrow(ars[0]), FadeIn(prep[1]), run_time=b.rt(0.15))
            self.play(GrowArrow(ars[1]), FadeIn(prep[2]), run_time=b.rt(0.15))
        self.clear_all()

        # -- tensor factorization
        title = title_bar("Compress the 33 million numbers: DF-THC factorization")
        f1 = M(r"X^{(\rho c)}_{pq} = \sum_{b=1}^{B} w^{(\rho c)}_b\; u^{(\rho)}_{b,p}\, u^{(\rho)}_{b,q}", 46, QBLUE).shift(UP * 1.4)
        f2 = M(r"h^{(2)}_{pqrs} \;\approx\; \sum_{\rho=1}^{R}\sum_{c=1}^{C} X^{(\rho c)}_{pq}\, X^{(\rho c)}_{rs}", 46, QYELLOW).next_to(f1, DOWN, 0.5)
        u = T("u: unit vectors in 76 dimensions   ·   w: weights", 26, MUTED).next_to(f2, DOWN, 0.5)
        with self.say("Feeding thirty three million numbers into a circuit would be hopeless. So the "
                      "two-body tensor is compressed with a tensor factorization. You choose R groups, "
                      "each with B unit vectors u, in seventy six dimensions, plus C sets of weights per "
                      "group. The tensor is rebuilt from sums of products of these vectors.") as b:
            self.play(FadeIn(title), Write(f1), run_time=b.rt(0.4))
            self.play(Write(f2), FadeIn(u), run_time=b.rt(0.4))
        con = VGroup(T("constraint: reconstruction error ≤ 20 mHa (Frobenius norm)", 28, QRED),
                     T("baseline: (R, B, C) = (65, 60, 60)", 28, INK)).arrange(DOWN, buff=0.25).next_to(u, DOWN, 0.5)
        with self.say("The factorization must reproduce the true integrals to within twenty milli-hartree, "
                      "measured in the Frobenius norm. The provided baseline uses sixty five groups, sixty "
                      "vectors each, and sixty weight copies. This part should feel familiar to an A I "
                      "engineer: it's fitting a low-rank model to a big tensor, with gradient descent, "
                      "under constraints.") as b:
            self.play(FadeIn(con[0]), run_time=b.rt(0.25))
            self.play(FadeIn(con[1]), run_time=b.rt(0.25))
        self.clear_all()

        # -- Givens tree
        title = title_bar("Storing a unit vector as angles on a tree")
        pos = {0: [0, 2.1], 1: [-2.2, 1.0], 2: [2.2, 1.0], 3: [-3.3, -0.1], 4: [-1.1, -0.1], 5: [1.1, -0.1], 6: [3.3, -0.1], 7: [-3.3, -1.2]}
        edges = [(0, 1), (0, 2), (1, 3), (1, 4), (2, 5), (2, 6), (3, 7)]
        thetas = [0.9, 0.7, 0.8, 0.5, 1.0, 0.6, 0.7]
        nodes = VGroup(*[Circle(radius=0.27, color=QBLUE, stroke_width=2.5).move_to([x - 2.6, y, 0]) for x, y in pos.values()])
        nlab = VGroup(*[T(str(i), 22, INK).move_to(nodes[i]) for i in range(8)])
        elines = VGroup(*[Line(nodes[p].get_center(), nodes[q].get_center(), color=MUTED, stroke_width=2.5, buff=0.27) for p, q in edges])
        tl = VGroup(*[MathTex(f"\\theta_{k}", font_size=26, color=QYELLOW).move_to(elines[k].get_center() + LEFT * 0.25 + UP * 0.1) for k in range(7)])
        u = np.zeros(8)
        u[0] = 1.0
        chart_o = RIGHT * 3.6 + DOWN * 2.6

        def chart(vec):
            g = VGroup()
            for i, v in enumerate(vec):
                hgt = max(abs(v) * 2.6, 0.02)
                r = Rectangle(width=0.32, height=hgt, stroke_width=0).set_fill(QYELLOW if v > 1e-9 else MUTED, 0.85)
                r.move_to(chart_o + RIGHT * (i * 0.42 - 1.5) + UP * hgt / 2)
                g.add(r)
            for i in range(8):
                g.add(T(str(i), 18, MUTED).move_to(chart_o + RIGHT * (i * 0.42 - 1.5) + DOWN * 0.2))
            return g

        bars = chart(u)
        cl = T("vector u", 22, QYELLOW).next_to(bars, UP, 0.1).shift(UP * 2.6)
        with self.say("Now, how does the circuit use a unit vector? Through Givens rotations, arranged on a "
                      "tree. Picture a tree over the orbitals, here just eight of them. Start with all of "
                      "the vector's weight on orbital zero.") as b:
            self.play(FadeIn(title), Create(elines), FadeIn(nodes), FadeIn(nlab), run_time=b.rt(0.35))
            self.play(FadeIn(bars), FadeIn(cl), nodes[0].animate.set_fill(QYELLOW, 0.5), run_time=b.rt(0.3))
        rule = M(r"u_q \leftarrow u_p \sin\theta, \qquad u_p \leftarrow u_p\cos\theta", 38, QYELLOW).to_edge(DOWN, buff=0.35).shift(LEFT * 3)
        with self.say("Each edge of the tree is a rotation by an angle theta, that moves some of the "
                      "weight from the parent to the child. The child gets the parent's value times sine "
                      "theta, and the parent keeps cosine theta.") as b:
            self.play(FadeIn(tl), Write(rule), run_time=b.rt(0.4))
            for k, (p, q) in enumerate(edges[:3]):
                u[q] = u[p] * np.sin(thetas[k])
                u[p] = u[p] * np.cos(thetas[k])
                self.play(Indicate(elines[k], color=QYELLOW), nodes[q].animate.set_fill(QYELLOW, 0.5),
                          Transform(bars, chart(u)), run_time=b.rt(0.15))
        with self.say("Seventy six orbitals means seventy five edges, so seventy five angles, and with "
                      "them you can reach any unit vector. On the quantum side, each edge becomes a "
                      "fermionic Givens rotation, controlled by the bits of its angle.") as b:
            for k, (p, q) in enumerate(edges[3:], start=3):
                u[q] = u[p] * np.sin(thetas[k])
                u[p] = u[p] * np.cos(thetas[k])
                self.play(Indicate(elines[k], color=QYELLOW), nodes[q].animate.set_fill(QYELLOW, 0.5),
                          Transform(bars, chart(u)), run_time=b.rt(0.15))
        self.clear_all()

        # -- what you build: the angle loader
        title = title_bar("What you build: the angle loaders (QROM)", QPURPLE)
        addr = VGroup(T("selection", 24, QPURPLE), ket("a", 40, QPURPLE)).arrange(DOWN).shift(LEFT * 5 + UP * 0.6)
        tbl = VGroup()
        for i, lab_ in enumerate(["a = 0", "a = 1", "  ⋮", "a = 3,975"]):
            row = VGroup(T(lab_, 22, MUTED), T("θ₀  θ₁  θ₂  …  θ₇₄", 22, INK)).arrange(RIGHT, buff=0.4)
            tbl.add(row)
        tbl.arrange(DOWN, buff=0.2, aligned_edge=LEFT).shift(LEFT * 0.9 + UP * 0.6)
        tb = SurroundingRectangle(tbl, color=QPURPLE, buff=0.2)
        words = VGroup(*[VGroup(Rectangle(width=1.0, height=0.45, color=QYELLOW, stroke_width=2),
                                T(f"word_{j}", 18, QYELLOW)) for j in range(4)])
        for w in words:
            w[1].move_to(w[0])
        words.arrange(DOWN, buff=0.12).shift(RIGHT * 4.6 + UP * 0.6)
        ar1 = Arrow(addr.get_right(), tb.get_left(), color=INK, buff=0.15)
        ar2 = Arrow(tb.get_right(), words.get_left(), color=INK, buff=0.15)
        info = VGroup(T("76 one-body + R·B two-body vectors = 3,976 addresses (baseline)", 24, INK),
                      T("each angle is a b_rot-bit word  (baseline: 12 bits)", 24, INK)).arrange(DOWN, buff=0.2).shift(DOWN * 2.2)
        with self.say("And this is the circuit you actually build: the angle loader. Given the address of "
                      "a vector in a selection register, it writes that vector's angles into word "
                      "registers. It's a lookup table, a QROM. With the baseline factorization, there are "
                      "seventy six plus R times B entries: three thousand nine hundred seventy six vectors, "
                      "with seventy five angles each, every angle a twelve-bit word.") as b:
            self.play(FadeIn(title), FadeIn(addr), run_time=b.rt(0.15))
            self.play(GrowArrow(ar1), FadeIn(tbl), Create(tb), run_time=b.rt(0.25))
            self.play(GrowArrow(ar2), FadeIn(words), run_time=b.rt(0.2))
            self.play(FadeIn(info), run_time=b.rt(0.2))
        self.clear_all()

        # -- batches
        title = title_bar("Streaming the angles in batches of J words")
        batches = VGroup()
        for k in range(4):
            bx = VGroup(*[Square(0.42, color=QBLUE, stroke_width=2).set_fill(QBLUE, 0.15 + 0.15 * k) for _ in range(5)]).arrange(RIGHT, buff=0.05)
            batches.add(VGroup(bx, T(f"batch {k}", 20, MUTED).next_to(bx, DOWN, 0.1)))
        batches.arrange(RIGHT, buff=0.35).shift(UP * 1.2)
        xr = M(r"\text{ANGLE}_k:\; |a\rangle|z\rangle \mapsto |a\rangle\,|z \oplus \text{batch}_k(a) \oplus \text{batch}_{k-1}(a)\rangle", 38).shift(DOWN * 0.4)
        fit(xr, 13)
        notes = VGroup(T("forward: the J word registers step from batch to batch, in place", 24, INK),
                       T("reverse: the same circuits, backwards, clear the registers", 24, INK),
                       T("each ANGLE_k circuit may use at most 128 qubits", 24, QRED)).arrange(DOWN, buff=0.2).shift(DOWN * 2.2)
        with self.say("The seventy five angles are streamed in batches of J words. Circuit k XORs in the "
                      "difference between batch k and batch k minus one. So the same J registers step from "
                      "batch to batch in place, and running the family backwards clears them. Each of "
                      "these circuits may use at most one hundred and twenty eight qubits.") as b:
            self.play(FadeIn(title), LaggedStart(*[FadeIn(bt) for bt in batches], lag_ratio=0.2), run_time=b.rt(0.3))
            self.play(Write(xr), run_time=b.rt(0.3))
            self.play(LaggedStart(*[FadeIn(n) for n in notes], lag_ratio=0.4), run_time=b.rt(0.3))
        self.clear_all()

        # -- the score
        sc = M(r"\text{cost} = \lambda_{\text{eff}} \times T_{\text{total}} \times Q_{\text{total}}", 54, QYELLOW).shift(UP * 2.3)
        parts = VGroup(T("T_total: your ANGLE circuits, forward + reverse (simulated)", 26, INK),
                       T("   + formula costs for the parts you don't build:", 26, MUTED),
                       T("     state preparations and the 75 Givens rotations (grow with b_rot)", 26, MUTED),
                       T("Q_total: persistent registers + J·b_rot word qubits + largest scratch", 26, INK)).arrange(DOWN, aligned_edge=LEFT, buff=0.2)
        fit(parts, 13).shift(UP * 0.2)
        with self.say("The score is lambda effective, times total Toffolis, times total qubits. The Toffoli "
                      "count includes your angle circuits, run forward and backward, plus formula-based "
                      "costs for the parts you don't build: the state preparations, and the Givens "
                      "rotations, whose cost grows with the number of angle bits. Total qubits counts the "
                      "persistent registers, the word registers, and the largest temporary workspace.") as b:
            self.play(Write(sc), run_time=b.rt(0.3))
            self.play(LaggedStart(*[FadeIn(p) for p in parts], lag_ratio=0.4), run_time=b.rt(0.5))
        le = M(r"\lambda_{\text{eff}} = \sqrt{E_{\text{gap}}\,(2\Lambda - E_{\text{gap}})}", 44, QBLUE).shift(DOWN * 1.8)
        fl = T("anti-gaming floors:  Λ > 49.0 Ha   and   E_gap > 3.9149 Ha", 26, QRED).next_to(le, DOWN, 0.3)
        with self.say("Lambda effective comes from a trick called spectrum amplification. It combines the "
                      "raw normalization, capital lambda, with an energy gap that measures how far the "
                      "factorization's sum-of-squares lower bound sits below the true ground state energy. "
                      "Smaller is better. And to stop degenerate factorizations from gaming it, capital "
                      "lambda must stay above forty nine, and the gap above three point nine one "
                      "hartree.") as b:
            self.play(Write(le), run_time=b.rt(0.35))
            self.play(FadeIn(fl), run_time=b.rt(0.25))
        self.clear_all()

        base = VGroup(stat_card("λ_eff", "49.30", QBLUE, 3.0), stat_card("Toffolis", "93,237", QORANGE, 3.0),
                      stat_card("qubits", "730", QBLUE, 3.0), stat_card("score", "≈ 3.36 × 10⁹", QYELLOW, 3.0)).arrange(RIGHT, buff=0.25).shift(UP * 1.6)
        bl = T("baseline", 26, MUTED).next_to(base, UP, 0.25)
        pub = VGroup(T("a public notebook (Oct 2026): one group of 496 vectors, (R, B, C) = (1, 496, 384)", 24, QGREEN),
                     T("572 addresses instead of 3,976  →  ≈ 20,300 Toffolis, λ_eff 47.9  →  ≈ 4× cheaper", 24, QGREEN)).arrange(DOWN, buff=0.2)
        fit(pub, 13).shift(DOWN * 0.3)
        with self.say("The baseline: lambda effective forty nine point three, about ninety three thousand "
                      "Toffolis, seven hundred thirty qubits. A score of about three point three six "
                      "billion.") as b:
            self.play(FadeIn(bl), LaggedStart(*[FadeIn(c_) for c_ in base], lag_ratio=0.3), run_time=b.rt(0.6))
        with self.say("A public notebook already does about four times better, mostly by changing the "
                      "factorization: a single group of four hundred ninety six vectors. That's only five "
                      "hundred seventy two lookup entries instead of almost four thousand, and the Toffoli "
                      "count drops from ninety three thousand to about twenty thousand.") as b:
            self.play(FadeIn(pub[0]), run_time=b.rt(0.3))
            self.play(FadeIn(pub[1]), run_time=b.rt(0.3))
        self.clear_all()

        lev = VGroup(VGroup(T("classical levers", 30, QBLUE, weight=BOLD),
                            T("· fewer vectors (smaller R·B)", 24, INK),
                            T("· lower λ_eff, inside the floors", 24, INK),
                            T("· fewer angle bits b_rot", 24, INK),
                            T("· error ≤ 20 mHa: spend it wisely", 24, INK)).arrange(DOWN, aligned_edge=LEFT, buff=0.22),
                     VGroup(T("quantum levers", 30, QPURPLE, weight=BOLD),
                            T("· cheaper lookups (cost ∝ entries)", 24, INK),
                            T("· batch size J vs. qubits", 24, INK),
                            T("· tree shape and word layout", 24, INK),
                            T("· measurement-based erasure", 24, INK)).arrange(DOWN, aligned_edge=LEFT, buff=0.22)).arrange(RIGHT, buff=1.2, aligned_edge=UP)
        lev.shift(UP * 0.5)
        ml = T("a constrained, non-convex fitting problem with a cost model you can search over", 26, QGREEN).to_edge(DOWN, buff=0.7)
        fit(ml, 13)
        with self.say("So this task has levers on both sides. Classically: fewer vectors, a smaller lambda "
                      "effective, fewer angle bits, all while keeping the error under twenty milli-hartree. "
                      "On the quantum side: cheaper lookups, since a lookup's cost scales with the number "
                      "of entries. The batch size, the tree shape, and the word layout are yours to "
                      "choose too.") as b:
            self.play(FadeIn(lev[0]), run_time=b.rt(0.4))
            self.play(FadeIn(lev[1]), run_time=b.rt(0.4))
        with self.say("Of the three benchmarks, this one rewards an A I engineer's skills most directly: a "
                      "constrained, non-convex fitting problem, with a cost model you can optimize "
                      "against.") as b:
            self.play(FadeIn(ml), run_time=b.rt(0.4))
        self.clear_all()
