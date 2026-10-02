import * as THREE from 'three';
import { RoundedBoxGeometry } from '../vendor/RoundedBoxGeometry.js';

// Chapter 4 rig: an architectural model on a plinth. W is a blue weight slab at the front;
// four NVIDIA L4 cards stand behind it. Each card is a graphite shroud with an open front bay,
// a heatsink fin block on top, a brushed-metal bracket (faceplate + top tab) fixed flush to its
// back, a blue status lip at the front edge, and a dark slot inlay on the plinth it is seated in.
// Tensor parallelism divides the slab IN PLACE into four flush row blocks, which then slide
// along the plinth (first sideways, then straight back) INTO the four bays. LoRA products are
// thin purple films lying flat on the slab top, stacking on one another. Nothing intersects;
// every part rests on the plinth or on another part.
// Light: a soft spot key from the left side (sweeps back→front), a cool rim from behind
// (a real light plus a Fresnel rim term that brightens back/top edges), a low hemisphere fill.
// Every motion is a function of params; labels are HTML positioned from window.ANCHORS.
//
// params: yaw, pitch (35–55), dist, tx, ty, tz, key 0..1 (key light sweep, always from the
// left), cards 0..1 (cards rise), seams 0..1 (slab divides into four row blocks), dock 0..1
// (blocks travel into the bays), glow 0..1 (card edges), pass -1|0..1 (blue input bar
// sweeping down through the cards), film 0..1 (first LoRA film), films 0..8 (films stacked
// in total, counting the first), dimW 0..1 (slab dims a step). Unknown params are ignored
// (chapter 17 passes a few legacy ones).
const T = window.TOK;
const col = (h) => new THREE.Color(h);

// geometry constants (model units)
const SLAB = { w: 3.4, h: 0.45, d: 2.0, z: 1.25 };
const CARD = { zc: -1.2, pitch: 1.2, W: 1.05, H: 0.6, D: 2.12, wall: 0.08, finH: 0.2, plate: 0.05 };
const cardX = (i) => (i - 1.5) * CARD.pitch;               // bay centre
const blockX0 = (i) => -SLAB.w / 2 + SLAB.w / 8 + i * (SLAB.w / 4);
const BAY_FRONT = CARD.zc + CARD.D / 2;                     // open front of each bay
const DOCK_Z = BAY_FRONT - SLAB.d / 2 - 0.03;               // block centre when seated in its bay
const CARD_TOP = CARD.H + CARD.finH;
const FILM_T = 0.03, FILM_GAP = 0.034;
// plinth: ≈1.3 × the slab's footprint while the slab is alone; it extends back (and a little wider) to
// ≈1.12 × the whole model's footprint (x −2.36…2.36, z −2.31…2.25) just before the cards rise
const PL = { w: 5.3, d: 5.0, h: 0.3, zc: -0.03 };
const PL0 = { w: 3.4 * 1.3, d: 2.0 * 1.3, zc: 1.25 };
// rim: Fresnel exponent (higher = a thinner, brighter edge) and overall gain
const RIM_EXP = 4.0, RIM_GAIN = 3.2;
const SLAB_K = 0.8;                                        // slab albedo scale: lit top face ≈ #58C4DD
const RIM_DIR = new THREE.Vector3(0.25, 0.6, -0.76).normalize();

window.THREE_SCENES.rig = {
  init(canvas, spec) {
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: true });
    r.setSize(spec.w, spec.h, false);
    r.setClearColor(0x000000, 0);            // transparent: the film background shows through
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(28, spec.w / spec.h, 0.1, 200);

    // Fresnel rim: brightens surfaces that face the rim light AND turn away from the camera,
    // i.e. the back and top edges (bevels) of every part — the visible cool edge light.
    const RIM = { dir: { value: new THREE.Vector3() }, col: { value: new THREE.Color(0xa9dcff) } };
    const withRim = (m, k) => {
      m.onBeforeCompile = (sh) => {
        sh.uniforms.rimDir = RIM.dir; sh.uniforms.rimCol = RIM.col; sh.uniforms.rimK = { value: k * RIM_GAIN };
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform vec3 rimDir;\nuniform vec3 rimCol;\nuniform float rimK;')
          .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n{ float fr = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), ' + RIM_EXP.toFixed(1) + ');\n  totalEmissiveRadiance += rimCol * rimK * fr * smoothstep(0.0, 0.6, dot(normal, rimDir)); }');
      };
      m.customProgramCacheKey = () => 'rim' + k;
      return m;
    };
    const std = (o, k = 1) => withRim(new THREE.MeshStandardMaterial(o), k);

    // lighting: soft key (a wide spot with full penumbra) from the left side, cool rim from behind, low fill
    const key = new THREE.SpotLight(0xfff4e6, 3.1, 0, 0.55, 1, 0);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 6; key.shadow.bias = -0.0004;
    key.shadow.camera.near = 2; key.shadow.camera.far = 40;
    scene.add(key); scene.add(key.target);
    const rim = new THREE.DirectionalLight(0xa9dcff, 2.6); rim.position.copy(RIM_DIR).multiplyScalar(12); scene.add(rim);
    scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x0b0e12, 0.55));

    // plinth: matte architectural-model base in the panel tone, on a darker chamfered skirt
    const plinth = new THREE.Mesh(new RoundedBoxGeometry(PL.w, PL.h, PL.d, 5, 0.09), std({ color: 0x2a313b, roughness: 0.9, metalness: 0.0 }, 1.2));
    plinth.position.set(0, -PL.h / 2, PL.zc); plinth.receiveShadow = true; scene.add(plinth);
    const skirt = new THREE.Mesh(new RoundedBoxGeometry(PL.w + 0.16, 0.12, PL.d + 0.16, 3, 0.04), std({ color: 0x161b22, roughness: 0.92 }, 0.4));
    skirt.position.set(0, -PL.h - 0.06 + 0.0001, PL.zc); scene.add(skirt);

    // W: one whole slab (shown before the division) and four flush row blocks
    const blueMat = () => std({ color: col(T.BLUE), roughness: 0.72, metalness: 0.0, emissive: col(T.BLUE), emissiveIntensity: 0.06 }, 1.1);
    const whole = new THREE.Mesh(new RoundedBoxGeometry(SLAB.w, SLAB.h, SLAB.d, 5, 0.08), blueMat());
    whole.position.set(0, SLAB.h / 2, SLAB.z); whole.castShadow = true; whole.receiveShadow = true; scene.add(whole);
    const blocks = [];
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(new RoundedBoxGeometry(SLAB.w / 4 - 0.004, SLAB.h, SLAB.d, 3, 0.04), blueMat());
      m.castShadow = true; m.receiveShadow = true; scene.add(m); blocks.push(m);
    }
    // seam lines: thin dark strips lying on the slab top at the three block boundaries
    const seamMat = new THREE.MeshStandardMaterial({ color: 0x0f3440, roughness: 0.6, transparent: true });
    const seams = [];
    for (let i = 1; i < 4; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.006, SLAB.d - 0.08), seamMat);
      s.position.set(-SLAB.w / 2 + i * SLAB.w / 4, SLAB.h + 0.003, SLAB.z); scene.add(s); seams.push(s);
    }

    // four L4 cards (each a group whose origin is its bay centre on the plinth surface)
    const shroudMat = std({ color: 0x505964, roughness: 0.58, metalness: 0.18 }, 0.9);
    const finMat = std({ color: 0x77818c, roughness: 0.5, metalness: 0.25 }, 0.3);
    const bracketMat = std({ color: 0x98a1ab, roughness: 0.38, metalness: 0.4 }, 0.6);
    const slotMat = new THREE.MeshStandardMaterial({ color: 0x0d1116, roughness: 0.8 });
    const cards = [];
    const { W, H, D, wall, finH, plate } = CARD;
    for (let i = 0; i < 4; i++) {
      const g = new THREE.Group();
      const add = (geo, mat, x, y, z, shadow = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; g.add(m); return m; };
      // slot inlay: flush with the plinth top, a hair wider than the shroud that sits in it
      add(new THREE.BoxGeometry(W + 0.1, 0.004, D + 0.12), slotMat, 0, 0.002, -plate / 2, false);
      // shroud: two side walls, a top plate and a back wall around an open-front bay
      add(new RoundedBoxGeometry(wall, H, D, 2, 0.02), shroudMat, -W / 2 + wall / 2, H / 2, 0);
      add(new RoundedBoxGeometry(wall, H, D, 2, 0.02), shroudMat, W / 2 - wall / 2, H / 2, 0);
      add(new RoundedBoxGeometry(W, wall, D, 2, 0.02), shroudMat, 0, H - wall / 2, 0);
      add(new RoundedBoxGeometry(W - 2 * wall, H - wall, wall, 2, 0.015), shroudMat, 0, (H - wall) / 2, -D / 2 + wall / 2);
      // heatsink: a fin block standing on the top plate (a base sheet and seven fins on it)
      add(new RoundedBoxGeometry(W - 0.12, 0.03, D - 0.34, 2, 0.01), finMat, 0, H + 0.015, -0.08);
      for (let f = 0; f < 7; f++) add(new RoundedBoxGeometry(0.035, finH - 0.03, D - 0.4, 2, 0.012), finMat, -(W - 0.24) / 2 + f * (W - 0.24) / 6, H + 0.03 + (finH - 0.03) / 2, -0.08);
      // bracket: faceplate fixed flush to the back of the shroud, with a tab bent over the top
      add(new RoundedBoxGeometry(W + 0.08, CARD_TOP, plate, 2, 0.015), bracketMat, 0, CARD_TOP / 2, -D / 2 - plate / 2);
      add(new RoundedBoxGeometry(W + 0.08, 0.035, 0.2, 2, 0.012), bracketMat, 0, CARD_TOP + 0.0175, -D / 2 - plate + 0.1);
      // blue status lip along the front edge of the top plate
      const edgeMat = new THREE.MeshStandardMaterial({ color: col(T.BLUE), emissive: col(T.BLUE), emissiveIntensity: 0.4, roughness: 0.4 });
      const edge = add(new RoundedBoxGeometry(W - 0.06, 0.03, 0.06, 2, 0.01), edgeMat, 0, H + 0.015, D / 2 - 0.04, false);
      g.userData.edge = edge;
      g.position.set(cardX(i), 0, CARD.zc);
      scene.add(g); cards.push(g);
    }

    // LoRA product films: thin purple sheets lying flat on the slab top, stacking
    const films = [];
    for (let i = 0; i < 8; i++) {
      const tint = col(T.PURPLE).multiplyScalar(1 - 0.05 * (i % 3));
      const f = new THREE.Mesh(new RoundedBoxGeometry(SLAB.w - 0.08, FILM_T, SLAB.d - 0.08, 2, 0.012),
        new THREE.MeshStandardMaterial({ color: tint, roughness: 0.55, emissive: col(T.PURPLE), emissiveIntensity: 0.14, transparent: true }));
      f.castShadow = true; f.receiveShadow = true; scene.add(f); films.push(f);
    }

    // the input bar for the forward pass: blue (the model's activations)
    const inMat = new THREE.MeshStandardMaterial({ color: col(T.BLUE), emissive: col(T.BLUE), emissiveIntensity: 0.9, roughness: 0.4, transparent: true });
    const inBar = new THREE.Mesh(new RoundedBoxGeometry(5.4, 0.07, 0.16, 2, 0.03), inMat); scene.add(inBar);

    this.s = { r, scene, cam, key, RIM, whole, blocks, seams, seamMat, cards, films, inBar, spec, plinth, skirt };
    return Promise.resolve();
  },

  render(p, rec) {
    const { r, cam, key, RIM, whole, blocks, seams, seamMat, cards, films, inBar, spec, plinth, skirt } = this.s;
    const lerp = (a, b, t) => a + (b - a) * t;
    const cl = (v) => Math.max(0, Math.min(1, v));
    const sm = (v) => { const x = cl(v); return x * x * (3 - 2 * x); };

    // ---- key light: sweeps from left-back to left-front, always on the left side
    const kk = p.key ?? 1;
    key.position.set(-8, 10, lerp(-3, 6, kk));
    key.target.position.set(0.6, 0, 0);

    // ---- slab: whole until the division starts; then four flush row blocks
    const sp = cl(p.seams || 0), dk = cl(p.dock || 0);
    const divided = sp > 0.01 || dk > 0.001;
    whole.visible = !divided;
    const dim = 1 - 0.35 * cl(p.dimW || 0);
    whole.material.color.copy(col(T.BLUE)).multiplyScalar(SLAB_K * dim);
    blocks.forEach((m, i) => {
      m.visible = divided;
      // phase 1 (0..0.4): spread sideways in front of the cards; phase 2 (0.4..1): slide straight back into the bay
      const a = sm(dk / 0.4), b = sm((dk - 0.4) / 0.6);
      m.position.set(lerp(blockX0(i), cardX(i), a), SLAB.h / 2, lerp(SLAB.z, DOCK_Z, b));
      // the four blocks take alternating shades once divided, so each reads as its own part
      const shade = 1 - 0.13 * sp * (i % 2);
      m.material.color.copy(col(T.BLUE)).multiplyScalar(SLAB_K * shade * dim);
    });
    seams.forEach((s, i) => {
      s.visible = divided && dk < 0.02 && sp > 0.01;
      s.scale.z = Math.max(0.001, sm(sp * 1.4 - i * 0.2));
      s.position.z = SLAB.z + (SLAB.d - 0.08) / 2 * (1 - s.scale.z);
    });
    seamMat.opacity = cl(sp * 2);

    // ---- the plinth extends back under the bays first (cards 0..0.3), then the cards grow up
    // out of their slots (scale from the base: nothing below the plinth top)
    const cards0 = cl(p.cards || 0), pg = sm(cards0 / 0.3), ci = cl((cards0 - 0.3) / 0.7);
    const plW = lerp(PL0.w, PL.w, pg), plD = lerp(PL0.d, PL.d, pg), plZ = lerp(PL0.zc, PL.zc, pg);
    plinth.scale.set(plW / PL.w, 1, plD / PL.d); plinth.position.z = plZ;
    skirt.scale.set((plW + 0.16) / (PL.w + 0.16), 1, (plD + 0.16) / (PL.d + 0.16)); skirt.position.z = plZ;
    const pass = p.pass ?? -1;
    const barY = lerp(CARD_TOP + 0.6, 0.1, cl(pass));
    const ck = (i) => sm(ci * 2.2 - i * 0.4);
    cards.forEach((g, i) => {
      const k = ck(i);
      g.visible = k > 0.01;
      g.scale.set(1, Math.max(0.01, k), 1);
      const docked = cl((dk - 0.85) / 0.15);
      const near = pass >= 0 && pass <= 1 ? Math.exp(-Math.pow((barY - CARD.H * 0.6) / 0.6, 2)) : 0;
      g.userData.edge.material.emissiveIntensity = 0.35 + 1.4 * docked + 1.2 * (p.glow || 0) + 1.2 * near;
    });

    // ---- forward pass: a blue bar sweeps down through the four cards at once
    inBar.visible = pass >= 0 && pass <= 1;
    inBar.position.set(0, barY, CARD.zc + CARD.D / 2 + 0.12);
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
    cam.updateMatrixWorld();
    RIM.dir.value.copy(RIM_DIR).transformDirection(cam.matrixWorldInverse);
    r.render(this.s.scene, cam);

    // ---- anchors for HTML labels (pixels inside this canvas)
    const P = (x, y, z) => { const v = new THREE.Vector3(x, y, z).project(cam); return [(v.x + 1) / 2 * spec.w, (1 - v.y) / 2 * spec.h]; };
    const AN = window.ANCHORS = window.ANCHORS || {};
    AN.slabTop = P(0, SLAB.h + 0.02, SLAB.z);
    AN.slabFront = P(0, 0.0, SLAB.z + SLAB.d / 2);
    AN.slabLeft = P(-SLAB.w / 2, SLAB.h, SLAB.z + SLAB.d / 2);
    AN.slabRight = P(SLAB.w / 2, SLAB.h, SLAB.z + SLAB.d / 2);
    // the slab's top face, corners clockwise from back-left (for 2D morphs onto it)
    AN.slabTopQ = [P(-SLAB.w / 2, SLAB.h, SLAB.z - SLAB.d / 2), P(SLAB.w / 2, SLAB.h, SLAB.z - SLAB.d / 2), P(SLAB.w / 2, SLAB.h, SLAB.z + SLAB.d / 2), P(-SLAB.w / 2, SLAB.h, SLAB.z + SLAB.d / 2)];
    AN.cardsTop = P(0, CARD_TOP + 0.1, CARD.zc);
    for (let i = 0; i < 4; i++) {
      AN['card' + i] = P(cardX(i), CARD_TOP * Math.max(0.01, ck(i)) + 0.05, CARD.zc - CARD.D / 2);
      AN['block' + i] = P(blocks[i].position.x, SLAB.h, blocks[i].position.z);
    }
    AN.cardsMid = P((cardX(1) + cardX(2)) / 2, CARD_TOP * Math.max(0.01, sm(ci * 2.2 - 0.6)) + 0.05, CARD.zc - CARD.D / 2);
    AN.cardsL = P(cardX(0) - CARD.W / 2, CARD_TOP + 0.1, CARD.zc - CARD.D / 2);
    AN.cardsR = P(cardX(3) + CARD.W / 2, CARD_TOP + 0.1, CARD.zc - CARD.D / 2);
    AN.film = P(0, SLAB.h + nf * FILM_GAP, SLAB.z);
  },
};
