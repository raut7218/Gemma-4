# v4 edits, part B: chapters 10-20 (core numbering).
R[238] = ['3 | OVER the public cells colour themselves: fastapi 67 (blue) · rich 48 (teal) | the two big repositories | the small two colour | GRID',
          '2.5 | requests 13 (gold) · httpx 1 — a single lonely cell | the small two | the blocks slide apart | GRID']
R[249] = ['3 | WIDE the public grid at left: "129 tasks · 4 repositories · gold patch visible" | the training set | the hidden grid appears beside | grids',
          '3 | the hidden grid at right, locked: "≈120 tasks · private repositories · gold patch not visible" | the test set | a line writes under it | grids']
R[252] = []
R[253] = ['3 | three empty bars: fastapi · rich · requests — "report your scores per repository" | to spot overfitting | the grid gathers into a dashed outline | GRID']
R[254] = ['2.5 | the bars sink and the public grid gathers into a dashed outline | from the data to measuring on it | the outline labels itself | GRID']
R[255] = ['2.5 | the dashed outline labels itself: "your offline copy of the scoring pipeline" | your own scoreboard | the camera closes on one cell | GRID',
          '3 | CLOSE one cell: its gold (reference) patch applies and its tests turn green; its null (empty) patch applies and they turn red | what one cell of the sweep checks | the camera pulls back | cell']
R[260] = []
R[263] = ['3 | under it a log line types: "config · local score per repo · leaderboard score · one observation" | write everything down | the log points at what you change between runs — the bundle | log line',
          '2.5 | the log line\'s first word, "config", lifts and slides into a zip at centre; the RAIL rewrites to "11 What you submit" | what you change is the bundle | type enters over a dimmed frame | zip']
R[266] = ['3 | WIDE the zip opens; the TREE unfolds its first lines: agent.yaml · prompts/*.md · configs/sampling.yaml | the bundle, part 1 | more lines unfold | TREE',
          '3 | the rest unfold: sub_agents/*.yaml · skills/<name>/SKILL.md · adapters/<name>/ · eval_config.yaml | the bundle, part 2 | small caps write under | TREE']
R[269] = ['3 | agent.yaml flies to the loop and becomes its shape | the root agent | three more agent shapes line up | LOOP',
          '3 | four agent shapes line up: LlmAgent (a loop) · SequentialAgent (a chain) · ParallelAgent (a fork) · LoopAgent (a cycle with a counter) | the agent types | an example root types | shapes']
R[270] = ['3 | CLOSE an example agent.yaml types (tag "example"): name · model: gemma-4-31b-it-qat-w4a16-ct · instruction: !include prompts/system.md | a minimal root, part 1 | two more lines type | yaml',
          '3 | two more lines: generate_content_config: !include configs/sampling.yaml · tools: [run_command, read_file, edit_file, …] | part 2 | each line links to the loop | yaml']
R[272] = ['3 | OVER the LlmAgent enlarges; handles attach: model · adapter · instruction | an agent\'s fields, part 1 | three more attach | LOOP',
          '2.5 | three more: tools · skills · sub_agents | part 2 | output_key attaches | LOOP']
R[273] = ['3 | handle output_key: the agent\'s final text drops into a "session state" box below | how agents share results | include_contents attaches | LOOP, state box',
          '3 | handle include_contents: a switch — at "none", the earlier conversation greys out of the agent\'s view | a clean context per agent | the workflow agents step forward | LOOP']
R[274] = ['2.5 | SequentialAgent: its chain lights left to right, one sub-agent at a time | in order | the fork lights | shapes',
          '2 | ParallelAgent: all branches of its fork light at once | at once | the cycle runs | shapes',
          '3 | LoopAgent: its counter ticks 1 → 2 → 3 and the cycle exits at "max_iterations" | bounded repeats | prompts/*.md lifts from the tree | shapes']
R[275] = ['3 | prompts/*.md docks onto "think": a page with {problem_description} and {hints} highlighted, "filled from session state" | prompts | a note writes beneath | LOOP',
          '2 | small caps under the page: "the public training data has no hints text" | detail | sampling.yaml lifts | LOOP']
R[277] = ['3 | sub_agents/*.yaml docks as a second, smaller loop hanging off the first: "its own prompt, tools and adapter" | sub-agents | the parent calls it | LOOP',
          '2.5 | the parent calls it like a tool (AgentTool) and a short result comes back | AgentTool | skills lifts | LOOP']
R[281] = ['3 | WIDE every file joined to the part it controls by a thin line; "every lever you have is in this tree" | the idea | the lines fade; the loop slides onto a time axis; the RAIL rewrites to "12 How coding agents got here" | TREE, LOOP']
R[282] = ['3 | WIDE a time axis 2021 → 2026 draws along the bottom; the LOOP sits at 2021–22: "ReAct: reason → act → observe" | where the loop came from | a label writes beside | LOOP',
          '2.5 | beside it: "Codex & HumanEval: function-level code" | the other 2021 thread | a year enters full-frame | LOOP']
R[283] = ['2 | FULL "2023" enters from the right over the axis | era 2 | it settles on its tick | year',
          '3 | a repository node attaches to the loop: "SWE-bench: real GitHub issues in real repositories — early baselines resolved only a few percent" | evaluation gets real | a feedback arrow curls in | LOOP']
R[285] = ['2 | FULL "2024" enters from the left | era 3 | it settles on its tick | year',
          '3 | the tool ring around the loop grows large and ornate: "the scaffold era — SWE-agent · AutoCodeRover · OpenHands" | intelligence in the scaffold | a note writes | LOOP',
          '2 | small caps: "SWE-bench Verified: a cleaned-up subset" | a term used next | a straight pipeline appears | LOOP']
R[287] = ['2 | FULL "2025" enters from the right | era 4 | it settles on its tick | year',
          '3 | the ring collapses to two tiles, "bash · edit", while the model block thickens purple | intelligence moves into the weights | the result writes | LOOP',
          '2.5 | "Claude 3.5 Sonnet · 49% on SWE-bench Verified with bash plus an edit tool" | the evidence | badges attach | LOOP']
R[289] = ['2.5 | task factories hang off the block: "SWE-Gym · SWE-smith · R2E-Gym" | data | training recipes hang below | LOOP',
          '3 | training recipes: "SWE-RL · DeepSWE · Kimi-Dev: open 32–72B models to about 40–60% on Verified" | the training turn | a year enters | LOOP']
R[290] = ['2 | FULL "2026" enters from the left | era 5 | it settles on its tick | year',
          '3 | the block shrinks (small open models) and the repository node gets a lock: "harness and context engineering · evaluation on fresh or private repositories" | where things are now | three tags attach | LOOP']
R[291] = ['3 | three tags: "SWE-Protégé: a 7B model reported at 42%" · "CANOPY: RL for small task pools" · "Open-SWE-Traces: 200k+ trajectories" | 2026 research | a quote writes beside | LOOP']
R[293] = ['2.5 | OVER three vessels rise: prompt · scaffold · weights | the arc | light pours | vessels',
          '2.5 | light pours from prompt into scaffold: "2024" | step one | it pours again | vessels',
          '2.5 | light pours from scaffold into weights: "2025" | step two | a line writes beneath | vessels']
R[294] = ['3 | "this competition asks you to repeat the second step, on a small scale" — the weights vessel lights; the scaffold vessel opens into six empty slots around the loop; the RAIL rewrites to "13 What you need to build" | framing; your scaffold is the anatomy to fill | the slots wait | vessels → slots']
R[306] = ['3 | six small shapes in a row; A, B and F step forward in blue: "good fit" | fit | the others recede | shapes',
          '2.5 | C and D recede; E dims: "only if time allows"; a corner tag stays: "the roadmap\'s assessment, not a measured result" | fit, continued | A and B slide together | shapes']
R[310] = ['2.5 | why this shape, reason 1: "explicit localization and reproduction stages help weaker models (Agentless, Kimi-Dev)" | rationale | reason 2 writes | pipeline',
          '2.5 | reason 2: "clean-context stages pass short summaries through state" | rationale | reason 3 writes | pipeline',
          '2.5 | reason 3: "looping is easier to bound stage by stage (SWE-Protégé)" | rationale | the pipeline starts to run | pipeline']
R[316] = ['2.5 | Verify runs the repro and nearby tests → green; the bracket exits early | done in one iteration | Submit runs | Verify',
          '2.5 | Submit calls submit_patch and the gold chip forms | the output | the tapes compare | CHIP']
R[318] = ['3 | a crack on the Localize → Reproduce boundary: "every stage boundary loses information" | why stages can hurt | a second risk writes | tapes',
          '2.5 | "and the per-task time may be too tight for many stages" | the second risk | the frame splits | tapes']
R[320] = ['3 | a balance between them: "adopt the staged design only if it wins on a held-out repository" | the decision rule | the balance tips and the scene clears; the RAIL rewrites to "14 Prompt, skills and sub-agents" | split']
