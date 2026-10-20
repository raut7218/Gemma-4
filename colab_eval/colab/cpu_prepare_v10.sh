#!/usr/bin/env bash
# CPU runtime, after cpu_prepare.sh (competition data, harness and sandbox envs, model, gold run already on Drive):
# everything the v10 G4 sessions need, cached on Drive so a G4 session only restores and runs. Resumable: each step
# skips what Drive already has. About 1-1.5 h on a High-RAM CPU runtime, mostly step 4.
#   KAGGLE_API_TOKEN=... bash cpu_prepare_v10.sh          (P=<processes> for step 4, default nproc)
#   1. the scorer's patched vLLM wheel from the Kaggle wheelhouse -> cache/wheels/ (+ the hash gpu_start.sh checks)
#   2. vllm-env-wh.tar: the PyPI lock with that wheel, plus peft and accelerate (LoRA training), import-checked here;
#      gpu_start.sh installs the same from PyPI and falls back to this tar
#   3. ext/public_ok.txt: the public tasks whose reference patch passes in this sandbox (from results/gold)
#   4. data-external: snapshots and per-repo envs from the gen-trajectories cache (MyDrive/gemma4/cache), hints
#      removed, then the reference patch and an empty patch through run_official on every task, in parallel ->
#      ext/external_ok.txt (gold resolves, empty does not), results/ext_gold, results/ext_noop
#   5. bundle checks: check_bundle and the real adk_submission compiler on v10, v9-31b, the thinking-1024 variant and
#      a zero-adapter variant; the v8 time model report; gpu_start.sh copied to Drive
set -euo pipefail
G=/content/drive/MyDrive/gemma4-eval
OLD=/content/drive/MyDrive/gemma4/cache
BRANCH=${BRANCH:-v10}
P=${P:-$(nproc)}
WHEEL=vllm-0.19.1-cp38-abi3-manylinux_2_31_x86_64.whl
mkdir -p $G/cache/wheels $G/ext $G/results /content/work
t0=$(date +%s); el() { echo "[$(( $(date +%s) - t0 ))s] $*"; }
cd /content
[ -d Gemma-4 ] || git clone -q -b $BRANCH https://github.com/raut7218/Gemma-4.git
(cd Gemma-4 && git fetch -q origin $BRANCH && git checkout -q -B $BRANCH FETCH_HEAD)
R=/content/Gemma-4/colab_eval
command -v uv >/dev/null || pip install -q uv
pip install -q kaggle
uv python install -q 3.13.15
[ -x /content/hvenv/bin/python ] || tar -xf $G/cache/hvenv.tar -C /content
[ -x /content/sbx/bin/python3 ] || tar -xf $G/cache/sbx.tar -C /content
[ -s /content/comp/tasks.jsonl ] || bash $R/colab/restore_comp.sh
H=/content/hvenv/bin/python
cp $R/colab/gpu_start.sh $G/gpu_start.sh

# 1. the patched vLLM wheel
if [ ! -s $G/cache/wheels/$WHEEL ]; then
  mkdir -p /content/wh && kaggle datasets download metric/gemma-4-developer-agent-wheelhouse -f $WHEEL -p /content/wh -q
  [ -f /content/wh/$WHEEL ] || (cd /content/wh && unzip -q -o $WHEEL.zip)
  cp /content/wh/$WHEEL $G/cache/wheels/
fi
if [ ! -s $G/cache/wheels/vllm-wh.sha256 ]; then
  unzip -p $G/cache/wheels/$WHEEL vllm/lora/model_manager.py | sha256sum | cut -d' ' -f1 > $G/cache/wheels/vllm-wh.sha256
fi
el "wheelhouse vllm: $(unzip -l $G/cache/wheels/$WHEEL | grep -c 'models/gemma4') gemma4 files, model_manager sha $(cut -c1-12 $G/cache/wheels/vllm-wh.sha256)"

# 2. the vLLM + training env (fallback tar)
if [ ! -s $G/cache/vllm-env-wh.tar ]; then
  grep -v '^vllm==' $R/requirements-vllm.txt > /content/work/req-no-vllm.txt
  uv venv -q --clear --python 3.12 /content/vllm-env
  uv pip install -q --no-deps --python /content/vllm-env/bin/python -r /content/work/req-no-vllm.txt \
    $G/cache/wheels/$WHEEL peft==0.21.2 accelerate==1.15.0
  /content/vllm-env/bin/python -c "import vllm, peft, accelerate, transformers, compressed_tensors as ct; print('vllm', vllm.__version__, 'peft', peft.__version__, 'transformers', transformers.__version__, 'compressed-tensors', ct.__version__)"
  /content/vllm-env/bin/python -c "from vllm.model_executor.models.registry import ModelRegistry; assert 'Gemma4ForConditionalGeneration' in ModelRegistry.get_supported_archs()"
  tar -cf $G/cache/vllm-env-wh.tar -C /content vllm-env
fi
el "vllm-env-wh cached"

# 3. the env-solvable public tasks
python3 - <<'PY'
import json
rows = [json.loads(l) for l in open('/content/drive/MyDrive/gemma4-eval/results/gold/task_results.jsonl') if l.strip()]
ok = sorted(r['instance_id'] for r in rows if r.get('resolved'))
open('/content/drive/MyDrive/gemma4-eval/ext/public_ok.txt', 'w').write('\n'.join(ok) + '\n')
print(f'public_ok: {len(ok)} of {len(rows)}')
PY

# 4. data-external validation under the official setup
if [ ! -s $G/ext/external_ok.txt ]; then
  [ -d /content/data-external ] || tar -xf $OLD/data-external.tar -C /content
  [ -d /content/venvs ] || tar -xf $OLD/venvs.tar -C /content
  (cd /content/Gemma-4 && $H -m colab_eval.external prepare --data /content/data-external --venvs /content/venvs --out /content/ext)
  for agent in gold noop; do
    mkdir -p /content/results/ext_$agent
    [ -d $G/results/ext_$agent ] && cp -r $G/results/ext_$agent/. /content/results/ext_$agent/ || true
    for k in $(seq 0 $(( P - 1 ))); do
      (cd /content/Gemma-4 && $H -m colab_eval.run_official --agent $agent --bundle submission --data /content/ext \
         --sandbox-site /content/sbx --sandbox-site-map /content/ext/site_map.json --no-deps \
         --setup-py /content/comp/sandbox/setup.py --wheels /content/ext/wheels \
         --results-dir /content/results/ext_$agent/shards/$k --shard $k/$P --resume > /content/work/ext_${agent}_$k.log 2>&1) &
    done
    wait
    cat /content/results/ext_$agent/shards/*/task_results.jsonl > /content/results/ext_$agent/task_results.jsonl
    rsync -a /content/results/ext_$agent $G/results/
    el "ext $agent: $(grep -c '"resolved": true' /content/results/ext_$agent/task_results.jsonl) resolved of $(wc -l < /content/results/ext_$agent/task_results.jsonl)"
  done
  (cd /content/Gemma-4 && $H -m colab_eval.external validate --gold /content/results/ext_gold --noop /content/results/ext_noop \
     --out $G/ext/external_ok.txt)
fi
el "external_ok: $(wc -l < $G/ext/external_ok.txt) tasks"

# 5. bundle checks and the time model
cd /content/Gemma-4
$H -m colab_eval.variants submission /content/bundles/C --thinking-budget 1024 > /dev/null
$H -m colab_eval.lora.adapter null --out /content/adapters/null_lora > /dev/null
$H -m colab_eval.variants submission /content/bundles/N --adapter null_lora=/content/adapters/null_lora > /dev/null
$H -m harness.check_bundle submission bundles/v9-31b /content/bundles/C /content/bundles/N
$H tests/compile_official.py submission bundles/v9-31b /content/bundles/C /content/bundles/N 2>&1 | grep -E "^==|COMPILED|Error|error" || true
$H -m colab_eval.lora.adapter check /content/adapters/null_lora --bundle /content/bundles/N
mkdir -p $G/results/v8/analysis
$H -m colab_eval.timing $G/results/v8 --gold $G/results/gold > $G/results/v8/analysis/timing.md && sed -n 1,30p $G/results/v8/analysis/timing.md
el "cpu_prepare_v10 done"
