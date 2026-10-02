// Chapter 17 — Recap (storyboard v5, 51 beats). Ends the film.
(function () {
  const { T } = F;
  // A string exit on an element carried unchanged makes the engine re-tween it in the previous comp
  // (its spec object is replaced); set the exit style on the existing object instead and remove it.
  const c = (beats, delta = {}, opts = {}) => {
    const prev = FILM.COMPS[FILM.COMPS.length - 1];
    for (const id in delta) if (typeof delta[id] === 'string') { if (prev && prev.els[id]) prev.els[id].out = delta[id]; delta[id] = null; }
    return F.comp(beats, delta, opts);
  };
  F.chapter(K.CH[17]);
  const D = DRAW, U = D.util, rgba = D.rgba, clamp = U.clamp;
  const HAS_RIG = !!(window.THREE_SCENES && window.THREE_SCENES.rig);

  // ------------------------------------------------------------ chapter-local drawings
  // 2D stand-in for the chapter-4 rig (used only when the 3D module is not loaded); params yaw, a
  D.c17_rig = (ctx, p) => {
    const cx = 600, cy = 470, sk = 0.5 + 0.2 * Math.sin((p.yaw || 0) * 2);
    ctx.save(); ctx.globalAlpha *= p.a ?? 1;
    const box = (x, y, w, h, d, top, side, front) => {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w + d * sk, y - d * 0.5); ctx.lineTo(x + d * sk, y - d * 0.5); ctx.closePath(); ctx.fillStyle = top; ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w + d * sk, y - d * 0.5); ctx.lineTo(x + w + d * sk, y - d * 0.5 + h); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fillStyle = side; ctx.fill();
      ctx.fillStyle = front; ctx.fillRect(x, y, w, h);
    };
    box(cx - 420, cy + 120, 840, 40, 220, '#2A3038', '#1A1F25', '#22282F');
    for (let i = 0; i < 4; i++) box(cx - 360 + i * 190, cy + 40, 150, 80, 160, '#3A4452', '#262D36', '#2F3742');
    box(cx - 300, cy - 70, 600, 60, 160, T.BLUE, '#2F7F92', '#3E9DB3');
    box(cx - 280, cy - 98, 560, 10, 140, rgba(T.PURPLE, 0.9), '#6E5590', '#8A6BB0');
    ctx.restore();
  };
  // the gold cell's glow on the end frame; params a, x, y
  D.c17_glow = (ctx, p) => {
    const a = clamp((p.a || 0) * 3); if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a; ctx.shadowColor = T.GOLD; ctx.shadowBlur = 30 + 22 * Math.sin((p.a || 0) * Math.PI * 4) ** 2;
    U.rr(ctx, p.x - 56, p.y - 32, 112, 64, 9); ctx.fillStyle = rgba(T.GOLD, 0.45); ctx.fill();
    ctx.strokeStyle = T.GOLD; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
  };

  // ------------------------------------------------------------ helpers
  const cap = (html, o = {}) => Object.assign({ type: 'text', html: `<span class="cap" style="font-size:1em">${html}</span>`, size: 26, color: T.DIM, in: 'fade' }, o);
  const tag = (html, o = {}) => cap(html, Object.assign({ color: T.YELLOW }, o));
  const txt = (html, o = {}) => Object.assign({ type: 'text', html, size: 48, in: 'wipe' }, o);
  const GRID120 = { cols: 12, rows: 10, cw: 112, ch: 64, gap: 14 };
  const GP = (o) => Object.assign({}, GRID120, { reveal: 1, gold: 55, goldGlow: 1, ring: 0, dim: 0, sweep: 0, split: 0, lock: 0 }, o);

  // ================================================================ 530 (1 + 3.5) the gold chip lifts out of the TREE
  c(1, {
    ...K.rail(17),
    ...K.tree('tree', { x: 50, y: 540, size: 40, el: { s: 0.6, o: 0.45 } }),
    ...K.chip('chip', { x: 960, y: 540, s: 1.6 }),
    c17_out: txt('your agent’s only output: <span class="c-gold">a git diff</span>', { x: 960, y: 720, size: 64, at: 0.15, dur: 1.2 }),
  }, { clear: true, cam: { x: 960, y: 540, s: 1 }, drift: 0 });
  c(3.5, {
    chip: { y: 470, s: 1.8, dur: 1.6, ease: 'expo.out' },
    tree: { o: 0.15, x: 0, dur: 1.6 },
    c17_out: { y: 680 },
  }, { cam: { x: 960, y: 560, s: 1.18 } });

  // ================================================================ 531 (4.5) pull back: the GRID and the ruler
  const GX = 700, GY = 440, GS = 0.62;
  const [c55x, c55y] = D.gridCell(55, { w: 1920, h: 1080 }, GRID120, 960, 540);
  const cell = [GX + (c55x - 960) * GS, GY + (c55y - 540) * GS];
  c(4.5, {
    tree: 'fade', c17_out: 'up',
    chip: { x: cell[0], y: cell[1], s: 0.22, o: 0, dur: 1.2, ease: 'power3.inOut', at: 0.2 },
    grid: { type: 'canvas', draw: 'grid', x: GX, y: GY, s: GS, in: 'fade', params: GP({ goldGlow: 1 }), paramsFrom: { reveal: 0, goldGlow: 0 }, pdur: 1.8, pease: 'power2.out', at: 0.1 },
    c17_ruler: { type: 'canvas', draw: 'ruler', x: 960, y: 540, in: 'fade', at: 0.5, blocks: [], params: { x: 260, y: 860, w: 880, max: 6, ticks: 1, draw: 1, show: 0, a: 1 }, paramsFrom: { ticks: 0, draw: 0 }, pdur: 2.0 },
    c17_r1: txt('<span class="c-yellow">≈120</span> private tasks', { x: 1240, ax: 0, align: 'left', y: 300, size: 50, at: 0.6 }),
    c17_r2: txt('pytest <span class="c-green">exit 0</span> or nothing', { x: 1240, ax: 0, align: 'left', y: 430, size: 50, at: 1.2 }),
    c17_r3: txt('<span class="c-yellow">12 h</span> ≈ <span class="c-yellow">6 min</span> a task,<br><span class="c-dim">if run one at a time</span>', { x: 1240, ax: 0, align: 'left', y: 590, size: 50, lh: 1.2, at: 1.8 }),
    c17_d: tag('derived', { x: 1240, ax: 0, align: 'left', y: 690, size: 24, at: 2.2 }),
  }, { cam: { x: 960, y: 540, s: 1 }, sfx: [{ at: 1.3, kind: 'tick' }] });

  // ================================================================ 532 (4.5) the rig and the TAPE
  const rigEl = HAS_RIG
    ? { rig: { type: 'three', scene: 'rig', x: 580, y: 440, w: 1920, h: 1080, s: 0.66, in: 'fade', params: { yaw: 0.75, pitch: 45, dist: 20, ty: 0.6, lift: 0, split: 0, descend: 0, cards: 1, lora: 1, merge: 0, films: 0, pass: -1, glow: 0 }, paramsFrom: { yaw: 0.35 }, pease: 'sine.inOut' } }
    : { rig: { type: 'canvas', draw: 'c17_rig', x: 960, y: 540, in: 'fade', params: { yaw: 0.75, a: 1 }, paramsFrom: { yaw: 0.35 }, pease: 'sine.inOut' } };
  c(4.5, {
    grid: 'fade', c17_ruler: 'fade', c17_r1: 'up', c17_r2: 'up', c17_r3: 'up', c17_d: 'fade', chip: null,
    ...rigEl,
    c17_m1: txt('<span class="c-blue">Gemma 4 31B</span> INT4 on 4 × L4', { x: 1180, ax: 0, align: 'left', y: 300, size: 50, at: 0.5 }),
    c17_m2: txt('<span class="c-purple">LoRA</span> is your only lever on the weights', { x: 1180, ax: 0, align: 'left', y: 430, size: 50, maxw: 700, lh: 1.15, at: 1.1 }),
    c17_m3: txt('<span class="c-yellow">32,768</span> tokens that only grow', { x: 1180, ax: 0, align: 'left', y: 590, size: 50, at: 1.7 }),
    tape: { type: 'canvas', draw: 'tape', x: 960, y: 540, in: 'fade', at: 0.3, params: { x: 160, y: 840, w: 1600, h: 80, first: 1, n: 19, sliver: 1, ticks: 1, crack: 0, edgeGlow: 0.6 }, paramsFrom: { first: 0, n: 0, ticks: 0, edgeGlow: 0 }, pease: 'power1.inOut' },
  }, { cut: true });

  // ================================================================ 533 (4.5) the tool ring and containers A and B
  const bars = {};
  for (let i = 0; i < 6; i++) bars['c17_tb' + i] = { type: 'rect', x: 1450, y: 400 + i * 62, w: 400, h: 36, fill: '#3A4452', rad: 7, in: 'down', at: 0.9 + 0.06 * i };
  c(4.5, {
    rig: 'fade', tape: 'fade', c17_m1: 'up', c17_m2: 'up', c17_m3: 'up',
    ...K.container('contA', 'A', { x: 600, y: 500, w: 820, h: 640 }),
    ...K.container('contB', 'B', { x: 1450, y: 500, w: 560, h: 640 }),
    loop: { type: 'canvas', draw: 'loop', x: 960, y: 540, in: 'fade', at: 0.4, params: { cx: 600, cy: 520, r: 170, draw: 1, labels: 1, ring: 1, dot: 1.4, exit: 0, hi: -1 }, paramsFrom: { ring: 0, dot: 0 }, pease: 'power1.inOut' },
    ...bars,
    c17_tA: txt('<span class="c-teal">9 fixed tools</span>&ensp;·&ensp;work in <span class="c-blue">A</span>, judged in <span class="c-green">B</span>&ensp;·&ensp;keep the <span class="c-gold">patch</span> clean', { x: 960, y: 940, size: 46, at: 1.2 }),
  }, { cut: true, cam: { x: 960, y: 520, s: 1 } });

  // ================================================================ 534 (4.5) the full bundle TREE: what to build first, each item docked on the files it touches
  const BUILD = [
    '<span class="c-yellow">1</span> · a local harness: gold/null sweep',
    '<span class="c-yellow">2</span> · one <span class="c-blue">LlmAgent</span> with a sane <span class="m">eval_config</span>',
    '<span class="c-yellow">3</span> · log every run, hold out a repository',
  ];
  const TS = 40, TLH = TS * 1.55, TTOP = 540 - (8 * TLH + 0.3 * TS) / 2;
  const tY = (i) => TTOP + TLH * 1.5 + 0.3 * TS + TLH * i; // -1 submission/ · 0 agent.yaml … 6 eval_config.yaml
  const CY = [330, 540, 750];
  const cards = {};
  BUILD.forEach((h, i) => { cards['c17_c' + i] = { type: 'box', x: 1440, y: CY[i], w: 760, h: 130, stroke: T.INK, fill: 'rgba(21,26,33,0.95)', sw: 2.5, rad: 16, html: `<div style="padding:0 28px;text-align:left">${h}</div>`, size: 38, lh: 1.2, in: 'right', at: 0.5 + 0.55 * i }; });
  const hl = (id, i, at) => ({ [id]: { type: 'rect', ax: 0, x: 128, y: tY(i), w: 700, h: TLH - 8, fill: 'rgba(88,196,221,0.16)', rad: 8, in: 'grow', at, z: 0 } });
  const ar = (id, i, ty, tx, at) => ({ [id]: { type: 'arrow', x1: 1052, y1: CY[i], x2: tx, y2: ty, color: T.YELLOW, sw: 3, head: 14, in: 'draw', at, dur: 0.6 } });
  c(4.5, {
    contA: 'left', contA_hd: 'left', contA_ht: 'left', loop: 'left', c17_tA: 'down',
    contB: 'fade', contB_hd: 'fade', contB_ht: 'fade',
    ...Object.fromEntries(Object.keys(bars).map((k) => [k, 'fade'])),
    ...K.tree('tree', { x: 140, y: 540, size: TS, el: { s: 1, o: 1, in: 'fade', at: 0.15 } }),
    c17_bk: cap('what to build first', { x: 1440, y: 215, size: 28, color: T.YELLOW, at: 0.3 }),
    ...cards,
    ...ar('c17_a0', 0, tY(-1), 470, 0.95),
    ...hl('c17_h1', 0, 1.45), ...hl('c17_h2', 6, 1.55),
    ...ar('c17_a1', 1, tY(0), 520, 1.5), ...ar('c17_a2', 1, tY(6), 640, 1.6),
    c17_h3: { type: 'rect', ax: 0, x: 128, y: tY(5), w: 700, h: TLH - 8, fill: 'rgba(180,142,219,0.18)', rad: 8, in: 'grow', at: 2.1, z: 0 },
    c17_lat: cap('the logged passing runs feed <span class="m" style="text-transform:none">adapters/</span> later', { x: 1440, y: 845, size: 24, color: T.PURPLE, at: 2.3 }),
  }, { cam: { x: 960, y: 540, s: 1 }, sfx: [0, 1, 2].map((i) => ({ at: 0.6 + 0.55 * i, kind: 'click' })) });

  // ================================================================ 535 (4.5) the chip flies into container B; its tests wait
  const bars2 = {};
  for (let i = 0; i < 6; i++) bars2['c17_ub' + i] = { type: 'rect', x: 960, y: 430 + i * 54, w: 460, h: 36, fill: '#3A4452', rad: 7, in: 'down', at: 1.2 + 0.06 * i };
  c(4.5, {
    tree: 'left', c17_bk: 'fade', c17_c0: 'right', c17_c1: 'right', c17_c2: 'right', c17_lat: 'fade',
    c17_a0: 'quick', c17_a1: 'quick', c17_a2: 'quick', c17_h1: 'left', c17_h2: 'left', c17_h3: 'left',
    ...K.container('c17_B', 'B', { x: 960, y: 500, w: 640, h: 640 }),
    ...K.chip('chip', { x: 960, y: 325, s: 1.0, in: 'fade', from: { x: 300, y: 700, s: 0.6, o: 1 }, dur: 1.4, ease: 'expo.inOut', at: 0.3 }),
    ...bars2,
    c17_py: { type: 'mono', html: '<span class="c-dim">$</span> pytest&ensp;<span class="c-dim">…</span>', size: 40, x: 960, y: 770, in: 'wipe', at: 1.7 },
    c17_goal: txt('<span class="c-green">exit 0</span> is what you are building toward', { x: 960, y: 935, size: 58, at: 2.0 }),
  }, { cut: true, sfx: [{ at: 1.5, kind: 'pop' }] });

  // ================================================================ 536–538 the call to action
  c(4, {
    c17_cta: { type: 'text', html: '<span class="plate">Enter the competition.</span>', size: 130, x: 960, y: 520, in: 'zoom', at: 0.5, dur: 1.2 },
  }, { clear: true, keep: ['rail'], cut: true, cam: { x: 960, y: 540, s: 1 } });
  c(4.5, {
    c17_cta: { y: 380, s: 0.85, dur: 1.0, ease: 'expo.inOut' },
    c17_name: txt('Google – The <span class="c-blue">Gemma 4</span> Developer Agent Competition · on Kaggle', { x: 960, y: 560, size: 54, maxw: 1700, at: 0.7 }),
  });
  // 538 (+539) the deadline; the RAIL unfolds into a row of 17 chapter ticks that light in sequence
  const ticks = {};
  for (let k = 1; k <= 17; k++) ticks['c17_tk' + k] = { type: 'rect', x: 960 + (k - 9) * 52, y: 860, w: 5, h: 40, rad: 3, fill: k === 17 ? T.GOLD : T.INK, in: 'growh', at: 1.0 + 0.07 * k, dur: 0.4 };
  c(4.5, {
    c17_dl: txt('final submission: <span class="c-red">2 December 2026</span>, 23:59 UTC', { x: 960, y: 700, size: 54, at: 0.3 }),
    c17_name: { s: 0.98 },
    rail: { o: 0, dur: 0.6, at: 0.9 },
    ...ticks,
  }, { sfx: [{ at: 1.05, kind: 'tick' }] });
  // 540 (3) end card over the dim grid: sources
  const tickOut = {};
  for (let k = 1; k <= 17; k++) tickOut['c17_tk' + k] = 'fade';
  const SRC = 'sources: the competition page and the organizers’ harness guide (via a participant’s digest), community reports, and the Gemma 4 Developer Agent Research Roadmap';
  c(3, {
    ...tickOut, c17_cta: 'up', c17_name: 'up', c17_dl: 'up',
    grid: { type: 'canvas', draw: 'grid', x: 960, y: 500, in: 'fade', params: GP({ dim: 0.85, goldGlow: 0 }), paramsFrom: { reveal: 0 }, pdur: 2.0, pease: 'power2.out', at: 0.2 },
    c17_src: txt(`<span class="plate">${SRC}</span>`, { x: 960, y: 500, size: 40, maxw: 1500, lh: 1.5, color: T.INK, at: 0.5, dur: 1.4 }),
    c17_lab: cap('<span class="plate">hypotheses, concepts and derived values are labelled</span>', { x: 960, y: 690, size: 28, color: T.YELLOW, at: 1.2 }),
  }, { cut: true });
  // 541 (7) end frame: the gold cell glows; the title, the CTA and the sources hold ≥ 3.5 s before the fade
  const [gx, gy] = D.gridCell(55, { w: 1920, h: 1080 }, GRID120, 960, 500);
  c(7, {
    c17_src: { y: 960, size: 26, color: T.DIM, dur: 1.0, ease: 'expo.inOut' },
    c17_lab: { y: 1030, size: 24, dur: 1.0, ease: 'expo.inOut' },
    c17_glow: { type: 'canvas', draw: 'c17_glow', x: 960, y: 540, in: 'none', params: { a: 1, x: gx, y: gy }, paramsFrom: { a: 0 }, pease: 'sine.inOut', at: 0.1 },
    c17_title: txt('<span class="plate" style="white-space:nowrap">The <span class="c-blue">Gemma 4</span> Developer Agent Competition</span>', { x: 960, y: 290, size: 80, maxw: 1840, at: 0.15, dur: 1.0 }),
    c17_end: txt('<span class="plate" style="white-space:nowrap">Enter on Kaggle&ensp;·&ensp;final submission <span class="c-red">2 Dec 2026</span>, 23:59 UTC</span>', { x: 960, y: 690, size: 46, maxw: 1840, at: 0.45, dur: 1.0 }),
  }, { sfx: [{ at: 0.15, kind: 'tick' }] });
  // (1) fade to black on the last beat
  const all = {};
  ['grid', 'c17_src', 'c17_lab', 'c17_glow', 'c17_title', 'c17_end'].forEach((k) => { all[k] = { o: 0, dur: 0.6, ease: 'power2.in', at: 0.05 }; });
  c(1, all, { bg: { o: 0 }, drift: 0.3 });
})();
