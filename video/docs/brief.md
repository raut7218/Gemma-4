# Brief

**What it is for.** Explain the Google Gemma 4 Developer Agent Competition visually: what the task is, how it is scored, the hard limits (model, hardware, 32k context, tools, sandbox, time), what you submit, and what has to be built to compete.

**Who watches.** An AI research engineer. Knows LLMs, LoRA, agents and pytest; doesn't know this competition's rules or harness.

**What they do at the end.** Enter the competition, knowing what to build first.

**Length and size.** 24:00, 1920×1080, 60 fps. No narration: on-screen type carries every idea, so it reads with the sound off. Music and effects are low and supportive.

**Facts.** `docs/facts.md` only. Anything illustrative (an example issue, an example diff, a candidate architecture) is labelled as an example, concept or hypothesis on screen. No leaderboard results, no invented scores.

**Style.** 3Blue1Brown-like: deep ink background with a faint coordinate grid, Computer Modern type, a small semantic palette, shapes that are drawn on rather than faded in, persistent objects that transform into the next idea, and one slow, continuous camera.

**Colour meaning (kept constant all film).**
- BLUE: the model / the agent
- TEAL: tools
- GOLD: the patch (the diff)
- GREEN: tests and passing
- RED: limits and failure
- YELLOW: key numbers
- PURPLE: training / LoRA
- PERIWINKLE (#8FA7D9): the model's thinking tokens
- Repositories: one neutral family in lightness steps (never the semantic colours)

**Recurring objects.**
- The patch chip (gold `patch.diff`): born in the cold open, carried through the task loop, the scoring, the sandbox and the verifier.
- The chapter rail: a slim tag naming the current one of 17 chapters (after the cold open), top-left, always telling the viewer where they are.
- The context tape: the 32k window drawn as a long strip, reused whenever context comes up.
- The bundle tree: the submission's file tree, which ends the film as the thing you build.

**Signature moments (three, marked [SIG1]–[SIG3] in the storyboard).**
1. A one-line bug in a code panel rewrites itself from red to green; the change folds into a small gold chip that travels into a sealed box, where hidden tests light up one after another and their single `exit 0` grows until it is the whole screen.
2. Twelve hours drawn as a clock is sliced into about 120 thin wedges; one wedge is pulled out and unrolled into a six-minute ruler, and the whole agent loop has to fit on that ruler.
3. The 32k window is a strip that fills from the left — the first message, then tool output after tool output with the agent's own turns between them — until the strip overflows and its far end cracks red, yet the patch is still pulled out from under it and graded.

**Chapters (beats at 80 BPM; 1 beat = 0.75 s).**

See docs/storyboard.md for the generated chapter table (cold open + 17 chapters, 578 compositions, 24:00).

**Other recurring objects.** The agent LOOP (think → call a tool → read the result, exit by submit_patch) is the film's spine: tools ring it, failures distort it, bundle files dock onto it, history evolves it, the candidate architecture grows out of it. The container silhouette (rounded case with a header strip) is identical in 2D and 3D: A is blue, B is green. The task GRID (≈120 hidden cells; 129 public cells by repository).

**Brand values for 3D (measured in renders).** Background #0E1116 (the 3D canvas is transparent over the page background, so its background pixel is the page's). Model/agent BLUE #58C4DD, adapters PURPLE #B48EDB, container A edge BLUE, container B edge GREEN #83C167, the patch GOLD #F0AC5F. Lit faces vary with the key light; the measured check is the top face of the weight slab within ΔE ≈ 10 of BLUE, and the background exactly #0E1116.
