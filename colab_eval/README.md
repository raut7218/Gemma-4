# colab_eval: the official scorer on a Colab G4

Runs a submission bundle through the unmodified official `swegemma` 0.2.11 / `adk_submission` 0.2.13 / google-adk 1.36.1
against the competition checkpoint the bundle declares (`gemma-4-31b-it-qat-w4a16-ct` or `gemma-4-12b-it-qat-w4a16-ct`;
`colab/models.sh` maps it to the HF repo and the scorer's extra vLLM args) served by the scorer's vLLM 0.19.1 stack,
on all 129 public tasks, and reports where tasks are lost: tool calls, turns, context, compaction, truncated
outputs, submits, time. The local `harness/` re-implements the loop; this runs the real one.

Kaggle scores on **4x NVIDIA L4** (24 GB each, vLLM TP=4, `gpu_memory_utilization` 0.90, `max_model_len` 32768;
HARNESS_README section 3.1), one task after another, about 120 tasks in one 12 h job that fails as a whole when it
overruns. A G4 (one RTX PRO 6000, 96 GB) runs many tasks at once, so wall-clock time does not transfer: `--l4-clock`
runs the time budget on a modelled L4 clock (each LLM call re-priced from its tokens), so a task stops where the scorer
would stop it and the prompt shows the bundle's real cap. `timing.py` turns a run into time-adjusted solves per cap
and a projection of the 12 h job, calibrated on our own Kaggle submissions that finished or overran.

`gpu_run.sh check` is the quick test of a bundle before trusting it: 10 tasks as Kaggle runs them, a model check and a
gold run first, and `analysis/health.md` for what went wrong (blank thinking, malformed tool calls, nudges, harness
errors). The v11 procedure is in `RUNBOOK_v11.md`; the v10 workflow (harness freeze, trajectory generation, LoRA
training, 10 G4-hours) is in `RUNBOOK_v10.md`.

## Files

| file | what |
|---|---|
| `run_official.py` | wrapper around `swegemma.evaluate.Evaluator`: bundle's `eval_config.yaml`, scorer compaction/caching, Docker-like subprocess sandbox, `--agent gold/noop`, per-call LLM log; `--l4-clock` (modelled L4 time budget), `--log-requests` (local proxy that logs every request and response with vLLM's token ids), `--queue` (worker of a shared queue), `--phase agent/grade` (grade later on a CPU), `--sandbox-site-map` (per-repo environments) |
| `taskqueue.py` | shared queue for `run_official --queue`: one file per (arm, task), claimed by atomic rename, longest expected first, several bundles and datasets at once |
| `timing.py` | Kaggle-time model: time-adjusted solves per cap, the 12 h projection, the (L4 speed, per-task overhead) band our Kaggle outcomes allow, `--measured` from a timed probe |
| `probe_timer.py` | polls the Kaggle submissions list and bounds a submission's run time |
| `variants.py` | a bundle with a few settings changed (thinking budget, cap, model, an adapter), so arms never drift from `submission/` |
| `external.py` | data-external tasks for run_official: hints removed, per-repo environment map, gold/noop validation list |
| `bench_decode.py` | single-stream and concurrent decode speed of a served model or LoRA (the LoRA preflight) |
| `lora/adapter.py` | zero adapter for the preflight; checks an adapter against the scorer's vLLM rules and the 31B's shapes (`gemma-4-31b-it-qat-w4a16-ct.shapes.json`) |
| `lora/build_sft.py` | training sequences from `--log-requests` runs: vLLM's own token ids, segments between compactions, loss on the model's spans |
| `lora/train_lora.py` | LoRA (r 16) on the decompressed competition checkpoint inside a wall-clock budget; `--tiny` checks it on a CPU |
| `build_sandbox_env.py` | builds the shared sandbox site (`/content/sbx`) that stands in for the `swebench-sandbox` image |
| `sandbox_deps.py` | per-task step inside each sandbox: other task repos' wheels + the versions the task's pyproject pins |
| `analyze.py` | `results/<run>` -> `analysis/report.md`, `tasks.csv`, `tasks.json`, and `health.md`/`health.json`: per model call from the raw request log (blank or lost thinking, tool-call markup in the content, malformed arguments, unknown tools, cut outputs, text-only replies before submit), tool errors and nudges from the traces, harness errors (HARNESS_ERROR rows, worker tracebacks, tasks with no result) |
| `model_check.py` | probes the served model with the bundle's prompt and sampling before a run: thinking present, tool calls parsed, a multi-line edit's arguments intact; exit 1 when the server is unfit |
| `sample.py` | the tasks of a check run: stratified like the public set, evenly spaced, env-solvable when a gold run is given |
| `progress.py` | live view of a run: done/resolved/ETA, in-flight tasks, stalled workers, warnings |
| `vllm_stats.py` | live vLLM load (running/waiting, KV %, prefix hits, tok/s) for tuning `--concurrency` |
| `requirements-harness.txt`, `requirements-vllm.txt` | locks (vLLM side pinned to the scorer wheelhouse; `vllm-requirements.in` + `vllm-overrides.txt` regenerate it) |
| `colab/cpu_prepare.sh` | CPU runtime: data, envs, model, gold validation -> Drive `MyDrive/gemma4-eval/` |
| `colab/cpu_prepare_v10.sh` | CPU runtime: the scorer's patched vLLM wheel, the vLLM + training env, validated data-external tasks, bundle checks |
| `colab/gpu_start.sh` | G4 runtime: restore from Drive/PyPI/HF in parallel (`EXT=1`: data-external too), start vLLM (`ADAPTERS=`: with LoRA) |
| `colab/preflight_lora.sh` | LoRA go/no-go: a zero adapter's load, KV cost and decode slowdown |
| `colab/gpu_queue.sh` | session 1: arms A/B/C on the public tasks and trajectory generation through one queue |
| `colab/lora_session.sh` | session 2: time-budgeted LoRA training, then the LoRA arm |
| `colab/restart_vllm.sh`, `colab/wait_vllm.sh` | restart vLLM with or without adapters; wait until it answers |
| `colab/gpu_run.sh` | `check` (10 tasks as Kaggle runs them, with model and environment checks), `smoke` (3 tasks) or `full` run, Drive sync, analysis |
| `colab/models.sh` | model declared by `$BUNDLE` -> HF repo, vLLM extra args (12B: `--hf-overrides`), Drive cache dir, L4 speed estimate |
| `findings_v8.md` | what the first v8 run (31B) showed |

## Runbook

```bash
# CPU runtime (free): notebook cell mounts Drive and exports KAGGLE_USERNAME/KAGGLE_KEY from Colab secrets, then
git clone -b v11 https://github.com/raut7218/Gemma-4.git /content/Gemma-4
bash /content/Gemma-4/colab_eval/colab/cpu_prepare.sh      # ~1.5 h, resumable; ends with the gold verdict per repo

# switch to the G4 runtime (wipes /content), mount Drive again, clone the branch again, then
BRANCH=v11 bash /content/Gemma-4/colab_eval/colab/gpu_start.sh   # restore + vLLM up with the model submission/ declares
bash /content/Gemma-4/colab_eval/colab/gpu_run.sh check    # 10 tasks; read analysis/health.md before going on
# BUNDLE=bundles/<name> runs another bundle; one declaring another model needs serve_vllm.sh restarted with it
```

Start the full run from a **Python** cell, so the cell returns at once and the notebook stays free for watching it
(a `!... &` shell line keeps the cell, and with it the kernel, busy until the job exits):

```python
import subprocess
subprocess.Popen('cd /content/Gemma-4 && RUN=v11_full L4_CLOCK=20,1500,0.65 bash colab_eval/colab/gpu_run.sh full 32 > /content/work/gpu_run_v11_full.log 2>&1',
                 shell=True, start_new_session=True, stdin=subprocess.DEVNULL)   # workers: size to KV (16 for the 12B)
```

### Watching a run

```bash
cd /content/Gemma-4
/content/hvenv/bin/python -m colab_eval.progress /content/results/v9-12b               # snapshot (cell or Terminal)
/content/hvenv/bin/python -m colab_eval.progress /content/results/v9-12b --every 60    # live, in Colab's Terminal
/content/hvenv/bin/python -m colab_eval.progress /content/results/v9-12b --task <id>   # last 40 lines of one task
tail -f /content/results/v9-12b/shards/*/logs/<id>.log                                 # one task, live
/content/hvenv/bin/python -m colab_eval.vllm_stats --every 60
```

`progress` shows done/resolved/ETA and outcomes so far, each worker's in-flight task (minutes, tool calls, LLM calls,
prompt tokens, errors, last tool; STALLED after 10 min without log output), and WARN lines for LLM errors, outputs cut
at max_tokens, skill scripts that keep raising tracebacks, and errors in the worker logs (`/content/work/run_<RUN>_<k>.log`).
swegemma writes each task's log line by line, so all of this is current. `gpu_run.sh` also writes it to `progress.txt`,
which reaches `MyDrive/gemma4-eval/results/<RUN>/` every 2 minutes with the shards' logs. Colab's Terminal works while a
cell is running.

Locally (no GPU): `python -m colab_eval.run_official --agent gold ...` checks the environment, and `tests/fake_llm.py` on
:8765 with `--base-url http://127.0.0.1:8765/v1` drives the real loop end to end.

## How it differs from the Kaggle scorer

- **Sandbox**: swegemma's `subprocess` backend instead of Docker, patched to match the image: per-task venvs see only
  the shared sandbox site (Dockerfile pip installs + newest py3.13 competition wheel of each package, the image's
  pytest/pytest-timeout kept), the scorer's `sandbox/setup.py --fast-path` runs per task, git identity as in the image,
  commands run in a private network namespace (`unshare -n -r`) with loopback up and 10.255.255.0/24 black-holed
  (requests' connect-timeout tests). No 4 GB / 2 vCPU limit per sandbox.
- **12B weights**: the HF export of `gemma-4-12b-it-qat-w4a16-ct` (`gemma4_unified`, 10,264,229,896 bytes) is not
  the file Kaggle Models serves to the scorer (a 10,278,821,003-byte export), and vLLM 0.19.1's text-only loader does
  not know its `model.vision_embedder.*` tensors. `serve_vllm.sh` adds that prefix to the loader's skip list (it
  already skips `vision_tower.`/`embed_vision.`), so the same text weights load; vision weights are unused anyway.
- **vLLM build**: the scorer's wheelhouse ships a patched `vllm-0.19.1` (Gemma 4 LoRA support in
  `lora/model_manager.py`, `models/gemma4.py`, `gemma4_mm.py`, 2026-10-13); `gpu_start.sh` installs it from Drive
  (`cpu_prepare_v10.sh` fetches it) and warns when the installed build is not that one. Earlier runs used PyPI's build.
- **data-external**: tasks of other repos (training data only) run with their own Python 3.9 environments
  (`--sandbox-site-map`, per-task venvs made by that interpreter), no competition wheels, the scorer's `setup.py`, and
  `hints_text` emptied (the competition's tasks have no hints).
- swegemma rewrites `/workspace` only inside commands, so skill scripts get the real path from `SWE_WORKSPACE`. The
  first v8 run (2026-10-19) predates this: locate.py and check.py crashed on every call (`analyze` now flags it).
- **Packages**: the scorer's real wheel set is private (`gemma-4-developer-agent-metric-data`). The public wheels lack
  some test deps (dirty-equals, inline-snapshot, pytest-httpbin, typing-inspection, ...), which are added from PyPI under
  the competition pins, and give every task the newest version of everything, so `sandbox_deps.py` installs what each
  task's pyproject requires (e.g. starlette for older fastapi commits) and never the task's own repo. Tasks whose
  reference patch still fails here (`results/gold`) are reported as ENV_UNSOLVABLE and left out of the adjusted rate.
- **Era pins** (`era_pins.json`, `era_pins.py`): the newest-of-everything site made the reference patch fail on 18 of the
  129 tasks. For 12 of them the cause is a package version (rich: Pygments' colours, pinned to the task's `poetry.lock`;
  requests: werkzeug/flask 3.0.x and urllib3 2.2.2 for older snapshots; fastapi: pydantic 2.12 + starlette 0.50, and
  pydantic 1.10.24 for fastapi_14186 whose required test only runs under pydantic v1). `sandbox_deps.py` installs those
  wheels (`era_wheels/`, fetched by `cpu_prepare.sh`) for the listed snapshot HEADs only; every other task is unchanged.
  The other 6 cannot be fixed by a package and fail the same way under the scorer's own commands: fastapi_15745/15763/15785
  (new tests are `@pytest.mark.anyio` but the verification command passes `-p no:anyio`), rich_3486 (its required test is
  skipped on Python >= 3.11), rich_3472 (Python 3.13's AttributeError text), and the mtls half of requests_6757 (the
  repo's client certificate expired on 2026-03-13).
- **Model serving**: same checkpoint, vLLM version, parsers, `reasoning_config` and bf16 KV cache; one GPU instead of
  TP=4, `scheduler_reserve_full_isl` left on (admission only), many tasks in flight (the scorer runs one).
- **Budgets**: from the bundle's `eval_config.yaml`, except the time budget, which runs on the modelled L4 clock with
  `--l4-clock` (or is lifted with `--max-time-minutes`); an LLM call in flight when the cap passes finishes here, where
  the scorer's `asyncio.timeout` cancels it, but tool calls after the cap fail in both, so the graded diff is the same;
  compaction (interval 15, overlap 2,
  threshold 14,336 tokens, retention 5) and context caching as in HARNESS_README 7.2; litellm pinned to 1.104.3 (the
  newest that works with google-adk 1.36.1's `mcp<2`; the scorer's own litellm version is not published).
