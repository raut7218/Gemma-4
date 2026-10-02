// Chapter 7 — Sandbox and verification (storyboard rows 238–270, 123 beats).
// 3D shots use THREE_SCENES.containers (scenes/three_containers.mjs).
(function () {
  const { T } = F;
  const c = F.comp.bind(F);
  F.chapter(K.CH[7]);

  const cap = (s, col) => `<span class="cap" style="font-size:1em${col ? ';color:' + col : ''}">${s}</span>`;
  const m = (s, col) => `<span class="m" style="white-space:nowrap${col ? ';color:' + col : ''}">${s}</span>`;
  const plate = (s) => `<span class="plate">${s}</span>`;
  const A0 = { x: 960, y: 560, w: 900, h: 640 };

  // ---------------------------------------------------------------- the six-stage track
  const STAGES = ['compile', 'serve', 'prepare A', 'run the loop', 'extract the patch', 'verify in B'];
  const SX = (i) => 960 + (i - 2.5) * 305, SY = 170;   // pills' top edge ≥ 120 px (title-safe under the rail)
  const stageEl = (i) => ({ type: 'box', w: 292, h: 72, x: SX(i), y: SY, stroke: i === 2 ? T.BLUE : i === 5 ? T.GREEN : '#56616D', fill: 'rgba(21,26,33,0.96)', rad: 36, sw: 3, html: `<span class="c-dim">${i + 1}</span>&ensp;${STAGES[i]}`, size: 29, z: 3, in: 'scale', at: 0.35 + i * 0.28 });
  const track = Object.fromEntries(STAGES.map((_, i) => ['c07_s' + i, stageEl(i)]));
  const LIT = 'rgba(236,233,226,0.14)';
  const lightStage = (n) => Object.fromEntries(STAGES.map((_, i) => ['c07_s' + i, { fill: i === n ? LIT : 'rgba(21,26,33,0.96)', o: i === n ? 1 : 0.55, s: i === n ? 1.06 : 1, dur: 0.6 }]));
  const trackOut = Object.fromEntries(STAGES.map((_, i) => ['c07_s' + i, 'up']).concat([['c07_line', 'up']]));

  // ---------------------------------------------------------------- 3D
  const P0 = { yaw: 0.45, pitch: 40, dist: 14, tx: 0, ty: 0.75, tz: 0, chipLag: 0, two: 0, aIn: 1, bIn: 0, lit: 0, plaqueGlow: 0, fileIn: 0, fileGold: 0, fileMove: 0, bars: 0, pass: 0, verdict: 0, chipIn: 0, chipArc: 0, chipGone: 0, testIn: 0, testFlip: 0 };
  let P3cur = { ...P0 };
  // screen rectangle of the 3D case A's rim at the P0 framing (measured from stills)
  const SIL = { x: 948, y: 368, w: 790, h: 400 };
  const P3 = (o) => (P3cur = Object.assign({}, P3cur, o));
  // HTML labels pinned to anchors: id -> [anchor, dx, dy]
  const PIN = {
    c07_lA: ['aTop', 0, -62], c07_lws: ['ws', -300, -10], c07_ltmp: ['tray', 250, 40], c07_lplq: ['plaques', 390, -70],
    c07_lmach: ['aBase', 150, 70], c07_loff: ['aBase', 172, 70], c07_lB: ['bTop', 0, -40], c07_ltest: ['bTest', 230, -40],
    c07_shape: ['aBase', 0, 80], c07_fixed: ['bBase', 0, 80],
  };
  let T256 = 1e9;   // the 2D chip hands over to the 3D chip at T256 + 0.42 s (one chip at a time)
  F.hook((t) => {
    if (FILM.EL.c07_chip && t >= T256 + 0.42 && t < T256 + 3) FILM.EL.c07_chip.proxy.o = 0;
    const AN = window.ANCHORS;
    if (!AN) return;
    for (const id in PIN) {
      const e = FILM.EL[id], a = AN[PIN[id][0]];
      if (e && a) { e.proxy.x = a[0] + PIN[id][1]; e.proxy.y = a[1] + PIN[id][2]; }
    }
    // leader from the plaque label down to the plaques
    const L = FILM.EL.c07_lpll, a = AN.plaques, lb = FILM.EL.c07_lplq;
    if (L && a && lb) { Object.assign(L.proxy, { x: 960, y: 540, x1: lb.proxy.x - 225, y1: lb.proxy.y + 16, x2: a[0] + 6, y2: a[1] - 6 }); }
  });
  const lab = (html, o = {}) => Object.assign({ type: 'text', html: plate(html), size: 38, x: 960, y: 540, in: 'fade', z: 6 }, o);
  // an opaque plate: the header label sits clear above the case's rim and never shows the rim through it
  const oplate = (s) => `<span class="plate" style="background:#0E1116">${s}</span>`;

  // ================================================================ compositions
  // 238 (4) — OVER six stages draw as a track; container A waits below
  // the terminal from chapter 6 stays alive inside A (same pixels; chapter-local copies replace ch6's ids)
  const T2 = { x: 960, y: 600, w: 700, h: 430 };
  const TERM = {
    c07_tm: { type: 'box', ...T2, stroke: T.TEAL, fill: 'rgba(21,26,33,0.97)', sw: 2, rad: 12, html: '', z: 6, in: 'none', at: -0.17 },
    c07_tmh: { type: 'text', html: `${m('run_command', T.TEAL)}&ensp;bash in ${m('/workspace')}`, size: 30, align: 'left', ax: 0, x: T2.x - T2.w / 2 + 30, y: T2.y - T2.h / 2 + 36, z: 7, in: 'none', at: -0.17 },
    c07_tmp2: { type: 'mono', versions: ['<span class="c-dim">/workspace $</span>', '<span class="c-dim">/workspace $</span> <span style="background:#ECE9E2">&nbsp;</span>'], ver: 1, size: 30, ax: 0, x: T2.x - T2.w / 2 + 30, y: T2.y - 30, z: 7, in: 'none', at: -0.17 },
  };
  c(4, {
    ...K.rail(7),
    ...K.container('contA', 'A', A0),
    c06_tm: 'quick', c06_tmh: 'quick', c06_tmp2: 'quick', c06_tmc: 'down',
    ...TERM,
    c07_line: { type: 'rect', x: 960, y: SY, w: 1525, h: 3, fill: '#3A4654', in: 'grow', dur: 1.6, at: 0.2 },
    ...track,
  }, { clear: true, keep: ['rail', 'contA', 'contA_hd', 'contA_ht'], cam: { x: 960, y: 540, s: 1 }, drift: 0.7, sfx: STAGES.map((_, i) => ({ at: 0.4 + i * 0.28, kind: 'tick' })) });

  // 239 (2.5) — stage 1 compile: the bundle's YAML becomes an agent tree
  // container A keeps its identity: it folds INTO the stage-3 pill and stays there as its blue outline
  // (never fades away), until stage 3 unfolds it again (242)
  const toChip = (i) => ({
    contA: { x: SX(i), y: SY, w: 292, h: 72, rad: 36, o: 1, at: 0, dur: 1.05, ease: 'power3.inOut' },
    contA_hd: { x: SX(i), y: SY, w: 280, h: 56, o: 0, at: 0, dur: 0.8, ease: 'power3.inOut' }, contA_ht: { x: SX(i), y: SY, s: 0.4, o: 0, at: 0, dur: 0.6, ease: 'power3.in' },
    c07_tm: { x: SX(i), y: SY, w: 240, h: 50, o: 0, at: 0, dur: 0.85, ease: 'power3.inOut' },
    c07_tmh: { x: SX(i) - 100, y: SY, s: 0.3, o: 0, at: 0, dur: 0.6, ease: 'power3.in' },
    c07_tmp2: { x: SX(i) - 100, y: SY, s: 0.3, o: 0, at: 0, dur: 0.6, ease: 'power3.in' },
  });
  const YL = [
    `<span class="c-dim">model:</span> gemma-4-31b-it-qat-w4a16-ct`,
    `<span class="c-dim">instruction:</span> !include prompts/main.md`,
    `<span class="c-dim">tools:</span> [read_file, edit_file, …]`,
    `<span class="c-dim">sub_agents:</span> [localize, patch]`,
  ];
  c(2.5, {
    ...toChip(2), ...lightStage(0),
    ...K.file('c07_yaml', 'agent.yaml', YL, { x: 560, y: 600, w: 820, size: 29, frame: { at: 0.55 }, text: { at: 0.75 } }),
    c07_ytag: { type: 'text', html: cap('illustrative'), size: 24, color: T.DIM, align: 'right', ax: 1, x: 950, y: 395, in: 'fade', at: 0.6 },
    c07_yarr: { type: 'arrow', x1: 995, y1: 600, x2: 1120, y2: 600, color: T.DIM, sw: 4, head: 18, in: 'draw', at: 0.6 },
    c07_n0: { type: 'box', w: 300, h: 84, x: 1450, y: 440, stroke: T.BLUE, fill: 'rgba(88,196,221,0.10)', rad: 16, html: 'LlmAgent', size: 38, in: 'pop', at: 0.8 },
    c07_e1: { type: 'arrow', x1: 1410, y1: 485, x2: 1310, y2: 600, color: T.DIM, sw: 3, head: 14, in: 'draw', at: 1.0 },
    c07_e2: { type: 'arrow', x1: 1490, y1: 485, x2: 1590, y2: 600, color: T.DIM, sw: 3, head: 14, in: 'draw', at: 1.05 },
    c07_n1: { type: 'box', w: 260, h: 84, x: 1290, y: 650, stroke: T.BLUE, fill: 'rgba(88,196,221,0.10)', rad: 16, html: 'localize', size: 38, in: 'pop', at: 1.15 },
    c07_n2: { type: 'box', w: 260, h: 84, x: 1610, y: 650, stroke: T.BLUE, fill: 'rgba(88,196,221,0.10)', rad: 16, html: 'patch', size: 38, in: 'pop', at: 1.25 },
  }, { sfx: [{ at: 0.85, kind: 'pop' }] });
  // 240 (4.5) — "no Python entry points · every agent declares the same base model"
  c(4.5, {
    c07_tm: null, c07_tmh: null, c07_tmp2: null,
    c07_bm0: { type: 'text', html: cap('same base model', T.BLUE), size: 24, x: 1450, y: 510, in: 'rise', at: 1.2 },
    c07_bm1: { type: 'text', html: cap('same base model', T.BLUE), size: 24, x: 1290, y: 720, in: 'rise', at: 1.45 },
    c07_bm2: { type: 'text', html: cap('same base model', T.BLUE), size: 24, x: 1610, y: 720, in: 'rise', at: 1.7 },
    c07_cmp: { type: 'text', html: '<span class="c-red">no Python entry points</span>&ensp;·&ensp;every agent declares <span class="c-blue">the same base model</span>', size: 46, x: 960, y: 900, in: 'wipe', at: 0.3, dur: 1.3 },
  }, { sfx: [{ at: 1.25, kind: 'tick' }, { at: 1.5, kind: 'tick' }, { at: 1.75, kind: 'tick' }] });

  // 241 (2.5) — stage 2 serve: the slab and four cards from chapter 4
  const out1 = Object.fromEntries(['c07_yaml', 'c07_yaml_frame', 'c07_yaml_name', 'c07_ytag', 'c07_yarr', 'c07_n0', 'c07_n1', 'c07_n2', 'c07_e1', 'c07_e2', 'c07_bm0', 'c07_bm1', 'c07_bm2', 'c07_cmp'].map((k) => [k, 'left']));
  const cards = {};
  for (let i = 0; i < 4; i++) {
    cards['c07_cd' + i] = { type: 'rect', w: 120, h: 200, x: 960 + (i - 1.5) * 150, y: 660, fill: '#343B44', rad: 10, in: 'up', at: 0.3 + i * 0.1 };
    cards['c07_ce' + i] = { type: 'rect', w: 108, h: 8, x: 960 + (i - 1.5) * 150, y: 568, fill: T.BLUE, rad: 3, in: 'grow', at: 0.6 + i * 0.1, z: 2 };
  }
  c(2.5, {
    ...out1, ...lightStage(1),
    c07_slab: { type: 'rect', w: 580, h: 70, x: 960, y: 480, fill: 'rgba(88,196,221,0.85)', rad: 10, in: 'down', at: 0.2 },
    ...cards,
    c07_srv: { type: 'text', html: 'vLLM&ensp;·&ensp;4× L4&ensp;·&ensp;<span class="m">max_model_len</span> <span class="c-yellow">32,768</span>', size: 48, x: 960, y: 860, in: 'wipe', at: 0.7 },
  }, { cut: true });
  // 242 (4.5) — stage 3 prepare container A
  const out2 = Object.fromEntries(['c07_slab', 'c07_srv', ...Object.keys(cards)].map((k) => [k, 'fade']));
  const AP = { x: 960, y: 620, w: 1100, h: 620 };
  c(4.5, {
    ...out2, ...lightStage(2),
    // container A unfolds again out of the stage-3 pill it folded into
    ...(() => { const k = K.container('contA', 'A', AP); return { contA: { ...k.contA, o: 1, at: 0.05, dur: 1.0, ease: 'power3.out' }, contA_hd: { ...k.contA_hd, o: 1, at: 0.15, dur: 0.95, ease: 'power3.out' }, contA_ht: { ...k.contA_ht, s: 1, o: 1, at: 0.5, dur: 0.6, ease: 'power2.out' } }; })(),
    c07_p1: { type: 'text', html: '<span class="c-red">×</span>&ensp;no git history after <span class="m">base_commit</span>', size: 50, align: 'left', ax: 0, x: 560, y: 520, in: 'wipe', at: 0.9 },
    c07_p2: { type: 'text', html: '<span class="c-red">×</span>&ensp;network off', size: 50, align: 'left', ax: 0, x: 560, y: 640, in: 'wipe', at: 1.5 },
    c07_p3: { type: 'text', html: '<span class="c-green">✓</span>&ensp;dependencies preinstalled', size: 50, align: 'left', ax: 0, x: 560, y: 760, in: 'wipe', at: 2.1 },
  }, { cut: false });

  // 243 (3.5) — 3D container A as an architectural model on a plinth (camera 40°)
  const HDY = AP.y - AP.h / 2 + 30;
  const fold = (id, k) => ({ [id]: { x: 960 - 120, y: HDY, s: 0.3, o: 0, at: k * 0.06, dur: 0.5, ease: 'power3.in' } });
  c(3.5, {
    ...trackOut, ...fold('c07_p1', 0), ...fold('c07_p2', 1), ...fold('c07_p3', 2),
    // the 2D outline shrinks onto the 3D case's rim and is gone (its header first) before the model
    // fades in: the rim takes over the outline, nothing 2D is drawn over the 3D case
    contA: { ...SIL, o: 0, at: 0.1, dur: 0.75, ease: 'power2.inOut' },
    contA_hd: { x: SIL.x, y: SIL.y - SIL.h / 2 + 18, w: SIL.w - 7, h: 30, o: 0, at: 0.05, dur: 0.4, ease: 'power2.in' },
    contA_ht: { x: SIL.x, y: SIL.y - SIL.h / 2 + 18, s: 0.6, o: 0, at: 0.0, dur: 0.3, ease: 'power2.in' },
    c07_3d: { type: 'three', scene: 'containers', x: 960, y: 540, w: 1920, h: 1080, z: 1, in: 'fade', dur: 0.9, at: 0.7, params: P3({}), paramsFrom: { dist: P0.dist * 0.9, yaw: 0.38 }, pdur: 2.8, pease: 'power3.out' },
    c07_stg: { type: 'text', hud: true, versions: [3, 4, 5, 6].map((n) => cap(`stage ${n}&ensp;·&ensp;${STAGES[n - 1]}`)), ver: 0, size: 26, color: T.DIM, align: 'right', ax: 1, x: 1840, y: 66, in: 'fade', at: 0.6 },
    c07_lA: lab(cap('container A · offline sandbox', T.BLUE), { html: oplate(cap('container A · offline sandbox', T.BLUE)), size: 30, at: 1.6 }),
  }, { cut: true });
  // 244 (4.5) — the real parts light, with HTML labels
  c(4.5, {
    contA: null, contA_hd: null, contA_ht: null, c07_p1: null, c07_p2: null, c07_p3: null,
    c07_3d: { params: P3({ lit: 3, yaw: 0.55 }), pdur: 3.0, pease: 'power1.inOut' },
    c07_lws: lab(`${m('/workspace', T.BLUE)} <span class="c-dim">(the repository)</span>`, { at: 0.3 }),
    c07_ltmp: lab(`${m('/tmp')} <span class="c-dim">(scratch)</span>`, { at: 1.3 }),
    c07_lplq: lab(`${m('pytest.ini')} · ${m('conftest.py')}`, { at: 2.3 }),
    c07_lpll: { type: 'arrow', x1: 0, y1: 0, x2: 10, y2: 10, color: T.INK, sw: 2.5, head: 0, in: 'draw', dur: 0.6, at: 2.2, z: 5 },
  }, { sfx: [{ at: 0.3, kind: 'tick' }, { at: 1.3, kind: 'tick' }, { at: 2.3, kind: 'tick' }] });
  // 245 (4.5) — the machine
  c(4.5, {
    c07_3d: { params: P3({ yaw: 0.62, pitch: 42 }), pdur: 3.4, pease: 'sine.inOut' },
    c07_lmach: lab(`${m('python:3.13-slim')} · <span class="c-yellow">4</span> GiB RAM · <span class="c-yellow">2</span> vCPU ·`, { size: 40, align: 'right', ax: 1, at: 0.4 }),
    c07_loff: lab('<span class="c-red">offline</span>', { size: 40, align: 'left', ax: 0, at: 1.2 }),
  });
  // 246 (2.5) — reading beat: the camera pushes in on "offline"
  const PUSH = { dist: 12.2, ty: 1.0, tx: 0.35 }, PBACK = { dist: P0.dist, ty: P0.ty, tx: 0 };
  const dimLabels = (o) => Object.fromEntries(['c07_lws', 'c07_ltmp', 'c07_lplq', 'c07_lmach'].map((k) => [k, { o, dur: 0.6 }]));
  // the push is a slow continuous dolly of the 3D camera toward the base (the labels ride their anchors)
  c(2.5, { ...dimLabels(0.45), c07_lpll: { o: 0.45, dur: 0.6 }, c07_3d: { params: P3(PUSH), pdur: 1.875, pease: 'sine.inOut' }, c07_loff: { s: 1.2, dur: 1.4, ease: 'power3.out' } }, { drift: 0.4 });
  // 247 (4.5) — the plaques glow red: do not modify
  c(4.5, {
    ...dimLabels(1), c07_lpll: { o: 1, dur: 0.6, color: T.RED }, c07_lmach: 'fade', c07_loff: 'fade', c07_3d: { params: P3({ ...PBACK, plaqueGlow: 1 }), pdur: 2.4, pease: 'sine.inOut' },
    // the label stays bright ink on its plate; the red is an accent bar
    c07_lplq: { o: 1, dur: 0.6, html: `<span class="plate" style="border-left:6px solid #FC6255">${m('pytest.ini')} · ${m('conftest.py')}</span>` },
    c07_dnm: { type: 'text', html: plate('the harness commits these as the baseline — <span class="c-red">do not modify</span>'), size: 46, x: 960, y: 1000, in: 'wipe', at: 0.8, z: 8 },
  }, { cam: { x: 960, y: 540, s: 1 } });
  // 248 (2.5) — reading beat: underline "do not modify"
  F.beat(2.5, { id: 'c07_dnm', mode: 'underline', w: 300, dx: 410, under: 34, color: T.RED });

  // 249 (2) — stage 4: a 2D LOOP spins above the 3D case (camera 45°)
  const P4 = { pitch: 45, ty: 4.4, dist: 12.5, yaw: 0.5, tx: 0 };
  const LP = { cx: 960, cy: 560, r: 240, draw: 1, labels: 1, ring: 0, exit: 0, hi: -1, stopped: 0 };
  c(2, {
    c07_dnm: 'down', c07_lA: 'fade', c07_lws: 'fade', c07_ltmp: 'fade', c07_lplq: 'fade', c07_lpll: 'quick',
    c07_stg: { ver: 1 },
    c07_3d: { params: P3({ ...P4, plaqueGlow: 0, lit: 0, fileIn: 1 }), pdur: 1.5, pease: 'power2.inOut' },
    c07_loop: { type: 'canvas', draw: 'loop', x: 960, y: 300, s: 0.75, z: 5, in: 'fade', at: 0.2, params: { ...LP, dot: 1.2 }, paramsFrom: { dot: 0 }, pdur: 1.3, pease: 'none' },
  }, { cut: true });
  // 250 (2.5) — end conditions stack beside the case: submit_patch()
  const END = (n) => ({ type: 'text', size: 50, align: 'left', ax: 0, x: 1180, y: 470 + n * 130, in: 'left', at: 0.3 });
  c(2.5, {
    c07_3d: { params: P3({ tx: P4.tx + 2.3 }), pdur: 1.4, pease: 'power2.inOut' },
    c07_loop: { x: 660, params: { ...LP, dot: 2.5 }, pdur: 1.875, pease: 'none', dur: 1.2 },
    c07_endh: { type: 'text', html: cap('the loop ends on'), size: 28, color: T.DIM, align: 'left', ax: 0, x: 1180, y: 370, in: 'fade', at: 0.2 },
    c07_end0: { ...END(0), html: m('submit_patch()', T.GOLD), at: 0.5 },
  });
  // 251 (3) — budget exhausted
  c(3, { c07_loop: { params: { ...LP, dot: 4.0 }, pdur: 2.25, pease: 'none' }, c07_end1: { ...END(1), html: 'budget <span class="c-red">exhausted</span>' } });
  // 252 (4.5) — 3 turns in a row without a tool call; the loop stops
  c(4.5, {
    c07_loop: { params: { ...LP, dot: 4.97, stopped: 1, hi: 1, hiA: 0 }, pdur: 2.0, pease: 'power3.out' },
    c07_end2: { ...END(2), html: '<span class="c-yellow">3</span> turns in a row<br>without a tool call', lh: 1.15 },
  });

  // 253 (4.5) — stage 5 CLOSE: git add -N . && git diff HEAD types
  c(4.5, {
    c07_loop: 'fade', c07_endh: 'right', c07_end0: 'right', c07_end1: 'right', c07_end2: 'right',
    c07_stg: { ver: 2 },
    c07_3d: { o: 0.22, dur: 0.8, params: P3({ tx: 0, ty: P0.ty, dist: P0.dist, pitch: 40, yaw: 0.45 }), pdur: 2 },
    c07_gx: { type: 'mono', html: `<span class="c-dim">$</span> git add -N . &amp;&amp; git diff HEAD`, size: 64, x: 960, y: 380, in: 'wipe', at: 0.4, dur: 2.0, ease: 'none', z: 6 },
    c07_gxl: { type: 'text', html: cap('the harness, after the loop'), size: 28, color: T.DIM, x: 960, y: 290, in: 'fade', at: 0.3, z: 6 },
  }, { cut: true, sfx: [{ at: 0.45, kind: 'click' }] });
  // 254 (4.5) — the gold chip forms: taken even if the agent never submits
  c(4.5, {
    ...K.chip('c07_chip', { x: 960, y: 580, s: 1.6, at: 0.3, z: 6 }),
    c07_ev: { type: 'text', html: 'taken <span class="c-gold">even if the agent never submits</span>', size: 60, x: 960, y: 790, in: 'wipe', at: 1.3, z: 6 },
  }, { sfx: [{ at: 0.35, kind: 'pop' }] });
  // 255 (2.5) — reading beat: the sentence stays bright, the rest sinks to a third
  c(2.5, { c07_gx: { o: 0.33, dur: 0.6 }, c07_gxl: { o: 0.33, dur: 0.6 }, c07_chip: { o: 0.33, dur: 0.6 }, c07_ev: { s: 1.08, dur: 1.4, ease: 'expo.out' } }, { cam: { x: 960, y: 700, s: 1.12 }, drift: 0.4 });

  const P6 = { dist: 16.5, pitch: 42, yaw: 0.35, ty: 0.9, tx: 0 };
  const CHIP3D = { x: 903, y: 362 };   // the 3D chip's screen point when it appears (measured)
  T256 = F.now();
  // 256 (2) — stage 6 (camera 42°): container B rises on the same plinth; the chip arcs A → B
  c(2, {
    c07_gx: 'up', c07_gxl: 'up', c07_ev: 'down', c07_chip: { x: CHIP3D.x, y: CHIP3D.y, s: 0.22, o: 1, at: 0, dur: 0.42, ease: 'power3.inOut' },
    c07_stg: { ver: 3 },
    c07_3d: { o: 1, at: 0, dur: 0.45, params: P3({ two: 1, bIn: 1, chipArc: 1, ...P6 }), pdur: 1.5, pease: 'power2.inOut' },
  }, { cut: false, cam: { x: 960, y: 540, s: 1 } });
  // 257 (4.5) — B step 1: apply the patch
  const PB = { tx: 2.8, dist: 13, pitch: 42, yaw: 0.4, ty: 2.4 };
  const STEP = ['<span class="c-dim">step 1 ·</span> apply the patch', '<span class="c-dim">step 2 ·</span> reset any test files the hidden tests touch', '<span class="c-dim">step 3 ·</span> apply the hidden tests', '<span class="c-dim">step 4 ·</span> run pytest'];
  c(4.5, {
    c07_chip: null,
    c07_3d: { params: P3({ chipGone: 1, ...PB, testIn: 1 }), pdur: 2.4, pease: 'power3.inOut' },
    c07_lB: lab(cap('container B · fresh and clean', T.GREEN), { size: 30, at: 1.4 }),
    c07_step: { type: 'text', versions: STEP.map(plate), ver: 0, size: 48, x: 960, y: 990, in: 'wipe', at: 0.4, z: 8 },
  }, { sfx: [{ at: 1.6, kind: 'tick' }] });
  // 258 (4.5) — B step 2: an edited test file flips back
  c(4.5, {
    c07_step: { ver: 1, dur: 0.6 },
    c07_3d: { params: P3({ testFlip: 1 }), pdur: 1.6, pease: 'power2.inOut' },
    c07_ltest: lab(cap('editing tests is useless', T.RED), { size: 28, at: 1.6 }),
  }, { sfx: [{ at: 0.9, kind: 'click' }] });
  // 259 (2.5) — reading beat: underline "reset any test files"
  F.beat(2.5, { id: 'c07_step', mode: 'underline', w: 440, dx: -150, under: 34, color: T.INK });
  // 260 (4.5) — B step 3: grey bars drop in
  c(4.5, {
    c07_ltest: 'fade', c07_step: { ver: 2, dur: 0.6 },
    c07_3d: { params: P3({ bars: 1, yaw: 0.5 }), pdur: 2.2, pease: 'power2.out' },
    c07_lbars: lab(cap('hidden tests'), { size: 28, at: 1.8 }),
  }, { sfx: [0, 1, 2, 3, 4].map((i) => ({ at: 0.25 + i * 0.4, kind: 'tick' })) });
  PIN.c07_lbars = ['bBars', 240, -30];
  // 261 (4.5) — CLOSE B's terminal: the patch applies (up to four attempts), then pytest types
  const tries = {};
  for (let i = 0; i < 4; i++) tries['c07_try' + i] = { type: 'box', w: 90, h: 70, x: 1080 + i * 110, y: 430, stroke: T.GREEN, fill: i === 0 ? 'rgba(131,193,103,0.35)' : 'rgba(131,193,103,0.0)', rad: 12, html: String(i + 1), size: 34, in: 'pop', at: 0.6 + i * 0.12, z: 7, o: i === 0 ? 1 : 0.5 };
  c(4.5, {
    c07_lB: 'fade', c07_lbars: 'fade',
    c07_3d: { o: 0.22, dur: 0.6 },
    c07_term: { type: 'box', w: 1400, h: 520, x: 960, y: 540, stroke: T.GREEN, fill: 'rgba(21,26,33,0.97)', rad: 18, html: '', in: 'scale', at: 0.1, z: 6 },
    c07_tl1: { type: 'text', html: 'apply the patch: up to <span class="c-yellow">4</span> attempts', size: 46, align: 'left', ax: 0, x: 330, y: 430, in: 'wipe', at: 0.4, z: 7 },
    ...tries,
    c07_tl2: { type: 'mono', html: '<span class="c-dim">$</span> python3 -m pytest &lt;targets&gt; -q', size: 50, ax: 0, x: 330, y: 600, in: 'wipe', at: 1.6, dur: 1.6, ease: 'none', z: 7 },
    c07_ttag: { type: 'text', html: cap('illustrative'), size: 24, color: T.DIM, align: 'right', ax: 1, x: 1620, y: 330, in: 'fade', at: 0.6, z: 7 },
  }, { cut: false, sfx: [{ at: 0.65, kind: 'tick' }, { at: 1.65, kind: 'click' }] });
  // 262 (4.5) — B step 4: run pytest; B's rim turns green, exit 0 → resolved
  const outT = Object.fromEntries(['c07_term', 'c07_tl1', 'c07_tl2', 'c07_ttag', ...Object.keys(tries)].map((k) => [k, 'fade']));
  c(4.5, {
    ...outT,
    c07_step: { ver: 3, dur: 0.6 },
    c07_3d: { o: 1, dur: 0.6, params: P3({ pass: 1, verdict: 1, tx: 3.9, yaw: 0.42, dist: 13.4 }), pdur: 2.4, pease: 'power2.inOut' },
    c07_ok: { type: 'text', html: '<span class="m c-green">exit 0</span> → <span class="c-green">resolved</span>', size: 64, align: 'left', ax: 0, x: 1250, y: 380, in: 'wipe', at: 1.6 },
  }, { cut: true, sfx: [0, 1, 2, 3, 4].map((i) => ({ at: 0.6 + i * 0.3, kind: 'click' })) });
  const GH = { x: 1520, y: 660 };
  // 263 (4.5) — a red ghost beside it: anything else → not resolved
  c(4.5, {
    c07_ghost: { type: 'box', w: 460, h: 330, x: GH.x, y: GH.y, stroke: T.RED, fill: 'rgba(252,98,85,0.06)', rad: 26, sw: 3, html: '', in: 'draw', at: 0.3 },
    c07_ghd: { type: 'rect', x: GH.x, y: GH.y - 165 + 30, w: 453, h: 56, fill: 'rgba(252,98,85,0.16)', rad: 22, in: 'fade', at: 0.8 },
    c07_gh1: { type: 'text', html: '<span class="c-red">anything else</span>', size: 46, x: GH.x, y: GH.y - 10, in: 'wipe', at: 0.9 },
    c07_no: { type: 'text', html: '→ <span class="c-red">not resolved</span>', size: 46, x: GH.x, y: GH.y + 80, in: 'wipe', at: 1.4 },
  });
  const PW = { tx: 0, dist: 17, pitch: 38, yaw: 0.3, ty: 0.9 };
  const FLAT = { tx: 0, dist: 20, pitch: 89.5, yaw: 0, ty: 0.5 };
  const FA = { x: 650, y: 538, w: 416, h: 296 }, FB = { x: 1270, y: 538, w: 416, h: 296 };   // top-view rims (measured)
  // 264 (3.5) — 3D wide (camera 38°): A and B on one plinth
  c(3.5, {
    c07_ok: 'fade', c07_ghost: 'fade', c07_ghd: 'fade', c07_gh1: 'fade', c07_no: 'fade', c07_step: 'down',
    c07_3d: { params: P3(PW), pdur: 2.4, pease: 'power3.inOut' },
  }, { cut: true });
  // 265 (4.5) — you shape A; the organizers fix B. Then the scene flattens: the camera rises to a
  // top-down view, and 2D outlines take over the two rims
  const BIG = { x: 960, y: 580, w: 1820, h: 860 };
  c(4.5, {
    c07_3d: { params: P3(FLAT), at: 0.5, pdur: 2.85, pease: 'sine.inOut' },
    c07_shape: lab('you shape <span class="c-blue">what happens here</span>', { size: 46, at: 0.4 }),
    c07_fixed: lab('<span class="c-green">fixed</span> by the organizers', { size: 46, at: 1.3 }),
    contA: { ...K.container('contA', 'A', FA).contA, html: '', in: 'fade', at: 2.75, dur: 0.6, ease: 'power2.out' },
    c07_fb: { ...K.container('c07_fb', 'B', FB).c07_fb, html: '', in: 'fade', at: 2.75, dur: 0.6, ease: 'power2.out' },
  });

  // 266–268 — FULL habits, entering from alternating sides; A's flat outline opens into a frame around them
  const HAB = [
    ['scratch to <span id="c07k0" class="m c-blue">/tmp</span>', 'left', 340],
    ['never touch <span id="c07k1" class="m">pytest.ini</span> or <span id="c07k2" class="m">conftest.py</span>', 'right', 560],
    ["don't edit <span id=\"c07k3\" class=\"c-green\">tests</span>", 'left', 780],
  ];
  // underline spans (x centre, width) of the key words, measured in the browser
  const KW = [[[1150, 176]], [[883, 440], [1462, 484]], [[1147, 169]]];
  const KC = [T.BLUE, T.DIM, T.GREEN];
  const bigA = K.container('contA', 'A', BIG);
  HAB.forEach(([html, side, y], i) => {
    const d = { ['c07_h' + i]: { type: 'text', html, size: 84, x: 960, y, in: side, z: 4 } };
    KW[i].forEach(([x, w], j) => { d['c07_hr' + i + j] = { type: 'rect', x, y: y + 52, w, h: 5, rad: 3, fill: KC[i], in: 'grow', at: 1.3 + j * 0.25, dur: 1.2 }; });
    if (i === 0) {
      Object.assign(d, {
        c07_3d: 'quick', c07_shape: 'fade', c07_fixed: 'fade', c07_stg: 'fade', c07_fb: 'right',
        contA: { ...bigA.contA, o: 0.45, at: 0.15, dur: 1.2, ease: 'power3.inOut' },
        contA_hd: { ...bigA.contA_hd, o: 0.45, at: 0.9, dur: 0.8 }, contA_ht: { ...bigA.contA_ht, o: 0.6, at: 1.1, dur: 0.8 },
      });
    }
    if (i > 0) Object.assign(d, { ['c07_h' + (i - 1)]: { o: 0.55, dur: 1.0, at: 0.3 } });
    if (i === 2) Object.assign(d, { c07_h0: { o: 0.55 }, contA: { o: 1, at: 2.0, dur: 1.2 }, contA_hd: { o: 1, at: 2.2, dur: 1.0 }, contA_ht: { o: 1, at: 2.3, dur: 1.0 } });
    c(4.5, d, i === 0 ? { cut: true } : {});
  });
  // 269 (2) — the words fall into container A, which shrinks into the centre panel; the side panels start
  const HR = KW.flatMap((ws, i) => ws.map((_, j) => 'c07_hr' + i + j));
  const fall = Object.fromEntries([0, 1, 2].map((i) => ['c07_h' + i, { x: 960, y: 620, s: 0.25, o: 0, dur: 1.0, ease: 'power3.in', at: i * 0.08 }]).concat(HR.map((k) => [k, { x: 960, y: 620, w: 0, o: 0, dur: 0.6, ease: 'power3.in' }])));
  const side = (x, at) => ({ type: 'box', w: 610, h: 760, x, y: 560, stroke: '#56616D', fill: 'rgba(21,26,33,0.5)', rad: 22, sw: 2.5, html: '', z: 0, in: 'fade', from: { x: 960, o: 0 }, dur: 4.25, ease: 'power1.inOut', at });
  const A8 = K.container('contA', 'A', { x: 960, y: 560, w: 620, h: 760 });
  c(2, { ...fall, contA: { ...A8.contA, at: 0, dur: 1.1 }, contA_hd: { ...A8.contA_hd, at: 0, dur: 1.1 }, contA_ht: { ...A8.contA_ht, at: 0.05, dur: 1.1 }, c07_pl: side(325, 0.5), c07_pr: side(1595, 0.58) }, { cam: { x: 960, y: 540, s: 1 }, drift: 0 });
  // 270 (4.5) — the side panels finish sliding out from behind A, their headers write in; the RAIL rewrites to 08
  c(4.5, {
    ...Object.fromEntries([0, 1, 2].map((i) => ['c07_h' + i, null]).concat(HR.map((k) => [k, null]))),
    c07_plh: { type: 'text', html: cap('call log'), size: 26, color: T.DIM, x: 325, y: 208, in: 'wipe', at: 1.9, dur: 1.2 },
    c07_prh: { type: 'text', html: cap('meters'), size: 26, color: T.DIM, x: 1595, y: 208, in: 'wipe', at: 2.1, dur: 1.2 },
    rail: { ver: 8, at: 2.3, dur: 1.0 },
  }, { cam: { x: 960, y: 540, s: 1 }, drift: 0 });
})();
