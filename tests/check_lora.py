"""Checks the LoRA pipeline without a GPU: token-id logs -> build_sft -> train_lora --tiny -> adapter check.

  <train-env>/bin/python tests/check_lora.py --run RESULTS_DIR --tokenizer TOKENIZER_DIR [--work DIR]

RESULTS_DIR is a run_official.py --log-requests run (e.g. against tests/fake_llm.py). The fake server's token ids are
placeholders, so this script first rewrites each logged call with real ones: the prompt rendered by the checkpoint's
chat template (with tools and enable_thinking, as vLLM does) and the completion as the template renders that reply in
the next prompt, up to its stop token. build_sft must then find one segment per task with every reply labelled and
token-exact, and the tiny 2-layer training run must save an adapter that adapter.check accepts. Needs torch,
transformers 5.13.1 and peft (the training environment); the tokenizer dir needs tokenizer.json, chat_template.jinja
and config.json from google/gemma-4-31B-it-qat-w4a16-ct.
"""

from __future__ import annotations

import argparse
import copy
import gzip
import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STOP = {50, 106}


def realistic(run: Path, out: Path, tok) -> int:
    """Copies `run` to `out` with real prompt/completion token ids in requests/, and every task marked resolved."""
    if out.exists():
        shutil.rmtree(out)
    shutil.copytree(run, out)

    def norm(msgs):
        msgs = copy.deepcopy(msgs)
        for m in msgs:
            for tc in m.get('tool_calls') or []:
                a = tc['function'].get('arguments')
                if isinstance(a, str):
                    tc['function']['arguments'] = json.loads(a) if a.strip() else {}
        return msgs

    def render(msgs, tools, gen):
        return tok.apply_chat_template(norm(msgs), tools=tools, add_generation_prompt=gen, tokenize=False,
                                       enable_thinking=True)

    n = 0
    for f in sorted((out / 'requests').glob('*.jsonl.gz')):
        rows = [json.loads(l) for l in gzip.open(f, 'rt') if l.strip()]
        for r in rows:
            req, resp = r['request'], r['response']
            ch = resp['choices'][0]
            msg = dict(ch['message'])
            msg.setdefault('role', 'assistant')
            p_text = render(req['messages'], req.get('tools'), True)
            full = render(req['messages'] + [msg], req.get('tools'), False)
            assert full.startswith(p_text), 'the reply does not continue the prompt'
            p_ids = tok(p_text, add_special_tokens=False)['input_ids']
            rest = tok(full, add_special_tokens=False)['input_ids'][len(p_ids):]
            c_ids = []
            for t in rest:
                c_ids.append(t)
                if t in STOP:
                    break
            resp['prompt_token_ids'], ch['token_ids'] = p_ids, c_ids
            n += 1
        with gzip.open(f, 'wt') as fh:
            for r in rows:
                fh.write(json.dumps(r) + '\n')
    rows = [json.loads(l) for l in (out / 'task_results.jsonl').read_text().splitlines() if l.strip()]
    (out / 'task_results.jsonl').write_text(''.join(json.dumps(dict(r, resolved=True, error=None)) + '\n' for r in rows))
    return n


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--run', type=Path, required=True)
    ap.add_argument('--tokenizer', type=Path, required=True)
    ap.add_argument('--work', type=Path, default=Path('/tmp/check_lora'))
    args = ap.parse_args()
    from transformers import AutoTokenizer

    tok = AutoTokenizer.from_pretrained(args.tokenizer)
    w = args.work
    w.mkdir(parents=True, exist_ok=True)
    n = realistic(args.run, w / 'run', tok)
    print(f'rewrote {n} logged calls with real token ids')

    py = sys.executable
    subprocess.run([py, '-m', 'colab_eval.lora.build_sft', '--runs', str(w / 'run'), '--out', str(w / 'sft')],
                   cwd=ROOT, check=True)
    man = json.loads((w / 'sft' / 'manifest.json').read_text())
    seqs = [json.loads(l) for l in (w / 'sft' / 'sft.jsonl').read_text().splitlines() if l.strip()]
    tasks = {s['task'] for s in seqs}
    assert man['tasks'] == len(tasks) >= 1, man
    for s in seqs:
        calls = s['calls']
        assert len(s['label_spans']) == calls, (s['task'], s['label_spans'], calls)
        assert s['exact'] == calls, f"{s['task']}: {s['exact']} of {calls} replies token-exact"
        for a, b in s['label_spans']:
            assert s['input_ids'][b - 1] in STOP or b == s['n_tokens'], 'a span must end at a stop token'
            text = tok.decode(s['input_ids'][a:b])
            assert '<|tool_call>' in text or '<turn|>' in text or b == s['n_tokens'], text[:200]
    first = seqs[0]
    a, b = first['label_spans'][0]
    print('first labelled span:', repr(tok.decode(first['input_ids'][a:b])[:240]))
    print(f"build_sft ok: {len(seqs)} sequences, {man['tokens']} tokens, {man['label_tokens']} labelled, "
          f"{man['exact_spans']}/{man['spans']} spans token-exact")

    r = subprocess.run([py, '-m', 'colab_eval.lora.train_lora', '--tiny', '--model', str(args.tokenizer),
                        '--data', str(w / 'sft' / 'sft.jsonl'), '--out', str(w / 'lora'), '--max-steps', '2',
                        '--accum', '1', '--budget-min', '20'], cwd=ROOT, capture_output=True, text=True)
    print(r.stdout[-1500:])
    if r.returncode:
        print(r.stderr[-3000:])
        raise SystemExit('train_lora --tiny failed')
    files = sorted(p.name for p in (w / 'lora' / 'main_lora').iterdir())
    assert files == ['adapter_config.json', 'adapter_model.safetensors'], files
    cfg = json.loads((w / 'lora' / 'main_lora' / 'adapter_config.json').read_text())
    assert cfg['r'] == 16 and cfg['base_model_name_or_path'] == 'google/gemma-4-31B-it-qat-w4a16-ct', cfg
    print('check_lora: all checks passed')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
