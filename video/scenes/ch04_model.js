// Chapter 4 — The model and the hardware (storyboard rows 116–164, 172 beats).
// 3D: THREE_SCENES.rig (scenes/three_rig.mjs). HTML labels pinned from window.ANCHORS via F.hook.
(function () {
  const { T } = F;
  const c = F.comp.bind(F);
  F.chapter(K.CH[4]);
  const C0 = FILM.COMPS.length;
  const { clamp, ease, rr } = DRAW.util;
  const lerp = (a, b, t) => a + (b - a) * t;
  const PANEL = 'rgba(21,26,33,0.96)';

  // ------------------------------------------------------------------ rig params (accumulating)
  let RP = { yaw: -0.62, pitch: 40, dist: 15.5, tx: 0.25, ty: 0.1, tz: 0.35, key: 0, cards: 0, seams: 0, dock: 0, glow: 0, pass: -1, film: 0, films: 0, dimW: 0 };
  const R = (o, extra = {}) => { RP = Object.assign({}, RP, o); return Object.assign({ params: RP }, extra); };

  // ------------------------------------------------------------------ labels pinned to 3D anchors
  // id -> [anchor, dx, dy]; positions are world pixels (the rig canvas is a full stage at rig x/y/s)
  const PIN = {
    c04_name: ['slabFront', 0, 64],
    c04_p31: ['slabLeft', -40, -78],
    c04_p17: ['slabRight', 70, -70],
    c04_l4_0: ['card0', 0, -52], c04_l4_1: ['card1', 0, -52], c04_l4_2: ['card2', 0, -52], c04_l4_3: ['card3', 0, -52],
    c04_frozen: ['slabFront', 0, 64],
    c04_film: ['film', 0, -70],
    c04_total: ['cardsMid', 0, -170],
  };
  F.hook(() => {
    const rg = FILM.EL.rig, A = window.ANCHORS;
    if (!rg || !A) return;
    const q = rg.proxy;
    for (const id in PIN) {
      const e = FILM.EL[id]; if (!e) continue;
      const [a, dx, dy] = PIN[id], p = A[a]; if (!p) continue;
      e.proxy.x = q.x + (p[0] - 960) * q.s + dx;
      e.proxy.y = q.y + (p[1] - 540) * q.s + dy;
    }
  });
  const pinLabel = (id, html, o = {}) => ({ [id]: Object.assign({ type: 'text', html: `<span class="plate">${html}</span>`, size: 44, x: 960, y: 540, in: 'fade', z: 6 }, o) });
  const capLabel = (id, html, o = {}) => ({ [id]: Object.assign({ type: 'text', html: `<span class="cap plate" style="font-size:1em">${html}</span>`, size: 26, color: T.INK, x: 960, y: 540, in: 'fade', z: 6 }, o) });

  // ------------------------------------------------------------------ chapter-local drawings
  // bracket over the four cards (reads the anchors the rig published this frame)
  DRAW.c04_brk = (ctx, p) => {
    const A = window.ANCHORS, rg = FILM.EL.rig; if (!A || !rg || !A.card0) return;
    const q = rg.proxy, W = (a) => [q.x + (a[0] - 960) * q.s, q.y + (a[1] - 540) * q.s];
    const a = W(A.card0), b = W(A.card3), m = W(A.cardsMid), up = 84;
    const pts = [[a[0] - 30, a[1] - up + 22], [a[0] - 30, a[1] - up], [m[0] - 14, m[1] - up], [m[0], m[1] - up - 14], [m[0] + 14, m[1] - up], [b[0] + 30, b[1] - up], [b[0] + 30, b[1] - up + 22]];
    DRAW.polyline(ctx, pts, p.draw ?? 1, { color: T.YELLOW, w: 4 });
  };
  // 3→4 hand-off: ch3's blue block behind "One open model." (c03_blk, 1060 × 210 at 960, 540, rad 18,
  // BLUE at 22 %) turns solid brand BLUE and morphs onto the slab's top face (live anchors), then
  // dissolves into the 3D slab. k 0..1 morph, 1..2 fade. Drawn as a filled inset polygon plus a
  // round-joined stroke (= rounded corners) into an offscreen canvas, then composited at alpha.
  const TOPC = document.createElement('canvas'); TOPC.width = 1920; TOPC.height = 1080;
  const TOPX = TOPC.getContext('2d');
  DRAW.c04_top = (ctx, p) => {
    const k = p.k || 0, m = ease(clamp(k)), fade = clamp(k - 1);
    if (fade >= 1) return;
    const A = window.ANCHORS, rg = FILM.EL.rig, R0 = 18;
    const rect = [[430 + R0, 435 + R0], [1490 - R0, 435 + R0], [1490 - R0, 645 - R0], [430 + R0, 645 - R0]];
    let quad = rect;
    if (A && A.slabTopQ && rg) {
      const q = rg.proxy;
      quad = A.slabTopQ.map((a) => [q.x + (a[0] - 960) * q.s, q.y + (a[1] - 540) * q.s]);
    }
    const pts = rect.map((r, i) => [lerp(r[0], quad[i][0], m), lerp(r[1], quad[i][1], m)]);
    TOPX.setTransform(1, 0, 0, 1, 0, 0); TOPX.clearRect(0, 0, 1920, 1080);
    TOPX.beginPath(); pts.forEach((pt, i) => (i ? TOPX.lineTo(pt[0], pt[1]) : TOPX.moveTo(pt[0], pt[1]))); TOPX.closePath();
    TOPX.fillStyle = T.BLUE; TOPX.fill();
    const lw = 2 * R0 * (1 - m);
    if (lw > 0.3) { TOPX.lineJoin = 'round'; TOPX.lineWidth = lw; TOPX.strokeStyle = T.BLUE; TOPX.stroke(); }
    ctx.save(); ctx.globalAlpha *= lerp(0.22, 1, ease(clamp(k * 1.6))) * (1 - fade);
    ctx.drawImage(TOPC, 0, 0); ctx.restore();
  };

  // INT4 inset: one weight as 16 bit-cells squeezed to 4; the activation stays 16; number lines; QAT loop
  const BITS = '0110100111010010';
  const BX = 1040, BW = 40, BP = 46, WY = 280, AY = 410;
  DRAW.c04_bits = (ctx, p) => {
    const w = p.w || 0, sq = ease(clamp(w - 1)), act = clamp(p.act || 0);
    ctx.save(); ctx.globalAlpha *= p.a ?? 1;
    DRAW.text(ctx, 'one weight', BX, WY - 62, { caps: true, sans: true, size: 24, color: T.DIM, align: 'left', a: clamp(w * 3) });
    DRAW.text(ctx, '16 bits', 1790, WY - 62, { size: 40, color: T.DIM, align: 'right', a: clamp(w * 3) * (1 - sq) });
    DRAW.text(ctx, '4 bits', 1790, WY - 62, { size: 40, color: T.BLUE, align: 'right', a: sq });
    let x = BX;
    for (let j = 0; j < 16; j++) {
      const k = ease(clamp(w * 17 - j));
      if (k <= 0) continue;
      const keep = j < 4 ? 1 : 1 - sq;
      const cw = BW * keep;
      if (cw > 0.5) {
        ctx.save(); ctx.globalAlpha *= k * (j < 4 ? 1 : 1 - sq * 0.6);
        rr(ctx, x, WY - BW / 2 - (1 - k) * 20, cw, BW, 6); ctx.fillStyle = DRAW.rgba(T.BLUE, 0.28); ctx.fill();
        ctx.strokeStyle = T.BLUE; ctx.lineWidth = 2; ctx.stroke();
        if (cw > 20) DRAW.text(ctx, BITS[j], x + cw / 2, WY + 2 - (1 - k) * 20, { mono: true, size: 24, color: T.INK });
        ctx.restore();
      }
      x += BP * keep;
    }
    if (act > 0) {
      const off = (1 - ease(act)) * -260;
      ctx.save(); ctx.globalAlpha *= act;
      DRAW.text(ctx, 'activation', BX + off, AY - 62, { caps: true, sans: true, size: 24, color: T.DIM, align: 'left' });
      DRAW.text(ctx, '16 bits', 1790, AY - 62, { size: 40, color: T.DIM, align: 'right' });
      for (let j = 0; j < 16; j++) {
        rr(ctx, BX + off + j * BP, AY - BW / 2, BW, BW, 6); ctx.fillStyle = DRAW.rgba(T.INK, 0.12); ctx.fill();
        ctx.strokeStyle = DRAW.rgba(T.INK, 0.7); ctx.lineWidth = 2; ctx.stroke();
        DRAW.text(ctx, BITS[(j * 7 + 3) % 16], BX + off + j * BP + BW / 2, AY + 2, { mono: true, size: 24, color: T.INK });
      }
      ctx.restore();
    }
    // number lines: 16 levels vs 65,536 levels
    const l1 = clamp((p.lines || 0) * 2), l2 = clamp((p.lines || 0) * 2 - 1);
    const LX = 1040, LW = 740;
    if (l1 > 0) {
      DRAW.text(ctx, '4 bits = 16 levels', LX, 600, { size: 40, color: T.INK, align: 'left', a: l1 });
      DRAW.polyline(ctx, [[LX, 660], [LX + LW, 660]], l1, { color: T.DIM, w: 3 });
      for (let i = 0; i < 16; i++) {
        const k = clamp(l1 * 17 - i); if (k <= 0) continue;
        ctx.beginPath(); ctx.arc(LX + (i / 15) * LW, 660, 9, 0, Math.PI * 2); ctx.fillStyle = DRAW.rgba(T.BLUE, k); ctx.fill();
      }
    }
    if (l2 > 0) {
      DRAW.text(ctx, '16 bits = 65,536 levels', LX, 740, { size: 40, color: T.INK, align: 'left', a: l2 });
      DRAW.polyline(ctx, [[LX, 800], [LX + LW, 800]], l2, { color: T.DIM, w: 3 });
      ctx.save(); ctx.globalAlpha *= l2;
      for (let i = 0; i <= 370 * l2; i++) { ctx.fillStyle = DRAW.rgba(T.INK, 0.55); ctx.fillRect(LX + i * 2, 788, 1, 24); }
      ctx.restore();
    }
    // QAT: a training loop around the 4-bit weight
    const lp = clamp(p.loop || 0);
    if (lp > 0) {
      const cx = BX + 2 * BP - 3, cy = WY, rx = 150, ry = 52, pts = [];
      for (let i = 0; i <= 60; i++) { const a = Math.PI * 0.9 + (i / 60) * Math.PI * 1.85; pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); }
      DRAW.polyline(ctx, pts, lp, { color: T.PURPLE, w: 4 });
      if (lp > 0.97) { const a = Math.PI * 0.9 + Math.PI * 1.85; DRAW.arrowHead(ctx, cx + rx * Math.cos(a), cy + ry * Math.sin(a), a + Math.PI / 2, 18, T.PURPLE); }
    }
    ctx.restore();
  };

  // tensor parallelism as maths: W in four row blocks, the same x, four partial outputs, stacked
  const TPW = { x: 540, w: 400, y: 300, h: 120 };
  DRAW.c04_tp = (ctx, p) => {
    const sp = clamp(p.split || 0), xin = clamp(p.xin || 0), st = ease(clamp(p.stack || 0));
    const gap = 18 * ease(sp);
    const rowY = (i, g) => TPW.y + i * (TPW.h + g);
    const sub = ['₁', '₂', '₃', '₄'];
    for (let i = 0; i < 4; i++) {
      const y = rowY(i, gap);
      rr(ctx, TPW.x, y, TPW.w, TPW.h, 8); ctx.fillStyle = DRAW.rgba(T.BLUE, i % 2 ? 0.26 : 0.4); ctx.fill();
      ctx.strokeStyle = T.BLUE; ctx.lineWidth = 2.5; ctx.stroke();
      DRAW.text(ctx, 'W' + sub[i], TPW.x + TPW.w / 2, y + TPW.h / 2, { italic: true, size: 50, color: T.INK, a: sp });
      DRAW.text(ctx, 'card ' + (i + 1), TPW.x - 30, y + TPW.h / 2, { caps: true, sans: true, size: 24, color: T.DIM, align: 'right', a: sp });
    }
    if (sp < 0.3) DRAW.text(ctx, 'W', TPW.x + TPW.w / 2, TPW.y + 2 * TPW.h, { italic: true, size: 64, color: T.INK, a: 1 - sp / 0.3 });
    // the input x (same vector for every block)
    if (xin > 0) {
      const off = (1 - ease(clamp(xin * 2))) * 160;
      ctx.save(); ctx.globalAlpha *= clamp(xin * 2);
      rr(ctx, 1020 + off, 340, 52, 400, 8); ctx.fillStyle = DRAW.rgba(T.INK, 0.14); ctx.fill(); ctx.strokeStyle = T.INK; ctx.lineWidth = 2.5; ctx.stroke();
      DRAW.text(ctx, 'x', 1046 + off, 540, { italic: true, size: 50, color: T.INK });
      DRAW.text(ctx, '=', 1150, 540 + gap * 1.5, { size: 64, color: T.INK });
      ctx.restore();
      for (let i = 0; i < 4; i++) {
        const k = ease(clamp(xin * 2 - 1)); if (k <= 0) continue;
        const g = gap * (1 - st);
        const y = rowY(i, g);
        ctx.save(); ctx.globalAlpha *= k;
        rr(ctx, 1230, y, 52, TPW.h, 6); ctx.fillStyle = DRAW.rgba(T.BLUE, i % 2 ? 0.26 : 0.4); ctx.fill(); ctx.strokeStyle = T.BLUE; ctx.lineWidth = 2.5; ctx.stroke();
        DRAW.text(ctx, 'W' + sub[i] + 'x', 1320, y + TPW.h / 2, { italic: true, size: 46, color: T.INK, align: 'left', a: 1 - st });
        ctx.restore();
      }
      if (st > 0) {
        ctx.save(); ctx.globalAlpha *= st;
        DRAW.polyline(ctx, [[1310, TPW.y], [1330, TPW.y], [1330, TPW.y + 4 * TPW.h], [1310, TPW.y + 4 * TPW.h]], st, { color: T.INK, w: 3 });
        DRAW.text(ctx, 'y', 1370, TPW.y + 2 * TPW.h, { italic: true, size: 60, color: T.INK, align: 'left' });
        DRAW.text(ctx, 'one output, computed across four cards', 960, 870, { size: 42, color: T.DIM });
        ctx.restore();
      }
    }
  };

  // LoRA inset beside the slab: B (tall, thin) and A (short, wide); optional product B·A
  DRAW.c04_bai = (ctx, p) => {
    const ba = clamp(p.ba || 0), mul = ease(clamp(p.mul || 0));
    const kB = ease(clamp(ba * 2)), kA = ease(clamp(ba * 2 - 1));
    const B = { x: 1040, y: 480, w: 52, h: 360 }, A = { x: 1140, y: 400, w: 360, h: 52 };
    if (kB > 0) {
      rr(ctx, B.x, B.y, B.w, B.h * kB, 8); ctx.fillStyle = DRAW.rgba(T.PURPLE, 0.35); ctx.fill(); ctx.strokeStyle = T.PURPLE; ctx.lineWidth = 3; ctx.stroke();
      DRAW.text(ctx, 'B', B.x + B.w / 2, B.y - 40, { italic: true, size: 52, color: T.PURPLE, a: kB });
      DRAW.text(ctx, 'd × r', B.x + B.w / 2, B.y + B.h + 34, { size: 30, color: T.DIM, a: kB });
    }
    if (kA > 0) {
      rr(ctx, A.x, A.y, A.w * kA, A.h, 8); ctx.fillStyle = DRAW.rgba(T.PURPLE, 0.35); ctx.fill(); ctx.strokeStyle = T.PURPLE; ctx.lineWidth = 3; ctx.stroke();
      DRAW.text(ctx, 'A', A.x + A.w + 44, A.y + A.h / 2, { italic: true, size: 52, color: T.PURPLE, a: kA });
      DRAW.text(ctx, 'r × k', A.x + A.w / 2, A.y - 34, { size: 30, color: T.DIM, a: kA });
    }
    if (mul > 0) {
      const P = { x: A.x, y: B.y, w: A.w, h: B.h };
      ctx.save(); ctx.globalAlpha *= mul;
      rr(ctx, P.x, P.y, P.w * mul, P.h, 8); ctx.fillStyle = DRAW.rgba(T.PURPLE, 0.5); ctx.fill(); ctx.strokeStyle = T.PURPLE; ctx.lineWidth = 3; ctx.stroke();
      DRAW.text(ctx, 'B·A', P.x + P.w / 2, P.y + P.h / 2 - 24, { italic: true, size: 60, color: T.INK });
      DRAW.text(ctx, 'rank r', P.x + P.w / 2, P.y + P.h / 2 + 40, { caps: true, sans: true, size: 26, color: T.INK });
      ctx.restore();
    }
  };

  // toy LoRA: W (8×8) + B (8×2) · A (2×8) = B·A (8×8), with a lit product cell and a column fill
  const TOY = { cell: 44, pitch: 48, y0: 238, Wx: 236, Bx: 716, Ax: 868, Ay: 382, Px: 1348 };
  const Bv = [[2, 1], [1, 3], [3, 2], [1, 1], [2, 3], [3, 1], [1, 2], [2, 2]];
  const Av = [[1, 2, 3, 1, 2, 1, 3, 2], [2, 1, 1, 3, 2, 3, 1, 2]];
  const prod = (i, j) => Bv[i][0] * Av[0][j] + Bv[i][1] * Av[1][j];
  DRAW.c04_toy = (ctx, p) => {
    const kW = clamp(p.w || 0), kBA = clamp(p.ba || 0), cell = clamp(p.cell || 0), fill = clamp(p.fill || 0);
    const C = TOY.cell, Pp = TOY.pitch;
    const sq = (x, y, col, a, stroke) => { rr(ctx, x, y, C, C, 5); ctx.fillStyle = DRAW.rgba(col, a); ctx.fill(); ctx.strokeStyle = stroke || DRAW.rgba(col, 0.8); ctx.lineWidth = 1.6; ctx.stroke(); };
    const LI = 2, LJ = 5;
    // W
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
      const k = clamp(kW * 16 - (i + j)); if (k <= 0) continue;
      ctx.save(); ctx.globalAlpha *= k; sq(TOY.Wx + j * Pp, TOY.y0 + i * Pp, T.BLUE, 0.22); ctx.restore();
    }
    DRAW.text(ctx, 'W', TOY.Wx + 4 * Pp - 2, TOY.y0 - 44, { italic: true, size: 48, color: T.BLUE, a: kW });
    DRAW.text(ctx, '8 × 8', TOY.Wx + 4 * Pp - 2, TOY.y0 + 8 * Pp + 28, { size: 30, color: T.DIM, a: kW });
    if (kBA > 0) {
      ctx.save(); ctx.globalAlpha *= kBA;
      DRAW.text(ctx, '+', TOY.Bx - 26, 430, { size: 64, color: T.INK });
      DRAW.text(ctx, '·', TOY.Ax - 28, 430, { size: 64, color: T.INK });
      DRAW.text(ctx, '=', TOY.Px - 24, 430, { size: 64, color: T.INK });
      for (let i = 0; i < 8; i++) for (let r = 0; r < 2; r++) {
        const hi = cell > 0 && i === LI ? cell : 0;
        sq(TOY.Bx + r * Pp, TOY.y0 + i * Pp, T.PURPLE, 0.12 + 0.12 * Bv[i][r] + 0.3 * hi, hi > 0.5 ? T.YELLOW : null);
      }
      for (let r = 0; r < 2; r++) for (let j = 0; j < 8; j++) {
        const hi = cell > 0 && j === LJ ? cell : 0;
        sq(TOY.Ax + j * Pp, TOY.Ay + r * Pp, T.PURPLE, 0.12 + 0.12 * Av[r][j] + 0.3 * hi, hi > 0.5 ? T.YELLOW : null);
      }
      DRAW.text(ctx, 'B', TOY.Bx + Pp - 2, TOY.y0 - 44, { italic: true, size: 48, color: T.PURPLE });
      DRAW.text(ctx, '8 × 2', TOY.Bx + Pp - 2, TOY.y0 + 8 * Pp + 28, { size: 30, color: T.DIM });
      DRAW.text(ctx, 'A', TOY.Ax + 4 * Pp - 2, TOY.Ay - 44, { italic: true, size: 48, color: T.PURPLE });
      DRAW.text(ctx, '2 × 8', TOY.Ax + 4 * Pp - 2, TOY.Ay + 2 * Pp + 28, { size: 30, color: T.DIM });
      // the product grid (outlines first, then the fill)
      for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
        const fj = clamp(fill * 9 - j);
        const lit = i === LI && j === LJ ? cell : 0;
        const v = prod(i, j) / 18;
        rr(ctx, TOY.Px + j * Pp, TOY.y0 + i * Pp, C, C, 5);
        ctx.fillStyle = DRAW.rgba(T.PURPLE, Math.max(fj, lit) * (0.2 + 0.6 * v)); ctx.fill();
        ctx.strokeStyle = lit > 0.5 && fill < 0.05 ? T.YELLOW : DRAW.rgba(T.PURPLE, 0.35 + 0.5 * fj); ctx.lineWidth = lit > 0.5 && fill < 0.05 ? 3 : 1.6; ctx.stroke();
      }
      DRAW.text(ctx, 'B·A', TOY.Px + 4 * Pp - 2, TOY.y0 - 44, { italic: true, size: 48, color: T.PURPLE });
      DRAW.text(ctx, '8 × 8', TOY.Px + 4 * Pp - 2, TOY.y0 + 8 * Pp + 28, { size: 30, color: T.DIM });
      ctx.restore();
    }
  };

  // ------------------------------------------------------------------ layout helpers
  const plate = (id, x, y, w, h, o = {}) => ({ [id]: Object.assign({ type: 'box', x, y, w, h, stroke: '#3A4654', fill: PANEL, sw: 2.5, rad: 20, html: '', in: 'scale', z: 4 }, o) });
  const cv = (id, draw, params, o = {}) => ({ [id]: Object.assign({ type: 'canvas', draw, x: 960, y: 540, params, in: 'fade', dur: 0.3, z: 5 }, o) });
  const RIG0 = { type: 'three', scene: 'rig', x: 960, y: 500, w: 1920, h: 1080, z: 1 };

  // ================================================================== 116 (4.5) — the only model
  c(4.5, {
    ...K.rail(4),
    oneopen: { type: 'text', html: 'One open model.', size: 120, x: 960, y: 540, color: T.INK, in: 'none', from: { o: 1, s: 1 }, o: 0, s: 1.18, y: 470, at: 0, dur: 0.42, ease: 'power2.in' },
    // ch3's translucent block hands over to c04_top at the same pixels, which becomes the slab's top face
    c03_blk: { type: 'rect', x: 960, y: 540, w: 1060, h: 210, rad: 18, fill: 'rgba(88,196,221,0.22)', z: 0, in: 'none', o: 0, at: 0.034, dur: 0.004, ease: 'none' },
    c04_top: { type: 'canvas', draw: 'c04_top', x: 960, y: 540, params: { k: 2 }, paramsFrom: { k: 0 }, in: 'none', at: -0.01, pdur: 1.75, pease: 'power1.inOut', z: 3 },
    // the rig renders from the first frame (so the morph can read the slab's anchors) but stays invisible until the plate lands
    rig: Object.assign({}, RIG0, R({ key: 1, yaw: -0.5 }), { in: 'fade', from: { o: 0.003 }, at: -0.05, dur: 1.3, ease: 'expo.in', paramsFrom: { key: 0, yaw: -0.66 } }),
    ...capLabel('c04_only', 'the only model', { y: 150, color: T.DIM, at: 1.4 }),
    c04_name: { type: 'text', html: '<span class="plate m">gemma-4-31b-it-qat-w4a16-ct</span>', size: 40, color: T.BLUE, in: 'wipe', at: 1.6, z: 6 },
  }, { clear: true, keep: ['oneopen'], cut: true, cam: { x: 960, y: 540, s: 1 }, animateFirst: true });

  // 117 (2.5) — key from the left, rim behind; the camera orbits slowly
  c(2.5, { rig: R({ yaw: -0.42 }), c03_blk: null, c04_top: null });

  // 118 (4.5) — "31B parameters"
  c(4.5, { oneopen: null, rig: R({ yaw: -0.36 }), ...pinLabel('c04_p31', '<span class="c-yellow">31B</span> parameters', { at: 0.3, in: 'wipe' }) }, { sfx: [{ at: 0.3, kind: 'tick' }] });

  // 119 (4.5) — "≈17 GB of weights"
  c(4.5, { rig: R({ yaw: -0.3 }), ...pinLabel('c04_p17', '<span class="c-yellow">≈17 GB</span> of weights', { at: 0.3, in: 'wipe' }) }, { sfx: [{ at: 0.3, kind: 'tick' }] });

  // 120 (4.5) — one base model per submission
  c(4.5, {
    rig: R({ yaw: -0.24, dist: 16 }),
    c04_only: 'fade',
    c04_rule: { type: 'text', html: '<span class="plate">one base model per submission — <span class="c-dim">every agent in your bundle uses it</span></span>', size: 46, x: 960, y: 150, in: 'wipe', at: 0.3, z: 6 },
  });

  // 121 (2) — 2D inset beside the slab: 16 bit-cells squeeze to 4
  c(2, {
    c04_rule: 'up', c04_p31: 'fade', c04_p17: 'fade',
    rig: R({ yaw: -0.2 }, { x: 490, y: 540, s: 0.92 }),
    ...plate('c04_pl', 1400, 560, 860, 840),
    ...cv('c04_bits', 'c04_bits', { w: 2, act: 0, lines: 0, loop: 0 }, { paramsFrom: { w: 0 }, pdur: 1.45, pease: 'power2.inOut', at: 0.15 }),
  }, { cut: true });

  // 122 (4.5) — the activation stays 16 bits: W4A16
  c(4.5, {
    rig: R({ yaw: -0.16 }),
    c04_bits: { params: { w: 2, act: 1, lines: 0, loop: 0 }, pdur: 1.2 },
    c04_w4: { type: 'text', html: '<span class="c-yellow">W4A16</span>: 4-bit weights, 16-bit activations', size: 44, x: 1400, y: 510, in: 'wipe', at: 1.0, z: 6 },
  });

  // 123 (2.5) — reading beat: underline "W4A16"
  F.beat(2.5, { id: 'c04_w4', mode: 'underline', w: 170, dx: -258, under: 32, color: T.YELLOW });

  // 124 (4.5) — 16 levels vs 65,536 levels
  c(4.5, { rig: R({ yaw: -0.12 }), c04_bits: { params: { w: 2, act: 1, lines: 1, loop: 0 }, pdur: 2.8 } });

  // 125 (4.5) — QAT: trained with the quantization in the loop
  c(4.5, {
    rig: R({ yaw: -0.08 }),
    c04_bits: { params: { w: 2, act: 1, lines: 1, loop: 1 }, pdur: 1.6 },
    c04_qat: { type: 'text', html: '<span class="c-purple">QAT</span>: trained with the quantization in the loop', size: 40, x: 1400, y: 890, in: 'wipe', at: 0.5, z: 6 },
  });

  // 126 (4.5) — wide (42°): four cards rise behind the slab, "NVIDIA L4" on each
  const L4 = {};
  for (let i = 0; i < 4; i++) Object.assign(L4, capLabel('c04_l4_' + i, 'NVIDIA<br>L4', { at: 1.9 + 0.2 * i, size: 24, lh: 1.1 }));
  c(4.5, {
    c04_name: 'fade', c04_pl: 'shrink', c04_bits: 'shrink', c04_w4: 'shrink', c04_qat: 'shrink',
    rig: R({ yaw: -0.42, pitch: 42, dist: 16.5, tx: 0.2, ty: 0.4, tz: -0.1, cards: 1 }, { x: 900, y: 548, s: 0.9 }),
    ...L4,
  }, { cut: true, sfx: [{ at: 0.6, kind: 'tick' }, { at: 0.9, kind: 'tick' }, { at: 1.2, kind: 'tick' }, { at: 1.5, kind: 'tick' }] });

  // 127 (4.5) — a bracket over the four: "4 × L4 · 96 GB in total"
  c(4.5, {
    rig: R({ yaw: -0.48 }),
    c04_l4_0: { o: 0 }, c04_l4_1: { o: 0 }, c04_l4_2: { o: 0 }, c04_l4_3: { o: 0 },
    ...cv('c04_brk', 'c04_brk', { draw: 1 }, { paramsFrom: { draw: 0 }, pdur: 1.1, at: 0.2 }),
    c04_total: { type: 'text', html: '<span class="plate"><span class="c-yellow">4 × L4</span> · <span class="c-yellow">96 GB</span> in total</span>', size: 52, x: 900, y: 250, in: 'wipe', at: 0.9, z: 6 },
  });

  // 128 (2.5) — reading beat: push in on "96 GB in total"
  F.beat(2.5, { id: 'c04_total', mode: 'push', dx: 90 });

  // 129 (3.5) — the slab divides in place into four row blocks
  c(3.5, {
    c04_brk: 'fade', c04_total: 'up',
    rig: R({ yaw: -0.54, seams: 1 }),
    c04_rows: { type: 'text', html: '<span class="plate">four blocks of rows · <span class="c-dim">each owns a quarter of the output features</span></span>', size: 42, x: 960, y: 980, in: 'wipe', at: 0.6, z: 6 },
  }, { sfx: [{ at: 0.4, kind: 'click' }] });

  // 130 (4.5) — the blocks slide into the four cards; each edge lights
  c(4.5, {
    rig: R({ yaw: -0.6, dock: 1 }, { pdur: 3.0 }),
    c04_rows: 'down',
    c04_l4_0: { o: 1, at: 2.2 }, c04_l4_1: { o: 1, at: 2.3 }, c04_l4_2: { o: 1, at: 2.4 }, c04_l4_3: { o: 1, at: 2.5 },
    c04_tps: { type: 'text', html: '<span class="plate m">tensor_parallel_size = <span class="c-yellow">4</span></span>', size: 56, x: 960, y: 150, in: 'wipe', at: 2.0, z: 6 },
  }, { sfx: [{ at: 2.6, kind: 'click' }] });

  // 131 (2.5) — reading beat: "tensor_parallel_size = 4" stays bright, the rest sinks to a third
  c(2.5, {
    rig: R({ pass: 0 }, { o: 0.33 }),
    c04_tps: { s: 1.12, y: 170 },
    c04_l4_0: { o: 0.33 }, c04_l4_1: { o: 0.33 }, c04_l4_2: { o: 0.33 }, c04_l4_3: { o: 0.33 },
  }, { drift: 0.4 });

  // 132 (4.5) — a blue input bar passes down through all four cards at once
  c(4.5, {
    rig: R({ pass: 1, yaw: -0.56 }, { o: 1, pdur: 2.6, pease: 'power1.inOut' }),
    c04_tps: { s: 1, y: 150 },
    c04_l4_0: { o: 1 }, c04_l4_1: { o: 1 }, c04_l4_2: { o: 1 }, c04_l4_3: { o: 1 },
    c04_fwd: { type: 'text', html: '<span class="plate">one forward pass, <span class="c-blue">four GPUs</span></span>', size: 48, x: 960, y: 980, in: 'wipe', at: 0.4, z: 6 },
  });

  // 133 (2) — maths over the 3D on a dark plate: W in four row blocks, one per card
  const fade3 = { c04_l4_0: { o: 0 }, c04_l4_1: { o: 0 }, c04_l4_2: { o: 0 }, c04_l4_3: { o: 0 } };
  c(2, {
    rig: R({ yaw: -0.54 }, { o: 0.25 }), ...fade3,
    c04_tps: 'up', c04_fwd: 'down',
    ...plate('c04_mp', 960, 540, 1620, 820, { z: 7 }),
    ...cv('c04_tp', 'c04_tp', { split: 1, xin: 0, stack: 0 }, { paramsFrom: { split: 0 }, pdur: 1.2, z: 8 }),
  }, { cut: true });

  // 134 (2) — the same x multiplies every block at once
  c(2, { c04_tp: { params: { split: 1, xin: 1, stack: 0 }, pdur: 1.4 } }, { sfx: [{ at: 0.8, kind: 'tick' }] });

  // 135 (2.5) — the quarters stack into one output (simplified)
  c(2.5, {
    c04_tp: { params: { split: 1, xin: 1, stack: 1 }, pdur: 1.2 },
    c04_simp: { type: 'text', html: '<span class="cap" style="font-size:1em">simplified</span>', size: 26, color: T.YELLOW, x: 1640, y: 200, in: 'fade', at: 0.4, z: 9 },
  });

  // 136 (4.5) — "served by vLLM · max_model_len = 32,768 tokens"
  c(4.5, {
    c04_mp: 'shrink', c04_tp: 'shrink', c04_simp: 'quick',
    rig: R({ yaw: -0.46, glow: 0.4 }, { o: 1 }),
    c04_l4_0: { o: 1 }, c04_l4_1: { o: 1 }, c04_l4_2: { o: 1 }, c04_l4_3: { o: 1 },
    c04_vllm: { type: 'text', html: '<span class="plate">served by vLLM · <span class="m">max_model_len = <span class="c-yellow">32,768</span></span> tokens</span>', size: 48, x: 960, y: 150, in: 'wipe', at: 0.5, z: 6 },
  }, { cut: true });

  // 137 (2.5) — reading beat on "max_model_len = 32,768": a slow push (≈1.7 s, eased both ends) made by
  // the line growing toward the viewer while the rig eases back a step — no fast camera move
  c(2.5, {
    c04_vllm: { s: 1.16, y: 176, dur: 1.75, ease: 'power2.inOut' },
    rig: { o: 0.5, s: 0.94, dur: 1.75, ease: 'power2.inOut' },
    c04_l4_0: { o: 0.5, dur: 1.2 }, c04_l4_1: { o: 0.5, dur: 1.2 }, c04_l4_2: { o: 0.5, dur: 1.2 }, c04_l4_3: { o: 0.5, dur: 1.2 },
  }, { drift: 0.4 });

  // 138 (4.5) — camera rises to 50°: the whole slab again, "the same weights, frozen"
  c(4.5, {
    c04_vllm: 'up', c04_l4_0: 'fade', c04_l4_1: 'fade', c04_l4_2: 'fade', c04_l4_3: 'fade',
    rig: R({ pitch: 50, yaw: -0.4, dist: 15.5, tz: 0.1, ty: 0.2, dock: 0, seams: 0, glow: 0 }, { pdur: 3.0, o: 1, s: 0.9, dur: 1.4, ease: 'power2.inOut' }),
    ...pinLabel('c04_frozen', 'the same weights, <span class="c-blue">frozen</span>', { at: 2.2, in: 'wipe' }),
  });

  // 139 (2) — 2D inset beside the slab: B and A draw themselves
  c(2, {
    c04_frozen: 'fade',
    rig: R({ yaw: -0.34 }, { x: 500, y: 540, s: 0.8 }),
    ...plate('c04_pl2', 1400, 580, 860, 800),
    ...cv('c04_bai', 'c04_bai', { ba: 1, mul: 0 }, { paramsFrom: { ba: 0 }, pdur: 1.3, at: 0.15 }),
  }, { cut: true });

  // 140 (2) — the equation
  c(2, {
    rig: R({ yaw: -0.3 }),
    c04_eq: { type: 'text', html: '<span class="i">W′</span> = <span class="i">W</span> + <span class="c-purple"><span class="i">B</span>·<span class="i">A</span></span>', size: 64, x: 1400, y: 250, in: 'wipe', at: 0.1, z: 6 },
  });

  // 141 (3) — toy sizes: W as an 8 × 8 grid
  c(3, {
    rig: R({ yaw: -0.28 }, { o: 0 }), c04_pl2: 'fade', c04_bai: 'fade',
    c04_eq: { x: 960, y: 110, size: 56 },
    ...cv('c04_toy', 'c04_toy', { w: 1, ba: 0, cell: 0, fill: 0 }, { paramsFrom: { w: 0 }, pdur: 1.6, at: 0.3 }),
    c04_toytag: { type: 'text', html: '<span class="cap" style="font-size:1em">toy sizes</span>', size: 26, color: T.YELLOW, x: 1740, y: 110, in: 'fade', at: 0.8 },
  }, { cut: true });

  // 142 (2) — B as 8 × 2, A as 2 × 8
  c(2, { c04_toy: { params: { w: 1, ba: 1, cell: 0, fill: 0 }, pdur: 0.9 } });

  // 143 (2) — one cell of B·A: a row of B and a column of A, multiplied and summed
  c(2, {
    c04_toy: { params: { w: 1, ba: 1, cell: 1, fill: 0 }, pdur: 0.6 },
    c04_cellt: { type: 'text', html: 'row of <span class="i c-purple">B</span> · column of <span class="i c-purple">A</span>, multiplied and summed', size: 40, x: 1060, y: 740, in: 'wipe', at: 0.4 },
  }, { sfx: [{ at: 0.3, kind: 'tick' }] });

  // 144 (2) — every cell fills, column by column
  c(2, { c04_cellt: 'fade', c04_toy: { params: { w: 1, ba: 1, cell: 0, fill: 1 }, pdur: 1.4, pease: 'power1.inOut' } });

  // 145 (2) — a full-size update made from two thin pieces
  c(2, { c04_full: { type: 'text', html: 'a <span class="c-purple">full-size update</span><br>made from two thin pieces', size: 42, lh: 1.25, x: 1540, y: 750, in: 'wipe', at: 0.1 } });

  // 146 (4.5) — W: 8 × 8 = 64 numbers
  c(4.5, {
    c04_full: 'fade',
    c04_cW: { type: 'text', html: '<span class="i c-blue">W</span>: 8 × 8 = <span class="c-yellow">64</span> numbers', size: 44, x: 426, y: 750, in: 'wipe', at: 0.5 },
  }, { cam: { x: 900, y: 520, s: 1.04 } });

  // 147 (4.5) — B + A: 8×2 + 2×8 = 32 numbers
  c(4.5, {
    c04_cBA: { type: 'text', html: '<span class="i c-purple">B</span> + <span class="i c-purple">A</span>: 8×2 + 2×8 = <span class="c-yellow">32</span> numbers', size: 44, x: 1080, y: 750, in: 'wipe', at: 0.3 },
  }, { cam: { x: 1000, y: 520, s: 1.04 } });

  // 148 (4.5) — at real sizes: d·k frozen vs r·(d + k) trained; the purple bar shrinks to a sliver
  c(4.5, {
    c04_gen: { type: 'text', html: 'at real sizes: <span class="i">d·k</span> frozen vs <span class="i c-purple">r·(d + k)</span> trained', size: 48, x: 960, y: 845, in: 'wipe', at: 0.2 },
    c04_barG: { type: 'rect', x: 520, ax: 0, y: 935, w: 1100, h: 24, rad: 5, fill: 'rgba(154,163,173,0.55)', in: 'grow', at: 0.6 },
    c04_barP: { type: 'rect', x: 520, ax: 0, y: 975, w: 10, h: 24, rad: 5, fill: T.PURPLE, in: 'none', from: { w: 550, o: 1 }, at: 1.2, dur: 1.8, ease: 'power3.inOut' },
    c04_barGk: { type: 'text', html: '<span class="cap" style="font-size:1em">frozen</span>', size: 24, color: T.DIM, x: 495, ax: 1, align: 'right', y: 935, in: 'fade', at: 0.6 },
    c04_barPk: { type: 'text', html: '<span class="cap" style="font-size:1em">trained</span>', size: 24, color: T.PURPLE, x: 495, ax: 1, align: 'right', y: 975, in: 'fade', at: 1.0 },
    c04_barT: { type: 'text', html: '<span class="cap" style="font-size:1em">illustrative proportions</span>', size: 24, color: T.YELLOW, x: 1620, ax: 1, align: 'right', y: 1010, in: 'fade', at: 1.4 },
  }, { cam: { x: 960, y: 560, s: 0.98 } });

  // 149 (2) — the 3D view returns; inset: B and A multiply (B·A, rank r)
  const toyOut = Object.fromEntries(['c04_toy', 'c04_toytag', 'c04_cW', 'c04_cBA', 'c04_gen', 'c04_barG', 'c04_barP', 'c04_barGk', 'c04_barPk', 'c04_barT'].map((k) => [k, 'fade']));
  c(2, {
    ...toyOut,
    c04_eq: { x: 1400, y: 250, size: 60 },
    rig: R({ yaw: -0.3, film: 0 }, { o: 1, x: 500, y: 540, s: 0.8 }),
    ...plate('c04_pl3', 1400, 580, 860, 800),
    ...cv('c04_bai2', 'c04_bai', { ba: 1, mul: 1 }, { paramsFrom: { ba: 0.6, mul: 0 }, pdur: 1.3, at: 0.1 }),
  }, { cut: true, cam: { x: 960, y: 540, s: 1 } });

  // 150 (4.5) — the product lies on the slab as a thin purple film; "rank r ≤ 128 here"
  c(4.5, {
    c04_pl3: 'right', c04_bai2: 'right', c04_eq: 'right',
    rig: R({ yaw: -0.36, film: 1 }, { x: 920, y: 545, s: 0.95, pdur: 2.2 }),
    c04_rank: { type: 'text', html: '<span class="plate">the update <span class="i c-purple">B·A</span> · <span class="c-yellow">rank r ≤ 128</span> here</span>', size: 50, x: 960, y: 150, in: 'wipe', at: 1.4, z: 6 },
  }, { sfx: [{ at: 1.0, kind: 'pop' }] });

  // 151 (2.5) — reading beat: underline "rank r ≤ 128"
  F.beat(2.5, { id: 'c04_rank', mode: 'underline', w: 300, dx: 150, under: 40, color: T.YELLOW });

  // 152 (4.5) — more films stack: "up to 8 adapters · a different one per agent allowed"
  c(4.5, {
    c04_rank: 'up',
    rig: R({ yaw: -0.42, films: 8 }, { pdur: 3.2, pease: 'power1.inOut' }),
    c04_ad: { type: 'text', html: '<span class="plate"><span class="c-yellow">up to 8 adapters</span> · <span class="c-dim">a different one per agent allowed</span></span>', size: 50, x: 960, y: 150, in: 'wipe', at: 0.4, z: 6 },
  }, { sfx: [0, 1, 2, 3, 4, 5, 6].map((i) => ({ at: 0.45 + 0.4 * i, kind: 'tick' })) });

  // 153 (2.5) — reading beat: "up to 8 adapters" stays bright, the rest sinks to a third
  c(2.5, { rig: R({ yaw: -0.45 }, { o: 0.33 }), c04_ad: { s: 1.08, y: 170 } }, { drift: 0.4 });

  // 154 (4.5) — camera back to 40°: "the only way to change the model's weights"
  c(4.5, {
    c04_ad: 'up',
    rig: R({ pitch: 40, yaw: -0.52, dist: 16 }, { o: 1 }),
    // the model's name returns on the slab: the sampling card will grow out of this label
    c04_name: { type: 'text', html: '<span class="plate m">gemma-4-31b-it-qat-w4a16-ct</span>', size: 40, color: T.BLUE, x: 960, y: 540, in: 'wipe', at: 1.4, z: 6 },
    c04_way: { type: 'text', html: '<span class="plate">LoRA: <span class="c-purple">the only way to change the model’s weights</span></span>', size: 50, x: 960, y: 150, in: 'wipe', at: 0.5, z: 6 },
  });

  // 155 (2.5) — reading beat: underline it
  F.beat(2.5, { id: 'c04_way', mode: 'underline', w: 900, dx: 82, under: 40, color: T.PURPLE });

  // 156 (4.5) — the scene eases back and dissolves to a file card: configs/sampling.yaml
  // (the card fills the frame; fields without a documented value show a "‹you set›" slot)
  const CARD = { x: 960, y: 560, w: 1440, h: 700 };
  const YS = '<span class="c-dim">‹you set›</span>';
  const LN = [
    `temperature: ${YS}`,
    `top_p: ${YS}`,
    `top_k: ${YS}`,
    `max_output_tokens: ${YS}  <span class="c-dim"># ≤ 32,768</span>`,
    `thinking_level: ${YS}     <span class="c-dim"># NONE … HIGH</span>`,
    'thinking_budget: <span class="c-yellow">4096</span>     <span class="c-dim"># default</span>',
  ];
  const LX = CARD.x - CARD.w / 2 + 64, LY0 = CARD.y - CARD.h / 2 + 168, LP = 84;
  const lineEl = (i, at) => ({ ['c04_y' + i]: { type: 'mono', html: LN[i], size: 46, align: 'left', ax: 0, x: LX, y: LY0 + i * LP, in: 'wipe', at, z: 6 } });
  c(4.5, {
    c04_way: 'fade',
    // the card grows out of the model-name label on the slab (≈1040, 812 world px at this framing) while the 3D fades
    rig: { o: 0, at: 0.15, dur: 0.95, ease: 'power2.in' },
    c04_name: { o: 0, at: 0.45, dur: 0.4, ease: 'power2.in' },
    c04_yf: { type: 'box', x: CARD.x, y: CARD.y, w: CARD.w, h: CARD.h, stroke: '#3A4654', fill: PANEL, sw: 2.5, rad: 22, html: '', in: 'none', from: { x: 1040, y: 812, w: 590, h: 56, o: 1 }, at: 0, dur: 1.15, ease: 'power3.inOut', z: 5 },
    c04_yn: { type: 'text', html: '<span class="m" style="color:#F0AC5F">configs/sampling.yaml</span>', size: 40, align: 'left', ax: 0, x: LX, y: CARD.y - CARD.h / 2 + 72, in: 'fade', at: 0.7, z: 6 },
    ...lineEl(0, 1.0), ...lineEl(1, 1.35), ...lineEl(2, 1.7),
  }, { cut: true, cam: { x: 960, y: 540, s: 1 } });

  // 157 (3.5) — max_output_tokens ≤ 32,768
  c(3.5, { rig: null, c04_name: null, ...lineEl(3, 0.2) }, { cam: { x: 960, y: 555, s: 1.03 } });
  // 158 (4.5) — thinking_level NONE … HIGH
  c(4.5, { ...lineEl(4, 0.2) }, { cam: { x: 960, y: 565, s: 1.05 } });
  // 159 (3.5) — thinking_budget (default 4,096)
  c(3.5, { ...lineEl(5, 0.2) }, { cam: { x: 960, y: 575, s: 1.07 } });

  // 160 (4.5) — the card steps left and shrinks a little; the thinking_level line lights up and a
  // leader runs from it to a tall strip on the right: "thinking shares the same 32k window".
  // (no word flies across the card any more — it used to cross the thinking_level line)
  const CS = 0.8, CDX = -250, cx2 = CARD.x + CDX;
  const px2 = (x) => cx2 + (x - CARD.x) * CS, py2 = (y) => CARD.y + (y - CARD.y) * CS;
  const shift = {
    c04_yf: { x: cx2, s: CS, dur: 1.0 },
    c04_yn: { x: px2(LX), y: py2(CARD.y - CARD.h / 2 + 72), s: CS, dur: 1.0 },
  };
  for (let i = 0; i < 6; i++) shift['c04_y' + i] = { x: px2(LX), y: py2(LY0 + i * LP), s: CS, dur: 1.0, o: i === 4 ? 1 : 0.55 };
  const thinkY = py2(LY0 + 4 * LP), cardR = px2(CARD.x + CARD.w / 2);
  c(4.5, {
    ...shift,
    c04_thl: { type: 'rect', x: px2(LX) - 14, ax: 0, y: thinkY, w: 1300 * CS, h: 60, rad: 10, fill: 'rgba(143,167,217,0.16)', in: 'grow', at: 1.0, dur: 0.8, z: 5 },
    c04_tw: { type: 'text', html: '<span class="cap" style="font-size:1em">thinking</span>', size: 30, color: T.THINK, x: 1560, y: 224, in: 'fade', at: 1.6, z: 7 },
    c04_tl: { type: 'arrow', x1: cardR + 10, y1: thinkY, x2: 1540, y2: thinkY, color: T.THINK, sw: 3, head: 0, dashed: true, in: 'draw', at: 1.3, dur: 0.6 },
    c04_strip: { type: 'rect', x: 1560, y: 560, w: 40, h: 600, rad: 8, fill: 'rgba(143,167,217,0.35)', in: 'growh', at: 1.1, dur: 1.2 },
    c04_stript: { type: 'text', html: 'thinking<br>shares the<br>same <span class="c-yellow">32k</span><br>window', size: 46, lh: 1.2, align: 'left', ax: 0, x: 1610, y: 560, in: 'wipe', at: 1.9 },
  }, { cam: { x: 960, y: 560, s: 1 } });

  // 161 (4.5) — FULL: the summary line builds, part 1
  const cardOut = { c04_yf: 'left', c04_yn: 'left', c04_tw: 'fade', c04_stript: 'right', c04_thl: 'left', c04_tl: 'quick' };
  for (let i = 0; i < 6; i++) cardOut['c04_y' + i] = 'left';
  c(4.5, {
    ...cardOut,
    c04_strip: { x: 960, y: 760, w: 1500, h: 8, rad: 4, dur: 1.2, ease: 'power3.inOut' },
    c04_s1: { type: 'text', html: '<span class="c-blue">Gemma 4 31B</span> · INT4', size: 100, x: 960, y: 420, in: 'left', at: 0.5 },
  }, { cut: true });

  // 162 (4.5) — the line completes: · 4 × L4 · 32k · ≤ 8 LoRA
  c(4.5, {
    c04_strip: { w: 900, o: 0.5, dur: 2.5, ease: 'sine.inOut' },
    c04_s2: { type: 'text', html: '4 × L4 ·', size: 100, align: 'right', ax: 1, x: 860, y: 590, in: 'right', at: 0.2 },
    c04_32k: { type: 'text', versions: ['<span class="c-yellow">32k</span>', '<span class="c-yellow">32,768</span> tokens'], ver: 0, size: 100, x: 960, y: 590, in: 'pop', at: 0.8 },
    c04_s3: { type: 'text', html: '· ≤ 8 <span class="c-purple">LoRA</span>', size: 100, align: 'left', ax: 0, x: 1060, y: 590, in: 'left', at: 1.3 },
  });

  // 163 (3.5) — "32k" grows into "32,768 tokens", which stretches into the TAPE
  const TAPE = { type: 'canvas', draw: 'tape', x: 960, y: 540, params: { x: 160, y: 540, w: 1600, h: 86, first: 0, n: 0, ticks: 0, sliver: 1, crack: 0 } };
  c(3.5, {
    c04_s1: 'up', c04_s2: 'left', c04_s3: 'right', c04_strip: 'fade',
    c04_32k: { ver: 1, y: 390, s: 1.25, dur: 1.0, ease: 'power3.inOut' },
    tape: Object.assign({}, TAPE, { in: 'fade', at: 0.9, dur: 0.4, paramsFrom: { x: 820, w: 280 }, pdur: 1.5, pease: 'expo.out' }),
    c04_tcap: { type: 'text', html: '<span class="cap" style="font-size:1em">prompt · history · thinking · output&ensp;—&ensp;<span class="c-ink">one window</span></span>', size: 32, color: T.DIM, x: 960, y: 668, in: 'rise', at: 1.5 },
  }, { cam: { x: 960, y: 520, s: 1.1 } });

  // 164 (4.5) — the RAIL rewrites to "05 The 32k context window"; in the last second the tape's ticks start
  // to write on (accelerating into the cut) so the tape is already moving at 450.0 — chapter 5 carries the
  // same params tween on from there (its tween starts from the carried value; standalone it starts at 0)
  c(4.5, {
    rail: { ver: 5, at: 0.3, dur: 0.9 },
    tape: { params: Object.assign({}, TAPE.params, { ticks: 0 }), at: 2.35, pdur: 1.025, pease: 'power1.in' },
    c04_32k: { y: 330, o: 0, at: 0, dur: 3.3, ease: 'power2.in' },
    c04_tcap: { y: 700, o: 0, at: 1.2, dur: 1.6, ease: 'power2.in' },
  }, { cam: { x: 960, y: 540, s: 1 }, drift: 0 });

  // Engine workaround: a named exit ('fade', 'up', …) copies the element's previous state, including a
  // stale entry `at`/`dur`; when the element was carried (not entering) in that composition, the stale
  // `at` re-morphs it back to visible after its exit. Clear those timing fields on carried states.
  for (let k = C0 + 1; k < FILM.COMPS.length; k++) {
    const cur = FILM.COMPS[k].els, before = FILM.COMPS[k - 1].els;
    for (const id in cur) if (cur[id] && cur[id].out && before[id]) cur[id] = Object.assign({}, cur[id], { at: undefined, dur: undefined, ease: undefined });
  }
})();
