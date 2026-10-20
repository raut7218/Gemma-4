#!/usr/bin/env bash
# G4 session 2: train the LoRA inside a time budget, then run the frozen bundle with it (arm L) on the same public
# tasks as session 1's arms, with the LoRA's decode slowdown (preflight lora_factor) charged to the L4 clock.
#   bash lora_session.sh [TRAIN_MINUTES] [WORKERS] [EVAL_MINUTES]      defaults: 135, 28, 60
# Needs on Drive: sft/sft.jsonl (colab_eval.lora.build_sft, built on CPU after session 1), results/preflight/
# summary.json, and the frozen bundle choice: FROZEN=submission (arm B, default) or FROZEN=C (thinking 1024).
# Restores like gpu_start.sh but starts vLLM only after training (both need the GPU). Adapter checkpoints go to Drive
# (lora/) every 10 minutes; the final adapter is checked against the vLLM rules before it is served.
set -uo pipefail
TRAIN=${1:-135}; W=${2:-28}; EVAL=${3:-60}
G=/content/drive/MyDrive/gemma4-eval
R=/content/Gemma-4/colab_eval
RES=/content/results
H=/content/hvenv/bin/python
CLOCK=${L4_CLOCK:-20,1500,0.65}
SKIP_SERVE=1 bash $G/gpu_start.sh || exit 1
cd /content/Gemma-4
mkdir -p /content/sft /content/lora /content/bundles /content/ext $RES
cp $G/sft/sft.jsonl $G/sft/manifest.json /content/sft/ && cp $G/ext/public_ok.txt /content/ext/ || { echo "sft data missing on Drive"; exit 1; }

( while sleep 600; do rsync -a /content/lora/ $G/lora/; done ) & SYNC=$!
/content/vllm-env/bin/python -m colab_eval.lora.train_lora --model /content/model --data /content/sft/sft.jsonl \
  --out /content/lora --budget-min $TRAIN 2>&1 | tee /content/work/train.log
kill $SYNC 2>/dev/null; rsync -a /content/lora/ $G/lora/
[ -s /content/lora/main_lora/adapter_model.safetensors ] || { echo "no adapter was saved"; exit 1; }

case "${FROZEN:-submission}" in
  C) $H -m colab_eval.variants submission /content/bundles/frozen --thinking-budget 1024 > /dev/null ;;
  *) $H -m colab_eval.variants submission /content/bundles/frozen > /dev/null ;;
esac
$H -m colab_eval.variants /content/bundles/frozen /content/bundles/L --adapter main_lora=/content/lora/main_lora
$H -m colab_eval.lora.adapter check /content/bundles/L/adapters/main_lora --bundle /content/bundles/L || exit 1
FACTOR=$(python3 -c "import json; print(json.load(open('$G/results/preflight/summary.json')).get('lora_factor') or 1.15)")
ADAPTERS=main_lora=/content/bundles/L/adapters/main_lora bash $R/colab/restart_vllm.sh || exit 1
python3 - "$CLOCK,$FACTOR" > /content/work/arms_l.json <<'PY'
import json, sys
print(json.dumps([dict(name='L', bundle='/content/bundles/L', data='/content/comp', sandbox_site='/content/sbx',
                       ids='/content/ext/public_ok.txt', results='/content/results/L', max_time_minutes=6.0,
                       l4_clock=sys.argv[1], real_time_minutes=30)], indent=1))
PY
$H -m colab_eval.taskqueue build --queue /content/queue_l --arms /content/work/arms_l.json --priors $G/results/s1/B
( while sleep 120; do $H -m colab_eval.progress $RES/L --out $RES/L/progress.txt > /dev/null 2>&1
    rsync -a --exclude '*.lock' $RES/L $G/results/s2/; done ) & SYNC=$!
for k in $(seq 1 $W); do
  $H -m colab_eval.run_official --queue /content/queue_l --worker $k --deadline +$EVAL > /content/work/lworker_$k.log 2>&1 &
done
wait $(jobs -p | grep -v "^$SYNC$") 2>/dev/null
kill $SYNC 2>/dev/null
$H -m colab_eval.analyze $RES/L --gold $G/results/gold > /dev/null
$H -m colab_eval.timing $RES/L --gold $G/results/gold --proxy $G/results/v8 --json $RES/L/analysis/timing.json > $RES/L/analysis/timing.md
rsync -a --exclude '*.lock' $RES/L $G/results/s2/
sed -n 1,14p $RES/L/analysis/timing.md
