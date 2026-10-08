from lib import *  # noqa: F401,F403


class S01Intro(NS):
    def construct(self):
        self.say("s1_a")
        big = T("0.08", 160, YEL)
        self.play(Write(big), run_time=1.8)
        sub = T("score of this repo on the Gemma 4 Developer Agent task set", 26, GREY).next_to(big, DOWN, buff=0.3)
        self.play(FadeIn(sub))
        self.until(0.45)
        self.play(big.animate.scale(0.55).shift(LEFT * 4.2 + UP * 0.3), sub.animate.scale(0.0001), run_time=1.2)
        qs = VGroup(T("What exactly is being measured?", 36, BLUE), T("Which part of the system produced it?", 36, GRN),
                    T("Where are the other 92% going?", 36, RED)).arrange(DOWN, buff=0.6, aligned_edge=LEFT).shift(RIGHT * 1.6)
        for q in qs:
            self.play(FadeIn(q, shift=RIGHT * 0.3), run_time=0.7)
            self.until(0.45 + 0.17 * (qs.submobjects.index(q) + 1))
        self.done()
        self.clear(keep_header=False)

        self.say("s1_b")
        steps = ["The task and how it is scored", "Repo map: submission vs harness", "The submission bundle",
                 "The agent loop", "Tools and the sandbox", "The grader", "Where the 92% may hide"]
        rows = VGroup()
        for i, s in enumerate(steps):
            n = T(str(i + 1), 26, YEL)
            rows.add(VGroup(n, T(s, 30)).arrange(RIGHT, buff=0.4))
        rows.arrange(DOWN, aligned_edge=LEFT, buff=0.38).shift(LEFT * 1.2 + UP * 0.2)
        for i, r in enumerate(rows):
            self.play(FadeIn(r, shift=RIGHT * 0.3), run_time=0.6)
            self.until(0.08 + 0.1 * (i + 1))
        leg = VGroup(VGroup(Dot(color=GRN), T("what the code proves", 24)).arrange(RIGHT, buff=0.2),
                     VGroup(Dot(color=ORG), T("hypothesis to test", 24)).arrange(RIGHT, buff=0.2)).arrange(RIGHT, buff=1.0).to_edge(DOWN, buff=0.7)
        self.until(0.8)
        self.play(FadeIn(leg))
        self.done()
        self.close()


class S02Task(NS):
    def construct(self):
        self.open(1, "The task", "what is being scored")

        # a: inputs
        self.say("s2_a")
        issue = VGroup(panel(3.8, 2.5, YEL), T("problem_statement", 22, YEL).shift(UP * 0.9))
        for i, w in enumerate([3.0, 2.6, 3.0, 1.9]):
            issue.add(Line(LEFT * w / 2, RIGHT * w / 2, color=GREY, stroke_width=4).shift(UP * (0.35 - 0.32 * i)))
        issue.shift(LEFT * 5.0 + UP * 1.0)
        snap = VGroup(panel(3.8, 1.5, BLUE), T("repo snapshot", 22, BLUE).shift(UP * 0.4), M("requests_6592.tgz", 16).shift(DOWN * 0.25)).shift(LEFT * 5.0 + DOWN * 1.5)
        agent = box("Agent", w=2.2, h=1.4, color=GRN, size=34).shift(LEFT * 1.8)
        self.play(FadeIn(issue, shift=RIGHT * 0.3), run_time=0.8)
        self.play(FadeIn(snap, shift=RIGHT * 0.3), run_time=0.8)
        a1, a2 = arrow(issue.get_right(), agent.get_left() + UP * 0.3, YEL), arrow(snap.get_right(), agent.get_left() + DOWN * 0.3, BLUE)
        self.play(GrowFromCenter(agent), Create(a1), Create(a2))
        self.until(0.5)
        chips = VGroup(*[box(n, color=TEAL, size=22, mono=True) for n in ["requests", "httpx", "rich", "fastapi"]]).arrange(RIGHT, buff=0.3).to_edge(DOWN, buff=0.6)
        self.play(LaggedStart(*[FadeIn(c, shift=UP * 0.2) for c in chips], lag_ratio=0.3), run_time=1.5)
        self.done()

        # b: output is a patch
        self.say("s2_b")
        patch = VGroup(panel(6.1, 2.2, GRN),
                       code_lines([("--- a/src/requests/status_codes.py", GREY), ("+++ b/src/requests/status_codes.py", GREY),
                                   ('-  425: ("unordered_collection", "unordered"),', RED),
                                   ('+  425: ("unordered_collection", "unordered", "too_early"),', GRN)], size=15)).shift(RIGHT * 3.8 + UP * 0.2)
        patch[1].set_width(5.7).move_to(patch[0])
        pl = T("patch = git diff", 26, GRN).next_to(patch, UP, buff=0.2)
        a3 = arrow(agent.get_right(), patch.get_left(), GRN)
        self.play(Create(a3), FadeIn(patch, shift=LEFT * 0.3), FadeIn(pl))
        self.until(0.7)
        self.play(Circumscribe(patch, color=GRN))
        self.done()
        self.clear()

        # c: hidden tests
        self.say("s2_c")
        p = box("agent patch", color=GRN, size=22).shift(LEFT * 4.8 + UP * 1.4)
        fresh = box("fresh repo copy", color=BLUE, size=22).shift(LEFT * 4.8 + DOWN * 0.1)
        hid = box("hidden test_patch", color=PUR, size=22).shift(LEFT * 4.8 + DOWN * 1.6)
        py = box("pytest", w=2.0, h=1.0, color=ORG, size=28).shift(LEFT * 0.4 + DOWN * 0.1)
        ok = box("RESOLVED", w=2.8, color=GRN, size=26, fill=0.3).shift(RIGHT * 4.4 + UP * 1.0)
        bad = box("not resolved", w=2.8, color=RED, size=26, fill=0.3).shift(RIGHT * 4.4 + DOWN * 1.2)
        self.play(FadeIn(p), FadeIn(fresh), FadeIn(hid))
        self.play(Create(arrow(p.get_bottom(), fresh.get_top(), GRN)), run_time=0.8)
        self.until(0.35)
        self.play(Create(arrow(fresh.get_right(), py.get_left() + UP * 0.2)), Create(arrow(hid.get_right(), py.get_left() + DOWN * 0.2, PUR)))
        self.play(GrowFromCenter(py))
        self.until(0.65)
        q = T("all required tests pass?", 24, YEL).next_to(py, UP, buff=0.55)
        self.play(FadeIn(q))
        self.play(Create(arrow(py.get_right(), ok.get_left(), GRN)), Create(arrow(py.get_right(), bad.get_left(), RED)), FadeIn(ok), FadeIn(bad))
        self.until(0.92)
        self.play(FadeIn(T("no partial credit", 26, RED).next_to(bad, DOWN, buff=0.3)))
        self.done()
        self.clear()

        # d: the 8/100 grid
        self.say("s2_d")
        grid = VGroup(*[Square(0.34, stroke_width=1.5, stroke_color=GREY, fill_color=GREY, fill_opacity=0.15) for _ in range(100)])
        grid.arrange_in_grid(10, 10, buff=0.08).shift(LEFT * 3.2 + DOWN * 0.3)
        self.play(FadeIn(grid, lag_ratio=0.02), run_time=2.0)
        self.until(0.4)
        self.play(*[grid[i].animate.set_fill(GRN, 0.9).set_stroke(GRN) for i in range(8)], run_time=1.2)
        big = T("8 / 100", 80, GRN).shift(RIGHT * 3.6 + UP * 1.2)
        lab = T("resolved", 30, GREY).next_to(big, DOWN, buff=0.1)
        self.play(Write(big), FadeIn(lab))
        self.until(0.65)
        bad = T("92 ways to fail", 44, RED).shift(RIGHT * 3.6 + DOWN * 1.2)
        self.play(*[grid[i].animate.set_fill(RED, 0.45).set_stroke(RED) for i in range(8, 100)], FadeIn(bad), run_time=1.5)
        self.play(FadeIn(T("we need to tell them apart", 26, YEL).next_to(bad, DOWN, buff=0.3)))
        self.done()
        self.clear()

        # e: model fixed, scaffolding free
        self.say("s2_e")
        model = VGroup(panel(8.2, 1.5, RED), T("gemma-4-31b-it-qat-w4a16-ct", 34, RED, font=MONO).scale(0.75),
                       T("FIXED", 24, RED).shift(UP * 0.45 + LEFT * 3.2)).shift(UP * 1.6)
        model[1].move_to(model[0]).shift(DOWN * 0.1)
        self.play(FadeIn(model, shift=DOWN * 0.3))
        self.until(0.3)
        knobs = VGroup(*[VGroup(panel(2.7, 1.5, GRN), T(n, 26, GRN)) for n in ["prompt", "tools", "budgets", "sampling"]])
        for k in knobs:
            k[1].move_to(k[0])
        knobs.arrange(RIGHT, buff=0.3).shift(DOWN * 1.0)
        self.play(LaggedStart(*[FadeIn(k, shift=UP * 0.3) for k in knobs], lag_ratio=0.3), run_time=2.0)
        self.until(0.8)
        self.play(FadeIn(T("your levers  =  this repo", 32, YEL).next_to(knobs, DOWN, buff=0.5)))
        self.done()
        self.close()


class S03Repo(NS):
    def construct(self):
        self.open(2, "Repo map", "four pieces, one idea")
        tree = [
            ("Gemma-4/", WHITE), ("├─ submission/", BLUE), ("│   ├─ agent.yaml", BLUE), ("│   ├─ eval_config.yaml", BLUE),
            ("│   ├─ configs/sampling.yaml", BLUE), ("│   └─ prompts/system.md", BLUE),
            ("├─ harness/", ORG), ("│   ├─ run.py       111", ORG), ("│   ├─ agent.py     101", ORG), ("│   ├─ tools.py     180", ORG),
            ("│   ├─ sandbox.py    98", ORG), ("│   └─ verify.py     81", ORG),
            ("├─ tests/fake_llm.py   39", PUR), ("├─ fetch_task.sh", TEAL), ("└─ README.md", GREY),
        ]
        t = code_lines(tree, size=22, buff=0.1).shift(LEFT * 3.9 + DOWN * 0.45)
        self.say("s3_a")
        self.play(FadeIn(t[0]))
        notes = {1: ("submission/  =  what Kaggle scores", BLUE, 5), 6: ("harness/  =  local replica of the scorer", ORG, 11),
                 12: ("scripted fake model server", PUR, 12), 13: ("downloads task snapshots", TEAL, 13)}
        shown = 1
        note_mob = None
        for start, (txt, col, end) in notes.items():
            self.play(*[FadeIn(t[i], shift=RIGHT * 0.2) for i in range(shown, end + 1)], run_time=1.2)
            shown = end + 1
            nm = T(txt, 28, col).move_to(UP * (1.7 - 1.0 * list(notes).index(start)))
            nm.align_to(LEFT * 0.4, LEFT)
            self.play(FadeIn(nm, shift=LEFT * 0.3), run_time=0.7)
            self.until(min(0.2 * (list(notes).index(start) + 1) + 0.05, 0.85))
        self.play(FadeIn(t[14]))
        self.done()
        self.clear()

        self.say("s3_b")
        scorer = VGroup(panel(4.6, 2.4, RED), T("Kaggle scorer", 30, RED), T("real model, real wheelhouse", 20, GREY)).shift(RIGHT * 3.6 + UP * 1.4)
        scorer[1].move_to(scorer[0]).shift(UP * 0.35); scorer[2].move_to(scorer[0]).shift(DOWN * 0.3)
        sub = box("submission/", w=3.4, h=1.0, color=BLUE, size=28, mono=True).shift(LEFT * 4.2 + UP * 1.4)
        harn = VGroup(panel(4.6, 2.4, ORG), T("harness/", 30, ORG), T("subprocess sandbox, PyPI deps", 20, GREY)).shift(RIGHT * 3.6 + DOWN * 1.6)
        harn[1].move_to(harn[0]).shift(UP * 0.35); harn[2].move_to(harn[0]).shift(DOWN * 0.3)
        self.play(FadeIn(sub), FadeIn(scorer))
        a1 = arrow(sub.get_right(), scorer.get_left(), BLUE)
        self.play(Create(a1), FadeIn(T("scored", 24, BLUE).next_to(a1, UP, buff=0.05)))
        self.until(0.4)
        self.play(FadeIn(harn))
        a2 = DashedLine(sub.get_bottom() + DOWN * 0.1, harn.get_left(), color=ORG, stroke_width=3).add_tip()
        self.play(Create(a2), FadeIn(T("same config, local run", 24, ORG).next_to(a2.get_center(), DOWN, buff=0.15).shift(LEFT * 0.4)))
        self.until(0.75)
        ne = T("≈", 70, YEL).move_to(RIGHT * 3.6 + DOWN * 0.1)
        self.play(FadeIn(ne, scale=1.5))
        self.play(FadeIn(T("README lists the gaps", 26, YEL).next_to(ne, RIGHT, buff=0.3)))
        self.done()
        self.clear()

        self.say("s3_c")
        log = [("050d469  Replace with local baseline harness", GRN), ("18b8968  Merge pull request #2", GREY), ("b2dfa62  Add holdout A/B runner and report", GREY),
               ("9ffb91f  Merge pull request #1", GREY), ("b490dce  Add presubmit skill variant of the senior-dev port", GREY),
               ("7cc110c  Add senior-dev port: ADK submission bundle", GREY), ("0af46b7  Add research roadmap (Word document)", GREY)]
        lg = code_lines(log, size=24, buff=0.3).shift(DOWN * 0.1)
        for ln in lg:
            self.play(FadeIn(ln, shift=RIGHT * 0.2), run_time=0.5)
        self.until(0.6)
        self.play(Indicate(lg[0], color=GRN), Create(SurroundingRectangle(lg[0], color=GRN, buff=0.12)))
        self.play(FadeIn(T("simplest honest starting point, not a tuned entry", 28, YEL).next_to(lg, DOWN, buff=0.6)))
        self.done()
        self.close()


class S04Submission(NS):
    def construct(self):
        self.open(3, "The submission bundle", "the thing that actually gets scored")
        self.say("s4_a")
        yaml = [("name: swe_baseline_agent", WHITE), ("model: gemma-4-31b-it-qat-w4a16-ct", RED), ("instruction: !include prompts/system.md", BLUE),
                ("tools:", WHITE), ("  - run_command  - read_file  - edit_file", GRN), ("  - write_file  - get_status  - submit_patch", GRN),
                ("  - search_similar_code  - get_code_neighbors", ORG), ("  - get_code_subgraph", ORG),
                ("generate_content_config: !include configs/sampling.yaml", BLUE), ("evaluation:   # budgets", YEL), ("  timeout_seconds: 180", YEL),
                ("  max_tool_calls: 40", YEL), ("  max_time_minutes: 4.5", YEL), ("  max_turns: 80", YEL)]
        y = code_lines(yaml[:9], size=21, buff=0.13)
        y.scale(min(1, 8.2 / y.width)).move_to([-2.6, -0.3, 0])
        self.play(FadeIn(VGroup(panel(y.width + 0.7, y.height + 0.6, GREY).move_to(y))))
        self.play(LaggedStart(*[FadeIn(l, shift=RIGHT * 0.15) for l in y], lag_ratio=0.15), run_time=3.5)
        self.until(0.6)
        ref = VGroup(box("prompts/system.md", color=BLUE, size=20, mono=True), box("configs/sampling.yaml", color=BLUE, size=20, mono=True)).arrange(DOWN, buff=0.5).shift(RIGHT * 4.9 + UP * 0.2)
        ref.scale(3.6 / ref.width)
        self.play(FadeIn(ref))
        self.play(Create(arrow(y[2].get_right(), ref[0].get_left(), BLUE)), Create(arrow(y[8].get_right(), ref[1].get_left(), BLUE)))
        self.play(FadeIn(T("ADK = Google Agent Development Kit", 22, GREY).to_edge(DOWN, buff=0.5)))
        self.done()
        self.clear()

        self.say("s4_b")
        six = ["run_command", "read_file", "edit_file", "write_file", "get_status", "submit_patch"]
        three = ["search_similar_code", "get_code_neighbors", "get_code_subgraph"]
        g6 = VGroup(*[box(n, w=3.5, color=GRN, size=20, mono=True) for n in six]).arrange(DOWN, buff=0.22).shift(LEFT * 3.7 + DOWN * 0.4)
        g3 = VGroup(*[box(n, w=4.2, color=ORG, size=20, mono=True) for n in three]).arrange(DOWN, buff=0.22).shift(RIGHT * 3.0 + UP * 0.4)
        h6 = T("6 plain tools  (implemented locally)", 24, GRN).next_to(g6, UP, buff=0.3)
        h3 = T("3 graph tools  (code graph + embeddings)", 24, ORG).next_to(g3, UP, buff=0.3)
        self.play(FadeIn(h6), LaggedStart(*[FadeIn(b, shift=RIGHT * 0.2) for b in g6], lag_ratio=0.2), run_time=2.5)
        self.until(0.5)
        self.play(FadeIn(h3), LaggedStart(*[FadeIn(b, shift=LEFT * 0.2) for b in g3], lag_ratio=0.2), run_time=1.8)
        self.until(0.72)
        x = VGroup(*[T("✗", 30, RED).next_to(b, RIGHT, buff=0.15) for b in g3])
        note = T("not implemented in the local harness\n→  UnknownTool error", 22, RED).next_to(g3, DOWN, buff=0.5)
        self.play(FadeIn(x), FadeIn(note))
        self.done()
        self.clear()

        self.say("s4_c")
        walls = [("per command", "180 s", 1.0, YEL), ("wall clock", "4.5 min", 0.75, RED), ("tool calls", "40", 0.5, ORG), ("model turns", "80", 1.0, BLUE)]
        rows = VGroup()
        for name, val, frac, col in walls:
            bar_bg = Rectangle(width=6.0, height=0.45, stroke_color=GREY, stroke_width=1.5, fill_color=GREY, fill_opacity=0.1)
            bar = Rectangle(width=6.0 * frac, height=0.45, stroke_width=0, fill_color=col, fill_opacity=0.8).align_to(bar_bg, LEFT)
            rows.add(VGroup(T(name, 26).set_width(2.6) if False else T(name, 26), VGroup(bar_bg, bar), T(val, 30, col)))
        for r in rows:
            r.arrange(RIGHT, buff=0.5)
        rows.arrange(DOWN, buff=0.55, aligned_edge=LEFT).shift(LEFT * 0.2 + UP * 0.3)
        for i, r in enumerate(rows):
            self.play(FadeIn(r, shift=RIGHT * 0.2), run_time=0.9)
        self.until(0.55)
        self.play(Indicate(rows[1], color=RED, scale_factor=1.06))
        self.play(FadeIn(T("whichever wall is hit first ends the session", 28, YEL).to_edge(DOWN, buff=0.9)))
        self.until(0.85)
        self.play(FadeIn(T("read issue → find code → edit → test → submit  in 4.5 minutes", 24, GREY).to_edge(DOWN, buff=0.4)))
        self.done()
        self.clear()

        self.say("s4_d")
        sl = VGroup()
        for name, val, frac, col in [("temperature", "0.2", 0.2, BLUE), ("top_p", "0.95", 0.95, BLUE), ("max_output_tokens", "8192", 0.4, BLUE)]:
            tr = Line(LEFT * 2.5, RIGHT * 2.5, color=GREY, stroke_width=4)
            dot = Dot(tr.point_from_proportion(frac), color=col, radius=0.14)
            sl.add(VGroup(T(name, 26).set_opacity(1), VGroup(tr, dot), T(val, 28, col, font=MONO)).arrange(RIGHT, buff=0.5))
        sw_bg = RoundedRectangle(corner_radius=0.25, width=1.0, height=0.5, stroke_color=RED, fill_color=RED, fill_opacity=0.2)
        sw_dot = Dot(sw_bg.get_left() + RIGHT * 0.25, color=RED, radius=0.2)
        sl.add(VGroup(T("thinking_budget", 26), VGroup(sw_bg, sw_dot), T("0   (OFF)", 28, RED, font=MONO)).arrange(RIGHT, buff=0.5))
        sl.arrange(DOWN, aligned_edge=LEFT, buff=0.6).shift(DOWN * 0.1)
        for s in sl:
            self.play(FadeIn(s, shift=RIGHT * 0.2), run_time=0.8)
        self.until(0.7)
        self.play(Indicate(sl[3], color=RED))
        self.play(FadeIn(T("include_thoughts: false  ·  no reasoning mode", 24, GREY).to_edge(DOWN, buff=0.8)))
        self.done()
        self.clear()

        self.say("s4_e")
        pr = panel(10.4, 4.7, GREY).shift(DOWN * 0.35)
        lines = VGroup(
            T("You are an autonomous software engineer fixing one issue.", 24, WHITE),
            T("Be fast, minimal and precise.", 26, YEL),
            T("1  Locate the code:  grep -rn | head", 22, BLUE), T("2  Edit with small edit_file changes. Never edit tests.", 22, BLUE),
            T("3  Verify with ONE targeted test.  Never the whole suite.", 22, BLUE), T("4  Clean scratch files, call submit_patch last.", 22, BLUE),
            T("Rules: reasoning in a few sentences · few tool calls · smallest diff", 22, GRN),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.3).move_to(pr)
        self.play(FadeIn(pr))
        for i, l in enumerate(lines):
            self.play(FadeIn(l, shift=RIGHT * 0.2), run_time=0.8)
        self.until(0.85)
        self.play(FadeIn(T("≈ 156 words  =  the model's whole strategy", 28, YEL).to_edge(DOWN, buff=0.4)))
        self.done()
        self.close()
