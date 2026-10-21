"""check.py [TEST_FILE_OR_NODE...] : verify changes, repro script, syntax, and baseline vs new test failures.

1. Auto-removes untracked root scratch files (repro*.py, .adk_exec_*) and lists any remaining untracked files.
2. Compiles changed .py files and warns if debug breakpoints/pdb were left in the diff.
3. If /tmp/repro.py exists, runs it and reports pass/fail.
4. Maps changed modules (including docs_src/ tutorials and diff symbols) to their test files, runs pytest with
   per-test timeout and --maxfail=10, and re-runs only the failing node IDs on a cached baseline copy to label
   each failure NEW (fix it) or PRE-EXISTING (ignore it), falling back to whole-file baseline rerun only if a
   node ID is missing at baseline.
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
SCRATCH = re.compile(r"^(\.adk_exec_.*|(repro|test_repro|scratch|debug)_?[^/]*\.py)$")
GENERIC_STEMS = {"utils", "models", "base", "main", "common", "compat", "types", "exceptions", "helpers", "core", "config"}
CAP, MAX_FILES, T_RUN, T_BASE = 1500, 3, 60, 35
out = []


def sh(args, cwd=WS, timeout=30, env=None):
    return subprocess.run(args, cwd=cwd, capture_output=True, text=True, errors="replace", timeout=timeout, env=env)


def git(*args):
    return sh(["git", *args]).stdout


def pytest(targets, cwd, env, timeout):
    """-> (counts text, {node id: short message}) or (error text, None)."""
    try:
        p = sh([sys.executable, "-m", "pytest", *targets, "-q", "-rfE", "--tb=line", "--maxfail=10",
                "-o", "timeout=15", "-p", "no:cacheprovider"],
               cwd=cwd, timeout=timeout, env=env)
    except subprocess.TimeoutExpired as e:
        part = (e.stdout.decode(errors="replace") if isinstance(e.stdout, bytes) else (e.stdout or "")).strip()[-250:]
        return f"timed out after {timeout}s" + (f" ({part})" if part else ""), None
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


def diff_symbols(base, f):
    """Extract defined/modified symbol names from git diff and module top-level definitions."""
    syms = []
    diff = git("diff", "-U0", base, "--", f)
    for m in re.finditer(r"@@ .*? @@\s*(?:async\s+)?(?:def|class)\s+([A-Za-z_]\w*)", diff):
        if m.group(1) not in syms:
            syms.append(m.group(1))
    for m in re.finditer(r"^[+-]\s*(?:async\s+)?(?:def|class)\s+([A-Za-z_]\w*)", diff, re.M):
        if m.group(1) not in syms:
            syms.append(m.group(1))
    try:
        src = open(os.path.join(WS, f), encoding="utf-8", errors="replace").read()
        for m in re.finditer(r"^(?:def|class)\s+([A-Za-z_]\w*)|^([A-Za-z_]\w*)\s*=", src, re.M):
            s = m.group(1) or m.group(2)
            if s and len(s) >= 4 and not s.startswith("__") and s not in syms:
                syms.append(s)
    except OSError:
        pass
    return syms[:8]


def test_targets(changed, extra, base):
    tracked = git("ls-files", "*.py").split()
    tests = [f for f in tracked if re.search(r"(^|/)(test_[^/]*|[^/]*_test)\.py$", f)]  # not helpers like tests/utils.py
    test_contents = {}

    def read_test(t):
        if t not in test_contents:
            try:
                test_contents[t] = open(os.path.join(WS, t), encoding="utf-8", errors="replace").read()
            except OSError:
                test_contents[t] = ""
        return test_contents[t]

    picked = [a for a in extra if os.path.exists(os.path.join(WS, a.split("::")[0]))]
    for f in changed:
        if not f.endswith(".py") or TEST.search(f):
            continue
        parts = f.split("/")
        stem = parts[-1][:-3]
        # Tier 1: FastAPI docs_src/<topic>/<tutorial>.py -> tests/test_tutorial/test_<topic>/test_<base_tutorial>.py
        if parts[0] == "docs_src" and len(parts) >= 3:
            topic = parts[1]
            base_tut = re.sub(r"(_an)?(_py3\d+)?$", "", stem)
            tut_matches = [t for t in tests if topic in t and base_tut in t.split("/")[-1]]
            if not tut_matches:
                tut_matches = [t for t in tests if topic in read_test(t) and stem in read_test(t)]
            for t in sorted(tut_matches):
                if t not in picked:
                    picked.append(t)
            continue

        mod = f[:-3].removeprefix("src/").replace("/", ".")
        if stem == "__init__":
            mod, stem = mod.rsplit(".", 1)[0], parts[-2] if len(parts) > 1 else stem

        def named(t):  # tests/test_cells.py for cells.py, tests/test_status.py for status_codes.py
            if "test_tutorial/" in t:
                return False
            n = t.split("/")[-1].removeprefix("test_").removesuffix("_test.py").removesuffix(".py")
            if n == stem:
                return True
            if stem in GENERIC_STEMS or n in GENERIC_STEMS:
                return False
            return min(len(n), len(stem)) >= 4 and (n in stem or stem in n)

        by_name = sorted((t for t in tests if named(t)), key=lambda t: t.split("/")[-1] != f"test_{stem}.py")
        by_use = []
        for t in tests:
            if "test_tutorial/" in t:
                continue
            txt = read_test(t)
            n = txt.count(mod)
            if not n and "." in mod:
                pkg = mod.rsplit(".", 1)[0]
                if re.search(rf"from\s+{re.escape(pkg)}\s+import\s+[^\n]*\b{re.escape(stem)}\b", txt):
                    n = 1
            if n:
                by_use.append((-n, t))
        cands = by_name + [t for _, t in sorted(by_use)]
        # Tier 3: If no test matched the module name/import, match tests referencing symbols modified/defined in f
        if not cands:
            syms = diff_symbols(base, f)
            if syms:
                by_sym = []
                for t in tests:
                    if "test_tutorial/" in t:
                        continue
                    txt = read_test(t)
                    hits = sum(1 for s in syms if s in txt)
                    if hits:
                        by_sym.append((-hits, len(txt), t))
                cands = [t for _, _, t in sorted(by_sym)[:2]]
        # Tier 4: Fallback to tests/test_<top_pkg>.py (e.g. tests/test_requests.py)
        if not cands:
            top_pkg = f.removeprefix("src/").split("/")[0]
            cands = [t for t in tests if t.split("/")[-1] == f"test_{top_pkg}.py"]
        for t in cands:
            if t not in picked:
                picked.append(t)
    return picked[:MAX_FILES]


def run_repro():
    for d in dict.fromkeys([tempfile.gettempdir(), "/tmp"]):
        rp = os.path.join(d, "repro.py")
        if os.path.isfile(rp):
            try:
                p = sh([sys.executable, rp], cwd=WS, timeout=25)
                tail = (p.stdout + p.stderr).strip().splitlines()
                last = tail[-1][:120] if tail else ""
                if p.returncode == 0:
                    out.append(f"repro (/tmp/repro.py): PASS" + (f" ({last})" if last else ""))
                else:
                    msg = " | ".join(l.strip() for l in tail[-3:])[:220]
                    out.append(f"repro (/tmp/repro.py): FAIL (exit {p.returncode}) -> {msg}")
            except subprocess.TimeoutExpired:
                out.append("repro (/tmp/repro.py): timed out after 25s")
            break


def main():
    base = "_swegemma_baseline" if git("tag", "-l", "_swegemma_baseline").strip() else "HEAD"
    raw_untracked = [f for f in git("ls-files", "--others", "--exclude-standard").split() if not f.split("/")[-1].startswith(".adk_exec_")]
    # Auto-clean obvious root-level scratch files (repro.py, test_repro.py, etc.) when --clean is passed
    clean_flag = any(a in ("--clean", "clean") for a in sys.argv[1:])
    cleaned = []
    if clean_flag:
        for f in list(raw_untracked):
            if SCRATCH.match(f) and os.path.isfile(os.path.join(WS, f)):
                try:
                    os.remove(os.path.join(WS, f))
                    raw_untracked.remove(f)
                    cleaned.append(f)
                except OSError:
                    pass
    changed = [f for f in git("diff", "--name-only", base).split() if f]
    untracked = raw_untracked
    out.append("changed: " + (", ".join(changed) or "nothing (no tracked file differs from the baseline)"))
    if cleaned:
        out.append("removed untracked scratch: " + ", ".join(cleaned))
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
    lib_changed = [f for f in changed if f.endswith(".py") and not TEST.search(f) and not DROPPED.search(f)]
    if lib_changed:
        diff_text = git("diff", "-U0", base, "--", *lib_changed)
        if re.search(r"^\+[^+].*\b(breakpoint\s*\(|pdb\.set_trace\s*\()", diff_text, re.M):
            out.append("warning: debug breakpoint/pdb found in your diff -> remove it")
    run_repro()
    extra_args = [a for a in sys.argv[1:] if not a.startswith("-") and a != "clean"]
    targets = test_targets(changed + untracked, extra_args, base)
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
            if not why:
                # Fast path: re-run only the failing node IDs (works with spaces via list argv); fall back to whole files if a node ID is new
                bcounts, bfails = pytest(old, d, env, T_BASE)
                if bfails is None and "passed" not in bcounts:
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
