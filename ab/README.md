# Holdout A/B: v4.3 vs the senior-dev ports

This compares three arms on the fixed holdout split in `gemma-swe-agent/experiments/splits.json`. That split has 40 tasks; the 7 in `env_unstable` are dropped, leaving 33. The three arms are:

| Arm | Bundle |
| --- | --- |
| `v43` (control) | `gemma-swe-agent/experiments/variants/v43` |
| `port` | `bundles/senior-dev-port` |
| `presubmit` | `bundles/senior-dev-presubmit` |

All three use the same tools, sampling settings (temperature 0.2, thinking off) and budget (4.5 min, 30 calls, 60 turns). Only the prompt differs, plus the skill in the presubmit arm.

## Requirements

- A GPU host serving Gemma 4 31B through an OpenAI-compatible endpoint. `gemma-swe-agent/serve/` has vLLM scripts for this; use the `gemma4` tool and reasoning parsers and `max_model_len` 32768.
- A clone of [happyc0der/gemma-swe-agent](https://github.com/happyc0der/gemma-swe-agent) with its harness installed. That means `harness/.venv/bin/swelite`, built with `swelite build-image`.
- The competition data under `data/competition`. It needs a Kaggle account that has accepted the competition rules, and the repo snapshots alone are about 20 GB.
- Docker, for the task sandboxes.

## Running it

```bash
HARNESS=~/gemma-swe-agent API_BASE=http://127.0.0.1:8000/v1 \
SERVED_MODEL=gemma-4-31b-it-qat-w4a16-ct REPEATS=2 CONCURRENCY=2 \
ab/run_holdout_ab.sh
python3 ab/report.py ab/results/<run>
```

The runner alternates arms within each repeat, so any slowdown or drift on the server affects all three arms alike. Each bundle uses its own `eval_config.yaml`, and the runner overrides no budgets.

One repeat is about 33 tasks × 3 arms × roughly 5 minutes, or 8 hours at concurrency 1. Concurrency 2 roughly halves that, as long as the server keeps up.

## What the report shows

Per arm, it shows:

- resolved,
- how often `submit_patch` was called,
- empty patches,
- patches touching test or config files,
- new scratch files in the patch,
- how often `/tmp/plan.md` was written within the first 6 tool calls,
- how often a presubmit check ran before the end, whether by skill or by the manual `git status; git diff` one-liner.

For the presubmit arm, it also counts:

- skill runs,
- READY and NOT READY verdicts,
- re-runs with no action in between (looping on the check),
- turns spent on `load_skill` and `list_skills`.

It also gives a paired comparison against v43 on each task and repeat: wins, losses and an exact McNemar p-value. On 33 tasks, a difference of 1 or 2 is run-to-run noise. Public v4.3 scores of 0.06, 0.10 and 0.08 differed by about that much.
