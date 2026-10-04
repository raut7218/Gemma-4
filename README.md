# Local baseline harness (Gemma 4 Developer Agent)

Stdlib-only re-implementation of the `swegemma` loop: same tools, budgets, nudges, patch extraction (`git add -N . && git diff`) and two-phase grading (fresh sandbox, reset protected test files, hidden `test_patch`, pytest + JUnit).
Subprocess sandbox (no Docker needed). `submission/` is the config you'll zip for Kaggle; the harness reads its `prompts/system.md`, `eval_config.yaml`, `configs/sampling.yaml`.

```bash
./fetch_task.sh requests_6592 requests_6589 httpx_3672        # data/ is gitignored; tasks.jsonl + 3 snapshots already downloaded
uv run python -m harness.run --agent gold --task-ids requests_6592   # sanity: reference patch must RESOLVE
uv run python -m harness.run --agent noop --task-ids requests_6592   # sanity: empty patch must NOT resolve
uv run python tests/fake_llm.py &                                    # scripted fake model -> tests the agent loop w/o GPU
uv run python -m harness.run --agent llm --base-url http://127.0.0.1:8765/v1 --model fake --task-ids requests_6592

# real model, any OpenAI-compatible endpoint (vLLM on a Kaggle 4xL4 notebook, OpenRouter, AI Studio...)
LLM_API_KEY=... uv run python -m harness.run --agent llm --base-url https://.../v1 --model <gemma-4-...> \
   --extra-body '{"chat_template_kwargs":{"enable_thinking":false}}' --task-ids requests_6592 requests_6589 httpx_3672
```
Output: `results/<run>/{summary.json,task_results.jsonl,patches/,traces/,test_outputs/}` with a failure category per task
(RESOLVED, CONTEXT_OVERFLOW, BUDGET_EXHAUSTED, LOOP_BREAKOUT, PATCH_REJECTED, TESTS_FAILED, NO_PATCH, LLM_ERROR).

## Known gaps (upgrade list)
- No GPU/Docker here, so no local Gemma 31B run yet; the loop is verified against the scripted fake server only.
- Graph tools (`search_similar_code`, `get_code_neighbors`, `get_code_subgraph`), the analyzer sub-agent, skills and ADK context compaction are not implemented (data/graphs + embeddings are on Kaggle).
- `tasks.jsonl` has no FAIL_TO_PASS/PASS_TO_PASS: "required tests" = those passing with the gold patch (cached in `data/reference/`). Official grading may differ slightly.
- Sandbox uses PyPI deps in `.venv-sandbox` and PYTHONPATH instead of the offline wheelhouse + editable install; only requests/httpx tasks are set up (rich/fastapi need extra deps).
- Context overflow is detected from `usage.prompt_tokens` (>= 32768), not by running the real compaction.
- Official stack check: `kaggle datasets download metric/gemma-4-developer-agent-wheelhouse` (867 MB) has `adk_submission` to validate the YAML.
