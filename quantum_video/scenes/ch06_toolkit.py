import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import *  # noqa: E402,F403


class Ch06Toolkit(VScene):
    def construct(self):
        chapter_card(self, 6, "The toolkit", "AND, adders, multipliers, lookups")

        with self.say("Before we get to the benchmarks, let's fill the toolbox. These are the building "
                      "blocks you'll find in kickmix's builder library, and in nearly every forum post "
                      "about this competition.") as b:
            tools = VGroup(*[T(s, 30, c) for s, c in [("temporary AND", QORANGE), ("adders & comparators", QBLUE),
                                                     ("multipliers", QBLUE), ("shifts", QGREEN),
                                                     ("fixed-point numbers", QYELLOW), ("QROM lookups", QPURPLE),
                                                     ("unary iteration", QPURPLE)]])
            tools.arrange_in_grid(2, 4, buff=(0.6, 0.6))
            fit(tools, 13)
            self.play(LaggedStart(*[FadeIn(t, scale=0.8) for t in tools], lag_ratio=0.15), run_time=b.rt(0.7))
        self.clear_all()

        # -- adder: carry chain
        n = 6
        a_bits = [1, 0, 1, 1, 0, 1]
        b_bits = [0, 1, 1, 0, 1, 1]
        A = BitRow(a_bits[::-1], size=0.6, color=QBLUE, font=28, label="a")
        B = BitRow(b_bits[::-1], size=0.6, color=QBLUE, font=28, label="b")
        regs = VGroup(A, B).arrange(DOWN, buff=0.25, aligned_edge=RIGHT).shift(UP * 1.6)
        carries = []
        c = 0
        for i in range(n):
            carries.append(c)
            c = (a_bits[i] & b_bits[i]) | (c & (a_bits[i] ^ b_bits[i]))
        C = VGroup(*[Square(0.6, color=QORANGE, stroke_width=2) for _ in range(n)]).arrange(RIGHT, buff=0.06)
        C.next_to(B, DOWN, 0.25, aligned_edge=RIGHT)
        clab = T("carries", 24, QORANGE).next_to(C, LEFT, 0.25)
        cvals = VGroup(*[T(str(carries[n - 1 - j]), 28, QORANGE).move_to(C[j]) for j in range(n)])
        with self.say("Addition. To add a into b, you ripple a carry from the lowest bit to the highest. "
                      "Each carry is a majority function of three bits, and with the temporary AND trick "
                      "it costs one Toffoli per bit.") as b:
            self.play(FadeIn(regs), run_time=b.rt(0.25))
            self.play(FadeIn(C), FadeIn(clab), run_time=b.rt(0.15))
            for j in range(n - 1, -1, -1):
                self.play(FadeIn(cvals[j]), C[j].animate.set_fill(QORANGE, 0.3), run_time=b.duration * 0.06)
        down = T("sweep back down: carries erased by measurement — free", 26, QGREEN).next_to(C, DOWN, 0.5)
        cost = T("n-bit addition ≈ n Toffolis   (Gidney 2018)", 30, QYELLOW).next_to(down, DOWN, 0.4)
        with self.say("Then you sweep back down, writing the sum and erasing each carry by measurement, "
                      "at no Toffoli cost. So adding two n-bit numbers costs about n Toffolis. Comparing "
                      "and subtracting cost about the same. This construction is from Craig Gidney's "
                      "paper, halving the cost of quantum addition. It's worth reading.") as b:
            for j in range(n):
                self.play(FadeOut(cvals[j]), C[j].animate.set_fill(QGREEN, 0.2), run_time=b.duration * 0.04)
            self.play(FadeIn(down), run_time=b.rt(0.15))
            self.play(FadeIn(cost), run_time=b.rt(0.15))
        self.clear_all()

        # -- multiplication grid and truncation
        k = 8
        grid = VGroup(*[Square(0.42, stroke_width=1.5, color=QBLUE).set_fill(QBLUE, 0.35) for _ in range(k * k)])
        grid.arrange_in_grid(k, k, buff=0.04).shift(LEFT * 3)
        lab = T("n × n partial products", 26, QBLUE).next_to(grid, UP, 0.3)
        mc = fit(T("multiplication ≈ n additions ≈ n² Toffolis", 30, QORANGE), 6.6).move_to(RIGHT * 3.2 + UP * 1.2)
        with self.say("Multiplication of two n-bit numbers is basically n additions of shifted partial "
                      "products: about n squared Toffolis. That's why big multiplications dominate any "
                      "arithmetic circuit.") as b:
            self.play(FadeIn(lab), LaggedStart(*[FadeIn(s) for s in grid], lag_ratio=0.004), run_time=b.rt(0.5))
            self.play(FadeIn(mc), run_time=b.rt(0.3))
        drop = VGroup(*[grid[r * k + c] for r in range(k) for c in range(k) if r + c > k + 1])
        tr = fit(T("truncated product: drop the low-order\npartial products you don't need", 26, QGREEN), 6.6).move_to(RIGHT * 3.2 + DOWN * 0.4)
        with self.say("But you rarely need every bit of a product. In fixed-point arithmetic, you can drop "
                      "the partial products that only affect bits you'll throw away anyway, as long as "
                      "the error is accounted for. Truncated multipliers are one of the most common "
                      "savings.") as b:
            self.play(drop.animate.set_fill(BG, 1).set_stroke(MUTED, 1, 0.4), run_time=b.rt(0.4))
            self.play(FadeIn(tr), run_time=b.rt(0.3))
        self.clear_all()

        # -- fixed point
        bits = [1, 0, 1, 1, 0, 1]
        fx = BitRow(bits, size=0.7, color=QYELLOW, font=32).shift(UP * 1.2)
        point = Dot(radius=0.07, color=INK).move_to((fx.cells[0].get_corner(DR) + fx.cells[1].get_corner(DL)) / 2)
        val = M(r"1.01101_2 = 1 + \tfrac14 + \tfrac18 + \tfrac1{32} = 1.40625", 44, QYELLOW).shift(DOWN * 0.4)
        note = T("no floating point: integers with an implied binary point", 28, MUTED).shift(DOWN * 1.7)
        with self.say("Which brings us to fixed point. There are no floating-point numbers in these "
                      "circuits. A number is just an integer with an implied binary point, and every "
                      "design decision is about how many bits to keep in each register. Fewer bits mean "
                      "fewer Toffolis and fewer qubits, but more error.") as b:
            self.play(FadeIn(fx), run_time=b.rt(0.2))
            self.play(FadeIn(point, scale=3), run_time=b.rt(0.15))
            self.play(Write(val), run_time=b.rt(0.3))
            self.play(FadeIn(note), run_time=b.rt(0.15))
        self.clear_all()

        # -- shifts
        title = title_bar("Shifts")
        top = BitRow([0, 0, 1, 0, 1, 1], size=0.55, color=QGREEN, font=26, label="x").move_to(LEFT * 3.4 + UP * 1.0)
        bot = BitRow([1, 0, 1, 1, 0, 0], size=0.55, color=QGREEN, font=26, label="4x").move_to(LEFT * 3.4 + DOWN * 0.6)
        bot.align_to(top, RIGHT)
        cross = VGroup(*[Arrow(top.cells[j].get_bottom(), bot.cells[j - 2].get_top(), buff=0.06, color=QGREEN,
                               stroke_width=3, max_tip_length_to_length_ratio=0.15) for j in range(2, 6)])
        w0 = top
        kn = T("shift by a known amount:\njust relabel the wires — free", 26, QGREEN).next_to(bot, DOWN, 0.5)
        bar = fit(T("shift by a quantum amount s:\ncontrolled swaps (a barrel shifter)\n≈ n·log n Toffolis", 26, QORANGE), 5.5)
        bar.move_to(RIGHT * 3.6 + UP * 0.2)
        sep = DashedLine(UP * 2.3, DOWN * 2.6, color=MUTED).move_to(RIGHT * 0.6 + DOWN * 0.1)
        with self.say("Shifts. Multiplying by a known power of two costs nothing: you just relabel which "
                      "wire means which bit. But shifting by an amount that's stored in a quantum "
                      "register needs controlled swaps, a barrel shifter, and each controlled swap costs "
                      "a Toffoli.") as b:
            self.play(FadeIn(title), FadeIn(top), run_time=b.rt(0.2))
            self.play(LaggedStart(*[GrowArrow(c_) for c_ in cross], lag_ratio=0.2), FadeIn(bot), FadeIn(kn), run_time=b.rt(0.3))
            self.play(Create(sep), FadeIn(bar), run_time=b.rt(0.3))
        self.clear_all()

        # -- QROM
        title = title_bar("QROM: the quantum lookup table", QPURPLE)
        data = ["0110", "1011", "0001", "1110", "0101", "1000", "0011", "1101"]
        rows = VGroup()
        for i, d in enumerate(data):
            rows.add(VGroup(T(format(i, "03b"), 26, MUTED), T(d, 26, INK, font="DejaVu Sans Mono")).arrange(RIGHT, buff=0.6))
        rows.arrange(DOWN, buff=0.12).shift(LEFT * 4.2 + DOWN * 0.3)
        thead = VGroup(T("address", 22, MUTED), T("data d(a)", 22, MUTED)).arrange(RIGHT, buff=0.35).next_to(rows, UP, 0.25)
        addr = VGroup(T("address", 26, QPURPLE), ket("101", 40, QPURPLE)).arrange(RIGHT).move_to(RIGHT * 2.4 + UP * 1.2)
        targ = VGroup(T("target", 26, QYELLOW), ket("0000", 40, QYELLOW)).arrange(RIGHT).move_to(RIGHT * 2.4 + DOWN * 0.2)
        eq = M(r"|a\rangle|z\rangle \;\mapsto\; |a\rangle|z \oplus d(a)\rangle", 42).move_to(RIGHT * 2.4 + DOWN * 1.8)
        with self.say("Now the single most important tool in this competition: the quantum lookup "
                      "table, called QROM. A table of classical data is baked into the circuit. Given an "
                      "address register holding a, the lookup XORs the data word d of a into a target "
                      "register.") as b:
            self.play(FadeIn(title), FadeIn(thead), FadeIn(rows), run_time=b.rt(0.3))
            self.play(FadeIn(addr), FadeIn(targ), run_time=b.rt(0.2))
            self.play(Write(eq), run_time=b.rt(0.3))
        newt = ket(data[5], 40, QYELLOW).move_to(targ[1])
        with self.say("Because the address register can be in superposition, one lookup reads every "
                      "entry at once, each into its own branch of the superposition.") as b:
            hl = SurroundingRectangle(rows[5], color=QPURPLE)
            self.play(Create(hl), run_time=b.rt(0.3))
            self.play(TransformFromCopy(rows[5][1], newt), FadeOut(targ[1]), run_time=b.rt(0.4))
        self.clear_all()

        # -- unary iteration tree
        title = title_bar("How a lookup works: unary iteration", QPURPLE)
        levels = 3
        nodes = {}
        for d in range(levels + 1):
            count = 2 ** d
            for i in range(count):
                x = (i - (count - 1) / 2) * (12 / 2 ** d) * 0.95 / 1.5
                nodes[(d, i)] = Dot([x, 2.0 - d * 1.15, 0], radius=0.11, color=MUTED)
        edges = VGroup()
        for d in range(levels):
            for i in range(2 ** d):
                for c in (0, 1):
                    edges.add(Line(nodes[(d, i)].get_center(), nodes[(d + 1, 2 * i + c)].get_center(),
                                   color=MUTED, stroke_width=2))
        leaves = VGroup(*[T(format(i, "03b"), 24, MUTED).next_to(nodes[(levels, i)], DOWN, 0.15) for i in range(8)])
        dots = VGroup(*nodes.values())
        with self.say("How does it work? With a technique called unary iteration. Picture a binary tree "
                      "over all the addresses. Walking down the tree, each node is a temporary AND of "
                      "its parent with one address bit.") as b:
            self.play(FadeIn(title), Create(edges), FadeIn(dots), FadeIn(leaves), run_time=b.rt(0.6))
        path = [(0, 0), (1, 1), (2, 2), (3, 5)]
        with self.say("For any address, exactly one leaf ends up switched on: the one matching the address. "
                      "With the right bookkeeping, the circuit visits every leaf in turn, spending about one "
                      "Toffoli per leaf.") as b:
            for p in path:
                self.play(nodes[p].animate.set_color(QYELLOW).scale(1.5), run_time=b.rt(0.12))
            self.play(leaves[5].animate.set_color(QYELLOW), run_time=b.rt(0.1))
        fan = VGroup(*[Arrow(nodes[(3, 5)].get_center(), nodes[(3, 5)].get_center() + np.array([x, -1.6, 0]),
                             color=QGREEN, buff=0.1, stroke_width=3) for x in (-0.9, -0.3, 0.3, 0.9)])
        ft = T("CNOTs copy the word d(a) into the target — free", 26, QGREEN).to_edge(DOWN, buff=0.3)
        with self.say("At each leaf, the stored word is copied into the target with CNOTs controlled by "
                      "that leaf. CNOTs are free. So the width of the words doesn't matter.") as b:
            self.play(LaggedStart(*[GrowArrow(f) for f in fan], lag_ratio=0.2), FadeIn(ft), run_time=b.rt(0.5))
        self.clear_all()

        costs = VGroup(T("lookup over L entries  ≈  L Toffolis", 34, QPURPLE, weight=BOLD),
                       T("…no matter how wide each word is", 28, INK),
                       T("512 entries of 90-bit words  ≈  512 Toffolis", 28, QYELLOW),
                       T("erasing a lookup by measurement  ≈  a few × √L Toffolis", 28, QGREEN),
                       T("more qubits can buy fewer Toffolis (select-swap / “QROAM”)", 26, MUTED)).arrange(DOWN, buff=0.4)
        with self.say("So a lookup over L entries costs about L Toffolis, regardless of how wide the words "
                      "are. A table of five hundred and twelve entries with ninety-bit words costs about "
                      "five hundred and twelve Toffolis. That's why lookups are a favourite trick: "
                      "whenever a table is small, replace arithmetic with precomputed data.") as b:
            self.play(FadeIn(costs[0]), run_time=b.rt(0.25))
            self.play(FadeIn(costs[1]), run_time=b.rt(0.2))
            self.play(FadeIn(costs[2]), run_time=b.rt(0.2))
        with self.say("And erasing a lookup's output is even cheaper: measure the target, then repair the "
                      "phases with a much smaller lookup, for roughly the square root of L. There are "
                      "also space-time trade-offs, known as select-swap networks, that spend extra "
                      "qubits to cut the Toffoli count further.") as b:
            self.play(FadeIn(costs[3]), run_time=b.rt(0.3))
            self.play(FadeIn(costs[4]), run_time=b.rt(0.3))
        self.clear_all()

        last = VGroup(T("Last tool: classical precomputation", 34, QGREEN, weight=BOLD),
                      T("anything that doesn't depend on the quantum input —", 28, INK),
                      T("coefficients, tables, constants, the shape of the circuit —", 28, INK),
                      T("is computed offline, on a laptop, for free", 28, QGREEN)).arrange(DOWN, buff=0.35)
        with self.say("And the last tool is classical precomputation. Anything that doesn't depend on "
                      "the quantum input: coefficients, tables, constants, even the structure of the "
                      "circuit itself, can be computed offline, for free. A big part of every winning "
                      "idea in this competition is moving work out of the quantum circuit, and into "
                      "classical preprocessing.") as b:
            self.play(LaggedStart(*[FadeIn(l) for l in last], lag_ratio=0.4), run_time=b.rt(0.7))
        self.clear_all()
