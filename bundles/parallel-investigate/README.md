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
- `read_file` and `get_code_subgraph` are left out, because the scorer's parser turns their integer and list arguments into strings. Files are read with `grep -n` and `sed -n`.
- `max_output_tokens` is 2048 instead of 8192. This reserves less of the 32k window for output and stops one long reply from using up the task's time.
- Prompts and sampling are written inline in each sub-agent file. That avoids depending on how `!include` paths resolve in nested files.

## Not yet verified against the official scorer

These are the questions a first leaderboard probe has to answer. Each one can sink the score.

1. **Does `adk_submission` compile it?** The files pass ADK's own `AgentConfig` schema (google-adk 2.11, with tools as `{name: ...}` objects). The competition compiler may want a different layout: tool lists, `config_path` resolution, `model` on workflow agents.
2. **How do nudges interact with sub-agents?** If the scorer's "3 turns without a tool call" counter is session-wide, or if it nudges inside each LlmAgent, the investigators' final text replies could end the session or keep them going after they should stop.
3. **Are the budgets per task?** Most likely yes, so the three branches share `max_tool_calls` and `max_turns`. That's why they're raised to 50 and 100.
4. **Do runaway investigators stall the fixer?** The `ParallelAgent` waits for every branch. One investigator that ignores its 4-call limit delays the fixer, and if it runs out the time budget the patch is empty. Check the per-agent call counts in the traces.
5. **What's the real speedup?** It depends on vLLM batching on 4×L4 and on how hard pytest runs compete for 2 vCPUs. Measure total output tokens per second with 1 stream and with 3.

## Local run

```bash
uv run python -m harness.run --submission bundles/parallel-investigate --agent llm --base-url URL --model NAME --task-ids ...
```

`task_results.jsonl` has `calls_by_agent`, and every trace entry carries `agent`.
