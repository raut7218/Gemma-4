"""Offline regression check: unit checks of the harness rules, then the toy task end to end.

  uv run python tests/check_offline.py

Needs .venv-sandbox with pytest and nothing else: no Kaggle data, GPU or network. It starts tests/fake_llm.py
itself on :8765, so stop any copy that is already running.
"""
import json
import re
import subprocess
import sys
import tempfile
import textwrap
import threading
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path[:0] = [str(ROOT), str(ROOT / "tests")]

import fake_llm  # noqa: E402
import harness.agent as agent_mod  # noqa: E402
from harness.agent import build_prompt, declared_tools, effective_sampling, render, thinking_body  # noqa: E402
from harness.bundle import load_submission  # noqa: E402
from harness.check_bundle import Checker  # noqa: E402
from harness.sandbox import PROTECTED, Sandbox, strip_protected  # noqa: E402
from harness.tools import Budget, Ctx  # noqa: E402

FAILED = []


def check(name: str, ok: bool, detail=""):
    print(f"{'ok  ' if ok else 'FAIL'} {name}{'' if ok else f'  -> {detail}'}")
    if not ok:
        FAILED.append(name)


def eq(name: str, got, want):
    check(name, got == want, f"got {got!r}, want {want!r}")


def bundle(tmp: Path, name: str, gen: str, instruction="Fix it. {problem_description}") -> Checker:
    d = tmp / name
    d.mkdir()
    (d / "agent.yaml").write_text(f"name: a\nmodel: gemma-4-31b-it-qat-w4a16-ct\ninstruction: \"{instruction}\"\n"
                                  f"tools: [run_command, submit_patch]\ngenerate_content_config:\n{gen}")
    c = Checker(d)
    c.run()
    return c


def units(tmp: Path):
    on = {"chat_template_kwargs": {"enable_thinking": True}}
    off = {"chat_template_kwargs": {"enable_thinking": False}}
    eq("thinking: budget 2048 is on", thinking_body({"thinking_budget": 2048, "include_thoughts": True}), {**on, "thinking_token_budget": 2048})
    eq("thinking: budget 0 is off", thinking_body({"thinking_budget": 0, "include_thoughts": True}), off)
    eq("thinking: include_thoughts false alone is off", thinking_body({"include_thoughts": False}), off)
    eq("thinking: budget beats include_thoughts false", thinking_body({"thinking_budget": 4096, "include_thoughts": False}), {**on, "thinking_token_budget": 4096})
    eq("thinking: level none beats budget", thinking_body({"thinking_level": "NONE", "thinking_budget": 4096}), off)
    eq("thinking: level low sets reasoning_effort", thinking_body({"thinking_level": "low"}), {**on, "reasoning_effort": "low"})
    eq("thinking: empty config sends nothing", thinking_body({}), {})
    # the v2 bundle: include_thoughts false, then the default budget is merged in and thinking runs anyway
    v2 = effective_sampling({"max_output_tokens": 4096, "thinking_config": {"include_thoughts": False}})
    eq("defaults: v2 config gets budget 4096", v2["thinking_config"], {"thinking_budget": 4096, "include_thoughts": False})
    eq("defaults: v2 config ends up thinking", thinking_body(v2["thinking_config"])["chat_template_kwargs"], {"enable_thinking": True})
    eq("defaults: empty config", effective_sampling(None), {"max_output_tokens": 16384, "thinking_config": {"thinking_budget": 4096}})
    eq("defaults: submission values win", effective_sampling({"max_output_tokens": 6144, "thinking_config": {"thinking_budget": 0}}),
       {"max_output_tokens": 6144, "thinking_config": {"thinking_budget": 0}})

    for path, want in (("tests/test_a.py", True), ("src/pkg/test_util.py", True), ("pkg/util_test.py", True), ("conftest.py", True),
                       ("a/pyproject.toml", True), ("Tests/helpers/data.py", True), ("x.pth", True), ("_swegemma_stubs.py", True),
                       ("src/pkg/core.py", False), ("docs/testing.md", False), ("src/contest.py", False), ("tests/data.json", False),
                       ("src/latest/core.py", False)):
        eq(f"protected: {path}", bool(PROTECTED.search(path)), want)

    lib = "diff --git a/src/a.py b/src/a.py\nindex 1..2 100644\n--- a/src/a.py\n+++ b/src/a.py\n@@ -1 +1 @@\n-x = 1\n+x = 2\n"
    tst = "diff --git a/tests/test_a.py b/tests/test_a.py\nnew file mode 100644\n--- /dev/null\n+++ b/tests/test_a.py\n@@ -0,0 +1 @@\n+assert True\n"
    eq("strip: keeps library sections", strip_protected(lib + tst), lib)
    eq("strip: test-only patch becomes empty", strip_protected(tst), "")
    eq("strip: order does not matter", strip_protected(tst + lib), lib)
    eq("strip: extra protected paths", strip_protected(lib, ["src/a.py"]), "")
    bare = "--- a/src/a.py\n+++ b/src/a.py\n@@ -1 +1 @@\n-x = 1\n+x = 2\n"
    eq("strip: header-less patch", strip_protected(bare + "--- a/setup.cfg\n+++ b/setup.cfg\n@@ -1 +1 @@\n-a\n+b\n"), bare)
    eq("strip: removed line that looks like a header", strip_protected(lib + "@@ -5 +5 @@\n--- a/tests/x\n+++ b/tests/y\n"), lib + "@@ -5 +5 @@\n--- a/tests/x\n+++ b/tests/y\n")

    eq("render: optional key", render("a {hints?} b {problem_description}", {"problem_description": "P"}), "a  b P")
    try:
        render("{missing}", {})
        check("render: missing key raises", False, "no KeyError")
    except KeyError:
        check("render: missing key raises", True)

    c = bundle(tmp, "b0", "  thinking_config:\n    thinking_budget: 0\n")
    check("checker: thinking_budget 0 is valid", not c.errors and not c.warnings, c.errors + c.warnings)
    c = bundle(tmp, "b1", "  thinking_config:\n    thinking_budget: -1\n")
    check("checker: negative budget is an error", any("thinking_budget" in e for e in c.errors), c.errors)
    c = bundle(tmp, "b2", "  max_output_tokens: 4096\n  thinking_config:\n    include_thoughts: false\n")
    check("checker: v2 config warns that thinking stays on", any("no longer turns thinking off" in w for w in c.warnings), c.warnings)
    check("checker: v2 config warns about the output cap", any("max_output_tokens=4096" in w for w in c.warnings), c.warnings)
    c = bundle(tmp, "b3", "  temperature: 0.4\n")
    check("checker: missing budget warns about the default", any("default of 4096" in w for w in c.warnings), c.warnings)
    c = bundle(tmp, "b4", "  thinking_config:\n    thinking_budget: 2048\n    include_thoughts: true\n  max_output_tokens: 6144\n")
    check("checker: v3 thinking config is clean", not c.errors and not c.warnings, c.errors + c.warnings)
    c = bundle(tmp, "b5", "  temperature: 0.4\n", instruction="Use {hints} and {problem_description}")
    check("checker: {hints} must be optional", any("hints" in e for e in c.errors), c.errors)
    for b in ("submission", "bundles/v10", "bundles/parallel-investigate"):
        c = Checker(ROOT / b)
        check(f"checker: {b} passes with no warnings", c.run() and not c.warnings, c.errors + c.warnings)

    sub = load_submission(ROOT / "submission")
    g = effective_sampling(sub["root"]["generate_content_config"])
    tc = g["thinking_config"]
    check("submission: thinking on, thoughts kept", thinking_body(tc)["chat_template_kwargs"]["enable_thinking"] and tc["include_thoughts"] is True, tc)
    check("submission: output cap leaves room after thinking", g["max_output_tokens"] >= tc["thinking_budget"] + 2048, g)
    ev = sub["eval"]
    # the 12 h job: v4, v5 and v7 at 8 min / 28 calls finished on Kaggle, as did the public budget-fit bundles at 8 / 28;
    # v7 at 10 min / 28 calls overran. More minutes or calls need a timing check (colab_eval/timing.py) first.
    eq("submission: the 31B", sub["root"]["model"], "gemma-4-31b-it-qat-w4a16-ct")
    check("submission: time cap fits the 12 h job", ev["max_time_minutes"] <= 8.0 and ev["max_tool_calls"] <= 28, ev)
    eq("submission: budget fields", {k: ev[k] for k in ("max_tool_calls", "max_time_minutes", "max_turns", "timeout_seconds")},
       {"max_tool_calls": 28, "max_time_minutes": 8.0, "max_turns": 80, "timeout_seconds": 240})
    text = sub["root"]["instruction"]
    check("submission: no stray braces in the prompt", "{" not in text and "}" not in text)
    check("submission: prompt states the bundle's own budget",
          f"{ev['max_tool_calls']} tool calls" in text and f"{ev['max_time_minutes']:g} minutes" in text)
    check("submission: no skills, and the prompt does not mention them",
          not sub["root"].get("skills") and "run_skill_script" not in text and "locate.py" not in text and "check.py" not in text)
    check("submission: prompt plans an edit by call 12 and grades the diff at the cutoff",
          "By call 12" in text and "diff you have at that moment is graded" in text and "docs_src/" in text)
    check("submission: prompt asks for short old_strings and recovers from malformed calls",
          "1 to 3 lines" in text and "single-line old_string" in text and "mandatory input parameters" in text)
    check("submission: prompt has the contract step with exact names and exports",
          "Contract, before your first tool call" in text and "use exactly that name and signature" in text and "__all__" in text)
    check("submission: prompt verifies with a /tmp heredoc repro and the whole test file",
          "cat > /tmp/repro.py <<'EOF'" in text and "-x -q" in text and "Never run the whole test suite" in text)
    check("submission: prompt covers title-only issues, rereads and unchanged repros",
          "only a title" in text and "Never read the same lines twice in a row" in text
          and "same result after an edit" in text and "at most one repro before your first edit" in text)
    check("submission: prompt finishes at the budget warning with a cleanup before submit",
          "budget_warning" in text and "git status --short" in text)
    # v11.2's "Call N/28." counter was written as visible text before the thought and broke the first reply
    check("submission: prompt warns that calls past the budget are refused, without a call counter",
          "A call past the 28th is refused" in text and "Call N/" not in text)
    check("submission: prompt forbids git commands that throw away edits",
          "Never run git checkout, git stash, git reset or git restore" in text)
    check("submission: prompt reads the existing test before the repro and writes edits with real line breaks",
          "read the existing test of the code you will change" in text and "never with \\n escapes" in text)
    candidate_checks(tmp)
    eq("bundles/v10: keeps the swe skill", [Path(p).name for p in load_submission(ROOT / "bundles" / "v10")["root"].get("skills") or []], ["swe"])
    for name, md in (("Swe", "---\nname: Swe\ndescription: d\n---\n"), ("swe", "---\nname: other\ndescription: d\n---\n"),
                     ("nodesc", "---\nname: nodesc\n---\n")):
        d = tmp / f"sk_{name}"
        (d / "skills" / name).mkdir(parents=True)
        (d / "skills" / name / "SKILL.md").write_text(md)
        (d / "agent.yaml").write_text(f"name: a\nmodel: gemma-4-31b-it-qat-w4a16-ct\ninstruction: x\nskills: [skills/{name}]\n"
                                      "generate_content_config:\n  thinking_config:\n    thinking_budget: 0\n")
        c = Checker(d)
        check(f"checker: bad skill {name!r} is an error", not c.run() and any("skill" in e for e in c.errors), c.errors)
    # call budget spent: the first text-only reply ends the run, with no nudge (swegemma agent_runner)
    sent = []
    real_chat = agent_mod.chat
    agent_mod.chat = lambda *a, **k: sent.append(1) or {"choices": [{"message": {"role": "assistant", "content": "done"}}], "usage": {"prompt_tokens": 10}}
    try:
        spent = Ctx(None, Budget(max_tool_calls=2)); spent.calls = 2
        cfg = {"base_url": "x", "model": "m", "extra_body": {}, "sampling": {}}
        eq("loop: spent call budget ends the run at the next text reply",
           (agent_mod.run_llm({"agent_class": "LlmAgent", "instruction": "i"}, spent, cfg, [], "go", {}, True, {})[0], len(sent)),
           ("tool_calls", 1))
    finally:
        agent_mod.chat = real_chat
    eq("budget defaults follow the submission", (Budget().max_time_minutes, Budget().max_tool_calls), (ev["max_time_minutes"], ev["max_tool_calls"]))


def colab_checks(tmp: Path):
    """colab_eval's pure-Python parts: the Kaggle-time model, the task queue, adapters, training data, bundle variants."""
    import gzip

    from colab_eval import compare, taskqueue, timing, variants
    from colab_eval.lora import adapter, build_sft

    tmp.mkdir(parents=True, exist_ok=True)

    # era pins: keyed by a snapshot HEAD, every entry pins at least one package to an exact version
    pins = json.loads((ROOT / 'colab_eval' / 'era_pins.json').read_text())
    check("era_pins: well-formed", all(len(k) == 40 and e['pins'] and all(re.fullmatch(r'\d+(\.\d+)+', v) for v in e['pins'].values())
                                    for k, e in pins.items()))

    # compare: only tasks every run has and gold resolves; wins/losses against the base; exact sign test
    rows = compare.compare({"A": {"a": True, "b": False, "c": True, "g": False}, "B": {"a": True, "b": True, "c": False, "g": True}},
                           {"a", "b", "c"}, "A")
    eq("compare: paired rows", [(r["resolved"], r["wins"], r["losses"]) for r in rows], [(2, 0, 0), (2, 1, 1)])
    eq("compare: sign test", (compare.sign_p(1, 1), round(compare.sign_p(0, 6), 4), round(compare.sign_p(9, 2), 4)), (1.0, 0.0312, 0.0654))

    # timing: one call re-priced on a single stream with prefix caching
    eq("timing: call cost", round(timing.call_cost(1000, 1600, 200, 20, 1500), 2), round(600 / 1500 + 200 / 20, 2))
    eq("timing: compaction makes the whole prompt new", round(timing.call_cost(9000, 4000, 0, 20, 1500), 2), round(4000 / 1500, 2))
    t = timing.Task("x", resolved=True, calls=[(0.0, 1.0, 1000, 200), (5.0, 1.0, 1500, 200)],
                    events=[(1.5, "tool"), (6.5, "edit"), (6.6, "free")])
    at, end = t.clock(20, 1500)
    eq("timing: clock at the end = LLM time x m + real tool time",
       round(at(end, 1.0), 2), round(timing.call_cost(0, 1000, 200, 20, 1500) + timing.call_cost(1000, 1500, 200, 20, 1500) + 4.0, 2))
    eq("timing: a solve counts within a cap when its last edit is inside it",
       (timing.solves_within([t], (20, 1500), 1.0, 30), timing.solves_within([t], (20, 1500), 1.0, 20)), (1, 0))
    # the v8 official-scorer run, if this checkout (or the main one, for a worktree) has it; results/ is gitignored
    v8 = next((d for d in (ROOT / "results" / "colab", ROOT.parents[2] / "results" / "colab") if (d / "v8" / "llm_calls.jsonl").exists()), None)
    if v8:
        tasks = timing.load_run(v8 / "v8", v8 / "gold")
        band = timing.calibrated_region(tasks, (20, 1500), timing.frange(0.5, 0.9, 0.01), [30, 60, 90])
        hours = [timing.project_hours(tasks, (20, 1500), m, ov, 420, 35) for m, ov in band]
        check("timing: v8's 7 min / 35 calls overruns 12 h wherever our Kaggle outcomes allow", band and min(hours) > 12.0, hours)

    # task queue: priority first, longest expected first, atomic claims, requeue after a crash
    q = tmp / "queue"
    (tmp / "prior").mkdir()
    (tmp / "prior" / "agent_phase.jsonl").write_text('{"task": "b", "agent_seconds": 900}\n{"task": "a", "agent_seconds": 100}\n')
    arms = [{"name": "A", "bundle": "submission", "data": "d", "results": str(tmp / "rA"), "sandbox_site": "s", "ids": ["a", "b"]},
            {"name": "G", "bundle": "submission", "data": "d", "results": str(tmp / "rG"), "sandbox_site": "s", "ids": ["c"], "priority": 1}]
    eq("queue: build counts", taskqueue.build(q, arms, [tmp / "prior"]), {"A": 2, "G": 1})
    first = taskqueue.claim(q, "w1")
    eq("queue: longest expected task of the first priority comes first", json.loads(first.read_text())["task"], "b")
    second = taskqueue.claim(q, "w2")
    taskqueue.finish(q, first)
    eq("queue: requeue puts a crashed worker's item back", taskqueue.requeue(q), 1)
    eq("queue: rebuild skips done items", taskqueue.build(q, arms, []), {"A": 0, "G": 0})
    order = [json.loads(taskqueue.claim(q, "w3").read_text())["task"] for _ in range(2)]
    eq("queue: then the rest, priority order", order, ["a", "c"])
    check("queue: empty at the end", taskqueue.claim(q, "w3") is None)
    eq("queue: status", taskqueue.status(q)["A"]["done"], 1)

    # adapters: a zero adapter loads; vision-tower tensors or wrong shapes do not
    shapes = {"model.language_model.layers.0.self_attn.q_proj": (32, 16), "model.language_model.layers.0.mlp.down_proj": (16, 48)}
    adapter.write_null(tmp / "null", rank=4, shapes=shapes)
    eq("adapter: zero adapter passes the vLLM rules", adapter.check(tmp / "null", shapes), [])
    errs = adapter.check(tmp / "null", {"model.language_model.layers.0.self_attn.q_proj": (32, 8),
                                       "model.language_model.layers.0.mlp.down_proj": (16, 48)})
    check("adapter: a shape mismatch is reported", any("shape" in e for e in errs), errs)
    check("adapter: bundled 31B shapes", len(adapter.load_shapes()) == 410)

    # build_sft: prompts that grow form one segment; a compaction starts another; spans end at stop tokens
    run = tmp / "gen"
    (run / "requests").mkdir(parents=True)
    tools = [{"type": "function", "function": {"name": "run_command"}}]

    def row(task, start, p, c, names, kind="agent"):
        msg = {"role": "assistant", "tool_calls": [{"function": {"name": n, "arguments": "{}"}} for n in names]}
        return {"task": task, "start": start, "kind": kind, "request": {"messages": [], "tools": tools if kind == "agent" else None},
                "response": {"prompt_token_ids": p, "usage": {"completion_tokens": len(c)},
                             "choices": [{"finish_reason": "stop", "token_ids": c, "message": msg}]}}
    p1, c1 = [2, 10, 11], [100, 5, 101, 48, 7, 49, 50]
    p2 = p1 + c1 + [60, 61, 62, 100]
    c2 = [6, 101, 48, 8, 49, 50]
    p3 = [2, 10, 70, 71]  # compaction: the history was replaced by a summary
    c3 = [9, 101, 48, 3, 49, 50]
    rows = [row("t1", 1, p1, c1, ["run_command"]), row("t1", 2, [2, 99], [5, 106], [], "summary"),
            row("t1", 3, p2, c2, ["edit_file"]), row("t1", 4, p3, c3, ["submit_patch"]),
            row("t2", 1, p1, c1, ["run_command"])]
    with gzip.open(run / "requests" / "w.jsonl.gz", "wt") as f:
        f.write("".join(json.dumps(r) + "\n" for r in rows))
    (run / "task_results.jsonl").write_text('{"instance_id": "t1", "resolved": true}\n{"instance_id": "t2", "resolved": false}\n')
    build_sft.main(["--runs", str(run), "--out", str(tmp / "sft")])
    seqs = [json.loads(l) for l in (tmp / "sft" / "sft.jsonl").read_text().splitlines()]
    eq("sft: one task, two segments (compaction)", [(s["task"], s["calls"]) for s in seqs], [("t1", 2), ("t1", 1)])
    eq("sft: spans are the sampled replies through their stop token", seqs[0]["label_spans"],
       [[len(p1), len(p1) + len(c1)], [len(p2), len(p2) + len(c2)]])
    eq("sft: replies match the history token for token", (seqs[0]["exact"], seqs[0]["input_ids"]), (2, p2 + c2))
    eq("sft: thinking length up to <channel|>", (build_sft.thinking_tokens([100, 1, 2, 3, 101, 48]),
                                                 build_sft.thinking_tokens([7, 8, 101, 48]), build_sft.thinking_tokens([48, 49])), (3, 2, 0))
    build_sft.main(["--runs", str(run), "--out", str(tmp / "sft1"), "--max-thinking-tokens", "1"])
    eq("sft: --max-thinking-tokens drops runs that thought that long", json.loads((tmp / "sft1" / "manifest.json").read_text())["tasks"], 0)

    # hinted attempts (arm H): the hint's tokens are cut back to the unhinted prompt; a reply that mentions it drops the attempt
    hrun = tmp / "H"
    (hrun / "requests").mkdir(parents=True)

    def hrow(task, start, p, c, names, reasoning=""):
        r = row(task, start, p, c, names)
        r["request"]["messages"] = [{"role": "user", "content": "Problem Statement:\nx\n\n## Hints:\nThe fix belongs in `a.py`.\n"}]
        r["response"]["choices"][0]["message"]["reasoning_content"] = reasoning
        return r
    hp1 = [2, 10, 90, 91, 92, 11]  # p1 with the hint's tokens inserted
    hp2 = hp1 + c1 + [60, 61, 100]
    hrows = [hrow("t2", 1, hp1, c1, ["run_command"], "Open a.py first; type hints are fine."),
             hrow("t2", 2, hp2, c2, ["submit_patch"]),
             hrow("t5", 1, hp1, c1, ["submit_patch"], "The hint says a.py.")]
    with gzip.open(hrun / "requests" / "w.jsonl.gz", "wt") as f:
        f.write("".join(json.dumps(r) + "\n" for r in hrows))
    with open(hrun / "requests" / "w.jsonl.gz", "ab") as f:
        f.write(gzip.compress(b'{"task": "t9"}\n')[:15])  # a call still being written when the log is read
    (hrun / "task_results.jsonl").write_text('{"instance_id": "t2", "resolved": true}\n{"instance_id": "t5", "resolved": true}\n')
    eq("sft: hint span = the tokens on top of the unhinted prompt", build_sft.hint_span(hp1, p1), (2, 5, []))
    eq("sft: a merged boundary token comes back", build_sft.hint_span([2, 10, 33, 90, 91, 34, 11], [2, 10, 35, 11]), (2, 6, [35]))
    eq("sft: no span when the prompts differ elsewhere", build_sft.hint_span([2, 10, 90, 91, 11, 20, 21, 99], p1 + [20, 21, 22]), None)
    build_sft.main(["--runs", str(run), str(hrun), "--out", str(tmp / "sft2")])
    seqs = [json.loads(l) for l in (tmp / "sft2" / "sft.jsonl").read_text().splitlines()]
    t2 = [s for s in seqs if s["task"] == "t2"]
    eq("sft: hinted attempt kept with the hint cut out", [(s["hinted"], s["input_ids"]) for s in t2],
       [(True, p1 + c1 + [60, 61, 100] + c2)])
    eq("sft: spans shift with the cut", t2[0]["label_spans"], [[len(p1), len(p1) + len(c1)], [len(p1) + len(c1) + 3, len(t2[0]["input_ids"])]])
    m = json.loads((tmp / "sft2" / "manifest.json").read_text())
    eq("sft: a reply that mentions the hint drops the attempt; t1 stays unhinted",
       (m["attempts"].get("hinted: a reply mentions the hint"), m["hinted_tasks"], m["tasks"]), (1, 1, 2))

    # external: path hints from the reference patch (no tests), triage of the unhinted arm into done / retry / hint
    from colab_eval import external
    gold = ("diff --git a/src/pkg/core.py b/src/pkg/core.py\n--- a/src/pkg/core.py\n+++ b/src/pkg/core.py\n@@ -1 +1,2 @@\n-a\n+b\n+c\n"
            "diff --git a/CHANGELOG.md b/CHANGELOG.md\n+x\n"
            "diff --git a/tests/test_core.py b/tests/test_core.py\n+t\n"
            "diff --git a/src/pkg/util.py b/src/pkg/util.py\n+d\n")
    eq("hints: changed sources, most-changed first, no tests or docs", external.hint_paths(gold), ["src/pkg/core.py", "src/pkg/util.py"])
    eq("hints: docs only when no source changed", external.hint_paths("diff --git a/docs/x.rst b/docs/x.rst\n+a\n"), ["docs/x.rst"])
    with open(run / "task_results.jsonl", "a") as f:
        f.write('{"instance_id": "t4", "resolved": false, "error": "Unexpected evaluation worker error: boom"}\n')
    eq("triage: usable -> done, unresolved -> hint, harness error -> retry", external.triage(run, tmp / "R"),
       {"t1": "done", "t2": "hint", "t4": "retry"})
    ids = tmp / "H_ids.txt"
    eq("triage: ids are appended once", (external.append_ids(ids, ["t2"]), external.append_ids(ids, ["t2", "t4"])), (["t2"], ["t4"]))

    # variants: settings change in the included files; an adapter is copied and declared
    (tmp / "ad").mkdir()
    (tmp / "ad" / "adapter_config.json").write_text("{}")
    (tmp / "ad" / "adapter_model.safetensors").write_bytes(b"x")
    out = variants.make(ROOT / "submission", tmp / "var", thinking_budget=1024, max_time_minutes=4.25, adapter=f"main_lora={tmp / 'ad'}")
    vsub = load_submission(out)
    eq("variants: thinking budget, cap and adapter",
       (vsub["root"]["generate_content_config"]["thinking_config"]["thinking_budget"], vsub["eval"]["max_time_minutes"],
        vsub["root"].get("adapter"), (out / "adapters" / "main_lora" / "adapter_model.safetensors").exists()),
       (1024, 4.25, "main_lora", True))
    eq("variants: prompt unchanged", vsub["root"]["instruction"], load_submission(ROOT / "submission")["root"]["instruction"])

    # analyze: what went wrong in each model call, from the raw request log (--log-requests), and the health report
    from colab_eval import analyze
    schema = [{"type": "function", "function": {"name": "edit_file", "parameters": {"type": "object", "required": ["filepath", "old_string", "new_string"],
               "properties": {"filepath": {}, "old_string": {}, "new_string": {}, "allow_multiple": {}}}}},
              {"type": "function", "function": {"name": "submit_patch", "parameters": {"type": "object", "properties": {}, "required": []}}}]
    req = {"model": "m", "tools": schema, "chat_template_kwargs": {"enable_thinking": True}, "thinking_token_budget": 2048}

    def resp(content=None, reasoning=None, calls=(), finish="tool_calls", ids=None):
        msg = {"role": "assistant", "content": content, "reasoning": reasoning,
               "tool_calls": [{"function": {"name": n, "arguments": json.dumps(a)}} for n, a in calls]}
        return {"choices": [{"finish_reason": finish, "message": msg, **({"token_ids": ids} if ids else {})}]}

    edit = ("edit_file", {"filepath": "a.py", "old_string": "x", "new_string": "y"})
    split = ("edit_file", {"filepath": "a.py", "async def f(\n    body_fields": "list"})  # the gemma4 parser lost a <|"|>
    f = analyze.call_flags(req, resp(reasoning="plan", calls=[edit]))
    check("flags: a clean call has no flags", not any(f[k] for k in analyze.FLAGS), f)
    f = analyze.call_flags(req, resp(reasoning="plan", calls=[split]))
    check("flags: a split edit_file is malformed (missing old_string, stray key)", len(f["bad_args"]) == 1 and "old_string" in f["bad_args"][0]
          and "async def f(" in f["bad_args"][0], f)
    check("flags: empty reasoning with thinking on is blank thinking", analyze.call_flags(req, resp(reasoning="", calls=[edit]))["blank_thinking"])
    check("flags: no blank thinking when thinking is off",
          not analyze.call_flags({**req, "chat_template_kwargs": {"enable_thinking": False}}, resp(calls=[edit]))["blank_thinking"])
    f = analyze.call_flags(req, resp(reasoning="", calls=[edit], ids=[5, 6, 101, 48, 49]))
    check("flags: thinking tokens the parser did not return are lost, not blank", f["reasoning_lost"] and not f["blank_thinking"]
          and f["thinking_tokens"] == 2, f)
    f = analyze.call_flags(req, resp(content='<|tool_call>call:edit_file{filepath:<|"|>a.py<|"|>}<tool_call|>', reasoning="r", finish="stop"))
    check("flags: tool-call markup left in content is a text-only reply", f["markup_in_content"] and f["text_only"], f)
    f = analyze.call_flags(req, resp(content="", reasoning="next: call:edit_file{filepath:a.py}", finish="stop"))
    check("flags: a call written inside the thinking", f["call_in_thinking"] and f["text_only"], f)
    f = analyze.call_flags(req, resp(content="<channel|>ok", reasoning="r", calls=[edit]))
    check("flags: thinking markup in content", f["thought_in_content"], f)
    f = analyze.call_flags(req, resp(reasoning="r", calls=[("load_skill", {"name": "swe"})], finish="length"))
    check("flags: unknown tool and output cut at max_tokens", f["unknown_tool"] == ["load_skill"] and f["truncated"], f)
    eq("outcome: a test_patch failure is the harness's", analyze.outcome({"error": "Failed to apply test_patch: x", "agent_patch_size": 9}, False), "HARNESS_ERROR")
    eq("outcome: a rejected agent patch is the agent's", analyze.outcome({"error": "Failed to apply agent patch: x", "agent_patch_size": 9}, False), "PATCH_REJECTED")

    hr = tmp / "health"
    for d in ("requests", "traces", "worker_logs"):
        (hr / d).mkdir(parents=True)

    def logged(task, start, response):
        return {"task": task, "start": start, "kind": "agent", "request": req, "response": response}
    rows = [logged("t1", 1, resp(reasoning="r", calls=[split])), logged("t1", 2, resp(reasoning="r", calls=[split])),
            logged("t1", 3, resp(content="I think it is done.", reasoning="r", finish="stop")),  # before any submit: costs a nudge
            logged("t1", 4, resp(reasoning="r", calls=[("submit_patch", {})])),
            logged("t1", 5, resp(content="Fixed the alias.", reasoning="r", finish="stop")),  # after the submit: the normal end
            logged("t2", 1, resp(reasoning="", calls=[("submit_patch", {})]))]
    with gzip.open(hr / "requests" / "w.jsonl.gz", "wt") as fh:
        fh.write("".join(json.dumps(r) + "\n" for r in rows))
    (hr / "task_results.jsonl").write_text(
        json.dumps({"instance_id": "t1", "repo": "r", "resolved": False, "agent_patch_size": 10, "error": None}) + "\n"
        + json.dumps({"instance_id": "t2", "repo": "r", "resolved": False, "agent_patch_size": 9, "error": "Failed to apply test_patch: boom"}) + "\n")
    (hr / "ids.txt").write_text("t1\nt2\nt3\n")
    (hr / "run_meta.json").write_text(json.dumps({"bundle": "submission", "budget": {"max_time_minutes": 8.0}}))
    # stdout is block-buffered into the log, so its lines can land after the traceback
    (hr / "worker_logs" / "run_0.log").write_text("Traceback (most recent call last):\n  File x\nValueError: bad\nrequest log: http://x\n")
    missing = "Invoking `edit_file()` failed as the following mandatory input parameters are not present:\nold_string"
    (hr / "traces" / "trace_t1.json").write_text(json.dumps({"steps": [
        {"source": "agent", "metrics": {"prompt_tokens": 9, "completion_tokens": 3}, "tool_calls": [{"function_name": "edit_file", "arguments": {}}],
         "observation": {"content": json.dumps({"error": missing})}},
        {"source": "agent", "metrics": {"prompt_tokens": 9, "completion_tokens": 3}, "tool_calls": [{"function_name": "edit_file", "arguments": {}}],
         "observation": {"content": json.dumps({"status": "error", "error_type": "FileEditError", "error_message": "no match"})}},
        {"source": "system", "message": "Please continue your work.", "extra": {"event_type": "continuation_nudge"}}]}))
    analyze.main([str(hr)])
    h = json.loads((hr / "analysis" / "health.json").read_text())
    eq("health: malformed calls counted per call, by task", (h["flags"]["bad_args"]["calls"], h["flags"]["bad_args"]["tasks"]), (2, ["t1"]))
    eq("health: text-only replies count only before the submit", h["flags"]["text_only_before_submit"]["calls"], 1)
    eq("health: blank thinking by task", h["flags"]["blank_thinking"]["tasks"], ["t2"])
    eq("health: the same broken call repeated", h["repeated_calls"], {"t1": 1})
    eq("health: tool errors from the traces", {k: v["count"] for k, v in h["tool_errors"].items()}, {"MissingParameters": 1, "FileEditError": 1})
    eq("health: nudges", h["nudges"], {"t1": 1})
    errs = " | ".join(h["harness_errors"])
    check("health: harness errors name the test_patch failure, the worker's exception and the task with no result",
          "t2" in errs and "ValueError: bad" in errs and "request log" not in errs and "t3" in errs, errs)
    out = {r["task"]: r for r in json.loads((hr / "analysis" / "tasks.json").read_text())}
    eq("analyze: harness error outcome and per-task health columns", (out["t2"]["outcome"], out["t1"]["bad_args"]), ("HARNESS_ERROR", 2))
    md = (hr / "analysis" / "health.md").read_text()
    check("health.md: summary table and an example of each flag", "| malformed tool arguments |" in md and "### bad_args" in md, md[:600])
    check("report: links the health summary", "## Health" in (hr / "analysis" / "report.md").read_text())

    # edits through run_command (v12, v13) count as edits; scratch files in /tmp and reads do not
    check("analyze: the shell-edit recipe, sed -i, cat > path and open(path, 'w') are edits",
          all(analyze.is_edit("run_command", {"command": c}) for c in (
              fake_llm.SHELL_EDIT, "sed -i 's/a/b/' pkg/x.py", "cd /workspace && cat > pkg/new.py <<'EOF'\nx = 1\nEOF",
              "python3 -c 'open(\"rich/console.py\", \"w\").write(s)'")))
    check("analyze: repro scripts in /tmp, searches and tests are not edits", not any(analyze.is_edit("run_command", {"command": c}) for c in (
        "cd /workspace && cat > /tmp/repro.py <<'EOF'\nprint(1)\nEOF", "grep -rn 'x' src | head", "timeout 150 python -m pytest tests -x -q",
        "python3 -c 'open(\"/tmp/out.txt\", \"w\")'")))
    tr = tmp / "tree_run"
    for d in ("traces",):
        (tr / d).mkdir(parents=True)

    def step(author, calls, ev="thinking", message="m"):
        return {"source": "agent", "message": message, "extra": {"event_type": ev, "author": author},
                "metrics": {"prompt_tokens": 9, "completion_tokens": 3},
                "tool_calls": [{"function_name": n, "arguments": a, "extra": {"author": author}} for n, a in calls],
                "observation": {"content": json.dumps({"status": "ok"})}}
    (tr / "traces" / "trace_t1.json").write_text(json.dumps({"steps": [
        step("scout", [("run_command", {"command": "grep -rn x src | head"})]), step("scout", [("read_file", {"filepath": "a.py"})]),
        step("scout", [], ev="final", message="CONTRACT: x\nCURRENT CODE: a.py\n    x = 1"),
        step("editor", [("run_command", {"command": fake_llm.SHELL_EDIT})]), step("editor", [("submit_patch", {})]),
        step("editor", [], ev="final", message="Done.")]}))
    (tr / "traces" / "trace_t2.json").write_text(json.dumps({"steps": [  # a runaway scout: the editor never edits
        *[step("scout", [("run_command", {"command": f"grep -rn x{i} src"})]) for i in range(16)],
        step("editor", [("read_file", {"filepath": "a.py"})])]}))
    (tr / "task_results.jsonl").write_text("".join(json.dumps({"instance_id": t, "repo": "r", "resolved": False, "agent_patch_size": 5,
                                                              "error": None}) + "\n" for t in ("t1", "t2")))
    analyze.main([str(tr)])
    out = {r["task"]: r for r in json.loads((tr / "analysis" / "tasks.json").read_text())}
    eq("analyze: calls, first edit and report per agent", out["t1"]["agents"],
       {"scout": {"calls": 2, "first_edit": None, "reply_chars": len("CONTRACT: x\nCURRENT CODE: a.py\n    x = 1")},
        "editor": {"calls": 1, "first_edit": 1, "reply_chars": len("Done.")}})
    eq("analyze: a shell edit sets the task's first edit", (out["t1"]["first_edit_call"], out["t2"]["first_edit_call"]), (3, None))
    rep = (tr / "analysis" / "report.md").read_text()
    check("report: hand-off checks name the runaway scout and the editor that never edited",
          "## Agents" in rep and "| scout over 14 calls | 1 | t2 |" in rep and "| editor never edited | 1 | t2 |" in rep
          and "| scout gave no text reply (no report) | 1 | t2 |" in rep, rep[rep.find("## Agents"):][:900])

    # sample: the check run's tasks, stratified like the public set, evenly spaced, the same every time
    import collections
    from colab_eval import sample
    pool = [f"fastapi_{i}" for i in range(100, 120)] + [f"rich_{i}" for i in range(10)] + [f"requests_{i}" for i in range(3)] + ["httpx_1"]
    got = sample.pick(pool, 10)
    eq("sample: the public mix, 5 fastapi / 4 rich / 1 requests", collections.Counter(map(sample.repo_of, got)), {"fastapi": 5, "rich": 4, "requests": 1})
    eq("sample: the same pool in any order gives the same tasks", got, sample.pick(list(reversed(pool)), 10))
    eq("sample: evenly spaced within a repo, in PR order", [t for t in got if t.startswith("rich")], ["rich_1", "rich_3", "rich_6", "rich_8"])
    eq("sample: a repo short of tasks hands its share on", collections.Counter(map(sample.repo_of, sample.pick(["rich_1"] + [f"fastapi_{i}" for i in range(5)], 4))),
       {"fastapi": 3, "rich": 1})
    (tmp / "ok.txt").write_text("rich_2\nfastapi_7\n")
    eq("sample: the first pool file that exists wins", sample.pool([tmp / "missing.txt", tmp / "ok.txt"]), ["rich_2", "fastapi_7"])

    # model_check: the server is unusable only for transport, parser or thinking failures; a malformed edit only warns
    from colab_eval import model_check
    clean = analyze.call_flags(req, resp(reasoning="r", calls=[edit]))
    eq("model_check: clean responses pass", model_check.verdict([("first", clean), ("edit", clean)], thinking=True)[:2], (True, []))
    ok, why, _ = model_check.verdict([("first", analyze.call_flags(req, resp(content='<|tool_call>call:edit_file{}<tool_call|>', reasoning="r",
                                                                               finish="stop")))], thinking=True)
    check("model_check: tool-call markup in the content fails", not ok and any("markup" in w for w in why), why)
    blank = analyze.call_flags(req, resp(reasoning="", calls=[edit]))
    check("model_check: no thinking in any response fails", not model_check.verdict([("first", blank)] * 2, thinking=True)[0])
    check("model_check: thinking off needs no thoughts", model_check.verdict([("first", blank)], thinking=False)[0])
    check("model_check: an HTTP error fails", not model_check.verdict([("first", clean), ("edit", "HTTP 500: boom")], thinking=True)[0])
    check("model_check: no tool call in any response fails", not model_check.verdict(
        [("first", analyze.call_flags(req, resp(content="Let me think.", reasoning="r", finish="stop")))], thinking=True)[0])
    ok, why, warn = model_check.verdict([("edit", analyze.call_flags(req, resp(reasoning="r", calls=[split]))), ("first", clean)], thinking=True)
    check("model_check: a malformed edit only warns", ok and any("malformed" in w for w in warn), (why, warn))


def sandbox_checks(data: Path):
    sb = Sandbox(data / "snapshots" / "toy_6592.tgz", ROOT / ".venv-sandbox", prefix="check")
    try:
        ctx = Ctx(sb, Budget())
        task = {"repo": "psf/requests", "problem_statement": "P", "hints_text": ""}
        p = build_prompt(task, ctx, {"run_command", "read_file"})
        check("prompt: official instruction block", "## Instructions:\n0. All source code is under `/workspace`." in p and "5. As your final action" in p)
        b = Budget()
        check("prompt: budget from the bundle", f"- Time allowance: {b.max_time_minutes} minutes\n- Tool calls allowance: {b.max_tool_calls} calls" in p, p[:400])
        check("prompt: read_file limits listed", "File view limit: 150 lines" in p)
        check("prompt: read_file limits dropped without the tool", "File view limit" not in build_prompt(task, ctx, {"run_command"}))
        check("prompt: workspace layout", "## Workspace Layout" in p and "status_codes.py" in p)
        eq("declared tools walk the tree", declared_tools(load_submission(ROOT / "bundles/parallel-investigate")["root"]),
           {"run_command", "edit_file", "get_status", "submit_patch", "get_code_neighbors"})
        ctx.edit_file("src/requests/status_codes.py", fake_llm.OLD, fake_llm.NEW)
        ctx.write_file("tests/test_new.py", "def test_x():\n    assert True\n")
        check("write_file: /tmp is outside the workspace, as in swegemma", "error" in ctx.write_file("/tmp/repro.py", "x").lower()
              and not (sb.ws / "tmp").exists())
        ctx.run_command("echo '# touched' >> tests/test_status.py; echo x > /tmp/scratch.txt")
        check("sandbox: host git config does not leak in", "diff --git a/src/" in sb.git("diff").stdout
              and "diff --git a/src/" in json.loads(ctx.run_command("git diff"))["stdout"])
        res = json.loads(ctx.submit_patch())
        eq("submit_patch: only the library file is in the patch", res["files_changed"], 1)
        check("submit_patch: test edits are stripped", "tests/" not in ctx.patch and "too_early" in ctx.patch, ctx.patch)
        check("submit_patch: /tmp files stay out", "scratch" not in ctx.patch)
        sb.git("checkout", "_swegemma_baseline", "--", "src")
        eq("fallback diff of test-only changes is empty", sb.extract_patch(), "")
    finally:
        sb.cleanup()


def skill_checks(data: Path):
    """locate.py and check.py through the harness's run_skill_script, on the toy repo with one test that already
    fails at the baseline, so check.py has to tell a NEW failure from a PRE-EXISTING one."""
    sb = Sandbox(data / "snapshots" / "toy_6592.tgz", ROOT / ".venv-sandbox", prefix="skill")
    try:
        t = sb.ws / "tests" / "test_status.py"
        t.write_text("import pytest\n" + t.read_text() + "\n\ndef test_broken_before():\n    assert False\n"
                     '\n\n@pytest.mark.parametrize("v", ["a b"])\ndef test_param_with_space(v):\n    assert False\n')
        (sb.ws / "tests" / "utils.py").write_text("import requests.status_codes\n")  # mentions the module, but is a helper, not a test file
        sb.git("add", "-A"); sb.git("commit", "-qm", "baseline with failing tests"); sb.git("tag", "-f", "_swegemma_baseline")
        ctx = Ctx(sb, Budget())
        ctx.skills = {"swe": ROOT / "bundles" / "v10" / "skills" / "swe"}

        def run(script, args):
            r = json.loads(ctx.call("run_skill_script", {"skill_name": "swe", "file_path": script, "args": args}, ["run_skill_script"]))
            return r.get("stdout") or r.get("error", "")

        out = run("locate.py", ["unordered", "no_such_name_xyz"])
        check("locate: finds the file, the module-level hit and the missing term",
              "src/requests/status_codes.py  [unordered]" in out and "at module level" in out and "not found in source: no_such_name_xyz" in out, out)
        out = run("locate.py", {"terms": "_Codes|setattr"})
        check("locate: dict args and enclosing class", "in _Codes (L7-8)" in out and "[_Codes, setattr]" in out, out)
        # Verify locate.py prioritizes def/class over top-of-file imports and prints 1-hop callees
        (sb.ws / "src" / "requests" / "helper_mod.py").write_text(
            "# mention target_fn in comment 1\n# mention target_fn in comment 2\n# mention target_fn in comment 3\n"
            "# mention target_fn in comment 4\n# mention target_fn in comment 5\n"
            "def inner_helper():\n    return 42\n\ndef target_fn():\n    return inner_helper()\n"
        )
        sb.git("add", "src/requests/helper_mod.py"); sb.git("commit", "-qm", "add helper_mod"); sb.git("tag", "-f", "_swegemma_baseline")
        out_loc = run("locate.py", ["target_fn"])
        check("locate: prioritizes def line over earlier comment lines and resolves 1-hop callee",
              "in target_fn (L9-10): def target_fn():" in out_loc and "calls: inner_helper (L6)" in out_loc, out_loc)
        check("locate: prints the top hit's code with line numbers",
              "code of the top hit," in out_loc and "    9 def target_fn():" in out_loc, out_loc)
        eq("skills: each script run is one tool call", ctx.calls, 3)
        out = run("check.py", [])
        check("check: clean tree", "changed: nothing" in out and "no test file covers" in out, out)
        sc = sb.ws / "src" / "requests" / "status_codes.py"
        sc.write_text(sc.read_text().replace('200: ("ok", "okay")', '200: ("okay",)'))
        (sb.ws / "repro.py").write_text("print(1)\n")
        out = run("check.py", [])
        check("check: maps status_codes.py to tests/test_status.py and runs the whole file",
              "changed: src/requests/status_codes.py" in out and "ran whole files: tests/test_status.py\n" in out and "3 failed" in out, out)
        check("check: NEW vs PRE-EXISTING, ids with spaces included", "NEW (passed before your change, fix it): tests/test_status.py::test_ok" in out
              and "PRE-EXISTING (fails without your change too, ignore): tests/test_status.py::test_broken_before" in out
              and "PRE-EXISTING (fails without your change too, ignore): tests/test_status.py::test_param_with_space[a b]" in out, out)
        check("check: lists the untracked scratch file", "untracked, will be IN your patch: repro.py" in out, out)
        (sb.tmp / "repro.py").write_text("assert 1 + 1 == 2\nprint('repro_ok')\n")
        out_clean = run("check.py", ["--clean"])
        check("check: --clean removes root scratch repro.py and runs /tmp/repro.py",
              "removed untracked scratch: repro.py" in out_clean and "repro (/tmp/repro.py): PASS" in out_clean
              and not (sb.ws / "repro.py").exists(), out_clean)
        (sb.ws / "repro.py").write_text("print(1)\n")
        sc.write_text("def broken(:\n")
        out = run("check.py", ["tests/test_status.py"])
        check("check: reports a syntax error", "compile: src/requests/status_codes.py:1:" in out, out)
        check("check: never touched the working tree without --clean", sc.read_text() == "def broken(:\n" and (sb.ws / "repro.py").exists())
    finally:
        sb.cleanup()


def llm_agents(node: dict) -> list[dict]:
    return ([node] if node.get("model") else []) + [a for c in node.get("sub_agents") or [] for a in llm_agents(c)]


def run_recipe(tmp: Path, name: str, text: str) -> str:
    """Runs the edit recipe exactly as the prompt prints it (the indented block from the python3 heredoc to EOF) on a
    file with the example's old text, from a directory standing in for /workspace."""
    lines = text.splitlines()
    start = next(i for i, l in enumerate(lines) if "python3 - <<'EOF'" in l)
    end = next(i for i in range(start + 1, len(lines)) if lines[i].strip() == "EOF")
    script = textwrap.dedent("\n".join(lines[start + 1:end])) + "\n"
    ws = tmp / f"recipe_{name}"
    (ws / "pkg").mkdir(parents=True)
    (ws / "pkg" / "module.py").write_text("def f(value):\n    return value\n")
    out = subprocess.run([sys.executable, "-"], input=script, cwd=ws, capture_output=True, text=True)
    return out.stdout + out.stderr + (ws / "pkg" / "module.py").read_text()


def candidate_checks(tmp: Path):
    # v12 (one agent) and v13 (scout -> editor) edit through run_command: in the v11-v11.3 G4 checks 19 of 143 edit_file
    # calls arrived malformed and 0 of 518 run_command calls did. Same budget and sampling as v11, thinking on.
    for b in ("bundles/v12", "bundles/v13"):
        c = Checker(ROOT / b)
        check(f"checker: {b} passes with no warnings", c.run() and not c.warnings, c.errors + c.warnings)
        s = load_submission(ROOT / b)
        eq(f"{b}: budget fields", {k: s["eval"][k] for k in ("max_tool_calls", "max_time_minutes", "max_turns", "timeout_seconds")},
           {"max_tool_calls": 28, "max_time_minutes": 8.0, "max_turns": 80, "timeout_seconds": 240})
        for a in llm_agents(s["root"]):
            n, text = f"{b} {a['name']}", a["instruction"]
            g = effective_sampling(a.get("generate_content_config") or s["sampling"])
            check(f"{n}: no edit_file or write_file", not {"edit_file", "write_file"} & set(a["tools"]), a["tools"])
            check(f"{n}: thinking on at 2048, thoughts kept, room for the call",
                  g["thinking_config"] == {"thinking_budget": 2048, "include_thoughts": True} and g["max_output_tokens"] == 4096
                  and (g["temperature"], g["top_p"], g["top_k"]) == (0.4, 0.95, 40), g)
            check(f"{n}: braces only in state placeholders", not re.sub(r"\{[A-Za-z_]\w*\??\}", "", text).count("{")
                  and not re.sub(r"\{[A-Za-z_]\w*\??\}", "", text).count("}"))
            check(f"{n}: states the budget and forbids git reverts", "28 tool calls and 8 minutes" in text
                  and "a call past the 28th is refused" in text.lower()
                  and "Never run git checkout, git stash, git reset or git restore" in text)
            if "submit_patch" in a["tools"]:
                out = run_recipe(tmp, a["name"], text)
                check(f"{n}: the edit recipe as printed edits once and says so", "pkg/module.py matches: 1" in out
                      and "return value.strip()" in out, out)
                check(f"{n}: verifies with the whole test file and cleans up before submit",
                      "-x -q" in text and "git status --short" in text and "budget_warning" in text)
    v12 = load_submission(ROOT / "bundles" / "v12")["root"]
    eq("bundles/v12: one agent, three tools", v12["tools"], ["run_command", "read_file", "submit_patch"])
    check("bundles/v12: reads the existing test before the repro, edits by call 10",
          "grep -rn 'function_name' tests/" in v12["instruction"] and "Edit by call 10" in v12["instruction"])
    v13 = load_submission(ROOT / "bundles" / "v13")["root"]
    scout, editor = llm_agents(v13)
    eq("bundles/v13: SequentialAgent of scout then editor", (v13.get("agent_class"), scout["name"], editor["name"]),
       ("SequentialAgent", "scout", "editor"))
    check("bundles/v13: the scout only reads and reports into state",
          scout["tools"] == ["run_command", "read_file"] and scout.get("output_key") == "scout_report"
          and "{scout_report?}" in scout["instruction"] and "CURRENT CODE:" in scout["instruction"]
          and "grep -rn 'function_name' tests/" in scout["instruction"], scout["tools"])
    check("bundles/v13: the editor starts fresh from the issue and the report",
          editor.get("include_contents") == "none" and "submit_patch" in editor["tools"]
          and "{problem_description}" in editor["instruction"] and "{scout_report?}" in editor["instruction"])
    ed = render(editor["instruction"], {"problem_description": "ISSUE TEXT", "scout_report": "CURRENT CODE: x = {1: 2}"})
    check("bundles/v13: the editor's instruction carries the issue and the report, braces in it included",
          "ISSUE TEXT" in ed and "CURRENT CODE: x = {1: 2}" in ed)
    check("bundles/v13: the scout renders before any report exists", "{" not in render(scout["instruction"], {"problem_description": "P"}))
    # v11.4: v11 with the shell edit only as the fallback after a malformed edit_file, and the git revert ban
    c = Checker(ROOT / "bundles" / "v11.4")
    check("checker: bundles/v11.4 passes with no warnings", c.run() and not c.warnings, c.errors + c.warnings)
    v114 = load_submission(ROOT / "bundles" / "v11.4")
    a, text = v114["root"], v114["root"]["instruction"]
    eq("bundles/v11.4: v11's tools, edit_file first", a["tools"], ["run_command", "read_file", "edit_file", "write_file", "get_status", "submit_patch"])
    eq("bundles/v11.4: v11's budget", {k: v114["eval"][k] for k in ("max_tool_calls", "max_time_minutes", "max_turns", "timeout_seconds")},
       {"max_tool_calls": 28, "max_time_minutes": 8.0, "max_turns": 80, "timeout_seconds": 240})
    check("bundles/v11.4: v11's workflow kept, no braces", "{" not in text and "}" not in text and all(s in text for s in (
        "Contract, before your first tool call", "By call 12", "1 to 3 lines", "cat > /tmp/repro.py <<'EOF'", "budget_warning")))
    out = run_recipe(tmp, "v11_4", text)
    check("bundles/v11.4: after a malformed edit_file, the fallback recipe as printed edits once",
          "mandatory input parameters are not present" in text and "pkg/module.py matches: 1" in out and "return value.strip()" in out, out)
    check("bundles/v11.4: forbids git commands that throw away edits", "Never run git checkout, git stash, git reset or git restore" in text)


def run(data: Path, out: Path, *args: str) -> dict:
    p = subprocess.run([sys.executable, "-m", "harness.run", "--data", str(data), "--task-ids", "toy_6592", "--results-dir", str(out), *args],
                       cwd=ROOT, capture_output=True, text=True)
    if p.returncode:
        return {"error": p.stderr[-800:]}
    return json.loads((out / "task_results.jsonl").read_text().splitlines()[-1])


def seen() -> list:
    return json.load(urllib.request.urlopen("http://127.0.0.1:8765/requests"))


def end_to_end(data: Path, tmp: Path):
    r = run(data, tmp / "gold", "--agent", "gold")
    eq("toy: gold patch resolves", r.get("category"), "RESOLVED")
    r = run(data, tmp / "noop", "--agent", "noop")
    check("toy: empty patch does not resolve", r.get("resolved") is False and r.get("category") == "NO_PATCH", r)
    llm = ("--agent", "llm", "--base-url", "http://127.0.0.1:8765/v1", "--model", "fake")
    seen()
    r = run(data, tmp / "single", *llm)
    eq("toy: submission resolves with the fake model", (r.get("category"), r.get("end_reason")), ("RESOLVED", "submitted"))
    reqs = seen()
    check("request: thinking on with the budget from sampling.yaml",
          bool(reqs) and all(q.get("chat_template_kwargs") == {"enable_thinking": True} and q.get("thinking_token_budget") == 2048 for q in reqs), reqs[:1])
    check("request: sampling fields", bool(reqs) and all((q.get("temperature"), q.get("top_p"), q.get("top_k"), q.get("max_tokens")) == (0.4, 0.95, 40, 4096) for q in reqs), reqs[:1])
    check("request: earlier thoughts stay in the history", bool(reqs) and reqs[-1]["reasoning_in_history"] == len(reqs) - 1, reqs[-1:])
    trace = json.loads((tmp / "single" / "traces" / "toy_6592.json").read_text())
    check("trace: reasoning is recorded", all(t.get("reasoning") for t in trace if t["type"] == "assistant"))
    r = run(data, tmp / "override", *llm, "--extra-body", '{"chat_template_kwargs":{"enable_thinking":false}}')
    reqs = seen()
    check("request: --extra-body overrides the bundle", r.get("category") == "RESOLVED" and all(q["chat_template_kwargs"] == {"enable_thinking": False} for q in reqs), reqs[:1])
    r = run(data, tmp / "tree", *llm, "--submission", "bundles/parallel-investigate")
    eq("toy: parallel-investigate resolves with the fake model", (r.get("category"), r.get("end_reason")), ("RESOLVED", "submitted"))
    check("tree: all four agents ran", set(r.get("calls_by_agent", {})) == {"localizer", "reproducer", "test_scout", "fixer"}, r)
    reqs = seen()
    check("request: the tree sends thinking off and no budget",
          bool(reqs) and all(q["chat_template_kwargs"] == {"enable_thinking": False} and "thinking_token_budget" not in q and q["reasoning_in_history"] == 0 for q in reqs), reqs[:1])
    r = run(data, tmp / "v11_4", *llm, "--submission", "bundles/v11.4")
    eq("toy: v11.4 resolves with the fake model", (r.get("category"), r.get("end_reason")), ("RESOLVED", "submitted"))
    seen()
    r = run(data, tmp / "v12", *llm, "--submission", "bundles/v12")
    eq("toy: v12 resolves with the fake model, editing through run_command", (r.get("category"), r.get("end_reason")), ("RESOLVED", "submitted"))
    reqs = seen()
    check("request: v12 sends thinking on at 2048", bool(reqs) and all(q.get("thinking_token_budget") == 2048 for q in reqs), reqs[:1])
    r = run(data, tmp / "v13", *llm, "--submission", "bundles/v13")
    eq("toy: v13 resolves with the fake model", (r.get("category"), r.get("end_reason")), ("RESOLVED", "submitted"))
    check("tree: v13's scout reported in 2 calls, then the editor edited and submitted",
          r.get("calls_by_agent", {}).get("scout") == 2 and r.get("calls_by_agent", {}).get("editor", 0) >= 2, r.get("calls_by_agent"))
    reqs = seen()
    check("request: both v13 agents think at 2048, the editor without the scout's history",
          len(reqs) >= 5 and all(q.get("thinking_token_budget") == 2048 for q in reqs) and reqs[-1]["reasoning_in_history"] < len(reqs) - 1, reqs[-1:])
    models = json.load(urllib.request.urlopen("http://127.0.0.1:8765/v1/models"))
    raw = json.load(urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:8765/detokenize", data=json.dumps(
        {"model": "m", "tokens": [1, 2, 3]}).encode(), headers={"Content-Type": "application/json"})))
    check("fake server: answers vLLM's model list and /detokenize, as gpu_run.sh and analyze use them",
          models["data"][0]["id"] == "gemma-4-31b-it-qat-w4a16-ct" and "3 tokens" in raw.get("prompt", ""), (models, raw))
    from colab_eval import model_check
    rc = model_check.main(["--base-url", "http://127.0.0.1:8765/v1", "--n", "2", "--out", str(tmp / "probe.json")])
    probe = json.loads((tmp / "probe.json").read_text())
    check("model_check: passes against the fake server with the bundle's sampling", rc == 0 and probe["verdict"].startswith("OK")
          and all((q.get("thinking_token_budget"), q.get("top_k")) == (2048, 40) for q in seen()), probe.get("verdict"))


def main() -> int:
    with tempfile.TemporaryDirectory() as t:
        tmp = Path(t)
        units(tmp)
        colab_checks(tmp / "colab")
        data = tmp / "data-toy"
        subprocess.run([sys.executable, str(ROOT / "tests" / "make_toy_task.py"), str(data)], check=True, capture_output=True)
        sandbox_checks(data)
        skill_checks(data)
        srv = ThreadingHTTPServer(("127.0.0.1", 8765), fake_llm.H)
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        try:
            end_to_end(data, tmp)
        finally:
            srv.shutdown()
    print(f"\n{'ALL CHECKS PASSED' if not FAILED else f'{len(FAILED)} FAILED: ' + ', '.join(FAILED)}")
    return 1 if FAILED else 0


if __name__ == "__main__":
    sys.exit(main())
