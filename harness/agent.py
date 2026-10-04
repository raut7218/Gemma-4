"""Agent loop against any OpenAI-compatible /v1/chat/completions endpoint (vLLM, OpenRouter, AI Studio...)."""
from __future__ import annotations

import json
import os
import time
import urllib.request

from .tools import SCHEMAS, Ctx

CTX_LIMIT = 32768
NUDGES = {
    "length": "Your previous response reached the token limit before a tool call was completed. Do NOT repeat your analysis in thought - keep reasoning under a few sentences and emit your next tool call immediately, or call submit_patch when you have completed and verified your changes.",
    "stop": "Please continue your work using the available tools, or call submit_patch when you have completed and verified your changes.",
}


def build_prompt(task: dict, ctx: Ctx) -> str:
    b = ctx.budget
    ws = ctx.sb.ws
    _, tree, _ = ctx.sb.run("find . -maxdepth 3 -not -path './.git*' -not -name '__pycache__' -not -name '*.pyc' | head -150")
    parts = [f"You are evaluating a software engineering task for repository {task['repo']}.\n\nProblem Statement:\n{task['problem_statement']}"]
    if task.get("hints_text", "").strip():
        parts.append(f"## Hints:\n{task['hints_text']}")
    parts.append(f"## Task Budget (Session terminates when any budget is exhausted)\n- Time allowance: {b.max_time_minutes} minutes\n- Tool calls allowance: {b.max_tool_calls} calls\n- Max loop iterations: {b.max_turns} turns")
    parts.append(f"## Execution Environment Rules\n- Single command timeout: {b.timeout_seconds} seconds (commands exceeding this fail without ending the session)\n- Command output limit: 5000 characters\n- File view limit: 150 lines per read_file call\n- File character limit: 10000 characters per read_file call\n- Environment is offline (no network/PyPI access). All repository and test dependencies are ALREADY pre-installed. Do NOT attempt to run pip install or download packages.")
    parts.append("## Instructions\n0. Work strictly under /workspace.\n1. Inspect existing conventions before editing.\n2. Implement the fix in library code, not tests.\n3. Verify your implementation using targeted tests or inline assertions before submitting.\n4. Call submit_patch when complete.\n5. Then reply with a short final text message.")
    parts.append(f"## Workspace Layout\n{tree.replace(str(ws), '/workspace')}")
    return "\n\n".join(parts)


def chat(base_url: str, model: str, messages: list, sampling: dict, extra_body: dict, timeout: float) -> dict:
    body = {"model": model, "messages": messages, "tools": SCHEMAS, "tool_choice": "auto", **extra_body}
    for k_src, k_dst in (("temperature", "temperature"), ("top_p", "top_p"), ("max_output_tokens", "max_tokens"),
                         ("presence_penalty", "presence_penalty"), ("frequency_penalty", "frequency_penalty"), ("seed", "seed")):
        if k_src in sampling:
            body[k_dst] = sampling[k_src]
    if "top_k" in sampling:
        body.setdefault("top_k", sampling["top_k"])
    req = urllib.request.Request(base_url.rstrip("/") + "/chat/completions", data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json",
                                          "Authorization": f"Bearer {os.environ.get('LLM_API_KEY', 'EMPTY')}"})
    last = None
    for attempt in range(5):  # mirrors ModelRetryPlugin: transient errors, exponential backoff
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            last = f"HTTP {e.code}: {e.read()[:300]!r}"
            if e.code not in (429, 500, 502, 503, 504):
                break
        except Exception as e:  # noqa: BLE001
            last = repr(e)
        time.sleep(2 * 2 ** attempt)
    raise RuntimeError(last)


def run_agent(task: dict, ctx: Ctx, system: str, cfg: dict, trace: list) -> str:
    """Returns the termination reason."""
    sysmsg = system.replace("{problem_description}", task["problem_statement"]).replace("{hints}", task.get("hints_text", ""))
    msgs = [{"role": "system", "content": sysmsg}, {"role": "user", "content": build_prompt(task, ctx)}]
    sampling, nudges, turns = cfg["sampling"], 0, 0
    while True:
        if ctx.remaining_s() <= 0:
            return "time"
        if turns >= ctx.budget.max_turns:
            return "turns"
        turns += 1
        try:
            resp = chat(cfg["base_url"], cfg["model"], msgs, sampling, cfg["extra_body"], timeout=max(30, ctx.remaining_s()))
        except Exception as e:  # noqa: BLE001
            trace.append({"type": "llm_error", "error": str(e)})
            return "llm_error"
        ch = resp["choices"][0]
        m, usage = ch["message"], resp.get("usage") or {}
        pt = usage.get("prompt_tokens") or sum(len(json.dumps(x)) for x in msgs) // 3
        trace.append({"type": "assistant", "t": round(time.time() - ctx.start, 1), "prompt_tokens": pt,
                      "completion_tokens": usage.get("completion_tokens"), "finish": ch.get("finish_reason"),
                      "content": m.get("content"), "tool_calls": m.get("tool_calls")})
        if pt >= CTX_LIMIT:
            return "context_overflow"
        msgs.append({k: v for k, v in m.items() if k in ("role", "content", "tool_calls") and v is not None})
        calls = m.get("tool_calls") or []
        for tc in calls:
            fn = tc["function"]
            try:
                args = json.loads(fn.get("arguments") or "{}")
            except json.JSONDecodeError:
                args = None
            res = ctx.call(fn["name"], args) if isinstance(args, dict) else json.dumps({"status": "error", "error_type": "InvalidArguments", "error_message": "arguments are not valid JSON"})
            trace.append({"type": "tool", "name": fn["name"], "args": args, "result": res[:2000]})
            msgs.append({"role": "tool", "tool_call_id": tc["id"], "content": res})
        if ctx.patch_submitted:
            return "submitted"
        if calls:
            nudges = 0
            continue
        nudges += 1
        if nudges > 3:
            return "no_tool_calls"
        msgs.append({"role": "user", "content": NUDGES["length" if ch.get("finish_reason") == "length" else "stop"]})
