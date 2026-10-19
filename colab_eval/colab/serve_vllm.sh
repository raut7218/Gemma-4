#!/usr/bin/env bash
# vLLM with the scorer's settings (setup_vllm_server in scripts/inference.py, HARNESS_README 3.1): the bundle's
# competition checkpoint (models.sh) served under its own name, max_model_len 32768, gemma4 tool and reasoning parsers,
# reasoning_config so thinking_token_budget is enforced, default (bf16) KV cache, and the scorer's per-model extra args
# (the 12B needs --hf-overrides). Differences: one RTX PRO 6000 (96 GB) instead of 4x L4 with TP=4 (same weights,
# different kernels), and scheduler_reserve_full_isl left at vLLM's default (True), which only changes admission under
# concurrency (the scorer runs one task at a time) and avoids KV thrashing.
#   bash serve_vllm.sh        logs to /content/work/vllm.log; BUNDLE or MODEL_NAME pick the model; GPU_UTIL, SEQS override
set -euo pipefail
source "$(dirname "$0")/models.sh"
MODEL="${MODEL:-/content/model}"
mkdir -p /content/work
exec /content/vllm-env/bin/vllm serve "$MODEL" --served-model-name "$MODEL_NAME" "${MODEL_ARGS[@]}" \
  --max-model-len 32768 --gpu-memory-utilization "${GPU_UTIL:-0.92}" --max-num-seqs "${SEQS:-48}" \
  --enable-auto-tool-choice --tool-call-parser gemma4 --reasoning-parser gemma4 \
  --reasoning-config '{"reasoning_start_str": "<|channel>", "reasoning_end_str": "<channel|>"}' \
  --host 127.0.0.1 --port 8000 > /content/work/vllm.log 2>&1
