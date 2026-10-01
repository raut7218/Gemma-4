# v4 edits, part A: chapters 0-9. Row numbers refer to the v3 core listing.
R = {}
R[11] = ['3 | OVER the grid: 12×10 cells bloom from the centre; the verdict lands in one cell — the gold patch inside, a green ring around it [SIG1 ends] | about 120 hidden tasks | a plate label rises from the bottom edge | GRID']
R[20] = []  # prizes moved to chapter 3 only
R[32] = ['3 | two teal arrows grow out of the agent: "read files" · "edit files" | the first two kinds of action | two more arrows grow | arrows',
         '3 | two more: "run commands" · "query a code graph" | the other two | each label rewrites into a real call | arrows']
R[50] = ['3 | the card becomes "your bundle"; it slides into an upload slot; the slot prints one number, "your score" — defined next | you upload configuration and get one number back | the card multiplies into cells | bundle']
R[69] = ['3.5 | second ruler: blocks run past the end, which turns red: "budget exhausted" | running out | a single block on it begins to stretch | rulers']
R[71] = ['3 | WIDE file card `eval_config.yaml` writes in; two lines type: timeout_seconds · max_tool_calls | the budget lever | two more lines type | file card',
         '2.5 | two more lines: max_time_minutes · max_turns | the four budgets | a dial grows beside each line | file card']
R[77] = ['3.5 | OVER the scoring pipeline at top; a dashed copy at bottom, "your local evaluation" (built in chapter 10); an arrow between them, "must agree" | you need an offline copy you trust | the two pipelines fold together | two pipelines']
R[78] = []
R[85] = ['3 | the first plinth rises in the centre: "1st place · $37k" | the stakes | two more rise beside it | plinths',
         '3 | two flanking plinths rise: "2nd · $18k" left, "3rd · $10k" right | the podium | a fourth plinth slides in apart | plinths']
R[88] = ['3 | WIDE a rule token drops with a calendar tick on its face: "1 submission a day" | rule 1 | a second token drops | tokens',
         '2.5 | a second token with two small flags: "2 final selections" | rule 2 | a third token drops | tokens',
         '2.5 | a third token with five small figures: "teams of up to 5" | rule 3 | the middle token opens | tokens']
R[92] = ['3 | "One open model." re-enters from the left exactly as in the cold open and thickens into a blue block | the rules lead back to the one model | the block deepens into 3D | words → model block']
R[94] = ['3 | 3D an HTML label pins to the slab: "31B parameters" | size | a second label pins | slab',
         '2.5 | 3D a second label: "≈17 GB of weights" | footprint | a third label pins | slab']
R[104] = ['3 | 3D a blue input bar passes down through all four cards at once: "one forward pass, four GPUs" | what tensor parallelism means | the maths writes over the scene | cards']
R[109] = ['3 | 3D (camera 50°) a whole slab again in front of the cards: "the same weights, frozen" | set up the update | two thin purple sheets rise beside it | slab',
          '3 | 3D a tall thin sheet B and a short wide sheet A rise beside the slab | the LoRA factors | an equation writes above | B, A']
R[114] = ['2.5 | under the toy: "W: 8 × 8 = 64 numbers" | count the frozen matrix | the factors count | grids',
          '2.5 | "B + A: 8×2 + 2×8 = 32 numbers" | count the factors | the general form writes | grids',
          '3 | "at real sizes: d·k frozen vs r·(d + k) trained" — the purple bar shrinks to a sliver beside the grey | why LoRA is cheap | the 3D view returns | grids']
R[119] = ['2.5 | a line types: "max_output_tokens ≤ 32,768" | output length | the next line types | sampling card',
          '2.5 | "thinking_level NONE … HIGH" | how much the model thinks | the next line types | sampling card',
          '2.5 | "thinking_budget (default 4,096)" | the thinking cap | "thinking" lifts out of the card | sampling card']
R[121] = ['2.5 | FULL a summary line builds, each term in its colour: "Gemma 4 31B · INT4" | recap, part 1 | the line continues | summary',
          '3 | the line completes: "· 4 × L4 · 32k · ≤ 8 LoRA" | recap, part 2 | "32k" lifts out and grows | "32k"']
R[124] = ['2.5 | legend chips rise: prompt (blue) · tool outputs (teal) | colour key, part 1 | two more chips rise | TAPE',
          '3 | two more: the agent\'s own turns (ink) · thinking (purple) — "everything shares one window" | colour key, part 2 | the first block slides in | TAPE']
R[127] = ['2.5 | CLOSE the drawer opens: "problem statement" · "hints, if any" | what the first message holds | two more strips slide out | TAPE',
          '2.5 | two more strips: "budget" · "environment rules" | contents | the last two slide out | TAPE',
          '2.5 | the last two: "tool notes" · "150-entry file listing" | contents | the drawer closes | TAPE']
R[135] = ['2.5 | a brace under the first block: "3.5k" | the sum, term 1 (derived) | the outputs bracket | TAPE',
          '2.5 | a brace under the twenty outputs: "+ 20 × 1.3k = 26k" | the sum, term 2 (derived) | the total writes | TAPE',
          '3.5 | "= 29.5k" — the last ≈3.3k sliver lights: "the agent\'s turns · thinking · replies" | why it overflows at about 20 | the gold chip slides out | TAPE']
R[140] = ['2.5 | three tapes stack, tag "concept": thinking_level NONE — thin purple between the steps | the knob, low end | a second tape fills | three tapes',
          '2.5 | LOW — wider purple blocks | the knob, middle | the third tape fills | three tapes',
          '2.5 | HIGH — wide purple blocks; it fills fastest | the knob, high end | HIGH cracks first | three tapes']
R[151] = ['2.5 | seven tiles fill solid: "budgeted — each call counts" | cost | two tiles change | tool ring',
          '2.5 | get_status and submit_patch turn to outlines: "free" | the exceptions | run_command slides to the front | tool ring']
R[157] = ['3 | CLOSE edit_file: old_string (red) above new_string (gold) | the edit | its match stages light | edit view',
          '3 | three match stages light in turn: exact → whitespace-flexible → regex-tokenised | how matching works | two error chips appear | edit view']
R[168] = ['2.5 | OVER the ring again; a dashed ring grows outside it: "+ skills you write" | extension 1 | a second ring grows | tool ring',
          '2.5 | a second dashed ring: "+ sub-agents you define" | extension 2 | three meters draw beneath | tool ring']
R[176] = ['3.5 | 3D (camera 40°) container A as an architectural model on a plinth: a translucent case with a header strip | the sandbox, physically | its parts light | container A',
          '3 | 3D inside, real parts light with HTML labels: a block "/workspace (the repository)", a tray "/tmp (scratch)", two plaques "pytest.ini · conftest.py" | what is inside | the machine label pins | container A']
R[179] = []
R[180] = []
R[182] = ['2.5 | 2D end conditions stack beside the case: "submit_patch()" | end 1 | the next one stacks | list',
          '2.5 | "budget exhausted" | end 2 | the next one stacks | list',
          '2.5 | "3 turns in a row without a tool call" | end 3 | the patch command types | list']
R[191] = ['2 | FULL "scratch to /tmp" enters from the left | habit 1 | the next enters | habits',
          '2.5 | FULL "never touch pytest.ini or conftest.py" enters from the right | habit 2 | the next enters | habits',
          '2 | FULL "don\'t edit tests" enters from the left | habit 3 | the words fall into container A\'s outline | habits']
R[193] = ['3 | WIDE container A opens into three panels: left the call log, centre the workspace, right three meters (context, tool calls, time) | the dashboard | the corner tag writes | dashboard',
          '2 | small caps in the corner, kept for the whole chapter: "illustrative run · not a real trajectory" | honesty | the issue card lands | dashboard']
R[197] = ['3 | call 1 run_command types: grep -rn "def summarize" --include=*.py . | locate | the result returns | log']
R[198] = ['3 | result: src/stats.py:4:def summarize(xs): — tool calls 1; the context meter grows by a sliver | small outputs are cheap | the camera moves to the centre panel | log, meters']
R[202] = ['2.5 | call 3 run_command writes /tmp/repro.py with a heredoc | write the check | the file appears | boundary',
          '2.5 | the file appears outside the gold edge | scratch goes to /tmp | the camera returns to the log | boundary']
R[209] = ['2.5 | call 7 types: python3 -m pytest tests/test_stats.py -q | nearby existing tests | its result returns | log',
          '2.5 | result: passed (green dots) | no regression locally | the next call types | log']
R[222] = ['3 | the careful run\'s log compresses into icons: find → read → write repro → run repro → fix | the recipe, part 1 | the line continues | icon line',
          '3 | → re-run → test → check → submit | the recipe, part 2 | each icon names its tool | icon line']
R[223] = ['3 | the first five icons name their tools: run_command · read_file · run_command · run_command · edit_file | the recipe in tool calls, part 1 | the rest name theirs | icon line',
          '3 | the last four: run_command · run_command · run_command · submit_patch | part 2 | the line cracks red at "submit"; the RAIL rewrites to "09 Failure modes" | icon line']
R[225] = ['3 | looping: the blue dot laps and laps; a log beside it repeats the same call three times in red | symptom 1 | the meter drains | LOOP',
          '2.5 | the tool-call meter drains while the diff stays empty | the cost of looping | a detector draws over the log | LOOP']
R[227] = ['3 | never submitting: the exit branch is gone; the time bar runs out | symptom 2 | the diff is taken anyway | LOOP',
          '2.5 | the diff is taken anyway — an empty one scores zero | the consequence | small caps write beside the loop | LOOP']
R[229] = ['3 | wrong file: the edit edge lands on the wrong node of the code graph; the hidden tests aim at the other node and turn red (illustrative) | symptom 3 | the log shows the clue | LOOP, graph']
R[234] = ['2.5 | four harness traps fan out as tags: "context overflow" · "editing tests" | the harness traps, part 1 | two more fan out | tags',
          '2.5 | "stray files" · "touching pytest.ini or conftest.py" | part 2 | the tags sort | tags']
R[237] = ['3 | the empty chart asks "over which tasks?" — the public task cells fade up beneath it; the RAIL rewrites to "10 The data and your local evaluation" | failures are counted over tasks | the cells colour by repository | GRID']
