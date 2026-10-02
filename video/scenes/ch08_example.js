// Chapter 8 — A worked example (storyboard rows 271–314, 125 beats). An illustrative run, not a real trajectory.
(function () {
  const { T } = F;
  const c = F.comp.bind(F);
  F.chapter(K.CH[8]);

  const { clamp, ease } = DRAW.util;
  const rgba = DRAW.rgba;
  const cap = (s, col) => `<span class="cap" style="font-size:1em${col ? ';color:' + col : ''}">${s}</span>`;
  const m = (s, col) => `<span class="m" style="white-space:nowrap${col ? ';color:' + col : ''}">${s}</span>`;
  const esc = K.esc;
  const plate = (s) => `<span class="plate">${s}</span>`;

  // ---------------------------------------------------------------- dashboard geometry
  const A8 = { x: 960, y: 560, w: 620, h: 760 };
  const panel = (x, at = 0) => ({ type: 'box', w: 610, h: 760, x, y: 560, stroke: '#56616D', fill: 'rgba(21,26,33,0.5)', rad: 22, sw: 2.5, html: '', in: 'draw', dur: 1.2, at });
  const dash = (at = 0) => ({
    c08_pl: panel(325, at), c08_pr: panel(1595, at + 0.25),
    c08_plh: { type: 'text', html: cap('call log'), size: 26, color: T.DIM, x: 325, y: 208, in: 'fade', at: at + 0.3 },
    c08_prh: { type: 'text', html: cap('meters'), size: 26, color: T.DIM, x: 1595, y: 208, in: 'fade', at: at + 0.55 },
  });

  // ---------------------------------------------------------------- meters: context (vertical), time (horizontal)
  const MS = 580 / 32768;
  DRAW.c08_met = (ctx, p, sp) => {
    const x = sp.mx, top = 300, h = 580, w = 96, bot = top + h, rv = clamp(p.rev ?? 1);
    ctx.save(); ctx.globalAlpha *= rv;
    ctx.beginPath(); ctx.roundRect(x, top, w, h * ease(rv), 10); ctx.fillStyle = 'rgba(21,26,33,0.95)'; ctx.fill(); ctx.strokeStyle = '#3A4654'; ctx.lineWidth = 2.5; ctx.stroke();
    let y = bot - 6;
    [[p.b || 0, T.BLUE], [p.k || 0, T.THINK], [p.t || 0, T.TEAL]].forEach(([tok, col]) => {
      const hh = tok * MS * (h - 12) / h;
      if (hh <= 0.2) return;
      ctx.beginPath(); ctx.roundRect(x + 8, y - hh, w - 16, Math.max(1.5, hh), 3); ctx.fillStyle = rgba(col, 0.88); ctx.fill();
      y -= hh;
    });
    // half mark and the top
    ctx.strokeStyle = rgba(T.DIM, 0.7); ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(x - 14, top + h / 2); ctx.lineTo(x + w + 14, top + h / 2); ctx.stroke(); ctx.setLineDash([]);
    DRAW.text(ctx, '32k', x - 18, top + 4, { size: 26, color: T.DIM, align: 'right' });
    DRAW.text(ctx, '16k', x - 18, top + h / 2, { size: 26, color: T.DIM, align: 'right' });
    DRAW.text(ctx, 'CONTEXT', x + w / 2, bot + 36, { size: 24, color: T.DIM, sans: true, caps: true });
    // time
    const tx = x + 180, tw = 300, ty = 760;
    ctx.beginPath(); ctx.roundRect(tx, ty - 16, tw, 32, 8); ctx.fillStyle = 'rgba(21,26,33,0.95)'; ctx.fill(); ctx.strokeStyle = '#3A4654'; ctx.stroke();
    const tv = clamp(p.time || 0);
    if (tv > 0) { ctx.beginPath(); ctx.roundRect(tx + 5, ty - 11, (tw - 10) * tv, 22, 5); ctx.fillStyle = rgba(T.YELLOW, 0.85); ctx.fill(); }
    DRAW.text(ctx, 'TIME', tx + tw / 2, ty + 48, { size: 24, color: T.DIM, sans: true, caps: true });
    ctx.restore();
  };
  const MET = (o) => Object.assign({ rev: 1, b: 0, k: 0, t: 0, time: 0 }, o);
  const meterEl = (params, o = {}) => Object.assign({ type: 'canvas', draw: 'c08_met', mx: 1370, z: 3, in: 'fade', dur: 0.3, params: MET(params) }, o);
  const callsEl = (val, o = {}) => Object.assign({ type: 'num', val, size: 120, color: T.YELLOW, x: 1720, y: 430, in: 'fade', z: 3 }, o);

  // ---------------------------------------------------------------- the call log (scrolls)
  const LX = 48, LTOP = 270, LBOT = 915, LH = 35;
  let LOG = [], scroll = 0;
  const logPush = (items) => {
    const d = {};
    let last = LOG[LOG.length - 1];
    const add = [];
    items.forEach((it) => {
      const y0 = last ? last.y0 + last.h + (it.gap ?? 10) : 0;
      const rec = { id: it.id, y0, h: it.lines * LH };
      add.push([rec, it]); LOG.push(rec); last = rec;
    });
    const ns = Math.max(scroll, last.y0 + last.h - (LBOT - LTOP));
    LOG.forEach((r) => {
      if (r.gone || add.find(([a]) => a === r)) return;
      const sy = LTOP + r.y0 - ns;
      if (sy < LTOP - 4) { d[r.id] = 'up'; r.gone = true; } else if (ns !== scroll) d[r.id] = { y: sy, dur: 0.8, ease: 'power3.inOut' };
    });
    const scrolled = ns !== scroll;
    add.forEach(([r, it], k) => {
      d[r.id] = Object.assign({ type: 'text', html: it.html, size: 24, lh: 1.45, align: 'left', ax: 0, ay: 0, x: LX, y: LTOP + r.y0 - ns, in: 'wipe', at: 0.25, dur: 0.8, z: 4 }, it.spec || {});
      // wait for the scroll to clear the space before writing
      if (scrolled) d[r.id].at = Math.max(d[r.id].at, 0.7 + k * 0.15);
    });
    scroll = ns;
    return d;
  };
  const logClear = () => { const d = {}; LOG.forEach((r) => { if (!r.gone) d[r.id] = 'fade'; }); LOG = []; scroll = 0; return d; };
  const lastY = () => { const r = LOG[LOG.length - 1]; return LTOP + r.y0 - scroll + r.h / 2; };
  // camera clamp: the panel tops (world y 180) stay >= 120 px below the frame top, including the drift
  // (drift scales by up to 2.8 % and lifts the centre 8 px), so the HUD rail never sits over a panel header
  const PTOP = 180;
  const cl = (x, y, s) => ({ x, y: Math.min(y, PTOP + 8 + 420 / (s * 1.028)), s });
  const camLog = () => cl(480, 522, 1.22);          // the whole call-log panel + the whole centre panel
  const METCAM = cl(1395, 540, 1.24);               // the whole centre panel + the whole meters panel
  const CAMCODE = METCAM;                           // code close-ups: the centre panel whole, meters beside it
  const WIDE = { x: 960, y: 545, s: 0.97 };         // all three panels, edges never cropped by the drift
  const call = (n, tool, rest = '') => `<span class="c-dim">${n}&ensp;</span>${m(tool, T.TEAL)}${rest ? '&ensp;' + rest : ''}`;
  const cmd = (s) => m(esc(s), T.INK);
  const strip = (s) => `<div style="background:rgba(88,196,221,0.13);border-left:5px solid #58C4DD;padding:0 12px;width:510px;box-sizing:border-box">${s}</div>`;

  // the cold-open code
  const CODE = ['def mean(xs):', '    return sum(xs) / len(xs)', '', 'def summarize(xs):', '    total = sum(xs)', '    return total / len(xs)', '', '    # … 52 more lines'];
  const CODE_FIX = CODE.slice(); CODE_FIX[5] = '    return total / len(xs) if xs else 0';
  const CS = 22, CLH = CS * 1.5, CY = 610;
  const lineY = (n) => CY - (8 * CLH) / 2 + CLH * (n - 0.5);
  const codeEls = (o = {}) => ({
    ...K.code('c08_code', CODE, { x: 960, y: CY, w: 590, size: CS, title: 'src/stats.py', variants: [CODE_FIX], in: 'scale', textIn: 'wipe', ...o }),
    c08_scroll: { type: 'rect', x: 960 + 282, y: CY - 80, w: 7, h: 110, fill: '#3A4654', rad: 4, in: 'fade', at: 0.6, z: 4 },
  });
  const CODE_IDS = ['c08_code', 'c08_code_frame', 'c08_code_title', 'c08_scroll'];

  // ================================================================ compositions
  // 271 (3.5) — WIDE container A opens into three panels
  c(3.5, {
    ...K.rail(8),
    ...K.container('contA', 'A', A8),
    ...dash(0),
    c08_met: meterEl({ rev: 1 }, { at: 0.5, paramsFrom: { rev: 0 }, pdur: 2.0, pease: 'power2.inOut' }),
    c08_calls: callsEl(0, { at: 1.0 }),
    c08_callsL: { type: 'text', html: cap('tool calls'), size: 24, color: T.DIM, x: 1720, y: 510, in: 'fade', at: 1.1 },
  }, { clear: true, keep: ['rail', 'contA', 'contA_hd', 'contA_ht'], cam: { x: 960, y: 540, s: 1 }, drift: 0 });
  // 272 (4.5) — the honesty tag, kept for the whole chapter
  // (a slow pull-back keeps all three panels whole; the workspace label is the layered second action)
  c(4.5, {
    // plate behind the HUD tag (the rail has its own plate), so zoomed world text never shows through it
    c08_tp: { type: 'rect', hud: true, ax: 1, x: 1870, y: 66, w: 840, h: 48, rad: 10, fill: 'rgba(14,17,22,0.9)', z: 49, in: 'fade', at: 0.1 },
    c08_tag: { type: 'text', hud: true, html: cap('illustrative run · not a real trajectory'), size: 26, color: T.YELLOW, align: 'right', ax: 1, x: 1850, y: 66, in: 'wipe', at: 0.2, dur: 1.2, z: 50 },
    c08_wsl: { type: 'text', html: cap('workspace'), size: 24, color: T.DIM, x: 960, y: 270, in: 'rise', at: 1.6, dur: 0.9 },
  }, { cam: WIDE, drift: 0.6 });
  // 273 (2) — the cold-open issue card lands in the centre
  c(2, { ...K.issue('c08_issue', { x: 960, y: 520, s: 0.5, in: 'down', z: 5 }) }, { cam: WIDE, drift: 0.6, sfx: [{ at: 0.5, kind: 'pop' }] });
  // 274 (3.5) — CLOSE the log fills with the first message (six strips)
  const FM = ['problem statement', 'hints (if any)', 'budget', 'environment rules', 'tool notes', 'directory listing · 150 entries'];
  const d274 = logPush(FM.map((s, i) => ({ id: 'c08_fm' + i, lines: 1, gap: 6, html: strip(s), spec: { in: 'left', at: 0.5 + i * 0.22, dur: 0.7 } })));
  c(3.5, {
    c08_issue: { s: 0.48, dur: 1.2, ease: 'power2.inOut' },
    c08_fmh: { type: 'text', html: cap('the first message'), size: 24, color: T.BLUE, align: 'left', ax: 0, x: LX, y: 246, in: 'fade', at: 0.4 },
    ...d274,
  }, { cam: camLog(), sfx: FM.map((_, i) => ({ at: 0.55 + i * 0.22, kind: 'tick' })) });
  // 275 (2) — the context meter fills to ≈3.5k in blue
  c(2, {
    c08_met: { params: MET({ b: 3500 }), pdur: 1.2, pease: 'power3.out' },
    c08_ctxR: { type: 'text', html: '≈<span class="c-yellow">3.5k</span> tokens', size: 32, align: 'left', ax: 0, x: 1480, y: 872, in: 'fade', at: 0.7 },
  }, { cam: METCAM });
  // 276 (4.5) — CLOSE the log: think
  c(4.5, {
    c08_ctxR: 'fade',
    ...logPush([{ id: 'c08_th', lines: 1, gap: 22, html: `<span style="color:#8FA7D9"><i>think:</i> find <span class="m">summarize</span></span>`, spec: { at: 0.4, dur: 1.4 } }]),
    c08_met: { params: MET({ b: 3500, k: 250 }), pdur: 2 },
  }, { cam: camLog() });
  // 277 (3) — call 1: run_command types
  c(3, logPush([{ id: 'c08_c1', lines: 3, html: `${call(1, 'run_command')}<br>${cmd('$ grep -rn "def summarize" \\')}<br>${cmd('    --include=*.py .')}`, spec: { dur: 1.8, ease: 'none' } }]), { cam: camLog(), sfx: [{ at: 0.3, kind: 'click' }] });
  // 278 (2) — result; tool calls 1
  c(2, {
    ...logPush([{ id: 'c08_r1', lines: 1, gap: 4, html: m('→ src/stats.py:4:def summarize(xs):', T.DIM) }]),
    c08_calls: { val: 1, dur: 0.4, at: 0.3 },
  }, { cam: WIDE, drift: 0.6 });
  // 279 (2) — the context meter grows by a sliver
  c(2, { c08_met: { params: MET({ b: 3500, k: 250, t: 120 }), pdur: 1.0 }, c08_sl: { type: 'text', html: '+ a sliver', size: 28, color: T.TEAL, align: 'left', ax: 0, x: 1480, y: 650, in: 'rise', at: 0.4 } }, { cam: METCAM });
  // 280 (3.5) — CLOSE centre: call 2 read_file lines 1–8
  c(3.5, {
    c08_sl: 'fade', c08_issue: { o: 0, s: 0.42, dur: 0.6, ease: 'power2.in' },
    ...logPush([{ id: 'c08_c2', lines: 2, html: `${call(2, 'read_file')}<br>${cmd('src/stats.py · lines 1–8')}` }]),
    c08_calls: { val: 2, dur: 0.4, at: 0.4 },
    c08_rf: { type: 'text', html: `${m('read_file', T.TEAL)} ${m('src/stats.py')}<br><span class="c-dim">lines 1–8</span>`, size: 30, x: 960, y: 340, in: 'wipe', at: 0.6 },
  }, { cam: camLog(), sfx: [{ at: 0.4, kind: 'click' }] });
  // 281 (2) — the cold-open code panel draws, with a scrollbar
  c(2, { c08_wsl: 'fade', c08_issue: null, ...codeEls() }, { cam: CAMCODE });
  // 282 (2) — line 6 glows red; the meter grows by 8 lines, not the whole file
  c(2, {
    c08_hl: { type: 'rect', x: 960, y: lineY(6), w: 560, h: CLH + 4, fill: 'rgba(252,98,85,0.20)', rad: 6, in: 'grow', z: 2, dur: 0.6 },
    c08_met: { params: MET({ b: 3500, k: 250, t: 260 }), pdur: 1.0 },
    c08_8l: { type: 'text', html: '+ 8 lines,<br><span class="c-dim">not the whole file</span>', size: 30, align: 'left', ax: 0, x: 1480, y: 630, in: 'rise', at: 0.4 },
  }, { cam: METCAM, sfx: [{ at: 0.1, kind: 'tick' }] });
  // 283 (3.5) — OVER the workspace: /workspace inside a gold edge, /tmp outside
  const WSB = { x: 960, y: 470, w: 540, h: 380 }, TMPB = { x: 960, y: 820, w: 540, h: 150 };
  c(3.5, {
    c08_8l: 'fade', c08_rf: 'fade', c08_hl: 'fade', ...Object.fromEntries(CODE_IDS.map((k) => [k, { o: 0, s: 0.9, dur: 0.5 }])),
    c08_ws: { type: 'box', ...WSB, stroke: T.GOLD, fill: 'rgba(240,172,95,0.05)', rad: 16, sw: 3, html: '', in: 'draw', at: 0.4, z: 3 },
    c08_wsT: { type: 'text', html: m('/workspace', T.GOLD), size: 30, align: 'left', ax: 0, x: WSB.x - WSB.w / 2 + 24, y: WSB.y - WSB.h / 2 + 34, in: 'fade', at: 0.7, z: 4 },
    c08_wsF: { type: 'mono', html: 'src/stats.py<br>tests/test_stats.py<br>…', size: 30, color: T.DIM, ax: 0, x: WSB.x - WSB.w / 2 + 40, y: WSB.y + 20, in: 'wipe', at: 0.9, z: 4 },
    c08_wsN: { type: 'text', html: cap('in the patch', T.GOLD), size: 24, align: 'right', ax: 1, x: WSB.x + WSB.w / 2 - 20, y: WSB.y - WSB.h / 2 + 34, in: 'fade', at: 1.2, z: 4 },
    c08_tmp: { type: 'box', ...TMPB, stroke: '#6F7883', fill: 'rgba(154,163,173,0.04)', rad: 16, html: '', in: 'draw', at: 0.8, z: 3 },
    c08_tmpT: { type: 'text', html: m('/tmp', T.DIM), size: 30, align: 'left', ax: 0, x: TMPB.x - TMPB.w / 2 + 24, y: TMPB.y - 40, in: 'fade', at: 1.1, z: 4 },
  }, { cam: WIDE, drift: 0.6 });
  // 284 (2) — call 3: run_command writes /tmp/repro.py with a heredoc
  c(2, {
    ...CODE_IDS.reduce((a, k) => Object.assign(a, { [k]: null }), {}),
    ...logPush([{ id: 'c08_c3', lines: 3, html: `${call(3, 'run_command')}<br>${cmd("$ cat > /tmp/repro.py <<'EOF'")}<br>${cmd('  … EOF')}`, spec: { dur: 1.2 } }]),
    c08_calls: { val: 3, dur: 0.4, at: 0.3 },
  }, { cam: camLog(), sfx: [{ at: 0.3, kind: 'click' }] });
  // 285 (2) — the file appears outside the gold edge
  c(2, {
    c08_repro: { type: 'box', w: 260, h: 56, x: 1050, y: TMPB.y + 20, stroke: T.DIM, fill: 'rgba(154,163,173,0.10)', rad: 10, html: m('repro.py', T.INK), size: 28, in: 'pop', at: 0.3, z: 5 },
  }, { cam: camLog(), sfx: [{ at: 0.35, kind: 'pop' }] });
  const WS_IDS = ['c08_ws', 'c08_wsT', 'c08_wsF', 'c08_wsN', 'c08_tmp', 'c08_tmpT', 'c08_repro'];
  // 286 (3.5) — CLOSE log: call 4 → ZeroDivisionError
  c(3.5, {
    ...logPush([{ id: 'c08_c4', lines: 3, html: `${call(4, 'run_command')}<br>${cmd('$ python3 /tmp/repro.py')}<br>${m('ZeroDivisionError: division by zero', T.RED)}`, spec: { dur: 1.6, ease: 'none' } }]),
    c08_calls: { val: 4, dur: 0.4, at: 0.3 }, c08_fmh: 'fade',
    c08_repro: { stroke: T.RED, fill: 'rgba(252,98,85,0.14)', at: 1.4, dur: 0.4, ease: 'power2.out' },
  }, { cam: camLog(), sfx: [{ at: 0.3, kind: 'click' }, { at: 1.5, kind: 'tick' }] });
  // 287 (3.5) — the raw result behind that line: JSON
  c(3.5, logPush([{ id: 'c08_j1', lines: 2.35, gap: 8, html: `<div style="border:2px solid #3A4654;border-radius:8px;padding:0 10px;width:540px;box-sizing:border-box;background:rgba(21,26,33,0.9)">${m('{"status": "error", …,', T.DIM)}<br>${m(' "exit_code": 1}', T.DIM)}</div>`, spec: { in: 'fade', dur: 0.8, at: 0.5 } }]), { cam: camLog() });
  // 288 (4.5) — "now there is a test the agent can see"
  c(4.5, {
    ...Object.fromEntries(WS_IDS.map((k) => [k, 'fade'])),
    c08_jt: { type: 'text', html: cap('what the model reads:<br>JSON, not a terminal'), size: 24, lh: 1.6, color: T.DIM, x: 960, y: 740, in: 'fade', at: 0.2, z: 5 },
    c08_see: { type: 'text', html: 'now there is<br><span class="c-green">a test the agent can see</span>', size: 40, lh: 1.3, maxw: 580, x: 960, y: 540, in: 'wipe', at: 0.8, z: 8 },
  }, { cam: camLog() });
  // 289 (2.5) — reading beat: underline "a test the agent can see"
  F.beat(2.5, { id: 'c08_see', mode: 'underline', w: 450, dx: 0, under: 62, color: T.GREEN });
  // 290 (4.5) — CLOSE code: call 5 edit_file; line 6 rewrites; edit applied · 1 match
  c(4.5, {
    c08_see: 'up', c08_jt: 'fade',
    ...logPush([{ id: 'c08_c5', lines: 2, html: `${call(5, 'edit_file')}<br>${cmd('src/stats.py')}` }]),
    c08_calls: { val: 5, dur: 0.4, at: 0.3 },
    ...codeEls({ in: 'fade', textIn: 'fade' }),
    c08_old: { type: 'mono', html: '<span class="del">old: return total / len(xs)</span>', size: 22, ax: 0, x: 700, y: 322, in: 'left', at: 0.3, z: 5 },
    c08_new: { type: 'mono', html: '<span style="color:#F0AC5F">new: return total / len(xs) if xs else 0</span>', size: 22, ax: 0, x: 700, y: 358, in: 'right', at: 0.6, z: 5 },
    c08_hl: { type: 'rect', x: 960, y: lineY(6), w: 560, h: CLH + 4, fill: 'rgba(240,172,95,0.22)', rad: 6, in: 'grow', z: 2, at: 1.4, dur: 0.6 },
    c08_ok1: { type: 'text', html: '<span class="c-green">edit applied</span> · 1 match', size: 30, x: 960, y: 800, in: 'wipe', at: 2.2 },
  }, { cam: CAMCODE, sfx: [{ at: 0.3, kind: 'click' }, { at: 1.5, kind: 'tick' }] });
  // the code text rewrites line 6 inside the same comp (ver tween, layered)
  FILM.COMPS[FILM.COMPS.length - 1].els.c08_code = Object.assign({}, FILM.COMPS[FILM.COMPS.length - 1].els.c08_code, { ver: 1, from: { ver: 0, o: 0 }, dur: 1.6, at: 0.4 });
  // 291 (3.5) — CLOSE log: call 6 → 0 (green)
  const CODEOUT = Object.fromEntries(['c08_old', 'c08_new', 'c08_hl', 'c08_ok1'].map((k) => [k, 'fade']));
  c(3.5, {
    ...CODEOUT,
    ...logPush([{ id: 'c08_c6', lines: 3, html: `${call(6, 'run_command')}<br>${cmd('$ python3 /tmp/repro.py')}<br>${m('0', T.GREEN)}`, spec: { dur: 1.4, ease: 'none' } }]),
    c08_calls: { val: 6, dur: 0.4, at: 0.3 },
  }, { cam: camLog(), sfx: [{ at: 0.3, kind: 'click' }, { at: 1.4, kind: 'tick' }] });
  // 292 (4.5) — the raw result in the same shape
  c(4.5, {
    ...logPush([{ id: 'c08_j2', lines: 2.35, gap: 8, html: `<div style="border:2px solid #3A4654;border-radius:8px;padding:0 10px;width:540px;box-sizing:border-box;background:rgba(21,26,33,0.9)">${m('{"status": "ok", "stdout": "0",', T.DIM)}<br>${m(' "exit_code": 0}', T.GREEN)}</div>`, spec: { in: 'fade', dur: 0.8, at: 0.4 } }]),
    c08_jt2: { type: 'text', html: 'success,<br><span class="c-dim">in the same shape</span>', size: 40, lh: 1.3, x: 960, y: 300, in: 'wipe', at: 1.4, z: 8 },
  }, { cam: camLog() });
  // 293 (2) — call 7: nearby existing tests
  c(2, { c08_jt2: 'up', ...logPush([{ id: 'c08_c7', lines: 2, html: `${call(7, 'run_command')}<br>${cmd('$ python3 -m pytest tests/test_stats.py -q')}`, spec: { dur: 1.0, ease: 'none' } }]), c08_calls: { val: 7, dur: 0.4, at: 0.3 } }, { cam: camLog(), sfx: [{ at: 0.3, kind: 'click' }] });
  // 294 (2) — result: passed
  c(2, logPush([{ id: 'c08_r7', lines: 1, gap: 4, html: `${m('.......', T.GREEN)}&ensp;<span class="c-green">passed</span>`, spec: { dur: 0.8 } }]), { cam: camLog(), sfx: [{ at: 0.35, kind: 'tick' }] });
  // 295 (3) — call 8: git status --short
  c(3, {
    ...logPush([{ id: 'c08_c8', lines: 3, html: `${call(8, 'run_command')}<br>${cmd('$ git status --short')}<br>${m(' M src/stats.py', T.GOLD)}&ensp;<span class="c-dim">(no /tmp/repro.py)</span>`, spec: { dur: 1.2 } }]),
    c08_calls: { val: 8, dur: 0.4, at: 0.3 },
  }, { cam: camLog(), sfx: [{ at: 0.3, kind: 'click' }] });
  // 296 (3.5) — CLOSE meters: the run fits
  c(3.5, {
    c08_met: { params: MET({ b: 3500, k: 700, t: 1500, time: 0.22 }), pdur: 1.6, pease: 'power3.out' },
    c08_fit: { type: 'text', html: 'the run <span class="c-green">fits</span>', size: 40, x: 1610, y: 322, in: 'wipe', at: 0.6 },
    c08_far: { type: 'text', html: cap('far below 32k'), size: 24, color: T.BLUE, align: 'left', ax: 0, x: 1480, y: 650, in: 'fade', at: 1.2 },
  }, { cam: METCAM });
  // 297 (2) — submit_patch (free): the gold chip forms
  c(2, {
    c08_far: 'fade', ...Object.fromEntries(CODE_IDS.map((k) => [k, 'quick'])),
    ...logPush([{ id: 'c08_c9', lines: 1, html: `${m('submit_patch', T.TEAL)}&ensp;<span class="c-dim">(free)</span>`, spec: { dur: 0.6 } }]),
    ...K.chip('c08_chip', { x: 960, y: 520, s: 1.3, at: 0.3, z: 6 }),
    c08_chipL: { type: 'text', html: '1 file · 1 line changed', size: 30, color: T.DIM, x: 960, y: 620, in: 'fade', at: 0.7 },
  }, { cam: WIDE, drift: 0.6, sfx: [{ at: 0.35, kind: 'pop' }] });
  // 298 (2) — the chip travels into a small container B
  const BX = 1595;
  c(2, {
    c08_fit: 'fade', c08_met: { o: 0, dur: 0.4 }, c08_calls: { o: 0, dur: 0.4 }, c08_callsL: { o: 0, dur: 0.4 }, c08_prh: 'fade',
    ...K.container('c08_B', 'B', { x: BX, y: 560, w: 520, h: 600, head: 'container B' }),
    c08_chip: { x: BX, y: 380, s: 0.9, dur: 1.1, ease: 'expo.inOut', at: 0.3 },
    c08_chipL: 'fade',
  }, { drift: 0.6 });
  // 299 (4.5) — the hidden test cells stay neutral grey
  const cells = {};
  for (let i = 0; i < 5; i++) cells['c08_tc' + i] = { type: 'rect', x: BX, y: 500 + i * 70, w: 400, h: 44, fill: '#3A4452', rad: 7, in: 'down', at: 0.2 + i * 0.1, z: 3 };
  c(4.5, {
    ...cells,
    c08_q: { type: 'text', html: '?', size: 64, color: T.DIM, x: BX + 200, y: 855, in: 'fade', at: 1.6 },
    c08_dec: { type: 'text', html: plate('on a real task, <span class="c-ink">this is where it’s decided</span>'), size: 46, color: T.DIM, x: 960, y: 1000, in: 'wipe', at: 1.0, z: 9 },
  }, { drift: 0.6, sfx: [0, 1, 2, 3, 4].map((i) => ({ at: 0.25 + i * 0.1, kind: 'tick' })) });
  // 300 (2.5) — reading beat: "this is where it's decided" stays bright; the rest sinks
  const DIMS = ['contA', 'contA_hd', 'contA_ht', 'c08_pl', 'c08_pr', 'c08_plh', 'c08_chip', 'c08_B', 'c08_B_hd', 'c08_B_ht', 'c08_q', ...Object.keys(cells), ...LOG.filter((r) => !r.gone).map((r) => r.id)];
  c(2.5, { ...Object.fromEntries(DIMS.map((k) => [k, { o: 0.33, dur: 0.6 }])), c08_dec: { s: 1.08, dur: 1.4, ease: 'expo.out' } }, { cam: cl(960, 760, 1.06), drift: 0.4 });

  // 301 (4.5) — FULL "Same task. Careless agent."
  logClear();
  c(4.5, {
    c08_full: { type: 'text', html: 'Same task. <span class="c-red">Careless agent.</span>', size: 120, x: 960, y: 520, in: 'wipe', dur: 1.3, at: 0.2 },
    c08_fsub: { type: 'text', html: cap('the same illustrative issue, a different run'), size: 28, color: T.DIM, x: 960, y: 660, in: 'fade', at: 1.4 },
  }, { clear: true, keep: ['rail', 'c08_tag', 'c08_tp'], cut: true, cam: { x: 960, y: 540, s: 1 } });
  // 302 (3.5) — WIDE the dashboard returns, reset; call 1 reads a large, unrelated file
  c(3.5, {
    c08_full: 'up', c08_fsub: 'up',
    ...K.container('contA', 'A', A8), ...dash(0.05),
    c08_met: meterEl({ b: 3500 }, { at: 0.5, paramsFrom: { rev: 0 }, pdur: 1.2 }),
    c08_calls: callsEl(1, { at: 0.6 }),
    c08_callsL: { type: 'text', html: cap('tool calls'), size: 24, color: T.DIM, x: 1720, y: 510, in: 'fade', at: 0.6 },
    ...logPush([{ id: 'c08_x1', lines: 2, html: `${call(1, 'read_file')}<br>${cmd('src/plotting.py')}&ensp;<span class="c-red">(unrelated)</span>`, spec: { at: 1.2 } }]),
    c08_big: { type: 'text', html: `${m('src/plotting.py')}<br><span class="c-dim">a large file, read whole</span>`, size: 30, x: 960, y: 520, in: 'fade', at: 1.5 },
  }, { cut: false, cam: WIDE, drift: 0.6, sfx: [{ at: 1.25, kind: 'click' }] });
  // 303 (2) — the context meter jumps by a big teal block
  c(2, { c08_met: { params: MET({ b: 3500, t: 3600 }), pdur: 0.9, pease: 'power3.out' } }, { drift: 0.6, sfx: [{ at: 0.2, kind: 'tick' }] });
  // 304 (2) — calls 2–4: three more large reads; the meter passes half
  c(2, {
    ...logPush([2, 3, 4].map((n, i) => ({ id: 'c08_x' + n, lines: 1, gap: 6, html: `${call(n, 'read_file')} ${cmd(['src/report.py', 'src/io.py', 'src/cli.py'][i])}`, spec: { at: 0.1 + i * 0.3, dur: 0.5 } }))),
    c08_calls: { val: 4, dur: 0.9, at: 0.2 },
    c08_met: { params: MET({ b: 3500, k: 1800, t: 14400 }), pdur: 1.3, pease: 'power2.inOut' },
  }, { drift: 0.6, sfx: [0, 1, 2].map((i) => ({ at: 0.12 + i * 0.3, kind: 'click' })) });
  // 305 (2) — the edit lands with no reproduction and no test run
  c(2, {
    c08_big: 'fade',
    ...logPush([{ id: 'c08_x5', lines: 2, html: `${call(5, 'edit_file')} ${cmd('src/stats.py')}<br><span class="c-red">no reproduction · no test run</span>`, spec: { dur: 0.7 } }]),
    c08_calls: { val: 5, dur: 0.4, at: 0.2 },
    c08_ed: { type: 'mono', html: '<span style="color:#F0AC5F">return total / len(xs) if xs else 0</span>', size: 24, x: 960, y: 420, in: 'fade', at: 0.3 },
  }, { drift: 0.6, sfx: [{ at: 0.2, kind: 'click' }] });
  // 306 (2) — write_file creates notes.txt inside /workspace
  c(2, {
    ...logPush([{ id: 'c08_x6', lines: 1, html: `${call(6, 'write_file')} ${cmd('notes.txt')}`, spec: { dur: 0.6 } }]),
    c08_calls: { val: 6, dur: 0.4, at: 0.2 },
    c08_ws2: { type: 'text', html: m('/workspace/', T.DIM), size: 28, x: 960, y: 560, in: 'fade', at: 0.1 },
    c08_notes: { type: 'box', w: 280, h: 62, x: 960, y: 640, stroke: T.GOLD, fill: 'rgba(240,172,95,0.12)', rad: 10, html: m('notes.txt', T.INK), size: 30, in: 'pop', at: 0.4 },
  }, { drift: 0.6, sfx: [{ at: 0.2, kind: 'click' }, { at: 0.45, kind: 'pop' }] });
  // 307 (2) — the chip forms with two files: the fix and notes.txt
  c(2, {
    c08_ed: { x: 960, y: 800, s: 0.3, o: 0, dur: 0.6, ease: 'power3.in' }, c08_notes: { x: 960, y: 800, s: 0.3, o: 0, dur: 0.6, ease: 'power3.in', at: 0.1 }, c08_ws2: 'fade',
    ...K.chip('c08_chip', { x: 960, y: 800, s: 1.2, at: 0.5 }),
    c08_chipL: { type: 'text', html: `${m('src/stats.py')} + ${m('notes.txt', T.RED)}`, size: 26, x: 960, y: 880, in: 'fade', at: 0.8 },
  }, { drift: 0.6, sfx: [{ at: 0.55, kind: 'pop' }] });
  // 308 (2) — split: careful (left) vs careless (right), meters side by side
  const keepTag = ['rail', 'c08_tag', 'c08_tp'];
  const dl = logClear();
  c(2, {
    c08_mA: meterEl({ b: 3500, k: 700, t: 1500, time: 0.22 }, { x: 960 - 900, at: 0.2, paramsFrom: { rev: 0 }, pdur: 0.9 }),
    c08_mB: meterEl({ b: 3500, k: 1800, t: 14400, time: 0.45 }, { x: 960 - 70, at: 0.3, paramsFrom: { rev: 0 }, pdur: 0.9 }),
    c08_nA: callsEl(8, { x: 760, y: 470, size: 100, at: 0.4 }), c08_nB: callsEl(6, { x: 1590, y: 470, size: 100, at: 0.5 }),
    c08_nAL: { type: 'text', html: cap('tool calls'), size: 24, color: T.DIM, x: 760, y: 540, in: 'fade', at: 0.5 },
    c08_nBL: { type: 'text', html: cap('tool calls'), size: 24, color: T.DIM, x: 1590, y: 540, in: 'fade', at: 0.6 },
    c08_hA: { type: 'text', html: 'careful', size: 52, color: T.GREEN, x: 590, y: 220, in: 'left', at: 0.1 },
    c08_hB: { type: 'text', html: 'careless', size: 52, color: T.RED, x: 1420, y: 220, in: 'right', at: 0.1 },
    c08_div: { type: 'rect', x: 1010, y: 560, w: 3, h: 640, fill: '#3A4654', in: 'growh', at: 0.1 },
  }, { clear: true, keep: keepTag, cut: true });
  void dl;
  // 309 (4.5) — the lesson
  c(4.5, {
    c08_les1: { type: 'text', html: 'same fix · <span class="c-red">nothing checked</span> · <span class="c-red">junk in the patch</span>', size: 44, x: 960, y: 945, in: 'wipe', at: 0.2, z: 6 },
    c08_les2: { type: 'text', html: '<span class="c-ink">your prompt, workflow and budget</span> decide which run you get', size: 44, color: T.DIM, x: 960, y: 1020, in: 'wipe', at: 1.4, z: 6 },
  });
  // 310 (2.5) — reading beat: underline "your prompt, workflow and budget"
  F.beat(2.5, { id: 'c08_les2', mode: 'underline', w: 600, dx: -230, under: 30, color: T.INK });

  // 311 (2) — the careful run compresses into icons: find → read → write repro → run repro → fix
  const ICON = ['find', 'read', 'write repro', 'run repro', 'fix', 're-run', 'test', 'check', 'submit'];
  const TOOLS = ['run_command', 'read_file', 'run_command', 'run_command', 'edit_file', 'run_command', 'run_command', 'run_command', 'submit_patch'];
  const IX = (i) => 128 + i * 208, IY = 520;
  const icon = (i, at) => ({ type: 'box', w: 198, h: 96, x: IX(i), y: IY, stroke: i === 8 ? T.GOLD : i === 4 ? T.GOLD : T.BLUE, fill: 'rgba(21,26,33,0.96)', rad: 48, html: ICON[i], size: 34, in: 'scale', from: { x: 960, y: 560, s: 0.3, o: 0 }, at, dur: 0.8, ease: 'expo.out', z: 4 });
  const splitOut = Object.fromEntries(['c08_mA', 'c08_mB', 'c08_nA', 'c08_nB', 'c08_nAL', 'c08_nBL', 'c08_hA', 'c08_hB', 'c08_div', 'c08_les1', 'c08_les2'].map((k) => [k, 'fade']));
  c(2, {
    ...splitOut,
    ...Object.fromEntries([0, 1, 2, 3, 4].map((i) => ['c08_i' + i, icon(i, 0.2 + i * 0.1)])),
    ...Object.fromEntries([1, 2, 3, 4].map((i) => ['c08_ia' + i, { type: 'text', html: '→', size: 30, color: T.DIM, x: IX(i) - 104, y: IY, in: 'fade', at: 0.5 + i * 0.1, z: 5 }])),
    c08_ih: { type: 'text', html: 'the careful run, <span class="c-dim">as a recipe</span>', size: 56, x: 960, y: 360, in: 'fade', at: 0.3 },
  }, { cut: true, sfx: [0, 1, 2, 3, 4].map((i) => ({ at: 0.25 + i * 0.1, kind: 'tick' })) });
  // 312 (2) — → re-run → test → check → submit
  c(2, {
    ...Object.fromEntries([5, 6, 7, 8].map((i) => ['c08_i' + i, icon(i, 0.1 + (i - 5) * 0.12)])),
    ...Object.fromEntries([5, 6, 7, 8].map((i) => ['c08_ia' + i, { type: 'text', html: '→', size: 30, color: T.DIM, x: IX(i) - 104, y: IY, in: 'fade', at: 0.3 + (i - 5) * 0.12, z: 5 }])),
  }, { sfx: [0, 1, 2, 3].map((i) => ({ at: 0.15 + i * 0.12, kind: 'tick' })) });
  // 313 (2) — the first five icons name their tools
  const tname = (i, at) => ({ type: 'text', html: m(TOOLS[i], T.TEAL), size: 25, x: IX(i), y: IY + 86, in: 'rise', at, z: 4 });
  // (the last four names start entering in the closing half-second, so they are fully up as 314 begins)
  c(2, Object.fromEntries([0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => ['c08_tn' + i, tname(i, i < 5 ? 0.1 + i * 0.15 : 1.05 + (i - 5) * 0.1)])));
  // 314 (2) — the last four; the line cracks red at "submit"; the LOOP returns; RAIL → 09
  const fadeAll = Object.fromEntries([...[0, 1, 2, 3, 4, 5, 6, 7, 8].flatMap((i) => ['c08_i' + i, 'c08_tn' + i]), ...[1, 2, 3, 4, 5, 6, 7, 8].map((i) => 'c08_ia' + i), 'c08_ih'].map((k) => [k, { o: 0, dur: 0.45, at: 0.95, ease: 'power2.in' }]));
  c(2, {
    ...fadeAll, c08_tag: 'fade', c08_tp: 'fade',
    // the "submit" pill cracks red: a red overlay + crack appear at once, hold, then swell a touch and fade
    // with the rest (expo.in: ~full until +0.95 s, gone by +1.4 s), so nothing is left beside the LOOP
    c08_i8r: { type: 'box', w: 198, h: 96, x: IX(8), y: IY, stroke: T.RED, fill: 'rgba(252,98,85,0.22)', rad: 48, html: ICON[8], size: 34, z: 5, in: 'fade', o: 0, s: 1.1, from: { o: 1, s: 1 }, at: 0.45, dur: 0.95, ease: 'expo.in' },
    c08_crack: { type: 'path', d: `M${IX(8) - 10},${IY - 70} L${IX(8) + 14},${IY - 20} L${IX(8) - 12},${IY + 16} L${IX(8) + 10},${IY + 70}`, sw: 4, color: T.RED, fill: 'none', z: 6, in: 'fade', o: 0, from: { o: 1 }, at: 0.45, dur: 0.95, ease: 'expo.in' },
    loop: { type: 'canvas', draw: 'loop', x: 960, y: 540, params: { cx: 960, cy: 540, r: 300, draw: 1, labels: 1, ring: 0, dot: -1, exit: 0, hi: -1 }, paramsFrom: { draw: 0, labels: 0 }, in: 'fade', dur: 0.3, at: 0.95, pdur: 0.55, pease: 'power2.out' },
    rail: { ver: 9 },
  }, { cam: { x: 960, y: 540, s: 1 }, drift: 0, sfx: [{ at: 0.5, kind: 'tick' }] });
})();
