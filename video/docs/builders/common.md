# Builder brief (shared by all chapter builders)

You build chapters of a 24-minute, 3Blue1Brown-style explainer film about the Kaggle "Google – The Gemma 4 Developer Agent Competition", for AI research engineers who will enter it. Everything is code: one HTML page, one paused gsap timeline, three.js for 3D, rendered frame by frame.

Project root: /home/user/Gemma-4/video. Read, in order:
1. docs/engine.md — the authoring API and the rules (READ FULLY).
2. docs/handoffs.md — exact states of carried objects at chapter boundaries.
3. docs/brief.md — colour meanings, recurring objects, signature moments.
4. docs/facts.md — the ONLY source of claims. Every number, name or claim on screen must come from it; examples/derived values/concepts carry a visible tag ("illustrative", "concept", "derived", "simplified", "hypothesis").
5. docs/storyboard.md — find your chapters' tables. Each row = one composition: beats, on screen, purpose, how it leaves, carried object. Your chapter's total beats must equal the storyboard total EXACTLY (see the table at the top).
6. lib/kit.js, lib/draw.js, lib/engine.js (read, don't edit), and scenes/ch00_open.js as a worked example of the style.

Rules
- Files: write only scenes/chNN_<short>.js (one per chapter; NN two digits) and, if you need chapter-local drawings, define them inside that file as DRAW.cNN_name. Element ids prefixed cNN_ except the shared carried ids listed in engine.md. Do NOT edit lib/*, film.html, scenes/order.json, tools/*, docs/* (except your report). If you need an engine change, describe it in your report.
- Each chapter file begins with F.chapter(K.CH[N]) and its first comp switches nothing (the previous chapter's last comp already switched the rail via `rail: { ver: N }`). Your LAST comp in chapter N must include `rail: { ver: N+1 }` (except ch17), and leave the hand-off object exactly per handoffs.md. Your FIRST comp must contain the incoming hand-off object with its full spec, plus `...K.rail(N)` so it works standalone.
- Motion principles: the front object becomes the transition; one carried object keeps identity; one lead movement with layered smaller ones; land slowly (expo/power3.out), leave fast (power2/3.in), never linear (except flows); cuts (`cut: true`) only when size/direction/subject match; every action has a visible result; big words enter from opposite sides, plate behind text over busy pictures; vary scale, never repeat a layout for long.
- Frame never frozen: every composition must contain its own motion (an entry, a morph, a counter, a travelling pulse, a param tween across the comp). No still stretch > 0.5 s. Long (4–4.5 beat) comps need a second, layered action inside (use `at:` offsets).
- The main subject fills the frame: no small cards floating in empty space; body text ≥ 40 px, small caps ≥ 24 px; use the camera (`cam: {x,y,s}`) to frame tightly. Text never collides with other text (check stills!).
- 3D only for physical/spatial things; HTML labels only (positioned from window.ANCHORS via F.hook).
- sfx only on real on-screen actions: `sfx: [{at, kind:'click'|'tick'|'pop'}]`; `cut: true` only on real scene changes (whole beats).
- No timers, no Math.random (seeded helpers only if needed); everything a function of timeline time.
- Contrast: use only the palette in TOK (all text colours pass 4.5:1 on the background).

Testing (the machine has 4 CPUs shared by 5 builders — keep renders small):
  cd /home/user/Gemma-4/video
  node tools/render.mjs --scenes chNN_x.js --still 0,1.5,3,... --stilldir out/stills/chNN   # prints 'duration'
  Look at the stills (Read the PNGs, or tile them with PIL into one sheet) for collisions, empty frames, small subjects, clipped text.
  Optionally one short clip with --workers 1 --from A --to B.
The duration printed must equal (chapter beats × 0.75) s. Check the browser didn't throw (render prints errors).

Do not judge the chapter "done" on taste: a separate critic reviews it. Your job: faithful to the storyboard, technically clean (no errors, exact totals, exact hand-offs, no collisions, no frozen comps).

Report back (concise): files written, per-chapter duration, deviations from the storyboard and why, any engine/kit change you need, and anything you could not do.
