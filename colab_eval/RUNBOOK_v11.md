# v11: the 10-task check on a Colab G4

v11 (`submission/`) is the bundle to trust before it goes to Kaggle. What changed from v10 and why:

| | v10 (`bundles/v10`, LB 0.12) | v11 |
|---|---|---|
| tools | six core tools + swe skill (locate.py, check.py) | six core tools, no skills |
| budget | 4.5 min / 35 calls | 8 min / 28 calls / 240 s / 80 turns |
| sampling | temp 0.4, top_p 0.95, top_k 40, max_output 4096, thinking 2048 (kept) | unchanged |
| prompt | time-aware, skill-driven | v5's workflow plus fixes for the v8 G4 failures |

- The LB has 58 public tasks and identical files score 7 to 13 between runs, so no single submission ranks bundles.
  Our skill bundles were the two lowest (v7 0.10 at 8 min, v10 0.12); v3-v6 without skills scored 0.13-0.18.
- 8 min / 28 calls is the budget with the most finished 12 h jobs (our v4, v5, v7 and the public budget-fit bundles);
  v7 at 10 min overran, which scores nothing.
- Prompt fixes, each for a measured failure: `edit_file` with a 1-3 line `old_string` and a recovery path for the
  gemma4 parser's malformed calls (150/468 edits in the v8 run lost their `old_string`), the issue's exact names and
  exports, title-only issues, the whole test file as the check (the grader runs whole files), the first edit by call 12,
  no rereads, one repro before the first edit, finish at the first `budget_warning`.

## Before (once)

The Drive cache from `cpu_prepare.sh` must be there: `MyDrive/gemma4-eval/` with `comp/`, `cache/hvenv.tar`,
`cache/sbx.tar`, `model/` (or Hugging Face access) and `results/gold`. `cpu_prepare_v10.sh` is optional for v11: it adds
the scorer's patched vLLM wheel (`gpu_start.sh` falls back to PyPI's vllm 0.19.1 without it) and `ext/public_ok.txt`
(without it the sample comes from `results/gold`).

## On the G4 runtime

```python
from google.colab import drive; drive.mount('/content/drive')
```
```python
!rm -rf /content/Gemma-4 && git clone -q -b v11 https://github.com/raut7218/Gemma-4.git /content/Gemma-4
!BRANCH=v11 bash /content/Gemma-4/colab_eval/colab/gpu_start.sh     # ~5-10 min
```
It should end with `code: v11 @ <sha>`, `harness + sandbox envs restored`, `comp restored: 129 snapshots`,
`model ready`, `vLLM ready` and `serving: ['gemma-4-31b-it-qat-w4a16-ct']`. A line starting with FATAL names what is
missing. For a faster weights download set `os.environ['HF_TOKEN']` (Colab secret) before this cell; without it the
weights come from Drive.

```python
!bash /content/Gemma-4/colab_eval/colab/gpu_run.sh check                # ~15-25 min
```
It prints the 10 tasks, the model check, the gold result, then the report and the head of `health.md`. Exit code 3:
the model check or the environment check failed and nothing was run (the lines above say why; `FORCE=1` runs anyway).
Exit code 4: some tasks have no result, i.e. harness errors (see `health.md`). Other bundles: `BUNDLE=bundles/v10`;
other tasks: `IDS="fastapi_14986 rich_3067"`; more tasks: `gpu_run.sh check 20`.

Watching it, from Colab's Terminal:
```bash
cd /content/Gemma-4 && /content/hvenv/bin/python -m colab_eval.progress /content/results/check_<sha> --every 30
```

## What to look at

In `MyDrive/gemma4-eval/results/check_<sha>/analysis/`:

1. `health.md`, top lines: model check `OK`, gold `10/10`, harness errors `none`. Anything else is a harness or
   environment problem to fix before reading the scores.
2. `health.md`, model calls: blank thinking near 0; thinking tokens the parser did not return 0 (otherwise the reasoning
   parser drops thoughts); tool-call markup in the content 0 (otherwise the tool parser misses calls); malformed tool
   arguments (v8: about a third of `edit_file` calls); text-only replies before submit (each costs a nudge); outputs
   cut at max_tokens. Each flag has examples with the raw text the model emitted.
3. `health.md`, tool results: errors by type (`MissingParameters` is the parser bug seen from the harness side,
   `FileEditError` a missed `old_string`), repeated identical calls, nudges.
4. `report.md`: outcomes, why each run ended (submitted / time / tool_calls), first edit at call # (target 12 or
   earlier), the estimated time on 4x L4.
5. `timing.md` (when Drive has `results/v8`): the 12 h projection, rough with 10 tasks.

## Sharing the results

Download `MyDrive/gemma4-eval/results/check_<sha>.tgz`, extract it into `D:\Projects\Gemma-4\results\colab\` and ask
Claude to analyze it; or paste `health.md` and `report.md`.

## After the check

- Numbers that can rank bundles come from the 129 public tasks, not the LB:
  `RUN=v11_full L4_CLOCK=20,1500,0.65 bash gpu_run.sh full 32` and the same with `BUNDLE=bundles/v10 RUN=v10_full`.
- The Kaggle zip (locally): `uv run python -m harness.check_bundle submission`, the real compiler
  (`tests/compile_official.py submission` with a Python that has adk_submission), then
  `cd submission && zip -r ../submission.zip .`; the upload must be named `submission.zip`.
