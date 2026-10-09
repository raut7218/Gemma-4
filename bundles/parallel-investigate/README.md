# parallel-investigate

Investigate in parallel, then fix in one agent. Tasks run one after another inside the 12 h cap, so each task has about 4.5 minutes of wall time. This bundle tries to get more work out of those minutes. When three agents send requests together, vLLM batches them, which uses GPU capacity a single agent leaves idle. Each agent also gets its own 32k window.

```
swe_pipeline (SequentialAgent)
├── investigate (ParallelAgent)    read-only; scratch files only in /tmp
│   ├── localizer   → state.location   files and lines to change, current code, exact names
│   ├── reproducer  → state.repro      /tmp/repro.py, which fails now for the reason the issue gives
│   └── test_scout  → state.tests      verify command, baseline result, how tests call the API
└── fixer (LlmAgent)                    the only agent that edits /workspace or calls submit_patch
```

- Every agent has `include_contents: none`. The investigators see the first user message and their own calls. The fixer starts from the last investigator's reply and reads all three answers from state (`{location?}`, `{repro?}`, `{tests?}`), not from their raw tool output.
- Each investigator also writes its answer to `/tmp/<name>.md`. If the runner nudges and runs the tree again, the investigator finds that file and replies with it, using one tool call. The fixer checks `git diff` first, so a second run continues the earlier fix instead of starting over.
- `read_file` and `get_code_subgraph` are left out, so each agent has fewer tools to choose from. Files are read with `grep -n` and `sed -n`. An earlier note blamed string-typed arguments for `read_file` failing, but the community repo later traced that to its proxy. On the real stack (vLLM 0.19.1, ADK 1.36.1), `read_file` works, so adding it back is an option to test.
- `max_output_tokens` is 2048 instead of 8192. This reserves less of the 32k window for output and stops one long reply from using up the task's time.
- Prompts and sampling are written inline in each sub-agent file. That avoids depending on how `!include` paths resolve in nested files.

## Checked against the official source

Kaggle is unreachable from the build container, so the official compiler wasn't run. Instead, these points were checked by reading the released `adk_submission` 0.2.11 and `swegemma` 0.2.7 source (vendored in the public `happyc0der/gemma-swe-agent` repo). `uv run python -m harness.check_bundle bundles/parallel-investigate` re-checks the schema rules.

- **Schema.** `SequentialAgent`, `ParallelAgent`, `config_path` sub-agents, `output_key`, `include_contents: none`, bare tool names and per-agent `generate_content_config` are all in the restricted schema. Workflow agents take no `model`.
- **`config_path`** resolves against the referencing file's directory when the file exists there, so `localizer.yaml` inside `sub_agents/investigate.yaml` works. `!include` also resolves relative to the including file.
- **Thinking.** `thinking_budget: 0` fails the schema, which requires at least 1. Thinking is turned off by `include_thoughts: false`, which sets `enable_thinking=False`. Without it, the default budget of 4096 turns thinking on.
- **State.** `problem_description` is always in state. `hints` is set only when the task has hints, and public tasks have none, so prompts must use `{hints?}`.
- **Nudges** (`agent_runner.py`) work at the runner level. When a whole run of the tree ends without `submit_patch`, the runner sends a nudge as a new message, which runs the tree again. Three nudges in a row with no tool call end the task. Investigators ending with a text reply inside the tree is normal.
- **Budgets.** Time, tool calls and turns are one per-task context shared by every agent, as assumed.

## Still open

1. **Does the real build pass?** Only the schema was checked. Run the actual `adk_submission` compile, for example with that repo's `scripts/compile_check.py`, before using a daily submission.
2. **Do runaway investigators stall the fixer?** The `ParallelAgent` waits for every branch. One investigator that ignores its 4-call limit delays the fixer, and if it runs out the time budget the patch is empty. Check `calls_by_agent` in the traces.
3. **What's the real speedup?** It depends on vLLM batching on 4×L4 and on how hard pytest runs compete for 2 vCPUs. Measure total output tokens per second with 1 stream and with 3.

## Local run

```bash
uv run python -m harness.run --submission bundles/parallel-investigate --agent llm --base-url URL --model NAME --task-ids ...
```

`task_results.jsonl` has `calls_by_agent`, and every trace entry carries `agent`.
