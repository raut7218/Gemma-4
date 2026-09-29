"""Summarise an A/B run from ab/run_holdout_ab.sh.

Usage: python3 ab/report.py ab/results/<run> [--control v43]

Reads each <arm>-r<n>/ directory swelite wrote (task_results.jsonl, patches/, logs/)
and prints, per arm: resolved rate, a paired comparison against the control, and the
behaviours the senior-dev port is meant to change.
"""

import argparse
import json
import math
import re
import sys
from collections import defaultdict
from pathlib import Path

CALL = re.compile(r"^--- CALL (\w+) (.*)$")
RESP = re.compile(r"^--- RESP (\w+) (.*)$")
TEST_OR_CONFIG = re.compile(
    r"^(tests?/|.*/tests?/|.*(^|/)test_[^/]*\.py$|.*_test\.py$|.*(^|/)(conftest\.py|pytest\.ini|setup\.cfg|pyproject\.toml|tox\.ini)$)"
)
SCRATCH = re.compile(r"(^|/)(repro|reproduce|debug|scratch|tmp|temp)[^/]*$|\.(orig|rej|bak|log|pyc)$|(^|/)plan\.md$")


def patch_files(text):
    """Returns (paths, new paths) from a git diff."""
    paths, new = [], []
    current = None
    for line in text.splitlines():
        if line.startswith("diff --git "):
            current = line.split(" b/", 1)[-1]
            paths.append(current)
        elif line.startswith("new file mode") and current:
            new.append(current)
    return paths, new


def log_features(path):
    """Tool-use facts from one swelite log."""
    f = dict(calls=0, plan_call=None, presubmit_calls=0, ready=0, not_ready=0,
             presubmit_before_submit=False, manual_check_before_submit=False,
             load_skill=0, repeat_presubmit_unchanged=0)
    if not path.exists():
        return f
    last_action_was_presubmit = False
    submitted = False
    for line in path.read_text(errors="replace").splitlines():
        m = CALL.match(line)
        if m:
            name, args = m.groups()
            if name in ("load_skill", "list_skills"):
                f["load_skill"] += 1
                continue
            f["calls"] += 1
            if f["plan_call"] is None and "/tmp/plan.md" in args and name == "run_command":
                f["plan_call"] = f["calls"]
            if name == "run_skill_script":
                f["presubmit_calls"] += 1
                if last_action_was_presubmit:
                    f["repeat_presubmit_unchanged"] += 1
                last_action_was_presubmit = True
                if not submitted:
                    f["presubmit_before_submit"] = True
                continue
            if name == "run_command" and "git status" in args and "git diff" in args and not submitted:
                f["manual_check_before_submit"] = True
            if name == "submit_patch":
                submitted = True
            last_action_was_presubmit = False
            continue
        m = RESP.match(line)
        if m and m.group(1) == "run_skill_script":
            body = m.group(2)
            if "NOT READY" in body:
                f["not_ready"] += 1
            elif "READY" in body:
                f["ready"] += 1
    return f


def load_arm(dirpath):
    rows = {}
    results = dirpath / "task_results.jsonl"
    if not results.exists():
        return rows
    for line in results.read_text().splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        iid = row["instance_id"]
        patch = (dirpath / "patches" / f"{iid}.patch")
        text = patch.read_text(errors="replace") if patch.exists() else ""
        paths, new = patch_files(text)
        row["touched_tests"] = any(TEST_OR_CONFIG.match(p) for p in paths)
        row["scratch"] = any(SCRATCH.search(p) for p in new)
        row["empty"] = not text.strip()
        row.update(log_features(dirpath / "logs" / f"{iid}.log"))
        rows[iid] = row
    return rows


def mcnemar_exact(b, c):
    """Two-sided exact McNemar p-value for discordant counts b and c."""
    n = b + c
    if n == 0:
        return 1.0
    k = min(b, c)
    p = sum(math.comb(n, i) for i in range(k + 1)) / 2 ** n
    return min(1.0, 2 * p)


def pct(num, den):
    return f"{100 * num / den:5.1f}%" if den else "   n/a"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("run_dir", type=Path)
    ap.add_argument("--control", default="v43")
    a = ap.parse_args()

    arms = defaultdict(dict)  # arm -> repeat -> rows
    for d in sorted(a.run_dir.iterdir()):
        m = re.fullmatch(r"(.+)-r(\d+)", d.name)
        if d.is_dir() and m:
            rows = load_arm(d)
            if rows:
                arms[m.group(1)][int(m.group(2))] = rows
    if not arms:
        sys.exit(f"no results under {a.run_dir}")

    print(f"run: {a.run_dir.name}")
    header = f"{'arm':<11}{'resolved':>14}{'submitted':>11}{'empty':>8}{'tests/cfg':>11}{'scratch':>9}{'plan@≤6':>9}{'checked':>9}"
    print(header)
    print("-" * len(header))
    for arm in sorted(arms, key=lambda x: (x != a.control, x)):
        rows = [r for rep in arms[arm].values() for r in rep.values()]
        n = len(rows)
        solved = sum(bool(r.get("resolved")) for r in rows)
        checked = sum(r["presubmit_before_submit"] or r["manual_check_before_submit"] for r in rows)
        print(f"{arm:<11}{solved:>5}/{n:<3}{pct(solved, n):>6}"
              f"{pct(sum(bool(r.get('patch_submitted')) for r in rows), n):>11}"
              f"{pct(sum(r['empty'] for r in rows), n):>8}"
              f"{pct(sum(r['touched_tests'] for r in rows), n):>11}"
              f"{pct(sum(r['scratch'] for r in rows), n):>9}"
              f"{pct(sum(r['plan_call'] is not None and r['plan_call'] <= 6 for r in rows), n):>9}"
              f"{pct(checked, n):>9}")

    if "presubmit" in arms:
        rows = [r for rep in arms["presubmit"].values() for r in rep.values()]
        runs = sum(r["presubmit_calls"] for r in rows)
        print(f"\npresubmit skill: {runs} runs over {len(rows)} tasks; "
              f"READY {sum(r['ready'] for r in rows)}, NOT READY {sum(r['not_ready'] for r in rows)}, "
              f"re-run with no action between {sum(r['repeat_presubmit_unchanged'] for r in rows)}, "
              f"load/list_skills turns {sum(r['load_skill'] for r in rows)}")

    if a.control in arms:
        print(f"\npaired vs {a.control} (same task, same repeat; exact McNemar):")
        for arm in sorted(arms):
            if arm == a.control:
                continue
            b = c = pairs = 0
            for rep, rows in arms[arm].items():
                ctrl = arms[a.control].get(rep, {})
                for iid, r in rows.items():
                    if iid not in ctrl:
                        continue
                    pairs += 1
                    x, y = bool(r.get("resolved")), bool(ctrl[iid].get("resolved"))
                    b += x and not y
                    c += y and not x
            print(f"  {arm:<10} pairs={pairs:<4} wins={b:<3} losses={c:<3} net={b - c:+d}  p={mcnemar_exact(b, c):.3f}")
        print("  (on ~33 tasks a net of 1-2 is within run-to-run noise; look for p < 0.1 across repeats)")


if __name__ == "__main__":
    main()
