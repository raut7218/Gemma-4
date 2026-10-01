(function () {
  const c = F.comp.bind(F);
  F.chapter('rig test');
  const B = { yaw: -0.5, pitch: 40, dist: 13, ty: 0.5, key: 1, cards: 0, seams: 0, dock: 0, glow: 0, pass: -1, film: 0, films: 0 };
  const R = (p) => ({ params: Object.assign({}, B, p) });
  c(2, { rig: Object.assign({ type: 'three', scene: 'rig', x: 960, y: 540 }, R({})) });
  c(2, { rig: R({ cards: 1 }) });
  c(2, { rig: R({ cards: 1, seams: 1 }) });
  c(2, { rig: R({ cards: 1, seams: 1, dock: 0.4 }) });
  c(2, { rig: R({ cards: 1, seams: 1, dock: 0.7 }) });
  c(2, { rig: R({ cards: 1, seams: 1, dock: 1 }) });
  c(2, { rig: R({ cards: 1, seams: 1, dock: 1, pass: 0.5 }) });
  c(2, { rig: R({ cards: 1, pitch: 50, film: 1 }) });
  c(2, { rig: R({ cards: 1, pitch: 50, film: 1, films: 8 }) });
})();
