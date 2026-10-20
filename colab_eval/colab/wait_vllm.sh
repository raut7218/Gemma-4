#!/usr/bin/env bash
# Waits until the local vLLM answers (or reports a failed start) and prints its memory lines.
el() { echo "[$(date +%H:%M:%S)] $*"; }
# -m: vLLM listens before the engine is up, so a plain curl blocks until it is ready (or forever if it dies)
for i in $(seq 1 180); do
  curl -sf -m 3 http://127.0.0.1:8000/v1/models >/dev/null && { el "vLLM ready"; break; }
  grep -q "initialization failed\|Traceback" /content/work/vllm.log 2>/dev/null && { el "vLLM FAILED, see /content/work/vllm.log"; tail -20 /content/work/vllm.log; exit 1; }
  sleep 5
done
grep -E "KV cache|Maximum concurrency|model weights took|LoRA" /content/work/vllm.log | tail -6
curl -s -m 5 http://127.0.0.1:8000/v1/models | python3 -c "import json,sys; print('serving:', [m['id'] for m in json.load(sys.stdin)['data']])"
