"""Training sequences for the LoRA from logged runs (run_official.py --log-requests): vLLM's own token ids, no re-rendering.

  python -m colab_eval.lora.build_sft --runs /content/results/G1 /content/results/G2 --out /content/sft

Each logged call has the exact prompt_token_ids vLLM built and the completion token_ids it sampled. Within a task, the
next call's prompt normally starts with the previous prompt (the history only grows, and the Gemma 4 template keeps
earlier thoughts after the last user message), so a run of such calls becomes one sequence: the last call's prompt plus
its completion, with the loss on every span the model generated. A compaction (ADK replaces old events with a summary)
or a nudge (a user message drops earlier thoughts) breaks the prefix and starts a new segment, which costs roughly ten
times fewer training tokens than one example per call. A generated span ends at the first stop token after it
(<|tool_response>, which the model emits to hand over to the tool, or <turn|>); in the history it is the template's
re-rendering of what was sampled, which can differ in small ways (argument order), and `exact` counts how often it is
token for token the sampled completion. Summary calls are not trained on.

Selection, per task: graded RESOLVED, no reply cut at max_tokens, submit_patch called (--max-submits), and among a
task's attempts the one with the fewest completion tokens, so the LoRA sees the shortest way to a fix.
Writes <out>/sft.jsonl ({task, run, segment, input_ids, label_spans, n_tokens, n_labels, hinted, ...}) and
<out>/manifest.json.

Hinted attempts (colab_eval.external hints: the user prompt has a "## Hints:" section naming the files to fix) are
recognised from the logged request. The scorer never gives a hint, so the hint's tokens are cut out of every prompt:
the span is what the attempt's first prompt has on top of an unhinted attempt's first prompt of the same task (both
are the same system prompt, problem, budget and workspace tree), and the cut prompt must equal that unhinted prompt
token for token. Attempts with no unhinted reference, or whose thoughts or replies mention the hint, are dropped, and
an unhinted usable attempt is preferred over a hinted one.
"""

from __future__ import annotations

import argparse
import collections
import gzip
import json
import re
import statistics
import zlib
from pathlib import Path

STOP_IDS = (50, 106)  # <|tool_response>, <turn|> (generation_config eos ids 1, 106, 50)
SOC, EOC = 100, 101  # <|channel>, <channel|>: a reply's thinking ends at <channel|>
HINT_HEADER = '\n## Hints:\n'  # swegemma agent_runner's prompt section for task.hints_text
HINT_MENTION = re.compile(r'(?<!type )(?<!type-)\bhints?\b', re.I)  # "type hints" is ordinary Python talk


def thinking_tokens(c: list[int]) -> int:
    """Thinking tokens in one sampled reply: up to <channel|> (after <|channel> when the reply opens the channel
    itself; after a tool response the prompt opens it)."""
    if EOC not in c:
        return 0
    end = c.index(EOC)
    start = c.index(SOC) + 1 if SOC in c[:end] else 0
    return end - start


def load_requests(run: Path, tasks: set[str] | None = None) -> dict[str, list[dict]]:
    """Logged calls per task (only those of `tasks` when given; rows start with their task id, so the others are not
    parsed). Workers append one gzip member per call, so a file read while a call is being written ends in a partial
    member: everything before it is kept (a task's calls are all written before its result row)."""
    by_task: dict[str, list[dict]] = collections.defaultdict(list)
    heads = tuple(json.dumps({'task': t})[:-1] + ',' for t in tasks) if tasks is not None else None
    for f in sorted((run / 'requests').glob('*.jsonl.gz')):
        with gzip.open(f, 'rt') as fh:
            try:
                for line in fh:
                    if line.strip() and (heads is None or line.startswith(heads)):
                        r = json.loads(line)
                        by_task[r['task']].append(r)
            except (EOFError, OSError, zlib.error, json.JSONDecodeError):
                pass
    for rows in by_task.values():
        rows.sort(key=lambda r: r['start'])
    return by_task


def calls_of(rows: list[dict]) -> list[dict]:
    """Agent calls with token ids, in order."""
    out = []
    for r in rows:
        if r.get('kind') != 'agent':
            continue
        resp = r['response']
        ch = (resp.get('choices') or [{}])[0]
        p, c = resp.get('prompt_token_ids'), ch.get('token_ids')
        if p is None or c is None:
            continue
        msg = ch.get('message') or {}
        names = [(tc.get('function') or {}).get('name') for tc in msg.get('tool_calls') or []]
        text = ' '.join(str(msg.get(k) or '') for k in ('reasoning_content', 'reasoning', 'content'))
        out.append({'P': p, 'C': c, 'finish': ch.get('finish_reason'), 'tools': names, 'think': thinking_tokens(c),
                    'completion_tokens': (resp.get('usage') or {}).get('completion_tokens') or len(c),
                    'hinted': HINT_HEADER in first_user(r['request']), 'mentions_hint': bool(HINT_MENTION.search(text))})
    return out


def first_user(request: dict) -> str:
    m = next((m.get('content') for m in request.get('messages', []) if m.get('role') == 'user'), '')
    return m if isinstance(m, str) else json.dumps(m)


def hint_span(hinted: list[int], ref: list[int], max_boundary: int = 2) -> tuple[int, int, list[int]] | None:
    """(start, end, tokens): hinted[start:end] replaced by tokens gives ref. The hint is inserted between two prompt
    sections, and the newlines before it can merge into another token than they do without it ('\\n\\n\\n' + '##'
    becomes '\\n\\n' after the hint), so a few boundary tokens of ref come back in its place. None when the
    prompts differ by more than that."""
    a = 0
    while a < min(len(hinted), len(ref)) and hinted[a] == ref[a]:
        a += 1
    b = 0
    while b < min(len(hinted), len(ref)) - a and hinted[-1 - b] == ref[-1 - b]:
        b += 1
    mid = ref[a:len(ref) - b]
    if len(hinted) - b - a <= len(mid) or len(mid) > max_boundary:
        return None
    return a, len(hinted) - b, mid


def strip_hint(calls: list[dict], ref: list[int]) -> list[dict] | None:
    """The calls with the hint's tokens cut out of every prompt (the hint sits in the first user message, so every
    prompt of the attempt carries the same span); None when the span cannot be found exactly."""
    span = hint_span(calls[0]['P'], ref)
    if span is None:
        return None
    s, e, mid = span
    cut = calls[0]['P'][s:e]
    out = []
    for c in calls:
        if c['P'][s:e] != cut:
            return None
        out.append({**c, 'P': c['P'][:s] + mid + c['P'][e:]})
    return out


def reject_reason(r: dict | None, calls: list[dict], st: dict, max_submits: int = 1, max_calls: int = 0,
                  max_thinking_tokens: int = 0) -> str | None:
    """Why an attempt is not training data (None: it is). colab_eval.external triage uses the same rule to decide
    which tasks get another attempt."""
    if r is None or str(r.get('error') or '').startswith('UNGRADED'):
        return 'not graded'
    if not r.get('resolved'):
        return 'not resolved'
    if not calls:
        return 'no token ids logged'
    if st['cut']:
        return 'reply cut at max_tokens'
    if st['submits'] == 0 or (max_submits and st['submits'] > max_submits):
        return f'submits={st["submits"]}'
    if max_calls and st['calls'] > max_calls:
        return 'too many calls'
    if max_thinking_tokens and st['max_thinking'] >= max_thinking_tokens:
        return 'thought past the thinking budget'
    return None


def stats(calls: list[dict]) -> dict:
    return {'calls': len(calls), 'completion_tokens': sum(c['completion_tokens'] for c in calls),
            'cut': sum(1 for c in calls if c['finish'] == 'length'),
            'max_thinking': max((c['think'] for c in calls), default=0),
            'submits': sum(c['tools'].count('submit_patch') for c in calls),
            'tool_calls': sum(len([n for n in c['tools'] if n not in ('submit_patch', 'get_status')]) for c in calls)}


def segments(calls: list[dict]) -> list[list[dict]]:
    segs: list[list[dict]] = []
    for c in calls:
        if segs:
            last = segs[-1][-1]['P']
            if len(c['P']) > len(last) and c['P'][: len(last)] == last:
                segs[-1].append(c)
                continue
        segs.append([c])
    return segs


def build_sequence(seg: list[dict]) -> tuple[list[int], list[list[int]], int]:
    """Token ids of the segment, the [start, end) spans the model generated, and how many spans match the sampled
    completion exactly."""
    last = seg[-1]
    seq = list(last['P']) + list(last['C'])
    spans, exact = [], 0
    for c in seg[:-1]:
        s = len(c['P'])
        e = next((i + 1 for i in range(s, len(last['P'])) if seq[i] in STOP_IDS), None)
        if e is None:  # no stop token before the last prompt ends: the history does not show this reply
            continue
        spans.append([s, e])
        gen = list(c['C'])
        if gen[-1:] and gen[-1] not in STOP_IDS:
            gen = gen + [seq[e - 1]]
        exact += seq[s:e] == gen
    spans.append([len(last['P']), len(seq)])
    return seq, spans, exact + 1


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--runs', type=Path, nargs='+', required=True, help='results dirs with requests/ and task_results')
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--max-len', type=int, default=20480, help='drop longer sequences (prompts stay near 16k)')
    ap.add_argument('--max-submits', type=int, default=1, help='drop attempts that submitted more often (0 = any)')
    ap.add_argument('--max-calls', type=int, default=0, help='drop attempts with more LLM calls (0 = any)')
    ap.add_argument('--exclude', type=Path, help='file of task ids to leave out (e.g. the public tasks)')
    ap.add_argument('--max-thinking-tokens', type=int, default=0,
                    help='drop attempts with a longer thought (0 = any): with 1024, runs sampled at a 2048 budget whose '
                         'thoughts never reached 1024 are exact samples of the 1024 policy')
    args = ap.parse_args(argv)

    exclude = set(args.exclude.read_text().split()) if args.exclude else set()
    candidates: dict[str, list[tuple[dict, Path, list[dict]]]] = collections.defaultdict(list)
    seen = collections.Counter()
    attempts = []
    for run in args.runs:
        res = {}
        tr = run / 'task_results.jsonl'
        if tr.exists():
            for l in tr.read_text().splitlines():
                if l.strip():
                    r = json.loads(l)
                    res[r['instance_id']] = r
        attempts += [(task, run, res.get(task), calls_of(rows)) for task, rows in load_requests(run).items()]
    # first prompt of an unhinted attempt per task: the reference a hinted attempt's prompts are cut back to
    ref = {task: calls[0]['P'] for task, _, _, calls in attempts if calls and not calls[0]['hinted']}
    for task, run, r, calls in attempts:
        seen['attempts'] += 1
        hinted = bool(calls) and calls[0]['hinted']
        seen['hinted attempts'] += hinted
        st = stats(calls)
        why = 'excluded' if task in exclude else reject_reason(r, calls, st, args.max_submits, args.max_calls,
                                                               args.max_thinking_tokens)
        if why is None and hinted:
            if any(c['mentions_hint'] for c in calls):
                why = 'hinted: a reply mentions the hint'
            elif task not in ref:
                why = 'hinted: no unhinted prompt to cut the hint from'
            else:
                calls = strip_hint(calls, ref[task])
                if calls is None:
                    why = 'hinted: hint span not found'
        seen[why or ('usable (hinted)' if hinted else 'usable')] += 1
        if why is None:
            candidates[task].append(({**st, 'hinted': hinted}, run, calls))

    args.out.mkdir(parents=True, exist_ok=True)
    n_seq = n_tok = n_lab = n_exact = n_spans = dropped_long = 0
    picked = []
    with (args.out / 'sft.jsonl').open('w') as f:
        for task in sorted(candidates):
            st, run, calls = min(candidates[task], key=lambda x: (x[0]['hinted'], x[0]['completion_tokens'], x[0]['calls']))
            for i, seg in enumerate(segments(calls)):
                seq, spans, exact = build_sequence(seg)
                if len(seq) > args.max_len:
                    dropped_long += 1
                    continue
                lab = sum(e - s for s, e in spans)
                f.write(json.dumps({'task': task, 'run': run.name, 'hinted': st['hinted'], 'segment': i,
                                    'calls': len(seg), 'exact': exact,
                                    'n_tokens': len(seq), 'n_labels': lab, 'label_spans': spans,
                                    'input_ids': seq}) + '\n')
                n_seq += 1
                n_tok += len(seq)
                n_lab += lab
                n_exact += exact
                n_spans += len(spans)
            picked.append({'task': task, 'run': run.name, **st})
    manifest = {
        'attempts': dict(seen), 'tasks': len(picked), 'hinted_tasks': sum(p['hinted'] for p in picked), 'sequences': n_seq, 'tokens': n_tok, 'label_tokens': n_lab,
        'spans': n_spans, 'exact_spans': n_exact, 'dropped_too_long': dropped_long,
        'median_calls': statistics.median([p['calls'] for p in picked]) if picked else None,
        'median_completion_tokens': statistics.median([p['completion_tokens'] for p in picked]) if picked else None,
        'picked': picked,
    }
    (args.out / 'manifest.json').write_text(json.dumps(manifest, indent=1))
    print(json.dumps({k: v for k, v in manifest.items() if k != 'picked'}, indent=1))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
