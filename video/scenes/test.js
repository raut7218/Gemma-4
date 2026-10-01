// 5-second engine test: every element type, a carried object, a 3D shot with an html label.
const { T } = F;
F.chapter('test');
F.comp(2, {
  title: { type: 'text', html: 'The <span class="c-blue">Gemma 4</span> Developer Agent', size: 92, y: 420 },
  box: { type: 'box', w: 520, h: 120, x: 960, y: 640, stroke: T.YELLOW, html: '<span class="m">git diff</span>', size: 44 },
}, { cut: true });
F.comp(2, {
  title: { y: 160, s: 0.62 },
  box: { x: 520, y: 560, stroke: T.GREEN },
  arr: { type: 'arrow', x1: 800, y1: 560, x2: 1120, y2: 560, color: T.DIM, flow: 0 },
  n: { type: 'num', val: 120, x: 1400, y: 560, size: 120, in: 'count', color: T.YELLOW },
});
F.comp(3, {
  title: { y: 120, s: 0.5 },
  cube: { type: 'three', scene: 'testcube', x: 960, y: 600, w: 1920, h: 960, in: 'behind', params: { yaw: 0.6, pitch: 38, dist: 7, lift: 0 }, paramsFrom: { yaw: 0.2 } },
  lab: { type: 'text', html: '<span class="plate">one slab</span>', size: 40, x: 960, y: 300, in: 'rise' },
}, { cut: true });
F.hook(() => { const a = window.ANCHORS && window.ANCHORS.slabTop; const L = FILM.EL.lab; if (a && L) { L.proxy.x = a[0]; L.proxy.y = a[1] + 60 - 80; } });
