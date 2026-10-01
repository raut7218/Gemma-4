// Shared components. Each returns {id: spec} fragments to merge into a comp delta.
// Sizes are chosen so the main subject fills most of the frame.
(function () {
  const T = window.TOK;
  const CH = [
    'Cold open', 'The task', 'Scoring and time', 'Rules, dates, prizes', 'The model and the hardware',
    'The 32k context window', 'The nine tools', 'Sandbox and verification', 'A worked example',
    'Failure modes', 'The data and your local evaluation', 'What you submit', 'How coding agents got here',
    'What you need to build', 'Prompt, skills and sub-agents', 'Teaching the model', 'Where to start', 'Recap',
  ];
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const K = {
    CH,
    esc,
    // ---- the chapter rail (HUD, top-left). ver = chapter index.
    rail(i, extra = {}) {
      return {
        rail: Object.assign({
          type: 'text', hud: true, align: 'left', ax: 0, ay: 0.5, x: 96, y: 66, size: 27, z: 50, in: 'fade',
          versions: CH.map((n, k) => `<span class="cap c-dim" style="font-size:0.78em">${String(k).padStart(2, '0')}</span>&ensp;<span class="c-dim">${n}</span>`),
          ver: i,
        }, extra),
      };
    },
    // ---- the gold patch chip, the film's carried object
    chip(id = 'chip', o = {}) {
      return {
        [id]: Object.assign({
          type: 'box', w: 330, h: 96, stroke: T.GOLD, fill: 'rgba(240,172,95,0.10)', sw: 3.5, rad: 18,
          html: '<span class="m" style="color:#F0AC5F">patch.diff</span>', size: 40, in: 'pop',
        }, o),
      };
    },
    // ---- a GitHub-style issue card
    issue(id, o = {}) {
      const title = o.title || 'summarize([]) raises ZeroDivisionError';
      const body = o.body || 'Expected 0 for an empty list.';
      return {
        [id]: Object.assign({
          type: 'box', w: 1180, h: 470, stroke: '#3A4654', fill: 'rgba(21,26,33,0.96)', sw: 2.5, rad: 22, size: 46, align: 'left',
          html: `<div style="padding:0 64px; text-align:left">
            <div style="display:flex; align-items:center; gap:18px; margin-bottom:26px">
              <span style="display:inline-block;width:26px;height:26px;border-radius:50%;border:4px solid #83C167"></span>
              <span class="cap" style="font-size:24px;color:#9AA3AD">Issue · open</span>
              <span class="cap" style="font-size:24px;color:#9AA3AD;margin-left:auto">illustrative example</span></div>
            <div style="font-size:1.12em; line-height:1.25"><span class="m" style="color:#ECE9E2">${esc(title)}</span></div>
            <div style="margin-top:26px; font-size:0.86em; color:#9AA3AD">${esc(body)}</div></div>`,
        }, o),
      };
    },
    // ---- a code panel: frame + numbered lines. lines: [[text, cls]]; versions via o.variants
    code(id, lines, o = {}) {
      const size = o.size || 34, lh = 1.5;
      const render = (ls) => ls.map((l, i) => {
        const [txt, cls] = Array.isArray(l) ? l : [l, ''];
        return `<div class="${cls || ''}" style="padding:0 28px; border-radius:6px"><span style="color:#5B6672; display:inline-block; width:2.2em">${(o.start || 1) + i}</span>${esc(txt)}</div>`;
      }).join('');
      const versions = [render(lines)].concat((o.variants || []).map(render));
      const w = o.w || 1180, h = o.h || Math.round(lines.length * size * lh + 90);
      return {
        [id + '_frame']: Object.assign({ type: 'box', w, h, stroke: '#3A4654', fill: 'rgba(21,26,33,0.96)', sw: 2.5, rad: 18, html: '', x: o.x ?? 960, y: o.y ?? 540, in: o.in || 'scale' }, o.frame || {}),
        [id]: Object.assign({
          type: 'mono', size, lh, align: 'left', versions, x: o.x ?? 960, y: o.y ?? 540, z: 3, in: o.textIn || 'wipe',
        }, o.text || {}),
        ...(o.title ? { [id + '_title']: { type: 'text', html: `<span class="m c-dim">${esc(o.title)}</span>`, size: 26, x: (o.x ?? 960) - w / 2 + 28, ax: 0, y: (o.y ?? 540) - h / 2 - 30, align: 'left', in: 'fade' } } : {}),
      };
    },
    // ---- a labelled container/box
    box(id, html, o = {}) {
      return { [id]: Object.assign({ type: 'box', w: 520, h: 160, stroke: T.BLUE, fill: 'rgba(88,196,221,0.07)', sw: 3, rad: 18, html, size: 40, in: 'draw' }, o) };
    },
    // ---- big full-frame type (one or two lines)
    big(id, html, o = {}) {
      return { [id]: Object.assign({ type: 'text', html, size: 118, lh: 1.08, maxw: 1700, in: 'wipe' }, o) };
    },
    // ---- a normal line of text
    line(id, html, o = {}) {
      return { [id]: Object.assign({ type: 'text', html, size: 48, maxw: 1500, in: 'wipe' }, o) };
    },
    // ---- small caps label
    label(id, html, o = {}) {
      return { [id]: Object.assign({ type: 'text', html: `<span class="cap" style="font-size:1em">${html}</span>`, size: 26, color: T.DIM, in: 'fade' }, o) };
    },
    // ---- arrow between two points
    arrow(id, x1, y1, x2, y2, o = {}) {
      return { [id]: Object.assign({ type: 'arrow', x1, y1, x2, y2, color: T.DIM, sw: 4, head: 20, in: 'draw' }, o) };
    },
    // ---- canvas drawing
    canvas(id, draw, params, o = {}) {
      return { [id]: Object.assign({ type: 'canvas', draw, params, w: 1920, h: 1080, in: 'fade' }, o) };
    },
    // ---- mono file card (yaml etc.)
    file(id, name, lines, o = {}) {
      const size = o.size || 32;
      const body = lines.map((l) => `<div>${l}</div>`).join('');
      const versions = [body].concat((o.variants || []).map((v) => v.map((l) => `<div>${l}</div>`).join('')));
      const w = o.w || 1000, h = o.h || Math.round(lines.length * size * 1.5 + 130);
      return {
        [id + '_frame']: Object.assign({ type: 'box', w, h, stroke: '#3A4654', fill: 'rgba(21,26,33,0.96)', sw: 2.5, rad: 18, html: '', x: o.x ?? 960, y: o.y ?? 540, in: 'scale' }, o.frame || {}),
        [id + '_name']: { type: 'text', html: `<span class="m" style="color:#F0AC5F">${name}</span>`, size: 30, x: (o.x ?? 960) - w / 2 + 40, ax: 0, align: 'left', y: (o.y ?? 540) - h / 2 + 46, in: 'fade', z: 3 },
        [id]: Object.assign({ type: 'mono', size, lh: 1.5, align: 'left', versions, x: (o.x ?? 960) - w / 2 + 40, ax: 0, y: (o.y ?? 540) + 30, z: 3, in: 'wipe' }, o.text || {}),
      };
    },
    // ---- the container silhouette: rounded case + header strip (A blue, B green), same in 2D and 3D
    container(id, which, o = {}) {
      const col = which === 'B' ? T.GREEN : T.BLUE;
      const w = o.w || 640, h = o.h || 560, x = o.x ?? 960, y = o.y ?? 540;
      const head = o.head || (which === 'B' ? 'container B · fresh and clean' : 'container A · offline sandbox');
      return {
        [id]: Object.assign({ type: 'box', w, h, x, y, stroke: col, fill: which === 'B' ? 'rgba(131,193,103,0.05)' : 'rgba(88,196,221,0.05)', sw: 3.5, rad: 26, html: '', in: 'draw' }, o.box || {}),
        [id + '_hd']: Object.assign({ type: 'rect', x, y: y - h / 2 + 30, w: w - 7, h: 56, fill: which === 'B' ? 'rgba(131,193,103,0.16)' : 'rgba(88,196,221,0.16)', rad: 22, in: 'fade', at: 0.4 }, o.hdr || {}),
        [id + '_ht']: Object.assign({ type: 'text', html: `<span class="cap" style="font-size:1em; letter-spacing:0.12em">${head}</span>`, size: Math.max(24, Math.min(28, Math.round((w - 60) / (head.length * 0.82)))), color: col, x, y: y - h / 2 + 30, in: 'fade', at: 0.5 }, o.text || {}),
      };
    },
    // ---- the bundle TREE (mono lines; lit = per-line colour index)
    TREE_LINES: ['agent.yaml', 'prompts/*.md', 'configs/sampling.yaml', 'sub_agents/*.yaml', 'skills/&lt;name&gt;/SKILL.md', 'adapters/&lt;name&gt;/', 'eval_config.yaml'],
    tree(id, o = {}) {
      const size = o.size || 38;
      const lines = (o.lines || K.TREE_LINES);
      const html = '<div style="text-align:left">' + lines.map((l, i) => `<div style="padding-left:${i === 0 ? 0 : 1.2}em"><span class="c-dim">${i === 0 ? '' : '├─ '}</span>${l}</div>`).join('') + '</div>';
      return { [id]: Object.assign({ type: 'mono', html: '<div class="c-dim" style="margin-bottom:0.3em">submission/</div>' + html, size, lh: 1.55, align: 'left', ax: 0, x: o.x ?? 200, y: o.y ?? 540, in: 'wipe' }, o.el || {}) };
    },
    // merge helper
    m(...parts) { return Object.assign({}, ...parts); },
  };
  window.K = K;
})();
