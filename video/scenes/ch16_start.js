// Chapter 16 — Where to start (storyboard v5, 63 beats).
(function () {
  const { T } = F;
  // A string exit on an element carried unchanged makes the engine re-tween it in the previous comp
  // (its spec object is replaced); set the exit style on the existing object instead and remove it.
  const c = (beats, delta = {}, opts = {}) => {
    const prev = FILM.COMPS[FILM.COMPS.length - 1];
    for (const id in delta) if (typeof delta[id] === 'string') { if (prev && prev.els[id]) prev.els[id].out = delta[id]; delta[id] = null; }
    return F.comp(beats, delta, opts);
  };
  F.chapter(K.CH[16]);
  const D = DRAW, U = D.util, rgba = D.rgba, clamp = U.clamp, ease = U.ease;

  // ------------------------------------------------------------ chapter-local drawings
  // three eval_config dials; params sweep, a
  D.c16_dials = (ctx, p) => {
    const names = ['timeout_seconds', 'max_tool_calls', 'max_turns'];
    ctx.save(); ctx.globalAlpha *= p.a ?? 1;
    names.forEach((n, i) => {
      const x = 1300 + i * 220, y = 300;
      ctx.beginPath(); ctx.arc(x, y, 58, Math.PI * 0.75, Math.PI * 2.25); ctx.strokeStyle = rgba(T.INK, 0.8); ctx.lineWidth = 4; ctx.stroke();
      const a = Math.PI * 0.75 + (0.15 + 0.7 * (0.5 + 0.5 * Math.sin((p.sweep || 0) * Math.PI * 2 * (1 + i * 0.25) - 1.2))) * Math.PI * 1.5;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 48, y + Math.sin(a) * 48); ctx.strokeStyle = T.YELLOW; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fillStyle = T.INK; ctx.fill();
      D.text(ctx, n, x, y + 86, { mono: true, size: 24, color: T.DIM });
    });
    ctx.restore();
  };
  // failure taxonomy chart (rows) with tallies; params tally, a
  const FAILS = ['looping', 'never submitting', 'wrong file', 'patch that won’t apply', 'over-editing'];
  D.c16_fail = (ctx, p) => {
    ctx.save(); ctx.globalAlpha *= p.a ?? 1;
    FAILS.forEach((n, i) => {
      const y = 260 + i * 70;
      D.text(ctx, n, 1200, y, { size: 32, color: T.INK, align: 'left' });
      D.polyline(ctx, [[1200, y + 28], [1560, y + 28]], 1, { color: rgba(T.DIM, 0.35), w: 2 });
    });
    const k = clamp(p.tally || 0);
    if (k > 0) { ctx.save(); ctx.strokeStyle = T.RED; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(1530, 244); ctx.lineTo(1530, 244 + 34 * ease(k)); ctx.stroke(); ctx.restore(); }
    ctx.restore();
  };
  // a funnel that spins once about its vertical axis; params spin, a
  D.c16_funnel = (ctx, p) => {
    const x = 1720, y = 290, sx = Math.cos((p.spin || 0) * Math.PI * 2);
    ctx.save(); ctx.globalAlpha *= p.a ?? 1; ctx.translate(x, y); ctx.scale(0.25 + 0.75 * Math.abs(sx), 1);
    ctx.beginPath(); ctx.moveTo(-120, 0); ctx.lineTo(-20, 150); ctx.lineTo(-20, 200); ctx.lineTo(20, 200); ctx.lineTo(20, 150); ctx.lineTo(120, 0); ctx.closePath();
    ctx.fillStyle = rgba(T.PURPLE, 0.12); ctx.fill(); ctx.strokeStyle = T.PURPLE; ctx.lineWidth = 4; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, 120, 18, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    D.text(ctx, 'LORA SFT', x, y + 250, { size: 24, sans: true, caps: true, color: T.PURPLE, a: p.a ?? 1 });
  };
  // levers 7–9 as three glyphs; params k, a
  D.c16_rest = (ctx, p) => {
    const k = clamp(p.k || 0);
    ctx.save(); ctx.globalAlpha *= p.a ?? 1;
    // 7: repository bars sprout
    [120, 90, 40, 14].forEach((h, i) => { U.rr(ctx, 1210 + i * 34, 520 - h, 24, h, 4); ctx.fillStyle = T.REPO[i]; ctx.fill(); });
    [70, 100, 60].forEach((h, i) => { const hh = h * ease(clamp(k * 3 - i)); if (hh <= 0) return; U.rr(ctx, 1346 + i * 34, 520 - hh, 24, hh, 4); ctx.strokeStyle = T.INK; ctx.lineWidth = 2.5; ctx.stroke(); });
    D.text(ctx, 'MORE TASKS', 1310, 575, { size: 24, sans: true, caps: true, color: T.DIM });
    // 8: two short rulers and a judge
    [440, 500].forEach((y, i) => D.polyline(ctx, [[1520, y], [1520 + 120 * clamp(k * 2 - i * 0.4), y]], 1, { color: T.INK, w: 4 }));
    D.polyline(ctx, [[1645, 440], [1675, 470]], clamp(k * 2 - 1), { color: T.DIM, w: 3 });
    D.polyline(ctx, [[1645, 500], [1675, 470]], clamp(k * 2 - 1), { color: T.DIM, w: 3 });
    if (k > 0.6) { ctx.save(); ctx.globalAlpha *= (k - 0.6) / 0.4; U.rr(ctx, 1678, 448, 0, 0, 0); ctx.restore(); D.text(ctx, '⚖', 1700, 470, { size: 40, color: T.BLUE, a: (k - 0.6) / 0.4 }); }
    D.text(ctx, '2 ATTEMPTS + JUDGE', 1600, 575, { size: 24, sans: true, caps: true, color: T.DIM });
    ctx.restore();
  };
  // small film-object glyphs for the six questions; params a
  D.c16_icons = (ctx, p) => {
    ctx.save(); ctx.globalAlpha *= p.a ?? 1;
    const G = [[380, 362], [960, 362], [1540, 362], [380, 642], [960, 642], [1540, 642]];
    G.forEach(([x, y], i) => {
      ctx.save(); ctx.translate(x, y);
      if (i === 0) { ctx.scale(0.22, 0.22); D.loop(ctx, { cx: 0, cy: 30, r: 200, draw: 1, labels: 0, dot: -1 }); }
      if (i === 1) { [-14, 14].forEach((dy, j) => D.polyline(ctx, [[-90, dy], [j ? -10 : 90, dy]], 1, { color: T.YELLOW, w: 5 })); }
      if (i === 2) { ctx.beginPath(); ctx.moveTo(-60, -30); ctx.lineTo(-10, 30); ctx.lineTo(10, 30); ctx.lineTo(60, -30); ctx.closePath(); ctx.strokeStyle = T.PURPLE; ctx.lineWidth = 4; ctx.stroke(); }
      if (i === 3) { U.rr(ctx, -110, -16, 220, 32, 6); ctx.strokeStyle = '#3A4654'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.fillStyle = rgba(T.THINK, 0.8); ctx.fillRect(-106, -12, 60, 24); ctx.fillStyle = rgba(T.TEAL, 0.85); ctx.fillRect(-42, -12, 90, 24); }
      if (i === 4) { const N = [[-50, -10], [0, -28], [50, -8], [-20, 24], [30, 26]]; ctx.strokeStyle = rgba(T.TEAL, 0.8); ctx.lineWidth = 3; [[0, 1], [1, 2], [0, 3], [3, 4], [1, 4]].forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(...N[a]); ctx.lineTo(...N[b]); ctx.stroke(); }); N.forEach(([a, b]) => { ctx.beginPath(); ctx.arc(a, b, 9, 0, Math.PI * 2); ctx.fillStyle = T.TEAL; ctx.fill(); }); }
      if (i === 5) { for (let r = 0; r < 3; r++) for (let q = 0; q < 6; q++) { U.rr(ctx, -84 + q * 29, -36 + r * 26, 24, 20, 4); ctx.fillStyle = q === 5 ? 'rgba(0,0,0,0)' : T.REPO[r]; ctx.fill(); if (q === 5) { ctx.strokeStyle = T.INK; ctx.lineWidth = 2; ctx.stroke(); } } }
      ctx.restore();
    });
    ctx.restore();
  };

  // ------------------------------------------------------------ helpers
  const cap = (html, o = {}) => Object.assign({ type: 'text', html: `<span class="cap" style="font-size:1em">${html}</span>`, size: 26, color: T.DIM, in: 'fade' }, o);
  const tag = (html, o = {}) => cap(html, Object.assign({ color: T.YELLOW }, o));
  const txt = (html, o = {}) => Object.assign({ type: 'text', html, size: 48, in: 'wipe' }, o);
  const SPOOL = (o = {}) => Object.assign({ type: 'box', w: 220, h: 220, x: 1640, y: 850, stroke: T.GREEN, rad: 110, fill: 'rgba(131,193,103,0.10)', html: '<span class="cap" style="font-size:0.5em;color:#83C167">SFT data</span>', size: 40 }, o);
  const Y = (n) => `<span class="c-yellow">${n}</span>`;

  // ================================================================ 515 (4.5) nine lever bars, ranked
  const BX = (i) => 140 + i * 120, BH = (i) => 520 - 45 * i, BASE = 960;
  const bars = {};
  for (let i = 0; i < 9; i++) {
    bars['c16_b' + i] = { type: 'rect', x: BX(i), y: BASE, ay: 1, w: 84, h: BH(i), fill: '#56616D', rad: 6, in: 'growh', at: 0.05 + 0.12 * i, dur: 2.2, ease: 'power2.inOut' };
    bars['c16_n' + i] = { type: 'text', html: Y(i + 1), size: 40, x: BX(i), y: BASE + 42, in: 'rise', at: 0.5 + 0.1 * i };
  }
  const HEAD = [
    'nine levers, ranked by expected return',
    `${Y(1)} · local eval fidelity`,
    `${Y(2)} · budget and termination`,
    `${Y(3)} · prompt and workflow`,
    `${Y(4)} · thinking vs context`,
    `${Y(5)} · failure taxonomy&ensp;&ensp;${Y(6)} · LoRA SFT`,
    `${Y(7)} more tasks&ensp;·&ensp;${Y(8)} test-time scaling&ensp;·&ensp;${Y(9)} RL`,
  ];
  const WHY = [
    '<span class="c-dim">the roadmap’s ranking</span>',
    'one leaderboard probe a day — you need an offline copy you trust',
    'the starter config caps the score near zero — every task must end in a diff',
    'a strong single-agent prompt first, then A/B a staged <span class="m">SequentialAgent</span>',
    'lower thinking on tool turns · <span class="m">gemma4</span> parsers handle tool calls and reasoning',
    'label 50 failed runs · a rank-16 LoRA on Gemma’s own passing runs',
    'new repositories · two attempts and a judge · RL only after SFT',
  ];
  c(4.5, {
    ...K.rail(16),
    spool: SPOOL(),
    ...bars,
    c16_head: { type: 'text', versions: HEAD, ver: 0, size: 56, align: 'left', ax: 0, x: 140, y: 175, in: 'wipe', at: 0.3 },
    c16_why: { type: 'text', versions: WHY, ver: 0, size: 40, lh: 1.2, align: 'left', ax: 0, x: 140, y: 255, maxw: 1000, in: 'fade', at: 0.9 },
    c16_tag: tag('the roadmap’s hypothesis, not a result', { x: 1840, ax: 1, align: 'right', y: 130, at: 1.2 }),
  }, { clear: true, cam: { x: 960, y: 540, s: 1 }, drift: 0.5 });
  // bar emphasis helper
  const lift = (sel) => { const d = {}; for (let i = 0; i < 9; i++) d['c16_b' + i] = sel.includes(i) ? { fill: T.BLUE, y: BASE - 30, o: 1, dur: 0.8, ease: 'expo.out' } : { fill: '#56616D', y: BASE, o: 0.4, dur: 0.6 }; return d; };
  const head = (v) => ({ c16_head: { ver: v, dur: 0.6 }, c16_why: { ver: v, dur: 0.6 } });
  // reading cards
  const CARD = {
    R01: ['R01 · harness guide (60&nbsp;min)', 'most early zero scores come from harness mechanics'],
    R02: ['R02 · a participant’s local harness (30&nbsp;min)', '109/129 gold patches pass locally'],
    R05: ['R05 · start simple (25&nbsp;min)'], R06: ['R06 · explore, reproduce, fix, rerun (20&nbsp;min)'],
    R07: ['R07 · mini-swe-agent (30&nbsp;min)'], R10: ['R10 · ADK mechanics (60&nbsp;min)'],
    R09: ['R09 · context as a finite attention budget (25&nbsp;min)'], R11: ['R11 · Gemma 4 model card (30&nbsp;min)'],
  };
  const card = (k, y, at, h = 100) => ({
    type: 'box', x: 1520, y, w: 680, h, stroke: T.INK, fill: 'rgba(21,26,33,0.96)', sw: 2.5, rad: 14, size: 36, lh: 1.2, in: 'right', at, z: 4,
    html: `<div style="padding:0 26px;text-align:left">${CARD[k][0].replace(/^(R\d\d)/, '<span class="c-yellow">$1</span>')}${CARD[k][1] ? `<br><span class="c-dim" style="font-size:0.85em">${CARD[k][1]}</span>` : ''}</div>`,
  });
  const retire = (keys) => { const d = {}; keys.forEach((k) => { d['c16_' + k] = 'right'; }); return d; };

  // 516 (3.5) bar 1 lifts: the gold/null sweep replays on the grid behind it
  const G129 = { cols: 13, rows: 10, cw: 100, ch: 58, gap: 12, count: 129 };
  c(3.5, {
    ...lift([0]), ...head(1),
    spool: { x: 1800, y: 975, s: 0.5, dur: 1.2, ease: 'expo.inOut' },
    c16_grid: { type: 'canvas', draw: 'grid', x: 1520, y: 400, s: 0.46, in: 'fade', params: Object.assign({}, G129, { reveal: 1, gold: -1, dim: 0, sweep: 1.6, split: 0 }), paramsFrom: { reveal: 0, sweep: 0 }, pdur: 2.6, pease: 'power1.inOut' },
    c16_gl: txt('<span class="c-gold">gold</span> patch → should <span class="c-green">pass</span><br><span class="c-dim">null</span> patch → should <span class="c-red">fail</span>', { x: 1520, y: 640, size: 38, lh: 1.25, at: 0.8 }),
  }, { sfx: [{ at: 0.2, kind: 'tick' }] });
  // 517 (4.5) reading cards R01 · R02 slide in
  c(4.5, {
    c16_grid: { o: 0.25 }, c16_gl: 'fade',
    c16_R01: card('R01', 300, 0.3, 130), c16_R02: card('R02', 460, 0.9, 130),
    c16_rk1: cap('read for lever 1', { x: 1190, ax: 0, align: 'left', y: 205, size: 24, color: T.YELLOW, at: 0.4 }),
  });
  // 518 (4.5) bar 2: eval_config dials sweep against the 6-minute ruler
  c(4.5, {
    ...lift([1]), ...head(2), ...retire(['R01', 'R02']), c16_grid: 'fade', c16_rk1: 'fade',
    c16_dials: { type: 'canvas', draw: 'c16_dials', x: 960, y: 540, in: 'fade', params: { sweep: 1.4, a: 1 }, paramsFrom: { sweep: 0 }, pease: 'power1.inOut' },
    c16_ruler: { type: 'canvas', draw: 'ruler', x: 960, y: 540, in: 'fade', at: 0.3, blocks: [[0, 5.4, T.BLUE, 'agent loop']], params: { x: 1200, y: 560, w: 620, max: 6, ticks: 1, draw: 1, show: 1, a: 1 }, paramsFrom: { ticks: 0, draw: 0, show: 0 }, pdur: 2.2 },
    c16_rchip: { type: 'box', x: 1755, y: 470, w: 110, h: 44, stroke: T.GOLD, fill: 'rgba(240,172,95,0.15)', sw: 3, rad: 10, html: '<span class="m c-gold" style="font-size:0.7em">diff</span>', size: 30, in: 'pop', at: 2.4 },
  }, { sfx: [{ at: 2.45, kind: 'pop' }] });
  // 519 (4.5) bar 3: the LOOP lights explore → reproduce → fix → verify → submit
  const WF = ['explore', 'reproduce', 'fix', 'verify', 'submit'];
  const wfv = WF.map((_, j) => WF.map((w, i) => (i === j ? `<span class="c-yellow">${w}</span>` : `<span class="c-dim">${w}</span>`)).join(' → '));
  c(4.5, {
    ...lift([2]), ...head(3), c16_dials: 'fade', c16_ruler: 'fade', c16_rchip: 'fade',
    c16_loop: { type: 'canvas', draw: 'loop', x: 960, y: 540, in: 'fade', params: { cx: 1520, cy: 380, r: 160, draw: 1, labels: 1, ring: 0, dot: 2.6, exit: 0, hi: -1 }, paramsFrom: { draw: 0, dot: 0 }, pease: 'power1.inOut' },
    c16_wf: { type: 'text', versions: wfv, ver: 4, size: 36, x: 1520, y: 650, in: 'fade', from: { ver: 0, o: 0 }, dur: 3.0, ease: 'none', at: 0.2 },
  });
  // 520 (4.5) cards R05 · R06 · R07 · R10
  c(4.5, {
    c16_loop: 'fade', c16_wf: 'fade',
    c16_R05: card('R05', 270, 0.2), c16_R06: card('R06', 390, 0.45), c16_R07: card('R07', 510, 0.7), c16_R10: card('R10', 630, 0.95),
    c16_rk3: cap('read for lever 3', { x: 1190, ax: 0, align: 'left', y: 195, size: 24, color: T.YELLOW, at: 0.3 }),
  });
  // 521 (4.5) bar 4: three tapes (thinking levels); cards R09 · R11
  const TP = (y, th, n) => ({ type: 'canvas', draw: 'tape', x: 960, y: 540, in: 'fade', at: 0.3, params: { x: 1190, y, w: 660, h: 50, first: 1, n, sliver: 1, ticks: 0, crack: 0, think: th }, paramsFrom: { n: 0 }, pease: 'power2.inOut' });
  c(4.5, {
    ...lift([3]), ...head(4), ...retire(['R05', 'R06', 'R07', 'R10']), c16_rk3: 'fade',
    c16_t0: TP(290, 0, 7), c16_t1: TP(400, 0.3, 6), c16_t2: TP(510, 0.9, 5),
    c16_tl0: cap('thinking_level none', { x: 1190, ax: 0, align: 'left', y: 245, size: 24, at: 0.2 }),
    c16_tl1: cap('low', { x: 1190, ax: 0, align: 'left', y: 355, size: 24, at: 0.3 }),
    c16_tl2: cap('high', { x: 1190, ax: 0, align: 'left', y: 465, size: 24, at: 0.4 }),
    c16_rk4: cap('read for lever 4', { x: 1190, ax: 0, align: 'left', y: 590, size: 24, color: T.YELLOW, at: 1.1 }),
    c16_R09: card('R09', 660, 1.3, 90), c16_R11: card('R11', 760, 1.6, 90),
  });
  // 522 (4.5) bars 5 and 6: the failure chart gains its first tally; the funnel spins once
  c(4.5, {
    ...lift([4, 5]), ...head(5), ...retire(['R09', 'R11']), c16_rk4: 'fade', c16_t0: 'fade', c16_t1: 'fade', c16_t2: 'fade', c16_tl0: 'fade', c16_tl1: 'fade', c16_tl2: 'fade',
    c16_fail: { type: 'canvas', draw: 'c16_fail', x: 960, y: 540, in: 'fade', at: 0.35, params: { tally: 1, a: 1 }, paramsFrom: { tally: 0 }, pdur: 0.6, pease: 'power2.out' },
    c16_funnel: { type: 'canvas', draw: 'c16_funnel', x: 960, y: 540, in: 'fade', at: 0.4, params: { spin: 1, a: 1 }, paramsFrom: { spin: 0 }, pdur: 2.4, pease: 'power2.inOut' },
  }, { sfx: [{ at: 0.7, kind: 'tick' }] });
  // 523 (3.5) bars 7, 8, 9: new repository bars · two short rulers and a judge · a tall dim RL bar
  c(3.5, {
    ...lift([6, 7, 8]), ...head(6), c16_fail: 'fade', c16_funnel: 'fade',
    c16_rest: { type: 'canvas', draw: 'c16_rest', x: 960, y: 540, in: 'fade', at: 0.35, params: { k: 1, a: 1 }, paramsFrom: { k: 0 }, pdur: 1.8, pease: 'power2.out' },
    c16_rl: { type: 'rect', x: 1800, y: 520, ay: 1, w: 60, h: 330, fill: 'rgba(154,163,173,0.28)', rad: 6, in: 'growh', at: 0.6, dur: 1.4 },
    c16_rlL: cap('RL · only after SFT', { x: 1860, ax: 1, align: 'right', y: 625, size: 24, at: 1.0 }),
  });
  // 524 (4.5) all reading cards gather into one pile
  const barsOut = {};
  for (let i = 0; i < 9; i++) { barsOut['c16_b' + i] = 'fade'; barsOut['c16_n' + i] = 'fade'; }
  const pile = {};
  const PK = ['R01', 'R02', 'R05', 'R06', 'R07', 'R10', 'R09', 'R11'];
  PK.forEach((k, i) => { pile['c16_P' + k] = Object.assign(card(k, 430 + (i - 3.5) * 12, 0.1 + 0.07 * i, 120), { x: 960 + (i - 3.5) * 12, s: 0.9, r: (i - 3.5) * 1.2, in: i % 2 ? 'right' : 'left', dur: 0.9, ease: 'expo.out', z: 4 + i }); });
  c(4.5, {
    ...barsOut, ...pile, c16_head: 'up', c16_why: 'up', c16_rest: 'fade', c16_rl: 'fade', c16_rlL: 'fade', spool: 'fade',
    c16_pl: txt(`the read-first tier: ${Y(11)} readings · ${Y('≈7')} hours`, { x: 960, y: 760, size: 60, at: 0.9 }),
    c16_pl2: cap('R01–R11 in the roadmap', { x: 960, y: 840, size: 28, at: 1.4 }),
  });
  // 525 (4.5) the calendar returns: week 1 · week 2
  const cx = (d) => D.calX({ x: 210, w: 1500 }, d);
  const U_ = (m, d) => Date.UTC(2026, m - 1, d);
  const CALY = 600;
  const flag = (id, d, y1, html, at, below = false) => ({
    [id]: { type: 'rect', x: cx(d), y: below ? CALY : y1, ay: below ? 0 : 0, w: 3, h: below ? y1 - CALY : CALY - y1, fill: T.INK, in: 'growh', at, rad: 2 },
    [id + 'L']: txt(html, { x: cx(d) + 14, ax: 0, align: 'left', y: below ? y1 + 22 : y1, size: 40, at: at + 0.3 }),
  });
  const cardsOut = {};
  PK.forEach((k) => { cardsOut['c16_P' + k] = { x: cx(U_(9, 24)), y: CALY, s: 0.05, o: 0, dur: 0.9, ease: 'power3.in' }; });
  c(4.5, {
    ...cardsOut, c16_pl: 'fade', c16_pl2: 'fade', c16_tag: 'fade',
    calendar: { type: 'canvas', draw: 'calendar', x: 960, y: 540, in: 'fade', spans: [[U_(9, 24), U_(10, 1), T.BLUE, 0.3], [U_(10, 1), U_(10, 8), T.BLUE, 0.3], [U_(10, 15), U_(10, 22), T.PURPLE, 0.35], [U_(11, 12), U_(11, 13), T.RED, 0.6]], params: { x: 210, y: CALY, w: 1500, draw: 1, dot: -1, span0: 1, span1: 1, span2: 0, span3: 0 }, paramsFrom: { draw: 0, span0: 0, span1: 0 }, pdur: 2.2 },
    c16_sug: tag('the roadmap’s suggestion', { x: 960, y: 190, size: 30, at: 0.3 }),
    ...flag('c16_f1', U_(9, 27), 330, 'week 1 · <span class="c-blue">first non-zero score</span>', 1.2),
    ...flag('c16_f2', U_(10, 4), 450, 'week 2 · pick the scaffold', 1.8),
  }, { cut: true });
  // 526 (4.5) week 4 · 12 Nov paper due
  c(4.5, {
    c16_cal: null,
    calendar: { params: { x: 210, y: CALY, w: 1500, draw: 1, dot: -1, span0: 1, span1: 1, span2: 1, span3: 1 }, pdur: 2.0 },
    ...flag('c16_f4', U_(10, 18), 760, 'week 4 · <span class="c-purple">LoRA</span> beats prompt-only on the held-out repo', 0.3, true),
    ...flag('c16_fp', U_(11, 12), 330, '12 Nov · <span class="c-red">paper due</span>', 1.3),
  });
  // 527 (4.5) FULL: the paper track
  const calOut = {};
  ['c16_f1', 'c16_f2', 'c16_f4'].forEach((k) => { calOut[k] = 'fade'; calOut[k + 'L'] = 'fade'; });
  c(4.5, {
    ...calOut, calendar: 'fade', c16_sug: 'fade', c16_fp: 'fade',
    c16_fpL: { x: 960, y: 330, ax: 0.5, align: 'center', s: 0.8, o: 0, dur: 0.7, ease: 'power3.in' },
    c16_pt: txt('The paper track', { x: 960, y: 460, size: 120, at: 0.4 }),
    c16_ptk: cap('deadline 12 Nov · a separate track', { x: 960, y: 340, size: 30, at: 0.7 }),
    c16_ptl: txt('your experiment log is the evidence', { x: 960, y: 620, size: 56, color: T.DIM, at: 1.4 }),
  }, { cut: true });
  // 528 (2) six questions fall into a 3 × 2 grid, each over its film object
  const QS = [['Q1', 'loop vs staged'], ['Q2', 'depth vs breadth'], ['Q3', 'self-distillation'], ['Q4', 'thinking vs observation'], ['Q5', 'graph tools'], ['Q6', 'memorisation vs skill']];
  const QP = [[380, 400], [960, 400], [1540, 400], [380, 680], [960, 680], [1540, 680]];
  const qs = {};
  QS.forEach(([q, n], i) => {
    qs['c16_qb' + i] = { type: 'box', x: QP[i][0], y: QP[i][1], w: 540, h: 240, stroke: '#3A4654', fill: 'rgba(21,26,33,0.85)', sw: 2.5, rad: 18, html: '', in: 'down', at: 0.06 * i };
    qs['c16_q' + i] = { type: 'text', html: `${Y(q)} · ${n}`, size: 38, ax: 0, align: 'left', x: QP[i][0] - 240, y: QP[i][1] + 62, in: 'down', at: 0.06 * i + 0.05, z: 3 };
  });
  c(2, {
    c16_fpL: null, c16_pt: 'up', c16_ptk: 'fade', c16_ptl: 'up',
    ...qs,
    c16_icons: { type: 'canvas', draw: 'c16_icons', x: 960, y: 540, in: 'fade', at: 0.5, dur: 0.6, params: { a: 1 }, z: 3 },
    c16_qk: tag('the roadmap’s research questions · hypotheses', { x: 960, y: 190, size: 28, at: 0.3 }),
  }, { cut: true, sfx: [{ at: 0.3, kind: 'click' }] });
  // 529 (2.5) the questions dock onto the full bundle TREE, each beside the file you would change to test it
  const TS = 44, TY = 560, LH = TS * 1.55, TOP = TY - (8 * LH + 0.3 * TS) / 2;
  const lineY = (i) => TOP + LH * 1.5 + 0.3 * TS + LH * i; // i = 0 agent.yaml … 6 eval_config.yaml; -1 = submission/
  // Q1 agent.yaml (loop vs staged) · Q2 eval_config.yaml (the hard time cap) · Q3 adapters (self-distillation)
  // Q4 configs/sampling.yaml (thinking level) · Q5 skills (a code-graph tool) · Q6 adapters (memorisation vs skill)
  const DOCK = [[0, 0], [6, 0], [5, 0], [2, 0], [4, 0], [5, 1]];
  const QX = 1000;
  const dock = {};
  // the cards fold away and each question slides in along its own row (no question crosses another)
  QS.forEach(([q, n], i) => { dock['c16_q' + i] = 'shrink'; dock['c16_qb' + i] = 'shrink'; dock['c16_d' + i] = { type: 'text', html: `${Y(q)} · ${n}`, x: QX + DOCK[i][1] * 420, ax: 0, align: 'left', y: lineY(DOCK[i][0]), size: 36, in: 'right', at: 0.25 + 0.12 * i, z: 3 }; });
  const arrows = {};
  [0, 2, 4, 5, 6].forEach((r, k) => { arrows['c16_ar' + r] = { type: 'arrow', x1: QX - 24, y1: lineY(r), x2: 880, y2: lineY(r), color: T.YELLOW, sw: 3, head: 14, in: 'draw', at: 0.9 + 0.08 * k, dur: 0.6 }; });
  c(2.5, {
    c16_icons: 'quick',
    ...K.tree('tree', { x: 140, y: TY, size: TS, el: { in: 'fade', dur: 0.6, at: 0.45 } }),
    ...dock, ...arrows,
    c16_qk: { y: 200 },
  }, { sfx: [{ at: 1.0, kind: 'tick' }] });
  // (2) the chip lifts out of the tree; the RAIL rewrites to 17
  const qOut = { c16_qk: 'fade' };
  QS.forEach((_, i) => { qOut['c16_d' + i] = 'right'; });
  Object.keys(arrows).forEach((k) => { qOut[k] = 'fade'; });
  c(2, {
    ...qOut,
    tree: { x: 50, s: 0.6, o: 0.45, dur: 1.0, ease: 'expo.inOut' },
    ...K.chip('chip', { x: 960, y: 540, s: 1.6, at: 0.1, from: { x: 560, y: lineY(-1), s: 0.42, o: 1 }, dur: 1.3, ease: 'expo.inOut', in: 'fade' }),
    rail: { ver: 17, at: 0.4 },
  }, { cam: { x: 960, y: 540, s: 1 }, drift: 0, sfx: [{ at: 0.1, kind: 'pop' }] });
})();
