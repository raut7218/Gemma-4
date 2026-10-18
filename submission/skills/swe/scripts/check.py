"""check.py [TEST_FILE_OR_NODE...] : what does my change do to the existing tests?

Lists changed and untracked files, compiles the changed .py files, runs the whole test files that cover the
changed modules (plus any given as args), and re-runs every failing test on a pristine copy of the baseline
commit to label it NEW (your change broke it) or PRE-EXISTING (fails without your change too). The grader
runs whole test files and needs every required test to pass, so a NEW failure is a failed task.
Never stashes or resets the workspace: the baseline copy is a git archive under the temp dir, and the files
with failures are rerun there whole (passing node ids back to pytest breaks on ids with spaces).
"""
import io
import os
import re
import subprocess
import sys
import tarfile
import tempfile

WS = os.environ.get("SWE_WORKSPACE") or "/workspace"
TEST = re.compile(r"(^|/)(tests?|testing)/|(^|/)(test_[^/]*|[^/]*_test|conftest)\.py$")
DROPPED = re.compile(r"(^|/)(conftest\.py|pytest\.ini|pyproject\.toml|tox\.ini|setup\.cfg)$")
CAP, MAX_FILES, T_RUN, T_BASE = 1500, 4, 110, 90
out = []


def sh(args, cwd=WS, timeout=30, env=None):
    return subprocess.run(args, cwd=cwd, capture_output=True, text=True, errors="replace", timeout=timeout, env=env)


def git(*args):
    return sh(["git", *args]).stdout


def pytest(targets, cwd, env, timeout):
    """-> (counts text, {node id: short message}) or (error text, None)."""
    try:
        p = sh([sys.executable, "-m", "pytest", *targets, "-q", "-rfE", "--tb=line", "-p", "no:cacheprovider"],
               cwd=cwd, timeout=timeout, env=env)
    except subprocess.TimeoutExpired:
        return f"timed out after {timeout}s", None
    fails = {}
    for l in p.stdout.splitlines():  # node ids can contain spaces (parametrize ids); " - " starts the message
        m = re.match(r"(FAILED|ERROR) (.+?)(?: - (.*))?$", l)
        if m:
            fails[m.group(2)] = (m.group(3) or m.group(1)).strip()[:110]
    tail = [l for l in p.stdout.splitlines() if re.search(r"\d+ (passed|failed|error)", l)]
    if not tail and not fails:
        return "pytest output not understood: " + (p.stdout + p.stderr).strip()[-300:], None
    return re.sub(r"=+", "", tail[-1]).strip() if tail else f"{len(fails)} failed", fails


def baseline_copy(base):
    sha = git("rev-parse", base).strip()[:12]
    d = os.path.join(tempfile.gettempdir(), f"_swe_base_{sha}")
    if not os.path.isdir(d):
        tar = subprocess.run(["git", "archive", "--format=tar", base], cwd=WS, capture_output=True, timeout=60).stdout
        with tarfile.open(fileobj=io.BytesIO(tar)) as tf:
            tf.extractall(d, filter="data")
    return d


def test_targets(changed, extra):
    tracked = git("ls-files", "*.py").split()
    tests = [f for f in tracked if re.search(r"(^|/)(test_[^/]*|[^/]*_test)\.py$", f)]  # not helpers like tests/utils.py
    picked = [a for a in extra if os.path.exists(os.path.join(WS, a.split("::")[0]))]
    for f in changed:
        if not f.endswith(".py") or TEST.search(f):
            continue
        mod = f[:-3].removeprefix("src/").replace("/", ".")
        stem = f.split("/")[-1][:-3]
        if stem == "__init__":
            mod, stem = mod.rsplit(".", 1)[0], f.split("/")[-2] if "/" in f else stem
        def named(t):  # tests/test_cells.py for cells.py, tests/test_status.py for status_codes.py
            n = t.split("/")[-1].removeprefix("test_").removesuffix(".py")
            return n == stem or (min(len(n), len(stem)) >= 4 and (n in stem or stem in n))
        by_name = sorted((t for t in tests if named(t)), key=lambda t: t.split("/")[-1] != f"test_{stem}.py")
        by_use = []
        for t in tests:
            try:
                n = open(os.path.join(WS, t), encoding="utf-8", errors="replace").read().count(mod)
            except OSError:
                n = 0
            if n:
                by_use.append((-n, t))
        for t in by_name + [t for _, t in sorted(by_use)]:
            if t not in picked:
                picked.append(t)
    return picked[:MAX_FILES]


def main():
    base = "_swegemma_baseline" if git("tag", "-l", "_swegemma_baseline").strip() else "HEAD"
    changed = [f for f in git("diff", "--name-only", base).split() if f]
    untracked = [f for f in git("ls-files", "--others", "--exclude-standard").split() if not f.split("/")[-1].startswith(".adk_exec_")]
    out.append("changed: " + (", ".join(changed) or "nothing (no tracked file differs from the baseline)"))
    if untracked:
        out.append("untracked, will be IN your patch: " + ", ".join(untracked[:8]) + "  -> rm -f the scratch ones")
    dropped = [f for f in changed + untracked if TEST.search(f) or DROPPED.search(f)]
    if dropped:
        out.append("the grader discards your changes to: " + ", ".join(dropped[:6]))
    bad = []
    for f in changed + untracked:
        if f.endswith(".py") and os.path.exists(os.path.join(WS, f)):
            try:
                compile(open(os.path.join(WS, f), encoding="utf-8").read(), f, "exec")
            except SyntaxError as e:
                bad.append(f"{f}:{e.lineno}: {e.msg}")
            except (UnicodeDecodeError, ValueError) as e:
                bad.append(f"{f}: {e}")
    out.append("compile: " + ("; ".join(bad) if bad else "ok"))
    targets = test_targets(changed + untracked, [a for a in sys.argv[1:] if not a.startswith("-")])
    if not targets:
        out.append("no test file covers the changed modules; pass one as an arg, e.g. tests/test_x.py")
        return
    out.append("ran whole files: " + " ".join(targets))
    counts, fails = pytest(targets, WS, None, T_RUN)
    out.append("result: " + counts)
    if not fails:
        return
    ids = [i for i in fails if "::" in i or i.endswith(".py")][:15]
    known = set(git("ls-tree", "-r", "--name-only", base).split())
    mine = [i for i in ids if i.split("::")[0] not in known]
    old = [i for i in ids if i not in mine]
    pre, why = set(), ""
    if old:
        try:
            d = baseline_copy(base)
            env = dict(os.environ, PYTHONPATH=os.pathsep.join(p for p in (d, os.path.join(d, "src")) if os.path.isdir(p)))
            tops = (f.removeprefix("src/").split("/")[0] for f in changed if f.endswith(".py") and "/" in f)
            top = next((t for t in tops if any(os.path.isfile(os.path.join(d, s, t, "__init__.py")) for s in ("", "src"))), None)
            if top:
                where = sh([sys.executable, "-c", f"import {top},os;print(os.path.realpath({top}.__file__))"], cwd=d, env=env).stdout
                if not where.startswith(os.path.realpath(d)):
                    why = f"baseline copy imports {top} from {where.strip() or '?'}, comparison skipped"
            if not why:  # rerun the whole failing files: ids parsed the same way in both runs compare exactly
                files = sorted({i.split("::")[0] for i in old})
                bcounts, bfails = pytest(files, d, env, T_BASE)
                if bfails is None and "passed" not in bcounts:
                    why = "baseline run failed: " + bcounts
                else:
                    pre = {i for i in old if i in (bfails or {}) or i.split("::")[0] in (bfails or {})}
        except Exception as e:  # noqa: BLE001
            why = f"baseline comparison unavailable: {type(e).__name__}: {e}"[:200]
    if why:
        out.append(why)
        for i in ids:
            out.append(f"FAILED {i} - {fails[i]}")
        return
    for i in old:
        tag = "PRE-EXISTING (fails without your change too, ignore)" if i in pre else "NEW (passed before your change, fix it)"
        out.append(f"{tag}: {i} - {fails[i]}")
    for i in mine:
        out.append(f"in a test file you created: {i} - {fails[i]}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # noqa: BLE001  never let the model see a bare traceback instead of the summary
        out.append(f"check.py internal error: {type(e).__name__}: {e}"[:300])
    text = "\n".join(out)
    print(text if len(text) <= CAP else text[:CAP] + "\n...(cut)")
