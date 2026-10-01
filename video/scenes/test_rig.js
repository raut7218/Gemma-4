// Component test page for the chapter-4 rig: one comp per state.
(function () {
  const c = F.comp.bind(F);
  F.chapter('rig test');
  const R = (p) => ({ type: 'three', scene: 'rig', x: 960, y: 560, w: 1920, h: 1080, params: Object.assign({ yaw: 0.55, pitch: 40, dist: 13, ty: 0.6, lift: 0, split: 0, descend: 0, cards: 0, lora: 0, merge: 0, films: 0, pass: -1, glow: 0 }, p) });
  c(4, { rig: R({}) });
  c(4, { rig: { params: Object.assign({}, FILM.EL.rig ? {} : {}, { yaw: 0.45, pitch: 40, dist: 14, ty: 0.7, lift: 0, split: 0, descend: 0, cards: 1, lora: 0, merge: 0, films: 0, pass: -1, glow: 0 }) } });
  c(4, { rig: { params: { yaw: 0.45, pitch: 42, dist: 14, ty: 0.9, lift: 0.4, split: 1, descend: 0, cards: 1, lora: 0, merge: 0, films: 0, pass: -1, glow: 0 } } });
  c(4, { rig: { params: { yaw: 0.45, pitch: 42, dist: 14, ty: 0.9, lift: 0.4, split: 1, descend: 1, cards: 1, lora: 0, merge: 0, films: 0, pass: -1, glow: 0 } } });
  c(4, { rig: { params: { yaw: 0.45, pitch: 42, dist: 14, ty: 0.9, lift: 0.4, split: 1, descend: 1, cards: 1, lora: 0, merge: 0, films: 0, pass: 1, glow: 0 } } });
  c(4, { rig: { params: { yaw: 0.6, pitch: 46, dist: 12, ty: 0.5, lift: 0, split: 0, descend: 0, cards: 1, lora: 1, merge: 0, films: 0, pass: -1, glow: 0 } } });
  c(4, { rig: { params: { yaw: 0.6, pitch: 46, dist: 12, ty: 0.5, lift: 0, split: 0, descend: 0, cards: 1, lora: 1, merge: 1, films: 3, pass: -1, glow: 0 } } });
})();
