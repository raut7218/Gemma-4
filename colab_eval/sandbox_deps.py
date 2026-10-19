"""Per-task dependency step, run with the sandbox venv's python inside every agent and verification sandbox.

The shared sandbox site (build_sandbox_env.py) holds the newest wheel of every package, which suits the newest task
commits but not older ones: fastapi at an older commit cannot import with starlette 1.6. The scorer's private wheel set
evidently makes these reference patches pass, so each task gets what its own pyproject.toml asks for:

  1. the competition wheels of the other task repos (requests, httpx, rich, fastapi), never the task's own repo, which
     must come from the editable /workspace;
  2. for every requirement in [project] dependencies / optional-dependencies whose installed version violates the
     specifier, the highest competition wheel that satisfies it (installed --no-deps into the task venv, which shadows
     the shared site).

  python3 sandbox_deps.py <repo> <wheels_dir> <workspace>
Always exits 0; prints what it changed.
"""

from __future__ import annotations

import re
import subprocess
import sys
from importlib import metadata
from pathlib import Path

OWN = {'psf/requests': 'requests', 'encode/httpx': 'httpx', 'Textualize/rich': 'rich', 'fastapi/fastapi': 'fastapi'}


def norm(name: str) -> str:
    return re.sub(r'[-_.]+', '-', name).lower()


def py313(fname: str) -> bool:
    parts = fname[:-4].split('-')
    py, abi = parts[-3], parts[-2]
    if abi in ('cp38', 'cp39', 'cp310', 'cp311', 'cp312') and py in ('cp38', 'cp39', 'cp310', 'cp311', 'cp312'):
        return False
    return abi == 'none' or 'abi3' in abi or 'cp313' in py


def main() -> int:
    repo, wheels_dir, ws = sys.argv[1], Path(sys.argv[2]), Path(sys.argv[3])
    from packaging.requirements import Requirement
    from packaging.version import Version

    wheels: dict[str, list[tuple[Version, Path]]] = {}
    for w in wheels_dir.glob('*.whl'):
        if not py313(w.name):
            continue
        name, ver = w.name.split('-')[:2]
        try:
            wheels.setdefault(norm(name), []).append((Version(ver), w))
        except Exception:
            pass
    for v in wheels.values():
        v.sort(reverse=True)

    own = OWN.get(repo, '')
    todo = [wheels[n][0][1] for n in OWN.values() if n != own and n in wheels]

    reqs: list[str] = []
    pyproject = ws / 'pyproject.toml'
    if pyproject.exists():
        import tomllib
        try:
            proj = tomllib.loads(pyproject.read_text()).get('project', {})
            reqs = list(proj.get('dependencies', []))
            for group in proj.get('optional-dependencies', {}).values():
                reqs.extend(group)
        except Exception as e:
            print(f'sandbox_deps: cannot parse pyproject.toml: {e}')
    for line in reqs:
        try:
            req = Requirement(line)
        except Exception:
            continue
        n = norm(req.name)
        if n == norm(own) or n not in wheels or not req.specifier:
            continue
        try:
            installed = Version(metadata.version(req.name))
        except Exception:
            installed = None
        if installed is not None and req.specifier.contains(installed, prereleases=True):
            continue
        fit = next((w for v, w in wheels[n] if req.specifier.contains(v, prereleases=True)), None)
        if fit is not None:
            todo.append(fit)

    if todo:
        r = subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', '--disable-pip-version-check', '--no-deps',
                            '--no-index', *map(str, dict.fromkeys(todo))], capture_output=True, text=True)
        print(f'sandbox_deps: installed {[p.name for p in dict.fromkeys(todo)]} rc={r.returncode} {r.stderr[-300:]}')
    return 0


if __name__ == '__main__':
    try:
        main()
    except Exception as e:  # never fail the sandbox setup
        print(f'sandbox_deps: {e}')
    sys.exit(0)
