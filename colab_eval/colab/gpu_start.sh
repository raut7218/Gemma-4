#!/usr/bin/env bash
# First command on the G4 runtime: restores /content from the Drive cache made by cpu_prepare.sh / cpu_prepare_v10.sh
# and starts vLLM.
#   bash /content/Gemma-4/colab_eval/colab/gpu_start.sh   (SKIP_SERVE=1 restores only)
#   EXT=1 also restores the data-external tasks and their per-repo environments (trajectory generation)
#   ADAPTERS="name=dir" serves LoRA adapters (serve_vllm.sh)
# The checkpoint is the one declared by $BUNDLE (default submission), see models.sh; BRANCH picks the repo branch.
# Sources run at once: the vLLM env, weights from Hugging Face (Drive copy as fallback), harness + sandbox envs (small
# Drive tars), competition snapshots (Drive, 16 parallel streams), data-external (EXT=1). The vLLM env is the PyPI
# lock with the scorer's patched vllm wheel from Drive (cpu_prepare_v10.sh), plus peft and accelerate for training;
# without that wheel, the lock's own PyPI vllm of the same version (no Gemma 4 LoRA patch, which only LoRA arms need);
# then the Drive tars vllm-env-wh.tar and vllm-env.tar. Every wait is bounded, and a missing vLLM is reported, not waited on.
set -uo pipefail
G=/content/drive/MyDrive/gemma4-eval
OLD=/content/drive/MyDrive/gemma4/cache  # gen-trajectories cache: data-external snapshots and per-repo venvs
BRANCH=${BRANCH:-v11}
VLLM_WHEEL=$G/cache/wheels/vllm-0.19.1-cp38-abi3-manylinux_2_31_x86_64.whl
DONE=/content/work/vllm-env.done
mkdir -p /content/work /content/model
rm -f $DONE
cd /content
t0=$(date +%s); el() { echo "[$(( $(date +%s) - t0 ))s] $*"; }
command -v uv >/dev/null || pip install -q uv
[ -d /content/Gemma-4 ] || git clone -q -b $BRANCH https://github.com/raut7218/Gemma-4.git /content/Gemma-4
(cd /content/Gemma-4 && git fetch -q origin $BRANCH && git checkout -q -B $BRANCH FETCH_HEAD) || { el "FATAL: no branch $BRANCH"; exit 1; }
el "code: $BRANCH @ $(git -C /content/Gemma-4 rev-parse --short HEAD)"
R=/content/Gemma-4/colab_eval
has_vllm() { /content/vllm-env/bin/python -c "import vllm" 2>/dev/null; }

( grep -v '^vllm==' $R/requirements-vllm.txt > /content/work/req-no-vllm.txt
  if [ -s "$VLLM_WHEEL" ]; then SRC=(-r /content/work/req-no-vllm.txt "$VLLM_WHEEL"); WHAT="PyPI lock + wheelhouse vllm"
  else SRC=(-r $R/requirements-vllm.txt); WHAT="PyPI lock with PyPI vllm; no scorer wheel on Drive, so no LoRA patch"; fi
  { uv venv -q --clear --python 3.12 /content/vllm-env \
      && uv pip install -q --no-deps --python /content/vllm-env/bin/python "${SRC[@]}" peft==0.21.2 accelerate==1.15.0 \
      && /content/vllm-env/bin/python -c "import vllm, peft" 2>/dev/null && el "vllm-env installed ($WHAT)"; } \
  || { rm -rf /content/vllm-env
       for t in vllm-env-wh.tar vllm-env.tar; do
         [ -s $G/cache/$t ] && tar -xf $G/cache/$t -C /content && has_vllm && { el "PyPI install failed; vllm-env restored from Drive ($t)"; break; }
         rm -rf /content/vllm-env
       done; }
  if has_vllm; then
    want=$(cat $G/cache/wheels/vllm-wh.sha256 2>/dev/null)
    have=$(/content/vllm-env/bin/python -c "import hashlib, vllm.lora.model_manager as m; print(hashlib.sha256(open(m.__file__,'rb').read()).hexdigest())")
    if [ -n "$want" ] && [ "$want" != "$have" ]; then el "WARNING: vllm is not the scorer's patched build (LoRA may not load)"; fi
  else el "FATAL: no vLLM env: the PyPI install and the Drive tars both failed (see above)"; fi
  touch $DONE ) &

( uv python install -q 3.13.15 && tar -xf $G/cache/hvenv.tar -C /content && tar -xf $G/cache/sbx.tar -C /content \
    && el "harness + sandbox envs restored" || el "FATAL: harness/sandbox envs not restored (cache/hvenv.tar, cache/sbx.tar: run cpu_prepare.sh)" ) &

( bash $R/colab/restore_comp.sh > /content/work/restore_comp.log 2>&1 && el "$(tail -1 /content/work/restore_comp.log)" \
    || el "FATAL: competition data not restored, see /content/work/restore_comp.log" ) &

if [ "${EXT:-0}" = 1 ]; then
  ( tar -xf $OLD/data-external.tar -C /content && tar -xf $OLD/venvs.tar -C /content \
      && el "data-external + venvs restored ($(ls /content/data-external/snapshots | wc -l) snapshots, $(ls /content/venvs | wc -l) envs)" ) &
fi

source $R/colab/models.sh; M=$G/$MODEL_DRIVE
( # the hf CLI comes with the vLLM env: start the download as soon as it is there (40 minutes at most)
  for i in $(seq 480); do [ -x /content/vllm-env/bin/hf ] || [ -e $DONE ] && break; sleep 5; done
  if [ -x /content/vllm-env/bin/hf ] && /content/vllm-env/bin/hf download $HF_REPO --local-dir /content/model > /content/work/hf.log 2>&1; then :
  else el "HF download failed or no hf CLI; copying the weights from Drive"; cp $M/*.json $M/*.jinja /content/model/
       sz=$(stat -c %s $M/model.safetensors); ch=$(( sz / 16 / 67108864 + 1 )); truncate -s $sz /content/model/model.safetensors
       for i in $(seq 0 15); do dd if=$M/model.safetensors of=/content/model/model.safetensors bs=64M skip=$(( i * ch )) \
         seek=$(( i * ch )) count=$ch conv=notrunc status=none & done; wait; fi
  if [ ! -s $M/model.safetensors ] || [ "$(stat -c %s /content/model/model.safetensors)" = "$(stat -c %s $M/model.safetensors)" ]; then
    el "model ready: $MODEL_NAME ($(du -sh /content/model | cut -f1))"; else el "MODEL SIZE MISMATCH"; fi
  # vLLM's torch.compile cache from an earlier session saves a minute or two of warm-up
  [ -s $G/cache/vllm-compile-cache.tar ] && mkdir -p /root/.cache && tar -xf $G/cache/vllm-compile-cache.tar -C /root/.cache 2>/dev/null
  # start serving as soon as weights and vLLM are in place; the snapshot copy from Drive can take longer
  for i in $(seq 480); do [ -e $DONE ] && break; sleep 5; done
  # setsid: vLLM must outlive the notebook cell (an interrupted or closed cell kills its process group)
  if ! has_vllm; then el "vLLM is not installed: the server is not started"
  elif [ "${SKIP_SERVE:-0}" != 1 ]; then setsid nohup env ADAPTERS="${ADAPTERS:-}" bash $R/colab/serve_vllm.sh > /content/work/serve_wrapper.log 2>&1 < /dev/null & fi ) &
wait
if [ "${EXT:-0}" = 1 ]; then
  (cd /content/Gemma-4 && /content/hvenv/bin/python -m colab_eval.external prepare --data /content/data-external \
     --venvs /content/venvs --out /content/ext | tail -3)
fi
el "restore finished"
if [ "${SKIP_SERVE:-0}" = 1 ]; then echo "(SKIP_SERVE=1: vLLM not started)"; exit 0; fi
has_vllm || { el "FATAL: no vLLM, nothing to wait for"; exit 1; }
nvidia-smi --query-gpu=name,memory.total --format=csv
bash $R/colab/wait_vllm.sh
