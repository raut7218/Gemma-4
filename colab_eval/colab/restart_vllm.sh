#!/usr/bin/env bash
# Stops the running vLLM and starts it again, e.g. with or without LoRA adapters, then waits until it answers.
#   ADAPTERS="null_lora=/content/adapters/null_lora" bash restart_vllm.sh      ADAPTERS= (empty) serves the base model only
R=/content/Gemma-4/colab_eval
pkill -f '[v]llm serve' ; for i in $(seq 1 60); do pgrep -f '[v]llm serve' >/dev/null || break; sleep 2; done
pkill -9 -f '[v]llm serve' 2>/dev/null; sleep 3
setsid nohup env ADAPTERS="${ADAPTERS:-}" bash $R/colab/serve_vllm.sh > /content/work/serve_wrapper.log 2>&1 < /dev/null &
bash $R/colab/wait_vllm.sh
