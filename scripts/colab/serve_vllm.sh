#!/usr/bin/env bash
# Starts vLLM for trajectory generation. Same flags as the scorer's setup_vllm_server (tool/reasoning parsers, reasoning_config so
# thinking_token_budget works, max_model_len 32768) except: one GPU instead of TP4, and fp8 weights made on the fly from the bf16 files.
#   MODEL=/content/model bash serve_vllm.sh        # logs to /content/work/vllm.log
set -euo pipefail
MODEL="${MODEL:-/content/model}"
QUANT="${QUANT:-fp8}"            # fp8 | none (plain bf16)
SEQS="${SEQS:-32}"
mkdir -p /content/work
Q=(); [ "$QUANT" != "none" ] && Q=(--quantization "$QUANT")
exec /content/vllm-env/bin/vllm serve "$MODEL" --served-model-name gemma-4-31b-it \
  "${Q[@]}" --max-model-len 32768 --gpu-memory-utilization "${GPU_UTIL:-0.90}" --max-num-seqs "$SEQS" \
  --enable-auto-tool-choice --tool-call-parser gemma4 --reasoning-parser gemma4 \
  --reasoning-config '{"reasoning_start_str": "<|channel>", "reasoning_end_str": "<channel|>"}' \
  --host 127.0.0.1 --port 8000 > /content/work/vllm.log 2>&1
