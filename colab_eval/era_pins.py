"""Era-matched dependency pins for tasks whose reference patch fails against the newest packages.

The shared sandbox site holds the newest wheel of everything, which is wrong for tasks whose tests compare exact
output (rich: Pygments' monokai colours; requests: werkzeug's redirect handling, urllib3's strict TLS flags;
fastapi: pydantic/starlette error shapes). `era_pins.json` lists those tasks only, keyed by the snapshot's HEAD commit (what
`git rev-parse HEAD` prints in /workspace when the deps step runs; it is not tasks.jsonl's base_commit), so the tasks that already pass are untouched:

  {"<snapshot HEAD>": {"id": "rich_3296", "pins": {"pygments": "2.18.0"}}}

`sandbox_deps.py` installs the pinned wheels with --no-index from `<wheels_dir>/../era_wheels` (or $SWE_ERA_WHEELS).

  python -m colab_eval.era_pins resolve ID PKG [PKG...]   # newest version of each PKG released before created_at
  python -m colab_eval.era_pins fetch DIR                 # download every pinned wheel (py3.13, no deps) into DIR
"""

from __future__ import annotations

import json
import sys
import urllib.request
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).parent
PINS = HERE / 'era_pins.json'
TASKS = HERE.parent / 'data' / 'competition' / 'tasks.jsonl'


def task(iid: str) -> dict:
    for line in open(TASKS):
        d = json.loads(line)
        if d['instance_id'] == iid:
            return d
    raise SystemExit(f'unknown task {iid}')


def pypi(pkg: str) -> dict:
    with urllib.request.urlopen(f'https://pypi.org/pypi/{pkg}/json') as r:
        return json.load(r)


def installable(files: list[dict]) -> bool:
    """A py3.13-installable wheel exists: pure python, abi3, or cp313."""
    for f in files:
        if f['packagetype'] != 'bdist_wheel' or f.get('yanked'):
            continue
        name = f['filename'][:-4].split('-')
        py, abi = name[-3], name[-2]
        if abi == 'none' or 'abi3' in abi or 'cp313' in py:
            return True
    return False


def resolve(iid: str, pkgs: list[str]) -> dict[str, str]:
    from packaging.version import InvalidVersion, Version
    cutoff = datetime.fromisoformat(task(iid)['created_at'].replace('Z', '+00:00'))
    out = {}
    for pkg in pkgs:
        best = None
        for ver, files in pypi(pkg)['releases'].items():
            try:
                v = Version(ver)
            except InvalidVersion:
                continue
            if v.is_prerelease or not files or not installable(files):
                continue
            t = min(datetime.fromisoformat(f['upload_time_iso_8601'].replace('Z', '+00:00')) for f in files)
            if t <= cutoff and (best is None or v > best):
                best = v
        if best is not None:
            out[pkg] = str(best)
    return out


def main() -> int:
    cmd = sys.argv[1]
    if cmd == 'resolve':
        print(json.dumps(resolve(sys.argv[2], sys.argv[3:]), indent=1))
    elif cmd == 'fetch':
        dest = Path(sys.argv[2])
        dest.mkdir(parents=True, exist_ok=True)
        want = sorted({(p, v) for e in json.loads(PINS.read_text()).values() for p, v in e['pins'].items()})
        for pkg, ver in want:
            with urllib.request.urlopen(f'https://pypi.org/pypi/{pkg}/{ver}/json') as r:
                files = [f for f in json.load(r)['urls'] if f['packagetype'] == 'bdist_wheel' and installable([f])]
            if not files:
                print(f'[warn] no py3.13 wheel for {pkg}=={ver}', file=sys.stderr)
                continue
            f = files[0]
            if not (dest / f['filename']).exists():
                urllib.request.urlretrieve(f['url'], dest / f['filename'])
        print(f'{len(want)} pinned wheels in {dest}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
