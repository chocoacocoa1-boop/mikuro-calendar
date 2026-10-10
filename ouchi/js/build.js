import * as THREE from 'three';

const cache = new Map();

export function mat(color, o = {}) {
    const key = `${color}|${o.flat ? 1 : 0}|${o.emissive ?? 0}|${o.side ?? 0}`;
    let m = cache.get(key);
    if (!m) {
        m = new THREE.MeshLambertMaterial({
            color,
            flatShading: !!o.flat,
            emissive: o.emissive ?? 0x000000,
            side: o.side ?? THREE.FrontSide,
        });
        cache.set(key, m);
    }
    return m;
}

const asMat = (c, o) => (typeof c === 'object' ? c : mat(c, o));

export function mesh(geo, material, parent, x = 0, y = 0, z = 0, shadow = true) {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z);
    if (shadow) {
        m.castShadow = true;
        m.receiveShadow = true;
    }
    if (parent) parent.add(m);
    return m;
}

// 家具用：y は底面の高さ
export function box(parent, w, h, d, color, x, y, z, o) {
    return mesh(new THREE.BoxGeometry(w, h, d), asMat(color, o), parent, x, y + h / 2, z);
}

// キャラ・小物用：y は中心の高さ
export function cbox(parent, w, h, d, color, x, y, z, o) {
    return mesh(new THREE.BoxGeometry(w, h, d), asMat(color, o), parent, x, y, z);
}

export function cyl(parent, rt, rb, h, color, x, y, z, seg = 20, o) {
    return mesh(new THREE.CylinderGeometry(rt, rb, h, seg), asMat(color, o), parent, x, y + h / 2, z);
}

export function ball(parent, r, color, x, y, z, o) {
    return mesh(new THREE.SphereGeometry(r, 16, 12), asMat(color, o), parent, x, y, z);
}

// ローポリのもこもこ（木の葉っぱ、髪の毛など）
export function blob(parent, r, color, x, y, z) {
    return mesh(new THREE.IcosahedronGeometry(r, 1), mat(color, { flat: true }), parent, x, y, z);
}

export function heartGeo(size) {
    const s = new THREE.Shape();
    s.moveTo(0, -0.45);
    s.bezierCurveTo(-0.65, 0.05, -0.45, 0.52, 0, 0.2);
    s.bezierCurveTo(0.45, 0.52, 0.65, 0.05, 0, -0.45);
    const g = new THREE.ShapeGeometry(s, 10);
    g.scale(size, size, size);
    return g;
}

export function starGeo(r, depth) {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
        const a = Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 ? r * 0.45 : r;
        if (i) s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        else s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
    g.translate(0, 0, -depth / 2);
    return g;
}

// さくらんぼ（ふたつ並び＋軸）
export function cherryPair(parent, x, y, z, s = 1) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.scale.setScalar(s);
    parent.add(g);
    const red = mat(0xe8304f);
    const stem = mat(0x5f9a4a);
    ball(g, 0.04, red, -0.03, 0, 0);
    ball(g, 0.04, red, 0.03, -0.01, 0.01);
    const s1 = cbox(g, 0.008, 0.09, 0.008, stem, -0.015, 0.06, 0);
    s1.rotation.z = -0.35;
    const s2 = cbox(g, 0.008, 0.09, 0.008, stem, 0.015, 0.055, 0);
    s2.rotation.z = 0.35;
    return g;
}

export function disposeChildren(group) {
    while (group.children.length) {
        const c = group.children[0];
        group.remove(c);
        c.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    }
}

export function spot(ax, az, px, py, pz, yaw, pose) {
    return { approach: { x: ax, z: az }, pos: { x: px, y: py, z: pz }, yaw, pose };
}
