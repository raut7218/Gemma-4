---
name: presubmit
description: The check to run right before submit_patch. It reads /tmp/plan.md, checks the diff, and runs the verify command. It ends with READY or NOT READY and the reasons.
---
Run it with run_skill_script, passing skill_name "presubmit" and file_path "scripts/check.py". Pass no other arguments. It costs one tool call.

What it checks:
- /tmp/plan.md exists, has a `verify:` line, and has no open `[ ]` lines.
- The diff is not empty. It does not touch test files, conftest.py, pytest.ini, setup.cfg, pyproject.toml or tox.ini. It holds no scratch files (repro*, debug*, *.orig, *.rej and similar).
- Every changed Python file compiles.
- The verify command exits 0 and leaves no new files in /workspace.

On READY, call submit_patch. On NOT READY, fix each listed reason and run it again.
