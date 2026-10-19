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
# The host's git config must not leak in: diff.mnemonicPrefix or diff.noprefix change the a/ b/ paths that
# strip_protected and verify.patch_files parse, and the scorer's container has no user config either.
GIT_ENV = {"GIT_CONFIG_GLOBAL": "/dev/null", "GIT_CONFIG_NOSYSTEM": "1", "GIT_AUTHOR_NAME": "harness",
           "GIT_AUTHOR_EMAIL": "harness@local", "GIT_COMMITTER_NAME": "harness", "GIT_COMMITTER_EMAIL": "harness@local"}
EXCLUDE = ["__pycache__/", "*.pyc", ".pytest_cache/", "*.egg-info/", "build/", "dist/", ".coverage"]
PROTECTED = re.compile(
    r"(^|/)(test_[^/]*\.py|[^/]*_test\.py|conftest\.py|pytest\.ini|pyproject\.toml|tox\.ini|setup\.cfg"
    r"|\.pytest\.ini|sitecustomize\.py|usercustomize\.py|_swegemma_stubs\.py|[^/]*\.pth)$|(^|/)(?i:tests?|testing)/(.*/)?[^/]*\.py$"
)
_SECTION = re.compile(r"^diff --git ", re.M)
_BARE = re.compile(r"^--- \S.*\n\+\+\+ \S", re.M)  # tasks.jsonl patches have no "diff --git" lines


def strip_protected(patch: str, extra: tuple[str, ...] | list[str] = ()) -> str:
    """Drops the sections of a diff that touch test files or runner configs, as swegemma >= 0.2.10 does in
    submit_patch, in the unsubmitted-diff fallback and again before verification."""
    if not patch.strip():
        return ""
    starts = [m.start() for m in _SECTION.finditer(patch)] or [m.start() for m in _BARE.finditer(patch)]
    if not starts:
        return patch
    keep = [patch[:starts[0]]]
    for a, b in zip(starts, starts[1:] + [len(patch)]):
        sec = patch[a:b]
        head = sec.split("\n@@ ", 1)[0]
        paths = set(re.findall(r'^(?:---|\+\+\+) "?[ab]/([^"\t\n]+)', head, re.M))
        paths |= set(re.findall(r"^(?:rename|copy) (?:from|to) (.+)$", head, re.M))
        m = re.match(r'diff --git "?a/(.*?)"? "?b/(.*?)"?$', head.split("\n", 1)[0])
        paths |= set(m.groups()) if m else set()
        if not any(q in extra or PROTECTED.search(q) for q in paths):
            keep.append(sec)
    out = "".join(keep)
    return out if out.strip() else ""


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
        e.update(GIT_ENV)
        return e

    def rewrite(self, cmd: str) -> str:
        # One pass: the sandbox root itself lives under /tmp, so rewriting twice would mangle it.
        dirs = {"/workspace": str(self.ws), "/tmp": str(self.tmp)}
        return re.sub(r"(?<![\w.])(/workspace|/tmp)\b", lambda m: dirs[m.group(1)], cmd)

    def run(self, cmd: str, timeout: float = 300, rewrite: bool = True) -> tuple[int, str, str]:
        cmd = self.rewrite(cmd) if rewrite else cmd
        try:
            p = subprocess.run(["/bin/bash", "-c", cmd], cwd=self.ws, env=self.env(), capture_output=True,
                               text=True, errors="replace", timeout=timeout, start_new_session=True)
            return p.returncode, p.stdout, p.stderr
        except subprocess.TimeoutExpired as e:
            return 124, (e.stdout or b"").decode(errors="replace") if isinstance(e.stdout, bytes) else (e.stdout or ""), "TimeoutExpired"

    def git(self, *args: str, input: str | None = None) -> subprocess.CompletedProcess:
        return subprocess.run(GIT + list(args), cwd=self.ws, capture_output=True, text=True, input=input, errors="replace",
                              env={**os.environ, **GIT_ENV})

    def extract_patch(self) -> str:
        self.git("add", "-N", ".")
        p = self.git("diff", "--binary", "_swegemma_baseline")
        if p.returncode != 0:
            p = self.git("diff", "--binary", "HEAD")
        return strip_protected(p.stdout)

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
