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
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


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
    a = ap.parse_args(argv)
    if a.cmd == 'prepare':
        print(json.dumps(prepare(a.data, a.venvs, a.out), indent=1))
    else:
        ok, why = validate(a.gold, a.noop)
        a.out.write_text('\n'.join(ok) + '\n')
        print(json.dumps(why))
    return 0


if __name__ == '__main__':
    sys.exit(main())
