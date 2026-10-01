import re, glob
S={f:open(f).read() for f in sorted(glob.glob('?.src'))}
def after(key, text):
    for f,s in S.items():
        if key in s:
            i=s.index(key); j=s.index('\n', i)+1
            S[f]=s[:j]+text.strip('\n')+'\n'+s[j:]; return
    raise SystemExit('missing: '+key)
def before(key, text):
    for f,s in S.items():
        if key in s:
            i=s.index(key); S[f]=s[:i]+text.strip('\n')+'\n'+s[i:]; return
    raise SystemExit('missing: '+key)

# ---- ch2: budget arithmetic, step by step
after('the wedge unrolls into a horizontal ruler', '''3 | FULL the arithmetic writes, one term at a time: 12 h = 720 min | the conversion (derived) | the next term writes | equation
2.5 | 720 min ÷ ≈120 tasks | the division | the result writes | equation
3 | = ≈ 6 min per task — the 6 slides down onto the ruler's last tick | the result lands on the ruler | the ruler returns | equation → ruler
3 | the first part of every task's 6 minutes shades grey: "sandbox setup counts against the 12 h" (concept) | setup eats into the budget | the caveat writes | ruler''')
# ---- ch4: quantisation levels, tensor-parallel maths, LoRA multiplication
after('inset: the activation bar stays 16 bits wide', '''3 | inset: a number line with 16 evenly spaced levels lights up: "4 bits = 16 levels" — beside it a dense line, "16 bits = 65,536 levels" | what is lost in 4 bits | the training loop draws | number lines''')
after('3D a yellow input bar passes down through all four cards at once', '''3 | 2D maths over the 3D: a weight matrix W splits into four column blocks W₁ W₂ W₃ W₄, one per card colour | tensor parallelism as maths | an input vector slides in | matrix
3 | the same input x multiplies every block at once: W₁x · W₂x · W₃x · W₄x | four partial products in parallel | the pieces join | matrix
3 | the four partial results join into one output vector | one layer, computed across four GPUs | the maths fades back into the 3D | matrix''')
after('2D equation over the 3D: W′ = W + B·A', '''3 | 2D toy example, tag "toy sizes": W drawn as an 8 × 8 grid of cells; B as 8 × 2, A as 2 × 8 beside it | the shapes | one product cell lights | grids
3 | one cell of B·A lights: a row of B and a column of A glow, multiplied and summed | how each entry of B·A is made | every cell fills | grids
3 | every cell of the 8 × 8 product fills purple, column by column; it is a full-size update made from two thin pieces | low rank, full size | the counts write | grids
3 | counts under the toy: W: 8 × 8 = 64 · B + A: 8×2 + 2×8 = 32 — at real sizes the gap is far larger: d·k vs r·(d + k) | why LoRA is cheap | the 3D view returns | grids''')
S['b.src']=S['b.src'].replace('''3.5 | 2D the slab's top becomes a grey square "W: d × k numbers, frozen"; beside it the purple factors "B·A: r·(d + k) numbers, trained" — a sliver next to the square | why LoRA is cheap | the 3D view returns | areas
''','')
# ---- ch5: token fractions and the overflow sum
after('a blue block slides in from the left, drawn to scale', '''2.5 | above the block: 3.5k ÷ 32,768 ≈ 11% (derived) | the first message's share | the drawer opens | TAPE''')
after('WIDE one teal block (about 4% of the tape)', '''2.5 | above it: 1.3k ÷ 32,768 ≈ 4% (derived) | one output's share | the counter appears | TAPE''')
after('20: the block doesn\'t fit', '''3.5 | the sum writes over the cracked tape: 3.5k + 20 × 1.3k = 29.5k — the last ≈3.3k is everything else: the agent's turns, thinking, replies (derived) | why it overflows at about 20 | the chip slides out | TAPE''')
after('WIDE TAPE refills with purple thinking blocks', '''2.5 | one thinking block at the default budget: 4,096 ÷ 32,768 = 12.5% of the window (derived) | the size of one thought | the tape triples | TAPE''')
# ---- ch6: JSON results, is_truncated, allow_multiple
after('output pours in; a cut line drops at 5,000 chars', '''3 | the result returns as a JSON string, keys lighting in turn: status · stdout · exit_code | what the model actually reads | the terminal folds back | JSON''')
after('CLOSE read_file opens into a long file', '''2.5 | a flag lights in the result: is_truncated = true | the model is told when it got less | the view folds back | file view''')
after('error chips: "0 matches → error"', '''2.5 | a third switch: allow_multiple (off by default) — on, every match is replaced | the escape hatch | the view folds back | edit view''')
# ---- ch7: the real verification command
after('3D B step 3 "apply the hidden tests"', '''3 | CLOSE B's terminal: the patch applies in up to four passes, then `python3 -m pytest <targets> -q` types | the exact check | the rim light changes | B''')
# ---- ch8: tool results as JSON on two calls
after('call 4 python3 /tmp/repro.py → ZeroDivisionError', '''3 | the raw result behind that line: {"status": "error", …, "exit_code": 1} — the agent reads JSON, not a terminal | what the model sees (illustrative) | the line underlines | log''')
after('call 6 python3 /tmp/repro.py → 0 (green)', '''2.5 | raw result: {"status": "ok", "stdout": "0", "exit_code": 0} (illustrative) | success in the same shape | the next call types | log''')
# ---- ch9: mini-logs and detection
after('looping: the blue dot laps and laps', '''3 | a detector draws over the log: three identical consecutive calls bracketed — "easy to count in a trajectory" (concept) | how to spot it | the exit branch erases | LOOP''')
after('wrong file: the edit edge lands on the wrong node', '''2.5 | in the log: the edit's filepath differs from the file the reproduction imported (illustrative) | how to spot it | the chip drops | LOOP''')
after('over-editing: the chip swells into a long', '''2.5 | the diff's file count and line count tick up beside it: "measure patch size per task" (concept) | how to spot it | symptoms shrink to tags | CHIP''')
# ---- ch10: two-phase verification and repo characters
after('the four blocks slide apart: "129 public training tasks', '''3 | each block gains its character: fastapi "web framework · routing, dependency injection, pydantic" · rich "terminal rendering · string and ANSI output" | what the code looks like | the other two label | GRID
3 | requests "HTTP client · several tests need a network that doesn't exist offline" · httpx "HTTP client" | why some tasks misbehave offline | one cell opens | GRID''')
after('gate "two-phase verification: tests fail before the fix', '''3 | one task runs through the gate: its tests on base_commit → red; with the gold patch → green; only then is it kept | the two phases, shown | the second grid appears | pipeline''')
# ---- ch12 (submit): example single-agent yaml
after('agent.yaml flies to the loop and becomes its shape', '''3.5 | CLOSE an example agent.yaml types (tag "example"): name · model: gemma-4-31b-it-qat-w4a16-ct · instruction: !include prompts/system.md · generate_content_config: !include configs/sampling.yaml · tools: [run_command, read_file, edit_file, …] | what a minimal root looks like | each line links to its part | yaml
3 | each YAML line draws a thin link to the part of the loop it sets | YAML maps onto the agent | the shapes step forward | yaml, LOOP''')
open('ins_done','w').write('1')
for f,s in S.items(): open(f,'w').write(s)
print('inserted')
