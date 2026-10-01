(function () {
  const c = F.comp.bind(F); F.chapter('containers test');
  const P = (o) => Object.assign({ yaw: 0.45, pitch: 40, dist: 9.5, ty: 1.0, two: 0, aIn: 1, bIn: 0, plaqueGlow: 0, fileIn: 0, fileGold: 0, fileMove: 0, bars: 0, pass: 0, verdict: 0, chipIn: 0, chipArc: 0, chipGone: 0 }, o);
  c(4, { k: { type: 'three', scene: 'containers', x: 960, y: 560, w: 1920, h: 1080, params: P({}) } });
  c(4, { k: { params: P({ plaqueGlow: 1, fileIn: 1, fileGold: 1 }) } });
  c(4, { k: { params: P({ fileIn: 1, fileGold: 1, fileMove: 1, chipIn: 1 }) } });
  c(4, { k: { params: P({ two: 1, bIn: 1, chipIn: 1, chipArc: 1, dist: 15, ty: 0.8, yaw: 0.35, pitch: 38 }) } });
  c(4, { k: { params: P({ two: 1, bIn: 1, chipIn: 1, chipArc: 1, chipGone: 1, bars: 1, pass: 1, verdict: 1, dist: 15, ty: 0.8, yaw: 0.35, pitch: 38 }) } });
})();
