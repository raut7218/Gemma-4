// Chapter 3 — Rules, dates, prizes (storyboard rows 99–115, 70 beats).
(function () {
  const { T } = F;
  const c = F.comp.bind(F);
  F.chapter(K.CH[3]);
  const C0 = FILM.COMPS.length;

  // ---- calendar geometry (hand-off from chapter 2)
  const CALP = { x: 210, y: 560, w: 1500, draw: 1, dot: -1 };
  const CAL = { type: 'canvas', draw: 'calendar', x: 960, y: 540, spans: [], params: CALP };
  const X = (d, m) => DRAW.calX(CALP, Date.UTC(2026, m - 1, d));
  const xSep = X(23, 9), xNov12 = X(12, 11), xNov25 = X(25, 11), xDec2 = X(2, 12);
  const CY = CALP.y;

  // a pin = a head dot + a stem between the head and the strip; above (up) or below the strip
  const pin = (id, x, headY, o = {}) => {
    const top = Math.min(headY, CY), bot = Math.max(headY, CY);
    return {
      [id + '_st']: { type: 'rect', x, y: headY < CY ? CY - 4 : CY + 4, ay: headY < CY ? 1 : 0, w: 4, h: bot - top - 4, fill: o.color || T.INK, rad: 2, in: 'growh', at: (o.at || 0) + 0.25, dur: 0.7 },
      [id + '_hd']: { type: 'dot', x, y: headY, rad: 13, fill: o.color || T.INK, in: 'down', at: o.at || 0, dur: 0.8, ease: 'expo.out' },
    };
  };

  // the calendar as a thick band: an opaque 60 px strip drawn UNDER the shared DRAW.calendar at the same
  // pixels; identical to chapter 2's DRAW.c02_calband so the 2→3 cut is invisible. `sheen` 0..1 sweeps a highlight.
  DRAW.c03_calband = (ctx, p) => {
    const { clamp, rr } = DRAW.util, rgba = DRAW.rgba;
    const x = p.x ?? 210, y = p.y ?? 560, w = p.w ?? 1500, dr = clamp(p.draw ?? 1), H = 60;
    if (dr <= 0) return;
    const day = (d, m) => DRAW.calX(p, Date.UTC(2026, m - 1, d));
    const bx = x - 14, bw = Math.max(24, (w + 28) * dr);
    ctx.save(); ctx.globalAlpha *= clamp(p.a ?? 1);
    ctx.save(); rr(ctx, bx, y - H / 2, bw, H, 12); ctx.clip();
    [[bx, day(1, 10), '#161D25'], [day(1, 10), day(1, 11), '#1D2530'], [day(1, 11), day(1, 12), '#161D25'], [day(1, 12), x + w + 14, '#1D2530']]
      .forEach(([a, b, col]) => { ctx.fillStyle = col; ctx.fillRect(a, y - H / 2, b - a, H); });
    const sh = clamp(p.sheen || 0);
    if (sh > 0 && sh < 1) {
      const sx = bx + (w + 28) * sh, g = ctx.createLinearGradient(sx - 160, 0, sx + 160, 0);
      const al = 0.16 * Math.sin(Math.PI * sh);
      g.addColorStop(0, rgba(T.INK, 0)); g.addColorStop(0.5, rgba(T.INK, al)); g.addColorStop(1, rgba(T.INK, 0));
      ctx.fillStyle = g; ctx.fillRect(sx - 160, y - H / 2, 320, H);
    }
    ctx.restore();
    rr(ctx, bx, y - H / 2, bw, H, 12); ctx.strokeStyle = '#3A4654'; ctx.lineWidth = 2.5; ctx.stroke();
    [['October', day(1, 10), day(1, 11)], ['November', day(1, 11), day(1, 12)]].forEach(([s, a, b]) => {
      const k = clamp((bx + bw - (a + b) / 2) / 160);
      if (k > 0) DRAW.text(ctx, s, (a + b) / 2, y - 54, { size: 34, color: T.DIM, a: k });
    });
    ctx.restore();
  };

  // shading of the two windows of time (chapter-local drawing over the calendar strip)
  DRAW.c03_shade = (ctx, p) => {
    const y = CY, h = 60, { ease, clamp, rr } = DRAW.util;
    const a = clamp(p.a || 0), b = clamp(p.b || 0);
    if (a > 0) { ctx.fillStyle = DRAW.rgba(T.INK, 0.16); rr(ctx, xSep, y - h / 2, (xNov12 - xSep) * ease(a), h, 6); ctx.fill(); }
    if (b > 0) { ctx.fillStyle = DRAW.rgba(T.RED, 0.34); rr(ctx, xNov12, y - h / 2, (xDec2 - xNov12) * ease(b), h, 6); ctx.fill(); }
  };

  // 99 (4.5) — WIDE calendar strip; a pin drops at "23 Sep · start"
  c(4.5, {
    ...K.rail(3),
    calendar: CAL,
    c02_band: 'quick',
    c03_band: { type: 'canvas', draw: 'c03_calband', x: 960, y: 540, z: 0, in: 'none', at: -0.17, params: { ...CALP, sheen: 1 }, paramsFrom: { sheen: 0 }, pdur: 3.2, pease: 'power1.inOut' },
    ...pin('c03_p1', xSep, 400, { at: 0 }),
    c03_l1: { type: 'text', html: '<b>23 Sep</b>&ensp;<span class="c-dim">·</span>&ensp;start', size: 52, align: 'left', ax: 0, x: xSep - 30, y: 340, in: 'wipe', at: 0.5 },
    c03_utc: { type: 'text', html: '<span class="cap" style="font-size:1em">all deadlines 23:59 UTC</span>', size: 30, color: T.DIM, x: 960, y: 940, in: 'fade', at: 1.4 },
  }, { clear: true, cam: { x: 960, y: 540, s: 1 }, drift: 0.6, animateFirst: true, sfx: [{ at: 0.2, kind: 'tick' }] });

  // 100 (4.5) — pin "12 Nov · paper track deadline"
  c(4.5, {
    ...pin('c03_p2', xNov12, 300, { at: 0.2 }),
    c03_l2: { type: 'text', html: '<b>12 Nov</b>&ensp;<span class="c-dim">·</span>&ensp;paper track deadline', size: 52, align: 'right', ax: 1, x: xNov12 + 30, y: 240, in: 'wipe', at: 0.8 },
  }, { cam: { x: 980, y: 530, s: 1.02 }, sfx: [{ at: 0.4, kind: 'tick' }] });

  // 101 (4.5) — pin "25 Nov · entry and team-merger deadline" (below), then "2 Dec · final submission"
  c(4.5, {
    ...pin('c03_p3', xNov25, 690, { at: 0.2 }),
    c03_l3: { type: 'text', html: '<b>25 Nov</b>&ensp;<span class="c-dim">·</span>&ensp;entry and team-merger deadline', size: 48, align: 'right', ax: 1, x: xNov25 - 34, y: 690, in: 'wipe', at: 0.7 },
    ...pin('c03_p4', xDec2, 810, { at: 1.8, color: T.RED }),
    c03_l4: { type: 'text', html: '<b>2 Dec</b>&ensp;<span class="c-dim">·</span>&ensp;final submission', size: 56, align: 'right', ax: 1, x: xDec2 - 34, y: 810, in: 'wipe', at: 2.3 },
  }, { cam: { x: 990, y: 560, s: 1.0 }, sfx: [{ at: 0.4, kind: 'tick' }, { at: 2.0, kind: 'tick' }] });

  // 102 (2.5) — reading beat: underline "2 Dec · final submission"
  F.beat(2.5, { id: 'c03_l4', mode: 'underline', w: 560, dx: -290, under: 40, color: T.RED });

  // 103 (4.5) — the two windows shade; a dot travels the whole span
  c(4.5, {
    c03_l1: 'fade', c03_l2: 'fade', c03_l3: 'fade', c03_l4: 'fade',
    c03_p1_st: 'fade', c03_p1_hd: 'fade', c03_p2_st: 'fade', c03_p2_hd: 'fade', c03_p3_st: 'fade', c03_p3_hd: 'fade', c03_p4_st: 'fade', c03_p4_hd: 'fade',
    c03_shade: { type: 'canvas', draw: 'c03_shade', x: 960, y: 540, in: 'fade', dur: 0.01, params: { a: 1, b: 1 }, paramsFrom: { a: 0, b: 0 }, pdur: 2.2, pease: 'power2.inOut', z: 0 },
    c03_s1: { type: 'text', html: '23 Sep → 12 Nov: <span class="c-ink">paper window</span>', size: 46, color: T.DIM, x: (xSep + xNov12) / 2, y: 436, in: 'wipe', at: 0.4 },
    c03_s2: { type: 'text', html: '12 Nov → 2 Dec: <span class="c-red">final push</span>', size: 46, color: T.DIM, x: (xNov12 + xDec2) / 2 - 40, y: 660, in: 'wipe', at: 1.3 },
    calendar: { params: { ...CALP, dot: 1 }, pdur: 3.3, pease: 'power1.inOut' },
  }, { cam: { x: 960, y: 560, s: 1.05 } });

  // 104 (4.5) — the strip rises away; the first plinth rises: "1st place · $37k"
  const BASE = 900;
  const plinth = (id, x, w, h, at) => ({ [id]: { type: 'box', x, y: BASE, ax: 0.5, ay: 1, w, h, stroke: '#4A5664', fill: 'rgba(33,40,49,0.96)', sw: 2.5, rad: 14, html: '', in: 'growh', at, dur: 1.2 } });
  c(4.5, {
    calendar: 'up', c03_band: 'up', c03_shade: 'up', c03_s1: 'up', c03_s2: 'up', c03_utc: 'fade',
    c03_floor: { type: 'rect', x: 960, y: BASE + 3, w: 1700, h: 4, fill: '#3A4654', rad: 2, in: 'grow', at: 0.2 },
    ...plinth('c03_pl1', 960, 440, 470, 0.45),
    c03_pl1k: { type: 'text', html: '<span class="cap" style="font-size:1em">1st place</span>', size: 30, color: T.DIM, x: 960, y: BASE - 470 + 70, in: 'fade', at: 1.3 },
    c03_pl1v: { type: 'num', val: 37, pre: '$', suf: 'k', size: 120, color: T.YELLOW, x: 960, y: BASE - 470 + 175, in: 'pop', at: 1.3 },
  }, { cut: true, cam: { x: 960, y: 560, s: 1 }, sfx: [{ at: 1.3, kind: 'pop' }] });

  // 105 (4.5) — two flanking plinths: 2nd $18k left, 3rd $10k right
  c(4.5, {
    ...plinth('c03_pl2', 470, 400, 330, 0.2),
    c03_pl2k: { type: 'text', html: '<span class="cap" style="font-size:1em">2nd</span>', size: 30, color: T.DIM, x: 470, y: BASE - 330 + 64, in: 'fade', at: 0.9 },
    c03_pl2v: { type: 'num', val: 18, pre: '$', suf: 'k', size: 100, color: T.YELLOW, x: 470, y: BASE - 330 + 160, in: 'pop', at: 0.9 },
    ...plinth('c03_pl3', 1450, 400, 240, 0.7),
    c03_pl3k: { type: 'text', html: '<span class="cap" style="font-size:1em">3rd</span>', size: 30, color: T.DIM, x: 1450, y: BASE - 240 + 60, in: 'fade', at: 1.4 },
    c03_pl3v: { type: 'num', val: 10, pre: '$', suf: 'k', size: 96, color: T.YELLOW, x: 1450, y: BASE - 240 + 150, in: 'pop', at: 1.4 },
  }, { cam: { x: 960, y: 580, s: 1.02 }, sfx: [{ at: 0.9, kind: 'pop' }, { at: 1.4, kind: 'pop' }] });

  // 106 (4.5) — a separate plinth slides in apart: the Paper Track
  c(4.5, {
    c03_gap: { type: 'rect', x: 1745, y: BASE - 200, w: 4, h: 420, fill: '#3A4654', rad: 2, in: 'growh', at: 0.3 },
    c03_pp: { type: 'box', x: 2120, y: BASE, ax: 0.5, ay: 1, w: 560, h: 520, stroke: T.PURPLE, fill: 'rgba(180,142,219,0.08)', sw: 3, rad: 16, html: '', in: 'right', at: 0.2 },
    c03_ppk: { type: 'text', html: '<span class="cap" style="font-size:1em">Paper Track</span>', size: 32, color: T.PURPLE, x: 2120, y: BASE - 520 + 70, in: 'fade', at: 0.9 },
    c03_ppv: { type: 'text', html: '<span class="c-dim" style="font-size:0.5em">reported as</span><br><span class="c-yellow">$35k</span>', size: 110, lh: 1.0, x: 2120, y: BASE - 520 + 215, in: 'fade', at: 1.1 },
    c03_pps: { type: 'text', html: 'separate pool<br><span class="c-dim">deadline</span> 12 Nov', size: 50, lh: 1.3, x: 2120, y: BASE - 520 + 400, in: 'wipe', at: 1.6 },
  }, { cam: { x: 1240, y: 600, s: 0.8 } });

  // 107 (4.5) — FULL: the obligation, two lines from opposite sides
  const sink = (ids) => Object.fromEntries(ids.map((k) => [k, 'down']));
  c(4.5, {
    ...sink(['c03_pl1', 'c03_pl1k', 'c03_pl1v', 'c03_pl2', 'c03_pl2k', 'c03_pl2v', 'c03_pl3', 'c03_pl3k', 'c03_pl3v', 'c03_pp', 'c03_ppk', 'c03_ppv', 'c03_pps', 'c03_gap', 'c03_floor']),
    c03_o1: { type: 'text', html: 'Winners <span class="c-gold">open-source their code and adapters</span>', size: 74, x: 960, y: 460, in: 'left', at: 0.3 },
    c03_o2: { type: 'text', html: 'and provide a reproducible write-up.', size: 74, x: 960, y: 600, in: 'right', at: 0.9 },
  }, { cut: true, cam: { x: 960, y: 540, s: 1 } });

  // 108 (2.5) — reading beat: "open-source their code and adapters" stays bright, the rest sinks to a third
  c(2.5, { c03_o1: { s: 1.06, y: 480 }, c03_o2: { o: 0.33, y: 620 } }, { cam: { x: 1000, y: 500, s: 1.12 }, drift: 0.4 });

  // 109 (4.5) — WIDE: a rule token drops: "1 submission a day"
  const ICON_CAL = '<svg width="96" height="96" viewBox="0 0 96 96"><rect x="10" y="18" width="76" height="66" rx="10" fill="none" stroke="#9AA3AD" stroke-width="5"/><line x1="10" y1="38" x2="86" y2="38" stroke="#9AA3AD" stroke-width="5"/><line x1="30" y1="10" x2="30" y2="26" stroke="#9AA3AD" stroke-width="5" stroke-linecap="round"/><line x1="66" y1="10" x2="66" y2="26" stroke="#9AA3AD" stroke-width="5" stroke-linecap="round"/><path d="M30 60 l12 12 l24 -24" fill="none" stroke="#F4D35E" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const flag = (c1) => `<svg width="60" height="96" viewBox="0 0 60 96"><line x1="10" y1="8" x2="10" y2="90" stroke="#9AA3AD" stroke-width="5" stroke-linecap="round"/><path d="M12 10 L54 22 L12 36 Z" fill="${c1}"/></svg>`;
  const ICON_FLAGS = flag('#F4D35E') + '&ensp;' + flag('#F4D35E');
  const fig = '<svg width="34" height="80" viewBox="0 0 34 80"><circle cx="17" cy="14" r="11" fill="#ECE9E2"/><path d="M3 76 L3 44 Q3 30 17 30 Q31 30 31 44 L31 76 Z" fill="#ECE9E2"/></svg>';
  const ICON_TEAM = Array(5).fill(fig).join('&nbsp;');
  const token = (id, x, icon, text, at) => ({ [id]: { type: 'box', x, y: 540, w: 420, h: 420, rad: 210, stroke: '#4A5664', fill: 'rgba(27,33,41,0.97)', sw: 3, size: 48, lh: 1.15, html: `<div style="margin-bottom:18px">${icon}</div>${text}`, in: 'down', at, dur: 1.0, ease: 'back.out(1.3)' } });
  c(4.5, {
    c03_o1: 'up', c03_o2: 'up',
    ...token('c03_t1', 420, ICON_CAL, '<span class="c-yellow">1</span> submission<br>a day', 0.35),
  }, { cut: true, cam: { x: 960, y: 540, s: 1 }, sfx: [{ at: 0.75, kind: 'pop' }] });

  // 110 (4) — the second token: "2 final selections"
  c(4, { ...token('c03_t2', 960, ICON_FLAGS, '<span class="c-yellow">2</span> final<br>selections', 0.25) }, { sfx: [{ at: 0.65, kind: 'pop' }] });

  // 111 (4.5) — the third token: "teams of up to 5"
  c(4.5, { ...token('c03_t3', 1500, ICON_TEAM, 'teams of<br>up to <span class="c-yellow">5</span>', 0.25) }, { sfx: [{ at: 0.65, kind: 'pop' }] });

  // 112 (3.5) — "2 final selections" opens: a row of past submissions, two get flagged
  const subs = {};
  const PICK = [3, 7];
  for (let i = 0; i < 10; i++) {
    subs['c03_sb' + i] = { type: 'box', x: 285 + i * 150, y: 690, w: 120, h: 150, stroke: '#4A5664', fill: 'rgba(27,33,41,0.97)', sw: 2.5, rad: 12, size: 26, html: `<span class="cap c-dim" style="font-size:1em">${i + 1}</span>`, in: 'rise', at: 0.15 + 0.06 * i };
  }
  const flagsUp = {};
  PICK.forEach((i, k) => {
    flagsUp['c03_hl' + k] = { type: 'box', x: 285 + i * 150, y: 690, w: 132, h: 162, stroke: T.YELLOW, fill: 'rgba(244,211,94,0.06)', sw: 4, rad: 14, html: '', in: 'draw', at: 1.4 + 0.35 * k, dur: 0.5, z: 3 };
    flagsUp['c03_fl' + k] = { type: 'text', html: flag('#F4D35E'), size: 40, x: 285 + i * 150 + 8, y: 560, in: 'pop', at: 1.4 + 0.35 * k };
  });
  c(3.5, {
    c03_t1: { o: 0.3, s: 0.62, x: 420, y: 300 }, c03_t3: { o: 0.3, s: 0.62, x: 1500, y: 300 },
    c03_t2: { s: 0.62, y: 300 },
    c03_subs: { type: 'text', html: '<span class="cap" style="font-size:1em">your daily submissions · you pick two to count</span>', size: 26, color: T.DIM, x: 960, y: 830, in: 'fade', at: 0.6 },
    ...subs, ...flagsUp,
  }, { cam: { x: 960, y: 540, s: 1 }, sfx: [{ at: 1.45, kind: 'click' }, { at: 1.8, kind: 'click' }] });

  // 113 (4.5) — the tokens slide left; a gate: external data and models allowed
  const rowOut = Object.fromEntries(Object.keys(subs).map((k) => [k, 'left']));
  const G1 = { l: 560, r: 860, top: 380, bot: 800 };
  const gatePath = (g) => `M${g.l},${g.bot} L${g.l},${g.top} L${g.r},${g.top} L${g.r},${g.bot}`;
  const data = {};
  for (let i = 0; i < 4; i++) {
    data['c03_d' + i] = { type: 'box', x: 1120 + (i % 2) * 40, y: 520 + i * 70, w: 170, h: 54, stroke: '#6F7883', fill: 'rgba(111,120,131,0.18)', sw: 2, rad: 8, size: 24, html: '<span class="cap c-dim" style="font-size:1em">data</span>', in: 'fade', from: { x: 180 - i * 60 }, at: 0.5 + 0.28 * i, dur: 2.4, ease: 'power2.inOut' };
  }
  c(4.5, {
    c03_t1: 'left', c03_t2: 'left', c03_t3: 'left', c03_subs: 'left', c03_fl0: 'left', c03_fl1: 'left', c03_hl0: 'left', c03_hl1: 'left', ...rowOut,
    c03_g1: { type: 'path', d: gatePath(G1), fill: 'rgba(0,0,0,0)', sw: 8, color: T.GREEN, in: 'draw', dur: 0.9 },
    c03_g1t: { type: 'text', html: 'external data and models: <span class="c-green">allowed</span><br><span class="c-dim">if freely accessible to all</span>', size: 52, lh: 1.25, x: 960, y: 220, in: 'wipe', at: 0.3 },
    ...data,
  }, { cut: true, cam: { x: 960, y: 540, s: 1 } });

  // 114 (4.5) — a smaller second gate with a question mark: distillation from proprietary APIs
  const G2 = { l: 1420, r: 1640, top: 520, bot: 800 };
  c(4.5, {
    c03_g2: { type: 'path', d: gatePath(G2), fill: 'rgba(0,0,0,0)', sw: 6, color: T.YELLOW, in: 'draw', dur: 0.8 },
    c03_q: { type: 'text', html: '?', size: 150, color: T.YELLOW, x: (G2.l + G2.r) / 2, y: 650, in: 'pop', at: 0.7 },
    c03_d3: { x: 1290, y: 730, at: 0.9, dur: 1.6, ease: 'power3.out' },
    c03_g2t: { type: 'text', html: 'distillation from proprietary APIs:<br><span class="c-yellow">an open question at launch</span>', size: 46, lh: 1.25, x: 1300, y: 920, in: 'wipe', at: 0.9 },
  }, { cam: { x: 960, y: 560, s: 0.96 }, sfx: [{ at: 0.8, kind: 'tick' }] });

  // 115 (3.5) — "One open model." re-enters from the left exactly as in the cold open; a blue block thickens behind it
  c(3.5, {
    c03_g1: 'undraw', c03_g2: 'undraw', c03_q: 'quick', c03_g1t: 'up', c03_g2t: 'down',
    c03_d0: 'right', c03_d1: 'right', c03_d2: 'right', c03_d3: 'right',
    c03_blk: { type: 'rect', x: 960, y: 540, w: 1060, h: 210, rad: 18, fill: 'rgba(88,196,221,0.22)', in: 'grow', at: 1.1, dur: 1.4, ease: 'power3.inOut', z: 0 },
    oneopen: { type: 'text', html: 'One open model.', size: 120, x: 960, y: 540, color: T.INK, in: 'left', at: 0.25 },
    rail: { ver: 4, at: 1.4, dur: 0.8 },
  }, { cut: true, cam: { x: 960, y: 540, s: 1 }, drift: 0 });

  // Engine workaround: a named exit ('fade', 'up', …) copies the element's previous state, including a
  // stale entry `at`/`dur`; when the element was carried (not entering) in that composition, the stale
  // `at` re-morphs it back to visible after its exit. Clear those timing fields on carried states.
  for (let k = C0 + 1; k < FILM.COMPS.length; k++) {
    const cur = FILM.COMPS[k].els, before = FILM.COMPS[k - 1].els;
    for (const id in cur) if (cur[id] && cur[id].out && before[id]) cur[id] = Object.assign({}, cur[id], { at: undefined, dur: undefined, ease: undefined });
  }
})();
