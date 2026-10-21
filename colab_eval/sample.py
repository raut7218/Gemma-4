"""The tasks of a check run: a small sample stratified by repository like the public tasks, the same every time.

  python -m colab_eval.sample --n 10 --pool ext/public_ok.txt results/gold comp/tasks.jsonl

The pool is the first of --pool that exists: a text file of task ids, a results dir (its resolved tasks, e.g. the
gold run, so only tasks this environment can solve), or a tasks.jsonl (every task). Repositories get their share of
n by the public mix (largest remainder; a repo short of tasks hands the rest on), and each repo's tasks are taken
evenly spaced in PR order. Prints one id per line.
"""

from __future__ import annotations

import argparse
import collections
import json
import sys
from pathlib import Path

PUBLIC_MIX = {'fastapi': 67, 'rich': 48, 'requests': 13, 'httpx': 1}  # the 129 public tasks by repository


def repo_of(task: str) -> str:
    return task.rsplit('_', 1)[0]


def pr_key(task: str) -> tuple:
    n = task.rsplit('_', 1)[-1]
    return (0, int(n), task) if n.isdigit() else (1, 0, task)


def pick(ids: list[str], n: int, mix: dict[str, int] = PUBLIC_MIX) -> list[str]:
    by = collections.defaultdict(list)
    for t in sorted(set(ids), key=pr_key):
        by[repo_of(t)].append(t)
    weight = {r: mix.get(r, 0) for r in by}
    if not sum(weight.values()):
        weight = dict.fromkeys(by, 1)
    total = sum(weight.values())
    share = {r: n * w / total for r, w in weight.items()}
    quota = {r: min(int(s), len(by[r])) for r, s in share.items()}
    # the rest by largest remainder, then to whichever repo still has tasks
    for r in sorted(by, key=lambda r: (-(share[r] - int(share[r])), -weight[r], r)) + sorted(by, key=lambda r: (-weight[r], r)) * n:
        if sum(quota.values()) >= min(n, len(set(ids))):
            break
        if quota[r] < len(by[r]):
            quota[r] += 1
    out = []
    for r, k in quota.items():
        out += [by[r][int((i + 0.5) * len(by[r]) / k)] for i in range(k)]
    return sorted(out, key=lambda t: (repo_of(t), pr_key(t)))


def source(paths: list[Path]) -> Path:
    p = next((p for p in paths if p.is_file() or (p / 'task_results.jsonl').exists()), None)
    if p is None:
        raise SystemExit(f'no task pool among {[str(p) for p in paths]}')
    return p


def pool(paths: list[Path]) -> list[str]:
    p = source(paths)
    if p.is_dir():
        rows = [json.loads(l) for l in (p / 'task_results.jsonl').read_text().splitlines() if l.strip()]
        return [r['instance_id'] for r in rows if r.get('resolved')]
    if p.suffix == '.jsonl':
        return [json.loads(l)['instance_id'] for l in p.read_text().splitlines() if l.strip()]
    return p.read_text().split()


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--n', type=int, default=10)
    ap.add_argument('--pool', type=Path, nargs='+', required=True)
    args = ap.parse_args(argv)
    ids = pick(pool(args.pool), args.n)
    print(f'sample: {len(ids)} tasks from {source(args.pool)}', file=sys.stderr)
    print('\n'.join(ids))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
