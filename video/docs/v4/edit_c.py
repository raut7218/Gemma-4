# v4 edits, part C: prompt chapter as effects in the dashboard, teaching, levers, paper track, recap.
R[322] = ['3 | WIDE a page "prompts/system.md" (tag "suggested structure") at left; the ch8 dashboard at right, reset | each prompt section will be shown by its effect | section 1 writes | page, dashboard']
R[323] = ['2.5 | section 1 "the issue": {problem_description} highlighted; the issue card lands in the dashboard | the task comes first | section 2 writes | page']
R[324] = ['3 | section 2 "workflow: explore → reproduce → fix → rerun → think about edge cases" | the order of work | the dashboard replays it | page']
R[325] = ['3 | the dashboard\'s log replays in that order: grep → read → repro fails → edit → repro passes → tests pass | the workflow, as calls | section 3 writes | dashboard']
R[326] = ['3 | section 3 "read only the lines you need": the careless run\'s call 1 replays — this time a small teal sliver instead of a big block | the effect on the window | section 4 writes | page, dashboard']
R[327] = ['3 | section 4 "copy old_string exactly": an edit with a mistyped old_string errors "0 matches"; the corrected one applies | the effect on edits | section 5 writes | page, dashboard']
R[328] = ['2.5 | section 5 "search by symbol name": the query `HTTPAdapter` (example) snaps onto a node; the sentence version finds nothing | the effect on search | section 6 writes | page, dashboard']
R[329] = ['3 | section 6 "scratch in /tmp · don\'t touch pytest.ini or conftest.py · don\'t edit tests": notes.txt slides out of /workspace into /tmp | the effect on the patch | section 7 writes | page, dashboard']
R[330] = ['3 | section 7 "check get_status (free) and submit before the budget runs out": get_status pings, the time bar has room, submit fires | the effect on finishing | section 8 writes | page, dashboard']
R[331] = ['2.5 | section 8 "finish: git status, then submit_patch": the clean one-file chip forms | a clean ending | the page shrinks | page, CHIP']
R[332] = ['3 | the page shrinks beside the held-out bars: "change one section at a time, measure every change" | prompts are experiments | the page folds into a new tile on the tool ring | page → tool ring']
R[335] = ['2.5 | three suggested skills slide in (tag "general, not repo-specific"): "repo map" | idea 1 | two more slide in | skills',
          '2.5 | "repro scaffold" · "diff check" | ideas 2 and 3 | the first runs | skills']
R[343] = ['3 | the practices file into the "context" slot of the six-part anatomy, which glows | where they belong | the question of the weights remains | slots',
          '2.5 | the "model" slot pulses: "and the model itself?" — a passing run\'s gold chip drops from the top; the RAIL rewrites to "15 Teaching the model" | hand-off to training | the chip falls | CHIP']
R[344] = ['4 | FULL scale: a funnel fills the frame; the gold chip of a passing run falls into its mouth; the funnel tints purple, the chip stays gold | the training material is passing runs | tasks pour in behind it | funnel']
R[349] = ['2.5 | the gate: failing ribbons turn grey and fall away | rejection sampling, the cut | passing ribbons glow | gate',
          '3 | passing ribbons glow green: "keep only Gemma\'s own passing runs" | rejection sampling, the keep | a counter runs | gate']
R[352] = ['3 | the spool feeds a purple sheet: "LoRA · rank 16 · on a subset of layers" (the roadmap\'s first experiment) | the first adapter | two dials appear | sheet']
R[357] = ['3 | small caps: "RL comes after SFT, if at all: highest ceiling, highest cost" | ordering | the spool settles in the corner as a column of levers rises; the RAIL rewrites to "16 Where to start" | spool']
R[358] = ['3 | WIDE a column of nine lever slots rises at the left: "levers, ranked by expected return"; corner tag "the roadmap\'s hypothesis, not a result" | the plan | lever 1 lights | lever column']
R[359] = ['3 | lever 1 "local eval fidelity" lights; the gold/null sweep from chapter 10 replays on the grid | why: one leaderboard probe a day | its readings pin | GRID']
R[362] = ['3 | lever 3 "prompt and workflow": the LOOP lights explore → reproduce → fix → verify → submit in order | the order of work | its first experiment writes | LOOP',
          '2.5 | "a strong single-agent prompt first, then A/B against a staged SequentialAgent" | the first experiment | its readings pin | LOOP']
R[363] = ['3 | cards pin to the loop: R05 "start simple (25′)" · R06 "explore, reproduce, fix, rerun, edge cases (20′)" · R07 "mini-swe-agent (30′)" · R10 "ADK: output_key, include_contents, AgentTool (60′)" | what to read for it | lever 4 lights | cards']
R[364] = ['3 | lever 4 "thinking vs context": the three tapes NONE / LOW / HIGH return; "lower thinking on tool turns · the gemma4 parsers handle tool calls and reasoning" | the trade-off | its readings pin | tapes',
          '2.5 | cards pin to the tapes: R09 "context is a finite attention budget (25′)" · R11 "Gemma 4 model card (30′)" | what to read for it | lever 5 lights | cards']
R[366] = ['3 | lever 6 "LoRA SFT on verified runs": the funnel spins once — "rank 16 on a subset of layers" (first experiment) | teach the model | lever 7 lights | funnel']
R[367] = ['2.5 | lever 7 "more training tasks": new bars sprout beside the four repository bars | wider data | lever 8 lights | bars',
          '2.5 | lever 8 "test-time scaling": two short rulers + a judge vs one long ruler, "if time allows" | scaling | lever 9 dims in | rulers']
R[370] = ['3 | WIDE the calendar returns; small caps "the roadmap\'s suggestion": flags "week 1 · first non-zero score" · "week 2 · pick the scaffold" | the plan in flags, part 1 | two more flags | calendar',
          '3 | two more flags: "week 4 · LoRA beats prompt-only on the held-out repo" · "12 Nov · paper due" | the plan in flags, part 2 | the paper flag lifts | calendar']
R[371] = []
R[372] = ['3 | FULL "The paper track" small caps "deadline 12 Nov · a separate competition" — "your experiment log is the evidence" | the second track | six question marks fall | —']
R[374] = ['2 | Q1 flashes over its object: "workflow vs loop at 31B" — the plain loop beside the staged pipeline | question 1 | Q2 flashes | Q1']
R[375] = ['2 | Q2: "depth vs breadth under a time cap" — one long ruler vs k short rulers + a judge | question 2 | Q3 flashes | Q2']
R[376] = ['2 | Q3: "self-distillation without proprietary data" — the funnel and its purple sheet | question 3 | Q4 flashes | Q3']
R[377] = ['2 | Q4: "thinking tokens vs observation tokens" — the three tapes | question 4 | Q5 flashes | Q4']
R[378] = ['2 | Q5: "do code-graph tools help localisation?" — the graph with one lit node | question 5 | Q6 flashes | Q5']
R[379] = ['2 | Q6: "memorisation vs skill" — the rich block pulled out of the grid | question 6 | all six hold | Q6']
R[380] = ['4.5 | all six hold in their grid, small caps "the roadmap\'s research questions · hypotheses"; they fold into the gold chip; the RAIL rewrites to "17 Recap" | the six together | the chip moves to centre | questions → CHIP']
R[389] = ['3 | the "build first" trio docks onto the TREE: "1 · a local harness: gold/null sweep on the 129 tasks" | what to do first | step 2 docks | TREE',
          '3 | "2 · one LlmAgent with a sane eval_config — not 1 minute / 10 calls" | step 2 | step 3 docks | TREE',
          '3 | "3 · log every run and hold out a repository" | step 3 | the gold chip flies toward container B | TREE',
          '3 | the gold chip flies into container B one last time; its tests wait, neutral: "exit 0 is what you are building toward" | callback to the opening | the words rush toward camera | CHIP, B']
R[393] = ['3 | the RAIL column: all 17 ticks light in sequence, then fade | close the map | the grid returns behind | RAIL']
R[394] = ['3.5 | end card over the dim grid, small caps: "sources: the competition page and the organizers\' harness guide (via a participant\'s digest), community reports, and the Gemma 4 Developer Agent Research Roadmap · hypotheses, concepts and derived values are labelled" | sources | the title writes | GRID']
BEATS = {10: 'exit 0 = resolved', 12: '≈120 hidden tasks', 21: '2 December 2026', 28: 'not in your checkout', 38: 'You submit the agent', 42: 'almost right scores zero',
         56: '≈120', 64: '≈ 6 min per task', 70: 'up to 300 s per command', 73: 'caps the score near zero', 76: '≈70 tries (derived)', 83: '2 Dec · final submission',
         87: 'open-source their code and adapters', 97: 'W4A16', 101: '96 GB in total', 103: 'tensor_parallel_size = 4', 108: 'max_model_len = 32,768',
         115: 'rank r ≤ 128', 116: 'up to 8 adapters', 117: 'the only way to change the model\'s weights', 125: 'first message ≈ 3.5k', 128: '≈ 1.3k',
         134: '≈20 full-size outputs', 136: 'still graded', 137: 'the context only grows', 139: '12.5% of the window', 155: '≤ 150 lines', 160: 'end up in your patch',
         166: 'a symbol name, not a sentence', 170: 'time, a tool call and context', 177: 'offline', 178: 'do not modify', 183: 'even if the agent never submits',
         186: 'reset any test files', 189: 'exit 0 → resolved', 205: 'a test the agent can see', 213: 'this is where it\'s decided', 221: 'your prompt, workflow and budget',
         245: '31 lines in 1 file', 250: 'small, single-file fixes', 258: 'fix the harness or exclude the task', 267: 'declarative · under 3 GiB', 279: 'rank ≤ 128 · up to 8',
         281: 'every lever you have is in this tree', 294: 'repeat the second step', 299: 'you create it', 320: 'only if it wins on a held-out repository',
         350: '≥ 300 verified trajectories'}
