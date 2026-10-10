# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A local, stdlib-only (plus `pyyaml`) re-implementation of the `swegemma` evaluation loop for the Kaggle **Gemma 4 Developer Agent** competition. Two parts:

- `submission/`: the ADK agent bundle that gets zipped and submitted to Kaggle (`agent.yaml`, `prompts/system.md`, `eval_config.yaml`, `configs/sampling.yaml`). Most competition work is tuning these files.
- `harness/`: a local stand-in for the official grader, used to measure a submission before uploading it. It loads the agent tree, budgets and sampling config straight from `submission/` (or whatever `--submission` points to).
- `bundles/`: alternative bundles, run with `--submission bundles/<name>`. `bundles/parallel-investigate/` is a SequentialAgent → ParallelAgent design; its README lists what still has to be verified against the official scorer.

## Commands

There is no test suite, linter or build step. "Testing" means running the harness end to end.

```bash
./fetch_task.sh requests_6592 requests_6589 httpx_3672   # needs kaggle CLI and an existing data/ dir; data/tasks.jsonl comes from the competition too
uv run python -m harness.check_bundle submission bundles/parallel-investigate   # static check of official compile rules
uv run python -m harness.run --agent gold --task-ids requests_6592   # reference patch must RESOLVE (pipeline sanity)
uv run python -m harness.run --agent noop --task-ids requests_6592   # empty patch must NOT resolve
uv run python tests/fake_llm.py &                                    # scripted OpenAI-compatible server on :8765
uv run python -m harness.run --agent llm --base-url http://127.0.0.1:8765/v1 --model fake --task-ids requests_6592

# no Kaggle data: a toy copy of requests_6592 that the fake model's scripts also solve
uv run python tests/make_toy_task.py data-toy
uv run python -m harness.run --data data-toy --agent gold --task-ids toy_6592
uv run python -m harness.run --data data-toy --agent llm --base-url http://127.0.0.1:8765/v1 --model fake \
   --submission bundles/parallel-investigate --task-ids toy_6592

# real model on any OpenAI-compatible endpoint (vLLM, OpenRouter, AI Studio...)
LLM_API_KEY=... uv run python -m harness.run --agent llm --base-url https://.../v1 --model <gemma-4-...> \
   --extra-body '{"chat_template_kwargs":{"enable_thinking":false}}' --task-ids requests_6592
```

Omit `--task-ids` to run every task in `data/tasks.jsonl` that has a snapshot in `data/snapshots/`. Other flags: `--submission DIR` (evaluate an alternative bundle), `--data DIR` (default `data/`), `--results-dir`, `--venv` (default `.venv-sandbox`).

`data/`, `data-toy/`, `results/` and `.venv*/` are gitignored and absent from a fresh clone. Commands inside the sandbox run against `.venv-sandbox` (the task repos' PyPI deps), which has to be created by hand (`uv venv .venv-sandbox`, then `uv pip install pytest` plus the task repos' deps). Only requests and httpx tasks are set up; rich and fastapi need extra deps.

Results land in `results/<run>/`: `summary.json`, `task_results.jsonl`, and per-task `patches/`, `traces/` (the full message/tool trace) and `test_outputs/`.

## Architecture

`harness/run.py` drives each task through two phases:

1. **Agent phase.** `Sandbox` (`sandbox.py`) extracts `data/snapshots/<id>.tgz` (which includes `.git`) into a temp dir, commits it and tags it `_swegemma_baseline`. `bundle.py` loads `agent.yaml` into a tree (`!include`, `sub_agents: - config_path`, `agent_class` LlmAgent / SequentialAgent / ParallelAgent). `run_agent` (`agent.py`) runs it against `/chat/completions` with the tool schemas from `tools.py`. A single LlmAgent root runs the original loop with nudges. In a tree, parallel branches run on threads; an LlmAgent's text-only reply ends it and sets `output_key` in state; `{key}`/`{key?}` in instructions read state (missing `{key}` raises, like ADK); `include_contents: none` starts its context at the last user message or other agent's reply. When a tree finishes without `submit_patch`, it's re-run with a nudge as the user message (at most 4 times). As in swegemma, `submit_patch` doesn't end a run: the agent can keep editing and resubmit, and the run ends at its next text-only reply. Termination reasons: `submitted`, `time`, `turns`, `context_overflow` (prompt_tokens >= 32768), `no_tool_calls` (after 3 nudges), `llm_error`. The patch is `git add -N . && git diff _swegemma_baseline`.
2. **Grading phase.** `verify.py` builds a *fresh* sandbox, applies the patch (several `git apply` fallbacks, then `patch`), resets any file matching `sandbox.PROTECTED` (tests, conftest, pyproject, etc.), applies the hidden `test_patch`, and runs pytest with JUnit output on the test files it touched.

`classify()` in `run.py` maps the outcome to RESOLVED / CONTEXT_OVERFLOW / BUDGET_EXHAUSTED / LOOP_BREAKOUT / PATCH_REJECTED / TESTS_FAILED / NO_PATCH / LLM_ERROR.

Details that are easy to get wrong:

- **Resolution criterion.** `tasks.jsonl` has no FAIL_TO_PASS/PASS_TO_PASS, so "required tests" are the tests that pass with the gold patch. They're computed once and cached in `data/reference/<id>.json`. Delete that file if the grading environment changes.
- **Path rewriting.** The sandbox isn't Docker. `Sandbox.rewrite` turns `/workspace` and `/tmp` in agent commands into per-sandbox dirs, and `PYTHONPATH` points at the workspace (plus `src/`) instead of an editable install.
- **Budgets** come from `submission/eval_config.yaml` → `tools.Budget`, and every agent in a tree shares them through `Ctx` (tool calls and turns are counted under a lock). A tool not in an agent's `tools` list returns `UnknownTool`. `get_status` and `submit_patch` don't count against the tool-call budget. Once 20+ calls are used and 10 or fewer remain, every tool result gets a `budget_warning` injected.
- **Tool output caps** (5000 chars of stdout, 150 lines / 10000 chars per `read_file`) are set in `tools.py`, and the user prompt built in `agent.build_prompt` repeats them. Change both together.
- **Prompt templating.** `{problem_description}` and `{hints}` come from state, like any output_key. Any other `{identifier}` in an instruction is treated as a state key, so keep braces out of prompt text. The user prompt (problem, budget, rules, a 3-level workspace tree) is built in `agent.build_prompt` to mirror the official harness.
- **Sampling mapping.** `sampling.yaml` keys are mapped to OpenAI request fields in `agent.chat` (`max_output_tokens` → `max_tokens`). `thinking_config` is *not* forwarded; disable thinking with `--extra-body`.
- **`tests/fake_llm.py`** picks a script by matching `Your role: <ROLE>` in the system prompt (the parallel-investigate roles, else a single-agent default), then picks the step by counting `tool` messages. The scripts are hard-coded for `requests_6592` and `toy_6592`. Update them whenever the tool schema, the role prompts or the loop's message shape changes.

## Gaps relative to the official stack

- The local harness implements only the six core tools; the graph tools (`search_similar_code`, `get_code_neighbors`, `get_code_subgraph`) return `UnknownTool` and are dropped from an agent's schema. `submission/` doesn't use them.
- Skills, AgentTool, LoopAgent, LlmAgent `sub_agents` (transfer) and ADK context compaction aren't implemented. Agents with `include_contents: default` in a tree see only their own history, not other agents' events. Overflow is detected only from `usage.prompt_tokens`.
- `harness/check_bundle.py` transcribes the compile rules of `adk_submission` 0.2.11 / `swegemma` 0.2.7 (field allowlists, tool and model names, `config_path`/`!include` resolution, `thinking_budget >= 1`, state placeholders). It doesn't run the real compiler. The released source is vendored in the public repo `happyc0der/gemma-swe-agent` under `harness/official/`.
- To validate the YAML against the real `adk_submission` package, run `kaggle datasets download metric/gemma-4-developer-agent-wheelhouse` (867 MB).
