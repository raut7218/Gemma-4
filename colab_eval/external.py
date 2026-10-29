"""data-external tasks (other repos, for training trajectories) in the shape run_official.py expects.

  python -m colab_eval.external prepare --data /content/data-external --venvs /content/venvs --out /content/ext
  python -m colab_eval.external validate --gold /content/results/ext_gold --noop /content/results/ext_noop \
      --out /content/ext/external_ok.txt

prepare writes <out>/tasks.jsonl with hints_text emptied (the competition's tasks have no hints, and SWE-rebench hints
are issue comments that often spell out the fix, so a trajectory that saw them teaches the wrong habit), an empty
<out>/wheels/ (the per-repo environments carry their dependencies; the competition wheels are py3.13 builds of
other packages), <out>/site_map.json (repo -> its environment, from scripts/build_venvs.py on the gen-trajectories
branch: <venvs>/<owner>__<name>), and <out>/snapshots linked to the data's snapshots. Tasks whose repo has no
environment are left out. Run them with
  run_official --data <out> --sandbox-site-map <out>/site_map.json --sandbox-site <any env> --no-deps \
      --setup-py <comp>/sandbox/setup.py
validate keeps the tasks whose reference patch resolves and whose empty patch does not, under this exact setup.

Trajectory generation (colab/gpu_gen.sh) runs every task without a hint (arm G), then once more with a path hint the
tasks that left no usable training trajectory:
  python -m colab_eval.external hints --tasks /content/ext/tasks.jsonl --out /content/ext/tasks_hint.jsonl
  python -m colab_eval.external triage --base /content/results/G --retry /content/results/R \
      --retry-ids R_ids.txt --hint-ids H_ids.txt
hints writes a copy of the tasks with hints_text naming the files the reference patch changes (not its tests); swegemma
renders it as a "## Hints:" section of the user prompt, and build_sft cuts that section out of the training tokens.
triage reads the finished rows: a task with a usable attempt (build_sft's filters) is done, a harness or LLM error
gets one unhinted retry (arm R), anything else gets one hinted attempt (arm H). It appends new ids to the two files.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

HINT_MAX_FILES = 8
TEST_PATH = re.compile(r'(^|/)(tests?|testing)/|(^|/)test_[^/]*\.py$|_tests?\.py$|(^|/)conftest\.py$')


def prepare(data: Path, venvs: Path, out: Path) -> dict:
    out.mkdir(parents=True, exist_ok=True)
    (out / 'wheels').mkdir(exist_ok=True)
    snap = out / 'snapshots'
    if not snap.exists():
        snap.symlink_to((data / 'snapshots').resolve(), target_is_directory=True)
    site_map, kept, missing = {}, [], set()
    for line in (data / 'tasks.jsonl').read_text().splitlines():
        if not line.strip():
            continue
        t = json.loads(line)
        env = venvs / t['repo'].replace('/', '__')
        if not list(env.glob('lib/python3*/site-packages')):
            missing.add(t['repo'])
            continue
        site_map[t['repo']] = str(env.resolve())
        t['hints_text'] = ''
        kept.append(json.dumps(t))
    (out / 'tasks.jsonl').write_text('\n'.join(kept) + '\n')
    (out / 'site_map.json').write_text(json.dumps(site_map, indent=1))
    return {'tasks': len(kept), 'repos': len(site_map), 'repos_without_env': sorted(missing)}


def validate(gold: Path, noop: Path) -> tuple[list[str], dict]:
    def rows(d: Path) -> dict[str, dict]:
        f = d / 'task_results.jsonl'
        return {json.loads(l)['instance_id']: json.loads(l) for l in f.read_text().splitlines() if l.strip()} if f.exists() else {}

    g, n = rows(gold), rows(noop)
    ok = sorted(t for t, r in g.items() if r.get('resolved') and t in n and not n[t].get('resolved'))
    why = {'gold_failed': sum(1 for r in g.values() if not r.get('resolved')),
           'empty_patch_passes': sum(1 for t, r in n.items() if r.get('resolved')),
           'noop_missing': sum(1 for t in g if t not in n), 'ok': len(ok)}
    return ok, why


def hint_paths(patch: str) -> list[str]:
    """Files the reference patch changes, Python sources first (docs and changelogs only when there is no source),
    tests never; the most-changed first, at most HINT_MAX_FILES."""
    changed: dict[str, int] = {}
    cur = None
    for line in patch.splitlines():
        m = re.match(r'diff --git a/(\S+) b/(\S+)', line)
        if m:
            cur = m.group(2)
            changed[cur] = 0
        elif cur and line[:1] in '+-' and not line.startswith(('+++', '---')):
            changed[cur] += 1
    files = [f for f in changed if not TEST_PATH.search(f)]
    py = [f for f in files if f.endswith('.py')]
    return sorted(py or files, key=lambda f: -changed[f])[:HINT_MAX_FILES]


def hint_text(paths: list[str]) -> str:
    if len(paths) == 1:
        return f'The fix belongs in `{paths[0]}`.'
    return 'The fix belongs in these files:\n' + '\n'.join(f'- `{p}`' for p in paths)


def write_hinted(tasks: Path, out: Path) -> dict:
    rows, empty = [], []
    for line in tasks.read_text().splitlines():
        if not line.strip():
            continue
        t = json.loads(line)
        paths = hint_paths(t.get('patch') or '')
        if not paths:
            empty.append(t['instance_id'])
        t['hints_text'] = hint_text(paths) if paths else ''
        rows.append(json.dumps(t))
    out.write_text('\n'.join(rows) + '\n')
    return {'tasks': len(rows), 'without_hint': empty}


def triage(base: Path, retry: Path | None) -> dict[str, str]:
    """task -> 'done' | 'retry' | 'hint' for every task with a finished row in base (arm G) or retry (arm R)."""
    from colab_eval.analyze import HARNESS_ERRORS, termination
    from colab_eval.lora import build_sft as B

    def verdicts(run: Path) -> dict[str, str]:
        rows = {}
        f = run / 'task_results.jsonl'
        for l in (f.read_text().splitlines() if f.exists() else []):
            if l.strip():
                r = json.loads(l)
                rows[r['instance_id']] = r
        reqs = B.load_requests(run, {t for t, r in rows.items() if r.get('resolved')}) if rows else {}
        out = {}
        for task, r in rows.items():
            err = r.get('error') or ''
            if any(h in err for h in HARNESS_ERRORS) or termination(err, False) == 'llm_error':
                out[task] = 'infra'
                continue
            calls = B.calls_of(reqs.get(task, []))
            out[task] = 'done' if B.reject_reason(r, calls, B.stats(calls)) is None else 'failed'
        return out

    g = verdicts(base)
    r = verdicts(retry) if retry else {}
    out = {}
    for task, v in g.items():
        if v == 'done' or r.get(task) == 'done':
            out[task] = 'done'
        elif v == 'infra' and retry and task not in r:
            out[task] = 'retry'
        else:
            out[task] = 'hint'
    return out


def append_ids(path: Path, ids: list[str]) -> list[str]:
    have = set(path.read_text().split()) if path.exists() else set()
    new = [i for i in ids if i not in have]
    if new:
        with path.open('a') as f:
            f.write(''.join(i + '\n' for i in new))
    return new


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    p = sub.add_parser('prepare')
    p.add_argument('--data', type=Path, required=True)
    p.add_argument('--venvs', type=Path, required=True)
    p.add_argument('--out', type=Path, required=True)
    v = sub.add_parser('validate')
    v.add_argument('--gold', type=Path, required=True)
    v.add_argument('--noop', type=Path, required=True)
    v.add_argument('--out', type=Path, required=True)
    h = sub.add_parser('hints')
    h.add_argument('--tasks', type=Path, required=True)
    h.add_argument('--out', type=Path, required=True)
    t = sub.add_parser('triage')
    t.add_argument('--base', type=Path, required=True, help='results of the unhinted arm')
    t.add_argument('--retry', type=Path, help='results of the unhinted retry arm')
    t.add_argument('--retry-ids', type=Path, required=True)
    t.add_argument('--hint-ids', type=Path, required=True)
    a = ap.parse_args(argv)
    if a.cmd == 'prepare':
        print(json.dumps(prepare(a.data, a.venvs, a.out), indent=1))
    elif a.cmd == 'hints':
        print(json.dumps(write_hinted(a.tasks, a.out)))
    elif a.cmd == 'triage':
        v = triage(a.base, a.retry)
        retry = append_ids(a.retry_ids, sorted(t for t, x in v.items() if x == 'retry'))
        hint = append_ids(a.hint_ids, sorted(t for t, x in v.items() if x == 'hint'))
        counts = {x: sum(1 for y in v.values() if y == x) for x in ('done', 'retry', 'hint')}
        print(json.dumps({**counts, 'new_retry': len(retry), 'new_hint': len(hint)}))
    else:
        ok, why = validate(a.gold, a.noop)
        a.out.write_text('\n'.join(ok) + '\n')
        print(json.dumps(why))
    return 0


if __name__ == '__main__':
    sys.exit(main())
