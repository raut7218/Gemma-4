"""Decode speed of the local vLLM for one served model name (the base model or a LoRA adapter), for the LoRA preflight.

  python -m colab_eval.bench_decode --model gemma-4-31b-it-qat-w4a16-ct --concurrency 1 28 [--prompt-tokens 2000]

Single stream: a request for 1 token measures prefill, a request for --tokens tokens measures prefill + decode, so
decode tok/s = (tokens - 1) / (difference). With N streams: N such requests at once, aggregate tok/s = all generated
tokens / wall time. ignore_eos makes every request generate exactly --tokens tokens; each prompt starts with a unique
number so the prefix cache cannot serve it. The ratio of single-stream speeds without and with a LoRA is the slowdown
the modelled L4 clock charges a LoRA run (run_official --l4-clock decode,prefill,m,lora).
"""

from __future__ import annotations

import argparse
import concurrent.futures as cf
import json
import random
import time
import urllib.request

WORDS = ('the quick brown fox jumps over a lazy dog while seven agents patch python repositories under a strict '
         'time budget and every test must pass ').split()


def prompt(n_tokens: int, salt: int) -> str:
    rnd = random.Random(salt)
    return f'{salt} ' + ' '.join(rnd.choice(WORDS) for _ in range(int(n_tokens * 0.75)))


def request(url: str, model: str, text: str, max_tokens: int) -> tuple[float, int]:
    body = {'model': model, 'messages': [{'role': 'user', 'content': text}], 'max_tokens': max_tokens,
            'temperature': 0.0, 'ignore_eos': True, 'chat_template_kwargs': {'enable_thinking': False}}
    req = urllib.request.Request(url + '/chat/completions', data=json.dumps(body).encode(),
                                 headers={'Content-Type': 'application/json', 'Authorization': 'Bearer EMPTY'})
    t0 = time.time()
    with urllib.request.urlopen(req, timeout=1800) as r:
        out = json.loads(r.read())
    return time.time() - t0, out['usage']['completion_tokens']


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--url', default='http://127.0.0.1:8000/v1')
    ap.add_argument('--model', required=True)
    ap.add_argument('--concurrency', type=int, nargs='+', default=[1])
    ap.add_argument('--prompt-tokens', type=int, default=2000)
    ap.add_argument('--tokens', type=int, default=384)
    ap.add_argument('--repeats', type=int, default=2)
    args = ap.parse_args(argv)
    salt = random.randrange(10 ** 9)
    request(args.url, args.model, prompt(200, salt), 8)  # warm-up (and an early error if the name is not served)
    out = {'model': args.model, 'prompt_tokens': args.prompt_tokens, 'tokens': args.tokens}
    singles = []
    for _ in range(args.repeats):
        salt += 1
        pre, _ = request(args.url, args.model, prompt(args.prompt_tokens, salt), 1)
        salt += 1
        full, n = request(args.url, args.model, prompt(args.prompt_tokens, salt), args.tokens)
        singles.append((n - 1) / max(1e-6, full - pre))
    out['single_stream_decode_tps'] = round(sorted(singles)[len(singles) // 2], 2)
    for c in args.concurrency:
        if c == 1:
            continue
        salt += 1000
        t0 = time.time()
        with cf.ThreadPoolExecutor(c) as ex:
            done = list(ex.map(lambda i: request(args.url, args.model, prompt(args.prompt_tokens, salt + i), args.tokens), range(c)))
        wall = time.time() - t0
        out[f'aggregate_tps_c{c}'] = round(sum(n for _, n in done) / wall, 1)
        out[f'per_stream_tps_c{c}'] = round(sum(n for _, n in done) / wall / c, 2)
    print(json.dumps(out))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
