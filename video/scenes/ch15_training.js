// Chapter 15 — Teaching the model (storyboard v5, 64 beats).
(function () {
  const { T } = F;
  // A string exit on an element carried unchanged makes the engine re-tween it in the previous comp
  // (its spec object is replaced); set the exit style on the existing object instead and remove it.
  const c = (beats, delta = {}, opts = {}) => {
    const prev = FILM.COMPS[FILM.COMPS.length - 1];
    for (const id in delta) if (typeof delta[id] === 'string') { if (prev && prev.els[id]) prev.els[id].out = delta[id]; delta[id] = null; }
    return F.comp(beats, delta, opts);
  };
  F.chapter(K.CH[15]);
  const D = DRAW, U = D.util, rgba = D.rgba, clamp = U.clamp, ease = U.ease;
  const lerp = (a, b, k) => a + (b - a) * k;
  const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  // ------------------------------------------------------------ the training flow (one drawing)
  // params: fx, fy, fs (funnel mouth and scale), tint 0..1, fa (funnel alpha), pour 0..1, extra 0..1,
  // feed (cells into the model, float), mx, my, rib 0..1, gate 0..1, judge 0..1, keep 0..1, flow (dots), wind 0..1, sx, sy, ra (ribbon alpha)
  const REPOS = [67, 48, 13, 1];
  const repoOf = (i) => { let a = 0; for (let g = 0; g < 4; g++) { a += REPOS[g]; if (i < a) return g; } return 3; };
  const DROP = (i) => (i * 37) % 129 < 20;
  const NR = 16, PASS = { 1: 1, 4: 1, 6: 1, 9: 1, 12: 1, 14: 1 };
  const GX = 1300;
  D.c15_flow = (ctx, p) => {
    const fx = p.fx, fy = p.fy, fs = p.fs, tint = clamp(p.tint || 0), fa = p.fa ?? 1;
    const RX = 650 * fs, SP = 560 * fs, SW = 80 * fs;
    const spout = [fx, fy + SP + 50 * fs];
    // funnel
    if (fa > 0.002) {
      ctx.save(); ctx.globalAlpha *= fa;
      const col = tint > 0 ? T.PURPLE : T.DIM;
      ctx.beginPath(); ctx.moveTo(fx - RX, fy); ctx.lineTo(fx - SW, fy + SP); ctx.lineTo(fx - SW, fy + SP + 80 * fs); ctx.lineTo(fx + SW, fy + SP + 80 * fs); ctx.lineTo(fx + SW, fy + SP); ctx.lineTo(fx + RX, fy); ctx.closePath();
      ctx.fillStyle = rgba(T.PURPLE, 0.09 * tint); ctx.fill();
      ctx.strokeStyle = rgba(col, 0.55 + 0.4 * tint); ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(fx, fy, RX, 70 * fs, 0, 0, Math.PI * 2); ctx.fillStyle = rgba(T.PURPLE, 0.06 * tint); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    // the 129 public cells pour in; ≈20 grey ones drop away
    const pour = p.pour || 0;
    if (pour > 0 && pour < 1.95) {
      const cs = Math.max(10, 26 * fs);
      for (let i = 0; i < 129; i++) {
        const r = Math.floor(i / 13), cc = i % 13;
        const k = clamp(pour * 1.25 - r * 0.05 - hash(i) * 0.1);
        if (k <= 0 || k >= 1) continue;
        const sx = fx + (cc - 6) * 64 * fs, sy = fy - 520 * fs + r * 40 * fs;
        const mx = fx + (hash(i + 9) - 0.5) * RX * 1.3, my = fy;
        let x, y, a = 1;
        if (k < 0.5) { const q = ease(k / 0.5); x = lerp(sx, mx, q); y = lerp(sy, my, q); }
        else if (DROP(i)) { const q = (k - 0.5) / 0.5; const side = mx < fx ? -1 : 1; x = mx + side * q * 700 * fs; y = my - 80 * fs * Math.sin(q * Math.PI) + q * q * 900 * fs; a = 1 - q * 0.5; }
        else { const q = ease((k - 0.5) / 0.5); x = lerp(mx, spout[0], q); y = lerp(my, spout[1], q); a = 1 - q; }
        ctx.save(); ctx.globalAlpha *= a;
        U.rr(ctx, x - cs / 2, y - cs / 2, cs, cs, 4);
        ctx.fillStyle = DROP(i) ? '#3A4452' : T.REPO[repoOf(i)]; ctx.fill();
        if (DROP(i) && k >= 0.5) { ctx.strokeStyle = rgba(T.RED, 0.8); ctx.lineWidth = 2; ctx.stroke(); }
        ctx.restore();
      }
    }
    // new cells from other repositories join from the right
    const ex = p.extra || 0;
    if (ex > 0 && ex < 1.999) {
      const cs = Math.max(10, 26 * fs);
      for (let j = 0; j < 48; j++) {
        const k = clamp(ex * 1.6 - (j / 48) * 0.6);
        if (k <= 0 || k >= 1) continue;
        const sx = 2060 + (j % 6) * 40, sy = fy - 260 * fs + Math.floor(j / 6) * 40;
        const mx = fx + (hash(j + 50) - 0.2) * RX * 0.9, my = fy;
        let x, y, a = 1;
        if (k < 0.55) { const q = ease(k / 0.55); x = lerp(sx, mx, q); y = lerp(sy, my, q) - Math.sin(q * Math.PI) * 120; }
        else { const q = ease((k - 0.55) / 0.45); x = lerp(mx, spout[0], q); y = lerp(my, spout[1], q); a = 1 - q; }
        ctx.save(); ctx.globalAlpha *= a; U.rr(ctx, x - cs / 2, y - cs / 2, cs, cs, 4);
        ctx.fillStyle = rgba(T.INK, 0.12); ctx.fill(); ctx.strokeStyle = T.INK; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
      }
    }
    // cells stream from the spout into the model block
    const feed = p.feed || 0;
    if (feed > 0) {
      const ma = clamp(feed) * clamp(2 - feed);
      for (let j = 0; j < 14; j++) {
        const q = (feed * 2.2 + j / 14) % 1;
        const x = lerp(spout[0], p.mx - 170, q), y = lerp(spout[1], p.my, ease(q)) ;
        ctx.save(); ctx.globalAlpha *= ma * Math.sin(q * Math.PI); U.rr(ctx, x - 9, y - 9, 18, 18, 3);
        ctx.fillStyle = j % 3 ? T.REPO[0] : T.INK; ctx.fill(); ctx.restore();
      }
    }
    // ribbons: runs streaming out of the model to the test gate
    const rib = clamp(p.rib || 0), ra = p.ra ?? 1;
    if ((p.gate || 0) > 0) {
      const g = clamp(p.gate);
      ctx.save(); ctx.globalAlpha *= g * ra; U.rr(ctx, GX - 12, 270, 24, 560, 8); ctx.fillStyle = rgba(T.GREEN, 0.15); ctx.fill();
      ctx.strokeStyle = T.GREEN; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
      D.text(ctx, 'TESTS', GX, 236, { size: 24, color: T.GREEN, a: g * ra, sans: true });
    }
    if (rib > 0) {
      const judge = clamp(p.judge || 0), keep = clamp(p.keep || 0), wind = clamp(p.wind || 0);
      for (let j = 0; j < NR; j++) {
        const pass = !!PASS[j];
        const x0 = p.mx + 160, y0 = p.my + (j - 7.5) * 7, x1 = GX - 16, y1 = 300 + j * 33;
        const pts = [];
        for (let s = 0; s <= 40; s++) {
          const t = s / 40, u = 1 - t;
          const bx = u * u * u * x0 + 3 * u * u * t * (x0 + 200) + 3 * u * t * t * (x1 - 220) + t * t * t * x1;
          const by = u * u * u * y0 + 3 * u * u * t * y0 + 3 * u * t * t * y1 + t * t * t * y1;
          pts.push([bx, by]);
        }
        let a = ra, col = rgba(T.BLUE, 0.75), w = 3.5;
        ctx.save();
        if (!pass && judge > 0) { ctx.translate(0, judge * judge * 420); a *= 1 - judge; col = rgba(T.DIM, 0.6); }
        if (pass && keep > 0) { col = rgba(T.GREEN, 0.75 + 0.25 * keep); w = 3.5 + 2 * keep; ctx.shadowColor = T.GREEN; ctx.shadowBlur = 16 * keep; }
        if (pass) a *= 1 - wind;
        ctx.globalAlpha *= a;
        if (a > 0.003) {
          D.polyline(ctx, pts, rib, { color: col, w });
          if (pass && keep > 0) D.polyline(ctx, [[x1, y1], [x1 + 140, y1]], keep, { color: col, w });
          if (pass && (p.flow || 0) > 0 && keep > 0.9) {
            const f = (p.flow + j * 0.37) % 1, idx = Math.floor(f * 40);
            ctx.beginPath(); ctx.arc(pts[idx][0], pts[idx][1], 7, 0, Math.PI * 2); ctx.fillStyle = T.GREEN; ctx.fill();
          }
        }
        ctx.restore();
        // winding into the spool
        if (pass && wind > 0 && wind < 1) {
          const q = ease(wind);
          ctx.save(); ctx.globalAlpha *= (1 - wind) * ra + 0.2;
          D.polyline(ctx, [[x1 + 140, y1], [lerp(x1 + 140, p.sx, q), lerp(y1, p.sy, q)]], 1, { color: T.GREEN, w: 4 });
          ctx.restore();
        }
      }
    }
  };
  // rotating green windings inside the spool
  D.c15_wind = (ctx, p) => {
    ctx.save(); ctx.globalAlpha *= p.a ?? 1;
    for (let i = 0; i < 4; i++) {
      const r = 40 + i * 16, a0 = (p.spin || 0) * Math.PI * 2 * (1 + i * 0.2) + i;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, a0, a0 + Math.PI * (1.1 + 0.15 * i));
      ctx.strokeStyle = rgba(T.GREEN, 0.75); ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.stroke();
    }
    ctx.restore();
  };
  // two dials: rank · which layers (needles sweep)
  D.c15_dials = (ctx, p) => {
    ctx.save(); ctx.globalAlpha *= p.a ?? 1;
    [[p.x1, p.sweep], [p.x2, -p.sweep * 0.8 + 0.3]].forEach(([x, s]) => {
      const y = p.y;
      ctx.beginPath(); ctx.arc(x, y, 62, Math.PI * 0.75, Math.PI * 2.25); ctx.strokeStyle = rgba(T.PURPLE, 0.9); ctx.lineWidth = 5; ctx.stroke();
      for (let k = 0; k <= 6; k++) { const a = Math.PI * 0.75 + (k / 6) * Math.PI * 1.5; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 48, y + Math.sin(a) * 48); ctx.lineTo(x + Math.cos(a) * 58, y + Math.sin(a) * 58); ctx.strokeStyle = rgba(T.DIM, 0.8); ctx.lineWidth = 2.5; ctx.stroke(); }
      const a = Math.PI * 0.75 + (0.5 + 0.45 * Math.sin(s * Math.PI * 2)) * Math.PI * 1.5;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 52, y + Math.sin(a) * 52); ctx.strokeStyle = T.INK; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fillStyle = T.INK; ctx.fill();
    });
    ctx.restore();
  };
  // four L4 cards (a 2D stand-in for the serving rig)
  D.c15_cards = (ctx, p) => {
    ctx.save(); ctx.globalAlpha *= p.a ?? 1;
    for (let i = 0; i < 4; i++) {
      const k = clamp((p.draw ?? 1) * 4 - i); if (k <= 0) continue;
      const x = p.x + (i - 1.5) * 120, y = p.y;
      ctx.save(); ctx.globalAlpha *= k; U.rr(ctx, x - 48, y - 70, 96, 140, 10); ctx.fillStyle = '#1E252E'; ctx.fill(); ctx.strokeStyle = '#56616D'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
      D.text(ctx, 'L4', x, y + 2, { size: 30, color: T.DIM, a: k });
    }
    ctx.restore();
  };

  // ------------------------------------------------------------ helpers
  const cap = (html, o = {}) => Object.assign({ type: 'text', html: `<span class="cap" style="font-size:1em">${html}</span>`, size: 26, color: T.DIM, in: 'fade' }, o);
  const tag = (html, o = {}) => cap(html, Object.assign({ color: T.YELLOW }, o));
  const txt = (html, o = {}) => Object.assign({ type: 'text', html, size: 48, in: 'wipe' }, o);
  const FL = (o) => Object.assign({ fx: 960, fy: 230, fs: 1, tint: 1, fa: 1, pour: 0, extra: 0, feed: 0, mx: 760, my: 560, rib: 0, gate: 0, judge: 0, keep: 0, flow: 0, wind: 0, sx: 900, sy: 520, ra: 1 }, o);
  const SPOOL = (o = {}) => Object.assign({ type: 'box', w: 220, h: 220, x: 1640, y: 850, stroke: T.GREEN, rad: 110, fill: 'rgba(131,193,103,0.10)', html: '<span class="cap" style="font-size:0.5em;color:#83C167">SFT data</span>', size: 40 }, o);

  // ================================================================ 497 (1 + 2.5) a funnel; the chip of a passing run falls into it
  c(1, {
    ...K.rail(15),
    ...K.chip('chip', { x: 960, y: 220, s: 1.2 }),
    c15_flow: { type: 'canvas', draw: 'c15_flow', x: 960, y: 540, in: 'fade', dur: 0.5, params: FL({ tint: 0.3 }), paramsFrom: { tint: 0 }, at: 0.05 },
  }, { clear: true, cam: { x: 960, y: 540, s: 1 }, drift: 0 });
  c(2.5, {
    chip: { y: 620, s: 0.9, dur: 1.2, ease: 'power3.in', z: 3 },
    c15_flow: { params: FL({ tint: 1 }), pdur: 1.6 },
    c15_k: txt('the training material: <span class="c-gold">passing runs</span>', { x: 960, y: 985, size: 48, at: 0.9 }),
  }, { sfx: [{ at: 1.2, kind: 'tick' }] });
  // 498 (2) the 129 public cells pour in; ≈20 grey ones drop away
  c(2, {
    chip: { y: 790, s: 0.5, o: 0.9, dur: 1.2 },
    c15_flow: { params: FL({ pour: 0.75 }), pease: 'none' },
    c15_k: 'fade',
    c15_k2: txt('<span class="c-yellow">129</span> public tasks&ensp;<span class="c-dim">· ≈20 fail locally for environment reasons</span>', { x: 960, y: 985, size: 44, at: 0.3 }),
  }, { cam: { x: 960, y: 500, s: 0.92 } });
  // 499 (4.5) new cells from other repositories join
  c(4.5, {
    chip: 'fade',
    c15_flow: { params: FL({ pour: 1.5, extra: 1 }), pdur: 3.3, pease: 'sine.out' },
    c15_k2: 'up',
    c15_k3: txt('more tasks: <span class="c-ink">SWE-smith-style bug injection into other Python repos</span>', { x: 960, y: 985, size: 44, color: T.DIM, at: 0.6 }),
    c15_lev: tag('roadmap lever 7', { x: 1840, ax: 1, align: 'right', y: 130, at: 1.0 }),
  });
  // 500 (2) the cells flow into the model: Gemma runs each task many times
  c(2, {
    c15_k3: 'down', c15_lev: 'fade',
    c15_flow: { params: FL({ pour: 2, extra: 2, fx: 300, fy: 330, fs: 0.36, feed: 1 }), pdur: 1.5, pease: 'power3.inOut' },
    c15_model: { type: 'box', x: 760, y: 560, w: 300, h: 170, stroke: T.BLUE, fill: 'rgba(88,196,221,0.10)', sw: 4, rad: 22, html: 'Gemma', size: 52, in: 'scale', at: 0.5, z: 3 },
    c15_mt: txt('runs each task many times', { x: 760, y: 720, size: 42, color: T.DIM, at: 0.8 }),
  }, { cam: { x: 960, y: 540, s: 1 } });
  // 501 (2) runs stream out as ribbons, each ending at a test gate
  c(2, { c15_flow: { params: FL({ pour: 2, extra: 2, fx: 300, fy: 330, fs: 0.36, feed: 1.9, rib: 1, gate: 1 }), pdur: 1.4, pease: 'power2.out' } });
  // 502 (2) the gate: failing ribbons turn grey and fall away
  c(2, {
    c15_flow: { params: FL({ pour: 2, extra: 2, fx: 300, fy: 330, fs: 0.36, feed: 2, rib: 1, gate: 1, judge: 1 }), pdur: 1.3, pease: 'power2.in' },
    c15_ill: tag('illustrative', { x: 1840, ax: 1, align: 'right', y: 130 }),
  }, { sfx: [{ at: 0.4, kind: 'tick' }] });
  // 503 (4.5) passing ribbons glow: keep only Gemma's own passing runs
  c(4.5, {
    c15_flow: { params: FL({ pour: 2, extra: 2, fx: 300, fy: 330, fs: 0.36, feed: 2, rib: 1, gate: 1, judge: 1, keep: 1, flow: 1.5 }), pdur: 3.3, pease: 'power1.inOut' },
    c15_keep: txt('keep only <span class="c-blue">Gemma</span>’s own <span class="c-green">passing runs</span>', { x: 960, y: 960, size: 56, at: 0.4 }),
    c15_rs: cap('rejection sampling', { x: 960, y: 880, size: 28, at: 1.0 }),
  });
  // 504 (4.5) a counter of kept ribbons climbs toward ≥ 300
  const FK = (o) => FL(Object.assign({ pour: 2, extra: 2, fx: 300, fy: 330, fs: 0.36, feed: 2, rib: 1, gate: 1, judge: 1, keep: 1 }, o));
  c(4.5, {
    c15_flow: { params: FK({ flow: 3.5 }), pease: 'none' },
    c15_keep: 'up', c15_rs: 'fade',
    c15_ge: { type: 'text', html: '<span class="c-yellow">≥</span>', size: 130, x: 1530, y: 470, in: 'pop', at: 1.7 },
    c15_cnt: { type: 'num', val: 300, size: 150, color: T.YELLOW, x: 1700, y: 470, in: 'count', dur: 2.0, ease: 'power3.out', at: 0.2 },
    c15_cntL: txt('verified trajectories', { x: 1640, y: 600, size: 44, at: 0.6 }),
  }, { sfx: [{ at: 1.75, kind: 'pop' }] });
  // 505 (4.5) small caps: the roadmap's milestone for week 3
  c(4.5, {
    c15_flow: { params: FK({ flow: 5.5 }), pease: 'none' },
    c15_ms: cap('the roadmap’s milestone for week 3 · a target', { x: 1640, y: 680, size: 26, color: T.YELLOW, at: 0.3 }),
    c15_cnt: { s: 1.04, dur: 3.0, ease: 'sine.inOut' },
  });
  // 506 (2.5) reading beat: "≥ 300 verified trajectories" stays bright; the rest sinks to a third
  c(2.5, {
    c15_flow: { params: FK({ flow: 6.5, ra: 0.33, fa: 0.33 }), pdur: 1.0, pease: 'power2.out' },
    c15_model: { o: 0.33 }, c15_mt: { o: 0.33 }, c15_ill: { o: 0.33 }, c15_ms: { o: 0.33 },
    c15_cnt: { s: 1.1 }, c15_ge: { s: 1.06 },
  }, { cam: { x: 1500, y: 520, s: 1.25 }, drift: 0.4 });
  // 507 (4.5) the green ribbons wind into a spool: SFT data · Gemma-only
  c(4.5, {
    c15_flow: { params: FK({ flow: 7, ra: 0.33, fa: 0, gate: 0, wind: 1, sx: 900, sy: 500 }), pdur: 1.6, pease: 'power2.inOut' },
    c15_model: 'fade', c15_mt: 'fade', c15_ill: 'fade', c15_ms: 'fade', c15_cnt: 'fade', c15_ge: 'fade', c15_cntL: 'fade',
    spool: SPOOL({ x: 900, y: 500, in: 'scale', at: 1.0 }),
    c15_wind: { type: 'canvas', draw: 'c15_wind', x: 960, y: 540, in: 'fade', at: 1.0, params: { x: 900, y: 500, spin: 1.2, a: 1 }, pease: 'none' },
    c15_sd: txt('SFT data&ensp;·&ensp;<span class="c-blue">Gemma</span>-only', { x: 900, y: 690, size: 54, at: 1.6 }),
  }, { cam: { x: 960, y: 540, s: 1 }, sfx: [{ at: 1.1, kind: 'pop' }] });
  // 508 (4.5) the spool feeds a purple sheet: LoRA · rank 16 · on a subset of layers
  c(4.5, {
    c15_flow: null,
    spool: { x: 520, dur: 1.0, ease: 'expo.inOut' }, c15_sd: { x: 520, dur: 1.0, ease: 'expo.inOut' },
    c15_wind: { params: { x: 520, y: 500, spin: 2.0, a: 1 }, pdur: 1.0, pease: 'expo.inOut' },
    c15_feed: { type: 'arrow', x1: 660, y1: 500, x2: 1170, y2: 500, color: T.GREEN, sw: 4, head: 18, flow: 2, at: 0.8 },
    c15_sheet: { type: 'box', x: 1400, y: 500, w: 400, h: 250, stroke: T.PURPLE, fill: 'rgba(180,142,219,0.16)', sw: 4, rad: 14, html: '<span class="c-purple">LoRA</span>', size: 64, in: 'scale', at: 1.2 },
    c15_sl: txt('rank <span class="c-yellow">16</span> · on a subset of layers', { x: 1400, y: 690, size: 46, at: 1.7 }),
    c15_slc: cap('the roadmap’s first experiment', { x: 1400, y: 750, size: 26, at: 2.0 }),
  });
  // 509 (3) two dials: rank · which layers — ablate both
  c(3, {
    c15_wind: { params: { x: 520, y: 500, spin: 3.4, a: 1 }, pease: 'none' },
    c15_dials: { type: 'canvas', draw: 'c15_dials', x: 960, y: 540, in: 'fade', params: { x1: 1200, x2: 1460, y: 880, sweep: 1, a: 1 }, paramsFrom: { sweep: 0 }, pdur: 2.2, pease: 'power2.inOut' },
    c15_d1: cap('rank', { x: 1200, y: 975, size: 26, at: 0.3 }),
    c15_d2: cap('which layers', { x: 1460, y: 975, size: 26, at: 0.4 }),
    c15_ab: txt('ablate both', { x: 1710, y: 880, size: 46, at: 0.8 }),
  });
  // 510 (4.5) the warning tag beside the purple sheet
  const WARN = '<span class="cap c-red" style="font-size:0.6em">community report</span><br>high-rank, all-layer adapters misbehaved on the W4A16 build — <span class="c-yellow">smoke-test serving early</span>';
  c(4.5, {
    c15_wind: { params: { x: 520, y: 500, spin: 4.6, a: 1 }, pease: 'none' },
    c15_dials: { params: { x1: 1200, x2: 1460, y: 880, sweep: 2, a: 1 }, pease: 'power1.inOut' },
    c15_warn: { type: 'box', x: 560, y: 860, w: 900, h: 220, stroke: T.RED, fill: 'rgba(252,98,85,0.06)', sw: 3, rad: 18, html: `<div style="padding:0 36px">${WARN}</div>`, size: 40, lh: 1.25, in: 'draw', at: 0.3 },
  }, { sfx: [{ at: 0.4, kind: 'tick' }] });
  // 511 (4.5) the sheet flies onto the serving cards
  c(4.5, {
    c15_dials: 'fade', c15_d1: 'fade', c15_d2: 'fade', c15_ab: 'fade', c15_feed: 'fade', c15_sl: 'fade', c15_slc: 'fade',
    c15_wind: { params: { x: 520, y: 500, spin: 5.6, a: 1 }, pease: 'none' },
    c15_cards: { type: 'canvas', draw: 'c15_cards', x: 960, y: 540, in: 'fade', params: { x: 1400, y: 620, draw: 1, a: 1 }, paramsFrom: { draw: 0 }, pdur: 1.0 },
    c15_sheet: { x: 1400, y: 470, w: 520, h: 90, size: 40, dur: 1.2, ease: 'expo.inOut', at: 0.4 },
    c15_rigL: cap('4 × L4 · W4A16 serving', { x: 1400, y: 740, size: 26, at: 0.8 }),
    c15_smoke: txt('smoke test: <span class="c-dim">does the adapter load and behave?</span>', { x: 1450, y: 850, size: 40, maxw: 720, at: 1.4 }),
  }, { sfx: [{ at: 1.5, kind: 'click' }] });
  // 512 (4.5) the held-out block with two empty bars; the spool settles toward its corner
  c(4.5, {
    c15_warn: 'left', c15_cards: 'fade', c15_rigL: 'fade', c15_smoke: 'fade', c15_wind: 'fade', c15_sd: 'fade',
    spool: SPOOL({ dur: 1.4, ease: 'expo.inOut' }),
    c15_sheet: { x: 1560, y: 260, w: 300, h: 80, size: 34, dur: 1.2, ease: 'expo.inOut' },
    c15_ho: txt('held-out repository: <span class="m">rich</span>', { x: 560, y: 220, size: 50, at: 0.4 }),
    c15_hoT: tag('example', { x: 560, y: 285, size: 24, at: 0.6 }),
    c15_b1: { type: 'box', x: 380, y: 560, w: 220, h: 380, stroke: T.DIM, fill: 'rgba(0,0,0,0)', sw: 3, rad: 10, html: '<span class="c-dim">?</span>', size: 80, in: 'draw', at: 0.6 },
    c15_b2: { type: 'box', x: 740, y: 560, w: 220, h: 380, stroke: T.PURPLE, fill: 'rgba(0,0,0,0)', sw: 3, rad: 10, html: '<span class="c-dim">?</span>', size: 80, in: 'draw', at: 0.8 },
    c15_b1L: txt('prompt only', { x: 380, y: 800, size: 42, at: 1.0 }),
    c15_b2L: txt('prompt + <span class="c-purple">LoRA</span>', { x: 740, y: 800, size: 42, at: 1.2 }),
    c15_bT: tag('your measurement', { x: 560, y: 880, size: 26, at: 1.5 }),
  }, { cut: true });
  // 513 (2) the sheet slides into adapters/ in the TREE
  const TY = 520, TS = 40, LH = TS * 1.55;
  const lineY = (i) => TY - (8 * LH) / 2 + LH * (i + 1.5);
  c(2, {
    ...K.tree('tree', { x: 1000, y: TY, size: TS, el: { in: 'fade', dur: 0.5 } }),
    c15_thl: { type: 'rect', ax: 0, x: 990, y: lineY(5), w: 470, h: LH - 6, fill: 'rgba(180,142,219,0.18)', rad: 8, in: 'grow', at: 0.6, z: 0 },
    c15_sheet: { x: 1640, y: lineY(5), w: 170, h: 56, size: 28, dur: 0.9, ease: 'expo.inOut', at: 0.3 },
  }, { sfx: [{ at: 1.1, kind: 'tick' }] });
  // 514 (4.5) RL comes after SFT, if at all; the RAIL rewrites to 16
  c(4.5, {
    c15_ho: 'fade', c15_hoT: 'fade', c15_b1: 'fade', c15_b2: 'fade', c15_b1L: 'fade', c15_b2L: 'fade', c15_bT: 'fade',
    tree: 'fade', c15_thl: 'fade', c15_sheet: 'fade',
    c15_rl: txt('RL comes after SFT, if at all', { x: 820, y: 470, size: 72, at: 0.45 }),
    c15_rl2: txt('<span class="c-dim">highest ceiling,</span> <span class="c-red">highest cost</span>', { x: 820, y: 590, size: 56, at: 1.1 }),
    spool: SPOOL(),
    rail: { ver: 16, at: 0.6 },
  }, { cam: { x: 960, y: 540, s: 1 }, drift: 0 });
})();
