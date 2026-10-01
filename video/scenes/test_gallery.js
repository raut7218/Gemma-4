// Gallery of shared objects (component test).
(function () {
  const { T } = F; const c = F.comp.bind(F);
  F.chapter('gallery');
  c(4, {
    loop: { type: 'canvas', draw: 'loop', params: { cx: 520, cy: 520, r: 220, draw: 1, labels: 1, dot: 0.3, exit: 1, ring: 1, hi: 1, hiA: 1 } },
    tape: { type: 'canvas', draw: 'tape', params: { x: 980, y: 300, w: 800, h: 70, first: 1, n: 12, sliver: 1, ticks: 1, edgeGlow: 0.5 } },
    ...K.container('ca', 'A', { x: 1350, y: 700, w: 420, h: 360 }),
    ...K.chip('chip', { x: 1350, y: 720 }),
  });
  c(4, {
    loop: 'fade', tape: 'fade', ca: 'fade', ca_hd: 'fade', ca_ht: 'fade', chip: 'fade',
    clock: { type: 'canvas', draw: 'clock', params: { cx: 560, cy: 440, r: 300, draw: 1, slices: 1, pull: 1, unroll: 0.5, rx: 200, ry: 900, rw: 900 } },
    meters: { type: 'canvas', draw: 'meters', params: { x: 1150, y: 520, v0: 0.8, v1: 0.6, v2: 0.4, glow: 0.4 } },
    cal: { type: 'canvas', draw: 'calendar', spans: [[Date.UTC(2026,8,23), Date.UTC(2026,10,12), T.PURPLE, 0.3], [Date.UTC(2026,10,12), Date.UTC(2026,11,2), T.RED, 0.3]], params: { x: 1100, y: 800, w: 700, draw: 1, dot: 0.4, span0: 1, span1: 1 } },
  });
  c(4, {
    clock: 'fade', meters: 'fade', cal: 'fade',
    ruler: { type: 'canvas', draw: 'ruler', blocks: [[0, 0.6, T.BLUE, 'read'], [0.6, 1.4, T.TEAL, 'run'], [2, 0.8, T.GOLD, 'edit'], [2.8, 1.5, T.TEAL, 'run'], [4.3, 0.4, T.GREEN, 'submit']], params: { x: 260, y: 400, w: 1400, ticks: 1, show: 1, grey: 1 } },
    ...K.tree('tree', { x: 300, y: 780, size: 32 }),
    ...K.container('cb', 'B', { x: 1400, y: 780, w: 440, h: 360 }),
  });
})();
