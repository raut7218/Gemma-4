// Chapter 5 — The 32k context window (storyboard rows 165–202, 125 beats).
(function () {
  const { T } = F;
  const c = F.comp.bind(F);
  F.chapter(K.CH[5]);
  const C0 = FILM.COMPS.length;
  const { clamp, ease, rr } = DRAW.util;
  const S = DRAW.TAPE, X0 = 160, TW = 1600, PX = TW / S.TOTAL, TY = 540, TH = 150;   // TH: the tape's height through the chapter (taller than the 86 px hand-off)
  const tx = (tok) => X0 + tok * PX;

  // ---- the TAPE (hand-off from chapter 4); params accumulate
  const H = { x: X0, y: TY, w: TW, h: 86, first: 0, n: 0, ticks: 0, sliver: 1, crack: 0 };
  let TP = Object.assign({}, H);
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
      rr(ctx, x - 2, TY - TH / 2 - 4, S.TURN * PX + 4, TH + 8, 3); ctx.strokeStyle = T.YELLOW; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    }
  };

  // the tape's scale, readable: marks + labels under a tape of height p.h (follows the tape's growth)
  DRAW.c05_ticks = (ctx, p) => {
    const y = TY + (p.h ?? 86) / 2;
    [0, 8192, 16384, 24576, 32768].forEach((m, i) => {
      const k = clamp((p.k ?? 0) * 5 - i); if (k <= 0) return;
      const x = tx(m);
      ctx.strokeStyle = DRAW.rgba(T.DIM, 0.85 * k); ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x, y + 8); ctx.lineTo(x, y + 8 + 22 * ease(k)); ctx.stroke();
      DRAW.text(ctx, m.toLocaleString('en-US'), x, y + 58, { size: 34, color: T.DIM, a: k, align: i === 0 ? 'left' : i === 4 ? 'right' : 'center' });
    });
  };

  const chip = (id, x, col, label, at, y = 780) => ({
    [id + 's']: { type: 'rect', x, y, w: 34, h: 34, rad: 6, fill: col, in: 'pop', at },
    [id]: { type: 'text', html: label, size: 40, align: 'left', ax: 0, x: x + 32, y, in: 'rise', at: at + 0.1 },
  });
  // the legend again, as a row under the tape while it fills (174–185): it keeps the lower frame readable
  const LGY = 945;
  const legend2 = (at) => ({ ...chip('c05_L0', 365, T.BLUE, 'prompt', at, LGY), ...chip('c05_L1', 755, T.TEAL, 'tool outputs', at + 0.15, LGY), ...chip('c05_L2', 1145, T.INK, 'the agent’s own turns', at + 0.3, LGY) });
  const LG_IDS = ['c05_L0', 'c05_L0s', 'c05_L1', 'c05_L1s', 'c05_L2', 'c05_L2s'];
  const legendSet = (o) => Object.fromEntries(LG_IDS.map((k) => [k, typeof o === 'string' ? o : Object.assign({}, o)]));
  const note = (id, html, x, y, o = {}) => ({ [id]: Object.assign({ type: 'text', html, size: 46, x, y, in: 'wipe' }, o) });

  // 165 (4) — WIDE: the tape across the frame; ticks 0 … 32,768 beneath
  // From the first frame the carried tape grows taller (86 → 150) while its scale ticks in; the camera
  // pushes in so the tape spans the frame.
  c(4, {
    ...K.rail(5),
    tape: { type: 'canvas', draw: 'tape', x: 960, y: 540, ...tp({ h: 150 }), paramsFrom: { h: 86 }, in: 'none', at: 0, pdur: 2.2, pease: 'power2.out' },
    c05_tk: { type: 'canvas', draw: 'c05_ticks', x: 960, y: 540, params: { k: 1, h: 150 }, paramsFrom: { k: 0, h: 86 }, in: 'none', at: 0, pdur: 2.2, pease: 'power2.out' },
    c05_win: { type: 'text', html: 'one context window · <span class="c-yellow">32,768 tokens</span>', size: 60, x: 960, y: 380, in: 'wipe', at: 0.7 },
  }, { clear: true, cam: { x: 960, y: 560, s: 1.1 }, drift: 0.6, animateFirst: true });

  // 166 (2) — legend: prompt (blue) · tool outputs (teal)
  c(2, { ...chip('c05_k0', 210, T.BLUE, 'prompt', 0.1), ...chip('c05_k1', 520, T.TEAL, 'tool outputs', 0.4) }, { cam: { x: 960, y: 600, s: 1.04 } });

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
    ...note('c05_fm', '<span class="c-blue">first message</span> ≈ <span class="c-yellow">3.5k</span>', X0, 410, { align: 'left', ax: 0, at: 1.2, size: 50 }),
  }, { cut: true, cam: { x: 960, y: 520, s: 1 }, sfx: [{ at: 0.6, kind: 'click' }] });

  // 169 (2.5) — reading beat: push in on "first message ≈ 3.5k"
  F.beat(2.5, { id: 'c05_fm', mode: 'push', dx: 500, dy: 110, scale: 1.09 });   // centred: the whole tape stays in frame

  // 170 (2) — 3.5k ÷ 32,768 ≈ 11% (derived)
  c(2, { ...note('c05_fm2', '3.5k ÷ 32,768 ≈ <span class="c-yellow">11%</span>&ensp;<span class="cap c-dim" style="font-size:0.5em">derived</span>', X0 + TW, 410, { align: 'right', ax: 1, at: 0.1, size: 46 }) });

  // 171 (4.5) — CLOSE: the block opens like a drawer: problem statement · hints, if any
  const DR = ['problem statement', 'hints, if any', 'budget', 'environment rules', 'tool notes', '150-entry file listing'];
  // each strip slides down out from under the one above it (opaque fill, lower z), so no strip crosses a label
  // the whole tape, its title row and the six strips fit one fixed frame (no pan): the tape and its
  // title lift together (no crossing). The first strip opens out of the blue block; each next strip
  // unfolds just below the one above it (a short 14 px drop into its own slot, never under or across
  // another strip's label), so the stack grows downward.
  const UP = 330, DY0 = 462, DP = 92, BLK = X0 + (S.FIRST * PX) / 2;
  const drawer = (i, at) => ({ ['c05_dr' + i]: { type: 'box', x: 960, y: DY0 + i * DP, w: 1100, h: 78, stroke: T.BLUE, fill: '#16232A', sw: 2.5, rad: 12, size: 44, html: DR[i], in: 'none',
    from: i === 0 ? { x: BLK, y: UP, o: 0, s: 0.3 } : { y: DY0 + i * DP - 14, o: 0, s: 0.97 }, at, dur: i === 0 ? 1.1 : 0.8, ease: i === 0 ? 'expo.out' : 'power3.out', z: 9 - i } });
  const LIFT = { at: 0, dur: 1.2, ease: 'power3.inOut' };
  c(4.5, {
    tape: tp({ ticks: 0, y: UP }, { pdur: 1.2, pease: 'power3.inOut' }), c05_tk: 'fade',
    c05_fm: { y: UP - 130, ...LIFT }, c05_fm2: { y: UP - 130, ...LIFT },
    ...drawer(0, 0.9), ...drawer(1, 1.4),
  }, { cam: { x: 960, y: 560, s: 1 }, sfx: [{ at: 1.0, kind: 'tick' }, { at: 1.5, kind: 'tick' }] });
  // 172 (3.5) — budget · environment rules
  c(3.5, { ...drawer(2, 0.2), ...drawer(3, 0.6) }, { cam: { x: 960, y: 556, s: 1.01 }, sfx: [{ at: 0.3, kind: 'tick' }, { at: 0.7, kind: 'tick' }] });
  // 173 (4.5) — tool notes · 150-entry file listing
  c(4.5, { ...drawer(4, 0.2), ...drawer(5, 0.6) }, { cam: { x: 960, y: 552, s: 1.02 }, sfx: [{ at: 0.3, kind: 'tick' }, { at: 0.7, kind: 'tick' }] });

  // 174 (4.5) — WIDE: one teal block ≈ 4% of the tape: one full-size tool output ≈ 1.3k
  const drIn = {};
  // the strips fold away in place (bottom one first; none crosses another), then the tape settles back
  // to the centre line as the first teal block slides in; the camera eases back over the comp (no snap)
  for (let i = 0; i < 6; i++) drIn['c05_dr' + i] = { y: DY0 + i * DP - 10, s: 0.9, o: 0, at: 0.07 * (5 - i), dur: 0.45, ease: 'power2.in' };
  c(4.5, {
    ...drIn,
    // the title row rides down with the tape and fades on the way (the frame is never just a bare tape)
    c05_fm: { y: 410, o: 0, at: 0.75, dur: 1.0, ease: 'power2.inOut' }, c05_fm2: { y: 410, o: 0, at: 0.75, dur: 1.0, ease: 'power2.inOut' },
    tape: tp({ n: 1, sliver: 0, y: TY }, { pdur: 1.6, pease: 'power3.inOut', at: 0.75 }),
    c05_tk: { type: 'canvas', draw: 'c05_ticks', x: 960, y: 540, params: { k: 1, h: TH }, paramsFrom: { k: 0 }, in: 'fade', dur: 0.3, at: 1.9, pdur: 1.2, pease: 'power2.out' },
    ...note('c05_o1', '<span class="c-teal">one full-size tool output</span> (5,000 chars) ≈ <span class="c-yellow">1.3k</span>', tx(S.FIRST) - 20, 410, { align: 'left', ax: 0, at: 1.9, size: 48 }),
    ...legend2(2.2),
  }, { cam: { x: 960, y: 560, s: 1 }, sfx: [{ at: 1.2, kind: 'click' }] });

  // 175 (4.5) — a thin ink sliver after it: + the agent's own turn
  c(4.5, {
    c05_fm: null, c05_fm2: null,
    c05_dr0: null, c05_dr1: null, c05_dr2: null, c05_dr3: null, c05_dr4: null, c05_dr5: null,
    tape: tp({ sliver: 1 }, { pdur: 1.2, at: 0.3 }),
    ...note('c05_o2', '+ the agent’s own turn', tx(S.FIRST + S.OUT) - 20, 780, { align: 'left', ax: 0, at: 0.9 }),
    c05_o2a: { type: 'arrow', x1: tx(S.FIRST + S.OUT) + 4, y1: 748, x2: tx(S.FIRST + S.OUT) + 4, y2: TY + TH / 2 + 10, color: T.INK, sw: 3, head: 14, in: 'draw', at: 0.7 },
  }, { cam: { x: 960, y: 580, s: 1.06 } });

  // 176 (2) — 1.3k ÷ 32,768 ≈ 4% (derived)
  c(2, { ...note('c05_o3', '1.3k ÷ 32,768 ≈ <span class="c-yellow">4%</span>&ensp;<span class="cap c-dim" style="font-size:0.5em">derived</span>', tx(S.FIRST) - 20, 335, { align: 'left', ax: 0, at: 0.1 }) });

  // 177 (3.5) — the counter: tool outputs 1 … 6, a soft tick each
  const ticks = (from, to, d) => Array.from({ length: to - from }, (_, i) => ({ at: (i + 0.5) * d / (to - from), kind: 'tick' }));
  c(3.5, {
    c05_o1: 'fade', c05_o2: 'fade', c05_o2a: 'fade', c05_o3: 'fade',
    tape: tp({ n: 6 }, { pdur: 2.6, pease: 'none' }),
    c05_cnt: { type: 'num', val: 6, pre: '<span class="c-dim">tool outputs:</span> ', size: 64, x: 1380, y: 400, in: 'none', from: { val: 1, o: 1 }, dur: 2.6, ease: 'none' },
  }, { cam: { x: 960, y: 560, s: 1 }, sfx: ticks(1, 6, 2.6) });
  // 178 (2) — 7 … 12: past half full
  c(2, { tape: tp({ n: 12 }, { pdur: 1.5, pease: 'none' }), c05_cnt: { val: 12, dur: 1.5, ease: 'none' } }, { sfx: ticks(6, 12, 1.5) });
  // 179 (2) — 13 … 18: the free space shrinks, its edge glows red
  c(2, { tape: tp({ n: 18, edgeGlow: 1 }, { pdur: 1.5, pease: 'none' }), c05_cnt: { val: 18, dur: 1.5, ease: 'none' } }, { sfx: ticks(12, 18, 1.5) });
  // 180 (2) — 19: the last gap is a sliver
  c(2, { tape: tp({ n: 19 }, { pdur: 0.9, pease: 'power2.out' }), c05_cnt: { val: 19, dur: 0.9, ease: 'power2.out' } }, { cam: { x: 960, y: 560, s: 1.06 }, drift: 0.5, sfx: [{ at: 0.4, kind: 'tick' }] });

  // 181 (4.5) — 20: the block doesn't fit; the tape's end cracks red
  c(4.5, {
    tape: tp({ n: 20, crack: 1 }, { pdur: 1.2, pease: 'power3.out' }),
    c05_cnt: { val: 20, dur: 0.6, ease: 'power2.out' },
    ...note('c05_ov', '<span class="c-red">≈20 full-size outputs</span> + the agent’s turns → <span class="c-red">overflow</span>', 960, 790, { at: 1.0, size: 50 }),
  }, { cam: { x: 960, y: 570, s: 1.02 }, sfx: [{ at: 0.5, kind: 'click' }] });

  // 182 (2.5) — reading beat: "≈20 full-size outputs" stays bright, the rest sinks to a third
  c(2.5, { tape: { o: 0.33, dur: 0.6 }, c05_tk: { o: 0.33, dur: 0.6 }, c05_cnt: { o: 0.33 }, ...legendSet({ o: 0.33, dur: 0.6 }), c05_ov: { s: 1.06 } }, { drift: 0.4 });

  // 183 (2.5) — a brace under the first block: 3.5k
  const BR = [[X0, tx(S.FIRST), '3.5k', T.BLUE], [tx(S.FIRST), X0 + TW, '+ 20 × 1.3k = 26k', T.TEAL]];
  c(2.5, {
    c05_ov: 'fade', c05_cnt: 'fade', c05_tk: 'fade', ...legendSet({ o: 1, dur: 0.6 }),
    tape: tp({ ticks: 0 }, { o: 1, pdur: 0.6 }),
    c05_br: { type: 'canvas', draw: 'c05_brace', x: 960, y: 540, braces: BR, by: TY + TH / 2 + 12, params: { k0: 1, k1: 0 }, paramsFrom: { k0: 0 }, in: 'fade', dur: 0.2, at: 0.3, pdur: 1.2 },
    c05_der: { type: 'text', html: '<span class="cap" style="font-size:1em">derived</span>', size: 26, color: T.YELLOW, x: 1760, ax: 1, align: 'right', y: 420, in: 'fade', at: 0.6 },
  });
  // 184 (4.5) — a brace under the twenty outputs: + 20 × 1.3k = 26k
  c(4.5, { c05_br: { params: { k0: 1, k1: 1 }, pdur: 1.8 } }, { cam: { x: 960, y: 610, s: 1.04 } });
  // 185 (4.5) — = 29.5k; the last ≈3.3k lights: the agent's turns · thinking · replies
  c(4.5, {
    ...note('c05_sum', '= <span class="c-yellow">29.5k</span>, leaving ≈3.3k for the agent’s turns · thinking · replies', 960, 830, { at: 0.3, size: 46 }),
    c05_turns: { type: 'canvas', draw: 'c05_turns', x: 960, y: 540, params: { g: 1 }, paramsFrom: { g: 0 }, in: 'fade', dur: 0.2, at: 1.2, pdur: 2.0, pease: 'none', z: 3 },
  }, { cam: { x: 960, y: 620, s: 1.04 } });

  // 186 (4.5) — the chip slides out from under the cracked tape: still graded
  c(4.5, {
    c05_br: 'fade', c05_sum: 'fade', c05_turns: 'fade', c05_der: 'fade', ...legendSet('down'),
    ...K.chip('chip', { x: 960, y: 760, s: 1.2, z: 0, in: 'none', from: { y: TY, o: 1, s: 0.8 }, at: 0.4, dur: 1.4, ease: 'expo.out' }),
    ...note('c05_gr', 'the task ends, but the diff left behind is <span class="c-green">still graded</span>', 960, 900, { at: 1.4, size: 52 }),
  }, { cam: { x: 960, y: 620, s: 1 }, sfx: [{ at: 0.6, kind: 'pop' }] });

  // 187 (2.5) — reading beat: underline "still graded"
  F.beat(2.5, { id: 'c05_gr', mode: 'underline', w: 300, dx: 495, under: 42, color: T.GREEN });

  // 188 (4.5) — FULL: Inside a task, the context only grows. The tape empties.
  c(4.5, {
    chip: 'down', c05_gr: 'down',
    tape: tp({ n: 0, crack: 0, edgeGlow: 0 }, { o: 0.4, pdur: 1.0, pease: 'power2.inOut' }),
    c05_grow: { type: 'text', html: 'Inside a task, <span class="c-yellow">the context only grows</span>.', size: 84, x: 960, y: 300, in: 'wipe', at: 0.5 },
    c05_find: { type: 'text', html: '<span class="cap" style="font-size:1em">in practice · participant finding (google-adk 2.9.2)</span>', size: 28, color: T.DIM, x: 960, y: 400, in: 'fade', at: 1.3 },
  }, { cut: true, cam: { x: 960, y: 480, s: 1 } });

  // 189 (2.5) — reading beat: push in on "the context only grows"
  F.beat(2.5, { id: 'c05_grow', mode: 'push', scale: 1.08 });

  // 190 (4.5) — WIDE: the tape refills with thinking blocks between steps
  c(4.5, {
    c05_grow: { y: TY, s: 0.3, o: 0, dur: 0.7, ease: 'power3.in' }, c05_find: 'fade',
    tape: tp({ think: 2, n: 5 }, { o: 1, pdur: 3.2, pease: 'power1.inOut', at: 0.4 }),
    ...note('c05_th', '<span style="color:#8FA7D9">thinking</span> competes for the same space', 960, 400, { at: 0.9, size: 54 }),
  }, { cam: { x: 960, y: 540, s: 1 } });

  // 191 (2) — one thinking block at the default budget = 12.5% (derived)
  const thinkW = S.THINK * PX;
  c(2, {
    c05_grow: null,
    c05_tb: { type: 'box', x: tx(S.FIRST) + thinkW / 2, y: TY, w: thinkW + 6, h: TH + 14, stroke: T.YELLOW, sw: 3.5, rad: 8, html: '', in: 'draw', dur: 0.6, z: 3 },
    ...note('c05_tbt', '4,096 ÷ 32,768 = <span class="c-yellow">12.5%</span> of the window&ensp;<span class="cap c-dim" style="font-size:0.5em">derived</span>', 960, 700, { at: 0.3 }),
  });

  // 192 (2.5) — three tapes (concept): NONE — thin purple between the steps
  const H3 = Object.assign({}, H, { h: 124 });   // the three concept tapes: taller than the hand-off tape, still three to a frame
  const tape2 = (id, y, think) => ({ [id]: { type: 'canvas', draw: 'tape', x: 960, y: 540, params: Object.assign({}, H3, { y, think, n: 0, ticks: 0, first: 1 }), in: 'fade', at: 0.4 } });
  const lvl = (id, y, name, at) => ({ [id]: { type: 'mono', html: `thinking_level <span style="color:#8FA7D9">${name}</span>`, size: 36, align: 'left', ax: 0, x: X0, y: y - 92, in: 'wipe', at } });
  c(2.5, {
    c05_th: 'up', c05_tb: 'fade', c05_tbt: 'fade',
    tape: tp({ y: 300, h: 124, think: 0.1, n: 3 }, { pdur: 1.7 }),
    ...tape2('c05_tL', 560, 0.6), ...tape2('c05_tH', 820, 2),
    ...lvl('c05_lN', 300, 'NONE', 0.2), ...lvl('c05_lL', 560, 'LOW', 0.5), ...lvl('c05_lH', 820, 'HIGH', 0.8),
    c05_con: { type: 'text', html: '<span class="cap" style="font-size:1em">concept</span>', size: 26, color: T.YELLOW, x: 1760, ax: 1, align: 'right', y: 196, in: 'fade', at: 0.5 },
  }, { cut: true, cam: { x: 960, y: 540, s: 1 } });
  // 193 (2) — LOW: wider blocks
  c(2, { c05_tL: { params: Object.assign({}, H3, { y: 560, think: 0.6, n: 3, first: 1 }), pdur: 1.4 } });
  // 194 (2) — HIGH: wide blocks; it fills fastest
  c(2, {
    tape: tp({ n: 5.3 }, { pdur: 1.4 }),
    c05_tL: { params: Object.assign({}, H3, { y: 560, think: 0.6, n: 5.3, first: 1 }), pdur: 1.4 },
    c05_tH: { params: Object.assign({}, H3, { y: 820, think: 2, n: 5.3, first: 1, edgeGlow: 1 }), pdur: 1.4 },
  }, { sfx: [{ at: 0.4, kind: 'tick' }, { at: 0.8, kind: 'tick' }, { at: 1.2, kind: 'tick' }] });
  // 195 (4.5) — HIGH cracks first; NONE fits the most steps; measure it
  c(4.5, {
    c05_tH: { params: Object.assign({}, H3, { y: 820, think: 2, n: 5.3, first: 1, edgeGlow: 1, crack: 1 }), pdur: 0.8 },
    tape: tp({ n: 10 }, { pdur: 3.0, at: 0.6 }),
    c05_tL: { params: Object.assign({}, H3, { y: 560, think: 0.6, n: 10, first: 1, edgeGlow: 1 }), pdur: 3.0, at: 0.6 },
    c05_meas: { type: 'text', html: '<span class="plate"><span style="color:#8FA7D9">NONE</span> fits the most steps · <span class="c-dim">measure it on your own runs</span></span>', size: 42, x: 960, y: 960, in: 'wipe', at: 1.6, z: 4 },
  }, { sfx: [{ at: 0.3, kind: 'click' }] });

  // 196 (2) — the tapes merge back into one: short teal slivers instead of full blocks
  c(2, {
    c05_tL: { params: Object.assign({}, H3, { y: 540, think: 0.6, n: 10, first: 1 }), o: 0, pdur: 0.8 }, c05_tH: { params: Object.assign({}, H3, { y: 540, think: 2, n: 5.3, first: 1, crack: 1 }), o: 0, pdur: 0.8 },
    c05_lN: 'quick', c05_lL: 'quick', c05_lH: 'quick', c05_meas: 'up',
    tape: tp({ y: 540, h: TH, think: 0, short: 1, n: 8 }, { pdur: 1.4 }),
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
    c05_mk: { type: 'text', html: '<span class="cap" style="font-size:1em">context</span>', size: 26, color: T.DIM, x: 1560, y: 990, in: 'fade', at: 1.0 },
  }, { cut: true, cam: { x: 1060, y: 540, s: 1 } });

  // 199 (4.5) — the meter hits red and the loop stops: 32,768 tokens is the real budget
  c(4.5, {
    tape: tp({ n: 20, crack: 1, edgeGlow: 1 }, { pdur: 2.4, pease: 'power2.in' }),
    loop: { params: Object.assign({}, LP, { dot: 6, stopped: 1 }), pdur: 2.4, pease: 'power2.out' },
    c05_bud: { type: 'text', html: '<span class="c-yellow">32,768 tokens</span> is the real budget', size: 58, x: 960, y: 920, in: 'wipe', at: 2.2 },
  }, { sfx: [{ at: 2.4, kind: 'click' }] });

  // 200 (2) — the teal blocks lift off and fan out, each stamped with the tool that produced it
  // the final arc (shared with chapter 6's first frame): k = 0 settled, 1 = end of the chapter (a slow drift)
  DRAW.c05_arc = (i, k) => { const y = 160 + i * 95 - 10 * k; return [1150 + 470 * Math.sqrt(1 - ((y - 540) / 560) ** 2) - 14 * k, y]; };
  const TOOLS = ['run_command', 'read_file', 'edit_file', 'write_file', 'get_status', 'submit_patch', 'get_code_neighbors', 'search_similar_code', 'get_code_subgraph'];
  const [nx, ny] = DRAW.loopGeom(LP).pos[1];
  const tiles = {};
  TOOLS.forEach((t, i) => {
    tiles['c05_tt' + i] = { type: 'box', x: 1520 - (i % 2) * 40, y: 150 + i * 92, w: 400, h: 70, stroke: T.TEAL, fill: 'rgba(92,208,179,0.14)', sw: 2.5, rad: 10, size: 30, html: `<span class="m" style="white-space:nowrap;color:${T.TEAL}">${t}</span>`, in: 'none', from: { x: 1560, y: 980 - i * 60, s: 0.3, o: 0 }, at: 0.05 * i, dur: 0.9, ease: 'expo.out', z: 4 };
  });
  c(2, {
    c05_bud: 'fade', c05_mk: 'fade',
    tape: { o: 0, s: 0.45, dur: 0.6, ease: 'power2.in' },
    loop: { params: Object.assign({}, LP, { dot: -1, stopped: 0 }), pdur: 0.5, pease: 'steps(1)' },
    ...tiles,
  }, { cam: { x: 1060, y: 540, s: 1 } });

  // 201 (3.5) — the stamps settle into an arc of nine labelled tiles around "call a tool" (they stay
  // readable across the cut: chapter 6 starts from exactly this arc, CH6_ARC)
  const settle = {};
  TOOLS.forEach((t, i) => {
    const [x, y] = DRAW.c05_arc(i, 0);
    settle['c05_tt' + i] = { x, y, w: 390, h: 60, rad: 12, size: 30, fill: 'rgba(92,208,179,0.10)', s: 1, o: 1, at: 0.1 + 0.06 * i, dur: 1.3, ease: 'power3.inOut' };
  });
  c(3.5, {
    tape: null,
    ...settle,
    loop: { params: Object.assign({}, LP, { ring: 1 }), pdur: 1.6, pease: 'power2.inOut', at: 0.6 },
    c05_src: { type: 'text', html: 'the tools are where context comes from', size: 50, x: 740, y: 960, in: 'wipe', at: 1.4 },
  }, { cam: { x: 960, y: 560, s: 1.04 }, sfx: [{ at: 1.0, kind: 'tick' }] });

  // 202 (4.5) — the RAIL rewrites to "06 The nine tools" (hand-off: the loop with its tool ring)
  // the tiles keep drifting gently along the arc and are handed to chapter 6 (c06_t*) at the cut
  const drift = Object.fromEntries(TOOLS.map((t, i) => { const [x, y] = DRAW.c05_arc(i, 1); return ['c05_tt' + i, { x, y, at: 0, dur: 3.375, ease: 'sine.inOut' }]; }));
  c(4.5, {
    ...drift,
    rail: { ver: 6, at: 0.3, dur: 0.9 },
    loop: { type: 'canvas', draw: 'loop', x: 960, y: 540, params: { cx: 960, cy: 560, r: 240, draw: 1, labels: 1, ring: 1, dot: -1, exit: 0, hi: -1, stopped: 0 }, pdur: 0.1 },
    c05_src: { y: 1010, o: 0, at: 0, dur: 3.3, ease: 'power2.in' },
  }, { cam: { x: 960, y: 540, s: 1 }, drift: 0 });

  // Engine workaround: a named exit ('fade', 'up', …) copies the element's previous state, including a
  // stale entry `at`/`dur`; when the element was carried (not entering) in that composition, the stale
  // `at` re-morphs it back to visible after its exit. Clear those timing fields on carried states.
  for (let k = C0 + 1; k < FILM.COMPS.length; k++) {
    const cur = FILM.COMPS[k].els, before = FILM.COMPS[k - 1].els;
    for (const id in cur) if (cur[id] && cur[id].out && before[id]) cur[id] = Object.assign({}, cur[id], { at: undefined, dur: undefined, ease: undefined });
  }
})();
