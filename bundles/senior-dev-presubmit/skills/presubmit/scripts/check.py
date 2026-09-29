"""Presubmit check: the bundle's stand-in for senior-dev's refusing submit tool.

Reads /tmp/plan.md, inspects `git status` of /workspace, compiles the
changed Python files, runs the plan's verify command, and ends with one line:
READY, or NOT READY followed by every reason. It takes no arguments, because the
scorer's tool-call parser turns non-string arguments into strings.

The harness runs this file from a temporary copy with a temporary directory as
the working directory, so every path here is absolute. It always exits 0: a
non-zero exit only adds a traceback to the output.
"""

import os
import re
import shutil
import subprocess

WORKSPACE = os.environ.get("PRESUBMIT_WORKSPACE", "/workspace")
PLAN = os.environ.get("PRESUBMIT_PLAN", "/tmp/plan.md")
VERIFY_TIMEOUT = int(os.environ.get("PRESUBMIT_VERIFY_TIMEOUT", "150"))
TAIL_LINES = 15

# The code executor writes the script it runs into /workspace as .adk_exec_<hex>.py
# and deletes it afterwards, so it shows up as untracked while this check runs.
HARNESS_FILE = re.compile(r"(^|/)\.adk_exec_[0-9a-f]+\.py$")
# Paths the hidden tests or pytest itself own. The hidden test patch overwrites
# test files, and a changed config can break collection.
CONFIG_NAMES = {"conftest.py", "pytest.ini", "setup.cfg", "pyproject.toml", "tox.ini"}
TEST_PATH = re.compile(r"(^|/)tests?/|(^|/)test_[^/]*\.py$|_test\.py$")
# Caches the check deletes by itself: never tracked, always regenerated.
CACHE_PATH = re.compile(r"(^|/)(__pycache__|\.pytest_cache)/|\.pyc$")
# New files that are almost always scratch work rather than part of a fix.
SCRATCH_PATH = re.compile(
    r"(^|/)(repro|reproduce|debug|scratch|tmp|temp)[^/]*$"
    r"|\.(orig|rej|bak|swp|log|pyc)$|(^|/)__pycache__/|(^|/)plan\.md$"
)


def git(*args):
    return subprocess.run(
        ["git", *args], cwd=WORKSPACE, capture_output=True, text=True, errors="replace"
    )


def changed_paths():
    """Returns (modified, untracked) paths, relative to the workspace."""
    out = git("status", "--porcelain", "--untracked-files=all").stdout
    modified, untracked = [], []
    for line in out.splitlines():
        if len(line) < 4:
            continue
        code, path = line[:2], line[3:]
        if " -> " in path:
            path = path.split(" -> ", 1)[1]
        path = path.strip('"')
        if HARNESS_FILE.search(path):
            continue
        (untracked if code == "??" else modified).append(path)
    return modified, untracked


def clean_caches():
    """Deletes untracked Python caches, which would otherwise ship. Returns how many."""
    out = git("status", "--porcelain", "--untracked-files=all").stdout
    removed = 0
    for line in out.splitlines():
        path = line[3:].strip('"')
        if not line.startswith("??") or not CACHE_PATH.search(path):
            continue
        full = os.path.join(WORKSPACE, path)
        top = re.match(r"(.*?(?:__pycache__|\.pytest_cache))(/|$)", path)
        target = os.path.join(WORKSPACE, top.group(1)) if top else full
        if os.path.isdir(target):
            shutil.rmtree(target, ignore_errors=True)
        elif os.path.exists(target):
            os.remove(target)
        removed += 1
    return removed


def read_plan():
    """Returns (verify command or None, open items), or None when the file is missing."""
    try:
        with open(PLAN, encoding="utf-8", errors="replace") as f:
            lines = f.read().splitlines()
    except OSError:
        return None
    verify = None
    open_items = []
    for line in lines:
        stripped = line.strip()
        if verify is None and stripped.lower().startswith("verify:"):
            verify = stripped[len("verify:"):].strip() or None
        item = re.sub(r"^[-*]\s+", "", stripped)
        if item.startswith("[ ]"):
            open_items.append(item[3:].strip())
    return verify, open_items


def tail(text, n=TAIL_LINES):
    lines = text.rstrip().splitlines()
    return "\n".join(lines[-n:])


def main():
    reasons = []
    notes = []

    if not os.path.isdir(os.path.join(WORKSPACE, ".git")):
        print(f"NOT READY: {WORKSPACE} is not a git checkout")
        return

    cleaned = clean_caches()
    if cleaned:
        print(f"(deleted {cleaned} untracked cache files)")
    modified, untracked = changed_paths()
    changed = modified + untracked

    print("== changes")
    if not changed:
        reasons.append("the diff is empty: an empty patch cannot pass")
    else:
        listing = [f"  M {p}" for p in modified] + [f"  + {p}" for p in untracked]
        print("\n".join(listing[:15]))
        if len(listing) > 15:
            print(f"  ... and {len(listing) - 15} more")
        stat = git("diff", "--shortstat", "HEAD").stdout.strip()
        if stat:
            print(f"  ({stat}, not counting new files)")

    touched_tests = [
        p for p in changed if TEST_PATH.search(p) or os.path.basename(p) in CONFIG_NAMES
    ]
    if touched_tests:
        reasons.append(
            "test or config files changed (hidden tests overwrite them; "
            "restore with git checkout -- PATH, or rm if new): " + ", ".join(touched_tests)
        )
    scratch = [p for p in untracked if SCRATCH_PATH.search(p) and p not in touched_tests]
    if scratch:
        reasons.append("scratch files inside /workspace ship in the patch; delete them: " + ", ".join(scratch))
    other_new = [p for p in untracked if p not in scratch and p not in touched_tests]
    if other_new:
        notes.append("new files ship in the patch; keep them only if the fix needs them: " + ", ".join(other_new))

    broken = []
    for path in changed:
        full = os.path.join(WORKSPACE, path)
        if path.endswith(".py") and os.path.isfile(full):
            # compile() in memory: py_compile would write .pyc files into the workspace.
            try:
                with open(full, "rb") as f:
                    compile(f.read(), path, "exec")
            except SyntaxError as exc:
                broken.append(f"{path}:{exc.lineno}: {exc.msg}")
            except ValueError as exc:
                broken.append(f"{path}: {exc}")
    if broken:
        reasons.append("syntax errors: " + "; ".join(broken))

    plan = read_plan()
    if plan is None:
        reasons.append(f"{PLAN} does not exist: write it with a verify: line and one [ ] line per requirement")
    else:
        verify, open_items = plan
        if open_items:
            reasons.append(
                "open [ ] items in the plan (finish them, or delete a line the request does not require): "
                + "; ".join(open_items)
            )
        if verify is None:
            reasons.append(f"{PLAN} has no verify: line")
        elif not broken:
            print(f"== verify: {verify}")
            try:
                # pipefail: a verify line ending in "| tail" must still fail when pytest does.
                # The env keeps the run from leaving caches in the workspace.
                env = dict(os.environ, PYTHONDONTWRITEBYTECODE="1")
                env["PYTEST_ADDOPTS"] = (env.get("PYTEST_ADDOPTS", "") + " -p no:cacheprovider").strip()
                res = subprocess.run(
                    ["bash", "-o", "pipefail", "-c", verify], cwd=WORKSPACE, capture_output=True,
                    text=True, errors="replace", timeout=VERIFY_TIMEOUT, env=env,
                )
                output = tail((res.stdout or "") + (res.stderr or ""))
                if output:
                    print(output)
                print(f"(exit {res.returncode})")
                if res.returncode != 0:
                    reasons.append(
                        f"the verify command exits {res.returncode}. If that failure predates "
                        "your change, narrow the verify line to what your change affects"
                    )
            except subprocess.TimeoutExpired:
                reasons.append(f"the verify command ran past {VERIFY_TIMEOUT}s; narrow it to specific test files")

            # The verify command may leave files behind, and they would ship.
            clean_caches()
            _, after = changed_paths()
            leftovers = [p for p in after if p not in untracked]
            if leftovers:
                reasons.append("the verify command created files in /workspace; delete them: " + ", ".join(leftovers[:10]))

    for note in notes:
        print(f"note: {note}")
    if reasons:
        print("NOT READY:")
        for reason in reasons:
            print(f"  - {reason}")
    else:
        print("READY: call submit_patch now")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # the check must never crash the turn
        print(f"NOT READY: presubmit check failed to run: {type(exc).__name__}: {exc}")
