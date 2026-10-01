import * as THREE from 'three';
import { RoundedBoxGeometry } from '../vendor/RoundedBoxGeometry.js';

// Chapter 4 rig: an architectural model on a plinth. W is a blue weight slab at the front;
// four NVIDIA L4 cards stand behind it (each card = an upright board + a guide rail that
// forms its bay). Tensor parallelism divides the slab IN PLACE into four flush row blocks,
// which then slide along the plinth (first sideways, then straight back) into the four
// bays. LoRA products are thin purple films lying flat on the slab top, stacking on one
// another. Nothing intersects; every part rests on the plinth or on another part.
// Every motion is a function of params; labels are HTML positioned from window.ANCHORS.
//
// params: yaw, pitch (35–55), dist, tx, ty, tz, key 0..1 (key light sweep, always from the
// left), cards 0..1 (cards rise), seams 0..1 (slab divides into four row blocks), dock 0..1
// (blocks travel into the bays), glow 0..1 (card edges), pass -1|0..1 (blue input bar
// sweeping down through the cards), film 0..1 (first LoRA film), films 0..8 (films stacked
// in total, counting the first), dimW 0..1 (slab dims a step)
const T = window.TOK;
const col = (h) => new THREE.Color(h);

// geometry constants (model units)
const SLAB = { w: 3.4, h: 0.45, d: 2.0, z: 1.4 };
const CARD = { zc: -1.35, d: 2.3, h: 1.3, board: 0.2, pitch: 1.5 };
const cardX = (i) => (i - 1.5) * CARD.pitch;               // bay centre
const boardX = (i) => cardX(i) + 0.55;                      // upright board centre
const blockX0 = (i) => -SLAB.w / 2 + SLAB.w / 8 + i * (SLAB.w / 4);
const FILM_T = 0.03, FILM_GAP = 0.034;

window.THREE_SCENES.rig = {
  init(canvas, spec) {
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: true });
    r.setSize(spec.w, spec.h, false);
    r.setClearColor(0x000000, 0);            // transparent: the film background shows through
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(28, spec.w / spec.h, 0.1, 200);

    // lighting: soft key from the left side, cool rim from behind, low hemisphere fill
    const key = new THREE.DirectionalLight(0xfff6ea, 2.4);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 5; key.shadow.bias = -0.0004;
    Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 40 });
    scene.add(key); scene.add(key.target);
    const rim = new THREE.DirectionalLight(0xa9dcff, 2.4); rim.position.set(3, 5, -10); scene.add(rim);
    scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x0b0e12, 0.6));

    // plinth: matte architectural-model base on a darker chamfered skirt
    const plinthMat = new THREE.MeshStandardMaterial({ color: 0x3a4048, roughness: 0.86, metalness: 0.02 });
    const plinth = new THREE.Mesh(new RoundedBoxGeometry(8.2, 0.36, 6.0, 4, 0.08), plinthMat);
    plinth.position.y = -0.18; plinth.receiveShadow = true; scene.add(plinth);
    const skirt = new THREE.Mesh(new RoundedBoxGeometry(8.5, 0.14, 6.3, 3, 0.05), new THREE.MeshStandardMaterial({ color: 0x1c2128, roughness: 0.9 }));
    skirt.position.y = -0.43; scene.add(skirt);

    // W: one whole slab (shown before the division) and four flush row blocks
    const blueMat = (k) => new THREE.MeshStandardMaterial({ color: col(T.BLUE).multiplyScalar(k), roughness: 0.5, metalness: 0.0, emissive: col(T.BLUE), emissiveIntensity: 0.12 });
    const whole = new THREE.Mesh(new RoundedBoxGeometry(SLAB.w, SLAB.h, SLAB.d, 4, 0.04), blueMat(1));
    whole.position.set(0, SLAB.h / 2, SLAB.z); whole.castShadow = true; whole.receiveShadow = true; scene.add(whole);
    const blocks = [];
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(new RoundedBoxGeometry(SLAB.w / 4 - 0.004, SLAB.h, SLAB.d, 3, 0.03), blueMat(1));
      m.castShadow = true; m.receiveShadow = true; scene.add(m); blocks.push(m);
    }
    // seam lines: thin dark strips lying on the slab top at the three block boundaries
    const seamMat = new THREE.MeshStandardMaterial({ color: 0x0f3440, roughness: 0.6, transparent: true });
    const seams = [];
    for (let i = 1; i < 4; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.006, SLAB.d - 0.06), seamMat);
      s.position.set(-SLAB.w / 2 + i * SLAB.w / 4, SLAB.h + 0.003, SLAB.z); scene.add(s); seams.push(s);
    }

    // four L4 cards: matte graphite board, brushed bracket at the back end, a guide rail
    // that closes the bay, and a slim blue status edge along the board's top
    const boardMat = new THREE.MeshStandardMaterial({ color: 0x6e7782, roughness: 0.66, metalness: 0.15 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0x6b737d, roughness: 0.6, metalness: 0.2 });
    const bracketMat = new THREE.MeshStandardMaterial({ color: 0xb9c2cc, roughness: 0.32, metalness: 0.8 });
    const cards = [];
    for (let i = 0; i < 4; i++) {
      const g = new THREE.Group();
      const board = new THREE.Mesh(new RoundedBoxGeometry(CARD.board, CARD.h, CARD.d, 3, 0.04), boardMat);
      board.position.set(boardX(i) - cardX(i), CARD.h / 2, 0); board.castShadow = true; board.receiveShadow = true; g.add(board);
      const br = new THREE.Mesh(new RoundedBoxGeometry(0.24, CARD.h + 0.06, 0.06, 2, 0.015), bracketMat);
      br.position.set(boardX(i) - cardX(i), (CARD.h + 0.06) / 2, -CARD.d / 2 - 0.03); br.castShadow = true; g.add(br);
      const rail = new THREE.Mesh(new RoundedBoxGeometry(0.07, 0.09, CARD.d, 2, 0.02), railMat);
      rail.position.set(-0.52, 0.045, 0); rail.castShadow = true; rail.receiveShadow = true; g.add(rail);
      const edgeMat = new THREE.MeshStandardMaterial({ color: col(T.BLUE), emissive: col(T.BLUE), emissiveIntensity: 0.4, roughness: 0.4 });
      const edge = new THREE.Mesh(new THREE.BoxGeometry(CARD.board * 0.7, 0.04, CARD.d - 0.2), edgeMat);
      edge.position.set(boardX(i) - cardX(i), CARD.h + 0.02, 0); g.add(edge);
      g.userData.edge = edge;
      g.position.set(cardX(i), 0, CARD.zc);
      scene.add(g); cards.push(g);
    }

    // LoRA product films: thin purple sheets lying flat on the slab top, stacking
    const films = [];
    for (let i = 0; i < 8; i++) {
      const tint = col(T.PURPLE).multiplyScalar(1 - 0.05 * (i % 3));
      const f = new THREE.Mesh(new RoundedBoxGeometry(SLAB.w - 0.06, FILM_T, SLAB.d - 0.06, 2, 0.012),
        new THREE.MeshStandardMaterial({ color: tint, roughness: 0.45, emissive: col(T.PURPLE), emissiveIntensity: 0.16, transparent: true }));
      f.castShadow = true; f.receiveShadow = true; scene.add(f); films.push(f);
    }

    // the input bar for the forward pass: blue (the model's activations)
    const inMat = new THREE.MeshStandardMaterial({ color: col(T.BLUE), emissive: col(T.BLUE), emissiveIntensity: 0.9, roughness: 0.4, transparent: true });
    const inBar = new THREE.Mesh(new RoundedBoxGeometry(6.0, 0.07, 0.16, 2, 0.03), inMat); scene.add(inBar);

    this.s = { r, scene, cam, key, whole, blocks, seams, seamMat, cards, films, inBar, spec };
    return Promise.resolve();
  },

  render(p, rec) {
    const { r, cam, key, whole, blocks, seams, seamMat, cards, films, inBar, spec } = this.s;
    const lerp = (a, b, t) => a + (b - a) * t;
    const cl = (v) => Math.max(0, Math.min(1, v));
    const sm = (v) => { const x = cl(v); return x * x * (3 - 2 * x); };

    // ---- key light: sweeps from left-back to left-front, always on the left side
    const kk = p.key ?? 1;
    key.position.set(-7, 9, lerp(-3, 6, kk));
    key.target.position.set(0, 0, 0);

    // ---- slab: whole until the division starts; then four flush row blocks
    const sp = cl(p.seams || 0), dk = cl(p.dock || 0);
    const divided = sp > 0.01 || dk > 0.001;
    whole.visible = !divided;
    const dim = 1 - 0.35 * cl(p.dimW || 0);
    whole.material.color.copy(col(T.BLUE)).multiplyScalar(dim);
    blocks.forEach((m, i) => {
      m.visible = divided;
      // phase 1 (0..0.4): spread sideways in front of the cards; phase 2 (0.4..1): slide straight back
      const a = sm(dk / 0.4), b = sm((dk - 0.4) / 0.6);
      const x = lerp(blockX0(i), cardX(i), a);
      const z = lerp(SLAB.z, CARD.zc, b);
      m.position.set(x, SLAB.h / 2, z);
      // the four blocks take alternating shades once divided, so each reads as its own part
      const shade = 1 - 0.13 * sp * (i % 2);
      m.material.color.copy(col(T.BLUE)).multiplyScalar(shade * dim);
    });
    seams.forEach((s, i) => {
      s.visible = divided && dk < 0.02 && sp > 0.01;
      s.scale.z = Math.max(0.001, sm(sp * 1.4 - i * 0.2));
      s.position.z = SLAB.z + (SLAB.d - 0.06) / 2 * (1 - s.scale.z);
    });
    seamMat.opacity = cl(sp * 2);

    // ---- cards grow up out of the plinth surface (scale from the base: nothing below the top)
    const ci = cl(p.cards || 0);
    const pass = p.pass ?? -1;
    const barY = lerp(CARD.h + 0.6, 0.12, cl(pass));
    cards.forEach((g, i) => {
      const k = sm(ci * 2.2 - i * 0.4);
      g.visible = k > 0.01;
      g.scale.set(1, Math.max(0.01, k), 1);
      const docked = cl((dk - 0.85) / 0.15);
      const near = pass >= 0 && pass <= 1 ? Math.exp(-Math.pow((barY - CARD.h * 0.6) / 0.6, 2)) : 0;
      g.userData.edge.material.emissiveIntensity = 0.35 + 1.4 * docked + 1.2 * (p.glow || 0) + 1.2 * near;
    });

    // ---- forward pass: a blue bar sweeps down through the four cards at once
    inBar.visible = pass >= 0 && pass <= 1;
    inBar.position.set(0, barY, CARD.zc);
    inBar.material.opacity = 0.95 * Math.sin(Math.PI * cl(pass));

    // ---- films: lying flat on the slab top, each one resting on the one below
    const nf = Math.max(p.films || 0, p.film || 0);
    films.forEach((f, i) => {
      const k = i === 0 ? cl(p.film || 0) : cl((p.films || 0) - i);
      f.visible = k > 0.01 && !divided;
      f.position.set(0, SLAB.h + FILM_T / 2 + 0.002 + i * FILM_GAP, SLAB.z);
      const g = 0.25 + 0.75 * sm(k);
      f.scale.set(g, 1, g);
      f.material.opacity = 0.92 * cl(k * 2);
    });

    // ---- camera: yaw, pitch (35–55°), distance; target near the model's centre
    const yaw = p.yaw ?? 0.5, el = ((Math.max(35, Math.min(55, p.pitch ?? 40))) * Math.PI) / 180, d = p.dist ?? 13;
    const tx = p.tx ?? 0, ty = p.ty ?? 0.5, tz = p.tz ?? 0;
    cam.position.set(tx + Math.sin(yaw) * Math.cos(el) * d, ty + Math.sin(el) * d, tz + Math.cos(yaw) * Math.cos(el) * d);
    cam.lookAt(tx, ty, tz);
    r.render(this.s.scene, cam);

    // ---- anchors for HTML labels (pixels inside this canvas)
    const P = (x, y, z) => { const v = new THREE.Vector3(x, y, z).project(cam); return [(v.x + 1) / 2 * spec.w, (1 - v.y) / 2 * spec.h]; };
    const AN = window.ANCHORS = window.ANCHORS || {};
    AN.slabTop = P(0, SLAB.h + 0.02, SLAB.z);
    AN.slabFront = P(0, 0.0, SLAB.z + SLAB.d / 2);
    AN.slabLeft = P(-SLAB.w / 2, SLAB.h, SLAB.z + SLAB.d / 2);
    AN.slabRight = P(SLAB.w / 2, SLAB.h, SLAB.z + SLAB.d / 2);
    AN.cardsTop = P(0, CARD.h + 0.1, CARD.zc);
    for (let i = 0; i < 4; i++) {
      AN['card' + i] = P(boardX(i), CARD.h * Math.max(0.01, sm(ci * 2.2 - i * 0.4)) + 0.05, CARD.zc - CARD.d / 2);
      AN['block' + i] = P(blocks[i].position.x, SLAB.h, blocks[i].position.z);
    }
    AN.cardsL = P(cardX(0) - 0.55, CARD.h + 0.1, CARD.zc - CARD.d / 2);
    AN.cardsR = P(boardX(3) + 0.1, CARD.h + 0.1, CARD.zc - CARD.d / 2);
    AN.film = P(0, SLAB.h + nf * FILM_GAP, SLAB.z);
  },
};
