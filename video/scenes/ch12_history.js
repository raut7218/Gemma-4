// Chapter 12 — How coding agents got here (storyboard v5 rows 406–432, 108 beats).
// Every name, date and number on screen is from docs/facts.md (F57, F60, F68, F77, F80, F89, F90).
(function () {
  const { T } = F;
  const c = F.comp.bind(F);
  F.chapter(K.CH[12]);

  const cap = (s, col) => `<span class="cap" style="font-size:1em${col ? ';color:' + col : ''}">${s}</span>`;
  const tagC = '<span class="cap" style="font-size:0.5em;color:#F4D35E">concept</span>';
  const Y = (s) => `<span class="c-yellow">${s}</span>`;
  const E = [380, 700, 1020, 1340, 1620];         // x of each era on the axis (and of the loop in that era)
  const YEARS = ['2021–22', '2023', '2024', '2025', '2026'];
  const AX_Y = 965, LCY = 450, LR = 170;
  const LOOP = (o) => Object.assign({ cx: 420, cy: 500, r: 170, draw: 1, labels: 1, ring: 0, dot: -1, exit: 0, hi: -1, hiA: 0 }, o);
  const LE = (k, o) => LOOP(Object.assign({ cx: E[k], cy: LCY, r: LR }, o));

  // ---------------------------------------------------------------- chapter-local drawings
  // the time axis: draw 0..1, era (float index of the lit year), a
  DRAW.c12_axis = (ctx, p) => {
    const { clamp, ease } = DRAW.util;
    ctx.save(); ctx.globalAlpha *= p.a ?? 1;
    DRAW.polyline(ctx, [[160, AX_Y], [1800, AX_Y]], ease(clamp(p.draw || 0)), { color: DRAW.rgba(T.INK, 0.8), w: 3 });
    E.forEach((x, i) => {
      const k = clamp((p.draw || 0) * 5 - i * 0.8);
      if (k <= 0) return;
      const lit = clamp(1 - Math.abs((p.era ?? -1) - i));
      ctx.strokeStyle = DRAW.rgba(T.INK, k * (0.5 + 0.5 * lit)); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, AX_Y - 12 - 8 * lit); ctx.lineTo(x, AX_Y + 12 + 8 * lit); ctx.stroke();
      DRAW.text(ctx, YEARS[i], x, AX_Y + 48, { size: 32 + 8 * lit, color: lit > 0.5 ? T.INK : T.DIM, a: k });
    });
    if ((p.era ?? -1) >= 0) {
      const f = clamp(p.era, 0, 4), i0 = Math.floor(f), i1 = Math.min(4, i0 + 1);
      const x = E[i0] + (E[i1] - E[i0]) * (f - i0);
      ctx.beginPath(); ctx.arc(x, AX_Y, 10, 0, Math.PI * 2); ctx.fillStyle = T.BLUE; ctx.fill();
    }
    ctx.restore();
  };
  // the ornate 2024 tool ring: g 0..1 grows a large ring of tiles around the loop; col 0..1 collapses
  // them into two tiles beside the call node. cx, cy follow the loop.
  DRAW.c12_orn = (ctx, p) => {
    const { clamp, ease, rr } = DRAW.util;
    const N = 18, cx = p.cx, cy = p.cy, R = 300, g = ease(clamp(p.g || 0)), cl = ease(clamp(p.col || 0));
    if (g <= 0) return;
    ctx.save();
    ctx.strokeStyle = DRAW.rgba(T.TEAL, 0.35 * g * (1 - cl)); ctx.lineWidth = 2; ctx.setLineDash([6, 10]);
    ctx.beginPath(); ctx.arc(cx, cy, R * (0.7 + 0.3 * g), 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    for (let i = 0; i < N; i++) {
      const k = clamp(g * N * 1.3 - i * 1.0 + 1);
      if (k <= 0) continue;
      const a = -Math.PI / 2 + (i / N) * Math.PI * 2, r = R * (0.7 + 0.3 * ease(clamp(k)));
      let x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.92;
      const keep = i === 4 || i === 5;
      const tx = cx + 290, ty = cy + (i === 4 ? 30 : 110);
      x += (tx - x) * cl; y += (ty - y) * cl;
      const al = clamp(k) * (keep ? 1 : 1 - cl);
      if (al <= 0) continue;
      const s = 14 + 6 * Math.sin(i * 1.7) * (1 - cl);
      ctx.globalAlpha = al;
      rr(ctx, x - s, y - s, s * 2, s * 2, 6); ctx.fillStyle = DRAW.rgba(T.TEAL, 0.85); ctx.fill();
      if (!keep && cl < 0.5) { ctx.strokeStyle = DRAW.rgba(T.TEAL, 0.5 * (1 - cl * 2)); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, s + 9, 0, Math.PI * 2); ctx.stroke(); }
    }
    ctx.restore();
  };
  // three vessels: prompt · scaffold · weights. rise 0..1, p01 / p12 pours (0..1), lit (weights glow), open (scaffold walls unfold)
  const V = [{ x: 300, w: 340, h: 380 }, { x: 960, w: 660, h: 560 }, { x: 1620, w: 340, h: 380 }];
  const VB = 860;
  DRAW.c12_vessels = (ctx, p) => {
    const { clamp, ease } = DRAW.util;
    const rise = ease(clamp(p.rise || 0)), op = ease(clamp(p.open || 0));
    const fill = [1 - 0.55 * clamp(p.p01 || 0), 0.15 + 0.6 * clamp(p.p01 || 0) - 0.45 * clamp(p.p12 || 0), 0.1 + 0.75 * clamp(p.p12 || 0)];
    V.forEach((v, i) => {
      const dy = (1 - rise) * 160, top = VB - v.h + dy, bot = VB + dy;
      const a = rise * (i === 1 ? 1 - op : 1 - 0.0 * op) * (p.a ?? 1);
      if (a <= 0) return;
      ctx.save(); ctx.globalAlpha = a;
      // the light inside
      const lv = clamp(fill[i]), lt = bot - (v.h - 20) * lv;
      const glow = i === 2 ? 0.25 + 0.5 * clamp(p.lit || 0) : 0.28;
      ctx.fillStyle = DRAW.rgba(i === 2 ? T.PURPLE : T.YELLOW, glow);
      ctx.beginPath(); ctx.roundRect(v.x - v.w / 2 + 8, lt, v.w - 16, bot - lt - 8, 14); ctx.fill();
      // the walls (U shape); the scaffold's walls fold outward when it opens
      const wx = (v.w / 2) * (1 + (i === 1 ? op * 0.6 : 0));
      ctx.strokeStyle = i === 2 && (p.lit || 0) > 0 ? DRAW.rgba(T.PURPLE, 0.6 + 0.4 * p.lit) : DRAW.rgba(T.INK, 0.85); ctx.lineWidth = 4; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(v.x - wx, top); ctx.lineTo(v.x - v.w / 2, bot); ctx.lineTo(v.x + v.w / 2, bot); ctx.lineTo(v.x + wx, top); ctx.stroke();
      ctx.restore();
      DRAW.text(ctx, ['prompt', 'scaffold', 'weights'][i], v.x, bot + 44, { size: 40, color: i === 2 && (p.lit || 0) > 0.5 ? T.PURPLE : T.INK, a });
    });
    // pours: an arc of light from one lip to the next
    [[0, 1, p.p01], [1, 2, p.p12]].forEach(([a, b, k]) => {
      k = clamp(k || 0); if (k <= 0 || k >= 1) return;
      const x0 = V[a].x + V[a].w / 2 - 10, y0 = VB - V[a].h, x1 = V[b].x - V[b].w / 2 + 40, y1 = VB - V[b].h + 40;
      const pts = []; for (let j = 0; j <= 30; j++) { const s = j / 30; pts.push([x0 + (x1 - x0) * s, y0 + (y1 - y0) * s - Math.sin(Math.PI * s) * 160]); }
      const head = clamp(k * 1.6), tail = clamp(k * 1.6 - 0.6);
      const seg = pts.slice(Math.floor(tail * 30), Math.max(Math.floor(tail * 30) + 2, Math.ceil(head * 30) + 1));
      DRAW.polyline(ctx, seg, 1, { color: b === 2 ? T.PURPLE : T.YELLOW, w: 10 });
    });
  };

  // ================================================================ compositions
  const L_ID = [];       // labels currently on screen, cleared at each era change
  const clearLabels = (style = 'up') => { const o = {}; L_ID.splice(0).forEach((k) => { o[k] = style; }); return o; };
  const lab = (id, html, x, y, o = {}) => { L_ID.push(id); return { [id]: Object.assign({ type: 'text', html, size: 44, maxw: 760, lh: 1.25, x, y, in: 'wipe' }, o) }; };
  const BIG = (id, yr, from) => ({ [id]: { type: 'text', html: yr, size: 330, x: 960, y: 470, in: from, at: 0.4, z: 20 } });
  const settle = (id, k) => ({ [id]: { s: 0.5, o: 0, dur: 0.45, ease: 'power2.in' } });
  const DIMS = (ids, o) => Object.fromEntries(ids.map((k) => [k, { o, dur: 0.6 }]));

  // 406 (4) — WIDE a time axis 2021 → 2026 draws along the bottom
  c(4, {
    ...K.rail(12),
    loop: { type: 'canvas', draw: 'loop', x: 960, y: 540, params: LOOP() },
    c12_axis: { type: 'canvas', draw: 'c12_axis', in: 'fade', dur: 0.2, params: { draw: 1, era: -1, a: 1 }, paramsFrom: { draw: 0 }, pdur: 2.6, pease: 'power2.inOut' },
  }, { cam: { x: 960, y: 540, s: 1 }, drift: 0.6 });
  // 407 (4.5) — the LOOP sits at 2021–22: ReAct
  c(4.5, {
    loop: { params: LE(0, { dot: 1.6 }), pdur: 4.0, pease: 'power2.inOut' },
    c12_axis: { params: { draw: 1, era: 0, a: 1 }, pdur: 1.2 },
    c12_ctag: { type: 'text', html: '<span class="cap" style="font-size:1em;color:#F4D35E">loop drawings: concept</span>', size: 24, hud: true, ax: 1, x: 1824, y: 66, in: 'fade', at: 0.4 },
    ...lab('c12_react', '<span class="c-blue">ReAct</span>: reason → act → observe', 1200, 330, { size: 52, maxw: 1000, at: 0.8 }),
  }, { cam: { x: 960, y: 520, s: 1 } });
  // 408 (4.5) — Codex & HumanEval
  c(4.5, {
    loop: { params: LE(0, { dot: 3.2 }), pdur: 4.0, pease: 'power2.inOut' },
    ...lab('c12_codex', 'Codex &amp; HumanEval: function-level code', 1200, 560, { size: 52, maxw: 1000, at: 0.3 }),
    c12_pk: { type: 'text', html: cap('pass@k'), size: 28, color: T.DIM, x: 1200, y: 640, in: 'fade', at: 1.4 },
  });
  L_ID.push('c12_pk');
  // 409 (3.5) — FULL "2023" enters from the right over the axis
  c(3.5, {
    ...clearLabels('quick'),
    loop: { o: 0.15, params: LE(0, { dot: -1 }), pdur: 0.6 }, c12_axis: { o: 0.3 },
    ...BIG('c12_y23', '2023', 'right'),
  }, { cut: true });
  // 410 (4.5) — the year settles on its tick; SWE-bench: a repository node attaches
  c(4.5, {
    ...settle('c12_y23', 1),
    loop: { o: 1, params: LE(1), pdur: 1.4, pease: 'power3.inOut' }, c12_axis: { o: 1, params: { draw: 1, era: 1, a: 1 }, pdur: 1.4 },
    c12_repo: { type: 'box', w: 260, h: 74, x: E[1], y: 760, stroke: T.DIM, fill: 'rgba(21,26,33,0.96)', sw: 2.5, rad: 12, versions: ['repository', 'repository <span class="cap" style="font-size:0.6em;color:#9AA3AD">private</span>'], ver: 0, size: 36, in: 'up', at: 0.9 },
    c12_rl: { type: 'rect', x: E[1], y: 670, w: 3, h: 50, fill: '#5B6672', in: 'growh', at: 1.3 },
    ...lab('c12_swe', '<span class="c-blue">SWE-bench</span>: real GitHub issues in real repositories', 1430, 300, { maxw: 760, at: 1.0 }),
    ...lab('c12_few', 'early baselines resolved only a few percent', 1430, 430, { size: 40, color: T.DIM, maxw: 700, at: 2.2 }),
  }, { sfx: [{ at: 1.1, kind: 'click' }] });
  // 411 (4.5) — Reflexion: a feedback arrow curls back into the loop
  c(4.5, {
    c12_fb: { type: 'arrow', x1: E[1] - 240, y1: LCY + 150, x2: E[1] - 150, y2: LCY - 200, bend: -150, sw: 4, head: 18, color: T.INK, in: 'draw', at: 0.2, dur: 1.2, flow: 0, pulseColor: T.INK },
    ...lab('c12_refl', '<span class="c-blue">Reflexion</span>: written self-critique helps when there’s a feedback signal', 1430, 640, { maxw: 760, at: 1.0 }),
  });
  L_ID.push('c12_fb');
  // 412 (3.5) — FULL "2024" enters from the left
  const persist = ['loop', 'c12_axis', 'c12_repo', 'c12_rl'];
  c(3.5, {
    ...clearLabels('quick'),
    ...DIMS(persist, 0.15),
    ...BIG('c12_y24', '2024', 'left'),
  }, { cut: true });
  // 413 (4.5) — the tool ring grows large and ornate: the scaffold era
  c(4.5, {
    c12_y23: null, ...settle('c12_y24', 2),
    ...DIMS(persist, 1),
    loop: { o: 1, params: LE(2, { ring: 1 }), pdur: 1.4, pease: 'power3.inOut' }, c12_axis: { o: 1, params: { draw: 1, era: 2, a: 1 }, pdur: 1.4 },
    c12_repo: { x: E[2], o: 1 }, c12_rl: { x: E[2], o: 1 },
    c12_orn: { type: 'canvas', draw: 'c12_orn', in: 'fade', dur: 0.2, at: 0.6, params: { cx: E[2], cy: LCY, g: 1, col: 0 }, paramsFrom: { g: 0 }, pdur: 2.6, pease: 'power2.out', z: 0 },
    ...lab('c12_era', 'the <span class="c-teal">scaffold</span> era', 400, 260, { size: 60, maxw: 600, at: 1.0 }),
    ...lab('c12_sc', 'SWE-agent · AutoCodeRover · OpenHands', 400, 370, { size: 40, maxw: 560, at: 1.8 }),
  }, { sfx: [{ at: 0.8, kind: 'tick' }] });
  // 414 (4.5) — SWE-bench Verified: a cleaned-up subset
  c(4.5, {
    ...lab('c12_ver', cap('SWE-bench Verified: a cleaned-up subset'), 400, 500, { size: 26, color: T.DIM, maxw: 560, lh: 1.6, in: 'fade', at: 0.3 }),
    c12_orn: { params: { cx: E[2], cy: LCY, g: 1.0, col: 0 }, pdur: 1 },
    loop: { params: LE(2, { ring: 1, dot: 1.2 }), pdur: 4.0, pease: 'power1.inOut' },
  }, { cam: { x: 900, y: 520, s: 1.04 } });
  // 415 (4.5) — Agentless: a fixed pipeline could match agents
  const PIPE = ['localize', 'repair', 'validate'];
  const pipe = {}; PIPE.forEach((n, i) => { pipe['c12_pp' + i] = { type: 'box', w: 160, h: 64, x: 180 + i * 200, y: 680, stroke: T.BLUE, fill: 'rgba(88,196,221,0.07)', sw: 2.5, rad: 10, html: n, size: 28, in: 'scale', at: 0.2 + i * 0.25 }; L_ID.push('c12_pp' + i); });
  const pa = {}; [0, 1].forEach((i) => { pa['c12_pa' + i] = { type: 'arrow', x1: 262 + i * 200, y1: 680, x2: 296 + i * 200, y2: 680, sw: 3, head: 12, color: T.DIM, in: 'draw', at: 0.45 + i * 0.25, dur: 0.3 }; L_ID.push('c12_pa' + i); });
  c(4.5, {
    ...pipe, ...pa,
    ...lab('c12_agl', '<span class="c-blue">Agentless</span>: a fixed pipeline could match agents', 400, 820, { size: 40, maxw: 600, at: 1.2 }),
  }, { cam: { x: 960, y: 540, s: 1 } });
  // 416 (3.5) — FULL "2025" enters from the right
  c(3.5, {
    ...clearLabels('quick'),
    ...DIMS(persist.concat(['c12_orn']), 0.15),
    ...BIG('c12_y25', '2025', 'right'),
  }, { cut: true });
  // 417 (3.5) — the ring collapses to two tiles, "bash · edit"; the model block thickens purple
  const p25 = persist.concat(['c12_orn', 'c12_blk', 'c12_t1', 'c12_t2']);
  c(3.5, {
    c12_y24: null, ...settle('c12_y25', 3),
    ...DIMS(persist, 1),
    loop: { o: 1, params: LE(3, { ring: 0 }), pdur: 1.2, pease: 'power3.inOut' }, c12_axis: { o: 1, params: { draw: 1, era: 3, a: 1 }, pdur: 1.2 },
    c12_repo: { x: E[3], o: 1 }, c12_rl: { x: E[3], o: 1 },
    c12_orn: { o: 1, params: { cx: E[3], cy: LCY, g: 1, col: 1 }, pdur: 1.6, pease: 'power3.inOut' },
    c12_blk: { type: 'box', w: 170, h: 120, x: E[3], y: LCY, stroke: T.PURPLE, fill: 'rgba(180,142,219,0.30)', sw: 3.5, rad: 14, html: 'model', size: 34, in: 'fade', from: { h: 50, stroke: T.BLUE, fill: 'rgba(88,196,221,0.10)', o: 0 }, dur: 1.6, ease: 'power3.inOut', at: 0.4 },
    c12_t1: { type: 'text', html: '<span class="m c-teal">bash</span>', size: 32, x: E[3] + 320, ax: 0, y: LCY + 30, in: 'fade', at: 1.6 },
    c12_t2: { type: 'text', html: '<span class="m c-teal">edit</span>', size: 32, x: E[3] + 320, ax: 0, y: LCY + 110, in: 'fade', at: 1.8 },
  }, { sfx: [{ at: 1.5, kind: 'tick' }] });
  // 418 (4.5) — Claude 3.5 Sonnet · 49% on SWE-bench Verified with bash plus an edit tool
  c(4.5, {
    ...lab('c12_son', `Claude 3.5 Sonnet · ${Y('49%')} on SWE-bench Verified with bash plus an edit tool`, 560, 270, { maxw: 860, at: 0.3 }),
  });
  // 419 (4.5) — badges: Claude Code · Codex
  c(4.5, {
    ...lab('c12_cc', '<span class="plate">Claude Code</span>&ensp;<span class="plate">Codex</span>', 560, 430, { size: 44, in: 'pop', at: 0.2 }),
    ...lab('c12_rl2', 'Codex’s model RL-trained in its own sandbox', 560, 520, { size: 40, color: T.DIM, maxw: 860, at: 0.9 }),
  });
  // 420 (3.5) — a short strip: mini-swe-agent: 100 lines
  c(3.5, {
    ...lab('c12_mini', `mini-swe-agent: ${Y('100 lines')} were enough for frontier models`, 560, 680, { size: 40, maxw: 860, at: 0.2 }),
    c12_strip: { type: 'rect', x: 230, ax: 0, y: 760, w: 260, h: 14, rad: 5, fill: T.INK, in: 'grow', at: 0.8, dur: 1.0 },
  }, { cam: { x: 900, y: 520, s: 1.03 } });
  L_ID.push('c12_strip');
  // 421 (4.5) — task factories hang off the block
  const hang = (id, html, y, at) => ({ [id]: { type: 'text', html, size: 40, x: 560, y, maxw: 860, in: 'wipe', at } });
  c(4.5, {
    ...clearLabels('up'),
    ...hang('c12_fac', '<span class="cap" style="font-size:0.6em;color:#9AA3AD">task factories</span><br>SWE-Gym · SWE-smith · R2E-Gym', 330, 0.5),
    c12_fl: { type: 'arrow', x1: 900, y1: 360, x2: E[3] - 95, y2: LCY - 20, bend: -30, sw: 2.5, head: 12, color: '#5B6672', in: 'draw', at: 1.2 },
  }, { cam: { x: 960, y: 540, s: 1 } });
  // 422 (4.5) — training recipes
  c(4.5, {
    ...hang('c12_rec', `<span class="cap" style="font-size:0.6em;color:#9AA3AD">training recipes</span><br><span class="c-purple">SWE-RL · DeepSWE · Kimi-Dev</span>: open ${Y('32–72B')} models to about ${Y('40–60%')} on Verified`, 620, 0.4),
    c12_rl3: { type: 'arrow', x1: 1000, y1: 600, x2: E[3] - 95, y2: LCY + 30, bend: 30, sw: 2.5, head: 12, color: '#5B6672', in: 'draw', at: 1.2 },
  });
  // 423 (3.5) — FULL "2026" enters from the left
  const ids25 = ['c12_son', 'c12_cc', 'c12_rl2', 'c12_mini', 'c12_strip', 'c12_fac', 'c12_fl', 'c12_rec', 'c12_rl3'];
  c(3.5, {
    ...Object.fromEntries(ids25.map((k) => [k, 'quick'])),
    c12_t1: 'quick', c12_t2: 'quick',
    ...DIMS(['loop', 'c12_axis', 'c12_repo', 'c12_rl', 'c12_orn', 'c12_blk'], 0.15),
    ...BIG('c12_y26', '2026', 'left'),
  }, { cut: true });
  // 424 (4.5) — the block shrinks (small open models); the repository node gets a lock
  c(4.5, {
    c12_y25: null, ...settle('c12_y26', 4),
    ...DIMS(['c12_axis', 'c12_rl', 'c12_blk'], 1),
    c12_orn: 'quick',
    loop: { o: 1, params: LE(4), pdur: 1.4, pease: 'power3.inOut' }, c12_axis: { o: 1, params: { draw: 1, era: 4, a: 1 }, pdur: 1.4 },
    c12_blk: { x: E[4], w: 120, h: 54, o: 1, at: 0.3, dur: 1.4 }, c12_rl: { x: E[4], o: 1 },
    c12_repo: { x: E[4], o: 1, ver: 1, stroke: T.RED, w: 300 },
    ...lab('c12_now', 'harness and context engineering', 640, 280, { size: 52, maxw: 1100, at: 1.0 }),
    ...lab('c12_now2', 'evaluation on <span class="c-red">fresh or private</span> repositories', 640, 370, { size: 44, maxw: 1100, at: 1.8 }),
  }, { sfx: [{ at: 1.2, kind: 'click' }] });
  // 425 (4.5) — three tags: 2026 research on small open models
  const T3 = (id, html, y, at) => ({ [id]: { type: 'box', w: 940, h: 74, x: 640, y, stroke: '#5B6672', fill: 'rgba(21,26,33,0.96)', sw: 2.5, rad: 37, html, size: 36, in: 'left', at } });
  c(4.5, {
    ...T3('c12_g1', `SWE-Protégé: a 7B model reported at ${Y('42%')}`, 520, 0.2),
    ...T3('c12_g2', 'CANOPY: RL for small task pools', 610, 0.5),
    ...T3('c12_g3', `Open-SWE-Traces: ${Y('200k+')} trajectories`, 700, 0.8),
  }, { sfx: [{ at: 0.3, kind: 'pop' }, { at: 0.6, kind: 'pop' }, { at: 0.9, kind: 'pop' }] });
  L_ID.push('c12_g1', 'c12_g2', 'c12_g3');
  // 426 (4.5) — the caution, quoted
  c(4.5, {
    c12_g1: { o: 0.4 }, c12_g2: { o: 0.4 }, c12_g3: { o: 0.4 },
    c12_now: { o: 0.4 }, c12_now2: { o: 0.4 },
    c12_q: { type: 'text', html: '<span class="plate">“harnesses encode assumptions that go stale as models improve”<br><span class="cap" style="font-size:0.55em;color:#9AA3AD">— Anthropic</span></span>', size: 46, maxw: 1200, lh: 1.35, x: 760, y: 840, in: 'wipe', at: 0.3, dur: 1.6 },
  }, { cam: { x: 960, y: 590, s: 1.03 } });
  L_ID.push('c12_q');
  // 427 (3.5) — OVER three vessels rise: prompt · scaffold · weights; the loop settles inside the scaffold
  const VP = (o) => Object.assign({ rise: 1, p01: 0, p12: 0, lit: 0, open: 0, a: 1 }, o);
  c(3.5, {
    ...clearLabels('quick'),
    c12_y26: null, c12_ctag: 'quick', c12_axis: 'fade', c12_repo: 'down', c12_rl: 'quick', c12_blk: 'quick',
    loop: { params: LOOP({ cx: 960, cy: 575, r: 180 }), pdur: 1.4, pease: 'power3.inOut' },
    c12_v: { type: 'canvas', draw: 'c12_vessels', in: 'fade', dur: 0.2, params: VP(), paramsFrom: { rise: 0 }, pdur: 1.8, pease: 'expo.out', z: 0 },
    c12_tag: { type: 'text', html: cap('the arc&ensp;·&ensp;') + tagC, size: 28, color: T.DIM, x: 960, y: 150, in: 'fade', at: 0.8 },
  }, { cut: true, cam: { x: 960, y: 540, s: 1 } });
  // 428 (2.5) — light pours from prompt into scaffold: 2024
  c(2.5, {
    c12_v: { params: VP({ p01: 1 }), pdur: 1.7, pease: 'power1.inOut' },
    c12_l24: { type: 'text', html: '2024', size: 48, x: 330, y: 425, in: 'rise', at: 0.5 },
  });
  // 429 (2.5) — light pours from scaffold into weights: 2025
  c(2.5, {
    c12_v: { params: VP({ p01: 1, p12: 1 }), pdur: 1.7, pease: 'power1.inOut' },
    c12_l25: { type: 'text', html: '2025', size: 48, x: 1390, y: 150, in: 'rise', at: 0.5 },
  });
  // 430 (4.5) — "this competition asks you to repeat the second step, on a small scale"; the weights vessel lights
  c(4.5, {
    c12_v: { params: VP({ p01: 1, p12: 1, lit: 1 }), pdur: 1.6 },
    c12_line: { type: 'text', html: 'this competition asks you to <span class="u">repeat the second step</span>, on a small scale', size: 50, maxw: 1700, x: 960, y: 1000, in: 'wipe', at: 0.4, dur: 1.6 },
  }, { sfx: [{ at: 0.3, kind: 'tick' }] });
  // 431 (2.5) — reading beat: the camera pushes in on "repeat the second step"
  F.beat(2.5, { id: 'c12_line', mode: 'push', dx: 70 });
  // 432 (4.5) — the scaffold vessel opens around the loop; everything else leaves (hand-off 12 → 13); the RAIL rewrites to "13"
  c(4.5, {
    c12_l24: 'quick', c12_l25: 'quick', c12_line: 'down', c12_tag: 'quick',
    c12_v: 'zoom',
    loop: { o: 1, params: { cx: 960, cy: 560, r: 200, draw: 1, labels: 1, ring: 0, dot: -1, exit: 0, hi: -1, hiA: 0 }, pdur: 3.3, pease: 'power2.inOut' },
    rail: { ver: 13, at: 0.8, dur: 1.0 },
  }, { cam: { x: 960, y: 540, s: 1 }, drift: 0 });
})();
