#!/usr/bin/env bash
# Runs the bundle through the official swegemma against the local vLLM (started by gpu_start.sh).
#   bash gpu_run.sh smoke [IDS...]        3 tasks (default: one small requests, rich and fastapi task), 3 workers
#   bash gpu_run.sh full [WORKERS]        every task in tasks.jsonl (default 16 workers); resumable
# Each worker is its own process running its shard one task at a time, as the scorer does: swegemma's tools are
# synchronous, so tasks sharing one event loop would all stall while any of them runs a command.
# Results in /content/results/$RUN (shards/K merged at the end), copied to Drive (MyDrive/gemma4-eval/results/$RUN)
# every 3 minutes and at the end, then colab_eval.analyze writes analysis/report.md. RUN defaults to the mode; BUNDLE
# (default submission) and MAX_TIME (default 30 min, lifted from the bundle's 7) can be overridden.
set -euo pipefail
G=/content/drive/MyDrive/gemma4-eval
MODE="${1:-smoke}"; shift || true
RUN="${RUN:-$MODE}"
OUT=/content/results/$RUN
cd /content/Gemma-4
case "$MODE" in
  smoke) W=3; IDS=("${@:-requests_7205 rich_3067 fastapi_14986}"); EXTRA=(--task-ids ${IDS[@]}) ;;
  full)  W="${1:-16}"; EXTRA=() ;;
  *) echo "usage: gpu_run.sh smoke [IDS...] | full [WORKERS]"; exit 2 ;;
esac
mkdir -p $OUT/shards $G/results
( while sleep 180; do rsync -a --exclude '*.lock' $OUT $G/results/ 2>/dev/null; done ) & SYNC=$!
for k in $(seq 0 $(( W - 1 ))); do
  /content/hvenv/bin/python -m colab_eval.run_official --bundle "${BUNDLE:-submission}" --data /content/comp \
    --sandbox-site /content/sbx --results-dir $OUT/shards/$k --concurrency 1 --shard $k/$W --resume \
    --max-time-minutes "${MAX_TIME:-30}" "${EXTRA[@]}" > /content/work/run_${RUN}_$k.log 2>&1 &
done
wait $(jobs -p | grep -v "^$SYNC$") 2>/dev/null || true
kill $SYNC 2>/dev/null || true
# merge the shards into $OUT
for f in task_results.jsonl agent_phase.jsonl llm_calls.jsonl task_timing.jsonl; do cat $OUT/shards/*/$f > $OUT/$f 2>/dev/null || true; done
for d in traces patches logs test_outputs; do mkdir -p $OUT/$d; cp -r $OUT/shards/*/$d/. $OUT/$d/ 2>/dev/null || true; done
cp $OUT/shards/0/run_meta.json $OUT/ && sed -i "s/\"concurrency\": 1/\"concurrency\": $W/" $OUT/run_meta.json
GOLD=(); [ -s $G/results/gold/task_results.jsonl ] && GOLD=(--gold $G/results/gold)
/content/hvenv/bin/python -m colab_eval.analyze $OUT "${GOLD[@]}" > /dev/null
rsync -a $OUT $G/results/
echo "$(wc -l < $OUT/task_results.jsonl) tasks, $(grep -c '"resolved": true' $OUT/task_results.jsonl) resolved"
sed -n 1,40p $OUT/analysis/report.md
