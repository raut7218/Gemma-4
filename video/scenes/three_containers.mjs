import * as THREE from 'three';
import { RoundedBoxGeometry } from '../vendor/RoundedBoxGeometry.js';

// Chapter 7: containers A and B as architectural models on one plinth. Same silhouette as the
// 2D container: a rounded translucent case with a header strip. Inside A: /workspace (a block),
// /tmp (a shallow tray), pytest.ini and conftest.py (two plaques). Everything is a function of
// params; labels are HTML positioned from the anchors published each frame.
const T = window.TOK;
const C = (h) => new THREE.Color(h);

function makeCase(colorHex) {
  const g = new THREE.Group();
  const glass = new THREE.MeshStandardMaterial({ color: C(colorHex), transparent: true, opacity: 0.13, roughness: 0.15, metalness: 0.0, depthWrite: false, side: THREE.DoubleSide });
  glass.userData.o = 0.13;
  const shell = new THREE.Mesh(new RoundedBoxGeometry(3.6, 2.2, 2.6, 4, 0.16), glass);
  shell.position.y = 1.1; g.add(shell);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(3.6, 2.2, 2.6)), new THREE.LineBasicMaterial({ color: C(colorHex), transparent: true, opacity: 0.85 }));
  edges.position.y = 1.1; g.add(edges);
  // header strip: an open rim band around the top edge (the interior stays visible)
  const hm = new THREE.MeshStandardMaterial({ color: C(colorHex), roughness: 0.32, metalness: 0.05, emissive: C(colorHex), emissiveIntensity: 0.25, transparent: true, opacity: 1 });
  const header = new THREE.Group();
  for (const [x, z, w, d] of [[0, 1.24, 3.62, 0.14], [0, -1.24, 3.62, 0.14], [1.74, 0, 0.14, 2.62], [-1.74, 0, 0.14, 2.62]]) {
    const m = new THREE.Mesh(new RoundedBoxGeometry(w, 0.24, d, 2, 0.04), hm); m.position.set(x, 2.2, z); m.castShadow = true; header.add(m);
  }
  // the front band is taller, like the 2D header strip
  const front = new THREE.Mesh(new RoundedBoxGeometry(3.62, 0.42, 0.16, 2, 0.05), hm); front.position.set(0, 2.06, 1.24); header.add(front);
  g.add(header);
  // the floor: the same slate for A and B (never near-black), a step lighter than the plinth's edge
  const fm = new THREE.MeshStandardMaterial({ color: 0x3a434e, roughness: 0.8, transparent: true, opacity: 1 });
  const floor = new THREE.Mesh(new RoundedBoxGeometry(3.5, 0.08, 2.5, 2, 0.03), fm);
  floor.position.y = 0.04; floor.receiveShadow = true; g.add(floor);
  g.userData = { glass, edges, header, hm, fm };
  return g;
}

window.THREE_SCENES.containers = {
  init(canvas, spec) {
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: true });
    r.setSize(spec.w, spec.h, false); r.setClearColor(0x000000, 0);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(28, spec.w / spec.h, 0.1, 200);
    const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-7, 9, 6); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 6; Object.assign(key.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 40 });
    scene.add(key);
    // cool rim light from behind (opposite the key), grazing the top edges and the plinth's back edge
    const rim = new THREE.DirectionalLight(0x9fd4ff, 3.6); rim.position.set(3, 4.5, -10); scene.add(rim);
    const rim2 = new THREE.DirectionalLight(0x9fd4ff, 1.4); rim2.position.set(9, 2.5, -6); scene.add(rim2);
    scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x0b0e12, 0.55));
    // the plinth: a lighter stone than the slate blocks, with a darker skirt and a cool lit back edge
    const plinth = new THREE.Mesh(new RoundedBoxGeometry(12, 0.36, 5.4, 4, 0.08), new THREE.MeshStandardMaterial({ color: 0x4a525c, roughness: 0.78 }));
    plinth.position.y = -0.18; plinth.receiveShadow = true; scene.add(plinth);
    const skirt = new THREE.Mesh(new RoundedBoxGeometry(12.3, 0.12, 5.7, 3, 0.05), new THREE.MeshStandardMaterial({ color: 0x262c33, roughness: 0.9 }));
    skirt.position.y = -0.41; scene.add(skirt);
    // the rim catching the plinth's back edge (a thin cool highlight, part of the plinth bevel)
    const backEdge = new THREE.Mesh(new RoundedBoxGeometry(11.84, 0.05, 0.06, 2, 0.02), new THREE.MeshStandardMaterial({ color: 0x9fd4ff, emissive: C('#9fd4ff'), emissiveIntensity: 0.55, roughness: 0.4 }));
    backEdge.position.set(0, -0.01, -2.66); scene.add(backEdge);

    const A = makeCase(T.BLUE); scene.add(A);
    const B = makeCase(T.GREEN); scene.add(B);
    // A's parts
    const ws = new THREE.Mesh(new RoundedBoxGeometry(1.7, 0.9, 1.5, 3, 0.05), new THREE.MeshStandardMaterial({ color: 0x5a7189, roughness: 0.55, metalness: 0.1, emissive: C(T.BLUE), emissiveIntensity: 0 }));
    ws.position.set(-0.55, 0.53, 0.1); ws.castShadow = true; ws.receiveShadow = true; A.add(ws);
    const tray = new THREE.Group();
    const trayBase = new THREE.Mesh(new RoundedBoxGeometry(1.1, 0.08, 0.9, 2, 0.03), new THREE.MeshStandardMaterial({ color: 0x6b7784, roughness: 0.65, emissive: C(T.DIM), emissiveIntensity: 0 }));
    tray.add(trayBase);
    const lip = new THREE.MeshStandardMaterial({ color: 0x7c8995, roughness: 0.6 });
    for (const [x, z, w, d] of [[0, 0.43, 1.1, 0.05], [0, -0.43, 1.1, 0.05], [0.53, 0, 0.05, 0.9], [-0.53, 0, 0.05, 0.9]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, d), lip); m.position.set(x, 0.07, z); tray.add(m);
    }
    tray.position.set(1.05, 0.12, 0.45); A.add(tray);
    const plaqueMat = new THREE.MeshStandardMaterial({ color: 0xc9d1da, roughness: 0.35, metalness: 0.6, emissive: C(T.RED), emissiveIntensity: 0 });
    const plaques = [];
    for (let i = 0; i < 2; i++) {
      const p = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.56, 0.06, 2, 0.02), plaqueMat.clone());
      p.position.set(0.82 + i * 0.5, 0.36, -0.75); p.castShadow = true; A.add(p); plaques.push(p);
    }
    // a file block that can turn gold and move into the tray
    const fileMat = new THREE.MeshStandardMaterial({ color: 0x8fa3b5, roughness: 0.5, emissive: C(T.GOLD), emissiveIntensity: 0 });
    const file = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.08, 0.44, 2, 0.02), fileMat); A.add(file);
    // B's parts: its own /workspace block, hidden test bars
    const wsB = ws.clone(); wsB.material = ws.material.clone(); B.add(wsB);
    // an edited test file on B's workspace: red when edited, flips back to the baseline (grey)
    const testFile = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.08, 0.5, 2, 0.02), new THREE.MeshStandardMaterial({ color: 0x8fa3b5, roughness: 0.5, emissive: C(T.RED), emissiveIntensity: 0 }));
    testFile.castShadow = true; B.add(testFile);
    const bars = [];
    for (let i = 0; i < 5; i++) {
      const b = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.09, 0.22, 2, 0.03), new THREE.MeshStandardMaterial({ color: 0x5b6672, roughness: 0.5, emissive: C(T.GREEN), emissiveIntensity: 0 }));
      b.position.set(1.0, 0.15 + i * 0.13, 0.2); B.add(b); bars.push(b);
    }
    // the gold chip that travels from A to B
    const chip = new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.12, 0.42, 3, 0.05), new THREE.MeshStandardMaterial({ color: C(T.GOLD).multiplyScalar(0.3), roughness: 0.65, emissive: C(T.GOLD), emissiveIntensity: 0.8 }));
    chip.castShadow = true; chip.material.transparent = true; chip.renderOrder = 10; scene.add(chip);
    this.s = { r, scene, cam, A, B, ws, tray, trayBase, plaques, file, wsB, testFile, bars, chip, spec };
    return Promise.resolve();
  },
  render(p, rec) {
    const s = this.s, cl = (v) => Math.max(0, Math.min(1, v)), lerp = (a, b, t) => a + (b - a) * t;
    // placement: A alone at centre, or A left and B right
    const two = cl(p.two || 0);
    s.A.position.set(lerp(0, -2.6, two), 0, 0);
    // B is lowered onto the plinth from above only once A has moved clear (never through A or the plinth)
    const bk = Math.min(cl(p.bIn || 0), cl((two - 0.55) / 0.45)), be = 1 - Math.pow(1 - bk, 3);
    s.B.position.set(2.6, (1 - be) * 1.4, 0);
    s.B.visible = bk > 0.01;
    const ud = s.B.userData;
    ud.glass.opacity = ud.glass.userData.o * bk; ud.edges.material.opacity = 0.85 * bk; ud.hm.opacity = bk; ud.fm.opacity = bk;
    ud.hm.transparent = ud.fm.transparent = bk < 0.999; ud.hm.depthWrite = ud.fm.depthWrite = bk > 0.5;
    s.wsB.material.transparent = bk < 0.999; s.wsB.material.opacity = bk; s.wsB.material.depthWrite = bk > 0.5;
    s.A.visible = true;
    s.A.position.y = 0;
    // plaque warning glow
    // parts light up (lit*): workspace blue, tray grey, plaques white; plaques glow red as a warning
    // lit 0..3 lights them in turn (or litWs / litTray / litPlq individually)
    const lit = p.lit || 0;
    s.ws.material.emissiveIntensity = 0.35 * cl(p.litWs ?? lit);
    s.trayBase.material.emissiveIntensity = 0.35 * cl(p.litTray ?? lit - 1);
    const pg = cl(p.plaqueGlow || 0), pl = cl(p.litPlq ?? lit - 2);
    s.plaques.forEach((m) => { m.material.emissive.set(C(pg > 0.01 ? T.RED : T.INK)); m.material.emissiveIntensity = pg > 0.01 ? 0.9 * pg : 0.3 * pl; });
    // B's test file: appears edited (red), flips back to the baseline
    const tf = cl(p.testIn || 0), fl = cl(p.testFlip || 0);
    s.testFile.visible = tf > 0.01;
    s.testFile.position.set(0.0, 0.98 + 0.04 + (1 - tf) * 0.5 + Math.sin(Math.PI * fl) * 0.35, 0.35);
    s.testFile.rotation.x = Math.PI * fl;
    s.testFile.material.emissiveIntensity = 0.7 * tf * (1 - fl);
    // file: appears in /workspace, turns gold, slides into the /tmp tray
    const f = cl(p.fileIn || 0), mv = cl(p.fileMove || 0);
    s.file.visible = f > 0.01;
    s.file.position.set(lerp(-0.55, 1.05, mv), lerp(1.02, 0.22, mv) + (1 - f) * 0.4, lerp(0.3, 0.45, mv));
    s.file.material.emissiveIntensity = 0.8 * cl(p.fileGold || 0) * (1 - mv);
    // B: test bars drop in and light
    s.bars.forEach((b, i) => {
      const k = cl((p.bars || 0) * 5 - i);
      b.visible = k > 0.01; b.position.y = 0.15 + i * 0.13 + (1 - k) * 1.2;
      b.material.emissiveIntensity = 0.8 * cl((p.pass || 0) * 5 - i);
    });
    // the verdict is B's own rim lighting up (header band emissive + brighter edges), not a separate shape
    const vd = cl(p.verdict || 0);
    ud.hm.emissiveIntensity = 0.25 + 0.35 * vd; ud.edges.material.opacity = Math.min(1, ud.edges.material.opacity + 0.15 * vd);
    // the chip: appears on A's workspace as the arc starts (the 2D chip lands there), arcs to B's workspace
    const arc = cl(p.chipArc || 0), ch = Math.max(cl(p.chipIn || 0), cl((arc - 0.085) / 0.12));
    s.chip.visible = arc > 0.085 && (p.chipGone || 0) < 0.99;
    const ax = s.A.position.x - 0.55, bx = s.B.position.x - 0.55;
    // rests on top of the workspace block (top at y 0.98), sinks into B's block when applied
    s.chip.position.set(lerp(ax, bx, arc), 1.04 + Math.sin(Math.PI * arc) * 1.8 - (p.chipGone || 0) * 0.12 + (1 - ch) * 0.3, lerp(-0.3, -0.35, arc));
    s.chip.scale.setScalar(0.6 + 0.4 * ch);
    // camera
    const yaw = p.yaw ?? 0.45, el = ((p.pitch ?? 40) * Math.PI) / 180, d = p.dist ?? 12;
    const tx = p.tx ?? 0, ty = p.ty ?? 1.0, tz = p.tz ?? 0;
    s.cam.position.set(tx + Math.sin(yaw) * Math.cos(el) * d, ty + Math.sin(el) * d, tz + Math.cos(yaw) * Math.cos(el) * d);
    s.cam.lookAt(tx, ty, tz);
    s.r.render(s.scene, s.cam);
    const P = (x, y, z) => { const v = new THREE.Vector3(x, y, z).project(s.cam); return [(v.x + 1) / 2 * s.spec.w, (1 - v.y) / 2 * s.spec.h]; };
    const AN = window.ANCHORS = window.ANCHORS || {};
    const a = s.A.position, b = s.B.position;
    AN.aTop = P(a.x, a.y + 2.5, a.z); AN.bTop = P(b.x, b.y + 2.5, b.z);
    AN.ws = P(a.x - 0.55, a.y + 1.05, a.z + 0.1); AN.tray = P(a.x + 1.05, a.y + 0.3, a.z + 0.45);
    AN.plaques = P(a.x + 1.07, a.y + 0.45, a.z - 0.75);
    // screen bounding boxes of the two rims (top edges), for the 2D outlines that take over
    const box = (o) => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const sx of [-1.81, 1.81]) for (const sz of [-1.31, 1.31]) { const q = P(o.x + sx, o.y + 2.32, o.z + sz); x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); } return [x0, y0, x1, y1]; };
    AN.aRim = box(a); AN.bRim = box(b);
    AN.aBase = P(a.x, a.y - 0.1, a.z + 1.4); AN.bBase = P(b.x, b.y - 0.1, b.z + 1.4);
    AN.bWs = P(b.x - 0.55, b.y + 1.05, b.z + 0.1); AN.bTest = P(b.x, b.y + 1.1, b.z + 0.35);
    AN.chip = P(s.chip.position.x, s.chip.position.y + 0.2, s.chip.position.z);
    AN.aRight = P(a.x + 1.9, a.y + 1.1, a.z); AN.bRight = P(b.x + 1.9, b.y + 1.1, b.z); AN.bBars = P(b.x + 1.0, b.y + 0.9, b.z + 0.2);
  },
};
