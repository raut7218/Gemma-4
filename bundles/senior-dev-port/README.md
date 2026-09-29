# senior-dev port

This is a submission bundle for the Gemma 4 Developer Agent competition. Its prompt is adapted from `/senior-dev`, the bug-fixing subharness in [CodeAF](https://github.com/Agent-Field/CodeAF) (Apache 2.0). The sources are `internal/seniordev/baked/agents/coder.md` and `internal/seniordev/app/solo_prompt.go`.

It is a draft. It has not been run on any tasks yet.

## Files

| Path | What it holds |
| --- | --- |
| `agent.yaml` | One LlmAgent, with the same 7 tools as the v4.3 public config |
| `prompts/system.md` | The ported prompt |
| `configs/sampling.yaml` | Temperature 0.2 (senior-dev's setting) with thinking off |
| `eval_config.yaml` | 4.5 min, 30 tool calls, 60 turns and 180 s: the best-measured public budget |

## What was carried over from senior-dev

| senior-dev | This bundle |
| --- | --- |
| One agent in one context, with no planner, reviewer or sub-agents | A single `LlmAgent` with no `sub_agents` or `agent_tool` |
| Unattended: with no question tool, make a reasonable choice and continue | The same sentence, near the top |
| The prompt carries mechanics only, never strategy ("a sentence spent on them is a sentence competing with the repository") | There is no step-by-step procedure. The sections cover the workspace, the tools, grading, the context window and how the run ends |
| The request is repeated verbatim at the top | `{problem_description}` comes first, under `# The request` |
| `.senior-dev/checklist.md` has one `[ ]` line per requirement and `submit` refuses without it | `/tmp/plan.md` has the same checklist and is written in the same call as the reproduction script, so it costs no extra tool call |
| `.senior-dev/pinned.txt` holds the verify command | The first line of `/tmp/plan.md` is `verify: <command>` |
| `submit` is the only ending and refuses on an empty tree | `submit_patch` is the only ending. The prompt requires a one-command presubmit check with explicit "do not submit if" conditions |
| After `submit`, senior-dev runs the project's tests itself, so do not edit test or CI configuration | The hidden tests overwrite test files, so pytest.ini, conftest.py and the packaging configs are off limits |
| An unsubmitted run ships the tree as it stands | True here as well: the fallback diff is graded. The prompt says so |
| Temperature 0.2 | Temperature 0.2 |

## What was left out, and why

- **Compaction and re-pinning the spec.** senior-dev re-pins `spec.md` after compaction. In the scorer, ADK compaction never fires within a task. It runs only after an invocation completes, and its 32k-token trigger is past vLLM's `max_model_len`. The prompt says nothing is dropped and output must be kept short.
- **The harness-side refusal.** senior-dev's `submit` tool enforces its checks in code. Here `submit_patch` is fixed, and callbacks come only from a closed registry, so the checks are a self-check the prompt requires. A `skills/presubmit/` script could run them in one call. That is the next thing to try; see below.
- **The nudges.** senior-dev's continuation messages list facts it observed. The scorer's three nudges are fixed and can't be changed from a bundle.
- **Web access, grep/glob tools and `apply_patch`.** None exist in the sandbox. Reading uses `grep -n` plus `sed -n` through `run_command`, because the scorer's parser turns `read_file`'s integer arguments into strings.

## How to test it

The hypothesis under test is that senior-dev's mechanics-only prompt beats the v4.3 procedural prompt on Gemma 4 31B INT4. That is not certain: a 31B model may need the step-by-step procedure that a frontier model does without.

1. Compile the bundle with the local harness (`happyc0der/gemma-swe-agent`, `harness/`):
   `swelite` or `Compiler(Path("bundles/senior-dev-port"), ...)`.
2. Run it and the v4.3 control on the same held-out split, with the same seeds. Only the prompt differs, because the tools, sampling and budget match.
3. Look at the trajectories as well as the score:
   - Is `/tmp/plan.md` written in the first ~6 calls?
   - Does the presubmit check run before `submit_patch`?
   - Did the rate of empty and stray-file diffs go down?
   - Did the rate of runs ending on the budget or the context window rather than `submit_patch` go down?
4. If the plan file helps but the free-form exploration doesn't, merge the two: keep v4.3's procedure and add the plan file and presubmit check.

### Next variant: presubmit as a skill

Move the check into `skills/presubmit/SKILL.md` and `scripts/check.py`, declared with `skills: [skills/presubmit]` in `agent.yaml`. The script would do the following:

- read `/tmp/plan.md`,
- run the verify command,
- print `git status --short` and `git diff --stat`,
- flag test or config files in the diff and any open `[ ]` lines,
- end with `READY` or `NOT READY: <reasons>`.

This is the closest match to senior-dev's refusing `submit`. It still costs one tool call per run.
