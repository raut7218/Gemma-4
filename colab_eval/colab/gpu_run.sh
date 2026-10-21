#!/usr/bin/env bash
# Runs the bundle through the official swegemma against the local vLLM (started by gpu_start.sh).
#   bash gpu_run.sh check [N]             N tasks (default 10) the way Kaggle runs them, to find out whether a bundle works:
#                                         colab_eval.sample picks them (stratified like the public set, env-solvable ones
#                                         when Drive has ext/public_ok.txt or results/gold; IDS="a b" picks them instead),
#                                         the model check and a gold run of the same tasks (environment check) run side by
#                                         side, then the bundle runs with its own time cap on the modelled 4x L4 clock
#                                         (L4_CLOCK, default 20,1500,0.65, see colab_eval/timing.py) and every request
#                                         logged. analysis/health.md says what went wrong. A failed model check stops the
#                                         run unless FORCE=1. RUN defaults to check_<commit>.
#   bash gpu_run.sh smoke [IDS...]        3 tasks (default: one small requests, rich and fastapi task), 3 workers
#   bash gpu_run.sh full [WORKERS]        every task in tasks.jsonl (default 32 workers); resumable
# Each worker is its own process running its shard one task at a time, as the scorer does: swegemma's tools are
# synchronous, so tasks sharing one event loop would all stall while any of them runs a command.
# Results in /content/results/$RUN (shards/K merged at the end), copied to Drive (MyDrive/gemma4-eval/results/$RUN)
# with progress.txt every 2 minutes and at the end, then colab_eval.analyze writes analysis/report.md and health.md,
# and $RUN.tgz is written next to it. RUN defaults to the mode and BUNDLE to submission. smoke and full lift the time
# cap to MAX_TIME (default 30 min) unless L4_CLOCK is set, which runs the bundle's own cap on the modelled clock.
set -euo pipefail
G=/content/drive/MyDrive/gemma4-eval
H=/content/hvenv/bin/python
B="${BUNDLE:-submission}"
MODE="${1:-smoke}"; shift || true
cd /content/Gemma-4
source colab_eval/colab/models.sh
if [ "$MODE" = check ]; then RUN="${RUN:-check_$(git rev-parse --short HEAD)}"; else RUN="${RUN:-$MODE}"; fi
OUT=/content/results/$RUN
# the bundle's model must be the one vLLM serves, or every request fails
curl -sf -m 10 http://127.0.0.1:8000/v1/models | grep -q "\"$MODEL_NAME\"" \
  || { echo "vLLM is not serving $MODEL_NAME (declared by $B); restart serve_vllm.sh with that bundle"; exit 2; }
mkdir -p $OUT/shards $OUT/worker_logs $G/results /content/work
CLOCK=(--max-time-minutes "${MAX_TIME:-30}")
if [ -n "${L4_CLOCK:-}" ]; then CLOCK=(--l4-clock "$L4_CLOCK" --real-time-minutes 30); fi
case "$MODE" in
  check)
    if [ -n "${IDS:-}" ]; then printf '%s\n' $IDS > $OUT/ids.txt
    else $H -m colab_eval.sample --n "${1:-10}" --pool $G/ext/public_ok.txt $G/results/gold /content/comp/tasks.jsonl > $OUT/ids.txt; fi
    W=$(wc -l < $OUT/ids.txt)
    echo "check $RUN ($B): $W tasks: $(tr '\n' ' ' < $OUT/ids.txt)"
    CLOCK=(--l4-clock "${L4_CLOCK:-20,1500,0.65}" --real-time-minutes 30)
    EXTRA=(--ids-file $OUT/ids.txt --log-requests)
    # the environment check runs the reference patches (CPU) while the model check probes the GPU
    GOLDPIDS=()
    for k in $(seq 0 $(( W - 1 ))); do
      $H -m colab_eval.run_official --agent gold --bundle "$B" --data /content/comp --sandbox-site /content/sbx \
        --results-dir $OUT/gold/shards/$k --ids-file $OUT/ids.txt --shard $k/$W --resume > /content/work/gold_${RUN}_$k.log 2>&1 &
      GOLDPIDS+=($!)
    done
    PROBE=0; $H -m colab_eval.model_check --bundle "$B" --out $OUT/probe.json || PROBE=$?
    wait "${GOLDPIDS[@]}" || true
    mkdir -p $OUT/gold && cat $OUT/gold/shards/*/task_results.jsonl > $OUT/gold/task_results.jsonl 2>/dev/null || true
    echo "gold: $(grep -c '"resolved": true' $OUT/gold/task_results.jsonl || true)/$W reference patches resolve (environment check)"
    if [ "$PROBE" != 0 ] && [ "${FORCE:-0}" != 1 ]; then echo "model check failed, see above (FORCE=1 runs anyway)"; exit 3; fi ;;
  smoke) W=3; IDS=("${@:-requests_7205 rich_3067 fastapi_14986}"); EXTRA=(--task-ids ${IDS[@]}) ;;
  full)  W="${1:-32}"; EXTRA=() ;;
  *) echo "usage: gpu_run.sh check [N] | smoke [IDS...] | full [WORKERS]"; exit 2 ;;
esac
[ "$W" -gt 0 ] || { echo "no tasks to run"; exit 2; }
# progress.txt: colab_eval.progress snapshot (done/resolved/ETA, in-flight tasks, warnings), readable on Drive mid-run
( while sleep 120; do $H -m colab_eval.progress $OUT --out $OUT/progress.txt > /dev/null 2>&1
  rsync -a --exclude '*.lock' $OUT $G/results/ 2>/dev/null; done ) & SYNC=$!
PIDS=()
for k in $(seq 0 $(( W - 1 ))); do
  $H -m colab_eval.run_official --bundle "$B" --data /content/comp \
    --sandbox-site /content/sbx --results-dir $OUT/shards/$k --concurrency 1 --shard $k/$W --resume \
    "${CLOCK[@]}" "${EXTRA[@]}" > /content/work/run_${RUN}_$k.log 2>&1 &
  PIDS+=($!)
done
wait "${PIDS[@]}" || true
kill $SYNC 2>/dev/null || true
# merge the shards into $OUT; a shard whose worker died is missing here, and health.md lists its tasks
for f in task_results.jsonl agent_phase.jsonl llm_calls.jsonl task_timing.jsonl; do cat $OUT/shards/*/$f > $OUT/$f 2>/dev/null || true; done
for d in traces patches logs test_outputs requests; do mkdir -p $OUT/$d; cp -r $OUT/shards/*/$d/. $OUT/$d/ 2>/dev/null || true; done
META=$(ls $OUT/shards/*/run_meta.json 2>/dev/null | head -1 || true)
if [ -n "$META" ]; then sed "s/\"concurrency\": 1/\"concurrency\": $W/" "$META" > $OUT/run_meta.json; fi
cp /content/work/run_${RUN}_*.log /content/work/gold_${RUN}_*.log $OUT/worker_logs/ 2>/dev/null || true
GOLD=()
if [ -s $OUT/gold/task_results.jsonl ]; then GOLD=(--gold $OUT/gold); elif [ -s $G/results/gold/task_results.jsonl ]; then GOLD=(--gold $G/results/gold); fi
DETOK=(); if [ "$MODE" = check ]; then DETOK=(--detokenize-url http://127.0.0.1:8000); fi
read DEC PRE <<< "$L4_TPS"
$H -m colab_eval.analyze $OUT "${GOLD[@]}" "${DETOK[@]}" --l4-decode-tps $DEC --l4-prefill-tps $PRE > /dev/null \
  || echo "WARNING: colab_eval.analyze failed; rerun it by hand (the run is still copied to Drive)"
if [ "$MODE" = check ] && [ -d $G/results/v8 ] && [ -s $OUT/run_meta.json ]; then
  CALLS=$($H -c "import json,sys; print(json.load(open(sys.argv[1]))['budget']['max_tool_calls'])" $OUT/run_meta.json || echo 28)
  $H -m colab_eval.timing $OUT "${GOLD[@]}" --proxy $G/results/v8 --max-calls $CALLS > $OUT/analysis/timing.md 2>&1 \
    || echo "WARNING: colab_eval.timing failed, see $OUT/analysis/timing.md"
fi
rsync -a --exclude '*.lock' $OUT $G/results/
tar -czf $G/results/$RUN.tgz --exclude=shards -C /content/results $RUN 2>/dev/null || echo "WARNING: could not write $G/results/$RUN.tgz"
# vLLM's torch.compile cache makes the next session's start a minute or two faster
[ -s $G/cache/vllm-compile-cache.tar ] || tar -cf $G/cache/vllm-compile-cache.tar -C /root/.cache vllm 2>/dev/null || true
echo "$(wc -l < $OUT/task_results.jsonl) tasks, $(grep -c '"resolved": true' $OUT/task_results.jsonl || true) resolved"
sed -n 1,40p $OUT/analysis/report.md 2>/dev/null || true
if [ "$MODE" = check ]; then sed -n 1,30p $OUT/analysis/health.md 2>/dev/null || true; fi
echo "results: $G/results/$RUN (and $RUN.tgz)"
