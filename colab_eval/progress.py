"""Live view of a run in progress (gpu_run.sh / run_official.py), from the files it writes as it goes, so problems show
up in the first minutes instead of in the final report: tasks done / resolved / ETA, every in-flight task with its tool
calls, last tool and prompt size, stalled workers, and warnings (LLM errors, outputs cut at max_tokens, tool errors,
script tracebacks, worker crashes) plus one vLLM sample.

  python -m colab_eval.progress /content/results/v9-12b                 one snapshot
  python -m colab_eval.progress /content/results/v9-12b --every 60      refresh forever (Colab Terminal)
  python -m colab_eval.progress /content/results/v9-12b --task ID [-n 40]   the last lines of one task's log

swegemma writes <results>/logs/<task>.log line-buffered (tool calls and results as they happen); gpu_run.sh keeps one
results dir per worker under shards/, which is read the same way.
"""

from __future__ import annotations

import argparse
import collections
import json
import re
import time
from pathlib import Path

from colab_eval.analyze import jsonl, outcome, termination

ANSI = re.compile(r'\x1b\[[0-9;]*m')
EVENT = re.compile(r'^\s*\[\s*([\d.]+)s\]( +)(\S+)\s?(.*)$')  # "[  16.0s] 🔧 run_command ...", "[  16.0s]   → result"
TOOL_ICONS = {'🔧', '📖', '✏️', '🤖', '📝'}
STALL_S = 600  # an in-flight task whose log has not grown for this long is reported as stalled


def parse_log(path: Path) -> dict:
    s = {'calls': collections.Counter(), 'errors': 0, 'tracebacks': 0, 'last_tool': '', 'last_t': 0.0,
         'finished': False}
    for line in ANSI.sub('', path.read_text(errors='replace')).splitlines():
        m = EVENT.match(line)
        if not m:
            continue
        t, nested, icon, rest = float(m.group(1)), len(m.group(2)) > 1, m.group(3), m.group(4)
        s['last_t'] = t
        if icon in TOOL_ICONS and rest and not nested:
            name = rest.split()[0]
            s['calls'][name] += 1
            s['last_tool'] = rest[:90]
        elif icon == '→' and (rest.startswith('error') or rest.startswith('Traceback') or '"stderr": "Traceback' in rest):
            s['errors'] += 1
            s['tracebacks'] += 'Traceback' in rest
        elif icon == '❌':
            s['errors'] += 1
        elif icon == '✅':
            s['finished'] = True
    return s


def shard_dirs(R: Path) -> list[Path]:
    shards = sorted((R / 'shards').glob('*'), key=lambda p: int(p.name) if p.name.isdigit() else 0)
    return shards or [R]


def snapshot(R: Path, data: Path | None, work: Path, vllm: str) -> str:
    now = time.time()
    shards = shard_dirs(R)
    results, phase, calls, started = {}, {}, collections.defaultdict(list), []
    for d in shards:
        results.update({r['instance_id']: r for r in jsonl(d / 'task_results.jsonl')})
        phase.update({r['task']: r for r in jsonl(d / 'agent_phase.jsonl')})
        for c in jsonl(d / 'llm_calls.jsonl'):
            calls[c.get('task') or '?'].append(c)
        if (d / 'run_meta.json').exists():
            started.append(json.loads((d / 'run_meta.json').read_text()).get('started') or now)
    total = None
    if data and (data / 'tasks.jsonl').exists():
        total = sum(1 for l in (data / 'tasks.jsonl').read_text().splitlines() if l.strip())
    t0 = min(started) if started else now
    done, res = len(results), sum(1 for r in results.values() if r.get('resolved'))
    out = [f"{time.strftime('%H:%M:%S')}  {R.name}: {done}/{total or '?'} done, {res} resolved"
           f" ({res / done:.0%} of done)" if done else f"{time.strftime('%H:%M:%S')}  {R.name}: 0/{total or '?'} done"]
    el = (now - t0) / 60
    line = f'elapsed {el:.0f} min, {len(shards)} workers'
    if done and total and done < total:
        line += f', {done / el:.2f} tasks/min, ETA ~{(total - done) / (done / el):.0f} min' if el > 0 else ''
    out.append(line)
    if results:
        oc = collections.Counter(
            f"{outcome(r, False)}/{termination(phase.get(i, {}).get('agent_error') or r.get('error'), bool(phase.get(i, {}).get('patch_submitted')))}"
            for i, r in results.items())
        out.append('outcomes: ' + ', '.join(f'{k} {v}' for k, v in oc.most_common()))

    out.append('')
    out.append(f"{'worker':>6} {'task':<22} {'min':>5} {'calls':>5} {'llm':>4} {'prompt':>6} {'err':>3}  last tool")
    warn: list[str] = []
    tool_tot, err_tot, tb_tot = collections.Counter(), 0, 0
    for d in shards:
        logs = sorted((d / 'logs').glob('*.log'), key=lambda p: p.stat().st_mtime) if (d / 'logs').exists() else []
        for p in logs:
            s = parse_log(p)
            tool_tot.update(s['calls'])
            err_tot += s['errors']
            tb_tot += s['tracebacks']
        live = [p for p in logs if p.stem not in results]
        if not live:
            out.append(f'{d.name:>6} {"(idle or finished)":<22}')
            continue
        p = live[-1]
        s, cs = parse_log(p), calls.get(p.stem, [])
        idle = now - p.stat().st_mtime
        flag = '  STALLED' if idle > STALL_S else ''
        last_prompt = (sorted(cs, key=lambda c: c.get('start') or 0)[-1].get('prompt_tokens') or 0) if cs else 0
        out.append(f'{d.name:>6} {p.stem[:22]:<22} {s["last_t"] / 60:5.1f} {sum(s["calls"].values()):5d} {len(cs):4d} '
                   f'{last_prompt:6d} {s["errors"]:3d}  {s["last_tool"][:60]}{flag}')
        if flag:
            warn.append(f'worker {d.name}: {p.stem} log unchanged for {idle / 60:.0f} min')

    all_calls = [c for cs in calls.values() for c in cs]
    n_err = sum(1 for c in all_calls if not c.get('ok'))
    n_len = sum(1 for c in all_calls if c.get('finish_reason') == 'length')
    out.append('')
    out.append(f'llm calls {len(all_calls)}, errors {n_err}, cut at max_tokens {n_len}; tool calls '
               + ', '.join(f'{k} {v}' for k, v in tool_tot.most_common(8)) + f'; tool errors {err_tot}, tracebacks {tb_tot}')
    if n_err:
        last = [c for c in all_calls if not c.get('ok')][-1]
        warn.append(f"LLM errors: {n_err} (last, {last.get('task')}: {(last.get('error') or '')[:150]})")
    if all_calls and n_len / len(all_calls) > 0.05:
        warn.append(f'{n_len / len(all_calls):.0%} of LLM outputs cut at max_tokens')
    scripts = tool_tot.get('run_skill_script', 0)
    if scripts >= 10 and tb_tot / scripts > 0.3:
        warn.append(f'{tb_tot} tracebacks for {scripts} run_skill_script calls: skill scripts may be crashing')
    for log in sorted(work.glob(f'run_{R.name}_*.log')):
        text = ANSI.sub('', log.read_text(errors='replace'))
        bad = [l for l in text.splitlines() if re.search(r'Traceback|Error|Killed|exited', l) and 'warn' not in l.lower()]
        if bad:
            warn.append(f'{log.name}: {bad[-1][:150]}')
    if warn:
        out.append('')
        out += [f'WARN {w}' for w in warn[:15]]

    try:
        from colab_eval.vllm_stats import sample
        v = sample(vllm)
        out.append('')
        out.append(f"vLLM running={v['running']:.0f} waiting={v['waiting']:.0f} kv={v['kv'] * 100:.0f}% "
                   f"prefix_hit(total)={v['hits'] / v['queries'] * 100 if v['queries'] else 0:.0f}% preemptions={v['preempt']:.0f}")
    except OSError as e:
        out.append(f'vLLM not reachable at {vllm}: {e}')
    return '\n'.join(out)


def tail_task(R: Path, task: str, n: int) -> str:
    for d in shard_dirs(R):
        p = d / 'logs' / f'{task}.log'
        if p.exists():
            return '\n'.join(ANSI.sub('', p.read_text(errors='replace')).splitlines()[-n:])
    return f'no log for {task} under {R}'


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('results', type=Path)
    ap.add_argument('--data', type=Path, default=Path('/content/comp'), help='for the task count (tasks.jsonl)')
    ap.add_argument('--work', type=Path, default=Path('/content/work'), help='where gpu_run.sh writes run_<RUN>_<k>.log')
    ap.add_argument('--vllm', default='http://127.0.0.1:8000')
    ap.add_argument('--every', type=float, default=0, help='refresh every N seconds (0 = once)')
    ap.add_argument('--task', help='print the last lines of this task log instead')
    ap.add_argument('-n', type=int, default=40)
    ap.add_argument('--out', type=Path, help='also write the snapshot to this file')
    a = ap.parse_args(argv)
    if a.task:
        print(tail_task(a.results, a.task, a.n))
        return 0
    while True:
        text = snapshot(a.results, a.data, a.work, a.vllm)
        if a.out:
            a.out.write_text(text + '\n')
        print(('\x1b[2J\x1b[H' if a.every else '') + text, flush=True)
        if not a.every:
            return 0
        time.sleep(a.every)


if __name__ == '__main__':
    raise SystemExit(main())
