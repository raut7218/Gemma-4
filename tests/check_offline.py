"""Offline regression check: unit checks of the harness rules, then the toy task end to end.

  uv run python tests/check_offline.py

Needs .venv-sandbox with pytest and nothing else: no Kaggle data, GPU or network. It starts tests/fake_llm.py
itself on :8765, so stop any copy that is already running.
"""
import json
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
    for b in ("submission", "bundles/parallel-investigate"):
        c = Checker(ROOT / b)
        check(f"checker: {b} passes with no warnings", c.run() and not c.warnings, c.errors + c.warnings)

    sub = load_submission(ROOT / "submission")
    g = effective_sampling(sub["root"]["generate_content_config"])
    tc = g["thinking_config"]
    check("submission: thinking on, thoughts kept", thinking_body(tc)["chat_template_kwargs"]["enable_thinking"] and tc["include_thoughts"] is True, tc)
    check("submission: output cap leaves room after thinking", g["max_output_tokens"] >= tc["thinking_budget"] + 2048, g)
    ev = sub["eval"]
    # 8 min x 120 tasks = 16 h if every task burned the clock, so the 12 h total rests on the call cap ending stuck runs
    check("submission: call cap is small enough to end stuck runs early", ev["max_tool_calls"] <= 30, ev)
    eq("submission: budget fields", {k: ev[k] for k in ("max_tool_calls", "max_turns", "timeout_seconds")},
       {"max_tool_calls": 28, "max_turns": 80, "timeout_seconds": 240})
    text = sub["root"]["instruction"]
    check("submission: no stray braces in the prompt", "{" not in text and "}" not in text)
    check("submission: prompt no longer caps reasoning or claims nothing is dropped",
          "few sentences per step" not in text and "nothing in it is dropped" not in text)
    check("submission: prompt plans an edit by call 12 and a cleanup before submit",
          "By call 12" in text and "git status --short | grep '^??'" in text and "docs_src/" in text and "28 tool calls" in text)
    check("submission: prompt has the contract step, a /tmp heredoc repro and tail on test output",
          "Contract, before your first tool call" in text and "cat > /tmp/repro.py <<'EOF'" in text and "-k KEYWORD 2>&1 | tail -20" in text)
    check("submission: prompt forbids git commands that discard edits and edits at the first budget_warning",
          "Never run git checkout, git stash, git reset or git restore" in text and "your next call is your best-guess edit_file" in text)
    # the malformed-edit fallback, run exactly as the prompt prints it (the indented block between the heredoc and EOF)
    lines = text.splitlines()
    start = next(i for i, l in enumerate(lines) if "python3 - <<'EOF'" in l)
    end = next(i for i in range(start + 1, len(lines)) if lines[i].strip() == "EOF")
    ws = tmp / "recipe"
    (ws / "pkg").mkdir(parents=True)
    (ws / "pkg" / "module.py").write_text("def f(value):\n    return value\n")
    out = subprocess.run([sys.executable, "-"], input=textwrap.dedent("\n".join(lines[start + 1:end])) + "\n",
                         cwd=ws, capture_output=True, text=True)
    eq("submission: edit recipe runs as printed", (out.stdout, (ws / "pkg" / "module.py").read_text()),
       ("pkg/module.py matches: 1\n", "def f(value):\n    return value.strip()\n"))
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
        data = tmp / "data-toy"
        subprocess.run([sys.executable, str(ROOT / "tests" / "make_toy_task.py"), str(data)], check=True, capture_output=True)
        sandbox_checks(data)
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
