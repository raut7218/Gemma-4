#!/usr/bin/env bash
# Runs the bundle through the official swegemma against the local vLLM (started by gpu_start.sh).
#   bash gpu_run.sh smoke [IDS...]        3 tasks (default: one small requests, rich and fastapi task), 3 workers
#   bash gpu_run.sh full [WORKERS]        every task in tasks.jsonl (default 12 workers); resumable
# Results in /content/results/$RUN, copied to Drive (MyDrive/gemma4-eval/results/$RUN) every 3 minutes and at the end,
# then colab_eval.analyze writes analysis/report.md. RUN defaults to the mode; BUNDLE (default submission) and
# MAX_TIME (default 30 min, lifted from the bundle's 7 because the G4 runs many tasks at once) can be overridden.
set -euo pipefail
G=/content/drive/MyDrive/gemma4-eval
MODE="${1:-smoke}"; shift || true
RUN="${RUN:-$MODE}"
OUT=/content/results/$RUN
cd /content/Gemma-4
case "$MODE" in
  smoke) W=3; IDS=("${@:-requests_7205 rich_3067 fastapi_14986}"); EXTRA=(--task-ids ${IDS[@]}) ;;
  full)  W="${1:-12}"; EXTRA=(--resume) ;;
  *) echo "usage: gpu_run.sh smoke [IDS...] | full [WORKERS]"; exit 2 ;;
esac
mkdir -p $OUT $G/results
( while sleep 180; do rsync -a --exclude '*.lock' $OUT $G/results/ 2>/dev/null; done ) & SYNC=$!
/content/hvenv/bin/python -m colab_eval.run_official --bundle "${BUNDLE:-submission}" --data /content/comp \
  --sandbox-site /content/sbx --results-dir $OUT --concurrency $W --max-time-minutes "${MAX_TIME:-30}" "${EXTRA[@]}" \
  > /content/work/run_$RUN.log 2>&1 || echo "run_official exited with $?"
kill $SYNC 2>/dev/null || true
GOLD=(); [ -s $G/results/gold/task_results.jsonl ] && GOLD=(--gold $G/results/gold)
/content/hvenv/bin/python -m colab_eval.analyze $OUT "${GOLD[@]}" > /dev/null
rsync -a $OUT $G/results/
tail -1 /content/work/run_$RUN.log
sed -n 1,40p $OUT/analysis/report.md
