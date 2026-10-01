import * as THREE from 'three';
// Test 3D module: a rounded slab on a plinth, product-shot lighting, html label anchors.
window.THREE_SCENES.testcube = {
  init(canvas, spec) {
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: true });
    r.setSize(spec.w, spec.h, false);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NoToneMapping;
    const scene = new THREE.Scene();
    r.setClearColor(0x000000, 0);
    const cam = new THREE.PerspectiveCamera(30, spec.w / spec.h, 0.1, 100);
    const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-4, 5, 3); scene.add(key);
    const rim = new THREE.DirectionalLight(0x9fd8ff, 2.5); rim.position.set(2, 3, -5); scene.add(rim);
    scene.add(new THREE.HemisphereLight(0xbfd6ff, 0x101418, 0.5));
    const slab = new THREE.Mesh(new THREE.BoxGeometry(2, 0.4, 1.2), new THREE.MeshStandardMaterial({ color: 0x58C4DD, roughness: 0.42, metalness: 0.1 }));
    slab.position.y = 0.2 + 0.06; scene.add(slab);
    const base = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 2.2), new THREE.MeshStandardMaterial({ color: 0x232a33, roughness: 0.8 }));
    base.position.y = 0.0; scene.add(base);
    this.s = { r, scene, cam, slab, spec };
    return Promise.resolve();
  },
  render(p, rec) {
    const { r, scene, cam, slab, spec } = this.s;
    const ang = p.yaw, el = (p.pitch * Math.PI) / 180, d = p.dist;
    cam.position.set(Math.sin(ang) * Math.cos(el) * d, Math.sin(el) * d, Math.cos(ang) * Math.cos(el) * d);
    cam.lookAt(0, 0.25, 0);
    slab.position.y = 0.26 + p.lift;
    r.render(scene, cam);
    // expose anchor screen positions for html labels
    const v = new THREE.Vector3(0, 0.46 + p.lift, 0).project(cam);
    window.ANCHORS = window.ANCHORS || {};
    window.ANCHORS.slabTop = [(v.x + 1) / 2 * spec.w, (1 - v.y) / 2 * spec.h];
  },
};
