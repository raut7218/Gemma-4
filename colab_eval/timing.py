"""Kaggle-time model for run_official.py results: what each task would cost on the scorer's 4x L4, which resolved tasks
survive a given time cap, and how long the ~120-task scoring job takes (it fails as a whole past 12 h).

  python -m colab_eval.timing results/v8 [--gold results/gold] [--rates 20,1500] [--compare results/v9-12b --compare-rates 45,3500]

Clock of a task on the scorer, as a function of the real time T of an event in the G4 run:
  L4 LLM seconds of the calls finished by T (each re-priced from its token counts: new prefill tokens / prefill rate +
  completion tokens / decode rate), times m, plus the real non-LLM time up to T (tool runs, harness).
m scales the assumed L4 rates (m = 0.7: the L4 is 1/0.7 times faster than assumed). It and the per-task overhead
(container setup and grading) are unknown; they are bounded by our Kaggle submissions that finished inside 12 h or
overran (KAGGLE_OUTCOMES), using a run as the proxy for their token use. A call's new prefill is its growth over the previous prompt (prefix caching, one task at a time as on
Kaggle) or the whole prompt after a compaction. Compaction summary calls are priced like any other call.
"""

from __future__ import annotations

import argparse
import collections
import json
from dataclasses import dataclass, field
from pathlib import Path

EDIT_TOOLS = {'edit_file', 'write_file'}
FREE_TOOLS = {'get_status', 'submit_patch'}  # not counted against max_tool_calls
# shell commands that change files: the patch can be final after one of these even without an edit_file call
WRITE_HINTS = ('sed -i', 'cat >', 'cat <<', 'tee ', '> /workspace', '>> /workspace', 'python - <<', 'python3 - <<',
               'git apply', 'patch ', 'mv ', 'cp ', 'rm ')
KAGGLE_LIMIT_H = 12.0
# (max_time_minutes, max_tool_calls, finished inside 12 h) of our thinking-on Kaggle submissions (kaggle competitions
# submissions): v3 5 min / 50 calls scored; v4, v5 and v7 at 8 min / 28 calls scored; v7 at 10 min / 28 calls overran;
# v10 at 4.5 min / 35 calls scored (2026-10-20).
KAGGLE_OUTCOMES = [(5.0, 50, True), (8.0, 28, True), (10.0, 28, False), (4.5, 35, True)]


def call_cost(prev_prompt: int, prompt: int, completion: int, decode_tps: float, prefill_tps: float) -> float:
    """L4 seconds of one LLM call on a single stream with prefix caching (the scorer runs one task at a time)."""
    new = prompt - prev_prompt if prompt >= prev_prompt else prompt
    return new / prefill_tps + completion / decode_tps


@dataclass
class Task:
    task: str
    repo: str = ''
    resolved: bool = False
    env_bad: bool = False
    calls: list[tuple[float, float, int, int]] = field(default_factory=list)  # (start, latency, prompt, completion)
    events: list[tuple[float, str]] = field(default_factory=list)  # (timestamp, edit|write|tool|free)

    def clock(self, decode: float, prefill: float):
        """Returns f(T, m) -> scorer seconds at real time T, and the end time of the run."""
        cs = sorted(self.calls)
        t0 = cs[0][0] if cs else 0.0
        ends, costs, lats, prev = [], [], [], 0
        for start, lat, p, c in cs:
            ends.append(start + lat)
            costs.append(call_cost(prev, p, c, decode, prefill))
            lats.append(lat)
            prev = p

        def at(T: float, m: float) -> float:
            llm = real_llm = 0.0
            for e, cost, lat in zip(ends, costs, lats):
                if e <= T + 1e-6:
                    llm += cost
                    real_llm += lat
            return m * llm + max(0.0, (T - t0) - real_llm)

        return at, (ends[-1] if ends else t0)

    def final_patch_time(self) -> float | None:
        """Time of the last file-changing action (an edit, or a shell command that writes), else of the last event."""
        writes = [t for t, k in self.events if k in ('edit', 'write')]
        if writes:
            return max(writes)
        return max((t for t, _ in self.events), default=None)

    def end_time(self, max_calls: int | None) -> float | None:
        """Real time at which the run would have ended with max_calls counted tool calls (the reply after the last)."""
        cs = sorted(self.calls)
        if not cs:
            return None
        if max_calls is None:
            return cs[-1][0] + cs[-1][1]
        counted = sorted(t for t, k in self.events if k != 'free')
        if len(counted) < max_calls:
            return cs[-1][0] + cs[-1][1]
        t_k = counted[max_calls - 1]
        after = [s + l for s, l, _, _ in cs if s >= t_k]
        return after[0] if after else cs[-1][0] + cs[-1][1]


def classify(name: str, args: dict) -> str:
    if name in EDIT_TOOLS:
        return 'edit'
    if name in FREE_TOOLS:
        return 'free'
    if name == 'run_command' and any(h in str(args.get('command', '')) for h in WRITE_HINTS):
        return 'write'
    return 'tool'


def load_run(results: Path, gold: Path | None = None) -> list[Task]:
    def jsonl(p: Path) -> list[dict]:
        return [json.loads(l) for l in p.read_text().splitlines() if l.strip()] if p.exists() else []

    bad = {r['instance_id'] for r in jsonl(gold / 'task_results.jsonl') if not r.get('resolved')} if gold else set()
    tasks = {r['instance_id']: Task(r['instance_id'], r.get('repo', ''), bool(r.get('resolved')), r['instance_id'] in bad)
             for r in jsonl(results / 'task_results.jsonl')}
    for c in jsonl(results / 'llm_calls.jsonl'):
        t = tasks.get(c.get('task'))
        if t is not None and c.get('ok', True):
            t.calls.append((c['start'], c.get('latency') or 0.0, c.get('prompt_tokens') or 0, c.get('completion_tokens') or 0))
    for t in tasks.values():
        p = results / 'traces' / f'trace_{t.task}.json'
        if not p.exists():
            continue
        for st in json.loads(p.read_text()).get('steps', []):
            if st.get('source') != 'agent':
                continue
            for c in st.get('tool_calls') or []:
                ts = (c.get('extra') or {}).get('timestamp') or (st.get('extra') or {}).get('timestamp')
                if ts:
                    t.events.append((ts, classify(c.get('function_name', ''), c.get('arguments') or {})))
    return sorted(tasks.values(), key=lambda t: t.task)


def task_seconds(t: Task, rates: tuple[float, float], m: float, cap_s: float, max_calls: int | None) -> float:
    at, _ = t.clock(*rates)
    end = t.end_time(max_calls)
    return 0.0 if end is None else min(cap_s, at(end, m))


def solves_within(tasks: list[Task], rates, m: float, cap_s: float) -> int:
    """Resolved tasks whose patch was final before the cap: their diff at the cutoff is the graded diff."""
    n = 0
    for t in tasks:
        if not t.resolved:
            continue
        T = t.final_patch_time()
        at, end = t.clock(*rates)
        if at(T if T is not None else end, m) <= cap_s:
            n += 1
    return n


def project_hours(tasks: list[Task], rates, m: float, overhead_s: float, cap_s: float, max_calls: int | None,
                  n_kaggle: int = 120, startup_h: float = 0.2) -> float:
    """Wall time of the scoring job: startup + n_kaggle tasks, each its capped agent time plus setup and grading."""
    per = [task_seconds(t, rates, m, cap_s, max_calls) + overhead_s for t in tasks if t.calls]
    return startup_h + sum(per) / len(per) * n_kaggle / 3600


def calibrated_region(proxy: list[Task], rates, ms, overheads, outcomes=KAGGLE_OUTCOMES) -> list[tuple[float, float]]:
    """(m, overhead) pairs under which the proxy's token use reproduces every Kaggle outcome (finished or overran)."""
    def ok(m, ov):
        return all((project_hours(proxy, rates, m, ov, cap * 60, calls) <= KAGGLE_LIMIT_H) == finished
                   for cap, calls, finished in outcomes)
    return [(m, ov) for m in ms for ov in overheads if ok(m, ov)]


OVERHEADS = [15, 30, 45, 60, 75, 90, 120]


def frange(a: float, b: float, step: float) -> list[float]:
    n = int(round((b - a) / step))
    return [round(a + i * step, 4) for i in range(n + 1)]


def narrow(region, tasks: list[Task], rates, measured: tuple[float, int, float, float]) -> list[tuple[float, float]]:
    """Pairs under which `tasks` (the run of the submitted bundle) projects to the measured job time (probe_timer):
    measured = (cap minutes, max calls, hours, tolerance hours)."""
    cap, calls, hours, tol = measured
    return [(m, ov) for m, ov in region if abs(project_hours(tasks, rates, m, ov, cap * 60, calls) - hours) <= tol]


def report(tasks: list[Task], rates, label: str, proxy: list[Task], proxy_rates, max_calls: int, target_h: float,
           caps_min: list[float], ms: list[float], measured=None) -> tuple[list[str], dict]:
    region = calibrated_region(proxy, proxy_rates, frange(0.30, 1.20, 0.01), OVERHEADS)
    if measured and region:
        kept = narrow(region, tasks, rates, measured)
        region = kept or region
        out_note = f'measured job time {measured[2]:g} h at {measured[0]:g} min / {measured[1]} calls: ' + (
            f'{len(kept)} pairs fit' if kept else 'no pair fits within the tolerance; kept the full band')
    else:
        out_note = None
    out: dict = {'label': label, 'rates': rates, 'region': region, 'resolved': sum(t.resolved for t in tasks),
                 'tasks': len(tasks), 'caps': {}}
    L = [f'### {label}: {out["resolved"]} resolved of {len(tasks)}, L4 rates {rates[0]:g} decode / {rates[1]:g} prefill tok/s', '']
    if out_note:
        L += [out_note, '']
        out['measured'] = out_note
    L += ['Resolved tasks whose patch was final before the cap (time-adjusted solves), by L4-speed multiplier m:', '',
          '| cap | ' + ' | '.join(f'm={m:g}' for m in ms) + ' |', '|---|' + '---:|' * len(ms)]
    for c in caps_min:
        row = [solves_within(tasks, rates, m, c * 60) for m in ms]
        out['caps'].setdefault(str(c), {})['solves'] = dict(zip(map(str, ms), row))
        L.append(f'| {c:g} min | ' + ' | '.join(map(str, row)) + ' |')
    L.append('')
    if region:
        by_ov = collections.defaultdict(list)
        for m, ov in region:
            by_ov[ov].append(m)
        L += ['(m, per-task overhead) pairs that reproduce every Kaggle outcome '
              f'{KAGGLE_OUTCOMES} with this proxy: ' + '; '.join(f'overhead {ov}s: m {min(v):.2f}-{max(v):.2f}' for ov, v in sorted(by_ov.items())), '']
        L += [f'Projected scoring job for 120 tasks at {max_calls} calls, over that region (min-max):', '',
              '| cap | hours | fits <= ' + f'{target_h:g} h in every case |', '|---|---:|---|']
        best = None
        for c in caps_min:
            hs = [project_hours(tasks, rates, m, ov, c * 60, max_calls) for m, ov in region]
            ok = max(hs) <= target_h
            best = c if ok else best
            out['caps'].setdefault(str(c), {})['hours'] = [round(min(hs), 2), round(max(hs), 2)]
            L.append(f'| {c:g} min | {min(hs):.1f}-{max(hs):.1f} | {"yes" if ok else "no"} |')
        out['safe_cap_min'] = best
        L += ['', f'Largest cap that fits {target_h:g} h in every calibrated case: {best if best else "none"} min', '']
    else:
        L += ['No (m, overhead) pair on the grid reproduces the Kaggle outcomes with this proxy.', '']
    return L, out


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('results', type=Path)
    ap.add_argument('--gold', type=Path)
    ap.add_argument('--rates', default='20,1500', help='assumed single-stream 4x L4 decode,prefill tok/s for this model')
    ap.add_argument('--max-calls', type=int, default=35, help='max_tool_calls of the configuration to project')
    ap.add_argument('--proxy', type=Path, help='run used as the proxy for the Kaggle submissions\' token use (default: this run)')
    ap.add_argument('--proxy-rates', default=None, help='rates of the proxy run (default: --rates)')
    ap.add_argument('--compare', type=Path, action='append', default=[], help='more runs to tabulate the same way')
    ap.add_argument('--compare-rates', action='append', default=[])
    ap.add_argument('--target-hours', type=float, default=10.5)
    ap.add_argument('--caps', default='4,4.5,5,5.5,6,7,8')
    ap.add_argument('--ms', default='1.0,0.8,0.7,0.6')
    ap.add_argument('--measured', help='CAP,CALLS,HOURS[,TOL]: a probe submission of this run\'s bundle took HOURS '
                    '(probe_timer); keeps the calibrated pairs that reproduce it (TOL default 0.3 h)')
    ap.add_argument('--json', type=Path, help='also write the numbers as JSON')
    args = ap.parse_args(argv)
    rates = tuple(float(x) for x in args.rates.split(','))
    measured = None
    if args.measured:
        v = [float(x) for x in args.measured.split(',')]
        measured = (v[0], int(v[1]), v[2], v[3] if len(v) > 3 else 0.3)
    caps = [float(x) for x in args.caps.split(',')]
    ms = [float(x) for x in args.ms.split(',')]
    proxy = load_run(args.proxy, args.gold) if args.proxy else None
    proxy_rates = tuple(float(x) for x in (args.proxy_rates or args.rates).split(','))
    runs = [(args.results, rates)] + [(p, tuple(float(x) for x in r.split(','))) for p, r in
                                     zip(args.compare, args.compare_rates or [args.rates] * len(args.compare))]
    lines, data = [f'# Kaggle-time model ({args.max_calls} calls, target {args.target_hours:g} h for 120 tasks)', ''], []
    for path, r in runs:
        tasks = load_run(path, args.gold)
        L, d = report(tasks, r, path.name, proxy or tasks, proxy_rates if proxy else r, args.max_calls,
                      args.target_hours, caps, ms, measured if path == args.results else None)
        lines += L
        data.append(d)
    print('\n'.join(lines))
    if args.json:
        args.json.write_text(json.dumps(data, indent=1))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
