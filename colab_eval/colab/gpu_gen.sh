#!/usr/bin/env bash
# LoRA training trajectories on the G4, after `EXT=1 BUNDLE=bundles/v14 gpu_start.sh` (restores data-external and its
# per-repo environments, serves the bundle's checkpoint):
#   setsid nohup bash gpu_gen.sh [WORKERS] [MINUTES] > /content/work/gen.log 2>&1 &
# defaults: 20 workers, stop claiming after 400 minutes (in-flight tasks then finish, at most 30 real minutes each).
# Bundle: bundles/v14 at temperature 0.2 (colab_eval.variants), on v14's 7 min / 28 calls, the time on the modelled
# 4x L4 clock (L4_CLOCK, default 20,1500,0.65), every request logged with vLLM's token ids for build_sft.
# One shared queue (colab_eval.taskqueue), three arms:
#   G  priority 0  every validated data-external task (ext/external_ok.txt), no hint
#   R  priority 0  one unhinted retry of a G task that ended on a harness or LLM error
#   H  priority 1  one attempt with a path hint (external hints: the files the reference patch changes) of every task
#                  that left no usable trajectory (build_sft's filters: resolved, one submit, no reply cut)
# A controller triages finished rows every 2 minutes and queues R and H items as G's results come in, so H fills
# the GPU while G drains instead of waiting for it. Workers restart while the queue is open.
# external_ok.txt is made here (reference and empty patch on every task) if Drive has none yet; it overlaps with
# vLLM's start-up. Everything is synced to Drive results/traj_v14/ every 2 minutes; at the end build_sft writes
# the training set to sft/ there and the whole run goes to Drive as traj_v14.tgz.
set -uo pipefail
W=${1:-20}; MIN=${2:-400}
G=/content/drive/MyDrive/gemma4-eval
Q=/content/queue_gen
RES=/content/results/traj
DR=$G/results/traj_v14
EXT=/content/ext
H=/content/hvenv/bin/python
CLOCK=${L4_CLOCK:-20,1500,0.65}
P=${P:-$(( $(nproc) > 40 ? 40 : $(nproc) ))}
t0=$(date +%s); el() { echo "[$(date -u +%H:%M:%S) +$(( ($(date +%s) - t0) / 60 ))m] $*"; }
cd /content/Gemma-4
mkdir -p $RES /content/bundles /content/work $DR $G/ext
[ -s $EXT/tasks.jsonl ] || { el "FATAL: $EXT/tasks.jsonl missing: run gpu_start.sh with EXT=1"; exit 1; }

# 1. validated tasks: the reference patch resolves and an empty patch does not, under this exact setup
if [ ! -s $G/ext/external_ok.txt ]; then
  el "no ext/external_ok.txt on Drive: validating $(wc -l < $EXT/tasks.jsonl) tasks with $P processes"
  for agent in gold noop; do
    for k in $(seq 0 $(( P - 1 ))); do
      $H -m colab_eval.run_official --agent $agent --bundle submission --data $EXT --sandbox-site /content/sbx \
        --sandbox-site-map $EXT/site_map.json --no-deps --setup-py /content/comp/sandbox/setup.py --wheels $EXT/wheels \
        --results-dir /content/results/ext_$agent/shards/$k --shard $k/$P --resume > /content/work/ext_${agent}_$k.log 2>&1 &
    done
    wait
    cat /content/results/ext_$agent/shards/*/task_results.jsonl > /content/results/ext_$agent/task_results.jsonl
    rsync -a /content/results/ext_$agent $G/results/
    el "ext $agent: $(grep -c '"resolved": true' /content/results/ext_$agent/task_results.jsonl) resolved of $(wc -l < /content/results/ext_$agent/task_results.jsonl)"
  done
  $H -m colab_eval.external validate --gold /content/results/ext_gold --noop /content/results/ext_noop --out $G/ext/external_ok.txt
fi
cp $G/ext/external_ok.txt $EXT/
el "tasks: $(wc -l < $EXT/external_ok.txt) validated"

# 2. the bundle, the hinted task file, the arms
$H -m colab_eval.variants bundles/v14 /content/bundles/v14-t02 --temperature 0.2 > /dev/null || { el "FATAL: variants"; exit 1; }
grep -q '^temperature: 0.2' /content/bundles/v14-t02/configs/sampling.yaml || { el "FATAL: temperature not set"; exit 1; }
$H -m colab_eval.external hints --tasks $EXT/tasks.jsonl --out $EXT/tasks_hint.jsonl | head -c 300; echo
touch $EXT/R_ids.txt $EXT/H_ids.txt
python3 - "$CLOCK" > /content/work/gen_arms.json <<'PY'
import json, sys
ext = dict(data='/content/ext', sandbox_site='/content/sbx', site_map=json.load(open('/content/ext/site_map.json')),
           deps=False, setup_py='/content/comp/sandbox/setup.py', wheels='/content/ext/wheels',
           bundle='/content/bundles/v14-t02', max_time_minutes=7.0, l4_clock=sys.argv[1], real_time_minutes=30,
           log_requests=True)
print(json.dumps([dict(ext, name='G', ids='/content/ext/external_ok.txt', results='/content/results/traj/G', priority=0),
                  dict(ext, name='R', ids='/content/ext/R_ids.txt', results='/content/results/traj/R', priority=0),
                  dict(ext, name='H', ids='/content/ext/H_ids.txt', tasks_file='/content/ext/tasks_hint.jsonl',
                       results='/content/results/traj/H', priority=1)], indent=1))
PY
rm -f $Q/closed
$H -m colab_eval.taskqueue requeue --queue $Q 2>/dev/null
$H -m colab_eval.taskqueue build --queue $Q --arms /content/work/gen_arms.json

# 3. vLLM must be up before the workers start
for i in $(seq 360); do curl -sf localhost:8000/v1/models > /dev/null && break; sleep 10; done
curl -sf localhost:8000/v1/models > /dev/null || { el "FATAL: vLLM not serving after 60 min; see /content/work/serve*.log"; exit 1; }
el "vLLM up; starting $W workers, claiming stops in $MIN minutes"
DEADLINE=$(( $(date +%s) + MIN * 60 ))

queued() { ls $Q/todo $Q/doing 2>/dev/null | grep -c -- "-$1-"; }
push_drive() {
  for a in G R H; do [ -s $RES/$a/task_results.jsonl ] && $H -m colab_eval.progress $RES/$a --out $RES/$a/progress.txt > /dev/null 2>&1; done
  $H -m colab_eval.taskqueue status --queue $Q > $RES/queue_status.json 2>/dev/null
  cp $EXT/R_ids.txt $EXT/H_ids.txt $EXT/external_ok.txt $RES/ 2>/dev/null
  rsync -a --exclude '*.lock' $RES/ $DR/
}

# controller: triage finished rows into R and H; the queue closes once G and R are drained and triaged
( while :; do
    sleep 120
    tri=$($H -m colab_eval.external triage --base $RES/G --retry $RES/R --retry-ids $EXT/R_ids.txt --hint-ids $EXT/H_ids.txt 2>>/content/work/triage.err)
    echo "$tri" > $RES/triage.json
    $H -m colab_eval.taskqueue build --queue $Q --arms /content/work/gen_arms.json > /dev/null
    push_drive
    gr=$(( $(queued G) + $(queued R) ))
    if [ "$gr" = 0 ] && [ ! -e $Q/closed ]; then touch $Q/closed; el "G and R drained: queue closed ($tri)"; fi
    [ $(date +%s) -ge $DEADLINE ] && touch $Q/closed
    [ -e $Q/closed ] && [ -e /content/work/gen.workers_done ] && break
  done ) & CTL=$!

rm -f /content/work/gen.workers_done
for k in $(seq 1 $W); do
  ( while [ $(date +%s) -lt $DEADLINE ]; do
      $H -m colab_eval.run_official --queue $Q --worker $k --deadline $DEADLINE >> /content/work/gen_worker_$k.log 2>&1
      [ -e $Q/closed ] && [ -z "$(ls $Q/todo)" ] && break
      sleep 30
    done ) &
done
wait $(jobs -p | grep -v "^$CTL$") 2>/dev/null
touch /content/work/gen.workers_done
wait $CTL 2>/dev/null
el "workers done"

# 4. final triage, the training set, everything to Drive
$H -m colab_eval.external triage --base $RES/G --retry $RES/R --retry-ids $EXT/R_ids.txt --hint-ids $EXT/H_ids.txt > $RES/triage.json
$H -m colab_eval.lora.build_sft --runs $RES/G $RES/R $RES/H --out $RES/sft > $RES/sft_summary.json 2>&1
push_drive
tar -czf /content/traj_v14.tgz -C /content/results traj && cp /content/traj_v14.tgz $G/results/traj_v14.tgz
el "saved to Drive: results/traj_v14/ and results/traj_v14.tgz ($(du -sh /content/traj_v14.tgz | cut -f1))"
for a in G R H; do echo "== $a: $(grep -c '"resolved": true' $RES/$a/task_results.jsonl 2>/dev/null || echo 0) resolved of $(wc -l < $RES/$a/task_results.jsonl 2>/dev/null || echo 0)"; done
cat $RES/triage.json $RES/sft_summary.json
el "GEN DONE"
