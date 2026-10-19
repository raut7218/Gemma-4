"""Where does a submission lose tasks? Reads a run_official.py results dir and writes report.md + tasks.csv/json.

  python -m colab_eval.analyze results/v8 [--gold results/gold] [--l4-decode-tps 20 --l4-prefill-tps 1500]

Per task: outcome, why the agent phase ended, tool calls (by tool, skill script and error), turns, peak prompt tokens,
compactions, completion/reasoning tokens, outputs cut at max_tokens, first edit, submits, wall times, and an estimate of
the agent time on the scorer's 4x L4 (LLM time re-priced at the given L4 rates plus the measured tool time). Tasks whose
reference patch does not pass in this environment (--gold run) are reported as ENV_UNSOLVABLE and left out of the
adjusted rate, so they are not blamed on the agent.
"""

from __future__ import annotations

import argparse
import collections
import csv
import json
import statistics
from pathlib import Path

EDIT_TOOLS = {'edit_file', 'write_file'}


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
         'budget_warnings': 0, 'event_types': collections.Counter(), 'empty_turns': 0, 'thought_chars': 0}
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


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('results', type=Path)
    ap.add_argument('--gold', type=Path, help='results dir of a --agent gold run on the same tasks')
    ap.add_argument('--l4-decode-tps', type=float, default=20.0, help='single-stream decode tok/s on 4x L4 (estimate)')
    ap.add_argument('--l4-prefill-tps', type=float, default=1500.0, help='uncached prefill tok/s on 4x L4 (estimate)')
    ap.add_argument('--time-budget-min', type=float, default=7.0)
    args = ap.parse_args(argv)
    R = args.results

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
        prompts = [c.get('prompt_tokens') or 0 for c in cs]
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
            'llm_errors': sum(1 for c in cs if not c.get('ok')), 'compactions': ts['compactions'],
            'empty_turns': ts['empty_turns'], 'first_edit_call': ts['first_edit_call'], 'submits': ts['submits'],
            'budget_warnings': ts['budget_warnings'], 'tools': dict(ts['tools']), 'scripts': dict(ts['scripts']),
            'tool_errors': dict(ts['tool_errors']), 'agent_seconds': agent_s and round(agent_s, 1),'llm_seconds': round(llm_lat, 1),
            'tool_seconds': tool_s and round(tool_s, 1), 'est_l4_seconds': l4_s and round(l4_s, 1),
            'est_l4_over_budget': bool(l4_s and l4_s > args.time_budget_min * 60),
            'duration_seconds': r.get('duration_seconds'), 'event_types': dict(ts['event_types']),
        })

    (R / 'analysis').mkdir(exist_ok=True)
    (R / 'analysis' / 'tasks.json').write_text(json.dumps(rows, indent=1))
    flat = [k for k in rows[0] if not isinstance(rows[0][k], dict)] if rows else []
    with (R / 'analysis' / 'tasks.csv').open('w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=flat, extrasaction='ignore')
        w.writeheader()
        w.writerows(rows)
    report = render(rows, args, json.loads((R / 'run_meta.json').read_text()) if (R / 'run_meta.json').exists() else {})
    (R / 'analysis' / 'report.md').write_text(report)
    print(report)
    return 0


def render(rows: list[dict], args, meta: dict) -> str:
    n = len(rows)
    if not n:
        return 'no tasks\n'
    oc = collections.Counter(r['outcome'] for r in rows)
    solvable = [r for r in rows if r['outcome'] != 'ENV_UNSOLVABLE']
    res = oc['RESOLVED']
    L = [f'# Run analysis: {meta.get("bundle", "?")} ({n} tasks)', '',
         f'Budget: {json.dumps(meta.get("budget", {}))}; compaction={meta.get("compaction")}; '
         f'concurrency={meta.get("concurrency")}', '',
         f'**Resolved {res}/{n} ({res / n:.1%})**; excluding {oc["ENV_UNSOLVABLE"]} env-unsolvable tasks: '
         f'{res}/{len(solvable)} ({res / max(1, len(solvable)):.1%})', '']

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
                       ('completion_tokens', 'completion tokens'), ('reasoning_tokens', 'reasoning tokens'),
                       ('first_edit_call', 'first edit at call #'), ('compactions', 'compactions'),
                       ('agent_seconds', 'agent wall s (G4)'), ('est_l4_seconds', 'est. agent s on 4xL4')):
        dist(key, label)
    L.append('')
    flags = {
        'peak prompt > 14,336 (compaction threshold)': lambda r: (r['max_prompt_tokens'] or 0) > 14336,
        'peak prompt > 28,000 (near 32k window)': lambda r: (r['max_prompt_tokens'] or 0) > 28000,
        'any output cut at max_tokens': lambda r: r['truncated_outputs'] > 0,
        'any LLM error': lambda r: r['llm_errors'] > 0,
        'submitted more than once': lambda r: r['submits'] > 1,
        'never edited a file': lambda r: r['first_edit_call'] is None,
        'got budget warnings': lambda r: r['budget_warnings'] > 0,
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
