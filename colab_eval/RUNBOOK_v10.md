# v10 runbook: harness freeze, LoRA, final submission (10 G4-hours)

The plan behind this runbook, and the numbers that motivate it, are in the "Gemma 4 LoRA Readiness" report. In short:
the 12 h scoring job is the binding constraint, the safe time cap at v8's token use is about 4 minutes, and every
10% fewer tokens per task is worth about 4 to 8 local solves. The G4 runs inference and training only; everything
else runs on a CPU runtime or locally.

| step | where | time | what it decides |
|---|---|---|---|
| 0. push branch v10 | local | 1 min | Colab clones the code from GitHub |
| 1. `cpu_prepare_v10.sh` | Colab CPU | 1-1.5 h | envs, patched vLLM wheel, validated data-external tasks |
| 2. session 1 | G4 | ~4.9 h | G1 (LoRA serves?), arms A/B/C, generation |
| 3. between sessions | CPU / local | ~1 h | G2 (freeze), the probe (G3), the SFT data |
| 4. session 2 | G4 | ~3.4 h | the trained LoRA and its arm L |
| 5. final | local | 15 min | G4 (does the LoRA ship), the two final submissions |

Reserve: about 1.7 G4-hours for a failure or a repeat run.

## 0. Push the code (local)

Colab clones `https://github.com/raut7218/Gemma-4.git`, branch `v10`. Ask Claude to commit and push it, or run
`git push origin v10` from `.claude/worktrees/gemma-run-colab`.

## 1. Colab CPU runtime (High-RAM if available)

```python
from google.colab import drive, userdata; drive.mount('/content/drive')
import os; os.environ['KAGGLE_API_TOKEN'] = userdata.get('KAGGLE_API')
!cd /content && rm -rf Gemma-4 && git clone -q -b v10 https://github.com/raut7218/Gemma-4.git
!bash /content/Gemma-4/colab_eval/colab/cpu_prepare_v10.sh 2>&1 | tail -60
```

It is resumable: run it again after a disconnect. Check at the end:
- `external_ok: N tasks`. Expect a few hundred of the 444 earlier-usable tasks; anything under ~200 means the
  per-repo environments did not restore, so look at `/content/work/ext_gold_0.log`.
- four `COMPILED OK` lines and `ok: the scorer's vLLM should load it` for the zero adapter.
- the v8 time-model table, which should match the report (7 min = 12.2-13.0 h).

## 2. G4 session 1 (about 4.9 h)

```python
from google.colab import drive, userdata; drive.mount('/content/drive')
import os; os.environ['KAGGLE_API_TOKEN'] = userdata.get('KAGGLE_API')
!EXT=1 bash /content/drive/MyDrive/gemma4-eval/gpu_start.sh            # ~5 min, ends with "vLLM ready"
!bash /content/Gemma-4/colab_eval/colab/preflight_lora.sh               # ~15 min: gate G1
!nohup bash /content/Gemma-4/colab_eval/colab/gpu_queue.sh 28 255 > /content/work/queue.log 2>&1 &
```

**G1, LoRA go/no-go** (`results/preflight/summary.json`): `g1_pass` is true when the zero adapter loads in the
patched vLLM, the KV cache still holds 4+ full contexts and single-stream decoding slows by 25% or less. If it fails,
the LoRA path stops: let the queue run (the arms still decide the harness) and use session 2's hours for repeat arms
instead of training.

Watch the queue (each command returns at once):
```python
!cat /content/results/queue_status.json
!tail -25 /content/results/B/progress.txt
!/content/hvenv/bin/python -m colab_eval.vllm_stats      # KV use, preemptions, prefix hits: lower WORKERS if KV > 95%
```
`gpu_queue.sh` stops claiming after 255 minutes; in-flight tasks then finish. It writes `analysis/timing.md` for A, B
and C and syncs everything to Drive `results/s1/`. Disconnect the G4 as soon as it prints the final tables.

## 3. Between sessions (CPU runtime or local)

Copy `results/s1/` from Drive (or work in a CPU Colab runtime that mounts it).

**G2, freeze** (fixed in advance). For each arm, read the "time-adjusted solves" at the arm's own safe cap:
```
python -m colab_eval.timing results/s1/B --gold results/gold --proxy results/v8 --compare results/s1/C --compare-rates 20,1500 \
    --compare results/s1/A --compare-rates 20,1500 --caps 3.75,4,4.25,4.5,5,5.5
```
- The frozen bundle is the better of B and C: more solves at its own largest safe cap, with ties within 2 going to
  the one with fewer tokens per task.
- A (the v9 prompt) replaces v10 only if it leads by 8 or more, because the generated data is v10's.
- C wins means `thinking_budget: 1024`. Its generated data is still usable: build_sft keeps the runs whose thoughts
  never went past 1,024 tokens, which are exact samples of the 1,024 policy.

**G3, the probe** (the one Kaggle submission before the LoRA). Take the cap that fits **11.5 h** in every
calibrated case for the frozen arm's own token use (the `timing` table above, `--target-hours 11.5`), build the
bundle and check it:
```
python -m colab_eval.variants submission probe --max-time-minutes CAP [--thinking-budget 1024]
uv run python -m harness.check_bundle probe && (cd probe && zip -qr ../probe.zip .)
kaggle competitions submit gemma-4-developer-agent -f probe.zip -m "v10 probe: CAP min, 35 calls"
python -m colab_eval.probe_timer --every 5          # leave it running until the job completes (up to 12 h)
```
When it completes, narrow the band with the measured run time and take the final cap (fits 10.5 h everywhere):
```
python -m colab_eval.timing results/s1/B --gold results/gold --proxy results/v8 --measured CAP,35,HOURS
```
Add the probe's outcome to `KAGGLE_OUTCOMES` in `colab_eval/timing.py` too, so later projections use it.

**SFT data** (needs no GPU):
```
python -m colab_eval.lora.build_sft --runs results/s1/G results/s1/G2 --out sft     # add --max-thinking-tokens 1024 if C was frozen
```
Check `manifest.json`: about 100+ tasks, `exact_spans` close to `spans`, and median calls and completion tokens
below arm B's. Copy `sft/` to Drive `gemma4-eval/sft/`.

## 4. G4 session 2 (about 3.4 h)

```python
from google.colab import drive, userdata; drive.mount('/content/drive')
import os; os.environ['KAGGLE_API_TOKEN'] = userdata.get('KAGGLE_API')
!git clone -q -b v10 https://github.com/raut7218/Gemma-4.git /content/Gemma-4
!FROZEN=submission nohup bash /content/Gemma-4/colab_eval/colab/lora_session.sh 135 28 60 > /content/work/lora.log 2>&1 &
!tail -5 /content/work/train.log      # loss per step; "speed ... steps fit the budget" after step 2
```
Use `FROZEN=C` if C was frozen. Training measures its speed on the first two steps and sizes the schedule to the
135-minute budget; adapters are saved to Drive `lora/` every 10 minutes. The script then serves the frozen bundle
with the adapter and runs arm L on the public tasks (results to Drive `results/s2/L`).

## 5. Final submissions (local)

**G4, LoRA acceptance**: L ships as the second final submission if it scores at least 2 more local solves than the
frozen arm at the final cap in the middle case, and no fewer at either end of the band:
```
python -m colab_eval.timing results/s2/L --gold results/gold --proxy results/v8 --compare results/s1/B --compare-rates 20,1500 --caps CAP
python -m colab_eval.variants submission final --max-time-minutes CAP [--thinking-budget 1024] --adapter main_lora=lora/main_lora
python -m colab_eval.lora.adapter check final/adapters/main_lora --bundle final
uv run python -m harness.check_bundle final && (cd final && zip -qr ../final.zip .)
```
Select two final submissions on Kaggle: the frozen bundle without the LoRA (the probe, or a re-submission at the
final cap) and, if G4 passed, `final.zip`. Kaggle normally scores the better of the two selected; confirm this on the
competition's rules page.

## If something fails

- vLLM does not start with the adapter: the gemma4 LoRA patch is missing (gpu_start prints a WARNING when the
  installed vllm is not the wheelhouse build). Restore from `cache/vllm-env-wh.tar`.
- Workers crash: `tail /content/work/worker_*.log`. Run `taskqueue requeue --queue /content/queue` to put the
  crashed items back, then start workers again with the same command (done items are kept).
- Out of memory in training: rerun `lora_session.sh` with `--keep-compressed` added to the train_lora call (4-bit
  weights decompressed per layer, slower), or lower `--max-len`.
