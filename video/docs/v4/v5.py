import re
L = open('docs/storyboard.v4raw2.src').read().split('\n')
def idx(sub, start=0):
    for i in range(start, len(L)):
        if sub in L[i]: return i
    print('WARN missing', sub); return None
def replace_row(sub, rows):
    i = idx(sub)
    if i is None: return
    L[i:i + 1] = rows
def delete_row(sub):
    i = idx(sub)
    if i is not None: del L[i]
def edit(sub, old, new):
    i = idx(sub)
    if i is None: return
    if old not in L[i]: print('WARN edit', sub, '::', L[i][:200]); return
    L[i] = L[i].replace(old, new)
def merge_next(sub, joiner='; '):
    """merge row containing sub with the following row (the 'then:' split)"""
    i = idx(sub)
    if i is None: return
    a = [p.strip() for p in L[i].split(' | ', 4)]; b = [p.strip() for p in L[i + 1].split(' | ', 4)]
    L[i:i + 2] = [f'{a[0]} | {a[1]}{joiner}{b[1]} | {a[2]} | {b[3]} | {b[4]}']

# ---- B1 maths: tensor parallelism with row blocks
edit('3D the slab lifts and divides along its columns into four blocks', '3D the slab lifts and divides along its columns into four blocks', '3D the slab divides in place into four blocks of rows (each block owns a quarter of the output features)')
edit('2D maths over the 3D: a weight matrix W splits into four column blocks', 'a weight matrix W splits into four column blocks W₁ W₂ W₃ W₄, one per card colour', 'on a dark plate: W splits into four row blocks W₁ W₂ W₃ W₄, one per card')
edit('the same input x multiplies every block at once', 'the same input x multiplies every block at once: W₁x · W₂x · W₃x · W₄x', 'the same input x multiplies every row block at once: W₁x · W₂x · W₃x · W₄x — each card computes a quarter of the output')
edit('the four partial results join into one output vector', 'the four partial results join into one output vector', 'the four quarters stack into one output vector (tag "simplified")')
# ---- B2 table bugs
for i, l in enumerate(L):
    if 'public leaderboard' in l and '"private leaderboard"' in l: L[i] = l.replace('"public leaderboard" | "private leaderboard"', '"public leaderboard" · "private leaderboard"')
replace_row('3D a slab of weights rests on an architectural-model plinth', ['4.5 | 3D a slab of weights rests on an architectural-model plinth; the key light sweeps across it as the camera orbits at 40°; HTML label "gemma-4-31b-it-qat-w4a16-ct" | the only model | labels pin to it | slab'])
# ---- B3 rail-only rows and disclaimer-only rows: fold into neighbours, replace with action shots
for i in range(len(L) - 1, -1, -1):
    l = L[i]
    if not re.match(r'^[\d.]+ \|', l): continue
    scr = l.split(' | ')[1]
    if scr.startswith('the stamps settle into a ring') or scr.startswith('the tick and its name settle'): continue
# merge weak split pairs (each half without its own action)
for sub in ['WIDE issue card small at left', 'WIDE container B (green rounded case', 'six grey test bars drop into B one after another',
            '`$ pytest` types inside B, then the bars turn green', 'OVER the grid: 12×10 cells bloom from the centre',
            'WIDE the issue card enters from the left', 'the loop part glows blue', 'B lights: "exit 0 → resolved"',
            'CLOSE the drawer shows', 'the strip shades "23 Sep → 12 Nov']:
    try:
        i = idx(sub)
        if i is not None and L[i].split(' | ')[3].startswith('then:'): merge_next(sub)
    except SystemExit: pass
# cold-open honesty: keep the illustrative tag visible through the green tests
edit('`$ pytest` types inside B', '`$ pytest` types inside B', 'corner tag "illustrative" stays on; `$ pytest` types inside B')
# disclaimer-only rows → folded into the row before (as corner tags) and replaced by actions
def fold_into_prev(sub, new_rows=None):
    i = idx(sub)
    if i is None: return
    txt = L[i].split(' | ')[1]
    j = i - 1
    while not re.match(r'^[\d.]+ \|', L[j]): j -= 1
    p = [x.strip() for x in L[j].split(' | ', 4)]
    L[j] = f'{p[0]} | {p[1]}; corner tag: {txt} | {p[2]} | {p[3]} | {p[4]}'
    L[i:i + 1] = new_rows or []
fold_into_prev('"a run also ends after 3 turns in a row without a tool call"', ['2.5 | a stopwatch beside the loop counts three turns with no call — the run ends | the third way a run ends | the edit edge reroutes | LOOP'])
delete_row('reading beat: an underline sweeps under "declarative · under 3 GiB"')
fold_into_prev('small caps: "declarative · under 3 GiB"', ['2.5 | the zip\'s size meter fills a sliver of a bar marked "3 GiB" | the size limit, shown | the loop fades in | TREE'])
# history: mini-swe-agent sentence and purpose fix
edit('badges: "Claude Code · Codex', 'a short strip: "mini-swe-agent: 100 lines"', 'a short strip: "mini-swe-agent: 100 lines were enough for frontier models"')
# honesty tags
edit('WIDE a code graph: functions as nodes, calls as edges', 'WIDE a code graph: functions as nodes, calls as edges', 'WIDE a code graph (tag "concept"): functions as nodes, calls as edges')
edit('C code as action (OpenHands)', 'code inside the call node', 'code inside the call node (concept)')
edit('section 8 "finish: git status, then submit_patch"', 'section 8 "finish: git status, then submit_patch"', 'section 8 (suggested) "finish: git status, then submit_patch"')
edit('the page shrinks beside the held-out bars', '"change one section at a time, measure every change"', '"suggested: change one section at a time, measure every change"')
edit('FULL "The paper track"', 'a separate competition', 'a separate track')
# colours
edit('OVER the public cells colour themselves', 'fastapi 67 (blue) · rich 48 (teal)', 'fastapi 67 · rich 48 — two neutral tones')
edit('requests 13 (gold) · httpx 1', 'requests 13 (gold) · httpx 1', 'requests 13 · httpx 1 — two lighter neutral tones,')
edit('WIDE TAPE refills with purple thinking blocks', 'purple thinking blocks', 'periwinkle thinking blocks')
edit('the strip shades "23 Sep → 12 Nov', 'in purple', 'in pale ink')
for i, l in enumerate(L):
    if 'reading beat: an underline sweeps under' in l: L[i] = l.replace('and it warms to its colour', 'and it brightens')
# 3D: keep B and A in a 2D inset; only the product film touches the slab
replace_row('3D a tall thin sheet B and a short wide sheet A rise beside the slab', ['3 | 2D inset on a dark plate beside the 3D slab: a tall thin B and a short wide A draw themselves | the LoRA factors | an equation writes above | B, A'])
edit('3D B and A meet over the slab', '3D B and A meet over the slab; their product lays down as a thin purple film on its top', '2D B and A multiply in the inset; the product appears in 3D as a thin purple film lying flat on the slab\'s top')
replace_row('the sheet clips onto the slab-and-cards rig from chapter 4 (2D view)', ['3.5 | warning tag beside the purple sheet: "community report: high-rank, all-layer adapters misbehaved on the W4A16 build — smoke-test serving early" | the risk to check first | the held-out block returns | sheet'])
# hand-offs
replace_row('the empty chart asks "over which tasks?"', ['3.5 | the empty chart\'s x-axis extends into a row of 129 cells, which wraps into a grid; the RAIL rewrites to "10 The data and your local evaluation" | failures are counted over tasks | the cells take their repository tones | GRID'])
for sub in ['the log line\'s first word, "config", lifts']:
    replace_row(sub, ['3 | the log\'s "config" column turns into a stack of bundle versions; the top one zips shut; the RAIL rewrites to "11 What you submit" | what changes between runs is the bundle | type enters over a dimmed frame | zip'])
replace_row('all six hold in their grid', ['4 | the six questions dock onto the TREE — each beside the file you would change to test it; small caps "the roadmap\'s research questions · hypotheses"; the RAIL rewrites to "17 Recap" | where you would test them | the tree carries into the recap | TREE'])
# ch13 → ch14 carry the plain loop
edit('a balance between them: "adopt the staged design only if it wins', 'the balance tips and the scene clears;', 'the balance tips toward the plain LOOP, which stays as the rest clears;')
edit('FULL "The tool descriptions are fixed. The prompt is yours."', 'FULL "The tool descriptions are fixed. The prompt is yours."', 'FULL beside the plain LOOP: "The tool descriptions are fixed. The prompt is yours."')
# peak in ch13: the candidate run as a full-frame escalation
edit('the candidate runs on the cold-open issue', 'the candidate runs on the cold-open issue', '[PEAK] FULL-frame: the candidate runs on the cold-open issue')
# ch2: worked score example replaces the third "≈120" beat
for i, l in enumerate(L):
    if 'reading beat' in l and '"≈120"' in l:
        L[i] = '2.5 | example (tag "example"): 3 of 12 cells turn green and the equation reads 3 ÷ 12 = 0.25 | what the score means, concretely | the denominator returns to ≈120 | equation'
# drop repeated beats
for t in ['"exit 0 → resolved"; it brightens', 'reading beat: the camera pushes in on "2 Dec · final submission"']:
    for i, l in enumerate(L):
        if 'reading beat' in l and t.split(';')[0].split('"')[1] in l and ('exit 0 → resolved' in t or '2 Dec' in t):
            prev = i - 1
            p = [x.strip() for x in L[prev].split(' | ', 4)]; q = [x.strip() for x in l.split(' | ', 4)]
            L[prev] = f'{p[0]} | {p[1]} | {p[2]} | {q[3]} | {p[4]}'; L[i] = ''; break
# ---- last 3 minutes rebuilt as object-led shots
s = '\n'.join(L)
a = s.index('## 16 Where to start'); b = s.index('## 17 Recap')
s = s[:a] + '''## 16 Where to start | 0
3 | WIDE nine lever bars grow to ranked heights beside the spool, yellow rank numerals 1–9 at their feet; corner tag "the roadmap's hypothesis, not a result" | the plan as one picture | bar 1 lifts forward | levers
3.5 | bar 1 "local eval fidelity" lifts forward: the gold/null sweep replays on the grid behind it | why: one leaderboard probe a day | its readings slide in | GRID
3 | reading cards R01 · R02 slide under bar 1: "harness guide (60′)" · "a participant's local harness: 109/129 gold patches pass locally (30′)" | what to read for it | bar 2 lifts | cards
3 | bar 2 "budget and termination": the eval_config dials sweep against the 6-minute ruler — "every task must end in a diff" | why lever 2 | bar 3 lifts | dials, ruler
3.5 | bar 3 "prompt and workflow": the LOOP lights explore → reproduce → fix → verify → submit; "a strong single-agent prompt first, then A/B a staged SequentialAgent" | why lever 3 | its readings slide in | LOOP
3 | cards slide under it: R05 "start simple" · R06 "explore, reproduce, fix, rerun" · R07 "mini-swe-agent" · R10 "ADK mechanics" | what to read for it | bar 4 lifts | cards
3 | bar 4 "thinking vs context": the three tapes return; "lower thinking on tool turns · gemma4 parsers handle tool calls and reasoning"; cards R09 · R11 | why lever 4 | bars 5 and 6 lift | tapes
3 | bars 5 and 6 together: the failure chart gains its first tally; the funnel spins once — "label 50 failed runs" · "a rank-16 LoRA on Gemma's own passing runs" | why levers 5 and 6 | bars 7–9 lift | chart, funnel
3 | bars 7, 8, 9 together: new repository bars sprout · two short rulers and a judge · a tall dim RL bar "only after SFT" | the rest of the ranking | the reading cards gather | levers
3 | all reading cards gather into one pile: "the read-first tier: 11 readings · ≈7 hours (R01–R11 in the roadmap)" | what to read | the pile slides onto the calendar | pile
3.5 | WIDE the calendar returns; small caps "the roadmap's suggestion": flags "week 1 · first non-zero score" · "week 2 · pick the scaffold" | the plan, part 1 | two more flags | calendar
3 | flags "week 4 · LoRA beats prompt-only on the held-out repo" · "12 Nov · paper due" | the plan, part 2 | the paper flag lifts | calendar
3 | FULL "The paper track" small caps "deadline 12 Nov · a separate track" — "your experiment log is the evidence" | the second track | six questions fall | —
4 | six questions fall into a 3 × 2 grid, each over its film object: Q1 loop vs staged · Q2 depth vs breadth · Q3 self-distillation · Q4 thinking vs observation · Q5 graph tools · Q6 memorisation vs skill | six hypotheses worth testing | they dock onto the tree | questions
4 | the six questions dock onto the TREE — each beside the file you would change to test it; small caps "the roadmap's research questions · hypotheses"; the RAIL rewrites to "17 Recap" | where you would test them | the tree carries into the recap | TREE

## 17 Recap | 0
2.5 | CLOSE the gold chip lifts out of the TREE: "your agent's only output: a git diff" | recap 1 | the camera pulls back | CHIP
4.5 | WIDE the pull-back reveals the GRID and the ruler beside it: "≈120 private tasks · pytest exit 0 or nothing · 12 h ≈ 6 min a task, if run one at a time" | recap 2 | the camera tilts down to the rig and tape | GRID, ruler
3.5 | the rig at 45° and the TAPE beside it: "Gemma 4 31B INT4 on 4 × L4 · LoRA is your only lever on the weights · 32,768 tokens that only grow" | recap 3 | the camera rises overhead | rig, TAPE
3 | OVER the tool ring and containers A and B: "9 fixed tools · work in A, judged in B · keep the patch clean" | recap 4 | the camera settles on the tree | tool ring, A, B
4.5 | WIDE the TREE: three files dock in order — "1 · a local harness: gold/null sweep" · "2 · one LlmAgent with a sane eval_config" · "3 · log every run, hold out a repository" | what to build first | the chip flies toward B | TREE
3 | the gold chip flies into container B; its tests wait, neutral: "exit 0 is what you are building toward" | callback to the opening | the words rush toward camera | CHIP, B
3 | FULL "Enter the competition." | the call to action | a second line writes | —
3 | "Google – The Gemma 4 Developer Agent Competition · on Kaggle" | where | a third line writes | —
3 | "final submission: 2 December 2026, 23:59 UTC" | the deadline | the RAIL unfolds into 17 ticks | —
3 | the RAIL column: all 17 ticks light in sequence, then fade | close the map | the grid returns behind | RAIL
3.5 | end card over the dim grid, small caps: "sources: the competition page and the organizers' harness guide (via a participant's digest), community reports, and the Gemma 4 Developer Agent Research Roadmap · hypotheses, concepts and derived values are labelled" | sources | the title writes | GRID
3 | end frame: the gold cell glows; title "The Gemma 4 Developer Agent Competition" | final frame | fade to black on the last beat | GRID
'''
L = [l for l in s.split('\n')]
L = [l for l in L if l != '']
# drop the remaining reading beats on repeated or weak targets
weak = ['"≈ 1.3k"', '"declarative · under 3 GiB"', '"you create it"', '"12.5% of the window"']
L = [l for l in L if not (l.split(' | ')[1:2] and l.split(' | ')[1].startswith('reading beat') and any(w in l for w in weak))]
# isolate mode for a third of the remaining beats
k = 0
for i, l in enumerate(L):
    if ' | reading beat:' in l:
        if k % 3 == 2:
            term = re.search(r'"([^"]+)"', l).group(1)
            p = [x.strip() for x in l.split(' | ', 4)]
            L[i] = f'{p[0]} | reading beat: "{term}" stays bright while everything else in the frame sinks to a third | {p[2]} | {p[3]} | {p[4]}'
        k += 1
open('docs/storyboard.v5raw.src', 'w').write('\n'.join(L))
rows = [l for l in L if re.match(r'^[\d.]+ \|', l)]
print('comps', len(rows), 'beats', sum(1 for r in rows if ' | reading beat' in r), 'then-splits', sum(1 for r in rows if r.split(' | ')[3].startswith('then:')))
