---
name: swe
description: "Run directly with run_skill_script (do NOT call load_skill): skill_name='swe', file_path='locate.py' with args=['term1','term2'] to rank files/functions/callees/tests, or file_path='check.py' with args=['--clean'] to run /tmp/repro.py, clean scratch files, compile, and check NEW vs PRE-EXISTING test failures."
---
Call run_skill_script directly, skill_name "swe", args as a list of strings. Do not call load_skill.
- locate.py TERM... : IDF-ranked source files, each hit with its enclosing function/class, line range, 1-hop local callees, and matching test files.
- check.py [TEST_FILE...] [--clean] : cleans root scratch files, compiles changed files, runs /tmp/repro.py if present, runs the covering test files, and marks failures NEW or PRE-EXISTING.
