// Chapter 14 — Prompt, skills and sub-agents (storyboard v5, 112 beats).
(function () {
  const { T } = F;
  // A string exit on an element carried unchanged makes the engine re-tween it in the previous comp
  // (its spec object is replaced); set the exit style on the existing object instead and remove it.
  const c = (beats, delta = {}, opts = {}) => {
    const prev = FILM.COMPS[FILM.COMPS.length - 1];
    for (const id in delta) if (typeof delta[id] === 'string') { if (prev && prev.els[id]) prev.els[id].out = delta[id]; delta[id] = null; }
    return F.comp(beats, delta, opts);
  };
  F.chapter(K.CH[14]);
  const D = DRAW, U = D.util, rgba = D.rgba;

  // ------------------------------------------------------------ chapter-local drawings
  D.c14_pulse = (ctx, p, sp) => {
    const a = (0.5 - 0.5 * Math.cos(2 * Math.PI * (p.ph || 0))) * (p.a ?? 1);
    if (a < 0.002) return;
    ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = sp.pcol || T.BLUE; ctx.lineWidth = 6;
    ctx.shadowColor = sp.pcol || T.BLUE; ctx.shadowBlur = 26;
    U.rr(ctx, p.x - p.w / 2 - 10, p.y - p.h / 2 - 10, p.w + 20, p.h + 20, p.rad ?? 24); ctx.stroke(); ctx.restore();
  };
  // a small code graph; params snap 0..1 (query line to HTTPAdapter), a
  const GN = [['Session', -250, -30], ['HTTPAdapter', 70, -70], ['send()', 300, 20], ['Response', -110, 80], ['get()', 180, 110]];
  const GE = [[0, 1], [1, 2], [0, 3], [1, 4], [3, 4], [2, 4]];
  D.c14_graph = (ctx, p) => {
    const cx = 1420, cy = 520;
    ctx.save(); ctx.globalAlpha *= p.a ?? 1;
    ctx.strokeStyle = rgba(T.DIM, 0.6); ctx.lineWidth = 2.5;
    GE.forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(cx + GN[a][1], cy + GN[a][2]); ctx.lineTo(cx + GN[b][1], cy + GN[b][2]); ctx.stroke(); });
    GN.forEach(([n, dx, dy], i) => {
      const hi = i === 1 ? U.clamp(p.snap || 0) : 0;
      const w = n.length * 15 + 40;
      ctx.save(); U.rr(ctx, cx + dx - w / 2, cy + dy - 24, w, 48, 24);
      ctx.fillStyle = hi > 0 ? rgba(T.TEAL, 0.12 + 0.3 * hi) : T.PANEL; ctx.fill();
      ctx.strokeStyle = rgba(T.TEAL, 0.5 + 0.5 * hi); ctx.lineWidth = 2.5 + 2 * hi; ctx.stroke(); ctx.restore();
      D.text(ctx, n, cx + dx, cy + dy + 1, { mono: true, size: 26, color: T.INK });
    });
    if ((p.snap || 0) > 0) D.polyline(ctx, [[cx, 395], [cx + 70, cy - 96]], p.snap, { color: T.TEAL, w: 4 });
    ctx.restore();
  };
  // the tool ring: nine fixed tools around "call a tool", plus a dashed skills tile (add 0..1)
  const TOOLS = ['run_command', 'read_file', 'edit_file', 'write_file', 'get_status', 'submit_patch', 'get_code_neighbors', 'search_similar_code', 'get_code_subgraph'];
  D.c14_ring = (ctx, p) => {
    const cx = p.cx ?? 960, cy = p.cy ?? 520, rx = 640, ry = 320, add = U.clamp(p.add || 0), N = 9 + add;
    ctx.save(); ctx.globalAlpha *= p.a ?? 1;
    const k = U.clamp(p.draw ?? 1);
    ctx.save(); U.rr(ctx, cx - 140, cy - 46, 280, 92, 46); ctx.fillStyle = rgba(T.TEAL, 0.14); ctx.fill(); ctx.strokeStyle = T.TEAL; ctx.lineWidth = 3.5; ctx.stroke(); ctx.restore();
    D.text(ctx, 'call a tool', cx, cy + 2, { size: 38, color: T.INK });
    const tile = (ang, label, a, dashed, slide = 0) => {
      const x = cx + Math.cos(ang) * rx + slide, y = cy + Math.sin(ang) * ry, w = label.length * 15.6 + 44;
      ctx.save(); ctx.globalAlpha *= a;
      D.polyline(ctx, [[cx + Math.cos(ang) * 150, cy + Math.sin(ang) * 52], [x - Math.cos(ang) * w * 0.45, y - Math.sin(ang) * 30]], 1, { color: rgba(T.TEAL, 0.25), w: 2 });
      U.rr(ctx, x - w / 2, y - 30, w, 60, 14); ctx.fillStyle = rgba(T.TEAL, dashed ? 0.04 : 0.12); ctx.fill();
      if (dashed) ctx.setLineDash([10, 8]);
      ctx.strokeStyle = dashed ? T.GOLD : T.TEAL; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
      D.text(ctx, label, x, y + 1, { mono: true, size: 26, color: dashed ? T.GOLD : T.INK, a });
    };
    for (let i = 0; i < 9; i++) tile(-Math.PI / 2 + (i / N) * Math.PI * 2, TOOLS[i], U.clamp(k * 9 - i));
    if (add > 0) tile(-Math.PI / 2 + (9 / N) * Math.PI * 2, 'skills/<name>', add, true, (1 - U.ease(add)) * 420);
    ctx.restore();
  };

  // ------------------------------------------------------------ helpers
  const cap = (html, o = {}) => Object.assign({ type: 'text', html: `<span class="cap" style="font-size:1em">${html}</span>`, size: 26, color: T.DIM, in: 'fade' }, o);
  const tag = (html, o = {}) => cap(html, Object.assign({ color: T.YELLOW }, o));
  const txt = (html, o = {}) => Object.assign({ type: 'text', html, size: 48, in: 'wipe' }, o);
  const LOOP = (o = {}) => Object.assign({ cx: 420, cy: 540, r: 170, draw: 1, labels: 1, ring: 0, dot: -1, exit: 0, hi: -1 }, o);

  // ================================================================ 467 (4.5) the prompt is yours
  c(4.5, {
    ...K.rail(14),
    // the dot keeps running forward round the LOOP the whole comp; the sentences wait for the old frame to
    // clear and the camera to settle back to 1:1, then enter into the empty right half (never across the LOOP)
    loop: { type: 'canvas', draw: 'loop', x: 960, y: 540, in: 'fade', params: LOOP({ dot: 3.4 }), paramsFrom: { dot: 1.5 }, pease: 'none' },
    c14_s1: txt('The <span class="c-teal">tool descriptions</span> are fixed.', { x: 1230, y: 460, size: 72, in: 'right', at: 0.75 }),
    c14_s2: txt('The <span class="c-blue">prompt</span> is yours.', { x: 1230, y: 610, size: 72, in: 'rise', at: 1.65 }),
  }, { clear: true, keep: ['loop'], cam: { x: 960, y: 540, s: 1 }, drift: 0 });

  // ================================================================ 468–480 the page and the dashboard
  const PX = 180, PY0 = 310, PDY = 84;
  const PL = [
    '1 · the issue', '2 · workflow', '3 · read only what you need', '4 · copy <span class="m">old_string</span> exactly',
    '5 · search by symbol name', '6 · scratch in <span class="m">/tmp</span>', '7 · watch <span class="m">get_status</span>', '8 · finish cleanly',
  ];
  const pline = (i, at = 0.2) => ({ ['c14_p' + i]: txt(PL[i], { x: PX, ax: 0, align: 'left', y: PY0 + PDY * i, size: 42, at, z: 3 }) });
  const hl = (i, o = {}) => ({ c14_hl: Object.assign({ type: 'rect', x: 520, y: PY0 + PDY * i, w: 720, h: 66, fill: 'rgba(244,211,94,0.10)', rad: 10, in: 'grow', dur: 0.6, z: 2 }, o) });
  c(4.5, {
    loop: 'left', c14_s1: 'up', c14_s2: 'up',
    c14_page: { type: 'box', x: 520, y: 580, w: 760, h: 820, stroke: '#3A4654', fill: 'rgba(21,26,33,0.96)', sw: 2.5, rad: 18, html: '', in: 'draw', at: 0.2 },
    c14_pname: { type: 'text', html: '<span class="m" style="color:#F0AC5F">prompts/system.md</span>', size: 34, x: 180, ax: 0, align: 'left', y: 222, in: 'fade', at: 0.7, z: 3 },
    c14_ptag: tag('suggested structure', { x: 860, ax: 1, align: 'right', y: 222, size: 24, at: 1.0, z: 3 }),
    c14_prule: { type: 'rect', x: 520, y: 260, w: 700, h: 2, fill: '#3A4654', in: 'grow', at: 0.9, z: 3 },
    c14_intro: txt('each section, shown by its effect', { x: 1420, y: 540, size: 52, color: T.DIM, at: 1.4 }),
  }, { cut: true });
  // 469 (2) the dashboard at right, reset
  const DX = 1420;
  c(2, {
    c14_intro: 'fade',
    c14_dash: { type: 'box', x: DX, y: 520, w: 860, h: 700, stroke: '#3A4654', fill: 'rgba(21,26,33,0.7)', sw: 2.5, rad: 18, html: '', in: 'draw', dur: 0.8 },
    c14_dashL: cap('the run', { x: 1010, ax: 0, align: 'left', y: 205, size: 24, at: 0.4 }),
    c14_islot: { type: 'box', x: DX, y: 280, w: 800, h: 76, stroke: '#2A323C', fill: 'rgba(0,0,0,0)', sw: 2, rad: 12, html: '', in: 'draw', at: 0.3 },
    c14_tape: { type: 'canvas', draw: 'tape', x: 960, y: 540, in: 'fade', at: 0.4, params: { x: 1010, y: 720, w: 820, h: 56, first: 1, n: 0, sliver: 1, ticks: 0, crack: 0, short: 0 }, paramsFrom: { first: 0 }, pdur: 1.0 },
    c14_tapeL: cap('context', { x: 1010, ax: 0, align: 'left', y: 673, size: 24, at: 0.5 }),
    c14_ttrack: { type: 'rect', ax: 0, x: 1010, y: 815, w: 820, h: 14, fill: '#2A323C', rad: 7, in: 'grow', at: 0.5 },
    c14_tfill: { type: 'rect', ax: 0, x: 1010, y: 815, w: 30, h: 14, fill: T.YELLOW, rad: 7, in: 'grow', at: 0.6 },
    c14_timeL: cap('time', { x: 1010, ax: 0, align: 'left', y: 785, size: 24, at: 0.6 }),
  });
  // captions under the dashboard
  const CAP = [
    '<span class="m hl c-gold">{problem_description}</span> — the issue, filled from session state',
    'explore → reproduce → fix → rerun → think about edge cases',
    'read only the lines you need',
    'copy <span class="m">old_string</span> exactly',
    'search by symbol name',
    'scratch in <span class="m">/tmp</span> · don’t touch <span class="m">pytest.ini</span> or <span class="m">conftest.py</span> · don’t edit tests',
    'check <span class="m c-teal">get_status</span> (free) and submit before the budget runs out',
    'finish: <span class="m">git status</span>, then <span class="m c-gold">submit_patch</span> <span class="cap c-yellow" style="font-size:0.5em">suggested</span>',
  ];
  // 470 (3) section 1: the issue
  c(3, {
    ...pline(0), ...hl(0, { at: 0.1 }),
    c14_cap: { type: 'text', versions: CAP, ver: 0, size: 42, maxw: 900, lh: 1.25, x: DX, y: 945, in: 'wipe', at: 0.6 },
  });
  // 471 (2) the issue card lands in the dashboard
  c(2, {
    c14_issue: { type: 'mono', html: 'summarize([]) raises ZeroDivisionError', size: 32, x: DX, y: 280, in: 'down', z: 4 },
    c14_itag: tag('illustrative', { x: 1830, ax: 1, align: 'right', y: 205, size: 24, at: 0.3 }),
    c14_islot: { stroke: T.INK, at: 0.3 },
  }, { sfx: [{ at: 0.4, kind: 'tick' }] });
  // 472 (4.5) section 2: workflow
  c(4.5, { ...pline(1), c14_hl: { y: PY0 + PDY, dur: 0.6 }, c14_cap: { ver: 1, dur: 0.7 } });
  // 473 (2) the log replays in that order
  const LOG = [['grep', T.TEAL], ['read_file', T.TEAL], ['repro → fails', T.RED], ['edit_file', T.GOLD], ['repro → passes', T.GREEN], ['tests pass', T.GREEN]];
  const log = {};
  LOG.forEach(([s, col], i) => { log['c14_log' + i] = { type: 'mono', html: `<span style="color:${col}">${s}</span>`, size: 32, x: i < 3 ? 1040 : 1440, ax: 0, align: 'left', y: 400 + (i % 3) * 70, in: 'left', at: 0.08 + 0.17 * i }; });
  c(2, { ...log, c14_tfill: { w: 300, dur: 1.3, ease: 'power2.inOut' } }, { sfx: LOG.map((_, i) => ({ at: 0.1 + 0.17 * i, kind: 'click' })) });
  // 474 (2 + 2.5) section 3: read only the lines you need
  const dimLog = {};
  LOG.forEach((_, i) => { dimLog['c14_log' + i] = { o: 0.0 }; });
  c(2, {
    ...pline(2), c14_hl: { y: PY0 + PDY * 2 }, c14_cap: { ver: 2 }, ...dimLog,
    c14_tape: { params: { x: 1010, y: 720, w: 820, h: 56, first: 1, n: 1, sliver: 1, ticks: 0, crack: 0, short: 0 }, pdur: 1.0, pease: 'power3.out' },
    c14_tlab: { type: 'text', versions: ['<span class="c-dim">careless run · call 1:</span> <span class="m">read_file</span> of a whole file', '<span class="c-dim">with the prompt:</span> only the lines it needs'], ver: 0, size: 40, x: DX, y: 480, in: 'wipe', at: 0.3 },
  });
  c(2.5, {
    c14_tape: { params: { x: 1010, y: 720, w: 820, h: 56, first: 1, n: 1, sliver: 1, ticks: 0, crack: 0, short: 1 }, pdur: 1.2, pease: 'power3.inOut' },
    c14_tlab: { ver: 1, dur: 0.6, at: 0.2 },
  });
  // 475 (4.5) section 4: copy old_string exactly
  c(4.5, {
    ...pline(3), c14_hl: { y: PY0 + PDY * 3 }, c14_cap: { ver: 3 }, c14_tlab: 'fade',
    c14_ed1: { type: 'mono', html: '<span class="c-teal">edit_file</span> old_string=<span class="c-dim">"return total/len(xs)"</span>\n<span class="c-red">→ error: 0 matches</span>', size: 30, lh: 1.5, x: 1030, ax: 0, align: 'left', y: 420, in: 'wipe', at: 0.2 },
    c14_ed2: { type: 'mono', html: '<span class="c-teal">edit_file</span> old_string=<span class="c-ink">"return total / len(xs)"</span>\n<span class="c-green">→ applied</span>', size: 30, lh: 1.5, x: 1030, ax: 0, align: 'left', y: 570, in: 'wipe', at: 1.8 },
  }, { sfx: [{ at: 0.9, kind: 'tick' }, { at: 2.4, kind: 'click' }] });
  // 476 (4.5) section 5: search by symbol name
  c(4.5, {
    ...pline(4), c14_hl: { y: PY0 + PDY * 4 }, c14_cap: { ver: 4 }, c14_ed1: 'fade', c14_ed2: 'fade',
    c14_q: { type: 'mono', versions: ['<span class="c-teal">search_similar_code</span>("<span class="c-ink">HTTPAdapter</span>")', '<span class="c-teal">search_similar_code</span>("<span class="c-dim">class that sends HTTP requests</span>")'], ver: 0, size: 28, x: DX, y: 370, in: 'wipe', at: 0.2 },
    c14_qtag: tag('example', { x: 1830, ax: 1, align: 'right', y: 640, size: 24, at: 0.6 }),
    c14_graph: { type: 'canvas', draw: 'c14_graph', x: 960, y: 540, in: 'fade', at: 0.4, params: { snap: 1, a: 1 }, paramsFrom: { snap: 0 }, pdur: 1.4, pease: 'expo.inOut' },
  }, { sfx: [{ at: 1.5, kind: 'tick' }] });
  // 477 (2) the sentence version finds nothing
  c(2, {
    c14_q: { ver: 1, dur: 0.5 },
    c14_graph: { params: { snap: 0, a: 0.5 }, pdur: 0.6 },
    c14_nm: { type: 'text', html: '<span class="c-red">→ no match</span>', size: 44, x: DX, y: 600, in: 'pop', at: 0.6, z: 4 },
  }, { sfx: [{ at: 0.6, kind: 'tick' }] });
  // 478 (4.5) section 6: scratch in /tmp
  c(4.5, {
    ...pline(5), c14_hl: { y: PY0 + PDY * 5 }, c14_cap: { ver: 5 }, c14_q: 'fade', c14_graph: 'fade', c14_nm: 'fade', c14_qtag: 'fade',
    c14_ws: { type: 'box', x: 1200, y: 500, w: 380, h: 270, stroke: T.BLUE, fill: 'rgba(88,196,221,0.05)', sw: 3, rad: 18, html: '', in: 'draw', at: 0.1 },
    c14_wsL: { type: 'text', html: '<span class="m c-blue">/workspace</span>', size: 32, x: 1200, y: 395, in: 'fade', at: 0.3 },
    c14_lock: { type: 'mono', html: '<span class="c-dim">pytest.ini\nconftest.py\ntests/</span>', size: 28, lh: 1.4, x: 1200, y: 520, in: 'fade', at: 0.4 },
    c14_tmp: { type: 'box', x: 1650, y: 500, w: 300, h: 270, stroke: T.DIM, fill: 'rgba(154,163,173,0.05)', sw: 3, rad: 18, html: '', in: 'draw', at: 0.2 },
    c14_tmpL: { type: 'text', html: '<span class="m c-dim">/tmp</span>', size: 32, x: 1650, y: 395, in: 'fade', at: 0.4 },
    c14_notes: { type: 'box', x: 1650, y: 520, w: 220, h: 56, stroke: T.INK, fill: 'rgba(21,26,33,0.95)', sw: 2.5, rad: 10, html: '<span class="m">notes.txt</span>', size: 28, in: 'fade', from: { x: 1200, y: 610, o: 1 }, dur: 1.4, ease: 'expo.inOut', at: 1.2, z: 4 },
  }, { sfx: [{ at: 2.3, kind: 'tick' }] });
  // 479 (4.5) section 7: get_status, then submit in time
  c(4.5, {
    ...pline(6), c14_hl: { y: PY0 + PDY * 6 }, c14_cap: { ver: 6 },
    c14_ws: 'fade', c14_wsL: 'fade', c14_lock: 'fade', c14_tmp: 'fade', c14_tmpL: 'fade', c14_notes: 'fade',
    c14_gs: { type: 'mono', html: '<span class="c-teal">get_status()</span>&ensp;<span class="c-dim">→ budget left, patch status</span>', size: 30, x: DX, y: 420, in: 'wipe', at: 0.2 },
    c14_ping: { type: 'canvas', draw: 'c14_pulse', pcol: T.TEAL, x: 960, y: 540, in: 'none', at: 0.3, params: { x: DX, y: 420, w: 760, h: 64, ph: 2, a: 1, rad: 16 }, paramsFrom: { ph: 0 }, pdur: 1.8, pease: 'none' },
    c14_tfill: { w: 520, dur: 1.6, ease: 'power2.inOut', at: 0.4 },
    c14_room: cap('room left', { x: 1830, ax: 1, align: 'right', y: 785, size: 24, color: T.YELLOW, at: 1.4 }),
    c14_subm: { type: 'mono', html: '<span class="c-gold">submit_patch()</span>', size: 40, x: DX, y: 560, in: 'pop', at: 2.3 },
  }, { sfx: [{ at: 0.4, kind: 'tick' }, { at: 2.35, kind: 'pop' }] });
  // 480 (4.5) section 8 (suggested): finish cleanly — the one-file chip forms
  c(4.5, {
    ...pline(7), c14_hl: { y: PY0 + PDY * 7 }, c14_cap: { ver: 7 },
    c14_gs: 'fade', c14_ping: null, c14_room: 'fade', c14_subm: 'fade',
    c14_git: { type: 'mono', html: '<span class="c-dim">$ git status</span>&ensp;→&ensp;1 file changed', size: 32, x: DX, y: 410, in: 'wipe', at: 0.2 },
    ...K.chip('c14_chip', { x: DX, y: 540, s: 1.2, at: 1.3 }),
  }, { sfx: [{ at: 1.35, kind: 'pop' }] });
  // 481 (4.5) the page shrinks beside the held-out bars
  const dashOut = {};
  ['c14_dash', 'c14_dashL', 'c14_islot', 'c14_issue', 'c14_itag', 'c14_tape', 'c14_tapeL', 'c14_ttrack', 'c14_tfill', 'c14_timeL', 'c14_git', 'c14_chip', 'c14_cap'].forEach((k) => { dashOut[k] = 'right'; });
  LOG.forEach((_, i) => { dashOut['c14_log' + i] = null; });
  const PS = 0.62, POX = 380, POY = 560;
  const pmap = (x, y) => [POX + (x - 520) * PS, POY + (y - 580) * PS];
  const shrink = { c14_hl: 'fade' };
  shrink.c14_page = { x: POX, y: POY, s: PS, dur: 1.1, ease: 'expo.inOut' };
  [['c14_pname', PX, 222], ['c14_prule', 520, 260], ['c14_ptag', 860, 222]].forEach(([id, x, y]) => { const [nx, ny] = pmap(x, y); shrink[id] = { x: nx, y: ny, s: PS, dur: 1.1, ease: 'expo.inOut' }; });
  for (let i = 0; i < 8; i++) { const [nx, ny] = pmap(PX, PY0 + PDY * i); shrink['c14_p' + i] = { x: nx, y: ny, s: PS, dur: 1.1, ease: 'expo.inOut' }; }
  c(4.5, {
    ...dashOut, ...shrink,
    c14_meas: txt('<span class="cap c-yellow" style="font-size:0.55em">suggested</span><br>change one section at a time,<br>measure every change', { x: 1260, y: 260, size: 54, lh: 1.2, at: 0.9 }),
    c14_hoL: cap('held-out repository', { x: 1260, y: 470, size: 26, at: 1.2 }),
    c14_b1: { type: 'box', x: 1080, y: 690, w: 200, h: 300, stroke: T.DIM, fill: 'rgba(0,0,0,0)', sw: 3, rad: 10, html: '<span class="c-dim">?</span>', size: 80, in: 'draw', at: 1.3 },
    c14_b2: { type: 'box', x: 1440, y: 690, w: 200, h: 300, stroke: T.DIM, fill: 'rgba(0,0,0,0)', sw: 3, rad: 10, html: '<span class="c-dim">?</span>', size: 80, in: 'draw', at: 1.5 },
    c14_b1L: txt('before', { x: 1080, y: 885, size: 40, color: T.DIM, at: 1.7 }),
    c14_b2L: txt('after one change', { x: 1440, y: 885, size: 40, color: T.DIM, at: 1.9 }),
    c14_bTag: tag('your measurement', { x: 1260, y: 960, size: 26, at: 2.1 }),
  });

  // ================================================================ 482–489 skills
  const pageOut = {};
  ['c14_page', 'c14_pname', 'c14_prule', 'c14_ptag', 'c14_meas', 'c14_hoL', 'c14_b1', 'c14_b2', 'c14_b1L', 'c14_b2L', 'c14_bTag'].forEach((k) => { pageOut[k] = 'fade'; });
  for (let i = 0; i < 8; i++) pageOut['c14_p' + i] = 'shrink';
  c(4.5, {
    ...pageOut,
    c14_ring: { type: 'canvas', draw: 'c14_ring', x: 960, y: 540, in: 'fade', params: { cx: 960, cy: 500, add: 1, a: 1, draw: 1 }, paramsFrom: { add: 0, draw: 0 }, pdur: 3.2, pease: 'power2.inOut' },
    c14_rcap: txt('<span class="m c-gold">skills/&lt;name&gt;/SKILL.md</span> + scripts', { x: 960, y: 960, size: 52, at: 2.0 }),
  }, { cut: true, cam: { x: 960, y: 540, s: 1 }, sfx: [{ at: 2.4, kind: 'tick' }] });
  // 483 (2) the tile opens: a SKILL.md page and a scripts/ folder
  c(2, {
    c14_ring: { params: { cx: 960, cy: 500, add: 1, a: 0.16, draw: 1 }, pdur: 0.7 },
    c14_rcap: { y: 1000, s: 0.8 },
    ...K.file('c14_skill', 'skills/repo-map/SKILL.md', ['<span class="c-dim">name:</span> repo-map', '<span class="c-dim">when:</span> start of a task', '<span class="c-dim">run:</span> scripts/map.py'], { x: 620, y: 470, w: 700, size: 34, text: { at: 0.4 } }),
    c14_scripts: { type: 'box', x: 1270, y: 470, w: 340, h: 200, stroke: T.TEAL, fill: 'rgba(92,208,179,0.06)', sw: 3, rad: 16, html: '<span class="m c-teal">scripts/</span><br><span class="m c-dim" style="font-size:0.8em">map.py</span>', size: 38, in: 'scale', at: 0.3 },
    c14_ctag: tag('concept', { x: 1840, ax: 1, align: 'right', y: 130 }),
  });
  // 484 (4.5) a script runs in the sandbox and costs one tool call
  c(4.5, {
    c14_sb: { type: 'box', x: 1680, y: 470, w: 260, h: 200, stroke: T.BLUE, fill: 'rgba(88,196,221,0.05)', sw: 3, rad: 18, html: '<span class="cap c-blue" style="font-size:0.6em">sandbox</span>', size: 40, in: 'draw', at: 0.2 },
    c14_sba: { type: 'arrow', x1: 1444, y1: 470, x2: 1544, y2: 470, color: T.TEAL, sw: 4, head: 16, flow: 2, at: 0.5 },
    c14_one: txt('<span class="c-yellow">+1</span> tool call', { x: 1680, y: 640, size: 44, at: 1.4 }),
    c14_run: txt('a script runs in the sandbox and costs <span class="c-yellow">one tool call</span>', { x: 960, y: 800, size: 50, at: 0.9 }),
    c14_rcap: 'fade',
  }, { sfx: [{ at: 1.4, kind: 'tick' }] });
  // 485–486 three suggested skills
  const card = (i, name, at) => ({ type: 'box', x: 400 + 560 * i, y: 450, w: 500, h: 240, stroke: T.TEAL, fill: 'rgba(92,208,179,0.06)', sw: 3, rad: 20, html: `<span class="m c-teal">${name}</span>`, size: 48, in: 'right', at });
  c(4.5, {
    c14_ring: 'fade', c14_skill: 'left', c14_skill_frame: 'left', c14_skill_name: 'left', c14_scripts: 'left', c14_sb: 'left', c14_sba: 'fade', c14_one: 'fade', c14_run: 'down', c14_ctag: 'fade',
    c14_gtag: tag('suggested skills · general, not repo-specific', { x: 960, y: 210, size: 28, at: 0.4 }),
    c14_k0: card(0, 'repo map', 0.6),
  }, { cut: true });
  c(4.5, { c14_k1: card(1, 'repro scaffold', 0.2), c14_k2: card(2, 'diff check', 0.9) });
  const EFF = [
    'one call returns a compact map of the repository instead of many listings',
    'one call writes a repro template into <span class="m">/tmp</span>',
    'one call prints <span class="m">git status</span> and the diff size before submitting',
  ];
  const run = (i) => {
    const d = {};
    for (let j = 0; j < 3; j++) d['c14_k' + j] = j === i ? { s: 1.07, fill: 'rgba(92,208,179,0.18)', sw: 4, dur: 0.6 } : { s: 1, fill: 'rgba(92,208,179,0.06)', sw: 3, dur: 0.6 };
    if (i > 0) d['c14_e' + (i - 1)] = { o: 0.5 };
    d['c14_e' + i] = txt(EFF[i], { x: 400 + 560 * i, y: 720, size: 38, maxw: 500, lh: 1.2, at: 0.3 });
    return d;
  };
  c(3, { ...run(0), c14_ctag2: tag('concept', { x: 1840, ax: 1, align: 'right', y: 130 }) }, { sfx: [{ at: 0.2, kind: 'click' }] });
  c(3, run(1), { sfx: [{ at: 0.2, kind: 'click' }] });
  c(3, run(2), { sfx: [{ at: 0.2, kind: 'click' }] });

  // ================================================================ 490–494 sub-agents and notes
  const MT = (o) => Object.assign({ x: 160, y: 680, w: 1600, h: 76, first: 1, n: 3, sliver: 1, ticks: 0, crack: 0 }, o);
  const ST2 = (o) => Object.assign({ x: 160, y: 880, w: 1600, h: 76, first: 0.0001, n: 0, sliver: 1, ticks: 0, crack: 0 }, o);
  c(4, {
    c14_ml: { type: 'canvas', draw: 'loop', x: 960, y: 540, in: 'fade', params: LOOP({ cx: 480, cy: 330, r: 160, dot: 1 }), pease: 'none' },
    c14_mlL: cap('main agent', { x: 480, y: 500, size: 26 }),
    c14_sl: { type: 'canvas', draw: 'loop', x: 960, y: 540, in: 'fade', at: 0.5, params: LOOP({ cx: 1440, cy: 330, r: 160, dot: 2.5 }), pease: 'none' },
    c14_slL: cap('sub-agent · read-only', { x: 1440, y: 500, size: 26, at: 0.6 }),
    c14_link: { type: 'arrow', x1: 760, y1: 300, x2: 1150, y2: 300, color: T.DIM, sw: 3, head: 16, dashed: true, flow: 0, at: 0.6 },
    c14_linkL: txt('<span class="m c-dim">AgentTool</span>', { x: 955, y: 255, size: 32, at: 0.9 }),
    c14_mt: { type: 'canvas', draw: 'tape', x: 960, y: 540, in: 'fade', params: MT({}), paramsFrom: { first: 0, n: 0 }, pdur: 1.4 },
    c14_mtL: cap('main window', { x: 160, ax: 0, align: 'left', y: 618, size: 24 }),
    c14_st: { type: 'canvas', draw: 'tape', x: 960, y: 540, in: 'fade', at: 0.5, params: ST2({ first: 1, n: 14 }), paramsFrom: { first: 0, n: 0 }, pdur: 2.4, pease: 'power2.inOut' },
    c14_stL: cap('sub-agent window · reads many files', { x: 160, ax: 0, align: 'left', y: 818, size: 24, at: 0.6 }),
  }, { clear: true, keep: ['rail'], cut: true, cam: { x: 960, y: 540, s: 1 } });
  // 491 (2.5) the main tape gains only a thin summary block
  const mEnd = D.tapeEnd(MT({}));
  c(2.5, {
    c14_link: { flow: 3, dur: 1.8, ease: 'none' },
    c14_sum: { type: 'rect', ax: 0, x: mEnd + 4, y: 680, w: 26, h: 62, fill: T.INK, rad: 5, in: 'fade', from: { y: 880, o: 1 }, dur: 1.0, ease: 'expo.inOut', at: 0.3, z: 5 },
    c14_sumL: txt('a short summary', { x: mEnd + 20, ax: 0, align: 'left', y: 745, size: 40, at: 1.0 }),
    c14_ctag3: tag('concept', { x: 1840, ax: 1, align: 'right', y: 130 }),
  }, { sfx: [{ at: 1.2, kind: 'tick' }] });
  // 492 (4.5) a notes file in /tmp
  c(4.5, {
    c14_st: { params: ST2({ first: 0, n: 0 }), pdur: 1.0, pease: 'power3.in' }, c14_stL: 'fade', c14_sl: 'fade', c14_slL: 'fade', c14_link: 'fade', c14_linkL: 'fade', c14_sumL: 'fade',
    c14_mt: { params: MT({ n: 5 }), pdur: 3.2, pease: 'power1.inOut' },
    c14_sum: { x: D.tapeEnd(MT({ n: 5 })) - 24, dur: 3.2, ease: 'power1.inOut' },
    c14_tray: { type: 'box', x: 1440, y: 330, w: 560, h: 300, stroke: T.DIM, fill: 'rgba(154,163,173,0.05)', sw: 3, rad: 20, html: '', in: 'draw', at: 0.6 },
    c14_trayL: { type: 'text', html: '<span class="m c-dim">/tmp</span>', size: 34, x: 1440, y: 220, in: 'fade', at: 0.8 },
    c14_nf: { type: 'box', x: 1440, y: 350, w: 330, h: 70, stroke: T.INK, fill: 'rgba(21,26,33,0.95)', sw: 2.5, rad: 10, html: '<span class="m">/tmp/notes.md</span>', size: 32, in: 'down', at: 1.1 },
    c14_nt: txt('keep a notes file — it survives in the sandbox<br>while the context only grows', { x: 960, y: 885, size: 46, lh: 1.25, at: 1.4 }),
  }, { sfx: [{ at: 1.2, kind: 'tick' }] });
  // 493 (4.5) the three practices stack as one line
  c(4.5, {
    c14_ml: 'fade', c14_mlL: 'fade', c14_mt: 'fade', c14_st: 'fade', c14_mtL: 'fade', c14_sum: 'fade', c14_tray: 'fade', c14_trayL: 'fade', c14_nf: 'fade', c14_nt: 'up', c14_ctag3: 'fade',
    c14_pr1: txt('short observations', { x: 960, y: 400, size: 64, in: 'left', at: 0.3 }),
    c14_pr2: txt('notes in <span class="m">/tmp</span>', { x: 960, y: 530, size: 64, in: 'right', at: 0.9 }),
    c14_pr3: txt('read-only sub-agents that return summaries', { x: 960, y: 660, size: 64, in: 'left', at: 1.5 }),
    c14_prk: cap('context engineering', { x: 960, y: 270, size: 28, at: 0.2 }),
  }, { cut: true });
  // 494 (2.5) the three lines fold into one pill at the centre; the six-part anatomy returns in ch13's two
  // columns (same slots, same labels, same words); the pill files into "context", which glows
  const SL = [
    { k: 'model', x: 330, y: 300, d: 'fixed · change it only through <span class="c-purple">LoRA</span>' },
    { k: 'control flow', x: 330, y: 560, d: 'your YAML agents' },
    { k: 'tools', x: 330, y: 820, d: '<span class="c-teal">9 fixed</span> + skills + sub-agents' },
    { k: 'context', x: 1590, y: 300, d: 'the <span class="c-yellow">32k</span> window' },
    { k: 'environment', x: 1590, y: 560, d: 'offline container' },
    { k: 'verifier / selector', x: 1590, y: 820, d: 'you create it' },
  ];
  const SW = 520, SH = 190;
  // the folding pill: k 0..0.3 forms at the centre, 0.42..0.85 flies to the context slot, 0.85..1 opens into it
  D.c14_fold = (ctx, p) => {
    const k = U.clamp(p.k || 0);
    if (k <= 0 || k >= 1) return;
    const kin = U.ease(U.clamp(k / 0.3)), mv = U.ease(U.clamp((k - 0.42) / 0.43)), op = U.clamp((k - 0.85) / 0.15);
    const x = 960 + (SL[3].x - 960) * mv, y = 540 + (SL[3].y - 540) * mv;
    const w = (560 + (SW - 560) * op) * (0.7 + 0.3 * kin), h = (96 + (SH - 96) * op) * (0.7 + 0.3 * kin);
    const a = kin * (1 - op);
    ctx.save(); ctx.globalAlpha *= a;
    U.rr(ctx, x - w / 2, y - h / 2, w, h, Math.min(h / 2, 48)); ctx.fillStyle = T.BG; ctx.fill(); ctx.fillStyle = rgba(T.BLUE, 0.16); ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = T.BLUE; ctx.stroke(); ctx.restore();
    D.text(ctx, 'context engineering', x, y + 2, { size: 40, a: a * (1 - U.clamp((mv - 0.75) / 0.25)), color: T.INK });
  };
  const sl = {};
  SL.forEach((o, i) => {
    const at = 0.45 + 0.07 * i;
    sl['c14_sb' + i] = { type: 'box', x: o.x, y: o.y, w: SW, h: SH, stroke: '#3A4654', fill: 'rgba(21,26,33,0.6)', sw: 3, rad: 20, html: '', in: 'draw', dur: 0.8, at };
    sl['c14_sl' + i] = cap(o.k, { x: o.x, y: o.y - 58, size: 26, at: at + 0.15 });
    sl['c14_sd' + i] = txt(o.d, { x: o.x, y: o.y + 22, size: 40, maxw: 470, lh: 1.15, color: T.DIM, at: at + 0.25, dur: 0.8, z: 3 });
  });
  c(2.5, {
    ...sl, c14_prk: 'fade',
    c14_pr1: { y: 540, s: 0.3, o: 0, at: 0, dur: 0.42, ease: 'power3.in' },
    c14_pr2: { s: 0.3, o: 0, at: 0, dur: 0.42, ease: 'power3.in' },
    c14_pr3: { y: 540, s: 0.3, o: 0, at: 0, dur: 0.42, ease: 'power3.in' },
    c14_fold: { type: 'canvas', draw: 'c14_fold', x: 960, y: 540, in: 'none', at: 0.15, params: { k: 0.999 }, paramsFrom: { k: 0 }, pdur: 1.65, pease: 'none', z: 6 },
    c14_cg: { type: 'canvas', draw: 'c14_pulse', pcol: T.BLUE, x: 960, y: 540, in: 'none', at: 1.5, params: { x: SL[3].x, y: SL[3].y, w: SW, h: SH, ph: 0.5, a: 1, rad: 26 }, paramsFrom: { ph: 0 }, pdur: 0.35, pease: 'power2.out' },
  }, { cam: { x: 960, y: 540, s: 1 }, sfx: [{ at: 1.55, kind: 'tick' }] });
  // 495 (4.5) the model slot pulses; a passing run's gold chip drops from the top
  c(4.5, {
    c14_pr1: null, c14_pr2: null, c14_pr3: null, c14_fold: null,
    c14_sb3: { stroke: T.BLUE, fill: 'rgba(88,196,221,0.08)' }, c14_sl3: { color: T.BLUE },
    c14_cg: { params: { x: SL[3].x, y: SL[3].y, w: SW, h: SH, ph: 1, a: 1, rad: 26 }, pdur: 1.4, pease: 'power2.inOut' },
    c14_sb0: { stroke: T.BLUE, at: 0.2 }, c14_sl0: { color: T.BLUE, at: 0.2 },
    c14_mp: { type: 'canvas', draw: 'c14_pulse', pcol: T.BLUE, x: 960, y: 540, in: 'none', at: 0.2, params: { x: SL[0].x, y: SL[0].y, w: SW, h: SH, ph: 2, a: 1, rad: 26 }, paramsFrom: { ph: 0 }, pease: 'none' },
    c14_q2: txt('and the <span class="c-blue">model</span><br>itself?', { x: 960, y: 600, size: 76, lh: 1.15, at: 0.5 }),
    ...K.chip('chip', { x: 960, y: 220, s: 1.2, in: 'down', at: 1.8 }),
  }, { sfx: [{ at: 2.0, kind: 'pop' }] });
  // 496 (4.5) the RAIL rewrites to 15; hand-off: the chip at the top centre
  const slDim = {};
  SL.forEach((_, i) => { if (i !== 0) { slDim['c14_sb' + i] = { o: 0.35, at: 0.3 }; slDim['c14_sl' + i] = { o: 0.35, at: 0.3 }; slDim['c14_sd' + i] = { o: 0.35, at: 0.3 }; } });
  c(4.5, {
    ...slDim, c14_cg: null,
    c14_mp: { params: { x: SL[0].x, y: SL[0].y, w: SW, h: SH, ph: 4, a: 1, rad: 26 }, pease: 'none' },
    c14_q2: { s: 1.04, dur: 2.5, ease: 'sine.inOut' },
    ...K.chip('chip', { x: 960, y: 220, s: 1.2 }),
    rail: { ver: 15, at: 0.6 },
  }, { cam: { x: 960, y: 540, s: 1 }, drift: 0 });
})();
