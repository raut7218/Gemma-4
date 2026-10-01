# Chapter hand-offs (exact states)

At every boundary, the LAST comp of chapter N must leave the carried object exactly in the state below, and the FIRST comp of chapter N+1 must list it with exactly the same spec (the engine merges it when carried in, creates it in a standalone test). Use `drift: 0` and `cam: {x: 960, y: 540, s: 1}` on the last comp of a chapter and the first comp of the next unless a camera state is given here, so world pixels equal screen pixels at the cut. The RAIL switches inside the last comp: `rail: { ver: N+1 }`.

Shared constants: `GRID120 = { cols: 12, rows: 10, cw: 112, ch: 64, gap: 14 }` centred at (960, 500); `GRID129 = { cols: 13, rows: 10, cw: 100, ch: 58, gap: 12, count: 129 }` centred at (960, 520); gold cell of the 120-grid: index 55.

| boundary | carried object | exact state at the cut |
|---|---|---|
| 0 → 1 | `rail` (HUD) | `K.rail(1)` — x 96, y 66, size 27, ver 1. Nothing else on screen. |
| 1 → 2 | `grid` | `{type:'canvas', draw:'grid', x:960, y:500, params:{...GRID120, reveal:1, gold:55, goldGlow:1, dim:0, sweep:0, split:0}}`; camera `{x: cellX(55), y: cellY(55), s: 6}` (use `DRAW.gridCell(55, {w:1920,h:1080}, GRID120, 960, 500)`), drift 0. |
| 2 → 3 | `calendar` | `{type:'canvas', draw:'calendar', x:960, y:540, spans:[], params:{x:210, y:560, w:1500, draw:1, dot:-1}}`. |
| 3 → 4 | `oneopen` | `{type:'text', html:'One open model.', size:120, x:960, y:540, color:T.INK}`; ch4's first comp removes it with `'zoom'` while the 3D rig enters `'behind'`. |
| 4 → 5 | `tape` | `{type:'canvas', draw:'tape', x:960, y:540, params:{x:160, y:540, w:1600, h:86, first:0, n:0, ticks:0, sliver:1, crack:0}}`. |
| 5 → 6 | `loop` | `{type:'canvas', draw:'loop', x:960, y:540, params:{cx:960, cy:560, r:240, draw:1, labels:1, ring:1, dot:-1, exit:0, hi:-1}}`. |
| 6 → 7 | `contA` (+`contA_hd`, `contA_ht`) | `K.container('contA', 'A', {x:960, y:560, w:900, h:640})`. |
| 7 → 8 | `contA` | `K.container('contA', 'A', {x:960, y:560, w:620, h:760})` — becomes the centre panel. |
| 8 → 9 | `loop` | `{type:'canvas', draw:'loop', x:960, y:540, params:{cx:960, cy:540, r:300, draw:1, labels:1, ring:0, dot:-1, exit:0, hi:-1}}`. |
| 9 → 10 | `grid` | `{type:'canvas', draw:'grid', x:960, y:540, params:{...GRID129, reveal:1, gold:-1, dim:0.5, sweep:0, split:0}}` (ch10 colours it by repository). |
| 10 → 11 | `zip` | `{type:'box', w:360, h:270, x:960, y:540, stroke:T.GOLD, fill:'rgba(240,172,95,0.08)', rad:26, html:'<span class="m" style="color:#F0AC5F">.zip</span>', size:60}`. |
| 11 → 12 | `loop` | `{type:'canvas', draw:'loop', x:960, y:540, params:{cx:420, cy:500, r:170, draw:1, labels:1, ring:0, dot:-1, exit:0, hi:-1}}`. |
| 12 → 13 | `loop` | same object, `params:{cx:960, cy:560, r:200, draw:1, labels:1, ring:0, dot:-1, exit:0, hi:-1}`. |
| 13 → 14 | `rail` only | the scene clears for a full-frame sentence. |
| 14 → 15 | `chip` | `K.chip('chip', {x:960, y:220, s:1.2})`. |
| 15 → 16 | `spool` | `{type:'box', w:220, h:220, x:1640, y:850, stroke:T.GREEN, rad:110, fill:'rgba(131,193,103,0.10)', html:'<span class="cap" style="font-size:0.5em;color:#83C167">SFT data</span>', size:40}`. |
| 16 → 17 | `chip` | `K.chip('chip', {x:960, y:540, s:1.6})`. |
