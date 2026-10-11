# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A local, stdlib-only (plus `pyyaml`) re-implementation of the `swegemma` evaluation loop for the Kaggle **Gemma 4 Developer Agent** competition. Three parts:

- `submission/`: the ADK agent bundle that gets zipped and submitted to Kaggle (`agent.yaml`, `prompts/system.md`, `eval_config.yaml`, `configs/sampling.yaml`). Most competition work is tuning these files.
- `harness/`: a local stand-in for the official grader, used to measure a submission before uploading it. It loads the agent tree, budgets and sampling config straight from `submission/` (or whatever `--submission` points to).
- `bundles/`: alternative bundles, run with `--submission bundles/<name>`. `bundles/parallel-investigate/` is a SequentialAgent → ParallelAgent design; its README lists what still has to be verified against the official scorer.

## Commands

There is no linter or build step. `uv run python tests/check_offline.py` is the regression check to run after changing `harness/` or a bundle: unit checks of the thinking mapping, patch stripping, checker rules and the submission's settings, then the toy task end to end with `--agent gold` (must resolve), `--agent noop` (must not) and `--agent llm` against the fake server for both `submission` and `bundles/parallel-investigate`. It builds its own toy data, starts the fake server on :8765 itself, and needs only `pytest` in `.venv-sandbox`. The commands below are the same steps by hand.

```bash
./fetch_task.sh requests_6592 requests_6589 httpx_3672   # needs kaggle CLI; creates data/ and fetches tasks.jsonl on first use
uv run python tests/check_offline.py                                 # everything below that needs no Kaggle data, in one go
uv run python -m harness.check_bundle submission bundles/parallel-investigate   # static check of official compile rules
uv run python -m harness.run --agent gold --task-ids requests_6592   # reference patch must RESOLVE (pipeline sanity)
uv run python -m harness.run --agent noop --task-ids requests_6592   # empty patch must NOT resolve
uv run python tests/fake_llm.py &                                    # scripted OpenAI-compatible server on :8765; GET /requests shows what it was sent
uv run python -m harness.run --agent llm --base-url http://127.0.0.1:8765/v1 --model fake --task-ids requests_6592

# no Kaggle data: a toy copy of requests_6592 that the fake model's scripts also solve
uv run python tests/make_toy_task.py data-toy
uv run python -m harness.run --data data-toy --agent gold --task-ids toy_6592
uv run python -m harness.run --data data-toy --agent llm --base-url http://127.0.0.1:8765/v1 --model fake \
   --submission bundles/parallel-investigate --task-ids toy_6592

# real model on any OpenAI-compatible endpoint (vLLM, OpenRouter, AI Studio...)
# the bundle's thinking_config is sent as chat_template_kwargs.enable_thinking + thinking_token_budget (vLLM fields);
# --extra-body is merged last, so it can override them for an endpoint that wants something else
LLM_API_KEY=... uv run python -m harness.run --agent llm --base-url https://.../v1 --model <gemma-4-...> --task-ids requests_6592
```

Omit `--task-ids` to run every task in `data/tasks.jsonl` that has a snapshot in `data/snapshots/`. `--base-url` defaults to `http://127.0.0.1:8000/v1` (local vLLM) and `--model` to `gemma-4-31b-it-qat-w4a16-ct`. Other flags: `--submission DIR` (evaluate an alternative bundle), `--data DIR` (default `data/`), `--results-dir`, `--venv` (default `.venv-sandbox`).

`data/`, `data-toy/`, `results/` and `.venv*/` are gitignored and absent from a fresh clone. Commands inside the sandbox run against `.venv-sandbox` (the task repos' PyPI deps), which has to be created by hand (`uv venv .venv-sandbox`, then `uv pip install --python .venv-sandbox/bin/python pytest` plus the task repos' deps). The sandbox also shells out to the host's `git` and `patch`. Only requests and httpx tasks are set up; rich and fastapi need extra deps.

Results land in `results/<run>/`: `summary.json`, `task_results.jsonl`, and per-task `patches/`, `traces/` (the full message/tool trace) and `test_outputs/`.

## Architecture

`harness/run.py` drives each task through two phases:

1. **Agent phase.** `Sandbox` (`sandbox.py`) extracts `data/snapshots/<id>.tgz` (which includes `.git`) into a temp dir, commits it and tags it `_swegemma_baseline`. `bundle.py` loads `agent.yaml` into a tree (`!include`, `sub_agents: - config_path`, `agent_class` LlmAgent / SequentialAgent / ParallelAgent). `run_agent` (`agent.py`) runs it against `/chat/completions` with the tool schemas from `tools.py`. A single LlmAgent root runs the original loop with nudges. In a tree, parallel branches run on threads; an LlmAgent's text-only reply ends it and sets `output_key` in state; `{key}`/`{key?}` in instructions read state (missing `{key}` raises, like ADK); `include_contents: none` starts its context at the last user message or other agent's reply. When a tree finishes without `submit_patch`, it's re-run with a nudge as the user message; three nudges in a row with no tool call in between end the task (`no_tool_calls`). As in swegemma, `submit_patch` doesn't end a run: the agent can keep editing and resubmit, and the run ends at its next text-only reply. Termination reasons: `submitted`, `time`, `turns`, `context_overflow` (prompt_tokens >= 32768), `no_tool_calls` (after 3 nudges), `llm_error`. Running out of tool calls does not end a run: further calls return `BudgetExhausted` and the loop goes on until time or turns run out. The patch is `git add -N . && git diff _swegemma_baseline` with the sections that touch `sandbox.PROTECTED` files removed (`sandbox.strip_protected`, as swegemma >= 0.2.10 does in `submit_patch`); when the agent never called `submit_patch`, `run.py` still grades the working-tree diff, stripped the same way.
2. **Grading phase.** `verify.py` builds a *fresh* sandbox, strips protected sections from the patch again, applies it (several `git apply` fallbacks, then `patch`), resets any file matching `sandbox.PROTECTED` (tests, conftest, pyproject, etc.), applies the hidden `test_patch`, and runs pytest with JUnit output on the test files it touched.

`classify()` in `run.py` maps the outcome to RESOLVED / CONTEXT_OVERFLOW / BUDGET_EXHAUSTED / LOOP_BREAKOUT / PATCH_REJECTED / TESTS_FAILED / NO_PATCH / LLM_ERROR, plus TEST_PATCH_FAILED and NO_JUNIT passed through from `verify.py` (both point at the harness or sandbox venv, not the agent). BUDGET_EXHAUSTED, LOOP_BREAKOUT, LLM_ERROR and NO_PATCH are only reported for an empty patch; a non-empty patch is always graded, whatever ended the run.

Details that are easy to get wrong:

- **Resolution criterion.** `tasks.jsonl` has no FAIL_TO_PASS/PASS_TO_PASS, so "required tests" are the tests that pass with the gold patch. They're computed once and cached in `data/reference/<id>.json`. Delete that file if the grading environment changes.
- **Path rewriting.** The sandbox isn't Docker. `Sandbox.rewrite` turns `/workspace` and `/tmp` in agent commands into per-sandbox dirs, and `PYTHONPATH` points at the workspace (plus `src/`) instead of an editable install.
- **Budgets** come from `submission/eval_config.yaml` → `tools.Budget`, and every agent in a tree shares them through `Ctx` (tool calls and turns are counted under a lock). A tool not in an agent's `tools` list returns `UnknownTool`. `get_status` and `submit_patch` don't count against the tool-call budget. Once 20+ calls are used and 10 or fewer remain, every tool result gets a `budget_warning` injected.
- **Tool output caps** (5000 chars of stdout, 150 lines / 10000 chars per `read_file`) are set in `tools.py`, and the user prompt built in `agent.build_prompt` repeats them. Change both together.
- **Prompt templating.** `{problem_description}` and `{hints}` come from state, like any output_key. Any other `{identifier}` in an instruction is treated as a state key, so keep braces out of prompt text. The user prompt (problem, budget, rules, instructions, a 3-level workspace tree) is built in `agent.build_prompt` with the wording of swegemma 0.2.11's `build_agent_prompt`; the `read_file` limits are listed only when some agent in the bundle has that tool.
- **Sampling and thinking.** An agent's own `generate_content_config` replaces (not merges with) the bundle's `configs/sampling.yaml`, which is only the fallback for agents without one. `agent.effective_sampling` then merges the scorer's defaults underneath (`max_output_tokens: 16384`, `thinking_budget: 4096`), and `agent.chat` maps the keys to OpenAI request fields (`max_output_tokens` → `max_tokens`; `top_k` is sent as a top-level field, a vLLM extension). `agent.thinking_body` copies `adk_submission` 0.2.13: `thinking_budget` 0 turns thinking off, any budget above 0 turns it on, and `include_thoughts` only decides whether earlier thoughts stay in the history. `include_thoughts: false` without `thinking_budget: 0` therefore runs thinking with a 4096 budget and discards its text; `check_bundle` warns about it. Thinking tokens count against `max_output_tokens`.
- **Host git config is shut out.** `sandbox.GIT_ENV` sets `GIT_CONFIG_GLOBAL=/dev/null` for the harness's own git calls and for agent commands. Settings such as `diff.mnemonicPrefix` change the `a/` `b/` prefixes that `strip_protected` and `verify.patch_files` parse.
- **`!include` resolution differs between loader and checker.** `bundle.py` falls back to the bundle root when the path isn't found next to the including file; `check_bundle.py` follows the official rule (including file's directory only). A bundle can therefore run locally and still fail the check, so run `check_bundle` after moving files.
- **`tests/fake_llm.py`** picks a script by matching `Your role: <ROLE>` in the system prompt (the parallel-investigate roles, else a single-agent default), then picks the step by counting `tool` messages. It answers with a `reasoning` field when the request enables thinking and records every request's sampling fields for `GET /requests`, which is how `check_offline.py` verifies what the loop sends. The scripts are hard-coded for `requests_6592` and `toy_6592`. Update them whenever the tool schema, the role prompts or the loop's message shape changes.

## Gaps relative to the official stack

- The local harness implements only the six core tools; the graph tools (`search_similar_code`, `get_code_neighbors`, `get_code_subgraph`) return `UnknownTool` and are dropped from an agent's schema. `submission/` doesn't use them.
- Skills, AgentTool, LoopAgent, LlmAgent `sub_agents` (transfer) and ADK context compaction aren't implemented. Agents with `include_contents: default` in a tree see only their own history, not other agents' events. Overflow is detected only from `usage.prompt_tokens` (estimated as JSON chars / 3 when the endpoint returns no usage).
- `harness/check_bundle.py` transcribes the compile rules of `adk_submission` 0.2.13 / `swegemma` 0.2.11 (field allowlists, tool and model names, `config_path`/`!include` resolution, `thinking_budget` 0..32768, state placeholders) and warns about thinking settings that don't do what they look like. It doesn't run the real compiler. The wheelhouse is updated without notice and has changed behaviour before (0.2.13 changed what `include_thoughts: false` means), so re-read the source after an update: `kaggle datasets download metric/gemma-4-developer-agent-wheelhouse -f adk_submission-<ver>-py3-none-any.whl` fetches one small wheel, and `kaggle datasets files metric/gemma-4-developer-agent-wheelhouse` lists the current versions.
- No run with the real model has been made from this repo: there is no GPU here, and `.venv-sandbox` covers only requests and httpx tasks (14 of the 129 public ones). The submission's settings follow public ablations (competition discussions 746250 and 747857), not local measurements. ADK's event compaction (it starts at 14,336 prompt tokens in the scorer) is also not reproduced, so context behaviour on long runs differs.
- To validate the YAML against the real `adk_submission` package, run `kaggle datasets download metric/gemma-4-developer-agent-wheelhouse` (867 MB).
