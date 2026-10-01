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
  // block layout: each repository as its own compact block
  const BL = [{ x0: 247, cols: 7 }, { x0: 781, cols: 6 }, { x0: 1259, cols: 4 }, { x0: 1625, cols: 1 }];
  const BY0 = 330, BCW = 48, BCH = 30, BPX = 56, BPY = 38;
  const blockXY = (g, j) => [BL[g].x0 + (j % BL[g].cols) * BPX + BCW / 2, BY0 + Math.floor(j / BL[g].cols) * BPY + BCH / 2];
  const BLX = [BL[0].x0 + (7 * BPX - 8) / 2, BL[1].x0 + (6 * BPX - 8) / 2, BL[2].x0 + (4 * BPX - 8) / 2, BL[3].x0 + BCW / 2];
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
    const A = p.a ?? 1, ap = ease(clamp(p.apart || 0)), lf = ease(clamp(p.lift || 0));
    const dimA = 1 - (p.dim || 0) * 0.8;
    for (let i = 0; i < 129; i++) {
      const [g, j] = grp(i), c0 = i % 13;
      let [x, y, w, h] = cellGrid(i, p);
      if (ap > 0) { const [bx, by] = blockXY(g, j); x = lerp(x, bx, ap); y = lerp(y, by, ap); w = lerp(w, BCW, ap); h = lerp(h, BCH, ap); }
      if (g === 1 && lf > 0) {
        const hx = (p.hx ?? 1560) + ((j % 8) - 3.5) * 68, hy = (p.hy ?? 540) + (Math.floor(j / 8) - 2.5) * 44;
        const k = ease(clamp(lf * 1.4 - (j / 48) * 0.4));
        x = lerp(x, hx, k); y = lerp(y, hy, k) - Math.sin(Math.PI * k) * 60; w = lerp(w, 60, k); h = lerp(h, 36, k);
      }
      const bad = BAD.has(i);
      let al = A * dimA;
      if (bad && (p.drop || 0) > 0) { const k = clamp(p.drop * 1.4 - (c0 / 13) * 0.4); y += ease(k) * 120; al *= 1 - k; }
      if (al <= 0.003) continue;
      const wave = (v) => clamp((v || 0) * 1.5 - (c0 / 13) * 0.5);
      ctx.save(); ctx.globalAlpha = al;
      rr(ctx, x - w / 2, y - h / 2, w, h, Math.min(9, w * 0.09));
      ctx.fillStyle = 'rgba(88,196,221,0.05)'; ctx.fill();
      const rp = clamp(p.repo ?? 1);
      if (rp > 0) { ctx.save(); ctx.globalAlpha *= rp * 0.55; ctx.fillStyle = T.REPO[g]; ctx.fill(); ctx.restore(); }
      const ps = bad ? 0 : wave(p.pass), fl = wave(p.fail), gr = bad ? clamp(p.grey || 0) : 0;
      if (ps > 0) { ctx.save(); ctx.globalAlpha *= ps * 0.8 * (1 - fl); ctx.fillStyle = T.GREEN; ctx.fill(); ctx.restore(); }
      if (fl > 0) { ctx.save(); ctx.globalAlpha *= fl * 0.75 * (1 - gr); ctx.fillStyle = T.RED; ctx.fill(); ctx.restore(); }
      if (gr > 0) { ctx.save(); ctx.globalAlpha *= gr; ctx.fillStyle = '#5B6672'; ctx.fill(); ctx.restore(); }
      ctx.lineWidth = 1.6; ctx.strokeStyle = (p.hi === i) ? T.INK : '#33404C'; if (p.hi === i) ctx.lineWidth = 4; ctx.stroke();
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
      rr(ctx, 1340, 300 + i * 12.6, 80 + ((i * 47) % 200), 8, 3); ctx.fillStyle = i < 2 ? DRAW.rgba(T.DIM, 0.6) : DRAW.rgba(T.GOLD, 0.85); ctx.fill();
    }
    ctx.globalAlpha = 1;
  };
  // the mining pipeline: commits flow along the history line into a filter, then the gate
  DRAW.c10_pipe = (ctx, p) => {
    const { clamp, ease } = DRAW.util;
    const Y = 560;
    ctx.save(); ctx.globalAlpha *= p.a ?? 1;
    DRAW.polyline(ctx, [[120, Y], [1820, Y]], ease(clamp(p.hist || 0)), { color: DRAW.rgba(T.DIM, 0.6), w: 3 });
    const N = 22;
    for (let i = 0; i < N; i++) {
      const s = (p.flow || 0) - i * 0.11;
      let x = 140 + ((s % 2.2 + 2.2) % 2.2) * 780, y = Y, a = clamp((p.hist || 0) * 3 - 1) ;
      if (s < 0) x = 140 + (i / N) * 560 * clamp(p.hist || 0);
      const fFail = i % 3 === 1, gFail = !fFail && i % 5 === 2;
      if ((p.filt || 0) > 0.5 && fFail && x > 975) { const d = Math.min(1, (x - 975) / 160); y += ease(d) * 170; a *= 1 - d; }
      if ((p.gate || 0) > 0.5 && gFail && x > 1450) { const d = Math.min(1, (x - 1450) / 160); y += ease(d) * 170; a *= 1 - d; }
      if (x > 1700) a *= Math.max(0, 1 - (x - 1700) / 120);
      if (a <= 0) continue;
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2);
      ctx.fillStyle = x > 1500 && (p.gate || 0) > 0.5 ? T.GREEN : T.INK; ctx.fill();
    }
    ctx.restore();
  };

  // ================================================================ compositions
  const TP = (o) => Object.assign({ a: 1, dim: 0.5, repo: 1, gx: 960, gy: 540, gs: 1, apart: 0, lift: 0, hx: 1560, hy: 540, outline: 0, gdrop: 0, pass: 0, ndrop: 0, fail: 0, grey: 0, drop: 0, hi: -1 }, o);
  const G = { cx: (i, p) => cellGrid(i, TP(p)) };

  // 338 (4) — the public cells colour themselves by repository
  c(4, {
    ...K.rail(10),
    grid: { type: 'canvas', draw: 'grid', x: 960, y: 540, repos: REPOS, params: { ...GRID129, reveal: 1, gold: -1, dim: 0.5, sweep: 0, split: 0, repo: 1 }, pdur: 2.6, pease: 'power2.inOut' },
    c10_l1: { type: 'text', html: `<span style="color:${T.REPO[0]}">■</span> fastapi <span class="c-yellow">67</span>&emsp;<span style="color:${T.REPO[1]}">■</span> rich <span class="c-yellow">48</span>`, size: 48, x: 960, y: 960, in: 'wipe', at: 1.2 },
  }, { cam: { x: 960, y: 540, s: 1 }, drift: 0.6 });
  // 339 (2) — the small two; httpx is a single lonely cell
  c(2, {
    c10_l1: { x: 640 },
    c10_l2: { type: 'text', html: `<span style="color:${T.REPO[2]}">■</span> requests <span class="c-yellow">13</span>&emsp;<span style="color:${T.REPO[3]}">■</span> httpx <span class="c-yellow">1</span>`, size: 48, x: 1340, y: 960, in: 'right', at: 0.2 },
    c10_lone: { type: 'ring', x: 1520, y: 855, rad: 56, sw: 4, color: T.INK, in: 'fade', from: { rad: 140, o: 0 }, dur: 1.0, ease: 'expo.out', at: 0.4 },
  }, { sfx: [{ at: 0.5, kind: 'tick' }] });
  // 340 (4.5) — the four blocks slide apart
  c(4.5, {
    grid: 'none', c10_lone: 'quick', c10_l1: 'down', c10_l2: 'down',
    c10_tasks: { type: 'canvas', draw: 'c10_tasks', in: 'none', at: -0.04, params: TP({ apart: 1 }), pdur: 1.8, pease: 'power3.inOut' },
    c10_h: { type: 'text', html: '<span class="c-yellow">129</span> public training tasks&ensp;·&ensp;<span class="c-yellow">4</span> repositories', size: 60, x: 960, y: 175, in: 'wipe', at: 1.4 },
    ...Object.fromEntries(NAMES.map((n, g) => ['c10_n' + g, { type: 'text', html: `${n} <span class="c-yellow">${REPOS[g]}</span>`, size: 44, x: BLX[g], y: 770, in: 'rise', at: 1.6 + g * 0.12 }])),
  }, { exitLead: 0 });
  // 341 (4.5) — the character of fastapi and rich
  const chr = (id, html, x, at, mw) => ({ [id]: { type: 'text', html, size: 34, lh: 1.3, maxw: mw || 440, x, y: 880, color: T.DIM, in: 'wipe', at } });
  c(4.5, {
    c10_h: 'up',
    c10_tasks: { params: TP({ apart: 1, dim: 0.3 }), pdur: 1.2 },
    ...chr('c10_c0', 'web framework · routing, dependency injection, pydantic validation', BLX[0], 0.5),
    ...chr('c10_c1', 'terminal rendering · string and ANSI output assertions', BLX[1], 1.4, 420),
  }, { cam: { x: 720, y: 600, s: 1.25 } });
  // 342 (4.5) — requests and httpx
  c(4.5, {
    ...chr('c10_c2', 'HTTP client · several tests need a network that <span class="c-red">doesn’t exist offline</span>', BLX[2] - 10, 0.5, 360),
    ...chr('c10_c3', 'HTTP client', BLX[3] + 20, 1.5, 220),
  }, { cam: { x: 1300, y: 600, s: 1.25 } });
  // 343 (3.5) — one cell opens like a folder
  const ROWY = (k) => 330 + k * 70;
  const row = (k, html, at, col) => ({ type: 'mono', html, size: 40, x: 290, ax: 0, y: ROWY(k), color: col || T.INK, in: 'wipe', at, z: 5 });
  const [ocx, ocy] = blockXY(0, 24);
  c(3.5, {
    c10_n0: 'quick', c10_n1: 'quick', c10_n2: 'quick', c10_n3: 'quick', c10_c0: 'quick', c10_c1: 'quick', c10_c2: 'quick', c10_c3: 'quick',
    c10_tasks: { params: TP({ apart: 1, dim: 0.85 }), pdur: 0.9 },
    c10_card: { type: 'box', w: 1500, h: 720, x: 960, y: 560, stroke: T.REPO[0], fill: 'rgba(21,26,33,0.97)', sw: 3, rad: 22, html: '', in: 'zoom', from: { x: ocx, y: ocy, s: 0.035, o: 1 }, dur: 1.0, ease: 'expo.inOut', z: 4 },
    c10_ct: { type: 'text', html: cap('one task · fastapi'), size: 26, color: T.DIM, x: 290, ax: 0, y: 250, in: 'fade', at: 0.8, z: 5 },
    c10_r0: row(0, 'problem_statement', 0.9), c10_r1: row(1, 'base_commit', 1.1), c10_r2: row(2, 'repository snapshot', 1.3),
  }, { cam: { x: 960, y: 560, s: 1 }, sfx: [{ at: 0.4, kind: 'click' }] });
  // 344 (4.5) — more files slide out
  c(4.5, {
    c10_r3: row(3, 'test_patch', 0.2), c10_t3: { type: 'text', html: cap('hidden at evaluation', T.RED), size: 26, x: 590, ax: 0, y: ROWY(3), in: 'fade', at: 0.7, z: 5 },
    c10_r4: row(4, 'gold patch', 1.0, T.GOLD), c10_t4: { type: 'text', html: cap('training only'), size: 26, color: T.DIM, x: 590, ax: 0, y: ROWY(4), in: 'fade', at: 1.5, z: 5 },
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
  }, { cam: { x: 960, y: 600, s: 1.06 } });
  // 348 (2.5) — reading beat on "31 lines in 1 file"
  F.beat(2.5, { id: 'c10_sl', mode: 'push', dx: 160 });
  // 349 (4.5) — OVER how tasks were mined
  const cardOut = { c10_card: 'shrink', c10_ct: 'quick', c10_r0: 'quick', c10_r1: 'quick', c10_r2: 'quick', c10_r3: 'quick', c10_t3: 'quick', c10_r4: 'quick', c10_t4: 'quick', c10_r5: 'quick', c10_strip: 'quick', c10_sl: 'quick', c10_hint: 'quick' };
  c(4.5, {
    ...cardOut,
    c10_tasks: { params: TP({ apart: 1, a: 0 }), pdur: 0.6 },
    c10_pipe: { type: 'canvas', draw: 'c10_pipe', in: 'fade', dur: 0.3, params: { hist: 1, flow: 1.6, filt: 1, gate: 0, a: 1 }, paramsFrom: { hist: 0, flow: 0, filt: 0 }, pdur: 3.4, pease: 'none' },
    c10_hl: { type: 'text', html: 'repository history&ensp;→&ensp;commits', size: 44, x: 420, y: 470, in: 'wipe', at: 0.3 },
    c10_filt: { type: 'box', w: 440, h: 220, x: 975, y: 560, stroke: T.DIM, fill: 'rgba(21,26,33,0.92)', sw: 3, rad: 18, html: 'changed core <span class="m">.py</span> logic<br>and matching unit tests', size: 38, in: 'draw', at: 1.2, z: 3 },
    c10_fk: { type: 'text', html: cap('filter'), size: 26, color: T.DIM, x: 975, y: 420, in: 'fade', at: 1.4 },
  }, { cut: true, cam: { x: 960, y: 520, s: 1 } });
  // 350 (4.5) — the two-phase gate
  c(4.5, {
    c10_pipe: { params: { hist: 1, flow: 3.6, filt: 1, gate: 1, a: 1 }, pease: 'none' },
    c10_gate: { type: 'box', w: 300, h: 260, x: 1450, y: 560, stroke: T.GREEN, fill: 'rgba(21,26,33,0.92)', sw: 3.5, rad: 18, html: 'two-phase<br>verification', size: 40, in: 'draw', at: 0.2, z: 3 },
    c10_gl: { type: 'text', html: 'tests <span class="c-red">fail before</span> the fix, <span class="c-green">pass after</span>', size: 44, x: 1250, y: 800, in: 'wipe', at: 1.0 },
  });
  // 351 (2) — one task runs through the gate
  c(2, {
    c10_pipe: { params: { hist: 1, flow: 4.4, filt: 1, gate: 1, a: 0.6 }, pease: 'none' },
    c10_p1: { type: 'mono', html: 'base_commit&ensp;→ <span class="c-red">tests fail</span>', size: 34, x: 1450, y: 290, in: 'wipe', dur: 0.5, at: 0.05 },
    c10_p2: { type: 'mono', html: '+ gold patch → <span class="c-green">tests pass</span>', size: 34, x: 1450, y: 345, in: 'wipe', dur: 0.5, at: 0.5 },
    c10_p3: { type: 'text', html: '<span class="c-green">kept</span>', size: 48, x: 1730, y: 470, in: 'pop', at: 1.0 },
  }, { sfx: [{ at: 0.1, kind: 'tick' }, { at: 0.55, kind: 'tick' }, { at: 1.05, kind: 'pop' }] });
  // 352 (4.5) — WIDE the public grid at left
  c(4.5, {
    c10_pipe: 'fade', c10_hl: 'up', c10_filt: 'fade', c10_fk: 'quick', c10_gate: 'fade', c10_gl: 'down', c10_p1: 'quick', c10_p2: 'quick', c10_p3: 'quick',
    c10_tasks: { params: TP({ gx: 520, gy: 500, gs: 0.55, dim: 0.2 }), pdur: 1.6, pease: 'expo.out' },
    c10_pub: { type: 'text', html: '<span class="c-yellow">129</span> tasks · <span class="c-yellow">4</span> repositories · <span class="c-gold">gold patch</span> visible', size: 40, maxw: 760, lh: 1.25, x: 520, y: 790, in: 'wipe', at: 1.0 },
    c10_pk: { type: 'text', html: cap('public · training'), size: 26, color: T.DIM, x: 520, y: 260, in: 'fade', at: 0.8 },
  }, { cut: true, cam: { x: 960, y: 540, s: 1 } });
  // 353 (4.5) — the hidden grid at right, locked
  c(4.5, {
    c10_hid: { type: 'canvas', draw: 'grid', x: 1420, y: 500, in: 'fade', dur: 0.2, params: { cols: 12, rows: 10, cw: 52, ch: 32, gap: 8, reveal: 1, gold: -1, dim: 0.2, lock: 1, sweep: 0, split: 0 }, paramsFrom: { reveal: 0, lock: 0 }, pdur: 2.4, pease: 'power2.out' },
    c10_hk: { type: 'text', html: cap('hidden · scoring'), size: 26, color: T.DIM, x: 1420, y: 260, in: 'fade', at: 0.6 },
    c10_hidl: { type: 'text', html: '≈<span class="c-yellow">120</span> tasks · private repositories · <span class="c-gold">gold patch</span> not visible', size: 40, maxw: 760, lh: 1.25, x: 1420, y: 790, in: 'wipe', at: 1.2 },
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
  // 356 (4.5) — the rich block lifts out: hold out a whole repository
  c(4.5, {
    c10_hid: 'fade', c10_pub: 'quick', c10_pk: 'quick', c10_hk: 'quick', c10_hidl: 'quick', c10_e1: 'down', c10_e2: 'down', c10_ul: 'quick',
    c10_tasks: { params: TP({ gx: 700, gy: 540, gs: 0.75, dim: 0.2, lift: 1, hx: 1560, hy: 540 }), pdur: 2.2, pease: 'power2.inOut' },
    c10_xs: { type: 'text', html: tag('example split') + '<br>develop on the rest, test on <span style="color:#C9CED6">rich</span>', size: 52, lh: 1.5, x: 960, y: 140, in: 'wipe', at: 1.4 },
    c10_dv: { type: 'text', html: cap('develop'), size: 28, color: T.DIM, x: 700, y: 850, in: 'fade', at: 1.8 },
    c10_ts: { type: 'text', html: cap('test'), size: 28, color: T.DIM, x: 1560, y: 720, in: 'fade', at: 2.0 },
  }, { cam: { x: 960, y: 540, s: 1 } });
  // 357 (4.5) — three empty bars: report your scores per repository
  const BARS = ['fastapi', 'rich', 'requests'];
  const bar = (k, x0, at) => ({ type: 'box', w: 130, h: 200, x: x0 + k * 200, y: 820, stroke: T.DIM, fill: 'rgba(0,0,0,0)', sw: 2.5, rad: 8, html: '', in: 'growh', at });
  const barL = (k, x0, at) => ({ type: 'text', html: BARS[k], size: 34, color: T.DIM, x: x0 + k * 200, y: 950, in: 'fade', at });
  c(4.5, {
    c10_xs: 'up', c10_dv: 'quick', c10_ts: 'quick',
    c10_tasks: { params: TP({ gx: 700, gy: 410, gs: 0.6, dim: 0.2, lift: 1, hx: 1560, hy: 410 }), pdur: 1.4, pease: 'expo.inOut' },
    c10_b0: bar(0, 760, 0.8), c10_b1: bar(1, 760, 0.95), c10_b2: bar(2, 760, 1.1),
    c10_bl0: barL(0, 760, 1.0), c10_bl1: barL(1, 760, 1.1), c10_bl2: barL(2, 760, 1.2),
    c10_rp: { type: 'text', html: 'report your scores <span class="u">per repository</span>', size: 48, x: 1500, y: 800, maxw: 560, in: 'wipe', at: 1.6 },
  });
  // 358 (2) — the bars sink; the public grid gathers into a dashed outline
  c(2, {
    c10_b0: 'down', c10_b1: 'down', c10_b2: 'down', c10_bl0: 'down', c10_bl1: 'down', c10_bl2: 'down', c10_rp: 'down',
    c10_tasks: { params: TP({ gx: 960, gy: 500, gs: 0.8, dim: 0.35, lift: 0, hx: 1560, hy: 410, outline: 1 }), pdur: 1.5, pease: 'power3.inOut' },
  });
  // 359 (4.5) — "your offline copy of the scoring pipeline"
  c(4.5, {
    c10_oc: { type: 'text', html: 'your <span class="u">offline copy</span> of the scoring pipeline', size: 56, x: 960, y: 900, in: 'wipe', at: 0.3 },
    c10_tasks: { params: TP({ gx: 960, gy: 500, gs: 0.8, dim: 0.35, outline: 1, hi: 20 }), pdur: 1.2 },
  }, { cam: { x: 960, y: 540, s: 1.03 } });
  // 360 (3.5) — CLOSE one cell: the gold patch applies, the tests turn green
  const [hcx, hcy] = cellGrid(20, TP({ gx: 960, gy: 500, gs: 0.8 }));
  const tb = {}; for (let k = 0; k < 5; k++) tb['c10_tb' + k] = { type: 'rect', x: 1200, y: 430 + k * 56, w: 300, h: 36, rad: 7, fill: '#3A4452', in: 'fade', at: 0.5 + k * 0.05, z: 6 };
  const tg = {}; for (let k = 0; k < 5; k++) tg['c10_tg' + k] = { type: 'rect', x: 1200, y: 430 + k * 56, w: 300, h: 36, rad: 7, fill: T.GREEN, in: 'fade', at: 1.3 + k * 0.16, dur: 0.3, z: 7 };
  c(3.5, {
    c10_oc: 'down',
    c10_one: { type: 'box', w: 1100, h: 600, x: 960, y: 560, stroke: T.REPO[0], fill: 'rgba(21,26,33,0.97)', sw: 3, rad: 22, html: '', in: 'zoom', from: { x: hcx, y: hcy, s: 0.07, o: 1 }, dur: 0.9, ease: 'expo.inOut', z: 5 },
    c10_ok: { type: 'text', html: cap('one task · the harness check'), size: 26, color: T.DIM, x: 960, y: 310, in: 'fade', at: 0.6, z: 6 },
    c10_op: { type: 'box', w: 380, h: 96, x: 700, y: 540, stroke: T.GOLD, fill: 'rgba(240,172,95,0.10)', sw: 3.5, rad: 18, versions: ['<span class="m" style="color:#F0AC5F">gold patch</span>', '<span class="m c-dim">null patch (empty)</span>'], ver: 0, size: 34, in: 'down', at: 0.8, z: 6 },
    c10_tl: { type: 'text', html: cap('tests'), size: 26, color: T.DIM, x: 1200, y: 380, in: 'fade', at: 0.6, z: 6 },
    ...tb, ...tg,
    c10_vd: { type: 'text', versions: ['<span class="c-green">pass</span>', '<span class="c-red">fail</span>'], ver: 0, size: 56, x: 1200, y: 760, in: 'pop', at: 2.1, z: 6 },
  }, { sfx: [{ at: 1.3, kind: 'click' }, { at: 2.1, kind: 'tick' }] });
  // 361 (2) — the null (empty) patch applies; the tests turn red
  const tr = {}; for (let k = 0; k < 5; k++) tr['c10_tg' + k] = { fill: T.RED, at: 0.5 + k * 0.1, dur: 0.25 };
  c(2, { c10_op: { ver: 1, stroke: T.DIM, fill: 'rgba(154,163,173,0.06)' }, ...tr, c10_vd: { ver: 1, at: 1.0 } }, { sfx: [{ at: 0.6, kind: 'click' }] });
  // 362 (2) — gold sweep: the reference patch drops onto every cell
  const oneOut = { c10_one: { x: hcx, y: hcy, s: 0.07, o: 0, dur: 0.6, ease: 'power3.in' }, c10_ok: 'quick', c10_op: 'quick', c10_tl: 'quick', c10_vd: 'quick', ...Object.fromEntries([0, 1, 2, 3, 4].flatMap((k) => [['c10_tb' + k, 'quick'], ['c10_tg' + k, 'quick']])) };
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
  // 366 (4.5) — about 20 cells disagree and turn grey
  c(4.5, {
    c10_sw: 'up',
    c10_tasks: { params: GP({ gdrop: 1, pass: 1, ndrop: 1, fail: 1, grey: 1 }), pdur: 1.2, pease: 'power2.out' },
    c10_d0: { type: 'text', html: cap('about <span style="color:#F4D35E">20</span> disagree&ensp;·&ensp;which ones: illustrative'), size: 26, color: T.DIM, x: 960, y: 108, in: 'fade', at: 0.4 },
    c10_d1: { type: 'text', html: 'where your copy disagrees:', size: 44, color: T.DIM, x: 960, y: 900, in: 'wipe', at: 0.9 },
    c10_d2: { type: 'text', html: 'fix the harness or exclude the task', size: 56, x: 960, y: 970, in: 'wipe', at: 1.6 },
  });
  // 367 (2.5) — reading beat on "fix the harness or exclude the task"
  F.beat(2.5, { id: 'c10_d2', mode: 'push' });
  // 368 (4.5) — the grey cells drop out; where this comes from
  c(4.5, {
    c10_d0: 'quick', c10_d1: 'down', c10_d2: 'down',
    c10_tasks: { params: GP({ grey: 1, drop: 1 }), pdur: 2.4, pease: 'power2.inOut' },
    c10_lv: { type: 'text', html: cap('the roadmap’s lever 1&ensp;—&ensp;first experiment'), size: 30, color: T.DIM, x: 960, y: 930, in: 'fade', at: 2.3 },
  }, { cam: { x: 960, y: 540, s: 1 } });
  // 369 (3) — three empty bars, one per repository: your numbers
  c(3, {
    c10_lv: 'quick',
    c10_tasks: { params: GP({ grey: 1, drop: 1, gx: 600, gy: 520, gs: 0.62, outline: 0 }), pdur: 1.2, pease: 'expo.inOut' },
    c10_b0: bar(0, 1250, 0.5), c10_b1: bar(1, 1250, 0.6), c10_b2: bar(2, 1250, 0.7),
    c10_bl0: barL(0, 1250, 0.7), c10_bl1: barL(1, 1250, 0.8), c10_bl2: barL(2, 1250, 0.9),
    c10_yn: { type: 'text', html: cap('your numbers', T.YELLOW), size: 30, x: 1450, y: 640, in: 'fade', at: 1.0 },
  });
  // 370 (2) — one daily probe: from the bundle to the public leaderboard
  c(2, {
    c10_tasks: { params: GP({ grey: 1, drop: 1, gx: 600, gy: 520, gs: 0.62, outline: 0, a: 0 }), pdur: 0.5 },
    c10_b0: 'quick', c10_b1: 'quick', c10_b2: 'quick', c10_bl0: 'quick', c10_bl1: 'quick', c10_bl2: 'quick', c10_yn: 'quick',
    c10_bun: { type: 'box', w: 300, h: 200, x: 480, y: 470, stroke: T.INK, fill: 'rgba(21,26,33,0.95)', sw: 3, rad: 20, html: '<span class="m">bundle</span>', size: 40, in: 'scale', at: 0.1 },
    c10_lb: { type: 'box', w: 420, h: 200, x: 1440, y: 470, stroke: T.DIM, fill: 'rgba(21,26,33,0.95)', sw: 3, rad: 20, html: 'public<br>leaderboard', size: 44, in: 'scale', at: 0.2 },
    c10_ar: { type: 'arrow', x1: 650, y1: 470, x2: 1210, y2: 470, bend: -60, color: T.INK, sw: 4, head: 20, in: 'draw', at: 0.5, dur: 0.8, flow: 1, pulseColor: T.YELLOW },
    c10_pd: { type: 'text', html: '<span class="c-yellow">1</span> per day', size: 44, x: 930, y: 360, in: 'rise', at: 0.9 },
  }, { cut: true, sfx: [{ at: 0.6, kind: 'click' }] });
  // 371 (4.5) — spend it on your best held-out configuration
  c(4.5, {
    c10_ar: { flow: 3, dur: 3.2, ease: 'none' },
    c10_sp: { type: 'text', html: cap('spend it on your best held-out configuration'), size: 32, color: T.INK, x: 960, y: 650, in: 'fade', at: 0.4 },
  });
  // 372 (4.5) — a log line types: write everything down
  c(4.5, {
    c10_ar: { flow: 5, dur: 3.2, ease: 'none' },
    c10_log: { type: 'mono', html: '<span style="color:#F0AC5F">config</span> <span class="c-dim">│</span> local score per repo <span class="c-dim">│</span> leaderboard score <span class="c-dim">│</span> one observation', size: 34, x: 960, y: 860, in: 'wipe', dur: 2.0, at: 0.3 },
    c10_lk: { type: 'text', html: cap('one line per experiment'), size: 26, color: T.DIM, x: 960, y: 800, in: 'fade', at: 1.6 },
  }, { cam: { x: 960, y: 600, s: 1.04 } });
  // 373 (4.5) — the "config" column becomes a stack of bundle versions; the top one zips shut
  const ZIP = { type: 'box', w: 260, h: 200, x: 960, y: 540, stroke: T.GOLD, fill: 'rgba(240,172,95,0.08)', rad: 22, html: '<span class="m" style="color:#F0AC5F">.zip</span>', size: 44 };
  const ver = (n, dx, at) => ({ type: 'box', w: 260, h: 200, x: 960 + dx, y: 520 + dx * 0.6, stroke: '#5B6672', fill: 'rgba(21,26,33,0.97)', sw: 2.5, rad: 22, html: `<span class="m c-dim" style="position:relative;top:-60px;left:-80px;font-size:0.6em">v${n}</span>`, size: 44, in: 'fade', from: { x: 600, y: 860, s: 0.2, o: 0 }, dur: 1.0, ease: 'expo.out', at });
  c(4.5, {
    c10_bun: 'left', c10_lb: 'right', c10_ar: 'fade', c10_pd: 'up', c10_sp: 'quick', c10_lk: 'quick',
    c10_log: { o: 0.4, y: 900 },
    c10_v1: ver(1, -60, 0.3), c10_v2: ver(2, -30, 0.5),
    zip: Object.assign({}, ZIP, { y: 520, s: 0.92, in: 'fade', from: { x: 600, y: 860, s: 0.2, o: 0 }, dur: 1.0, ease: 'expo.out', at: 0.7, z: 3 }),
    c10_zz: { type: 'rect', x: 832, ax: 0, y: 438, w: 238, h: 6, rad: 3, fill: T.GOLD, in: 'grow', at: 1.9, dur: 0.8, ease: 'power3.inOut', z: 4 },
  }, { cut: true, cam: { x: 960, y: 560, s: 1 }, sfx: [{ at: 2.0, kind: 'click' }] });
  // 374 (4.5) — the zip comes to the centre (hand-off 10 → 11); the RAIL rewrites to "11"
  c(4.5, {
    c10_v1: 'fade', c10_v2: 'fade', c10_zz: 'quick', c10_log: 'down',
    zip: Object.assign({}, ZIP, { s: 1, dur: 3.3, ease: 'power2.inOut', at: 0.0 }),
    rail: { ver: 11, at: 0.8, dur: 1.0 },
  }, { cam: { x: 960, y: 540, s: 1 }, drift: 0 });
})();
