import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import *  # noqa: E402,F403

A = [0.99994132489119882162, 0.49609891915903542303, 0.33261112772430493331, 0.14876762006038398086]
B = [0.81648515205385221995, 0.27136515484240234115, 0.12756148214815175348, 0.044753028579153842218]


def cubic(x):
    if x < 1.5:
        d = x - 1
        return A[0] - A[1] * d + A[2] * d ** 2 - A[3] * d ** 3
    d = x - 1.5
    return B[0] - B[1] * d + B[2] * d ** 2 - B[3] * d ** 3


class Ch07Invsqrt(VScene):
    def construct(self):
        chapter_card(self, 7, "Benchmark I:  phasing by 1/√x", "Coulomb interactions in fusion plasmas")

        # -- physics context
        cap = Circle(radius=1.6, color=QORANGE, stroke_width=3).set_fill(QORANGE, 0.08).shift(LEFT * 3.5)
        rng = np.random.default_rng(2)
        parts = VGroup(*[Dot(cap.get_center() + 1.3 * np.array([*rng.uniform(-1, 1, 2) * 0.75, 0]),
                             radius=0.05, color=QBLUE) for _ in range(40)])
        fast = Dot(cap.get_left() + LEFT * 1.0, radius=0.1, color=QYELLOW)
        lab = T("warm dense matter in an\ninertial-confinement fusion capsule", 26, QORANGE).next_to(cap, DOWN, 0.4)
        sp = T("stopping power: how fast a\nfast particle loses energy", 28, QYELLOW).move_to(RIGHT * 3 + UP * 0.5)
        with self.say("Benchmark one comes from simulating matter under extreme conditions, like the "
                      "inside of an inertial confinement fusion capsule. A key quantity for designing "
                      "such reactors is the stopping power: how quickly a fast particle loses energy as "
                      "it ploughs through a hot, dense plasma of electrons.") as b:
            self.play(FadeIn(cap), FadeIn(parts), FadeIn(lab), run_time=b.rt(0.3))
            self.play(FadeIn(fast), run_time=0.3)
            self.play(fast.animate.move_to(cap.get_right() + LEFT * 0.4), parts.animate.shift(RIGHT * 0.05),
                      FadeIn(sp), run_time=b.rt(0.4), rate_func=linear)
        self.clear_all()

        # -- first quantization, Coulomb term
        grid = NumberPlane(x_range=[-3, 3, 1], y_range=[-2, 2, 1], x_length=5.4, y_length=3.6,
                           background_line_style={"stroke_color": MUTED, "stroke_width": 1, "stroke_opacity": 0.5},
                           axis_config={"stroke_opacity": 0}).shift(LEFT * 3.3 + DOWN * 0.3)
        e1 = Dot(grid.c2p(-1, 1), color=QBLUE, radius=0.13)
        e2 = Dot(grid.c2p(2, -1), color=QBLUE, radius=0.13)
        e3 = Dot(grid.c2p(0, -2), color=QBLUE, radius=0.13)
        pairs = VGroup(*[DashedLine(p.get_center(), q.get_center(), color=QYELLOW, stroke_width=2)
                         for p, q in [(e1, e2), (e1, e3), (e2, e3)]])
        H = M(r"H = T + U + V", 46).move_to(RIGHT * 3.2 + UP * 2)
        V = M(r"V = \sum_{i \ne j} \frac{1}{|r_i - r_j|}", 46, QYELLOW).next_to(H, DOWN, 0.5)
        dist = M(r"|r_i - r_j| = \sqrt{\Delta x^2 + \Delta y^2 + \Delta z^2}", 36).next_to(V, DOWN, 0.5)
        with self.say("In this simulation, electrons live on a three-dimensional grid, and each electron "
                      "gets a register holding its coordinates. The energy has three parts: kinetic "
                      "energy, attraction to the nuclei, and repulsion between every pair of electrons. "
                      "That last term is one over the distance between the two electrons.") as b:
            self.play(Create(grid), FadeIn(e1), FadeIn(e2), FadeIn(e3), run_time=b.rt(0.25))
            self.play(Write(H), run_time=b.rt(0.2))
            self.play(Create(pairs), Write(V), run_time=b.rt(0.3))
            self.play(FadeIn(dist), run_time=b.rt(0.15))
        trot = M(r"e^{-iH\delta} \approx e^{-iT\delta}\, e^{-i(U+V)\delta}", 40).next_to(dist, DOWN, 0.6)
        eta = T("per time step: η² electron pairs  →  the dominant cost", 26, QORANGE).next_to(trot, DOWN, 0.35)
        with self.say("Time evolution is done in small steps, called Trotter steps. In each step, for every "
                      "pair of electrons, the state is multiplied by a phase: e to the minus i, times a "
                      "small time step, times one over their distance. With eta electrons, that's about "
                      "eta squared pairs, every single step. That's the bottleneck.") as b:
            self.play(Write(trot), run_time=b.rt(0.35))
            self.play(FadeIn(eta), run_time=b.rt(0.2))
            self.play(LaggedStart(*[Indicate(p, color=QORANGE) for p in pairs], lag_ratio=0.3), run_time=b.rt(0.3))
        self.clear_all()

        # -- the task
        spec_t = T("The task", 36, QBLUE, weight=BOLD).to_edge(UP, buff=0.4)
        reg = BitRow([0] * 22, size=0.36, color=QBLUE, font=18, label=MathTex("x", font_size=40, color=QBLUE)).shift(UP * 1.7)
        reglab = T("one register named “x”: 22 qubits", 24, MUTED).next_to(reg, DOWN, 0.2)
        task = M(r"|x\rangle|0\cdots0\rangle \;\longmapsto\; e^{\,2\pi i/\sqrt{x}}\;|x\rangle|0\cdots0\rangle", 52, INK).shift(UP * 0.0)
        rng_ = M(r"x \in [\,1,\; 3{,}133{,}452\,] \qquad 3{,}133{,}452 = 3\,(2^{10}-2)^2", 38, QYELLOW).next_to(task, DOWN, 0.5)
        tol = M(r"|\text{phase error}| \;\le\; \frac{2^{-24}}{\sqrt{x}} \;\text{turns}", 44, QGREEN).next_to(rng_, DOWN, 0.5)
        with self.say("Squared distance is a sum of squared coordinate differences, so it's an integer. "
                      "Call it x. Then the core subroutine is: given an integer x in a quantum register, "
                      "multiply the state by e to the two pi i over the square root of x. Compute, phase, "
                      "uncompute.") as b:
            self.play(FadeIn(spec_t), FadeIn(reg), FadeIn(reglab), run_time=b.rt(0.3))
            self.play(Write(task), run_time=b.rt(0.4))
        with self.say("Precisely: the circuit gets one named register, x, of twenty two qubits. It must work "
                      "for every x from one up to three million, one hundred thirty three thousand, four "
                      "hundred fifty two. That's the largest squared distance on a grid with ten bits per "
                      "coordinate.") as b:
            self.play(Write(rng_), run_time=b.rt(0.5))
        with self.say("The phase is measured in turns, fractions of a full circle, and it must be accurate "
                      "to two to the minus twenty four, divided by root x. That's twenty four bits of "
                      "relative precision. The register x must come back unchanged, and every scratch "
                      "qubit must return to zero.") as b:
            self.play(Write(tol), run_time=b.rt(0.5))
        self.clear_all()

        # -- phasing from a register: one Z_POW per bit
        title = title_bar("How to apply a phase stored in a register")
        ybits = [1, 0, 1, 1, 0, 1]
        yr = BitRow(ybits, size=0.6, color=QYELLOW, font=28, label=MathTex("y", font_size=40, color=QYELLOW)).shift(UP * 1.6 + LEFT * 2)
        yv = M(r"y = 0.101101_2 = \tfrac12 + \tfrac18 + \tfrac1{16} + \tfrac1{64}", 38).next_to(yr, DOWN, 0.4).shift(RIGHT * 0.5)
        prod = M(r"e^{2\pi i y} = \prod_j \big(e^{2\pi i\, 2^{-j}}\big)^{y_j} \;\Rightarrow\; \texttt{Z\_POW}(2^{1-j}) \text{ on bit } j",
                 38, QBLUE).next_to(yv, DOWN, 0.5)
        fit(prod, 12.5)
        with self.say("How do you apply a phase that's stored as a number in a register? If y is a binary "
                      "fraction, then e to the two pi i y is a product of one phase per bit. So you apply "
                      "one Z POW gate to each bit of y, with an angle that halves from bit to bit.") as b:
            self.play(FadeIn(title), FadeIn(yr), run_time=b.rt(0.2))
            self.play(Write(yv), run_time=b.rt(0.3))
            self.play(Write(prod), run_time=b.rt(0.35))
        cc = DOWN * 2.2 + RIGHT * 0.5
        circle = Circle(radius=1.1, color=MUTED, stroke_width=2).move_to(cc)
        spokes = VGroup()
        for j, col in [(1, QGREEN), (2, QGREEN), (3, QORANGE), (4, QRED), (5, QRED), (6, QRED)]:
            ang = 2 * PI * 2 ** (-j)
            spokes.add(Line(cc, cc + 1.1 * np.array([np.cos(ang), np.sin(ang), 0]), color=col, stroke_width=3))
        leg = VGroup(T("½, ¼ turn: Clifford, free", 22, QGREEN), T("⅛ turn: a T gate", 22, QORANGE),
                     T("finer: rotations, priced in T gates", 22, QRED)).arrange(DOWN, aligned_edge=LEFT, buff=0.12)
        leg.next_to(circle, RIGHT, 0.6)
        with self.say("The biggest angles are Clifford gates, which are free. The eighth of a turn is a T "
                      "gate. Everything finer is a rotation, and costs real T gates.") as b:
            self.play(Create(circle), LaggedStart(*[Create(s) for s in spokes], lag_ratio=0.2), run_time=b.rt(0.4))
            self.play(FadeIn(leg), run_time=b.rt(0.3))
        self.clear_all()

        # -- Quake fast inverse square root
        code = VGroup(*[T(l, 22, INK, font="DejaVu Sans Mono") for l in [
            "float Q_rsqrt(float number) {",
            "  long i; float x2, y;",
            "  x2 = number * 0.5F;  y = number;",
            "  i  = * (long *) &y;",
            "  i  = 0x5f3759df - (i >> 1);      // initial guess",
            "  y  = * (float *) &i;",
            "  y  = y * (1.5F - (x2 * y * y)); // Newton step",
            "  return y;",
            "}"]]).arrange(DOWN, aligned_edge=LEFT, buff=0.12)
        box = SurroundingRectangle(code, color=MUTED, buff=0.3, corner_radius=0.1)
        cap_ = T("Quake III Arena (1999): the famous fast inverse square root", 26, QYELLOW).next_to(box, UP, 0.3)
        with self.say("The reference circuit borrows an idea made famous by the video game Quake Three: the "
                      "fast inverse square root. Make a cheap first guess, then improve it with one step "
                      "of Newton's method. The quantum version works in fixed point, in three stages.") as b:
            self.play(FadeIn(cap_), FadeIn(box), LaggedStart(*[FadeIn(l) for l in code], lag_ratio=0.1), run_time=b.rt(0.5))
            self.play(Indicate(code[4], color=QYELLOW), run_time=b.rt(0.15))
            self.play(Indicate(code[6], color=QGREEN), run_time=b.rt(0.15))
        self.clear_all()

        # -- stage 1: normalization
        st1 = T("Stage 1: normalize", 34, QBLUE, weight=BOLD).to_edge(UP, buff=0.4)
        ex = VGroup()
        for w in [3, 17, 4096, 11532]:
            bits = format(w, "014b")
            pairs_ = " ".join(bits[i:i + 2] for i in range(0, 14, 2))
            lz = (len(bits) - len(bits.lstrip("0"))) // 2
            ex.add(VGroup(T(f"w = {w:>5}", 26, INK, font="DejaVu Sans Mono"),
                          T(pairs_, 26, QBLUE, font="DejaVu Sans Mono"),
                          T(f"s = {lz}", 26, QYELLOW, font="DejaVu Sans Mono")).arrange(RIGHT, buff=0.6))
        ex.arrange(DOWN, buff=0.3, aligned_edge=LEFT).shift(UP * 0.8)
        f1 = M(r"w_{\text{norm}} = w\cdot 2^{2s} \in [1, 4) \qquad \frac{1}{\sqrt{w}} = \frac{2^{s}}{\sqrt{w_{\text{norm}}}}", 42).shift(DOWN * 1.9)
        with self.say("Stage one: normalize. Count the pairs of leading zeros, call that s, and shift x left "
                      "by two s bits. Now the number sits between one and four, whatever x was. And since "
                      "dividing by the square root of four to the s is the same as halving s times, the "
                      "shift just turns into a shift of the answer at the end.") as b:
            self.play(FadeIn(st1), LaggedStart(*[FadeIn(e) for e in ex], lag_ratio=0.3), run_time=b.rt(0.45))
            self.play(Write(f1), run_time=b.rt(0.35))
        self.clear_all()

        # -- stage 2: cubic guess
        st2 = T("Stage 2: a cheap first guess", 34, QBLUE, weight=BOLD).to_edge(UP, buff=0.4)
        ax = Axes(x_range=[1, 2, 0.5], y_range=[0.65, 1.05, 0.1], x_length=6.5, y_length=4,
                  axis_config={"color": MUTED, "include_numbers": True, "font_size": 22}, tips=False).shift(LEFT * 2.5 + DOWN * 0.5)
        true_ = ax.plot(lambda x: 1 / np.sqrt(x), x_range=[1, 2], color=INK, stroke_width=3)
        poly = ax.plot(cubic, x_range=[1, 2, 0.005], color=QYELLOW, stroke_width=5, stroke_opacity=0.7)
        legend = VGroup(T("1/√x", 24, INK), T("two cubic pieces", 24, QYELLOW)).arrange(DOWN, aligned_edge=LEFT).next_to(ax, UP, 0.1).shift(RIGHT * 2)
        acc = VGroup(T("guess y₀ is good to", 28, INK), T("≈ 14 bits", 36, QYELLOW, weight=BOLD),
                     T("coefficients picked by a lookup\non the top bits of w_norm", 24, MUTED)).arrange(DOWN, buff=0.3).move_to(RIGHT * 4 + UP * 0.2)
        with self.say("Stage two: a cheap first guess. A cubic polynomial, with coefficients chosen by the "
                      "top bits of the normalized input, approximates one over root x. The two curves are "
                      "nearly indistinguishable: the guess is good to about fourteen bits.") as b:
            self.play(FadeIn(st2), Create(ax), run_time=b.rt(0.2))
            self.play(Create(true_), run_time=b.rt(0.2))
            self.play(Create(poly), FadeIn(legend), run_time=b.rt(0.25))
            self.play(FadeIn(acc), run_time=b.rt(0.2))
        self.clear_all()

        # -- stage 3: Newton step
        st3 = T("Stage 3: one Newton–Raphson step", 34, QBLUE, weight=BOLD).to_edge(UP, buff=0.4)
        nr = M(r"y_1 = \tfrac{1}{2}\, y_0 \left(3 - w_{\text{norm}}\, y_0^2\right)", 54, QGREEN).shift(UP * 1.4)
        bars = VGroup()
        for i, (lab_, bits_, col) in enumerate([("y₀", 14, QYELLOW), ("y₁", 27.5, QGREEN), ("needed", 24, QRED)]):
            r = Rectangle(width=bits_ * 0.25, height=0.5, stroke_width=0).set_fill(col, 0.8)
            l = T(lab_, 26, col)
            v = T(f"{bits_:g} bits", 24, INK)
            bars.add(VGroup(l, r, v))
        for i, g in enumerate(bars):
            g[1].move_to(LEFT * 3.5 + DOWN * (0.3 + i * 0.75), aligned_edge=LEFT)
            g[0].next_to(g[1], LEFT, 0.3)
            g[2].next_to(g[1], RIGHT, 0.3)
        bars[2][1].set_fill(opacity=0).set_stroke(QRED, 3)
        with self.say("Stage three: one step of Newton's method. Each Newton step roughly doubles the number "
                      "of correct bits. Fourteen bits become about twenty seven, comfortably more than the "
                      "twenty four required. It costs three multiplications.") as b:
            self.play(FadeIn(st3), Write(nr), run_time=b.rt(0.35))
            self.play(FadeIn(bars[0][0]), GrowFromEdge(bars[0][1], LEFT), FadeIn(bars[0][2]), run_time=b.rt(0.15))
            self.play(FadeIn(bars[1][0]), GrowFromEdge(bars[1][1], LEFT), FadeIn(bars[1][2]), run_time=b.rt(0.15))
            self.play(FadeIn(bars[2]), run_time=b.rt(0.15))
        self.clear_all()

        # -- full pipeline
        steps = ["shift by 2s", "lookup +\ncubic", "Newton\nstep", "shift\nby s", "Z_POW\nper bit", "uncompute\neverything"]
        cols = [QBLUE, QPURPLE, QGREEN, QBLUE, QYELLOW, MUTED]
        boxes = VGroup()
        for s_, c_ in zip(steps, cols):
            r = RoundedRectangle(corner_radius=0.1, width=1.85, height=1.2, color=c_, stroke_width=2.5).set_fill(c_, 0.08)
            boxes.add(VGroup(r, T(s_, 22, c_).move_to(r)))
        boxes.arrange(RIGHT, buff=0.3).shift(UP * 0.8)
        arrows = VGroup(*[Arrow(boxes[i].get_right(), boxes[i + 1].get_left(), buff=0.05, color=INK, stroke_width=3)
                          for i in range(len(boxes) - 1)])
        cards = VGroup(stat_card("qubits Q", "260", QBLUE, 2.9), stat_card("Toffolis", "7,735", QORANGE, 2.9),
                       stat_card("T + 37 rotations", "C ≈ 7,988", QRED, 2.9), stat_card("score Q × C", "≈ 2.08 M", QYELLOW, 2.9))
        cards.arrange(RIGHT, buff=0.25).shift(DOWN * 1.9)
        with self.say("Then shift the result by s, apply one Z POW gate per bit, and run everything "
                      "backwards to clean up.") as b:
            self.play(LaggedStart(*[FadeIn(bx) for bx in boxes], lag_ratio=0.15), Create(arrows), run_time=b.rt(0.7))
        with self.say("The reference circuit uses two hundred sixty qubits and seven thousand seven hundred "
                      "thirty five Toffolis, plus one T gate and thirty seven rotations. The cost per shot "
                      "is Toffolis plus T gates over four, about seven thousand nine hundred eighty eight. "
                      "And the score is qubits times that: about two point oh eight million.") as b:
            self.play(LaggedStart(*[FadeIn(c, shift=UP * 0.2) for c in cards], lag_ratio=0.35), run_time=b.rt(0.7))
        self.clear_all()

        # -- rotation pricing
        price = VGroup(M(r"\text{each rotation costs } 0.56\log_2(1/\epsilon) + 5.3 \text{ T gates}", 40),
                       M(r"\epsilon = \frac{\pi\,\min_x\big(\text{tol}(x) - |\text{error}(x)|\big)}{n_{\text{rot}}}", 46, QYELLOW)).arrange(DOWN, buff=0.6).shift(UP * 0.8)
        tips = VGroup(T("more accurate arithmetic → more slack → cheaper rotations", 28, QGREEN),
                      T("fewer rotations → each gets a bigger share of the slack", 28, QGREEN)).arrange(DOWN, buff=0.3).shift(DOWN * 1.8)
        with self.say("One subtlety in the pricing. The rotation precision isn't something you choose. The "
                      "verifier measures your worst-case arithmetic error, takes the leftover margin under "
                      "the tolerance, and splits it evenly across all your rotations. So more accurate "
                      "arithmetic makes every rotation cheaper, and fewer rotations each get a bigger "
                      "share of the slack.") as b:
            self.play(Write(price[0]), run_time=b.rt(0.25))
            self.play(Write(price[1]), run_time=b.rt(0.3))
            self.play(FadeIn(tips), run_time=b.rt(0.2))
        self.clear_all()

        # -- where the points are
        ref = Rectangle(width=7.988 * 0.9, height=2.6, color=QRED, stroke_width=2).set_fill(QRED, 0.15)
        pub = Rectangle(width=1.696 * 0.9, height=2.6 * 78 / 260, color=QGREEN, stroke_width=2).set_fill(QGREEN, 0.4)
        ref.move_to(LEFT * 1.5 + UP * 0.6)
        pub.move_to(ref.get_corner(DL), aligned_edge=DL)
        rl = T("reference: 260 qubits × 7,988", 24, QRED).next_to(ref, UP, 0.15)
        pl = T("public notebooks (Oct 2026): 78 × 1,696  ≈ 16× cheaper", 24, QGREEN).next_to(ref, DOWN, 0.2)
        with self.say("Where are the points? Within days of launch, public notebooks had pushed this to "
                      "about seventy eight qubits and under seventeen hundred Toffoli equivalents: roughly "
                      "sixteen times cheaper than the reference. The area of the green box, compared to the "
                      "red one, is that improvement.") as b:
            self.play(FadeIn(ref), FadeIn(rl), run_time=b.rt(0.3))
            self.play(TransformFromCopy(ref, pub), FadeIn(pl), run_time=b.rt(0.4))
        self.clear_all()
        ideas = VGroup(T("Ideas people use", 34, QYELLOW, weight=BOLD),
                       T("· replace Newton–Raphson with a table lookup + a short polynomial", 26, INK),
                       T("· signed (±1) digits so each Horner step is a plain add or subtract", 26, INK),
                       T("· keep every register as narrow as the error budget allows", 26, INK),
                       T("· erase everything by measurement, reuse scratch qubits", 26, INK),
                       T("· every qubit is ~1% of this task's score once Q ≈ 80", 26, QGREEN),
                       T("· model the arithmetic bit-exactly in NumPy: test all 3.1M inputs in milliseconds", 26, QBLUE))
        ideas.arrange(DOWN, aligned_edge=LEFT, buff=0.3)
        fit(ideas, 13)
        with self.say("The ideas behind those gains: replace Newton's method with a table lookup and a "
                      "short polynomial. Use signed digits, so each step of the polynomial is a plain "
                      "addition or subtraction instead of a multiplication. Keep every register as "
                      "narrow as the error budget allows. Erase everything by measurement. And remember "
                      "that qubits multiply the whole cost: at around eighty qubits, each qubit you "
                      "remove is worth more than one percent.") as b:
            self.play(FadeIn(ideas[0]), run_time=b.rt(0.1))
            self.play(LaggedStart(*[FadeIn(i, shift=RIGHT * 0.2) for i in ideas[1:6]], lag_ratio=0.5), run_time=b.rt(0.8))
        with self.say("And a practical tip. Before you build any circuit, write a bit-exact model of your "
                      "fixed-point arithmetic in NumPy. You can check your error on all three million "
                      "inputs in milliseconds, and only build the circuit once the numbers work.") as b:
            self.play(FadeIn(ideas[6], shift=RIGHT * 0.2), run_time=b.rt(0.3))
            self.play(Circumscribe(ideas[6], color=QBLUE), run_time=b.rt(0.3))
        self.clear_all()
