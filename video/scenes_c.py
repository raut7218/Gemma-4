from lib import *  # noqa: F401,F403


class S08Walk(NS):
    def construct(self):
        self.open(7, "One run, end to end", "scripted fake model on requests_6592")

        # a: the change
        self.say("w_a")
        fp = T("src/requests/status_codes.py", 26, GREY, font=MONO).scale(0.8).move_to([0, 2.0, 0])
        old = mline('    425: ("unordered_collection", "unordered"),', 24, RED)
        new = VGroup(mline('    425: ("unordered_collection", "unordered", ', 24, GRN), M('"too_early"', 24, YEL), M("),", 24, GRN)).arrange(RIGHT, buff=0.16)
        old_l = VGroup(T("before", 22, GREY), old).arrange(RIGHT, buff=0.5)
        new_l = VGroup(T("after", 22, GREY), new).arrange(RIGHT, buff=0.5)
        blk = VGroup(old_l, new_l).arrange(DOWN, aligned_edge=LEFT, buff=0.9).move_to([0, 0.2, 0])
        pn = panel(blk.width + 0.8, blk.height + 0.8, GREY).move_to(blk)
        self.pn_w = pn.width
        self.play(FadeIn(fp), FadeIn(pn))
        self.play(FadeIn(old_l, shift=RIGHT * 0.2))
        self.until(0.5)
        self.play(FadeIn(new_l, shift=RIGHT * 0.2))
        self.play(Circumscribe(new[1], color=YEL))
        self.until(0.8)
        self.play(FadeIn(T("a one-line alias: the whole fix", 28, YEL).move_to([0, -2.4, 0])))
        self.done()
        self.clear()

        # b: five turns
        self.say("w_b")
        turns = [("run_command", "grep -n 'unordered' -r src | head", GRN), ("read_file", "status_codes.py  lines 75-90", BLUE),
                 ("edit_file", '425: (…, "unordered")  →  (…, "unordered", "too_early")', ORG), ("run_command", "git diff --stat | tail -3", GRN), ("submit_patch", "", YEL)]
        rows = VGroup()
        for i, (n, a, c) in enumerate(turns):
            rows.add(VGroup(box(f"turn {i + 1}", w=1.7, h=0.6, color=GREY, size=20), M(n, 22, c), T(a, 22, WHITE)).arrange(RIGHT, buff=0.35))
        rows.arrange(DOWN, aligned_edge=LEFT, buff=0.5).move_to([0, 0.3, 0]).align_to([-6.4, 0, 0], LEFT)
        for i, r in enumerate(rows):
            self.until(0.05 + 0.17 * i)
            self.play(FadeIn(r, shift=RIGHT * 0.3), run_time=0.7)
        self.until(0.9)
        cap = T("fake server: step = number of tool messages so far", 24, GREY).move_to([0, -3.0, 0])
        self.play(FadeIn(cap))
        self.done()
        self.play(FadeOut(cap))

        # c: early exit
        self.say("w_c")
        self.play(rows.animate.scale(0.75).move_to([-0.3, 0.5, 0]), run_time=0.8)
        self.play(Indicate(rows[4], color=YEL))
        flag = box("patch_submitted = True   →   return \"submitted\"", w=8.4, color=GRN, size=22, fill=0.25).move_to([0, -1.8, 0])
        self.play(FadeIn(flag, shift=UP * 0.2))
        self.until(0.4)
        never = box("final one-sentence reply  (never requested)", w=8.0, color=RED, size=22).move_to([0, -2.8, 0])
        strike = Line(never.get_left(), never.get_right(), color=RED, stroke_width=4)
        self.play(FadeIn(never), Create(strike))
        self.until(0.65)
        chips = VGroup(box("5 turns", color=BLUE, size=22), box("4 metered calls", color=GRN, size=22), box("max prompt = 3000 tokens", color=ORG, size=22)).arrange(RIGHT, buff=0.35).move_to([0, 2.55, 0])
        self.play(FadeIn(chips, shift=DOWN * 0.2))
        self.done()
        self.clear()

        # d: results folder + pipeline
        self.say("w_d")
        pipe = VGroup(box("extract patch", color=GRN, size=22), box("fresh sandbox", color=BLUE, size=22), box("hidden tests", color=PUR, size=22), box("compare to required", color=ORG, size=22)).arrange(RIGHT, buff=0.55).move_to([0, 2.0, 0])
        for i, b in enumerate(pipe):
            self.play(FadeIn(b, shift=UP * 0.2), run_time=0.7)
            if i:
                self.play(Create(arrow(pipe[i - 1].get_right(), b.get_left())), run_time=0.4)
        self.until(0.45)
        tree = code_lines([("results/run_YYYYMMDD_HHMMSS/", WHITE), ("├─ summary.json", YEL), ("├─ task_results.jsonl", YEL), ("├─ patches/<task>.patch", GRN),
                           ("├─ traces/<task>.json", BLUE), ("└─ test_outputs/<task>.log", ORG)], size=23, buff=0.14).move_to([0, -1.0, 0])
        for ln in tree:
            self.play(FadeIn(ln, shift=RIGHT * 0.15), run_time=0.5)
        self.done()
        self.clear()

        # e: gold / noop
        self.say("w_e")
        g = VGroup(T("--agent gold", 30, YEL, font=MONO).scale(0.8), T("apply the reference patch", 26), box("must be RESOLVED", w=4.2, color=GRN, size=24, fill=0.3),
                   T("fails → sandbox / deps broken", 24, RED)).arrange(DOWN, buff=0.4).move_to([-3.4, 0.0, 0])
        n = VGroup(T("--agent noop", 30, YEL, font=MONO).scale(0.8), T("submit nothing", 26), box("must NOT resolve", w=4.2, color=RED, size=24, fill=0.3),
                   T("passes → tests don't test the fix", 24, RED)).arrange(DOWN, buff=0.4).move_to([3.4, 0.0, 0])
        self.play(FadeIn(g, shift=RIGHT * 0.3))
        self.until(0.45)
        self.play(FadeIn(n, shift=LEFT * 0.3))
        self.until(0.8)
        self.play(FadeIn(T("they bracket the grader", 30, YEL).move_to([0, -2.9, 0])))
        self.done()
        self.close()


class S09Gaps(NS):
    def construct(self):
        self.open(8, "Local harness vs the real thing", "README: “Known gaps”")
        self.say("g_a")
        l = box("local harness", w=3.4, color=ORG, size=26).move_to([-3.0, 1.5, 0])
        r = box("Kaggle", w=3.4, color=RED, size=26).move_to([3.0, 1.5, 0])
        ne = T("≠", 80, YEL).move_to([0, 1.5, 0])
        self.play(FadeIn(l), FadeIn(r))
        self.play(FadeIn(ne, scale=1.5))
        self.play(FadeIn(T("each gap changes what you can trust", 30, GREY).move_to([0, -0.5, 0])))
        self.done()
        self.clear()

        gaps = [("g_b", "1  No GPU / Docker", "loop only ever ran against the scripted fake — no real-model data", RED),
                ("g_c", "2  Not implemented locally", "graph tools · analyzer sub-agent · skills · ADK compaction\nmay be levers in the real stack — testable only on the platform", ORG),
                ("g_d", "3  No FAIL_TO_PASS / PASS_TO_PASS lists", "required tests := tests that pass with the gold patch", YEL),
                ("g_e", "4  PyPI virtualenv, not the offline wheelhouse", "only requests / httpx set up — rich, fastapi can't be graded", ORG),
                ("g_f", "5  Context overflow detected, not handled", "usage.prompt_tokens ≥ 32768 → stop; real compaction may rescue runs", BLUE)]
        for key, head, body, col in gaps:
            self.say(key)
            h = T(head, 32, col)
            b = T(body, 26, GREY)
            g = VGroup(h, b).arrange(DOWN, aligned_edge=LEFT, buff=0.4).move_to([0, 0.3, 0])
            pn = panel(g.width + 0.9, g.height + 1.0, col).move_to(g)
            self.play(FadeIn(pn), FadeIn(h, shift=RIGHT * 0.3))
            self.until(0.35)
            self.play(FadeIn(b, shift=RIGHT * 0.3))
            self.done()
            self.play(FadeOut(VGroup(pn, h, b)), run_time=0.5)

        self.say("g_g")
        cmd = VGroup(M("kaggle datasets download \\", 22, YEL), M("  metric/gemma-4-developer-agent-wheelhouse", 22, YEL)).arrange(DOWN, aligned_edge=LEFT, buff=0.12)
        cp = VGroup(panel(cmd.width + 0.8, cmd.height + 0.7, YEL), cmd)
        cmd.move_to(cp[0])
        cp.move_to([0, 1.2, 0])
        self.play(FadeIn(cp, shift=DOWN * 0.2))
        self.until(0.4)
        out = VGroup(box("867 MB", color=GREY, size=22), box("contains adk_submission", color=BLUE, size=22), box("validate your YAML on the real stack", color=GRN, size=22)).arrange(DOWN, buff=0.3).move_to([0, -1.6, 0])
        self.play(LaggedStart(*[FadeIn(o, shift=UP * 0.2) for o in out], lag_ratio=0.4), run_time=2.5)
        self.done()
        self.close()


class S10Why(NS):
    def construct(self):
        self.open(9, "Where could the 92% hide?", "six hypotheses, ranked by how well the code supports them")

        self.say("s8_a")
        warn = VGroup(T("this repo has never run the real model", 38, RED), T("verified only against a scripted fake server", 26, GREY)).arrange(DOWN, buff=0.3).move_to([0, 1.2, 0])
        self.play(FadeIn(warn, shift=UP * 0.2))
        self.until(0.5)
        leg = VGroup(VGroup(Dot(color=GRN), T("proved by the code", 26)).arrange(RIGHT, buff=0.2), VGroup(Dot(color=ORG), T("hypothesis to test", 26)).arrange(RIGHT, buff=0.2)).arrange(RIGHT, buff=1.0).move_to([0, -1.2, 0])
        self.play(FadeIn(leg))
        self.done()
        self.clear()

        # H1 context
        self.say("s8_b")
        ax = Axes(x_range=[0, 40, 10], y_range=[0, 40000, 10000], x_length=9.6, y_length=4.2,
                  axis_config={"color": GREY, "include_numbers": False, "include_tip": False}).move_to([0.3, -0.45, 0])
        xl = VGroup(*[T(str(v), 20, GREY).next_to(ax.c2p(v, 0), DOWN, buff=0.15) for v in (0, 10, 20, 30, 40)])
        yl = VGroup(*[T(f"{v // 1000}k", 20, GREY).next_to(ax.c2p(0, v), LEFT, buff=0.15) for v in (0, 10000, 20000, 30000, 40000)])
        xt = T("tool calls used", 22, GREY).next_to(ax, DOWN, buff=0.55)
        yt = T("prompt tokens", 22, GREY).rotate(PI / 2).next_to(ax, LEFT, buff=0.75)
        ttl = T("H1 · context", 30, ORG).move_to([-4.6, 2.55, 0]).align_to([-6.8, 0, 0], LEFT) if False else T("H1 · context window", 30, ORG).move_to([0, 2.75, 0])
        self.play(FadeIn(ttl), Create(ax), FadeIn(xl), FadeIn(yl), FadeIn(xt), FadeIn(yt))
        lim = DashedLine(ax.c2p(0, 32768), ax.c2p(40, 32768), color=RED, stroke_width=4)
        self.play(Create(lim), FadeIn(T("32 768", 22, RED).next_to(ax.c2p(40, 32768), UP, buff=0.1).shift(LEFT * 0.4)))
        self.until(0.4)
        lines = [(600, GRN, "600 tok/call  →  fits"), (1000, YEL, "1000 tok/call  →  overflow ≈ call 30"), (1500, RED, "1500 tok/call  →  overflow ≈ call 20")]
        keys = []
        for k, c, lab in lines:
            f = ax.plot(lambda x, k=k: 3000 + k * x, x_range=[0, 40], color=c, stroke_width=5)
            self.play(Create(f), run_time=1.4)
            xc = (32768 - 3000) / k
            if xc <= 40:
                self.play(FadeIn(Dot(ax.c2p(xc, 32768), color=c, radius=0.12)), run_time=0.3)
            keys.append(T(lab, 22, c))
        kg = VGroup(*keys).arrange(DOWN, aligned_edge=LEFT, buff=0.12).move_to(ax.c2p(29, 7000))
        kb = panel(kg.width + 0.5, kg.height + 0.4, GREY).move_to(kg)
        self.play(FadeIn(kb), FadeIn(kg))
        self.until(0.82)
        self.play(FadeIn(T("assumed: ~3k-token start prompt;  nothing is ever dropped from messages", 22, GREY).move_to([0, -3.65, 0])))
        self.done()
        self.clear()

        # H2 time
        self.say("s8_c")
        self.play(FadeIn(T("H2 · wall-clock time", 30, ORG).move_to([0, 2.75, 0])))
        bar = Rectangle(width=11.4, height=0.9, stroke_color=GREY, stroke_width=2).move_to([0, 0.9, 0])
        L = 11.4 / 270
        segs, x, col_i = [], 0.0, 0
        plan = [("llm", 12), ("tool", 3)] * 6 + [("llm", 12), ("pytest", 60)] + [("llm", 12), ("tool", 3)] * 6
        cols = {"llm": BLUE, "tool": GREEN_C, "pytest": ORG}
        n_turns = 0
        for kind, secs in plan:
            if x + secs > 270:
                break
            r = Rectangle(width=secs * L, height=0.9, stroke_color=BG, stroke_width=1, fill_color=cols[kind], fill_opacity=0.85).move_to(bar.get_left() + RIGHT * (x * L + secs * L / 2))
            segs.append(r); x += secs
            n_turns += kind == "llm"
        ticks = VGroup(*[T(f"{t}s", 18, GREY).next_to(bar.get_corner(DL) + RIGHT * t * L, DOWN, buff=0.15) for t in range(0, 271, 60)])
        self.play(Create(bar), FadeIn(ticks))
        self.until(0.2)
        self.play(LaggedStart(*[FadeIn(s) for s in segs], lag_ratio=0.04), run_time=4.0)
        key = VGroup(box("model turn ≈ 12 s", color=BLUE, size=20), box("tool ≈ 3 s", color=GREEN_C, size=20), box("one pytest ≈ 60 s", color=ORG, size=20)).arrange(RIGHT, buff=0.3).move_to([0, -0.8, 0])
        self.play(FadeIn(key))
        self.until(0.65)
        res = T(f"→ ≈ {n_turns} turns fit in 4.5 min, not 80;  not even 40 calls", 28, YEL).move_to([0, -1.9, 0])
        self.play(FadeIn(res))
        self.until(0.8)
        self.play(FadeIn(T("illustrative numbers — measure them from the trace timestamps", 22, ORG).move_to([0, -2.8, 0])))
        self.done()
        self.clear()

        # H3 graph tools
        self.say("s8_d")
        self.play(FadeIn(T("H3 · half-blind on code search", 30, ORG).move_to([0, 2.75, 0])))
        gt = VGroup(*[box(n, w=4.2, color=ORG, size=20, mono=True) for n in ["search_similar_code", "get_code_neighbors", "get_code_subgraph"]]).arrange(DOWN, buff=0.3).move_to([-4.3, 0.2, 0])
        self.play(LaggedStart(*[FadeIn(g, shift=RIGHT * 0.2) for g in gt], lag_ratio=0.3), run_time=1.5)
        q = VGroup(T("prompt says:", 22, GREY), T("“search_similar_code takes a", 24), T("symbol name (e.g. \"parse_header\"),", 24), T("never a sentence.”", 24), T("one sentence — all the guidance", 20, YEL)).arrange(DOWN, aligned_edge=LEFT, buff=0.18)
        qp = VGroup(panel(q.width + 0.6, q.height + 0.6, YEL), q)
        q.move_to(qp[0])
        qp.move_to([3.3, 0.3, 0])
        self.until(0.35)
        self.play(FadeIn(qp, shift=LEFT * 0.2))
        self.until(0.65)
        qm = VGroup(*[T("?", 40, RED).next_to(g, RIGHT, buff=0.2) for g in gt])
        self.play(FadeIn(qm))
        self.play(FadeIn(T("used well?  or wasted calls?  locally they just fail", 26, RED).move_to([0, -2.3, 0])))
        self.done()
        self.clear()

        # H4 thinking
        self.say("s8_e")
        self.play(FadeIn(T("H4 · thinking is off", 30, ORG).move_to([0, 2.75, 0])))
        sw_bg = RoundedRectangle(corner_radius=0.4, width=1.6, height=0.8, stroke_color=RED, fill_color=RED, fill_opacity=0.2).move_to([0, 1.3, 0])
        sw_dot = Dot(sw_bg.get_left() + RIGHT * 0.4, color=RED, radius=0.3)
        self.play(FadeIn(sw_bg), FadeIn(sw_dot), FadeIn(T("thinking_budget = 0", 26, RED, font=MONO).scale(0.8).next_to(sw_bg, RIGHT, buff=0.4)))
        pros = VGroup(T("+ faster turns", 30, GRN), T("+ fewer tokens → less context pressure", 21, GRN)).arrange(DOWN, aligned_edge=LEFT, buff=0.25)
        cons = VGroup(T("− weaker bug localisation", 30, RED), T("− multi-file reasoning, zero thought", 21, RED)).arrange(DOWN, aligned_edge=LEFT, buff=0.25)
        pros.move_to([-3.3, -0.7, 0]); cons.move_to([3.3, -0.7, 0])
        self.until(0.35)
        self.play(FadeIn(pros, shift=RIGHT * 0.2))
        self.play(FadeIn(cons, shift=LEFT * 0.2))
        self.until(0.75)
        self.play(FadeIn(T("a direct trade against H2  —  only data can pick", 28, YEL).move_to([0, -2.6, 0])))
        self.done()
        self.clear()

        # H5 prompt
        self.say("s8_f")
        self.play(FadeIn(T("H5 · prompt optimises speed over correctness", 30, ORG).move_to([0, 2.75, 0])))
        ph = VGroup(box("“smallest diff”", color=BLUE, size=26), box("“ONE targeted test file”", color=BLUE, size=26), box("“reasoning in a few sentences”", color=BLUE, size=26)).arrange(DOWN, buff=0.3).move_to([-3.2, 0.5, 0])
        self.play(LaggedStart(*[FadeIn(p, shift=RIGHT * 0.2) for p in ph], lag_ratio=0.3), run_time=2.0)
        self.until(0.5)
        miss = box("1. reproduce the bug first", w=5.8, color=RED, size=26, fill=0.0)
        miss[0].set_stroke(RED, 3).set_style(stroke_opacity=1)
        miss = VGroup(DashedVMobject(miss[0], num_dashes=60), miss[1]).move_to([3.4, 0.5, 0])
        self.play(FadeIn(miss))
        self.play(FadeIn(T("never asked for", 24, RED).next_to(miss, DOWN, buff=0.3)))
        self.until(0.85)
        self.play(FadeIn(T("sensible under the budgets — but fixes usually go better with a repro", 24, GREY).move_to([0, -2.7, 0])))
        self.done()
        self.clear()

        # H6 calibration
        self.say("s8_g")
        self.play(FadeIn(T("H6 · the scorer may not be what you think", 30, ORG).move_to([0, 2.75, 0])))
        pairs = [("required = gold-passing tests", "official FAIL_TO_PASS / PASS_TO_PASS"), ("PyPI virtualenv", "offline wheelhouse + editable install"), ("subprocess sandbox", "real sandbox")]
        rows = VGroup()
        for a, b in pairs:
            rows.add(VGroup(box(a, w=5.9, color=ORG, size=19), T("≠", 40, YEL), box(b, w=5.9, color=RED, size=19)).arrange(RIGHT, buff=0.35))
        rows.arrange(DOWN, buff=0.4).move_to([0, 0.15, 0])
        hd = VGroup(T("local", 24, ORG).move_to([-3.4, 2.1, 0]), T("Kaggle", 24, RED).move_to([3.4, 2.1, 0]))
        self.play(FadeIn(hd))
        for r in rows:
            self.play(FadeIn(r, shift=UP * 0.2), run_time=0.8)
        self.until(0.75)
        self.play(FadeIn(T("calibrate local numbers against a real submission", 28, YEL).move_to([0, -2.7, 0])))
        self.done()
        self.close()


class S11Roadmap(NS):
    def construct(self):
        self.open(10, "What to do first", "measure before you tune")
        self.say("s9_a")
        t = T("Not rewrite the prompt.", 46, RED).move_to([0, 0.9, 0])
        m = T("Measure.", 80, GRN).move_to([0, -0.7, 0])
        self.play(FadeIn(t))
        self.play(FadeIn(m, scale=1.4))
        self.done()
        self.clear()

        self.say("r_trace")
        cards = [("task_results.jsonl", YEL, ["category", "end_reason", "tool_calls · turns", "agent_seconds", "max_prompt_tokens", "patch_chars"]),
                 ("traces/<task>.json", BLUE, ["every assistant message", "timestamp t", "prompt / completion tokens", "finish_reason", "tool calls + result[:2000]"]),
                 ("test_outputs/<task>.log", ORG, ["last 4000 chars of pytest", "applied-patch errors", "TEST_PATCH_FAILED etc."])]
        grp = VGroup()
        for name, col, items in cards:
            hd = T(name, 23, col, font=MONO).scale(0.75)
            body = VGroup(*[T(i, 21, WHITE) for i in items]).arrange(DOWN, aligned_edge=LEFT, buff=0.18)
            c = VGroup(hd, body).arrange(DOWN, aligned_edge=LEFT, buff=0.3)
            grp.add(VGroup(panel(4.1, 3.9, col), c))
            c.move_to(grp[-1][0])
        grp.arrange(RIGHT, buff=0.3).move_to([0, -0.1, 0])
        for i, c in enumerate(grp):
            self.until(0.15 + 0.22 * i)
            self.play(FadeIn(c, shift=UP * 0.2), run_time=0.9)
        self.until(0.85)
        self.play(FadeIn(T("which wall was hit — and why", 30, YEL).move_to([0, -2.9, 0])))
        self.done()
        self.clear()

        self.say("s9_b")
        steps = VGroup(T("1  serve the real model, run the 3 tasks", 24), T("2  read summary.json: category histogram", 24), T("3  read five failed traces by hand", 24), T("4  change one thing at a time", 24)).arrange(DOWN, aligned_edge=LEFT, buff=0.55).move_to([-3.4, 0.2, 0])
        steps.align_to([-6.7, 0, 0], LEFT)
        table = [("CONTEXT_OVERFLOW", "compaction · tighter outputs", RED), ("BUDGET_EXHAUSTED", "cheaper turns · better first moves", ORG),
                 ("TESTS_FAILED", "localisation + verification", YEL), ("LOOP_BREAKOUT", "nudges + tool schemas", PUR)]
        tb = VGroup()
        for c, a, col in table:
            tb.add(VGroup(M(c, 21, col), T("→ " + a, 22)).arrange(DOWN, aligned_edge=LEFT, buff=0.08))
        tb.arrange(DOWN, aligned_edge=LEFT, buff=0.38).move_to([3.5, 0.0, 0])
        self.play(FadeIn(steps[0], shift=RIGHT * 0.2))
        self.until(0.18)
        self.play(FadeIn(steps[1], shift=RIGHT * 0.2))
        self.until(0.3)
        hh = T("if the histogram is dominated by…", 22, GREY).next_to(tb, UP, buff=0.35)
        self.play(FadeIn(hh))
        for i, r in enumerate(tb):
            self.play(FadeIn(r, shift=LEFT * 0.2), run_time=0.8)
            self.until(0.34 + 0.13 * (i + 1))
        self.play(FadeIn(steps[2], shift=RIGHT * 0.2))
        self.until(0.9)
        self.play(FadeIn(steps[3], shift=RIGHT * 0.2))
        self.done()
        self.clear()

        self.say("s9_c")
        sc = T("0.08", 70, YEL).move_to([0, 0.1, 0])
        walls = VGroup(box("time  4.5 min", w=3.6, color=ORG, size=26).move_to([0, 2.2, 0]), box("tool calls  40", w=3.6, color=GRN, size=26).move_to([-4.6, 0.1, 0]),
                       box("context  32 768", w=3.8, color=RED, size=26).move_to([4.6, 0.1, 0]))
        self.play(FadeIn(sc))
        for w in walls:
            self.play(FadeIn(w, scale=0.8), run_time=0.8)
        arrs = [arrow(walls[0].get_bottom(), sc.get_top() + UP * 0.1, ORG), arrow(walls[1].get_right(), sc.get_left(), GRN), arrow(walls[2].get_left(), sc.get_right(), RED)]
        self.until(0.55)
        self.play(*[Create(a) for a in arrs])
        self.until(0.75)
        self.play(FadeIn(T("Which wall does the agent keep hitting?", 40, YEL).move_to([0, -2.2, 0])))
        self.done(pad=2.0)
        self.close()
