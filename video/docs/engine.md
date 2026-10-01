# Builder's guide

The film is one HTML page (`film.html`) animated on one paused gsap timeline. Scenes are plain JS files in `scenes/` that append compositions to that timeline. Every frame depends only on time t; the renderer seeks t and screenshots.

## Files you may touch
- Your own chapter file(s): `scenes/chNN_<name>.js` (and `scenes/chNN_*.mjs` for 3D modules). Prefix every element id you create with `cNN_` (e.g. `c05_label`) unless it is a shared carried object (below).
- Never edit `lib/*` (engine, kit, draw, tokens, style). If you need a shared change, write it in your report.
- You may add chapter-local drawing functions inside your chapter file: `DRAW.cNN_myDrawing = (ctx, p, spec, t) => {...}`.

## Authoring API
```js
F.chapter('The 32k context window');     // marks a chapter start (call once, first)
F.comp(beats, delta, opts);               // appends one composition at the cursor
```
- `beats`: 0.75 s each at 80 BPM; half beats allowed (2, 2.5, 3, 3.5, 4, 4.5). Your chapter's total must equal its storyboard total exactly.
- `delta` is merged onto the previous composition:
  - `{id: {...spec}}` adds an element, or updates one already on screen (the update merges onto its last state; tweened smoothly).
  - `{id: null}` removes it with a quick fade; `{id: 'left'|'right'|'up'|'down'|'zoom'|'shrink'|'fade'|'quick'|'undraw'}` removes it with that exit.
- `opts`: `cam: {x, y, s, r}` (world point at the screen centre, scale) persists until changed; `drift: 0..1` (default 1, the slow camera drift that keeps the frame alive — set 0 only for exact pixel hand-offs); `clear: true` removes everything not in the delta (`keep: [ids]` survive); `cut: true` marks a real scene change (gets a whoosh; must start on a whole beat); `sfx: [{at, kind: 'click'|'tick'|'pop'}]` for real on-screen actions only; `stagger` (s between entries, default 0.11).

### Element spec (common)
`type`: `text` | `mono` | `box` | `rect` | `num` | `arrow` | `path` | `canvas` | `three`
`x, y` (centre, stage px; `ax/ay` anchor 0..1 to anchor by the left/top), `s` scale, `r` rotation°, `o` opacity, `color`, `z`, `hud` (true = fixed to screen, not moved by camera).
Entry: `in`: `wipe` (3B1B-style write-on for text), `rise`, `fade`, `left`, `right`, `up`, `down`, `scale`, `pop`, `zoom` (arrives from in front), `behind`, `draw` (strokes), `grow`/`growh` (rect width/height), `count` (num from 0), `none`. `at` (s after comp start), `dur`, `ease`, `from: {...}` (override start values).
Versions: `versions: [html0, html1, ...]` and `ver: n` crossfades text in place (`ver` can be tweened between comps).

- `text`: `html`, `size` (px), `weight`, `font` ('serif' | 'mono' | 'sans' | 'ital'), `align`, `maxw`, `lh`.
- `mono`: same, monospace (`white-space: pre`).
- `box`: rounded rectangle drawn as a stroke + fill, with optional html inside: `w, h, stroke, fill, sw, rad, draw (0..1), html/versions, size`.
- `rect`: filled rectangle (`w, h, fill, rad`) — bars, plates, highlights.
- `num`: animated number: `val, dec, pre, suf, size, comma` — `in: 'count'` counts up from 0.
- `arrow`: `x1, y1, x2, y2, bend, sw, head, draw, color`, `flow` (≥0 shows a travelling pulse; tween it 0→N), `dashed`.
- `canvas`: procedural drawing: `draw: 'name'` (a function in `DRAW`), `params: {...}` (ONLY scalar numbers — arrays/objects in params break the tween; put static structure on the spec itself and read it from the 3rd argument), `w, h` (default full stage), `pdur`, `pease` (duration/ease of the params tween; default = the comp duration).
- `three`: 3D module from `THREE_SCENES[scene]` (see `scenes/three_rig.mjs`): `params` scalars, labels published to `window.ANCHORS` each frame; position HTML labels from anchors with `F.hook((t) => { ... set FILM.EL[id].proxy.x/y ... })`.

## Shared kit (`lib/kit.js`, global `K`)
`K.rail(i)`, `K.chip(id, o)`, `K.issue(id, o)`, `K.code(id, lines, o)`, `K.box(id, html, o)`, `K.big(id, html, o)`, `K.line(id, html, o)`, `K.label(id, html, o)`, `K.arrow(id, x1, y1, x2, y2, o)`, `K.canvas(id, draw, params, o)`, `K.file(id, name, lines, o)`, `K.container(id, 'A'|'B', o)`, `K.tree(id, o)`, `K.CH` (chapter names).

## Shared drawings (`lib/draw.js`, global `DRAW`)
`grid` (task cells; `DRAW.gridCell(i, ...)` gives a cell centre), `loop` (the agent LOOP: `cx, cy, r, draw, labels, dot, exit, hi, hiA, ring, stopped`; `DRAW.loopGeom(p)` gives node positions), `tape` (the context TAPE: `x, y, w, h, first, n, sliver, short, think, crack, ticks, edgeGlow`; `DRAW.tapeEnd(p)`; constants `DRAW.TAPE`), `ruler` (6-minute ruler; `blocks` on the spec), `clock` (12 hours; `slices, pull, unroll`), `calendar` (23 Sep–2 Dec; `spans` on the spec, `span0..` params; `DRAW.calX(p, dateUTC)`), `meters` (`v0, v1, v2`), helpers `DRAW.text`, `DRAW.polyline`, `DRAW.arrowHead`, `DRAW.rgba`.

## Shared carried objects (global ids — same id across chapters)
`rail` (HUD chapter tag; switch with `rail: { ver: N }` inside your hand-off comp), `chip` (gold patch.diff), `grid`, `loop`, `tape`, `tree`, `contA`/`contB` (+ `_hd`, `_ht` parts), `calendar`, `rig` (3D chapter-4 rig).
Your chapter's FIRST comp must include the object handed in from the previous chapter with the exact state given in `docs/handoffs.md`, and your LAST comp must leave the object handed out in the state given there. Use the full spec in the first comp (the engine merges it if the object is already on screen, and creates it in your standalone test).

## Colour meaning (never break)
BLUE model/agent · TEAL tools · GOLD the patch · GREEN tests/passing · RED limits/failure · YELLOW key numbers only · PURPLE training/LoRA · DIM secondary text. Use `T.*` from `TOK`.

## Quality rules (the critic measures these)
1. Frame never frozen: no still stretch > 0.5 s. The camera drift helps, but every comp must also have its own motion (entries, a morph, a counter, a travelling pulse, a slow param tween across the comp).
2. Things land slowly (expo/power3 out), leave fast (power2/3 in); no linear motion except continuous flows.
3. The main subject fills most of the frame — no small cards floating in empty space. Text ≥ 40 px for body, ≥ 24 px for small caps labels.
4. Text never collides with or flies through other text; text over busy pictures sits on a plate (`<span class="plate">`).
5. All on-screen claims come from `docs/facts.md`; examples/concepts/derived values carry their tag ("illustrative", "concept", "example", "derived", "hypothesis").
6. Every action shows a result (a call → its output; a check → a verdict).
7. Vary scale (close / wide / overhead / full-frame type); don't repeat one layout for long.
8. 3D: only physical/spatial; key light from one side + rim behind; camera 35–55°; HTML labels only.

## Testing your chapter
```bash
node tools/render.mjs --scenes chNN_name.js --still 1,2.5,4 --stilldir out/stills/chNN     # stills (seconds from your chapter start)
node tools/render.mjs --scenes chNN_name.js --out out/chNN.mp4 --workers 4                 # a clip
python3 tools/sheet.py out/chNN.mp4 out/sheets/chNN.png                                    # contact sheet every 0.5 s
python3 tools/qa.py out/chNN.mp4                                                           # frozen-frame + motion report
```
If your chapter uses a 3D module, list it first: `--scenes three_rig.mjs,ch04_model.js`.

## Reading beats
`F.beat(beats, {id, mode: 'push' | 'underline', w, dy, under, color, scale})` — a reading beat on an element that is already on screen. `push` moves the camera onto it (×1.28) and lifts it slightly; `underline` grows a rule of width `w` px under it (`under` = offset below its centre, default 0.72 × its size). The next comp clears the underline and returns the camera automatically. Use them only where the storyboard has a "reading beat" row.

## Frame one
Elements in the film's first comp are set finished at t = 0. Give one an explicit `from: {...}` (e.g. `from: {o: 1, s: 0.94}`) to start it in that finished-looking state and settle it over `dur` (power2.out) so the first second is not frozen.
