from lib import *  # noqa: F401,F403


class S05Loop(NS):
    def construct(self):
        self.open(4, "The agent loop", "harness/agent.py  ·  ~100 lines")

        # a: build_prompt
        self.say("s5_a")
        rows = [("repo + Problem Statement", YEL), ("## Hints   (optional)", GREY), ("## Task Budget:  4.5 min · 40 calls · 80 turns", ORG),
                ("## Rules:  5000-char output · 150-line reads · offline", RED), ("## Instructions  0-5   (work under /workspace …)", BLUE),
                ("## Workspace Layout   find . -maxdepth 3 | head -150", GRN)]
        stack = VGroup(*[box(t, w=9.2, h=0.62, color=c, size=22) for t, c in rows]).arrange(DOWN, buff=0.16).shift(DOWN * 0.35 + LEFT * 0.6)
        lab = T("build_prompt(task, ctx)  →  first user message", 28, WHITE).next_to(stack, UP, buff=0.3)
        self.play(FadeIn(lab))
        for i, r in enumerate(stack):
            self.play(FadeIn(r, shift=RIGHT * 0.3), run_time=0.8)
            self.until(0.08 + 0.14 * (i + 1))
        self.done()
        self.clear()

        # b: messages + loop diagram
        self.say("s5_b")
        msgs = VGroup(box("system", w=2.0, color=PUR, size=20), box("user", w=2.0, color=BLUE, size=20)).arrange(DOWN, buff=0.15)
        ml = VGroup(T("messages = [", 26, GREY), msgs, T("]", 26, GREY)).arrange(DOWN, buff=0.15).move_to([0, -1.5, 0])
        self.play(FadeIn(ml))

        def node(txt, pos, col=BLUE, w=4.0):
            return box(txt, w=w, h=0.9, color=col, size=21).move_to([pos[0], pos[1], 0])

        n1 = node("1  time left?  turns left?", [-4.6, 1.3], YEL)
        n2 = node("2  POST /chat/completions", [0.2, 1.3], BLUE)
        n3 = node("3  prompt_tokens ≥ 32768 ?", [4.8, 1.3], RED)
        n4 = node("4  dispatch tool calls", [4.8, -0.9], GRN)
        n5 = node("5  submit_patch called?", [0.2, -0.9], ORG)
        n6 = node("6  no tool call → nudge", [-4.6, -0.9], PUR)
        self.N = [n1, n2, n3, n4, n5, n6]
        self.play(FadeIn(n1, scale=0.8))
        self.until(0.6)
        self.play(Indicate(n1[0], color=YEL))
        self.done()
        self.play(FadeOut(ml))

        # c: the call
        self.say("s5_c")
        a12 = arrow(n1.get_right(), n2.get_left(), GREY)
        self.play(FadeIn(n2, scale=0.8), Create(a12))
        self.until(0.35)
        body = code_lines([('{"model", "messages",', WHITE), (' "tools": SCHEMAS (6),', GRN), (' "temperature": 0.2, "top_p": 0.95,', BLUE), (' "max_tokens": 8192, ...}', BLUE)], size=17)
        bp = VGroup(panel(body.width + 0.5, body.height + 0.4, GREY), body)
        body.move_to(bp[0])
        bp.move_to([0.2, 3.1 - 0.0 - 0.0, 0]).shift(DOWN * 0.0)
        bp.next_to(n2, UP, buff=0.12)
        self.play(FadeIn(bp, shift=DOWN * 0.2))
        self.until(0.65)
        retry = T("retry: 429 / 5xx  ×5, backoff 2·2ⁿ s", 22, ORG).move_to([0.2, -0.0, 0])
        self.play(FadeIn(retry))
        self.done()
        self.play(FadeOut(bp), FadeOut(retry))

        # d: token guard + meter
        self.say("s5_d")
        a23 = arrow(n2.get_right(), n3.get_left(), GREY)
        self.play(FadeIn(n3, scale=0.8), Create(a23))
        self.until(0.3)
        mbg = Rectangle(width=10.5, height=0.4, stroke_color=GREY, stroke_width=2, fill_color=GREY, fill_opacity=0.1).move_to([0, -2.7, 0])
        lim = Line(mbg.get_corner(UR) + UP * 0.25, mbg.get_corner(DR) + DOWN * 0.25, color=RED, stroke_width=5)
        ll = T("32768", 22, RED).next_to(lim, UP, buff=0.05)
        l0 = T("0 tokens", 20, GREY).next_to(mbg, DOWN, buff=0.1, aligned_edge=LEFT)
        fill = Rectangle(width=0.01, height=0.4, stroke_width=0, fill_color=BLUE, fill_opacity=0.8).align_to(mbg, LEFT).align_to(mbg, UP)
        self.play(FadeIn(mbg), FadeIn(lim), FadeIn(ll), FadeIn(l0))
        self.until(0.45)
        self.play(fill.animate.stretch_to_fit_width(10.5, about_edge=LEFT).set_color(RED), run_time=3.2, rate_func=linear)
        self.play(Flash(lim, color=RED, flash_radius=0.4))
        self.add(fill)
        self.done()
        self.play(FadeOut(VGroup(mbg, lim, ll, l0, fill)))

        # e: dispatch
        self.say("s5_e")
        a34 = arrow(n3.get_bottom(), n4.get_top(), GREY)
        a45 = arrow(n4.get_left(), n5.get_right(), GREY)
        self.play(FadeIn(n4, scale=0.8), Create(a34))
        self.until(0.3)
        err = VGroup(box('InvalidArguments: "arguments are not valid JSON"', w=7.4, h=0.7, color=RED, size=19), T("sent back as a tool message so the model can self-correct", 21, GREY)).arrange(DOWN, buff=0.15).move_to([0, -3.1, 0])
        self.play(FadeIn(err, shift=UP * 0.2))
        self.until(0.65)
        self.play(FadeIn(n5, scale=0.8), Create(a45))
        ex = box("exit: submitted", w=3.2, h=0.6, color=GRN, size=20, fill=0.3).move_to([0.2, -2.2, 0])
        self.play(FadeIn(ex), Create(arrow(n5.get_bottom(), ex.get_top(), GRN)))
        self.done()
        self.play(FadeOut(err), FadeOut(ex))

        # f: nudge
        self.say("s5_f")
        a56 = arrow(n5.get_left(), n6.get_right(), PUR)
        a61 = arrow(n6.get_top(), n1.get_bottom(), PUR)
        a51 = arrow(n5.get_top() + LEFT * 0.9, n1.get_bottom() + RIGHT * 0.9, GREY)
        self.play(FadeIn(n6, scale=0.8), Create(a56), FadeIn(T("no calls", 20, PUR).next_to(a56, DOWN, buff=0.08)))
        self.play(Create(a61))
        self.until(0.3)
        self.play(Create(a51), FadeIn(T("had calls → continue", 20, GREY).move_to([-1.0, 0.55, 0])))
        nl = VGroup(box('finish = "length":  "Do NOT repeat your analysis … emit your next tool call immediately"', w=12.2, h=0.6, color=PUR, size=17),
                    box('otherwise:  "Please continue … or call submit_patch"', w=12.2, h=0.6, color=PUR, size=18)).arrange(DOWN, buff=0.15).move_to([0, -2.3, 0])
        self.until(0.45)
        self.play(FadeIn(nl, shift=UP * 0.2))
        self.until(0.8)
        fail = T("3 failed nudges  →  exit: no_tool_calls", 26, RED).move_to([0, -3.4, 0])
        self.play(FadeIn(fail))
        self.done()
        self.play(FadeOut(nl), FadeOut(fail))

        # g: six exits
        self.say("s5_g")
        names = [("submitted", GRN, self.N[3]), ("time", ORG, self.N[0]), ("turns", ORG, self.N[0]),
                 ("llm_error", RED, self.N[1]), ("context_overflow", RED, self.N[2]), ("no_tool_calls", PUR, self.N[5])]
        chips = VGroup(*[box(n, color=c, size=22, mono=True, fill=0.25) for n, c, _ in names]).arrange_in_grid(2, 3, buff=(0.5, 0.35)).move_to([0, -2.75, 0])
        for i, ch in enumerate(chips):
            self.play(FadeIn(ch, shift=UP * 0.2), Indicate(names[i][2][0], color=names[i][1]), run_time=0.9)
            self.until(0.12 + 0.15 * (i + 1))
        self.done()
        self.close()


class S06Tools(NS):
    def construct(self):
        self.open(5, "Tools & sandbox", "harness/tools.py  ·  harness/sandbox.py")

        # a: tool table
        self.say("s6_a")
        data = [("run_command", "bash in the sandbox", "output ≤ 5000 chars · 180 s", GRN),
                ("read_file", "1-indexed line range", "≤ 150 lines · ≤ 10 000 chars", GRN),
                ("edit_file", "replace old_string once", "exact, else whitespace-flexible", GRN),
                ("write_file", "create / overwrite", "creates parent dirs", GRN),
                ("get_status", "budget + patch state", "FREE · not metered", YEL),
                ("submit_patch", "records the git diff", "FREE · ends the run", YEL)]
        X = [-6.3, -3.4, 1.3]
        rows = VGroup()
        for i, (n, d, c, col) in enumerate(data):
            y = 1.35 - 0.78 * i
            cells = [M(n, 21, col), T(d, 22), T(c, 21, GREY)]
            for cell, x in zip(cells, X):
                cell.move_to([x + cell.width / 2, y, 0])
            rows.add(VGroup(*cells))
        hdrs = VGroup(*[T(t, 20, GREY).move_to([x + 0.5, 2.3, 0]) for t, x in zip(["tool", "what it does", "limits"], X)])
        self.play(FadeIn(hdrs))
        for i, r in enumerate(rows):
            self.play(FadeIn(r, shift=RIGHT * 0.2), run_time=0.7)
            self.until(0.1 + 0.12 * (i + 1))
        self.until(0.8)
        self.play(Indicate(rows[0][2], color=YEL), Indicate(rows[1][2], color=YEL))
        self.done()
        self.clear()

        # b: budget gate
        self.say("s6_b")
        bar_bg = Rectangle(width=11, height=0.5, stroke_color=GREY, stroke_width=2, fill_color=GREY, fill_opacity=0.1).shift(UP * 1.5)
        marks = VGroup(*[Line(UP * 0.12, DOWN * 0.12, color=GREY, stroke_width=1.5).move_to(bar_bg.get_left() + RIGHT * 11 * i / 40 + DOWN * 0.4) for i in range(0, 41, 5)])
        warn = Rectangle(width=11 * 0.25, height=0.5, stroke_width=0, fill_color=ORG, fill_opacity=0.3).align_to(bar_bg, RIGHT).align_to(bar_bg, UP)
        lab = VGroup(T("0", 20, GREY).next_to(bar_bg, DOWN, buff=0.35, aligned_edge=LEFT), T("40 tool calls", 22, GREY).next_to(bar_bg, DOWN, buff=0.35, aligned_edge=RIGHT))
        gate = box("call(): if budget gone → BudgetExhausted;  else calls += 1", w=10.5, color=BLUE, size=22).shift(UP * 0.1)
        self.play(FadeIn(bar_bg), FadeIn(marks), FadeIn(lab), FadeIn(gate))
        fill = Rectangle(width=0.01, height=0.5, stroke_width=0, fill_color=BLUE, fill_opacity=0.8).align_to(bar_bg, LEFT).align_to(bar_bg, UP)
        self.until(0.4)
        self.play(fill.animate.stretch_to_fit_width(11 * 0.5, about_edge=LEFT), run_time=1.5, rate_func=linear)
        self.add(fill)
        self.play(FadeIn(warn), fill.animate.stretch_to_fit_width(11 * 0.75, about_edge=LEFT).set_color(ORG), run_time=1.5, rate_func=linear)
        self.until(0.65)
        js = code_lines([('{"status": "ok", ...,', GREEN_C), ('  "budget_warning": "Only 10 tool call(s) remaining', ORG), ('   (30/40 used). Finalize your edits and call', ORG), ('   submit_patch soon."}', ORG)], size=20)
        jp = VGroup(panel(js.width + 0.6, js.height + 0.5, ORG), js)
        js.move_to(jp[0])
        jp.shift(DOWN * 1.9)
        self.play(FadeIn(jp, shift=UP * 0.2))
        self.play(FadeIn(T("≥ 20 used and ≤ 10 left", 24, ORG).next_to(warn, UP, buff=0.15)))
        self.done()
        self.clear()

        # c: edit_file
        self.say("s6_c")
        fl = code_lines(["def prepare(self):", "    if self.url:", "        return 1", "    return 0"], size=24)
        fp = VGroup(panel(fl.width + 0.7, fl.height + 0.9, GREY), T("file", 20, GREY).shift(UP * 0.0), fl)
        fp[1].next_to(fp[0].get_corner(UL), DR, buff=0.12)
        fl.move_to(fp[0]).shift(DOWN * 0.2)
        fp.shift(LEFT * 4.0 + UP * 0.6)
        old = code_lines(["if self.url:", "  return 1"], size=24, colors=None)
        op = VGroup(panel(old.width + 0.7, old.height + 0.9, YEL), T("old_string  (model's indentation)", 20, YEL), old)
        op[1].next_to(op[0].get_corner(UL), DR, buff=0.12)
        old.move_to(op[0]).shift(DOWN * 0.2)
        op.shift(RIGHT * 3.2 + UP * 0.6)
        self.play(FadeIn(fp), FadeIn(op))
        self.until(0.25)
        s1 = box("1  exact match   count(old_string) == 1", w=8.4, color=BLUE, size=22).shift(DOWN * 1.35)
        r1 = T("✗ not found", 26, RED).next_to(s1, RIGHT, buff=0.3)
        self.play(FadeIn(s1), FadeIn(r1))
        self.until(0.5)
        s2 = box("2  flexible: compare lines with .strip()", w=8.4, color=GRN, size=22).shift(DOWN * 2.15)
        r2 = T("✓ 1 hit", 26, GRN).next_to(s2, RIGHT, buff=0.3)
        self.play(FadeIn(s2), FadeIn(r2), Circumscribe(fl[1:3], color=GRN))
        self.until(0.75)
        s3 = box("3  re-indent new_string to the file's indentation, write", w=8.4, color=PUR, size=22).shift(DOWN * 2.95)
        self.play(FadeIn(s3))
        self.done()
        self.clear()

        # d: sandbox
        self.say("s6_d")
        b1 = box("snapshot.tgz", w=2.8, color=BLUE, size=22, mono=True).move_to([-5.0, 1.7, 0])
        b2 = box("tmp/sbx_xxxx/workspace/", w=4.2, color=GRN, size=20, mono=True).move_to([-0.6, 1.7, 0])
        b3 = box("git commit + tag\n_swegemma_baseline", w=3.6, h=1.0, color=ORG, size=19, mono=True).move_to([4.6, 1.7, 0])
        self.play(FadeIn(b1))
        self.play(Create(arrow(b1.get_right(), b2.get_left())), FadeIn(b2))
        self.play(Create(arrow(b2.get_right(), b3.get_left())), FadeIn(b3))
        self.until(0.4)
        c1 = M("pytest /workspace/tests -q > /tmp/out.txt", 21, YEL).move_to([0, 0.2, 0])
        c2 = M("pytest …/sbx_xxxx/workspace/tests -q > …/sbx_xxxx/tmp/out.txt", 19, GRN).move_to([0, -0.7, 0])
        rw = VGroup(T("model types", 20, GREY).next_to(c1, UP, buff=0.12), T("regex rewrite → actually runs", 20, GREY).next_to(c2, UP, buff=0.12))
        self.play(FadeIn(c1), FadeIn(rw[0]))
        self.play(FadeIn(c2), FadeIn(rw[1]))
        self.until(0.7)
        env = VGroup(*[box(t, color=TEAL, size=18, mono=True) for t in ["PATH=.venv-sandbox/bin", "PYTHONPATH=ws:ws/src", "PYTHONDONTWRITEBYTECODE=1", "PIP_NO_INDEX=1"]]).arrange_in_grid(2, 2, buff=(0.3, 0.25)).move_to([0, -2.3, 0])
        self.play(FadeIn(env, shift=UP * 0.2))
        self.done()
        self.clear()

        # e: patch extraction
        self.say("s6_e")
        cmd = VGroup(M("$ git add -N .", 24, YEL), M("$ git diff --binary _swegemma_baseline", 24, YEL)).arrange(DOWN, aligned_edge=LEFT, buff=0.2).move_to([0, 2.0, 0])
        self.play(FadeIn(cmd))
        d = VGroup(
            VGroup(M("diff --git a/src/requests/status_codes.py", 19, GREY), M('+    425: (..., "too_early"),', 19, GRN)).arrange(DOWN, aligned_edge=LEFT, buff=0.12),
            VGroup(M("diff --git a/repro_issue.py", 19, GREY), M("+print(requests.codes.too_early)", 19, RED)).arrange(DOWN, aligned_edge=LEFT, buff=0.12),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.45)
        dp = VGroup(panel(d.width + 0.8, d.height + 0.7, GREY), d)
        d.move_to(dp[0])
        dp.move_to([-1.4, -0.35, 0])
        self.until(0.3)
        self.play(FadeIn(dp, shift=UP * 0.2))
        self.until(0.55)
        bad = T("scratch file left behind\n→ shipped in the patch", 24, RED).next_to(dp, RIGHT, buff=0.5).shift(DOWN * 0.5)
        self.play(FadeIn(bad), Circumscribe(d[1], color=RED))
        self.until(0.8)
        self.play(FadeIn(T("plain subprocess  =  test convenience, not a security boundary", 24, YEL).move_to([0, -2.9, 0])))
        self.done()
        self.close()


class S07Verify(NS):
    def construct(self):
        self.open(6, "The grader", "harness/verify.py  ·  two-phase grading")

        # a: apply
        self.say("s7_a")
        fresh = box("brand-new sandbox  +  agent patch", w=7.4, color=BLUE, size=26).move_to([0, 1.8, 0])
        self.play(FadeIn(fresh, shift=DOWN * 0.2))
        tries = VGroup(*[box(t, w=8.4, h=0.55, color=GREY, size=18, mono=True) for t in
                         ["git apply", "git apply -3", "git apply --ignore-space-change --ignore-whitespace", "git apply --recount", "git apply -p0", "patch -p1 --batch --forward -l"]]).arrange(DOWN, buff=0.12).move_to([-2.4, -0.9, 0])
        self.until(0.25)
        for i, t in enumerate(tries):
            self.play(FadeIn(t, shift=RIGHT * 0.2), run_time=0.5)
            self.until(0.25 + 0.08 * (i + 1))
        rej = box("all fail → PATCH_REJECTED", w=3.4, color=RED, size=20, fill=0.3).move_to([5.0, -0.9, 0])
        self.play(Create(arrow(tries.get_right(), rej.get_left(), RED)), FadeIn(rej))
        self.done()
        self.clear()

        # b: protected files
        self.say("s7_b")
        pats = ["test_*.py", "*_test.py", "conftest.py", "pytest.ini", "pyproject.toml", "tox.ini", "setup.cfg", "sitecustomize.py", "*.pth", "tests/**/*.py"]
        chips = VGroup(*[box(p, color=RED, size=18, mono=True, fill=0.2) for p in pats]).arrange_in_grid(2, 5, buff=(0.25, 0.25)).move_to([0, 2.0, 0])
        self.play(LaggedStart(*[FadeIn(c, scale=0.8) for c in chips], lag_ratio=0.1), run_time=2.5)
        self.play(FadeIn(T("protected patterns", 24, RED).next_to(chips, UP, buff=0.2)))
        self.until(0.4)
        files = VGroup(box("src/requests/models.py", w=5.2, color=GRN, size=20, mono=True), box("tests/test_requests.py", w=5.2, color=RED, size=20, mono=True),
                       box("conftest.py", w=5.2, color=RED, size=20, mono=True)).arrange(DOWN, buff=0.2).move_to([-3.4, -1.1, 0])
        self.play(FadeIn(files))
        res = VGroup(T("kept", 24, GRN), T("git checkout HEAD  →  erased", 24, RED), T("git checkout HEAD  →  erased", 24, RED))
        for r, f in zip(res, files):
            r.next_to(f, RIGHT, buff=0.3)
        self.play(FadeIn(res), run_time=1.2)
        self.until(0.7)
        hid = box("then:  git apply test_patch  →  pytest <touched test files> --junitxml", w=12.0, color=PUR, size=22, mono=False).move_to([0, -3.1, 0])
        self.play(FadeIn(hid, shift=UP * 0.2))
        self.done()
        self.clear()

        # c: required set
        self.say("s7_c")
        def sq(n, cols):
            return VGroup(*[Square(0.34, stroke_width=1.5, stroke_color=c, fill_color=c, fill_opacity=0.5) for c in cols]).arrange(RIGHT, buff=0.08)
        req = sq(10, [BLUE] * 10)
        lab_r = T("required  =  tests that pass with the GOLD patch", 24, BLUE)
        g = VGroup(lab_r, req).arrange(DOWN, aligned_edge=LEFT, buff=0.2).move_to([0, 1.6, 0])
        self.play(FadeIn(g))
        a_ok = sq(10, [GRN] * 10)
        a_bad = sq(10, [GRN] * 6 + [RED] + [GRN] * 3)
        l1 = T("agent run A", 22, GREY)
        r1 = VGroup(l1, a_ok).arrange(DOWN, aligned_edge=LEFT, buff=0.15).move_to([-3.4, -0.3, 0])
        l2 = T("agent run B", 22, GREY)
        r2 = VGroup(l2, a_bad).arrange(DOWN, aligned_edge=LEFT, buff=0.15).move_to([3.4, -0.3, 0])
        self.until(0.3)
        self.play(FadeIn(r1), FadeIn(r2))
        self.play(FadeIn(box("RESOLVED", w=2.8, color=GRN, size=26, fill=0.3).next_to(r1, DOWN, buff=0.45)),
                  FadeIn(box("TESTS_FAILED", w=3.2, color=RED, size=26, fill=0.3).next_to(r2, DOWN, buff=0.45)))
        self.until(0.65)
        note = T("one missing required test = not resolved", 26, YEL).move_to([0, -2.6, 0])
        self.play(FadeIn(note))
        self.until(0.85)
        self.play(FadeIn(T("README: official FAIL_TO_PASS / PASS_TO_PASS lists may differ slightly", 21, ORG).move_to([0, -3.3, 0])))
        self.done()
        self.clear()

        # d: classify
        self.say("s7_d")
        L = [("resolved", "RESOLVED", GRN), ("prompt_tokens ≥ 32768", "CONTEXT_OVERFLOW", RED),
             ("no patch · time / turns", "BUDGET_EXHAUSTED", ORG), ("no patch · no_tool_calls", "LOOP_BREAKOUT", PUR),
             ("no patch · llm_error", "LLM_ERROR", RED), ("no patch · anything else", "NO_PATCH", GREY),
             ("patch fails to apply", "PATCH_REJECTED", ORG), ("patch applies, tests fail", "TESTS_FAILED", RED)]
        rows = VGroup()
        for cond, cat, col in L:
            rows.add(VGroup(T(cond, 26), T("→", 26, GREY), M(cat, 24, col)).arrange(RIGHT, buff=0.35))
        rows.arrange(DOWN, aligned_edge=LEFT, buff=0.3).shift(DOWN * 0.35)
        for r in rows:
            r[1].set_x(-1.0); r[2].move_to([-0.5 + r[2].width / 2, r[2].get_y(), 0]); r[0].move_to([-1.3 - r[0].width / 2, r[0].get_y(), 0])
        for i, r in enumerate(rows):
            self.play(FadeIn(r, shift=RIGHT * 0.2), run_time=0.7)
            self.until(0.12 + 0.1 * (i + 1))
        self.until(0.9)
        self.play(FadeIn(T("your diagnostic taxonomy", 26, YEL).move_to([0, -3.35, 0])))
        self.done()
        self.close()
