"""Builds the shared sandbox environment that stands in for the swebench-sandbox Docker image.

The image (data/docker/Dockerfile.public) is python:3.13-slim plus `pip install pytest pytest-timeout==2.1.0 typer ...`
and imp.py/telnetlib.py in site-packages. Before each task the scorer unpacks the newest py3.13-compatible wheel of every
package in the competition's wheels/ dir into that site-packages (swegemma.harness.container_setup._deduplicate_wheels;
large wheels only when the workspace imports them, here always, a superset). This script does the same into a venv that
run_official.py then puts behind every per-task venv. Needs network once (PyPI) for the Dockerfile packages.

  python -m colab_eval.build_sandbox_env --data /content/comp --out /content/sbx
Run it with the interpreter that will run run_official.py (the per-task venvs are made from that interpreter).
"""

from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import sys
from pathlib import Path

DOCKERFILE_PIP = ['pytest', 'pytest-timeout==2.1.0', 'typer', 'pdm-backend', 'setuptools', 'wheel', 'poetry-core',
                  'hatchling', 'flit-core', 'editables']
SKIP_WHEELS = {'pytest', 'pytest_timeout', 'pytest_asyncio', 'pytest_httpbin', 'pytest_xdist', 'pluggy', 'pip',
               'setuptools', 'wheel'}
# The public wheels dir is a subset of the scorer's (private) one: without these the reference patches of whole repos fail
# at collection (fastapi: dirty_equals, inline_snapshot...; requests: the pytest-httpbin fixture). They come from the
# repos' own requirements-tests/requirements-dev files and are installed under a constraint that keeps every package
# the competition wheels provide at that wheel's version.
# No other auto-loading pytest plugins: respx or pytest-asyncio change how every repo's tests collect and run.
TEST_EXTRAS = ['typing-inspection', 'dirty-equals', 'inline-snapshot', 'trio', 'PyJWT', 'pwdlib[argon2]',
               'python-multipart', 'email-validator', 'ujson', 'orjson', 'pydantic-settings', 'pydantic-extra-types',
               'pytest-httpbin', 'httpbin', 'trustme', 'PySocks']
# The task repos themselves: sandbox_deps.py adds the other three per task, never the task's own (it would shadow /workspace)
OWN = ['requests', 'httpx', 'rich', 'fastapi']


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--data', type=Path, required=True, help='competition data dir with wheels/ and docker/')
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--no-extras', action='store_true', help='only what the public Docker image + wheels contain')
    args = ap.parse_args(argv)
    from swegemma.harness.container_setup import _deduplicate_wheels

    base = getattr(sys, '_base_executable', sys.executable)
    subprocess.run([base, '-m', 'venv', '--clear', str(args.out)], check=True)
    py = str(args.out / 'bin' / 'python3')
    pip = [py, '-m', 'pip', 'install', '-q', '--disable-pip-version-check']
    subprocess.run([*pip, *DOCKERFILE_PIP], check=True)
    # the image's own pytest/pytest-timeout and packaging tools stay (verified for the scorer image; same skip list as
    # data/v8test/emu.py), everything else is the newest py3.13 wheel
    wheels = [w for w in _deduplicate_wheels([str(p) for p in sorted((args.data / 'wheels').glob('*.whl'))])
              if re.sub(r'[-_.]+', '_', w.name.split('-')[0]).lower() not in SKIP_WHEELS]
    subprocess.run([*pip, '--no-deps', '--force-reinstall', '--no-index', *map(str, wheels)], check=True)
    pins = [f'{w.name.split("-")[0]}=={w.name.split("-")[1]}' for w in wheels]
    (args.out / 'constraints.txt').write_text('\n'.join(pins) + '\n')
    extras = TEST_EXTRAS if not args.no_extras else []
    if extras and subprocess.run([*pip, '-c', str(args.out / 'constraints.txt'), *extras]).returncode != 0:
        for pkg in extras:  # one unsatisfiable extra must not drop the others
            if subprocess.run([*pip, '-c', str(args.out / 'constraints.txt'), pkg]).returncode != 0:
                print(f'[warn] could not install {pkg} under the competition pins', file=sys.stderr)
    subprocess.run([py, '-m', 'pip', 'uninstall', '-q', '-y', *OWN], check=True)
    site = Path(subprocess.check_output([py, '-c', 'import sysconfig; print(sysconfig.get_paths()["purelib"])'], text=True).strip())
    for shim in ('imp.py', 'telnetlib.py'):
        shutil.copy(args.data / 'docker' / shim, site / shim)
    freeze = subprocess.check_output([py, '-m', 'pip', 'freeze'], text=True)
    (args.out / 'sandbox-freeze.txt').write_text(freeze)
    print(f'{args.out}: {len(wheels)} competition wheels + Dockerfile packages, {len(freeze.splitlines())} installed')
    return 0


if __name__ == '__main__':
    sys.exit(main())
