#!/usr/bin/env bash
# First command on the G4 runtime: restores /content from the Drive cache made by cpu_prepare.sh and starts vLLM.
#   bash /content/drive/MyDrive/gemma4-eval/gpu_start.sh        (copy on Drive; SKIP_SERVE=1 restores only)
# Four sources at once: vLLM env from PyPI (exact lock; Drive tar as fallback), weights from Hugging Face (Drive copy as
# fallback), harness + sandbox envs (small Drive tars), competition snapshots (Drive, 16 parallel streams).
set -uo pipefail
G=/content/drive/MyDrive/gemma4-eval
BRANCH=${BRANCH:-gemma-run-colab}
mkdir -p /content/work /content/model
cd /content
t0=$(date +%s); el() { echo "[$(( $(date +%s) - t0 ))s] $*"; }
command -v uv >/dev/null || pip install -q uv
[ -d /content/Gemma-4 ] || git clone -q -b $BRANCH https://github.com/raut7218/Gemma-4.git /content/Gemma-4
(cd /content/Gemma-4 && git pull -q)
R=/content/Gemma-4/colab_eval

( uv venv -q --clear --python 3.12 /content/vllm-env && uv pip install -q --no-deps --python /content/vllm-env/bin/python -r $R/requirements-vllm.txt \
    && /content/vllm-env/bin/python -c "import vllm" 2>/dev/null && el "vllm-env installed from PyPI" \
  || { el "PyPI install failed; using the Drive tar"; rm -rf /content/vllm-env; tar -xf $G/cache/vllm-env.tar -C /content && el "vllm-env restored from Drive"; } ) &

( uv python install -q 3.13.15 && tar -xf $G/cache/hvenv.tar -C /content && tar -xf $G/cache/sbx.tar -C /content \
    && el "harness + sandbox envs restored" ) &

( bash $R/colab/restore_comp.sh > /content/work/restore_comp.log 2>&1 && el "$(tail -1 /content/work/restore_comp.log)" ) &

( until [ -x /content/vllm-env/bin/hf ]; do sleep 5; done
  /content/vllm-env/bin/hf download google/gemma-4-31B-it-qat-w4a16-ct --local-dir /content/model > /content/work/hf.log 2>&1 \
    || { el "HF download failed; copying the weights from Drive"; cp $G/model/*.json $G/model/*.jinja /content/model/
         sz=$(stat -c %s $G/model/model.safetensors); ch=$(( sz / 16 / 67108864 + 1 )); truncate -s $sz /content/model/model.safetensors
         for i in $(seq 0 15); do dd if=$G/model/model.safetensors of=/content/model/model.safetensors bs=64M skip=$(( i * ch )) \
           seek=$(( i * ch )) count=$ch conv=notrunc status=none & done; wait; }
  [ "$(stat -c %s /content/model/model.safetensors)" = "$(stat -c %s $G/model/model.safetensors)" ] && el "model ready" || el "MODEL SIZE MISMATCH" ) &
wait
el "restore finished"
if [ "${SKIP_SERVE:-0}" = 1 ]; then echo "(SKIP_SERVE=1: vLLM not started)"; exit 0; fi
nvidia-smi --query-gpu=name,memory.total --format=csv
nohup bash $R/colab/serve_vllm.sh > /content/work/serve_wrapper.log 2>&1 &
for i in $(seq 1 120); do curl -sf http://127.0.0.1:8000/v1/models >/dev/null && { el "vLLM ready"; break; }; sleep 5; done
grep -E "KV cache|Maximum concurrency|model weights took" /content/work/vllm.log | tail -4
