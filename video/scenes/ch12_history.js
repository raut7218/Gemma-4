// Chapter 12 — How coding agents got here (storyboard v5 rows 406–432, 108 beats).
// Every name, date and number on screen is from docs/facts.md (F57, F60, F68, F77, F80, F89, F90).
(function () {
  const { T } = F;
  const c = F.comp.bind(F);
  F.chapter(K.CH[12]);

  const cap = (s, col) => `<span class="cap" style="font-size:1em${col ? ';color:' + col : ''}">${s}</span>`;
  const Y = (s) => `<span class="c-yellow">${s}</span>`;
  const E = [380, 680, 980, 1280, 1540];          // x of each year tick on the axis
  const LX = [420, 680, 980, 1280, 1480];         // x of the loop in that era (kept inside the frame)
  const YEARS = ['2021–22', '2023', '2024', '2025', '2026'];
  const AX_Y = 965, LCY = 460, LR = 240;
  const LOOP = (o) => Object.assign({ cx: 420, cy: 500, r: 170, draw: 1, labels: 1, ring: 0, dot: -1, exit: 0, hi: -1, hiA: 0 }, o);
  const LE = (k, o) => LOOP(Object.assign({ cx: LX[k], cy: LCY, r: LR }, o));
  const AXP = (o) => Object.assign({ draw: 1, era: -1, a: 1, h0: 0, h1: 0, h2: 0, h3: 0, h4: 0 }, o);

  // ---------------------------------------------------------------- chapter-local drawings
  // the time axis: draw 0..1, era (float index of the lit year), a, h0..h4 (hide a year label while its card sits on it)
  DRAW.c12_axis = (ctx, p) => {
    const { clamp, ease } = DRAW.util;
    ctx.save(); ctx.globalAlpha *= p.a ?? 1;
    DRAW.polyline(ctx, [[160, AX_Y], [1760, AX_Y]], ease(clamp(p.draw || 0)), { color: DRAW.rgba(T.INK, 0.8), w: 3 });
    E.forEach((x, i) => {
      const k = clamp((p.draw || 0) * 5 - i * 0.8);
      if (k <= 0) return;
      const lit = clamp(1 - Math.abs((p.era ?? -1) - i));
      ctx.strokeStyle = DRAW.rgba(T.INK, k * (0.5 + 0.5 * lit)); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, AX_Y - 12 - 8 * lit); ctx.lineTo(x, AX_Y + 12 + 8 * lit); ctx.stroke();
      DRAW.text(ctx, YEARS[i], x, AX_Y + 48, { size: 32 + 8 * lit, color: lit > 0.5 ? T.INK : T.DIM, a: k * (1 - clamp(p['h' + i] || 0)) });
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
    const N = 18, cx = p.cx, cy = p.cy, R = 360, VY = 0.8, g = ease(clamp(p.g || 0)), cl = ease(clamp(p.col || 0));
    if (g <= 0) return;
    ctx.save();
    ctx.strokeStyle = DRAW.rgba(T.TEAL, 0.35 * g * (1 - cl)); ctx.lineWidth = 2; ctx.setLineDash([6, 10]);
    ctx.beginPath(); ctx.ellipse(cx, cy, R * (0.7 + 0.3 * g), R * VY * (0.7 + 0.3 * g), 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    for (let i = 0; i < N; i++) {
      const k = clamp(g * N * 1.3 - i * 1.0 + 1);
      if (k <= 0) continue;
      const a = -Math.PI / 2 + (i / N) * Math.PI * 2, r = R * (0.7 + 0.3 * ease(clamp(k)));
      let x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * VY;
      const keep = i === 4 || i === 5;
      const tx = cx + 370, ty = cy + (i === 4 ? 80 : 160);
      x += (tx - x) * cl; y += (ty - y) * cl;
      const al = clamp(k) * (keep ? 1 : 1 - cl);
      if (al <= 0) continue;
      const s = 15 + 6 * Math.sin(i * 1.7) * (1 - cl);
      ctx.globalAlpha = al;
      rr(ctx, x - s, y - s, s * 2, s * 2, 6); ctx.fillStyle = DRAW.rgba(T.TEAL, 0.85); ctx.fill();
      if (!keep && cl < 0.5) { ctx.strokeStyle = DRAW.rgba(T.TEAL, 0.5 * (1 - cl * 2)); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, s + 9, 0, Math.PI * 2); ctx.stroke(); }
    }
    ctx.restore();
  };
  // three vessels: prompt · scaffold · weights. rise 0..1, p01 / p12 pours (0..1), lit (weights glow),
  // open (the scaffold's walls unfold outward and fade), side (prompt and weights fade away)
  const V = [{ x: 400, w: 320, h: 360 }, { x: 960, w: 600, h: 540 }, { x: 1520, w: 320, h: 360 }];
  const VB = 830;
  DRAW.c12_vessels = (ctx, p) => {
    const { clamp, ease } = DRAW.util;
    const rise = ease(clamp(p.rise || 0)), op = ease(clamp(p.open || 0)), sd = ease(clamp(p.side || 0));
    const fill = [1 - 0.55 * clamp(p.p01 || 0), 0.15 + 0.6 * clamp(p.p01 || 0) - 0.45 * clamp(p.p12 || 0), 0.1 + 0.75 * clamp(p.p12 || 0)];
    V.forEach((v, i) => {
      const dy = (1 - rise) * 160, top = VB - v.h + dy, bot = VB + dy;
      const a = rise * (i === 1 ? 1 - op : 1 - sd) * (p.a ?? 1);
      if (a <= 0.002) return;
      ctx.save(); ctx.globalAlpha = a;
      // the light inside
      const lv = clamp(fill[i]), lt = bot - (v.h - 20) * lv;
      const glow = i === 2 ? 0.25 + 0.5 * clamp(p.lit || 0) : 0.28;
      ctx.fillStyle = DRAW.rgba(i === 2 ? T.PURPLE : T.YELLOW, glow);
      ctx.beginPath(); ctx.roundRect(v.x - v.w / 2 + 8, lt, v.w - 16, bot - lt - 8, 14); ctx.fill();
      // the walls (U shape); the scaffold's walls fold outward when it opens
      const wx = (v.w / 2) * (1 + (i === 1 ? op * 1.4 : 0));
      ctx.strokeStyle = i === 2 && (p.lit || 0) > 0 ? DRAW.rgba(T.PURPLE, 0.6 + 0.4 * p.lit) : DRAW.rgba(T.INK, 0.85); ctx.lineWidth = 4; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(v.x - wx, top); ctx.lineTo(v.x - v.w / 2, bot); ctx.lineTo(v.x + v.w / 2, bot); ctx.lineTo(v.x + wx, top); ctx.stroke();
      ctx.restore();
      DRAW.text(ctx, ['prompt', 'scaffold', 'weights'][i], v.x, bot + 44, { size: 40, color: i === 2 && (p.lit || 0) > 0.5 ? T.PURPLE : T.INK, a });
    });
    // pours: an arc of light from one lip to the next
    [[0, 1, p.p01], [1, 2, p.p12]].forEach(([a, b, k]) => {
      k = clamp(k || 0); if (k <= 0 || k >= 1) return;
      const x0 = a < b && a === 0 ? V[a].x + V[a].w / 2 - 10 : V[a].x + V[a].w / 2 - 30, y0 = VB - V[a].h;
      const x1 = V[b].x - V[b].w / 2 + 40, y1 = VB - V[b].h + 40;
      const pts = []; for (let j = 0; j <= 30; j++) { const s = j / 30; pts.push([x0 + (x1 - x0) * s, y0 + (y1 - y0) * s - Math.sin(Math.PI * s) * 140]); }
      const head = clamp(k * 1.6), tail = clamp(k * 1.6 - 0.6);
      const seg = pts.slice(Math.floor(tail * 30), Math.max(Math.floor(tail * 30) + 2, Math.ceil(head * 30) + 1));
      DRAW.polyline(ctx, seg, 1, { color: b === 2 ? T.PURPLE : T.YELLOW, w: 10 });
    });
  };

  // ================================================================ compositions
  const L_ID = [];       // labels currently on screen, cleared at each era change
  const clearLabels = (style = 'up') => { const o = {}; L_ID.splice(0).forEach((k) => { o[k] = style; }); return o; };
  const lab = (id, html, x, y, o = {}) => { L_ID.push(id); return { [id]: Object.assign({ type: 'text', html, size: 44, maxw: 760, lh: 1.25, x, y, in: 'wipe' }, o) }; };
  // a full-frame year enters, then flies down onto its own tick and stays there as the tick's label
  const BIG = (id, yr, from) => ({ [id]: { type: 'text', html: yr, size: 330, x: 960, y: 470, in: from, at: 0.4, z: 20 } });
  const settle = (id, k) => ({ [id]: { x: E[k], y: AX_Y + 48, s: 40 / 330, dur: 1.15, ease: 'power3.inOut' } });
  const DIMS = (ids, o) => Object.fromEntries(ids.map((k) => [k, { o, dur: 0.6 }]));

  // 406 (4) — WIDE a time axis 2021 → 2026 draws along the bottom (starts drawing on the hand-off frame)
  c(4, {
    ...K.rail(12),
    loop: { type: 'canvas', draw: 'loop', x: 960, y: 540, params: LE(0), pdur: 2.6, pease: 'power3.out' },
    c12_axis: { type: 'canvas', draw: 'c12_axis', in: 'fade', dur: 0.15, params: AXP({ draw: 1 }), paramsFrom: { draw: 0 }, pdur: 2.4, pease: 'power3.out' },
  }, { cam: { x: 960, y: 540, s: 1 }, drift: 0.6 });
  // 407 (4.5) — the LOOP sits at 2021–22: ReAct
  c(4.5, {
    loop: { params: LE(0, { dot: 1.6 }), pdur: 4.0, pease: 'power2.inOut' },
    c12_axis: { params: AXP({ era: 0 }), pdur: 1.2 },
    c12_ctag: { type: 'text', versions: ['<span class="cap" style="font-size:1em;color:#F4D35E">loop drawings: concept</span>', '<span class="cap" style="font-size:1em;color:#F4D35E">the arc: concept</span>'], ver: 0, size: 24, hud: true, ax: 1, x: 1824, y: 66, in: 'fade', at: 0.4 },
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
  // 410 (4.5) — the year flies onto its tick; SWE-bench: a repository node attaches
  c(4.5, {
    ...settle('c12_y23', 1),
    loop: { o: 1, params: LE(1), pdur: 1.4, pease: 'power3.inOut' }, c12_axis: { o: 1, params: AXP({ era: 1, h1: 1 }), pdur: 1.4 },
    c12_repo: { type: 'box', w: 260, h: 74, x: LX[1], y: 815, stroke: T.DIM, fill: 'rgba(21,26,33,0.96)', sw: 2.5, rad: 12, versions: ['repository', 'repository <span class="cap" style="font-size:0.6em;color:#9AA3AD">private</span>'], ver: 0, size: 36, in: 'up', at: 0.9 },
    c12_rl: { type: 'rect', x: LX[1], y: 745, w: 3, h: 50, fill: '#5B6672', in: 'growh', at: 1.3 },
    ...lab('c12_swe', '<span class="c-blue">SWE-bench</span>: real GitHub issues in real repositories', 1440, 290, { maxw: 720, at: 1.0 }),
    ...lab('c12_few', 'early baselines resolved only a few percent', 1440, 425, { size: 40, color: T.DIM, maxw: 680, at: 2.2 }),
  }, { sfx: [{ at: 1.1, kind: 'click' }] });
  // 411 (4.5) — Reflexion: a feedback arrow curls back into the loop
  c(4.5, {
    c12_fb: { type: 'arrow', x1: LX[1] - 385, y1: LCY + 150, x2: LX[1] - 140, y2: LCY - 262, bend: -110, sw: 4, head: 18, color: T.INK, in: 'draw', at: 0.2, dur: 1.2, flow: 0, pulseColor: T.INK },
    ...lab('c12_refl', '<span class="c-blue">Reflexion</span>: written self-critique helps when there’s a feedback signal', 1440, 640, { maxw: 720, at: 1.0 }),
  });
  L_ID.push('c12_fb');
  // 412 (3.5) — FULL "2024" enters from the left; the 2023 card hands its tick back to the axis label
  const persist = ['loop', 'c12_repo', 'c12_rl'];
  c(3.5, {
    ...clearLabels('quick'),
    ...DIMS(persist, 0.15), c12_axis: { o: 0.15, dur: 0.6, params: AXP({ era: 1 }), pdur: 0.4 },
    c12_y23: 'quick',
    ...BIG('c12_y24', '2024', 'left'),
  }, { cut: true });
  // 413 (4.5) — the tool ring grows large and ornate: the scaffold era
  c(4.5, {
    ...settle('c12_y24', 2),
    ...DIMS(persist, 1),
    loop: { o: 1, params: LE(2, { ring: 1 }), pdur: 1.4, pease: 'power3.inOut' }, c12_axis: { o: 1, params: AXP({ era: 2, h2: 1 }), pdur: 1.4 },
    c12_repo: { x: LX[2], o: 1 }, c12_rl: { x: LX[2], o: 1 },
    c12_orn: { type: 'canvas', draw: 'c12_orn', in: 'fade', dur: 0.2, at: 0.6, params: { cx: LX[2], cy: LCY, g: 1, col: 0 }, paramsFrom: { g: 0 }, pdur: 2.6, pease: 'power2.out', z: 0 },
    ...lab('c12_era', 'the <span class="c-teal">scaffold</span> era', 330, 230, { size: 60, maxw: 520, at: 1.0 }),
    ...lab('c12_sc', 'SWE-agent · AutoCodeRover · OpenHands', 330, 345, { size: 40, maxw: 480, at: 1.8 }),
  }, { sfx: [{ at: 0.8, kind: 'tick' }] });
  // 414 (4.5) — SWE-bench Verified: a cleaned-up subset
  c(4.5, {
    ...lab('c12_ver', cap('SWE-bench Verified: a cleaned-up subset'), 330, 480, { size: 26, color: T.DIM, maxw: 480, lh: 1.6, in: 'fade', at: 0.3 }),
    c12_orn: { params: { cx: LX[2], cy: LCY, g: 1.0, col: 0 }, pdur: 1 },
    loop: { params: LE(2, { ring: 1, dot: 1.2 }), pdur: 4.0, pease: 'power1.inOut' },
  }, { cam: { x: 920, y: 520, s: 1.03 } });
  // 415 (4.5) — Agentless: a fixed pipeline could match agents
  const PIPE = ['localize', 'repair', 'validate'];
  const pipe = {}; PIPE.forEach((n, i) => { pipe['c12_pp' + i] = { type: 'box', w: 160, h: 64, x: 150 + i * 190, y: 640, stroke: T.BLUE, fill: 'rgba(88,196,221,0.07)', sw: 2.5, rad: 10, html: n, size: 28, in: 'scale', at: 0.2 + i * 0.25 }; L_ID.push('c12_pp' + i); });
  const pa = {}; [0, 1].forEach((i) => { pa['c12_pa' + i] = { type: 'arrow', x1: 232 + i * 190, y1: 640, x2: 268 + i * 190, y2: 640, sw: 3, head: 12, color: T.DIM, in: 'draw', at: 0.45 + i * 0.25, dur: 0.3 }; L_ID.push('c12_pa' + i); });
  c(4.5, {
    ...pipe, ...pa,
    ...lab('c12_agl', '<span class="c-blue">Agentless</span>: a fixed pipeline could match agents', 340, 790, { size: 40, maxw: 540, at: 1.2 }),
  }, { cam: { x: 960, y: 540, s: 1 } });
  // 416 (3.5) — FULL "2025" enters from the right
  c(3.5, {
    ...clearLabels('quick'),
    ...DIMS(persist.concat(['c12_orn']), 0.15), c12_axis: { o: 0.15, dur: 0.6, params: AXP({ era: 2 }), pdur: 0.4 },
    c12_y24: 'quick',
    ...BIG('c12_y25', '2025', 'right'),
  }, { cut: true });
  // 417 (3.5) — the ring collapses to two tiles, "bash · edit"; the model block thickens purple
  c(3.5, {
    ...settle('c12_y25', 3),
    ...DIMS(persist, 1),
    loop: { o: 1, params: LE(3, { ring: 0 }), pdur: 1.2, pease: 'power3.inOut' }, c12_axis: { o: 1, params: AXP({ era: 3, h3: 1 }), pdur: 1.2 },
    c12_repo: { x: LX[3], o: 1 }, c12_rl: { x: LX[3], o: 1 },
    c12_orn: { o: 1, params: { cx: LX[3], cy: LCY, g: 1, col: 1 }, pdur: 1.6, pease: 'power3.inOut' },
    c12_blk: { type: 'box', w: 200, h: 130, x: LX[3], y: LCY, stroke: T.PURPLE, fill: 'rgba(180,142,219,0.30)', sw: 3.5, rad: 14, html: 'model', size: 36, in: 'fade', from: { h: 54, stroke: T.BLUE, fill: 'rgba(88,196,221,0.10)', o: 0 }, dur: 1.6, ease: 'power3.inOut', at: 0.4 },
    c12_t1: { type: 'text', html: '<span class="m c-teal">bash</span>', size: 32, x: LX[3] + 400, ax: 0, y: LCY + 80, in: 'fade', at: 1.6 },
    c12_t2: { type: 'text', html: '<span class="m c-teal">edit</span>', size: 32, x: LX[3] + 400, ax: 0, y: LCY + 160, in: 'fade', at: 1.8 },
  }, { sfx: [{ at: 1.5, kind: 'tick' }] });
  // 418 (4.5) — Claude 3.5 Sonnet · 49% on SWE-bench Verified with bash plus an edit tool
  c(4.5, {
    ...lab('c12_son', `Claude 3.5 Sonnet · ${Y('49%')} on SWE-bench Verified with bash plus an edit tool`, 500, 240, { maxw: 760, at: 0.3 }),
  });
  // 419 (4.5) — badges: Claude Code · Codex
  c(4.5, {
    ...lab('c12_cc', '<span class="plate">Claude Code</span>&ensp;<span class="plate">Codex</span>', 500, 390, { size: 44, in: 'pop', at: 0.2 }),
    ...lab('c12_rl2', 'Codex’s model RL-trained in its own sandbox', 500, 485, { size: 40, color: T.DIM, maxw: 760, at: 0.9 }),
  });
  // 420 (3.5) — a short strip: mini-swe-agent: 100 lines
  c(3.5, {
    ...lab('c12_mini', `mini-swe-agent: ${Y('100 lines')} were enough for frontier models`, 500, 650, { size: 40, maxw: 760, at: 0.2 }),
    c12_strip: { type: 'rect', x: 140, ax: 0, y: 745, w: 260, h: 14, rad: 5, fill: T.INK, in: 'grow', at: 0.8, dur: 1.0 },
  }, { cam: { x: 920, y: 520, s: 1.03 } });
  L_ID.push('c12_strip');
  // 421 (4.5) — task factories hang off the block
  const hang = (id, html, y, at) => ({ [id]: { type: 'text', html, size: 40, x: 500, y, maxw: 760, in: 'wipe', at } });
  c(4.5, {
    ...clearLabels('up'),
    ...hang('c12_fac', '<span class="cap" style="font-size:0.6em;color:#9AA3AD">task factories</span><br>SWE-Gym · SWE-smith · R2E-Gym', 330, 0.5),
    c12_fl: { type: 'arrow', x1: 860, y1: 360, x2: LX[3] - 110, y2: LCY - 30, bend: -30, sw: 2.5, head: 12, color: '#5B6672', in: 'draw', at: 1.2 },
  }, { cam: { x: 960, y: 540, s: 1 } });
  // 422 (4.5) — training recipes
  c(4.5, {
    ...hang('c12_rec', `<span class="cap" style="font-size:0.6em;color:#9AA3AD">training recipes</span><br><span class="c-purple">SWE-RL · DeepSWE · Kimi-Dev</span>: open ${Y('32–72B')} models to about ${Y('40–60%')} on Verified`, 630, 0.4),
    c12_rl3: { type: 'arrow', x1: 900, y1: 600, x2: LX[3] - 110, y2: LCY + 40, bend: 30, sw: 2.5, head: 12, color: '#5B6672', in: 'draw', at: 1.2 },
  });
  // 423 (3.5) — FULL "2026" enters from the left
  const ids25 = ['c12_son', 'c12_cc', 'c12_rl2', 'c12_mini', 'c12_strip', 'c12_fac', 'c12_fl', 'c12_rec', 'c12_rl3'];
  c(3.5, {
    ...Object.fromEntries(ids25.map((k) => [k, 'quick'])),
    c12_t1: 'quick', c12_t2: 'quick',
    ...DIMS(['loop', 'c12_repo', 'c12_rl', 'c12_orn', 'c12_blk'], 0.15), c12_axis: { o: 0.15, dur: 0.6, params: AXP({ era: 3 }), pdur: 0.4 },
    c12_y25: 'quick',
    ...BIG('c12_y26', '2026', 'left'),
  }, { cut: true });
  // 424 (4.5) — the block shrinks (small open models); the repository node gets a lock
  c(4.5, {
    ...settle('c12_y26', 4),
    ...DIMS(['c12_rl', 'c12_blk'], 1),
    c12_orn: 'quick',
    loop: { o: 1, params: LE(4), pdur: 1.4, pease: 'power3.inOut' }, c12_axis: { o: 1, params: AXP({ era: 4, h4: 1 }), pdur: 1.4 },
    c12_blk: { x: LX[4], w: 130, h: 60, size: 30, o: 1, at: 0.3, dur: 1.4 }, c12_rl: { x: LX[4], o: 1 },
    c12_repo: { x: LX[4], o: 1, ver: 1, stroke: T.RED, w: 300 },
    ...lab('c12_now', 'harness and context engineering', 620, 270, { size: 52, maxw: 1000, at: 1.0 }),
    ...lab('c12_now2', 'evaluation on <span class="c-red">fresh or private</span> repositories', 620, 365, { size: 44, maxw: 1000, at: 1.8 }),
  }, { sfx: [{ at: 1.2, kind: 'click' }] });
  // 425 (4.5) — three tags: 2026 research on small open models
  const T3 = (id, html, y, at) => ({ [id]: { type: 'box', w: 940, h: 74, x: 620, y, stroke: '#5B6672', fill: 'rgba(21,26,33,0.96)', sw: 2.5, rad: 37, html, size: 36, in: 'left', at } });
  c(4.5, {
    ...T3('c12_g1', `SWE-Protégé: a 7B model reported at ${Y('42%')}`, 495, 0.2),
    ...T3('c12_g2', 'CANOPY: RL for small task pools', 585, 0.5),
    ...T3('c12_g3', `Open-SWE-Traces: ${Y('200k+')} trajectories`, 675, 0.8),
  }, { sfx: [{ at: 0.3, kind: 'pop' }, { at: 0.6, kind: 'pop' }, { at: 0.9, kind: 'pop' }] });
  L_ID.push('c12_g1', 'c12_g2', 'c12_g3');
  // 426 (4.5) — the caution, quoted
  c(4.5, {
    c12_g1: { o: 0.4 }, c12_g2: { o: 0.4 }, c12_g3: { o: 0.4 },
    c12_now: { o: 0.4 }, c12_now2: { o: 0.4 },
    c12_q: { type: 'text', html: '<span class="plate">“harnesses encode assumptions that go stale as models improve”<br><span class="cap" style="font-size:0.55em;color:#9AA3AD">— Anthropic</span></span>', size: 46, maxw: 1040, lh: 1.35, x: 620, y: 835, in: 'wipe', at: 0.3, dur: 1.6 },
  }, { cam: { x: 960, y: 580, s: 1.03 } });
  L_ID.push('c12_q');
  // 427 (3.5) — OVER three vessels rise: prompt · scaffold · weights; the loop settles inside the scaffold
  const VP = (o) => Object.assign({ rise: 1, p01: 0, p12: 0, lit: 0, open: 0, side: 0, a: 1 }, o);
  c(3.5, {
    ...clearLabels('quick'),
    c12_y26: 'quick', c12_axis: 'fade', c12_repo: 'down', c12_rl: 'quick', c12_blk: 'quick',
    c12_ctag: { ver: 1, dur: 0.6, at: 0.6 },
    loop: { params: LOOP({ cx: 960, cy: 590, r: 180 }), pdur: 1.4, pease: 'power3.inOut' },
    c12_v: { type: 'canvas', draw: 'c12_vessels', in: 'fade', dur: 0.2, params: VP(), paramsFrom: { rise: 0 }, pdur: 1.8, pease: 'expo.out', z: 0 },
  }, { cut: true, cam: { x: 960, y: 540, s: 1 } });
  // 428 (2.5) — light pours from prompt into scaffold: 2024
  c(2.5, {
    c12_v: { params: VP({ p01: 1 }), pdur: 1.7, pease: 'power1.inOut' },
    c12_l24: { type: 'text', html: '2024', size: 48, x: 400, y: 400, in: 'rise', at: 0.5 },
  });
  // 429 (2.5) — light pours from scaffold into weights: 2025
  c(2.5, {
    c12_v: { params: VP({ p01: 1, p12: 1 }), pdur: 1.7, pease: 'power1.inOut' },
    c12_l25: { type: 'text', html: '2025', size: 48, x: 1520, y: 400, in: 'rise', at: 0.5 },
  });
  // 430 (4.5) — "this competition asks you to repeat the second step, on a small scale"; the weights vessel lights
  c(4.5, {
    c12_v: { params: VP({ p01: 1, p12: 1, lit: 1 }), pdur: 1.6 },
    c12_line: { type: 'text', html: 'this competition asks you to <span class="u">repeat the second step</span>, on a small scale', size: 48, maxw: 1600, x: 960, y: 965, in: 'wipe', at: 0.4, dur: 1.6 },
  }, { sfx: [{ at: 0.3, kind: 'tick' }] });
  // 431 (2.5) — reading beat: the camera pushes in on "repeat the second step" (whole caption and all three vessels stay in frame)
  F.beat(2.5, { id: 'c12_line', mode: 'push', dy: -200 });
  // 432 (4.5) — the scaffold vessel opens into six empty slots around the loop; everything else leaves
  // (hand-off 12 → 13); the RAIL rewrites to "13". The slots are ch13's own slot objects (same ids, same
  // spec), so ch13's first comp carries them on and its cut is seamless.
  const SLOT = [[330, 300, 'model'], [330, 560, 'control flow'], [330, 820, 'tools'], [1590, 300, 'context'], [1590, 560, 'environment'], [1590, 820, 'verifier / selector']];
  const slots = {};
  SLOT.forEach(([x, y, k], i) => {
    const at = 0.55 + 0.2 * i;
    slots['c13_sb' + i] = { type: 'box', x, y, w: 520, h: 190, stroke: '#3A4654', fill: 'rgba(21,26,33,0.6)', sw: 3, rad: 20, html: '', in: 'fade', from: { x: 960 + (x < 960 ? -330 : 330), y: 560, w: 160, h: 200, o: 0 }, at, dur: 1.5, ease: 'power3.out' };
    slots['c13_sl' + i] = { type: 'text', html: `<span class="cap" style="font-size:1em">${k}</span>`, size: 26, color: T.DIM, x, y: y - 58, in: 'fade', at: at + 0.9, dur: 0.8 };
  });
  c(4.5, {
    c12_l24: 'quick', c12_l25: 'quick', c12_line: 'down', c12_ctag: 'quick',
    c12_v: { params: VP({ p01: 1, p12: 1, lit: 1, open: 1, side: 1 }), pdur: 1.3, pease: 'power2.inOut' },
    ...slots,
    loop: { o: 1, params: { cx: 960, cy: 560, r: 200, draw: 1, labels: 1, ring: 0, dot: -1, exit: 0, hi: -1, hiA: 0 }, pdur: 3.3, pease: 'power2.inOut' },
    rail: { ver: 13, at: 0.8, dur: 1.0 },
  }, { cam: { x: 960, y: 540, s: 1 }, drift: 0 });
})();
