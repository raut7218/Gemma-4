// Procedural drawings for `canvas` elements. Each is draw(ctx, params, spec, t),
// a pure function of its params (and t only for slow ambient motion).
(function () {
  const T = window.TOK;
  const D = {};
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
  D.util = { clamp, ease, rr };

  // ------------------------------------------------------------ 12×10 task grid
  // params: reveal 0..1 (from centre), gold (cell index | -1), dim 0..1, sweep 0..1 (icon trio
  // travels across each row, rows staggered), split 0..1 (halves move apart), lock 0..1,
  // goldGlow 0..1, cw, ch, gap, cols, rows
  D.grid = (ctx, p, sp) => {
    const cols = p.cols || 12, rows = p.rows || 10;
    const cw = p.cw || 112, ch = p.ch || 70, gap = p.gap || 14;
    const W = cols * cw + (cols - 1) * gap, H = rows * ch + (rows - 1) * gap;
    const ox = (sp.w - W) / 2, oy = (sp.h - H) / 2;
    const cx = (cols - 1) / 2, cy = (rows - 1) / 2, maxd = Math.hypot(cx, cy);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      if (p.count && i >= p.count) continue;
      const d = Math.hypot(c - cx, r - cy) / maxd;
      const a = clamp((p.reveal * 1.35 - d * 0.35) / 1.0 * 1.0);
      const k = ease(clamp((p.reveal * 1.4 - d * 0.4)));
      if (k <= 0) continue;
      const half = c < cols / 2 ? -1 : 1;
      const x = ox + c * (cw + gap) + half * (p.split || 0) * 70, y = oy + r * (ch + gap);
      const s = 0.6 + 0.4 * k;
      ctx.save();
      ctx.translate(x + cw / 2, y + ch / 2); ctx.scale(s, s);
      const isGold = i === p.gold && (p.dim || 0) < 0.9 && (p.goldA ?? 1) >= 0.5;  // goldA 0 hides the gold cell (it lands later)
      ctx.globalAlpha = k * (1 - (p.dim || 0) * (isGold ? 0.95 : 0.8));
      rr(ctx, -cw / 2, -ch / 2, cw, ch, 9);
      ctx.fillStyle = isGold ? `rgba(240,172,95,${0.18 + 0.25 * (p.goldGlow || 0)})` : 'rgba(88,196,221,0.05)';
      ctx.fill();
      // repository colouring (ch10): sp.repos = [sizes of consecutive groups], param repo 0..1
      if ((p.repo || 0) > 0 && sp.repos && !isGold) {
        let g = 0, acc = 0; while (g < sp.repos.length - 1 && i >= acc + sp.repos[g]) { acc += sp.repos[g]; g++; }
        ctx.save(); ctx.globalAlpha *= clamp(p.repo); ctx.fillStyle = T.REPO[g % T.REPO.length];
        ctx.globalAlpha *= 0.55; ctx.fill(); ctx.restore();
      }
      ctx.lineWidth = isGold ? 3 : 1.6;
      ctx.strokeStyle = isGold ? T.GOLD : '#33404C';
      ctx.stroke();
      // green verdict ring around the gold cell
      if (isGold && (p.ring || 0) > 0) {
        const k2 = ease(clamp(p.ring));
        ctx.save(); ctx.strokeStyle = T.GREEN; ctx.lineWidth = 4;
        ctx.beginPath(); rr(ctx, -cw / 2 - 9, -ch / 2 - 9, cw + 18, ch + 18, 14);
        ctx.setLineDash([(2 * (cw + ch) + 72) * k2, 4000]); ctx.stroke(); ctx.restore();
      }
      // a small padlock in every cell (the tests are hidden), cells lock in a diagonal wave
      if ((p.lock || 0) > 0) {
        const lk = ease(clamp(p.lock * 2.2 - (c + r) / (cols + rows) * 1.2));
        if (lk > 0) {
          ctx.save(); ctx.globalAlpha *= lk; const px = cw / 2 - 22, py = -ch / 2 + 14 + (1 - lk) * -8;
          ctx.strokeStyle = isGold ? T.GOLD : T.DIM; ctx.fillStyle = isGold ? T.GOLD : T.DIM; ctx.lineWidth = 2.2;
          ctx.beginPath(); ctx.arc(px, py + 2, 5.5, Math.PI, 0); ctx.stroke();
          rr(ctx, px - 8, py + 2, 16, 12, 2.5); ctx.fill(); ctx.restore();
        }
      }
      // icon trio sweep: issue (square) → diff (two bars) → verdict (dot)
      const sw = p.sweep || 0;
      if (sw > 0 && sw < 1.6) {
        const rowStart = r * 0.05, pos = (sw - rowStart) * cols * 1.25 - c;
        const v = clamp(1 - Math.abs(pos - 0.5) * 1.1);
        if (v > 0) {
          ctx.globalAlpha *= v;
          ctx.fillStyle = T.INK; ctx.fillRect(-34, -9, 16, 18);
          ctx.fillStyle = T.GOLD; ctx.fillRect(-10, -9, 18, 6); ctx.fillRect(-10, 3, 18, 6);
          ctx.fillStyle = T.GREEN; ctx.beginPath(); ctx.arc(26, 0, 8, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
    }
  };
  // centre of a grid cell in stage pixels, for carried objects that land in a cell
  D.gridCell = (i, sp, p, x0, y0) => {
    const cols = p.cols || 12, rows = p.rows || 10, cw = p.cw || 112, ch = p.ch || 70, gap = p.gap || 14;
    const W = cols * cw + (cols - 1) * gap, H = rows * ch + (rows - 1) * gap;
    const c = i % cols, r = Math.floor(i / cols);
    return [x0 - W / 2 + c * (cw + gap) + cw / 2, y0 - H / 2 + r * (ch + gap) + ch / 2];
  };

  window.DRAW = D;
})();

// ====================================================================== shared objects
// All shared objects draw into a full-stage canvas (1920×1080) placed at the stage centre,
// so their coordinates are stage pixels. Text uses the film's fonts.
(function () {
  const T = window.TOK, D = window.DRAW;
  const { clamp, ease, rr } = D.util;
  const lerp = (a, b, t) => a + (b - a) * t;
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
  D.rgba = rgba;
  // canvas text in the film's type
  D.text = (ctx, str, x, y, o = {}) => {
    ctx.save();
    ctx.globalAlpha *= o.a ?? 1;
    ctx.fillStyle = o.color || T.INK;
    const fam = o.mono ? 'CMT' : o.sans ? 'CMS' : 'CM';
    ctx.font = `${o.italic ? 'italic ' : ''}${o.weight || 400} ${o.size || 30}px ${fam}`;
    ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'middle';
    if (o.caps) { str = str.toUpperCase(); ctx.letterSpacing = `${(o.size || 30) * 0.18}px`; }
    ctx.fillText(str, x, y);
    ctx.restore();
  };
  // a stroked path drawn progressively: pts = [[x,y],...], k = 0..1
  D.polyline = (ctx, pts, k, style = {}) => {
    if (k <= 0 || pts.length < 2) return;
    let L = 0; const seg = [];
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
    let rem = L * clamp(k);
    ctx.save(); ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length && rem > 0; i++) {
      const f = Math.min(1, rem / seg[i - 1]);
      ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f));
      rem -= seg[i - 1];
    }
    ctx.strokeStyle = style.color || T.DIM; ctx.lineWidth = style.w || 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (style.dash) ctx.setLineDash(style.dash);
    ctx.stroke(); ctx.restore();
  };
  D.arrowHead = (ctx, x, y, ang, size, color) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-size, -size * 0.5); ctx.lineTo(-size, size * 0.5); ctx.closePath(); ctx.fill(); ctx.restore();
  };

  // ------------------------------------------------------------------ the agent LOOP
  // Three nodes on a circle: think (top), call a tool (lower right), read the result (lower left).
  // params: cx, cy, r, draw 0..1 (nodes + arcs drawn on), labels 0..1, dot (laps, float; <0 hides),
  // exit 0..1 (branch to submit_patch), hi (node index to highlight, -1 none), hiA 0..1,
  // ring 0..1 (teal tool ring around the call node), stopped 0..1 (dims the arcs), s (scale)
  D.LOOP_NODES = ['think', 'call a tool', 'read the result'];
  D.loopGeom = (p) => {
    const r = p.r ?? 220, cx = p.cx ?? 960, cy = p.cy ?? 540;
    const ang = [-90, 30, 150].map((a) => (a * Math.PI) / 180);
    return { r, cx, cy, ang, pos: ang.map((a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)]) };
  };
  D.loop = (ctx, p) => {
    const g = D.loopGeom(p), dr = clamp(p.draw ?? 1);
    const nodeR = (p.nodeR ?? 125); // half-width of the node pills, for arcs and attachments
    // arcs between nodes (clockwise), each with an arrow head
    for (let i = 0; i < 3; i++) {
      const gap = 0.52 * 220 / g.r;
      const a0 = g.ang[i] + gap, a1 = g.ang[(i + 1) % 3] + (i === 2 ? 2 * Math.PI : 0) - gap;
      const k = clamp(dr * 3 - i);
      if (k <= 0) continue;
      const pts = [];
      for (let j = 0; j <= 40; j++) { const a = lerp(a0, a1, (j / 40) * k); pts.push([g.cx + g.r * Math.cos(a), g.cy + g.r * Math.sin(a)]); }
      D.polyline(ctx, pts, 1, { color: rgba(T.DIM, 0.85 * (1 - 0.6 * (p.stopped || 0))), w: 4 });
      if (k > 0.98) { const a = a1; D.arrowHead(ctx, g.cx + g.r * Math.cos(a), g.cy + g.r * Math.sin(a), a + Math.PI / 2, 18, rgba(T.DIM, 0.9)); }
    }
    // tool ring around the "call a tool" node
    if ((p.ring || 0) > 0) {
      const [x, y] = g.pos[1];
      for (let i = 0; i < 9; i++) {
        const k = clamp(p.ring * 9 - i);
        if (k <= 0) continue;
        const a = -Math.PI / 2 + (i / 9) * Math.PI * 2;
        const tx = x + Math.cos(a) * 150, ty = y + Math.sin(a) * 92;
        ctx.save(); ctx.globalAlpha *= k;
        rr(ctx, tx - 13, ty - 13, 26, 26, 6); ctx.fillStyle = rgba(T.TEAL, 0.85); ctx.fill(); ctx.restore();
      }
    }
    // nodes
    g.pos.forEach(([x, y], i) => {
      const k = clamp(dr * 3 - i + 0.4);
      if (k <= 0) return;
      const hi = p.hi === i ? (p.hiA ?? 1) : 0;
      ctx.save(); ctx.globalAlpha *= k;
      const sc = (0.8 + 0.2 * ease(k)) * (1 + 0.06 * hi);
      const pw = (i === 0 ? 190 : 250) * sc, ph = 84 * sc;
      rr(ctx, x - pw / 2, y - ph / 2, pw, ph, ph / 2);
      const col = i === 1 ? T.TEAL : T.BLUE;
      ctx.fillStyle = rgba(col, 0.10 + 0.22 * hi); ctx.fill();
      ctx.lineWidth = 3 + 2 * hi; ctx.strokeStyle = rgba(col, 0.9); ctx.stroke();
      ctx.restore();
      if ((p.labels ?? 1) > 0) D.text(ctx, D.LOOP_NODES[i], x, y + 2, { size: i === 0 ? 36 : 32, a: k * (p.labels ?? 1), color: T.INK });
    });
    // exit branch: from "read the result"→ right side toward submit_patch()
    if ((p.exit || 0) > 0) {
      const [x, y] = g.pos[1];
      const pts = [[x + nodeR, y], [x + nodeR + 120, y], [x + nodeR + 120, y + 120]];
      D.polyline(ctx, pts, p.exit, { color: T.GOLD, w: 4 });
      if (p.exit > 0.98) {
        D.arrowHead(ctx, pts[2][0], pts[2][1], Math.PI / 2, 18, T.GOLD);
        D.text(ctx, 'submit_patch()', pts[2][0], pts[2][1] + 40, { mono: true, size: 28, color: T.GOLD });
      }
    }
    // the blue dot running round the loop
    if ((p.dot ?? -1) >= 0) {
      const f = p.dot - Math.floor(p.dot);
      const a = g.ang[0] + f * Math.PI * 2;
      ctx.save(); ctx.beginPath(); ctx.arc(g.cx + g.r * Math.cos(a), g.cy + g.r * Math.sin(a), 13, 0, Math.PI * 2);
      ctx.fillStyle = T.BLUE; ctx.shadowColor = T.BLUE; ctx.shadowBlur = 18; ctx.fill(); ctx.restore();
    }
  };

  // ------------------------------------------------------------------ the context TAPE
  // params: x, y, w, h, n (number of tool outputs, float), first 0..1 (first message block),
  // sliver 0..1 (agent turn width as fraction of an output), crack 0..1, ticks 0..1, think (blocks
  // of thinking between steps, 0..1 size of each), short 0..1 (outputs shrink to slivers),
  // edgeGlow 0..1, a 0..1
  D.TAPE = { TOTAL: 32768, FIRST: 3500, OUT: 1300, TURN: 160, THINK: 4096 };
  D.tape = (ctx, p) => {
    const x = p.x ?? 160, y = p.y ?? 540, w = p.w ?? 1600, h = p.h ?? 86;
    const S = D.TAPE, px = w / S.TOTAL;
    ctx.save(); ctx.globalAlpha *= p.a ?? 1;
    rr(ctx, x, y - h / 2, w, h, 10); ctx.fillStyle = 'rgba(21,26,33,0.95)'; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = '#3A4654'; ctx.stroke();
    ctx.save(); rr(ctx, x, y - h / 2, w, h, 10); ctx.clip();
    let cur = x;
    const block = (len, color, k, alpha = 0.9) => {
      if (k <= 0) return;
      const bw = len * px;
      const slide = (1 - ease(clamp(k))) * 220;
      rr(ctx, cur + 2 - slide, y - h / 2 + 6, Math.max(2, bw - 4), h - 12, 6);
      ctx.fillStyle = rgba(color, alpha * clamp(k * 1.5)); ctx.fill();
      cur += bw * clamp(k * 1.3);
    };
    block(S.FIRST, T.BLUE, p.first ?? 0);
    const n = p.n || 0, outLen = lerp(S.OUT, S.OUT * 0.18, p.short || 0);
    for (let i = 0; i < Math.ceil(n); i++) {
      const k = clamp(n - i);
      if ((p.think || 0) > 0) block(S.THINK * 0.5 * p.think, T.THINK, k, 0.8);
      block(outLen, T.TEAL, k);
      block(S.TURN * (p.sliver ?? 1), T.INK, k, 0.65);
      if (cur > x + w + 50) break;
    }
    ctx.restore();
    // free-space glow near the end
    if ((p.edgeGlow || 0) > 0) {
      const g2 = ctx.createLinearGradient(x + w - 260, 0, x + w, 0);
      g2.addColorStop(0, rgba(T.RED, 0)); g2.addColorStop(1, rgba(T.RED, 0.45 * p.edgeGlow));
      ctx.fillStyle = g2; rr(ctx, x + w - 260, y - h / 2, 260, h, 10); ctx.fill();
    }
    // crack at the right end
    if ((p.crack || 0) > 0) {
      const k = clamp(p.crack);
      ctx.strokeStyle = T.RED; ctx.lineWidth = 4; ctx.lineJoin = 'round';
      ctx.beginPath();
      const pts = [[x + w - 6, y - h / 2 - 20], [x + w - 26, y - 10], [x + w + 4, y + 6], [x + w - 18, y + h / 2 + 22]];
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) if (k * 3 >= i - 0.2) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
      rr(ctx, x + w - 12, y - h / 2, 12, h, 4); ctx.fillStyle = rgba(T.RED, 0.7 * k); ctx.fill();
    }
    // ticks under the tape
    if ((p.ticks || 0) > 0) {
      const marks = [0, 8192, 16384, 24576, 32768];
      marks.forEach((m, i) => {
        const k = clamp(p.ticks * 5 - i);
        if (k <= 0) return;
        const tx = x + m * px;
        ctx.strokeStyle = rgba(T.DIM, 0.8 * k); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(tx, y + h / 2 + 8); ctx.lineTo(tx, y + h / 2 + 22); ctx.stroke();
        D.text(ctx, m.toLocaleString('en-US'), tx, y + h / 2 + 46, { size: 24, color: T.DIM, a: k, align: i === 0 ? 'left' : i === 4 ? 'right' : 'center' });
      });
    }
    ctx.restore();
  };
  // where the tape currently ends (stage x) — for counters and carried objects
  D.tapeEnd = (p) => {
    const x = p.x ?? 160, w = p.w ?? 1600, S = D.TAPE, px = w / S.TOTAL;
    const n = p.n || 0, outLen = lerp(S.OUT, S.OUT * 0.18, p.short || 0);
    return x + px * (S.FIRST * clamp(p.first ?? 0) + n * (outLen + S.TURN * (p.sliver ?? 1) + (p.think || 0) * S.THINK * 0.5));
  };

  // ------------------------------------------------------------------ the RULER (6 minutes)
  // params: x, y, w, ticks 0..1, blocks: [[startMin, lenMin, color]], show 0..1 (blocks drawn),
  // over 0..1 (end turns red), grey 0..1 (setup shading), label
  D.ruler = (ctx, p, sp) => {
    const x = p.x ?? 260, y = p.y ?? 540, w = p.w ?? 1400, max = p.max ?? 6;
    const px = w / max;
    ctx.save(); ctx.globalAlpha *= p.a ?? 1;
    D.polyline(ctx, [[x, y], [x + w, y]], p.draw ?? 1, { color: T.INK, w: 4 });
    const nt = max;
    for (let i = 0; i <= nt; i++) {
      const k = clamp((p.ticks ?? 1) * (nt + 1) - i);
      if (k <= 0) continue;
      const tx = x + i * px;
      ctx.strokeStyle = rgba(T.INK, k); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(tx, y - 14); ctx.lineTo(tx, y + 14); ctx.stroke();
      D.text(ctx, `${i} min`, tx, y + 46, { size: 26, color: T.DIM, a: k });
    }
    if ((p.grey || 0) > 0) { ctx.fillStyle = rgba(T.DIM, 0.25 * p.grey); rr(ctx, x, y - 40, px * 0.6 * p.grey, 26, 4); ctx.fill(); }
    (sp.blocks || p.blocks || []).forEach((b, i, arr) => {
      const k = clamp((p.show ?? 0) * arr.length - i);
      if (k <= 0) return;
      const bx = x + b[0] * px, bw = b[1] * px * ease(k);
      const over = bx + bw > x + w;
      rr(ctx, bx, y - 44, Math.max(3, bw - 4), 30, 6);
      ctx.fillStyle = rgba(over ? T.RED : b[2], 0.85); ctx.fill();
      if (b[3] && k > 0.6) D.text(ctx, b[3], bx + bw / 2, y - 72, { size: 22, color: T.DIM, a: (k - 0.6) / 0.4 });
    });
    if ((p.over || 0) > 0) {
      ctx.fillStyle = rgba(T.RED, 0.8 * p.over); rr(ctx, x + w - 8, y - 60, 16, 120, 6); ctx.fill();
    }
    ctx.restore();
  };

  // ------------------------------------------------------------------ the CLOCK (12 hours)
  // params: cx, cy, r, draw 0..1 (face), slices 0..1 (≈120 wedges appear in one sweep),
  // pull 0..1 (wedge 0 pulls toward the camera / down), unroll 0..1 (wedge 0 → horizontal bar),
  // rx, ry, rw (the ruler it unrolls into)
  D.clock = (ctx, p) => {
    const cx = p.cx ?? 960, cy = p.cy ?? 520, r = p.r ?? 330, N = 120;
    ctx.save(); ctx.globalAlpha *= p.a ?? 1;
    // face
    const fd = clamp(p.draw ?? 1);
    ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fd);
    ctx.strokeStyle = T.INK; ctx.lineWidth = 4; ctx.stroke();
    for (let h = 0; h < 12; h++) {
      const k = clamp(fd * 12 - h);
      if (k <= 0) continue;
      const a = -Math.PI / 2 + (h / 12) * Math.PI * 2;
      ctx.strokeStyle = rgba(T.INK, k); ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (r - 26), cy + Math.sin(a) * (r - 26)); ctx.lineTo(cx + Math.cos(a) * (r - 6), cy + Math.sin(a) * (r - 6)); ctx.stroke();
    }
    // wedges
    const sl = clamp(p.slices || 0);
    for (let i = 0; i < N; i++) {
      const k = clamp(sl * N * 1.1 - i * 1.0);
      if (k <= 0) continue;
      const a0 = -Math.PI / 2 + (i / N) * Math.PI * 2, a1 = a0 + (Math.PI * 2) / N;
      if (i === 0 && (p.pull || 0) > 0) continue;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r - 10, a0 + 0.004, a1 - 0.004); ctx.closePath();
      ctx.fillStyle = rgba(i % 2 ? T.BLUE : T.TEAL, 0.10 + 0.08 * k); ctx.fill();
      ctx.strokeStyle = rgba(T.DIM, 0.25 * k); ctx.lineWidth = 1; ctx.stroke();
    }
    // the pulled wedge, unrolling into a bar
    if ((p.pull || 0) > 0) {
      const pk = ease(clamp(p.pull)), uk = ease(clamp(p.unroll || 0));
      const a0 = -Math.PI / 2, a1 = a0 + (Math.PI * 2) / N;
      const ox = lerp(0, 40, pk), oy = lerp(0, -60, pk), sc = lerp(1, 1.35, pk);
      const rx = p.rx ?? 260, ry = p.ry ?? 820, rw = p.rw ?? 1400;
      ctx.beginPath();
      const M = 30;
      // wedge outline points interpolated toward a thin horizontal bar
      const pts = [];
      pts.push([cx + ox, cy + oy]);
      for (let j = 0; j <= M; j++) { const a = lerp(a0, a1, j / M); pts.push([cx + ox + Math.cos(a) * (r - 10) * sc, cy + oy + Math.sin(a) * (r - 10) * sc]); }
      const bar = [[rx, ry]].concat(Array.from({ length: M + 1 }, (_, j) => [rx + (rw * j) / M, ry - 12 + (j % 2) * 0]));
      pts.forEach((pt, j) => {
        const b = bar[Math.min(j, bar.length - 1)];
        const X = lerp(pt[0], j === 0 ? rx : b[0], uk), Y = lerp(pt[1], j === 0 ? ry : ry - 22, uk);
        if (j === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
      });
      ctx.lineTo(lerp(pts[pts.length - 1][0], rx + rw, uk), lerp(pts[pts.length - 1][1], ry, uk));
      ctx.closePath();
      ctx.fillStyle = rgba(T.YELLOW, 0.55); ctx.fill();
      ctx.strokeStyle = T.YELLOW; ctx.lineWidth = 2.5; ctx.stroke();
    }
    ctx.restore();
  };

  // ------------------------------------------------------------------ the CALENDAR strip
  // 23 Sep → 2 Dec 2026, one tick per day. params: x, y, w, draw 0..1, pins (count of pins shown,
  // float), shade 0..1, dot 0..1 (travelling dot), today -1, a
  D.CAL = { start: Date.UTC(2026, 8, 23), end: Date.UTC(2026, 11, 2) };
  D.calDays = Math.round((D.CAL.end - D.CAL.start) / 86400000);
  D.calX = (p, dateUTC) => (p.x ?? 210) + ((dateUTC - D.CAL.start) / 86400000 / D.calDays) * (p.w ?? 1500);
  D.calendar = (ctx, p, sp) => {
    const x = p.x ?? 210, y = p.y ?? 560, w = p.w ?? 1500, n = D.calDays;
    ctx.save(); ctx.globalAlpha *= p.a ?? 1;
    D.polyline(ctx, [[x, y], [x + w, y]], p.draw ?? 1, { color: rgba(T.INK, 0.8), w: 3 });
    for (let d = 0; d <= n; d++) {
      const k = clamp((p.draw ?? 1) * (n + 1) - d);
      if (k <= 0) continue;
      const tx = x + (d / n) * w;
      const date = new Date(D.CAL.start + d * 86400000);
      const first = date.getUTCDate() === 1;
      ctx.strokeStyle = rgba(first ? T.INK : T.DIM, (first ? 0.9 : 0.55) * k); ctx.lineWidth = first ? 3 : 1.6;
      ctx.beginPath(); ctx.moveTo(tx, y - (first ? 18 : 9)); ctx.lineTo(tx, y + (first ? 18 : 9)); ctx.stroke();
      if (first) D.text(ctx, ['Oct', 'Nov', 'Dec'][date.getUTCMonth() - 9] + ' 1', tx, y + 46, { size: 24, color: T.DIM, a: k });
    }
    // shading of spans: [[fromUTC, toUTC, color, alpha]]
    // spans live on the spec (static): [[fromUTC, toUTC, colour, alpha]]; params.span0.. animate them
    (sp.spans || []).forEach((s, i) => {
      const k = clamp(p['span' + i] ?? 1);
      if (k <= 0) return;
      const a = D.calX(p, s[0]), b = D.calX(p, s[1]);
      ctx.fillStyle = rgba(s[2], (s[3] ?? 0.25) * k); rr(ctx, a, y - 30, (b - a) * ease(k), 60, 6); ctx.fill();
    });
    if ((p.dot ?? -1) >= 0) {
      ctx.beginPath(); ctx.arc(x + w * clamp(p.dot), y, 11, 0, Math.PI * 2); ctx.fillStyle = T.BLUE; ctx.fill();
    }
    ctx.restore();
  };

  // ------------------------------------------------------------------ METERS (time, tool calls, context)
  // params: x, y, gap, w, h, v0 v1 v2 (0..1), labels 0..1, glow 0..1; spec: names, colors
  D.meters = (ctx, p, sp) => {
    const names = sp.names || ['time', 'tool calls', 'context'];
    const cols = sp.colors || [T.YELLOW, T.TEAL, T.BLUE];
    const x = p.x ?? 760, y = p.y ?? 840, w = p.w ?? 120, h = p.h ?? 200, gap = p.gap ?? 70;
    names.forEach((nm, i) => {
      const bx = x + i * (w + gap);
      const v = clamp(p['v' + i] ?? 1);
      ctx.save(); ctx.globalAlpha *= p.a ?? 1;
      rr(ctx, bx, y - h, w, h, 10); ctx.fillStyle = 'rgba(21,26,33,0.95)'; ctx.fill(); ctx.strokeStyle = '#3A4654'; ctx.lineWidth = 2.5; ctx.stroke();
      rr(ctx, bx + 8, y - 8 - (h - 16) * v, w - 16, (h - 16) * v, 6); ctx.fillStyle = rgba(cols[i], 0.75 + 0.25 * (p.glow || 0)); ctx.fill();
      if ((p.glow || 0) > 0) { ctx.shadowColor = cols[i]; ctx.shadowBlur = 24 * p.glow; ctx.strokeStyle = rgba(cols[i], p.glow); ctx.lineWidth = 3; rr(ctx, bx, y - h, w, h, 10); ctx.stroke(); }
      ctx.restore();
      D.text(ctx, nm, bx + w / 2, y + 34, { size: 26, color: T.DIM, a: (p.a ?? 1) * (p.labels ?? 1) });
    });
  };
})();
