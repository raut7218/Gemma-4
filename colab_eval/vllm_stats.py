"""Prints vLLM load once per interval, for tuning --concurrency: running/waiting requests, KV-cache use, prefix-cache
hit rate, preemptions and prompt/generation throughput (from /metrics, deltas between samples).
  python -m colab_eval.vllm_stats [--url http://127.0.0.1:8000] [--every 30] [--count 0]
"""

from __future__ import annotations

import argparse
import re
import time
import urllib.request

KEYS = {'running': 'vllm:num_requests_running', 'waiting': 'vllm:num_requests_waiting',
        'kv': 'vllm:kv_cache_usage_perc', 'gen': 'vllm:generation_tokens_total', 'prompt': 'vllm:prompt_tokens_total',
        'hits': 'vllm:prefix_cache_hits_total', 'queries': 'vllm:prefix_cache_queries_total',
        'preempt': 'vllm:num_preemptions_total'}


def sample(url: str) -> dict[str, float]:
    text = urllib.request.urlopen(f'{url}/metrics', timeout=10).read().decode()
    out = {}
    for k, name in KEYS.items():
        vals = [float(m.group(1)) for m in re.finditer(rf'^{re.escape(name)}(?:{{[^}}]*}})? ([0-9.eE+-]+)$', text, re.M)]
        out[k] = sum(vals)
    return out


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--url', default='http://127.0.0.1:8000')
    ap.add_argument('--every', type=float, default=30)
    ap.add_argument('--count', type=int, default=0, help='samples to print (0 = forever)')
    a = ap.parse_args(argv)
    prev, t_prev, n = sample(a.url), time.time(), 0
    while a.count == 0 or n < a.count:
        time.sleep(a.every)
        cur, t = sample(a.url), time.time()
        dt = t - t_prev
        dq = cur['queries'] - prev['queries']
        print(f"{time.strftime('%H:%M:%S')} running={cur['running']:.0f} waiting={cur['waiting']:.0f} "
              f"kv={cur['kv'] * 100:.0f}% gen={(cur['gen'] - prev['gen']) / dt:.0f} tok/s "
              f"prompt={(cur['prompt'] - prev['prompt']) / dt:.0f} tok/s "
              f"prefix_hit={(cur['hits'] - prev['hits']) / dq * 100 if dq else 0:.0f}% "
              f"preempt+={cur['preempt'] - prev['preempt']:.0f}", flush=True)
        prev, t_prev, n = cur, t, n + 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
