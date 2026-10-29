# LoRA trajectories: v14 at temperature 0.2 on the validated data-external tasks, unhinted first, then a path hint

Agreed 2026-10-29: `bundles/v14` (the submitted v5 prompt, 8192 output / 4096 thinking, 7 min / 28 calls on the
modelled L4 clock) with temperature 0.2, on the competition checkpoint (`gemma-4-31B-it-qat-w4a16-ct`), every request
logged with vLLM's token ids. About 7 G4-hours.

| arm | tasks | prompt |
|---|---|---|
| G | every validated data-external task (`ext/external_ok.txt`, 444 locally) | as the scorer builds it, no hint |
| R | G tasks that ended on a harness or LLM error, once | same as G |
| H | tasks with no usable trajectory after G/R (unresolved, no or several submits, a reply cut), once | plus `## Hints:` naming the files the reference patch changes (not its tests) |

`colab_eval.external triage` decides R and H every 2 minutes from the finished rows, with build_sft's own filters,
so H starts while G drains. In the training set (`build_sft`) a hinted attempt's hint tokens are cut out of every
prompt, which then equals the unhinted prompt token for token (checked on all 444 tasks with the real tokenizer);
an attempt whose thoughts or replies mention the hint is dropped, an unhinted attempt is preferred, and every row
carries `hinted` so the LoRA eval can compare with and without the hinted data.

## On the G4 runtime

```python
from google.colab import drive; drive.mount('/content/drive')
```
```python
!rm -rf /content/Gemma-4 && git clone -q -b traj-v14 https://github.com/raut7218/Gemma-4.git /content/Gemma-4
!EXT=1 BRANCH=traj-v14 BUNDLE=bundles/v14 bash /content/Gemma-4/colab_eval/colab/gpu_start.sh     # ~5-10 min
```
```python
!setsid nohup bash /content/Gemma-4/colab_eval/colab/gpu_gen.sh 20 400 > /content/work/gen.log 2>&1 < /dev/null &
```
Without `ext/external_ok.txt` on Drive the script first runs the reference and the empty patch on every task (it
overlaps with vLLM's start-up). Watch (each returns at once):
```python
!tail -5 /content/work/gen.log; cat /content/results/traj/triage.json; cat /content/results/traj/queue_status.json
!tail -12 /content/results/traj/G/progress.txt
!/content/hvenv/bin/python -m colab_eval.vllm_stats      # KV use, preemptions, prefix hits: fewer workers if KV > 95%
```
It stops claiming after 400 minutes; `GEN DONE` in `gen.log` means the training set is built and everything is on
Drive: `results/traj_v14/` (G, R, H with requests/, sft/, triage.json) and `results/traj_v14.tgz`.

## After

Download `traj_v14.tgz` into `results/colab/` and unpack it. `sft/manifest.json` has the counts per filter
(`attempts`), `tasks`, `hinted_tasks`. To rebuild with other filters:
```bash
uv run python -m colab_eval.lora.build_sft --runs results/colab/traj/G results/colab/traj/R results/colab/traj/H --out sft
```
