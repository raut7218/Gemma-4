"""A shared work queue for run_official.py workers: one JSON file per (arm, task), claimed by an atomic rename.

  python -m colab_eval.taskqueue build --queue /content/queue --arms arms.json [--priors results/v8 ...]
  python -m colab_eval.taskqueue status --queue /content/queue
  python -m colab_eval.taskqueue requeue --queue /content/queue   # items a crashed worker left in doing/ go back

arms.json is a list of arms (fields of run_official.Arm): name (no "-"), bundle, data, results, sandbox_site, and optionally
ids (a file with one task id per line), priority (lower runs first, default 0), site_map, deps, setup_py, wheels,
tasks_file, max_time_minutes, l4_clock, real_time_minutes, log_requests, agent. Within a priority, tasks run
longest-expected first (agent seconds from --priors, earlier runs of the same task ids), so a session does not end
with one long task on an otherwise idle GPU. Items already in done/ are not queued again unless --reset is given.
Workers: python -m colab_eval.run_official --queue DIR --worker K [--deadline +MINUTES].
"""

from __future__ import annotations

import argparse
import collections
import json
import os
import statistics
from pathlib import Path

DIRS = ('todo', 'doing', 'done', 'failed')


def item_name(priority: int, rank: int, arm: str, task: str) -> str:
    return f'{priority:02d}-{rank:05d}-{arm}-{task}.json'


def claim(qdir: Path, worker: str) -> Path | None:
    """Moves the first todo item to doing/ for this worker; None when nothing is left."""
    todo = qdir / 'todo'
    for name in sorted(os.listdir(todo)):
        dst = qdir / 'doing' / f'{name}.{worker}'
        try:
            os.rename(todo / name, dst)
        except FileNotFoundError:  # another worker took it first
            continue
        return dst
    return None


def finish(qdir: Path, item: Path, ok: bool = True) -> None:
    name = item.name.rsplit('.', 1)[0] if not item.name.endswith('.json') else item.name
    os.replace(item, qdir / ('done' if ok else 'failed') / name)


def requeue(qdir: Path) -> int:
    n = 0
    for p in (qdir / 'doing').iterdir():
        os.replace(p, qdir / 'todo' / p.name.rsplit('.', 1)[0])
        n += 1
    return n


def priors(paths: list[Path]) -> dict[str, float]:
    """Expected agent seconds per task id from earlier runs (agent_phase.jsonl, else task_timing.jsonl)."""
    out: dict[str, list[float]] = collections.defaultdict(list)
    for p in paths:
        for name, key in (('agent_phase.jsonl', 'agent_seconds'), ('task_timing.jsonl', None)):
            f = p / name
            if not f.exists():
                continue
            for line in f.read_text().splitlines():
                if not line.strip():
                    continue
                r = json.loads(line)
                v = r.get(key) if key else (r.get('end', 0) - r.get('start', 0))
                if v:
                    out[r['task']].append(float(v))
            break
    return {t: statistics.median(v) for t, v in out.items()}


def task_ids(arm: dict) -> list[str]:
    if arm.get('ids'):
        ids = arm['ids'] if isinstance(arm['ids'], list) else Path(arm['ids']).read_text().split()
        return [i for i in ids if i]
    tasks = Path(arm.get('tasks_file') or Path(arm['data']) / 'tasks.jsonl')
    return [json.loads(l)['instance_id'] for l in tasks.read_text().splitlines() if l.strip()]


def build(qdir: Path, arms: list[dict], prior_runs: list[Path], reset: bool = False) -> dict[str, int]:
    for d in DIRS:
        (qdir / d).mkdir(parents=True, exist_ok=True)
    if reset:
        for d in DIRS:
            for p in (qdir / d).iterdir():
                p.unlink()
    # arm-task keys already queued, running or finished (ranks change between builds, so compare without them)
    done = {(p.name.rsplit('.', 1)[0] if d == 'doing' else p.name).split('-', 2)[2]
            for d in DIRS for p in (qdir / d).iterdir()}
    exp = priors(prior_runs)
    default = statistics.median(exp.values()) if exp else 600.0
    for a in arms:  # absolute paths: workers may start from another directory
        for k in ('bundle', 'data', 'results', 'sandbox_site', 'setup_py', 'wheels', 'tasks_file'):
            if a.get(k):
                a[k] = str(Path(a[k]).resolve())
        a['site_map'] = {r: str(Path(p).resolve()) for r, p in (a.get('site_map') or {}).items()}
    (qdir / 'arms.json').write_text(json.dumps(arms, indent=1))
    counts: dict[str, int] = {}
    for a in arms:
        ids = sorted(task_ids(a), key=lambda t: -exp.get(t, default))
        n = 0
        for rank, t in enumerate(ids):
            name = item_name(int(a.get('priority', 0)), rank, a['name'], t)
            if name.split('-', 2)[2] in done:
                continue
            (qdir / 'todo' / name).write_text(json.dumps({'arm': a['name'], 'task': t, 'seq': rank + 1}))
            n += 1
        counts[a['name']] = n
    return counts


def status(qdir: Path) -> dict[str, dict[str, int]]:
    out: dict[str, dict[str, int]] = collections.defaultdict(lambda: dict.fromkeys(DIRS, 0))
    for d in DIRS:
        for p in (qdir / d).iterdir():
            out[p.name.split('-', 3)[2]][d] += 1
    return dict(out)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('cmd', choices=['build', 'status', 'requeue'])
    ap.add_argument('--queue', type=Path, required=True)
    ap.add_argument('--arms', type=Path, help='arms.json (build)')
    ap.add_argument('--priors', type=Path, nargs='*', default=[], help='earlier results dirs for the task order')
    ap.add_argument('--reset', action='store_true', help='build: drop every existing item first')
    args = ap.parse_args(argv)
    q = args.queue.resolve()
    if args.cmd == 'build':
        if not args.arms:
            ap.error('build needs --arms')
        print(json.dumps(build(q, json.loads(args.arms.read_text()), args.priors, args.reset)))
    elif args.cmd == 'status':
        print(json.dumps(status(q), indent=1))
    else:
        print(f'requeued {requeue(q)} items')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
