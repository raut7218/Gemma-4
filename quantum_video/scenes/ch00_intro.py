import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import *  # noqa: E402,F403


class Ch00Intro(VScene):
    def construct(self):
        title = fit(T("Verifiable Quantum Circuit Compilation", 50, INK, weight=BOLD), 12.5)
        host = T("Google Quantum AI  ·  Kaggle competition", 28, QBLUE).next_to(title, DOWN, 0.4)
        with self.say("Could we get more out of a quantum computer by asking it to do less? "
                      "That is the question behind Google Quantum AI's Kaggle competition: "
                      "Verifiable Quantum Circuit Compilation.") as b:
            self.play(Write(title), run_time=b.rt(0.45))
            self.play(FadeIn(host, shift=UP * 0.2), run_time=1)
        self.play(VGroup(title, host).animate.scale(0.6).to_edge(UP, buff=0.4), run_time=1)

        words = ["qubit", "Toffoli", "ancilla", "uncomputation", "phase kickback", "HMR",
                 "QROM", "unary iteration", "Fiat–Shamir", "Reed–Solomon", "syndrome",
                 "block encoding", "Givens rotation", "λ_eff", "Z_POW", "T gate", "kickmix",
                 "Clopper–Pearson", "GF(2¹²)", "Newton–Raphson"]
        rng = np.random.default_rng(3)
        cloud = VGroup()
        for i, w in enumerate(words):
            col = [QBLUE, QYELLOW, QGREEN, QPURPLE, QORANGE, INK][i % 6]
            m = T(w, int(rng.integers(24, 38)), col)
            cloud.add(m)
        cloud.arrange_in_grid(rows=5, buff=(0.5, 0.45)).scale_to_fit_width(12).shift(DOWN * 0.6)
        for m in cloud:
            m.shift(rng.normal(0, 0.12, 3) * np.array([1, 1, 0]))
        with self.say("The prize pool is one hundred and fifty thousand dollars, and the organizers say "
                      "you don't need a quantum computing background to take part. But you do need a "
                      "working vocabulary. Words like Toffoli gate, uncomputation, phase kickback, "
                      "syndrome, block encoding. Without them, the discussion forum reads like a "
                      "foreign language.") as b:
            self.play(LaggedStart(*[FadeIn(m, scale=0.7) for m in cloud], lag_ratio=0.12),
                      run_time=b.rt(0.8))
        with self.say("This video builds that vocabulary from the ground up, with pictures. By the end, "
                      "you should be able to read the competition paper, follow the forum, and start "
                      "designing circuits of your own.") as b:
            self.play(cloud.animate.set_opacity(0.15), run_time=b.rt(0.3))
        self.play(FadeOut(cloud), run_time=0.6)

        # -- the competition in one picture
        algo = VGroup()
        widths = [0.6, 0.9, 0.5, 3.6, 0.7, 0.8, 0.5]
        x = -5.5
        for i, w in enumerate(widths):
            r = Rectangle(width=w, height=0.9, stroke_width=2,
                          color=QORANGE if i == 3 else MUTED).set_fill(QORANGE if i == 3 else MUTED,
                                                                         0.35 if i == 3 else 0.12)
            r.move_to([x + w / 2, 0.8, 0])
            x += w + 0.08
            algo.add(r)
        algo.move_to(UP * 0.9)
        algo_lab = T("a fault-tolerant quantum algorithm", 26, MUTED).next_to(algo, UP, 0.3)
        hot = T("one subroutine dominates the cost", 26, QORANGE).next_to(algo, DOWN, 0.3)
        with self.say("Here is the whole competition in one picture. Future error-corrected quantum "
                      "computers will run enormous algorithms. Inside each algorithm there is usually "
                      "one subroutine that eats most of the cost.") as b:
            self.play(LaggedStart(*[GrowFromEdge(r, LEFT) for r in algo], lag_ratio=0.15),
                      FadeIn(algo_lab), run_time=b.rt(0.5))
            self.play(Indicate(algo[3], color=QORANGE, scale_factor=1.08), FadeIn(hot), run_time=b.rt(0.3))

        big = algo[3].copy()
        self.play(big.animate.move_to(DOWN * 1.9 + LEFT * 3), run_time=1)
        big_lab = T("reference circuit", 22, MUTED).next_to(big, DOWN, 0.15)
        small = Rectangle(width=1.2, height=0.9, color=QGREEN, stroke_width=2).set_fill(QGREEN, 0.35)
        small.move_to(DOWN * 1.9 + RIGHT * 2.2)
        small_lab = T("your circuit", 22, QGREEN).next_to(small, DOWN, 0.15)
        arrow = Arrow(big.get_right(), small.get_left(), color=INK, buff=0.25)
        with self.say("Your job is to rewrite that subroutine as a cheaper circuit. Fewer qubits, and "
                      "fewer of the expensive gates called Toffoli gates. But it must still compute the "
                      "right answer, and a program called the verifier checks that it does.") as b:
            self.play(FadeIn(big_lab), GrowArrow(arrow), run_time=b.rt(0.3))
            self.play(TransformFromCopy(big, small), FadeIn(small_lab), run_time=b.rt(0.3))
            check = T("verifier: PASS", 26, QGREEN, weight=BOLD).next_to(small_lab, DOWN, 0.2)
            self.play(FadeIn(check, shift=UP * 0.2), run_time=0.8)
        self.clear_all()

        # -- three benchmarks
        cards = VGroup()
        specs = [("I", "1/√x phasing", "fusion-plasma simulation", QBLUE),
                 ("II", "Reed–Solomon decoder", "decoded quantum interferometry", QYELLOW),
                 ("III", "angle lookups (QROM)", "FeMoCo chemistry", QGREEN)]
        for num, name, app, col in specs:
            box = RoundedRectangle(corner_radius=0.2, width=4.1, height=3.0, color=col, stroke_width=2.5)
            box.set_fill(col, 0.07)
            n = T(f"Benchmark {num}", 24, MUTED)
            nm = T(name, 30, col, weight=BOLD)
            ap = T(app, 22, INK)
            fit(nm, 3.6), fit(ap, 3.6)
            VGroup(n, nm, ap).arrange(DOWN, buff=0.3).move_to(box)
            cards.add(VGroup(box, n, nm, ap))
        cards.arrange(RIGHT, buff=0.3).shift(DOWN * 0.2)
        with self.say("There are three such subroutines, each taken from a real application.") as b:
            self.play(LaggedStart(*[FadeIn(c[0]) for c in cards], lag_ratio=0.2), run_time=b.rt(0.8))
        with self.say("One: phasing by one over the square root of x. That's the bottleneck when "
                      "simulating the electrons inside a fusion plasma.") as b:
            self.play(FadeIn(cards[0][1:]), run_time=b.rt(0.5))
        with self.say("Two: decoding a Reed–Solomon code, the bottleneck of an optimization algorithm "
                      "called decoded quantum interferometry.") as b:
            self.play(FadeIn(cards[1][1:]), run_time=b.rt(0.5))
        with self.say("And three: looking up stored angles and rotating orbitals. That's the bottleneck "
                      "of simulating FeMoCo, the cluster inside the enzyme that lets bacteria turn "
                      "nitrogen from the air into fertilizer.") as b:
            self.play(FadeIn(cards[2][1:]), run_time=b.rt(0.5))
        self.play(cards.animate.scale(0.6).to_edge(UP, buff=0.5), run_time=1)

        f1 = M(r"\text{ratio}_k = \frac{\text{cost of reference circuit}}{\text{cost of your circuit}}", 46)
        f2 = M(r"\text{score} = \left(\text{ratio}_{\,\mathrm{I}}\cdot\text{ratio}_{\,\mathrm{II}}"
               r"\cdot\text{ratio}_{\,\mathrm{III}}\right)^{1/3}", 46)
        VGroup(f1, f2).arrange(DOWN, buff=0.6).shift(DOWN * 0.9)
        with self.say("Each benchmark ships with a reference circuit from published research, and a "
                      "cost formula. Your ratio on a task is the reference cost divided by your cost. "
                      "Match the reference and you get one. Build a circuit ten times cheaper and you "
                      "get ten.") as b:
            self.play(Write(f1), run_time=b.rt(0.5))
        with self.say("The leaderboard score is the geometric mean of your three ratios. Because it's a "
                      "product, doubling your ratio on any one task helps exactly as much as doubling "
                      "it on any other. You can't ignore a task, but you can attack them one at a "
                      "time.") as b:
            self.play(Write(f2), run_time=b.rt(0.5))
            self.play(Indicate(f2, color=QYELLOW), run_time=1)
        self.clear_all()

        # -- the surprising part
        q = T("Is this quantum circuit correct?", 36, INK).shift(UP * 1.8)
        hard = T("in general: intractable for classical computers", 28, QRED).next_to(q, DOWN, 0.5)
        easy = T("kickmix circuits: checked on a laptop CPU in minutes", 28, QGREEN).next_to(hard, DOWN, 0.4)
        with self.say("Now here is the surprising part. Checking whether a general quantum circuit is "
                      "correct is believed to be intractable for classical computers, beyond about "
                      "forty qubits.") as b:
            self.play(FadeIn(q), run_time=b.rt(0.3))
            self.play(FadeIn(hard, shift=UP * 0.2), run_time=b.rt(0.3))
        with self.say("Yet this competition's verifier checks circuits with hundreds of qubits and "
                      "millions of gates on an ordinary CPU. The reason is a special kind of circuit, "
                      "called a kickmix circuit. Understanding why kickmix circuits can be checked is "
                      "the key to the whole competition.") as b:
            self.play(FadeIn(easy, shift=UP * 0.2), run_time=b.rt(0.3))
            self.play(Circumscribe(easy, color=QGREEN), run_time=1.5)
        self.clear_all()

        # -- roadmap
        steps = ["Bits, qubits and amplitudes", "Gates, circuits, reversible logic",
                 "Why Toffolis are expensive", "kickmix circuits and uncomputation",
                 "How circuits are verified", "The toolkit: AND, adders, QROM",
                 "Benchmark I: 1/√x", "Benchmark II: Reed–Solomon decoding",
                 "Benchmark III: FeMoCo lookups", "Scoring, submitting, and a plan"]
        road = VGroup(*[VGroup(T(f"{i + 1:>2}", 26, QBLUE), T(s, 26, INK)).arrange(RIGHT, buff=0.35)
                        for i, s in enumerate(steps)])
        road.arrange(DOWN, aligned_edge=LEFT, buff=0.18).move_to(ORIGIN)
        with self.say("Here's the plan. First, the minimum quantum computing you need: qubits, gates, "
                      "and why some gates cost far more than others. Then kickmix circuits, and how "
                      "they're verified. Then the standard toolkit of tricks that every top solution "
                      "uses. Then each of the three benchmarks in detail. And finally: how the scoring "
                      "works, how to submit, and where the points are hiding.") as b:
            self.play(LaggedStart(*[FadeIn(r, shift=RIGHT * 0.3) for r in road], lag_ratio=0.25),
                      run_time=b.rt(0.85))
        self.clear_all()
