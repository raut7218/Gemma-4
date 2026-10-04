"""Phase 2: fresh sandbox, apply agent patch, reset protected test files, add hidden tests, run pytest + JUnit."""
from __future__ import annotations

import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

from .sandbox import PROTECTED, Sandbox


def patch_files(patch: str) -> list[str]:
    return sorted(set(re.findall(r"^\+\+\+ b/(\S+)", patch, re.M)) | set(re.findall(r"^diff --git a/\S+ b/(\S+)", patch, re.M)))


def _passed_ids(root) -> set[str]:
    ok = set()
    for tc in root.iter("testcase"):
        if not any(tc.find(t) is not None for t in ("failure", "error", "skipped")):
            ok.add(f"{tc.get('classname')}::{tc.get('name')}")
    return ok


def required_tests(task: dict, snapshot: Path, venv: Path, cache: Path) -> set[str]:
    """tasks.jsonl has no FAIL_TO_PASS/PASS_TO_PASS, so derive 'required' = tests passing with the gold patch."""
    f = cache / f"{task['instance_id']}.json"
    if f.exists():
        return set(json.loads(f.read_text()))
    ref = _verify(task, task["patch"], snapshot, venv)
    req = ref.get("passed_ids", [])
    cache.mkdir(parents=True, exist_ok=True)
    f.write_text(json.dumps(sorted(req)))
    return set(req)


def verify(task: dict, patch: str, snapshot: Path, venv: Path, cache: Path | None = None) -> dict:
    res = _verify(task, patch, snapshot, venv)
    if cache is not None and res.get("passed_ids") is not None:
        req = required_tests(task, snapshot, venv, cache)
        missing = sorted(req - set(res["passed_ids"]))
        res["required"], res["missing"] = len(req), missing[:20]
        res["resolved"] = bool(req) and not missing
        res["error"] = None if res["resolved"] else "TESTS_FAILED"
    res.pop("passed_ids", None)
    return res


def _verify(task: dict, patch: str, snapshot: Path, venv: Path) -> dict:
    sb = Sandbox(snapshot, venv, prefix="verify")
    try:
        if patch.strip():
            ok, err = sb.apply_patch(patch)
            if not ok:
                return {"resolved": False, "error": "PATCH_REJECTED", "log": err}
        touched = [f for f in patch_files(patch) + patch_files(task["test_patch"]) if PROTECTED.search(f)]
        if touched:
            sb.git("checkout", "HEAD", "--", *touched)
            sb.git("clean", "-f", "--", *touched)
        pf = sb.tmp / "test.patch"
        pf.write_text(task["test_patch"] if task["test_patch"].endswith("\n") else task["test_patch"] + "\n")
        p = sb.git("apply", "--unsafe-paths", str(pf))
        if p.returncode:
            return {"resolved": False, "error": "TEST_PATCH_FAILED", "log": p.stderr}
        targets = [f for f in patch_files(task["test_patch"]) if f.endswith(".py")]
        xml = sb.tmp / "junit.xml"
        code, out, err = sb.run(f"PYTHONSAFEPATH=1 python -s -m pytest {' '.join(targets)} --junitxml={xml} -p no:anyio -o timeout=0 -o python_classes='Test* *Test' -q",
                                timeout=900, rewrite=False)
        log = (out + err)[-4000:]
        try:
            root = ET.parse(xml).getroot()
            suite = root if root.tag == "testsuite" else root.find("testsuite")
            fails, errs, skipped, total = (int(suite.get(k, 0)) for k in ("failures", "errors", "skipped", "tests"))
            passed = total - fails - errs - skipped
            exit_ok = code == 0 and fails == 0 and errs == 0 and passed > 0
        except Exception as e:  # noqa: BLE001
            return {"resolved": False, "error": "NO_JUNIT", "log": f"{e}\n{log}"}
        return {"resolved": exit_ok, "error": None if exit_ok else "TESTS_FAILED",
                "passed": passed, "failed": fails + errs, "skipped": skipped, "log": log,
                "passed_ids": sorted(_passed_ids(root))}
    finally:
        sb.cleanup()
