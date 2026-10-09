"""Agent loop against any OpenAI-compatible /v1/chat/completions endpoint (vLLM, OpenRouter, AI Studio...).

A bundle is a tree of LlmAgent / SequentialAgent / ParallelAgent nodes (see bundle.py). A single LlmAgent
root runs the original swegemma loop with nudges. Trees follow ADK semantics as far as they matter here:
parallel branches run concurrently and don't see each other, output_key writes an agent's final text to
state, {key} / {key?} in instructions read it, and include_contents: none starts an agent's context at
the latest user message or other agent's reply ("For context: [name] said: ...").
"""
from __future__ import annotations

import json
import os
import re
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

from .tools import SCHEMAS, TOOL_NAMES, Ctx

CTX_LIMIT = 32768
NUDGES = {
    "length": "Your previous response reached the token limit before a tool call was completed. Do NOT repeat your analysis in thought - keep reasoning under a few sentences and emit your next tool call immediately, or call submit_patch when you have completed and verified your changes.",
    "stop": "Please continue your work using the available tools, or call submit_patch when you have completed and verified your changes.",
}
FATAL = {"context_overflow", "llm_error", "time", "turns", "submitted"}
_VAR = re.compile(r"\{([A-Za-z_]\w*)(\?)?\}")


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


def render(instruction: str, state: dict) -> str:
    """ADK state injection: {key} must exist (KeyError otherwise), {key?} renders empty when missing."""
    def sub(m):
        if m.group(1) in state:
            return str(state[m.group(1)])
        if m.group(2):
            return ""
        raise KeyError(f"instruction references missing state key {m.group(1)!r}")
    return _VAR.sub(sub, instruction)


def chat(base_url: str, model: str, messages: list, sampling: dict, extra_body: dict, timeout: float,
         tools: list | None = None) -> dict:
    body = {"model": model, "messages": messages, "tools": SCHEMAS if tools is None else tools, "tool_choice": "auto", **extra_body}
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


def run_llm(node: dict, ctx: Ctx, cfg: dict, trace: list, user: str, state: dict, is_root: bool,
            histories: dict) -> tuple[str, str]:
    """One LlmAgent invocation. Returns (reason, final_text); reason is 'done' when a sub-agent answers."""
    name = node.get("name", "agent")
    allowed = [t for t in node.get("tools") or sorted(TOOL_NAMES) if t in TOOL_NAMES]  # unimplemented tools are dropped
    schemas = [s for s in SCHEMAS if s["function"]["name"] in allowed]
    sampling = node.get("generate_content_config") or cfg["sampling"]
    sysmsg = {"role": "system", "content": render(node.get("instruction", ""), state)}
    if node.get("include_contents") == "none":
        msgs = [sysmsg, {"role": "user", "content": user}]
    else:
        msgs = histories.setdefault(name, [sysmsg])
        msgs[0] = sysmsg
        msgs.append({"role": "user", "content": user})
    nudges = 0
    while True:
        if ctx.patch_submitted:
            return "submitted", ""
        if ctx.aborted:
            return ctx.aborted, ""
        if ctx.remaining_s() <= 0:
            return "time", ""
        if not ctx.take_turn():
            return "turns", ""
        try:
            resp = chat(cfg["base_url"], cfg["model"], msgs, sampling, cfg["extra_body"],
                        timeout=max(30, ctx.remaining_s()), tools=schemas)
        except Exception as e:  # noqa: BLE001
            trace.append({"type": "llm_error", "agent": name, "error": str(e)})
            return "llm_error", ""
        ch = resp["choices"][0]
        m, usage = ch["message"], resp.get("usage") or {}
        pt = usage.get("prompt_tokens") or sum(len(json.dumps(x)) for x in msgs) // 3
        trace.append({"type": "assistant", "agent": name, "t": round(time.time() - ctx.start, 1), "prompt_tokens": pt,
                      "completion_tokens": usage.get("completion_tokens"), "finish": ch.get("finish_reason"),
                      "content": m.get("content"), "tool_calls": m.get("tool_calls")})
        if pt >= CTX_LIMIT:
            return "context_overflow", ""
        msgs.append({k: v for k, v in m.items() if k in ("role", "content", "tool_calls") and v is not None})
        calls = m.get("tool_calls") or []
        for tc in calls:
            fn = tc["function"]
            try:
                args = json.loads(fn.get("arguments") or "{}")
            except json.JSONDecodeError:
                args = None
            res = ctx.call(fn["name"], args, allowed) if isinstance(args, dict) else json.dumps({"status": "error", "error_type": "InvalidArguments", "error_message": "arguments are not valid JSON"})
            trace.append({"type": "tool", "agent": name, "name": fn["name"], "args": args, "result": res[:2000]})
            msgs.append({"role": "tool", "tool_call_id": tc["id"], "content": res})
        if ctx.patch_submitted:
            return "submitted", ""
        if calls:
            nudges = 0
            continue
        text = m.get("content") or ""
        if not is_root:  # in ADK a reply without a function call is the agent's final response
            if node.get("output_key"):
                state[node["output_key"]] = text
            return "done", text
        nudges += 1
        if nudges > 3:
            return "no_tool_calls", text
        msgs.append({"role": "user", "content": NUDGES["length" if ch.get("finish_reason") == "length" else "stop"]})


def run_node(node: dict, ctx: Ctx, cfg: dict, trace: list, user: str, state: dict,
             histories: dict) -> tuple[str, str, str]:
    """Returns (reason, final_text, author of that text)."""
    cls = node["agent_class"]
    if cls == "LlmAgent":
        return (*run_llm(node, ctx, cfg, trace, user, state, False, histories), node.get("name", "agent"))
    if cls == "SequentialAgent":
        reason, text, author = "done", "", ""
        for child in node["sub_agents"]:
            reason, text, author = run_node(child, ctx, cfg, trace, user, state, histories)
            if reason in FATAL:
                break
            if text:
                user = f"For context:\n[{author}] said: {text}"
        return reason, text, author
    # ParallelAgent: every branch starts from the same message; a fatal end in one stops the others.
    # The tree's latest event is the reply of whichever branch finished last.
    results = []
    with ThreadPoolExecutor(max_workers=len(node["sub_agents"]) or 1) as ex:
        futs = [ex.submit(run_node, c, ctx, cfg, trace, user, state, histories) for c in node["sub_agents"]]
        for f in as_completed(futs):
            r = f.result()
            results.append(r)
            if r[0] in FATAL - {"submitted"} and not ctx.aborted:
                ctx.aborted = r[0]
    fatal = [r for r in results if r[0] in FATAL]
    if fatal:
        return fatal[0]
    answered = [r for r in results if r[1]]
    return answered[-1] if answered else ("done", "", "")


def run_agent(task: dict, ctx: Ctx, root: dict, cfg: dict, trace: list) -> str:
    """Returns the termination reason."""
    state = {"problem_description": task["problem_statement"], "hints": task.get("hints_text", "")}
    histories: dict = {}
    user = build_prompt(task, ctx)
    if root["agent_class"] == "LlmAgent":
        return run_llm(root, ctx, cfg, trace, user, state, True, histories)[0]
    # A workflow root ends its invocation when the last agent replies; the runner then nudges, which
    # starts a whole new invocation of the tree. Approximates the official "3 turns without a tool call".
    for _ in range(4):
        reason = run_node(root, ctx, cfg, trace, user, state, histories)[0]
        if reason in FATAL:
            return reason
        trace.append({"type": "nudge", "content": NUDGES["stop"]})
        user = NUDGES["stop"]
    return "no_tool_calls"
