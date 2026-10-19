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
from pathlib import Path

from .tools import MAX_CHARS, MAX_LINES, MAX_STDOUT, SCHEMAS, SKILL_SCHEMA, SKILL_TOOL, TOOL_NAMES, Ctx

CTX_LIMIT = 32768
NUDGES = {
    "length": "Your previous response reached the token limit before a tool call was completed. Do NOT repeat your analysis in thought - keep reasoning under a few sentences and emit your next tool call immediately, or call submit_patch when you have completed and verified your changes.",
    "stop": "Please continue your work using the available tools, or call submit_patch when you have completed and verified your changes.",
}
FATAL = {"context_overflow", "llm_error", "time", "turns", "submitted"}
_VAR = re.compile(r"\{([A-Za-z_]\w*)(\?)?\}")


def build_prompt(task: dict, ctx: Ctx, declared: set[str] | None = None) -> str:
    """The first user message, worded like swegemma 0.2.11's build_agent_prompt. `declared` is every tool name
    the bundle lists; the read_file limits are left out when no agent has that tool."""
    b = ctx.budget
    ws = ctx.sb.ws
    _, tree, _ = ctx.sb.run("find . -maxdepth 3 -not -path './.git*' -not -name '__pycache__' -not -name '*.pyc' | head -150")
    rules = [f"- Single command timeout: {b.timeout_seconds} seconds (commands exceeding this fail without ending the session)",
             f"- Command output limit: {MAX_STDOUT} characters"]
    if declared is None or "read_file" in declared:
        rules += [f"- File view limit: {MAX_LINES} lines per read_file call",
                  f"- File character limit: {MAX_CHARS} characters per read_file call"]
    rules.append("- Environment is offline (no network/PyPI access). All repository and test dependencies are ALREADY pre-installed. Do NOT attempt to run pip install or download packages.")
    parts = [f"You are evaluating a software engineering task for repository {task['repo']}.\n\nProblem Statement:\n{task['problem_statement']}\n"]
    if (task.get("hints_text") or "").strip():
        parts.append(f"## Hints:\n{task['hints_text'].strip()}\n")
    parts.append(f"## Task Budget (Session terminates when any budget is exhausted)\n- Time allowance: {b.max_time_minutes} minutes\n- Tool calls allowance: {b.max_tool_calls} calls\n- Max loop iterations: {b.max_turns} turns\n")
    parts.append("## Execution Environment Rules\n" + "\n".join(rules) + "\n")
    parts.append("## Instructions:\n"
                 "0. All source code is under `/workspace`. Do NOT search outside `/workspace` (e.g. `/usr/`, `/wheels/`, system site-packages). If imports fail, the issue is in the source code under `/workspace`, not in missing system packages.\n"
                 "1. Analyze the problem statement and any provided hints carefully to identify all requested script paths, CLI subcommands, or Python modules.\n"
                 "2. Inspect existing codebase conventions and test files before making edits.\n"
                 "3. Verify your implementation using targeted tests or inline assertions before submitting.\n"
                 "4. Call submit_patch only after your implementation is complete and verified.\n"
                 "5. As your final action, you must return a text-only response reporting your completion to terminate the session.")
    parts.append(f"## Workspace Layout\n{tree.replace(str(ws), '/workspace')}")
    return "\n\n".join(parts)


# adk_submission merges these under every agent's generate_content_config (swegemma/config.py); thinking_config
# is merged key by key, so a config without a thinking_budget still gets 4096.
GEN_DEFAULTS = {"max_output_tokens": 16384, "thinking_config": {"thinking_budget": 4096}}


def effective_sampling(cfg: dict | None) -> dict:
    cfg = dict(cfg or {})
    merged = {**GEN_DEFAULTS, **cfg}
    if isinstance(cfg.get("thinking_config"), dict):
        merged["thinking_config"] = {**GEN_DEFAULTS["thinking_config"], **cfg["thinking_config"]}
    return merged


def thinking_body(tc: dict | None) -> dict:
    """adk_submission 0.2.13 apply_thinking_config_to_model: the budget decides before include_thoughts does.
    include_thoughts only controls whether earlier thoughts stay in the history."""
    tc = tc or {}
    level = str(tc.get("thinking_level") or "").lower()
    budget = tc.get("thinking_budget")
    has_budget = isinstance(budget, (int, float)) and not isinstance(budget, bool)
    if level == "none" or (has_budget and budget <= 0):
        on = False
    elif level in {"minimal", "low", "medium", "high"} or (has_budget and budget > 0):
        on = True
    elif isinstance(tc.get("include_thoughts"), bool):
        on = tc["include_thoughts"]
    else:
        return {}
    body: dict = {"chat_template_kwargs": {"enable_thinking": on}}
    if on and has_budget and budget > 0:
        body["thinking_token_budget"] = int(budget)
    if on and level in {"low", "medium", "high"}:
        body["reasoning_effort"] = level
    return body


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
    body = {"model": model, "messages": messages, "tools": SCHEMAS if tools is None else tools, "tool_choice": "auto",
            **thinking_body(sampling.get("thinking_config")), **extra_body}  # --extra-body wins over the bundle
    for k_src, k_dst in (("temperature", "temperature"), ("top_p", "top_p"), ("max_output_tokens", "max_tokens"),
                         ("presence_penalty", "presence_penalty"), ("frequency_penalty", "frequency_penalty"), ("seed", "seed"),
                         ("stop_sequences", "stop")):
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
    if node.get("skills"):  # bundle.py resolved them to directories; ADK requires dir name == skill name
        ctx.skills.update({Path(p).name: Path(p) for p in node["skills"]})
        allowed.append(SKILL_TOOL)
    schemas = [s for s in SCHEMAS + [SKILL_SCHEMA] if s["function"]["name"] in allowed]
    sampling = effective_sampling(node.get("generate_content_config") or cfg["sampling"])
    keep_thoughts = (sampling.get("thinking_config") or {}).get("include_thoughts") is not False
    sysmsg = {"role": "system", "content": render(node.get("instruction", ""), state)}
    if node.get("include_contents") == "none":
        msgs = [sysmsg, {"role": "user", "content": user}]
    else:
        msgs = histories.setdefault(name, [sysmsg])
        msgs[0] = sysmsg
        msgs.append({"role": "user", "content": user})
    nudges = 0
    while True:
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
        thought = m.get("reasoning") or m.get("reasoning_content")
        trace.append({"type": "assistant", "agent": name, "t": round(time.time() - ctx.start, 1), "prompt_tokens": pt,
                      "completion_tokens": usage.get("completion_tokens"), "finish": ch.get("finish_reason"),
                      "reasoning": thought, "content": m.get("content"), "tool_calls": m.get("tool_calls")})
        if pt >= CTX_LIMIT:
            return "context_overflow", ""
        hist = {k: v for k, v in m.items() if k in ("role", "content", "tool_calls") and v is not None}
        if thought and keep_thoughts:  # include_thoughts: false strips earlier thoughts from the history
            hist["reasoning"] = hist["reasoning_content"] = thought
        msgs.append(hist)
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
        if calls:  # like swegemma, submit_patch doesn't end the run: the agent may keep editing and resubmit
            nudges = 0
            continue
        if ctx.patch_submitted:  # the run ends at the first text-only reply after a submission
            return "submitted", m.get("content") or ""
        text = m.get("content") or ""
        if is_root and ctx.calls >= ctx.budget.max_tool_calls:  # swegemma ends the run at the first final reply once the call budget is spent
            return "tool_calls", text
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


def declared_tools(node: dict) -> set[str]:
    return {t for t in node.get("tools") or [] if isinstance(t, str)}.union(*(declared_tools(c) for c in node.get("sub_agents") or []))


def run_agent(task: dict, ctx: Ctx, root: dict, cfg: dict, trace: list) -> str:
    """Returns the termination reason."""
    state = {"problem_description": task["problem_statement"]}
    if (task.get("hints_text") or "").strip():  # like swegemma: an empty hint leaves the key unset
        state["hints"] = task["hints_text"].strip()
    histories: dict = {}
    user = build_prompt(task, ctx, declared_tools(root))
    if root["agent_class"] == "LlmAgent":
        return run_llm(root, ctx, cfg, trace, user, state, True, histories)[0]
    # Mirrors swegemma's agent_runner: when an invocation of the tree ends without submit_patch, the runner
    # sends a nudge as a new message, which runs the whole tree again. Three nudges in a row without any
    # tool call in between end the task.
    nudges = 0
    while True:
        calls_before = ctx.calls
        reason = run_node(root, ctx, cfg, trace, user, state, histories)[0]
        if reason in FATAL:
            return reason
        if ctx.calls > calls_before:
            nudges = 0
        if ctx.calls >= ctx.budget.max_tool_calls:
            return "tool_calls"
        if nudges >= 3:
            return "no_tool_calls"
        nudges += 1
        trace.append({"type": "nudge", "content": NUDGES["stop"]})
        user = NUDGES["stop"]
