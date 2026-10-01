# Storyboard (generated from storyboard.src)

Total: 541 compositions, 1440.00 s (24:00.00); 11.3 compositions per 30 s.

| chapter | beats | comps | starts |
|---|---|---|---|
| 0 Cold open | 108 | 27 | 0:00.00 |
| 1 The task | 128 | 35 | 1:21.00 |
| 2 Scoring and time | 122 | 36 | 2:57.00 |
| 3 Rules, dates, prizes | 70 | 17 | 4:28.50 |
| 4 The model and the hardware | 172 | 49 | 5:21.00 |
| 5 The 32k context window | 125 | 38 | 7:30.00 |
| 6 The nine tools | 118 | 35 | 9:03.75 |
| 7 Sandbox and verification | 123 | 33 | 10:32.25 |
| 8 A worked example | 125 | 44 | 12:04.50 |
| 9 Failure modes | 79 | 23 | 13:38.25 |
| 10 The data and your local evaluation | 139 | 37 | 14:37.50 |
| 11 What you submit | 95 | 31 | 16:21.75 |
| 12 How coding agents got here | 108 | 27 | 17:33.00 |
| 13 What you need to build | 118 | 34 | 18:54.00 |
| 14 Prompt, skills and sub-agents | 112 | 30 | 20:22.50 |
| 15 Teaching the model | 64 | 18 | 21:46.50 |
| 16 Where to start | 63 | 15 | 22:34.50 |
| 17 Recap | 51 | 12 | 23:21.75 |

### 0 Cold open

| # | time | beats | on screen | purpose | leaves | carries |
|---|---|---|---|---|---|---|
| 1 | 0:00.00 | 4.5 | CLOSE frame one, finished: an issue card fills the frame — "Issue · open", corner tag "illustrative example", title `summarize([]) raises ZeroDivisionError`, body "Expected 0 for an empty list." | hook with a bug every engineer recognises | the card slides left and shrinks while a code panel sweeps in from the right | issue card |
| 2 | 0:03.38 | 4.5 | WIDE issue card small at left; code panel `src/stats.py` at right, lines 1–8 of a longer file (a slim scrollbar shows more below) | the bug lives in a repository | the camera pushes right onto line 6 while the issue card drifts out of frame left | code panel |
| 3 | 0:06.75 | 4.5 | CLOSE line 6 `return total / len(xs)` glows red, a red tick draws in the gutter, small caps "the bug" | locate | the line itself begins to split | line 6 |
| 4 | 0:10.12 | 4.5 | CLOSE line 6 splits: `- return total / len(xs)` rises in red | a fix is a diff | then: `+ return total / len(xs) if xs… | diff lines |
| 5 | 0:13.50 | 4.5 | `+ return total / len(xs) if xs else 0` drops in gold; the rest of the file dims | a fix is a diff, continued | the two lines slide together toward the centre | diff lines |
| 6 | 0:16.88 | 2.5 | [SIG1] WIDE the two diff lines fold into a gold chip `patch.diff`, large at centre | the agent's only output | the chip glides right as a green box draws around its landing spot | CHIP |
| 7 | 0:18.75 | 4.5 | WIDE container B (green rounded case with a header strip "fresh container") on the right, the chip settles into its top; at left, big type enters from the left: "The fix is judged somewhere else." | the patch is judged elsewhere | the left type rolls up to its next line | CHIP, container B |
| 8 | 0:22.12 | 4.5 | six grey test bars drop into B one after another; left type becomes "Tests written by the original developers." | hidden tests | `$ pytest` starts typing under the bars | container B |
| 9 | 0:25.50 | 4.5 | corner tag "illustrative" stays on; `$ pytest` types inside B, then the bars turn green one by one (a soft click each); left type: "Never shown to the agent." | the verdict comes from tests | `→ exit 0` appends to the line | container B |
| 10 | 0:28.88 | 4.5 | the pytest line completes `$ pytest → exit 0` and swells | binary outcome | `exit 0` lifts off toward the camera while B falls back | exit 0 |
| 11 | 0:32.25 | 4.5 | FULL `exit 0` fills the frame; "= resolved" writes beneath | define success | the reading beat takes over without a cut | exit 0 |
| 12 | 0:35.62 | 2.5 | reading beat: the camera pushes in on "exit 0 = resolved"; it brightens while the rest of the frame dims a step | let "exit 0 = resolved" land | the pair shrinks toward one cell of a grid revealed behind it | exit 0 |
| 13 | 0:37.50 | 3.5 | OVER the grid: 12×10 cells bloom from the centre; the verdict lands in one cell — the gold patch inside, a green ring around it [SIG1 ends] | about 120 hidden tasks | a plate label rises from the bottom edge | GRID |
| 14 | 0:40.12 | 4.5 | GRID; label "≈120 hidden tasks · from private repositories"; a small lock stroke draws on every cell, rippling outward | scale, and the twist | the reading beat takes over without a cut | GRID |
| 15 | 0:43.50 | 2.5 | reading beat: an underline sweeps under "≈120 hidden tasks" and it brightens | let "≈120 hidden tasks" land | the label rewrites itself in place | GRID |
| 16 | 0:45.38 | 4.5 | GRID; a tiny issue → patch → verdict glyph sweeps along every row; label "each cell is one full run" | every cell is the whole loop | the grid dims and the title writes over it | GRID (dim) |
| 17 | 0:48.75 | 4.5 | FULL title over the dim grid: "The Gemma 4 Developer Agent Competition", small caps "Google · Kaggle · 2026" above | the name | the title rushes toward camera, revealing the first constraint behind it | — |
| 18 | 0:52.12 | 4.5 | FULL "One open model." enters from the left | constraint 1 | holds while the next line enters | words |
| 19 | 0:55.50 | 4.5 | FULL "Real bugs." enters from the right beneath it | constraint 2 | holds | words |
| 20 | 0:58.88 | 4.5 | FULL "No internet." enters from the left | constraint 3 | the three lines leave to alternating sides | — |
| 21 | 1:02.25 | 3.5 | quote writes in, small caps "the organizers' goal": “Post-train an open model into a reliable agent that navigates complex codebases | intent, in their words | the second line writes beneath | quote |
| 22 | 1:04.88 | 4.5 | second line: "and drafts fixes for real software issues, accelerating developer workflows on everyday hardware.” — "Post-train an open model" warms to purple, "drafts fixes" to gold as the line lands | the two verbs that define the work | the quote lifts out of the top edge | quote |
| 23 | 1:08.25 | 4.5 | "2 December 2026" writes large, small caps "final submission · 23:59 UTC" | deadline | the reading beat takes over without a cut | — |
| 24 | 1:11.62 | 2.5 | reading beat: "2 December 2026" stays bright while everything else in the frame sinks to a third | let "2 December 2026" land | the date rushes toward camera, revealing a vertical rail of 17 ticks | — |
| 25 | 1:13.50 | 3.5 | OVER a vertical rail of 17 ticks down the left third | the shape of the film, without a wall of text | then: "17 chapters · 24 minutes" beside it;… | rail |
| 26 | 1:16.12 | 4.5 | "17 chapters · 24 minutes" beside it; only tick 01 carries its name, "The task" | the shape of the film, without a wall of text, continued | tick 01 brightens and glides to the top-left corner | rail |
| 27 | 1:19.50 | 2 | the tick and its name settle into the RAIL tag at the top-left, at its exact pixels; the other ticks fade; the grid fades | where we are | a question writes at centre | RAIL |

### 1 The task

| # | time | beats | on screen | purpose | leaves | carries |
|---|---|---|---|---|---|---|
| 28 | 1:21.00 | 4.5 | FULL "What does the agent receive?" | set the question | the words part left and right, revealing two inputs | — |
| 29 | 1:24.38 | 3.5 | WIDE the issue card enters from the left, a stacked repository from the right | two inputs | the camera pushes onto the issue card | issue, repo |
| 30 | 1:27.00 | 4.5 | CLOSE issue card; "a GitHub-style issue description" underlines beneath it | input one | the camera slides right to the repository | issue |
| 31 | 1:30.38 | 4.5 | CLOSE the repository unfolds into a commit line, dots left to right, a pointer labelled `base_commit` | input two | the dots right of the pointer begin to grey | commit line |
| 32 | 1:33.75 | 4.5 | the dots after base_commit turn grey; "the fix is not in your checkout" | you start one commit before the fix | the reading beat takes over without a cut | commit line |
| 33 | 1:37.12 | 2.5 | reading beat: an underline sweeps under "not in your checkout" and it brightens | let "not in your checkout" land | the camera pulls back | commit line |
| 34 | 1:39.00 | 4.5 | WIDE issue card and repository slide together into a blue rounded block "Gemma 4 31B" | the model reads them | an outline draws around the block | model block |
| 35 | 1:42.38 | 4.5 | an outline draws around the model: "Agent Development Kit (ADK)" | the harness around the model | a rounded case draws around both | model, ADK |
| 36 | 1:45.75 | 4.5 | the blue container A draws around both — header strip "container A · offline sandbox", red small caps "no network" | where the agent works | four teal arrows grow out of the agent | container A |
| 37 | 1:49.12 | 4.5 | two teal arrows grow out of the agent: "read files" · "edit files" | the first two kinds of action | two more arrows grow | arrows |
| 38 | 1:52.50 | 4.5 | two more: "run commands" · "query a code graph" | the other two | each label rewrites into a real call | arrows |
| 39 | 1:55.88 | 2 | the labels rewrite: read_file(…), edit_file(…), run_command(…), get_code_neighbors(…) | actions are tool calls | the arrows retract into the agent | arrows |
| 40 | 1:57.38 | 4.5 | OVER the agent opens into the LOOP: "think" → "call a tool" → "read the result" → back to "think" | the loop | a blue dot starts round it | LOOP |
| 41 | 2:00.75 | 2 | a blue dot laps the loop; each lap adds one line to a log at the right | it repeats | the dot takes a new branch out | LOOP, log |
| 42 | 2:02.25 | 2.5 | the dot exits by a new branch `submit_patch()`; the gold chip pops out of container A | how it ends | A slides left; the chip slides right | CHIP |
| 43 | 2:04.12 | 4.5 | CLOSE the chip; its label expands to "git diff of /workspace" | what the patch is | type enters from both sides over the dimmed frame | CHIP |
| 44 | 2:07.50 | 4.5 | FULL "You don't submit a fix." from the left, "You submit the agent that writes it." from the right | the reframe | the reading beat takes over without a cut | — |
| 45 | 2:10.88 | 2.5 | reading beat: the camera pushes in on "You submit the agent"; it brightens while the rest of the frame dims a step | let "You submit the agent" land | the words part, revealing container B | — |
| 46 | 2:12.75 | 3.5 | WIDE container A (blue, left) and container B (green, right) side by side | judged in a second container | then: the chip travels from A to B… | CHIP, A, B |
| 47 | 2:15.38 | 2 | the chip travels from A to B along an arc | judged in a second container, continued | B lights from inside | CHIP, A, B |
| 48 | 2:16.88 | 4.5 | B lights: "exit 0 → resolved" in green; a red ghost beside it, "anything else → not resolved" | binary, as in the opening; the details come in chapter 7 | both verdicts tip over into a plot | verdict |
| 49 | 2:20.25 | 4.5 | OVER axes draw: x "how close the patch is", y "score" | binary reward | then: a step function: 0 everywhere, jumping to… | axes |
| 50 | 2:23.62 | 2 | a step function: 0 everywhere, jumping to 1 only at the right end | binary reward, continued | a blue dot starts along the x axis | axes |
| 51 | 2:25.12 | 3 | the dot slides through a region marked "almost right"; the score stays on 0 | almost right scores zero | the reading beat takes over without a cut | axes |
| 52 | 2:27.38 | 2.5 | reading beat: "almost right scores zero" stays bright while everything else in the frame sinks to a third | let "almost right scores zero" land | the axes slide away left as container A returns | axes |
| 53 | 2:29.25 | 4.5 | WIDE container A; a small file `/tmp/repro.py` appears beside `/workspace`, tag "concept" | the agent writes its own check | a run arrow fires into it | A |
| 54 | 2:32.62 | 4.5 | run → red ✗ "fails before the fix" | reproduce first | an edit lands in /workspace | A |
| 55 | 2:36.00 | 3 | edit → run → green ✓ "passes after" | confirm | the camera pulls back over the whole flow | A |
| 56 | 2:38.25 | 4.5 | label "the hidden tests are never shown, so the agent checks itself" | why | the flow straightens into a single strip | — |
| 57 | 2:41.62 | 3.5 | OVER strip: issue → LOOP → chip → container B → verdict | the pipeline in one line | the loop section lifts and brightens | strip |
| 58 | 2:44.25 | 4.5 | the loop part glows blue, "you design this"; container B and the verdict turn grey, "fixed by the organizers" | your part vs theirs | the blue part zooms forward | strip |
| 59 | 2:47.62 | 4.5 | CLOSE "you design this" fans into five tags: prompts · workflow · skills · adapters · budgets | a preview of what you submit | the tags fold into one card | tags |
| 60 | 2:51.00 | 3 | the card becomes "your bundle" | you upload configuration and get one number back | then: it slides into an upload slot; the… | bundle |
| 61 | 2:53.25 | 3 | it slides into an upload slot; the slot prints one number, "your score" — defined next | you upload configuration and get one number back, continued | the card multiplies into cells | bundle |
| 62 | 2:55.50 | 2 | the card multiplies into a row, then into the grid of ≈120 cells | one run per task | the camera dives into one cell; the RAIL tag rewrites to "02 Scoring and time" | GRID |

### 2 Scoring and time

| # | time | beats | on screen | purpose | leaves | carries |
|---|---|---|---|---|---|---|
| 63 | 2:57.00 | 4.5 | CLOSE one cell fills the frame: "one task = one issue + one repository" | the unit | the camera pulls back | cell |
| 64 | 3:00.38 | 4.5 | WIDE GRID: "≈120 hidden tasks" | the hidden set | the grid parts down the middle | GRID |
| 65 | 3:03.75 | 4.5 | the halves slide apart: "public leaderboard" · "private leaderboard", small caps "split 50/50" | the split | the halves close as an equation writes above | GRID |
| 66 | 3:07.12 | 3 | FULL equation writes, 3Blue1Brown-style: score = tasks resolved ÷ tasks | the metric | the denominator transforms into a number | equation |
| 67 | 3:09.38 | 2.5 | the denominator becomes ≈120; the numerator glows green, "resolved" | concrete | the reading beat takes over without a cut | equation |
| 68 | 3:11.25 | 2.5 | example (tag "example"): 3 of 12 cells turn green and the equation reads 3 ÷ 12 = 0.25 | what the score means, concretely | the denominator returns to ≈120 | equation |
| 69 | 3:13.12 | 4.5 | OVER [SIG2] a clock face draws itself: "12 hours" | the time cap | a line writes under it | clock |
| 70 | 3:16.50 | 4.5 | under it: "for all tasks · sandbox setup included · verification excluded" | what counts | the face starts to slice | clock |
| 71 | 3:19.88 | 2 | the face slices into about 120 thin wedges in one sweep | dividing the time | one wedge lifts | clock |
| 72 | 3:21.38 | 2 | one wedge pulls out toward the camera | one task's share | it begins to unroll | wedge |
| 73 | 3:22.88 | 4.5 | the wedge unrolls into a horizontal ruler: "≈ 6 minutes per task", ticks 0 … 6 min | the per-task budget | a caveat writes beneath | ruler |
| 74 | 3:26.25 | 3 | FULL the arithmetic writes, one term at a time: 12 h = 720 min | the conversion (derived) | the next term writes | equation |
| 75 | 3:28.50 | 2 | 720 min ÷ ≈120 tasks | the division | the result writes | equation |
| 76 | 3:30.00 | 2 | = ≈ 6 min per task — the 6 slides down onto the ruler's last tick | the result lands on the ruler | the reading beat takes over without a cut | equation → ruler |
| 77 | 3:31.50 | 2.5 | reading beat: an underline sweeps under "≈ 6 min per task" and it brightens | let "≈ 6 min per task" land | the ruler returns | equation → ruler |
| 78 | 3:33.38 | 4.5 | the first part of every task's 6 minutes shades grey: "sandbox setup counts against the 12 h" (concept) | setup eats into the budget | the caveat writes | ruler |
| 79 | 3:36.75 | 4.5 | small caps under the ruler: "if tasks run one at a time · concurrency not documented" | honesty about the estimate | the loop drops onto the ruler's left end | ruler |
| 80 | 3:40.12 | 2 | the LOOP rolls along the ruler | the loop costs time | then: each lap lays a coloured block (read,… | ruler |
| 81 | 3:41.62 | 2.5 | each lap lays a coloured block (read, run, edit, run, submit); tag "illustrative" | the loop costs time, continued | the last block lands | ruler |
| 82 | 3:43.50 | 2.5 | the final "submit" block lands before 6 min; a green tick | it fits | a second ruler slides in below | ruler |
| 83 | 3:45.38 | 3 | second ruler: blocks run past the end, which turns red: "budget exhausted" | running out | a single block on it begins to stretch | rulers |
| 84 | 3:47.62 | 4.5 | one run_command block stretches to "up to 300 s per command" — most of the ruler | one slow command can eat a task [SIG2 ends] | the reading beat takes over without a cut | ruler |
| 85 | 3:51.00 | 2.5 | reading beat: the camera pushes in on "up to 300 s per command"; it brightens while the rest of the frame dims a step | let "up to 300 s per command" land | the ruler folds into a file card | ruler |
| 86 | 3:52.88 | 4.5 | WIDE file card `eval_config.yaml` writes in; two lines type: timeout_seconds · max_tool_calls | the budget lever | two more lines type | file card |
| 87 | 3:56.25 | 2 | two more lines: max_time_minutes · max_turns | the four budgets | a dial grows beside each line | file card |
| 88 | 3:57.75 | 4.5 | four dials attach; small caps "per-task budgets — you set these" | they are knobs | the dials snap to a preset | dials |
| 89 | 4:01.12 | 4.5 | the dials snap to "1 minute · 10 tool calls" | the trap | then: label "the organizers' starter — which caps… | dials |
| 90 | 4:04.50 | 4.5 | label "the organizers' starter — which caps the score near zero" | the trap, continued | the reading beat takes over without a cut | dials |
| 91 | 4:07.88 | 2.5 | reading beat: "caps the score near zero" stays bright while everything else in the frame sinks to a third | let "caps the score near zero" land | the dials begin to sweep up | dials |
| 92 | 4:09.75 | 2 | the dials sweep up while the 6-minute ruler ghosts behind them | the trade-off | the camera turns to a calendar | dials, ruler |
| 93 | 4:11.25 | 3.5 | WIDE calendar strip from 23 Sep to 2 Dec, one tick per day drawing left to right | how many tries you get | a counter runs above | calendar |
| 94 | 4:13.88 | 4.5 | a counter: "1 submission per day · ≈70 tries (derived)" | scarcity | the reading beat takes over without a cut | calendar |
| 95 | 4:17.25 | 2.5 | reading beat: the camera pushes in on "≈70 tries (derived)"; it brightens while the rest of the frame dims a step | let "≈70 tries (derived)" land | a dashed copy of the pipeline draws below | calendar |
| 96 | 4:19.12 | 3.5 | OVER the scoring pipeline at top | you need an offline copy you trust | then: a dashed copy at bottom, "your local… | two pipelines |
| 97 | 4:21.75 | 4.5 | a dashed copy at bottom, "your local evaluation" (built in chapter 10); an arrow between them, "must agree" | you need an offline copy you trust, continued | the two pipelines fold together | two pipelines |
| 98 | 4:25.12 | 4.5 | the folded line compresses into four stamps: "≈120 private tasks" · "pytest exit 0" · "≈6 min a task, if sequential" · "1 a day" | recap as objects | the stamps drop into a calendar; the RAIL rewrites to "03 Rules, dates, prizes" | stamps, calendar |

### 3 Rules, dates, prizes

| # | time | beats | on screen | purpose | leaves | carries |
|---|---|---|---|---|---|---|
| 99 | 4:28.50 | 4.5 | WIDE calendar strip; a pin drops at "23 Sep · start" | the start | the next pin falls | calendar |
| 100 | 4:31.88 | 4.5 | pin "12 Nov · paper track deadline" | date 2 | the next pin falls | calendar |
| 101 | 4:35.25 | 4.5 | pin "25 Nov · entry and team-merger deadline" | date 3 | the reading beat takes over without a cut | calendar |
| 102 | 4:38.62 | 2.5 | reading beat: an underline sweeps under "2 Dec · final submission" and it brightens | let "2 Dec · final submission" land | the span shades in two colours | calendar |
| 103 | 4:40.50 | 4.5 | the strip shades "23 Sep → 12 Nov: paper window" in pale ink, then "12 Nov → 2 Dec: final push" in red; a dot travels the whole span | how the time divides | the strip rises; three plinths grow out of it | calendar |
| 104 | 4:43.88 | 4.5 | the first plinth rises in the centre: "1st place · $37k" | the stakes | two more rise beside it | plinths |
| 105 | 4:47.25 | 4.5 | two flanking plinths rise: "2nd · $18k" left, "3rd · $10k" right | the podium | a fourth plinth slides in apart | plinths |
| 106 | 4:50.62 | 4.5 | a separate plinth: "Paper Track · separate pool, reported as $35k · deadline 12 Nov" | the second track | the plinths sink | plinths |
| 107 | 4:54.00 | 4.5 | FULL "Winners open-source their code and adapters" from the left; "and provide a reproducible write-up." from the right | the obligation | the reading beat takes over without a cut | — |
| 108 | 4:57.38 | 2.5 | reading beat: "open-source their code and adapters" stays bright while everything else in the frame sinks to a third | let "open-source their code and adapters" land | the words part; three tokens drop through the gap | — |
| 109 | 4:59.25 | 4.5 | WIDE a rule token drops with a calendar tick on its face: "1 submission a day" | rule 1 | a second token drops | tokens |
| 110 | 5:02.62 | 4 | a second token with two small flags: "2 final selections" | rule 2 | a third token drops | tokens |
| 111 | 5:05.62 | 4.5 | a third token with five small figures: "teams of up to 5" | rule 3 | the middle token opens | tokens |
| 112 | 5:09.00 | 3.5 | "2 final selections" opens: a row of past submissions, two get flagged | what it means | the tokens slide left; a gate draws | tokens |
| 113 | 5:11.62 | 4.5 | a gate: "external data and models: allowed if freely accessible to all"; dataset blocks pass through | the reasonableness standard | a smaller gate with a question mark appears | gate |
| 114 | 5:15.00 | 4.5 | the second gate: "distillation from proprietary APIs: an open question at launch" | honesty | both gates fold away; the "2 final selections" flags return | gates |
| 115 | 5:18.38 | 3.5 | "One open model." re-enters from the left exactly as in the cold open and thickens into a blue block | the rules lead back to the one model | the block deepens into 3D | words → model block |

### 4 The model and the hardware

| # | time | beats | on screen | purpose | leaves | carries |
|---|---|---|---|---|---|---|
| 116 | 5:21.00 | 4.5 | 3D a slab of weights rests on an architectural-model plinth; the key light sweeps across it as the camera orbits at 40°; HTML label "gemma-4-31b-it-qat-w4a16-ct" | the only model | labels pin to it | slab |
| 117 | 5:24.38 | 2.5 | soft key light from the left, cool rim light behind; camera 40°; HTML label "gemma-4-31b-it-qat-w4a16-ct" | the only model, continued | the camera orbits slowly | slab |
| 118 | 5:26.25 | 4.5 | 3D an HTML label pins to the slab: "31B parameters" | size | a second label pins | slab |
| 119 | 5:29.62 | 4.5 | 3D a second label: "≈17 GB of weights" | footprint | a third label pins | slab |
| 120 | 5:33.00 | 4.5 | 3D label "one base model per submission — every agent in your bundle uses it" | the rule | a 2D inset opens beside the slab | slab |
| 121 | 5:36.38 | 2 | 2D inset beside the slab: one weight as 16 bit-cells, squeezed down to 4 bit-cells | what INT4 storage means | an activation bar slides in under it | bit bars |
| 122 | 5:37.88 | 4.5 | inset: the activation bar stays 16 bits wide — "W4A16: 4-bit weights, 16-bit activations" | the format | the reading beat takes over without a cut | bit bars |
| 123 | 5:41.25 | 2.5 | reading beat: an underline sweeps under "W4A16" and it brightens | let "W4A16" land | a training loop draws around the 4-bit bar | bit bars |
| 124 | 5:43.12 | 4.5 | inset: a number line with 16 evenly spaced levels lights up: "4 bits = 16 levels" — beside it a dense line, "16 bits = 65,536 levels" | what is lost in 4 bits | the training loop draws | number lines |
| 125 | 5:46.50 | 4.5 | inset: "QAT: trained with the quantization in the loop" | why INT4 still works | the inset folds back into the slab's label | slab |
| 126 | 5:49.88 | 4.5 | 3D wide (camera 42°): four graphics cards rise from the plinth behind the slab, HTML label "NVIDIA L4" on each | the hardware | a bracket draws over them | cards |
| 127 | 5:53.25 | 4.5 | 3D a bracket over the four: "4 × L4 · 96 GB in total" | memory | the reading beat takes over without a cut | cards |
| 128 | 5:56.62 | 2.5 | reading beat: the camera pushes in on "96 GB in total"; it brightens while the rest of the frame dims a step | let "96 GB in total" land | the slab lifts | cards |
| 129 | 5:58.50 | 3.5 | 3D the slab divides in place into four blocks of rows (each block owns a quarter of the output features) | tensor parallelism | the blocks drift toward the cards | slab blocks |
| 130 | 6:01.12 | 4.5 | 3D the four blocks slide down into the four cards; each card's edge lights; "tensor_parallel_size = 4" | each layer is split across all four | the reading beat takes over without a cut | cards |
| 131 | 6:04.50 | 2.5 | reading beat: "tensor_parallel_size = 4" stays bright while everything else in the frame sinks to a third | let "tensor_parallel_size = 4" land | a bar appears above the cards | cards |
| 132 | 6:06.38 | 4.5 | 3D a blue input bar passes down through all four cards at once: "one forward pass, four GPUs" | what tensor parallelism means | the maths writes over the scene | cards |
| 133 | 6:09.75 | 2 | 2D maths over the 3D: on a dark plate: W splits into four row blocks W₁ W₂ W₃ W₄, one per card | tensor parallelism as maths | an input vector slides in | matrix |
| 134 | 6:11.25 | 2 | the same input x multiplies every row block at once: W₁x · W₂x · W₃x · W₄x — each card computes a quarter of the output | four partial products in parallel | the pieces join | matrix |
| 135 | 6:12.75 | 2.5 | the four quarters stack into one output vector (tag "simplified") | one layer, computed across four GPUs | the maths fades back into the 3D | matrix |
| 136 | 6:14.62 | 4.5 | 3D label "served by vLLM · max_model_len = 32,768 tokens" | the server and its ceiling | the reading beat takes over without a cut | cards |
| 137 | 6:18.00 | 2.5 | reading beat: the camera pushes in on "max_model_len = 32,768"; it brightens while the rest of the frame dims a step | let "max_model_len = 32,768" land | the camera rises to 50° | cards |
| 138 | 6:19.88 | 4.5 | 3D (camera 50°) a whole slab again in front of the cards: "the same weights, frozen" | set up the update | two thin purple sheets rise beside it | slab |
| 139 | 6:23.25 | 2 | 2D inset on a dark plate beside the 3D slab: a tall thin B and a short wide A draw themselves | the LoRA factors | an equation writes above | B, A |
| 140 | 6:24.75 | 2 | 2D equation over the 3D: W′ = W + B·A | the update | the sheets move to meet | equation |
| 141 | 6:26.25 | 3 | 2D toy example, tag "toy sizes": W drawn as an 8 × 8 grid of cells | the shapes | then: B as 8 × 2, A as… | grids |
| 142 | 6:28.50 | 2 | B as 8 × 2, A as 2 × 8 beside it | the shapes, continued | one product cell lights | grids |
| 143 | 6:30.00 | 2 | one cell of B·A lights: a row of B and a column of A glow, multiplied and summed | how each entry of B·A is made | every cell fills | grids |
| 144 | 6:31.50 | 2 | every cell of the 8 × 8 product fills purple, column by column | low rank, full size | then: it is a full-size update made from… | grids |
| 145 | 6:33.00 | 2 | it is a full-size update made from two thin pieces | low rank, full size, continued | the counts write | grids |
| 146 | 6:34.50 | 4.5 | under the toy: "W: 8 × 8 = 64 numbers" | count the frozen matrix | the factors count | grids |
| 147 | 6:37.88 | 4.5 | "B + A: 8×2 + 2×8 = 32 numbers" | count the factors | the general form writes | grids |
| 148 | 6:41.25 | 4.5 | "at real sizes: d·k frozen vs r·(d + k) trained" — the purple bar shrinks to a sliver beside the grey | why LoRA is cheap | the 3D view returns | grids |
| 149 | 6:44.62 | 2 | 2D inset: B and A multiply on a dark plate (B·A, rank r) | the update is low-rank | then: the product appears on the slab | film |
| 150 | 6:46.12 | 4.5 | 3D the product appears as a thin purple film lying flat on the slab's top; "rank r ≤ 128 here" | the update is low-rank, continued | the reading beat takes over without a cut | film |
| 151 | 6:49.50 | 2.5 | reading beat: an underline sweeps under "rank r ≤ 128" and it brightens | let "rank r ≤ 128" land | the scene flattens to 2D areas | film |
| 152 | 6:51.38 | 4.5 | 3D more films stack on the slab: "up to 8 adapters · a different one per agent allowed" | per-agent adapters | the reading beat takes over without a cut | films |
| 153 | 6:54.75 | 2.5 | reading beat: "up to 8 adapters" stays bright while everything else in the frame sinks to a third | let "up to 8 adapters" land | the camera returns to 40° | films |
| 154 | 6:56.62 | 4.5 | 3D label "the only way to change the model's weights" | why LoRA matters | the reading beat takes over without a cut | rig |
| 155 | 7:00.00 | 2.5 | reading beat: an underline sweeps under "the only way to change the model's weights" and it brightens | let "the only way to change the model's weights" land | the camera eases back (never overhead) and the scene dissolves to a 2D file card | rig |
| 156 | 7:01.88 | 4.5 | WIDE 2D file card `configs/sampling.yaml` writes in: temperature · top_p · top_k | you control sampling | two more lines type | sampling card |
| 157 | 7:05.25 | 3.5 | a line types: "max_output_tokens ≤ 32,768" | output length | the next line types | sampling card |
| 158 | 7:07.88 | 4.5 | "thinking_level NONE … HIGH" | how much the model thinks | the next line types | sampling card |
| 159 | 7:11.25 | 3.5 | "thinking_budget (default 4,096)" | the thinking cap | "thinking" lifts out of the card | sampling card |
| 160 | 7:13.88 | 4.5 | the word "thinking" drops into a thin strip beside the card: "thinking shares the same 32k window" | foreshadow | the strip lengthens across the frame | strip |
| 161 | 7:17.25 | 4.5 | FULL a summary line builds, each term in its colour: "Gemma 4 31B · INT4" | recap, part 1 | the line continues | summary |
| 162 | 7:20.62 | 4.5 | the line completes: "· 4 × L4 · 32k · ≤ 8 LoRA" | recap, part 2 | "32k" lifts out and grows | "32k" |
| 163 | 7:24.00 | 3.5 | "32k" grows and transforms into "32,768 tokens", which stretches into a long empty strip across the frame | the tape is born | then: the RAIL rewrites to "05 The 32k… | TAPE |
| 164 | 7:26.62 | 4.5 | the RAIL rewrites to "05 The 32k context window" | the tape is born, continued | ticks draw under it | TAPE |

### 5 The 32k context window

| # | time | beats | on screen | purpose | leaves | carries |
|---|---|---|---|---|---|---|
| 165 | 7:30.00 | 4 | WIDE TAPE across the frame; ticks 0 … 32,768 beneath | the window | four legend chips rise below | TAPE |
| 166 | 7:33.00 | 2 | legend chips rise: prompt (blue) · tool outputs (teal) | colour key, part 1 | two more chips rise | TAPE |
| 167 | 7:34.50 | 4.5 | two more: the agent's own turns (ink) · thinking (purple) — "everything shares one window" | colour key, part 2 | the first block slides in | TAPE |
| 168 | 7:37.88 | 4.5 | [SIG3] a blue block slides in from the left, drawn to scale (about 11%): "first message ≈ 3.5k" | the starting cost | the reading beat takes over without a cut | TAPE |
| 169 | 7:41.25 | 2.5 | reading beat: the camera pushes in on "first message ≈ 3.5k"; it brightens while the rest of the frame dims a step | let "first message ≈ 3.5k" land | the block opens like a drawer | TAPE |
| 170 | 7:43.12 | 2 | above the block: 3.5k ÷ 32,768 ≈ 11% (derived) | the first message's share | the drawer opens | TAPE |
| 171 | 7:44.62 | 4.5 | CLOSE the drawer opens: "problem statement" · "hints, if any" | what the first message holds | two more strips slide out | TAPE |
| 172 | 7:48.00 | 3.5 | two more strips: "budget" · "environment rules" | contents | the last two slide out | TAPE |
| 173 | 7:50.62 | 4.5 | the last two: "tool notes" · "150-entry file listing" | contents | the drawer closes | TAPE |
| 174 | 7:54.00 | 4.5 | WIDE one teal block (about 4% of the tape): "one full-size tool output (5,000 chars) ≈ 1.3k" | the unit cost | then: a thin ink sliver after it: "+… | TAPE |
| 175 | 7:57.38 | 4.5 | a thin ink sliver after it: "+ the agent's own turn" | the unit cost, continued | the reading beat takes over without a cut | TAPE |
| 176 | 8:00.75 | 2 | above it: 1.3k ÷ 32,768 ≈ 4% (derived) | one output's share | the counter appears | TAPE |
| 177 | 8:02.25 | 3.5 | the counter: "tool outputs: 1"; blocks keep coming, 2 … 6, each with a soft tick | filling | the counter keeps running | TAPE |
| 178 | 8:04.88 | 2 | 7 … 12; past half full | filling | the counter keeps running | TAPE |
| 179 | 8:06.38 | 2 | 13 … 18; the free space shrinks and its edges glow red | filling | the counter keeps running | TAPE |
| 180 | 8:07.88 | 2 | 19; the last gap is a sliver | nearly full | the twentieth block arrives | TAPE |
| 181 | 8:09.38 | 4.5 | 20: the block doesn't fit; the tape's end cracks red: "≈20 full-size outputs + the agent's turns → overflow" | the wall | the reading beat takes over without a cut | TAPE |
| 182 | 8:12.75 | 2.5 | reading beat: "≈20 full-size outputs" stays bright while everything else in the frame sinks to a third | let "≈20 full-size outputs" land | the gold chip slides out from under the tape | TAPE |
| 183 | 8:14.62 | 2.5 | a brace under the first block: "3.5k" | the sum, term 1 (derived) | the outputs bracket | TAPE |
| 184 | 8:16.50 | 4.5 | a brace under the twenty outputs: "+ 20 × 1.3k = 26k" | the sum, term 2 (derived) | the total writes | TAPE |
| 185 | 8:19.88 | 4.5 | "= 29.5k" — the last ≈3.3k sliver lights: "the agent's turns · thinking · replies" | why it overflows at about 20 | the gold chip slides out | TAPE |
| 186 | 8:23.25 | 4.5 | the chip slides out from under the cracked tape: "the task ends, but the diff left behind is still graded" | partial work counts [SIG3 ends] | the reading beat takes over without a cut | CHIP, TAPE |
| 187 | 8:26.62 | 2.5 | reading beat: an underline sweeps under "still graded" and it brightens | let "still graded" land | the tape empties | CHIP, TAPE |
| 188 | 8:28.50 | 4.5 | FULL "Inside a task, the context only grows." small caps "in practice · participant finding (google-adk 2.9.2)" | the surprise, labelled as a finding | the reading beat takes over without a cut | TAPE |
| 189 | 8:31.88 | 2.5 | reading beat: the camera pushes in on "the context only grows"; it brightens while the rest of the frame dims a step | let "the context only grows" land | the sentence drops back onto the tape | TAPE |
| 190 | 8:33.75 | 4.5 | WIDE TAPE refills with periwinkle thinking blocks between steps: "thinking competes for the same space" | thinking costs context | the tape triples into three rows | TAPE |
| 191 | 8:37.12 | 2 | one thinking block at the default budget: 4,096 ÷ 32,768 = 12.5% of the window (derived) | the size of one thought | the reading beat takes over without a cut | TAPE |
| 192 | 8:38.62 | 2.5 | three tapes stack, tag "concept": thinking_level NONE — thin purple between the steps | the knob, low end | a second tape fills | three tapes |
| 193 | 8:40.50 | 2 | LOW — wider purple blocks | the knob, middle | the third tape fills | three tapes |
| 194 | 8:42.00 | 2 | HIGH — wide purple blocks; it fills fastest | the knob, high end | HIGH cracks first | three tapes |
| 195 | 8:43.50 | 4.5 | HIGH cracks first; NONE fits the most steps; small caps "measure it on your own runs" | the trade-off | the tapes merge back into one | TAPE |
| 196 | 8:46.88 | 2 | TAPE with short teal slivers instead of full blocks | short outputs buy more steps | then: the counter runs past 20 with no… | TAPE |
| 197 | 8:48.38 | 2.5 | the counter runs past 20 with no crack; tag "concept" | short outputs buy more steps, continued | the tape stands up vertically beside the loop | TAPE |
| 198 | 8:50.25 | 3.5 | OVER TAPE stands vertical as a meter beside the LOOP; each lap drops the meter a notch | tie the window to the loop | the meter reaches red | meter, LOOP |
| 199 | 8:52.88 | 4.5 | the meter hits red and the loop stops: "32,768 tokens is the real budget" | recap | the teal blocks lift off the tape | meter |
| 200 | 8:56.25 | 2 | the teal blocks lift off and fan out; each is stamped with the tool that produced it | which tool made which block | the stamps gather into a ring | blocks |
| 201 | 8:57.75 | 3.5 | the stamps settle into a ring of nine tiles around the loop's "call a tool" node | the tools are where context comes from | then: the RAIL rewrites to "06 The nine… | tool ring |
| 202 | 9:00.38 | 4.5 | the RAIL rewrites to "06 The nine tools" | the tools are where context comes from, continued | the ring tightens | tool ring |

### 6 The nine tools

| # | time | beats | on screen | purpose | leaves | carries |
|---|---|---|---|---|---|---|
| 203 | 9:03.75 | 4.5 | OVER the LOOP small at centre; nine teal tiles ring its "call a tool" node | the fixed set | the ring separates into arcs | tool ring |
| 204 | 9:07.12 | 4 | first arc labels itself: "shell & files" — run_command · read_file · edit_file · write_file | group 1 | the next arc labels | tool ring |
| 205 | 9:10.12 | 2.5 | second arc: "control" — get_status · submit_patch | group 2 | the last arc labels | tool ring |
| 206 | 9:12.00 | 3 | third arc: "code graph" — get_code_neighbors · search_similar_code · get_code_subgraph | group 3 | the tiles change fill | tool ring |
| 207 | 9:14.25 | 4.5 | seven tiles fill solid: "budgeted — each call counts" | cost | two tiles change | tool ring |
| 208 | 9:17.62 | 2.5 | get_status and submit_patch turn to outlines: "free" | the exceptions | run_command slides to the front | tool ring |
| 209 | 9:19.50 | 4.5 | CLOSE run_command opens into a terminal: "bash in /workspace · timeout min(300 s, time remaining)" | how it runs | output starts to pour | terminal |
| 210 | 9:22.88 | 2 | output pours in; a cut line drops at 5,000 chars and the rest greys out | truncation | the terminal folds back into its tile | terminal |
| 211 | 9:24.38 | 2 | the result returns as a JSON string, keys lighting in turn: status · stdout · exit_code | what the model actually reads | the terminal folds back | JSON |
| 212 | 9:25.88 | 3.5 | CLOSE read_file opens into a long file | windowed reading | then: a frame over lines 1–150 slides down;… | file view |
| 213 | 9:28.50 | 4.5 | a frame over lines 1–150 slides down; "≤ 150 lines and ≤ 10,000 chars per call" | windowed reading, continued | the reading beat takes over without a cut | file view |
| 214 | 9:31.88 | 2.5 | reading beat: "≤ 150 lines" stays bright while everything else in the frame sinks to a third | let "≤ 150 lines" land | the view folds back | file view |
| 215 | 9:33.75 | 2 | a flag lights in the result: is_truncated = true | the model is told when it got less | the view folds back | file view |
| 216 | 9:35.25 | 3.5 | CLOSE edit_file: old_string (red) above new_string (gold) | the edit | its match stages light | edit view |
| 217 | 9:37.88 | 2 | three match stages light in turn: exact → whitespace-flexible → regex-tokenised | how matching works | two error chips appear | edit view |
| 218 | 9:39.38 | 4.5 | error chips: "0 matches → error" · "more than one → error" | its failure modes | the view folds back | edit view |
| 219 | 9:42.75 | 2 | a third switch: allow_multiple (off by default) — on, every match is replaced | the escape hatch | the view folds back | edit view |
| 220 | 9:44.25 | 4.5 | CLOSE write_file: a new file appears inside /workspace with a gold outline: "files created here end up in your patch" | the trap | the reading beat takes over without a cut | file tree |
| 221 | 9:47.62 | 2.5 | reading beat: an underline sweeps under "end up in your patch" and it brightens | let "end up in your patch" land | the file slides out of the boundary | file tree |
| 222 | 9:49.50 | 2 | the scratch file slides to /tmp and its gold outline fades | scratch belongs in /tmp | the view folds back | file tree |
| 223 | 9:51.00 | 4.5 | CLOSE get_status fires: the tool-call counter stays put while the context meter ticks up a hairline: "free = not counted as a tool call" | what free means | submit_patch slides forward | meters |
| 224 | 9:54.38 | 4.5 | CLOSE submit_patch: `git diff HEAD` pours into the gold chip | the end call | then: "ends the session after this turn"… | CHIP |
| 225 | 9:57.75 | 4.5 | "ends the session after this turn" | the end call, continued | the chip slides off; a graph draws behind it | CHIP |
| 226 | 10:01.12 | 4.5 | WIDE a code graph (tag "concept"): functions as nodes, calls as edges | the graph tools | one node lights | graph |
| 227 | 10:04.50 | 2 | get_code_neighbors: a node lights its callers and callees | neighbours | a query tag flies in | graph |
| 228 | 10:06.00 | 4.5 | search_similar_code: the query tag `HTTPAdapter` (tag "example") snaps onto a node — "a symbol name, not a sentence" | symbol search | the reading beat takes over without a cut | graph |
| 229 | 10:09.38 | 2.5 | reading beat: the camera pushes in on "a symbol name, not a sentence"; it brightens while the rest of the frame dims a step | let "a symbol name, not a sentence" land | a lasso draws | graph |
| 230 | 10:11.25 | 2 | get_code_subgraph: a lasso around three nodes keeps their edges | subgraph | the graph shrinks back into its tiles | graph |
| 231 | 10:12.75 | 4.5 | OVER the ring again; a dashed ring grows outside it: "+ skills you write" | extension 1 | a second ring grows | tool ring |
| 232 | 10:16.12 | 4.5 | a second dashed ring: "+ sub-agents you define" | extension 2 | three meters draw beneath | tool ring |
| 233 | 10:19.50 | 2 | three meters under the ring: time · tool calls · context | the costs | a run_command fires | meters |
| 234 | 10:21.00 | 4.5 | a run_command fires: all three meters drop a notch — "every budgeted call costs time, a tool call and context" | three costs | the reading beat takes over without a cut | meters |
| 235 | 10:24.38 | 2.5 | reading beat: "time, a tool call and context" stays bright while everything else in the frame sinks to a third | let "time, a tool call and context" land | the run_command tile zooms forward | meters |
| 236 | 10:26.25 | 3.5 | the terminal reopens on "bash in /workspace" | the tool lives inside the sandbox | then: the camera pulls back through it to… | container A |
| 237 | 10:28.88 | 4.5 | the camera pulls back through it to show /workspace inside container A; the RAIL rewrites to "07 Sandbox and verification" | the tool lives inside the sandbox, continued | container A turns 3D | container A |

### 7 Sandbox and verification

| # | time | beats | on screen | purpose | leaves | carries |
|---|---|---|---|---|---|---|
| 238 | 10:32.25 | 4 | OVER six stages draw as a track: compile → serve → prepare A → run the loop → extract the patch → verify in B | the whole scoring pipeline | stage 1 lights | track |
| 239 | 10:35.25 | 2.5 | stage 1 "compile": the bundle's YAML becomes an agent tree | compile | then: "no Python entry points · every agent… | track |
| 240 | 10:37.12 | 4.5 | "no Python entry points · every agent declares the same base model" | compile, continued | stage 2 lights | track |
| 241 | 10:40.50 | 2.5 | stage 2 "serve": a small slab-and-four-cards icon from chapter 4 | serve | stage 3 lights | track |
| 242 | 10:42.38 | 4.5 | stage 3 "prepare container A": "no git history after base_commit · network off" | prepare | the camera dives into stage 3 | track |
| 243 | 10:45.75 | 3.5 | 3D (camera 40°) container A as an architectural model on a plinth: a translucent case with a header strip | the sandbox, physically | its parts light | container A |
| 244 | 10:48.38 | 4.5 | 3D inside, real parts light with HTML labels: a block "/workspace (the repository)", a tray "/tmp (scratch)", two plaques "pytest.ini · conftest.py" | what is inside | the machine label pins | container A |
| 245 | 10:51.75 | 4.5 | 3D labels: "python:3.13-slim · 4 GiB RAM · 2 vCPU · offline" | the machine | the reading beat takes over without a cut | container A |
| 246 | 10:55.12 | 2.5 | reading beat: the camera pushes in on "offline"; it brightens while the rest of the frame dims a step | let "offline" land | the plaques glow | container A |
| 247 | 10:57.00 | 4.5 | 3D the plaques glow red: "the harness commits these as the baseline — do not modify" | trap | the reading beat takes over without a cut | container A |
| 248 | 11:00.38 | 2.5 | reading beat: an underline sweeps under "do not modify" and it brightens | let "do not modify" land | a new file appears in /workspace | container A |
| 249 | 11:02.25 | 2 | stage 4: a 2D LOOP overlay spins above the 3D case (camera 45°) | the agent works inside | it stops on an end condition | container A, LOOP |
| 250 | 11:03.75 | 2.5 | 2D end conditions stack beside the case: "submit_patch()" | end 1 | the next one stacks | list |
| 251 | 11:05.62 | 3 | "budget exhausted" | end 2 | the next one stacks | list |
| 252 | 11:07.88 | 4.5 | "3 turns in a row without a tool call" | end 3 | the patch command types | list |
| 253 | 11:11.25 | 4.5 | stage 5 CLOSE `git add -N . && git diff HEAD` types | extraction | then: the gold chip forms: "taken even if… | CHIP |
| 254 | 11:14.62 | 4.5 | the gold chip forms: "taken even if the agent never submits" | extraction, continued | the reading beat takes over without a cut | CHIP |
| 255 | 11:18.00 | 2.5 | reading beat: "even if the agent never submits" stays bright while everything else in the frame sinks to a third | let "even if the agent never submits" land | the chip arcs out of A | CHIP |
| 256 | 11:19.88 | 2 | stage 6 3D (camera 42°) container B rises to the right on the same plinth — same silhouette, green, empty and clean; the chip arcs from A to B | a fresh container | B's first step lights | CHIP, A, B |
| 257 | 11:21.38 | 4.5 | 3D B step 1 "apply the patch": the chip settles into B's /workspace block | step 1 | a test file inside flips | B |
| 258 | 11:24.75 | 4.5 | 3D B step 2 "reset any test files the hidden tests touch": an edited test file flips back | editing tests is useless | the reading beat takes over without a cut | B |
| 259 | 11:28.12 | 2.5 | reading beat: an underline sweeps under "reset any test files" and it brightens | let "reset any test files" land | grey bars drop in | B |
| 260 | 11:30.00 | 4.5 | 3D B step 3 "apply the hidden tests": grey bars drop into B | step 3 | pytest runs | B |
| 261 | 11:33.38 | 4.5 | CLOSE B's terminal: the patch applies in up to four passes, then `python3 -m pytest <targets> -q` types | the exact check | the rim light changes | B |
| 262 | 11:36.75 | 4.5 | 3D B step 4 "run pytest": B's rim light turns green, "exit 0 → resolved" | the verdict | then: a red ghost beside it, "anything else… | B |
| 263 | 11:40.12 | 4.5 | a red ghost beside it, "anything else → not resolved" | the verdict, continued | the camera pulls back to both | B |
| 264 | 11:43.50 | 3.5 | 3D wide (camera 38°): A and B on one plinth | the boundary | then: "you shape what happens here" under A,… | A, B |
| 265 | 11:46.12 | 4.5 | "you shape what happens here" under A, "fixed by the organizers" under B | the boundary, continued | the scene flattens to 2D | A, B |
| 266 | 11:49.50 | 4.5 | FULL "scratch to /tmp" enters from the left | habit 1 | the next enters | habits |
| 267 | 11:52.88 | 4.5 | FULL "never touch pytest.ini or conftest.py" enters from the right | habit 2 | the next enters | habits |
| 268 | 11:56.25 | 4.5 | FULL "don't edit tests" enters from the left | habit 3 | the words fall into container A's outline | habits |
| 269 | 11:59.62 | 2 | container A shrinks into the centre panel of a three-panel frame | hand-off to the walkthrough | then: the RAIL rewrites to "08 A worked… | dashboard |
| 270 | 12:01.12 | 4.5 | the RAIL rewrites to "08 A worked example" | hand-off to the walkthrough, continued | the panels fill | dashboard |

### 8 A worked example

| # | time | beats | on screen | purpose | leaves | carries |
|---|---|---|---|---|---|---|
| 271 | 12:04.50 | 3.5 | WIDE container A opens into three panels: left the call log, centre the workspace, right three meters (context, tool calls, time) | the dashboard | the corner tag writes | dashboard |
| 272 | 12:07.12 | 4.5 | small caps in the corner, kept for the whole chapter: "illustrative run · not a real trajectory" | honesty | the issue card lands | dashboard |
| 273 | 12:10.50 | 2 | the cold-open issue card lands in the centre: summarize([]) raises ZeroDivisionError | same example as the opening | the first message assembles | issue |
| 274 | 12:12.00 | 3.5 | CLOSE the log fills with the first message (six strips) | the starting cost | then: the context meter fills to ≈3.5k in… | log, meter |
| 275 | 12:14.62 | 2 | the context meter fills to ≈3.5k in blue | the starting cost, continued | a thought writes | log, meter |
| 276 | 12:16.12 | 4.5 | CLOSE the log: "think: find summarize" | the plan | the run_command tile lights | log |
| 277 | 12:19.50 | 3 | call 1 run_command types: grep -rn "def summarize" --include=*.py . | locate | the result returns | log |
| 278 | 12:21.75 | 2 | result: src/stats.py:4:def summarize(xs): — tool calls 1 | small outputs are cheap | then: the context meter grows by a sliver… | log, meters |
| 279 | 12:23.25 | 2 | the context meter grows by a sliver | small outputs are cheap, continued | the camera moves to the centre panel | log, meters |
| 280 | 12:24.75 | 3.5 | CLOSE centre: call 2 read_file src/stats.py lines 1–8 | read only what you need | then: the cold-open code panel draws, with a… | code panel |
| 281 | 12:27.38 | 2 | the cold-open code panel draws, with a scrollbar showing the file is longer | read only what you need, continued | line 6 glows | code panel |
| 282 | 12:28.88 | 2 | line 6 glows red; the context meter grows by 8 lines, not by the whole file | windowed reading | the camera rises over the workspace | code panel, meters |
| 283 | 12:30.38 | 3.5 | OVER the workspace from above: /workspace inside a gold edge, /tmp outside it | where things live | a file appears in /tmp | boundary |
| 284 | 12:33.00 | 2 | call 3 run_command writes /tmp/repro.py with a heredoc | write the check | the file appears | boundary |
| 285 | 12:34.50 | 2 | the file appears outside the gold edge | scratch goes to /tmp | the camera returns to the log | boundary |
| 286 | 12:36.00 | 3.5 | CLOSE log: call 4 python3 /tmp/repro.py → ZeroDivisionError: division by zero (red) | bug reproduced | the line underlines itself | log |
| 287 | 12:38.62 | 3.5 | the raw result behind that line: {"status": "error", …, "exit_code": 1} — the agent reads JSON, not a terminal | what the model sees (illustrative) | the line underlines | log |
| 288 | 12:41.25 | 4.5 | "now there is a test the agent can see" | why reproduce | the reading beat takes over without a cut | log |
| 289 | 12:44.62 | 2.5 | reading beat: an underline sweeps under "a test the agent can see" and it brightens | let "a test the agent can see" land | the camera pushes into the code panel | log |
| 290 | 12:46.50 | 4.5 | CLOSE code: call 5 edit_file — old_string (red) → new_string (gold); line 6 rewrites; "edit applied · 1 match" | the fix | the camera pulls back to the log | code panel |
| 291 | 12:49.88 | 3.5 | CLOSE log: call 6 python3 /tmp/repro.py → 0 (green) | the repro passes | the next call types | log |
| 292 | 12:52.50 | 4.5 | raw result: {"status": "ok", "stdout": "0", "exit_code": 0} (illustrative) | success in the same shape | the next call types | log |
| 293 | 12:55.88 | 2 | call 7 types: python3 -m pytest tests/test_stats.py -q | nearby existing tests | its result returns | log |
| 294 | 12:57.38 | 2 | result: passed (green dots) | no regression locally | the next call types | log |
| 295 | 12:58.88 | 3 | call 8 git status --short → " M src/stats.py" only; /tmp/repro.py is not listed | the patch is clean | the camera pushes into the meters | log |
| 296 | 13:01.12 | 3.5 | CLOSE meters: context far below 32k; tool calls 8; time bar short | the run fits | submit fires | meters |
| 297 | 13:03.75 | 2 | submit_patch (free): the gold chip forms — 1 file, 1 line changed | the output | the chip travels right | CHIP |
| 298 | 13:05.25 | 2 | the chip travels into a small container B | honesty: the hidden tests could still fail | then: its test cells stay neutral grey: "on… | CHIP, B |
| 299 | 13:06.75 | 4.5 | its test cells stay neutral grey: "on a real task, this is where it's decided" | honesty: the hidden tests could still fail, continued | the reading beat takes over without a cut | CHIP, B |
| 300 | 13:10.12 | 2.5 | reading beat: "this is where it's decided" stays bright while everything else in the frame sinks to a third | let "this is where it's decided" land | the dashboard resets | CHIP, B |
| 301 | 13:12.00 | 4.5 | FULL "Same task. Careless agent." | contrast | the dashboard returns, reset | — |
| 302 | 13:15.38 | 3.5 | WIDE call 1: read_file on a large, unrelated file | wasteful reading | then: the context meter jumps by a big… | dashboard |
| 303 | 13:18.00 | 2 | the context meter jumps by a big teal block | wasteful reading, continued | more reads follow | dashboard |
| 304 | 13:19.50 | 2 | calls 2–4: read_file on three more large files; the meter passes half | drift | an edit lands | dashboard |
| 305 | 13:21.00 | 2 | the edit lands with no reproduction and no test run | no verification | a file is written | dashboard |
| 306 | 13:22.50 | 2 | write_file creates notes.txt inside /workspace | a stray file | submit fires | dashboard |
| 307 | 13:24.00 | 2 | the chip forms with two files: the fix and notes.txt | junk ships with the fix | the frame splits | CHIP |
| 308 | 13:25.50 | 2 | split: careful run (left) vs careless run (right), meters side by side | comparison | a line writes under both | split |
| 309 | 13:27.00 | 4.5 | "same fix · nothing checked · junk in the patch — your prompt, workflow and budget decide which run you get" | the lesson | the reading beat takes over without a cut | split |
| 310 | 13:30.38 | 2.5 | reading beat: an underline sweeps under "your prompt, workflow and budget" and it brightens | let "your prompt, workflow and budget" land | the careful log compresses into icons | split |
| 311 | 13:32.25 | 2 | the careful run's log compresses into icons: find → read → write repro → run repro → fix | the recipe, part 1 | the line continues | icon line |
| 312 | 13:33.75 | 2 | → re-run → test → check → submit | the recipe, part 2 | each icon names its tool | icon line |
| 313 | 13:35.25 | 2 | the first five icons name their tools: run_command · read_file · run_command · run_command · edit_file | the recipe in tool calls, part 1 | the rest name theirs | icon line |
| 314 | 13:36.75 | 2 | the last four: run_command · run_command · run_command · submit_patch | part 2 | the line cracks red at "submit"; the RAIL rewrites to "09 Failure modes" | icon line |

### 9 Failure modes

| # | time | beats | on screen | purpose | leaves | carries |
|---|---|---|---|---|---|---|
| 315 | 13:38.25 | 4 | OVER the crack opens into a large LOOP at centre | the taxonomy | then: small caps "five ways runs fail (the… | LOOP |
| 316 | 13:41.25 | 4.5 | small caps "five ways runs fail (the roadmap's taxonomy)" | the taxonomy, continued | the loop starts to spin | LOOP |
| 317 | 13:44.62 | 2 | looping: the blue dot laps and laps | symptom 1 | then: a log beside it repeats the same… | LOOP |
| 318 | 13:46.12 | 2 | a log beside it repeats the same call three times in red | symptom 1, continued | the meter drains | LOOP |
| 319 | 13:47.62 | 2 | the tool-call meter drains while the diff stays empty | the cost of looping | a detector draws over the log | LOOP |
| 320 | 13:49.12 | 4.5 | a detector draws over the log: three identical consecutive calls bracketed — "easy to count in a trajectory" (concept) | how to spot it | the exit branch erases | LOOP |
| 321 | 13:52.50 | 2 | never submitting: the exit branch is gone; the time bar runs out | symptom 2 | the diff is taken anyway | LOOP |
| 322 | 13:54.00 | 4.5 | the diff is taken anyway — an empty one scores zero; corner tag: "a run also ends after 3 turns in a row without a tool call" | the consequence | small caps write beside the loop | LOOP |
| 323 | 13:57.38 | 2 | a stopwatch beside the loop counts three turns with no call — the run ends | the third way a run ends | the edit edge reroutes | LOOP |
| 324 | 13:58.88 | 2 | wrong file: the edit edge lands on the wrong node of the code graph | symptom 3 | then: the hidden tests aim at the other… | LOOP, graph |
| 325 | 14:00.38 | 2 | the hidden tests aim at the other node and turn red (illustrative) | symptom 3, continued | the log shows the clue | LOOP, graph |
| 326 | 14:01.88 | 2 | in the log: the edit's filepath differs from the file the reproduction imported (illustrative) | how to spot it | the chip drops | LOOP |
| 327 | 14:03.38 | 4.5 | patch that won't apply: the chip's shape doesn't fit container B's slot and bounces off — "verification applies it to a fresh checkout" | symptom 4 | the chip swells | CHIP, B |
| 328 | 14:06.75 | 2 | over-editing: the chip swells into a long, many-file diff beside a short one | symptom 5 | the five symptoms shrink into tags | CHIP |
| 329 | 14:08.25 | 4.5 | the diff's file count and line count tick up beside it: "measure patch size per task" (concept) | how to spot it | symptoms shrink to tags | CHIP |
| 330 | 14:11.62 | 4.5 | four harness traps fan out as tags: "context overflow" · "editing tests" | the harness traps, part 1 | two more fan out | tags |
| 331 | 14:15.00 | 4.5 | "stray files" · "touching pytest.ini or conftest.py" | part 2 | the tags sort | tags |
| 332 | 14:18.38 | 4.5 | all nine tags sort into two piles: "the agent's behaviour" · "the patch's hygiene" | structure | then: small caps "suggested split"… | piles |
| 333 | 14:21.75 | 3 | small caps "suggested split" | structure, continued | an empty chart frame draws | piles |
| 334 | 14:24.00 | 4.5 | an empty bar chart: "your failure counts — label 50 failed runs by hand" | what to build | then: tag "empty on purpose: you fill this… | chart |
| 335 | 14:27.38 | 4.5 | tag "empty on purpose: you fill this in" | what to build, continued | the chart's x-axis stretches into a row of cells | chart |
| 336 | 14:30.75 | 4.5 | the empty chart's x-axis extends into a row of 129 cells, which wraps into a grid; the RAIL rewrites to "10 The data and your local evaluation" | failures are counted over tasks | the cells take their repository tones | GRID |
| 337 | 14:34.12 | 4.5 | the RAIL rewrites to "10 The data and your local evaluation" | failures are counted over tasks, continued | the cells colour by repository | GRID |

### 10 The data and your local evaluation

| # | time | beats | on screen | purpose | leaves | carries |
|---|---|---|---|---|---|---|
| 338 | 14:37.50 | 4 | OVER the public cells colour themselves: fastapi 67 · rich 48 — two neutral tones | the two big repositories | the small two colour | GRID |
| 339 | 14:40.50 | 2 | requests 13 · httpx 1 — two lighter neutral tones, — a single lonely cell | the small two | the blocks slide apart | GRID |
| 340 | 14:42.00 | 4.5 | the four blocks slide apart: "129 public training tasks · 4 repositories" | breakdown | one cell opens | GRID |
| 341 | 14:45.38 | 4.5 | each block gains its character: fastapi "web framework · routing, dependency injection, pydantic" · rich "terminal rendering · string and ANSI output" | what the code looks like | the other two label | GRID |
| 342 | 14:48.75 | 4.5 | requests "HTTP client · several tests need a network that doesn't exist offline" · httpx "HTTP client" | why some tasks misbehave offline | one cell opens | GRID |
| 343 | 14:52.12 | 3.5 | CLOSE one cell opens like a folder: problem_statement · base_commit · repository snapshot | contents | more files slide out | task |
| 344 | 14:54.75 | 4.5 | more: test_patch "hidden at evaluation" · gold patch "training only" · code-graph and embedding files | contents | the graph files flicker | task |
| 345 | 14:58.12 | 4.5 | the graph files flicker: "about half are 0 bytes (hard links), yet 128 of 129 tasks still have usable graph data" | a known data quirk | the gold patch unrolls | task |
| 346 | 15:01.50 | 4.5 | the gold patch unrolls as a strip: "median reference fix: 31 lines in 1 file" | how big a fix is | then: small caps "no hints text · ≈20.5… | task |
| 347 | 15:04.88 | 4.5 | small caps "no hints text · ≈20.5 GB of repository snapshots" | how big a fix is, continued | the reading beat takes over without a cut | task |
| 348 | 15:08.25 | 2.5 | reading beat: the camera pushes in on "31 lines in 1 file"; it brightens while the rest of the frame dims a step | let "31 lines in 1 file" land | the folder closes; the camera rises | task |
| 349 | 15:10.12 | 4.5 | OVER how tasks were mined: repository history → commits → filter "changed core .py logic and matching unit tests" | provenance | a gate draws | pipeline |
| 350 | 15:13.50 | 4.5 | gate "two-phase verification: tests fail before the fix, pass after"; tasks drop out of it | the quality gate | a second grid appears beside the first | pipeline |
| 351 | 15:16.88 | 2 | one task runs through the gate: its tests on base_commit → red; with the gold patch → green; only then is it kept | the two phases, shown | the second grid appears | pipeline |
| 352 | 15:18.38 | 4.5 | WIDE the public grid at left: "129 tasks · 4 repositories · gold patch visible" | the training set | the hidden grid appears beside | grids |
| 353 | 15:21.75 | 4.5 | the hidden grid at right, locked: "≈120 tasks · private repositories · gold patch not visible" | the test set | a line writes under it | grids |
| 354 | 15:25.12 | 4.5 | under the hidden grid: "same pipeline, so expect similar size and style: small, single-file fixes" | what to expect | the reading beat takes over without a cut | grids |
| 355 | 15:28.50 | 2.5 | reading beat: "small, single-file fixes" stays bright while everything else in the frame sinks to a third | let "small, single-file fixes" land | the hidden grid fades; the rich block lifts | grids |
| 356 | 15:30.38 | 4.5 | the rich block lifts out of the public grid: tag "example split — develop on the rest, test on rich" | hold out a whole repository | about 20 cells turn grey | GRID |
| 357 | 15:33.75 | 4.5 | three empty bars: fastapi · rich · requests — "report your scores per repository" | to spot overfitting | the grid gathers into a dashed outline | GRID |
| 358 | 15:37.12 | 2 | the bars sink and the public grid gathers into a dashed outline | from the data to measuring on it | the outline labels itself | GRID |
| 359 | 15:38.62 | 4.5 | the dashed outline labels itself: "your offline copy of the scoring pipeline" | your own scoreboard | the camera closes on one cell | GRID |
| 360 | 15:42.00 | 3.5 | CLOSE one cell: its gold (reference) patch applies and its tests turn green | what one cell of the sweep checks | then: its null (empty) patch applies and they… | cell |
| 361 | 15:44.62 | 2 | its null (empty) patch applies and they turn red | what one cell of the sweep checks, continued | the camera pulls back | cell |
| 362 | 15:46.12 | 2 | gold sweep: the reference (gold) patch drops onto every cell | check the harness, not the agent | then: cells that pass turn green — "the… | GRID |
| 363 | 15:47.62 | 4.5 | cells that pass turn green — "the gold patch should pass everywhere" | check the harness, not the agent, continued | the null patch sweeps | GRID |
| 364 | 15:51.00 | 2 | null sweep: an empty patch drops onto every cell | the other side of the check | then: cells turn red — "the null patch… | GRID |
| 365 | 15:52.50 | 4.5 | cells turn red — "the null patch should fail everywhere" | the other side of the check, continued | disagreements flash | GRID |
| 366 | 15:55.88 | 4.5 | about 20 cells disagree and turn grey: "where your copy disagrees: fix the harness or exclude the task" | calibrate before you measure | the reading beat takes over without a cut | GRID |
| 367 | 15:59.25 | 2.5 | reading beat: the camera pushes in on "fix the harness or exclude the task"; it brightens while the rest of the frame dims a step | let "fix the harness or exclude the task" land | the grey cells drop out | GRID |
| 368 | 16:01.12 | 4.5 | the grey cells drop out; small caps "the roadmap's lever 1 — first experiment" | where this comes from | the rich block lifts | GRID |
| 369 | 16:04.50 | 3 | three empty bars, one per repository; tag "your numbers" | per-repo scores | a leaderboard probe appears beside | bars |
| 370 | 16:06.75 | 2 | a single daily probe arrow from the bundle to the public leaderboard | how to use the one daily submission | then: small caps "spend it on your best… | probe |
| 371 | 16:08.25 | 4.5 | small caps "spend it on your best held-out configuration" | how to use the one daily submission, continued | a log line types | probe |
| 372 | 16:11.62 | 4.5 | under it a log line types: "config · local score per repo · leaderboard score · one observation" | write everything down | the log points at what you change between runs — the bundle | log line |
| 373 | 16:15.00 | 4.5 | the log's "config" column turns into a stack of bundle versions; the top one zips shut; the RAIL rewrites to "11 What you submit" | what changes between runs is the bundle | type enters over a dimmed frame | zip |
| 374 | 16:18.38 | 4.5 | the RAIL rewrites to "11 What you submit" | what you change is the bundle, continued | type enters over a dimmed frame | zip |

### 11 What you submit

| # | time | beats | on screen | purpose | leaves | carries |
|---|---|---|---|---|---|---|
| 375 | 16:21.75 | 4.5 | FULL "No Python entry points." enters from the left | the rule | a second line enters | — |
| 376 | 16:25.12 | 4.5 | FULL "You submit configuration." enters from the right | the rule | the words part, revealing a zip | zip |
| 377 | 16:28.50 | 4 | WIDE the zip opens; the TREE unfolds its first lines: agent.yaml · prompts/*.md · configs/sampling.yaml | the bundle, part 1 | more lines unfold | TREE |
| 378 | 16:31.50 | 4.5 | the rest unfold: sub_agents/*.yaml · skills/<name>/SKILL.md · adapters/<name>/ · eval_config.yaml; corner tag: small caps: "declarative · under 3 GiB" | the bundle, part 2 | small caps write under | TREE |
| 379 | 16:34.88 | 3 | the zip's size meter fills a sliver of a bar marked "3 GiB" | the size limit, shown | the loop fades in | TREE |
| 380 | 16:37.12 | 3.5 | OVER TREE at left; the LOOP with its tool ring and meters at right | what each file controls | agent.yaml lifts | TREE, LOOP |
| 381 | 16:39.75 | 2 | agent.yaml flies to the loop and becomes its shape | the root agent | three more agent shapes line up | LOOP |
| 382 | 16:41.25 | 2 | four agent shapes line up: LlmAgent (a loop) · SequentialAgent (a chain) · ParallelAgent (a fork) · LoopAgent (a cycle with a counter) | the agent types | an example root types | shapes |
| 383 | 16:42.75 | 4.5 | CLOSE an example agent.yaml types (tag "example"): name · model: gemma-4-31b-it-qat-w4a16-ct · instruction: !include prompts/system.md | a minimal root, part 1 | two more lines type | yaml |
| 384 | 16:46.12 | 2 | two more lines: generate_content_config: !include configs/sampling.yaml · tools: [run_command, read_file, edit_file, …] | part 2 | each line links to the loop | yaml |
| 385 | 16:47.62 | 2 | each YAML line draws a thin link to the part of the loop it sets | YAML maps onto the agent | the shapes step forward | yaml, LOOP |
| 386 | 16:49.12 | 3.5 | OVER the LlmAgent enlarges; handles attach: model · adapter · instruction | an agent's fields, part 1 | three more attach | LOOP |
| 387 | 16:51.75 | 2 | three more: tools · skills · sub_agents | part 2 | output_key attaches | LOOP |
| 388 | 16:53.25 | 3 | handle output_key: the agent's final text drops into a "session state" box below | how agents share results | include_contents attaches | LOOP, state box |
| 389 | 16:55.50 | 2.5 | handle include_contents: a switch — at "none", the earlier conversation greys out of the agent's view | a clean context per agent | the workflow agents step forward | LOOP |
| 390 | 16:57.38 | 2 | SequentialAgent: its chain lights left to right, one sub-agent at a time | in order | the fork lights | shapes |
| 391 | 16:58.88 | 2 | ParallelAgent: all branches of its fork light at once | at once | the cycle runs | shapes |
| 392 | 17:00.38 | 2.5 | LoopAgent: its counter ticks 1 → 2 → 3 and the cycle exits at "max_iterations" | bounded repeats | prompts/*.md lifts from the tree | shapes |
| 393 | 17:02.25 | 4.5 | prompts/*.md docks onto "think": a page with {problem_description} and {hints} highlighted, "filled from session state" | prompts | a note writes beneath | LOOP |
| 394 | 17:05.62 | 4.5 | small caps under the page: "the public training data has no hints text" | detail | sampling.yaml lifts | LOOP |
| 395 | 17:09.00 | 2 | configs/sampling.yaml docks onto the model block: temperature · thinking | sampling | sub_agents lifts | LOOP |
| 396 | 17:10.50 | 4.5 | sub_agents/*.yaml docks as a second, smaller loop hanging off the first: "its own prompt, tools and adapter" | sub-agents | the parent calls it | LOOP |
| 397 | 17:13.88 | 2 | the parent calls it like a tool (AgentTool) and a short result comes back | AgentTool | skills lifts | LOOP |
| 398 | 17:15.38 | 2 | skills/<name>/SKILL.md docks onto the tool ring as a new tile | skills cost a call | then: its script runs in the sandbox and… | LOOP |
| 399 | 17:16.88 | 2 | its script runs in the sandbox and the tool-call meter drops one | skills cost a call, continued | adapters lifts | LOOP |
| 400 | 17:18.38 | 4.5 | adapters/<name>/ docks as a purple sheet on the model block: "PEFT LoRA · safetensors only · rank ≤ 128 · up to 8" | adapters | the reading beat takes over without a cut | LOOP |
| 401 | 17:21.75 | 2.5 | reading beat: the camera pushes in on "rank ≤ 128 · up to 8"; it brightens while the rest of the frame dims a step | let "rank ≤ 128 · up to 8" land | eval_config lifts | LOOP |
| 402 | 17:23.62 | 2 | eval_config.yaml docks onto the meters as the four dials | budgets | the picture pulls back | LOOP |
| 403 | 17:25.12 | 3.5 | WIDE every file joined to the part it controls by a thin line | the idea | then: "every lever you have is in this… | TREE, LOOP |
| 404 | 17:27.75 | 4.5 | "every lever you have is in this tree" | the idea, continued | the reading beat takes over without a cut | TREE, LOOP |
| 405 | 17:31.12 | 2.5 | reading beat: "every lever you have is in this tree" stays bright while everything else in the frame sinks to a third | let "every lever you have is in this tree" land | the lines fade; the loop slides onto a time axis; the RAIL rewrites to "12 How coding agents got here" | TREE, LOOP |

### 12 How coding agents got here

| # | time | beats | on screen | purpose | leaves | carries |
|---|---|---|---|---|---|---|
| 406 | 17:33.00 | 4 | WIDE a time axis 2021 → 2026 draws along the bottom | where the loop came from | then: the LOOP sits at 2021–22: "ReAct: reason… | LOOP |
| 407 | 17:36.00 | 4.5 | the LOOP sits at 2021–22: "ReAct: reason → act → observe" | where the loop came from, continued | a label writes beside | LOOP |
| 408 | 17:39.38 | 4.5 | beside it: "Codex & HumanEval: function-level code" | the other 2021 thread | a year enters full-frame | LOOP |
| 409 | 17:42.75 | 3.5 | FULL "2023" enters from the right over the axis | era 2 | it settles on its tick | year |
| 410 | 17:45.38 | 4.5 | a repository node attaches to the loop: "SWE-bench: real GitHub issues in real repositories — early baselines resolved only a few percent" | evaluation gets real | a feedback arrow curls in | LOOP |
| 411 | 17:48.75 | 4.5 | a feedback arrow curls back into the loop: "Reflexion: written self-critique helps when there's a feedback signal" | self-critique | the tool ring grows | LOOP |
| 412 | 17:52.12 | 3.5 | FULL "2024" enters from the left | era 3 | it settles on its tick | year |
| 413 | 17:54.75 | 4.5 | the tool ring around the loop grows large and ornate: "the scaffold era — SWE-agent · AutoCodeRover · OpenHands" | intelligence in the scaffold | a note writes | LOOP |
| 414 | 17:58.12 | 4.5 | small caps: "SWE-bench Verified: a cleaned-up subset" | a term used next | a straight pipeline appears | LOOP |
| 415 | 18:01.50 | 4.5 | a straight-line pipeline beside it: "Agentless: a fixed pipeline could match agents" | key result | the ring collapses | LOOP |
| 416 | 18:04.88 | 3.5 | FULL "2025" enters from the right | era 4 | it settles on its tick | year |
| 417 | 18:07.50 | 3.5 | the ring collapses to two tiles, "bash · edit", while the model block thickens purple | intelligence moves into the weights | the result writes | LOOP |
| 418 | 18:10.12 | 4.5 | "Claude 3.5 Sonnet · 49% on SWE-bench Verified with bash plus an edit tool" | the evidence | badges attach | LOOP |
| 419 | 18:13.50 | 4.5 | badges: "Claude Code · Codex — Codex's model RL-trained in its own sandbox" | harness and model trained together | then: a short strip: "mini-swe-agent: 100 lines were enough for frontier models"… | LOOP |
| 420 | 18:16.88 | 3.5 | a short strip: "mini-swe-agent: 100 lines" | harness and model trained together, continued | task factories appear | LOOP |
| 421 | 18:19.50 | 4.5 | task factories hang off the block: "SWE-Gym · SWE-smith · R2E-Gym" | data | training recipes hang below | LOOP |
| 422 | 18:22.88 | 4.5 | training recipes: "SWE-RL · DeepSWE · Kimi-Dev: open 32–72B models to about 40–60% on Verified" | the training turn | a year enters | LOOP |
| 423 | 18:26.25 | 3.5 | FULL "2026" enters from the left | era 5 | it settles on its tick | year |
| 424 | 18:28.88 | 4.5 | the block shrinks (small open models) and the repository node gets a lock: "harness and context engineering · evaluation on fresh or private repositories" | where things are now | three tags attach | LOOP |
| 425 | 18:32.25 | 4.5 | three tags: "SWE-Protégé: a 7B model reported at 42%" · "CANOPY: RL for small task pools" · "Open-SWE-Traces: 200k+ trajectories" | 2026 research | a quote writes beside | LOOP |
| 426 | 18:35.62 | 4.5 | a quote beside the loop: "harnesses encode assumptions that go stale as models improve" — Anthropic | the caution | three vessels rise | LOOP |
| 427 | 18:39.00 | 3.5 | OVER three vessels rise: prompt · scaffold · weights | the arc | light pours | vessels |
| 428 | 18:41.62 | 2.5 | light pours from prompt into scaffold: "2024" | step one | it pours again | vessels |
| 429 | 18:43.50 | 2.5 | light pours from scaffold into weights: "2025" | step two | a line writes beneath | vessels |
| 430 | 18:45.38 | 4.5 | "this competition asks you to repeat the second step, on a small scale" — the weights vessel lights | framing; your scaffold is the anatomy to fill | then: the scaffold vessel opens into six empty… | vessels → slots |
| 431 | 18:48.75 | 4.5 | the scaffold vessel opens into six empty slots around the loop; the RAIL rewrites to "13 What you need to build" | framing; your scaffold is the anatomy to fill, continued | the reading beat takes over without a cut | vessels → slots |
| 432 | 18:52.12 | 2.5 | reading beat: the camera pushes in on "repeat the second step"; it brightens while the rest of the frame dims a step | let "repeat the second step" land | the slots wait | vessels → slots |

### 13 What you need to build

| # | time | beats | on screen | purpose | leaves | carries |
|---|---|---|---|---|---|---|
| 433 | 18:54.00 | 3.5 | WIDE six empty slots around the LOOP: model · control flow · tools · context · environment · verifier | the anatomy of a coding agent | the slots fill | slots |
| 434 | 18:56.62 | 4.5 | slots fill: model "fixed · change it only through LoRA" (blue) · control flow "your YAML agents" | parts 1–2 | the next two fill | slots |
| 435 | 19:00.00 | 4.5 | tools "9 fixed + skills + sub-agents" (teal) · context "the 32k window" | parts 3–4 | the next fills | slots |
| 436 | 19:03.38 | 3 | environment "offline container"; the verifier slot stays empty and pulses red | the gap | the empty slot zooms forward | slots |
| 437 | 19:05.62 | 4.5 | CLOSE verifier: "nothing built in — you create it: a reproduction script, a judge sub-agent" | the missing part | the reading beat takes over without a cut | slots |
| 438 | 19:09.00 | 3.5 | OVER the LOOP morphs through the families, labelled as it goes: A fixed workflow (Agentless) — a straight chain: localize → repair → validate | family A | it morphs again | LOOP |
| 439 | 19:11.62 | 2 | B tool loop (SWE-agent) — the loop itself | family B | it morphs again | LOOP |
| 440 | 19:13.12 | 2 | C code as action (OpenHands) — code inside the call node (concept) | family C | it morphs again | LOOP |
| 441 | 19:14.62 | 2 | D structure-aware search (AutoCodeRover) — the call node becomes a small graph | family D | it morphs again | LOOP |
| 442 | 19:16.12 | 2 | E test-time scaling — a fan-out of attempts and a judge | family E | it morphs again | LOOP |
| 443 | 19:17.62 | 2 | F multi-agent — a lead loop with child loops | family F | all six shrink side by side | LOOP |
| 444 | 19:19.12 | 3 | six small shapes in a row; A, B and F step forward in blue: "good fit" | fit | the others recede | shapes |
| 445 | 19:21.38 | 4.5 | C and D recede; E dims: "only if time allows"; a corner tag stays: "the roadmap's assessment, not a measured result" | fit, continued | A and B slide together | shapes |
| 446 | 19:24.75 | 3.5 | WIDE A and B merge into the candidate: Localize → Reproduce → [Patch ⇄ Verify] → Submit | the pattern | then: small caps "candidate · a hypothesis to… | pipeline |
| 447 | 19:27.38 | 4.5 | small caps "candidate · a hypothesis to test" | the pattern, continued | labels attach | pipeline |
| 448 | 19:30.75 | 4.5 | labels: "each stage an LlmAgent with a restricted tool list" · "results passed forward through state (output_key)" | how it's wired | the bracket lights | pipeline |
| 449 | 19:34.12 | 2.5 | the bracket around Patch ⇄ Verify: "LoopAgent" | details | then: two stages get purple tabs: "optional LoRA… | pipeline |
| 450 | 19:36.00 | 4.5 | two stages get purple tabs: "optional LoRA per stage" | details, continued | three reasons write in | pipeline |
| 451 | 19:39.38 | 4.5 | why this shape, reason 1: "explicit localization and reproduction stages help weaker models (Agentless, Kimi-Dev)" | rationale | reason 2 writes | pipeline |
| 452 | 19:42.75 | 4.5 | reason 2: "clean-context stages pass short summaries through state" | rationale | reason 3 writes | pipeline |
| 453 | 19:46.12 | 4.5 | reason 3: "looping is easier to bound stage by stage (SWE-Protégé)" | rationale | the pipeline starts to run | pipeline |
| 454 | 19:49.50 | 4.5 | [PEAK] FULL-frame: the candidate runs on the cold-open issue (tag "concept · not a real trajectory"): Localize's tool ring shows only run_command, read_file and the graph tools | restricted tools | its result drops into state | Localize |
| 455 | 19:52.88 | 2.5 | Localize writes to session state: localized = "src/stats.py:6" | output_key in action | Reproduce starts | state box |
| 456 | 19:54.75 | 2 | Reproduce starts with include_contents = none: its own tape starts nearly empty and reads only {localized} | a clean context | it writes its repro | Reproduce |
| 457 | 19:56.25 | 2.5 | Reproduce writes /tmp/repro.py and runs it → red; state gains repro = "fails" | the second output | the loop bracket lights | state box |
| 458 | 19:58.12 | 4.5 | the LoopAgent bracket lights "iteration 1 of max_iterations"; Patch runs edit_file on line 6 | bounded retry | Verify runs | loop bracket |
| 459 | 20:01.50 | 2 | Verify runs the repro and nearby tests → green; the bracket exits early | done in one iteration | Submit runs | Verify |
| 460 | 20:03.00 | 2 | Submit calls submit_patch and the gold chip forms | the output | the tapes compare | CHIP |
| 461 | 20:04.50 | 3.5 | OVER four short tapes (one per stage) beside one long tape (single agent), same work | why stages can help: clean contexts | a crack shows on one boundary | tapes |
| 462 | 20:07.12 | 4.5 | a crack on the Localize → Reproduce boundary: "every stage boundary loses information" | why stages can hurt | a second risk writes | tapes |
| 463 | 20:10.50 | 4.5 | "and the per-task time may be too tight for many stages" | the second risk | the frame splits | tapes |
| 464 | 20:13.88 | 4.5 | split: left the plain LOOP, "one LlmAgent — build this first"; right the staged pipeline | order | a balance appears between them | split |
| 465 | 20:17.25 | 4.5 | a balance between them: "adopt the staged design only if it wins on a held-out repository" | the decision rule | the reading beat takes over without a cut | split |
| 466 | 20:20.62 | 2.5 | reading beat: the camera pushes in on "only if it wins on a held-out repository"; it brightens while the rest of the frame dims a step | let "only if it wins on a held-out repository" land | the balance tips toward the plain LOOP, which stays as the rest clears; the RAIL rewrites to "14 Prompt, skills and sub-agents" | split |

### 14 Prompt, skills and sub-agents

| # | time | beats | on screen | purpose | leaves | carries |
|---|---|---|---|---|---|---|
| 467 | 20:22.50 | 4.5 | FULL beside the plain LOOP: "The tool descriptions are fixed. The prompt is yours." | why the prompt carries guidance | a blank page slides in | page |
| 468 | 20:25.88 | 4.5 | WIDE a page "prompts/system.md" (tag "suggested structure") at left | each prompt section will be shown by its effect | then: the ch8 dashboard at right, reset… | page, dashboard |
| 469 | 20:29.25 | 2 | the ch8 dashboard at right, reset | each prompt section will be shown by its effect, continued | section 1 writes | page, dashboard |
| 470 | 20:30.75 | 3 | section 1 "the issue": {problem_description} highlighted | the task comes first | then: the issue card lands in the dashboard… | page |
| 471 | 20:33.00 | 2 | the issue card lands in the dashboard | the task comes first, continued | section 2 writes | page |
| 472 | 20:34.50 | 4.5 | section 2 "workflow: explore → reproduce → fix → rerun → think about edge cases" | the order of work | the dashboard replays it | page |
| 473 | 20:37.88 | 2 | the dashboard's log replays in that order: grep → read → repro fails → edit → repro passes → tests pass | the workflow, as calls | section 3 writes | dashboard |
| 474 | 20:39.38 | 4.5 | section 3 "read only the lines you need": the careless run's call 1 replays — this time a small teal sliver instead of a big block | the effect on the window | section 4 writes | page, dashboard |
| 475 | 20:42.75 | 4.5 | section 4 "copy old_string exactly": an edit with a mistyped old_string errors "0 matches"; the corrected one applies | the effect on edits | section 5 writes | page, dashboard |
| 476 | 20:46.12 | 4.5 | section 5 "search by symbol name": the query `HTTPAdapter` (example) snaps onto a node | the effect on search | then: the sentence version finds nothing… | page, dashboard |
| 477 | 20:49.50 | 2 | the sentence version finds nothing | the effect on search, continued | section 6 writes | page, dashboard |
| 478 | 20:51.00 | 4.5 | section 6 "scratch in /tmp · don't touch pytest.ini or conftest.py · don't edit tests": notes.txt slides out of /workspace into /tmp | the effect on the patch | section 7 writes | page, dashboard |
| 479 | 20:54.38 | 4.5 | section 7 "check get_status (free) and submit before the budget runs out": get_status pings, the time bar has room, submit fires | the effect on finishing | section 8 writes | page, dashboard |
| 480 | 20:57.75 | 4.5 | section 8 (suggested) "finish: git status, then submit_patch": the clean one-file chip forms | a clean ending | the page shrinks | page, CHIP |
| 481 | 21:01.12 | 4.5 | the page shrinks beside the held-out bars: "suggested: change one section at a time, measure every change" | prompts are experiments | the page folds into a new tile on the tool ring | page → tool ring |
| 482 | 21:04.50 | 4.5 | OVER the tool ring; a new tile slides in with a dashed edge: "skills/<name>/SKILL.md + scripts" | extend the agent without changing the tools | the tile opens | tool ring |
| 483 | 21:07.88 | 2 | the tile opens: a SKILL.md page and a scripts/ folder | how skills work | then: "a script runs in the sandbox and… | skill |
| 484 | 21:09.38 | 4.5 | "a script runs in the sandbox and costs one tool call" | how skills work, continued | three suggested skills slide in | skill |
| 485 | 21:12.75 | 4.5 | three suggested skills slide in (tag "general, not repo-specific"): "repo map" | idea 1 | two more slide in | skills |
| 486 | 21:16.12 | 4.5 | "repro scaffold" · "diff check" | ideas 2 and 3 | the first runs | skills |
| 487 | 21:19.50 | 3 | "repo map" runs: one call returns a compact map of the repository instead of many listings (concept) | fewer calls for orientation | the next runs | skills |
| 488 | 21:21.75 | 3 | "repro scaffold" runs: one call writes a repro template into /tmp (concept) | a faster first check | the next runs | skills |
| 489 | 21:24.00 | 3 | "diff check" runs: one call prints git status and the diff size before submitting (concept) | hygiene in one call | a sub-agent hangs off the loop | skills |
| 490 | 21:26.25 | 4 | WIDE a read-only sub-agent hangs off the main loop: it reads many files on its own tape, then returns a short summary into the main tape | clean context for exploration | the two tapes compare | sub-agent, TAPE |
| 491 | 21:29.25 | 2.5 | the main tape gains only a thin summary block, while the sub-agent's tape is full; tag "concept" | why sub-agents protect the window | the sub-agent's tape clears | tapes |
| 492 | 21:31.12 | 4.5 | a small file "/tmp/notes.md" appears in the /tmp tray: "keep a notes file — it survives in the sandbox while the context only grows" | notes outside the window | a line writes | notes |
| 493 | 21:34.50 | 4.5 | "short observations · notes in /tmp · read-only sub-agents that return summaries" — the three practices stack as one line | context engineering in one line | the line folds into the anatomy slots | practices |
| 494 | 21:37.88 | 2.5 | the practices file into the "context" slot of the six-part anatomy, which glows | where they belong | the question of the weights remains | slots |
| 495 | 21:39.75 | 4.5 | the "model" slot pulses: "and the model itself?" — a passing run's gold chip drops from the top | hand-off to training | then: the RAIL rewrites to "15 Teaching the… | CHIP |
| 496 | 21:43.12 | 4.5 | the RAIL rewrites to "15 Teaching the model" | hand-off to training, continued | the chip falls | CHIP |

### 15 Teaching the model

| # | time | beats | on screen | purpose | leaves | carries |
|---|---|---|---|---|---|---|
| 497 | 21:46.50 | 3.5 | FULL scale: a funnel fills the frame; the gold chip of a passing run falls into its mouth; the funnel tints purple, the chip stays gold | the training material is passing runs | tasks pour in behind it | funnel |
| 498 | 21:49.12 | 2 | the 129 public cells pour into the funnel (the ≈20 grey ones drop away) | the raw material | new cells arrive | GRID → funnel |
| 499 | 21:50.62 | 4.5 | new cells from other repositories join: tag "SWE-smith-style bug injection into other Python repos" | more training tasks | the cells flow into Gemma | GRID → funnel |
| 500 | 21:54.00 | 2 | the cells flow into the model block: Gemma runs each task many times | sampling runs | runs stream out | model block |
| 501 | 21:55.50 | 2 | runs stream out as thin ribbons, each ending at a test gate | trajectories | the gate judges | ribbons |
| 502 | 21:57.00 | 2 | the gate: failing ribbons turn grey and fall away | rejection sampling, the cut | passing ribbons glow | gate |
| 503 | 21:58.50 | 4.5 | passing ribbons glow green: "keep only Gemma's own passing runs" | rejection sampling, the keep | a counter runs | gate |
| 504 | 22:01.88 | 4.5 | a counter of kept ribbons climbs toward "≥ 300 verified trajectories" | a concrete target | then: small caps "the roadmap's milestone for week… | counter |
| 505 | 22:05.25 | 4.5 | small caps "the roadmap's milestone for week 3" | a concrete target, continued | the reading beat takes over without a cut | counter |
| 506 | 22:08.62 | 2.5 | reading beat: "≥ 300 verified trajectories" stays bright while everything else in the frame sinks to a third | let "≥ 300 verified trajectories" land | the ribbons wind into a spool | counter |
| 507 | 22:10.50 | 4.5 | the green ribbons wind into a spool: "SFT data · Gemma-only" | the dataset | the spool feeds a sheet | spool |
| 508 | 22:13.88 | 4.5 | the spool feeds a purple sheet: "LoRA · rank 16 · on a subset of layers" (the roadmap's first experiment) | the first adapter | two dials appear | sheet |
| 509 | 22:17.25 | 3 | two dials beside the sheet: rank · which layers — "ablate both" | what to vary | the sheet flies to the rig | dials |
| 510 | 22:19.50 | 4.5 | warning tag beside the purple sheet: "community report: high-rank, all-layer adapters misbehaved on the W4A16 build — smoke-test serving early" | the risk to check first | the held-out block returns | sheet |
| 511 | 22:22.88 | 4.5 | warning tag: "community report: high-rank, all-layer adapters misbehaved on the W4A16 build — smoke-test serving early" | the risk to check first, continued | the held-out block returns | rig |
| 512 | 22:26.25 | 4.5 | the rich block returns with two empty bars: "prompt only" vs "prompt + LoRA"; tag "your measurement" | the test that decides | the sheet slides into the tree | bars |
| 513 | 22:29.62 | 2 | the sheet slides into adapters/ in the TREE | it ships in the bundle | small caps write | TREE |
| 514 | 22:31.12 | 4.5 | small caps: "RL comes after SFT, if at all: highest ceiling, highest cost" | ordering | the spool settles in the corner as a column of levers rises; the RAIL rewrites to "16 Where to start" | spool |

### 16 Where to start

| # | time | beats | on screen | purpose | leaves | carries |
|---|---|---|---|---|---|---|
| 515 | 22:34.50 | 4.5 | WIDE nine lever bars grow to ranked heights beside the spool, yellow rank numerals 1–9 at their feet; corner tag "the roadmap's hypothesis, not a result" | the plan as one picture | bar 1 lifts forward | levers |
| 516 | 22:37.88 | 3.5 | bar 1 "local eval fidelity" lifts forward: the gold/null sweep replays on the grid behind it | why: one leaderboard probe a day | its readings slide in | GRID |
| 517 | 22:40.50 | 4.5 | reading cards R01 · R02 slide under bar 1: "harness guide (60′)" · "a participant's local harness: 109/129 gold patches pass locally (30′)" | what to read for it | bar 2 lifts | cards |
| 518 | 22:43.88 | 4.5 | bar 2 "budget and termination": the eval_config dials sweep against the 6-minute ruler — "every task must end in a diff" | why lever 2 | bar 3 lifts | dials, ruler |
| 519 | 22:47.25 | 4.5 | bar 3 "prompt and workflow": the LOOP lights explore → reproduce → fix → verify → submit; "a strong single-agent prompt first, then A/B a staged SequentialAgent" | why lever 3 | its readings slide in | LOOP |
| 520 | 22:50.62 | 4.5 | cards slide under it: R05 "start simple" · R06 "explore, reproduce, fix, rerun" · R07 "mini-swe-agent" · R10 "ADK mechanics" | what to read for it | bar 4 lifts | cards |
| 521 | 22:54.00 | 4.5 | bar 4 "thinking vs context": the three tapes return; "lower thinking on tool turns · gemma4 parsers handle tool calls and reasoning"; cards R09 · R11 | why lever 4 | bars 5 and 6 lift | tapes |
| 522 | 22:57.38 | 4.5 | bars 5 and 6 together: the failure chart gains its first tally; the funnel spins once — "label 50 failed runs" · "a rank-16 LoRA on Gemma's own passing runs" | why levers 5 and 6 | bars 7–9 lift | chart, funnel |
| 523 | 23:00.75 | 3.5 | bars 7, 8, 9 together: new repository bars sprout · two short rulers and a judge · a tall dim RL bar "only after SFT" | the rest of the ranking | the reading cards gather | levers |
| 524 | 23:03.38 | 4.5 | all reading cards gather into one pile: "the read-first tier: 11 readings · ≈7 hours (R01–R11 in the roadmap)" | what to read | the pile slides onto the calendar | pile |
| 525 | 23:06.75 | 4.5 | WIDE the calendar returns; small caps "the roadmap's suggestion": flags "week 1 · first non-zero score" · "week 2 · pick the scaffold" | the plan, part 1 | two more flags | calendar |
| 526 | 23:10.12 | 4.5 | flags "week 4 · LoRA beats prompt-only on the held-out repo" · "12 Nov · paper due" | the plan, part 2 | the paper flag lifts | calendar |
| 527 | 23:13.50 | 4.5 | FULL "The paper track" small caps "deadline 12 Nov · a separate track" — "your experiment log is the evidence" | the second track | six questions fall | — |
| 528 | 23:16.88 | 2 | six questions fall into a 3 × 2 grid, each over its film object: Q1 loop vs staged · Q2 depth vs breadth · Q3 self-distillation · Q4 thinking vs observation · Q5 graph tools · Q6 memorisation vs skill | six hypotheses worth testing | they dock onto the tree | questions |
| 529 | 23:18.38 | 4.5 | the six questions dock onto the TREE — each beside the file you would change to test it; small caps "the roadmap's research questions · hypotheses"; the RAIL rewrites to "17 Recap" | where you would test them | the tree carries into the recap | TREE |

### 17 Recap

| # | time | beats | on screen | purpose | leaves | carries |
|---|---|---|---|---|---|---|
| 530 | 23:21.75 | 4.5 | CLOSE the gold chip lifts out of the TREE: "your agent's only output: a git diff" | recap 1 | the camera pulls back | CHIP |
| 531 | 23:25.12 | 4.5 | WIDE the pull-back reveals the GRID and the ruler beside it: "≈120 private tasks · pytest exit 0 or nothing · 12 h ≈ 6 min a task, if run one at a time" | recap 2 | the camera tilts down to the rig and tape | GRID, ruler |
| 532 | 23:28.50 | 4.5 | the rig at 45° and the TAPE beside it: "Gemma 4 31B INT4 on 4 × L4 · LoRA is your only lever on the weights · 32,768 tokens that only grow" | recap 3 | the camera rises overhead | rig, TAPE |
| 533 | 23:31.88 | 4.5 | OVER the tool ring and containers A and B: "9 fixed tools · work in A, judged in B · keep the patch clean" | recap 4 | the camera settles on the tree | tool ring, A, B |
| 534 | 23:35.25 | 4.5 | WIDE the TREE: three files dock in order — "1 · a local harness: gold/null sweep" · "2 · one LlmAgent with a sane eval_config" · "3 · log every run, hold out a repository" | what to build first | the chip flies toward B | TREE |
| 535 | 23:38.62 | 4.5 | the gold chip flies into container B; its tests wait, neutral: "exit 0 is what you are building toward" | callback to the opening | the words rush toward camera | CHIP, B |
| 536 | 23:42.00 | 4 | FULL "Enter the competition." | the call to action | a second line writes | — |
| 537 | 23:45.00 | 4.5 | "Google – The Gemma 4 Developer Agent Competition · on Kaggle" | where | a third line writes | — |
| 538 | 23:48.38 | 4.5 | "final submission: 2 December 2026, 23:59 UTC" | the deadline | the RAIL unfolds into 17 ticks | — |
| 539 | 23:51.75 | 2 | the RAIL column: all 17 ticks light in sequence, then fade | close the map | the grid returns behind | RAIL |
| 540 | 23:53.25 | 4.5 | end card over the dim grid, small caps: "sources: the competition page and the organizers' harness guide (via a participant's digest), community reports, and the Gemma 4 Developer Agent Research Roadmap · hypotheses, concepts and derived values are labelled" | sources | the title writes | GRID |
| 541 | 23:56.62 | 4.5 | end frame: the gold cell glows; title "The Gemma 4 Developer Agent Competition" | final frame | fade to black on the last beat | GRID |
