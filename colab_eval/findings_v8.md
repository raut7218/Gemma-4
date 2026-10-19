# v8 on the official swegemma scorer (Colab G4): findings

Run: 2026-10-19, 129 tasks × 1, `google/gemma-4-31B-it-qat-w4a16-ct` on vLLM 0.19.1 (bf16 KV, gemma4 tool + reasoning
parsers as in the scorer), ADK compaction at 14,336 tokens, time limit relaxed from 7 to 30 min.
Score: **51/129 (39.5%)**, 51/111 (45.9%) of the tasks whose gold patch passes in this sandbox.
Data: Drive `MyDrive/gemma4-eval/results/v8`, local copy `results/colab/v8` (gitignored).

## 0. Caveat: the skill scripts were broken in this run (emulation bug, fixed afterwards)

Every `locate.py` call (129) crashed and every `check.py` call (83) printed `internal error: FileNotFoundError:
'/workspace'`. swegemma's subprocess sandbox rewrites `/workspace` inside commands but not inside Python, and the
scripts open the absolute `/workspace` (which exists in the scorer's container). 124/129 tasks hit this. So this run
measures v8 *without* locate/check: no regression check before submit, ~1.7 wasted calls per task, and more manual
exploration. Kaggle's number for v8 should be higher than this run's on that count. Fixed by setting `SWE_WORKSPACE`
(checked locally through the real loop: both scripts return normal output). A re-run is needed for clean numbers.

Everything below is model/bundle behaviour that does not depend on the skills.

## 1. The 35-call budget is spent exploring (biggest lever)

Calls per task, env-solvable tasks:

| kind | resolved | unresolved |
|---|---:|---:|
| read_file | 8.5 | 12.3 |
| grep / find / ls | 6.9 | 10.6 |
| python repro scripts | 5.1 | 4.6 |
| edit_file ok | 2.1 | 2.0 |
| edit_file failed | 1.3 | 2.1 |
| pytest | 1.6 | 0.8 |

- Unresolved tasks use ~23 of 35 calls on reading/searching; median first edit at call 21 (resolved: 10).
- 18 NO_PATCH tasks: 16 submitted an empty diff after using all 35 calls; most tried their first edit at call
  36-37, i.e. after the budget was gone. 9 tasks never edited at all.
- 102/129 tasks received budget warnings; unresolved median = 35 calls (the cap).

Ideas: a hard "first edit by call ~15" rule in the prompt; read larger ranges once instead of many small reads;
stop grep chains once the file is known.

## 2. Malformed edit_file calls (real, not emulation)

150 of 468 `edit_file` calls arrived without `old_string`: the gemma4 tool-call parser split the arguments at `:`
inside multi-line code (keys like `"async def f(\n    body_fields"`). Kaggle runs the same parser. The failures
cluster in 23 tasks, 14 of which retried the same broken edit 3+ times in a row, burning budget.
Ideas: keep `old_string` short (1-3 lines) and, after one "mandatory input parameters" error, switch to a smaller
anchor or a python heredoc via run_command.

## 3. Patches that fail the hidden tests (42)

- 8 fail at collection (exit 2), and several more with TypeError/AttributeError: the hidden tests use an API the
  patch didn't create (`EventSourceResponse`, `CellSpan`, `ExternalDocumentation`, `strict_content_type=`,
  `endpoint_ctx=`, `Text.extend_style`, `frontend(fallback=)`). These are feature-request tasks whose names are
  implied by the issue/PR text; the model invented different names or put them elsewhere.
  Idea: "use exactly the names, signatures and module locations the issue mentions; export new public names where
  similar ones are exported".
- 2 time out (exit 124, rich_3772, rich_4006): the patch made tests hang.
- Many fail 1-4 tests: near misses that check.py (broken here) is meant to catch.

## 4. Thinking is 75% of output, and output is the time

- Thinking text is 75% of all generated characters. Median task: 37 LLM calls, 9.6k completion tokens.
- Unresolved tasks think more (median 23k chars vs 15.6k): thinking grows when the model is lost.
- Only 2 outputs hit `max_output_tokens` (4096); no LLM errors.

## 5. Time: the 7-min limit will bind on Kaggle

- Tool time is ~1 s/task here (no tests ran because check.py was broken); almost all time is decoding.
- Estimated 4×L4 agent time (20 tok/s decode, 1.5k tok/s prefill): median 8.5 min; 90/129 tasks > 7 min.
- Of the 51 resolved, 41 made their last edit before 7 L4-minutes, 10 later (fastapi_13207, 14301, 14360, 14419,
  15589, 9753, httpx_3672, rich_3052, 3278, 3470). Rough Kaggle-like estimate for this run: ~41/129.
- The estimate depends on the assumed L4 decode speed (22-30 tok/s would shorten it by 10-35%).
  Less thinking and fewer calls (section 1) both buy time.

## 6. Context and compaction: not the bottleneck

- Compaction fired in 125/129 tasks (1.4 times per resolved task, 2.4 per unresolved); the peak prompt stays at
  ~15-16k, never near 32k. More compactions only mark longer runs.
- Re-reading an identical file range: 82 calls over 129 tasks (<1 per task), so compaction causes little re-work.

## By repo

| repo | tasks | resolved | env-unsolvable |
|---|---:|---:|---:|
| fastapi | 67 | 25 | 5 |
| rich | 48 | 16 | 9 |
| requests | 13 | 9 | 4 |
| httpx | 1 | 1 | 0 |
