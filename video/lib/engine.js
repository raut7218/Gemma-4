// Deterministic composition engine.
//
// The film is a list of compositions on a beat grid. Each composition names the
// elements on screen and their target state. An element that appears in two
// consecutive compositions keeps its identity and morphs between the states;
// new elements enter, missing ones leave. Every numeric property lives on a
// plain proxy object tweened by ONE paused gsap timeline, and FILM.seek(t)
// renders the DOM from the proxies, so any frame depends only on t.

(function () {
  const T = window.TOK;
  const stage = document.getElementById('stage');
  const bg = document.getElementById('bg');
  const world = document.getElementById('world');
  const hud = document.getElementById('hud');
  const svgNS = 'http://www.w3.org/2000/svg';

  const tl = gsap.timeline({ paused: true, defaults: { overwrite: false } });
  const EL = {};            // id -> element record
  const COMPS = [];         // {t, d, els, cam, label, cut, sfx}
  const CHAPTERS = [];      // {name, t}
  const CUES = [];          // audio cues {t, kind}
  const HOOKS = [];         // custom per-frame renderers (3d etc.)
  let cursor = 0;           // in beats

  // ---------------------------------------------------------------- helpers
  const hexToRgb = (c) => {
    if (!c || c.startsWith('rgb')) return c;
    const h = c.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
    return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // default props per type
  const DEF = {
    common: { x: 960, y: 540, s: 1, r: 0, o: 1, color: T.INK, ver: 0, reveal: 1, blur: 0, z: 1 },
    text: { size: 48, weight: 400, font: 'serif', align: 'center', maxw: 1600, lh: 1.25 },
    mono: { size: 30, align: 'left', lh: 1.45 },
    box: { w: 400, h: 120, stroke: T.BLUE, fill: 'rgba(0,0,0,0)', sw: 3, rad: 14, draw: 1, size: 34, lh: 1.25, font: 'serif', align: 'center', pad: 18 },
    arrow: { x1: 0, y1: 0, x2: 100, y2: 0, bend: 0, draw: 1, sw: 4, head: 18, dash: 0, flow: -1 },
    rect: { w: 100, h: 100, fill: T.BLUE, rad: 0, ax: 0.5, ay: 0.5 },
    ring: { rad: 60, sw: 6, frac: 1, start: -90, fill: 'rgba(0,0,0,0)' },
    dot: { rad: 8, fill: T.YELLOW },
    num: { size: 96, val: 0, dec: 0, pre: '', suf: '', font: 'serif', comma: true },
    path: { sw: 4, draw: 1, fill: 'none' },
    html: { w: 0, h: 0 },
    three: { w: 1920, h: 1080 },
    canvas: { w: 1920, h: 1080 },
  };
  const COLOR_KEYS = ['color', 'stroke', 'fill'];
  const NUM_KEYS = ['x', 'y', 's', 'r', 'o', 'ver', 'reveal', 'blur', 'w', 'h', 'sw', 'rad', 'draw', 'x1', 'y1', 'x2', 'y2', 'bend', 'head', 'val', 'frac', 'start', 'flow', 'ax', 'ay', 'size'];

  // ---------------------------------------------------------------- element factory
  function create(id, spec) {
    const type = spec.type || 'text';
    const p = Object.assign({}, DEF.common, DEF[type] || {}, spec);
    const rec = { id, type, spec: p, proxy: {}, node: null, versions: [], extra: {} };
    const host = p.hud ? hud : world;
    const node = document.createElement('div');
    node.className = 'el el-' + type;
    node.style.zIndex = p.z;
    host.appendChild(node);
    rec.node = node;
    const FONTS = { serif: T.SERIF, ital: T.ITAL, mono: T.MONO, sans: T.SANS };
    if (type === 'text' || type === 'box' || type === 'mono' || type === 'num' || type === 'html') {
      node.style.fontFamily = FONTS[type === 'mono' ? 'mono' : (p.font || 'serif')] || p.font;
      node.style.fontWeight = p.weight || 400;
      node.style.lineHeight = p.lh || 1.25;
      node.style.textAlign = p.align || 'center';
      if (type === 'text') node.style.maxWidth = (p.maxw || 1600) + 'px';
      if (type === 'text' && p.width) node.style.width = p.width + 'px';
      if (type === 'box') node.style.padding = '0';
      if (type === 'html' && p.w) { node.style.width = p.w + 'px'; }
      if (p.ls) node.style.letterSpacing = p.ls;
    }

    if (type === 'text' || type === 'mono' || type === 'box' || type === 'html') {
      // versions: list of html strings; ver crossfades between them
      const vers = spec.versions || [spec.html || ''];
      const holder = document.createElement('div');
      holder.className = 'vers';
      if (type === 'box') {
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('class', 'boxsvg');
        const rect = document.createElementNS(svgNS, 'rect');
        svg.appendChild(rect);
        node.appendChild(svg);
        rec.extra.svg = svg; rec.extra.rect = rect;
      }
      node.appendChild(holder);
      vers.forEach((h) => {
        const v = document.createElement('div');
        v.className = 'ver';
        v.innerHTML = h;
        holder.appendChild(v);
        rec.versions.push(v);
      });
      rec.extra.holder = holder;
      rec.extra.htmls = vers.slice();
    } else if (type === 'arrow' || type === 'path' || type === 'ring' || type === 'dot') {
      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('class', 'fullsvg');
      svg.setAttribute('viewBox', '0 0 1920 1080');
      const path = document.createElementNS(svgNS, 'path');
      svg.appendChild(path);
      if (type === 'arrow') {
        const head = document.createElementNS(svgNS, 'path');
        svg.appendChild(head);
        rec.extra.head = head;
        const pulse = document.createElementNS(svgNS, 'circle');
        svg.appendChild(pulse);
        rec.extra.pulse = pulse;
      }
      node.appendChild(svg);
      rec.extra.path = path;
      if (type === 'path') path.setAttribute('d', p.d);
    } else if (type === 'num') {
      const v = document.createElement('div');
      v.className = 'ver';
      node.appendChild(v);
      rec.extra.out = v;
    } else if (type === 'rect') {
      // a plain filled rectangle (bars, plates)
    } else if (type === 'canvas') {
      const c = document.createElement('canvas');
      c.width = p.w; c.height = p.h;
      node.appendChild(c);
      rec.extra.canvas = c; rec.extra.ctx = c.getContext('2d');
    } else if (type === 'three') {
      const c = document.createElement('canvas');
      c.width = p.w; c.height = p.h;
      node.appendChild(c);
      rec.extra.canvas = c;
      rec.extra.mod = window.THREE_SCENES[p.scene];
      rec.extra.ready = rec.extra.mod.init(c, p);
    }
    // proxy holds every animatable value
    for (const k of NUM_KEYS) if (p[k] !== undefined) rec.proxy[k] = p[k];
    for (const k of COLOR_KEYS) if (p[k] !== undefined) rec.proxy[k] = hexToRgb(p[k]);
    if (spec.params) rec.proxy.params = Object.assign({}, spec.params);
    rec.proxy.o = 0; // hidden until first entry
    EL[id] = rec;
    return rec;
  }

  // ---------------------------------------------------------------- render
  function arrowGeom(q) {
    const mx = (q.x1 + q.x2) / 2, my = (q.y1 + q.y2) / 2;
    const dx = q.x2 - q.x1, dy = q.y2 - q.y1;
    const len = Math.hypot(dx, dy) || 1;
    const cx = mx - (dy / len) * q.bend, cy = my + (dx / len) * q.bend;
    return { d: `M${q.x1},${q.y1} Q${cx},${cy} ${q.x2},${q.y2}`, cx, cy };
  }

  function renderEl(rec) {
    const q = rec.proxy, n = rec.node, sp = rec.spec;
    const o = clamp(q.o, 0, 1);
    n.style.opacity = o;
    n.style.visibility = o < 0.002 ? 'hidden' : 'visible';
    if (o < 0.002) return;
    if (q.color) n.style.color = q.color;
    const t = rec.type;
    if (t === 'arrow' || t === 'path' || t === 'ring' || t === 'dot') {
      n.style.transform = `translate(${(q.x ?? 960) - 960}px, ${(q.y ?? 540) - 540}px) scale(${q.s ?? 1})`;
      const path = rec.extra.path;
      if (t === 'arrow') {
        const g = arrowGeom(q);
        path.setAttribute('d', g.d);
        const L = path.getTotalLength();
        const drawn = L * clamp(q.draw, 0, 1);
        path.style.strokeDasharray = sp.dashed ? `10 12` : `${drawn} ${L + 10}`;
        if (sp.dashed) path.style.strokeDashoffset = `${-q.flow * 22}`;
        path.style.stroke = q.color; path.style.strokeWidth = q.sw; path.style.fill = 'none';
        // head at the drawn tip
        const tip = path.getPointAtLength(drawn);
        const back = path.getPointAtLength(Math.max(0, drawn - 2));
        const ang = Math.atan2(tip.y - back.y, tip.x - back.x);
        const h = q.head * clamp(q.draw * 4, 0, 1);
        const p1 = [tip.x - h * Math.cos(ang - 0.42), tip.y - h * Math.sin(ang - 0.42)];
        const p2 = [tip.x - h * Math.cos(ang + 0.42), tip.y - h * Math.sin(ang + 0.42)];
        rec.extra.head.setAttribute('d', `M${tip.x},${tip.y} L${p1[0]},${p1[1]} L${p2[0]},${p2[1]} Z`);
        rec.extra.head.style.fill = q.color;
        // optional travelling pulse, 0..1 along the path (flow >= 0)
        const pu = rec.extra.pulse;
        if (q.flow >= 0 && !sp.dashed) {
          const f = q.flow - Math.floor(q.flow);
          const pt = path.getPointAtLength(L * f);
          pu.setAttribute('cx', pt.x); pu.setAttribute('cy', pt.y); pu.setAttribute('r', q.sw * 1.6);
          pu.style.fill = sp.pulseColor || T.YELLOW;
          pu.style.opacity = Math.sin(Math.PI * f) * clamp(q.draw * 2 - 1, 0, 1);
        } else pu.style.opacity = 0;
      } else if (t === 'path') {
        const L = path.getTotalLength ? path.getTotalLength() : 1000;
        path.style.strokeDasharray = `${L * clamp(q.draw, 0, 1)} ${L + 10}`;
        path.style.stroke = q.color; path.style.strokeWidth = q.sw;
        path.style.fill = q.fill || 'none';
        path.style.strokeLinecap = 'round'; path.style.strokeLinejoin = 'round';
      } else if (t === 'ring') {
        const a0 = (q.start * Math.PI) / 180, a1 = a0 + Math.PI * 2 * clamp(q.frac, 0, 0.9999);
        const r = q.rad, x0 = 960 + r * Math.cos(a0), y0 = 540 + r * Math.sin(a0);
        const x1 = 960 + r * Math.cos(a1), y1 = 540 + r * Math.sin(a1);
        const large = a1 - a0 > Math.PI ? 1 : 0;
        path.setAttribute('d', `M${x0},${y0} A${r},${r} 0 ${large} 1 ${x1},${y1}`);
        path.style.stroke = q.color; path.style.strokeWidth = q.sw; path.style.fill = 'none';
        path.style.strokeLinecap = 'round';
      } else if (t === 'dot') {
        path.setAttribute('d', `M${960 - q.rad},540 a${q.rad},${q.rad} 0 1,0 ${q.rad * 2},0 a${q.rad},${q.rad} 0 1,0 ${-q.rad * 2},0`);
        path.style.fill = q.fill; path.style.stroke = 'none';
      }
      return;
    }
    // box-model elements: positioned by centre (ax/ay anchor for rects)
    const ax = q.ax ?? 0.5, ay = q.ay ?? 0.5;
    n.style.transform = `translate(${q.x}px, ${q.y}px) translate(${-ax * 100}%, ${-ay * 100}%) rotate(${q.r}deg) scale(${q.s})`;
    n.style.transformOrigin = `${ax * 100}% ${ay * 100}%`;
    if (q.blur > 0.05) n.style.filter = `blur(${q.blur}px)`; else n.style.filter = '';
    if (t === 'rect') {
      n.style.width = q.w + 'px'; n.style.height = q.h + 'px';
      n.style.background = q.fill; n.style.borderRadius = q.rad + 'px';
      return;
    }
    if (t === 'num') {
      const v = q.val;
      let s = v.toFixed(sp.dec);
      if (sp.comma) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      rec.extra.out.innerHTML = sp.pre + s + sp.suf;
      n.style.fontSize = q.size + 'px';
      return;
    }
    if (t === 'three') {
      rec.extra.mod.render(q.params, rec);
      return;
    }
    if (t === 'canvas') {
      const ctx = rec.extra.ctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, sp.w, sp.h);
      window.DRAW[sp.draw](ctx, q.params, sp, tl.time());
      return;
    }
    if (t === 'box') {
      n.style.width = q.w + 'px'; n.style.height = q.h + 'px';
      const r = rec.extra.rect, sw = q.sw;
      rec.extra.svg.setAttribute('width', q.w + sw * 2);
      rec.extra.svg.setAttribute('height', q.h + sw * 2);
      rec.extra.svg.style.left = -sw + 'px'; rec.extra.svg.style.top = -sw + 'px';
      r.setAttribute('x', sw); r.setAttribute('y', sw);
      r.setAttribute('width', Math.max(1, q.w)); r.setAttribute('height', Math.max(1, q.h));
      r.setAttribute('rx', q.rad);
      r.style.stroke = q.stroke; r.style.strokeWidth = sw; r.style.fill = q.fill;
      const L = 2 * (q.w + q.h);
      r.style.strokeDasharray = `${L * clamp(q.draw, 0, 1)} ${L + 10}`;
    }
    if (q.size) n.style.fontSize = q.size + 'px';
    // versions crossfade + wipe reveal
    const vs = rec.versions;
    for (let i = 0; i < vs.length; i++) {
      const a = clamp(1 - Math.abs(q.ver - i) * 1.6, 0, 1);
      vs[i].style.opacity = a;
      vs[i].style.visibility = a < 0.002 ? 'hidden' : 'visible';
    }
    const rv = clamp(q.reveal, 0, 1);
    if (rv < 0.999) {
      const e = rv * 115 - 15;
      const m = `linear-gradient(90deg, #000 ${e}%, transparent ${e + 15}%)`;
      rec.extra.holder.style.webkitMaskImage = m; rec.extra.holder.style.maskImage = m;
    } else { rec.extra.holder.style.webkitMaskImage = ''; rec.extra.holder.style.maskImage = ''; }
  }

  const cam = { x: 960, y: 540, s: 1, r: 0 };
  const bgp = { x: 0, y: 0, o: 1 };
  function renderAll() {
    world.style.transform = `translate(960px, 540px) rotate(${cam.r}deg) scale(${cam.s}) translate(${-cam.x}px, ${-cam.y}px)`;
    bg.style.transform = `translate(${-(cam.x - 960) * 0.35 + bgp.x}px, ${-(cam.y - 540) * 0.35 + bgp.y}px) scale(${1 + (cam.s - 1) * 0.35})`;
    bg.style.opacity = bgp.o;
    // 3D first (it publishes label anchors), then hooks, then everything else
    for (const id in EL) if (EL[id].type === 'three') renderEl(EL[id]);
    for (const h of HOOKS) h(tl.time());
    for (const id in EL) if (EL[id].type !== 'three') renderEl(EL[id]);
  }

  // ---------------------------------------------------------------- entry / exit styles
  const ENTER = {
    wipe: { from: { reveal: 0 }, dur: 1.0, ease: 'power2.out', also: { o: 1 } },
    rise: { from: { dy: 34, o: 0 }, dur: 0.9, ease: 'expo.out' },
    fade: { from: { o: 0 }, dur: 0.7, ease: 'power2.out' },
    left: { from: { dx: -760, o: 0 }, dur: 1.05, ease: 'expo.out' },
    right: { from: { dx: 760, o: 0 }, dur: 1.05, ease: 'expo.out' },
    up: { from: { dy: 260, o: 0 }, dur: 1.0, ease: 'expo.out' },
    down: { from: { dy: -260, o: 0 }, dur: 1.0, ease: 'expo.out' },
    scale: { from: { ds: 0.82, o: 0 }, dur: 0.9, ease: 'expo.out' },
    pop: { from: { ds: 0.4, o: 0 }, dur: 0.7, ease: 'back.out(1.6)' },
    zoom: { from: { ds: 2.6, o: 0 }, dur: 1.1, ease: 'expo.out' },
    behind: { from: { ds: 0.86, o: 0 }, dur: 1.2, ease: 'power3.out' },
    draw: { from: { draw: 0 }, dur: 1.0, ease: 'power2.inOut', also: { o: 1 } },
    grow: { from: { w: 0 }, dur: 1.0, ease: 'expo.out', also: { o: 1 } },
    growh: { from: { h: 0 }, dur: 1.0, ease: 'expo.out', also: { o: 1 } },
    count: { from: { val: 0 }, dur: 1.4, ease: 'power3.out', also: { o: 1 } },
    none: { from: {}, dur: 0.001, ease: 'none' },
  };
  const EXIT = {
    fade: { to: { o: 0, dy: -18 }, dur: 0.45, ease: 'power2.in' },
    quick: { to: { o: 0 }, dur: 0.3, ease: 'power2.in' },
    left: { to: { dx: -900, o: 0 }, dur: 0.55, ease: 'power3.in' },
    right: { to: { dx: 900, o: 0 }, dur: 0.55, ease: 'power3.in' },
    up: { to: { dy: -300, o: 0 }, dur: 0.55, ease: 'power3.in' },
    down: { to: { dy: 300, o: 0 }, dur: 0.55, ease: 'power3.in' },
    zoom: { to: { ds: 7, o: 0 }, dur: 0.85, ease: 'power2.in' },
    shrink: { to: { ds: 0.6, o: 0 }, dur: 0.45, ease: 'power2.in' },
    undraw: { to: { draw: 0 }, dur: 0.45, ease: 'power2.in' },
    none: { to: { o: 0 }, dur: 0.001, ease: 'none' },
  };

  function resolve(id, spec, prevSpec) {
    // inherit unspecified props from previous state of the same element
    const base = prevSpec ? Object.assign({}, prevSpec) : {};
    delete base.in; delete base.out; delete base.at; delete base.dur; delete base.from; delete base.ease;
    const r = Object.assign(base, spec);
    return r;
  }

  function targetVals(rec, st) {
    // unspecified values fall back to the type's defaults, so an entry style that starts
    // from reveal 0 / draw 0 always animates back to the resting value
    const d = Object.assign({}, DEF.common, DEF[rec.type] || {});
    const out = {};
    for (const k of NUM_KEYS) { const v = st[k] !== undefined ? st[k] : d[k]; if (v !== undefined && rec.proxy[k] !== undefined) out[k] = v; }
    for (const k of COLOR_KEYS) { const v = st[k] !== undefined ? st[k] : d[k]; if (v !== undefined && rec.proxy[k] !== undefined) out[k] = hexToRgb(v); }
    if (st.ver === undefined && rec.proxy.ver !== undefined) out.ver = st.ver ?? 0;
    if (out.o === undefined) out.o = 1;
    return out;
  }

  // ---------------------------------------------------------------- authoring API
  const API = {
    T,
    beats: (b) => b * T.BEAT,
    chapter(name) { CHAPTERS.push({ name, t: cursor * T.BEAT }); },
    // comp(beats, delta, opts): the new composition is the previous one plus
    // `delta`. {id: {...}} adds or updates an element (updates merge into its
    // last state), {id: null} removes it. opts.clear removes everything not in
    // delta (opts.keep lists ids that survive a clear). opts.cam sets the
    // camera; it persists until changed.
    comp(beats, delta = {}, opts = {}) {
      const prev = COMPS.length ? COMPS[COMPS.length - 1] : null;
      const els = {};
      if (prev && !opts.clear) Object.assign(els, prev.els);
      if (prev && prev.ul && els[prev.ul] && !(prev.ul in delta)) delete els[prev.ul];
      // after a push beat, the camera returns to where it was before the beat
      if (prev && prev.beatCam && !opts.cam) opts = Object.assign({}, opts, { cam: prev.beatCam });
      // after a push beat the HUD rail fades back in (it fades out during the push so content never slides under it)
      if (prev && prev.railHidden && prev.els.rail) {
        if (!('rail' in delta)) delta = Object.assign({}, delta, { rail: { o: 1, dur: 0.5 } });
        else if (delta.rail && typeof delta.rail === 'object' && delta.rail.o === undefined) delta = Object.assign({}, delta, { rail: Object.assign({}, delta.rail, { o: 1 }) });
      }
      if (prev && opts.clear && opts.keep) for (const k of opts.keep) if (prev.els[k]) els[k] = prev.els[k];
      for (const id in delta) {
        if (delta[id] === null) { delete els[id]; continue; }
        if (typeof delta[id] === 'string') {
          // removal with a named exit style: record it on the previous state
          // mutate in place: copying would break the 'carried unchanged' identity check and re-run the entry tween
          if (prev && prev.els[id]) prev.els[id].out = delta[id];
          delete els[id]; continue;
        }
        // a delta merges onto the element's last state; untouched elements keep the same object
        // a carried element (already on screen) merges the delta onto its last state, even when the
        // delta repeats the full spec (so a chapter's opening comp works both inside the film,
        // where the object is carried in, and in a standalone chapter test, where it is created)
        els[id] = prev && prev.els[id] && !delta[id].replace ? Object.assign({}, prev.els[id], delta[id], { type: prev.els[id].type, in: undefined, from: undefined, at: delta[id].at, dur: delta[id].dur, ease: delta[id].ease }) : delta[id];
      }
      const cam = opts.cam ? Object.assign({}, opts.cam) : (prev ? prev.cam : undefined);
      const c = Object.assign({ t: cursor * T.BEAT, d: beats * T.BEAT, beats }, opts, { els, cam });
      COMPS.push(c);
      cursor += beats;
      return c;
    },
    // Reading beat: F.beat(beats, {id, mode: 'push'|'underline', w, dy, color, sub}).
    // 'push' moves the camera onto the element (scale x1.28 of the current camera) and lifts it a
    // touch; 'underline' grows a rule of width w under it. Either way the next comp clears it.
    beat(beats, o) {
      const prev = COMPS[COMPS.length - 1];
      const el = prev.els[o.id];
      if (!el) throw new Error('beat: no element ' + o.id);
      const cam0 = prev.cam || { x: 960, y: 540, s: 1 };
      // visual centre: left/top-anchored elements are offset by half their (given or estimated) size
      const hw = o.w || el.w || el.maxw || 600, hh = el.h || (el.size || 48) * 1.3;
      const ex = (el.x ?? 960) + (0.5 - (el.ax ?? 0.5)) * hw + (o.dx || 0), ey = (el.y ?? 540) + (0.5 - (el.ay ?? 0.5)) * hh + (o.dy || 0);
      const delta = {};
      let opts = { drift: 0.4, beatCam: cam0 };
      if (o.mode === 'push') {
        const s1 = (cam0.s || 1) * (o.scale || 1.22);
        opts.cam = { x: (cam0.x ?? 960) + (ex - (cam0.x ?? 960)) * 0.7, y: (cam0.y ?? 540) + (ey - (cam0.y ?? 540)) * 0.7, s: s1 };
        delta[o.id] = { s: (el.s ?? 1) * 1.05 };
        if (prev.els.rail) { delta.rail = { o: 0, dur: 0.35 }; opts.railHidden = true; }
      } else {
        const id = '_ul' + COMPS.length;
        delta[id] = { type: 'rect', x: ex, y: ey + (o.under || ((el.size || 48) * 0.72)), w: o.w || 420, h: 5, rad: 3, fill: o.color || T.GOLD, in: 'grow', dur: 0.9, z: (el.z || 1) + 1 };
        opts.ul = id;
      }
      const c = this.comp(beats, delta, opts);
      return c;
    },
    hook(fn) { HOOKS.push(fn); },
    cue(t, kind) { CUES.push({ t, kind }); },
    now() { return cursor * T.BEAT; },
  };
  window.F = API;

  function build() {
    // create every element from its first appearance
    for (const c of COMPS) for (const id in c.els) if (!EL[id]) create(id, c.els[id]);
    const prev = {};
    COMPS.forEach((c, k) => {
      const t0 = c.t;
      const ids = Object.keys(c.els);
      // camera: drift through the composition (never frozen), eased between comps
      const cm = Object.assign({ x: 960, y: 540, s: 1, r: 0 }, c.cam || {});
      const drift = c.drift ?? 1;
      const dir = (k % 2 ? 1 : -1);
      const camStart = { x: cm.x, y: cm.y, s: cm.s, r: cm.r };
      const camEnd = { x: cm.x + 22 * dir * drift, y: cm.y - 8 * drift, s: cm.s * (1 + 0.028 * drift), r: cm.r };
      if (k === 0) Object.assign(cam, camStart);
      tl.to(cam, Object.assign({ duration: Math.min(1.1, c.d * 0.45), ease: 'power3.inOut' }, camStart), t0);
      tl.to(cam, Object.assign({ duration: c.d - Math.min(1.1, c.d * 0.45), ease: 'sine.inOut' }, camEnd), t0 + Math.min(1.1, c.d * 0.45));
      if (c.bg) tl.to(bgp, Object.assign({ duration: 1.2, ease: 'power2.inOut' }, c.bg), t0);
      if (c.cut) CUES.push({ t: t0, kind: 'whoosh' });
      if (c.sfx) for (const s of [].concat(c.sfx)) CUES.push({ t: t0 + (s.at || 0), kind: s.kind || 'click' });

      // exits
      let exIdx = 0;
      for (const id in prev) {
        if (c.els[id]) continue;
        const rec = EL[id], st = prev[id];
        const ex = EXIT[st.out || c.out || 'fade'];
        const to = { duration: ex.dur, ease: ex.ease };
        for (const kk in ex.to) {
          if (kk === 'dx') to.x = (st.x ?? 960) + ex.to.dx;
          else if (kk === 'dy') to.y = (st.y ?? 540) + ex.to.dy;
          else if (kk === 'ds') to.s = (st.s ?? 1) * ex.to.ds;
          else to[kk] = ex.to[kk];
        }
        const lead = c.exitLead ?? 0.12;
        tl.to(rec.proxy, to, Math.max(0, t0 - lead + exIdx * 0.025));
        tl.set(rec.proxy, { o: 0 }, Math.max(0, t0 - lead + exIdx * 0.025 + ex.dur));
        exIdx++;
        delete prev[id];
      }
      // entries and morphs
      let enIdx = 0;
      const prevRaw = k > 0 ? COMPS[k - 1].els : {};
      ids.forEach((id, i) => {
        const rec = EL[id];
        if (prev[id] && prevRaw[id] === c.els[id]) return; // carried unchanged
        const st = resolve(id, c.els[id], prev[id]);
        const tv = targetVals(rec, st);
        if (st.params) tv.params = st.params;
        const stagger = c.stagger ?? 0.11;
        if (!prev[id]) {
          const en = ENTER[st.in || (rec.type === 'arrow' || rec.type === 'path' ? 'draw' : 'rise')];
          const at = t0 + (st.at ?? (enIdx * stagger)) + (c.enterDelay ?? 0.05);
          const from = {};
          for (const kk in en.from) {
            if (kk === 'dx') from.x = (tv.x ?? 960) + en.from.dx;
            else if (kk === 'dy') from.y = (tv.y ?? 540) + en.from.dy;
            else if (kk === 'ds') from.s = (tv.s ?? 1) * en.from.ds;
            else from[kk] = en.from[kk];
          }
          if (st.from) for (const kk in st.from) from[kk] = COLOR_KEYS.includes(kk) ? hexToRgb(st.from[kk]) : st.from[kk];
          const startVals = Object.assign({}, tv, from);
          if (st.params) startVals.params = Object.assign({}, st.params, st.paramsFrom || {});
          if (k === 0 && !c.animateFirst) {
            // frame one is a finished picture
            const tv0 = Object.assign({}, tv); delete tv0.params; // never replace the params object
            if (st.from) {
              // an explicit `from` on frame one: start finished-looking from those values and settle
              const pv0 = Object.assign({}, startVals); delete pv0.params;
              tl.set(rec.proxy, pv0, 0);
              tl.to(rec.proxy, Object.assign({ duration: st.dur ?? en.dur, ease: st.ease ?? 'power2.out' }, tv0), 0.0002 + (st.at ?? 0));
            } else tl.set(rec.proxy, tv0, 0);
            if (st.params) tl.set(rec.proxy.params, st.params, 0);
          } else {
            const pv = Object.assign({}, startVals); delete pv.params;
            tl.set(rec.proxy, pv, Math.max(0, at - 0.001));
            if (st.params) tl.set(rec.proxy.params, startVals.params, Math.max(0, at - 0.001));
            const tvv = Object.assign({}, tv); delete tvv.params;
            tl.to(rec.proxy, Object.assign({ duration: st.dur ?? en.dur, ease: st.ease ?? en.ease }, tvv), at);
            if (st.params) tl.to(rec.proxy.params, Object.assign({ duration: st.pdur ?? c.d, ease: st.pease ?? 'power2.inOut' }, st.params), at);
          }
          enIdx++;
        } else {
          // morph from previous state
          const at = t0 + (st.at ?? (i * 0.05));
          const dur = st.dur ?? Math.min(1.1, Math.max(0.6, c.d * 0.4));
          const tvv = Object.assign({}, tv); delete tvv.params;
          tl.to(rec.proxy, Object.assign({ duration: dur, ease: st.ease ?? 'power3.inOut' }, tvv), at);
          if (st.params) tl.to(rec.proxy.params, Object.assign({ duration: st.pdur ?? c.d, ease: st.pease ?? 'power2.inOut' }, st.params), at);
        }
        prev[id] = st;
      });
    });
    // final exits at the end of the film
    const end = COMPS.length ? COMPS[COMPS.length - 1].t + COMPS[COMPS.length - 1].d : 0;
    tl.set({}, {}, end);
    FILM.duration = end;
  }

  window.FILM = {
    tl, EL, COMPS, CHAPTERS, CUES,
    duration: 0,
    build,
    // never seek to exactly 0: gsap reverts zero-duration sets at the start when the playhead lands on 0
    seek(t) { tl.seek(Math.max(t, 1e-4), false); renderAll(); },
    ready: Promise.resolve(),
  };
})();
