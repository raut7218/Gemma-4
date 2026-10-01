// Chapter 13 — What you need to build (storyboard v5, 118 beats).
(function () {
  const { T } = F;
  // A string exit on an element carried unchanged makes the engine re-tween it in the previous comp
  // (its spec object is replaced); set the exit style on the existing object instead and remove it.
  const c = (beats, delta = {}, opts = {}) => {
    const prev = FILM.COMPS[FILM.COMPS.length - 1];
    for (const id in delta) if (typeof delta[id] === 'string') { if (prev && prev.els[id]) prev.els[id].out = delta[id]; delta[id] = null; }
    return F.comp(beats, delta, opts);
  };
  F.chapter(K.CH[13]);
  const D = DRAW, U = D.util, rgba = D.rgba;
  const lerp = (a, b, k) => a + (b - a) * k;

  // ------------------------------------------------------------ chapter-local drawings
  const pill = (ctx, x, y, w, h, col, label, size, a = 1, fillA = 0.12, lw = 3) => {
    ctx.save(); ctx.globalAlpha *= a;
    U.rr(ctx, x - w / 2, y - h / 2, w, h, h / 2); ctx.fillStyle = rgba(col, fillA); ctx.fill();
    ctx.lineWidth = lw; ctx.strokeStyle = rgba(col, 0.92); ctx.stroke(); ctx.restore();
    if (label) D.text(ctx, label, x, y + 2, { size, a, color: T.INK });
  };
  const arr = (ctx, x1, y1, x2, y2, col, a = 1, w = 3.5) => {
    ctx.save(); ctx.globalAlpha *= a;
    D.polyline(ctx, [[x1, y1], [x2, y2]], 1, { color: col, w });
    D.arrowHead(ctx, x2, y2, Math.atan2(y2 - y1, x2 - x1), 15, col); ctx.restore();
  };
  // a soft pulsing outline (ph counts pulses)
  D.c13_pulse = (ctx, p, sp) => {
    const a = (0.5 - 0.5 * Math.cos(2 * Math.PI * (p.ph || 0))) * (p.a ?? 1);
    if (a < 0.002) return;
    ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = sp.pcol || T.RED; ctx.lineWidth = 6;
    ctx.shadowColor = sp.pcol || T.RED; ctx.shadowBlur = 26;
    U.rr(ctx, p.x - p.w / 2 - 10, p.y - p.h / 2 - 10, p.w + 20, p.h + 20, 26); ctx.stroke(); ctx.restore();
  };
  // the six families, drawn in local coordinates around (0, 0)
  const FAM = [
    (ctx, col) => {
      const xs = [-360, 0, 360], nm = ['localize', 'repair', 'validate'];
      xs.forEach((x, i) => pill(ctx, x, 0, 250, 88, col, nm[i], 36));
      arr(ctx, -232, 0, -132, 0, T.DIM); arr(ctx, 128, 0, 228, 0, T.DIM);
    },
    (ctx) => { D.loop(ctx, { cx: 0, cy: 20, r: 200, draw: 1, labels: 1, ring: 0, dot: -1, exit: 0, hi: -1 }); },
    (ctx) => {
      D.loop(ctx, { cx: 0, cy: 20, r: 200, draw: 1, labels: 1, ring: 0, dot: -1, exit: 0, hi: -1 });
      const x = 173, y = 120;
      ctx.save(); U.rr(ctx, x - 175, y - 62, 350, 124, 14); ctx.fillStyle = T.PANEL; ctx.fill();
      ctx.strokeStyle = T.TEAL; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
      D.text(ctx, 'for f in files:', x - 150, y - 22, { mono: true, size: 28, color: T.TEAL, align: 'left' });
      D.text(ctx, '    check(f)', x - 150, y + 22, { mono: true, size: 28, color: T.TEAL, align: 'left' });
    },
    (ctx) => {
      D.loop(ctx, { cx: 0, cy: 20, r: 200, draw: 1, labels: 1, ring: 0, dot: -1, exit: 0, hi: -1 });
      const x = 173, y = 120;
      ctx.save(); U.rr(ctx, x - 135, y - 50, 270, 100, 50); ctx.fillStyle = T.BG; ctx.fill(); ctx.restore();
      const N = [[-95, -20], [-20, -45], [70, -30], [-60, 35], [25, 30], [110, 20]];
      const E = [[0, 1], [1, 2], [0, 3], [3, 4], [1, 4], [4, 5], [2, 5]];
      ctx.save(); ctx.strokeStyle = rgba(T.TEAL, 0.8); ctx.lineWidth = 3;
      E.forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(x + N[a][0], y + N[a][1]); ctx.lineTo(x + N[b][0], y + N[b][1]); ctx.stroke(); });
      N.forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(x + dx, y + dy, 12, 0, Math.PI * 2); ctx.fillStyle = T.TEAL; ctx.fill(); });
      ctx.restore();
    },
    (ctx, col) => {
      ctx.save(); U.rr(ctx, -470, -50, 110, 100, 12); ctx.strokeStyle = T.INK; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
      D.text(ctx, 'issue', -415, 0, { size: 28, color: T.DIM });
      [-180, -60, 60, 180].forEach((yy) => {
        D.polyline(ctx, [[-358, 0], [-150, yy]], 1, { color: rgba(T.DIM, 0.8), w: 3 });
        ctx.save(); U.rr(ctx, -150, yy - 24, 130, 48, 10); ctx.fillStyle = rgba(T.GOLD, 0.14); ctx.fill(); ctx.strokeStyle = T.GOLD; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
        D.polyline(ctx, [[-20, yy], [160, 0]], 1, { color: rgba(T.DIM, 0.8), w: 3 });
      });
      pill(ctx, 250, 0, 180, 84, col, 'judge', 34);
      arr(ctx, 342, 0, 392, 0, T.DIM);
      ctx.save(); U.rr(ctx, 398, -26, 110, 52, 10); ctx.fillStyle = rgba(T.GOLD, 0.2); ctx.fill(); ctx.strokeStyle = T.GOLD; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    },
    (ctx) => {
      ctx.save(); ctx.translate(0, -90); ctx.scale(0.72, 0.72);
      D.loop(ctx, { cx: 0, cy: 0, r: 200, draw: 1, labels: 1, ring: 0, dot: -1, exit: 0, hi: -1 }); ctx.restore();
      [-310, 310].forEach((cx) => {
        D.polyline(ctx, [[cx * 0.35, 20], [cx, 150]], 1, { color: rgba(T.DIM, 0.8), w: 3, dash: [10, 10] });
        ctx.save(); ctx.translate(cx, 215); ctx.scale(0.38, 0.38);
        D.loop(ctx, { cx: 0, cy: 0, r: 200, draw: 1, labels: 0, ring: 0, dot: -1, exit: 0, hi: -1 }); ctx.restore();
      });
    },
  ];
  // params: a0..a5 (each big), row 0..1 (shrink into a row), f0..f5 (fit: +1 forward, <0 recede), m (A+B merge away)
  D.c13_fam = (ctx, p) => {
    for (let i = 0; i < 6; i++) {
      const row = U.clamp(p.row || 0), f = p['f' + i] || 0, m = U.clamp(p.m || 0);
      let a = Math.max(U.clamp(p['a' + i] || 0), row);
      if (f < 0) a *= lerp(1, 0.28, Math.min(1, -f));
      const rx = 960 + (i - 2.5) * 300, ry = 500 - 34 * Math.max(0, f);
      let x = lerp(960, rx, U.ease(row)), y = lerp(560, ry, U.ease(row));
      let s = lerp(1, 0.31 + 0.05 * Math.max(0, f), U.ease(row));
      if (i <= 1) { x = lerp(x, 960, U.ease(m)); y = lerp(y, 420, U.ease(m)); s = lerp(s, 0.45, U.ease(m)); }
      a *= 1 - m;
      if (a < 0.003) continue;
      ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(s, s);
      FAM[i](ctx, f > 0 ? T.BLUE : T.BLUE);
      ctx.restore();
    }
  };
  // the candidate pipeline as one drawing; spec.layout 'h' | 'v'; params cx, cy, s, act (highlighted stage), a
  D.c13_pipe = (ctx, p, sp) => {
    const v = sp.layout === 'v';
    ctx.save(); ctx.globalAlpha *= p.a ?? 1; ctx.translate(p.cx, p.cy); ctx.scale(p.s || 1, p.s || 1);
    const hi = (i) => U.clamp(1 - Math.abs((p.act ?? -5) - i));
    const names = ['Localize', 'Reproduce', 'Patch', 'Verify', 'Submit'];
    const P = v ? [[0, -270], [0, -135], [-118, 25], [118, 25], [0, 185]] : [[-640, 0], [-330, 0], [-20, 0], [240, 0], [560, 0]];
    const W = v ? 210 : 220, H = 66, fs = v ? 32 : 28;
    // bracket (LoopAgent) around Patch ⇄ Verify
    const bx = v ? -250 : -160, bw = v ? 500 : 530, by = (v ? 25 : 0) - 62, bh = 124;
    ctx.save(); U.rr(ctx, bx, by, bw, bh, 22); ctx.strokeStyle = rgba(T.INK, 0.55 + 0.4 * Math.max(hi(2), hi(3))); ctx.lineWidth = 2.5; ctx.setLineDash([12, 9]); ctx.stroke(); ctx.restore();
    names.forEach((n, i) => {
      const col = i === 4 ? T.GOLD : T.BLUE;
      pill(ctx, P[i][0], P[i][1], W, H, col, n, fs, 0.55 + 0.45 * Math.max(hi(i), p.all ?? 0), 0.08 + 0.3 * hi(i), 3 + 2 * hi(i));
    });
    const A = (a, b) => {
      const [x1, y1] = P[a], [x2, y2] = P[b];
      if (v) arr(ctx, x1, y1 + H / 2 + 6, x2, y2 - H / 2 - (b === 2 ? 30 : 8), T.DIM, 0.9);
      else arr(ctx, x1 + W / 2 + 6, y1, x2 - W / 2 - (b === 2 ? 22 : 8), y2, T.DIM, 0.9);
    };
    A(0, 1); A(1, 2);
    if (v) arr(ctx, 0, by + bh + 4, 0, P[4][1] - H / 2 - 8, T.DIM, 0.9);
    else arr(ctx, bx + bw + 4, 0, P[4][0] - W / 2 - 8, 0, T.DIM, 0.9);
    // ⇄ between Patch and Verify
    const mx = (P[2][0] + P[3][0]) / 2, my = P[2][1];
    D.text(ctx, '⇄', mx, my, { size: 34, color: T.DIM });
    ctx.restore();
  };
  // a red crack between two tapes
  D.c13_crack = (ctx, p) => {
    const k = U.clamp(p.k || 0); if (k <= 0) return;
    const x = p.x, y = p.y;
    D.polyline(ctx, [[x, y - 70], [x - 14, y - 30], [x + 12, y - 4], [x - 12, y + 26], [x + 8, y + 70]], k, { color: T.RED, w: 5 });
  };
  // a balance: params cx, cy, tilt (deg), a, draw
  D.c13_balance = (ctx, p) => {
    const cx = p.cx, cy = p.cy, L = 560, th = (p.tilt || 0) * Math.PI / 180, k = U.clamp(p.draw ?? 1);
    ctx.save(); ctx.globalAlpha *= p.a ?? 1;
    ctx.beginPath(); ctx.moveTo(cx, cy + 6); ctx.lineTo(cx - 46, cy + 86); ctx.lineTo(cx + 46, cy + 86); ctx.closePath();
    ctx.fillStyle = rgba(T.DIM, 0.35 * k); ctx.fill(); ctx.strokeStyle = rgba(T.INK, 0.8 * k); ctx.lineWidth = 3; ctx.stroke();
    const dx = Math.cos(th) * L * k, dy = Math.sin(th) * L * k;
    D.polyline(ctx, [[cx - dx, cy - dy], [cx + dx, cy + dy]], 1, { color: T.INK, w: 5 });
    [[cx - dx, cy - dy], [cx + dx, cy + dy]].forEach(([x, y]) => {
      D.polyline(ctx, [[x - 90, y - 4], [x + 90, y - 4]], k, { color: T.INK, w: 5 });
      ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fillStyle = T.INK; ctx.fill();
    });
    ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fillStyle = T.YELLOW; ctx.fill();
    ctx.restore();
  };

  // ------------------------------------------------------------ helpers
  const cap = (html, o = {}) => Object.assign({ type: 'text', html: `<span class="cap" style="font-size:1em">${html}</span>`, size: 26, color: T.DIM, in: 'fade' }, o);
  const tag = (html, o = {}) => cap(html, Object.assign({ color: T.YELLOW }, o));
  const txt = (html, o = {}) => Object.assign({ type: 'text', html, size: 48, in: 'wipe' }, o);
  const LOOP = (o = {}) => Object.assign({ cx: 960, cy: 560, r: 200, draw: 1, labels: 1, ring: 0, dot: -1, exit: 0, hi: -1 }, o);
  const loopEl = (o) => ({ type: 'canvas', draw: 'loop', x: 960, y: 540, params: LOOP(o) });

  // the six slots of the anatomy
  const SL = [
    { k: 'model', x: 330, y: 300, col: T.BLUE, d: 'fixed · change it only through <span class="c-purple">LoRA</span>' },
    { k: 'control flow', x: 330, y: 560, col: T.INK, d: 'your YAML agents' },
    { k: 'tools', x: 330, y: 820, col: T.TEAL, d: '<span class="c-teal">9 fixed</span> + skills + sub-agents' },
    { k: 'context', x: 1590, y: 300, col: T.INK, d: 'the <span class="c-yellow">32k</span> window' },
    { k: 'environment', x: 1590, y: 560, col: T.INK, d: 'offline container' },
    { k: 'verifier / selector', x: 1590, y: 820, col: T.RED, d: '' },
  ];
  const SW = 520, SH = 190;
  const slotBox = (i, o = {}) => Object.assign({ type: 'box', x: SL[i].x, y: SL[i].y, w: SW, h: SH, stroke: '#3A4654', fill: 'rgba(21,26,33,0.6)', sw: 3, rad: 20, html: '', in: 'draw', dur: 0.9 }, o);
  const slotLab = (i, o = {}) => cap(SL[i].k, Object.assign({ x: SL[i].x, y: SL[i].y - 58, size: 26 }, o));
  const slotDesc = (i, o = {}) => txt(SL[i].d, Object.assign({ x: SL[i].x, y: SL[i].y + 22, size: 40, maxw: 470, lh: 1.15, z: 3 }, o));
  const fillSlot = (i, at) => ({
    ['c13_sb' + i]: { stroke: SL[i].col, fill: rgba(SL[i].col === T.INK ? '#ECE9E2' : SL[i].col, 0.07), at, dur: 0.7, ease: 'power3.out' },
    ['c13_sl' + i]: { color: SL[i].col === T.INK ? T.INK : SL[i].col, at, dur: 0.6 },
    ['c13_sd' + i]: slotDesc(i, { at: at + 0.15 }),
  });

  // ================================================================ 433 (3.5) six empty slots around the LOOP
  const slots0 = {};
  SL.forEach((s, i) => { slots0['c13_sb' + i] = slotBox(i, { at: 0.15 + 0.16 * i }); slots0['c13_sl' + i] = slotLab(i, { at: 0.45 + 0.16 * i }); });
  c(3.5, { ...K.rail(13), loop: loopEl(), ...slots0 }, { clear: true, cam: { x: 960, y: 540, s: 1 }, drift: 0 });
  // 434 (4.5) model · control flow fill
  c(4.5, { ...fillSlot(0, 0.2), ...fillSlot(1, 1.5), loop: { params: LOOP({ dot: 1.3 }), pease: 'none' } }, { cam: { x: 960, y: 540, s: 1.02 }, sfx: [{ at: 0.25, kind: 'tick' }, { at: 1.55, kind: 'tick' }] });
  // 435 (4.5) tools · context fill
  c(4.5, { ...fillSlot(2, 0.2), ...fillSlot(3, 1.5), loop: { params: LOOP({ dot: 2.6, ring: 1 }), pease: 'none' } }, { sfx: [{ at: 0.25, kind: 'tick' }, { at: 1.55, kind: 'tick' }] });
  // 436 (3) environment; the verifier stays empty and pulses red
  c(3, {
    ...fillSlot(4, 0.15),
    c13_sb5: { stroke: T.RED, at: 0.9, dur: 0.6 }, c13_sl5: { color: T.RED, at: 0.9 },
    c13_pulse: { type: 'canvas', draw: 'c13_pulse', pcol: T.RED, in: 'none', params: { x: SL[5].x, y: SL[5].y, w: SW, h: SH, ph: 2, a: 1 }, paramsFrom: { ph: 0 }, pease: 'none', at: 0.7 },
    loop: { params: LOOP({ dot: 3.4, ring: 1 }), pease: 'none' },
  }, { sfx: [{ at: 0.2, kind: 'tick' }] });
  // 437 (4.5) CLOSE the verifier zooms forward
  const dimSlots = {};
  for (let i = 0; i < 5; i++) { dimSlots['c13_sb' + i] = { o: 0 }; dimSlots['c13_sl' + i] = { o: 0 }; dimSlots['c13_sd' + i] = { o: 0 }; }
  c(4.5, {
    ...dimSlots, c13_pulse: null,
    loop: { o: 0, params: LOOP({ dot: 3.9, ring: 1 }) },
    c13_sb5: { x: 960, y: 560, w: 1500, h: 600, fill: 'rgba(21,26,33,0.94)', z: 5, dur: 1.0, ease: 'expo.inOut' },
    c13_sl5: { x: 960, y: 330, size: 34, z: 6, dur: 1.0, ease: 'expo.inOut' },
    c13_v1: txt('nothing built in — <span class="c-red">you create it</span>', { x: 960, y: 480, size: 76, z: 6, at: 0.9 }),
    c13_v2: txt('a reproduction script&ensp;·&ensp;a judge sub-agent', { x: 960, y: 640, size: 52, color: T.INK, z: 6, at: 1.7 }),
  }, { cam: { x: 960, y: 540, s: 1 } });

  // ================================================================ 438–443 the LOOP morphs through the families
  const FP = (o) => Object.assign({ a0: 0, a1: 0, a2: 0, a3: 0, a4: 0, a5: 0, row: 0, m: 0, f0: 0, f1: 0, f2: 0, f3: 0, f4: 0, f5: 0 }, o);
  const FNAMES = [
    'A · fixed workflow <span class="c-dim">(Agentless)</span>',
    'B · tool loop <span class="c-dim">(SWE-agent)</span>',
    'C · code as action <span class="c-dim">(OpenHands)</span>&ensp;<span class="cap c-yellow" style="font-size:0.42em">concept</span>',
    'D · structure-aware search <span class="c-dim">(AutoCodeRover)</span>',
    'E · test-time scaling <span class="c-dim">(attempts + a judge)</span>',
    'F · multi-agent <span class="c-dim">(a lead loop with child loops)</span>',
  ];
  const clearIds = { c13_v1: 'shrink', c13_v2: 'shrink', c13_sb5: 'shrink', c13_sl5: 'fade' };
  for (let i = 0; i < 5; i++) { clearIds['c13_sb' + i] = 'quick'; clearIds['c13_sl' + i] = 'quick'; clearIds['c13_sd' + i] = 'quick'; }
  c(3.5, {
    ...clearIds, loop: 'fade',
    c13_fam: { type: 'canvas', draw: 'c13_fam', in: 'fade', dur: 0.5, params: FP({ a0: 1 }), at: 0.3 },
    c13_fname: { type: 'text', versions: FNAMES, ver: 0, size: 60, x: 960, y: 190, in: 'wipe', at: 0.4 },
  }, { cut: true, cam: { x: 960, y: 540, s: 1 } });
  c(2, { c13_fam: { params: FP({ a1: 1 }), pdur: 0.9 }, c13_fname: { ver: 1, dur: 0.7 } });
  c(2, { c13_fam: { params: FP({ a2: 1 }), pdur: 0.9 }, c13_fname: { ver: 2, dur: 0.7 } });
  c(2, { c13_fam: { params: FP({ a3: 1 }), pdur: 0.9 }, c13_fname: { ver: 3, dur: 0.7 } });
  c(2, { c13_fam: { params: FP({ a4: 1 }), pdur: 0.9 }, c13_fname: { ver: 4, dur: 0.7 } });
  c(2, { c13_fam: { params: FP({ a5: 1 }), pdur: 0.9 }, c13_fname: { ver: 5, dur: 0.7 } });
  // 444 (3) six small shapes in a row; A, B, F step forward
  const RN = ['A<br><span class="c-dim">fixed workflow</span>', 'B<br><span class="c-dim">tool loop</span>', 'C<br><span class="c-dim">code as action</span>', 'D<br><span class="c-dim">structure-aware search</span>', 'E<br><span class="c-dim">test-time scaling</span>', 'F<br><span class="c-dim">multi-agent</span>'];
  const rowLabs = {};
  RN.forEach((h, i) => { rowLabs['c13_rl' + i] = { type: 'text', html: h, size: 34, lh: 1.2, maxw: 270, x: 960 + (i - 2.5) * 300, y: 720, in: 'rise', at: 0.5 + 0.06 * i }; });
  c(3, {
    c13_fname: 'up',
    c13_fam: { params: FP({ row: 1, f0: 1, f1: 1, f5: 1 }), pdur: 1.4, pease: 'expo.inOut' },
    ...rowLabs,
    c13_fit: txt('<span class="c-blue">A</span>, <span class="c-blue">B</span> and <span class="c-blue">F</span> — good fit', { x: 960, y: 220, size: 60, at: 1.1 }),
  });
  // 445 (4.5) C and D recede; E dims; the corner tag stays
  c(4.5, {
    c13_fam: { params: FP({ row: 1, f0: 1, f1: 1, f5: 1, f2: -1, f3: -1, f4: -0.55 }), pdur: 1.2 },
    c13_rl2: { o: 0.3 }, c13_rl3: { o: 0.3 }, c13_rl4: { o: 0.6 },
    c13_e: txt('<span class="c-dim">E — only if time allows</span>', { x: 960, y: 880, size: 48, at: 0.9 }),
    c13_tagA: tag('the roadmap’s assessment, not a measured result', { x: 1840, ax: 1, align: 'right', y: 130, at: 1.6 }),
  });
  // 446 (3.5) A and B merge into the candidate pipeline
  const PY = 420;
  const ST = { loc: [230, 280], rep: [600, 280], pat: [1015, 250], ver: [1325, 250], sub: [1710, 260] };
  const stage = (k, html, col, at) => ({ type: 'box', x: ST[k][0], y: PY, w: ST[k][1], h: 110, stroke: col, fill: rgba(col, 0.08), sw: 3.5, rad: 55, html, size: 42, in: 'scale', at });
  const rowOut = {};
  for (let i = 0; i < 6; i++) rowOut['c13_rl' + i] = 'fade';
  c(3.5, {
    ...rowOut, c13_fit: 'up', c13_e: 'down',
    c13_fam: { params: FP({ row: 1, f0: 1, f1: 1, f5: 1, f2: -1, f3: -1, f4: -0.55, m: 1 }), pdur: 1.0, pease: 'power3.in' },
    c13_bracket: { type: 'box', x: 1170, y: PY, w: 660, h: 200, stroke: T.DIM, fill: 'rgba(0,0,0,0)', sw: 2.5, rad: 28, html: '', in: 'draw', at: 1.3 },
    c13_loc: stage('loc', 'Localize', T.BLUE, 0.8),
    c13_rep: stage('rep', 'Reproduce', T.BLUE, 0.95),
    c13_pat: stage('pat', 'Patch', T.BLUE, 1.1),
    c13_ver: stage('ver', 'Verify', T.BLUE, 1.25),
    c13_sub: stage('sub', 'Submit', T.GOLD, 1.4),
    c13_a1: { type: 'arrow', x1: 374, y1: PY, x2: 456, y2: PY, color: T.DIM, sw: 4, head: 16, flow: 0, at: 1.5 },
    c13_a2: { type: 'arrow', x1: 744, y1: PY, x2: 836, y2: PY, color: T.DIM, sw: 4, head: 16, flow: 0, at: 1.6 },
    c13_a3: { type: 'arrow', x1: 1504, y1: PY, x2: 1576, y2: PY, color: T.DIM, sw: 4, head: 16, flow: 0, at: 1.7 },
    c13_pv1: { type: 'arrow', x1: 1142, y1: PY - 18, x2: 1198, y2: PY - 18, color: T.DIM, sw: 3, head: 13, at: 1.8 },
    c13_pv2: { type: 'arrow', x1: 1198, y1: PY + 18, x2: 1142, y2: PY + 18, color: T.DIM, sw: 3, head: 13, at: 1.9 },
  }, { cam: { x: 960, y: 540, s: 1 } });
  // 447 (4.5) "candidate · a hypothesis to test"; a pulse runs the pipeline
  c(4.5, {
    c13_tagA: 'fade', c13_fam: null,
    c13_tagC: tag('candidate&ensp;·&ensp;a hypothesis to test', { x: 960, y: 190, size: 30, at: 0.2 }),
    c13_a1: { flow: 1, at: 0.4, dur: 1.0, ease: 'none' }, c13_a2: { flow: 1, at: 1.2, dur: 1.0, ease: 'none' }, c13_a3: { flow: 1, at: 2.0, dur: 1.0, ease: 'none' },
  }, { cam: { x: 960, y: 470, s: 1.04 } });
  // 448 (4.5) how it's wired
  c(4.5, {
    c13_state: { type: 'rect', x: 970, y: 545, w: 1500, h: 6, fill: '#3A4654', rad: 3, in: 'grow', at: 0.1 },
    c13_stateL: cap('session state', { x: 220, y: 575, ax: 0, align: 'left', at: 0.6 }),
    c13_l1: txt('each stage an <span class="c-blue">LlmAgent</span> with a restricted tool list', { x: 960, y: 660, size: 46, at: 0.5 }),
    c13_l2: txt('results passed forward through state <span class="m c-dim">(output_key)</span>', { x: 960, y: 740, size: 46, at: 1.6 }),
  }, { cam: { x: 960, y: 520, s: 1 } });
  // 449 (2.5) the bracket lights: LoopAgent
  c(2.5, {
    c13_bracket: { stroke: T.BLUE, sw: 3.5, fill: 'rgba(88,196,221,0.05)', dur: 0.6 },
    c13_loopL: { type: 'text', html: '<span class="m c-blue">LoopAgent</span>', size: 40, x: 1170, y: PY - 136, in: 'rise', at: 0.2 },
  }, { sfx: [{ at: 0.2, kind: 'tick' }] });
  // 450 (4.5) two stages get purple tabs
  const tab = (x, at) => ({ type: 'rect', x, y: PY - 64, w: 110, h: 22, fill: T.PURPLE, rad: 6, in: 'growh', at, z: 4 });
  c(4.5, {
    c13_tab1: tab(ST.loc[0], 0.3), c13_tab2: tab(ST.pat[0], 0.5),
    c13_l3: txt('<span class="c-purple">optional LoRA per stage</span>', { x: 960, y: 830, size: 46, at: 0.9 }),
  });
  // 451–453 three reasons
  const R = [
    '1 · explicit localization and reproduction stages help weaker models <span class="c-dim">(Agentless, Kimi-Dev)</span>',
    '2 · clean-context stages pass short summaries through state',
    '3 · looping is easier to bound stage by stage <span class="c-dim">(SWE-Protégé)</span>',
  ];
  c(4.5, {
    c13_l1: 'left', c13_l2: 'left', c13_l3: 'left',
    c13_why: cap('why this shape', { x: 960, y: 620, size: 28, at: 0.4 }),
    c13_r1: txt(R[0], { x: 960, y: 700, size: 42, maxw: 1760, at: 0.6 }),
    c13_loc: { s: 1.06, fill: 'rgba(88,196,221,0.22)', at: 0.6 }, c13_rep: { s: 1.06, fill: 'rgba(88,196,221,0.22)', at: 0.7 },
  });
  c(4.5, {
    c13_r1: { o: 0.55 },
    c13_loc: { s: 1, fill: 'rgba(88,196,221,0.08)' }, c13_rep: { s: 1, fill: 'rgba(88,196,221,0.08)' },
    c13_state: { fill: T.BLUE, h: 8, at: 0.3 },
    c13_r2: txt(R[1], { x: 960, y: 790, size: 42, at: 0.5 }),
  });
  c(4.5, {
    c13_r2: { o: 0.55 }, c13_state: { fill: '#3A4654', h: 6 },
    c13_bracket: { s: 1.05, fill: 'rgba(88,196,221,0.14)', at: 0.6 },
    c13_r3: txt(R[2], { x: 960, y: 880, size: 42, at: 0.5 }),
  });

  // ================================================================ 454–460 [PEAK] the candidate runs (concept)
  const TOOLS = ['run_command', 'read_file', 'edit_file', 'write_file', 'get_status', 'submit_patch', 'get_code_neighbors', 'search_similar_code', 'get_code_subgraph'];
  const LIT = { run_command: 1, read_file: 1, get_code_neighbors: 1, search_similar_code: 1, get_code_subgraph: 1 };
  const ring = {};
  TOOLS.forEach((n, i) => {
    const a = -Math.PI / 2 + (i / 9) * Math.PI * 2;
    ring['c13_t' + i] = { type: 'text', html: `<span class="m">${n}</span>`, size: 32, color: LIT[n] ? T.TEAL : '#56616D', x: 960 + Math.cos(a) * 600, y: 550 + Math.sin(a) * 205, in: 'pop', at: 0.6 + 0.07 * i };
  });
  const PIPE = (o) => ({ type: 'canvas', draw: 'c13_pipe', layout: 'h', x: 960, y: 540, in: 'fade', params: Object.assign({ cx: 1000, cy: 175, s: 0.92, act: 0, a: 1, all: 0 }, o) });
  c(4.5, {
    ...K.rail(13), c13_pipe: PIPE({ act: 0 }),
    c13_conc: tag('concept · not a real trajectory', { x: 1840, ax: 1, align: 'right', y: 1035, at: 0.2 }),
    c13_iss: { type: 'text', html: '<span class="m c-dim">issue: summarize([]) raises ZeroDivisionError</span>', size: 30, x: 960, y: 268, in: 'fade', at: 0.3 },
    c13_stage: { type: 'box', x: 960, y: 530, w: 420, h: 124, stroke: T.BLUE, fill: 'rgba(88,196,221,0.12)', sw: 4, rad: 62, versions: ['Localize', 'Reproduce'], ver: 0, size: 52, in: 'scale', at: 0.15 },
    ...ring,
    c13_sbox: { type: 'box', x: 960, y: 905, w: 1520, h: 140, stroke: '#3A4654', fill: 'rgba(21,26,33,0.92)', sw: 2.5, rad: 18, html: '', in: 'draw', at: 0.4 },
    c13_sboxL: cap('session state', { x: 220, y: 857, ax: 0, align: 'left', size: 24, at: 0.8 }),
  }, { clear: true, cut: true, cam: { x: 960, y: 540, s: 1 } });
  // 455 (2.5) Localize writes localized = "src/stats.py:6"
  const ringOut = {};
  TOOLS.forEach((n, i) => { ringOut['c13_t' + i] = 'quick'; });
  c(2.5, {
    ...ringOut,
    c13_st1: { type: 'mono', html: 'localized = <span class="c-gold">"src/stats.py:6"</span>', size: 38, x: 600, y: 915, in: 'fade', from: { x: 960, y: 600, s: 0.6 }, dur: 1.0, ease: 'expo.inOut', at: 0.2, z: 4 },
  }, { sfx: [{ at: 1.0, kind: 'tick' }] });
  // 456 (2) Reproduce starts with a clean context
  c(2, {
    c13_pipe: { params: Object.assign({}, PIPE().params, { act: 1 }), pdur: 0.8 },
    c13_stage: { ver: 1, dur: 0.5 },
    c13_ic: { type: 'mono', html: 'include_contents = <span class="c-yellow">none</span>', size: 36, x: 960, y: 645, in: 'wipe', at: 0.2 },
    c13_rtape: { type: 'canvas', draw: 'tape', x: 960, y: 540, in: 'fade', params: { x: 560, y: 735, w: 800, h: 60, first: 1, n: 0, sliver: 1, ticks: 0, crack: 0 }, paramsFrom: { first: 0 }, pdur: 1.2, at: 0.3 },
    c13_ro: { type: 'text', html: 'its own window starts nearly empty and reads only <span class="m c-gold">{localized}</span>', size: 40, x: 960, y: 800, in: 'fade', at: 0.6 },
  });
  // 457 (2.5) the repro fails; state gains repro = "fails"
  c(2.5, {
    c13_ro: 'fade',
    c13_rtape: { params: { x: 560, y: 735, w: 800, h: 60, first: 1, n: 1.5, sliver: 1, ticks: 0, crack: 0 }, pdur: 1.4 },
    c13_rr: { type: 'mono', html: '$ python /tmp/repro.py&ensp;<span class="c-red">→ fails</span>', size: 38, x: 960, y: 405, in: 'wipe', at: 0.15 },
    c13_st2: { type: 'mono', html: 'repro = <span class="c-red">"fails"</span>', size: 38, x: 1400, y: 915, in: 'fade', from: { x: 960, y: 405, s: 0.6 }, dur: 0.9, ease: 'expo.inOut', at: 1.0, z: 4 },
  }, { sfx: [{ at: 0.6, kind: 'click' }] });
  // 458 (4.5) the LoopAgent bracket: iteration 1; Patch runs edit_file on line 6
  c(4.5, {
    c13_stage: 'fade', c13_ic: 'fade', c13_rtape: 'fade', c13_rr: 'fade',
    c13_pipe: { params: Object.assign({}, PIPE().params, { act: 2 }), pdur: 0.8 },
    c13_lb: { type: 'box', x: 960, y: 560, w: 1240, h: 430, stroke: T.BLUE, fill: 'rgba(88,196,221,0.04)', sw: 3.5, rad: 28, html: '', in: 'draw', at: 0.15 },
    c13_lbL: { type: 'text', versions: ['<span class="m c-blue">LoopAgent</span>&ensp;<span class="c-dim">iteration 1 of max_iterations</span>', '<span class="m c-blue">LoopAgent</span>&ensp;<span class="c-green">exits after iteration 1</span>'], ver: 0, size: 38, x: 960, y: 395, in: 'wipe', at: 0.4 },
    c13_pp: { type: 'box', x: 720, y: 475, w: 260, h: 84, stroke: T.BLUE, fill: 'rgba(88,196,221,0.22)', sw: 4, rad: 42, html: 'Patch', size: 40, in: 'scale', at: 0.5 },
    c13_vp: { type: 'box', x: 1200, y: 475, w: 260, h: 84, stroke: T.BLUE, fill: 'rgba(88,196,221,0.04)', sw: 3, rad: 42, html: 'Verify', size: 40, o: 0.5, in: 'scale', at: 0.6 },
    c13_pva: { type: 'text', html: '⇄', size: 52, color: T.DIM, x: 960, y: 475, in: 'fade', at: 0.7 },
    c13_ed: { type: 'mono', html: '<span class="c-teal">edit_file</span>  src/stats.py\n<span class="del">-     return total / len(xs)</span>\n<span class="c-gold">+     return total / len(xs) if xs else 0</span>', size: 34, lh: 1.5, x: 960, y: 625, in: 'wipe', dur: 1.4, at: 1.1 },
  }, { sfx: [{ at: 1.3, kind: 'click' }] });
  // 459 (2) Verify → green; the bracket exits early
  c(2, {
    c13_pp: { fill: 'rgba(88,196,221,0.04)', o: 0.6, sw: 3 }, c13_vp: { fill: 'rgba(131,193,103,0.2)', stroke: T.GREEN, o: 1, sw: 4 },
    c13_pipe: { params: Object.assign({}, PIPE().params, { act: 3 }), pdur: 0.6 },
    c13_ok: { type: 'text', html: '<span class="c-green">repro passes&ensp;·&ensp;nearby tests pass</span>', size: 42, x: 960, y: 735, in: 'wipe', at: 0.2 },
    c13_lbL: { ver: 1, at: 0.8, dur: 0.5 },
  }, { sfx: [{ at: 0.3, kind: 'tick' }] });
  // 460 (2) Submit: the gold chip forms
  c(2, {
    c13_lb: 'shrink', c13_lbL: 'fade', c13_pp: 'shrink', c13_vp: 'shrink', c13_pva: 'quick', c13_ed: 'fade', c13_ok: 'fade',
    c13_pipe: { params: Object.assign({}, PIPE().params, { act: 4 }), pdur: 0.6 },
    c13_sp: { type: 'mono', html: '<span class="c-gold">submit_patch()</span>', size: 40, x: 960, y: 450, in: 'fade', at: 0.25 },
    ...K.chip('c13_chip', { x: 960, y: 580, s: 1.5, at: 0.4 }),
  }, { sfx: [{ at: 0.45, kind: 'pop' }] });

  // ================================================================ 461–463 four short tapes vs one long tape
  const SHORT = [['localize', 160, 3], ['reproduce', 573, 2], ['patch ⇄ verify', 986, 4], ['submit', 1400, 0.6]];
  const tapes = {};
  SHORT.forEach(([n, x, k], i) => {
    tapes['c13_tp' + i] = { type: 'canvas', draw: 'tape', x: 960, y: 540, in: 'fade', at: 0.5 + 0.12 * i, params: { x, y: 700, w: 360, h: 70, first: 1, n: k, sliver: 1, ticks: 0, crack: 0 }, paramsFrom: { first: 0, n: 0 }, pdur: 2.2 };
    tapes['c13_tl' + i] = cap(n, { x: x + 180, y: 630, at: 0.6 + 0.12 * i });
  });
  c(3.5, {
    c13_long: { type: 'canvas', draw: 'tape', x: 960, y: 540, in: 'fade', params: { x: 160, y: 360, w: 1600, h: 86, first: 1, n: 17, sliver: 1, ticks: 1, crack: 0, edgeGlow: 0.7 }, paramsFrom: { first: 0, n: 0, ticks: 0, edgeGlow: 0 }, pdur: 2.4, pease: 'power2.out' },
    c13_longL: cap('one agent · one window', { x: 160, y: 280, ax: 0, align: 'left', size: 28 }),
    c13_stL: cap('four stages · four clean windows', { x: 160, y: 560, ax: 0, align: 'left', size: 28, at: 0.4 }),
    ...tapes,
    c13_conc2: tag('concept', { x: 1840, ax: 1, align: 'right', y: 130 }),
  }, { clear: true, keep: ['rail'], cut: true, cam: { x: 960, y: 540, s: 1 } });
  // 462 (4.5) a crack on the Localize → Reproduce boundary
  c(4.5, {
    c13_crack: { type: 'canvas', draw: 'c13_crack', x: 960, y: 540, in: 'none', params: { x: 546, y: 700, k: 1 }, paramsFrom: { k: 0 }, pdur: 0.8, pease: 'power2.out', at: 0.3 },
    c13_tp0: { o: 0.6 }, c13_tp1: { o: 0.6 },
    c13_lose: txt('every stage boundary <span class="c-red">loses information</span>', { x: 960, y: 860, size: 56, at: 0.8 }),
  }, { sfx: [{ at: 0.35, kind: 'tick' }] });
  // 463 (4.5) the second risk: time
  c(4.5, {
    c13_tp0: { o: 1 }, c13_tp1: { o: 1 },
    c13_tbar: { type: 'rect', ax: 0, x: 160, y: 790, w: 1600, h: 12, fill: T.YELLOW, rad: 6, in: 'grow', dur: 2.2, ease: 'power2.inOut', at: 0.3 },
    c13_tbarR: { type: 'rect', ax: 0, x: 1560, y: 790, w: 200, h: 12, fill: T.RED, rad: 6, in: 'grow', dur: 0.6, at: 2.3 },
    c13_tbarL: cap('per-task time', { x: 160, y: 760, ax: 0, align: 'left', size: 24, at: 0.4 }),
    c13_lose: { y: 870 },
    c13_time: txt('and the per-task time may be too tight for many stages', { x: 960, y: 960, size: 46, color: T.DIM, at: 1.0 }),
  });

  // ================================================================ 464–466 build the plain loop first
  const LY = 470;
  c(4.5, {
    loop: { type: 'canvas', draw: 'loop', x: 960, y: 540, in: 'fade', params: LOOP({ cx: 480, cy: LY, r: 170, dot: -1 }), paramsFrom: { draw: 0 }, pdur: 1.4 },
    c13_div: { type: 'rect', x: 960, y: 500, w: 3, h: 560, fill: '#3A4654', in: 'growh', at: 0.2 },
    c13_vp2: { type: 'canvas', draw: 'c13_pipe', layout: 'v', x: 960, y: 540, in: 'fade', at: 0.4, params: { cx: 1440, cy: LY + 60, s: 1, act: -5, a: 1, all: 1 } },
    c13_capL: txt('one <span class="c-blue">LlmAgent</span> — build this first', { x: 480, y: 170, size: 48, at: 0.7 }),
    c13_capR: txt('<span class="c-dim">staged pipeline</span>', { x: 1440, y: 170, size: 48, at: 1.0 }),
  }, { clear: true, keep: ['rail'], cut: true, cam: { x: 960, y: 540, s: 1 } });
  // 465 (4.5) a balance between them: the decision rule
  c(4.5, {
    c13_div: 'undraw',
    c13_bal: { type: 'canvas', draw: 'c13_balance', x: 960, y: 540, in: 'fade', params: { cx: 960, cy: 760, tilt: 0, draw: 1, a: 1 }, paramsFrom: { draw: 0 }, pdur: 1.2, pease: 'expo.out' },
    loop: { params: LOOP({ cx: 480, cy: LY, r: 170, dot: 0.8 }), pease: 'none' },
    c13_rule: txt('adopt the staged design <span class="c-yellow">only if it wins on a held-out repository</span>', { x: 960, y: 930, size: 50, maxw: 1700, at: 1.0 }),
  });
  // 466 (2.5) reading beat; the balance tips toward the plain LOOP; the RAIL rewrites to 14
  c(2.5, {
    c13_rule: { s: 1.05, dur: 1.0 },
    c13_bal: { params: { cx: 960, cy: 760, tilt: -5, draw: 1, a: 1 }, pdur: 1.4, pease: 'power3.out' },
    loop: { params: LOOP({ cx: 480, cy: LY + 40, r: 170, dot: 1.5 }), pdur: 1.4, pease: 'power3.out' },
    c13_vp2: { params: { cx: 1440, cy: LY - 30, s: 1, act: -5, a: 0.55, all: 0 }, pdur: 1.4, pease: 'power3.out' },
    c13_capR: { o: 0.4 },
    rail: { ver: 14, at: 1.0 },
  }, { cam: { x: 960, y: 845, s: 1.22 }, drift: 0.4 });
})();
