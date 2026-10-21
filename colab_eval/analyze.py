"""Where does a submission lose tasks? Reads a run_official.py results dir and writes report.md + tasks.csv/json.

  python -m colab_eval.analyze results/v8 [--gold results/gold] [--l4-decode-tps 20 --l4-prefill-tps 1500]

Per task: outcome, why the agent phase ended, tool calls (by tool, skill script and error), turns, peak prompt tokens,
compactions, completion/reasoning tokens, outputs cut at max_tokens, first edit, submits, wall times, and an estimate of
the agent time on the scorer's 4x L4 (LLM time re-priced at the given L4 rates plus the measured tool time). Tasks whose
reference patch does not pass in this environment (--gold run) are reported as ENV_UNSOLVABLE and left out of the
adjusted rate, so they are not blamed on the agent; failures of the harness itself are HARNESS_ERROR.

analysis/health.md (+ health.json) lists what went wrong that is not the task's difficulty: per model call, from the raw
vLLM responses of a --log-requests run (blank thinking, thinking the reasoning parser lost, tool-call markup left in the
content, calls written inside the thinking, malformed arguments, unknown tools, cut outputs, text-only replies before
submit); per tool result and loop, from the traces (errors by type, repeated identical calls, nudges); and harness
errors (result rows, worker logs in <results>/worker_logs, ids in <results>/ids.txt with no result). With
--detokenize-url (the vLLM server root) each example also shows the raw text the model emitted.
"""

from __future__ import annotations

import argparse
import collections
import csv
import json
import re
import statistics
import urllib.request
from pathlib import Path

from colab_eval.lora.build_sft import load_requests, thinking_tokens

EDIT_TOOLS = {'edit_file', 'write_file'}
COMPACTION_THRESHOLD = 14336  # EventsCompactionConfig.token_threshold in the scorer (HARNESS_README 7.2)
# swegemma errors that are the harness's or the data's, not the agent's (evaluate.py, agent_runner.py, verification.py)
HARNESS_ERRORS = ('Unexpected evaluation worker error', 'Sandbox execution error', 'Failed to apply test_patch',
                  'Missing test specification', 'Evaluation error')
# per-call problems call_flags finds in a raw response; text-only replies are judged per task (normal after a submit)
FLAGS = ('blank_thinking', 'reasoning_lost', 'thought_in_content', 'markup_in_content', 'call_in_thinking', 'truncated',
         'unknown_tool', 'bad_args')
TITLES = {'blank_thinking': 'blank thinking (thinking on, no thought produced)',
          'reasoning_lost': 'thinking tokens the reasoning parser did not return',
          'thought_in_content': 'thinking markup left in the visible content',
          'markup_in_content': 'tool-call markup left in the content (parser miss)',
          'call_in_thinking': 'tool call written inside the thinking',
          'text_only_before_submit': 'text-only reply before submit (costs a nudge)',
          'truncated': 'output cut at max_tokens', 'unknown_tool': 'unknown tool name',
          'bad_args': 'malformed tool arguments'}
CALL_MARKUP = re.compile(r'<\|tool_call>|\bcall:[\w.-]+\{')  # gemma4's tool-call syntax, parsed or not
EXCEPTION_LINE = re.compile(r'^[A-Za-z_][\w.]*(?:Error|Exception|Exit|Interrupt)\b.*$', re.M)


def jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    return [json.loads(l) for l in path.read_text().splitlines() if l.strip()]


def termination(err: str | None, submitted: bool) -> str:
    e = (err or '').lower()
    if not e:
        return 'submitted' if submitted else 'finished_no_submit'
    if 'timeout' in e and 'session' in e:
        return 'time'
    if 'tool call budget' in e:
        return 'tool_calls'
    if 'turn budget' in e or 'max_llm_calls' in e:
        return 'turns'
    if 'nudge' in e:
        return 'no_tool_calls'
    if 'context' in e and ('window' in e or 'length' in e or 'too long' in e):
        return 'context_overflow'
    if 'litellm' in e or 'apiconnection' in e or 'openai' in e:
        return 'llm_error'
    return 'other_error'


def outcome(r: dict, env_bad: bool) -> str:
    if r.get('resolved'):
        return 'RESOLVED'
    if any(h in (r.get('error') or '') for h in HARNESS_ERRORS):
        return 'HARNESS_ERROR'
    if env_bad:
        return 'ENV_UNSOLVABLE'
    if not r.get('agent_patch_size'):
        return 'NO_PATCH'
    if 'apply' in (r.get('error') or '').lower():
        return 'PATCH_REJECTED'
    return 'TESTS_FAILED'


def trace_stats(path: Path) -> dict:
    s = {'turns': 0, 'max_prompt': 0, 'completion': 0, 'tools': collections.Counter(), 'scripts': collections.Counter(),
         'tool_errors': collections.Counter(), 'first_edit_call': None, 'submits': 0, 'compactions': 0,
         'budget_warnings': 0, 'event_types': collections.Counter(), 'empty_turns': 0, 'thought_chars': 0,
         'script_crashes': 0, 'malformed_calls': 0}
    if not path.exists():
        return s
    t = json.loads(path.read_text())
    n_calls = 0
    for st in t.get('steps', []):
        ev = (st.get('extra') or {}).get('event_type', '')
        s['event_types'][f"{st.get('source')}:{ev}"] += 1
        if 'compact' in ev.lower() or 'summar' in ev.lower():
            s['compactions'] += 1
        if st.get('source') != 'agent':
            continue
        m = st.get('metrics') or {}
        if m:
            s['turns'] += 1
            s['max_prompt'] = max(s['max_prompt'], m.get('prompt_tokens') or 0)
            s['completion'] += m.get('completion_tokens') or 0
        if ev == 'thinking':
            s['thought_chars'] += len(st.get('message') or '')
        calls = st.get('tool_calls') or []
        if m and not calls and ev == 'thinking':
            s['empty_turns'] += 1
        obs = str((st.get('observation') or {}).get('content') or '')
        for c in calls:
            name = c.get('function_name', '?')
            s['tools'][name] += 1
            if name == 'submit_patch':
                s['submits'] += 1
            elif name != 'get_status':
                n_calls += 1
            if name == 'run_skill_script':
                args = c.get('arguments') or {}
                s['scripts'][str(args.get('script_path') or args.get('file_path') or args.get('script') or '?').split('/')[-1]] += 1
                # a crash here is the sandbox's fault (e.g. /workspace missing), not the model's
                if 'Traceback (most recent call last)' in obs or 'internal error:' in obs:
                    s['script_crashes'] += 1
            # the tool-call parser split the arguments wrongly (e.g. at a ':' inside old_string)
            if 'mandatory input parameters are not present' in obs:
                s['malformed_calls'] += 1
            if name in EDIT_TOOLS and s['first_edit_call'] is None:
                s['first_edit_call'] = n_calls
        if '"status": "error"' in obs or "'status': 'error'" in obs or 'BudgetExhausted' in obs:
            for c in calls:
                s['tool_errors'][c.get('function_name', '?')] += 1
        if 'budget_warning' in obs:
            s['budget_warnings'] += 1
    return s


def pct(xs, q):
    xs = sorted(x for x in xs if x is not None)
    return xs[min(len(xs) - 1, int(q * len(xs)))] if xs else None


def call_flags(req: dict, resp: dict) -> dict:
    """What went wrong in one agent call, from the request and vLLM's raw response (run_official --log-requests).
    vLLM 0.19 returns the thought in message.reasoning; token_ids (when logged) tell a model that did not think apart
    from a parser that dropped the thought."""
    ch = (resp.get('choices') or [{}])[0]
    msg = ch.get('message') or {}
    content = msg.get('content') or ''
    reasoning = (msg.get('reasoning') or msg.get('reasoning_content') or '').strip()
    calls = msg.get('tool_calls') or []
    think = thinking_tokens(ch['token_ids']) if ch.get('token_ids') else None
    schemas = {t['function']['name']: t['function'].get('parameters') or {} for t in req.get('tools') or []}
    thinking_on = (req.get('chat_template_kwargs') or {}).get('enable_thinking') is True
    f = {'tools': [], 'text_only': not calls, 'thinking_tokens': think, 'reasoning_chars': len(reasoning),
         'blank_thinking': thinking_on and not reasoning and not think, 'reasoning_lost': bool(think) and not reasoning,
         'thought_in_content': '<|channel>' in content or '<channel|>' in content,
         'markup_in_content': bool(CALL_MARKUP.search(content)) or '<|"|>' in content,
         'call_in_thinking': bool(CALL_MARKUP.search(reasoning)), 'truncated': ch.get('finish_reason') == 'length',
         'unknown_tool': [], 'bad_args': []}
    for c in calls:
        fn = c.get('function') or {}
        name = fn.get('name') or '?'
        f['tools'].append(name)
        if name not in schemas:
            f['unknown_tool'].append(name)
            continue
        try:
            args = json.loads(fn.get('arguments') or '{}')
        except ValueError:
            f['bad_args'].append(f'{name}: arguments are not JSON: {str(fn.get("arguments"))[:80]!r}')
            continue
        props = schemas[name].get('properties') or {}
        missing = [k for k in schemas[name].get('required') or [] if k not in args]
        extra = [k[:60] for k in args if props and k not in props]
        if missing or extra:
            f['bad_args'].append(f'{name}: missing {missing}, unexpected {extra}')
    return f


def tool_error_type(obs: str) -> str | None:
    """Error type of one tool result in a swegemma trace, None for a success. ADK's own error for a call whose
    arguments lack required keys (the gemma4 parser splitting a multi-line string) is MissingParameters."""
    if 'mandatory input parameters are not present' in obs:
        return 'MissingParameters'
    try:
        d = json.loads(obs)
    except ValueError:
        m = re.search(r"""['"]error_type['"]:\s*['"](\w+)""", obs)
        return m.group(1) if m else None
    if isinstance(d, dict) and (d.get('status') == 'error' or 'error' in d):
        return d.get('error_type') or 'ToolError'
    return None


def detokenize(url: str, model: str | None, ids: list[int]) -> str:
    """The raw text of a completion (special tokens included) from vLLM's /detokenize."""
    try:
        req = urllib.request.Request(url.rstrip('/') + '/detokenize', data=json.dumps({'model': model, 'tokens': ids}).encode(),
                                     headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r).get('prompt', '')
    except Exception as e:  # noqa: BLE001 - an example without its raw text is still useful
        return f'(detokenize failed: {e})'


def health(R: Path, rows: list[dict], gold: Path | None, detok: str | None) -> dict:
    """Writes analysis/health.md and health.json (see the module docstring) and returns the summary; per_task holds
    the counters merged into tasks.json."""
    per_task: dict[str, collections.Counter] = collections.defaultdict(collections.Counter)
    flags = {k: {'calls': 0, 'tasks': set()} for k in (*FLAGS, 'text_only_before_submit')}
    examples: dict[str, list] = collections.defaultdict(list)
    repeated: dict[str, int] = {}
    think: dict[str, list] = collections.defaultdict(list)
    n_calls = 0
    for task, logged in sorted(load_requests(R).items()):
        logged = [c for c in logged if c.get('kind') == 'agent']
        fl = [call_flags(c['request'], c['response']) for c in logged]
        n_calls += len(fl)
        submit = next((i for i, f in enumerate(fl) if 'submit_patch' in f['tools']), len(fl))
        prev = None
        for i, (c, f) in enumerate(zip(logged, fl)):
            per_task[task]['llm_calls_logged'] += 1
            if f['thinking_tokens'] is not None:
                think[task].append(f['thinking_tokens'])
            for k in [k for k in FLAGS if f[k]] + (['text_only_before_submit'] if f['text_only'] and i < submit else []):
                per_task[task][k] += 1
                flags[k]['calls'] += 1
                flags[k]['tasks'].add(task)
                if len(examples[k]) < 2:
                    ch = (c['response'].get('choices') or [{}])[0]
                    m = ch.get('message') or {}
                    ex = {'task': task, 'call': i + 1, 'finish_reason': ch.get('finish_reason'), 'problems': f['bad_args'] or f['unknown_tool'],
                          'content': (m.get('content') or '')[:400], 'reasoning': (m.get('reasoning') or m.get('reasoning_content') or '')[:400],
                          'tool_calls': [f"{(t.get('function') or {}).get('name')}({str((t.get('function') or {}).get('arguments'))[:300]})"
                                         for t in m.get('tool_calls') or []]}
                    if detok and ch.get('token_ids'):
                        ex['raw'] = detokenize(detok, c['request'].get('model'), ch['token_ids'])[:1500]
                    examples[k].append(ex)
            key = json.dumps([(t.get('function') or {}) for t in ((c['response'].get('choices') or [{}])[0].get('message') or {}).get('tool_calls') or []],
                             sort_keys=True)
            if f['tools'] and key == prev:
                repeated[task] = repeated.get(task, 0) + 1
            prev = key if f['tools'] else None
    tool_errors: dict[str, dict] = {}
    nudges: dict[str, int] = {}
    for p in sorted((R / 'traces').glob('trace_*.json')):
        task = p.stem[len('trace_'):]
        for st in json.loads(p.read_text()).get('steps', []):
            if (st.get('extra') or {}).get('event_type') == 'continuation_nudge':
                nudges[task] = nudges.get(task, 0) + 1
            obs = (st.get('observation') or {}).get('content') if isinstance(st.get('observation'), dict) else None
            et = tool_error_type(obs if isinstance(obs, str) else json.dumps(obs)) if st.get('source') == 'agent' and obs is not None else None
            if et:
                e = tool_errors.setdefault(et, {'count': 0, 'tasks': set()})
                e['count'] += 1
                e['tasks'].add(task)
                per_task[task]['tool_errors_n'] += 1
    for t, n in nudges.items():
        per_task[t]['nudges'] = n
    for t, n in repeated.items():
        per_task[t]['repeated_calls'] = n
    harness: list[str] = []
    results = jsonl(R / 'task_results.jsonl')
    harness += [f"{r['instance_id']}: {(r.get('error') or '')[:200]}" for r in results
                if any(h in (r.get('error') or '') for h in HARNESS_ERRORS)]
    if (R / 'ids.txt').exists():
        done = {r['instance_id'] for r in results}
        harness += [f'{t}: no result row (its worker died or never reached it)' for t in (R / 'ids.txt').read_text().split()
                    if t not in done]
    for p in sorted((R / 'worker_logs').glob('*.log')):
        text = p.read_text(errors='replace')
        if 'Traceback (most recent call last)' in text:
            # the exception line, not just the last line: buffered stdout can land after the traceback
            exc = EXCEPTION_LINE.search(text, text.rindex('Traceback (most recent call last)'))
            harness.append(f"{p.name}: {text.count('Traceback (most recent call last)')} Traceback(s), last: "
                           f"{exc.group(0)[:200] if exc else '?'}")
        harness += [f'{p.name}: {l[:200]}' for l in text.splitlines() if l.startswith('[warn]')]
    harness = list(dict.fromkeys(harness))
    gold_rows = jsonl(gold / 'task_results.jsonl') if gold else []
    probe = json.loads((R / 'probe.json').read_text()) if (R / 'probe.json').exists() else None
    for t, xs in think.items():
        per_task[t]['thinking_tok_p50'] = pct(xs, .5)
    out = {'tasks': len(rows), 'agent_calls_logged': n_calls,
           'flags': {k: {'calls': v['calls'], 'tasks': sorted(v['tasks'])} for k, v in flags.items()},
           'tool_errors': {k: {'count': v['count'], 'tasks': sorted(v['tasks'])} for k, v in sorted(tool_errors.items())},
           'nudges': nudges, 'repeated_calls': repeated, 'harness_errors': harness,
           'gold': {'resolved': sum(1 for r in gold_rows if r.get('resolved')), 'total': len(gold_rows),
                    'failed': sorted(r['instance_id'] for r in gold_rows if not r.get('resolved'))} if gold_rows else None,
           'probe': probe, 'examples': examples, 'per_task': {t: dict(c) for t, c in per_task.items()}}
    (R / 'analysis').mkdir(exist_ok=True)
    (R / 'analysis' / 'health.json').write_text(json.dumps(out, indent=1, default=str))
    (R / 'analysis' / 'health.md').write_text(render_health(out, rows))
    return out


def render_health(h: dict, rows: list[dict]) -> str:
    n = max(1, h['agent_calls_logged'])
    g, p = h['gold'], h['probe']
    L = [f"# Health ({h['tasks']} tasks, {h['agent_calls_logged']} logged model calls)", '',
         f"- model check: {p.get('verdict', '?') if p else 'not run'}",
         f"- gold (environment check): {g['resolved']}/{g['total']} resolved" + (f", failed: {', '.join(g['failed'])}" if g and g['failed'] else '')
         if g else '- gold (environment check): not given',
         f"- harness errors: {len(h['harness_errors']) or 'none'}", '', '## Model calls (raw vLLM responses)', '']
    if h['agent_calls_logged']:
        L += ['| check | calls | share of calls | tasks |', '|---|---:|---:|---|']
        L += [f"| {TITLES[k]} | {v['calls']} | {v['calls'] / n:.0%} | {', '.join(v['tasks'])} |" for k, v in h['flags'].items()]
    else:
        L.append('No request log (run_official --log-requests): model-call checks skipped.')
    L += ['', '## Tool results and loop (traces)', '', '| tool error | count | tasks |', '|---|---:|---|']
    L += [f"| {k} | {v['count']} | {', '.join(v['tasks'])} |" for k, v in h['tool_errors'].items()]
    L += ['', 'Nudges: ' + (', '.join(f'{t} x{n}' for t, n in sorted(h['nudges'].items())) or 'none'),
          'Repeated identical calls: ' + (', '.join(f'{t} x{n}' for t, n in sorted(h['repeated_calls'].items())) or 'none'), '',
          '## Harness errors', '']
    L += [f'- {e}' for e in h['harness_errors']] or ['none']
    L += ['', '## Per task', '', '| task | outcome | ended | calls | llm | thinking tok p50 | blank think | lost think | bad args | '
          'text-only | cut | tool errors | nudges | edit@ |', '|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|']
    for r in rows:
        c = h['per_task'].get(r['task'], {})
        L.append(f"| {r['task']} | {r['outcome']} | {r['termination']} | {r['tool_calls']} | {r['llm_calls']} | "
                 f"{c.get('thinking_tok_p50', '')} | {c.get('blank_thinking', 0)} | {c.get('reasoning_lost', 0)} | {c.get('bad_args', 0)} | "
                 f"{c.get('text_only_before_submit', 0)} | {c.get('truncated', 0)} | {c.get('tool_errors_n', 0)} | {c.get('nudges', 0)} | "
                 f"{r['first_edit_call']} |")
    L += ['', '## Examples', '']
    for k, exs in h['examples'].items():
        L += [f'### {k}', '']
        for e in exs:
            L.append(f"- {e['task']} call {e['call']} (finish {e['finish_reason']}): {'; '.join(e['problems'])}")
            L += [f'  - {f}: {json.dumps(e[f])}' for f in ('tool_calls', 'content', 'reasoning') if e[f]]
            if e.get('raw'):
                L += ['', '```', e['raw'], '```']
        L.append('')
    return '\n'.join(L) + '\n'


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('results', type=Path)
    ap.add_argument('--gold', type=Path, help='results dir of a --agent gold run on the same tasks')
    ap.add_argument('--l4-decode-tps', type=float, default=20.0, help='single-stream decode tok/s on 4x L4 (estimate)')
    ap.add_argument('--l4-prefill-tps', type=float, default=1500.0, help='uncached prefill tok/s on 4x L4 (estimate)')
    ap.add_argument('--time-budget-min', type=float, help="default: the run's time cap from run_meta.json")
    ap.add_argument('--detokenize-url', help='vLLM server root, e.g. http://127.0.0.1:8000: raw text of flagged calls')
    args = ap.parse_args(argv)
    R = args.results
    meta = json.loads((R / 'run_meta.json').read_text()) if (R / 'run_meta.json').exists() else {}
    if args.time_budget_min is None:
        args.time_budget_min = float((meta.get('budget') or {}).get('max_time_minutes') or 7.0)

    results = {r['instance_id']: r for r in jsonl(R / 'task_results.jsonl')}
    phase = {r['task']: r for r in jsonl(R / 'agent_phase.jsonl')}
    gold_bad = set()
    if args.gold:
        gold_bad = {r['instance_id'] for r in jsonl(args.gold / 'task_results.jsonl') if not r.get('resolved')}
    calls = collections.defaultdict(list)
    for c in jsonl(R / 'llm_calls.jsonl'):
        calls[c.get('task') or '?'].append(c)

    rows = []
    for iid, r in sorted(results.items()):
        ph = phase.get(iid, {})
        ts = trace_stats(R / 'traces' / f'trace_{iid}.json')
        cs = calls.get(iid, [])
        llm_lat = sum(c.get('latency') or 0 for c in cs)
        comp = sum(c.get('completion_tokens') or 0 for c in cs) or ts['completion']
        prompts = [c.get('prompt_tokens') or 0 for c in sorted(cs, key=lambda c: c.get('start') or 0)]
        # swegemma's trace has no compaction events; ADK's token-threshold compaction shows as the prompt falling from
        # >= ~14,336 tokens to a summary-sized one on the next call
        compactions = sum(1 for a, b in zip(prompts, prompts[1:]) if a >= 0.95 * COMPACTION_THRESHOLD and b < 0.6 * a)
        new_prefill = sum(max(0, b - a) for a, b in zip([0, *prompts], prompts))  # prefix-cached growth only
        agent_s = ph.get('agent_seconds')
        tool_s = max(0.0, (agent_s or 0) - llm_lat) if agent_s is not None else None
        l4_s = (tool_s or 0) + comp / args.l4_decode_tps + new_prefill / args.l4_prefill_tps if cs else None
        err = ph.get('agent_error') if ph else r.get('error')
        rows.append({
            'task': iid, 'repo': r.get('repo'), 'outcome': outcome(r, iid in gold_bad),
            'termination': termination(err, bool(ph.get('patch_submitted')) or ts['submits'] > 0),
            'agent_error': (err or '')[:200], 'verify_error': (r.get('error') or '')[:200],
            'patch_bytes': r.get('agent_patch_size'), 'tool_calls': ph.get('tool_calls', r.get('tool_calls')),
            'llm_calls': ph.get('llm_calls', r.get('total_llm_calls')), 'turns': ts['turns'],
            'max_prompt_tokens': max([ts['max_prompt'], *prompts]) if prompts or ts['max_prompt'] else None,
            'completion_tokens': comp, 'reasoning_tokens': sum(c.get('reasoning_tokens') or 0 for c in cs),
            'truncated_outputs': sum(1 for c in cs if c.get('finish_reason') == 'length'),
            'llm_errors': sum(1 for c in cs if not c.get('ok')), 'compactions': compactions or ts['compactions'],
            'empty_turns': ts['empty_turns'], 'first_edit_call': ts['first_edit_call'], 'submits': ts['submits'],
            'budget_warnings': ts['budget_warnings'], 'tools': dict(ts['tools']), 'scripts': dict(ts['scripts']),
            'thought_chars': ts['thought_chars'], 'script_crashes': ts['script_crashes'],
            'malformed_calls': ts['malformed_calls'],
            'tool_errors': dict(ts['tool_errors']), 'agent_seconds': agent_s and round(agent_s, 1),'llm_seconds': round(llm_lat, 1),
            'tool_seconds': tool_s and round(tool_s, 1), 'est_l4_seconds': l4_s and round(l4_s, 1),
            'est_l4_over_budget': bool(l4_s and l4_s > args.time_budget_min * 60),
            'duration_seconds': r.get('duration_seconds'), 'event_types': dict(ts['event_types']),
        })

    h = health(R, rows, args.gold, args.detokenize_url)
    for r in rows:
        r.update({k: 0 for k in (*FLAGS, 'text_only_before_submit', 'tool_errors_n', 'nudges', 'repeated_calls')})
        r.update(h['per_task'].get(r['task'], {}))
    (R / 'analysis').mkdir(exist_ok=True)
    (R / 'analysis' / 'tasks.json').write_text(json.dumps(rows, indent=1))
    flat = [k for k in rows[0] if not isinstance(rows[0][k], dict)] if rows else []
    with (R / 'analysis' / 'tasks.csv').open('w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=flat, extrasaction='ignore')
        w.writeheader()
        w.writerows(rows)
    report = render(rows, args, meta, h)
    (R / 'analysis' / 'report.md').write_text(report)
    print(report)
    return 0


def render(rows: list[dict], args, meta: dict, h: dict | None = None) -> str:
    n = len(rows)
    if not n:
        return 'no tasks\n'
    oc = collections.Counter(r['outcome'] for r in rows)
    solvable = [r for r in rows if r['outcome'] not in ('ENV_UNSOLVABLE', 'HARNESS_ERROR')]
    res = oc['RESOLVED']
    L = [f'# Run analysis: {meta.get("bundle", "?")} ({n} tasks)', '',
         f'Budget: {json.dumps(meta.get("budget", {}))}; compaction={meta.get("compaction")}; '
         f'concurrency={meta.get("concurrency")}; clock={meta.get("l4_clock") or "wall"}', '',
         f'**Resolved {res}/{n} ({res / n:.1%})**; excluding {oc["ENV_UNSOLVABLE"]} env-unsolvable and '
         f'{oc["HARNESS_ERROR"]} harness-error tasks: {res}/{len(solvable)} ({res / max(1, len(solvable)):.1%})', '']
    if h:
        hits = {k: v for k, v in h['flags'].items() if v['calls']}
        L += ['## Health', '', f"Details and examples: analysis/health.md. {h['agent_calls_logged']} logged model calls; "
              f"harness errors: {len(h['harness_errors']) or 'none'}; gold: "
              + (f"{h['gold']['resolved']}/{h['gold']['total']}" if h['gold'] else 'not given') + '.', '']
        L += [f"- {TITLES[k]}: {v['calls']} calls in {len(v['tasks'])} tasks" for k, v in hits.items()] or ['- no flagged model calls']
        L.append('')

    def table(title, counter, total):
        L.extend([f'## {title}', '', '| | tasks | share |', '|---|---:|---:|'])
        L.extend(f'| {k} | {v} | {v / total:.0%} |' for k, v in counter.most_common())
        L.append('')

    table('Outcomes', oc, n)
    table('Why the agent phase ended (all tasks)', collections.Counter(r['termination'] for r in rows), n)
    failed = [r for r in solvable if r['outcome'] != 'RESOLVED']
    if failed:
        table('Why the agent phase ended (unresolved, env-solvable)', collections.Counter(r['termination'] for r in failed), len(failed))
        table('Outcome x termination (unresolved)', collections.Counter(f"{r['outcome']} / {r['termination']}" for r in failed), len(failed))

    L.extend(['## By repo', '', '| repo | tasks | resolved | env-unsolvable |', '|---|---:|---:|---:|'])
    for repo in sorted({r['repo'] for r in rows}):
        rr = [r for r in rows if r['repo'] == repo]
        L.append(f"| {repo} | {len(rr)} | {sum(r['outcome'] == 'RESOLVED' for r in rr)} | "
                 f"{sum(r['outcome'] == 'ENV_UNSOLVABLE' for r in rr)} |")
    L.append('')

    def dist(key, label):
        for grp, rr in (('resolved', [r for r in rows if r['outcome'] == 'RESOLVED']), ('unresolved', failed)):
            xs = [r[key] for r in rr if r[key] is not None]
            if xs:
                L.append(f'| {label} | {grp} | {pct(xs, .5)} | {pct(xs, .9)} | {max(xs)} | {statistics.mean(xs):.1f} |')

    L.extend(['## Resource use', '', '| metric | group | p50 | p90 | max | mean |', '|---|---|---:|---:|---:|---:|'])
    for key, label in (('tool_calls', 'tool calls'), ('turns', 'LLM turns'), ('max_prompt_tokens', 'peak prompt tokens'),
                       # vLLM reports no reasoning_tokens; thoughts are counted in completion tokens
                       ('completion_tokens', 'completion tokens'), ('thought_chars', 'thinking text chars'),
                       ('first_edit_call', 'first edit at call #'), ('compactions', 'compactions'),
                       ('agent_seconds', 'agent wall s (G4)'), ('est_l4_seconds', 'est. agent s on 4xL4')):
        dist(key, label)
    L.append('')
    flags = {
        'compacted at least once': lambda r: r['compactions'] > 0,
        'compacted 2+ times': lambda r: r['compactions'] > 1,
        'peak prompt > 28,000 (near 32k window)': lambda r: (r['max_prompt_tokens'] or 0) > 28000,
        'any output cut at max_tokens': lambda r: r['truncated_outputs'] > 0,
        'any LLM error': lambda r: r['llm_errors'] > 0,
        'submitted more than once': lambda r: r['submits'] > 1,
        'never edited a file': lambda r: r['first_edit_call'] is None,
        'got budget warnings': lambda r: r['budget_warnings'] > 0,
        'skill script crashed (sandbox problem)': lambda r: r['script_crashes'] > 0,
        'malformed tool call (parser split args)': lambda r: r['malformed_calls'] > 0 or r.get('bad_args', 0) > 0,
        'blank or lost thinking in a model call': lambda r: r.get('blank_thinking', 0) + r.get('reasoning_lost', 0) > 0,
        'text-only reply before submit (nudged)': lambda r: r.get('text_only_before_submit', 0) > 0,
        'harness error': lambda r: r['outcome'] == 'HARNESS_ERROR',
        f'est. 4xL4 agent time > {args.time_budget_min} min': lambda r: r['est_l4_over_budget'],
    }
    L.extend(['## Flags', '', '| flag | tasks | of which unresolved (env-solvable) |', '|---|---:|---:|'])
    for k, f in flags.items():
        L.append(f'| {k} | {sum(1 for r in rows if f(r))} | {sum(1 for r in failed if f(r))} |')
    L.append('')

    tools, terr, scripts = collections.Counter(), collections.Counter(), collections.Counter()
    for r in rows:
        tools.update(r['tools']); terr.update(r['tool_errors']); scripts.update(r['scripts'])
    L.extend(['## Tool usage (all tasks)', '', '| tool | calls | per task | error results |', '|---|---:|---:|---:|'])
    L.extend(f'| {t} | {c} | {c / n:.1f} | {terr[t]} |' for t, c in tools.most_common())
    if scripts:
        L.extend(['', 'Skill scripts: ' + ', '.join(f'{k} x{v}' for k, v in scripts.most_common())])
    L.append('')
    L.extend(['## Unresolved tasks', '', '| task | outcome | ended | calls | turns | peak prompt | edit@ | note |',
              '|---|---|---|---:|---:|---:|---:|---|'])
    for r in sorted(failed, key=lambda r: (r['outcome'], r['termination'], r['task'])):
        note = (r['verify_error'] or r['agent_error'] or '').replace('|', '/').replace('\n', ' ')[:90]
        L.append(f"| {r['task']} | {r['outcome']} | {r['termination']} | {r['tool_calls']} | {r['turns']} | "
                 f"{r['max_prompt_tokens']} | {r['first_edit_call']} | {note} |")
    L.append('')
    L.append(f'L4 estimate: decode {args.l4_decode_tps} tok/s, uncached prefill {args.l4_prefill_tps} tok/s, plus the '
             f'tool time measured here (G4 runtime under concurrency, so tool time is an upper bound).')
    return '\n'.join(L) + '\n'


if __name__ == '__main__':
    raise SystemExit(main())
