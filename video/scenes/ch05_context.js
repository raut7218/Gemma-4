// Chapter 5 — The 32k context window (storyboard rows 165–202, 125 beats).
(function () {
  const { T } = F;
  const c = F.comp.bind(F);
  F.chapter(K.CH[5]);
  const { clamp, ease, rr } = DRAW.util;
  const S = DRAW.TAPE, X0 = 160, TW = 1600, PX = TW / S.TOTAL, TY = 540;
  const tx = (tok) => X0 + tok * PX;

  // ---- the TAPE (hand-off from chapter 4); params accumulate
  const H = { x: X0, y: TY, w: TW, h: 86, first: 0, n: 0, ticks: 0, sliver: 1, crack: 0 };
  let TP = Object.assign({ think: 0, short: 0, edgeGlow: 0, a: 1 }, H);
  const tp = (o, extra = {}) => { TP = Object.assign({}, TP, o); return Object.assign({ params: TP }, extra); };

  // ---- chapter-local drawings
  // braces under the tape: spec.braces = [[x0, x1, label, colour]]; params k0, k1, … (0..1)
  DRAW.c05_brace = (ctx, p, sp) => {
    (sp.braces || []).forEach((b, i) => {
      const k = clamp(p['k' + i] ?? 0); if (k <= 0) return;
      const [a, z, label, col] = b, y = sp.by || 606, m = (a + z) / 2;
      const pts = [[a + 2, y], [a + 10, y + 14], [m - 12, y + 14], [m, y + 28], [m + 12, y + 14], [z - 10, y + 14], [z - 2, y]];
      DRAW.polyline(ctx, pts, k, { color: col || T.INK, w: 3.5 });
      DRAW.text(ctx, label, m, y + 70, { size: 44, color: col || T.INK, a: clamp(k * 2 - 1) });
    });
  };
  // the agent's turn slivers between the twenty outputs light up
  DRAW.c05_turns = (ctx, p) => {
    const g = clamp(p.g || 0); if (g <= 0) return;
    for (let i = 0; i < 20; i++) {
      const k = clamp(g * 22 - i); if (k <= 0) continue;
      const x = tx(S.FIRST + (i + 1) * S.OUT + i * S.TURN);
      ctx.save(); ctx.globalAlpha *= k; ctx.shadowColor = T.YELLOW; ctx.shadowBlur = 14;
      rr(ctx, x - 2, TY - 47, S.TURN * PX + 4, 94, 3); ctx.strokeStyle = T.YELLOW; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    }
  };

  const chip = (id, x, col, label, at) => ({
    [id + 's']: { type: 'rect', x, y: 780, w: 34, h: 34, rad: 6, fill: col, in: 'pop', at },
    [id]: { type: 'text', html: label, size: 40, align: 'left', ax: 0, x: x + 32, y: 780, in: 'rise', at: at + 0.1 },
  });
  const note = (id, html, x, y, o = {}) => ({ [id]: Object.assign({ type: 'text', html, size: 46, x, y, in: 'wipe' }, o) });

  // 165 (4) — WIDE: the tape across the frame; ticks 0 … 32,768 beneath
  c(4, {
    ...K.rail(5),
    tape: { type: 'canvas', draw: 'tape', x: 960, y: 540, ...tp({ ticks: 1 }), paramsFrom: { ticks: 0 }, in: 'none', pdur: 2.4, pease: 'power2.out' },
    c05_win: { type: 'text', html: '<span class="cap" style="font-size:1em">one context window · 32,768 tokens</span>', size: 28, color: T.DIM, x: 960, y: 440, in: 'fade', at: 1.0 },
  }, { clear: true, cam: { x: 960, y: 540, s: 1 }, drift: 0.6, animateFirst: true });

  // 166 (2) — legend: prompt (blue) · tool outputs (teal)
  c(2, { ...chip('c05_k0', 210, T.BLUE, 'prompt', 0.1), ...chip('c05_k1', 520, T.TEAL, 'tool outputs', 0.4) }, { cam: { x: 960, y: 600, s: 1 } });

  // 167 (4.5) — the agent's own turns (ink) · thinking (periwinkle): everything shares one window
  c(4.5, {
    ...chip('c05_k2', 920, T.INK, 'the agent’s own turns', 0.1), ...chip('c05_k3', 1400, T.THINK, 'thinking', 0.4),
    c05_win: { ver: 0, o: 0 },
    c05_all: { type: 'text', html: 'everything shares <span class="c-yellow">one window</span>', size: 64, x: 960, y: 380, in: 'wipe', at: 1.0 },
  }, { cam: { x: 960, y: 580, s: 1.02 } });

  // 168 (4.5) — [SIG3] the first message slides in, to scale: ≈3.5k
  const legendOut = { c05_k0: 'down', c05_k0s: 'down', c05_k1: 'down', c05_k1s: 'down', c05_k2: 'down', c05_k2s: 'down', c05_k3: 'down', c05_k3s: 'down' };
  c(4.5, {
    ...legendOut, c05_all: 'up', c05_win: null,
    tape: tp({ first: 1 }, { pdur: 1.6, pease: 'expo.out', at: 0.3 }),
    ...note('c05_fm', '<span class="c-blue">first message</span> ≈ <span class="c-yellow">3.5k</span>', X0, 440, { align: 'left', ax: 0, at: 1.2, size: 50 }),
  }, { cut: true, cam: { x: 960, y: 520, s: 1 }, sfx: [{ at: 0.6, kind: 'click' }] });

  // 169 (2.5) — reading beat: push in on "first message ≈ 3.5k"
  F.beat(2.5, { id: 'c05_fm', mode: 'push', dx: 230 });

  // 170 (2) — 3.5k ÷ 32,768 ≈ 11% (derived)
  c(2, { ...note('c05_fm2', '3.5k ÷ 32,768 ≈ <span class="c-yellow">11%</span>&ensp;<span class="cap c-dim" style="font-size:0.5em">derived</span>', X0, 360, { align: 'left', ax: 0, at: 0.1, size: 46 }) });

  // 171 (4.5) — CLOSE: the block opens like a drawer: problem statement · hints, if any
  const DR = ['problem statement', 'hints, if any', 'budget', 'environment rules', 'tool notes', '150-entry file listing'];
  const drawer = (i, at) => ({ ['c05_dr' + i]: { type: 'box', x: X0 + 230, y: 650 + i * 74, w: 460, h: 62, stroke: T.BLUE, fill: 'rgba(88,196,221,0.10)', sw: 2.5, rad: 10, size: 34, html: DR[i], in: 'none', from: { y: TY, o: 0, s: 0.4 }, at, dur: 0.9, ease: 'expo.out', z: 2 } });
  c(4.5, { ...drawer(0, 0.3), ...drawer(1, 0.7) }, { cam: { x: 560, y: 650, s: 1.42 }, sfx: [{ at: 0.4, kind: 'tick' }, { at: 0.8, kind: 'tick' }] });
  // 172 (3.5) — budget · environment rules
  c(3.5, { ...drawer(2, 0.2), ...drawer(3, 0.6) }, { cam: { x: 560, y: 700, s: 1.42 }, sfx: [{ at: 0.3, kind: 'tick' }, { at: 0.7, kind: 'tick' }] });
  // 173 (4.5) — tool notes · 150-entry file listing
  c(4.5, { ...drawer(4, 0.2), ...drawer(5, 0.6) }, { cam: { x: 560, y: 760, s: 1.42 }, sfx: [{ at: 0.3, kind: 'tick' }, { at: 0.7, kind: 'tick' }] });

  // 174 (4.5) — WIDE: one teal block ≈ 4% of the tape: one full-size tool output ≈ 1.3k
  const drIn = {};
  for (let i = 0; i < 6; i++) drIn['c05_dr' + i] = { y: TY, s: 0.3, o: 0, at: 0.05 * (5 - i), dur: 0.55, ease: 'power3.in' };
  c(4.5, {
    ...drIn, c05_fm: 'fade', c05_fm2: 'fade',
    tape: tp({ n: 1, sliver: 0 }, { pdur: 1.4, pease: 'expo.out', at: 0.8 }),
    ...note('c05_o1', '<span class="c-teal">one full-size tool output</span> (5,000 chars) ≈ <span class="c-yellow">1.3k</span>', tx(S.FIRST) - 20, 440, { align: 'left', ax: 0, at: 1.4, size: 48 }),
  }, { cam: { x: 960, y: 520, s: 1 }, sfx: [{ at: 1.0, kind: 'click' }] });

  // 175 (4.5) — a thin ink sliver after it: + the agent's own turn
  c(4.5, {
    c05_dr0: null, c05_dr1: null, c05_dr2: null, c05_dr3: null, c05_dr4: null, c05_dr5: null,
    tape: tp({ sliver: 1 }, { pdur: 1.2, at: 0.3 }),
    ...note('c05_o2', '+ the agent’s own turn', tx(S.FIRST + S.OUT) - 20, 660, { align: 'left', ax: 0, at: 0.9 }),
    c05_o2a: { type: 'arrow', x1: tx(S.FIRST + S.OUT) + 4, y1: 625, x2: tx(S.FIRST + S.OUT) + 4, y2: 592, color: T.INK, sw: 3, head: 14, in: 'draw', at: 0.7 },
  }, { cam: { x: 760, y: 540, s: 1.12 } });

  // 176 (2) — 1.3k ÷ 32,768 ≈ 4% (derived)
  c(2, { ...note('c05_o3', '1.3k ÷ 32,768 ≈ <span class="c-yellow">4%</span>&ensp;<span class="cap c-dim" style="font-size:0.5em">derived</span>', tx(S.FIRST) - 20, 360, { align: 'left', ax: 0, at: 0.1 }) });

  // 177 (3.5) — the counter: tool outputs 1 … 6, a soft tick each
  const ticks = (from, to, d) => Array.from({ length: to - from }, (_, i) => ({ at: (i + 0.5) * d / (to - from), kind: 'tick' }));
  c(3.5, {
    c05_o1: 'fade', c05_o2: 'fade', c05_o2a: 'fade', c05_o3: 'fade',
    tape: tp({ n: 6 }, { pdur: 2.6, pease: 'none' }),
    c05_cnt: { type: 'num', val: 6, pre: '<span class="c-dim">tool outputs:</span> ', size: 64, x: 1380, y: 400, in: 'none', from: { val: 1, o: 1 }, dur: 2.6, ease: 'none' },
  }, { cam: { x: 960, y: 520, s: 1 }, sfx: ticks(1, 6, 2.6) });
  // 178 (2) — 7 … 12: past half full
  c(2, { tape: tp({ n: 12 }, { pdur: 1.5, pease: 'none' }), c05_cnt: { val: 12, dur: 1.5, ease: 'none' } }, { sfx: ticks(6, 12, 1.5) });
  // 179 (2) — 13 … 18: the free space shrinks, its edge glows red
  c(2, { tape: tp({ n: 18, edgeGlow: 1 }, { pdur: 1.5, pease: 'none' }), c05_cnt: { val: 18, dur: 1.5, ease: 'none' } }, { sfx: ticks(12, 18, 1.5) });
  // 180 (2) — 19: the last gap is a sliver
  c(2, { tape: tp({ n: 19 }, { pdur: 0.9, pease: 'power2.out' }), c05_cnt: { val: 19, dur: 0.9, ease: 'power2.out' } }, { cam: { x: 1100, y: 520, s: 1.06 }, sfx: [{ at: 0.4, kind: 'tick' }] });

  // 181 (4.5) — 20: the block doesn't fit; the tape's end cracks red
  c(4.5, {
    tape: tp({ n: 20, crack: 1 }, { pdur: 1.2, pease: 'power3.out' }),
    c05_cnt: { val: 20, dur: 0.6, ease: 'power2.out' },
    ...note('c05_ov', '<span class="c-red">≈20 full-size outputs</span> + the agent’s turns → <span class="c-red">overflow</span>', 960, 720, { at: 1.0, size: 50 }),
  }, { cam: { x: 960, y: 560, s: 1 }, sfx: [{ at: 0.5, kind: 'click' }] });

  // 182 (2.5) — reading beat: "≈20 full-size outputs" stays bright, the rest sinks to a third
  c(2.5, { tape: tp({ a: 0.33 }, { pdur: 0.6 }), c05_cnt: { o: 0.33 }, c05_ov: { s: 1.06 } }, { drift: 0.4 });

  // 183 (2.5) — a brace under the first block: 3.5k
  const BR = [[X0, tx(S.FIRST), '3.5k', T.BLUE], [tx(S.FIRST), X0 + TW, '+ 20 × 1.3k = 26k', T.TEAL]];
  c(2.5, {
    c05_ov: 'up', c05_cnt: 'fade',
    tape: tp({ a: 1, ticks: 0 }, { pdur: 0.6 }),
    c05_br: { type: 'canvas', draw: 'c05_brace', x: 960, y: 540, braces: BR, by: 606, params: { k0: 1, k1: 0 }, paramsFrom: { k0: 0 }, in: 'fade', dur: 0.2, at: 0.3, pdur: 1.2 },
    c05_der: { type: 'text', html: '<span class="cap" style="font-size:1em">derived</span>', size: 26, color: T.YELLOW, x: 1760, ax: 1, align: 'right', y: 420, in: 'fade', at: 0.6 },
  });
  // 184 (4.5) — a brace under the twenty outputs: + 20 × 1.3k = 26k
  c(4.5, { c05_br: { params: { k0: 1, k1: 1 }, pdur: 1.8 } }, { cam: { x: 960, y: 600, s: 1.02 } });
  // 185 (4.5) — = 29.5k; the last ≈3.3k lights: the agent's turns · thinking · replies
  c(4.5, {
    ...note('c05_sum', '= <span class="c-yellow">29.5k</span>, leaving ≈3.3k for the agent’s turns · thinking · replies', 960, 800, { at: 0.3, size: 46 }),
    c05_turns: { type: 'canvas', draw: 'c05_turns', x: 960, y: 540, params: { g: 1 }, paramsFrom: { g: 0 }, in: 'fade', dur: 0.2, at: 1.2, pdur: 2.0, pease: 'none', z: 3 },
  }, { cam: { x: 960, y: 620, s: 1 } });

  // 186 (4.5) — the chip slides out from under the cracked tape: still graded
  c(4.5, {
    c05_br: 'fade', c05_sum: 'fade', c05_turns: 'fade', c05_der: 'fade',
    ...K.chip('chip', { x: 960, y: 760, s: 1.2, z: 0, in: 'none', from: { y: TY, o: 1, s: 0.8 }, at: 0.4, dur: 1.4, ease: 'expo.out' }),
    ...note('c05_gr', 'the task ends, but the diff left behind is <span class="c-green">still graded</span>', 960, 900, { at: 1.4, size: 52 }),
  }, { cam: { x: 960, y: 620, s: 1 }, sfx: [{ at: 0.6, kind: 'pop' }] });

  // 187 (2.5) — reading beat: underline "still graded"
  F.beat(2.5, { id: 'c05_gr', mode: 'underline', w: 300, dx: 495, under: 42, color: T.GREEN });

  // 188 (4.5) — FULL: Inside a task, the context only grows. The tape empties.
  c(4.5, {
    chip: 'down', c05_gr: 'down',
    tape: tp({ n: 0, crack: 0, edgeGlow: 0, a: 0.4 }, { pdur: 1.0, pease: 'power2.inOut' }),
    c05_grow: { type: 'text', html: 'Inside a task, <span class="c-yellow">the context only grows</span>.', size: 84, x: 960, y: 300, in: 'wipe', at: 0.5 },
    c05_find: { type: 'text', html: '<span class="cap" style="font-size:1em">in practice · participant finding (google-adk 2.9.2)</span>', size: 28, color: T.DIM, x: 960, y: 400, in: 'fade', at: 1.3 },
  }, { cut: true, cam: { x: 960, y: 480, s: 1 } });

  // 189 (2.5) — reading beat: push in on "the context only grows"
  F.beat(2.5, { id: 'c05_grow', mode: 'push', dx: 170 });

  // 190 (4.5) — WIDE: the tape refills with thinking blocks between steps
  c(4.5, {
    c05_grow: { y: TY, s: 0.3, o: 0, dur: 0.7, ease: 'power3.in' }, c05_find: 'fade',
    tape: tp({ a: 1, think: 2, n: 5 }, { pdur: 3.2, pease: 'power1.inOut', at: 0.4 }),
    ...note('c05_th', '<span style="color:#8FA7D9">thinking</span> competes for the same space', 960, 400, { at: 0.9, size: 54 }),
  }, { cam: { x: 960, y: 540, s: 1 } });

  // 191 (2) — one thinking block at the default budget = 12.5% (derived)
  const thinkW = S.THINK * PX;
  c(2, {
    c05_grow: null,
    c05_tb: { type: 'box', x: tx(S.FIRST) + thinkW / 2, y: TY, w: thinkW + 6, h: 100, stroke: T.YELLOW, sw: 3.5, rad: 8, html: '', in: 'draw', dur: 0.6, z: 3 },
    ...note('c05_tbt', '4,096 ÷ 32,768 = <span class="c-yellow">12.5%</span> of the window&ensp;<span class="cap c-dim" style="font-size:0.5em">derived</span>', 960, 680, { at: 0.3 }),
  });

  // 192 (2.5) — three tapes (concept): NONE — thin purple between the steps
  const tape2 = (id, y, think) => ({ [id]: { type: 'canvas', draw: 'tape', x: 960, y: 540, params: Object.assign({}, H, { y, think, n: 0, ticks: 0, first: 1 }), in: 'fade', at: 0.4 } });
  const lvl = (id, y, name, at) => ({ [id]: { type: 'mono', html: `thinking_level <span style="color:#8FA7D9">${name}</span>`, size: 36, align: 'left', ax: 0, x: X0, y: y - 80, in: 'wipe', at } });
  c(2.5, {
    c05_th: 'up', c05_tb: 'fade', c05_tbt: 'fade',
    tape: tp({ y: 300, think: 0.1, n: 3 }, { pdur: 1.7 }),
    ...tape2('c05_tL', 560, 0.6), ...tape2('c05_tH', 820, 2),
    ...lvl('c05_lN', 300, 'NONE', 0.2), ...lvl('c05_lL', 560, 'LOW', 0.5), ...lvl('c05_lH', 820, 'HIGH', 0.8),
    c05_con: { type: 'text', html: '<span class="cap" style="font-size:1em">concept</span>', size: 26, color: T.YELLOW, x: 1760, ax: 1, align: 'right', y: 130, in: 'fade', at: 0.5 },
  }, { cut: true, cam: { x: 960, y: 540, s: 1 } });
  // 193 (2) — LOW: wider blocks
  c(2, { c05_tL: { params: Object.assign({}, H, { y: 560, think: 0.6, n: 3, first: 1 }), pdur: 1.4 } });
  // 194 (2) — HIGH: wide blocks; it fills fastest
  c(2, {
    tape: tp({ n: 5.3 }, { pdur: 1.4 }),
    c05_tL: { params: Object.assign({}, H, { y: 560, think: 0.6, n: 5.3, first: 1 }), pdur: 1.4 },
    c05_tH: { params: Object.assign({}, H, { y: 820, think: 2, n: 5.3, first: 1, edgeGlow: 1 }), pdur: 1.4 },
  }, { sfx: [{ at: 0.4, kind: 'tick' }, { at: 0.8, kind: 'tick' }, { at: 1.2, kind: 'tick' }] });
  // 195 (4.5) — HIGH cracks first; NONE fits the most steps; measure it
  c(4.5, {
    c05_tH: { params: Object.assign({}, H, { y: 820, think: 2, n: 5.3, first: 1, edgeGlow: 1, crack: 1 }), pdur: 0.8 },
    tape: tp({ n: 10 }, { pdur: 3.0, at: 0.6 }),
    c05_tL: { params: Object.assign({}, H, { y: 560, think: 0.6, n: 10, first: 1, edgeGlow: 1 }), pdur: 3.0, at: 0.6 },
    c05_meas: { type: 'text', html: '<span class="plate"><span style="color:#8FA7D9">NONE</span> fits the most steps · <span class="c-dim">measure it on your own runs</span></span>', size: 42, x: 960, y: 440, in: 'wipe', at: 1.6, z: 4 },
  }, { sfx: [{ at: 0.3, kind: 'click' }] });

  // 196 (2) — the tapes merge back into one: short teal slivers instead of full blocks
  c(2, {
    c05_tL: { params: Object.assign({}, H, { y: 540, think: 0.6, n: 10, first: 1 }), o: 0, pdur: 0.8 }, c05_tH: { params: Object.assign({}, H, { y: 540, think: 2, n: 5.3, first: 1, crack: 1 }), o: 0, pdur: 0.8 },
    c05_lN: 'quick', c05_lL: 'quick', c05_lH: 'quick', c05_meas: 'up',
    tape: tp({ y: 540, think: 0, short: 1, n: 8 }, { pdur: 1.4 }),
    ...note('c05_sh', '<span class="c-teal">short outputs</span> buy more steps', 960, 400, { at: 0.5, size: 54 }),
  });
  // 197 (2.5) — the counter runs past 20 with no crack (concept)
  c(2.5, {
    c05_tL: null, c05_tH: null,
    tape: tp({ n: 26 }, { pdur: 1.7, pease: 'power1.inOut' }),
    c05_cnt2: { type: 'num', val: 26, pre: '<span class="c-dim">tool outputs:</span> ', size: 60, x: 960, y: 700, in: 'none', from: { val: 8, o: 1 }, dur: 1.7, ease: 'power1.inOut' },
  }, { sfx: ticks(8, 14, 1.5) });

  // 198 (3.5) — the tape stands up as a meter beside the LOOP; each lap drops it a notch
  const LP = { cx: 960, cy: 560, r: 240, draw: 1, labels: 1, ring: 0, dot: -1, exit: 0, hi: -1, stopped: 0 };
  c(3.5, {
    c05_sh: 'up', c05_cnt2: 'fade', c05_con: 'fade',
    tape: tp({ short: 0, n: 4, first: 1 }, { x: 1560, r: -90, s: 0.52, dur: 1.2, ease: 'power3.inOut', pdur: 3.0, pease: 'power1.inOut' }),
    loop: { type: 'canvas', draw: 'loop', x: 960, y: 540, params: Object.assign({}, LP, { dot: 3 }), paramsFrom: { draw: 0, dot: 0 }, in: 'fade', dur: 0.3, at: 0.2, pdur: 2.4, pease: 'power1.inOut' },
    c05_mk: { type: 'text', html: '<span class="cap" style="font-size:1em">context</span>', size: 26, color: T.DIM, x: 1560, y: 1010, in: 'fade', at: 1.0 },
  }, { cut: true, cam: { x: 1060, y: 540, s: 1 } });

  // 199 (4.5) — the meter hits red and the loop stops: 32,768 tokens is the real budget
  c(4.5, {
    tape: tp({ n: 20, crack: 1, edgeGlow: 1 }, { pdur: 2.4, pease: 'power2.in' }),
    loop: { params: Object.assign({}, LP, { dot: 6, stopped: 1 }), pdur: 2.4, pease: 'power2.out' },
    c05_bud: { type: 'text', html: '<span class="c-yellow">32,768 tokens</span> is the real budget', size: 58, x: 960, y: 920, in: 'wipe', at: 2.2 },
  }, { sfx: [{ at: 2.4, kind: 'click' }] });

  // 200 (2) — the teal blocks lift off and fan out, each stamped with the tool that produced it
  const TOOLS = ['run_command', 'read_file', 'edit_file', 'write_file', 'get_status', 'submit_patch', 'get_code_neighbors', 'search_similar_code', 'get_code_subgraph'];
  const [nx, ny] = DRAW.loopGeom(LP).pos[1];
  const tiles = {};
  TOOLS.forEach((t, i) => {
    tiles['c05_tt' + i] = { type: 'box', x: 1520 - (i % 2) * 40, y: 150 + i * 92, w: 400, h: 70, stroke: T.TEAL, fill: 'rgba(92,208,179,0.14)', sw: 2.5, rad: 10, size: 30, html: `<span class="m">${t}</span>`, in: 'none', from: { x: 1560, y: 980 - i * 60, s: 0.3, o: 0 }, at: 0.05 * i, dur: 0.9, ease: 'expo.out', z: 4 };
  });
  c(2, {
    c05_bud: 'fade', c05_mk: 'fade',
    tape: { o: 0, s: 0.45, dur: 0.6, ease: 'power2.in' },
    loop: { params: Object.assign({}, LP, { dot: -1, stopped: 0 }), pdur: 0.5, pease: 'steps(1)' },
    ...tiles,
  }, { cam: { x: 1060, y: 540, s: 1 } });

  // 201 (3.5) — the stamps settle into a ring of nine tiles around "call a tool"
  const settle = {};
  TOOLS.forEach((t, i) => {
    const a = -Math.PI / 2 + (i / 9) * Math.PI * 2;
    settle['c05_tt' + i] = { x: nx + Math.cos(a) * 150, y: ny + Math.sin(a) * 92, s: 0.065, o: 0, at: 0.1 + 0.06 * i, dur: 1.1, ease: 'power3.inOut' };
  });
  c(3.5, {
    tape: null,
    ...settle,
    loop: { params: Object.assign({}, LP, { ring: 1 }), pdur: 1.6, pease: 'power2.inOut', at: 0.6 },
    c05_src: { type: 'text', html: 'the tools are where context comes from', size: 50, x: 960, y: 960, in: 'wipe', at: 1.4 },
  }, { cam: { x: 960, y: 560, s: 1.04 }, sfx: [{ at: 1.0, kind: 'tick' }] });

  // 202 (4.5) — the RAIL rewrites to "06 The nine tools" (hand-off: the loop with its tool ring)
  const gone = Object.fromEntries(TOOLS.map((t, i) => ['c05_tt' + i, null]));
  c(4.5, {
    ...gone,
    rail: { ver: 6, at: 0.3, dur: 0.9 },
    loop: { type: 'canvas', draw: 'loop', x: 960, y: 540, params: { cx: 960, cy: 560, r: 240, draw: 1, labels: 1, ring: 1, dot: -1, exit: 0, hi: -1, stopped: 0 }, pdur: 0.1 },
    c05_src: { y: 1010, o: 0, at: 0, dur: 3.3, ease: 'power2.in' },
  }, { cam: { x: 960, y: 540, s: 1 }, drift: 0 });
})();
