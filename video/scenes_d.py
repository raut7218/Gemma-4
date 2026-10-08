from lib import *  # noqa: F401,F403


class S00Title(NS):
    def construct(self):
        t = T("Inside the Gemma 4 Developer Agent", 54, YEL)
        s = T("an architecture tour of the baseline harness", 30, GREY)
        g = VGroup(t, s).arrange(DOWN, buff=0.4)
        self.play(FadeIn(g, shift=UP * 0.3), run_time=1.5)
        self.wait(3.5)
        self.play(FadeOut(g), run_time=1.0)


class S12Recap(NS):
    def construct(self):
        h = T("Recap", 44, YEL).to_edge(UP, buff=0.7)
        rows = [("submission/", "4 small files — the thing that is scored", BLUE),
                ("harness/", "~570-line local replica of the scorer", ORG),
                ("agent loop", "prompt → model → tools → submit, with 6 exits", GRN),
                ("walls", "4.5 min · 40 calls · 32 768 tokens", RED),
                ("grader", "hidden tests; resolved only if every required test passes", PUR),
                ("next step", "run the real model, read the failure histogram", YEL)]
        g = VGroup(*[VGroup(T(a, 30, c), T(b, 28)).arrange(RIGHT, buff=0.5) for a, b, c in rows])
        for r in g:
            r[0].set_width(2.6) if r[0].width > 2.6 else None
        g.arrange(DOWN, aligned_edge=LEFT, buff=0.5).move_to([0, -0.3, 0])
        self.play(FadeIn(h))
        for r in g:
            self.play(FadeIn(r, shift=RIGHT * 0.3), run_time=0.8)
            self.wait(1.8)
        self.wait(3.0)
        self.play(*[FadeOut(m) for m in self.mobjects], run_time=1.2)
