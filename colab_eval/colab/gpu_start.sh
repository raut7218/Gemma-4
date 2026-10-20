#!/usr/bin/env bash
# First command on the G4 runtime: restores /content from the Drive cache made by cpu_prepare.sh / cpu_prepare_v10.sh
# and starts vLLM.
#   bash /content/drive/MyDrive/gemma4-eval/gpu_start.sh   (copy on Drive; SKIP_SERVE=1 restores only)
#   EXT=1 also restores the data-external tasks and their per-repo environments (trajectory generation)
#   ADAPTERS="name=dir" serves LoRA adapters (serve_vllm.sh)
# The checkpoint is the one declared by $BUNDLE (default submission), see models.sh; BRANCH picks the repo branch.
# Sources run at once: the vLLM env (exact PyPI lock with the scorer's patched vllm wheel from Drive, plus peft and
# accelerate for training; the Drive tar as fallback), weights from Hugging Face (Drive copy as fallback), harness +
# sandbox envs (small Drive tars), competition snapshots (Drive, 16 parallel streams), data-external (EXT=1).
set -uo pipefail
G=/content/drive/MyDrive/gemma4-eval
OLD=/content/drive/MyDrive/gemma4/cache  # gen-trajectories cache: data-external snapshots and per-repo venvs
BRANCH=${BRANCH:-v10}
VLLM_WHEEL=$G/cache/wheels/vllm-0.19.1-cp38-abi3-manylinux_2_31_x86_64.whl
mkdir -p /content/work /content/model
cd /content
t0=$(date +%s); el() { echo "[$(( $(date +%s) - t0 ))s] $*"; }
command -v uv >/dev/null || pip install -q uv
[ -d /content/Gemma-4 ] || git clone -q -b $BRANCH https://github.com/raut7218/Gemma-4.git /content/Gemma-4
(cd /content/Gemma-4 && git fetch -q origin $BRANCH && git checkout -q -B $BRANCH FETCH_HEAD)
R=/content/Gemma-4/colab_eval

( grep -v '^vllm==' $R/requirements-vllm.txt > /content/work/req-no-vllm.txt
  uv venv -q --clear --python 3.12 /content/vllm-env \
    && uv pip install -q --no-deps --python /content/vllm-env/bin/python -r /content/work/req-no-vllm.txt "$VLLM_WHEEL" \
         peft==0.21.2 accelerate==1.15.0 \
    && /content/vllm-env/bin/python -c "import vllm, peft" 2>/dev/null && el "vllm-env installed (PyPI lock + wheelhouse vllm)" \
  || { el "PyPI install failed; using the Drive tar"; rm -rf /content/vllm-env; tar -xf $G/cache/vllm-env-wh.tar -C /content && el "vllm-env restored from Drive"; }
  want=$(cat $G/cache/wheels/vllm-wh.sha256 2>/dev/null)
  have=$(/content/vllm-env/bin/python -c "import hashlib, vllm.lora.model_manager as m; print(hashlib.sha256(open(m.__file__,'rb').read()).hexdigest())")
  [ -n "$want" ] && [ "$want" != "$have" ] && el "WARNING: vllm is not the scorer's patched build (LoRA may not load)" ) &

( uv python install -q 3.13.15 && tar -xf $G/cache/hvenv.tar -C /content && tar -xf $G/cache/sbx.tar -C /content \
    && el "harness + sandbox envs restored" ) &

( bash $R/colab/restore_comp.sh > /content/work/restore_comp.log 2>&1 && el "$(tail -1 /content/work/restore_comp.log)" ) &

if [ "${EXT:-0}" = 1 ]; then
  ( tar -xf $OLD/data-external.tar -C /content && tar -xf $OLD/venvs.tar -C /content \
      && el "data-external + venvs restored ($(ls /content/data-external/snapshots | wc -l) snapshots, $(ls /content/venvs | wc -l) envs)" ) &
fi

source $R/colab/models.sh; M=$G/$MODEL_DRIVE
( until [ -x /content/vllm-env/bin/hf ]; do sleep 5; done
  /content/vllm-env/bin/hf download $HF_REPO --local-dir /content/model > /content/work/hf.log 2>&1 \
    || { el "HF download failed; copying the weights from Drive"; cp $M/*.json $M/*.jinja /content/model/
         sz=$(stat -c %s $M/model.safetensors); ch=$(( sz / 16 / 67108864 + 1 )); truncate -s $sz /content/model/model.safetensors
         for i in $(seq 0 15); do dd if=$M/model.safetensors of=/content/model/model.safetensors bs=64M skip=$(( i * ch )) \
           seek=$(( i * ch )) count=$ch conv=notrunc status=none & done; wait; }
  if [ ! -s $M/model.safetensors ] || [ "$(stat -c %s /content/model/model.safetensors)" = "$(stat -c %s $M/model.safetensors)" ]; then
    el "model ready: $MODEL_NAME ($(du -sh /content/model | cut -f1))"; else el "MODEL SIZE MISMATCH"; fi
  # vLLM's torch.compile cache from an earlier session saves a minute or two of warm-up
  [ -s $G/cache/vllm-compile-cache.tar ] && mkdir -p /root/.cache && tar -xf $G/cache/vllm-compile-cache.tar -C /root/.cache 2>/dev/null
  # start serving as soon as weights and vLLM are in place; the snapshot copy from Drive can take longer
  until /content/vllm-env/bin/python -c "import vllm" 2>/dev/null; do sleep 5; done
  # setsid: vLLM must outlive the notebook cell (an interrupted or closed cell kills its process group)
  [ "${SKIP_SERVE:-0}" = 1 ] || setsid nohup env ADAPTERS="${ADAPTERS:-}" bash $R/colab/serve_vllm.sh > /content/work/serve_wrapper.log 2>&1 < /dev/null & ) &
wait
if [ "${EXT:-0}" = 1 ]; then
  (cd /content/Gemma-4 && /content/hvenv/bin/python -m colab_eval.external prepare --data /content/data-external \
     --venvs /content/venvs --out /content/ext | tail -3)
fi
el "restore finished"
if [ "${SKIP_SERVE:-0}" = 1 ]; then echo "(SKIP_SERVE=1: vLLM not started)"; exit 0; fi
nvidia-smi --query-gpu=name,memory.total --format=csv
bash $R/colab/wait_vllm.sh
