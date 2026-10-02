// Chapter 11 — What you submit (storyboard v5 rows 375–405, 95 beats).
(function () {
  const { T } = F;
  const c = F.comp.bind(F);
  F.chapter(K.CH[11]);

  const cap = (s, col) => `<span class="cap" style="font-size:1em${col ? ';color:' + col : ''}">${s}</span>`;
  const tag = (s) => `<span class="cap" style="font-size:0.55em;color:#F4D35E">${s}</span>`;
  const ZIP = { type: 'box', w: 360, h: 270, x: 960, y: 540, stroke: T.GOLD, fill: 'rgba(240,172,95,0.08)', rad: 26, html: '<span class="m" style="color:#F0AC5F">.zip</span>', size: 60 };
  const LOOP = (o) => Object.assign({ cx: 1220, cy: 540, r: 230, draw: 1, labels: 1, ring: 1, dot: -1, exit: 0, hi: -1, hiA: 0 }, o);

  // ---------------------------------------------------------------- the four agent shapes (chapter-local)
  // params: show 0..1, seq 0..1 (chain lights left to right), par 0..1 (fork lights at once),
  // lp 0..1 (cycle counter 1→2→3 then exit), xs (x of first shape), y, gap, a
  DRAW.c11_shapes = (ctx, p) => {
    const { clamp, ease, rr } = DRAW.util;
    const X0 = p.xs ?? 520, Y = p.y ?? 800, GAP = p.gap ?? 300, A = p.a ?? 1;
    const lit = (k, col) => DRAW.rgba(col, 0.25 + 0.75 * k);
    const box = (x, y, w, h, k, col) => { rr(ctx, x - w / 2, y - h / 2, w, h, 10); ctx.fillStyle = DRAW.rgba(col, 0.08 + 0.3 * k); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = lit(k, col); ctx.stroke(); };
    const names = ['LlmAgent', 'SequentialAgent', 'ParallelAgent', 'LoopAgent'];
    const subs = ['a loop', 'a chain', 'a fork', 'a cycle with a counter'];
    for (let s = 0; s < 4; s++) {
      const k = ease(clamp((p.show || 0) * 4 - s * 0.8));
      if (k <= 0) continue;
      const x = X0 + s * GAP;
      ctx.save(); ctx.globalAlpha = A * k; ctx.translate(0, (1 - k) * 30);
      if (s === 0) {
        ctx.strokeStyle = DRAW.rgba(T.BLUE, 0.9); ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.arc(x, Y, 52, 0, Math.PI * 2); ctx.stroke();
        [-90, 30, 150].forEach((a) => { const r = (a * Math.PI) / 180; ctx.beginPath(); ctx.arc(x + 52 * Math.cos(r), Y + 52 * Math.sin(r), 11, 0, Math.PI * 2); ctx.fillStyle = T.BLUE; ctx.fill(); });
      } else if (s === 1) {
        for (let i = 0; i < 3; i++) {
          const kk = clamp((p.seq || 0) * 3.3 - i);
          box(x - 85 + i * 85, Y, 58, 58, kk > 0 && kk < 1.0001 ? kk : 0, T.BLUE);
          if (i < 2) DRAW.arrowHead(ctx, x - 85 + i * 85 + 50, Y, 0, 12, DRAW.rgba(T.DIM, 0.9));
        }
      } else if (s === 2) {
        const kk = clamp(p.par || 0);
        ctx.beginPath(); ctx.arc(x - 85, Y, 14, 0, Math.PI * 2); ctx.fillStyle = T.DIM; ctx.fill();
        for (let i = 0; i < 3; i++) {
          const yy = Y - 70 + i * 70;
          DRAW.polyline(ctx, [[x - 72, Y], [x + 20, yy]], 1, { color: lit(kk, T.BLUE), w: 3 });
          box(x + 52, yy, 58, 46, kk, T.BLUE);
        }
      } else {
        const kk = clamp(p.lp || 0), n = Math.min(3, 1 + Math.floor(kk * 3));
        ctx.strokeStyle = DRAW.rgba(T.BLUE, 0.9); ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.arc(x, Y, 52, -Math.PI * 0.35, Math.PI * 1.6); ctx.stroke();
        DRAW.arrowHead(ctx, x + 52 * Math.cos(-Math.PI * 0.35), Y + 52 * Math.sin(-Math.PI * 0.35), -Math.PI * 0.35 + Math.PI / 2, 14, T.BLUE);
        DRAW.text(ctx, String(n), x, Y + 2, { size: 46, color: kk > 0 ? T.YELLOW : T.INK });
        if (kk > 0.92) {
          const e = clamp((kk - 0.92) / 0.08);
          DRAW.polyline(ctx, [[x + 52, Y], [x + 130, Y]], e, { color: T.INK, w: 3 });
          if (e > 0.98) DRAW.arrowHead(ctx, x + 130, Y, 0, 14, T.INK);
        }
      }
      ctx.restore();
      DRAW.text(ctx, names[s], x, Y + 112, { mono: true, size: 28, color: T.INK, a: A * k });
      DRAW.text(ctx, subs[s], x, Y + 150, { size: 26, color: T.DIM, a: A * k });
    }
  };

  // tree versions: three lines, then all seven
  const TREE = (lines) => K.tree('tree', { x: 120, y: 540, lines }).tree.html;
  const TREE3 = TREE(K.TREE_LINES.slice(0, 3));
  const TREE7 = TREE(K.TREE_LINES);
  const TL = (k) => 333 + 58.9 * (k + 1); // stage y of tree line k (0 = agent.yaml)

  // ================================================================ compositions
  // 375 (4.5) — FULL "No Python entry points." enters from the left over the dimmed zip
  c(4.5, {
    ...K.rail(11),
    zip: Object.assign({}, ZIP, { o: 0.4, s: 0.9, dur: 1.4 }),
    c11_w1: { type: 'text', html: 'No <span class="c-red">Python</span> entry points.', size: 118, x: 960, y: 290, in: 'left', at: 0.3 },
  }, { cam: { x: 960, y: 540, s: 1 }, drift: 0.6, clear: true, keep: ['rail', 'zip'] });
  // 376 (4.5) — FULL "You submit configuration." enters from the right
  c(4.5, {
    c11_w2: { type: 'text', html: 'You submit <span class="c-gold">configuration</span>.', size: 118, x: 960, y: 800, in: 'right', at: 0.2 },
    zip: { o: 0.55, s: 0.95, dur: 3 },
  });
  // 377 (4) — the words part; the zip opens; the TREE unfolds its first lines
  c(4, {
    c11_w1: 'left', c11_w2: 'right',
    zip: { x: 300, y: 300, s: 0.35, o: 0, dur: 1.0, ease: 'power3.in', at: 0.2 },
    tree: { type: 'mono', versions: [TREE3, TREE7], ver: 0, size: 38, lh: 1.55, align: 'left', ax: 0, ay: 0, x: 120, y: 304, in: 'wipe', at: 0.8, dur: 1.4 },
  }, { cut: true, cam: { x: 600, y: 450, s: 1.22 } });
  // 378 (4.5) — the rest of the tree; corner tag
  c(4.5, {
    zip: null,
    tree: { ver: 1, dur: 1.4, at: 0.1 },
    c11_dec: { type: 'text', html: cap('declarative&ensp;·&ensp;under <span style="color:#F4D35E">3 GiB</span>'), size: 30, color: T.DIM, x: 1300, y: 300, in: 'fade', at: 1.6 },
  }, { cam: { x: 760, y: 540, s: 1.12 } });
  // 379 (3) — the size meter fills a sliver of a bar marked "3 GiB"
  c(3, {
    c11_bar: { type: 'box', w: 700, h: 56, x: 1300, y: 420, stroke: '#5B6672', sw: 2.5, rad: 10, html: '', in: 'draw', dur: 0.7 },
    c11_fill: { type: 'rect', x: 954, ax: 0, y: 420, w: 34, h: 42, rad: 7, fill: T.GOLD, in: 'grow', at: 0.6, dur: 1.2 },
    c11_3g: { type: 'text', html: '<span class="c-yellow">3 GiB</span>', size: 40, x: 1700, y: 360, in: 'fade', at: 0.4 },
    c11_ill: { type: 'text', html: tag('illustrative fill'), size: 48, x: 1000, y: 370, in: 'fade', at: 1.2 },
  }, { cam: { x: 960, y: 540, s: 1 } });
  // 380 (3.5) — OVER the tree at left; the LOOP with its tool ring and meters at right
  c(3.5, {
    c11_dec: 'quick', c11_bar: 'fade', c11_fill: 'fade', c11_3g: 'quick', c11_ill: 'quick',
    loop: { type: 'canvas', draw: 'loop', x: 960, y: 540, in: 'fade', dur: 0.3, params: LOOP(), paramsFrom: { draw: 0, ring: 0, labels: 0 }, pdur: 2.0, pease: 'power2.out' },
    c11_model: { type: 'box', w: 190, h: 64, x: 1220, y: 540, stroke: T.BLUE, fill: 'rgba(88,196,221,0.10)', sw: 3, rad: 12, html: 'model', size: 34, in: 'scale', at: 1.2 },
    c11_met: { type: 'canvas', draw: 'meters', in: 'fade', at: 1.2, params: { x: 1640, y: 900, w: 52, h: 130, gap: 22, v0: 0.7, v1: 0.7, v2: 0.5, labels: 0 } },
  }, { cut: true });
  // 381 (2) — agent.yaml flies to the loop and becomes its shape
  c(2, {
    c11_fly: { type: 'mono', html: 'agent.yaml', size: 38, x: 1220, y: 540, s: 0.6, o: 0, in: 'fade', from: { x: 370, y: TL(0), s: 1, o: 1 }, dur: 1.2, ease: 'power3.inOut' },
    loop: { params: LOOP({ hi: 0, hiA: 1 }), pdur: 1.3 },
  }, { sfx: [{ at: 1.2, kind: 'pop' }] });
  // 382 (2) — four agent shapes line up
  c(2, {
    c11_fly: null,
    loop: { params: LOOP({ cy: 410, r: 190, hi: -1 }), pdur: 1.0, pease: 'power3.inOut' },
    c11_model: { y: 362, s: 0.9 },
    c11_met: { o: 0 },
    c11_shapes: { type: 'canvas', draw: 'c11_shapes', in: 'fade', dur: 0.2, params: { show: 1, seq: 0, par: 0, lp: 0, xs: 860, y: 830, gap: 300, a: 1 }, paramsFrom: { show: 0 }, pdur: 1.4, pease: 'power2.out' },
  });
  // 383 (4.5) — CLOSE an example agent.yaml types
  const Y5 = ['name: <span class="c-dim">root</span>', 'model: <span class="c-blue">gemma-4-31b-it-qat-w4a16-ct</span>', 'instruction: <span style="color:#F0AC5F">!include</span> prompts/system.md'];
  const Y5b = Y5.concat(['generate_content_config: <span style="color:#F0AC5F">!include</span> configs/sampling.yaml', 'tools: [<span class="c-teal">run_command, read_file, edit_file, …</span>]']);
  const yf = K.file('c11_y', 'agent.yaml', Y5.concat(['', '']), { x: 700, y: 560, w: 1000, size: 30, variants: [Y5b] });
  yf.c11_y_name.html = '<span class="m" style="color:#F0AC5F">agent.yaml</span>&ensp;' + tag('example');
  c(4.5, {
    c11_shapes: { params: { show: 1, seq: 0, par: 0, lp: 0, xs: 860, y: 830, gap: 300, a: 0 }, pdur: 0.5 },
    tree: { o: 0, dur: 0.5 },
    loop: { params: LOOP({ cx: 1480, cy: 560, r: 190, ring: 1 }), pdur: 1.2, pease: 'power3.inOut' },
    c11_model: { x: 1480, y: 512, s: 0.8 },
    ...yf,
  }, { cam: { x: 980, y: 560, s: 1.05 } });
  // 384 (2) — two more lines
  c(2, { c11_y: { ver: 1, dur: 0.8 } });
  // 385 (2) — each YAML line draws a thin link to the part of the loop it sets
  const LY = (k) => 478 + 45 * k + 22; // y of yaml line k
  const lnk = (id, x1, k, x2, y2, at) => ({ [id]: { type: 'arrow', x1, y1: LY(k), x2, y2, bend: -40, sw: 2.5, head: 12, color: T.DIM, in: 'draw', at, dur: 0.7 } });
  c(2, {
    ...lnk('c11_k1', 1080, 1, 1395, 512, 0.0), ...lnk('c11_k2', 900, 2, 1380, 370, 0.15), ...lnk('c11_k3', 1140, 3, 1470, 485, 0.3), ...lnk('c11_k4', 1080, 4, 1560, 745, 0.45),
  }, { sfx: [{ at: 0.1, kind: 'tick' }] });
  // 386 (3.5) — OVER the LlmAgent enlarges; handles attach: model · adapter · instruction
  const L0 = LOOP({ cx: 960, cy: 520, r: 230, ring: 1 });
  const H = (html, x, y, at, col) => ({ type: 'box', w: 340, h: 68, x, y, stroke: col || '#5B6672', fill: 'rgba(21,26,33,0.96)', sw: 2.5, rad: 34, html: `<span class="m">${html}</span>`, size: 32, in: 'scale', at });
  const HL = (x1, y1, x2, y2, at) => ({ type: 'arrow', x1, y1, x2, y2, bend: 0, sw: 2.5, head: 0, color: '#5B6672', in: 'draw', at, dur: 0.6 });
  const yOut = { c11_y: 'fade', c11_y_frame: 'fade', c11_y_name: 'quick', c11_k1: 'quick', c11_k2: 'quick', c11_k3: 'quick', c11_k4: 'quick' };
  c(3.5, {
    ...yOut,
    tree: { o: 0 },
    c11_shapes: { s: 1.45, params: { show: 1, seq: 0, par: 0, lp: 0, xs: 510, y: 500, gap: 300, a: 0 }, pdur: 0.3 },
    loop: { params: L0, pdur: 1.2, pease: 'power3.inOut' },
    c11_model: { x: 960, y: 520, s: 1 },
    c11_h1: H('model', 380, 300, 0.8, T.BLUE), c11_e1: HL(550, 300, 870, 505, 0.9),
    c11_h2: H('adapter', 380, 400, 1.0, T.PURPLE), c11_e2: HL(550, 400, 870, 530, 1.1),
    c11_h3: H('instruction', 380, 500, 1.2), c11_e3: HL(550, 500, 865, 290, 1.3),
  }, { cut: true, cam: { x: 960, y: 520, s: 1 } });
  // 387 (2) — tools · skills · sub_agents
  c(2, {
    c11_h4: H('tools', 1540, 300, 0.0, T.TEAL), c11_e4: HL(1370, 300, 1220, 560, 0.1),
    c11_h5: H('skills', 1540, 400, 0.2, T.TEAL), c11_e5: HL(1370, 400, 1270, 600, 0.3),
    c11_h6: H('sub_agents', 1540, 500, 0.4), c11_e6: HL(1370, 500, 1290, 640, 0.5),
  });
  // 388 (3) — output_key: the agent's final text drops into a "session state" box
  c(3, {
    c11_h7: H('output_key', 380, 720, 0.0), c11_e7: HL(550, 720, 790, 650, 0.1),
    c11_st: { type: 'box', w: 520, h: 110, x: 960, y: 930, stroke: T.INK, fill: 'rgba(21,26,33,0.96)', sw: 2.5, rad: 16, html: '', in: 'draw', at: 0.4 },
    c11_stl: { type: 'text', html: cap('session state'), size: 26, color: T.DIM, x: 960, y: 850, in: 'fade', at: 0.5 },
    c11_drop: { type: 'mono', html: '"final text…"', size: 32, x: 960, y: 945, color: T.INK, in: 'fade', from: { y: 700, o: 0 }, dur: 1.0, ease: 'power3.in', at: 0.9 },
  }, { sfx: [{ at: 1.9, kind: 'tick' }] });
  // 389 (2.5) — include_contents: at "none" the earlier conversation greys out
  c(2.5, {
    c11_h8: H('include_contents', 1540, 720, 0.0), c11_e8: HL(1370, 720, 1140, 650, 0.1),
    c11_sw: { type: 'text', versions: ['<span class="m c-dim">"default"</span>', '<span class="m">"none"</span>'], ver: 1, size: 34, x: 1540, y: 800, in: 'fade', at: 0.3, dur: 0.4 },
    c11_hist: { type: 'text', html: '<span class="m">earlier conversation</span>', size: 32, x: 1540, y: 870, color: T.DIM, o: 0.25, in: 'fade', from: { o: 1, color: T.INK }, dur: 1.2, at: 0.6 },
  });
  // 390 (2) — SequentialAgent: its chain lights left to right
  const hOut = Object.fromEntries(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'st', 'stl', 'drop', 'sw', 'hist'].map((k) => ['c11_' + k, 'quick']));
  const SH = (o) => Object.assign({ show: 1, seq: 0, par: 0, lp: 0, xs: 510, y: 500, gap: 300, a: 1 }, o);
  c(2, {
    ...hOut,
    loop: { o: 0, dur: 0.35, params: LOOP({ cx: 960, cy: 520, r: 230, ring: 1 }) },
    c11_model: { o: 0, dur: 0.35 },
    c11_shapes: { params: SH({ seq: 1 }), pdur: 1.5, pease: 'none' },
    c11_wf: { type: 'text', html: cap('workflow agents'), size: 32, color: T.DIM, x: 960, y: 250, in: 'fade', at: 0.4 },
  }, { cut: true, cam: { x: 960, y: 540, s: 1 } });
  // 391 (2) — ParallelAgent: all branches light at once
  c(2, { c11_shapes: { params: SH({ seq: 1, par: 1 }), pdur: 0.6, pease: 'power2.out' } }, { cam: { x: 990, y: 545, s: 1.03 }, sfx: [{ at: 0.1, kind: 'tick' }] });
  // 392 (2.5) — LoopAgent: its counter ticks 1 → 2 → 3 and the cycle exits at max_iterations
  c(2.5, {
    c11_shapes: { params: SH({ seq: 1, par: 1, lp: 1 }), pdur: 1.7, pease: 'none' },
    c11_mx: { type: 'mono', html: 'max_iterations', size: 32, color: T.INK, x: 1612, y: 355, in: 'fade', at: 1.2, dur: 0.4 },
  }, { cam: { x: 1030, y: 545, s: 1.05 }, sfx: [{ at: 0.6, kind: 'tick' }, { at: 1.15, kind: 'tick' }, { at: 1.6, kind: 'click' }] });
  // 393 (4.5) — prompts/*.md docks onto "think"
  const LD = LOOP({ cx: 1250, cy: 620, r: 260, ring: 1 });
  c(4.5, {
    c11_shapes: 'fade', c11_wf: 'quick', c11_mx: null,
    tree: { o: 1, ver: 1 },
    loop: { o: 1, params: LD, pdur: 1.0 },
    c11_model: { x: 1250, y: 620, s: 1, o: 1 },
    c11_met: { o: 1 },
    c11_pg: { type: 'box', w: 640, h: 130, x: 1250, y: 165, stroke: T.BLUE, fill: 'rgba(21,26,33,0.96)', sw: 2.5, rad: 14, html: '<span class="m"><span class="hl">{problem_description}</span>&ensp;…&ensp;<span class="hl">{hints}</span></span>', size: 34, in: 'fade', from: { x: 420, y: TL(1), s: 0.4, o: 0 }, dur: 1.2, ease: 'expo.inOut' },
    c11_pl: { type: 'text', html: cap('prompts/*.md · filled from session state'), size: 24, color: T.DIM, x: 1250, y: 262, in: 'fade', at: 1.4 },
  }, { cut: true, cam: { x: 960, y: 540, s: 1 }, sfx: [{ at: 1.2, kind: 'pop' }] });
  // 394 (4.5) — the public training data has no hints text
  c(4.5, {
    c11_nh: { type: 'text', html: cap('the public training data<br>has no hints text'), size: 28, lh: 1.6, color: T.INK, x: 560, y: 170, in: 'fade', at: 0.3 },
    c11_hx: { type: 'rect', x: 1430, y: 165, w: 150, h: 4, fill: T.RED, in: 'grow', at: 1.0, dur: 0.6, z: 3 },
  });
  // 395 (2) — configs/sampling.yaml docks onto the model block
  c(2, {
    c11_nh: 'quick',
    c11_smp: { type: 'text', html: '<span class="plate"><span class="m c-dim">sampling.yaml:</span> temperature · thinking</span>', size: 28, x: 1250, y: 562, in: 'fade', from: { x: 420, y: TL(2), s: 0.5, o: 0 }, dur: 1.1, ease: 'expo.inOut' },
  }, { sfx: [{ at: 1.0, kind: 'pop' }] });
  // 396 (4.5) — sub_agents/*.yaml docks as a second, smaller loop
  c(4.5, {
    c11_sub: { type: 'canvas', draw: 'loop', x: 1720, y: 330, s: 0.36, in: 'fade', from: { x: 420, y: TL(3), s: 0.1, o: 0 }, dur: 1.2, ease: 'expo.inOut', params: { cx: 960, cy: 540, r: 230, draw: 1, labels: 1, ring: 0, dot: -1, exit: 0, hi: -1 } },
    c11_sl: { type: 'text', html: 'its own prompt, tools and adapter', size: 36, maxw: 340, lh: 1.2, x: 1720, y: 470, in: 'wipe', at: 1.4 },
  }, { sfx: [{ at: 1.2, kind: 'pop' }] });
  // 397 (2) — the parent calls it like a tool (AgentTool); a short result comes back
  c(2, {
    c11_call: { type: 'arrow', x1: 1600, y1: 690, x2: 1690, y2: 430, bend: 40, sw: 3, head: 14, color: T.TEAL, in: 'draw', dur: 0.5, flow: 1, pulseColor: T.TEAL },
    c11_ret: { type: 'arrow', x1: 1660, y1: 425, x2: 1560, y2: 660, bend: 40, sw: 3, head: 14, color: T.INK, in: 'draw', dur: 0.5, at: 0.8 },
    c11_at: { type: 'text', html: '<span class="m c-teal">AgentTool</span><br>→ short result', size: 30, lh: 1.3, x: 1800, y: 600, in: 'fade', at: 0.3 },
  }, { sfx: [{ at: 0.2, kind: 'click' }, { at: 1.0, kind: 'tick' }] });
  // 398 (2) — skills/<name>/SKILL.md docks onto the tool ring as a new tile
  c(2, {
    c11_call: 'quick', c11_ret: 'quick',
    c11_sk: { type: 'rect', x: 1300, y: 860, w: 34, h: 34, rad: 7, fill: T.TEAL, in: 'pop', from: { x: 420, y: TL(4), o: 0 }, dur: 1.0, ease: 'expo.inOut' },
    c11_skl: { type: 'text', html: '<span class="m">SKILL.md</span>', size: 30, x: 1300, y: 905, in: 'fade', at: 0.9 },
  }, { sfx: [{ at: 1.0, kind: 'pop' }] });
  // 399 (2) — its script runs in the sandbox; the tool-call meter drops one
  c(2, {
    c11_met: { params: { x: 1640, y: 900, w: 52, h: 130, gap: 22, v0: 0.7, v1: 0.55, v2: 0.5, labels: 0 }, pdur: 0.8 },
    c11_skr: { type: 'text', html: '<span class="c-teal">−1</span> tool call', size: 34, x: 1715, y: 990, in: 'rise', at: 0.5 },
  }, { sfx: [{ at: 0.5, kind: 'tick' }] });
  // 400 (4.5) — adapters/<name>/ docks as a purple sheet on the model block
  c(4.5, {
    c11_skr: 'quick',
    c11_sheet: { type: 'rect', x: 1250, y: 660, w: 210, h: 14, rad: 5, fill: T.PURPLE, in: 'fade', from: { x: 420, y: TL(5), o: 0 }, dur: 1.1, ease: 'expo.inOut' },
    c11_ad1: { type: 'text', html: '<span class="plate"><span class="c-purple">PEFT LoRA</span> · safetensors only</span>', size: 40, x: 1250, y: 440, in: 'wipe', at: 1.1 },
    c11_ad2: { type: 'text', html: '<span class="plate">rank ≤ <span class="c-yellow">128</span> · up to <span class="c-yellow">8</span></span>', size: 40, x: 1250, y: 497, in: 'wipe', at: 1.8 },
  }, { sfx: [{ at: 1.1, kind: 'pop' }] });
  // 401 (2.5) — reading beat on "rank ≤ 128 · up to 8"
  // (a hand-made push: same camera move as F.beat — x1.12, half way — but the tree fades so the push never crops it)
  c(2.5, {
    c11_ad2: { s: 1.05 }, tree: { o: 0, dur: 0.4 }, rail: { o: 0, dur: 0.35 },
  }, { cam: { x: 1105, y: 518, s: 1.12 }, drift: 0.4, beatCam: { x: 960, y: 540, s: 1 }, railHidden: true });
  // 402 (2) — eval_config.yaml docks onto the meters as the four dials
  c(2, {
    c11_met: 'fade', tree: { o: 1, dur: 0.6 }, c11_ad2: { s: 1 },
    c11_dials: { type: 'canvas', draw: 'meters', names: ['timeout', 'calls', 'minutes', 'turns'], colors: [T.YELLOW, T.TEAL, T.YELLOW, T.BLUE], in: 'fade', dur: 0.4, at: 0.4, params: { x: 1580, y: 900, w: 48, h: 130, gap: 40, v0: 0.6, v1: 0.55, v2: 0.6, v3: 0.5, labels: 1 }, paramsFrom: { v0: 0, v1: 0, v2: 0, v3: 0 }, pdur: 1.1, pease: 'power3.out' },
    c11_ev: { type: 'mono', html: 'eval_config.yaml', size: 30, color: T.DIM, x: 1730, y: 730, in: 'fade', from: { x: 420, y: TL(6), o: 0 }, dur: 1.0, ease: 'expo.inOut' },
  }, { sfx: [{ at: 1.0, kind: 'pop' }] });
  // 403 (3.5) — WIDE every file joined to the part it controls by a thin line
  const J = (id, k, x2, y2, at) => ({ [id]: { type: 'arrow', x1: 120 + 22 * (k === 0 ? 10 : 18) + 40, y1: TL(k), x2, y2, bend: -30, sw: 2, head: 10, color: '#4E5661', in: 'draw', at, dur: 0.8 } });
  c(3.5, {
    ...J('c11_j0', 0, 1150, 610, 0.0), ...J('c11_j1', 1, 925, 170, 0.12), ...J('c11_j2', 2, 1010, 680, 0.24), ...J('c11_j3', 3, 1600, 330, 0.36),
    ...J('c11_j4', 4, 1280, 860, 0.48), ...J('c11_j5', 5, 1140, 660, 0.6), ...J('c11_j6', 6, 1570, 820, 0.72),
  }, { cam: { x: 960, y: 540, s: 1 }, sfx: [{ at: 0.1, kind: 'tick' }] });
  // 404 (4.5) — "every lever you have is in this tree"; then everything else sinks to a third (reading beat folded in)
  const dimIds = ['loop', 'c11_model', 'c11_pg', 'c11_pl', 'c11_hx', 'c11_smp', 'c11_sub', 'c11_sl', 'c11_at', 'c11_sk', 'c11_skl', 'c11_sheet', 'c11_ad1', 'c11_ad2', 'c11_dials', 'c11_ev', 'c11_j0', 'c11_j1', 'c11_j2', 'c11_j3', 'c11_j4', 'c11_j5', 'c11_j6'];
  c(4.5, {
    c11_lev: { type: 'text', html: 'every lever you have is <span class="u">in this tree</span>', size: 56, x: 480, y: 920, maxw: 820, in: 'wipe', at: 0.2 },
    ...Object.fromEntries(dimIds.map((k) => [k, { o: 0.33, at: 2.0, dur: 0.9 }])),
    tree: { s: 1.04, at: 2.0, dur: 0.9 },
  }, { cam: { x: 820, y: 600, s: 1.08 } });
  // 405 (2.5) — the lines fade; the loop slides onto a time axis (hand-off 11 → 12); the RAIL rewrites to "12"
  c(2.5, {
    ...Object.fromEntries(dimIds.filter((k) => k !== 'loop').map((k) => [k, 'quick'])),
    tree: 'left', c11_lev: 'down',
    loop: { type: 'canvas', draw: 'loop', x: 960, y: 540, o: 1, params: { cx: 420, cy: 500, r: 170, draw: 1, labels: 1, ring: 0, dot: -1, exit: 0, hi: -1, hiA: 0 }, pdur: 1.85, pease: 'power2.inOut', dur: 0.6 },
    rail: { ver: 12, at: 0.6, dur: 1.0 },
  }, { cam: { x: 960, y: 540, s: 1 }, drift: 0 });
})();
