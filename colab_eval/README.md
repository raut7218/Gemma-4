# colab_eval: the official scorer on a Colab G4

Runs a submission bundle through the unmodified official `swegemma` 0.2.11 / `adk_submission` 0.2.13 / google-adk 1.36.1
against the competition checkpoint the bundle declares (`gemma-4-31b-it-qat-w4a16-ct` or `gemma-4-12b-it-qat-w4a16-ct`;
`colab/models.sh` maps it to the HF repo and the scorer's extra vLLM args) served by the scorer's vLLM 0.19.1 stack,
on all 129 public tasks, and reports where tasks are lost: tool calls, turns, context, compaction, truncated
outputs, submits, time. The local `harness/` re-implements the loop; this runs the real one.

Kaggle scores on **4x NVIDIA L4** (24 GB each, vLLM TP=4, `gpu_memory_utilization` 0.90, `max_model_len` 32768;
HARNESS_README section 3.1), one task after another. A G4 (one RTX PRO 6000, 96 GB) runs many tasks at once, so wall-clock
time does not transfer: runs lift the time budget to 30 min and `analyze` estimates the L4 time from token counts.

## Files

| file | what |
|---|---|
| `run_official.py` | wrapper around `swegemma.evaluate.Evaluator`: bundle's `eval_config.yaml`, scorer compaction/caching, Docker-like subprocess sandbox, `--agent gold/noop`, per-call LLM log |
| `build_sandbox_env.py` | builds the shared sandbox site (`/content/sbx`) that stands in for the `swebench-sandbox` image |
| `sandbox_deps.py` | per-task step inside each sandbox: other task repos' wheels + the versions the task's pyproject pins |
| `analyze.py` | `results/<run>` -> `analysis/report.md`, `tasks.csv`, `tasks.json` |
| `vllm_stats.py` | live vLLM load (running/waiting, KV %, prefix hits, tok/s) for tuning `--concurrency` |
| `requirements-harness.txt`, `requirements-vllm.txt` | locks (vLLM side pinned to the scorer wheelhouse; `vllm-requirements.in` + `vllm-overrides.txt` regenerate it) |
| `colab/cpu_prepare.sh` | CPU runtime: data, envs, model, gold validation -> Drive `MyDrive/gemma4-eval/` |
| `colab/gpu_start.sh` | G4 runtime: restore from Drive/PyPI/HF in parallel, start vLLM |
| `colab/gpu_run.sh` | `smoke` (3 tasks) or `full` run, Drive sync, analysis |
| `colab/models.sh` | model declared by `$BUNDLE` -> HF repo, vLLM extra args (12B: `--hf-overrides`), Drive cache dir, L4 speed estimate |
| `findings_v8.md` | what the first v8 run (31B) showed |

## Runbook

```bash
# CPU runtime (free): notebook cell mounts Drive and exports KAGGLE_USERNAME/KAGGLE_KEY from Colab secrets, then
git clone -b v9-12b https://github.com/raut7218/Gemma-4.git /content/Gemma-4
bash /content/Gemma-4/colab_eval/colab/cpu_prepare.sh      # ~1.5 h, resumable; ends with the gold verdict per repo
cp /content/Gemma-4/colab_eval/colab/gpu_start.sh /content/drive/MyDrive/gemma4-eval/

# switch to the G4 runtime (wipes /content), mount Drive again, then
bash /content/drive/MyDrive/gemma4-eval/gpu_start.sh       # restore + vLLM up with the model submission/ declares
bash /content/Gemma-4/colab_eval/colab/gpu_run.sh smoke    # 3 tasks; check report + vllm_stats before going on
RUN=v9-12b nohup bash /content/Gemma-4/colab_eval/colab/gpu_run.sh full 48 &   # workers: size to nproc and KV
# BUNDLE=bundles/<name> runs another bundle; one declaring another model needs serve_vllm.sh restarted with it
/content/hvenv/bin/python -m colab_eval.vllm_stats --every 60
```

Locally (no GPU): `python -m colab_eval.run_official --agent gold ...` checks the environment, and `tests/fake_llm.py` on
:8765 with `--base-url http://127.0.0.1:8765/v1` drives the real loop end to end.

## How it differs from the Kaggle scorer

- **Sandbox**: swegemma's `subprocess` backend instead of Docker, patched to match the image: per-task venvs see only
  the shared sandbox site (Dockerfile pip installs + newest py3.13 competition wheel of each package, the image's
  pytest/pytest-timeout kept), the scorer's `sandbox/setup.py --fast-path` runs per task, git identity as in the image,
  commands run in a private network namespace (`unshare -n -r`) with loopback up and 10.255.255.0/24 black-holed
  (requests' connect-timeout tests). No 4 GB / 2 vCPU limit per sandbox.
  swegemma rewrites `/workspace` only inside commands, so skill scripts get the real path from `SWE_WORKSPACE`. The
  first v8 run (2026-10-19) predates this: locate.py and check.py crashed on every call (`analyze` now flags it).
- **Packages**: the scorer's real wheel set is private (`gemma-4-developer-agent-metric-data`). The public wheels lack
  some test deps (dirty-equals, inline-snapshot, pytest-httpbin, typing-inspection, ...), which are added from PyPI under
  the competition pins, and give every task the newest version of everything, so `sandbox_deps.py` installs what each
  task's pyproject requires (e.g. starlette for older fastapi commits) and never the task's own repo. Tasks whose
  reference patch still fails here (`results/gold`) are reported as ENV_UNSOLVABLE and left out of the adjusted rate.
- **Model serving**: same checkpoint, vLLM version, parsers, `reasoning_config` and bf16 KV cache; one GPU instead of
  TP=4, `scheduler_reserve_full_isl` left on (admission only), many tasks in flight (the scorer runs one).
- **Budgets**: from the bundle's `eval_config.yaml`, except the time budget (30 min); compaction (interval 15, overlap 2,
  threshold 14,336 tokens, retention 5) and context caching as in HARNESS_README 7.2; litellm pinned to 1.104.3 (the
  newest that works with google-adk 1.36.1's `mcp<2`; the scorer's own litellm version is not published).
