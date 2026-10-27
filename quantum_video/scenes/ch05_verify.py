import hashlib
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import *  # noqa: E402,F403


def hexgroup(h, n=24):
    return h[:n] + "…"


class Ch05Verify(VScene):
    def construct(self):
        chapter_card(self, 5, "How circuits are verified", "fuzz testing and Fiat–Shamir")

        # -- three checks
        checks = VGroup(
            T("1.  inputs restored — the input register holds what it started with", 28, INK),
            T("2.  scratch is clean — every other qubit is back to 0", 28, INK),
            T("3.  phase is right — within the benchmark's tolerance", 28, INK)).arrange(DOWN, aligned_edge=LEFT, buff=0.45)
        checks.shift(UP * 0.3)
        ticks = VGroup(*[T("✓", 34, QGREEN).next_to(c, LEFT, 0.3) for c in checks])
        with self.say("So how does the verifier decide that a circuit is correct? It runs the circuit on "
                      "classical inputs, and on every shot it checks three things. The input registers "
                      "hold their original values. Every scratch qubit is back to zero. And the "
                      "accumulated phase matches the target, within the benchmark's tolerance.") as b:
            self.play(LaggedStart(*[FadeIn(c, shift=RIGHT * 0.2) for c in checks], lag_ratio=0.5), run_time=b.rt(0.7))
            self.play(LaggedStart(*[FadeIn(t) for t in ticks], lag_ratio=0.3), run_time=b.rt(0.2))
        self.clear_all()

        # -- exhaustive vs sampled
        left = VGroup(T("small input space", 30, QBLUE, weight=BOLD), T("test every input", 26, INK),
                      T("Benchmark I:", 24, MUTED),
                      T("3,133,452 inputs × 64 shots", 26, QBLUE),
                      T("= 200,540,928 shots", 26, QBLUE)).arrange(DOWN, buff=0.25)
        right = VGroup(T("huge input space", 30, QYELLOW, weight=BOLD), T("sample inputs at random", 26, INK),
                       T("Benchmark II:", 24, MUTED),
                       T("840-qubit syndromes", 26, QYELLOW),
                       T("102,400 random shots", 26, QYELLOW)).arrange(DOWN, buff=0.25)
        VGroup(left, right).arrange(RIGHT, buff=2.0).shift(UP * 0.4)
        fuzz = T("“fuzz testing”: can't prove perfection, but bounds the failure rate", 28, MUTED).shift(DOWN * 2.6)
        with self.say("When the set of possible inputs is small enough, you can simply test all of them. "
                      "In benchmark one, that's exactly what happens: every one of the three point one "
                      "million inputs, sixty four times each. That's two hundred million shots.") as b:
            self.play(FadeIn(left), run_time=b.rt(0.5))
        with self.say("When the input space is astronomically large, like the eight hundred and forty "
                      "qubit syndromes of benchmark two, the verifier samples inputs at random instead. "
                      "That's called fuzz testing. It can't prove that a circuit is perfect, but it can "
                      "put a bound on how often it fails.") as b:
            self.play(FadeIn(right), run_time=b.rt(0.4))
            self.play(FadeIn(fuzz), run_time=b.rt(0.2))
        self.clear_all()

        # -- why 64 shots per input
        eq = M(r"P(\text{all 64 shots miss a 50/50 bug}) = 2^{-64} \approx 5\times10^{-20}", 44).shift(UP * 0.5)
        with self.say("Why run each input sixty four times? Because the hammer outcomes are random. A "
                      "missing fix-up only shows up on some outcomes. A bug that strikes with "
                      "probability one half per shot slips past all sixty four shots with probability "
                      "two to the minus sixty four. That's essentially never.") as b:
            self.play(Write(eq), run_time=b.rt(0.6))
        self.clear_all()

        # -- Fiat-Shamir
        q = T("Who chooses the random test inputs?", 34, INK).to_edge(UP, buff=0.5)
        bad = T("fixed public test set  →  hard-code the answers", 28, QRED).next_to(q, DOWN, 0.5)
        with self.say("But who picks the random test inputs? If the tests were fixed and public, "
                      "someone could hard-code the answers for exactly those inputs.") as b:
            self.play(FadeIn(q), run_time=b.rt(0.3))
            self.play(FadeIn(bad), run_time=b.rt(0.3))

        file_ = VGroup(RoundedRectangle(corner_radius=0.1, width=2.2, height=2.6, color=QBLUE, stroke_width=2.5),
                       T("circuit.kmb", 24, QBLUE))
        file_[1].move_to(file_[0].get_top() + DOWN * 0.35)
        lines = VGroup(*[Line(LEFT * 0.8, RIGHT * (0.8 - 0.3 * (i % 3)), color=MUTED, stroke_width=2) for i in range(6)])
        lines.arrange(DOWN, buff=0.22, aligned_edge=LEFT).move_to(file_[0].get_center() + DOWN * 0.25)
        file_.add(lines).shift(LEFT * 5 + DOWN * 0.6)
        h1 = hashlib.sha256(b"CCX q0 q1 q2\nHMR q2\n").hexdigest()
        h2 = hashlib.sha256(b"CCX q0 q1 q2\nHMR q3\n").hexdigest()
        sha = VGroup(RoundedRectangle(corner_radius=0.1, width=1.9, height=1.0, color=QYELLOW), T("SHA-256", 26, QYELLOW))
        sha[1].move_to(sha[0])
        sha.next_to(file_, RIGHT, 0.8)
        digest = T(hexgroup(h1), 22, QYELLOW, font="DejaVu Sans Mono").next_to(sha, DOWN, 0.4)
        seed = VGroup(RoundedRectangle(corner_radius=0.1, width=2.4, height=1.0, color=QGREEN), T("random seed", 26, QGREEN))
        seed[1].move_to(seed[0])
        seed.next_to(sha, RIGHT, 0.8)
        rng = np.random.default_rng(int(h1[:8], 16))
        tests = VGroup(*[T(f"x = {int(v):,}", 22, INK) for v in rng.integers(1, 3133452, 5)]).arrange(DOWN, buff=0.12)
        tests.next_to(seed, RIGHT, 0.6)
        a1 = Arrow(file_.get_right(), sha.get_left(), buff=0.1, color=INK)
        a2 = Arrow(sha.get_right(), seed.get_left(), buff=0.1, color=INK)
        a3 = Arrow(seed.get_right(), tests.get_left(), buff=0.1, color=INK)
        with self.say("The trick is called the Fiat Shamir heuristic. The verifier takes the bytes of your "
                      "circuit file, hashes them with SHA-256, and uses the hash as the seed of the random "
                      "number generator that picks the test inputs and the measurement outcomes.") as b:
            self.play(FadeIn(file_), run_time=b.rt(0.15))
            self.play(GrowArrow(a1), FadeIn(sha), run_time=b.rt(0.15))
            self.play(FadeIn(digest), run_time=b.rt(0.1))
            self.play(GrowArrow(a2), FadeIn(seed), run_time=b.rt(0.15))
            self.play(GrowArrow(a3), FadeIn(tests), run_time=b.rt(0.15))
        rng2 = np.random.default_rng(int(h2[:8], 16))
        tests2 = VGroup(*[T(f"x = {int(v):,}", 22, INK) for v in rng2.integers(1, 3133452, 5)]).arrange(DOWN, buff=0.12)
        tests2.move_to(tests, aligned_edge=LEFT)
        digest2 = T(hexgroup(h2), 22, QYELLOW, font="DejaVu Sans Mono").move_to(digest)
        with self.say("Change a single byte of your circuit, and you get a completely different hash, "
                      "and so a completely different set of tests. You can't know the tests until "
                      "you've committed to the circuit.") as b:
            self.play(Indicate(lines[3], color=QRED, scale_factor=1.3), run_time=b.rt(0.2))
            self.play(Transform(digest, digest2), run_time=b.rt(0.2))
            self.play(Transform(tests, tests2), run_time=b.rt(0.2))
        salt = T("+ secret salt, revealed only after submissions close", 26, QPURPLE).next_to(sha, UP, 1.3)
        with self.say("One more defence. Without it, you could add do-nothing gates to your circuit "
                      "over and over, until the hash happened to pick easy tests. That's called seed "
                      "grinding. So the competition mixes a secret salt into the hash, which is only "
                      "revealed after submissions are fixed.") as b:
            self.play(FadeIn(salt, shift=DOWN * 0.2), run_time=b.rt(0.35))
        self.clear_all()

        # -- confidence bound
        ax = Axes(x_range=[0, 0.002, 0.0005], y_range=[-300, 0, 100], x_length=7, y_length=3.8,
                  axis_config={"color": MUTED, "font_size": 22}, tips=False).shift(LEFT * 2.6 + DOWN * 0.3)
        ax.add_coordinates({0.0005: r"0.05\%", 0.001: r"0.1\%", 0.0015: r"0.15\%", 0.002: r"0.2\%"},
                           {-100: "-100", -200: "-200", -300: "-300"})
        N = 102400
        curve = ax.plot(lambda e: N * np.log2(1 - e), x_range=[0, 0.002, 0.00002], color=QBLUE, stroke_width=4)
        cap = T("log₂ P(0 failures in 102,400 shots)", 24, QBLUE).next_to(ax, UP, 0.2)
        xl = T("true failure rate ε", 24, MUTED).next_to(ax, DOWN, 0.5)
        eps_plus = 88.72 / N
        thr = DashedLine(ax.c2p(0, -128), ax.c2p(0.002, -128), color=QRED)
        thr_l = M(r"2^{-128}", 30, QRED).next_to(thr, RIGHT, 0.1)
        vline = DashedLine(ax.c2p(eps_plus, -128), ax.c2p(eps_plus, -300), color=QYELLOW)
        f = VGroup(M(r"(1-\varepsilon_+)^N = 2^{-128}", 38),
                   M(r"\varepsilon_+ \approx \frac{88.7}{N}", 42, QYELLOW),
                   M(r"N = 102{,}400:\;\; \varepsilon_+ \approx 0.087\%", 36, QYELLOW)).arrange(DOWN, buff=0.4)
        f.move_to(RIGHT * 4.6 + UP * 0.2)
        with self.say("From the results, the verifier computes an upper bound on the true failure rate: "
                      "a one-sided Clopper Pearson bound, at confidence one minus two to the minus one "
                      "hundred and twenty eight. If a circuit fails on a fraction epsilon of inputs, the "
                      "chance that it passes N shots in a row is one minus epsilon, to the N.") as b:
            self.play(Create(ax), FadeIn(cap), FadeIn(xl), run_time=b.rt(0.3))
            self.play(Create(curve), run_time=b.rt(0.3))
            self.play(Create(thr), FadeIn(thr_l), Write(f[0]), run_time=b.rt(0.2))
        with self.say("With zero failures, that gives a bound of about eighty nine divided by N. So a "
                      "hundred thousand clean shots certify a failure rate below about one in a "
                      "thousand.") as b:
            self.play(Create(vline), Write(f[1]), run_time=b.rt(0.4))
            self.play(FadeIn(f[2]), run_time=b.rt(0.3))
        self.clear_all()

        # -- from basis states to superpositions
        bnd = M(r"\big\|\, \text{implemented}|\psi\rangle - \text{ideal}|\psi\rangle \,\big\|_{\text{trace}} \;\le\; 2\sqrt{\varepsilon}", 46).shift(UP * 1.4)
        cond = T("if test inputs are drawn from the distribution the real algorithm feeds in", 26, MUTED).next_to(bnd, DOWN, 0.4)
        fit(cond, 13)
        with self.say("Why does passing on classical inputs tell you anything about superpositions, "
                      "which is what the real algorithm feeds in? The paper proves it. If the circuit "
                      "fails on a fraction epsilon of inputs, with inputs drawn from the distribution "
                      "the real algorithm would produce, then the output state is within distance two "
                      "root epsilon of the ideal one. That's why each benchmark carefully specifies how "
                      "its test inputs are drawn.") as b:
            self.play(Write(bnd), run_time=b.rt(0.4))
            self.play(FadeIn(cond), run_time=b.rt(0.2))
        approx = VGroup(T("so approximate circuits are allowed:", 30, QGREEN, weight=BOLD),
                        T("· drop a rarely needed carry bit", 26, INK),
                        T("· truncate an intermediate register", 26, INK),
                        T("· stop a loop early on typical inputs", 26, INK)).arrange(DOWN, aligned_edge=LEFT, buff=0.2)
        approx.shift(DOWN * 1.6)
        with self.say("And that has a big consequence: approximate circuits are allowed. Dropping a "
                      "rarely needed carry bit, truncating a register, stopping a loop early: all legal, "
                      "as long as the errors stay within budget. In benchmark one, every shot must pass, "
                      "but the phase only has to be close. In benchmark two, occasional failures are "
                      "allowed, and cost you a penalty.") as b:
            self.play(LaggedStart(*[FadeIn(a) for a in approx], lag_ratio=0.4), run_time=b.rt(0.6))
        self.clear_all()
