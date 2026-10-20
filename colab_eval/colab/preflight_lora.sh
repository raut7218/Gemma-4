#!/usr/bin/env bash
# LoRA go/no-go (gate G1) on the G4, after gpu_start.sh, about 15 minutes:
#   1. the running base-model server: KV cache lines and decode speed (1 and 28 streams)
#   2. a rank-16 zero adapter on every language-model projection (colab_eval.lora.adapter null), served by the
#      scorer's patched vLLM: does it load, what does it cost in KV cache, how much slower is decoding
#   3. back to the base-model server for the no-LoRA arms
# Writes /content/results/preflight/summary.json (lora_factor = base / LoRA single-stream decode speed, which the
# L4 clock charges a LoRA run) and syncs it to Drive. G1 passes when the adapter loads, the KV cache keeps room for
# several 32k contexts and single-stream decoding slows by 25% or less.
set -uo pipefail
G=/content/drive/MyDrive/gemma4-eval
R=/content/Gemma-4/colab_eval
OUT=/content/results/preflight
H=/content/hvenv/bin/python
mkdir -p $OUT
cd /content/Gemma-4
source $R/colab/models.sh
kv() { grep -E "KV cache|Maximum concurrency|Available KV" /content/work/vllm.log | tail -3; }

kv > $OUT/kv_base.txt
$H -m colab_eval.bench_decode --model "$MODEL_NAME" --concurrency 1 28 | tee $OUT/bench_base.json
$H -m colab_eval.lora.adapter null --out /content/adapters/null_lora --rank "${RANK:-16}"
cp /content/work/vllm.log /content/work/vllm_base.log
if ADAPTERS=null_lora=/content/adapters/null_lora bash $R/colab/restart_vllm.sh; then
  kv > $OUT/kv_lora.txt
  $H -m colab_eval.bench_decode --model null_lora --concurrency 1 28 | tee $OUT/bench_lora.json
  $H -m colab_eval.bench_decode --model "$MODEL_NAME" --concurrency 1 | tee $OUT/bench_base_on_lora_server.json
  cp /content/work/vllm.log /content/work/vllm_lora.log
else
  echo '{"error": "vLLM did not start with the adapter"}' > $OUT/bench_lora.json
  cp /content/work/vllm.log /content/work/vllm_lora.log
fi
python3 - "$OUT" <<'PY'
import json, re, sys
from pathlib import Path
out = Path(sys.argv[1])
def tokens(name):
    m = re.findall(r'KV cache size: ([\d,]+) tokens', (out / name).read_text() if (out / name).exists() else '')
    return int(m[-1].replace(',', '')) if m else None
base = json.loads((out / 'bench_base.json').read_text())
lora = json.loads((out / 'bench_lora.json').read_text())
s = {'kv_tokens_base': tokens('kv_base.txt'), 'kv_tokens_lora': tokens('kv_lora.txt'),
     'decode_tps_base': base.get('single_stream_decode_tps'), 'decode_tps_lora': lora.get('single_stream_decode_tps'),
     'aggregate_tps_c28_base': base.get('aggregate_tps_c28'), 'aggregate_tps_c28_lora': lora.get('aggregate_tps_c28'),
     'error': lora.get('error')}
s['lora_factor'] = round(s['decode_tps_base'] / s['decode_tps_lora'], 3) if s['decode_tps_lora'] else None
s['g1_pass'] = bool(s['lora_factor'] and s['lora_factor'] <= 1.25 and (s['kv_tokens_lora'] or 0) >= 4 * 32768)
(out / 'summary.json').write_text(json.dumps(s, indent=1))
print(json.dumps(s, indent=1))
PY
ADAPTERS= bash $R/colab/restart_vllm.sh
rsync -a $OUT $G/results/
