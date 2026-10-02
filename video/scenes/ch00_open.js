// Chapter 0 — Cold open (storyboard v5, 108 beats).
(function () {
  const { T } = F;
  const c = F.comp.bind(F);
  F.chapter('Cold open');

  // ---- geometry
  const CODE_X = 1300, CODE_Y = 580, SZ = 34, LINE_H = SZ * 1.5, NLINES = 8;
  const lineY = (n) => CODE_Y - (NLINES * LINE_H) / 2 + LINE_H * (n - 0.5);
  const CODE = ['def mean(xs):', '    return sum(xs) / len(xs)', '', 'def summarize(xs):', '    total = sum(xs)', '    return total / len(xs)', '', '    # … 52 more lines'];
  const CODE_GAP = CODE.slice(); CODE_GAP[5] = '';
  const BOX = { x: 1300, y: 530, w: 760, h: 800 };
  const GRID = { cols: 12, rows: 10, cw: 112, ch: 64, gap: 14 };
  const GOLD = 55, GY = 500;
  const [gx, gy] = DRAW.gridCell(GOLD, { w: 1920, h: 1080 }, GRID, 960, GY);
  const P = (o) => Object.assign({}, GRID, { reveal: 1, gold: GOLD, goldA: 1, goldGlow: 1, ring: 1, dim: 0, sweep: 0, split: 0, lock: 0 }, o);

  // 1 (4.5) — frame one: a finished issue card, close
  c(4.5, { ...K.issue('issue', { x: 960, y: 540, in: 'fade', from: { o: 1, s: 0.94 }, dur: 3.2, ease: 'power2.out' }),
    errLine: { type: 'rect', x: 1241, y: 563, w: 462, h: 5, fill: T.RED, rad: 2, in: 'grow', from: { w: 0 }, at: 0.05, dur: 1.6, ease: 'power3.out', z: 3 },
  }, { cam: { x: 960, y: 540, s: 1.5 } });
  // 2 (3) — the issue steps left while the repository sweeps in from the right (overlapping)
  c(3, {
    errLine: 'quick', issue: { x: 400, y: 540, s: 0.5, dur: 0.9, ease: 'power3.inOut' },
    ...K.code('code', CODE, { x: CODE_X, y: CODE_Y, w: 940, size: SZ, title: 'src/stats.py', variants: [CODE_GAP], in: 'right', textIn: 'right', at: 0.45 }),
    scroll: { type: 'rect', x: CODE_X + 452, y: CODE_Y - 120, w: 8, h: 150, fill: '#3A4654', rad: 4, in: 'fade', at: 0.9 },
  }, { cam: { x: 960, y: 560, s: 1 } });
  // 3 (4.5) — close on the bug
  c(4.5, {
    issue: 'left',
    hl: { type: 'rect', x: CODE_X, y: lineY(6), w: 900, h: LINE_H + 8, fill: 'rgba(252,98,85,0.16)', rad: 8, in: 'grow', z: 2 },
    tick: { type: 'rect', x: CODE_X - 474, y: lineY(6), w: 9, h: LINE_H, fill: T.RED, rad: 3, in: 'growh', z: 3, at: 0.25 },
    bug: { type: 'text', html: '<span class="cap" style="font-size:1em">the bug</span>', size: 26, color: T.RED, x: CODE_X + 375, y: lineY(6), in: 'right', at: 0.45 },
  }, { cam: { x: 1270, y: 598, s: 1.5 }, sfx: [{ at: 0.3, kind: 'tick' }] });
  // 4 (4) — the line splits: the removed line rises in red
  c(4, {
    bug: 'fade',
    code: { ver: 1, o: 0.3 },
    hl: { y: lineY(6.5), h: LINE_H * 2 + 16, w: 920, fill: 'rgba(240,172,95,0.07)' },
    tick: { y: lineY(6.5), h: LINE_H * 2 + 8, fill: T.GOLD },
    del: { type: 'mono', html: '<span class="del">-   return total / len(xs)</span>', size: SZ, align: 'left', ax: 0, x: CODE_X - 420, y: lineY(6), z: 4, in: 'fade', from: { y: lineY(6) + 12, o: 1 }, dur: 1.2, ease: 'power3.inOut', at: 0.3 },
  }, { cam: { x: 1290, y: 601, s: 1.5 } });
  // 5 (3.5) — the added line drops in, in gold
  c(3.5, {
    add: { type: 'mono', html: '<span style="color:#F0AC5F">+   return total / len(xs) if xs else 0</span>', size: SZ, align: 'left', ax: 0, x: CODE_X - 420, y: lineY(7), z: 4, in: 'fade', from: { y: lineY(7) - 14, o: 0 }, dur: 1.2, ease: 'power3.out', at: 0.15 },
  }, { cam: { x: 1310, y: 606, s: 1.52 } });
  // 6 (3) — [SIG1] the two diff lines collapse into the gold chip, which grows out of them on the same pixels
  const FX = CODE_X - 60, FY = lineY(6.5);
  c(3, {
    code: 'fade', code_frame: 'fade', code_title: 'quick', scroll: 'quick', tick: 'quick',
    hl: { x: FX, w: 330 * 1.6, h: 96 * 1.6, rad: 26, fill: 'rgba(240,172,95,0.10)', dur: 0.7, ease: 'power3.inOut', at: 0.1 },
    del: { x: FX - 130, y: FY, s: 0.5, o: 0, dur: 0.75, ease: 'power3.inOut', at: 0.05 },
    add: { x: FX - 130, y: FY, s: 0.5, o: 0, dur: 0.75, ease: 'power3.inOut', at: 0.05 },
    ...K.chip('chip', { x: FX, y: FY, s: 1.6, in: 'scale', from: { s: 0.55, o: 0.2 }, at: 0.45, dur: 0.9, ease: 'expo.out' }),
  }, { cam: { x: FX, y: FY, s: 1.35 }, sfx: [{ at: 0.6, kind: 'pop' }] });
  // 7 (3) — container B draws around it; the chip settles into its top; the hidden tests drop in
  const bars = {};
  for (let i = 0; i < 6; i++) bars['tb' + i] = { type: 'rect', x: BOX.x, y: BOX.y - 30 + i * 62, w: 580, h: 38, fill: '#3A4452', rad: 7, in: 'down', at: 1.3 + 0.07 * i, z: 2 };
  c(3, {
    hl: 'quick', del: null, add: null,
    chip: { x: BOX.x, y: BOX.y - BOX.h / 2 + 140, s: 1.25, at: 0.1, dur: 1.1, ease: 'expo.inOut' },
    ...K.container('contB', 'B', { x: BOX.x, y: BOX.y, w: BOX.w, h: BOX.h, head: 'fresh container' }),
    ill: { type: 'text', html: '<span class="cap" style="font-size:1em">illustrative</span>', size: 24, color: T.DIM, x: BOX.x + BOX.w / 2 - 24, ax: 1, y: BOX.y + BOX.h / 2 - 26, in: 'fade', at: 0.8, z: 6 },
    ...bars,
  }, { cam: { x: 960, y: 540, s: 1 } });
  // 8 (3) — big type enters from the left; label over the bars
  c(3, {
    lead: { type: 'text', versions: ['The fix is judged<br>somewhere else.', 'Tests written by the<br>original developers.', 'Never shown<br>to the agent.'], ver: 0, size: 76, align: 'left', ax: 0, x: 130, y: 530, lh: 1.15, in: 'left' },
    tLabel: { type: 'text', html: 'hidden tests', size: 40, color: T.DIM, x: BOX.x, y: BOX.y - 92, in: 'rise', at: 0.5 },
  });
  // 9 (3) — the left type rolls to its next line
  c(3, { lead: { ver: 1 }, tLabel: { color: T.INK, at: 0.3 } }, { cam: { x: 1120, y: 560, s: 1.16 } });
  // 10 (3) — "Never shown to the agent."
  c(4, { lead: { ver: 2 }, tLabel: { color: T.DIM, at: 0.3 } }, { cam: { x: 880, y: 535, s: 1.12 } });
  // 11 (3) — CLOSE on B: pytest types, the bars turn green one by one
  const green = {};
  for (let i = 0; i < 6; i++) green['tb' + i] = { fill: T.GREEN, at: 0.75 + 0.2 * i, dur: 0.3, ease: 'power2.out' };
  c(3, {
    lead: 'left',
    py: { type: 'mono', html: '<span class="c-dim">$</span> pytest', size: 46, x: BOX.x - 120, y: BOX.y + BOX.h / 2 - 70, in: 'wipe', dur: 0.5, at: 0.3 },
    ...green,
  }, { cam: { x: BOX.x, y: BOX.y + 20, s: 1.28 }, sfx: [0, 1, 2, 3, 4, 5].map((i) => ({ at: 0.8 + 0.2 * i, kind: 'click' })) });
  // 12 (3) — the verdict prints beside pytest
  const EX0 = { x: BOX.x + 130, y: BOX.y + BOX.h / 2 - 70 };
  c(3, {
    exit0: { type: 'mono', html: '<span class="c-green">exit 0</span>', size: 300, s: 46 / 300, x: EX0.x, y: EX0.y, in: 'wipe', dur: 0.5, at: 0.2, z: 8 },
  }, { cam: { x: BOX.x, y: BOX.y + 40, s: 1.34 }, sfx: [{ at: 0.3, kind: 'pop' }] });
  // 13 (4.5) — exit 0 comes to the front and fills the frame; everything else falls away
  const away = {};
  ['chip', 'contB', 'contB_hd', 'contB_ht', 'tLabel', 'ill', 'py', ...Object.keys(bars)].forEach((k) => (away[k] = 'quick'));
  c(4.5, {
    ...away,
    exit0: { x: 960, y: 440, s: 1.72, dur: 1.4, ease: 'expo.inOut', at: 0.05 },
    resolved: { type: 'text', html: '= <span class="c-green">resolved</span>', size: 100, x: 960, y: 860, in: 'wipe', at: 1.3 },
  }, { cut: true, cam: { x: 960, y: 540, s: 1 } });
  // 14 (2.5) — reading beat on "= resolved"
  F.beat(2.5, { id: 'resolved', mode: 'underline', w: 480, under: 64, color: T.GREEN });
  // 15 (3) — the grid blooms behind; the verdict shrinks into its cell
  c(3, {
    resolved: 'quick',
    exit0: { x: gx, y: gy, s: 0.025, dur: 1.1, ease: 'power3.inOut', at: 0.15 },
    grid: { type: 'canvas', draw: 'grid', x: 960, y: GY, in: 'fade', dur: 0.01, params: P({ goldA: 0, goldGlow: 0, ring: 0 }), paramsFrom: { reveal: 0 }, pdur: 2.0, pease: 'power2.out' },
  }, { cut: true });
  // 16 (2) — the verdict lands: the cell turns gold (the patch), a green ring around it [SIG1 ends]
  c(2, { exit0: null, grid: { params: P({ goldGlow: 1, ring: 1 }), pdur: 0.9 } }, { sfx: [{ at: 0.05, kind: 'tick' }] });
  // 17 (4) — the scale
  c(4, {
    gLabel: { type: 'text', versions: ['<span class="plate">≈120 hidden tasks&ensp;·&ensp;<span class="c-dim">from private repositories</span></span>', '<span class="plate">every cell <span class="c-dim">locked: its tests stay hidden</span></span>', '<span class="plate">each cell is <span class="c-yellow">one full run</span>: issue → <span class="c-gold">patch</span> → <span class="c-green">verdict</span></span>'], ver: 0, size: 48, x: 960, y: 935, in: 'up' },
  });
  // 18 (2.5) — reading beat: underline "≈120 hidden tasks"
  F.beat(2.5, { id: 'gLabel', mode: 'underline', w: 330, dx: -205, under: 34, color: T.YELLOW });
  // 19 (3) — the twist: every cell locks
  c(3, { gLabel: { ver: 1 }, grid: { params: P({ lock: 1 }), pdur: 2.0, pease: 'power2.inOut' } }, { sfx: [{ at: 0.4, kind: 'tick' }] });
  // 20 (3) — every cell is the whole loop: the glyph sweeps every row
  c(3, { gLabel: { ver: 2 }, grid: { params: P({ lock: 1, sweep: 1.6 }), pdur: 2.25, pease: 'none' } });
  // 21 (4.5) — the grid dims first, then the title writes over it
  c(4.5, {
    gLabel: 'down',
    grid: { params: P({ lock: 1, sweep: 1.6, dim: 0.93, goldGlow: 0 }), pdur: 0.55, pease: 'power2.out' },
    kicker: { type: 'text', html: '<span class="cap" style="font-size:1em">Google&ensp;·&ensp;Kaggle&ensp;·&ensp;2026</span>', size: 30, color: T.DIM, x: 960, y: 330, in: 'fade', at: 0.6 },
    title: { type: 'text', html: 'The <span class="c-blue">Gemma 4</span> Developer Agent<br>Competition', size: 112, lh: 1.12, x: 960, y: 500, in: 'wipe', dur: 1.3, at: 0.6 },
  }, { cut: true });
  // 22–24 — three constraints, entering from alternating sides (the title leaves toward the camera first)
  c(4, { kicker: 'quick', title: { s: 1.45, o: 0, dur: 1.2, ease: 'power2.in' }, oneopen: { type: 'text', html: 'One open model.', size: 120, x: 960, y: 330, in: 'left', at: 0.8 } });
  c(4, { title: null, k2: { type: 'text', html: 'Real <span class="c-red">bugs</span>.', size: 120, x: 960, y: 520, in: 'right' } });
  c(4, { k3: { type: 'text', html: 'No <span class="c-red">internet</span>.', size: 120, x: 960, y: 710, in: 'left' } });
  // 25 (3.5) — the organizers' goal, line 1 (the grid leaves: no type over the lock pattern)
  const Q1 = '“Post-train an open model into a reliable agent that navigates complex codebases';
  const Q1c = '“<span class="c-purple">Post-train an open model</span> into a reliable agent that navigates complex codebases';
  const Q2c = 'and <span class="c-gold">drafts fixes</span> for real software issues, accelerating developer workflows on everyday hardware.”';
  c(3.5, {
    oneopen: 'right', k2: 'left', k3: 'right', grid: 'fade',
    qk: { type: 'text', html: '<span class="cap" style="font-size:1em">the organizers’ goal</span>', size: 28, color: T.DIM, x: 960, y: 300, in: 'fade', at: 0.3 },
    q1: { type: 'text', versions: [Q1, Q1c], size: 60, lh: 1.3, maxw: 1500, x: 960, y: 450, in: 'wipe', dur: 1.5, at: 0.25 },
  }, { cut: true });
  // 26 (4.5) — line 2; the two verbs warm to their colours as it lands
  c(4.5, { q1: { ver: 1, at: 1.4, dur: 0.8 }, q2: { type: 'text', html: Q2c, size: 60, lh: 1.3, maxw: 1500, x: 960, y: 660, in: 'wipe', dur: 1.6 } });
  // 27 (4.5) — the deadline
  c(4.5, {
    qk: 'up', q1: 'up', q2: 'up',
    dk: { type: 'text', html: '<span class="cap" style="font-size:1em">final submission&ensp;·&ensp;23:59 UTC</span>', size: 30, color: T.DIM, x: 960, y: 410, in: 'fade', at: 0.35 },
    date: { type: 'text', html: '2 December 2026', size: 150, x: 960, y: 540, in: 'wipe', dur: 1.2, at: 0.2 },
  }, { cut: true });
  // 28 (3) — reading beat on the date
  F.beat(2.5, { id: 'date', mode: 'push' });
  // 29 (3.5) — a vertical rail of 17 ticks down the left third
  const ticks = {};
  for (let k = 1; k <= 17; k++) ticks['tk' + k] = { type: 'rect', x: 330, y: 170 + (k - 1) * 46, w: k === 1 ? 46 : 28, h: 5, rad: 3, fill: k === 1 ? T.INK : '#56616D', in: 'grow', at: 0.04 * k };
  c(3.5, {
    dk: 'quick', date: 'zoom',
    tline: { type: 'rect', x: 330, y: 170 + 8 * 46, w: 3, h: 16 * 46, fill: '#3A4654', in: 'growh' },
    ...ticks,
  }, { cut: true, cam: { x: 960, y: 540, s: 1 } });
  // 30 (4.5) — "17 chapters · 24 minutes"; tick 01 carries its name — this name IS the rail tag
  c(4.5, {
    count: { type: 'text', html: '<span class="c-yellow">17</span> chapters&ensp;·&ensp;<span class="c-yellow">24</span> minutes', size: 92, align: 'left', ax: 0, x: 560, y: 520, in: 'wipe' },
    ...K.rail(1, { x: 380, y: 170, size: 40, in: 'right' }),
  });
  // 31 (2.5) — tick 01's name glides to the top-left and settles at the rail's exact pixels
  const fade = {};
  for (let k = 2; k <= 17; k++) fade['tk' + k] = 'fade';
  c(2.5, {
    // the count line recedes across the whole comp (slides left, shrinks, fades out exactly at the cut), so the
    // second after the rail tag lands is not frozen
    ...fade, tline: 'fade',
    count: { x: 470, y: 512, s: 0.9, o: 0, dur: 1.85, ease: 'power2.in' },
    tk1: { x: 66, y: 66, w: 0, o: 0, dur: 0.9, ease: 'expo.inOut' },
    rail: { x: 96, y: 66, size: 27, dur: 0.9, ease: 'expo.inOut' },
  }, { cam: { x: 960, y: 540, s: 1 }, drift: 0 });
})();
