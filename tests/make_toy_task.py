"""Builds a tiny offline stand-in for requests_6592 so the harness can be smoke-tested without Kaggle data.

  uv run python tests/make_toy_task.py data-toy
  uv run python -m harness.run --data data-toy --agent gold --task-ids toy_6592
The repo keeps the exact status_codes.py line that tests/fake_llm.py edits, so the fake scripts work on it.
"""
import json
import subprocess
import sys
import tarfile
import tempfile
from pathlib import Path

FILES = {
    "src/requests/__init__.py": "from .status_codes import codes\n",
    "src/requests/status_codes.py": (
        "_codes = {\n"
        '    200: ("ok", "okay"),\n'
        '    425: ("unordered_collection", "unordered"),\n'
        "}\n\n\nclass _Codes:\n    pass\n\n\ncodes = _Codes()\n"
        "for _code, _titles in _codes.items():\n    for _t in _titles:\n        setattr(codes, _t, _code)\n"
    ),
    "tests/test_status.py": "from requests import codes\n\n\ndef test_ok():\n    assert codes.ok == 200\n",
}


def git(ws, *a):
    return subprocess.run(["git", "-c", "user.name=t", "-c", "user.email=t@t", *a], cwd=ws, check=True,
                          capture_output=True, text=True).stdout


def main(out: Path):
    (out / "snapshots").mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as d:
        ws = Path(d)
        for f, c in FILES.items():
            (ws / f).parent.mkdir(parents=True, exist_ok=True)
            (ws / f).write_text(c)
        git(ws, "init", "-q"); git(ws, "add", "-A"); git(ws, "commit", "-qm", "base")
        with tarfile.open(out / "snapshots" / "toy_6592.tgz", "w:gz") as tf:  # snapshots ship with .git
            tf.add(ws, arcname=".")
        sc = ws / "src/requests/status_codes.py"
        sc.write_text(sc.read_text().replace('"unordered"),', '"unordered", "too_early"),'))
        patch = git(ws, "diff")
        git(ws, "checkout", "--", ".")
        t = ws / "tests/test_status.py"
        t.write_text(t.read_text() + "\n\ndef test_too_early():\n    assert codes.too_early == 425\n")
        test_patch = git(ws, "diff")
    task = {"instance_id": "toy_6592", "repo": "toy/requests", "problem_statement":
            "Add a `too_early` alias for HTTP status 425 to `requests.codes`.", "hints_text": "",
            "patch": patch, "test_patch": test_patch}
    (out / "tasks.jsonl").write_text(json.dumps(task) + "\n")
    print(f"wrote {out}/tasks.jsonl and snapshots/toy_6592.tgz")


if __name__ == "__main__":
    main(Path(sys.argv[1] if len(sys.argv) > 1 else "data-toy"))
