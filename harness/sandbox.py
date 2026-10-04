"""Subprocess sandbox: a git workspace extracted from a task snapshot (no Docker needed).

Mirrors swegemma's `--sandbox subprocess` backend: /workspace and /tmp in commands are
rewritten to per-sandbox directories, and the baseline is committed + tagged.
"""
from __future__ import annotations

import os
import re
import shutil
import subprocess
import tarfile
import tempfile
from pathlib import Path

GIT = ["git", "-c", "user.name=harness", "-c", "user.email=harness@local"]
EXCLUDE = ["__pycache__/", "*.pyc", ".pytest_cache/", "*.egg-info/", "build/", "dist/", ".coverage"]
PROTECTED = re.compile(
    r"(^|/)(test_[^/]*\.py|[^/]*_test\.py|conftest\.py|pytest\.ini|pyproject\.toml|tox\.ini|setup\.cfg"
    r"|\.pytest\.ini|sitecustomize\.py|usercustomize\.py|[^/]*\.pth)$|(^|/)(tests?|testing)/.*\.py$"
)


class Sandbox:
    def __init__(self, snapshot: Path, venv: Path, prefix: str = "sbx"):
        self.root = Path(tempfile.mkdtemp(prefix=f"{prefix}_"))
        self.ws = self.root / "workspace"
        self.tmp = self.root / "tmp"
        self.tmp.mkdir()
        self.venv = venv
        self.ws.mkdir()
        with tarfile.open(snapshot) as tf:
            tf.extractall(self.ws, filter="data")
        for p in self.ws.rglob("*"):  # circular / dangling symlinks break git add
            if p.is_symlink() and not p.exists():
                p.unlink()
        ex = self.ws / ".git" / "info" / "exclude"
        ex.parent.mkdir(parents=True, exist_ok=True)
        with ex.open("a") as f:
            f.write("\n" + "\n".join(EXCLUDE) + "\n")
        self.git("add", "-A")
        self.git("commit", "-m", "baseline", "--allow-empty", "-q")
        self.git("tag", "-f", "_swegemma_baseline")

    def env(self) -> dict:
        e = dict(os.environ)
        e["PATH"] = f"{self.venv}/bin:{e['PATH']}"
        e["VIRTUAL_ENV"] = str(self.venv)
        src = self.ws / "src"
        e["PYTHONPATH"] = f"{self.ws}{os.pathsep}{src}" if src.is_dir() else str(self.ws)
        e["TMPDIR"] = str(self.tmp)
        e["TEST_TMPDIR"] = str(self.tmp)
        e["PYTHONDONTWRITEBYTECODE"] = "1"
        e["PIP_NO_INDEX"] = "1"
        return e

    def rewrite(self, cmd: str) -> str:
        cmd = re.sub(r"(?<![\w.])/workspace\b", str(self.ws), cmd)
        return re.sub(r"(?<![\w.])/tmp\b", str(self.tmp), cmd)

    def run(self, cmd: str, timeout: float = 300, rewrite: bool = True) -> tuple[int, str, str]:
        cmd = self.rewrite(cmd) if rewrite else cmd
        try:
            p = subprocess.run(["/bin/bash", "-c", cmd], cwd=self.ws, env=self.env(), capture_output=True,
                               text=True, errors="replace", timeout=timeout, start_new_session=True)
            return p.returncode, p.stdout, p.stderr
        except subprocess.TimeoutExpired as e:
            return 124, (e.stdout or b"").decode(errors="replace") if isinstance(e.stdout, bytes) else (e.stdout or ""), "TimeoutExpired"

    def git(self, *args: str, input: str | None = None) -> subprocess.CompletedProcess:
        return subprocess.run(GIT + list(args), cwd=self.ws, capture_output=True, text=True, input=input, errors="replace")

    def extract_patch(self) -> str:
        self.git("add", "-N", ".")
        p = self.git("diff", "--binary", "_swegemma_baseline")
        if p.returncode != 0:
            p = self.git("diff", "--binary", "HEAD")
        return p.stdout

    def apply_patch(self, patch: str) -> tuple[bool, str]:
        if not patch.endswith("\n"):
            patch += "\n"
        pf = self.tmp / "agent.patch"
        pf.write_text(patch)
        tries = [["apply", "--unsafe-paths"], ["apply", "--unsafe-paths", "-3"],
                 ["apply", "--unsafe-paths", "--ignore-space-change", "--ignore-whitespace"],
                 ["apply", "--unsafe-paths", "--recount"], ["apply", "--unsafe-paths", "-p0"]]
        err = ""
        for t in tries:
            p = self.git(*t, str(pf))
            if p.returncode == 0:
                return True, ""
            err = p.stderr
        p = subprocess.run(["patch", "-p1", "--batch", "--forward", "-l", "-i", str(pf)], cwd=self.ws, capture_output=True, text=True)
        return (p.returncode == 0), err if p.returncode else ""

    def cleanup(self):
        shutil.rmtree(self.root, ignore_errors=True)
