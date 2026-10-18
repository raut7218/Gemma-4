---
name: swe
description: Two repo scripts. locate.py finds where names live; check.py tests your change against the baseline.
---
Call run_skill_script directly, skill_name "swe", args as a list of strings.
- locate.py TERM... : ranked source files, each hit with its enclosing function and line range.
- check.py [TEST_FILE...] : compiles changed files, runs the test files that cover them, marks failures NEW or PRE-EXISTING, lists untracked files.
