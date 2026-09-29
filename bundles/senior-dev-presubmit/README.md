# senior-dev port: presubmit variant

This is the [base port](../senior-dev-port/) plus one skill. The base port asks the agent to run the pre-submit check by hand as a shell one-liner. Here that check is a script, run with one `run_skill_script` call. It is the closest this bundle format gets to senior-dev's `submit` tool, which refuses an unfinished answer in code.

The only differences from the base port are:
- the `skills:` entry in `agent.yaml`,
- `skills/presubmit/`,
- the "Ending the run" section of `prompts/system.md`,
- two sentences elsewhere in the prompt.

The tools, sampling settings and budget are unchanged.

## What the check does

`skills/presubmit/scripts/check.py` takes no arguments. Its output ends with `READY: call submit_patch now`, or with `NOT READY:` and a list of every reason. The reasons it can give:

| Check | Why |
| --- | --- |
| The diff is empty | An empty patch cannot pass |
| Test files (`tests/`, `test_*.py`, `*_test.py`) or `conftest.py`, `pytest.ini`, `setup.cfg`, `pyproject.toml` or `tox.ini` changed | The hidden tests overwrite them, and a changed config can break test collection |
| Untracked scratch files (`repro*`, `debug*`, `tmp*`, `*.orig`, `*.rej`, `*.log`, …) | Everything in /workspace ships |
| A changed `.py` file does not compile | This is checked in memory, so no `.pyc` files get written |
| `/tmp/plan.md` is missing, has no `verify:` line, or has open `[ ]` lines | This is senior-dev's checklist rule |
| The verify command exits non-zero, runs past 150 s, or creates files in /workspace | The command runs with `pipefail`, so `pytest … \| tail` still fails when pytest does |

Other new files show up as a note rather than a reason, since a fix can legitimately add a module. Untracked `__pycache__` and `.pytest_cache` are deleted by the check itself. The verify run sets `PYTHONDONTWRITEBYTECODE` and disables pytest's cache.

## Scorer details it relies on

These come from the official packages (`adk_submission` 0.2.11 and `adk_eval_core`), as vendored in `happyc0der/gemma-swe-agent`:

- **How it's run:** skills run through `AdkSandboxCodeExecutor`. ADK wraps the script and writes the wrapper to `/workspace/.adk_exec_<hex>.py`. It runs the wrapper with `python3` from a temporary directory, then deletes it. The check ignores that file and uses only absolute paths.
- **Arguments:** the declared parameters are `skill_name`, `file_path`, `args`, `short_options` and `positional_args`. Only the two string ones are used, because the scorer's tool-call parser turns non-string arguments into strings.
- **Tool-call budget:** each run goes through the budget check, so it costs one tool call, the same as a `run_command`.
- **Extra prompt:** ADK adds `list_skills`, `load_skill`, `load_skill_resource` and `run_skill_script`, plus about 500 tokens of its own skill instructions. Those instructions tell the model it must call `load_skill` first. The prompt says that's allowed but not needed. `SKILL.md` is kept short, so a `load_skill` call costs a turn and little context.

## What was tested

- The official `compile_submission` and the local `swelite` compiler both accept the bundle.
- `check.py` was run directly against a scratch git repository in 12 scenarios:
  - a clean fix,
  - an empty diff,
  - a test edit plus a scratch file,
  - a syntax error,
  - an open checklist item,
  - no plan file,
  - a failing verify behind `| tail`,
  - a verify command that leaves a file,
  - only the executor's temporary file present,
  - a new source file,
  - stale caches,
  - a verify timeout.

  Each gave the expected verdict.
- End to end, the bundle was compiled with the official compiler and `AdkSandboxCodeExecutor` over a stand-in sandbox. `run_skill_script` was then called with the two string arguments. It returned NOT READY before the fix and READY after it, and left no files behind.

Not yet tested: runs with the real model. The question is whether Gemma calls the skill before `submit_patch`, and whether it acts on NOT READY or loops on it.

## What to look at in trajectories

- **Coverage:** the share of runs that call `run_skill_script` before `submit_patch`.
- **Follow-through:** the share of NOT READY verdicts followed by a fix, and the share followed by an immediate re-run with nothing changed.
- **Outcomes:** stray-file, test-edit and empty-diff rates, against the base port and v4.3.
- **Budget:** turns spent on `load_skill` and `list_skills`.
