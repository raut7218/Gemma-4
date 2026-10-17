#!/usr/bin/env bash
# First command on the G4 runtime: rebuilds /content from the Drive cache, then starts vLLM in the background.
#   bash /content/drive/MyDrive/gemma4/gpu_start.sh        (a copy of this file lives on Drive)
#   SKIP_SERVE=1 bash gpu_start.sh                         restore only (the dry run on the CPU runtime)
# Drive is slow to read (measured ~25-35 MB/s cold), so three different sources work at once:
#   vLLM env   <- PyPI, exact versions from cache/vllm-lock.txt (Drive tar vllm-env.tar is the fallback)
#   venvs+data <- Drive tars (5 GB)
#   weights    <- Hugging Face (not gated; ~60-100 MB/s). Cold Drive reads run at only ~25-35 MB/s, so the Drive copy of the
#                 model (model/) is the fallback, read with parallel ranged dd
set -uo pipefail
G=/content/drive/MyDrive/gemma4
M=/content/model
mkdir -p /content/work $M
cd /content
t0=$(date +%s)
el() { echo "$(( $(date +%s) - t0 ))s"; }

pcopy() {  # pcopy SRC DST STREAMS: one file, many ranged streams
  local sz ch i; sz=$(stat -c %s "$1"); ch=$(( sz / $3 / 67108864 + 1 )); truncate -s "$sz" "$2"
  for i in $(seq 0 $(( $3 - 1 ))); do dd if="$1" of="$2" bs=64M skip=$(( i * ch )) seek=$(( i * ch )) count=$ch conv=notrunc status=none & done; wait
}

( uv venv -q --python 3.12 /content/vllm-env && uv pip install -q --python /content/vllm-env/bin/python -r $G/cache/vllm-lock.txt \
    && /content/vllm-env/bin/python -c "import vllm" 2>/dev/null && echo "vllm-env installed from PyPI $(el)" \
  || { echo "PyPI install failed; using the Drive tar"; rm -rf /content/vllm-env; tar -xf $G/cache/vllm-env.tar -C /content && echo "vllm-env restored from Drive $(el)"; } ) &

( tar -xf $G/cache/venvs.tar -C /content && tar -xf $G/cache/data-external.tar -C /content && echo "venvs+data restored $(el)" ) &

( HF_XET_HIGH_PERFORMANCE=1 hf download google/gemma-4-31b-it --local-dir $M > /content/work/hf_model.log 2>&1 \
    || { echo "HF download failed; copying the weights from Drive"; for f in $G/model/*; do [ -d "$f" ] && continue
         case "$f" in *.safetensors) pcopy "$f" $M/$(basename "$f") 12 & ;; *) cp "$f" $M/ ;; esac; done; wait; }
  ok=1; for f in $G/model/*.safetensors; do [ "$(stat -c %s "$f")" = "$(stat -c %s $M/$(basename "$f") 2>/dev/null)" ] || ok=0; done
  [ $ok = 1 ] && echo "model ready $(el)" || echo "MODEL SIZE MISMATCH" ) &

[ -d /content/Gemma-4 ] || git clone -q -b gen-trajectories https://github.com/raut7218/Gemma-4.git /content/Gemma-4
wait
echo "restore finished in $(el)"
if [ "${SKIP_SERVE:-0}" = 1 ]; then echo "(SKIP_SERVE=1: vLLM not started)"; exit 0; fi
nvidia-smi --query-gpu=name,memory.total --format=csv
nohup bash /content/Gemma-4/scripts/colab/serve_vllm.sh > /content/work/serve_wrapper.log 2>&1 &
echo "vllm starting; tail /content/work/vllm.log"
