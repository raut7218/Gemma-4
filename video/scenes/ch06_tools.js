// Chapter 6 — The nine tools (storyboard rows 203–237, 118 beats).
(function () {
  const { T } = F;
  const c = F.comp.bind(F);
  F.chapter(K.CH[6]);

  const { clamp, ease } = DRAW.util;
  const rgba = DRAW.rgba;
  const cap = (s, col) => `<span class="cap" style="font-size:1em${col ? ';color:' + col : ''}">${s}</span>`;
  const m = (s, col) => `<span class="m" style="white-space:nowrap${col ? ';color:' + col : ''}">${s}</span>`;
  const hsh = (i) => { const v = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return v - Math.floor(v); };

  // ---------------------------------------------------------------- the LOOP hand-off
  const L0 = { cx: 960, cy: 560, r: 240, draw: 1, labels: 1, ring: 1, dot: -1, exit: 0, hi: -1 };

  // ---------------------------------------------------------------- the nine tiles
  const NAMES = ['run_command', 'read_file', 'edit_file', 'write_file', 'get_status', 'submit_patch', 'get_code_neighbors', 'search_similar_code', 'get_code_subgraph'];
  const SLOT = [0, 1, 2, 3, 4.6, 5.6, 7.2, 8.2, 9.2];
  const GROUP = [0, 0, 0, 0, 1, 1, 2, 2, 2];
  const FREE = [4, 5];
  const FILL0 = 'rgba(92,208,179,0.10)', FILLS = 'rgba(92,208,179,0.92)', FILLN = 'rgba(92,208,179,0)';
  // the call node of the hand-off loop and the ring positions DRAW.loop uses
  const CALL = [960 + 240 * Math.cos(Math.PI / 6), 560 + 240 * Math.sin(Math.PI / 6)];
  const RING = (i) => { const a = -Math.PI / 2 + (i / 9) * Math.PI * 2; return [CALL[0] + Math.cos(a) * 150, CALL[1] + Math.sin(a) * 92]; };
  // the big arc (around the shrunken loop)
  const AC = [500, 580], AR = 720;
  const ARC = (i) => { const y = 170 + SLOT[i] * 89; return [AC[0] + Math.sqrt(AR * AR - (y - AC[1]) ** 2), y]; };
  // the toolbar column used during the close-ups
  const TB = (i) => [228, 262 + SLOT[i] * 60];
  // opening fan: the loop slides up-left (canvas offset LOFF) and the tiles fan out to the right of
  // its "call a tool" node, readable, top to bottom in group order
  const LOFF = [-400, -140];
  const CALL1 = [CALL[0] + LOFF[0], CALL[1] + LOFF[1]];
  const FAN = (i) => { const a = (-70 + i * 17.5) * Math.PI / 180; return [CALL1[0] + 720 * Math.cos(a), CALL1[1] + 450 * Math.sin(a)]; };
  // the return: the nine tiles as a true ring around a centred loop
  const RC = [770, 540];
  const RANG = [-90, -50, -10, 30, 62, 118, 150, 190, 230];
  const RING2 = (i) => { const a = RANG[i] * Math.PI / 180; return [RC[0] + 425 * Math.cos(a), RC[1] + 315 * Math.sin(a)]; };
  const RL_ = () => ({ cx: 960, cy: 560, r: 170, draw: 1, labels: 1, ring: 0, dot: -1, exit: 0, hi: -1 });
  // close-ups keep the toolbar pinned: almost no camera drift
  const cc = (b, d, o = {}) => c(b, d, Object.assign({ drift: 0.15 }, o));
  const tileHtml = (i) => [m(NAMES[i], T.TEAL), m(NAMES[i], '#0E1116')];
  const solid = (i) => !FREE.includes(i);

  const tilesAt = (fn) => Object.fromEntries(NAMES.map((_, i) => ['c06_t' + i, fn(i)]));
  // arc layout; lit = function(i) -> opacity
  const arcTiles = (o = {}) => tilesAt((i) => Object.assign({ x: ARC(i)[0], y: ARC(i)[1], s: 1, o: 1, w: 440, h: 70, size: 34, rad: 14 }, typeof o === 'function' ? o(i) : o));
  // toolbar layout; act = list of active tile indices
  const bar = (act, o = {}) => tilesAt((i) => Object.assign({ x: TB(i)[0] + (act.includes(i) ? 22 : 0), y: TB(i)[1], s: act.includes(i) ? 0.8 : 0.74, o: act.includes(i) ? 1 : 0.36 }, o));
  // fold the given view elements back into tile i
  // explicit at: without it the engine staggers morphs by the element's index in the whole comp (≈1 s late)
  const fold = (ids, i, at = 0) => Object.fromEntries(ids.map((id, j) => [id, { x: TB(i)[0] + 22, y: TB(i)[1], s: 0.06, o: 0, at: at + Math.min(j, 6) * 0.02, dur: 0.45, ease: 'power3.in' }]));
  const drop = (ids) => Object.fromEntries(ids.map((id) => [id, null]));

  // view region (right of the toolbar)
  const VX = 1130;

  // ---------------------------------------------------------------- chapter-local drawings
  // terminal output pouring in; a cut line drops at the 5,000-char mark and the rest greys out
  DRAW.c06_pour = (ctx, p, sp) => {
    const x0 = sp.rx, y0 = sp.ry, w = sp.rw, N = sp.rows, pitch = sp.pitch, CUT = sp.cutRow;
    const pour = clamp(p.pour ?? 0) * N, ck = ease(clamp((p.cut ?? 0) * 1.6)), grey = clamp((p.cut ?? 0) * 2 - 0.8);
    for (let r = 0; r < N; r++) {
      const k = clamp(pour - r);
      if (k <= 0) break;
      let x = x0;
      const y = y0 + r * pitch;
      const after = r >= CUT;
      ctx.fillStyle = after ? rgba(T.DIM, 0.85 - 0.62 * grey) : rgba(T.DIM, 0.85);
      let j = 0;
      while (x < x0 + w * (0.55 + 0.45 * hsh(r * 7.1)) * k) {
        const ww = 26 + hsh(r * 31 + j * 3.7) * 110;
        ctx.beginPath(); ctx.roundRect(x, y - 6, Math.min(ww, x0 + w - x), 12, 3); ctx.fill();
        x += ww + 14; j++;
      }
    }
    if (ck > 0) {
      const yc = y0 + (CUT - 0.5) * pitch;
      const yy = y0 - 60 + (yc - y0 + 60) * ck;
      ctx.save(); ctx.globalAlpha *= clamp(ck * 2);
      ctx.strokeStyle = T.YELLOW; ctx.lineWidth = 4; ctx.setLineDash([18, 12]);
      ctx.beginPath(); ctx.moveTo(x0 - 20, yy); ctx.lineTo(x0 + w + 20, yy); ctx.stroke();
      ctx.restore();
      DRAW.text(ctx, '5,000 chars', x0 + w + 10, yy - 26, { size: 34, color: T.YELLOW, align: 'right', a: clamp(ck * 2 - 0.6) });
      DRAW.text(ctx, 'cut here — the rest is dropped', x0 + w + 10, yy + 32, { size: 26, color: T.DIM, align: 'right', a: grey, sans: true });
    }
  };

  // a long file as a minimap; a 150-line window frames part of it
  DRAW.c06_file = (ctx, p, sp) => {
    const x0 = sp.fx, y0 = sp.fy, w = sp.fw, h = sp.fh, N = sp.lines;
    const rev = clamp(p.rev ?? 1), fr = clamp((p.fr ?? 0) * 3), win = p.win ?? 1;
    const lh = h / N;
    ctx.save();
    ctx.beginPath(); ctx.roundRect(x0 - 16, y0 - 16, w + 32, (h + 32) * ease(rev), 12);
    ctx.fillStyle = 'rgba(21,26,33,0.96)'; ctx.fill(); ctx.strokeStyle = '#3A4654'; ctx.lineWidth = 2.5; ctx.stroke();
    const a0 = win - 1, a1 = win - 1 + 150;
    for (let i = 0; i < N; i++) {
      if (i / N > rev) break;
      const inWin = fr > 0 && i >= a0 && i < a1;
      const ind = Math.floor(hsh(i * 1.7) * 4) * 22, len = 60 + hsh(i * 5.3) * (w - 140 - ind);
      if (hsh(i * 9.1) < 0.12) continue; // blank lines
      ctx.fillStyle = inWin ? rgba(T.INK, 0.8) : rgba(T.DIM, 0.38);
      ctx.fillRect(x0 + ind, y0 + i * lh, len, Math.max(1, lh * 0.62));
    }
    // line numbers
    [1, 150, 300, 450].forEach((n, k) => DRAW.text(ctx, String(n), x0 - 34, y0 + (n - 1) * lh + 2, { size: 24, color: T.DIM, align: 'right', a: clamp(rev * 4 - k) }));
    if (fr > 0) {
      const yA = y0 + a0 * lh, yB = y0 + Math.min(N, a1) * lh;
      ctx.globalAlpha = fr;
      ctx.fillStyle = rgba(T.BLUE, 0.10); ctx.fillRect(x0 - 24, yA - 4, w + 48, yB - yA + 8);
      ctx.strokeStyle = T.BLUE; ctx.lineWidth = 4; ctx.strokeRect(x0 - 24, yA - 4, w + 48, yB - yA + 8);
      const s = Math.round(a0) + 1;
      DRAW.text(ctx, `lines ${s}–${s + 149}`, x0 + w + 40, (yA + yB) / 2, { size: 30, color: T.BLUE, align: 'left' });
      // the truncation flag at the window's bottom edge
      const fl = clamp(p.flag ?? 0);
      if (fl > 0) {
        ctx.save(); ctx.globalAlpha *= fl; ctx.fillStyle = T.TEAL;
        ctx.beginPath(); ctx.moveTo(x0 + w + 24, yB + 4); ctx.lineTo(x0 + w + 24, yB - 40 * fl); ctx.lineTo(x0 + w + 58, yB - 26 * fl); ctx.lineTo(x0 + w + 24, yB - 12 * fl); ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
  };

  // horizontal context bar with a hairline tick
  DRAW.c06_ctx = (ctx, p, sp) => {
    const x = sp.bx, y = sp.by, w = sp.bw, h = sp.bh || 64;
    const v = p.v ?? 0.4, v0 = sp.v0 ?? v, tk = clamp(p.tick ?? 0);
    ctx.beginPath(); ctx.roundRect(x, y - h / 2, w, h, 10); ctx.fillStyle = 'rgba(21,26,33,0.95)'; ctx.fill(); ctx.strokeStyle = '#3A4654'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.beginPath(); ctx.roundRect(x + 8, y - h / 2 + 8, (w - 16) * v, h - 16, 6); ctx.fillStyle = rgba(T.BLUE, 0.8); ctx.fill();
    if (tk > 0) {
      const t0 = x + 8 + (w - 16) * v0, tx = x + 8 + (w - 16) * v;
      // the sliver this call added, lit
      if (tx > t0) { ctx.fillStyle = rgba(T.INK, 0.85 * tk); ctx.fillRect(t0, y - h / 2 + 8, tx - t0, h - 16); }
      // the hairline grows from the bar's middle outward, with a fading pulse
      const ext = (h / 2 + 22) * ease(tk);
      ctx.save(); ctx.globalAlpha *= clamp(tk * 3); ctx.strokeStyle = T.INK; ctx.lineWidth = 3; ctx.shadowColor = T.INK; ctx.shadowBlur = 12 + 20 * (1 - tk);
      ctx.beginPath(); ctx.moveTo(tx, y - ext); ctx.lineTo(tx, y + ext); ctx.stroke(); ctx.restore();
      if (tk < 1) { ctx.save(); ctx.globalAlpha *= (1 - tk) * 0.8; ctx.strokeStyle = T.INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(tx, y, 12 + 70 * tk, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
    }
    DRAW.text(ctx, 'CONTEXT', x + w / 2, y + h / 2 + 40, { size: 26, color: T.DIM, sans: true, caps: true });
  };

  // a code graph: functions as nodes, calls as edges (concept)
  const GN = [
    ['Session.request', 640, 330], ['Session.send', 930, 450], ['HTTPAdapter', 1210, 590], ['HTTPAdapter.send', 1480, 430],
    ['get_connection', 1640, 650], ['build_response', 1420, 800], ['PreparedRequest', 700, 640], ['prepare_body', 560, 830],
    ['merge_setting', 1060, 300], ['resolve_redirects', 1000, 800], ['cert_verify', 1730, 300],
  ];
  const GE = [[0, 1], [0, 8], [0, 6], [6, 7], [1, 3], [1, 9], [2, 3], [3, 4], [3, 5], [2, 4], [3, 10], [9, 5]];
  const NB = 1, NBS = [0, 3, 9], QN = 2, LASSO = [2, 3, 4];
  DRAW.c06_graph = (ctx, p) => {
    // edges first, then nodes; each label sits on a background knockout so no edge runs through it
    const dr = clamp(p.draw ?? 1), nb = clamp(p.nb ?? 0), q = clamp((p.q ?? 0) * 2 - 1), la = clamp(p.lasso ?? 0);
    ctx.save(); ctx.globalAlpha *= p.a ?? 1;
    GE.forEach(([a, b], i) => {
      const k = clamp(dr * 2.2 - 0.6 - i * 0.05);
      if (k <= 0) return;
      const isNb = (a === NB || b === NB);
      const inL = LASSO.includes(a) && LASSO.includes(b);
      let col = rgba(T.DIM, 0.55);
      if (nb > 0 && isNb) col = rgba(T.TEAL, 0.55 + 0.45 * nb);
      if (la > 0) col = inL ? rgba(T.TEAL, 0.5 + 0.5 * la) : rgba(T.DIM, 0.55 * (1 - 0.7 * la));
      DRAW.polyline(ctx, [[GN[a][1], GN[a][2]], [GN[b][1], GN[b][2]]], k, { color: col, w: (nb > 0 && isNb) || (la > 0 && inL) ? 4 : 2.5 });
    });
    if (la > 0) {
      // lasso: a dashed hull (under the nodes and their labels) around the three kept nodes
      const pts = [[1150, 560], [1440, 360], [1720, 610], [1660, 720], [1250, 670]];
      ctx.save(); ctx.setLineDash([16, 12]);
      const cl = pts.concat([pts[0]]).map(([x, y]) => [x + (x - 1460) * 0.06, y + (y - 560) * 0.06]);
      DRAW.polyline(ctx, cl, la, { color: T.TEAL, w: 3.5, dash: [16, 12] });
      ctx.restore();
    }
    GN.forEach(([nm, x, y], i) => {
      const k = ease(clamp(dr * 2 - i * 0.08));
      if (k <= 0) return;
      let hi = 0;
      if (i === NB) hi = nb; else if (NBS.includes(i)) hi = nb * 0.75;
      if (i === QN) hi = Math.max(hi, q);
      if (la > 0) hi = LASSO.includes(i) ? Math.max(la, hi * (1 - la)) : hi * (1 - la);
      const dim = la > 0 && !LASSO.includes(i) ? 0.45 * la : 0;
      ctx.save(); ctx.globalAlpha *= k * (1 - dim);
      ctx.beginPath(); ctx.arc(x, y, 18 * (0.5 + 0.5 * k) * (1 + 0.25 * hi), 0, Math.PI * 2);
      ctx.fillStyle = hi > 0 ? rgba(T.TEAL, 0.25 + 0.6 * hi) : 'rgba(21,26,33,1)'; ctx.fill();
      ctx.lineWidth = 3.5; ctx.strokeStyle = hi > 0 ? T.TEAL : '#6F7883'; ctx.stroke();
      ctx.restore();
      ctx.save(); ctx.font = '400 24px CMT'; const lw = ctx.measureText(nm).width; ctx.restore();
      ctx.save(); ctx.globalAlpha *= k; ctx.fillStyle = T.BG; ctx.beginPath(); ctx.roundRect(x - lw / 2 - 10, y + 42 - 17, lw + 20, 34, 8); ctx.fill(); ctx.restore();
      DRAW.text(ctx, nm, x, y + 42, { mono: true, size: 24, color: hi > 0.3 ? T.INK : T.DIM, a: k * (1 - dim) });
    });
    ctx.restore();
  };

  // extension rings (dashed arcs outside the tool arc)
  DRAW.c06_ext = (ctx, p) => {
    [[600, 410, p.a1 ?? 0, T.TEAL], [652, 455, p.a2 ?? 0, T.BLUE]].forEach(([rx, ry, k, col]) => {
      if (k <= 0) return;
      const pts = [];
      for (let j = 0; j <= 120; j++) { const a = -Math.PI / 2 + (j / 60 - 1) * Math.PI; pts.push([RC[0] + rx * Math.cos(a), RC[1] + ry * Math.sin(a)]); }
      // grow from the top outward, both ways, until it closes at the bottom
      const mid = 60, n = Math.round(60 * ease(clamp(k)));
      DRAW.polyline(ctx, pts.slice(mid - n, mid + n + 1), 1, { color: rgba(col, 0.9), w: 4, dash: [18, 14] });
    });
  };

  // ================================================================ compositions
  // 203 (4.5) — OVER the loop; nine teal tiles ring its "call a tool" node
  // The loop arrives exactly as handed over (ring of nine squares drawn by DRAW.loop). From the first
  // frame it slides up-left while nine tile elements, sitting exactly on the drawn squares, fan out to
  // the right of "call a tool" and grow into readable labelled tiles.
  // Chapter 5 ends with the nine tiles as a labelled arc right of the loop (c05_tt*, ARC5 at k = 1); the
  // c06 tiles take over at exactly those pixels on the first frame (exitLead 0, enterDelay 0, exit 'none').
  // Everything eases IN from rest (power2.inOut) and keeps moving through the whole composition.
  const ARC5 = (i) => { const y = 160 + i * 95 - 10; return [1150 + 470 * Math.sqrt(1 - ((y - 540) / 560) ** 2) - 14, y]; };
  c(4.5, {
    ...K.rail(6),
    loop: { type: 'canvas', draw: 'loop', x: 960 + LOFF[0], y: 540 + LOFF[1], params: { ...L0, ring: 0 }, pdur: 0.9, pease: 'power2.inOut', from: { x: 960, y: 540, o: 1, s: 1 }, at: 0, dur: 3.0, ease: 'power2.inOut' },
    ...tilesAt((i) => ({ type: 'box', x: FAN(i)[0], y: FAN(i)[1], w: 390, h: 60, rad: 12, sw: 2.5, stroke: T.TEAL, fill: FILL0, versions: tileHtml(i), ver: 0, size: 30, z: 5, in: 'fade',
      from: { x: ARC5(i)[0], y: ARC5(i)[1], o: 1, s: 1 }, at: 0, dur: 2.9 + i * 0.05, ease: 'power2.inOut' })),
    c06_cap: { type: 'text', html: 'Nine tools. <span class="c-dim">A fixed set.</span>', size: 64, x: 560, y: 840, in: 'wipe', from: { reveal: 0 }, at: 1.3, dur: 1.2 },
  }, { clear: true, keep: ['rail'], cam: { x: 960, y: 540, s: 1 }, drift: 0.5, out: 'none', exitLead: 0, enterDelay: 0, sfx: [{ at: 0.3, kind: 'tick' }] });

  // 204 (4) — the ring opens into an arc; group 1 labels itself
  const gLabel = (g, html) => {
    const ids = NAMES.map((_, i) => i).filter((i) => GROUP[i] === g);
    const y0 = ARC(ids[0])[1], y1 = ARC(ids[ids.length - 1])[1];
    return {
      ['c06_gb' + g]: { type: 'rect', x: 1468, y: (y0 + y1) / 2, w: 4, h: y1 - y0 + 60, fill: rgba(T.TEAL, 0.6), rad: 2, in: 'growh', at: 0.9 },
      ['c06_g' + g]: { type: 'text', html, size: 44, align: 'left', ax: 0, x: 1496, y: (y0 + y1) / 2, in: 'wipe', at: 1.05 },
    };
  };
  c(4, {
    loop: { x: 340, y: 540, s: 0.75, params: { ...L0, ring: 0 }, pdur: 0.5, dur: 1.3, ease: 'expo.inOut' },
    c06_cap: 'left',
    ...arcTiles((i) => ({ fill: FILL0, ver: 0, o: GROUP[i] === 0 ? 1 : 0.4, rad: 14, sw: 2, at: 0.05 + i * 0.05, dur: 1.2, ease: 'expo.inOut' })),
    ...gLabel(0, 'shell &amp; files'),
  }, { cut: false });
  // 205 (2.5) — group 2
  c(2.5, { ...tilesAt((i) => (GROUP[i] === 1 ? { o: 1, at: 0.1, dur: 0.6 } : {})), ...gLabel(1, 'control') });
  // 206 (3) — group 3
  c(3, { ...tilesAt((i) => (GROUP[i] === 2 ? { o: 1, at: 0.1, dur: 0.6 } : {})), ...gLabel(2, 'code graph') });

  // 207 (4.5) — seven tiles fill solid: budgeted
  c(4.5, {
    ...tilesAt((i) => (solid(i) ? { fill: FILLS, ver: 1, at: 0.3 + i * 0.13, dur: 0.5, ease: 'power2.out' } : {})),
    c06_bud: { type: 'text', html: '<span style="display:inline-block;width:0.7em;height:0.7em;border-radius:5px;background:#5CD0B3;margin-right:0.35em"></span>budgeted — <span class="c-dim">each call counts</span>', size: 44, align: 'left', ax: 0, x: 110, y: 820, in: 'wipe', at: 1.5 },
  }, { sfx: [0, 1, 2, 3, 6, 7, 8].map((i) => ({ at: 0.32 + i * 0.13, kind: 'tick' })) });
  // 208 (2.5) — get_status and submit_patch turn to outlines: free
  c(2.5, {
    ...tilesAt((i) => (FREE.includes(i) ? { fill: FILLN, sw: 4, s: 1.05, at: 0.2, dur: 0.7 } : {})),
    c06_free: { type: 'text', html: '<span style="display:inline-block;width:0.6em;height:0.6em;border-radius:5px;border:3px solid #5CD0B3;margin-right:0.35em"></span>free — <span class="c-dim">get_status · submit_patch</span>', size: 44, align: 'left', ax: 0, x: 110, y: 920, in: 'wipe', at: 0.5 },
  });

  // 209 (4.5) — CLOSE run_command opens into a terminal
  const TERM = { x: VX, y: 600, w: 1400, h: 720 };
  cc(4.5, {
    loop: { o: 0, dur: 0.5 }, c06_g0: 'fade', c06_g1: 'fade', c06_g2: 'fade', c06_gb0: 'fade', c06_gb1: 'fade', c06_gb2: 'fade', c06_bud: 'left', c06_free: 'left',
    ...bar([0], { dur: 1.0, ease: 'expo.inOut' }),
    c06_term: { type: 'box', ...TERM, stroke: T.TEAL, fill: 'rgba(21,26,33,0.97)', sw: 3, rad: 18, html: '', in: 'scale', from: { x: TB(0)[0], y: TB(0)[1], s: 0.15, o: 0 }, at: 0.35, dur: 1.1, ease: 'expo.out', z: 6 },
    c06_tcap: { type: 'text', html: `${m('run_command', T.TEAL)}&ensp;bash in ${m('/workspace')} · ${m('timeout')} ${m('min(300 s, time remaining)')}`, size: 40, maxw: 1460, x: VX, y: 178, in: 'wipe', at: 1.0, dur: 1.2 },
    c06_cmd: { type: 'mono', html: '<span class="c-dim">/workspace $</span> python -m pytest -q', size: 34, ax: 0, x: TERM.x - TERM.w / 2 + 50, y: TERM.y - TERM.h / 2 + 56, in: 'wipe', at: 1.6, z: 7 },
    c06_ttag: { type: 'text', html: cap('illustrative'), size: 24, color: T.DIM, align: 'right', ax: 1, x: TERM.x + TERM.w / 2 - 36, y: TERM.y - TERM.h / 2 + 56, in: 'fade', at: 1.8, z: 7 },
    c06_pour: { type: 'canvas', draw: 'c06_pour', rx: TERM.x - TERM.w / 2 + 50, ry: TERM.y - TERM.h / 2 + 120, rw: TERM.w - 100, rows: 21, pitch: 27, cutRow: 12, z: 7, in: 'fade', dur: 0.2, at: 2.4, params: { pour: 0.4, cut: 0 }, paramsFrom: { pour: 0 }, pdur: 1.0, pease: 'none' },
  }, { cut: true, sfx: [{ at: 0.4, kind: 'click' }] });
  // 210 (2) — output pours; a cut line drops at 5,000 chars
  cc(2, { c06_pour: { params: { pour: 1, cut: 1 }, pdur: 1.45, pease: 'power1.inOut' } }, { sfx: [{ at: 0.75, kind: 'tick' }] });
  // 211 (2) — the result returns as a JSON string; keys light in turn
  const J = (n) => {
    const k = (s, i) => (i < n ? `<span class="c-teal">"${s}"</span>` : `<span class="c-dim">"${s}"</span>`);
    return `{${k('status', 0)}: …, ${k('stdout', 1)}: "…", ${k('exit_code', 2)}: …}`;
  };
  cc(2, {
    c06_pour: { o: 0.15, dur: 0.35, at: 0 }, c06_cmd: { o: 0.3, dur: 0.35, at: 0 },
    c06_jp: { type: 'box', w: 1250, h: 170, x: VX, y: 505, stroke: T.TEAL, sw: 2, fill: 'rgba(21,26,33,1)', rad: 16, html: '', z: 8, in: 'scale', at: 0.15, dur: 0.6 },
    c06_json: { type: 'mono', versions: [0, 1, 2, 3].map(J), ver: 3, size: 42, x: VX, y: 480, z: 9, in: 'fade', from: { ver: 0, o: 0 }, at: 0.3, dur: 1.1, ease: 'power1.inOut' },
    c06_jl: { type: 'text', html: cap('what the model reads: a JSON string'), size: 26, color: T.DIM, x: VX, y: 550, in: 'fade', at: 0.6, z: 9 },
  }, { sfx: [{ at: 0.4, kind: 'tick' }, { at: 0.8, kind: 'tick' }, { at: 1.2, kind: 'tick' }] });

  // 212 (3.5) — read_file opens into a long file
  const VIEW1 = ['c06_term', 'c06_tcap', 'c06_cmd', 'c06_ttag', 'c06_pour', 'c06_jp', 'c06_json', 'c06_jl'];
  const FILE = { fx: 520, fy: 250, fw: 480, fh: 710, lines: 450 };
  cc(3.5, {
    ...fold(VIEW1, 0),
    ...bar([1], { dur: 0.9 }),
    c06_file: { type: 'canvas', draw: 'c06_file', ...FILE, z: 6, in: 'fade', dur: 0.3, at: 0.5, params: { rev: 1, fr: 0, win: 1, flag: 0 }, paramsFrom: { rev: 0 }, pdur: 1.8, pease: 'power2.out' },
    c06_rcap: { type: 'text', html: `${m('read_file', T.TEAL)}&ensp;<span class="c-dim">a long file, read through a window</span>`, size: 40, x: 1180, y: 170, in: 'wipe', at: 0.9 },
  }, { cut: false, sfx: [{ at: 0.5, kind: 'click' }] });
  // 213 (4.5) — a frame over lines 1–150 slides down
  cc(4.5, {
    ...drop(VIEW1),
    c06_file: { params: { rev: 1, fr: 1, win: 151, flag: 0 }, pdur: 3.2, pease: 'power2.inOut' },
    c06_l150: { type: 'text', html: '≤ <span class="c-yellow">150</span> lines', size: 76, align: 'left', ax: 0, x: 1250, y: 430, in: 'wipe', at: 0.7 },
    c06_l10k: { type: 'text', html: '≤ <span class="c-yellow">10,000</span> chars', size: 76, align: 'left', ax: 0, x: 1250, y: 560, in: 'wipe', at: 1.2 },
    c06_lper: { type: 'text', html: 'per call', size: 48, color: T.DIM, align: 'left', ax: 0, x: 1250, y: 670, in: 'rise', at: 1.6 },
  });
  // 214 (2.5) — reading beat: "≤ 150 lines" stays bright; the rest sinks to a third
  cc(2.5, {
    c06_file: { o: 0.33, dur: 0.6 }, c06_l10k: { o: 0.33, dur: 0.6 }, c06_lper: { o: 0.33, dur: 0.6 }, c06_rcap: { o: 0.33, dur: 0.6 },
    ...tilesAt((i) => ({ o: i === 1 ? 0.33 : 0.12, dur: 0.6 })),
    c06_l150: { s: 1.1, dur: 1.4, ease: 'expo.out' },
  });
  // 215 (2) — a flag lights in the result: is_truncated = true
  cc(2, {
    c06_file: { o: 1, params: { rev: 1, fr: 1, win: 151, flag: 1 }, pdur: 0.7, dur: 0.5 }, c06_l10k: { o: 1, dur: 0.5 }, c06_lper: { o: 1, dur: 0.5 }, c06_rcap: { o: 1, dur: 0.5 },
    ...bar([1], { dur: 0.5 }),
    c06_l150: { s: 1, dur: 0.6 },
    c06_flag: { type: 'box', w: 560, h: 84, x: 1500, y: 820, stroke: T.TEAL, fill: 'rgba(92,208,179,0.12)', rad: 14, html: m('"is_truncated": true', T.INK), size: 36, in: 'pop', at: 0.35 },
  }, { sfx: [{ at: 0.4, kind: 'pop' }] });

  // 216 (3.5) — CLOSE edit_file: old_string above new_string
  const VIEW2 = ['c06_file', 'c06_rcap', 'c06_l150', 'c06_l10k', 'c06_lper', 'c06_flag'];
  const EX0 = 520;
  cc(3.5, {
    ...fold(VIEW2, 1),
    ...bar([2], { dur: 0.9 }),
    c06_ecap: { type: 'text', html: m('edit_file', T.TEAL), size: 44, align: 'left', ax: 0, x: EX0, y: 160, in: 'wipe', at: 0.4 },
    c06_etag: { type: 'text', html: cap('illustrative'), size: 24, color: T.DIM, align: 'right', ax: 1, x: 1800, y: 160, in: 'fade', at: 0.6 },
    c06_oldL: { type: 'text', html: cap('old_string'), size: 26, color: T.RED, align: 'left', ax: 0, x: EX0, y: 232, in: 'fade', at: 0.6 },
    c06_old: { type: 'box', w: 1280, h: 92, x: 1160, y: 292, stroke: T.RED, fill: 'rgba(252,98,85,0.08)', rad: 14, align: 'left', html: `<div style="padding-left:36px;text-align:left">${m('    return total / len(xs)', T.RED)}</div>`, size: 38, in: 'left', at: 0.5 },
    c06_newL: { type: 'text', html: cap('new_string'), size: 26, color: T.GOLD, align: 'left', ax: 0, x: EX0, y: 372, in: 'fade', at: 1.0 },
    c06_new: { type: 'box', w: 1280, h: 92, x: 1160, y: 432, stroke: T.GOLD, fill: 'rgba(240,172,95,0.08)', rad: 14, align: 'left', html: `<div style="padding-left:36px;text-align:left">${m('    return total / len(xs) if xs else 0', T.GOLD)}</div>`, size: 38, in: 'right', at: 0.9 },
  }, { cut: true, sfx: [{ at: 0.5, kind: 'click' }] });
  // 217 (2) — three match stages light in turn
  const STG = ['exact', 'whitespace-flexible', 'regex-tokenised'];
  const stg = {};
  STG.forEach((s, i) => {
    stg['c06_st' + i] = { type: 'box', w: 400, h: 82, x: 720 + i * 450, y: 590, stroke: T.TEAL, fill: 'rgba(92,208,179,0.22)', rad: 41, html: s, size: 36, in: 'scale', from: { o: 0, fill: 'rgba(92,208,179,0)' }, at: 0.05 + i * 0.33, dur: 0.5 };
    if (i) stg['c06_sa' + i] = { type: 'text', html: '→', size: 44, color: T.DIM, x: 720 + i * 450 - 225, y: 590, in: 'left', at: i * 0.33 - 0.1, dur: 0.4 };
  });
  cc(2, { ...drop(['c06_file', 'c06_rcap', 'c06_l150', 'c06_l10k', 'c06_lper', 'c06_flag']), ...stg }, { sfx: [0, 1, 2].map((i) => ({ at: 0.08 + i * 0.33, kind: 'tick' })) });
  // 218 (4.5) — error chips
  cc(4.5, {
    c06_err0: { type: 'box', w: 560, h: 84, x: 860, y: 740, stroke: T.RED, fill: 'rgba(252,98,85,0.08)', rad: 14, html: '<span class="c-red">0 matches</span> → error', size: 38, in: 'pop', at: 0.9 },
    c06_err1: { type: 'box', w: 620, h: 84, x: 1480, y: 740, stroke: T.RED, fill: 'rgba(252,98,85,0.08)', rad: 14, html: '<span class="c-red">more than one</span> → error', size: 38, in: 'pop', at: 1.4 },
  }, { sfx: [{ at: 0.95, kind: 'pop' }, { at: 1.45, kind: 'pop' }] });
  // 219 (2) — a third switch: allow_multiple (off by default)
  cc(2, {
    c06_sw: { type: 'box', w: 96, h: 50, x: EX0 + 48, y: 890, stroke: T.DIM, fill: 'rgba(92,208,179,0.0)', rad: 25, html: '', in: 'fade', at: 0.05 },
    c06_knob: { type: 'rect', w: 34, h: 34, rad: 17, x: EX0 + 70, y: 890, fill: T.TEAL, in: 'fade', from: { x: EX0 + 26, fill: T.DIM, o: 1 }, at: 0.1, dur: 1.2, ease: 'expo.inOut', z: 3 },
    c06_swt: { type: 'text', html: `${m('allow_multiple', T.INK)}&ensp;<span class="c-dim">off by default</span> — on, every match is replaced`, size: 40, align: 'left', ax: 0, x: EX0 + 130, y: 890, in: 'wipe', at: 0.2 },
  });

  // 220 (4.5) — CLOSE write_file: a new file inside /workspace, gold outline
  const VIEW3x = ['c06_ecap', 'c06_etag', 'c06_oldL', 'c06_old', 'c06_newL', 'c06_new', ...STG.map((_, i) => 'c06_st' + i), 'c06_sa1', 'c06_sa2', 'c06_err0', 'c06_err1', 'c06_sw', 'c06_knob', 'c06_swt'];
  const VIEW3 = VIEW3x;
  const WS = { x: 930, y: 480, w: 760, h: 560 }, TMP = { x: 1580, y: 480, w: 420, h: 380 };
  const files = ['src/', 'src/stats.py', 'tests/test_stats.py', 'pyproject.toml'];
  cc(4.5, {
    // the switch flips on first (the escape hatch), then the view folds
    ...fold(VIEW3x, 2),
    ...bar([3], { dur: 0.9 }),
    c06_ws: { type: 'box', ...WS, stroke: T.BLUE, fill: 'rgba(88,196,221,0.05)', rad: 20, html: '', in: 'draw', at: 0.4 },
    c06_wsl: { type: 'text', html: m('/workspace', T.BLUE), size: 40, align: 'left', ax: 0, x: WS.x - WS.w / 2 + 34, y: WS.y - WS.h / 2 + 46, in: 'fade', at: 0.7 },
    c06_tree: { type: 'mono', html: files.map((f, i) => `<div style="padding-left:${i === 1 || i === 2 ? 0 : 0}em">${f}</div>`).join(''), size: 40, lh: 1.55, color: T.DIM, ax: 0, x: WS.x - WS.w / 2 + 50, y: WS.y - 40, in: 'wipe', at: 0.8 },
    c06_tmp: { type: 'box', ...TMP, stroke: '#6F7883', fill: 'rgba(154,163,173,0.04)', rad: 20, html: '', in: 'draw', at: 0.6 },
    c06_tmpl: { type: 'text', html: m('/tmp', T.DIM), size: 40, align: 'left', ax: 0, x: TMP.x - TMP.w / 2 + 34, y: TMP.y - TMP.h / 2 + 46, in: 'fade', at: 0.9 },
    c06_new2: { type: 'box', w: 330, h: 70, x: WS.x - 30, y: WS.y + 190, stroke: T.GOLD, fill: 'rgba(240,172,95,0.12)', sw: 3.5, rad: 12, html: m('scratch.py', T.INK), size: 36, in: 'pop', at: 1.5 },
    c06_wtag: { type: 'text', html: cap('example'), size: 24, color: T.DIM, align: 'right', ax: 1, x: 1800, y: 205, in: 'fade', at: 0.9 },
    c06_wcap: { type: 'text', html: `${m('write_file', T.TEAL)}&ensp;files created here <span class="c-gold">end up in your patch</span>`, size: 48, x: VX + 40, y: 880, in: 'wipe', at: 1.9 },
  }, { cut: true, sfx: [{ at: 1.55, kind: 'pop' }] });
  // 221 (2.5) — reading beat: underline "end up in your patch"
  F.beat(2.5, { id: 'c06_wcap', mode: 'underline', w: 470, dx: 345, under: 36, color: T.GOLD });
  // 222 (2) — the scratch file slides to /tmp; its gold outline fades
  cc(2, { ...drop(VIEW3), c06_new2: { x: TMP.x, y: TMP.y + 20, stroke: '#6F7883', fill: 'rgba(154,163,173,0.06)', dur: 1.1, ease: 'expo.inOut', at: 0.1 } });

  // 223 (4.5) — CLOSE get_status: tool-call counter stays put, context ticks a hairline
  const VIEW4 = ['c06_ws', 'c06_wsl', 'c06_tree', 'c06_tmp', 'c06_tmpl', 'c06_new2', 'c06_wtag', 'c06_wcap'];
  cc(4.5, {
    ...fold(VIEW4, 3),
    ...bar([4], { dur: 0.9 }),
    c06_gs: { type: 'mono', html: `${m('get_status()', T.TEAL)}&ensp;<span class="c-dim">→ budget and patch status</span>`, size: 44, x: VX, y: 220, in: 'wipe', at: 0.75 },
    c06_tcN: { type: 'num', val: 3, size: 220, color: T.YELLOW, x: 640, y: 530, in: 'fade', at: 0.8 },
    c06_tcL: { type: 'text', html: cap('tool calls'), size: 28, color: T.DIM, x: 640, y: 690, in: 'fade', at: 0.9 },
    c06_tc0: { type: 'text', html: '+0', size: 64, color: T.TEAL, x: 760, y: 400, in: 'rise', at: 1.4 },
    c06_ttg: { type: 'text', html: cap('example'), size: 24, color: T.DIM, align: 'right', ax: 1, x: 1800, y: 330, in: 'fade', at: 1.0 },
    c06_ctx: { type: 'canvas', draw: 'c06_ctx', bx: 840, by: 530, bw: 960, bh: 96, v0: 0.38, z: 4, in: 'fade', at: 0.85, params: { v: 0.41, tick: 1 }, paramsFrom: { v: 0.38, tick: 0 }, pdur: 2.2, pease: 'power2.inOut' },
    c06_free2: { type: 'text', html: '<span class="c-teal">free</span> = not counted as a tool call', size: 56, x: VX, y: 820, in: 'wipe', at: 2.0 },
  }, { cut: true, sfx: [{ at: 0.8, kind: 'click' }] });

  // 224 (4.5) — CLOSE submit_patch: git diff HEAD pours into the gold chip
  const VIEW5 = ['c06_gs', 'c06_tcN', 'c06_tcL', 'c06_tc0', 'c06_ttg', 'c06_ctx', 'c06_free2'];
  cc(4.5, {
    ...fold(VIEW5, 4), ...drop(VIEW4),
    ...bar([5], { dur: 0.9 }),
    c06_sp: { type: 'mono', html: `${m('submit_patch()', T.TEAL)}&ensp;<span class="c-dim">captures</span> ${m('git diff HEAD')}`, size: 46, x: VX, y: 220, in: 'wipe', at: 0.4 },
    c06_d1: { type: 'mono', html: '<span class="del">-     return total / len(xs)</span>', size: 38, ax: 0, x: 640, y: 380, in: 'fade', at: 0.8 },
    c06_d2: { type: 'mono', html: '<span style="color:#F0AC5F">+     return total / len(xs) if xs else 0</span>', size: 38, ax: 0, x: 640, y: 440, in: 'fade', at: 1.0 },
    c06_dtag: { type: 'text', html: cap('illustrative'), size: 24, color: T.DIM, align: 'right', ax: 1, x: 1800, y: 300, in: 'fade', at: 0.9 },
    ...K.chip('c06_chip', { x: VX, y: 680, s: 1.5, at: 2.1 }),
  }, { cut: false, sfx: [{ at: 0.45, kind: 'click' }, { at: 2.15, kind: 'pop' }] });
  // 225 (4.5) — "ends the session after this turn"
  cc(4.5, {
    ...drop(VIEW5),
    c06_d1: { x: VX - 100, y: 680, s: 0.2, o: 0, dur: 0.7, ease: 'power3.in' },
    c06_d2: { x: VX - 100, y: 680, s: 0.2, o: 0, dur: 0.7, ease: 'power3.in', at: 0.1 },
    c06_chip: { s: 1.7, dur: 1.2, at: 0.5, ease: 'expo.out' },
    c06_end: { type: 'text', html: 'ends the session <span class="c-red">after this turn</span>', size: 64, x: VX, y: 880, in: 'wipe', at: 0.9 },
    // the session as a track of turns: turns lead up to the chip; after it the track stops
    c06_trk: { type: 'rect', x: 680, y: 680, w: 330, h: 4, fill: T.DIM, rad: 2, in: 'grow', at: 0.3, dur: 0.8 },
    c06_trkL: { type: 'text', html: cap('turns'), size: 26, color: T.DIM, x: 620, y: 630, in: 'fade', at: 0.5 },
    c06_tk0: { type: 'rect', w: 24, h: 24, rad: 12, fill: T.BLUE, x: 560, y: 680, in: 'pop', at: 0.45 },
    c06_tk1: { type: 'rect', w: 24, h: 24, rad: 12, fill: T.BLUE, x: 660, y: 680, in: 'pop', at: 0.6 },
    c06_tk2: { type: 'rect', w: 24, h: 24, rad: 12, fill: T.BLUE, x: 760, y: 680, in: 'pop', at: 0.75 },
    c06_stop: { type: 'rect', w: 10, h: 120, rad: 4, fill: T.RED, x: VX + 330, y: 680, in: 'growh', at: 1.8 },
    c06_stopL: { type: 'text', html: cap('no next turn', T.RED), size: 26, align: 'left', ax: 0, x: VX + 360, y: 680, in: 'fade', at: 2.0 },
  }, { sfx: [{ at: 0.5, kind: 'tick' }, { at: 0.65, kind: 'tick' }, { at: 0.8, kind: 'tick' }, { at: 1.85, kind: 'tick' }] });

  // 226 (4.5) — WIDE a code graph (concept)
  const VIEW6 = ['c06_sp', 'c06_d1', 'c06_d2', 'c06_dtag', 'c06_end', 'c06_stop', 'c06_stopL', 'c06_trk', 'c06_trkL', 'c06_tk0', 'c06_tk1', 'c06_tk2'];
  cc(4.5, {
    ...fold(VIEW6.filter((id) => id !== 'c06_stop' && id !== 'c06_stopL'), 5), c06_stop: 'quick', c06_stopL: 'quick',
    // the chip slides off to the right while the graph draws behind it
    c06_chip: { x: 2400, z: 9, at: 0.35, dur: 0.75, ease: 'power3.in' },
    ...bar([6, 7, 8], { dur: 0.9 }),
    c06_graph: { type: 'canvas', draw: 'c06_graph', z: 4, in: 'fade', dur: 0.2, at: 0.9, params: { draw: 1, nb: 0, q: 0, lasso: 0 }, paramsFrom: { draw: 0 }, pdur: 2.6, pease: 'power2.out' },
    c06_gcap: { type: 'text', versions: ['the code graph:&ensp;<span class="c-dim">functions as nodes, calls as edges</span>', `${m('get_code_neighbors', T.TEAL)}&ensp;<span class="c-dim">callers and callees</span>`, `${m('search_similar_code', T.TEAL)}&ensp;<span class="c-dim">find a symbol</span>`, `${m('get_code_subgraph', T.TEAL)}&ensp;<span class="c-dim">a set of nodes, with their edges</span>`], ver: 0, size: 44, x: VX + 40, y: 165, in: 'wipe', at: 0.9 },
    c06_gtag: { type: 'text', html: cap('concept · example names'), size: 24, color: T.DIM, align: 'right', ax: 1, x: 1840, y: 1035, in: 'fade', at: 1.2 },
  }, { cut: false });
  // 227 (2) — get_code_neighbors
  cc(2, { ...drop(VIEW6), c06_chip: null, c06_gcap: { ver: 1, dur: 0.6 }, c06_graph: { params: { draw: 1, nb: 1, q: 0, lasso: 0 }, pdur: 1.0 } }, { sfx: [{ at: 0.2, kind: 'click' }] });
  // 228 (4.5) — search_similar_code: the query tag snaps onto a node
  cc(4.5, {
    c06_gcap: { ver: 2, dur: 0.6 },
    c06_graph: { params: { draw: 1, nb: 0, q: 1, lasso: 0 }, pdur: 2.4 },
    c06_q: { type: 'box', w: 300, h: 70, x: GN[QN][1], y: GN[QN][2] - 78, stroke: T.YELLOW, fill: 'rgba(21,26,33,0.96)', rad: 35, html: m('HTTPAdapter', T.INK), size: 34, z: 8, in: 'fade', from: { s: 1.35, o: 0 }, at: 0.5, dur: 1.2, ease: 'expo.out' },
    c06_qtag: { type: 'text', html: `<span class="plate">${cap('example query')}</span>`, size: 24, color: T.DIM, x: GN[QN][1], y: GN[QN][2] - 136, in: 'fade', at: 1.6, z: 8 },
    c06_sym: { type: 'text', html: '<span class="plate">a <span class="c-yellow">symbol name</span>, not a sentence</span>', size: 56, x: 1100, y: 960, in: 'wipe', at: 1.8, z: 9 },
  }, { sfx: [{ at: 1.65, kind: 'tick' }] });
  // 229 (2.5) — reading beat: push in on "a symbol name, not a sentence"
  const pb = F.beat(2.5, { id: 'c06_sym', mode: 'push', scale: 1.22, dy: -150 });
  // the rest of the frame dims a step while the camera pushes in (the toolbar sinks out of the way)
  const dimTo = (id, o) => { pb.els[id] = Object.assign({}, pb.els[id], { o, at: 0, dur: 0.5, in: undefined, from: undefined, ease: undefined }); };
  NAMES.forEach((_, i) => dimTo('c06_t' + i, 0.12));
  dimTo('c06_graph', 0.55); dimTo('c06_gcap', 0.45); dimTo('c06_q', 0.6); dimTo('c06_qtag', 0.45); dimTo('c06_gtag', 0);
  // 230 (2) — get_code_subgraph: a lasso around three nodes keeps their edges
  cc(2, { loop: { x: RC[0], y: RC[1] - 20, s: 1, o: 0, params: RL_(), pdur: 0.2, dur: 0.2 }, ...bar([6, 7, 8], { dur: 0.5 }), c06_graph: { o: 1, dur: 0.5, params: { draw: 1, nb: 0, q: 0, lasso: 1 }, pdur: 1.2 }, c06_gtag: { o: 1, dur: 0.5 }, c06_gcap: { ver: 3, o: 1, dur: 0.6 }, c06_q: 'fade', c06_qtag: 'fade', c06_sym: 'down' }, { sfx: [{ at: 0.2, kind: 'click' }] });

  // 231 (4.5) — OVER the ring again, re-staged: the loop at the centre of the frame, the nine tiles as a
  // true ring around it; a dashed ring grows outside: "+ skills you write"
  const RT = (i) => ({ x: RING2(i)[0], y: RING2(i)[1], s: 1, o: 1, w: 310, h: 52, size: 25, rad: 12 });
  const COL = 1460; // right-hand text column
  c(4.5, {
    // the graph sinks back while the loop and the ring come forward through it
    c06_graph: { o: 0, s: 0.92, at: 0, dur: 0.8, ease: 'power2.in' }, c06_gcap: 'up', c06_gtag: 'fade',
    loop: { o: 1, at: 0.9, dur: 0.8, ease: 'power2.out' },
    ...tilesAt((i) => Object.assign(RT(i), { dur: 1.3, ease: 'expo.inOut', at: 0.1 + i * 0.04 })),
    c06_ext: { type: 'canvas', draw: 'c06_ext', z: 2, in: 'fade', dur: 0.2, at: 1.1, params: { a1: 1, a2: 0 }, paramsFrom: { a1: 0 }, pdur: 1.8, pease: 'power2.out' },
    c06_x1: { type: 'text', html: '<span class="c-teal">+ skills</span> you write', size: 46, align: 'left', ax: 0, x: COL, y: 300, in: 'wipe', at: 1.8 },
  }, { cut: true, cam: { x: 960, y: 540, s: 1 }, drift: 0.6 });
  // 232 (4.5) — a second dashed ring: "+ sub-agents you define"
  c(4.5, {
    c06_graph: null,
    c06_ext: { params: { a1: 1, a2: 1 }, pdur: 1.8 },
    c06_x2: { type: 'text', html: '<span class="c-blue">+ sub-agents</span><br>you define', size: 46, maxw: 380, align: 'left', ax: 0, x: COL, y: 760, in: 'wipe', at: 1.0 },
    c06_xtag: { type: 'text', html: cap('the fixed nine<br>stay fixed'), size: 26, color: T.DIM, align: 'left', ax: 0, x: COL, y: 920, in: 'fade', at: 1.8 },
  }, { drift: 0.6 });
  // 233 (2) — three meters beside the ring: time · tool calls · context
  const MP = { x: COL, y: 600, w: 88, h: 250, gap: 42, v0: 0.82, v1: 0.74, v2: 0.78, labels: 1, a: 1, glow: 0 };
  c(2, {
    c06_ext: 'fade', c06_x1: 'fade', c06_x2: 'fade', c06_xtag: 'fade',
    c06_met: { type: 'canvas', draw: 'meters', z: 3, in: 'fade', dur: 0.2, at: 0.25, params: { ...MP }, paramsFrom: { v0: 0, v1: 0, v2: 0 }, pdur: 1.1, pease: 'power3.out' },
  }, { drift: 0.6 });
  // 234 (4.5) — a run_command fires: all three meters drop a notch
  c(4.5, {
    c06_t0: { s: 1.08, fill: 'rgba(92,208,179,1)', at: 0.2, dur: 0.4, ease: 'power2.out' },
    c06_fire: { type: 'arrow', x1: RING2(0)[0] + 170, y1: RING2(0)[1], x2: COL + 120, y2: 320, bend: -90, color: T.TEAL, sw: 4, head: 18, flow: 1, in: 'draw', at: 0.3, dur: 0.7 },
    c06_met: { params: { ...MP, v0: 0.74, v1: 0.64, v2: 0.68, glow: 0.6 }, pdur: 1.0, at: 0.9, pease: 'power3.out' },
    c06_cost1: { type: 'text', html: 'every budgeted<br>call costs', size: 42, maxw: 360, align: 'left', ax: 0, x: COL, y: 745, in: 'wipe', at: 1.3 },
    c06_cost2: { type: 'text', html: '<span class="c-yellow">time</span>, a <span class="c-teal">tool call</span> and <span class="c-blue">context</span>', size: 50, maxw: 360, align: 'left', ax: 0, x: COL, y: 905, in: 'wipe', at: 1.8 },
  }, { drift: 0.6, sfx: [{ at: 0.25, kind: 'click' }, { at: 1.0, kind: 'tick' }] });
  // 235 (2.5) — reading beat: "time, a tool call and context" stays bright; the rest sinks to a third
  c(2.5, {
    c06_fire: 'fade',
    ...tilesAt((i) => ({ o: 0.33, dur: 0.6 })),
    c06_t0: { s: 1, fill: FILLS, o: 0.33, dur: 0.6 },
    loop: { o: 0.33, dur: 0.6 }, c06_met: { o: 0.33, dur: 0.6, params: { ...MP, v0: 0.74, v1: 0.64, v2: 0.68, glow: 0 }, pdur: 0.6 }, c06_cost1: { o: 0.33, dur: 0.6 },
    c06_cost2: { s: 1.05, dur: 1.4, ease: 'expo.out' },
  }, { drift: 0.4 });

  // 236 (2.5) + 237 (5.5) — the run_command tile itself grows forward into a terminal that fills the
  // frame; then ONE continuous eased pull-back: terminal and container A scale together about one
  // pivot (no camera jump), ending exactly on the 6→7 hand-off state.
  // final (k = 1) layout: container A as handed off, the terminal inside its /workspace area
  const T2 = { x: 960, y: 600, w: 700, h: 430 };
  const KZ = 2.2, PV = [960, (600 * KZ - 580) / (KZ - 1)];           // pivot and the start scale (terminal fills the frame)
  const atK = (x, y, k) => [PV[0] + (x - PV[0]) * k, PV[1] + (y - PV[1]) * k];
  const T2H = [T2.x - T2.w / 2 + 30, T2.y - T2.h / 2 + 36], T2P = [T2.x - T2.w / 2 + 30, T2.y - 30];
  const A0 = { x: 960, y: 560, w: 900, h: 640 };
  const cA = K.container('contA', 'A', A0);
  const PULL = { at: 0, dur: 3.65, ease: 'power2.inOut' };
  const tK = atK(T2.x, T2.y, KZ), hK = atK(...T2H, KZ), pK = atK(...T2P, KZ);
  c(2.5, {
    ...tilesAt((i) => (i === 0 ? {} : 'fade')), loop: 'fade', c06_met: 'fade', c06_cost1: 'fade', c06_cost2: 'fade',
    rail: { o: 0, at: 0.2, dur: 0.6, ease: 'power2.in' },
    c06_t0: { x: tK[0], y: tK[1], w: T2.w * KZ, h: T2.h * KZ, rad: 12 * KZ, sw: 2 * KZ, s: 1, o: 1, fill: 'rgba(21,26,33,0.97)', stroke: T.TEAL, ver: 1, z: 5, at: 0, dur: 1.0, ease: 'power3.inOut' },
    c06_tm: { type: 'box', ...T2, x: tK[0], y: tK[1], s: KZ, stroke: T.TEAL, fill: 'rgba(21,26,33,0.97)', sw: 2, rad: 12, html: '', z: 6, in: 'fade', at: 0.75, dur: 0.3 },
    c06_tmh: { type: 'text', html: `${m('run_command', T.TEAL)}&ensp;bash in ${m('/workspace')}`, size: 30, align: 'left', ax: 0, x: hK[0], y: hK[1], s: KZ, z: 7, in: 'wipe', at: 0.8, dur: 0.8 },
    c06_tmp2: { type: 'mono', versions: ['<span class="c-dim">/workspace $</span>', '<span class="c-dim">/workspace $</span> <span style="background:#ECE9E2">&nbsp;</span>'], ver: 1, size: 30, ax: 0, x: pK[0], y: pK[1], s: KZ, z: 7, in: 'wipe', at: 1.05, dur: 0.6 },
    // the camera keeps creeping in on the full-frame terminal until the pull-back starts (no static tail)
  }, { cut: true, cam: { x: 960, y: 540, s: 1 }, drift: 0.9 });
  // 237 (5.5) — the pull-back reveals /workspace inside container A; RAIL → 07
  // container A starts invisible at the zoomed scale and fades in with the pull-back (no one-frame flood)
  const fromK = (x, y) => { const q = atK(x, y, KZ); return { x: q[0], y: q[1], s: KZ, o: 0 }; };
  c(5.5, {
    c06_t0: 'quick',
    c06_tm: { y: T2.y, s: 1, ...PULL, at: 0.05 },
    c06_tmh: { x: T2H[0], y: T2H[1], s: 1, ...PULL, at: 0.05 },
    c06_tmp2: { x: T2P[0], y: T2P[1], s: 1, ...PULL, at: 0.05 },
    contA: { ...cA.contA, in: 'fade', from: fromK(A0.x, A0.y), ...PULL },
    contA_hd: { ...cA.contA_hd, in: 'fade', from: fromK(cA.contA_hd.x, cA.contA_hd.y), ...PULL },
    contA_ht: { ...cA.contA_ht, in: 'fade', from: fromK(cA.contA_ht.x, cA.contA_ht.y), ...PULL },
    c06_tmc: { type: 'text', html: '<span class="plate">the tools run <span class="c-blue">inside the sandbox</span></span>', size: 44, x: 960, y: 960, in: 'wipe', at: 2.3, dur: 1.0 },
    rail: { ver: 7, o: 1, at: 2.6, dur: 1.0, ease: 'power2.out' },
  }, { cam: { x: 960, y: 540, s: 1 }, drift: 0 });
})();
