#!/usr/bin/env bash
# G4 session 1 after gpu_start.sh (EXT=1) and preflight_lora.sh: every task of the session through one shared queue
# (colab_eval.taskqueue), so the GPU never idles on a slow last shard.
#   bash gpu_queue.sh [WORKERS] [MINUTES]     defaults: 28 workers, stop claiming after 255 minutes
#   priority 0: arm A (bundles/v9-31b: v9's prompt on the 31B), B (submission = v10), C (v10 with thinking 1024),
#               each on the env-solvable public tasks (public_ok.txt), at a 6-minute cap on the modelled L4 clock, so
#               any cap up to 6 can be analysed afterwards (colab_eval.timing)
#   priority 1: G, v10 on the validated data-external tasks (external_ok.txt) at the 4.5-minute candidate cap, with
#               requests logged for training (run_official --log-requests); priority 2: G2, a second attempt of the
#               same tasks for whatever time is left
# L4_CLOCK (default 20,1500,0.65) prices the clock: assumed decode, prefill tok/s and the speed multiplier m.
# Results in /content/results/{A,B,C,G,G2}, synced to Drive (results/s1) every 2 minutes with progress.txt per arm;
# at the end analyze + timing per public arm, and vLLM's compile cache goes to Drive for the next session.
set -uo pipefail
W=${1:-28}; MIN=${2:-255}
G=/content/drive/MyDrive/gemma4-eval
Q=/content/queue
RES=/content/results
H=/content/hvenv/bin/python
CLOCK=${L4_CLOCK:-20,1500,0.65}
cd /content/Gemma-4
mkdir -p $RES /content/bundles /content/work
cp $G/ext/public_ok.txt $G/ext/external_ok.txt /content/ext/
$H -m colab_eval.variants submission /content/bundles/C --thinking-budget 1024 > /dev/null
python3 - "$CLOCK" > /content/work/arms.json <<'PY'
import json, sys
clock = sys.argv[1]
pub = dict(data='/content/comp', sandbox_site='/content/sbx', ids='/content/ext/public_ok.txt', priority=0,
           max_time_minutes=6.0, l4_clock=clock, real_time_minutes=30)
ext = dict(data='/content/ext', sandbox_site='/content/sbx', ids='/content/ext/external_ok.txt',
           site_map=json.load(open('/content/ext/site_map.json')), deps=False, setup_py='/content/comp/sandbox/setup.py',
           wheels='/content/ext/wheels', max_time_minutes=4.5, l4_clock=clock, real_time_minutes=30, log_requests=True)
arms = [dict(pub, name='A', bundle='/content/Gemma-4/bundles/v9-31b', results='/content/results/A'),
        dict(pub, name='B', bundle='/content/Gemma-4/submission', results='/content/results/B'),
        dict(pub, name='C', bundle='/content/bundles/C', results='/content/results/C'),
        dict(ext, name='G', bundle='/content/Gemma-4/submission', results='/content/results/G', priority=1),
        dict(ext, name='G2', bundle='/content/Gemma-4/submission', results='/content/results/G2', priority=2)]
print(json.dumps(arms, indent=1))
PY
$H -m colab_eval.taskqueue requeue --queue $Q 2>/dev/null
$H -m colab_eval.taskqueue build --queue $Q --arms /content/work/arms.json --priors $G/results/v8
( while sleep 120; do
    for a in A B C G G2; do [ -d $RES/$a ] && $H -m colab_eval.progress $RES/$a --out $RES/$a/progress.txt > /dev/null 2>&1; done
    $H -m colab_eval.taskqueue status --queue $Q > $RES/queue_status.json 2>/dev/null
    rsync -a --exclude '*.lock' $RES/ $G/results/s1/
  done ) & SYNC=$!
for k in $(seq 1 $W); do
  $H -m colab_eval.run_official --queue $Q --worker $k --deadline +$MIN > /content/work/worker_$k.log 2>&1 &
done
echo "$W workers started; claiming stops in $MIN minutes. Watch: cat $RES/queue_status.json; tail $RES/B/progress.txt"
wait $(jobs -p | grep -v "^$SYNC$") 2>/dev/null
kill $SYNC 2>/dev/null
for a in A B C; do
  [ -s $RES/$a/task_results.jsonl ] || continue
  $H -m colab_eval.analyze $RES/$a --gold $G/results/gold > /dev/null
  $H -m colab_eval.timing $RES/$a --gold $G/results/gold --proxy $G/results/v8 --json $RES/$a/analysis/timing.json \
    > $RES/$a/analysis/timing.md
done
$H -m colab_eval.taskqueue status --queue $Q > $RES/queue_status.json
rsync -a --exclude '*.lock' $RES/ $G/results/s1/
tar -cf $G/cache/vllm-compile-cache.tar -C /root/.cache vllm 2>/dev/null
cat $RES/queue_status.json
for a in A B C; do echo "== $a"; sed -n 1,12p $RES/$a/analysis/timing.md 2>/dev/null; done
