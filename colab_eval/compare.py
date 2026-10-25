"""Paired comparison of full runs on the same tasks: solves on the env-solvable tasks, wins and losses against a base
arm, and the exact two-sided sign test on the tasks where the two disagree.

  python -m colab_eval.compare results/colab/full_v5 results/colab/full_v5-s8k ... --gold results/colab/gold

The first run is the base unless --base names another. A task counts only when every run has a result for it and the
gold run resolves it (a gold run is required: the 18 tasks whose reference patch fails in this sandbox are noise).
Completion tokens per task are the time proxy: on the scorer's 4x L4 decoding is most of a task's time.
"""

from __future__ import annotations

import argparse
import json
import math
import statistics
from pathlib import Path


def jsonl(p: Path) -> list[dict]:
    return [json.loads(l) for l in p.read_text().splitlines() if l.strip()] if p.exists() else []


def resolved(run: Path) -> dict[str, bool]:
    return {r['instance_id']: bool(r.get('resolved')) for r in jsonl(run / 'task_results.jsonl')}


def tokens(run: Path) -> dict[str, int]:
    out: dict[str, int] = {}
    for c in jsonl(run / 'llm_calls.jsonl'):
        if c.get('ok', True):
            out[c['task']] = out.get(c['task'], 0) + (c.get('completion_tokens') or 0)
    return out


def sign_p(wins: int, losses: int) -> float:
    n = wins + losses
    if not n:
        return 1.0
    return min(1.0, 2 * sum(math.comb(n, k) for k in range(min(wins, losses) + 1)) / 2 ** n)


def compare(runs: dict[str, dict[str, bool]], ok: set[str], base: str) -> list[dict]:
    common = set.intersection(ok, *(set(r) for r in runs.values()))
    rows = []
    for name, r in runs.items():
        wins = sum(1 for t in common if r[t] and not runs[base][t])
        losses = sum(1 for t in common if not r[t] and runs[base][t])
        rows.append({'arm': name, 'tasks': len(common), 'resolved': sum(r[t] for t in common),
                     'wins': wins, 'losses': losses, 'p': sign_p(wins, losses)})
    return rows


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('runs', type=Path, nargs='+')
    ap.add_argument('--gold', type=Path, required=True)
    ap.add_argument('--base', help='name (directory name) of the base arm; default: the first run')
    a = ap.parse_args(argv)
    runs = {p.name: resolved(p) for p in a.runs}
    base = a.base or a.runs[0].name
    ok = {t for t, v in resolved(a.gold).items() if v}
    print(f'| arm | resolved | wins vs {base} | losses | sign-test p | completion tokens/task (median) |')
    print('|---|---:|---:|---:|---:|---:|')
    for row, p in zip(compare(runs, ok, base), a.runs):
        tok = tokens(p)
        med = statistics.median(tok.values()) if tok else float('nan')
        print(f"| {row['arm']} | {row['resolved']}/{row['tasks']} | {row['wins']} | {row['losses']} | {row['p']:.3f} | {med:.0f} |")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
