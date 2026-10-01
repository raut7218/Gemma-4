// Chapter 0 — Cold open (storyboard v5, 108 beats).
(function () {
  const { T } = F;
  const c = F.comp.bind(F);
  F.chapter('Cold open');

  // ---- geometry
  const CODE_X = 1300, CODE_Y = 540, SZ = 34, LINE_H = SZ * 1.5, NLINES = 8;
  const lineY = (n) => CODE_Y - (NLINES * LINE_H) / 2 + LINE_H * (n - 0.5);
  const CODE = ['def mean(xs):', '    return sum(xs) / len(xs)', '', 'def summarize(xs):', '    total = sum(xs)', '    return total / len(xs)', '', '    # … 52 more lines'];
  const CODE_GAP = CODE.slice(); CODE_GAP[5] = '';
  const BOX = { x: 1300, y: 530, w: 760, h: 800 };
  const GRID = { cols: 12, rows: 10, cw: 112, ch: 64, gap: 14 };
  const GOLD = 55, GY = 500;
  const [gx, gy] = DRAW.gridCell(GOLD, { w: 1920, h: 1080 }, GRID, 960, GY);
  const P = (o) => Object.assign({}, GRID, { reveal: 1, gold: GOLD, goldGlow: 1, ring: 1, dim: 0, sweep: 0, split: 0, lock: 0 }, o);

  // 1 (4.5) — frame one: a finished issue card, close
  c(4.5, { ...K.issue('issue', { x: 960, y: 540, in: 'fade', from: { o: 1, s: 0.94 }, dur: 3.2, ease: 'power2.out' }),
    errLine: { type: 'rect', x: 1241, y: 563, w: 462, h: 5, fill: T.RED, rad: 2, in: 'grow', from: { w: 0 }, at: 0.05, dur: 1.6, ease: 'power3.out', z: 3 },
  }, { cam: { x: 960, y: 540, s: 1.5 } });
  // 2 (3) — the issue steps left
  c(3, { errLine: 'quick', issue: { x: 430, y: 540, s: 0.58 } }, { cam: { x: 960, y: 540, s: 1 } });
  // 3 (2) — the repository: code panel sweeps in from the right, with a scrollbar
  c(2, {
    ...K.code('code', CODE, { x: CODE_X, y: CODE_Y, w: 940, size: SZ, title: 'src/stats.py', variants: [CODE_GAP], in: 'right', textIn: 'right' }),
    scroll: { type: 'rect', x: CODE_X + 452, y: CODE_Y - 120, w: 8, h: 150, fill: '#3A4654', rad: 4, in: 'fade', at: 0.5 },
  });
  // 4 (4.5) — close on the bug
  c(4.5, {
    issue: 'left',
    hl: { type: 'rect', x: CODE_X, y: lineY(6), w: 900, h: LINE_H + 8, fill: 'rgba(252,98,85,0.16)', rad: 8, in: 'grow', z: 2 },
    tick: { type: 'rect', x: CODE_X - 474, y: lineY(6), w: 9, h: LINE_H, fill: T.RED, rad: 3, in: 'growh', z: 3, at: 0.25 },
    bug: { type: 'text', html: '<span class="cap" style="font-size:1em">the bug</span>', size: 26, color: T.RED, x: CODE_X + 330, y: lineY(6), in: 'left', at: 0.45 },
  }, { cam: { x: 1270, y: 600, s: 1.5 }, sfx: [{ at: 0.3, kind: 'tick' }] });
  // 5 (4.5) — the line splits: the removed line rises in red
  c(3.5, {
    bug: 'fade',
    code: { ver: 1, o: 0.3 },
    hl: { y: lineY(6.5), h: LINE_H * 2 + 16, w: 920, fill: 'rgba(240,172,95,0.07)' },
    tick: { y: lineY(6.5), h: LINE_H * 2 + 8, fill: T.GOLD },
    del: { type: 'mono', html: '<span class="del">-   return total / len(xs)</span>', size: SZ, align: 'left', ax: 0, x: CODE_X - 420, y: lineY(6), z: 4, in: 'fade', from: { y: lineY(6) + 12, o: 1 }, dur: 1.2, ease: 'power3.inOut', at: 0.3 },
  }, { cam: { x: 1290, y: 600, s: 1.5 } });
  // 6 (4.5) — the added line drops in, in gold
  c(3.5, {
    add: { type: 'mono', html: '<span style="color:#F0AC5F">+   return total / len(xs) if xs else 0</span>', size: SZ, align: 'left', ax: 0, x: CODE_X - 420, y: lineY(7), z: 4, in: 'fade', from: { y: lineY(7) - 14, o: 0 }, dur: 1.2, ease: 'power3.out', at: 0.15 },
  }, { cam: { x: 1310, y: 610, s: 1.52 } });
  // 7 (2.5) — [SIG1] the diff folds into the gold chip
  c(2.5, {
    code: 'fade', code_frame: 'fade', code_title: 'quick', scroll: 'quick', hl: 'quick', tick: 'quick',
    del: { x: 960 - 150, y: 540, s: 0.25, o: 0, dur: 0.7, ease: 'power3.in' },
    add: { x: 960 - 150, y: 540, s: 0.25, o: 0, dur: 0.7, ease: 'power3.in' },
    ...K.chip('chip', { x: 960, y: 540, s: 2.3, at: 0.5 }),
  }, { cam: { x: 960, y: 540, s: 1 }, sfx: [{ at: 0.55, kind: 'pop' }] });
  // 8 (4) — container B draws; the chip settles into its top
  c(4, {
    del: null, add: null,
    chip: { x: BOX.x, y: BOX.y - BOX.h / 2 + 140, s: 1.25, at: 0.3, dur: 1.1, ease: 'expo.inOut' },
    ...K.container('contB', 'B', { x: BOX.x, y: BOX.y, w: BOX.w, h: BOX.h, head: 'fresh container' }),
  }, { cut: true });
  // 9 (4) — big type enters from the left
  c(4, { lead: { type: 'text', versions: ['The fix is judged<br>somewhere else.', 'Tests written by the<br>original developers.', 'Never shown<br>to the agent.'], ver: 0, size: 76, align: 'left', ax: 0, x: 130, y: 530, lh: 1.15, in: 'left' } });
  // 10 (2) — hidden tests drop in
  const bars = {};
  for (let i = 0; i < 6; i++) bars['tb' + i] = { type: 'rect', x: BOX.x, y: BOX.y - 30 + i * 62, w: 580, h: 38, fill: '#3A4452', rad: 7, in: 'down', at: 0.07 * i, z: 2 };
  c(2, { ...bars });
  // 11 (4) — the left type rolls to its next line; label over the bars
  c(4, { lead: { ver: 1 }, tLabel: { type: 'text', html: 'hidden tests', size: 40, color: T.DIM, x: BOX.x, y: BOX.y - 92, in: 'rise' } });
  // 12 (2.5) — pytest types, then the bars turn green one by one
  const green = {};
  for (let i = 0; i < 6; i++) green['tb' + i] = { fill: T.GREEN, at: 0.55 + 0.22 * i, dur: 0.3, ease: 'power2.out' };
  c(2.5, {
    py: { type: 'mono', versions: ['<span class="c-dim">$</span> pytest', '<span class="c-dim">$</span> pytest&ensp;<span class="c-green">→ exit 0</span>'], ver: 0, size: 46, x: BOX.x, y: BOX.y + BOX.h / 2 - 70, in: 'wipe', dur: 0.5 },
    ...green,
  }, { sfx: [0, 1, 2, 3, 4, 5].map((i) => ({ at: 0.6 + 0.22 * i, kind: 'click' })) });
  // 13 (4) — "Never shown to the agent."
  c(3, { lead: { ver: 2 } });
  // 14 (4) — exit 0 completes and swells
  c(4, { py: { ver: 1, s: 1.14 } }, { sfx: [{ at: 0.3, kind: 'pop' }] });
  // 15 (4) — exit 0 comes to the front and fills the frame; B falls back
  c(4, {
    chip: 'zoom', contB: 'zoom', contB_hd: 'quick', contB_ht: 'quick', tLabel: 'quick', lead: 'left',
    ...Object.fromEntries(Object.keys(bars).map((k) => [k, 'zoom'])),
    py: null,
    exit0: { type: 'mono', html: '<span class="c-green">exit 0</span>', size: 210, x: 960, y: 450, in: 'zoom', from: { x: BOX.x + 110, y: BOX.y + BOX.h / 2 - 70, s: 0.3, o: 1 }, dur: 1.1, ease: 'expo.inOut' },
    resolved: { type: 'text', html: '= <span class="c-green">resolved</span>', size: 100, x: 960, y: 700, in: 'wipe', at: 0.9 },
  }, { cut: true });
  // 16 (2.5) — reading beat on "exit 0 = resolved"
  F.beat(2.5, { id: 'exit0', mode: 'push', dy: 120 });
  // 17 (3) — the grid blooms behind; the verdict shrinks toward its cell
  c(3, {
    exit0: { x: gx, y: gy, s: 0.07, o: 0, dur: 1.0, ease: 'power3.inOut', at: 0.6 },
    resolved: { x: gx, y: gy + 30, s: 0.1, o: 0, dur: 0.9, ease: 'power3.inOut', at: 0.6 },
    grid: { type: 'canvas', draw: 'grid', x: 960, y: GY, in: 'fade', dur: 0.01, params: P({ goldGlow: 0, ring: 0 }), paramsFrom: { reveal: 0 }, pdur: 2.0, pease: 'power2.out' },
  }, { cut: true, cam: { x: 960, y: 540, s: 1 } });
  // 18 (2) — the verdict lands: gold patch inside, green ring around it [SIG1 ends]
  c(2, { exit0: null, resolved: null, grid: { params: P({ goldGlow: 1, ring: 1 }), pdur: 0.9 } }, { sfx: [{ at: 0.3, kind: 'tick' }] });
  // 19 (4.5) — the scale, and the twist: every cell locks
  c(4.5, {
    gLabel: { type: 'text', versions: ['<span class="plate">≈120 hidden tasks&ensp;·&ensp;<span class="c-dim">from private repositories</span></span>', '<span class="plate">each cell is <span class="c-yellow">one full run</span>: issue → <span class="c-gold">patch</span> → <span class="c-green">verdict</span></span>'], ver: 0, size: 48, x: 960, y: 985, in: 'up' },
    grid: { params: P({ lock: 1 }), pdur: 2.6, pease: 'power2.inOut' },
  });
  // 20 (2.5) — reading beat: underline "≈120 hidden tasks"
  F.beat(2.5, { id: 'gLabel', mode: 'underline', w: 330, dx: -205, under: 34, color: T.YELLOW });
  // 21 (4) — every cell is the whole loop: the glyph sweeps every row
  c(3, { gLabel: { ver: 1 }, grid: { params: P({ lock: 1, sweep: 1.6 }), pdur: 3.0, pease: 'none' } });
  // 22 (4.5) — the title over the dimmed grid
  c(4.5, {
    gLabel: 'down',
    grid: { params: P({ lock: 1, sweep: 1.6, dim: 0.92, goldGlow: 0 }), pdur: 1.2 },
    kicker: { type: 'text', html: '<span class="cap" style="font-size:1em">Google&ensp;·&ensp;Kaggle&ensp;·&ensp;2026</span>', size: 30, color: T.DIM, x: 960, y: 330, in: 'fade', at: 0.3 },
    title: { type: 'text', html: 'The <span class="c-blue">Gemma 4</span> Developer Agent<br>Competition', size: 112, lh: 1.12, x: 960, y: 500, in: 'wipe', dur: 1.3 },
  }, { cut: true });
  // 23–25 — three constraints, entering from alternating sides
  c(4, { kicker: 'quick', title: 'zoom', oneopen: { type: 'text', html: 'One open model.', size: 120, x: 960, y: 330, in: 'left', at: 0.25 } });
  c(3.5, { k2: { type: 'text', html: 'Real <span class="c-gold">bugs</span>.', size: 120, x: 960, y: 520, in: 'right' } });
  c(3.5, { k3: { type: 'text', html: 'No <span class="c-red">internet</span>.', size: 120, x: 960, y: 710, in: 'left' } });
  // 26 (3) — the organizers' goal, line 1
  const Q1 = '“Post-train an open model into a reliable agent that navigates complex codebases';
  const Q1c = '“<span class="c-purple">Post-train an open model</span> into a reliable agent that navigates complex codebases';
  const Q2c = 'and <span class="c-gold">drafts fixes</span> for real software issues, accelerating developer workflows on everyday hardware.”';
  c(3, {
    oneopen: 'right', k2: 'left', k3: 'right',
    qk: { type: 'text', html: '<span class="cap" style="font-size:1em">the organizers’ goal</span>', size: 28, color: T.DIM, x: 960, y: 300, in: 'fade', at: 0.3 },
    q1: { type: 'text', versions: [Q1, Q1c], size: 60, lh: 1.3, maxw: 1500, x: 960, y: 450, in: 'wipe', dur: 1.5, at: 0.25 },
  }, { cut: true });
  // 27 (4.5) — line 2; the two verbs warm to their colours as it lands
  c(4.5, { q1: { ver: 1, at: 1.4, dur: 0.8 }, q2: { type: 'text', html: Q2c, size: 60, lh: 1.3, maxw: 1500, x: 960, y: 660, in: 'wipe', dur: 1.6 } });
  // 28 (4.5) — the deadline
  c(4.5, {
    qk: 'up', q1: 'up', q2: 'up',
    dk: { type: 'text', html: '<span class="cap" style="font-size:1em">final submission&ensp;·&ensp;23:59 UTC</span>', size: 30, color: T.DIM, x: 960, y: 410, in: 'fade', at: 0.35 },
    date: { type: 'text', html: '2 December <span class="c-red">2026</span>', size: 150, x: 960, y: 540, in: 'wipe', dur: 1.2, at: 0.2 },
  }, { cut: true });
  // 29 (2.5) — reading beat on the date
  F.beat(2.5, { id: 'date', mode: 'push' });
  // 30 (3) — a vertical rail of 17 ticks down the left third
  const ticks = {};
  for (let k = 1; k <= 17; k++) ticks['tk' + k] = { type: 'rect', x: 330, y: 170 + (k - 1) * 46, w: k === 1 ? 46 : 28, h: 5, rad: 3, fill: k === 1 ? T.INK : '#56616D', in: 'grow', at: 0.04 * k };
  c(3, {
    dk: 'quick', date: 'zoom',
    grid: { params: P({ lock: 1, sweep: 1.6, dim: 0.97, goldGlow: 0 }), pdur: 1.0 },
    tline: { type: 'rect', x: 330, y: 170 + 8 * 46, w: 3, h: 16 * 46, fill: '#3A4654', in: 'growh' },
    ...ticks,
  }, { cut: true, cam: { x: 960, y: 540, s: 1 } });
  // 31 (4.5) — "17 chapters · 24 minutes"; only tick 01 carries its name
  c(4.5, {
    count: { type: 'text', html: '<span class="c-yellow">17</span> chapters&ensp;·&ensp;<span class="c-yellow">24</span> minutes', size: 76, align: 'left', ax: 0, x: 560, y: 520, in: 'wipe' },
    ix1: { type: 'text', html: '<span class="cap c-dim" style="font-size:0.78em">01</span>&ensp;The task', size: 40, align: 'left', ax: 0, x: 380, y: 170, in: 'right' },
  });
  // 32 (2) — tick 01 and its name glide to the top-left and become the RAIL tag at its exact pixels
  const fade = {};
  for (let k = 2; k <= 17; k++) fade['tk' + k] = 'fade';
  c(2, {
    ...fade, tline: 'fade', count: 'left', grid: 'fade',
    tk1: { x: 66, y: 66, w: 0, o: 0, dur: 0.9, ease: 'expo.inOut' },
    ix1: { x: 96, y: 66, size: 27, color: T.DIM, dur: 0.9, ease: 'expo.inOut' },
  }, { cam: { x: 960, y: 540, s: 1 }, drift: 0 });
})();
