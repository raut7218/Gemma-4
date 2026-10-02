// Chapter 10 — The data and your local evaluation (storyboard v5 rows 338–374, 139 beats).
(function () {
  const { T } = F;
  const c = F.comp.bind(F);
  F.chapter(K.CH[10]);

  const cap = (s, col) => `<span class="cap" style="font-size:1em${col ? ';color:' + col : ''}">${s}</span>`;
  const tag = (s) => `<span class="cap" style="font-size:0.55em;color:#F4D35E">${s}</span>`;
  const GRID129 = { cols: 13, rows: 10, cw: 100, ch: 58, gap: 12, count: 129 };
  const REPOS = [67, 48, 13, 1];
  const NAMES = ['fastapi', 'rich', 'requests', 'httpx'];
  // the shared grid draws repository tones from spec.repos; the grid element is first created in the cold
  // open (without repos), so make sure the spec carries them in the full film too
  F.hook(() => { const g = FILM.EL.grid; if (g && !g.spec.repos) g.spec.repos = REPOS; });

  // ---------------------------------------------------------------- the 129 public tasks (chapter-local)
  const grp = (i) => { let g = 0, acc = 0; while (g < 3 && i >= acc + REPOS[g]) { acc += REPOS[g]; g++; } return [g, i - acc]; };
  // block layout: each repository as its own block, large enough that blocks + names + descriptions fill
  // ~70% of the frame height (centres 384 / 900 / 1322 / 1620: inside the safe area)
  const BL = [{ x0: 150, cols: 7 }, { x0: 700, cols: 6 }, { x0: 1190, cols: 4 }, { x0: 1590, cols: 1 }];
  const BY0 = 220, BCW = 60, BCH = 36, BPX = 68, BPY = 46;
  const blockXY = (g, j) => [BL[g].x0 + (j % BL[g].cols) * BPX + BCW / 2, BY0 + Math.floor(j / BL[g].cols) * BPY + BCH / 2];
  const BLX = BL.map((L) => L.x0 + (L.cols * BPX - (BPX - BCW)) / 2);
  // split layout (example hold-out): fastapi · requests · httpx as three blocks at left, rich lifted to the right
  const SPL = [
    { x0: 150, cols: 8, cw: 44, ch: 28, px: 52, py: 36 }, { x0: 1250, cols: 8, cw: 60, ch: 38, px: 68, py: 46 },
    { x0: 630, cols: 4, cw: 44, ch: 28, px: 52, py: 36 }, { x0: 985, cols: 1, cw: 44, ch: 28, px: 52, py: 36 }];
  const SB = 700;   // blocks sit on one baseline
  const splitXY = (g, j) => {
    const L = SPL[g], rows = Math.ceil(REPOS[g] / L.cols), top = SB - (rows * L.py - (L.py - L.ch));
    return [L.x0 + (j % L.cols) * L.px + L.cw / 2, top + Math.floor(j / L.cols) * L.py + L.ch / 2, L.cw, L.ch];
  };
  const SPX = SPL.map((L, g) => L.x0 + (Math.min(L.cols, REPOS[g]) * L.px - (L.px - L.cw)) / 2);
  // repository tones: fastapi bright solid, rich hollow (outlined, faint fill), requests mid, httpx dark
  const RFILL = [0.92, 0.22, 0.8, 1.0];
  // frame one moves: the repository colour sweeps down the grid row by row over the first 2.4 s
  const T0 = F.now();
  F.hook((t) => { const e = FILM.EL.c10_tasks; if (e && e.proxy.params) e.proxy.params.rowrev = Math.max(0, Math.min(1, (t - T0) / 2.4)); });
  // ~20 tasks whose gold patch fails locally (which ones: illustrative)
  const BAD = new Set();
  { let s = 7; while (BAD.size < 20) { s = (s * 1103515245 + 12345) % 2147483648; const i = BAD.size < 6 ? 115 + (s % 13) : s % 115; BAD.add(i); } }
  const cellGrid = (i, p) => {
    const c0 = i % 13, r0 = Math.floor(i / 13), gs = p.gs ?? 1;
    return [(p.gx ?? 960) + (c0 - 6) * 112 * gs, (p.gy ?? 540) + (r0 - 4.5) * 70 * gs, 100 * gs, 58 * gs];
  };
  DRAW.c10_tasks = (ctx, p) => {
    const { clamp, ease, rr } = DRAW.util;
    const lerp = (a, b, t) => a + (b - a) * t;
    const A = p.a ?? 1, ap = ease(clamp(p.apart || 0)), sp = clamp(p.split || 0);
    const dimA = 1 - (p.dim || 0) * 0.8;
    for (let i = 0; i < 129; i++) {
      const [g, j] = grp(i), c0 = i % 13, r0 = Math.floor(i / 13);
      let [x, y, w, h] = cellGrid(i, p);
      if (ap > 0) { const [bx, by] = blockXY(g, j); x = lerp(x, bx, ap); y = lerp(y, by, ap); w = lerp(w, BCW, ap); h = lerp(h, BCH, ap); }
      if (sp > 0) {
        // rich lifts out on an arc (staggered); the other three settle into their own blocks
        const [sx, sy, sw, sh] = splitXY(g, j);
        const k = g === 1 ? ease(clamp(sp * 1.4 - (j / 48) * 0.4)) : ease(clamp(sp * 1.25 - g * 0.08));
        x = lerp(x, sx, k); y = lerp(y, sy, k) - (g === 1 ? Math.sin(Math.PI * k) * 70 : 0); w = lerp(w, sw, k); h = lerp(h, sh, k);
      }
      const bad = BAD.has(i);
      let al = A * dimA;
      if (bad && (p.drop || 0) > 0) { const k = clamp(p.drop * 1.4 - (c0 / 13) * 0.4); y += ease(k) * 120; al *= 1 - k; }
      if (al <= 0.003) continue;
      const wave = (v) => clamp((v || 0) * 1.5 - (c0 / 13) * 0.5);
      ctx.save(); ctx.globalAlpha = al;
      rr(ctx, x - w / 2, y - h / 2, w, h, Math.min(9, w * 0.09));
      ctx.fillStyle = 'rgba(88,196,221,0.05)'; ctx.fill();
      // repository tone, revealed row by row at the chapter start (rowrev 0..1)
      const rp = clamp(p.repo ?? 1) * ease(clamp((p.rowrev ?? 1) * 1.6 - (r0 / 10) * 0.6));
      if (rp > 0) { ctx.save(); ctx.globalAlpha *= rp * RFILL[g]; ctx.fillStyle = T.REPO[g]; ctx.fill(); ctx.restore(); }
      const ps = bad ? 0 : wave(p.pass), fl = wave(p.fail), gr = bad ? clamp(p.grey || 0) : 0;
      if (ps > 0) { ctx.save(); ctx.globalAlpha *= ps * 0.8 * (1 - fl); ctx.fillStyle = T.GREEN; ctx.fill(); ctx.restore(); }
      if (fl > 0) { ctx.save(); ctx.globalAlpha *= fl * 0.75 * (1 - gr); ctx.fillStyle = T.RED; ctx.fill(); ctx.restore(); }
      if (gr > 0) { ctx.save(); ctx.globalAlpha *= gr; ctx.fillStyle = '#5B6672'; ctx.fill(); ctx.restore(); }
      ctx.lineWidth = 1.6; ctx.strokeStyle = '#33404C';
      // rich is drawn hollow: a bright outline instead of a solid fill, so it never reads like fastapi
      if (g === 1 && rp > 0.02) { ctx.strokeStyle = DRAW.rgba(T.REPO[1], 0.25 + 0.75 * rp); ctx.lineWidth = 2.6; }
      if (p.hi === i) { ctx.strokeStyle = T.INK; ctx.lineWidth = 4; }
      ctx.stroke();
      // a patch dropping onto the cell: gold bar for the reference patch, hollow for the null patch
      const gd = wave(p.gdrop) * (1 - wave(p.pass) * 0.999), nd = wave(p.ndrop) * (1 - wave(p.fail) * 0.999);
      if (gd > 0.01) { ctx.globalAlpha = al * gd; ctx.fillStyle = T.GOLD; rr(ctx, x - w * 0.3, y - 4 - (1 - gd) * 20, w * 0.6, 8, 3); ctx.fill(); }
      if (nd > 0.01) { ctx.globalAlpha = al * nd; ctx.strokeStyle = T.INK; ctx.lineWidth = 2; rr(ctx, x - w * 0.3, y - 4 - (1 - nd) * 20, w * 0.6, 8, 3); ctx.stroke(); }
      ctx.restore();
    }
    // dashed outline around the grid ("your offline copy")
    if ((p.outline || 0) > 0) {
      const gs = p.gs ?? 1, W = 1444 * gs + 60, H = 688 * gs + 60, x0 = (p.gx ?? 960) - W / 2, y0 = (p.gy ?? 540) - H / 2;
      ctx.save(); ctx.globalAlpha = A;
      DRAW.polyline(ctx, [[x0, y0], [x0 + W, y0], [x0 + W, y0 + H], [x0, y0 + H], [x0, y0]], ease(clamp(p.outline)), { color: T.INK, w: 3, dash: [16, 12] });
      ctx.restore();
    }
  };
  // the gold reference patch unrolled as a strip of 31 lines
  DRAW.c10_strip = (ctx, p) => {
    const { clamp, rr } = DRAW.util;
    const k = clamp(p.u || 0);
    for (let i = 0; i < 31; i++) {
      const a = clamp(k * 31 * 1.2 - i);
      if (a <= 0) continue;
      ctx.globalAlpha = a;
      rr(ctx, 1300, 300 + i * 12.6, 80 + ((i * 47) % 200), 8, 3); ctx.fillStyle = i < 2 ? DRAW.rgba(T.DIM, 0.6) : DRAW.rgba(T.GOLD, 0.85); ctx.fill();
    }
    ctx.globalAlpha = 1;
  };
  // the mining pipeline: evenly spaced commits flow along the history line, through the filter, then the gate.
  // Boxes are opaque and sit above this canvas, so dots pass cleanly behind them; rejects turn red and fall.
  const PY = 560, FXL = 740, FXR = 1210, GXR = 1670;
  DRAW.c10_pipe = (ctx, p) => {
    const { clamp, ease } = DRAW.util;
    ctx.save(); ctx.globalAlpha *= p.a ?? 1;
    const hist = clamp(p.hist || 0), lineEnd = 120 + 1700 * ease(hist);
    DRAW.polyline(ctx, [[120, PY], [1820, PY]], ease(hist), { color: DRAW.rgba(T.DIM, 0.6), w: 3 });
    const N = 22, SP = 86, L = N * SP;
    for (let i = 0; i < N; i++) {
      const x = 120 + ((((p.flow || 0) * 780 + i * SP) % L) + L) % L;
      if (x > lineEnd - 10) continue;
      let y = PY, a = clamp(hist * 3 - 1), col = T.INK;
      const fFail = i % 3 === 1, gFail = !fFail && i % 5 === 2;
      if ((p.filt || 0) > 0.5 && x > FXR) {
        if (fFail) { const d = Math.min(1, (x - FXR) / 170); y += ease(d) * 200; a *= 1 - d; col = T.RED; }
      }
      if ((p.gate || 0) > 0.5 && x > GXR) {
        if (gFail) { const d = Math.min(1, (x - GXR) / 140); y += ease(d) * 200; a *= 1 - d; col = T.RED; } else if (!fFail) col = T.GREEN;
      }
      if (x > 1740) a *= Math.max(0, 1 - (x - 1740) / 80);
      if (a <= 0.01) continue;
      ctx.globalAlpha = a * (p.a ?? 1);
      ctx.beginPath(); ctx.arc(x, y, 17, 0, Math.PI * 2);
      ctx.fillStyle = col; ctx.fill();
    }
    ctx.restore();
  };

  // ================================================================ compositions
  const TP = (o) => Object.assign({ a: 1, dim: 0.5, repo: 1, gx: 960, gy: 540, gs: 1, apart: 0, split: 0, rowrev: 1, outline: 0, gdrop: 0, pass: 0, ndrop: 0, fail: 0, grey: 0, drop: 0, hi: -1 }, o);
  const G = { cx: (i, p) => cellGrid(i, TP(p)) };

  // 338 (4) — the public cells colour themselves by repository, row by row (the hook drives rowrev from frame one)
  const sw = (bg, bd) => `<span style="display:inline-block;width:0.6em;height:0.6em;border-radius:3px;vertical-align:-0.02em;background:${bg};${bd ? 'box-shadow:inset 0 0 0 3px ' + bd : ''}"></span>`;
  c(4, {
    ...K.rail(10),
    grid: { type: 'canvas', draw: 'grid', x: 960, y: 540, repos: REPOS, params: { ...GRID129, reveal: 1, gold: -1, dim: 0.5, sweep: 0, split: 0 } },
    c10_tasks: { type: 'canvas', draw: 'c10_tasks', in: 'none', params: TP({ rowrev: 0 }), z: 2 },
    c10_l1: { type: 'text', html: `${sw(T.REPO[0])} fastapi <span class="c-yellow">67</span>&emsp;${sw('rgba(154,163,173,0.22)', T.REPO[1])} rich <span class="c-yellow">48</span>`, size: 48, x: 960, y: 960, in: 'wipe', at: 1.2 },
  }, { cam: { x: 960, y: 540, s: 1 }, drift: 0.6 });
  // 339 (2) — the small two; httpx is a single lonely cell
  c(2, {
    c10_l1: { x: 640 },
    c10_l2: { type: 'text', html: `${sw(T.REPO[2])} requests <span class="c-yellow">13</span>&emsp;${sw(T.REPO[3])} httpx <span class="c-yellow">1</span>`, size: 48, x: 1340, y: 960, in: 'right', at: 0.2 },
    c10_lone: { type: 'ring', x: 1520, y: 855, rad: 56, sw: 4, color: T.INK, in: 'fade', from: { rad: 140, o: 0 }, dur: 1.0, ease: 'expo.out', at: 0.4 },
  }, { sfx: [{ at: 0.5, kind: 'tick' }] });
  // 340 (4.5) — the four blocks slide apart
  c(4.5, {
    grid: 'none', c10_lone: 'quick', c10_l1: 'down', c10_l2: 'down',
    c10_tasks: { params: TP({ apart: 1 }), pdur: 1.8, pease: 'power3.inOut' },
    c10_h: { type: 'text', html: '<span class="c-yellow">129</span> public training tasks&ensp;·&ensp;<span class="c-yellow">4</span> repositories', size: 60, x: 960, y: 140, in: 'wipe', at: 1.4 },
    ...Object.fromEntries(NAMES.map((n, g) => ['c10_n' + g, { type: 'text', html: `${n} <span class="c-yellow">${REPOS[g]}</span>`, size: 44, x: BLX[g], y: 725, in: 'rise', at: 1.6 + g * 0.12 }])),
  }, { exitLead: 0 });
  // 341 (4.5) — the character of fastapi and rich (one centred framing for 341–342: no pan)
  const chr = (id, html, x, at, mw) => ({ [id]: { type: 'text', html, size: 37, lh: 1.3, maxw: mw, x, ay: 0, y: 772, color: T.DIM, in: 'wipe', at } });
  c(4.5, {
    c10_h: 'up',
    c10_tasks: { params: TP({ apart: 1, dim: 0.3 }), pdur: 1.2 },
    ...chr('c10_c0', 'web framework · routing, dependency injection, pydantic validation', BLX[0], 0.5, 440),
    ...chr('c10_c1', 'terminal rendering · string and ANSI output assertions', BLX[1], 1.4, 400),
  }, { cam: { x: 960, y: 560, s: 1 } });
  // 342 (4.5) — requests and httpx
  c(4.5, {
    ...chr('c10_c2', 'HTTP client · several tests need a network that <span class="c-red">doesn’t exist offline</span>', BLX[2], 0.5, 340),
    ...chr('c10_c3', 'HTTP client', BLX[3], 1.5, 200),
    c10_tasks: { params: TP({ apart: 1, dim: 0.15 }), pdur: 3.0 },
  });
  // 343 (3.5) — one cell opens like a folder
  const ROWY = (k) => 330 + k * 70;
  const row = (k, html, at, col) => ({ type: 'mono', html, size: 40, x: 330, ax: 0, y: ROWY(k), color: col || T.INK, in: 'wipe', at, z: 5 });
  const [ocx, ocy] = blockXY(0, 24);
  c(3.5, {
    c10_n0: 'quick', c10_n1: 'quick', c10_n2: 'quick', c10_n3: 'quick', c10_c0: 'quick', c10_c1: 'quick', c10_c2: 'quick', c10_c3: 'quick',
    c10_tasks: { params: TP({ apart: 1, dim: 0.85, a: 0 }), pdur: 0.9 },
    c10_card: { type: 'box', w: 1400, h: 720, x: 960, y: 560, stroke: T.REPO[0], fill: T.PANEL, sw: 3, rad: 22, html: '', in: 'zoom', from: { x: ocx, y: ocy, s: 0.035, o: 1 }, dur: 1.0, ease: 'expo.inOut', z: 4 },
    c10_ct: { type: 'text', html: cap('one task · fastapi'), size: 26, color: T.DIM, x: 330, ax: 0, y: 250, in: 'fade', at: 0.8, z: 5 },
    c10_r0: row(0, 'problem_statement', 0.9), c10_r1: row(1, 'base_commit', 1.1), c10_r2: row(2, 'repository snapshot', 1.3),
  }, { cam: { x: 960, y: 560, s: 1 }, sfx: [{ at: 0.4, kind: 'click' }] });
  // 344 (4.5) — more files slide out
  c(4.5, {
    c10_r3: row(3, 'test_patch', 0.2), c10_t3: { type: 'text', html: cap('hidden at evaluation', T.RED), size: 26, x: 630, ax: 0, y: ROWY(3), in: 'fade', at: 0.7, z: 5 },
    c10_r4: row(4, 'gold patch', 1.0, T.GOLD), c10_t4: { type: 'text', html: cap('training only'), size: 26, color: T.DIM, x: 630, ax: 0, y: ROWY(4), in: 'fade', at: 1.5, z: 5 },
    c10_r5: row(5, 'code-graph and embedding files', 1.8, T.DIM),
  });
  // 345 (4.5) — the graph files flicker: a known data quirk
  const T345 = F.now();
  F.hook((t) => { const r = FILM.EL.c10_r5; const s = t - T345; if (r && s > 0.1 && s < 2.4) r.proxy.o = 0.35 + 0.65 * Math.abs(Math.cos(s * 7.5)); });
  c(4.5, {
    c10_q: { type: 'text', html: 'about half are <span class="c-yellow">0 bytes</span> (hard links), yet <span class="c-yellow">128 of 129</span> tasks still have usable graph data', size: 40, maxw: 1300, lh: 1.3, x: 960, y: 800, in: 'wipe', at: 0.9, dur: 1.4, z: 5 },
  });
  // 346 (4.5) — the gold patch unrolls as a strip
  c(4.5, {
    c10_q: 'quick', c10_r5: { o: 1 },
    c10_strip: { type: 'canvas', draw: 'c10_strip', in: 'fade', dur: 0.2, params: { u: 1 }, paramsFrom: { u: 0 }, pdur: 2.0, pease: 'power2.inOut', z: 6 },
    c10_sl: { type: 'text', html: 'median reference fix: <span class="c-yellow">31 lines in 1 file</span>', size: 50, x: 960, y: 790, in: 'wipe', at: 1.2, z: 6 },
  });
  // 347 (4.5) — no hints text · ≈20.5 GB of snapshots
  c(4.5, {
    c10_r4: { color: T.GOLD, s: 1.04 },
    c10_hint: { type: 'text', html: cap('no hints text&ensp;·&ensp;≈<span style="color:#F4D35E">20.5 GB</span> of repository snapshots'), size: 28, color: T.DIM, x: 960, y: 870, in: 'fade', at: 0.4, z: 6 },
    c10_strip: { params: { u: 1.0 }, pdur: 1 },
  }, { cam: { x: 960, y: 570, s: 1.02 } });
  // 348 (2.5) — reading beat on "31 lines in 1 file" (no sideways shift: the card stays symmetric; dy keeps the card filling the frame)
  F.beat(2.5, { id: 'c10_sl', mode: 'push', dy: -150 });
  // 349 (4.5) — OVER how tasks were mined
  const cardOut = { c10_ct: 'quick', c10_r0: 'quick', c10_r1: 'quick', c10_r2: 'quick', c10_r3: 'quick', c10_t3: 'quick', c10_r4: 'quick', c10_t4: 'quick', c10_r5: 'quick', c10_strip: 'quick', c10_sl: 'quick', c10_hint: 'quick', c10_card: 'quick' };   // text and card fade together, card last
  c(4.5, {
    ...cardOut,
    c10_tasks: { params: TP({ apart: 1, a: 0 }), pdur: 0.1 },
    c10_pipe: { type: 'canvas', draw: 'c10_pipe', in: 'fade', at: 0, dur: 0.3, params: { hist: 1, flow: 1.6, filt: 1, gate: 0, a: 1 }, paramsFrom: { hist: 0.3, flow: 0, filt: 0 }, pdur: 3.4, pease: 'none', z: 1 },
    c10_hl: { type: 'text', html: 'repository history<br>→&ensp;commits', size: 48, lh: 1.3, x: 400, y: 440, in: 'wipe', at: 0.2 },
    c10_filt: { type: 'box', w: FXR - FXL, h: 440, x: (FXL + FXR) / 2, y: PY, stroke: T.DIM, fill: T.PANEL, sw: 3, rad: 18, html: 'changed core <span class="m">.py</span> logic<br>and matching<br>unit tests', size: 46, in: 'draw', at: 0.6, z: 3 },
    c10_fk: { type: 'text', html: cap('filter'), size: 28, color: T.DIM, x: (FXL + FXR) / 2, y: 305, in: 'fade', at: 0.8 },
  }, { cut: true, exitLead: 0.45, cam: { x: 960, y: 560, s: 1 } });
  // 350 (4.5) — the two-phase gate
  c(4.5, {
    c10_pipe: { params: { hist: 1, flow: 3.6, filt: 1, gate: 1, a: 1 }, pease: 'none' },
    c10_gate: { type: 'box', w: 340, h: 440, x: GXR - 170, y: PY, stroke: T.GREEN, fill: T.PANEL, sw: 3.5, rad: 18, html: 'two-phase<br>verification', size: 46, in: 'draw', at: 0.2, z: 3 },
    c10_gl: { type: 'text', html: 'tests <span class="c-red">fail before</span> the fix, <span class="c-green">pass after</span>', size: 50, x: 1100, y: 880, in: 'wipe', at: 1.0 },
  });
  // 351 (2) — one task runs through the gate
  c(2, {
    c10_pipe: { params: { hist: 1, flow: 4.4, filt: 1, gate: 1, a: 0.6 }, pease: 'none' },
    c10_p1: { type: 'mono', html: 'base_commit&ensp;→ <span class="c-red">tests fail</span>', size: 36, x: GXR - 250, y: 215, in: 'wipe', dur: 0.5, at: 0.05 },
    c10_p2: { type: 'mono', html: '+ gold patch → <span class="c-green">tests pass</span>', size: 36, x: GXR - 250, y: 272, in: 'wipe', dur: 0.5, at: 0.5 },
    c10_p3: { type: 'text', html: '<span class="c-green">kept</span>', size: 48, x: 1762, y: 480, in: 'pop', at: 1.0 },
  }, { sfx: [{ at: 0.1, kind: 'tick' }, { at: 0.55, kind: 'tick' }, { at: 1.05, kind: 'pop' }] });
  // 352 (4.5) — WIDE the public grid at left
  const nw = (s) => `<span style="white-space:nowrap">${s}</span>`;
  c(4.5, {
    c10_pipe: 'fade', c10_hl: 'up', c10_filt: 'fade', c10_fk: 'quick', c10_gate: 'fade', c10_gl: 'down', c10_p1: 'quick', c10_p2: 'quick', c10_p3: 'quick',
    c10_tasks: { params: TP({ gx: 520, gy: 500, gs: 0.55, dim: 0.2 }), pdur: 1.6, pease: 'expo.out' },
    c10_pub: { type: 'text', html: '<span class="c-yellow">129</span> tasks · <span class="c-yellow">4</span> repositories<br>' + nw('<span class="c-gold">gold patch</span> visible'), size: 40, maxw: 760, lh: 1.25, x: 520, y: 790, in: 'wipe', at: 1.0 },
    c10_pk: { type: 'text', html: cap('public · training'), size: 26, color: T.DIM, x: 520, y: 260, in: 'fade', at: 0.8 },
  }, { cut: true, cam: { x: 960, y: 540, s: 1 } });
  // 353 (4.5) — the hidden grid at right, locked
  c(4.5, {
    c10_hid: { type: 'canvas', draw: 'grid', x: 1420, y: 500, in: 'fade', dur: 0.2, params: { cols: 12, rows: 10, cw: 52, ch: 32, gap: 8, reveal: 1, gold: -1, dim: 0.2, lock: 1, sweep: 0, split: 0 }, paramsFrom: { reveal: 0, lock: 0 }, pdur: 2.4, pease: 'power2.out' },
    c10_hk: { type: 'text', html: cap('hidden · scoring'), size: 26, color: T.DIM, x: 1420, y: 260, in: 'fade', at: 0.6 },
    c10_hidl: { type: 'text', html: '≈<span class="c-yellow">120</span> tasks · private repositories<br>' + nw('<span class="c-gold">gold patch</span> not visible'), size: 40, maxw: 760, lh: 1.25, x: 1420, y: 790, in: 'wipe', at: 1.2 },
  }, { sfx: [{ at: 1.2, kind: 'click' }] });
  // 354 (4.5) — what to expect
  c(4.5, {
    c10_e1: { type: 'text', html: 'same pipeline, so expect similar size and style:', size: 44, x: 960, y: 920, color: T.DIM, in: 'wipe', at: 0.2 },
    c10_e2: { type: 'text', html: 'small, single-file fixes', size: 60, x: 960, y: 990, in: 'wipe', at: 1.3 },
  }, { cam: { x: 960, y: 580, s: 1 } });
  // 355 (2.5) — reading beat: "small, single-file fixes" stays bright; the rest sinks to a third
  c(2.5, {
    c10_tasks: { params: TP({ gx: 520, gy: 500, gs: 0.55, dim: 0.2, a: 0.33 }), pdur: 0.8 },
    c10_hid: { o: 0.33 }, c10_pub: { o: 0.33 }, c10_pk: { o: 0.33 }, c10_hk: { o: 0.33 }, c10_hidl: { o: 0.33 }, c10_e1: { o: 0.33 },
    c10_e2: { s: 1.08, color: T.INK },
    c10_ul: { type: 'rect', x: 960, y: 1030, w: 640, h: 5, rad: 3, fill: T.YELLOW, in: 'grow', dur: 0.9 },
  }, { cam: { x: 960, y: 640, s: 1.08 }, drift: 0.4 });
  // 356 (4.5) — the rich block lifts out: hold out a whole repository.
  // Three labelled blocks at left (develop), rich on its own at right (test); ≥150 px side margins.
  const sl = (g, at) => ({ type: 'text', html: `${NAMES[g]} <span class="c-yellow">${REPOS[g]}</span>`, size: 40, x: SPX[g], y: 752, in: 'rise', at });
  const DVX = (SPL[0].x0 + SPL[3].x0 + SPL[3].cw) / 2, DVW = SPL[3].x0 + SPL[3].cw - SPL[0].x0, TSW = 8 * SPL[1].px - (SPL[1].px - SPL[1].cw);
  c(4.5, {
    c10_hid: 'fade', c10_pub: 'quick', c10_pk: 'quick', c10_hk: 'quick', c10_hidl: 'quick', c10_e1: 'down', c10_e2: 'down', c10_ul: 'quick',
    c10_tasks: { params: TP({ gx: 520, gy: 500, gs: 0.55, dim: 0.2, split: 1 }), pdur: 2.2, pease: 'power2.inOut' },
    c10_xs: { type: 'text', html: tag('example split') + '<br>develop on the rest, test on <span style="color:#C9CED6">rich</span>', size: 52, lh: 1.5, x: 960, y: 150, in: 'wipe', at: 1.4 },
    c10_s0: sl(0, 1.5), c10_s2: sl(2, 1.6), c10_s3: sl(3, 1.7), c10_s1: sl(1, 1.8),
    c10_dvr: { type: 'rect', x: DVX, y: 805, w: DVW, h: 3, rad: 2, fill: 'rgba(154,163,173,0.55)', in: 'grow', at: 1.9 },
    c10_tsr: { type: 'rect', x: SPX[1], y: 805, w: TSW, h: 3, rad: 2, fill: 'rgba(154,163,173,0.55)', in: 'grow', at: 2.0 },
    c10_dv: { type: 'text', html: cap('develop'), size: 28, color: T.DIM, x: DVX, y: 845, in: 'fade', at: 2.1 },
    c10_ts: { type: 'text', html: cap('test'), size: 28, color: T.DIM, x: SPX[1], y: 845, in: 'fade', at: 2.2 },
  }, { cam: { x: 960, y: 540, s: 1 } });
  // 357 (4.5) — report your scores per repository: an empty score slot under each of the three big repositories
  const slot = (g, at) => ({ type: 'box', w: 210, h: 72, x: SPX[g], y: 845, stroke: T.DIM, fill: 'rgba(0,0,0,0)', sw: 2.5, rad: 12, html: '<span class="m c-dim">score ?</span>', size: 32, in: 'pop', at });
  c(4.5, {
    c10_xs: 'up', c10_dv: 'quick', c10_ts: 'quick', c10_dvr: 'quick', c10_tsr: 'quick',
    c10_tasks: { params: TP({ gx: 520, gy: 500, gs: 0.55, dim: 0.05, split: 1 }), pdur: 3.0 },
    c10_rp: { type: 'text', html: 'report your scores <span class="u">per repository</span>', size: 56, x: 960, y: 170, in: 'wipe', at: 0.3 },
    c10_sc0: slot(0, 1.0), c10_sc2: slot(2, 1.15), c10_sc1: slot(1, 1.3),
  }, { sfx: [{ at: 1.05, kind: 'tick' }] });
  // 358 (2) — the slots sink; the public grid gathers into a dashed outline
  c(2, {
    c10_sc0: 'down', c10_sc1: 'down', c10_sc2: 'down', c10_s0: 'quick', c10_s1: 'quick', c10_s2: 'quick', c10_s3: 'quick', c10_rp: 'up',
    c10_tasks: { params: TP({ gx: 960, gy: 500, gs: 0.8, dim: 0.35, split: 0, outline: 1 }), pdur: 1.5, pease: 'power3.inOut' },
  });
  // 359 (4.5) — "your offline copy of the scoring pipeline"
  c(4.5, {
    c10_oc: { type: 'text', html: 'your <span class="u">offline copy</span> of the scoring pipeline', size: 56, x: 960, y: 900, in: 'wipe', at: 0.3 },
    c10_tasks: { params: TP({ gx: 960, gy: 500, gs: 0.8, dim: 0.35, outline: 1, hi: 20 }), pdur: 1.2 },
  }, { cam: { x: 960, y: 540, s: 1.03 } });
  // 360 (3.5) — CLOSE one cell: the gold patch applies, the tests turn green (opaque card covers the whole grid)
  const [hcx, hcy] = cellGrid(20, TP({ gx: 960, gy: 500, gs: 0.8 }));
  const TBX = 1260, TBY = (k) => 420 + k * 62;
  const tb = {}; for (let k = 0; k < 5; k++) tb['c10_tb' + k] = { type: 'rect', x: TBX, y: TBY(k), w: 340, h: 40, rad: 8, fill: '#3A4452', in: 'fade', at: 0.5 + k * 0.05, z: 6 };
  const tg = {}; for (let k = 0; k < 5; k++) tg['c10_tg' + k] = { type: 'rect', x: TBX, y: TBY(k), w: 340, h: 40, rad: 8, fill: T.GREEN, in: 'fade', at: 1.2 + k * 0.12, dur: 0.25, z: 7 };
  const T360 = F.now();
  c(3.5, {
    c10_oc: 'down',
    c10_one: { type: 'box', w: 1320, h: 720, x: 960, y: 540, stroke: T.REPO[0], fill: T.PANEL, sw: 3, rad: 22, html: '', in: 'zoom', from: { x: hcx, y: hcy, s: 0.07, o: 1 }, dur: 0.9, ease: 'expo.inOut', z: 5 },
    c10_ok: { type: 'text', html: cap('one task · the harness check'), size: 28, color: T.DIM, x: 960, y: 250, in: 'fade', at: 0.6, z: 6 },
    c10_op: { type: 'box', w: 440, h: 110, x: 640, y: 545, stroke: T.GOLD, fill: 'rgba(240,172,95,0.10)', sw: 3.5, rad: 18, versions: ['<span class="m" style="color:#F0AC5F">gold patch</span>', '<span class="m c-dim">null patch (empty)</span>'], ver: 0, size: 38, in: 'down', at: 0.8, z: 6 },
    c10_tl: { type: 'text', html: cap('tests'), size: 28, color: T.DIM, x: TBX, y: 360, in: 'fade', at: 0.6, z: 6 },
    ...tb, ...tg,
    // "pass" only once every test bar is green; its entry finishes well inside this comp
    c10_vd: { type: 'text', html: '<span class="c-green">pass</span>', size: 60, x: TBX, y: 780, in: 'pop', at: 1.95, dur: 0.4, z: 6 },
  }, { sfx: [{ at: 1.3, kind: 'click' }, { at: 2.0, kind: 'tick' }] });
  // 361 (2) — the null (empty) patch applies; the stale "pass" leaves at once, the tests turn red, then "fail"
  // Honesty rule: "pass" goes the instant the null patch replaces the gold one (no verdict while the tests
  // re-run), "fail" appears exactly when the bars turn red (RED_AT) — never a stale "pass", never both words. A hook enforces the windows whatever the seek order.
  const RED_AT = 0.35;
  const tr = {}; for (let k = 0; k < 5; k++) tr['c10_tg' + k] = { fill: T.RED, at: RED_AT, dur: 0.12, ease: 'power2.out' };
  const T361 = F.now();
  c(2, {
    c10_op: { ver: 1, stroke: T.DIM, fill: 'rgba(154,163,173,0.06)', at: 0.0, dur: 0.3 }, ...tr,
    c10_vd: { o: 0, at: 0, dur: 0.01, ease: 'none' },
    c10_vf: { type: 'text', html: '<span class="c-red">fail</span>', size: 60, x: TBX, y: 780, in: 'pop', at: RED_AT - 0.05, dur: 0.35, z: 6 },
  }, { sfx: [{ at: 0.05, kind: 'click' }, { at: RED_AT, kind: 'tick' }] });
  const T362 = F.now();
  F.hook((t) => {
    const vd = FILM.EL.c10_vd, vf = FILM.EL.c10_vf;
    if (vd && (t < T360 + 2.0 || t >= T361)) vd.proxy.o = 0;   // the old verdict goes the instant the patch changes
    if (vf && (t < T361 + RED_AT || t >= T362 + 0.35)) vf.proxy.o = 0;
  });
  // 362 (2) — gold sweep: the reference patch drops onto every cell
  const oneOut = { c10_one: { x: hcx, y: hcy, s: 0.07, o: 0, dur: 0.6, ease: 'power3.in' }, c10_vd: null, c10_ok: 'quick', c10_op: 'quick', c10_tl: 'quick', c10_vf: 'quick', ...Object.fromEntries([0, 1, 2, 3, 4].flatMap((k) => [['c10_tb' + k, 'quick'], ['c10_tg' + k, 'quick']])) };
  const GP = (o) => TP(Object.assign({ gx: 960, gy: 500, gs: 0.8, dim: 0.2, outline: 1 }, o));
  c(2, {
    ...oneOut,
    c10_tasks: { params: GP({ gdrop: 1 }), pdur: 1.4, pease: 'power1.inOut' },
    c10_gs: { type: 'box', w: 240, h: 64, x: 1500, y: 140, stroke: T.GOLD, fill: 'rgba(240,172,95,0.12)', sw: 3, rad: 14, html: '<span class="m" style="color:#F0AC5F">gold patch</span>', size: 30, in: 'fade', from: { x: 380, o: 0 }, dur: 1.4, ease: 'power1.inOut' },
  });
  // 363 (4.5) — cells that pass turn green
  c(4.5, {
    c10_one: null,
    c10_gs: 'right',
    c10_tasks: { params: GP({ gdrop: 1, pass: 1 }), pdur: 2.2, pease: 'power2.inOut' },
    c10_sw: { type: 'text', versions: ['the gold patch should <span class="c-green">pass</span> everywhere', 'the null patch should <span class="c-red">fail</span> everywhere'], ver: 0, size: 52, x: 960, y: 930, in: 'wipe', at: 1.0 },
  }, { sfx: [{ at: 0.3, kind: 'tick' }] });
  // 364 (2) — null sweep: an empty patch drops onto every cell
  c(2, {
    c10_tasks: { params: GP({ gdrop: 1, pass: 1, ndrop: 1 }), pdur: 1.4, pease: 'power1.inOut' },
    c10_ns: { type: 'box', w: 240, h: 64, x: 1500, y: 140, stroke: T.DIM, fill: 'rgba(0,0,0,0)', sw: 3, rad: 14, html: '<span class="m c-dim">null patch</span>', size: 30, in: 'fade', from: { x: 380, o: 0 }, dur: 1.4, ease: 'power1.inOut' },
    c10_sw: { o: 0.4 },
  });
  // 365 (4.5) — cells turn red
  c(4.5, {
    c10_ns: 'right',
    c10_tasks: { params: GP({ gdrop: 1, pass: 1, ndrop: 1, fail: 1 }), pdur: 2.2, pease: 'power2.inOut' },
    c10_sw: { ver: 1, o: 1, at: 0.6 },
  }, { sfx: [{ at: 0.3, kind: 'tick' }] });
  // 366 (4.5) — about 20 cells disagree and turn grey; the verdict sits on a plate at the grid's centre,
  // so the reading beat that follows pushes straight in and the whole grid stays in frame
  c(4.5, {
    c10_sw: 'up',
    c10_tasks: { params: GP({ gdrop: 1, pass: 1, ndrop: 1, fail: 1, grey: 1 }), pdur: 1.2, pease: 'power2.out' },
    c10_d0: { type: 'text', html: cap('about <span style="color:#F4D35E">20</span> disagree&ensp;·&ensp;which ones: illustrative'), size: 26, color: T.DIM, x: 960, y: 162, in: 'fade', at: 0.4 },
    c10_dp: { type: 'rect', x: 960, y: 522, w: 1080, h: 200, rad: 20, fill: 'rgba(14,17,22,0.94)', in: 'fade', at: 1.0, dur: 0.6, z: 5 },
    c10_d1: { type: 'text', html: 'where your copy disagrees:', size: 44, color: T.DIM, x: 960, y: 478, in: 'wipe', at: 1.1, z: 6 },
    c10_d2: { type: 'text', html: 'fix the harness or exclude the task', size: 60, x: 960, y: 552, in: 'wipe', at: 1.7, z: 6 },
  });
  // 367 (2.5) — reading beat on "fix the harness or exclude the task"
  F.beat(2.5, { id: 'c10_d2', mode: 'push' });
  // 368 (4.5) — the grey cells drop out; where this comes from
  c(4.5, {
    c10_d0: 'quick', c10_d1: 'quick', c10_d2: 'quick', c10_dp: 'quick',
    c10_tasks: { params: GP({ grey: 1, drop: 1 }), pdur: 2.4, pease: 'power2.inOut' },
    c10_lv: { type: 'text', html: cap('the roadmap’s lever 1&ensp;—&ensp;first experiment'), size: 30, color: T.DIM, x: 960, y: 930, in: 'fade', at: 2.3 },
  }, { cam: { x: 960, y: 540, s: 1 } });
  // 369 (3) — three large bars, one per repository, filling to example values: your numbers
  const BV = [0.64, 0.41, 0.55], BX = (k) => 1220 + k * 220, BB = 800, BH = 470;
  const bars = {};
  ['fastapi', 'rich', 'requests'].forEach((n, k) => {
    bars['c10_k' + k] = { type: 'box', w: 170, h: BH, x: BX(k), y: BB - BH / 2, stroke: T.DIM, fill: 'rgba(0,0,0,0)', sw: 2.5, rad: 10, html: '', in: 'growh', at: 0.25 + k * 0.1, z: 3 };
    bars['c10_f' + k] = { type: 'rect', w: 146, h: BH * BV[k] - 12, x: BX(k), ay: 1, y: BB - 12, rad: 7, fill: 'rgba(131,193,103,0.85)', in: 'growh', at: 0.8 + k * 0.15, dur: 1.1, ease: 'expo.out', z: 4 };
    bars['c10_kl' + k] = { type: 'text', html: n, size: 40, x: BX(k), y: BB + 50, in: 'rise', at: 0.4 + k * 0.1 };
  });
  c(3, {
    c10_lv: 'quick',
    c10_tasks: { params: GP({ grey: 1, drop: 1, gx: 560, gy: 520, gs: 0.6, outline: 0 }), pdur: 1.2, pease: 'expo.inOut' },
    ...bars,
    c10_yn: { type: 'text', html: cap('example&ensp;·&ensp;your numbers', T.YELLOW), size: 28, x: BX(1), y: 280, in: 'fade', at: 0.9 },
  }, { sfx: [{ at: 0.85, kind: 'tick' }] });
  // 370 (2) — the carried objects: the grid and the three bars fly INTO the bundle (they stay inside it as
  // its contents) while the bundle's outline draws around them; one daily probe to the public leaderboard
  const BUN = [500, 460], BW = 580, BHH = 470;
  const mb = (k) => [BUN[0] + 100 + k * 76, 495];   // mini bar centres inside the bundle (right half)
  const MBH = 250, MBB = 495 + MBH / 2;
  const fold = (k) => ({ x: mb(k)[0], y: mb(k)[1], w: 56, h: MBH, dur: 0.9, ease: 'power3.inOut', at: 0 });
  const foldF = (k) => ({ x: mb(k)[0], y: MBB - 6, w: 44, h: MBH * BV[k] - 10, dur: 0.9, ease: 'power3.inOut', at: 0.03 });
  const GIN = GP({ grey: 1, drop: 1, gx: BUN[0] - 120, gy: 495, gs: 0.18, outline: 0 });
  c(2, {
    c10_tasks: { params: GIN, pdur: 0.9, pease: 'power3.inOut' },
    c10_k0: fold(0), c10_k1: fold(1), c10_k2: fold(2), c10_f0: foldF(0), c10_f1: foldF(1), c10_f2: foldF(2),
    c10_kl0: 'quick', c10_kl1: 'quick', c10_kl2: 'quick', c10_yn: 'quick',
    c10_bun: { type: 'box', w: BW, h: BHH, x: BUN[0], y: BUN[1], stroke: T.INK, fill: 'rgba(21,26,33,0.55)', sw: 3.5, rad: 24, html: '', in: 'draw', at: 0.5, dur: 0.8, z: 2 },
    c10_bl: { type: 'text', html: '<span class="m">bundle</span>', size: 46, x: BUN[0], y: BUN[1] - BHH / 2 + 52, in: 'fade', at: 0.8 },
    c10_lb: { type: 'box', w: 560, h: BHH, x: 1420, y: BUN[1], stroke: T.DIM, fill: T.PANEL, sw: 3, rad: 24, html: 'public<br>leaderboard', size: 64, in: 'scale', at: 0.55 },
    c10_ar: { type: 'arrow', x1: BUN[0] + BW / 2 + 20, y1: BUN[1], x2: 1120, y2: BUN[1], bend: -60, color: T.INK, sw: 5, head: 24, in: 'draw', at: 0.8, dur: 0.6, flow: 1, pulseColor: T.YELLOW },
    c10_pd: { type: 'text', html: '<span class="c-yellow">1</span> per day', size: 56, x: 955, y: 330, in: 'rise', at: 0.95 },
  }, { sfx: [{ at: 0.55, kind: 'pop' }, { at: 0.85, kind: 'click' }] });
  // 371 (4.5) — spend it on your best held-out configuration
  c(4.5, {
    c10_ar: { flow: 3, dur: 3.2, ease: 'none' },
    c10_sp: { type: 'text', html: cap('spend it on your best held-out configuration'), size: 36, color: T.INK, x: 960, y: 770, in: 'fade', at: 0.4 },
    c10_tasks: { params: Object.assign({}, GIN, { dim: 0.45 }), pdur: 3 },
  });
  // 372 (4.5) — a log line types: write everything down
  const CFX = 400, LOGY = 890;
  c(4.5, {
    c10_ar: { flow: 5, dur: 3.2, ease: 'none' },
    c10_log: { type: 'mono', html: '<span style="color:#F0AC5F">config</span> <span class="c-dim">│</span> local score per repo <span class="c-dim">│</span> leaderboard score <span class="c-dim">│</span> one observation', size: 34, x: 960, y: LOGY, in: 'wipe', dur: 2.0, at: 0.3 },
    c10_lk: { type: 'text', html: cap('one line per experiment'), size: 26, color: T.DIM, x: 960, y: LOGY - 58, in: 'fade', at: 1.6 },
  }, { cam: { x: 960, y: 600, s: 1.04 } });
  // 373 (4.5) — the log's "config" column grows a large fanned stack of bundle versions; the top one zips shut
  const ZIP = { type: 'box', w: 360, h: 270, x: 960, y: 540, stroke: T.GOLD, fill: 'rgba(240,172,95,0.08)', rad: 26, html: '<span class="m" style="color:#F0AC5F">.zip</span>', size: 60 };
  const vlab = (n, col) => `<span class="m" style="position:relative;left:-108px;top:-78px;font-size:0.8em;color:${col}">v${n}</span>`;
  const VP = [[600, 470, -10], [780, 452, -4], [960, 462, 0]];
  const ver = (k, at) => ({ type: 'box', w: 360, h: 270, x: VP[k][0], y: VP[k][1], r: VP[k][2], stroke: k === 2 ? T.INK : '#5B6672', fill: T.PANEL, sw: 2.5, rad: 26, versions: [vlab(k + 1, k === 2 ? T.INK : T.DIM), ''], ver: 0, size: 60, in: 'fade', from: { x: CFX, y: LOGY, s: 0.15, r: 0, o: 0 }, dur: 1.0, ease: 'expo.out', at, z: 2 + k });
  const bunOut = { c10_bun: 'left', c10_bl: 'left', c10_tasks: { params: Object.assign({}, GIN, { a: 0 }), pdur: 0.3, pease: 'power2.in' } };
  for (const k of [0, 1, 2]) { bunOut['c10_k' + k] = 'left'; bunOut['c10_f' + k] = 'left'; }
  c(4.5, {
    ...bunOut, c10_lb: 'right', c10_ar: 'fade', c10_pd: 'up', c10_sp: 'quick', c10_lk: 'quick',
    c10_log: { o: 1 },
    c10_cfg: { type: 'box', w: 140, h: 56, x: CFX, y: LOGY, stroke: T.GOLD, fill: 'rgba(240,172,95,0.10)', sw: 2.5, rad: 10, html: '', in: 'draw', at: 0.15, z: 2 },
    c10_la: { type: 'arrow', x1: CFX, y1: LOGY - 38, x2: 540, y2: 640, bend: -30, color: T.DIM, sw: 3, head: 16, in: 'draw', at: 0.3, dur: 0.6, flow: -1, pulseColor: T.GOLD },
    c10_v1: ver(0, 0.5), c10_v2: ver(1, 0.75), c10_v3: ver(2, 1.0),
    c10_zz: { type: 'rect', x: VP[2][0] - 156, ax: 0, y: VP[2][1] - 108, w: 312, h: 6, rad: 3, fill: T.GOLD, in: 'grow', at: 1.8, dur: 0.8, ease: 'power3.inOut', z: 7 },
    zip: Object.assign({}, ZIP, { x: VP[2][0], y: VP[2][1], in: 'fade', at: 2.3, dur: 0.5, z: 6 }),
  }, { cut: true, cam: { x: 960, y: 540, s: 1 }, sfx: [{ at: 2.35, kind: 'click' }] });
  // 374 (4.5) — the zip settles at the centre (hand-off 10 → 11) with v1 and v2 fanned behind it and the log
  // line still feeding it: a gold pulse travels up from "config" into the zip until the cut; the RAIL rewrites to "11".
  // v3 stays under the zip as its opaque backing (label and stroke fade into the zip's).
  c(4.5, {
    c10_v1: { x: 620, y: 575, r: -11, dur: 3.3, ease: 'power2.out', at: 0.1 },
    c10_v2: { x: 790, y: 556, r: -5, dur: 3.3, ease: 'power2.out', at: 0.15 },
    c10_v3: { x: 960, y: 540, ver: 1, stroke: T.GOLD, dur: 1.4, ease: 'power3.out', at: 0.1 },
    c10_zz: 'quick',
    c10_la: { x2: 760, y2: 660, bend: -40, flow: 3.6, dur: 3.3, ease: 'none', at: 0.05 },
    zip: Object.assign({}, ZIP, { dur: 1.4, ease: 'power3.out', at: 0.1 }),
    rail: { ver: 11, at: 0.8, dur: 1.0 },
  }, { cam: { x: 960, y: 540, s: 1 }, drift: 0 });
})();
