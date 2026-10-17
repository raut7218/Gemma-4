"""Build one venv per repo of data-external so the sandbox can run the tasks' tests (the agent prompt promises "all dependencies are pre-installed").

  python3 -I scripts/build_venvs.py --root /content/venvs [--repos a/b c/d] [--workers 3]

For each repo: Python 3.9 (uv-managed, kept under <root>/_python so the whole tree can be tarred and restored at the same path),
then the repo's dependencies installed from its newest task snapshot with the extras the task's `install` field names
(falling back to [dev], [test], [tests], then none). The project itself is uninstalled again because the sandbox puts the
workspace on PYTHONPATH. Resumable: a repo with a `.ok` marker is skipped. Writes <root>/build_status.jsonl.
"""
from __future__ import annotations

import argparse
import collections
import json
import os
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PY = "3.9"
EXTRAS_FALLBACK = ["dev", "test", "tests", ""]
# repo -> {"extras": [...] tried first, "pkgs": [...] installed afterwards}; for repos whose extras are not enough
OVERRIDE: dict[str, dict] = {
    "pydantic/pydantic": {"extras": ["email,dotenv", ""], "pkgs": ["pytest", "pytest-mock", "email-validator", "python-dotenv"]},
    "marshmallow-code/marshmallow": {"pkgs": ["pytz", "simplejson"]},
    "urllib3/urllib3": {"pkgs": ["python-dateutil"]},
    "mirumee/ariadne": {"remove": ["snapshottest"]},  # it and syrupy both define --snapshot-update
    "twisted/towncrier": {"pkgs": ["pytest", "twisted", "hypothesis"]},
    "encode/starlette": {"pkgs": ["pytest", "anyio", "httpx", "trio", "typing_extensions", "python-multipart<0.0.13"]},
}


def sh(cmd: list[str], env: dict, cwd: Path | None = None, timeout: int = 1800) -> tuple[int, str]:
    try:
        p = subprocess.run(cmd, env=env, cwd=cwd, capture_output=True, text=True, timeout=timeout)
        return p.returncode, (p.stdout + p.stderr)[-3000:]
    except subprocess.TimeoutExpired:
        return 124, "timeout"


def pip_packages(rows: list[dict]) -> list[str]:
    """Union of the SWE-rebench `pip_packages` of the repo's tasks (entries may hold several space-separated requirements)."""
    out: list[str] = []
    for r in rows:
        for entry in r.get("pip_packages") or []:
            out += [tok for tok in str(entry).split() if not tok.startswith("-") and tok not in out]
    return out


def extras_for(rows: list[dict]) -> list[str]:
    seen = []
    for r in rows:
        m = re.search(r"\.\[([^\]]*)\]", str(r.get("install") or ""))
        e = m.group(1) if m else ""
        if e not in seen:
            seen.append(e)
    return seen


def build_repo(repo: str, rows: list[dict], root: Path, data: Path, env: dict) -> dict:
    venv, log = root / repo.replace("/", "__"), root / "logs" / (repo.replace("/", "__") + ".log")
    if (venv / ".ok").exists():
        return {"repo": repo, "ok": True, "note": "cached"}
    shutil.rmtree(venv, ignore_errors=True)
    out = []
    ov = OVERRIDE.get(repo, {})
    code, o = sh(["uv", "venv", "--python", PY, str(venv)], env)
    out.append(o)
    if code:
        log.write_text("\n".join(out))
        return {"repo": repo, "ok": False, "note": "venv: " + o[-200:]}
    py = str(venv / "bin" / "python")
    newest = max(rows, key=lambda r: r["created_at"])
    # resolve as of the repo's newest task (+2 weeks) so old releases of the dependencies are not too far from the code
    cutoff = (datetime.fromisoformat(newest["created_at"].replace("Z", "+00:00")) + timedelta(days=14)).strftime("%Y-%m-%d")
    pip = ["uv", "pip", "install", "--python", py, "--exclude-newer", cutoff]
    tmp = Path(tempfile.mkdtemp(prefix="venvsrc_"))
    chosen = None
    try:
        with tarfile.open(data / "snapshots" / f"{newest['instance_id']}.tgz") as tf:
            tf.extractall(tmp, filter="data")
        for rp in dict.fromkeys(p for r in rows for p in (r.get("reqs_path") or [])):  # requirement files named by SWE-rebench
            if (tmp / rp).is_file():
                out.append(f"$ -r {rp}\n" + sh(pip + ["-r", rp], env, cwd=tmp)[1])
        for e in ov.get("extras") or (extras_for(rows) + EXTRAS_FALLBACK):
            spec = f".[{e}]" if e else "."
            code, o = sh(pip + [spec], env, cwd=tmp)
            out.append(f"$ uv pip install {spec}\n{o}")
            if code == 0:
                chosen = spec
                break
        # the sandbox imports the project from the workspace, so the installed copy must go
        for di in (venv / "lib" / f"python{PY}" / "site-packages").glob("*.dist-info"):
            du = di / "direct_url.json"
            if du.exists() and str(tmp) in du.read_text():
                name = di.name.rsplit("-", 1)[0]
                out.append(sh(["uv", "pip", "uninstall", "--python", py, name], env)[1])
        pkgs = list(dict.fromkeys(["pytest"] + ov.get("pkgs", []) + pip_packages(rows)))
        code2, o = sh(pip + pkgs, env)
        if code2:  # conflicting pins between tasks: fall back to one requirement at a time, keep what installs
            o += "".join(f"\n$ {p}\n" + sh(pip + [p], env)[1] for p in pkgs)
        out.append(f"$ uv pip install {pkgs}\n{o}")
        if ov.get("remove"):
            out.append(sh(["uv", "pip", "uninstall", "--python", py] + ov["remove"], env)[1])
        code3, o = sh([py, "-c", "import pytest; print(pytest.__version__)"], env)
        out.append(o)
        ok = chosen is not None and code3 == 0
        if ok:
            (venv / ".ok").write_text(chosen)
        return {"repo": repo, "ok": ok, "spec": chosen, "note": "" if ok else "no install spec worked" if not chosen else "pytest missing"}
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
        log.write_text("\n".join(out))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True)
    ap.add_argument("--data", default=str(ROOT / "data-external"))
    ap.add_argument("--repos", nargs="*")
    ap.add_argument("--workers", type=int, default=3)
    a = ap.parse_args()
    root, data = Path(a.root).resolve(), Path(a.data)
    (root / "logs").mkdir(parents=True, exist_ok=True)
    env = {**os.environ, "UV_PYTHON_INSTALL_DIR": str(root / "_python"), "UV_LINK_MODE": "copy", "UV_PYTHON_PREFERENCE": "only-managed",
           "GIT_TERMINAL_PROMPT": "0"}
    by: dict[str, list[dict]] = collections.defaultdict(list)
    for l in (data / "tasks.jsonl").open():
        t = json.loads(l)
        by[t["repo"]].append(t)
    repos = [r for r in by if not a.repos or r in a.repos]
    code, o = sh(["uv", "python", "install", PY], env)
    print("python:", code, o.strip()[-200:], flush=True)
    results = []

    def one(repo: str):
        r = build_repo(repo, by[repo], root, data, env)
        print(json.dumps(r), flush=True)
        with (root / "build_status.jsonl").open("a") as f:
            f.write(json.dumps(r) + "\n")
        results.append(r)

    with ThreadPoolExecutor(a.workers) as ex:
        list(ex.map(one, repos))
    bad = [r["repo"] for r in results if not r["ok"]]
    print(f"built {len(results) - len(bad)}/{len(results)}; failed: {bad}")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
