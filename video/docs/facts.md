# Facts file

Every number, name and claim that appears on screen must be in this file. Nothing about the code in this repository (bundles, A/B tooling) is used, per the brief.

Sources:
- [S1] Kaggle competition page and organizers' harness guide, as summarised in the participant digest `happyc0der/gemma-swe-agent/docs/competition.md` (read 2026-09-24).
- [S2] `Gemma4_Developer_Agent_Research_Roadmap.docx` (this repo), sections 1–5, which summarise the same official sources plus published research.

## The competition
- F1. Name: "Google – The Gemma 4 Developer Agent Competition", on Kaggle, hosted by Google (Gemma team). A separate Paper Track exists. [S1, S2]
- F2. Organizers' goal, quoted: "Post-train an open model into a reliable agent that navigates complex codebases and drafts fixes for real software issues, accelerating developer workflows on everyday hardware." [S2]
- F3. Timeline (23:59 UTC): start 23 Sep 2026; Paper Track deadline 12 Nov 2026; entry and team-merger deadline 25 Nov 2026; final submission 2 Dec 2026. [S1]
- F4. Prizes: $37k / $18k / $10k for places 1–3. Paper Track: separate pool, reported as $35k. [S1, S2]
- F5. Winners must open-source code and adapters and provide a reproducible write-up. [S1]
- F6. 1 submission per day; 2 final selections; teams of up to 5. [S1]
- F7. External data and models allowed if freely accessible to all ("reasonableness" standard). Whether distillation from proprietary APIs is allowed was an open forum question at launch. [S1]

## The task
- F8. Input: a GitHub-style issue description and a Python repository checked out at the commit before the fix (base_commit). [S2]
- F9. The agent works in an offline sandbox: reads files, edits files, runs shell commands, queries a code graph. It must leave behind a git diff. [S2]
- F10. A separate clean container applies the diff, adds hidden tests written by the original developers, and runs pytest. Exit code 0 = resolved. [S1, S2]
- F11. Score = fraction of tasks resolved. About 120 hidden tasks from private repositories, split 50/50 between public and private leaderboards. [S1]
- F12. 12 hours total for all tasks (sandbox setup included, verification excluded). If tasks run one at a time, that is about 6 minutes per task (organizers' concurrency undocumented). [S1, S2]
- F13. Binary reward: a patch that is almost right scores zero. [S2]

## The model and serving
- F14. Only model: gemma-4-31b-it-qat-w4a16-ct (Gemma 4 31B, INT4 QAT, compressed-tensors, ~17 GB weights). One base model per submission. [S1]
- F15. Served by vLLM on 4× NVIDIA L4 (96 GB total), tensor_parallel_size = 4, max_model_len = 32,768. [S1]
- F16. LoRA: up to 8 adapters, rank ≤ 128, per-agent adapters allowed. [S1]
- F17. Gemma 4 tool-call and reasoning parsers (gemma4). [S1]
- F18. Generation config fields: temperature, top_p, top_k, max_output_tokens (≤ 32,768), thinking_level (NONE … HIGH), thinking_budget (default 4,096). [S1]

## Context window
- F19. Prompt, history, thinking and output share one 32k window. [S2]
- F20. The initial prompt is about 3.5k tokens; a full-size tool output (5,000 chars) is about 1.3k tokens; a trajectory overflows after roughly 20 full-size tool outputs. [S1, participant measurement]
- F21. In practice, ADK's event compaction does not run inside a task, so the context only grows. (participant finding, verified in google-adk 2.9.2) [S1]
- F22. If the window overflows, the task ends, but the diff left behind is still graded. [S1]

## The tools (fixed set of 9)
- F23. run_command — bash in /workspace; timeout min(300 s, time remaining); stdout/stderr cut to 5,000 chars. Budgeted. [S1]
- F24. read_file — at most 150 lines and 10,000 chars per call. Budgeted. [S1]
- F25. edit_file — exact, then whitespace-flexible, then regex-tokenised matching; error on 0 or >1 matches. Budgeted. [S1]
- F26. write_file — create/overwrite; files created under /workspace end up in the patch. Budgeted. [S1]
- F27. get_status — budget and patch status. Free. [S1]
- F28. submit_patch — captures git diff HEAD and ends the session after the turn. Free. [S1]
- F29. get_code_neighbors, search_similar_code (query must be a symbol name), get_code_subgraph — code-graph tools. Budgeted. [S1]

## The sandbox and the loop
- F30. Sandbox: python:3.13-slim, offline, 4 GiB RAM, 2 vCPU, /workspace. pytest available. [S1]
- F31. The harness commits its own pytest.ini and conftest.py as the baseline: do not modify them. [S1]
- F32. Untracked files in /workspace end up in the patch; scratch goes to /tmp. [S1]
- F33. The first message: problem statement, hints if any, budget, environment rules, tool notes, a 150-entry directory listing. [S2]
- F34. The loop ends on submit_patch(), budget exhaustion, or 3 consecutive turns without a tool call. [S1]
- F35. The patch is extracted with `git add -N . && git diff HEAD` even if the agent never submits. [S1]
- F36. Verification: fresh container; apply the patch; reset any test files the hidden test patch touches (editing tests is useless); apply the hidden tests; run pytest. [S1]

## The data
- F37. Public training data: 129 tasks — fastapi 67, rich 48, requests 13, httpx 1. [S1]
- F38. Median reference fix: 31 lines in 1 file. No hints text. About 20.5 GB of repository snapshots. [S1]
- F39. Tasks mined from repository histories; kept only if they changed core .py logic and matching unit tests, and passed two-phase verification (tests fail before the fix, pass after). [S2]
- F40. Each task: problem_statement, base_commit, repo snapshot, test_patch (hidden at evaluation), gold patch (training only), precomputed code-graph and embedding files. [S2]
- F41. Hidden set: same pipeline, private repositories, gold patch not visible. [S2]

## What you submit
- F42. A declarative bundle, not code: no Python entry points. Under 3 GiB. [S1]
- F43. agent.yaml (required root; LlmAgent by default, or SequentialAgent / ParallelAgent / LoopAgent). [S1, S2]
- F44. prompts/*.md via !include; {problem_description} and {hints} filled from session state. [S1]
- F45. configs/sampling.yaml (generation config). [S1]
- F46. sub_agents/*.yaml (sub-agents or AgentTools, each with its own prompt, tools, adapter, output_key). [S2]
- F47. skills/<name>/SKILL.md with scripts that run in the sandbox; each run costs one tool call. [S1, S2]
- F48. adapters/<name>/ — PEFT LoRA, safetensors only. [S1]
- F49. eval_config.yaml — per-task budgets: timeout_seconds, max_tool_calls, max_time_minutes, max_turns. [S1]
- F50. Organizers' starter: 1 minute, 10 tool calls per task — "which caps the score near zero". [S1, S2]

## What a coding agent is made of (the build)
- F51. Six parts: model (fixed; change only via LoRA), control flow (YAML agents), tools (fixed 9 + skills + sub-agents), context manager (32k), environment (offline container), verifier/selector (nothing built in — you create it). [S2]
- F52. Six families: A fixed workflow (Agentless), B tool loop (SWE-agent), C code-as-action (OpenHands), D structure-aware search (AutoCodeRover), E test-time scaling (best-of-n + verifier), F multi-agent orchestrator. A, B, F fit best; E only if time allows. [S2]
- F53. Candidate architecture to test (a hypothesis, not a result): Localize → Reproduce → Loop(Patch → Verify) → Submit, each an LlmAgent with restricted tools passing results through state. Build a single LlmAgent baseline first; adopt the staged design only if it wins on a held-out repo. [S2]
- F54. Levers ranked by expected return (a hypothesis): 1 local eval fidelity, 2 budget and termination policy, 3 prompt and workflow, 4 thinking vs context, 5 failure taxonomy, 6 LoRA SFT on verified trajectories, 7 more training tasks, 8 test-time scaling, 9 RL. [S2]
- F55. LoRA SFT recipe: collect Gemma's own passing runs (rejection sampling) and train a small LoRA on a subset of layers. A community report says high-rank, all-layer adapters misbehaved on the W4A16 build. [S1, S2]
- F56. Suggested local split: hold out a whole repository, not random tasks. [S2]
- F57. The arc: intelligence moved from the prompt into the scaffold (2024), then from the scaffold into the weights (2025). This competition asks you to repeat the second step on a small scale. [S2]

## Additions for depth (all from [S2] unless noted)
- F58. Failure taxonomy to label by hand (roadmap lever 5): looping, never submitting, wrong file, patch that won't apply, over-editing.
- F59. Lever rationale and first experiments (roadmap table 2.3):
  1 local eval fidelity — one leaderboard probe a day, so you need an offline copy you trust; first: run gold and null patches on all 129 tasks and match the harness.
  2 budget and termination — the starter config caps the score near zero, and every task must end in a diff; first: sweep time, tool-call and turn limits.
  3 prompt and workflow — the model has to explore, reproduce, fix, verify and submit, in that order; first: a strong single-agent prompt, then A/B against a staged SequentialAgent.
  4 thinking vs context — thinking tokens compete with observations; first: compare thinking_level NONE, LOW, HIGH and the budget.
  5 failure taxonomy — first: label 50 failed trajectories by hand.
  6 LoRA SFT on verified trajectories — teaches tool discipline and stops looping, cheap with rejection sampling; first: collect Gemma's own passing runs, train a rank-16 LoRA on a subset of layers.
  7 more training tasks — 129 tasks from 4 repos is too few and too narrow; first: SWE-smith-style bug injection into other Python repos.
  8 test-time scaling — several attempts plus selection, if time allows; first: two attempts and a judge vs one long attempt.
  9 RL — highest ceiling, highest cost; only after SFT.
- F60. History (roadmap §4): 2021–22 Codex/HumanEval (function-level code, pass@k) and ReAct (reason → act → observe). 2023 SWE-bench moved evaluation to real GitHub issues; early baselines resolved only a few percent. 2024 the scaffold era: SWE-agent's agent-computer interface, AutoCodeRover's AST search, OpenHands' code actions, Agentless showing a fixed pipeline could match agents. 2025: Claude 3.5 Sonnet reached 49% on SWE-bench Verified with bash plus an edit tool; open research moved to data and training (SWE-Gym, SWE-smith, R2E-Gym; SWE-RL, DeepSWE, Kimi-Dev lifting open 32–72B models to about 40–60% on Verified). 2026: context and harness engineering; small open models; evaluation moving to fresh or private repos — this competition's design.
- F61. Frontier practice vs constraint here (roadmap §5): verification in frontier agents = run tests, write reproductions, self-review the diff; here: reproduction script in /tmp run before and after the fix, plus nearby existing tests. Context: short observations, a notes file in /tmp, read-only sub-agents that return summaries. Knowledge: general skills (repo map, repro scaffold, diff check), nothing repo-specific.
- F62. Why the candidate architecture might lose: every stage boundary loses information, and the per-task time may be too tight for many stages; a single well-prompted LlmAgent is a strong, cheap baseline.
- F63. Roughly 20 of the 129 public tasks fail locally for environment reasons (gold patch fails); exclude them from local evaluation. [S2]
- F64. Sandbox detail: the initial user message includes a `find . -maxdepth 3` listing (150 entries). [S1]
- F65. General definition (standard, used for explanation): LoRA adds a low-rank update to a frozen weight matrix, W' = W + B·A, where B is d×r and A is r×k; only B and A are trained, so a rank-r adapter has r·(d+k) trainable numbers instead of d·k.
- F66. General definition: tensor parallelism splits each layer's weight matrices across GPUs so the GPUs compute one forward pass together (tensor_parallel_size = 4 → four shards).
- F67. General definition: W4A16 = weights stored in 4 bits, activations computed in 16 bits. QAT = the model was trained with the quantization in the loop.
- F68. 2026 research on small open models (roadmap §4): selective-expert training against action looping (SWE-Protégé: 7B → 42%), outcome-only RL recipes that survive small task pools (CANOPY), open trajectory corpora of 200k+ (Open-SWE-Traces).
- F69. ADK submission schema (organizers' adk_submission package, as vendored by a participant): an LlmAgent declares model, optional adapter, instruction, tools (tool names or wrapped AgentTools), skills, sub_agents, output_key (where its final text is stored in session state), include_contents ("default" or "none": whether earlier conversation is included), and generate_content_config. A LoopAgent has max_iterations (≥ 1). SequentialAgent and ParallelAgent run sub_agents in order / at once. [S1-adjacent: participant copy of the official package]
- F70. Six research questions for the paper track (roadmap §8, hypotheses): Q1 workflow vs loop at 31B; Q2 depth vs breadth under a hard time cap (one long attempt vs k short attempts + selection); Q3 self-distillation without proprietary data (does a LoRA on Gemma-only passing runs remove looping and never-submitting, and transfer to unseen repos?); Q4 thinking tokens vs observation tokens; Q5 do code-graph tools help localisation?; Q6 memorisation vs skill (how much local score disappears on held-out or synthetic repos?). [S2]
- F71. Roadmap week plan (a suggestion): week 1 (24–30 Sep) local harness, gold and null sweep, a strong prompt, sane budgets → first non-zero score; week 2 (1–7 Oct) trajectory logging, failure taxonomy on 50 runs, single loop vs SequentialAgent on a held-out repo → pick the scaffold family; week 3 (8–14 Oct) rejection-sample trajectories, LoRA smoke test on W4A16 serving → at least 300 verified trajectories; week 4 (15–21 Oct) first SFT LoRA, ablate rank and layers → LoRA beats prompt-only on the held-out repo; week 5 (22 Oct–4 Nov) test-time scaling if time allows, judge sub-agent → final architecture frozen; week 6 (5–12 Nov) write the paper-track submission; weeks 7–9 (13 Nov–2 Dec) robustness, seeds, budget tuning, choose the 2 final picks. [S2]
- F72. Rhythm (roadmap): spend the daily leaderboard submission on your best held-out configuration, not exploration; keep a one-line log per experiment (config, local score per repo, leaderboard score, one observation) — that log becomes the paper. [S2]
- F73. The roadmap's "read first" tier (P0, about 7 hours), with one takeaway each [S2]:
  R01 swegemma Evaluation Harness & Competitor Guide (60′) — most early zero scores come from harness mechanics, not model ability.
  R02 gemma-swe-agent: a participant's local harness and competition digest (30′) — gold patches pass 109/129 tasks locally; the other 20 fail for environment reasons, so exclude them.
  R03 SWE-bench (45′) — tasks come from issue→PR pairs whose tests fail before and pass after; the metric is binary.
  R04 SWE-agent (60′) — windowed file views, edits with immediate feedback and concise errors each produced measurable gains.
  R05 Building effective agents (25′) — start with the simplest thing that works; add structure only when it measurably helps.
  R06 Raising the bar on SWE-bench Verified with Claude 3.5 Sonnet (20′) — the prompt's workflow: explore, write a reproduction, fix, rerun, think about edge cases.
  R07 mini-swe-agent (30′) — once models got strong, most scaffold complexity stopped paying for itself.
  R08 Agentless (45′) — hierarchical localization, several candidate patches, selection with generated reproduction tests.
  R09 Effective context engineering for AI agents (25′) — treat context as a finite attention budget.
  R10 ADK docs (60′) — output_key writes to state, {var} reads from it, include_contents='none' gives a clean context, AgentTool returns a result.
  R11 Gemma 4 model card and launch post (30′) — native function calling and configurable thinking; check behaviour on the INT4 build.
- F74. About half the graph and embedding files are 0 bytes because of how hard links were stored, but 128 of 129 tasks still have usable data under one of the two file names (community audit). [S1, S2]
- F75. How a submission is scored, six stages [S2]: 1 compile (the YAML is validated and compiled into an ADK agent tree; no Python entry points; every agent declares the same base model); 2 serve (vLLM, INT4 31B, 4 L4s, 32,768, up to 8 LoRAs); 3 prepare container A (no git history after base_commit, dependencies preinstalled, network off, harness commits pytest.ini and conftest.py); 4 run the agent loop; 5 extract the patch (git add -N . && git diff HEAD, even without submit); 6 verify in container B.
- F76. The hidden set uses the same curation pipeline, so expect similar size and style: small, single-file fixes. [S2]
- F77. History details [S2]: 2023 — Reflexion showed written self-critique helps when there's a feedback signal. 2025 — Claude Code and Codex shipped as product harnesses; Codex's model was RL-trained inside its own sandbox; mini-swe-agent showed 100 lines were enough for frontier models. 2026 — Anthropic warned that "harnesses encode assumptions that go stale as models improve."
- F78. Why the staged shape (roadmap §5.1): Agentless and Kimi-Dev suggest explicit localization and reproduction stages make weaker models more reliable; context engineering argues for clean-context sub-stages passing short summaries through state; SWE-Protégé suggests the main failure to design against is looping, which is easier to bound stage by stage. [S2]
- F79. The roadmap's second tier (P1 · core methods, 13 items): evaluation-driven tool and prompt design, how production loops work, and the open training recipes SWE-Gym → SWE-smith → R2E-Gym → SWE-RL → DeepSWE → Kimi-Dev → SWE-Protégé → CANOPY, plus the LoRA mechanics to ship them. [S2]
- F80. SWE-bench Verified is a cleaned-up subset of SWE-bench (2024). [S2]
- F81. Tool results come back as JSON strings (e.g. a status, stdout and an exit_code for run_command; errors carry an error type and message). read_file reports is_truncated; edit_file takes old_string, new_string and an allow_multiple flag (default off). [S1]
- F82. Verification detail: the patch is applied with up to four attempts (4-pass apply), test files named in the hidden test patch are reset to HEAD, the test patch is applied, then `python3 -m pytest <targets> -q` runs on the target tests. [S1]
- F83. Character of the public repositories [S2]: fastapi — web framework (routing, dependency injection, pydantic validation); rich — terminal rendering (string and ANSI output assertions); requests — HTTP client (several tests need a network that doesn't exist offline); httpx — HTTP client.
- F84. Roadmap practice notes [S2, §5]: put tool-usage guidance in the prompt (tool descriptions can't be changed); keep observations short; keep a notes file in /tmp; use read-only sub-agents that return summaries; write general skills (repo map, repro scaffold, diff check), nothing repo-specific; lower thinking on tool turns and measure the MAX_TOKENS nudge rate.
- F85. Gold and null sweep (roadmap lever 1): run the gold (reference) patch on every task — it should pass — and a null (empty) patch — it should fail; where your local harness disagrees, fix the harness or exclude the task. [S2]
- F86. Arithmetic used on screen (derived, labelled "derived"): 12 h = 720 min; 720 ÷ 120 = 6 min; 3.5k ÷ 32,768 ≈ 11%; 1.3k ÷ 32,768 ≈ 4%; 4,096 ÷ 32,768 = 12.5%; 4 bits = 16 levels vs 16 bits = 65,536 levels; 3.5k + 20 × 1.3k = 29.5k, leaving ≈3.3k for everything else.
- F87. Derived: 23 Sep → 2 Dec is 70 days, so at most ≈70 daily submissions in total (derived from F3 and F6).
- F88. The agent framework is Google's Agent Development Kit (ADK). [S2]
- F89. Family A (fixed workflow, Agentless) is described in the roadmap as hard-coded stages: localize → repair → validate. [S2]
- F90. mini-swe-agent showed 100 lines were enough for frontier models (restating F77). [S2]
