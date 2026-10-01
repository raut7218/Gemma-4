import * as THREE from 'three';
import { RoundedBoxGeometry } from '../vendor/RoundedBoxGeometry.js';

// Chapter 4 rig: the weight slab (W), four L4 cards on a plinth, LoRA factors B and A
// and their product film. Every motion is a function of params; labels are HTML,
// positioned from the anchors this module publishes each frame.
const T = window.TOK;
const col = (h) => new THREE.Color(h);

window.THREE_SCENES.rig = {
  init(canvas, spec) {
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: true });
    r.setSize(spec.w, spec.h, false);
    r.setClearColor(0x000000, 0);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(28, spec.w / spec.h, 0.1, 200);

    // product lighting: soft key from the left, cool rim from behind, low fill
    const key = new THREE.DirectionalLight(0xffffff, 2.3); key.position.set(-7, 9, 6);
    key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 6;
    Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xa9dcff, 2.6); rim.position.set(5, 6, -9); scene.add(rim);
    scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x0b0e12, 0.55));

    // plinth: a premium architectural-model base with a darker chamfered skirt
    const plinth = new THREE.Mesh(new RoundedBoxGeometry(11, 0.36, 5.6, 4, 0.08), new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 0.82, metalness: 0.05 }));
    plinth.position.y = -0.18; plinth.receiveShadow = true; scene.add(plinth);
    const skirt = new THREE.Mesh(new RoundedBoxGeometry(11.3, 0.12, 5.9, 3, 0.05), new THREE.MeshStandardMaterial({ color: 0x1a1f25, roughness: 0.9 }));
    skirt.position.y = -0.41; scene.add(skirt);

    // W: four column blocks that sit flush as one slab
    const blue = new THREE.MeshStandardMaterial({ color: col(T.BLUE), roughness: 0.48, metalness: 0.0, emissive: col(T.BLUE), emissiveIntensity: 0.12 });
    const cols = [];
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(new RoundedBoxGeometry(0.8, 0.5, 2.2, 3, 0.035), blue);
      m.castShadow = true; m.receiveShadow = true; scene.add(m); cols.push(m);
    }
    // four L4 cards: graphite bodies with a silver bracket and a slim blue status edge
    const cardMat = new THREE.MeshStandardMaterial({ color: 0x343b44, roughness: 0.55, metalness: 0.35 });
    const bracketMat = new THREE.MeshStandardMaterial({ color: 0xb9c2cc, roughness: 0.3, metalness: 0.85 });
    const edgeMat = new THREE.MeshStandardMaterial({ color: col(T.BLUE), emissive: col(T.BLUE), emissiveIntensity: 0.6, roughness: 0.4 });
    const cards = [];
    for (let i = 0; i < 4; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new RoundedBoxGeometry(0.34, 1.5, 2.3, 3, 0.04), cardMat);
      body.position.y = 0.75; body.castShadow = true; body.receiveShadow = true; g.add(body);
      const br = new THREE.Mesh(new THREE.BoxGeometry(0.38, 1.56, 0.06), bracketMat);
      br.position.set(0, 0.78, 1.17); g.add(br);
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.05, 2.0), edgeMat.clone());
      edge.position.y = 1.52; g.add(edge);
      g.userData.edge = edge;
      scene.add(g); cards.push(g);
    }
    // LoRA factors and their product
    const purple = new THREE.MeshStandardMaterial({ color: col(T.PURPLE), roughness: 0.4, emissive: col(T.PURPLE), emissiveIntensity: 0.18, transparent: true });
    const B = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.06, 2.2, 2, 0.02), purple.clone()); B.castShadow = true; scene.add(B);
    const A = new THREE.Mesh(new RoundedBoxGeometry(3.2, 0.06, 0.14, 2, 0.02), purple.clone()); A.castShadow = true; scene.add(A);
    const films = [];
    for (let i = 0; i < 3; i++) {
      const f = new THREE.Mesh(new RoundedBoxGeometry(3.2, 0.035, 2.2, 2, 0.012), purple.clone());
      f.material.opacity = 0.9; scene.add(f); films.push(f);
    }
    // input bar for the forward pass
    const inMat = new THREE.MeshStandardMaterial({ color: col(T.YELLOW), emissive: col(T.YELLOW), emissiveIntensity: 0.5, roughness: 0.4, transparent: true });
    const inBar = new THREE.Mesh(new RoundedBoxGeometry(3.0, 0.08, 0.16, 2, 0.03), inMat); scene.add(inBar);

    this.s = { r, scene, cam, cols, cards, B, A, films, inBar, spec };
    return Promise.resolve();
  },

  render(p, rec) {
    const { r, scene, cam, cols, cards, B, A, films, inBar, spec } = this.s;
    const lerp = (a, b, t) => a + (b - a) * t;
    const cl = (v) => Math.max(0, Math.min(1, v));
    // ---- slab / columns
    const lift = p.lift || 0, split = cl(p.split || 0), desc = cl(p.descend || 0);
    const cardX = (i) => (i - 1.5) * 1.15;
    cols.forEach((m, i) => {
      const x0 = (i - 1.5) * 0.8, x1 = (i - 1.5) * (0.8 + 0.5 * split);
      const xs = lerp(x0, x1, split), xd = cardX(i);
      const ys = 0.25 + lift, yd = 0.25 + 1.6;
      const zs = 0.6 * (p.slabZ ?? 1), zd = 0;
      m.position.set(lerp(xs, xd, desc), lerp(ys, yd + (1 - desc) * 0, desc) - desc * desc * 0.9, lerp(zs, zd, desc));
      const sc = lerp(1, 0.35, desc * desc);
      m.scale.set(lerp(1, 0.4, desc), sc, lerp(1, 0.95, desc));
      m.visible = (p.slabO ?? 1) > 0.01 && desc < 0.995;
    });
    // ---- cards rise from the plinth behind the slab
    const ci = cl(p.cards || 0);
    cards.forEach((g, i) => {
      const k = cl(ci * 4 - i * 0.6);
      g.position.set(cardX(i), lerp(-1.6, 0, k), -1.0 + (p.cardsZ ?? 0));
      g.visible = k > 0.01;
      g.userData.edge.material.emissiveIntensity = 0.3 + 1.6 * cl(desc - 0.6) * 2.5 + (p.glow || 0);
    });
    // ---- forward pass: a bar sweeps down through the four cards
    const ip = p.pass ?? -1;
    inBar.visible = ip >= 0 && ip <= 1;
    inBar.position.set(0, lerp(2.6, -0.2, cl(ip)), -1.0);
    inBar.scale.x = 1.55;
    inBar.material.opacity = Math.sin(Math.PI * cl(ip));
    // ---- LoRA: B (tall-thin along depth) left of the slab, A (short-wide) behind it
    const lr = cl(p.lora || 0), mg = cl(p.merge || 0);
    B.visible = A.visible = lr > 0.01 && mg < 0.999;
    B.position.set(lerp(-2.4, -1.3, mg), lerp(-0.2, 0.62 + lift, lr) + 0.25 * mg, lerp(0.6, 0.6, mg));
    A.position.set(0, lerp(-0.2, 0.62 + lift, lr) + 0.25 * mg, lerp(-0.9, 0.2, mg));
    B.material.opacity = A.material.opacity = 1 - mg;
    const nf = p.films || 0;
    films.forEach((f, i) => {
      const k = cl((i === 0 ? mg : nf - i));
      f.visible = k > 0.01;
      f.position.set(0, 0.52 + lift + 0.04 * i + (1 - k) * 0.4, 0.6);
      f.scale.set(lerp(0.2, 1, k), 1, lerp(0.2, 1, k));
      f.material.opacity = 0.88 * k;
    });
    // ---- camera: yaw, pitch (35–55°), distance; target slightly above the plinth
    const yaw = p.yaw ?? 0.5, el = ((p.pitch ?? 40) * Math.PI) / 180, d = p.dist ?? 13;
    const tx = p.tx ?? 0, ty = p.ty ?? 0.7, tz = p.tz ?? 0;
    cam.position.set(tx + Math.sin(yaw) * Math.cos(el) * d, ty + Math.sin(el) * d, tz + Math.cos(yaw) * Math.cos(el) * d);
    cam.lookAt(tx, ty, tz);
    r.render(scene, cam);
    // ---- anchors for HTML labels (stage pixels inside this canvas)
    const P = (x, y, z) => { const v = new THREE.Vector3(x, y, z).project(cam); return [(v.x + 1) / 2 * spec.w, (1 - v.y) / 2 * spec.h]; };
    const AN = window.ANCHORS = window.ANCHORS || {};
    AN.slabTop = P(0, 0.55 + lift, 0.6);
    AN.slabFront = P(0, 0.2 + lift, 1.75);
    AN.cardsTop = P(0, 1.75, -1.0);
    for (let i = 0; i < 4; i++) AN['card' + i] = P(cardX(i), 1.75, -1.0);
    AN.B = P(-2.4 + 1.1 * mg, 0.7 + lift, 0.6);
    AN.A = P(0, 0.7 + lift, -0.9);
    AN.film = P(0, 0.62 + lift, 0.6);
  },
};
