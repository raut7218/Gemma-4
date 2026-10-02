# Critic r2_c: film.mp4, 981.75–1440 s (ch11–17). Verdict: one more pass

All times below are film times. Evidence is in this folder: contact sheets s_*.png (one frame every 0.2 s), hand-off tiles ho_*.png, and single frames f_/g_/h_*.png.

## Ranked list
1. **1416–1419.5, ch17 (the "what to build first" climax):** arrows 1 and 2 point at rows that are not there. Arrow 1 points at empty space above the tree. Arrow 2 points at a teal highlight bar with no filename in it (y≈395). The tree still has only 3 files: agent.yaml, prompts, sampling. eval_config is named in card 2 but never appears in the tree, and nothing lifts out of the tree. This happens at the moment the film tells the viewer what to build, so it reads as a bug. **Fix:** show the full bundle tree (F43–F49). Land arrow 2 on an `eval_config.yaml` row. Give item 1 a real target, e.g. a "local harness (yours, outside the bundle)" plate. If that can't be done, drop arrow 1.
2. **1325–1330, ch15:** the honesty tag "THE ROADMAP'S MILESTONE FOR WEEK 3 · NOT A RESULT" collides with three green trajectory lines and the TESTS bar, and it runs off the right edge ("· NO…"). The "not a result" part, which is the tag's whole purpose, can't be read. **Fix:** move the tag under "verified trajectories" at x ≥ 1460, wrap it inside the safe area, and put a plate behind it.
3. **1396–1401, ch16 (research questions):** at 1397 the Q cards overlap. The Q3 and Q6 cards stack, and ghost "paper track" text shows behind the cards. At 1399.5 the Q rows scatter: Q6 is cut off at the right edge ("memorisation vs…"), and the rows point at nothing because the tree has 3 files. **Fix:** clear the paper-track text before the cards build. Dock each Q next to the full tree from item 1 and keep it inside the safe area.
4. **1040–1047, ch11:** "PEFT LoRA · safetensors only", "rank ≤ 128 · up to 8" and "sampling.yaml: temperature · thinking" are stacked inside the loop, with the arcs running behind them. Meanwhile the left ~40% of the frame is empty because the tree has faded. **Fix:** move the camera left, or bring the tree back. Let each label land on its own part of the loop instead of stacking them.
5. **1422.4 and 1432.2–1432.5, ch17:** there are empty-grid frames between the end beats. The CTA then flies in cropped ("nter the competitio") at 1422.6. **Fix:** overlap the beats by about 0.3 s so the CTA arrives while container B leaves.
6. **1336–1352 (ch15) and ch16 throughout:** the spool arcs cut across its own "SFT DATA" label. In the ch16 corner the label is about 10 px tall and can't be read. **Fix:** put a plate under the label, or move it outside the spool. Make the carried spool larger, or drop the label.
7. **1222.3, the ch13→14 cut:** the chapter label already reads "14" while ch13's balance and pipeline are still on screen. The loop is pushed in and cropped at the top-left for about 0.5 s. The known still at 1224.77 is excluded from this item. **Fix:** switch the chapter label after the clear.
8. **Minor:** at 1362–1366 the lever-2 "0 min / 1 min" mini-axis is small in empty space, and "1 min" has low contrast. At 1411 the "24,576" tick has low contrast.

## Re-check of previous items
| Item | Status |
|---|---|
| f10_12 #2: ch12 close (slots, crop, "scaffold", still) | fixed (vessels in frame at 1130.5; six slots at 1133.5) |
| f10_12 #3: crop at 1042–1044 | fixed (tree fades); empty left half → new #4 |
| f10_12 #4: "call a tool" cut at right edge | fixed |
| f10_12 #5: max_iterations lingers | fixed |
| f10_12 #6: yaml card over tree; tiles on "model" | fixed |
| f10_12 #7: stills 981.5 / 1053.1 / 1133.4 | fixed in range (qa: none > 0.5 s except 981.0, which is ch10) |
| f10_12 #8: ch11/12 composition, year cards | partly: year cards now settle on their ticks; ch11 1040–1047 is still lopsided |
| f10_12 #10: line over zip | fixed |
| f13_17 #1: freeze 1352–1358 | fixed (levers grow under the line; 0 s frozen in 1350–1380) |
| f13_17 #2: 1298 collision | fixed (folds into a pill) |
| f13_17 #3: 1222.3 slide-over | mostly fixed; residual → #7; the 1224.77 still is known |
| f13_17 #4: lever heading, R01/R02 | fixed ("READ FOR LEVER n"; cards legible) |
| f13_17 #5: minute prime | fixed ("25 min") |
| f13_17 #6: R09/R11 persist | fixed (gone by 1379.5) |
| f13_17 #7: Q icons, 3-file tree | NOT fixed → #3 |
| f13_17 #8: thin tree, eval_config not shown | NOT fixed, now worse (arrows point at empty rows) → #1 |
| f13_17 #9: chip covers container B label | fixed |
| f13_17 #10: CTA over test bars | fixed (container clears first); leaves an empty frame → #5 |
| f13_17 #11: small family morphs | fixed (3×2 grid fills the frame at 1161) |
| f13_17 #12: anatomy identity | fixed (two columns at 1298–1306) |
| f13_17 #13: still at 1135.6 | fixed |
| f13_17 #14: ending tick beat, title hold | fixed (title holds ~5 s, 1434.6–1439.7) |
| f13_17 #15: unlabelled counter | fixed ("A TARGET ≥300", F71); its tag collides → #2 |

## Other checks
- **Honesty:** every number checked is in facts.md: 49%, 109/129, ≥300 (week 3), rank 16, rank ≤ 128, up to 8, 32,768, 50 failed runs, 25/30/60 min, ≈120, 12 h ≈ 6 min, 2 Dec 2026 23:59 UTC. Hypothesis, suggestion, concept, illustrative and example tags are present, and the end card says labels are used.
- **Motion and stills:** qa_film shows 0 frozen seconds in every 30 s window in this range, apart from the known 1224.77 still.
- **Audio:** −16.1 LUFS, true peak −1.7 dBTP, no clipping.
- **Hand-offs** at 1053, 1134, 1306.5, 1354.5 and 1401.75 carry their object cleanly (loop, loop+slots, anatomy+patch.diff, lever bars, patch.diff). 1222.5 has the residual problem in #7.
- **Ending:** it works as an ending. The viewer gets "Enter the competition", the full competition name on Kaggle, the deadline, and three concrete first builds. The weak link is the tree and arrow bug in #1, which falls exactly on "what you build".

VERDICT: one more pass
