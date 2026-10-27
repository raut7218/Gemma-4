import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import *  # noqa: E402,F403


class Ch10Plan(VScene):
    def construct(self):
        chapter_card(self, 10, "Scoring, submitting, and a plan")

        # -- summary table
        hdr = ["", "cost (lower is better)", "reference", "test"]
        rows = [("I   1/√x", "Q × (Toffolis + T/4)", "260 q · 7,988", "all 3.1M x, 64 shots each"),
                ("II  DQI decoder", "R(ε₊) × Q² × T", "1,893 q · 5.73M", "102,400 random syndromes"),
                ("III FeMoCo", "λ_eff × T_total × Q_total", "730 q · 93,237", "every address, 64 shots")]
        cols = [QBLUE, QYELLOW, QGREEN]
        table = VGroup()
        table.add(VGroup(*[T(h, 22, MUTED) for h in hdr]))
        for r, c in zip(rows, cols):
            table.add(VGroup(T(r[0], 24, c, weight=BOLD), T(r[1], 24, INK), T(r[2], 24, INK), T(r[3], 22, MUTED)))
        xs = [-6.6, -3.6, 0.5, 3.0]
        widths = [2.8, 3.9, 2.3, 3.7]
        for i, row in enumerate(table):
            for j, cell in enumerate(row):
                fit(cell, widths[j])
                cell.move_to([xs[j], 1.6 - i * 0.85, 0], aligned_edge=LEFT)
        line = Line([-6.5, 1.2, 0], [6.6, 1.2, 0], color=MUTED, stroke_width=1.5)
        sc = M(r"\text{score} = \Big(\prod_{k=1}^{3} \frac{\text{cost}_{\text{ref},k}}{\text{cost}_k}\Big)^{1/3}", 46, QYELLOW).shift(DOWN * 2.3)
        with self.say("Let's put it all together. Three tasks, three cost formulas. Benchmark one: qubits "
                      "times Toffolis plus T gates over four. Benchmark two: the repetition penalty, times "
                      "qubits squared, times Toffolis. Benchmark three: lambda effective, times total "
                      "Toffolis, times total qubits.") as b:
            self.play(FadeIn(table[0]), Create(line), run_time=b.rt(0.15))
            self.play(LaggedStart(*[FadeIn(r, shift=RIGHT * 0.2) for r in table[1:]], lag_ratio=0.5), run_time=b.rt(0.7))
        with self.say("Your score is the geometric mean of the three improvement ratios. Since it's a "
                      "geometric mean, a task you leave at the reference contributes a factor of one, and "
                      "doubling any single ratio raises your score by the same amount, about twenty six "
                      "percent.") as b:
            self.play(Write(sc), run_time=b.rt(0.5))
        self.clear_all()

        # -- submission layout
        mono = lambda txt, sz, col: T(txt.replace(" ", "\u00a0"), sz, col, font="DejaVu Sans Mono")
        tree = VGroup(T("submission.zip", 30, QYELLOW, font="DejaVu Sans Mono"),
                      mono("├── invsqrt.kmb            Benchmark I circuit", 26, INK),
                      mono("├── dqi.kmb                Benchmark II circuit", 26, INK),
                      mono("└── dfthcsos/", 26, INK),
                      mono("    ├── angle_k_0.kmb …      the ANGLE_k circuits", 26, INK),
                      mono("    └── submission.npz       factorization + tree", 26, INK)).arrange(DOWN, aligned_edge=LEFT, buff=0.18)
        fit(tree, 12).shift(UP * 0.9)
        note = VGroup(T("mirrors the sample_submission folder in the competition data", 24, MUTED),
                      T("check the Evaluation page for the exact rules · a few submissions per day", 24, MUTED)).arrange(DOWN, buff=0.15).shift(DOWN * 2)
        with self.say("A submission is a zip file with your circuits: one binary kickmix file for benchmark "
                      "one, one for benchmark two, and a folder for benchmark three, with the angle circuits "
                      "and the factorization. It mirrors the sample submission folder that ships with the "
                      "competition data. Check the competition's evaluation page for the exact rules; "
                      "you only get a few submissions per day.") as b:
            self.play(LaggedStart(*[FadeIn(t) for t in tree], lag_ratio=0.25), run_time=b.rt(0.6))
            self.play(FadeIn(note), run_time=b.rt(0.2))
        self.clear_all()

        data = VGroup(T("In the competition data", 32, INK, weight=BOLD),
                      T("· kickmix (the simulator and circuit builder)", 28, INK),
                      T("· the three official verifiers, with their source code", 28, INK),
                      T("· the reference circuit generators", 28, INK),
                      T("· FeMoCo integrals and the baseline factorization", 28, INK),
                      T("· a sample submission  →  verify it yourself: it should score exactly 1.0", 28, QGREEN),
                      T("· the companion paper (arXiv 2610.23832)", 28, INK)).arrange(DOWN, aligned_edge=LEFT, buff=0.28)
        fit(data, 13)
        with self.say("The competition data gives you everything you need: kickmix itself, the three "
                      "official verifiers with their source code, the reference circuit generators, the "
                      "FeMoCo integrals, a sample submission, and the companion paper. Your very first "
                      "step: run the verifiers on the sample submission yourself, and confirm it scores "
                      "exactly one.") as b:
            self.play(LaggedStart(*[FadeIn(d, shift=RIGHT * 0.2) for d in data], lag_ratio=0.3), run_time=b.rt(0.7))
            self.play(Circumscribe(data[5], color=QGREEN), run_time=b.rt(0.2))
        self.clear_all()

        # -- the loop
        names = ["write a generator\nprogram (Python)", "build the circuit\n(.kmb)", "verify locally\n(official verifier)",
                 "read the cost\nbreakdown", "change one idea"]
        cols = [QBLUE, QPURPLE, QGREEN, QYELLOW, QORANGE]
        R = 2.5
        nodes = VGroup()
        for i, (n_, c_) in enumerate(zip(names, cols)):
            ang = PI / 2 - i * 2 * PI / 5
            r = RoundedRectangle(corner_radius=0.12, width=2.9, height=1.15, color=c_, stroke_width=2.5).set_fill(c_, 0.08)
            t = T(n_, 22, c_).move_to(r)
            nodes.add(VGroup(r, t).move_to([R * 1.35 * np.cos(ang), R * np.sin(ang) - 0.2, 0]))
        arrs = VGroup(*[CurvedArrow(nodes[i].get_center() * 0.82, nodes[(i + 1) % 5].get_center() * 0.82, angle=-0.5, color=MUTED)
                        for i in range(5)])
        with self.say("Then the workflow is a loop. Write a Python program that generates your circuit with "
                      "kickmix's builder. Build it. Verify it locally with the official verifier. Read the "
                      "cost breakdown, kickmix even draws flame charts of where your Toffolis and qubits go. "
                      "Change one idea. Repeat.") as b:
            self.play(LaggedStart(*[FadeIn(n_) for n_ in nodes], lag_ratio=0.3), run_time=b.rt(0.5))
            self.play(LaggedStart(*[Create(a) for a in arrs], lag_ratio=0.2), run_time=b.rt(0.35))
        agent = T("this is exactly the loop an AI coding agent can run for you", 28, QGREEN).to_edge(DOWN, buff=0.3)
        with self.say("And this is exactly the loop the organizers designed for A I coding agents: propose a "
                      "change, build, verify, score, keep the best, and repeat, many times over. The "
                      "organizers ran their own agents, published the SHA-256 hashes of their best "
                      "circuits as a commitment, and say that all three benchmarks can still be improved. "
                      "Evolutionary search with coding agents, in the style of AlphaEvolve, is a natural "
                      "fit.") as b:
            self.play(FadeIn(agent), run_time=b.rt(0.3))
            self.play(Rotate(arrs, angle=2 * PI / 5, about_point=ORIGIN + DOWN * 0.2), run_time=b.rt(0.5))
        self.clear_all()

        # -- a plan
        plan = VGroup(T("A plan for your first two weeks", 34, QYELLOW, weight=BOLD),
                      T("1. Verify the sample submission. Read the three verifiers' source.", 26, INK),
                      T("2. Build tiny circuits in kickmix: a temporary AND, an adder, a small QROM.", 26, INK),
                      T("    Simulate them; break them on purpose; watch the verifier catch it.", 24, MUTED),
                      T("3. Start with Benchmark I: one register, exhaustive tests, a NumPy model.", 26, INK),
                      T("4. Try Benchmark III next: the factorization is an ML-style fitting problem.", 26, INK),
                      T("5. Tackle Benchmark II last: it rewards finite-field and coding-theory depth.", 26, INK),
                      T("6. Read public notebooks; reproduce one before trying to beat it.", 26, INK)).arrange(DOWN, aligned_edge=LEFT, buff=0.25)
        fit(plan, 13)
        with self.say("Here's a concrete plan for your first two weeks. One: verify the sample submission, "
                      "and read the source code of the three verifiers. Two: build tiny circuits in "
                      "kickmix: a temporary AND, an adder, a small lookup. Simulate them. Break them on "
                      "purpose, and watch the verifier catch it.") as b:
            self.play(FadeIn(plan[0]), run_time=b.rt(0.1))
            self.play(FadeIn(plan[1]), run_time=b.rt(0.2))
            self.play(FadeIn(plan[2]), FadeIn(plan[3]), run_time=b.rt(0.3))
        with self.say("Three: start with benchmark one. It has a single register, every input is tested, "
                      "and you can model the arithmetic in NumPy. Four: try benchmark three next. The "
                      "factorization is a fitting problem, right in an A I engineer's comfort zone. Five: "
                      "leave benchmark two for last. It rewards depth in finite fields and coding theory. "
                      "And six: read the public notebooks, and reproduce one before you try to beat it.") as b:
            for p in plan[4:]:
                self.play(FadeIn(p, shift=RIGHT * 0.2), run_time=b.rt(0.18))
        self.clear_all()

        # -- reading list
        reads = VGroup(T("Reading list", 34, QYELLOW, weight=BOLD),
                       T("· Khattar, Rubin, Gidney, Broughton, Low, Babbush — the competition paper (arXiv 2610.23832)", 22, INK),
                       T("· Gidney — Halving the cost of quantum addition (2018): temporary AND, adders", 22, INK),
                       T("· Babbush et al. — Encoding electronic spectra … with linear T complexity (2018): QROM, unary iteration", 22, INK),
                       T("· Low, Kliuchnikov, Schaeffer — Trading T gates for dirty qubits (2018): select-swap lookups", 22, INK),
                       T("· Jordan et al. — Optimization by decoded quantum interferometry (2024)", 22, INK),
                       T("· Nielsen & Chuang — Quantum Computation and Quantum Information (the basics)", 22, INK),
                       T("· Qualtran documentation, and the kickmix docstrings", 22, INK)).arrange(DOWN, aligned_edge=LEFT, buff=0.28)
        fit(reads, 13.2)
        with self.say("And a reading list. First, the competition paper itself: now you can read it. Then "
                      "Craig Gidney's paper on halving the cost of quantum addition. Babbush and coauthors "
                      "on encoding electronic spectra with linear T complexity, which introduced the lookup "
                      "and unary iteration constructions. Low, Kliuchnikov and Schaeffer on select-swap "
                      "lookups. The original decoded quantum interferometry paper. And, for the basics, "
                      "Nielsen and Chuang.") as b:
            self.play(FadeIn(reads[0]), run_time=b.rt(0.1))
            self.play(LaggedStart(*[FadeIn(r, shift=RIGHT * 0.2) for r in reads[1:]], lag_ratio=0.4), run_time=b.rt(0.8))
        self.clear_all()

        # -- vocabulary callback
        words = ["qubit", "Toffoli", "ancilla", "uncomputation", "phase kickback", "HMR", "QROM",
                 "unary iteration", "Fiat–Shamir", "Reed–Solomon", "syndrome", "block encoding",
                 "Givens rotation", "λ_eff", "Z_POW", "T gate", "kickmix", "Clopper–Pearson",
                 "GF(2¹²)", "Newton–Raphson"]
        cloud = VGroup(*[T(w, 30, [QBLUE, QYELLOW, QGREEN, QPURPLE, QORANGE, INK][i % 6]) for i, w in enumerate(words)])
        cloud.arrange_in_grid(rows=5, buff=(0.5, 0.45))
        fit(cloud, 12.5)
        with self.say("Remember the words from the start of this video? Toffoli. Uncomputation. Hammer. "
                      "Q-rom. Syndrome. Block encoding. They should all mean something now.") as b:
            self.play(LaggedStart(*[FadeIn(m, scale=0.7) for m in cloud], lag_ratio=0.08), run_time=b.rt(0.8))
        self.play(FadeOut(cloud), run_time=0.8)

        final = fit(T("Could we get more from a quantum computer\nby asking it to do less?", 40, INK, weight=BOLD), 12.5)
        sub = T("Every Toffoli you remove is a little less a future quantum computer has to do.", 26, QBLUE).next_to(final, DOWN, 0.6)
        fit(sub, 13)
        with self.say("So: could we get more from a quantum computer, by asking it to do less? Every Toffoli "
                      "you remove, and every qubit you save, is a little less work for a future quantum "
                      "computer, and brings useful quantum computing a little closer. Good luck.") as b:
            self.play(Write(final), run_time=b.rt(0.4))
            self.play(FadeIn(sub), run_time=b.rt(0.25))
        self.wait(1.5)
        self.clear_all(1.5)
