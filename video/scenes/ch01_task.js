// Chapter 1 — The task (storyboard rows 28–62, 128 beats).
(function () {
  const { T } = F;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ease = DRAW.util.ease;
  const rgba = DRAW.rgba;
  // comp wrapper: guards cuts on whole beats
  const c = (beats, delta, opts = {}) => {
    if (opts.cut && (F.now() / T.BEAT) % 1 !== 0) console.error('c01: cut on a half beat at ' + F.now());
    return F.comp(beats, delta, opts);
  };
  const camOf = () => { const p = FILM.COMPS[FILM.COMPS.length - 1]; return Object.assign({ x: 960, y: 540, s: 1 }, (p && p.cam) || {}); };
  // reading beat: push the camera onto one element, the rest of the frame dims a step
  const push = (beats, id, others = {}, o = {}) => {
    const prev = FILM.COMPS[FILM.COMPS.length - 1], el = prev.els[id], cam0 = camOf();
    const ex = (el.x ?? 960) + (o.dx || 0), ey = (el.y ?? 540) + (o.dy || 0);
    const cam = { x: cam0.x + (ex - cam0.x) * 0.85, y: cam0.y + (ey - cam0.y) * 0.85, s: cam0.s * (o.scale || 1.28) };
    return F.comp(beats, Object.assign({ [id]: { s: (el.s ?? 1) * 1.05 } }, others), { cam, drift: 0.4, beatCam: cam0 });
  };
  const cap = (s, size = 26, color = T.DIM, extra = {}) => Object.assign({ type: 'text', html: `<span class="cap" style="font-size:1em">${s}</span>`, size, color, in: 'fade' }, extra);

  // ---------------------------------------------------------------- chapter-local drawings
  // commit history: dots on a line, a base_commit pointer, later commits grey out
  DRAW.c01_commits = (ctx, p, sp) => {
    const x0 = sp.x0, x1 = sp.x1, y = sp.cy, n = sp.n, base = sp.base;
    const k1 = ease(clamp((p.k || 0) / 0.6));
    const ptr = ease(clamp(((p.k || 0) - 0.6) / 0.3));
    const g = ease(clamp((p.grey || 0) / 0.6)), gh = ease(clamp(((p.grey || 0) - 0.6) / 0.4));
    DRAW.text(ctx, 'commit history', x0 - 10, y - 74, { caps: true, size: 24, color: T.DIM, align: 'left', a: clamp(k1 * 3) });
    DRAW.polyline(ctx, [[x0 - 30, y], [x1 + 30, y]], k1, { color: rgba(T.DIM, 0.8), w: 4 });
    const dx = (x1 - x0) / (n - 1);
    for (let i = 0; i < n; i++) {
      const a = ease(clamp(k1 * (n - 1) * 1.05 - i + 1));
      if (a <= 0) continue;
      const x = x0 + i * dx, after = i > base;
      ctx.save(); ctx.globalAlpha *= a;
      ctx.beginPath(); ctx.arc(x, y, 15 * (0.6 + 0.4 * a), 0, Math.PI * 2);
      if (after) {
        ctx.fillStyle = rgba(T.INK, 1 - 0.85 * g); ctx.fill();
        ctx.setLineDash([5, 5]); ctx.strokeStyle = rgba(T.DIM, g); ctx.lineWidth = 2.5; ctx.stroke();
      } else { ctx.fillStyle = T.INK; ctx.fill(); }
      ctx.restore();
    }
    if (ptr > 0) {
      const bx = x0 + base * dx;
      ctx.save(); ctx.globalAlpha *= ptr;
      ctx.beginPath(); ctx.arc(bx, y, 25, 0, Math.PI * 2); ctx.strokeStyle = T.BLUE; ctx.lineWidth = 4; ctx.stroke();
      ctx.restore();
      DRAW.polyline(ctx, [[bx, y + 140], [bx, y + 40]], ptr, { color: T.BLUE, w: 5 });
      if (ptr > 0.95) DRAW.arrowHead(ctx, bx, y + 36, -Math.PI / 2, 20, T.BLUE);
      DRAW.text(ctx, 'base_commit', bx, y + 172, { mono: true, size: 40, color: T.INK, a: clamp(((p.k || 0) - 0.75) / 0.25) });
    }
    if (gh > 0) {
      const fx = x0 + (base + 2) * dx;
      ctx.save(); ctx.globalAlpha *= gh; ctx.setLineDash([8, 7]);
      ctx.beginPath(); ctx.arc(fx, y, 30, 0, Math.PI * 2); ctx.strokeStyle = T.GOLD; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
      DRAW.text(ctx, 'the fix', fx, y - 62, { caps: true, size: 24, color: T.GOLD, a: gh });
    }
  };
  // the binary-reward plot: axes, a step function, an "almost right" band, a sliding dot
  DRAW.c01_plot = (ctx, p) => {
    const x0 = 360, y0 = 820, x1 = 1620, yt = 290, y1 = 380;
    const ax = clamp(p.ax || 0);
    DRAW.polyline(ctx, [[x0, y0], [x1 + 60, y0]], ease(clamp(ax * 1.6)), { color: rgba(T.INK, 0.85), w: 3.5 });
    DRAW.polyline(ctx, [[x0, y0], [x0, yt]], ease(clamp(ax * 1.6 - 0.4)), { color: rgba(T.INK, 0.85), w: 3.5 });
    if (ax > 0.98) { DRAW.arrowHead(ctx, x1 + 64, y0, 0, 18, rgba(T.INK, 0.85)); DRAW.arrowHead(ctx, x0, yt - 4, -Math.PI / 2, 18, rgba(T.INK, 0.85)); }
    // level-1 guide
    if (ax > 0.5) DRAW.polyline(ctx, [[x0, y1], [x1, y1]], ease(clamp(ax * 2 - 1)), { color: rgba(T.DIM, 0.35), w: 2, dash: [6, 10] });
    // band "almost right"
    const bd = ease(clamp((p.band || 0) * 3));
    if (bd > 0) {
      const bx0 = x0 + (x1 - x0) * 0.72, bx1 = x1 - 22;
      ctx.save(); ctx.globalAlpha *= bd;
      ctx.fillStyle = rgba(T.RED, 0.12); ctx.fillRect(bx0, y1 - 20, bx1 - bx0, y0 - y1 + 20);
      ctx.setLineDash([6, 8]); ctx.strokeStyle = rgba(T.RED, 0.6); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(bx0, y1 - 20); ctx.lineTo(bx0, y0); ctx.moveTo(bx1, y1 - 20); ctx.lineTo(bx1, y0); ctx.stroke();
      ctx.restore();
    }
    // step function
    const st = p.step || 0;
    const xe = x1 - 6;
    if (st > 0) {
      DRAW.polyline(ctx, [[x0, y0], [xe, y0]], ease(clamp(st / 0.75)), { color: T.INK, w: 5 });
      const j = ease(clamp((st - 0.75) / 0.25));
      if (j > 0) {
        ctx.save(); ctx.globalAlpha *= j;
        ctx.beginPath(); ctx.arc(xe, y0, 11, 0, Math.PI * 2); ctx.fillStyle = T.BG; ctx.fill(); ctx.strokeStyle = T.INK; ctx.lineWidth = 4; ctx.stroke();
        ctx.beginPath(); ctx.arc(xe, y0 - (y0 - y1) * j, 14, 0, Math.PI * 2); ctx.fillStyle = T.GREEN; ctx.shadowColor = T.GREEN; ctx.shadowBlur = 18; ctx.fill();
        ctx.restore();
      }
    }
    // the sliding dot
    if ((p.dot ?? -1) >= 0) {
      const x = x0 + (x1 - x0) * p.dot, inBand = p.dot > 0.72;
      ctx.save(); ctx.beginPath(); ctx.arc(x, y0, 15, 0, Math.PI * 2);
      ctx.fillStyle = T.BLUE; ctx.shadowColor = T.BLUE; ctx.shadowBlur = 20; ctx.fill();
      if (inBand) { ctx.shadowBlur = 0; ctx.beginPath(); ctx.arc(x, y0, 26, 0, Math.PI * 2); ctx.strokeStyle = T.RED; ctx.lineWidth = 3; ctx.stroke(); }
      ctx.restore();
      DRAW.text(ctx, 'score 0', x, y0 - 46, { size: 30, color: inBand ? T.RED : T.DIM, a: clamp((p.dot - 0.1) * 6) });
    }
  };

  F.chapter(K.CH[1]);

  // ---------------------------------------------------------------- 28 (4.5) FULL the question
  c(4.5, {
    ...K.rail(1),
    c01_q1: { type: 'text', html: 'What does the <span class="c-blue">agent</span>', size: 120, x: 960, y: 450, maxw: 1800, in: 'left', dur: 1.2 },
    c01_q2: { type: 'text', html: 'receive?', size: 120, x: 960, y: 610, in: 'right', at: 0.45, dur: 1.2 },
    c01_qu: { type: 'rect', x: 960, y: 690, w: 430, h: 5, rad: 3, fill: T.BLUE, in: 'grow', at: 1.7, dur: 1.2 },
  }, { animateFirst: true });

  // ---------------------------------------------------------------- 29 (3.5) WIDE two inputs
  const sheet = { type: 'box', w: 540, h: 500, stroke: '#3A4654', fill: 'rgba(21,26,33,0.96)', sw: 2.5, rad: 20, html: '', in: 'right' };
  c(3.5, {
    c01_q1: 'left', c01_q2: 'right', c01_qu: 'right',
    ...K.issue('c01_issue', { x: 540, y: 540, s: 0.7, in: 'left', at: 0.1 }),
    c01_rs2: Object.assign({}, sheet, { x: 1464, y: 516, at: 0.2, o: 0.6 }),
    c01_rs1: Object.assign({}, sheet, { x: 1452, y: 528, at: 0.26, o: 0.8 }),
    c01_repo: Object.assign({}, sheet, {
      x: 1440, y: 540, at: 0.32, size: 34,
      html: `<div style="text-align:left;padding:0 48px">
        <div style="display:flex;align-items:center;margin-bottom:22px"><span class="cap" style="font-size:24px;color:#9AA3AD">Python repository</span><span class="cap" style="font-size:24px;color:#F4D35E;margin-left:auto">illustrative</span></div>
        <div class="m" style="font-size:38px;line-height:1.55">src/<br>&nbsp;&nbsp;stats.py<br>&nbsp;&nbsp;io.py<br>tests/<br>&nbsp;&nbsp;test_stats.py<br>pyproject.toml</div></div>`,
    }),
  });

  // ---------------------------------------------------------------- 30 (4.5) CLOSE the issue
  c(4.5, {
    c01_l1: { type: 'text', html: 'a <span class="c-ink">GitHub-style issue description</span>', size: 50, x: 540, y: 790, maxw: 1000, in: 'wipe', at: 0.6, dur: 1.2 },
    c01_l1u: { type: 'rect', x: 568, y: 828, w: 640, h: 4, rad: 2, fill: T.DIM, in: 'grow', at: 1.6, dur: 1.2 },
  }, { cam: { x: 560, y: 610, s: 1.42 } });

  // ---------------------------------------------------------------- 31 (4.5) CLOSE the repository unfolds into commits
  const CM = { x0: 1040, x1: 1760, cy: 520, n: 9, base: 5 };
  c(4.5, {
    c01_rs2: 'shrink', c01_rs1: 'shrink', c01_repo: 'shrink', c01_l1: 'fade', c01_l1u: 'fade',
    c01_issue: { x: 250, s: 0.6, at: 0.1, dur: 1.0 },
    c01_commits: Object.assign({ type: 'canvas', draw: 'c01_commits', x: 960, y: 540, in: 'fade', dur: 0.3, at: 0.25, params: { k: 1, grey: 0 }, paramsFrom: { k: 0 }, pdur: 3.0, pease: 'power1.inOut' }, CM),
    c01_l2: { type: 'text', html: 'a Python repository, checked out at one commit', size: 48, x: 1400, y: 330, maxw: 1200, in: 'wipe', at: 0.7, dur: 1.3 },
  }, { cam: { x: 1400, y: 540, s: 1.35 } });

  // ---------------------------------------------------------------- 32 (4.5) later commits grey out
  c(4.5, {
    c01_commits: { params: { k: 1, grey: 1 }, pdur: 3.0, pease: 'power1.inOut' },
    c01_nic: { type: 'text', html: 'the fix is <span class="c-red">not in your checkout</span>', size: 52, x: 1400, y: 820, maxw: 1200, in: 'wipe', at: 1.3, dur: 1.1 },
  });

  // ---------------------------------------------------------------- 33 (2.5) reading beat: underline
  F.beat(2.5, { id: 'c01_nic', mode: 'underline', w: 470, dx: 118, under: 38, color: T.RED });

  // ---------------------------------------------------------------- 34 (4.5) WIDE both inputs slide into the model
  c(4.5, {
    c01_issue: { x: 960, y: 560, s: 0.08, o: 0, at: 0.1, dur: 1.0, ease: 'power3.in' },
    c01_commits: { x: 960 - 440 * 0.1, y: 560 + 20 * 0.1, s: 0.1, o: 0, at: 0.1, dur: 1.0, ease: 'power3.in' },
    c01_l2: 'fade', c01_nic: 'fade',
    c01_model: { type: 'box', x: 960, y: 560, w: 520, h: 170, stroke: T.BLUE, fill: 'rgba(88,196,221,0.12)', sw: 4, rad: 26, html: '<span class="c-blue">Gemma 4 31B</span>', size: 64, in: 'pop', at: 1.0 },
    c01_mid: { type: 'mono', html: 'gemma-4-31b-it-qat-w4a16-ct', size: 30, color: T.DIM, x: 960, y: 690, in: 'wipe', at: 1.8, dur: 1.0 },
  }, { cam: { x: 960, y: 540, s: 1 }, sfx: [{ at: 1.05, kind: 'pop' }] });

  // ---------------------------------------------------------------- 35 (4.5) the ADK harness around the model
  c(4.5, {
    c01_issue: null, c01_commits: null,
    c01_adk: { type: 'box', x: 960, y: 550, w: 880, h: 420, stroke: T.DIM, fill: 'rgba(154,163,173,0.04)', sw: 3, rad: 30, html: '', in: 'draw', dur: 1.5, at: 0.1 },
    c01_adkl: { type: 'text', html: 'Agent Development Kit <span class="c-dim">(ADK)</span>', size: 46, x: 960, y: 392, in: 'wipe', at: 1.0, dur: 1.1 },
  });

  // ---------------------------------------------------------------- 36 (4.5) container A around both
  const S = 0.8, sc = (v, o) => o + (v - o) * S;   // agent group shrinks about (960, 560)
  c(4.5, {
    ...K.container('contA', 'A', { x: 960, y: 560, w: 1640, h: 880 }),
    c01_nonet: cap('no network', 30, T.RED, { x: 960, y: 958, in: 'up', at: 1.4 }),
    c01_adk: { y: sc(550, 560), s: S, at: 1.7, dur: 1.2 },
    c01_adkl: { y: sc(392, 560), s: S, at: 1.7, dur: 1.2 },
    c01_model: { s: S, at: 1.7, dur: 1.2 },
    c01_mid: { y: sc(690, 560), s: S, at: 1.7, dur: 1.2 },
  });

  // ---------------------------------------------------------------- 37 / 38 / 39 four kinds of action
  const AR = { color: T.TEAL, sw: 5, head: 22, dur: 0.9 };
  const lab = (id, a, b, x, y, at) => ({ [id]: { type: 'text', versions: [a, `<span class="m c-teal">${b}</span>`], ver: 0, size: 46, x, y, in: 'rise', at } });
  c(4.5, {
    ...K.arrow('c01_a1', 600, 430, 410, 320, Object.assign({}, AR, { at: 0.2 })),
    ...K.arrow('c01_a2', 1320, 430, 1510, 320, Object.assign({}, AR, { at: 0.9 })),
    ...lab('c01_l_a1', 'read files', 'read_file(…)', 380, 272, 0.8),
    ...lab('c01_l_a2', 'edit files', 'edit_file(…)', 1540, 272, 1.5),
  }, { sfx: [{ at: 0.3, kind: 'tick' }, { at: 1.0, kind: 'tick' }] });
  c(4.5, {
    ...K.arrow('c01_a3', 600, 690, 410, 800, Object.assign({}, AR, { at: 0.2 })),
    ...K.arrow('c01_a4', 1320, 690, 1480, 800, Object.assign({}, AR, { at: 0.9 })),
    ...lab('c01_l_a3', 'run commands', 'run_command(…)', 380, 852, 0.8),
    ...lab('c01_l_a4', 'query a code graph', 'get_code_neighbors(…)', 1500, 852, 1.5),
  }, { sfx: [{ at: 0.3, kind: 'tick' }, { at: 1.0, kind: 'tick' }] });
  c(2, {
    c01_l_a1: { ver: 1, at: 0.0 }, c01_l_a2: { ver: 1, at: 0.12 }, c01_l_a3: { ver: 1, at: 0.24 }, c01_l_a4: { ver: 1, at: 0.36 },
  });

  // ---------------------------------------------------------------- 40 (4.5) OVER the agent opens into the LOOP
  const LOOP = { cx: 960, cy: 560, r: 240, draw: 1, labels: 1, ring: 0, dot: -1, exit: 0, hi: -1, hiA: 0, stopped: 0 };
  const L = (o) => Object.assign({}, LOOP, o);
  c(4.5, {
    c01_a1: 'undraw', c01_a2: 'undraw', c01_a3: 'undraw', c01_a4: 'undraw',
    c01_l_a1: 'shrink', c01_l_a2: 'shrink', c01_l_a3: 'shrink', c01_l_a4: 'shrink',
    c01_adk: 'undraw', c01_adkl: 'fade', c01_mid: 'fade',
    c01_model: { s: 0.56, y: 560, at: 0.3, dur: 1.2 },
    loop: { type: 'canvas', draw: 'loop', x: 960, y: 540, in: 'fade', dur: 0.2, at: 0.4, params: L({}), paramsFrom: { draw: 0, labels: 0 }, pdur: 2.6, pease: 'power2.out' },
  });

  // ---------------------------------------------------------------- 41 (2) a dot laps; a log grows
  const logLine = (n, s, at, y, col = '') => ({ type: 'mono', html: `<span class="c-dim">${n}</span> <span class="${col}">${s}</span>`, size: 40, align: 'left', ax: 0, x: 1390, y, in: 'rise', at, dur: 0.6 });
  c(2, {
    loop: { params: L({ dot: 2 }), pdur: 1.45, pease: 'power1.inOut' },
    c01_logt: cap('log', 26, T.DIM, { x: 1390, ax: 0, align: 'left', y: 250, at: 0.0 }),
    c01_log1: logLine(1, 'read_file(…)', 0.55, 310),
    c01_log2: logLine(2, 'run_command(…)', 1.1, 370),
  });

  // ---------------------------------------------------------------- 42 (2.5) exit by submit_patch(); the chip pops out
  c(2.5, {
    loop: { params: L({ dot: 2 + 1 / 3, exit: 1 }), pdur: 1.3, pease: 'power2.inOut' },
    c01_log3: logLine(3, 'submit_patch()', 0.6, 430, 'c-gold'),
    ...K.chip('c01_chip', {
      versions: ['<span class="m" style="color:#F0AC5F">patch.diff</span>', '<span class="m" style="color:#F0AC5F">git diff</span> of /workspace'],
      x: 1413, y: 922, s: 0.75, at: 1.2,
    }),
  }, { sfx: [{ at: 1.25, kind: 'pop' }] });

  // ---------------------------------------------------------------- 43 (4.5) CLOSE the chip: what the patch is
  const outL = {};
  for (const k of ['contA', 'contA_hd', 'contA_ht', 'loop', 'c01_model', 'c01_logt', 'c01_log1', 'c01_log2', 'c01_log3', 'c01_nonet']) outL[k] = 'left';
  c(4.5, {
    ...outL,
    c01_chip: { x: 960, y: 500, s: 1.5, w: 640, ver: 1, at: 0.15, dur: 1.4, ease: 'expo.inOut' },
    c01_dn: { type: 'mono', html: '<span class="c-dim">$</span> git add -N . &amp;&amp; git diff HEAD', size: 40, x: 960, y: 720, in: 'wipe', at: 2.0, dur: 1.0 },
  }, { cam: { x: 960, y: 560, s: 1.05 } });

  // ---------------------------------------------------------------- 44 (4.5) FULL the reframe
  c(4.5, {
    c01_chip: 'shrink',
    c01_dn: 'fade',
    c01_r1: { type: 'text', html: 'You don’t submit a <span class="c-gold">fix</span>.', size: 96, x: 960, y: 430, maxw: 1800, in: 'left' },
    c01_r2: { type: 'text', html: 'You submit <span class="c-blue">the agent</span> that writes it.', size: 96, x: 960, y: 610, maxw: 1800, in: 'right', at: 0.9 },
  }, { cut: true, cam: { x: 960, y: 540, s: 1 } });

  // ---------------------------------------------------------------- 45 (2.5) reading beat: push on "You submit the agent"
  push(2.5, 'c01_r2', { c01_r1: { o: 0.4 } }, { dx: -330 });

  // ---------------------------------------------------------------- 46 (3.5) WIDE container A and container B
  const A2 = { x: 520, y: 500, w: 680, h: 560 }, B2 = { x: 1400, y: 500, w: 680, h: 560 };
  const bars = {};
  for (let i = 0; i < 4; i++) bars['c01_tb' + i] = { type: 'rect', x: B2.x, y: 432 + i * 58, w: 520, h: 36, fill: '#3A4452', rad: 7, in: 'down', at: 1.0 + 0.08 * i, z: 2 };
  c(3.5, {
    c01_r1: 'left', c01_r2: 'right',
    ...K.container('contA', 'A', A2),
    ...K.container('c01_contB', 'B', B2),
    c01_aL: { type: 'text', html: '<span class="c-blue">your agent</span> ran here', size: 44, x: A2.x, y: 380, in: 'fade', at: 0.6 },
    ...K.chip('c01_chip', { x: A2.x, y: 540, s: 1, w: 330, ver: 0, at: 0.7 }),
    c01_htl: { type: 'text', html: 'hidden tests', size: 40, color: T.DIM, x: B2.x, y: 380, in: 'fade', at: 0.9 },
    ...bars,
  }, { cam: { x: 960, y: 540, s: 1 } });

  // ---------------------------------------------------------------- 47 (2) the chip travels A → B along an arc
  const P0 = [A2.x, 540], P2 = [B2.x, 330], BEND = -220;
  const arcC = (() => { const mx = (P0[0] + P2[0]) / 2, my = (P0[1] + P2[1]) / 2, dx = P2[0] - P0[0], dy = P2[1] - P0[1], len = Math.hypot(dx, dy); return [mx - (dy / len) * BEND, my + (dx / len) * BEND]; })();
  const t47 = F.now();
  c(2, {
    c01_arc: { type: 'arrow', x1: P0[0], y1: P0[1], x2: P2[0], y2: P2[1], bend: BEND, color: T.GOLD, sw: 3, head: 0, dashed: true, flow: 0, o: 0.55, in: 'draw', dur: 0.8 },
    c01_chip: { x: P2[0], y: P2[1], s: 0.8, at: 0.15, dur: 1.2, ease: 'power2.inOut' },
  });
  F.hook((t) => {
    if (t < t47 + 0.15 || t > t47 + 1.35) return;
    const pr = FILM.EL.c01_chip && FILM.EL.c01_chip.proxy; if (!pr) return;
    // follow the same quadratic curve as the dashed arc (x drives the parameter)
    const tx = pr.x;
    let u = clamp((tx - P0[0]) / (P2[0] - P0[0]));
    for (let i = 0; i < 4; i++) { const xu = (1 - u) * (1 - u) * P0[0] + 2 * u * (1 - u) * arcC[0] + u * u * P2[0]; const d = 2 * (1 - u) * (arcC[0] - P0[0]) + 2 * u * (P2[0] - arcC[0]); u = clamp(u - (xu - tx) / (d || 1)); }
    pr.y = (1 - u) * (1 - u) * P0[1] + 2 * u * (1 - u) * arcC[1] + u * u * P2[1];
  });

  // ---------------------------------------------------------------- 48 (4.5) B lights: binary verdict
  const green = {};
  for (let i = 0; i < 4; i++) green['c01_tb' + i] = { fill: T.GREEN, at: 0.3 + 0.2 * i, dur: 0.3, ease: 'power2.out' };
  c(4.5, {
    c01_arc: 'quick', c01_htl: 'fade',
    ...green,
    c01_contB: { fill: 'rgba(131,193,103,0.13)', at: 0.2, dur: 0.8 },
    c01_v1: { type: 'text', html: '<span class="m">exit 0</span> → resolved', size: 54, color: T.GREEN, x: B2.x, y: 720, in: 'wipe', at: 1.2 },
    c01_v2: { type: 'text', html: 'anything else → not resolved', size: 46, color: T.RED, o: 0.65, x: B2.x, y: 860, in: 'fade', at: 2.1 },
  }, { sfx: [0, 1, 2, 3].map((i) => ({ at: 0.32 + 0.2 * i, kind: 'click' })) });

  // ---------------------------------------------------------------- 49 (4.5) OVER axes: binary reward
  const gone = {};
  for (const k of ['contA', 'contA_hd', 'contA_ht', 'c01_contB', 'c01_contB_hd', 'c01_contB_ht', 'c01_aL', 'c01_chip', 'c01_tb0', 'c01_tb1', 'c01_tb2', 'c01_tb3']) gone[k] = 'fade';
  c(4.5, {
    ...gone,
    c01_v1: { x: 310, y: 380, s: 0.35, r: -90, o: 0, at: 0.0, dur: 0.8, ease: 'power3.in' },
    c01_v2: { x: 310, y: 820, s: 0.35, r: -90, o: 0, at: 0.05, dur: 0.8, ease: 'power3.in' },
    c01_plot: { type: 'canvas', draw: 'c01_plot', x: 960, y: 540, in: 'fade', dur: 0.2, at: 0.5, params: { ax: 1, step: 0, band: 0, dot: -1 }, paramsFrom: { ax: 0 }, pdur: 1.8, pease: 'power2.inOut' },
    c01_xl: { type: 'text', html: 'how close the patch is', size: 46, x: 990, y: 905, in: 'wipe', at: 1.4 },
    c01_yl: { type: 'text', html: 'score', size: 46, x: 360, y: 238, in: 'wipe', at: 1.7 },
    c01_y1: { type: 'text', html: '1', size: 46, x: 318, y: 380, in: 'fade', at: 2.1 },
    c01_y0: { type: 'text', html: '0', size: 46, x: 318, y: 820, in: 'fade', at: 2.2 },
    c01_far: cap('far off', 26, T.DIM, { x: 440, y: 864, at: 2.4 }),
    c01_exa: cap('exact fix', 26, T.DIM, { x: 1610, y: 864, at: 2.5 }),
  }, { cut: true, cam: { x: 960, y: 560, s: 1 } });

  // ---------------------------------------------------------------- 50 (2) step function
  c(2, { c01_v1: null, c01_v2: null, c01_plot: { params: { ax: 1, step: 1, band: 0, dot: 0.06 }, pdur: 1.4, pease: 'power2.inOut' } });

  // ---------------------------------------------------------------- 51 (3) the dot slides through "almost right"
  c(3, {
    c01_plot: { params: { ax: 1, step: 1, band: 1, dot: 0.95 }, pdur: 2.2, pease: 'power2.inOut' },
    c01_bandl: cap('almost right', 26, T.RED, { x: 360 + 1260 * 0.86, y: 336, at: 0.3 }),
    c01_ar: { type: 'text', html: 'almost right scores <span class="c-red">zero</span>', size: 64, x: 990, y: 180, in: 'wipe', at: 1.3 },
  });

  // ---------------------------------------------------------------- 52 (2.5) reading beat: everything else sinks to a third
  const dimIds = ['c01_plot', 'c01_xl', 'c01_yl', 'c01_y1', 'c01_y0', 'c01_far', 'c01_exa', 'c01_bandl'];
  c(2.5, Object.assign({ c01_ar: { s: 1.08, dur: 0.9 } }, Object.fromEntries(dimIds.map((k) => [k, { o: 0.33, dur: 0.9 }]))), { drift: 0.5 });

  // ---------------------------------------------------------------- 53 (4.5) WIDE container A: the agent's own check
  const outLeft = Object.fromEntries(dimIds.map((k) => [k, 'left']));
  const WS = { x: 620, y: 600 };
  c(4.5, {
    ...outLeft, c01_ar: 'up',
    ...K.container('contA', 'A', { x: 960, y: 560, w: 1500, h: 820 }),
    c01_ws: { type: 'box', x: WS.x, y: WS.y, w: 620, h: 560, stroke: '#3A4654', fill: 'rgba(21,26,33,0.96)', sw: 2.5, rad: 20, size: 40, in: 'scale', at: 0.6,
      html: '<div class="m" style="text-align:left;padding:0 48px;line-height:1.6"><div class="c-ink">/workspace</div><div class="c-dim">&nbsp;&nbsp;src/stats.py</div><div class="c-dim">&nbsp;&nbsp;tests/</div><div class="c-dim">&nbsp;&nbsp;pyproject.toml</div></div>' },
    c01_repro: { type: 'box', x: 1300, y: 400, w: 600, h: 150, stroke: T.BLUE, fill: 'rgba(88,196,221,0.06)', sw: 3, rad: 18, size: 44, in: 'pop', at: 1.4,
      html: '<span class="m">/tmp/repro.py</span>' },
    c01_tag1: cap('concept', 26, T.YELLOW, { x: 1300, y: 296, at: 1.8 }),
    c01_tmp: cap('scratch in /tmp stays out of the patch', 24, T.DIM, { x: 1300, y: 512, at: 2.3 }),
  }, { cam: { x: 960, y: 560, s: 1 }, sfx: [{ at: 1.45, kind: 'pop' }] });

  // ---------------------------------------------------------------- 54 (4.5) run → fails before the fix
  c(4.5, {
    c01_run: { type: 'mono', html: 'run_command', size: 40, color: T.TEAL, x: 1300, y: 700, in: 'rise', at: 0.1 },
    c01_ra: { type: 'arrow', x1: 1300, y1: 660, x2: 1300, y2: 540, color: T.TEAL, sw: 5, head: 20, flow: 1, in: 'draw', from: { flow: 0 }, at: 0.5, dur: 1.0, pulseColor: T.TEAL },
    c01_res: { type: 'text', versions: ['<span class="c-red">✗</span> fails before the fix', '<span class="c-green">✓</span> passes after the fix'], ver: 0, size: 50, x: 1300, y: 820, in: 'rise', at: 1.5 },
  }, { sfx: [{ at: 0.6, kind: 'tick' }, { at: 1.55, kind: 'click' }] });

  // ---------------------------------------------------------------- 55 (3) edit → run → passes
  c(3, {
    c01_edit: { type: 'rect', x: WS.x, y: WS.y - 31, w: 540, h: 52, fill: 'rgba(240,172,95,0.22)', rad: 8, in: 'grow', at: 0.05, dur: 0.6, z: 3 },
    c01_editl: { type: 'mono', html: 'edit_file', size: 36, color: T.TEAL, x: WS.x + 200, y: WS.y - 31, in: 'fade', at: 0.15, z: 4 },
    c01_ra: { flow: 2, at: 0.75, dur: 0.9, ease: 'power2.inOut' },
    c01_res: { ver: 1, at: 1.5, dur: 0.6 },
  }, { sfx: [{ at: 0.1, kind: 'tick' }, { at: 0.8, kind: 'tick' }, { at: 1.6, kind: 'click' }] });

  // ---------------------------------------------------------------- 56 (4.5) why: the agent checks itself
  c(4.5, {
    c01_why: { type: 'text', html: 'the hidden tests are never shown, so <span class="c-blue">the agent checks itself</span>', size: 54, x: 960, y: 1060, maxw: 1900, in: 'wipe', at: 0.7, dur: 1.4 },
    c01_res: { s: 1.08, at: 2.2, dur: 0.8 },
  }, { cam: { x: 960, y: 610, s: 0.86 } });

  // ---------------------------------------------------------------- 57 (3.5) OVER the pipeline in one strip
  const gone2 = {};
  for (const k of ['contA', 'contA_hd', 'contA_ht', 'c01_ws', 'c01_repro', 'c01_tag1', 'c01_tmp', 'c01_run', 'c01_ra', 'c01_res', 'c01_edit', 'c01_editl', 'c01_why']) gone2[k] = 'fade';
  const SY = 560;
  c(3.5, {
    ...gone2,
    c01_s1: { type: 'box', x: 220, y: SY, w: 250, h: 140, stroke: T.DIM, fill: 'rgba(154,163,173,0.05)', sw: 3, rad: 18, html: 'issue', size: 46, in: 'scale', at: 0.3 },
    c01_sa1: { type: 'arrow', x1: 355, y1: SY, x2: 430, y2: SY, color: T.DIM, sw: 4, head: 18, in: 'draw', at: 0.5, dur: 0.4 },
    c01_s2: { type: 'box', x: 590, y: SY, w: 300, h: 150, stroke: T.BLUE, fill: 'rgba(88,196,221,0.08)', sw: 3.5, rad: 75, html: 'agent loop', color: T.BLUE, size: 46, in: 'scale', at: 0.6 },
    c01_sa2: { type: 'arrow', x1: 750, y1: SY, x2: 800, y2: SY, color: T.DIM, sw: 4, head: 18, in: 'draw', at: 0.8, dur: 0.4 },
    ...K.chip('c01_chip', { x: 960, y: SY, s: 0.85, w: 330, ver: 0, o: 1, at: 0.9 }),
    c01_sa3: { type: 'arrow', x1: 1110, y1: SY, x2: 1180, y2: SY, color: T.DIM, sw: 4, head: 18, in: 'draw', at: 1.1, dur: 0.4 },
    c01_s4: { type: 'box', x: 1340, y: SY, w: 300, h: 150, stroke: T.GREEN, fill: 'rgba(131,193,103,0.06)', sw: 3.5, rad: 22, html: 'container B', color: T.GREEN, size: 44, in: 'scale', at: 1.2 },
    c01_sa4: { type: 'arrow', x1: 1500, y1: SY, x2: 1580, y2: SY, color: T.DIM, sw: 4, head: 18, in: 'draw', at: 1.4, dur: 0.4 },
    c01_s5: { type: 'text', html: '<span class="m">exit 0</span>', size: 54, color: T.GREEN, x: 1720, y: SY, in: 'wipe', at: 1.5 },
  }, { cam: { x: 960, y: 540, s: 1 } });

  // ---------------------------------------------------------------- 58 (4.5) your part vs theirs
  c(4.5, {
    c01_s2: { fill: 'rgba(88,196,221,0.24)', sw: 5, s: 1.1, at: 0.1, dur: 0.9 },
    c01_you: { type: 'text', html: 'you design this', size: 54, color: T.BLUE, x: 590, y: 385, in: 'rise', at: 0.4 },
    c01_s4: { stroke: '#5B6672', color: T.DIM, fill: 'rgba(154,163,173,0.04)', at: 1.4, dur: 0.9 },
    c01_s5: { color: T.DIM, at: 1.5, dur: 0.9 },
    c01_org: { type: 'text', html: 'fixed by the organizers', size: 48, color: T.DIM, x: 1530, y: 385, in: 'rise', at: 1.7 },
    c01_brk: { type: 'rect', x: 1530, y: 440, w: 520, h: 4, rad: 2, fill: '#5B6672', in: 'grow', at: 1.9 },
    c01_bru: { type: 'rect', x: 590, y: 440, w: 300, h: 4, rad: 2, fill: T.BLUE, in: 'grow', at: 0.6 },
  });

  // ---------------------------------------------------------------- 59 (4.5) CLOSE five tags
  const TAGS = [['prompts', T.BLUE], ['workflow', T.BLUE], ['skills', T.TEAL], ['adapters', T.PURPLE], ['budgets', T.DIM]];
  const tags = {};
  TAGS.forEach(([n, col], i) => {
    tags['c01_t' + i] = { type: 'box', x: 260 + i * 350, y: 600, w: 300, h: 116, stroke: col, fill: rgba(col, 0.08), sw: 3.5, rad: 58, html: n, size: 48, in: 'pop', at: 0.7 + 0.16 * i, from: { x: 960, y: 330, s: 0.3 }, dur: 0.9, ease: 'expo.out' };
  });
  c(4.5, {
    c01_s1: 'left', c01_sa1: 'quick', c01_sa2: 'quick', c01_sa3: 'quick', c01_sa4: 'quick', c01_chip: 'fade',
    c01_s4: 'right', c01_s5: 'right', c01_org: 'right', c01_brk: 'right', c01_bru: 'fade',
    c01_s2: 'zoom',
    c01_you: { x: 960, y: 330, size: 84, at: 0.1, dur: 1.0, ease: 'expo.inOut' },
    ...tags,
  }, { sfx: [0, 1, 2, 3, 4].map((i) => ({ at: 0.75 + 0.16 * i, kind: 'tick' })) });

  // ---------------------------------------------------------------- 60 (3) the tags fold into "your bundle"
  const fold = {};
  TAGS.forEach((_, i) => { fold['c01_t' + i] = { x: 960, y: 580, s: 0.3, o: 0, at: 0.04 * i, dur: 0.7, ease: 'power3.in' }; });
  c(3, {
    ...fold,
    c01_you: 'up',
    c01_bundle: { type: 'box', x: 960, y: 580, w: 720, h: 320, stroke: T.INK, fill: 'rgba(236,233,226,0.05)', sw: 3.5, rad: 26, size: 72, in: 'pop', at: 0.7,
      html: '<div>your bundle</div><div class="cap" style="font-size:26px;color:#9AA3AD;margin-top:18px">a declarative bundle, not code</div>' },
  }, { sfx: [{ at: 0.75, kind: 'pop' }] });

  // ---------------------------------------------------------------- 61 (3) upload → one number
  const fold0 = {};
  TAGS.forEach((_, i) => { fold0['c01_t' + i] = null; });
  c(3, {
    ...fold0,
    c01_slot: { type: 'box', x: 1320, y: 580, w: 420, h: 230, stroke: T.DIM, fill: 'rgba(154,163,173,0.05)', sw: 3, rad: 22, size: 30, in: 'draw', at: 0.0, dur: 0.8,
      html: '<span class="cap" style="font-size:26px;color:#9AA3AD">upload</span>' },
    c01_bundle: { x: 1320, y: 580, s: 0.4, o: 0, at: 0.5, dur: 0.8, ease: 'power3.in' },
    c01_sa: { type: 'arrow', x1: 1545, y1: 580, x2: 1640, y2: 580, color: T.DIM, sw: 4, head: 18, in: 'draw', at: 1.25, dur: 0.4 },
    c01_qm: { type: 'text', html: '?', size: 150, color: T.YELLOW, x: 1730, y: 560, in: 'pop', at: 1.5 },
    c01_qml: { type: 'text', html: 'your score', size: 44, x: 1730, y: 690, in: 'fade', at: 1.6 },
    c01_qmn: cap('defined next', 24, T.DIM, { x: 1730, y: 740, at: 1.8 }),
  }, { cam: { x: 1300, y: 580, s: 1.12 }, sfx: [{ at: 1.3, kind: 'click' }] });

  // ---------------------------------------------------------------- 62 (2) the card multiplies into the grid; dive into one cell
  const GRID120 = { cols: 12, rows: 10, cw: 112, ch: 64, gap: 14 };
  const [gx, gy] = DRAW.gridCell(55, { w: 1920, h: 1080 }, GRID120, 960, 500);
  c(2, {
    c01_slot: 'zoom', c01_bundle: null, c01_sa: 'quick', c01_qm: 'zoom', c01_qml: 'quick', c01_qmn: 'quick',
    grid: { type: 'canvas', draw: 'grid', x: 960, y: 500, in: 'fade', dur: 0.2, params: Object.assign({}, GRID120, { reveal: 1, gold: 55, goldGlow: 1, dim: 0, sweep: 0, split: 0, ring: 0, lock: 0, repo: 0, count: 0 }), paramsFrom: { reveal: 0, goldGlow: 0 }, pdur: 1.5, pease: 'power2.out' },
    rail: { ver: 2 },
  }, { cam: { x: gx, y: gy, s: 6 }, drift: 0 });
})();
