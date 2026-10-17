"""Turn data-external/selected.jsonl (+ reserve.jsonl) into harness-ready data: snapshots/<id>.tgz and tasks.jsonl.

  python -I scripts/build_snapshots.py

Per repo one bare, blobless clone is cached under data-external/_cache/. Per task: `git archive <base_commit>` into a temp dir,
an empty `git init` (harness.sandbox.Sandbox runs `git add -A` and commits the baseline itself), a tarball, and then a check that
the gold patch and the test patch apply to that tree. A task that fails any step is replaced by a reserve task of the same domain.
Nothing from the cloned repos is executed; only git and tar touch them. Resumable: finished snapshots are kept.
"""
from __future__ import annotations

import argparse
import collections
import json
import os
import shutil
import subprocess
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENV = {**os.environ, "GIT_CONFIG_GLOBAL": "/dev/null", "GIT_CONFIG_NOSYSTEM": "1", "GIT_TERMINAL_PROMPT": "0"}
KEEP = ["instance_id", "repo", "base_commit", "patch", "test_patch", "problem_statement", "hints_text", "created_at", "domain",
        "source_dataset", "FAIL_TO_PASS", "PASS_TO_PASS", "python", "install", "test_cmd", "pip_packages", "reqs_path", "license", "size_bucket", "src_lines"]


def run(*cmd: str, cwd: Path | None = None, stdin: bytes | None = None, timeout: int = 900) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, cwd=cwd, env=ENV, input=stdin, capture_output=True, timeout=timeout)


def clone(repo: str, cache: Path) -> Path | None:
    g = cache / (repo.replace("/", "__") + ".git")
    if not g.exists():
        p = run("git", "clone", "--bare", "--filter=blob:none", "-q", f"https://github.com/{repo}.git", str(g))
        if p.returncode:
            shutil.rmtree(g, ignore_errors=True)
            return None
    return g


def build(task: dict, git_dir: Path, snaps: Path) -> str | None:
    """Returns None on success or a short reason."""
    out, c = snaps / f"{task['instance_id']}.tgz", task["base_commit"]
    if run("git", "--git-dir", str(git_dir), "cat-file", "-e", f"{c}^{{commit}}").returncode:
        if run("git", "--git-dir", str(git_dir), "fetch", "-q", "origin", c).returncode:
            return "commit_missing"
    tmp = Path(tempfile.mkdtemp(prefix="snap_"))
    try:
        arc = run("git", "--git-dir", str(git_dir), "archive", "--format=tar", c)
        if arc.returncode:
            return "archive_failed"
        if run("tar", "-x", "-C", str(tmp), stdin=arc.stdout).returncode:
            return "untar_failed"
        run("git", "init", "-q", str(tmp))
        if run("tar", "-czf", str(out) + ".part", "-C", str(tmp), ".").returncode:
            return "tar_failed"
        for name in ("patch", "test_patch"):  # the gold patch goes in first, as the harness's verify does
            pf = tmp.parent / f"{tmp.name}.{name}"
            pf.write_text(task[name])
            try:
                p = run("git", "apply", str(pf), cwd=tmp)
            finally:
                pf.unlink(missing_ok=True)
            if p.returncode:
                return f"{name}_does_not_apply"
        os.replace(str(out) + ".part", out)
        return None
    except subprocess.TimeoutExpired:
        return "timeout"
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
        Path(str(out) + ".part").unlink(missing_ok=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default=str(ROOT / "data-external"))
    ap.add_argument("--workers", type=int, default=6)
    a = ap.parse_args()
    d = Path(a.dir)
    snaps, cache = d / "snapshots", d / "_cache"
    snaps.mkdir(exist_ok=True)
    cache.mkdir(exist_ok=True)
    load = lambda n: [json.loads(l) for l in open(d / n)]  # noqa: E731
    selected, reserve = load("selected.jsonl"), load("reserve.jsonl")
    status: dict[str, str | None] = {}
    gits: dict[str, Path | None] = {}

    def do(task: dict) -> None:
        iid = task["instance_id"]
        g = gits.get(task["repo"])
        status[iid] = "clone_failed" if g is None else ("ok" if (snaps / f"{iid}.tgz").exists() else build(task, g, snaps) or "ok")
        print(f"{status[iid]:>22}  {iid}", flush=True)

    def per_repo(item: tuple[str, list[dict]]) -> None:
        repo, tasks = item
        gits[repo] = clone(repo, cache)
        for t in tasks:
            do(t)

    by_repo: dict[str, list[dict]] = collections.defaultdict(list)
    for t in selected:
        by_repo[t["repo"]].append(t)
    with ThreadPoolExecutor(a.workers) as ex:
        list(ex.map(per_repo, by_repo.items()))

    final = [t for t in selected if status[t["instance_id"]] == "ok"]
    for t in [t for t in selected if status[t["instance_id"]] != "ok"]:  # replace failures from the reserve, same domain first
        for r in sorted((r for r in reserve if r["instance_id"] not in status), key=lambda r: r["domain"] != t["domain"]):
            if r["repo"] not in gits:
                gits[r["repo"]] = clone(r["repo"], cache)
            do(r)
            if status[r["instance_id"]] == "ok":
                final.append(r)
                break
    with open(d / "tasks.jsonl", "w") as f:
        for t in final:
            f.write(json.dumps({k: (t.get(k) or "") if k == "hints_text" else t.get(k) for k in KEEP}) + "\n")
    count = lambda k: dict(sorted(collections.Counter(t[k] for t in final).items()))  # noqa: E731
    man = {"tasks": len(final), "by_domain": count("domain"), "by_repo": count("repo"), "by_size_bucket": count("size_bucket"),
           "failed": {k: v for k, v in status.items() if v != "ok"},
           "snapshot_bytes": sum(p.stat().st_size for p in snaps.glob("*.tgz"))}
    (d / "manifest.json").write_text(json.dumps(man, indent=2))
    print(json.dumps({k: v for k, v in man.items() if k != "by_repo"}, indent=2))


if __name__ == "__main__":
    main()
