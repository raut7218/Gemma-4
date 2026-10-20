"""Offline regression check: unit checks of the harness rules, then the toy task end to end.

  uv run python tests/check_offline.py

Needs .venv-sandbox with pytest and nothing else: no Kaggle data, GPU or network. It starts tests/fake_llm.py
itself on :8765, so stop any copy that is already running.
"""
import json
import subprocess
import sys
import tempfile
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
    for b in ("submission", "bundles/parallel-investigate"):
        c = Checker(ROOT / b)
        check(f"checker: {b} passes with no warnings", c.run() and not c.warnings, c.errors + c.warnings)

    sub = load_submission(ROOT / "submission")
    g = effective_sampling(sub["root"]["generate_content_config"])
    tc = g["thinking_config"]
    check("submission: thinking on, thoughts kept", thinking_body(tc)["chat_template_kwargs"]["enable_thinking"] and tc["include_thoughts"] is True, tc)
    check("submission: output cap leaves room after thinking", g["max_output_tokens"] >= tc["thinking_budget"] + 2048, g)
    ev = sub["eval"]
    # the 12 h job: colab_eval/timing.py puts v8's 7 min / 35 calls at 12.2-13.0 h on every point our Kaggle history
    # allows, and 4.5 min at 9.3-11.2 h (the probe value; the final cap comes from the probe's run time)
    eq("submission: the 31B", sub["root"]["model"], "gemma-4-31b-it-qat-w4a16-ct")
    check("submission: time cap fits the 12 h job", ev["max_time_minutes"] <= 5.0, ev)
    eq("submission: budget fields", {k: ev[k] for k in ("max_tool_calls", "max_time_minutes", "max_turns", "timeout_seconds")},
       {"max_tool_calls": 35, "max_time_minutes": 4.5, "max_turns": 80, "timeout_seconds": 240})
    text = sub["root"]["instruction"]
    check("submission: no stray braces in the prompt", "{" not in text and "}" not in text)
    check("submission: prompt no longer caps reasoning or claims nothing is dropped",
          "few sentences per step" not in text and "nothing in it is dropped" not in text)
    check("submission: prompt plans by time, an edit by call 8 and a cleanup before submit",
          "4 calls per minute" in text and "By call 8" in text and "--clean" in text and "docs_src/" in text
          and "35 tool calls" in text and "call 10 without an edit" in text and "diff you have at that moment is graded" in text)
    check("submission: prompt shows a literal skill call and the top-hit code",
          'args ["ResponseValidationError", "missing field"]' in text and "Never call locate.py without args" in text
          and "30 numbered lines of the top hit" in text and "Verify right after the first edit" in text)
    check("submission: prompt asks for short old_strings and the issue's exact names",
          "1 to 3 lines" in text and "single-line old_string" in text and "use exactly that name and signature" in text)
    check("submission: prompt has the contract step, a /tmp heredoc repro and the two scripts",
          "Contract, before your first tool call" in text and "cat > /tmp/repro.py <<'EOF'" in text
          and "call locate.py" in text and "call check.py" in text and "do not call load_skill" in text)
    check("submission: prompt covers title-only issues, rereads and unchanged repros",
          "do not guess function signatures or asserts from memory" in text and "Never read the same lines twice in a row" in text
          and "same result after an edit" in text and "at most one repro before your first edit" in text)
    eq("submission: the root agent declares the swe skill", [Path(p).name for p in sub["root"]["skills"]], ["swe"])
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

    from colab_eval import taskqueue, timing, variants
    from colab_eval.lora import adapter, build_sft

    tmp.mkdir(parents=True, exist_ok=True)

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
        ctx.skills = {"swe": ROOT / "submission" / "skills" / "swe"}

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
