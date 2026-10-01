// Chapter 2 — Scoring and time (storyboard rows 63–98, 122 beats).
(function () {
  const { T } = F;
  const { clamp, ease, rr } = DRAW.util;
  const rgba = DRAW.rgba;
  const lerp = (a, b, t) => a + (b - a) * t;
  const c = (beats, delta, opts = {}) => {
    if (opts.cut && (F.now() / T.BEAT) % 1 !== 0) console.error('c02: cut on a half beat at ' + F.now());
    return F.comp(beats, delta, opts);
  };
  const camOf = () => { const p = FILM.COMPS[FILM.COMPS.length - 1]; return Object.assign({ x: 960, y: 540, s: 1 }, (p && p.cam) || {}); };
  // reading beat: push the camera onto one element; `others` dims the rest a step
  const push = (beats, id, others = {}, o = {}) => {
    const prev = FILM.COMPS[FILM.COMPS.length - 1], el = prev.els[id], cam0 = camOf();
    const ex = (el.x ?? 960) + (o.dx || 0), ey = (el.y ?? 540) + (o.dy || 0);
    const cam = { x: cam0.x + (ex - cam0.x) * 0.85, y: cam0.y + (ey - cam0.y) * 0.85, s: cam0.s * (o.scale || 1.28) };
    return F.comp(beats, Object.assign({ [id]: { s: (el.s ?? 1) * 1.05 } }, others), { cam, drift: 0.4, beatCam: cam0 });
  };
  const cap = (s, size = 26, color = T.DIM, extra = {}) => Object.assign({ type: 'text', html: `<span class="cap" style="font-size:1em">${s}</span>`, size, color, in: 'fade' }, extra);
  const dimAll = (ids, o = 0.33) => Object.fromEntries(ids.map((k) => [k, { o, dur: 0.9 }]));

  // ---------------------------------------------------------------- chapter-local drawings
  // the clock face (12 hours) sliced into 120 wedges; wedge 0 can be left out (gap) once it is pulled
  DRAW.c02_face = (ctx, p) => {
    const cx = p.cx, cy = p.cy, r = p.r, N = 120;
    ctx.save(); ctx.globalAlpha *= clamp(p.a ?? 1);
    const fd = clamp(p.draw ?? 1);
    if (fd > 0) { ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fd); ctx.strokeStyle = T.INK; ctx.lineWidth = 4; ctx.stroke(); }
    for (let h = 0; h < 12; h++) {
      const k = clamp(fd * 12 - h); if (k <= 0) continue;
      const a = -Math.PI / 2 + (h / 12) * Math.PI * 2;
      ctx.strokeStyle = rgba(T.INK, k); ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (r - 26), cy + Math.sin(a) * (r - 26)); ctx.lineTo(cx + Math.cos(a) * (r - 6), cy + Math.sin(a) * (r - 6)); ctx.stroke();
    }
    const sl = clamp(p.slices || 0);
    for (let i = 0; i < N; i++) {
      const k = clamp(sl * N * 1.1 - i); if (k <= 0) continue;
      if (i === 0 && (p.gap || 0) > 0.5) continue;
      const a0 = -Math.PI / 2 + (i / N) * Math.PI * 2, a1 = a0 + (Math.PI * 2) / N;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r - 10, a0 + 0.004, a1 - 0.004); ctx.closePath();
      ctx.fillStyle = rgba(i % 2 ? T.BLUE : T.TEAL, 0.10 + 0.08 * k); ctx.fill();
      ctx.strokeStyle = rgba(T.DIM, 0.25 * k); ctx.lineWidth = 1; ctx.stroke();
    }
    // a hand sweeps once round the 12 hours
    const hd = clamp(p.hand || 0), ha = (1 - sl) * clamp(hd * 8);
    if (ha > 0) {
      const a = -Math.PI / 2 + hd * Math.PI * 2;
      ctx.save(); ctx.globalAlpha *= ha; ctx.strokeStyle = T.YELLOW; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * r * 0.78, cy + Math.sin(a) * r * 0.78); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.fillStyle = T.YELLOW; ctx.fill(); ctx.restore();
    }
    ctx.restore();
  };
  // the 6-minute ruler with sequential blocks [len (min), colour, label]; one block can stretch
  DRAW.c02_ruler = (ctx, p, sp) => {
    const x = p.x ?? 200, y = p.y ?? 760, w = p.w ?? 1300, max = 6, px = w / max;
    ctx.save(); ctx.globalAlpha *= clamp(p.a ?? 1);
    DRAW.polyline(ctx, [[x, y], [x + w, y]], p.draw ?? 1, { color: T.INK, w: 4 });
    for (let i = 0; i <= max; i++) {
      const k = clamp((p.ticks ?? 1) * (max + 1) - i); if (k <= 0) continue;
      const tx = x + i * px;
      ctx.strokeStyle = rgba(T.INK, k); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(tx, y - 14); ctx.lineTo(tx, y + 14); ctx.stroke();
      DRAW.text(ctx, `${i} min`, tx, y + 46, { size: 28, color: T.DIM, a: k });
    }
    const start = sp.start ?? 0.6;
    const g = clamp(p.grey || 0);
    if (g > 0) {
      ctx.fillStyle = rgba(T.DIM, 0.35); rr(ctx, x, y - 46, Math.max(2, px * start * ease(g) - 4), 32, 6); ctx.fill();
      DRAW.text(ctx, 'setup', x + px * start / 2, y - 78, { caps: true, size: 24, color: T.DIM, a: clamp(g * 2 - 1) });
    }
    const blocks = sp.blocks || [], n = blocks.length;
    let cur = x + px * start;
    const end = x + w, lim = end + 70;
    blocks.forEach((b, i) => {
      const k = clamp((p.show ?? 0) * n - i); if (k <= 0) return;
      let len = b[0];
      if (sp.si === i) len = lerp(len, sp.slen, ease(clamp(p.stretch || 0)));
      const bw = len * px * ease(k), bx = cur;
      cur += len * px * ease(k);
      if (bx >= lim) return;
      const inW = Math.max(0, Math.min(bx + bw, end) - bx);
      if (inW > 0) { rr(ctx, bx + 2, y - 46, Math.max(3, inW - 4), 32, 6); ctx.fillStyle = rgba(b[1], 0.85); ctx.fill(); }
      if (bx + bw > end) {
        const ox = Math.max(bx, end), ow = Math.min(bx + bw, lim) - ox;
        if (ow > 0) { const gr = ctx.createLinearGradient(ox, 0, lim, 0); gr.addColorStop(0, rgba(T.RED, 0.9)); gr.addColorStop(1, rgba(T.RED, 0)); ctx.fillStyle = gr; rr(ctx, ox + 2, y - 46, ow - 2, 32, 6); ctx.fill(); }
      }
      if (b[2] && k > 0.6 && bx < end - 20) {
        const vis = Math.min(bx + bw, end);
        DRAW.text(ctx, b[2], (bx + vis) / 2, y - 80, { mono: true, size: 26, color: bx + bw > end && bx + 40 > end ? T.RED : T.INK, a: (k - 0.6) / 0.4 });
      }
    });
    if ((p.over || 0) > 0) { ctx.fillStyle = rgba(T.RED, 0.85 * p.over); rr(ctx, end - 7, y - 64, 14, 128, 6); ctx.fill(); }
    ctx.restore();
  };
  // four dials, one per budget line: grow (a), needle values v0..v3, dims d0..d3
  DRAW.c02_dials = (ctx, p) => {
    for (let i = 0; i < 4; i++) {
      const k = ease(clamp((p.a || 0) * 4 - i)); if (k <= 0) continue;
      const cx = p.x, cy = p.y0 + i * p.pitch, r = p.r * (0.6 + 0.4 * k);
      const v = clamp(p['v' + i] ?? 0.5, -0.05, 1.05), dm = clamp(p['d' + i] || 0);
      const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25, av = a0 + (a1 - a0) * v;
      ctx.save(); ctx.globalAlpha *= k * (1 - 0.65 * dm);
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); ctx.strokeStyle = '#3A4654'; ctx.lineWidth = 8; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, r, a0, Math.max(a0 + 0.01, av)); ctx.strokeStyle = T.YELLOW; ctx.lineWidth = 8; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(av) * (r - 12), cy + Math.sin(av) * (r - 12)); ctx.strokeStyle = T.INK; ctx.lineWidth = 4; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fillStyle = T.INK; ctx.fill();
      // leader from the yaml line to the dial
      ctx.setLineDash([4, 6]); ctx.strokeStyle = rgba(T.DIM, 0.6); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx - r - 70, cy); ctx.lineTo(cx - r - 12, cy); ctx.stroke();
      ctx.restore();
    }
  };
  // a pipeline strip of five boxes joined by arrows; dashed for the local copy
  DRAW.c02_pipe = (ctx, p, sp) => {
    const items = sp.items, n = items.length, bw = 300, bh = 130, gap = 45;
    const x0 = 960 - (n * bw + (n - 1) * gap) / 2, y = p.y;
    ctx.save(); ctx.globalAlpha *= clamp(p.a ?? 1);
    items.forEach(([label, col, mono], i) => {
      const k = ease(clamp((p.draw || 0) * n * 1.1 - i)); if (k <= 0) return;
      const bx = x0 + i * (bw + gap);
      ctx.save(); ctx.globalAlpha *= k;
      rr(ctx, bx, y - bh / 2, bw, bh, 18);
      ctx.fillStyle = rgba(col, 0.07); ctx.fill();
      if (p.dash) ctx.setLineDash([14, 10]);
      ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
      DRAW.text(ctx, label, bx + bw / 2, y + 2, { size: 40, mono: !!mono, color: col === T.DIM ? T.INK : col, a: k });
      if (i < n - 1 && k > 0.5) {
        const ax0 = bx + bw + 6, ax1 = bx + bw + gap - 6, kk = clamp((k - 0.5) * 2);
        DRAW.polyline(ctx, [[ax0, y], [ax0 + (ax1 - ax0) * kk, y]], 1, { color: T.DIM, w: 3 });
        if (kk > 0.95) DRAW.arrowHead(ctx, ax1 + 2, y, 0, 14, T.DIM);
      }
    });
    ctx.restore();
  };
  // the calendar as a thick band: an opaque 60 px strip drawn UNDER the shared DRAW.calendar at the same
  // pixels (same x, y, w, draw), month segments shaded alternately, month names above it (34 px).
  // `sheen` 0..1 sweeps a soft highlight along it. Chapter 3 draws the identical band (DRAW.c03_calband).
  DRAW.c02_calband = (ctx, p) => {
    const x = p.x ?? 210, y = p.y ?? 560, w = p.w ?? 1500, dr = clamp(p.draw ?? 1), H = 60;
    if (dr <= 0) return;
    const day = (d, m) => DRAW.calX(p, Date.UTC(2026, m - 1, d));
    const bx = x - 14, bw = Math.max(24, (w + 28) * dr);
    ctx.save(); ctx.globalAlpha *= clamp(p.a ?? 1);
    ctx.save(); rr(ctx, bx, y - H / 2, bw, H, 12); ctx.clip();
    [[bx, day(1, 10), '#161D25'], [day(1, 10), day(1, 11), '#1D2530'], [day(1, 11), day(1, 12), '#161D25'], [day(1, 12), x + w + 14, '#1D2530']]
      .forEach(([a, b, col]) => { ctx.fillStyle = col; ctx.fillRect(a, y - H / 2, b - a, H); });
    const sh = clamp(p.sheen || 0);
    if (sh > 0 && sh < 1) {
      const sx = bx + (w + 28) * sh, g = ctx.createLinearGradient(sx - 160, 0, sx + 160, 0);
      const al = 0.16 * Math.sin(Math.PI * sh);
      g.addColorStop(0, rgba(T.INK, 0)); g.addColorStop(0.5, rgba(T.INK, al)); g.addColorStop(1, rgba(T.INK, 0));
      ctx.fillStyle = g; ctx.fillRect(sx - 160, y - H / 2, 320, H);
    }
    ctx.restore();
    rr(ctx, bx, y - H / 2, bw, H, 12); ctx.strokeStyle = '#3A4654'; ctx.lineWidth = 2.5; ctx.stroke();
    [['October', day(1, 10), day(1, 11)], ['November', day(1, 11), day(1, 12)]].forEach(([s, a, b]) => {
      const k = clamp((bx + bw - (a + b) / 2) / 160);
      if (k > 0) DRAW.text(ctx, s, (a + b) / 2, y - 54, { size: 34, color: T.DIM, a: k });
    });
    ctx.restore();
  };
  // four recap stamps, two rows: press in, settle slowly, then drop into the calendar band and flash
  // (k 0..1 across the comp)
  const STAMPS = [['≈120 private tasks', T.INK, false], ['pytest exit 0', T.GREEN, true], ['≈6 min a task, if sequential', T.YELLOW, false], ['1 a day', T.YELLOW, false]];
  const STAMP_TX = [430, 790, 1150, 1510], STAMP_R = [-2.5, 1.8, -1.2, 2.2], STAMP_ROW = [0, 0, 1, 1], STAMP_Y = [270, 420];
  DRAW.c02_stamps = (ctx, p) => {
    const k = p.k || 0, FS = 58, SH = 116;
    const ws = STAMPS.map(([s, , m]) => { ctx.font = `400 ${FS}px ${m ? 'CMT' : 'CM'}`; return ctx.measureText(s).width + 84; });
    const rows = [[0, 1], [2, 3]].map((ix) => ix.reduce((a, i) => a + ws[i], 0) + 50);
    const cx0s = [];
    [[0, 1], [2, 3]].forEach((ix, r) => { let sx = 960 - rows[r] / 2; ix.forEach((i) => { cx0s[i] = sx + ws[i] / 2; sx += ws[i] + 50; }); });
    STAMPS.forEach(([s, col, m], i) => {
      const w = ws[i], cx0 = cx0s[i], cy0 = STAMP_Y[STAMP_ROW[i]];
      const a = clamp((k - 0.02 - 0.06 * i) / 0.09); if (a <= 0) return;
      const settle = ease(clamp((k - 0.02 - 0.06 * i) / 0.5));
      const dRaw = clamp((k - 0.6 - 0.065 * i) / 0.15), d = dRaw * dRaw * dRaw;
      const flash = dRaw >= 1 ? clamp(1 - (k - (0.75 + 0.065 * i)) / 0.07) : 0;
      if (dRaw < 1) {
        const x = lerp(cx0, STAMP_TX[i], d), y = lerp(cy0 + 10 * (1 - settle), 560, d), sc = lerp(lerp(1.3, 1.06, ease(a)) - 0.06 * settle, 0.1, d);
        ctx.save(); ctx.globalAlpha *= clamp(a * 2) * (1 - d);
        ctx.translate(x, y); ctx.rotate((STAMP_R[i] * (1.8 - 0.8 * settle) * (1 - d) * Math.PI) / 180); ctx.scale(sc, sc);
        rr(ctx, -w / 2, -SH / 2, w, SH, 16); ctx.fillStyle = 'rgba(21,26,33,0.96)'; ctx.fill();
        ctx.strokeStyle = col; ctx.lineWidth = 4.5; ctx.stroke();
        DRAW.text(ctx, s, 0, 2, { size: FS, mono: m, color: col });
        ctx.restore();
      }
      if (flash > 0) {
        ctx.save(); ctx.globalAlpha *= flash; ctx.beginPath(); ctx.arc(STAMP_TX[i], 560, 12 + 34 * (1 - flash), 0, Math.PI * 2);
        ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.stroke(); ctx.restore();
      }
    });
  };

  F.chapter(K.CH[2]);

  // ---------------------------------------------------------------- geometry
  const GRID120 = { cols: 12, rows: 10, cw: 112, ch: 64, gap: 14 };
  const [gx, gy] = DRAW.gridCell(55, { w: 1920, h: 1080 }, GRID120, 960, 500);
  const GP = (o) => Object.assign({}, GRID120, { reveal: 1, gold: 55, goldGlow: 1, dim: 0, sweep: 0, split: 0, ring: 0, lock: 0, repo: 0, count: 0 }, o);

  // ---------------------------------------------------------------- 63 (4.5) CLOSE one cell = one task
  c(4.5, {
    ...K.rail(2),
    grid: { type: 'canvas', draw: 'grid', x: 960, y: 500, in: 'none', params: GP({}), pdur: 3.375, pease: 'power2.inOut' },
    c02_h1: { type: 'text', hud: true, html: '<span class="plate">one task</span>', size: 110, x: 960, y: 470, in: 'wipe', at: 0.2, dur: 1.0 },
    c02_h2: { type: 'text', hud: true, html: '<span class="plate">= one <span class="c-ink">issue</span> + one <span class="c-ink">repository</span></span>', size: 60, x: 960, y: 640, maxw: 1700, in: 'wipe', at: 1.0, dur: 1.8 },
    c02_h3: cap('the unit of scoring', 28, T.DIM, { hud: true, x: 960, y: 778, at: 2.6 }),
  }, { cam: { x: gx, y: gy, s: 6 }, drift: 0.3, animateFirst: true });

  // ---------------------------------------------------------------- 64 (4.5) WIDE the hidden set
  c(4.5, {
    c02_h1: 'fade', c02_h2: 'fade', c02_h3: 'fade',
    grid: { params: GP({ lock: 1 }), pdur: 3.0, pease: 'power2.inOut' },
    c02_gl: { type: 'text', html: '<span class="plate"><span class="c-yellow">≈120</span> hidden tasks</span>', size: 56, x: 960, y: 975, in: 'up', at: 0.9 },
  }, { cam: { x: 960, y: 540, s: 1 } });

  // ---------------------------------------------------------------- 65 (4.5) the split
  c(4.5, {
    c02_gl: 'down',
    grid: { params: GP({ lock: 1, split: 1.6 }), pdur: 1.4, pease: 'expo.out' },
    c02_pub: { type: 'text', html: '<span class="plate">public leaderboard</span>', size: 50, x: 470, y: 975, in: 'left', at: 0.5 },
    c02_pri: { type: 'text', html: '<span class="plate">private leaderboard</span>', size: 50, x: 1450, y: 975, in: 'right', at: 0.8 },
    c02_5050: { type: 'text', html: '<span class="cap" style="font-size:1em">split <span class="c-yellow">50/50</span></span>', size: 28, color: T.DIM, x: 960, y: 975, in: 'fade', at: 1.7 },
  }, { cam: { x: 960, y: 548, s: 0.97 } });

  // ---------------------------------------------------------------- 66 (3) FULL score = resolved ÷ tasks
  const EQX = 1150;
  c(3, {
    c02_pub: 'left', c02_pri: 'right', c02_5050: 'fade',
    grid: { params: GP({ lock: 1, split: 0, dim: 0.9, goldGlow: 0 }), pdur: 1.0, pease: 'power3.inOut' },
    c02_eL: { type: 'text', html: 'score =', size: 100, x: 600, y: 540, in: 'wipe', at: 0.3, dur: 0.8 },
    c02_num: { type: 'text', versions: ['tasks resolved', '<span class="c-green">tasks resolved</span>', '<span class="c-green">3</span>'], ver: 0, size: 90, x: EQX, y: 466, in: 'wipe', at: 0.8, dur: 0.8 },
    c02_bar: { type: 'rect', x: EQX, y: 545, w: 620, h: 6, rad: 3, fill: T.INK, in: 'grow', at: 1.0, dur: 0.7 },
    c02_den: { type: 'text', versions: ['tasks', '<span class="c-yellow">≈120</span>', '12'], ver: 0, size: 90, x: EQX, y: 628, in: 'wipe', at: 1.3, dur: 0.7 },
  }, { cam: { x: 960, y: 540, s: 1 } });

  // ---------------------------------------------------------------- 67 (2.5) concrete: ≈120; "resolved" glows green
  c(2.5, {
    c02_den: { ver: 1, at: 0.1, dur: 0.7 },
    c02_num: { ver: 1, at: 0.6, dur: 0.8 },
    c02_rl: cap('resolved = pytest exit 0', 28, T.GREEN, { x: EQX, y: 395, at: 1.0 }),
  });

  // ---------------------------------------------------------------- 68 (2.5) example: 3 of 12 → 0.25
  const mini = {};
  for (let i = 0; i < 12; i++) mini['c02_m' + i] = { type: 'rect', x: 960 + (i - 5.5) * 100, y: 850, w: 84, h: 54, fill: '#232C37', rad: 9, in: 'fade', at: 0.02 * i, dur: 0.4 };
  [1, 6, 9].forEach((ci, j) => { mini['c02_mg' + j] = { type: 'rect', x: 960 + (ci - 5.5) * 100, y: 850, w: 84, h: 54, fill: T.GREEN, rad: 9, in: 'pop', at: 0.55 + 0.14 * j, z: 2 }; });
  c(2.5, {
    c02_rl: 'fade',
    ...mini,
    c02_ex: cap('example', 26, T.YELLOW, { x: 1610, y: 790, at: 0.3 }),
    c02_num: { ver: 2, at: 0.75, dur: 0.5 },
    c02_den: { ver: 2, at: 0.75, dur: 0.5 },
    c02_res: { type: 'text', html: '= <span class="c-yellow">0.25</span>', size: 90, align: 'left', ax: 0, x: 1490, y: 548, in: 'wipe', at: 1.0, dur: 0.6 },
  }, { sfx: [{ at: 0.6, kind: 'click' }, { at: 0.74, kind: 'click' }, { at: 0.88, kind: 'click' }] });

  // ---------------------------------------------------------------- 69 (4.5) OVER [SIG2] a clock: 12 hours
  const CK = { cx: 960, cy: 520, r: 300 };
  // the whole equation (incl. "= 0.25" and its tag) lifts away together as one group; removed in the next comp
  const EQ_Y = { c02_eL: 540, c02_num: 466, c02_bar: 545, c02_den: 628, c02_res: 548, c02_ex: 790 };
  const out69 = { grid: 'fade' };
  for (const k in EQ_Y) out69[k] = { y: EQ_Y[k] - 320, o: 0, at: 0, dur: 0.55, ease: 'power3.in' };
  for (const k in mini) out69[k] = 'down';
  c(4.5, {
    ...out69,
    c02_face: { type: 'canvas', draw: 'c02_face', x: 960, y: 540, in: 'fade', dur: 0.2, at: 0.3, params: Object.assign({}, CK, { draw: 1, slices: 0, gap: 0, hand: 0, a: 1 }), paramsFrom: { draw: 0 }, pdur: 2.2, pease: 'power2.inOut' },
    c02_12h: { type: 'text', html: '<span class="c-yellow">12</span> hours', size: 84, x: 960, y: 905, in: 'wipe', at: 1.5, dur: 1.0 },
  });

  // ---------------------------------------------------------------- 70 (4.5) what counts
  c(4.5, {
    c02_eL: null, c02_num: null, c02_bar: null, c02_den: null, c02_res: null, c02_ex: null,
    c02_face: { params: Object.assign({}, CK, { draw: 1, slices: 0, gap: 0, hand: 1, a: 1 }), pdur: 3.3, pease: 'power2.inOut' },
    c02_12h: { y: 875, s: 0.85, dur: 0.8 },
    c02_12s: { type: 'text', html: 'for all tasks&ensp;<span class="c-dim">·</span>&ensp;sandbox setup included&ensp;<span class="c-dim">·</span>&ensp;verification excluded', size: 42, x: 960, y: 975, maxw: 1800, in: 'wipe', at: 0.6, dur: 1.6 },
  });

  // ---------------------------------------------------------------- 71 (2) slice into ≈120 wedges
  c(2, { c02_face: { params: Object.assign({}, CK, { draw: 1, slices: 1, gap: 0, hand: 1, a: 1 }), pdur: 1.4, pease: 'power2.inOut' } }, { sfx: [{ at: 0.1, kind: 'tick' }] });

  // ---------------------------------------------------------------- 72 (2) one wedge pulls out
  const RU = { x: 200, y: 760, w: 1180 };
  const B1 = [[0.7, T.TEAL, 'read'], [1.2, T.TEAL, 'run'], [0.6, T.GOLD, 'edit'], [1.2, T.TEAL, 'run'], [0.4, T.GOLD, 'submit']];
  const WP = (o) => Object.assign({}, CK, { draw: 0, slices: 0, pull: 0, unroll: 0, rx: RU.x, ry: RU.y, rw: RU.w, a: 1 }, o);
  c(2, {
    c02_12h: 'fade', c02_12s: 'fade',
    c02_face: { params: Object.assign({}, CK, { draw: 1, slices: 1, gap: 1, hand: 1, a: 1 }), pdur: 0.05, pease: 'none' },
    c02_wedge: { type: 'canvas', draw: 'clock', x: 960, y: 540, in: 'none', params: WP({ pull: 1 }), paramsFrom: { pull: 0.001 }, pdur: 1.3, pease: 'power3.out' },
    c02_share: cap('one task’s share', 28, T.YELLOW, { x: 1330, y: 230, at: 0.7 }),
  }, { sfx: [{ at: 0.1, kind: 'pop' }] });

  // ---------------------------------------------------------------- 73 (4.5) the wedge unrolls into a 6-minute ruler
  c(4.5, {
    c02_share: 'fade',
    c02_face: { params: Object.assign({}, CK, { draw: 1, slices: 1, gap: 1, hand: 1, a: 0 }), pdur: 1.2, pease: 'power2.in' },
    c02_wedge: { params: WP({ pull: 1, unroll: 1 }), pdur: 1.8, pease: 'power3.inOut' },
    c02_ruler: { type: 'canvas', draw: 'c02_ruler', x: 960, y: 540, in: 'fade', dur: 0.2, at: 1.3, blocks: B1, params: Object.assign({}, RU, { draw: 1, ticks: 1, grey: 0, show: 0, over: 0, stretch: 0, a: 1 }), paramsFrom: { draw: 0, ticks: 0 }, pdur: 1.6, pease: 'power2.out' },
    c02_6m: { type: 'text', html: '≈ <span class="c-yellow">6 minutes</span> per task', size: 80, x: 960, y: 420, in: 'wipe', at: 1.9, dur: 1.0 },
  });

  // ---------------------------------------------------------------- 74 / 75 / 76 the arithmetic (derived)
  c(3, {
    c02_6m: 'up', c02_wedge: 'fade', c02_face: null,
    c02_eA: { type: 'text', html: '12 h = 720 min', size: 84, x: 960, y: 230, in: 'wipe', at: 0.3, dur: 1.0 },
    c02_dv: cap('derived', 26, T.YELLOW, { x: 1560, y: 140, at: 0.9 }),
  }, { cut: true });
  c(2, { c02_eB: { type: 'text', html: '720 min ÷ ≈120 tasks', size: 84, x: 960, y: 380, in: 'wipe', at: 0.1, dur: 0.9 } });
  c(2, {
    c02_eC: { type: 'text', html: '= ≈ <span class="c-yellow">6</span> min per task', size: 84, x: 960, y: 530, in: 'wipe', at: 0.0, dur: 0.7 },
    c02_six: { type: 'text', html: '6', size: 84, color: T.YELLOW, x: RU.x + RU.w, y: 690, s: 0.75, in: 'fade', from: { x: 818, y: 530, s: 1, o: 1 }, at: 0.75, dur: 0.75, ease: 'power3.inOut' },
  }, { sfx: [{ at: 1.45, kind: 'tick' }] });

  // ---------------------------------------------------------------- 77 (2.5) reading beat: underline "≈ 6 min per task"
  F.beat(2.5, { id: 'c02_eC', mode: 'underline', w: 620, dx: 25, under: 58, color: T.YELLOW });

  // ---------------------------------------------------------------- 78 (4.5) the ruler returns: setup eats into it
  const R1Y = 500;   // ruler content y after it rises (element offset moves the canvas)
  c(4.5, {
    c02_eA: 'up', c02_eB: 'up', c02_eC: 'up', c02_dv: 'fade', c02_six: 'fade',
    c02_ruler: { y: 540 + (R1Y - RU.y), params: Object.assign({}, RU, { draw: 1, ticks: 1, grey: 1, show: 0, over: 0, stretch: 0, a: 1 }), at: 0.2, dur: 1.1, ease: 'power3.inOut', pdur: 2.6, pease: 'power2.inOut' },
    c02_setup: { type: 'text', html: 'sandbox setup counts against the <span class="c-yellow">12 h</span>', size: 56, x: 850, y: 250, maxw: 1700, in: 'wipe', at: 1.2, dur: 1.2 },
    c02_cc1: cap('concept', 26, T.YELLOW, { x: 850, y: 180, at: 1.6 }),
  }, { cam: { x: 960, y: 470, s: 1.12 } });

  // ---------------------------------------------------------------- 79 (4.5) honesty about the estimate
  c(4.5, {
    c02_cv1: cap('if tasks run one at a time', 28, T.INK, { x: 850, y: 630, at: 0.3, in: 'rise' }),
    c02_cv2: cap('concurrency not documented', 28, T.DIM, { x: 850, y: 680, at: 1.7, in: 'rise' }),
  });

  // ---------------------------------------------------------------- 80 (2) the LOOP rolls onto the ruler
  const px = RU.w / 6, LY = 268, LS = 0.75;
  const xAt = (m) => RU.x + m * px;
  const LP = (o) => Object.assign({ cx: 960, cy: 540, r: 240, draw: 1, labels: 1, ring: 0, dot: 0, exit: 0, hi: -1, hiA: 0, stopped: 0 }, o);
  c(2, {
    c02_setup: 'up', c02_cc1: 'fade',
    c02_loop: { type: 'canvas', draw: 'loop', x: 520, y: LY, s: LS, in: 'fade', from: { x: 120, o: 0 }, dur: 1.3, ease: 'power3.out',
      params: LP({ dot: 0.9 }), paramsFrom: { dot: 0 }, pdur: 1.4, pease: 'power2.inOut' },
  });

  // ---------------------------------------------------------------- 81 (2.5) each lap lays a block
  const f4 = 0.6 + 0.7 + 1.2 + 0.6 + 1.2;
  c(2.5, {
    c02_ruler: { params: Object.assign({}, RU, { draw: 1, ticks: 1, grey: 1, show: 0.8, over: 0, stretch: 0, a: 1 }), pdur: 1.8, pease: 'power1.inOut' },
    c02_loop: { x: xAt(f4), at: 0, dur: 1.8, ease: 'power1.inOut', params: LP({ dot: 4 }), pdur: 1.8, pease: 'power1.inOut' },
    c02_ill: cap('illustrative', 26, T.YELLOW, { x: 1590, y: 290, at: 0.3 }),
  }, { sfx: [0.3, 0.7, 1.1, 1.5].map((at) => ({ at, kind: 'tick' })) });

  // ---------------------------------------------------------------- 82 (2.5) submit lands before 6 min
  c(2.5, {
    c02_ruler: { params: Object.assign({}, RU, { draw: 1, ticks: 1, grey: 1, show: 1, over: 0, stretch: 0, a: 1 }), pdur: 0.8, pease: 'power2.out' },
    c02_loop: { x: xAt(f4 + 0.4), at: 0, dur: 0.8, ease: 'power2.out', params: LP({ dot: 5 }), pdur: 0.8, pease: 'power2.out' },
    c02_ok: { type: 'text', html: '✓ fits', size: 60, color: T.GREEN, x: 1560, y: R1Y - 30, in: 'pop', at: 0.8 },
  }, { sfx: [{ at: 0.85, kind: 'pop' }] });

  // ---------------------------------------------------------------- 83 (3) a second ruler runs out
  const R2Y = 820;
  const B2 = [[0.9, T.TEAL, 'read'], [1.8, T.TEAL, 'run_command'], [0.8, T.TEAL, 'read'], [1.6, T.TEAL, 'run'], [0.8, T.GOLD, 'edit']];
  c(3, {
    c02_loop: 'fade', c02_cv1: 'fade', c02_cv2: 'fade',
    c02_r2: { type: 'canvas', draw: 'c02_ruler', x: 960, y: 540 + (R2Y - RU.y), in: 'right', blocks: B2, si: 1, slen: 5.0, params: Object.assign({}, RU, { draw: 1, ticks: 1, grey: 1, show: 1, over: 1, stretch: 0, a: 1 }), paramsFrom: { show: 0, over: 0 }, pdur: 2.2, pease: 'power1.inOut' },
    c02_bx: { type: 'text', html: 'budget<br>exhausted', size: 46, lh: 1.1, color: T.RED, x: 1580, y: R2Y - 20, in: 'rise', at: 1.7 },
  }, { sfx: [{ at: 1.9, kind: 'click' }] });

  // ---------------------------------------------------------------- 84 (4.5) one command can eat the task [SIG2 ends]
  const R2Y2 = 600;
  c(4.5, {
    c02_ruler: 'fade', c02_ok: 'fade', c02_ill: 'fade',
    c02_r2: { y: 540 + (R2Y2 - RU.y), at: 0, dur: 1.0, ease: 'power3.inOut', params: Object.assign({}, RU, { draw: 1, ticks: 1, grey: 1, show: 1, over: 1, stretch: 1, a: 1 }), pdur: 2.6, pease: 'power3.inOut' },
    c02_bx: { y: R2Y2 - 20, at: 0, dur: 1.0 },
    c02_300: { type: 'text', html: 'up to <span class="c-yellow">300 s</span> per command', size: 76, x: 850, y: 330, in: 'wipe', at: 1.2, dur: 1.1 },
    c02_300n: cap('run_command timeout · min(300 s, time remaining)', 26, T.DIM, { x: 850, y: 410, at: 2.2 }),
  }, { cam: { x: 960, y: 520, s: 1.1 } });

  // ---------------------------------------------------------------- 85 (2.5) reading beat: push on "up to 300 s per command"
  push(2.5, 'c02_300', dimAll(['c02_r2', 'c02_bx', 'c02_300n'], 0.45));

  // ---------------------------------------------------------------- 86 (4.5) WIDE eval_config.yaml
  const CF = { x: 640, y: 555, w: 960, h: 600, size: 54, lh: 2.1 };
  const yk = (k, v = '') => `<span class="c-ink">${k}</span><span class="c-dim">:</span>${v ? ' <span class="c-yellow">' + v + '</span>' : ''}`;
  const L2 = [yk('timeout_seconds'), yk('max_tool_calls')];
  const L4 = [yk('timeout_seconds'), yk('max_tool_calls'), yk('max_time_minutes'), yk('max_turns')];
  const L4v = [yk('timeout_seconds'), yk('max_tool_calls', '10'), yk('max_time_minutes', '1'), yk('max_turns')];
  const cfg = K.file('c02_cfg', 'eval_config.yaml', L2, { x: CF.x, y: CF.y, w: CF.w, h: CF.h, size: CF.size, variants: [L4, L4v], text: { lh: CF.lh, at: 0.7, dur: 1.2 } });
  cfg.c02_cfg_frame.at = 0.2; cfg.c02_cfg_name.at = 0.5; cfg.c02_cfg_name.size = 34;
  c(4.5, {
    c02_r2: 'shrink', c02_bx: 'fade', c02_300: 'up', c02_300n: 'fade',
    ...cfg,
  }, { cam: { x: 900, y: 560, s: 1.05 } });
  const PITCH = CF.size * CF.lh, LINE0 = CF.y + 30 - 2 * PITCH + PITCH / 2;

  // ---------------------------------------------------------------- 87 (2) two more lines
  c(2, { c02_cfg: { ver: 1, at: 0.1, dur: 0.9 } });

  // ---------------------------------------------------------------- 88 (4.5) four dials; you set these
  const DP = (o) => Object.assign({ x: 1310, y0: LINE0, pitch: PITCH, r: 50, a: 1, v0: 0.5, v1: 0.5, v2: 0.5, v3: 0.5, d0: 0, d1: 0, d2: 0, d3: 0 }, o);
  c(4.5, {
    c02_dials: { type: 'canvas', draw: 'c02_dials', x: 960, y: 540, in: 'fade', dur: 0.2, params: DP({}), paramsFrom: { a: 0, v0: 0, v1: 0, v2: 0, v3: 0 }, pdur: 2.4, pease: 'power2.out' },
    c02_dcap: { type: 'text', html: '<span class="cap" style="font-size:1em">per-task budgets&ensp;—&ensp;<span class="c-ink">you set these</span></span>', size: 28, color: T.DIM, x: 820, y: 118, in: 'fade', at: 1.4 },
  }, { sfx: [0.2, 0.5, 0.8, 1.1].map((at) => ({ at, kind: 'tick' })) });

  // ---------------------------------------------------------------- 89 (4.5) they snap to the starter
  c(4.5, {
    c02_dials: { params: DP({ v1: 0.06, v2: 0.04, d0: 1, d3: 1 }), pdur: 2.6, pease: 'elastic.out(1, 0.45)' },
    c02_cfg: { ver: 2, at: 0.4, dur: 0.8 },
    c02_snap: { type: 'text', html: '<span class="c-yellow">1</span> minute&ensp;·&ensp;<span class="c-yellow">10</span> tool calls', size: 60, x: 820, y: 188, in: 'wipe', at: 0.6, dur: 1.2 },
    c02_rd1: { type: 'text', html: '<span class="c-yellow">10</span> calls', size: 56, align: 'left', ax: 0, x: 1400, y: LINE0 + PITCH, in: 'left', at: 0.5 },
    c02_rd2: { type: 'text', html: '<span class="c-yellow">1</span> min', size: 56, align: 'left', ax: 0, x: 1400, y: LINE0 + 2 * PITCH, in: 'left', at: 0.7 },
  }, { sfx: [{ at: 0.05, kind: 'click' }] });

  // ---------------------------------------------------------------- 90 (4.5) the trap
  c(4.5, {
    c02_st1: { type: 'text', html: 'the organizers’ starter&ensp;—&ensp;“which', size: 46, color: T.DIM, x: 820, y: 918, in: 'wipe', at: 0.2, dur: 1.0 },
    c02_st2: { type: 'text', html: '<span class="c-red">caps the score near zero</span>”', size: 62, x: 820, y: 990, in: 'wipe', at: 1.2, dur: 1.2 },
  });

  // ---------------------------------------------------------------- 91 (2.5) reading beat: the rest sinks to a third
  const ids91 = ['c02_cfg', 'c02_cfg_frame', 'c02_cfg_name', 'c02_dials', 'c02_dcap', 'c02_snap', 'c02_rd1', 'c02_rd2', 'c02_st1'];
  c(2.5, Object.assign({ c02_st2: { s: 1.07, dur: 0.9 } }, dimAll(ids91)), { drift: 0.5 });

  // ---------------------------------------------------------------- 92 (2) the dials sweep up; the ruler ghosts behind
  c(2, Object.assign(dimAll(['c02_cfg', 'c02_cfg_frame', 'c02_cfg_name', 'c02_dcap'], 1), {
    c02_snap: 'up', c02_rd1: 'fade', c02_rd2: 'fade', c02_st1: 'down', c02_st2: 'down',
    c02_dials: { o: 1, params: DP({ v0: 0.85, v1: 0.8, v2: 0.9, v3: 0.82 }), pdur: 1.3, pease: 'power3.out', dur: 0.5 },
    c02_cfg: { o: 1, ver: 1, dur: 0.6 },
    c02_ghost: { type: 'canvas', draw: 'c02_ruler', x: 960, y: 540, in: 'fade', dur: 0.8, at: 0.2, blocks: [], params: Object.assign({}, RU, { y: 930, draw: 1, ticks: 1, grey: 0, show: 0, over: 0, stretch: 0, a: 0.35 }) },
  }));

  // ---------------------------------------------------------------- 93 (3.5) WIDE calendar
  const out93 = {};
  for (const k of ['c02_cfg', 'c02_cfg_frame', 'c02_cfg_name', 'c02_dials', 'c02_dcap', 'c02_ghost']) out93[k] = 'left';
  const CALP = { x: 210, y: 560, w: 1500, draw: 1, dot: -1 };
  c(3.5, {
    ...out93,
    c02_band: { type: 'canvas', draw: 'c02_calband', x: 960, y: 540, z: 0, in: 'fade', dur: 0.2, at: 0.3, params: Object.assign({}, CALP, { sheen: 0 }), paramsFrom: { draw: 0 }, pdur: 2.4, pease: 'power2.inOut' },
    calendar: { type: 'canvas', draw: 'calendar', x: 960, y: 540, spans: [], in: 'fade', dur: 0.2, at: 0.3, params: Object.assign({}, CALP, { dot: 0 }), paramsFrom: { draw: 0 }, pdur: 2.4, pease: 'power2.inOut' },
    c02_d0: { type: 'text', html: '23 Sep', size: 44, x: 210, y: 490, in: 'fade', at: 0.4 },
    c02_d1: { type: 'text', html: '2 Dec', size: 44, x: 1710, y: 490, in: 'fade', at: 2.0 },
  }, { cut: true, cam: { x: 960, y: 540, s: 1 } });

  // ---------------------------------------------------------------- 94 (4.5) 1 a day → ≈70 tries (derived)
  c(4.5, {
    calendar: { params: Object.assign({}, CALP, { dot: 1 }), pdur: 1.6, pease: 'power3.out', at: 0.5 },
    c02_spd: { type: 'text', html: '<span class="c-yellow">1</span> submission per day', size: 60, x: 960, y: 220, in: 'wipe', at: 0.0, dur: 0.9 },
    c02_n: { type: 'text', html: '≈70', size: 160, color: T.YELLOW, x: 850, y: 375, in: 'scale', at: 0.5, dur: 1.0 },
    c02_tries: { type: 'text', html: 'tries&ensp;<span class="cap c-yellow" style="font-size:0.42em">derived</span>', size: 70, align: 'left', ax: 0, x: 1050, y: 392, in: 'fade', at: 1.4 },
  });

  // ---------------------------------------------------------------- 95 (2.5) reading beat: push on ≈70
  push(2.5, 'c02_n', Object.assign(dimAll(['c02_spd', 'calendar', 'c02_band', 'c02_d0', 'c02_d1'], 0.45), { c02_tries: { s: 1.05, dur: 0.6 } }), { dx: 110, scale: 1.1 });

  // ---------------------------------------------------------------- 96 (3.5) OVER the scoring pipeline
  const TOP = [['hidden task', T.DIM], ['your agent', T.BLUE], ['patch.diff', T.GOLD, true], ['container B', T.GREEN], ['score', T.YELLOW]];
  const BOT = [['public task', T.DIM], ['your agent', T.BLUE], ['patch.diff', T.GOLD, true], ['your container', T.GREEN], ['local score', T.YELLOW]];
  c(3.5, {
    calendar: 'fade', c02_band: 'fade', c02_d0: 'fade', c02_d1: 'fade', c02_spd: 'up', c02_n: 'up', c02_tries: 'up',
    c02_pt: cap('the scoring pipeline', 32, T.DIM, { x: 960, y: 420, at: 0.2 }),
    c02_p1: { type: 'canvas', draw: 'c02_pipe', x: 960, y: 540, in: 'fade', dur: 0.2, at: 0.3, items: TOP, params: { y: 540, draw: 1, dash: 0, a: 1 }, paramsFrom: { draw: 0 }, pdur: 2.2, pease: 'power2.out' },
    c02_pd: { type: 'text', html: 'one hidden task in, one number out', size: 46, color: T.DIM, x: 960, y: 680, in: 'wipe', at: 1.2, dur: 1.0 },
  }, { cam: { x: 960, y: 540, s: 1.04 } });

  // ---------------------------------------------------------------- 97 (4.5) a dashed local copy that must agree
  c(4.5, {
    c02_pd: 'fade',
    c02_pt: { y: 220, at: 0, dur: 0.9, ease: 'power3.inOut' },
    c02_p1: { params: { y: 330, draw: 1, dash: 0, a: 1 }, pdur: 0.9, pease: 'power3.inOut' },
    c02_p2: { type: 'canvas', draw: 'c02_pipe', x: 960, y: 540, in: 'fade', dur: 0.2, at: 0.5, items: BOT, params: { y: 760, draw: 1, dash: 1, a: 1 }, paramsFrom: { draw: 0 }, pdur: 2.0, pease: 'power2.out' },
    c02_loc: { type: 'text', html: 'your local evaluation', size: 54, x: 960, y: 900, in: 'wipe', at: 1.2 },
    c02_locn: cap('built in chapter 10', 26, T.DIM, { x: 960, y: 965, at: 1.8 }),
    c02_ag1: { type: 'arrow', x1: 900, y1: 420, x2: 900, y2: 670, color: T.INK, sw: 4, head: 18, in: 'draw', at: 2.0, dur: 0.6 },
    c02_ag2: { type: 'arrow', x1: 1020, y1: 670, x2: 1020, y2: 420, color: T.INK, sw: 4, head: 18, in: 'draw', at: 2.2, dur: 0.6 },
    c02_agree: { type: 'text', html: 'must agree', size: 50, color: T.YELLOW, align: 'left', ax: 0, x: 1070, y: 545, in: 'left', at: 2.5 },
  });

  // ---------------------------------------------------------------- 98 (4.5) recap stamps drop into the calendar → chapter 3
  c(4.5, {
    c02_pt: 'fade', c02_p1: 'shrink', c02_p2: 'shrink', c02_loc: 'fade', c02_locn: 'fade', c02_ag1: 'quick', c02_ag2: 'quick', c02_agree: 'fade',
    c02_stamps: { type: 'canvas', draw: 'c02_stamps', x: 960, y: 540, z: 2, in: 'none', params: { k: 1 }, paramsFrom: { k: 0 }, pdur: 3.375, pease: 'none' },
    c02_band: { type: 'canvas', draw: 'c02_calband', x: 960, y: 540, z: 0, in: 'fade', dur: 0.6, at: 0.4, params: Object.assign({}, CALP, { sheen: 0 }), paramsFrom: { draw: 0 }, pdur: 2.9, pease: 'power2.out' },
    calendar: { type: 'canvas', draw: 'calendar', x: 960, y: 540, spans: [], in: 'fade', dur: 0.6, at: 0.4, params: Object.assign({}, CALP), paramsFrom: { draw: 0 }, pdur: 2.9, pease: 'power2.out' },
    rail: { ver: 3 },
  }, { cam: { x: 960, y: 540, s: 1 }, drift: 0, sfx: [0, 1, 2, 3].map((i) => ({ at: 0.1 + 0.2 * i, kind: 'pop' })) });
})();
