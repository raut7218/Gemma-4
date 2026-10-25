# v5 arms: four full runs on the G4 to pick what ships after v5

v5 (`bundles/v5`, LB 0.18 = 11/58) is our best LB score, but every later bundle (v5.1 8, v6 9, v10 7) is inside the
run-to-run noise of one draw: identical public files score up to 6 tasks apart (pooled SD 1.56 tasks per draw, the
most-run public config averages 10.0/58 over 10 draws). So arms are ranked here on the 129 public tasks, paired task
by task, with each bundle's own 8-minute cap on the modelled 4x L4 clock.

| arm | bundle | what differs from v5 |
|---|---|---|
| A | `bundles/v5` | nothing (ba637f9 `submission/`) |
| B | `bundles/v5-s8k` (made on the G4, below) | `max_output_tokens` 8192, `thinking_budget` 4096: the setting every public 0.22-0.24 bundle uses |
| C | `bundles/pub024` | the public 0.24 notebook's files (honghanhhh), unchanged: their prompt, temperature 0.2, no top_k, graph tools declared |
| D | `bundles/v5.1` | v5.1 (LB 0.13, one draw): failure-path fixes only (exact names/exports, 1-3 line `old_string`, heredoc after a malformed `edit_file`, no git checkout/stash/reset/restore) |

## On the G4 runtime

```python
from google.colab import drive; drive.mount('/content/drive')
```
```python
!rm -rf /content/Gemma-4 && git clone -q -b v5-arms https://github.com/raut7218/Gemma-4.git /content/Gemma-4
!BRANCH=v5-arms BUNDLE=bundles/v5 bash /content/Gemma-4/colab_eval/colab/gpu_start.sh     # ~5-10 min
```
All four arms declare the same checkpoint, so one vLLM serves them all. Arm B is a settings variant (not committed):
```python
!cd /content/Gemma-4 && /content/hvenv/bin/python -m colab_eval.variants bundles/v5 bundles/v5-s8k --thinking-budget 4096 --max-output-tokens 8192
```
Then one cell per arm (about 1-1.5 h each; BUNDLE must be relative to the repo, an absolute path exits 2):
```python
!cd /content/Gemma-4 && L4_CLOCK=20,1500,0.65 BUNDLE=bundles/v5      RUN=full_v5      bash colab_eval/colab/gpu_run.sh full 32
!cd /content/Gemma-4 && L4_CLOCK=20,1500,0.65 BUNDLE=bundles/v5-s8k  RUN=full_v5-s8k  bash colab_eval/colab/gpu_run.sh full 32
!cd /content/Gemma-4 && L4_CLOCK=20,1500,0.65 BUNDLE=bundles/pub024  RUN=full_pub024  bash colab_eval/colab/gpu_run.sh full 32
!cd /content/Gemma-4 && L4_CLOCK=20,1500,0.65 BUNDLE=bundles/v5.1    RUN=full_v5.1    bash colab_eval/colab/gpu_run.sh full 32
```
Run A first: it is the base every other arm is compared with. A run is resumable (same RUN) if the runtime drops.

## Reading the results

Download `MyDrive/gemma4-eval/results/full_<arm>.tgz` for each arm into `results/colab/`, then:
```bash
uv run python -m colab_eval.compare results/colab/full_v5 results/colab/full_v5-s8k results/colab/full_pub024 results/colab/full_v5.1 --gold results/colab/gold
uv run python -m colab_eval.timing results/colab/full_<arm> --gold results/colab/gold --max-calls 28 --caps 8
```
`compare` counts only tasks the gold patch resolves and prints wins/losses against A with the exact sign test;
`timing` projects the 12 h Kaggle job from the arm's own token use.

## Ship rule (agreed before the runs)

- Ship the arm with the most paired wins over A whose 12 h projection is no worse than A's. A tie or a small
  difference (sign test p well above 0.1) keeps v5: an unproven change is not worth the risk of a worse draw.
- If C wins, the base becomes C's files plus our failure-path fixes, each fix tested as its own arm first.
- Submit the shipped files twice (two final selections; ties go to the earlier submission).
