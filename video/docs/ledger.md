# Critic ledger

Every round: what a fresh critic found, what changed, and the numbers before and after.
Critics never see the building or the builder's beliefs; each pulls its own evidence.

## Round 1 — storyboard v1 (563 comps, 24:00) — verdict: one more pass

Found (ranked):
1. ~20 on-screen claims not in facts.md (URL, "private half decides", "descriptions not editable", "dependencies preinstalled", "nudges", "20–25 tool calls", "plan for Gemma-only pipeline", frontier-column rows, etc.).
2. Signature moment "tape overflow" doesn't add up to scale (3.5k + 20×1.3k < 32,768).
3. 15 chapters vs a 12-chapter brief; wrong chapter numbers on screen; ch4 content filed under ch3.
4. "leaves" column empty in 525/563 rows; "carries" empty in 79.
5. Slide-deck grammar: 58 caption rows, 39 FULL cards, many heading-over-list layouts.
6. Ch1 tail (~50 s) is filler.
7. Monotony stretches at 22:15–23:20, 19:11–20:05, 13:41–15:27, 15:36–16:07, 16:39–17:24, 17:55–18:53, 10:34–11:30, 5:24–6:27, 8:05–8:22.
8. Arbitrary morph carries (32k→gauge→ring→dots, meters→container, bars→folders, bars→zip, arrows→shelf→slots).
9. Actions without results / wrong order (#8 green before pytest; #277 contradicts free tools; #426 contradicts skills).
10. Sound-off issues: container A unnamed; verifier taught twice; dense text too short; missing 300 s vs 6 min, "2 final selections", hints.
11. Pacing 11.7/30 s, metronomic 2.25/3.0 s.
12. 3D: ch4 bounces 2D/3D; invented container layers; container silhouette inconsistent; 3D strip unjustified.
13. Signature moments: 4 named, none marked.
14. Amber not in palette; yellow misused; leaked draft text; small floating cards.

Changed: storyboard v2 (see below).

## Round 2 — storyboard v2 (580 comps, 24:00, 18 chapters) — verdict: one more pass

Status of round-1 items: 2 tape arithmetic FIXED; 13 signature moments FIXED; 1, 3, 4, 5, 6, 8, 9, 10, 12, 14 PARTLY FIXED; 7 monotony STILL THERE (moved); 11 pacing STILL THERE.
Measured: 12.1 comps/30 s; 17/48 windows below 12; only three durations (1.5/2.25/3.0 s; 61% at 3.0); longest run of 3.0 s comps = 30 (#522–551); 153 boilerplate "leaves"; 188 "(cont.)" purposes; 34 "label beside it" rows.
New problems (ranked): (1) the final 4.5 min is a slide deck (readings ×22, levers/weeks/questions, recap pairs); (2) on-screen errors: "14 chapter names", "12 Nov → 25 Nov paper first", get_status "meters don't drop", "≈6 min" without caveat, "49%" without model, sources line incomplete, 8-line file read as 12 lines, "150-line chunks" on an 8-line file, #85 contradiction, #482 contradiction; (3) unlabelled facts/concepts ("rotate", flywheel, remedies, counter past 20, HTTPAdapter, "7B → 42%", hidden tests lighting green on illustrative runs); (4) dense text too short; (5) mechanical splits that don't work as shots; (6) redundant teaching (grey cells ×5, caps ×2, verifier ×3, score ×2, 31 lines before data chapter); (7) arbitrary carries (calendar→model, chart→grid, vessels→slots, rows→tree, chip turns purple, cycle→cards, axes→container); (8) 18 chapters cost ~80 s of rail; ch14/15/9 thin, ch17 overloaded; (9) rhythm; (10) colour misuse (+ line green, yellow dots); (11) 3D: loop as light ring, label method unstated, ch7 angles; (12) order: reading pile before week bands, "Verified" unexplained, dated week plan.

Also found by builder tests (not by the critic): engine bug — elements present in frame one had their params object replaced, so 3D params never animated; fixed in engine.js (rig test now animates). Engine bug — wipe/draw entries never returned to the default value; fixed (text now reveals).

Changed for round 3 (storyboard v3): rewritten from scratch with explicit exits; staged run folded into "What you need to build"; readings attached to the levers they inform; new chapters "Your local evaluation", "What your prompt has to teach", "Skills, sub-agents and notes", "The paper track", "Recap"; step-by-step maths added (720 ÷ 120, token fractions, overflow sum, 4-bit levels, TP blocks, LoRA toy product); all round-2 factual items corrected (17→20 ticks rail, paper window, get_status, caveats, 49% attributed, sources line, 8-line view of a longer file, read_file on large files); colour fixes (+ line gold, agent dot blue); 3D loop ring now a 2D overlay; 3D camera angles pinned. Reading beats (named re-framings of a key term) added to dense rows so text has time to land at ≥12 comps/30 s. Numbers: 584 comps, 24:00.00, 12.2 comps/30 s, six durations (1.5–3.375 s), chapter starts on whole beats.

## Round 3 — storyboard v3 (584 comps, 24:00, 20 chapters) — verdict: one more pass

Round-2 items: 3D FIXED; order FIXED; 1, 2, 3, 4, 6, 7, 9, 10 PARTLY FIXED; 5 (mechanical splits) and 8 (chapter count/thin chapters) STILL THERE.
Main finding: 189 "reading beats" (32% of comps, 6:55) are template continuations, not compositions — real rate ≈ 8.2 comps/30 s; strict 4-template rotation; metronomic 3.375 + 2.25 s couplets; several on weak targets (rail names, disclaimers, "0").
Other: "17 chapters/ticks" on screen vs 20 chapters; last 3 min still slide-like; dense rows still 1.5–2.25 s (#193 sum, #164, #387 YAML, #386/#391 agent types, #183 strips, #262, #313–314); redundancies (/tmp ×5, grey cells ×4, diff graded ×3, prizes ×2, score ×2); labels (SWE-Protégé metric, ≈70 derived, flags as suggestion, rank-16 as first experiment, final chip green, #323); missing "what to build first" before the CTA; parsers and lower-thinking advice missing; arbitrary carries (#134, #335, #379, #425, #495, #516); no signature peak after 7:49; colour (gold verdict cell, green "good fit", yellow input bar); R06 code before codes exist; R10 on the wrong lever; 9 calls vs 8 tool names; brand hex values for 3D undefined.

## Round 4 — storyboard v4 (578 comps, 24:00, 17 chapters + cold open) — verdict: one more pass

Round-3 items: chapter count FIXED; build-first trio FIXED; parsers/thinking advice FIXED; colour (3 items) FIXED; R10 lever FIXED; 9 calls FIXED; brand 3D values FIXED; reading beats, weak targets, dense rows, redundancy, labels, carries, R-codes PARTLY FIXED; last 3 min slide-like and no late peak STILL THERE.
Measured: 12.0 comps/30 s nominal; ≈9.6 "real" (excluding reading beats and split halves); 20/48 windows < 12; 11 × 3.375 s run in the recap.
New: tensor-parallel maths wrong (column split with the same x); table pipe bug (#71) and a lighting spec written as a shot (#125); 6 rail-only rows, 7 disclaimer-only rows; 20 weak split pairs; honesty tags (cold-open tests green without "illustrative", "Agent Development Kit" not in facts, graph "concept", "localize → repair → validate", mini-swe-agent sentence, "separate competition"); colours (repos in semantic colours, thinking purple = training, purple paper window, underline colour); 3D floating parts (lifted slab, hovering B/A sheets), no plate behind 2D maths over 3D, "2D view" of the rig; forced hand-offs 9→10, 10→11, 16→17.

Decision: targeted v5 pass fixing every concrete item above, then build. Remaining pacing concerns are addressed in the build (every composition gets its own action) and judged by critics on the rendered components and the full film.

## v5 storyboard pass (targeted fixes of every round-4 item)
- Tensor-parallel maths now row blocks with stacked outputs (tag "simplified"); slab divides in place (no floating).
- B·A shown in a 2D inset; the product is a purple film lying on the slab (not floating sheets).
- Pipe bug in the leaderboard row fixed; lighting row rewritten (key + rim, 40° camera).
- Weak split pairs merged; disclaimer-only rows folded into corner tags on the previous row and replaced by action rows (stopwatch for "3 turns without a tool call", size meter for "under 3 GiB").
- Kept as is (with reason): "lever 1 — first experiment" row has its own action (grey cells drop out); "RL comes after SFT" row carries the ch15→16 hand-off.
- Honesty tags added (concept/suggested/simplified); neutral repository colours; periwinkle THINK for thinking.
- Balance in ch13 tips to the plain LOOP, which carries into ch14.
- Fitted: 541 comps, 24:00.00, 11.3 comps/30 s (the build adds a sub-action inside every 4.5-beat comp so motion density exceeds the comp count).

## Component critic — ch00 Cold open (render 1) — VERDICT: one more pass
1 exit0 lift-off glitch (duplicate text, warped bars, stray edge, clipped type) · 2 exit 0 never fills frame · 3 chip collides with exit 0 · 4 17 s static container layout, timing drift · 5 no "illustrative" tag on tests · 6 title flies through "One open model." · 7 title over full-bright grid and chip · 8 text over lock pattern 63–81 s · 9 "THE BUG" flies through code · 10 fold is shrink+crossfade · 11 small card in empty space 3.8–5.8 · 12 code tab crowds top · 13 grid label at bottom edge · 14 colour meaning (bugs gold, red year) · 15 rail hand-off tick lost.

## Component critics — round 1
- ch06: one more pass (10 items) — docs/critic/ch06_r1.md
- ch10: one more pass (10 items) — docs/critic/ch10_r1.md
- Engine fix from ch10 #1/#2: push beats centre on the element's visual centre (anchor-aware), scale 1.22, 70% travel; the HUD rail fades during push beats and returns after.
- ch10 round-1 fixes applied by a fixer agent (all 10 items; zip hand-off enlarged to w 360 h 270, ch11 and handoffs.md updated). Awaiting re-check by a new critic on the film render.
- ch06 round-1 fixes applied by a fixer agent (all 10 items; terminal id collision c06_t2 was the ghost's cause). Awaiting re-check on the film render.

## Film critic — chapters 0–3, round 1 — one more pass (16 items + ch00 re-check: 9 fixed, 3 partly, 3 not) — docs/critic/f00_03_r1.md
- ch00 fixes for re-check items 2 (exit 0 now ~83% of frame width), 10 (lines converge onto one row and the chip grows out of them), 12 (camera lowered ~30 px on the code panel).
- ch01 fixes for film round 1 items 2, 3, 4/5, 6, 12, 15, 16 applied by a fixer agent (literal 'multiplies into a row' not built: grid grows around the card).
- ch02/ch03 fixes for film round 1 items 1, 4, 7, 8, 9, 10, 11, 13, 14 applied by a fixer agent. Engine: exit stagger capped at 0.15 s (many simultaneous exits had trailed up to 0.7 s).

## Film critic — chapters 4–6, round 1 — one more pass (15 items; ch06_r1: 6 fixed, 3 partly, 1 not) — docs/critic/f04_06_r1.md
- ch05/ch06 fixes for film round 1 items 1, 4, 5, 6, 7, 8, 11, 12, 13 applied by a fixer agent. Engine: morph stagger now counts only changed elements, capped at 0.3 s (it had counted every element on stage, delaying morphs by up to ~1.5 s).
- ch04 fixes for film round 1 items 2, 3, 9, 10, 14, 15 applied by a fixer agent (cards rebuilt and seated, plinth 1.25× footprint, rim light, plate morphs into the slab, slab ΔE 4.0–5.3). Its tape pre-roll (ticks 0.14 at the cut) was reverted because ch5 now moves the tape from its own first frame.

## Film critic — chapters 7–9, round 1 — one more pass (15 items) — docs/critic/f07_09_r1.md
- Kit: the chapter rail now sits on an opaque background-colour plate (HUD layer), so moving content can never show through it.

## Film critic — chapters 10–12, round 1 — one more pass (10 items; ch10_r1: 5 fixed, 4 partly, 1 not) — docs/critic/f10_12_r1.md
- Engine: push reading beats made gentler (×1.12, 50% travel) — three critics found pushes cropping content at frame edges.
- ch08/ch09 fixes for film round 1 items 1, 4, 5, 10, 11, 15 applied by a fixer agent. Engine: fill 'none' was parsed as hex and drawn black (the ch9 'black crack'); now transparent.
- ch10 round-2 fixes applied (false 'pass' eliminated — verified by probes every 0.1 s in forward and reverse seek order; subjects scaled to fill the frame; carried bars→bundle; zip close no longer alone).
- ch11/ch12 fixes for film round 1 items 2–8, 10 applied by a fixer agent (six slots open out of the scaffold onto ch13's exact pixels — 0-pixel difference across the cut; year cards fly to their ticks; ch12 loop enlarged).

## Film critic — chapters 13–17, round 1 — one more pass (15 items; honesty clean) — docs/critic/f13_17_r1.md
- ch13/ch14 fixes for film round 1 items 2, 3, 11, 12, 13 applied by a fixer agent.
- ch15/16/17 fixes for film round 1 items 1, 4–10, 14, 15 applied by a fixer agent (full seven-file tree; end frame holds ~3.8 s; rail-tick beat folded into the deadline comp; Q2→eval_config.yaml and Q6→adapters/ are our reading of F70 — the questions stay tagged 'hypotheses').
