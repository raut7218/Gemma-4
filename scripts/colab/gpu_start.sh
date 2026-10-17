#!/usr/bin/env bash
# First command on the G4 runtime: restores everything cached on Drive to local disk, then starts vLLM in the background.
#   bash /content/drive/MyDrive/gemma4/gpu_start.sh        (a copy of this file lives on Drive)
set -euo pipefail
G=/content/drive/MyDrive/gemma4
mkdir -p /content/work
cd /content
t0=$(date +%s)
( tar -xf $G/cache/vllm-env.tar -C /content && echo "vllm-env restored $(( $(date +%s) - t0 ))s" ) &
( tar -xf $G/cache/venvs.tar -C /content && tar -xf $G/cache/data-external.tar -C /content && echo "venvs+data restored $(( $(date +%s) - t0 ))s" ) &
mkdir -p /content/model
( for f in $G/model/*; do [ -d "$f" ] || cp "$f" /content/model/ & done; wait; echo "model copied $(( $(date +%s) - t0 ))s" ) &
[ -d /content/Gemma-4 ] || git clone -q -b gen-trajectories https://github.com/raut7218/Gemma-4.git /content/Gemma-4
wait
nvidia-smi --query-gpu=name,memory.total --format=csv
nohup bash /content/Gemma-4/scripts/colab/serve_vllm.sh > /content/work/serve_wrapper.log 2>&1 &
echo "vllm starting; tail /content/work/vllm.log"
