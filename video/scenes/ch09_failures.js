// Chapter 9 — Failure modes (storyboard v5 rows 315–337, 79 beats).
(function () {
  const { T } = F;
  const c = F.comp.bind(F);
  F.chapter(K.CH[9]);

  const cap = (s, col) => `<span class="cap" style="font-size:1em${col ? ';color:' + col : ''}">${s}</span>`;
  const GRID129 = { cols: 13, rows: 10, cw: 100, ch: 58, gap: 12, count: 129 };
  const REPOS = [67, 48, 13, 1];
  const LOOP0 = { cx: 960, cy: 540, r: 300, draw: 1, labels: 1, ring: 0, dot: -1, exit: 0, hi: -1 };
  const LP = (o) => Object.assign({}, LOOP0, { cx: 600, cy: 590, r: 230 }, o);

  // ---------------------------------------------------------------- chapter-local drawings
  // a small code graph: five file nodes; `edit` draws the agent's edit edge onto the wrong node,
  // `tests` aims the hidden tests at the right node and turns it red
  const GN = [['core.py', 1560, 400], ['utils.py', 1250, 560], ['api.py', 1720, 620], ['models.py', 1440, 740], ['cli.py', 1180, 360]];
  const GE = [[0, 1], [0, 2], [0, 3], [1, 3], [4, 0], [4, 1], [2, 3]];
  DRAW.c09_graph = (ctx, p) => {
    const { clamp, ease } = DRAW.util;
    const g = clamp(p.g ?? 1);
    ctx.save(); ctx.globalAlpha *= p.a ?? 1;
    GE.forEach(([a, b], i) => {
      const k = clamp(g * 2 - i * 0.12);
      DRAW.polyline(ctx, [[GN[a][1], GN[a][2]], [GN[b][1], GN[b][2]]], k, { color: DRAW.rgba(T.DIM, 0.45), w: 2.5 });
    });
    GN.forEach(([nm, x, y], i) => {
      const k = ease(clamp(g * 2.2 - i * 0.2));
      if (k <= 0) return;
      const red = i === 0 ? clamp(p.tests * 1.6 - 0.6) : 0, wrong = i === 1 ? clamp(p.edit * 1.5 - 0.5) : 0;
      ctx.save(); ctx.globalAlpha *= k;
      ctx.beginPath(); ctx.arc(x, y, 30 * (0.6 + 0.4 * k), 0, Math.PI * 2);
      ctx.fillStyle = red > 0 ? DRAW.rgba(T.RED, 0.15 + 0.35 * red) : wrong > 0 ? DRAW.rgba(T.GOLD, 0.12 + 0.3 * wrong) : 'rgba(21,26,33,0.95)';
      ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = red > 0 ? T.RED : wrong > 0 ? T.GOLD : '#5B6672'; ctx.stroke();
      ctx.restore();
      DRAW.text(ctx, nm, x, y + 56, { mono: true, size: 28, color: red > 0.5 ? T.RED : wrong > 0.5 ? T.GOLD : T.DIM, a: k });
    });
    // the edit edge: from the loop's "call a tool" node to utils.py
    if ((p.edit || 0) > 0) {
      const pts = []; const x0 = 925, y0 = 700, x1 = 1218, y1 = 572;
      for (let j = 0; j <= 30; j++) { const s = j / 30; pts.push([x0 + (x1 - x0) * s, y0 + (y1 - y0) * s - Math.sin(Math.PI * s) * 70]); }
      DRAW.polyline(ctx, pts, ease(clamp(p.edit)), { color: T.GOLD, w: 4 });
      if (p.edit > 0.98) DRAW.arrowHead(ctx, x1, y1, Math.atan2(y1 - pts[28][1], x1 - pts[28][0]), 18, T.GOLD);
    }
    // the hidden tests: a locked badge aiming at core.py
    if ((p.tests || 0) > 0) {
      const k = ease(clamp(p.tests));
      const bx = 1760, by = 250;
      ctx.save(); ctx.globalAlpha *= clamp(p.tests * 3);
      DRAW.util.rr(ctx, bx - 110, by - 30, 220, 60, 12); ctx.fillStyle = 'rgba(21,26,33,0.95)'; ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = k > 0.6 ? T.RED : '#5B6672'; ctx.stroke(); ctx.restore();
      DRAW.text(ctx, 'hidden tests', bx, by + 1, { size: 30, color: T.INK, a: clamp(p.tests * 3) });
      DRAW.polyline(ctx, [[bx - 60, by + 32], [1585, 375]], k, { color: k > 0.6 ? T.RED : T.DIM, w: 3.5, dash: [10, 8] });
      if (k > 0.98) DRAW.arrowHead(ctx, 1585, 375, Math.atan2(375 - by - 32, 1585 - bx + 60), 16, T.RED);
    }
    ctx.restore();
  };

  // two diffs side by side: a short one (1 file) and a long one (many files)
  DRAW.c09_diffs = (ctx, p) => {
    const { clamp, ease, rr } = DRAW.util;
    const sh = ease(clamp(p.short ?? 0)), lo = clamp(p.long ?? 0);
    // short diff
    if (sh > 0) {
      const x = 1090, y = 300;
      ctx.save(); ctx.globalAlpha *= sh;
      rr(ctx, x, y, 230, 30, 6); ctx.fillStyle = DRAW.rgba(T.DIM, 0.35); ctx.fill();
      for (let i = 0; i < 4; i++) { rr(ctx, x + 14, y + 44 + i * 26, [170, 120, 190, 150][i], 16, 4); ctx.fillStyle = DRAW.rgba(T.GOLD, 0.8); ctx.fill(); }
      ctx.restore();
    }
    // long diff: file headers + many lines, growing downward then to a second column
    if (lo > 0) {
      const x0 = 1420, y0 = 300, files = [9, 14, 6, 12, 8, 11, 7];
      let n = 0; const total = files.reduce((a, b) => a + b + 1.6, 0); let col = 0, y = y0;
      files.forEach((f, fi) => {
        const items = [['h', 0]].concat(Array.from({ length: f }, (_, j) => ['l', j]));
        items.forEach(([kind, j]) => {
          const k = clamp(lo * total * 1.05 - n); n += kind === 'h' ? 1.6 : 1;
          if (y > y0 + 520) { col++; y = y0; }
          const x = x0 + col * 250;
          if (k > 0) {
            ctx.save(); ctx.globalAlpha *= clamp(k);
            if (kind === 'h') { rr(ctx, x, y, 220, 22, 5); ctx.fillStyle = DRAW.rgba(T.DIM, 0.35); ctx.fill(); }
            else { rr(ctx, x + 12, y + 3, 80 + ((j * 53 + fi * 31) % 110), 13, 3); ctx.fillStyle = DRAW.rgba(T.GOLD, 0.8); ctx.fill(); }
            ctx.restore();
          }
          y += kind === 'h' ? 32 : 19;
        });
        y += 10;
      });
    }
  };

  // the empty failure chart: axis, nine dashed empty slots, labels
  const CH_X0 = 260, CH_X1 = 1660, CH_Y = 760;
  const SLOTS = ['looping', 'no submit', 'wrong file', 'overflow', "won't apply", 'over-edit', 'edit tests', 'stray files', 'pytest.ini'];
  DRAW.c09_chart = (ctx, p) => {
    const { clamp, ease } = DRAW.util;
    ctx.save(); ctx.globalAlpha *= p.a ?? 1;
    DRAW.polyline(ctx, [[CH_X0, 260], [CH_X0, CH_Y], [CH_X1, CH_Y]], ease(clamp(p.axis ?? 0)), { color: T.INK, w: 3.5 });
    const pitch = (CH_X1 - CH_X0) / SLOTS.length;
    SLOTS.forEach((nm, i) => {
      const k = ease(clamp((p.slots || 0) * 9 * 0.6 - i * 0.6 + 0.6));
      if (k <= 0) return;
      const x = CH_X0 + pitch * (i + 0.5);
      ctx.save(); ctx.globalAlpha *= k * (p.la ?? 1);
      ctx.setLineDash([9, 9]); ctx.lineDashOffset = -(p.pulse || 0) * 54;
      ctx.strokeStyle = DRAW.rgba(T.DIM, 0.7); ctx.lineWidth = 2.5;
      ctx.strokeRect(x - 46, CH_Y - 380 * k, 92, 380 * k - 4);
      ctx.restore();
      DRAW.text(ctx, nm, x, CH_Y + 40, { size: 28, color: T.DIM, a: k * (p.la ?? 1) });
    });
    ctx.restore();
  };

  // 129 cells: first a row along the chart's axis, then wrapped into the 129-grid (exact GRID129 pixels)
  DRAW.c09_row = (ctx, p) => {
    const { clamp, ease, rr } = DRAW.util;
    const g = GRID129, W = g.cols * g.cw + (g.cols - 1) * g.gap, H = g.rows * g.ch + (g.rows - 1) * g.gap;
    const ox = 960 - W / 2, oy = 540 - H / 2, w = p.w || 0;
    for (let i = 0; i < 129; i++) {
      const ext = clamp(w * 1.3 - (i / 129) * 0.3);
      if (ext <= 0) continue;
      const wr = ease(clamp((w - 1) * 1.6 - (i / 129) * 0.6));
      const rx = 110 + i * 13.3 + 5, ry = CH_Y;
      const c = i % g.cols, r = Math.floor(i / g.cols);
      const gx = ox + c * (g.cw + g.gap) + g.cw / 2, gy = oy + r * (g.ch + g.gap) + g.ch / 2;
      const x = rx + (gx - rx) * wr, y = ry + (gy - ry) * wr - Math.sin(Math.PI * wr) * 40;
      const cw = 10 + (g.cw - 10) * wr, ch = 10 + (g.ch - 10) * wr;
      ctx.save(); ctx.globalAlpha *= ext;
      rr(ctx, x - cw / 2, y - ch / 2, cw, ch, 2 + 7 * wr);
      ctx.fillStyle = 'rgba(88,196,221,0.05)'; ctx.fill();
      ctx.lineWidth = 1.6; ctx.strokeStyle = wr > 0.01 ? '#33404C' : DRAW.rgba(T.DIM, 0.9); ctx.stroke();
      ctx.restore();
    }
  };

  // ---------------------------------------------------------------- the chip that bounces off B's slot
  const B = { x: 1450, y: 640, w: 560, h: 520 };
  const SLOT_Y = B.y - B.h / 2;
  let bounceT0 = 0;
  F.hook((t) => {
    const r = FILM.EL.c09_chip2; if (!r) return;
    const s = t - bounceT0;
    if (s < 0 || s > 2.1) return;
    const q = r.proxy;
    if (s < 0.15) { q.x = B.x; q.y = 110; q.r = 0; return; }
    if (s < 1.0) { const u = (s - 0.15) / 0.85; q.x = B.x; q.y = 110 + (SLOT_Y - 64 - 110) * u * u; q.r = 0; return; }
    const u = Math.min(1, (s - 1.0) / 1.1), e = 1 - Math.pow(1 - u, 3);
    q.x = B.x + (1740 - B.x) * e; q.y = SLOT_Y - 64 - Math.sin(Math.PI * Math.min(1, u * 1.4)) * 150 + (330 - (SLOT_Y - 64)) * e; q.r = 18 * e;
  });

  // ================================================================ compositions
  const TRACK = ['looping', 'never submitting', 'wrong file', "won't apply", 'over-editing'];
  const track = (n) => TRACK.map((s, i) => `<span style="color:${i === n ? T.RED : i < n ? T.INK : '#6F7883'}">${i + 1} ${s}</span>`).join('&ensp;·&ensp;');

  // 315 (4) — the crack opens into the large LOOP at centre
  c(4, {
    ...K.rail(9),
    loop: { type: 'canvas', draw: 'loop', x: 960, y: 540, params: { ...LOOP0 } },
    c09_crack: { type: 'path', d: 'M960,60 L930,120 L985,165 L940,220', sw: 6, color: T.RED, in: 'draw', dur: 0.6, at: 0 },
    c09_ring: { type: 'ring', rad: 380, frac: 1, sw: 3, color: T.RED, o: 0.0, in: 'fade', from: { rad: 300, o: 0.9 }, dur: 2.2, ease: 'expo.out', at: 0.3 },
  }, { cam: { x: 960, y: 540, s: 1 }, drift: 0.5 });
  // 316 (4.5) — the taxonomy names itself
  c(4.5, {
    c09_crack: 'undraw', c09_ring: null,
    c09_head: { type: 'text', html: cap('five ways runs fail&ensp;·&ensp;the roadmap’s taxonomy'), size: 32, color: T.DIM, x: 960, y: 130, in: 'fade', at: 0.2 },
    c09_track: { type: 'text', versions: [0, 1, 2, 3, 4, 5].map((n) => cap(track(n - 1))), ver: 0, size: 24, x: 960, y: 1010, in: 'wipe', at: 0.8, dur: 1.4 },
    loop: { params: { ...LOOP0, dot: 0.9 }, pease: 'power1.inOut' },
  });
  // 317 (2) — symptom 1: looping — the dot laps and laps
  c(2, {
    c09_head: 'up',
    c09_sym: { type: 'text', versions: TRACK.map((s, i) => `<span class="c-red">${i + 1}</span>&ensp;${s}`), ver: 0, size: 64, x: 600, y: 210, in: 'left' },
    c09_track: { ver: 1 },
    loop: { params: LP({ dot: 3, exit: 1 }), pease: 'power2.in' },
  }, { cam: { x: 960, y: 540, s: 1 } });
  // 318 (2) — a log beside it repeats the same call three times
  const LOGL = '<span class="c-red">read_file</span> <span class="c-dim">src/stats.py 1-150</span>';
  c(2, {
    loop: { params: LP({ dot: 5, exit: 1 }), pease: 'none' },
    c09_logf: { type: 'box', w: 780, h: 300, x: 1440, y: 380, stroke: '#3A4654', fill: 'rgba(21,26,33,0.96)', sw: 2.5, rad: 18, html: '', in: 'scale' },
    c09_logt: { type: 'text', html: cap('call log · illustrative'), size: 24, color: T.DIM, x: 1080, ax: 0, y: 200, in: 'fade' },
    c09_l1: { type: 'mono', html: LOGL, size: 34, x: 1090, ax: 0, y: 300, in: 'wipe', at: 0.1, dur: 0.4 },
    c09_l2: { type: 'mono', html: LOGL, size: 34, x: 1090, ax: 0, y: 380, in: 'wipe', at: 0.5, dur: 0.4 },
    c09_l3: { type: 'mono', html: LOGL, size: 34, x: 1090, ax: 0, y: 460, in: 'wipe', at: 0.9, dur: 0.4 },
  }, { sfx: [{ at: 0.1, kind: 'tick' }, { at: 0.5, kind: 'tick' }, { at: 0.9, kind: 'tick' }] });
  // 319 (2) — the tool-call meter drains while the diff stays empty
  c(2, {
    loop: { params: LP({ dot: 7, exit: 1 }), pease: 'none' },
    c09_met: { type: 'canvas', draw: 'meters', names: ['tool calls', 'diff'], colors: [T.TEAL, T.GOLD], in: 'fade', dur: 0.4, params: { x: 1290, y: 880, w: 120, h: 230, gap: 140, v0: 0.12, v1: 0, labels: 1 }, paramsFrom: { v0: 0.9 }, pdur: 1.4, pease: 'power2.inOut' },
    c09_zero: { type: 'text', html: '<span class="m">0 lines</span>', size: 34, color: T.GOLD, x: 1620, y: 760, in: 'fade', at: 0.7 },
  });
  // 320 (4.5) — a detector brackets three identical consecutive calls
  c(4.5, {
    loop: { params: LP({ dot: 9.5, exit: 1 }), pease: 'power1.inOut' },
    c09_det: { type: 'box', w: 740, h: 250, x: 1440, y: 380, stroke: T.RED, fill: 'rgba(252,98,85,0.06)', sw: 3.5, rad: 14, html: '', in: 'draw', at: 0.2, dur: 0.9 },
    c09_x3: { type: 'num', val: 3, pre: '×', size: 64, color: T.RED, x: 1770, y: 470, in: 'count', at: 0.6 },
    c09_detl: { type: 'text', html: '<span class="plate">easy to count in a trajectory</span>&ensp;<span class="cap" style="font-size:0.55em;color:#F4D35E">concept</span>', size: 40, x: 1440, y: 590, in: 'wipe', at: 1.3 },
  }, { sfx: [{ at: 0.3, kind: 'tick' }] });
  // 321 (2) — symptom 2: never submitting — the exit branch erases, the time bar runs out
  c(2, {
    c09_logf: 'right', c09_logt: 'quick', c09_l1: 'right', c09_l2: 'right', c09_l3: 'right', c09_det: 'right', c09_x3: 'quick', c09_detl: 'quick', c09_met: 'fade', c09_zero: 'quick',
    c09_sym: { ver: 1 }, c09_track: { ver: 2 },
    loop: { params: LP({ dot: 11, exit: 0 }), pease: 'none' },
    c09_tl: { type: 'text', html: cap('time'), size: 26, color: T.DIM, x: 1150, ax: 0, y: 450, in: 'fade' },
    c09_tbar: { type: 'rect', x: 1150, ax: 0, y: 500, w: 0, h: 36, rad: 6, fill: T.RED, in: 'none', from: { w: 640, fill: T.YELLOW }, dur: 1.4, ease: 'power2.in', at: 0.1 },
    c09_tfr: { type: 'box', x: 1470, y: 500, w: 652, h: 48, stroke: '#3A4654', sw: 2.5, rad: 9, html: '', in: 'draw', dur: 0.5 },
  });
  // 322 (4.5) — the diff is taken anyway; an empty diff scores zero
  c(4.5, {
    loop: { params: LP({ dot: 11.5, exit: 0, stopped: 0.6 }), pdur: 1.5, pease: 'power3.out' },
    c09_chip: { type: 'box', w: 380, h: 96, x: 1370, y: 660, stroke: T.DIM, fill: 'rgba(154,163,173,0.06)', sw: 3, rad: 18, html: '<span class="m c-dim">patch.diff · empty</span>', size: 34, in: 'pop', at: 0.2 },
    c09_score: { type: 'text', html: '→ score <span class="c-red">0</span>', size: 64, x: 1700, y: 660, in: 'rise', at: 1.1 },
    c09_corner: { type: 'text', html: cap('a run also ends after 3 turns in a row without a tool call'), size: 26, color: T.DIM, x: 1500, y: 820, maxw: 700, lh: 1.5, in: 'fade', at: 2.0 },
  }, { sfx: [{ at: 0.3, kind: 'pop' }] });
  // 323 (2) — a stopwatch counts three turns with no call; the run ends
  c(2, {
    c09_corner: { y: 790, o: 0.0, dur: 0.4 },
    c09_sw: { type: 'ring', x: 1100, y: 880, rad: 62, frac: 1, sw: 9, color: T.RED, in: 'fade', dur: 0.2, from: { frac: 0, o: 1 } },
    c09_swn: { type: 'num', val: 3, size: 70, color: T.RED, x: 1100, y: 880, in: 'count', dur: 1.2, ease: 'power1.inOut' },
    c09_swl: { type: 'text', html: '3 turns, no tool call → <span class="c-red">the run ends</span>', size: 40, x: 1195, ax: 0, align: 'left', y: 880, in: 'wipe', at: 0.6 },
    loop: { params: LP({ dot: 11.5, exit: 0, stopped: 1 }), pdur: 1.0 },
  }, { sfx: [{ at: 0.35, kind: 'tick' }, { at: 0.75, kind: 'tick' }, { at: 1.15, kind: 'tick' }] });
  // 324 (2) — symptom 3: wrong file — the edit edge lands on the wrong node of the code graph
  c(2, {
    c09_tl: 'quick', c09_tbar: 'quick', c09_tfr: 'quick', c09_chip: 'down', c09_score: 'down', c09_corner: null, c09_sw: 'quick', c09_swn: 'quick', c09_swl: 'down',
    c09_sym: { ver: 2 }, c09_track: { ver: 3 },
    loop: { params: LP({ dot: -1, stopped: 0, hi: 1, hiA: 1 }), pdur: 0.8 },
    c09_graph: { type: 'canvas', draw: 'c09_graph', in: 'fade', dur: 0.3, params: { g: 1, edit: 1, tests: 0 }, paramsFrom: { g: 0, edit: 0 }, pdur: 1.4, pease: 'power2.out' },
    c09_ill: { type: 'text', html: cap('code graph · illustrative', T.YELLOW), size: 24, x: 1450, y: 190, in: 'fade', at: 0.4 },
  });
  // 325 (2) — the hidden tests aim at the other node and turn red
  c(2, { c09_graph: { params: { g: 1, edit: 1, tests: 1 }, pdur: 1.3 }, loop: { params: LP({ hi: -1 }), pdur: 0.6 } }, { sfx: [{ at: 1.0, kind: 'tick' }] });
  // 326 (2) — the clue in the log: the edit's path differs from what the reproduction imported
  c(2, {
    c09_graph: { params: { g: 1, edit: 1, tests: 1, a: 0.45 }, pdur: 0.8 },
    c09_clue: { type: 'mono', html: '<span class="c-dim">edit_file</span>&ensp;<span class="hl" style="color:#F0AC5F">src/pkg/utils.py</span><br><span class="c-dim">repro.py&ensp;</span>&ensp;from <span class="hl" style="color:#FC6255">pkg.core</span> import parse', size: 34, lh: 1.6, x: 1060, ax: 0, y: 880, in: 'wipe', dur: 0.9 },
  });
  // 327 (4.5) — symptom 4: a patch that won't apply bounces off container B's slot
  bounceT0 = F.now();
  c(4.5, {
    c09_graph: 'fade', c09_ill: 'quick', c09_clue: 'quick',
    c09_sym: { ver: 3 }, c09_track: { ver: 4 },
    ...K.container('c09_B', 'B', { x: B.x, y: B.y, w: B.w, h: B.h, head: 'fresh checkout' }),
    c09_slot: { type: 'box', w: 200, h: 26, x: B.x, y: SLOT_Y, stroke: T.GREEN, fill: '#0E1116', sw: 3, rad: 6, html: '', in: 'fade', at: 0.3, z: 4 },
    ...K.chip('c09_chip2', { x: 1740, y: 330, r: 18, s: 1, in: 'none', at: 0, z: 6 }),
    c09_nofit: { type: 'text', html: '<span class="c-red">✗</span> does not apply', size: 44, x: B.x, y: B.y - 40, in: 'pop', at: 1.05 },
    c09_bl: { type: 'text', html: 'verification applies it to a fresh checkout', size: 40, maxw: 470, lh: 1.25, x: B.x, y: B.y + 120, in: 'wipe', at: 1.8 },
  }, { sfx: [{ at: 1.0, kind: 'click' }] });
  // 328 (2) — symptom 5: over-editing — the chip swells into a long, many-file diff
  c(2, {
    c09_B: 'fade', c09_B_hd: 'quick', c09_B_ht: 'quick', c09_slot: 'quick', c09_nofit: 'quick', c09_bl: 'quick',
    c09_sym: { ver: 4 }, c09_track: { ver: 5 },
    c09_chip2: { x: 1560, y: 330, r: 0, s: 1.9, o: 0, dur: 0.9, ease: 'power2.in' },
    c09_diffs: { type: 'canvas', draw: 'c09_diffs', in: 'fade', dur: 0.3, at: 0.3, params: { short: 1, long: 1 }, paramsFrom: { short: 0, long: 0 }, pdur: 1.6, pease: 'power1.inOut' },
  });
  // 329 (4.5) — file and line counts tick up: measure patch size per task
  c(4.5, {
    c09_chip2: null,
    c09_sn: { type: 'text', html: '<span class="m">1 file · 4 lines</span>', size: 32, color: T.DIM, x: 1205, y: 450, in: 'fade', at: 0.2 },
    c09_ln: { type: 'num', val: 77, pre: '7 files · ', suf: ' lines', size: 40, color: T.GOLD, x: 1680, y: 870, in: 'count', at: 0.3, dur: 2.0 },
    c09_ms: { type: 'text', html: 'measure patch size per task&ensp;<span class="cap" style="font-size:0.55em;color:#F4D35E">concept · illustrative counts</span>', size: 44, x: 960, y: 940, in: 'wipe', at: 1.5 },
    c09_track: { o: 0, dur: 0.5 },
  }, { sfx: [{ at: 0.3, kind: 'tick' }] });
  // 330 (4.5) — the five symptoms shrink to tags; two harness traps fan out
  const TAG = (html, x, y, o = {}) => Object.assign({ type: 'box', w: 440, h: 78, x, y, stroke: '#5B6672', fill: 'rgba(21,26,33,0.96)', sw: 2.5, rad: 39, html, size: 36, in: 'scale' }, o);
  const SY = (i) => 300 + i * 105;
  const symTag = (i, nm) => TAG(nm, 420, SY(i), { stroke: T.RED, from: { x: 600, y: 210, s: 0.5, o: 0 }, dur: 0.9, ease: 'expo.out', at: 0.06 * i });
  const trapTag = (nm, x, y, w, at) => TAG(nm, x, y, { w: w || 440, stroke: T.DIM, from: { x: 960, y: 560, s: 0.3, o: 0 }, dur: 1.0, ease: 'expo.out', at });
  c(4.5, {
    loop: 'shrink', c09_sym: 'up', c09_diffs: 'fade', c09_sn: 'quick', c09_ln: 'quick', c09_ms: 'down', c09_track: null,
    c09_t0: symTag(0, 'looping'), c09_t1: symTag(1, 'never submitting'), c09_t2: symTag(2, 'wrong file'), c09_t3: symTag(3, 'patch won’t apply'), c09_t4: symTag(4, 'over-editing'),
    c09_sh: { type: 'text', html: cap('five symptoms'), size: 26, color: T.DIM, x: 420, y: 200, in: 'fade', at: 0.5 },
    c09_hh: { type: 'text', html: cap('four harness traps'), size: 26, color: T.DIM, x: 1400, y: 200, in: 'fade', at: 1.3 },
    c09_t5: trapTag('context overflow', 1400, 300, 0, 1.2), c09_t6: trapTag('editing tests', 1400, 405, 0, 1.45),
  }, { cut: true, cam: { x: 960, y: 520, s: 1 }, sfx: [{ at: 1.3, kind: 'pop' }, { at: 1.55, kind: 'pop' }] });
  // 331 (4.5) — two more traps
  c(4.5, {
    c09_t7: trapTag('stray files', 1400, 510, 0, 0.3),
    c09_t8: trapTag('touching pytest.ini or conftest.py', 1400, 615, 640, 0.65),
  }, { cam: { x: 960, y: 500, s: 1.02 }, sfx: [{ at: 0.4, kind: 'pop' }, { at: 0.75, kind: 'pop' }] });
  // 332 (4.5) — all nine sort into two piles (tags that would cross the frame shrink out and land in their pile)
  const PB = (i) => ({ x: 520, y: 380 + i * 104, w: 520, dur: 1.2, ease: 'expo.inOut' });
  const PH = (i, w) => ({ x: 1380, y: 380 + i * 104, w: w || 520, dur: 1.2, ease: 'expo.inOut' });
  const land = (html, pos, stroke, at) => TAG(html, pos.x, pos.y, { w: pos.w, stroke, in: 'pop', at });
  c(4.5, {
    c09_sh: 'quick', c09_hh: 'quick', c09_t3: 'shrink', c09_t4: 'shrink', c09_t5: 'shrink',
    c09_t0: { ...PB(0), at: 0.1 }, c09_t1: { ...PB(1), at: 0.15 }, c09_t2: { ...PB(2), at: 0.2 },
    c09_t6: { ...PH(2), at: 0.1 }, c09_t7: { ...PH(3), at: 0.15 }, c09_t8: { ...PH(4, 640), at: 0.2 },
    c09_t5b: land('context overflow', PB(3), T.RED, 0.9),
    c09_t3b: land('patch won’t apply', PH(0), T.RED, 1.0), c09_t4b: land('over-editing', PH(1), T.RED, 1.1),
    c09_p1: { type: 'text', html: 'the agent’s <span class="c-blue">behaviour</span>', size: 52, x: 520, y: 250, in: 'wipe', at: 1.4 },
    c09_p2: { type: 'text', html: 'the patch’s <span class="c-gold">hygiene</span>', size: 52, x: 1380, y: 250, in: 'wipe', at: 1.6 },
  }, { cam: { x: 960, y: 540, s: 1 }, sfx: [{ at: 1.0, kind: 'pop' }] });
  // 333 (3) — "suggested split"
  c(3, {
    c09_sug: { type: 'text', html: cap('suggested split', T.YELLOW), size: 28, x: 960, y: 160, in: 'fade', at: 0.1 },
    c09_div: { type: 'rect', x: 950, y: 560, w: 3, h: 620, fill: '#3A4654', in: 'growh', at: 0.2, dur: 1.4 },
  });
  // 334 (4.5) — an empty bar chart: your failure counts
  const tagsOut = Object.fromEntries(['0', '1', '2', '3b', '4b', '5b', '6', '7', '8'].map((i, k) => ['c09_t' + i, k % 2 ? 'down' : 'fade']));
  c(4.5, {
    ...tagsOut, c09_p1: 'up', c09_p2: 'up', c09_sug: 'quick', c09_div: 'quick',
    c09_chart: { type: 'canvas', draw: 'c09_chart', in: 'fade', dur: 0.2, params: { axis: 1, slots: 1, la: 1, pulse: 0 }, paramsFrom: { axis: 0, slots: 0 }, pdur: 2.4, pease: 'power2.out' },
    c09_ct: { type: 'text', html: 'your failure counts&ensp;—&ensp;<span class="c-dim">label 50 failed runs by hand</span>', size: 52, x: 960, y: 180, in: 'wipe', at: 1.0 },
  }, { cut: true });
  // 335 (4.5) — "empty on purpose: you fill this in"
  c(4.5, {
    c09_chart: { params: { axis: 1, slots: 1, la: 1, pulse: 1 }, pease: 'none' },
    c09_ep: { type: 'text', html: '<span class="plate">empty on purpose: <span class="c-yellow">you</span> fill this in</span>', size: 48, x: 960, y: 520, in: 'pop', at: 0.4 },
  }, { cam: { x: 960, y: 520, s: 1.06 } });
  // 336 (4.5) — the chart's axis extends into a row of 129 cells, which wraps into a grid
  c(4.5, {
    c09_ct: 'up', c09_ep: 'fade',
    c09_chart: { params: { axis: 1, slots: 0, la: 0, pulse: 1.4 }, pdur: 1.0, pease: 'power2.in' },
    c09_row: { type: 'canvas', draw: 'c09_row', in: 'fade', dur: 0.2, at: 0.2, params: { w: 2 }, paramsFrom: { w: 0 }, pdur: 3.1, pease: 'power2.inOut' },
    c09_129: { type: 'text', html: '<span class="c-yellow">129</span> tasks', size: 56, x: 960, y: 950, in: 'rise', at: 1.0 },
  }, { cam: { x: 960, y: 540, s: 1 } });
  // 337 (4.5) — the cells become the GRID (hand-off 9 → 10); the RAIL rewrites to "10"
  c(4.5, {
    c09_chart: 'quick', c09_row: 'none', c09_129: 'fade',
    grid: { type: 'canvas', draw: 'grid', x: 960, y: 540, repos: REPOS, in: 'none', at: -0.04, params: { ...GRID129, reveal: 1, gold: -1, dim: 0.5, sweep: 0, split: 0 }, paramsFrom: { dim: 0 }, pdur: 3.3, pease: 'power1.inOut' },
    rail: { ver: 10, at: 0.6, dur: 1.0 },
  }, { cam: { x: 960, y: 540, s: 1 }, drift: 0, exitLead: 0 });
})();
