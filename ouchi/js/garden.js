import * as THREE from 'three';
import { mat, mesh, box, cyl, ball, blob, cherryPair, spot } from './build.js';
import * as T from './textures.js';
import { rand } from './util.js';

export const FLOWER_COLORS = [0xff8cc6, 0xb9a2f0, 0xffffff, 0xffd56b, 0xff6b8f];

function buildFlower(parent, x, y, z) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    const sprout = ball(g, 0.05, 0x8fd17a, 0, 0.02, 0);
    sprout.scale.y = 0.7;
    const stem = cyl(g, 0.015, 0.018, 0.34, 0x6fb86f, 0, 0, 0);
    const leafGeo = new THREE.SphereGeometry(0.07, 8, 6);
    const l1 = mesh(leafGeo, mat(0x7cc47c), g, 0.06, 0.12, 0);
    l1.scale.set(1, 0.35, 0.6);
    l1.rotation.z = 0.4;
    const l2 = mesh(leafGeo, mat(0x7cc47c), g, -0.06, 0.18, 0);
    l2.scale.set(1, 0.35, 0.6);
    l2.rotation.z = -0.4;
    const bud = ball(g, 0.05, 0x9fd88c, 0, 0.36, 0);
    const bloom = new THREE.Group();
    bloom.position.y = 0.37;
    g.add(bloom);
    const petalMat = new THREE.MeshLambertMaterial({ color: 0xff8cc6 });
    const petalGeo = new THREE.SphereGeometry(0.055, 10, 8);
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const p = mesh(petalGeo, petalMat, bloom, Math.cos(a) * 0.07, 0, Math.sin(a) * 0.07);
        p.scale.set(1, 0.45, 1);
    }
    ball(bloom, 0.042, 0xffd56b, 0, 0.015, 0);
    bloom.rotation.x = 0.35;
    return {
        setStage(stage, colorIdx) {
            sprout.visible = stage === 0;
            stem.visible = l1.visible = l2.visible = stage >= 1;
            stem.scale.y = stage === 1 ? 0.5 : 1;
            stem.position.y = stage === 1 ? 0.085 : 0.17;
            l2.visible = stage >= 2;
            bud.visible = stage === 2;
            bloom.visible = stage >= 3;
            petalMat.color.setHex(FLOWER_COLORS[colorIdx % FLOWER_COLORS.length]);
        },
    };
}

function tree(root, x, z, kind, s = 1) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(s);
    root.add(g);
    cyl(g, 0.16, 0.24, 1.3, 0xa8775a, 0, 0, 0);
    const c = kind === 'pink' ? [0xffc4de, 0xffb0d4, 0xffd3e7] : [0x9fd39a, 0x8cc98b, 0xa9dba1];
    blob(g, 1.0, c[0], 0, 1.95, 0);
    blob(g, 0.72, c[1], 0.62, 1.65, 0.2);
    blob(g, 0.7, c[2], -0.55, 1.7, -0.1);
    blob(g, 0.62, c[1], 0.05, 2.55, -0.05);
}

export function buildGarden(W) {
    const { scene, nav } = W;
    const root = new THREE.Group();
    scene.add(root);

    function furn(id, x, z) {
        const g = new THREE.Group();
        g.position.set(x, 0, z);
        g.userData.pick = id;
        root.add(g);
        W.pickables.push(g);
        return g;
    }

    // ── 柵と門 ──
    const FENCE = [
        [-6.6, 8.8, 7.5, 8.8],
        [8.9, 8.8, 10.8, 8.8],
        [10.8, -4.6, 10.8, 8.8],
        [-6.6, 4.3, -6.6, 8.8],
        [6.15, -4.6, 10.8, -4.6],
    ];
    const pickets = [];
    const railMat = mat(0xfffaf7);
    FENCE.forEach(([x0, z0, x1, z1]) => {
        const alongX = z0 === z1;
        const len = Math.hypot(x1 - x0, z1 - z0);
        const n = Math.max(1, Math.round(len / 0.32));
        for (let i = 0; i <= n; i++) {
            const t = i / n;
            pickets.push([x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, alongX]);
        }
        [0.2, 0.46].forEach((y) => box(root, alongX ? len : 0.05, 0.06, alongX ? 0.05 : len, railMat, (x0 + x1) / 2, y, (z0 + z1) / 2));
        nav.block(x0, z0, x1, z1, 0.3);
    });
    const pim = new THREE.InstancedMesh(new THREE.BoxGeometry(0.09, 0.66, 0.06), railMat, pickets.length);
    const m4 = new THREE.Matrix4();
    pickets.forEach(([x, z, alongX], i) => {
        m4.makeRotationY(alongX ? 0 : Math.PI / 2);
        m4.setPosition(x, 0.33, z);
        pim.setMatrixAt(i, m4);
    });
    pim.castShadow = pim.receiveShadow = true;
    root.add(pim);

    const gate = furn('gate', 8.2, 8.8);
    const gateMat = mat(0xff9ccc);
    box(gate, 0.14, 1.55, 0.14, gateMat, -0.72, 0, 0);
    box(gate, 0.14, 1.55, 0.14, gateMat, 0.72, 0, 0);
    mesh(new THREE.TorusGeometry(0.72, 0.06, 8, 28, Math.PI), gateMat, gate, 0, 1.55, 0);
    for (let i = 1; i < 8; i++) {
        const a = (i / 8) * Math.PI;
        ball(gate, 0.065, [0xffffff, 0xffd56b, 0xff6bae][i % 3], Math.cos(a) * 0.72, 1.55 + Math.sin(a) * 0.72, 0.05);
    }
    W.gate = { inside: { x: 8.2, z: 7.4 }, outside: { x: 8.2, z: 12.6 } };

    const sign = furn('sign', 6.9, 8.4);
    box(sign, 0.07, 0.8, 0.07, 0xd9b9a0, 0, 0, 0);
    const sm = mat(0xfff6ec);
    const signFace = new THREE.MeshLambertMaterial({ map: T.signTexture('こみくろん', 'のおうち') });
    mesh(new THREE.BoxGeometry(0.92, 0.4, 0.05), [sm, sm, sm, sm, signFace, sm], sign, 0, 0.95, 0.04);
    nav.blockCircle(6.9, 8.4, 0.1, 0.25);

    const mailbox = furn('gate', 9.55, 8.4);
    box(mailbox, 0.07, 0.75, 0.07, 0xd9b9a0, 0, 0, 0);
    box(mailbox, 0.32, 0.26, 0.42, 0xff8cc6, 0, 0.75, 0);
    box(mailbox, 0.02, 0.18, 0.04, 0xffd56b, 0.17, 0.92, -0.1);
    nav.blockCircle(9.55, 8.4, 0.15, 0.25);

    // 飛び石
    const stoneMat = mat(0xeee3d3);
    [[4.55, 4.8], [4.95, 5.45], [5.5, 6.1], [6.1, 6.75], [6.8, 7.35], [7.55, 7.9], [8.2, 8.5], [8.2, 9.3], [8.25, 10.1], [8.15, 10.9], [8.2, 11.7]]
        .forEach(([x, z]) => {
            const s = mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.05, 10), stoneMat, root, x + rand(-0.05, 0.05), 0.025, z, false);
            s.receiveShadow = true;
            s.scale.set(rand(0.85, 1.1), 1, rand(0.75, 0.95));
            s.rotation.y = rand(0, Math.PI);
        });

    // ── 花壇 ──
    const fb = furn('flowerbed', -3.0, 5.9);
    box(fb, 3.6, 0.28, 0.8, 0xd99a6c, 0, 0, 0);
    box(fb, 3.44, 0.03, 0.64, 0x8b5e45, 0, 0.27, 0);
    nav.block(-4.8, 5.5, -1.2, 6.3);
    W.flowers = [-1.4, -0.7, 0, 0.7, 1.4].map((x) => buildFlower(fb, x, 0.3, 0));
    W.setFlowers = (arr) => arr.forEach((f, i) => W.flowers[i].setStage(Math.min(3, f.g), f.c));
    W.flowerPos = new THREE.Vector3(-3.0, 0.6, 5.9);

    // じょうろ（使わないときは花壇の横）
    const can = new THREE.Group();
    cyl(can, 0.09, 0.1, 0.16, 0x8fdfbb, 0, -0.08, 0);
    const spout = cyl(can, 0.015, 0.02, 0.2, 0x8fdfbb, 0, -0.02, 0.12);
    spout.rotation.x = 1.0;
    const handle = mesh(new THREE.TorusGeometry(0.06, 0.015, 6, 12, Math.PI), mat(0x8fdfbb), can, 0, 0.08, 0);
    handle.rotation.y = Math.PI / 2;
    const canHome = () => {
        can.position.set(-0.85, 0.08, 5.95);
        can.rotation.set(0, -0.6, 0);
        root.add(can);
    };
    canHome();
    W.props.can = can;
    W.returnCan = canHome;

    // ── さくらんぼの木 ──
    const ct = furn('cherry', 8.6, -1.9);
    cyl(ct, 0.13, 0.2, 1.5, 0xa8775a, 0, 0, 0);
    [[0, 2.0, 0, 0.85, 0x7fc77f], [0.55, 1.75, 0.2, 0.62, 0x8fd08c], [-0.5, 1.8, 0.1, 0.6, 0x8fd08c], [0.1, 1.7, 0.5, 0.6, 0x86cc86], [0, 2.5, -0.1, 0.55, 0x8fd08c]]
        .forEach(([x, y, z, r, c]) => blob(ct, r, c, x, y, z));
    const cherries = new THREE.Group();
    ct.add(cherries);
    for (let i = 0; i < 11; i++) {
        const a = -1.4 + (i / 10) * 3.0 + rand(-0.12, 0.12);
        const e = rand(-0.65, 0.05);
        const d = new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e));
        cherryPair(cherries, d.x * 0.86, 1.95 + d.y * 0.86 - 0.05, d.z * 0.86 + 0.05, 1.5);
    }
    W.setCherries = (on) => { cherries.visible = on; };
    nav.blockCircle(8.6, -1.9, 0.2, 0.3);

    // ── 露天風呂 ──
    const onsen = furn('onsen', 8.35, 2.5);
    cyl(onsen, 1.02, 1.0, 0.12, 0x6d8aa0, 0, 0, 0, 40);
    const water = mesh(new THREE.CircleGeometry(1.0, 40),
        new THREE.MeshLambertMaterial({ color: 0x9ee6e3, emissive: 0x0d3a3a, transparent: true, opacity: 0.92 }), onsen, 0, 0.13, 0, false);
    water.rotation.x = -Math.PI / 2;
    water.receiveShadow = true;
    for (let i = 0; i < 15; i++) {
        const a = (i / 15) * Math.PI * 2;
        const r = rand(0.2, 0.28);
        const s = mesh(new THREE.IcosahedronGeometry(r, 0), mat(i % 2 ? 0xbab4c8 : 0xa9a3b9, { flat: true }), onsen, Math.cos(a) * 1.12, r * 0.5, Math.sin(a) * 1.12);
        s.scale.y = 0.7;
        s.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
    }
    const steamTex = T.softDotTexture('rgba(255,255,255,0.9)', 'rgba(255,255,255,0)');
    const steam = [];
    for (let i = 0; i < 7; i++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, opacity: 0, depthWrite: false }));
        onsen.add(sp);
        steam.push({ sp, t: i / 7, x: rand(-0.6, 0.6), z: rand(-0.6, 0.6) });
    }
    cyl(root, 0.15, 0.13, 0.22, 0xd9a272, 7.05, 0, 3.4);
    cyl(root, 0.152, 0.152, 0.03, 0xb98252, 7.05, 0.12, 3.4);
    const osign = furn('onsen', 9.75, 3.75);
    box(osign, 0.06, 0.7, 0.06, 0xd9b9a0, 0, 0, 0);
    const om = mat(0x5b6fa8);
    const onsenFace = new THREE.MeshLambertMaterial({ map: T.onsenSignTexture() });
    mesh(new THREE.BoxGeometry(0.42, 0.42, 0.04), [om, om, om, om, onsenFace, om], osign, 0, 0.9, 0.04);
    W.textRedraw.push(() => {
        signFace.map.dispose();
        signFace.map = T.signTexture('こみくろん', 'のおうち');
        onsenFace.map.dispose();
        onsenFace.map = T.onsenSignTexture();
        signFace.needsUpdate = onsenFace.needsUpdate = true;
    });
    nav.blockCircle(8.35, 2.5, 1.15, 0.22);
    nav.blockCircle(9.75, 3.75, 0.08, 0.2);
    W.onsenUsers = 0;

    // ── ベンチ ──
    const bench = furn('bench', 1.4, 6.25);
    box(bench, 1.8, 0.07, 0.5, 0xf3d9bd, 0, 0.38, 0);
    box(bench, 1.8, 0.36, 0.06, 0xf3d9bd, 0, 0.52, -0.24);
    [-0.8, 0.8].forEach((x) => {
        box(bench, 0.08, 0.38, 0.45, 0xd9b9a0, x, 0, 0);
        box(bench, 0.08, 0.5, 0.06, 0xd9b9a0, x, 0.38, -0.24);
    });
    nav.block(0.5, 5.98, 2.3, 6.5);

    // ── 庭のランタン ──
    const lan = furn('lantern', 5.4, 7.2);
    cyl(lan, 0.12, 0.14, 0.06, 0x8a6a80, 0, 0, 0);
    cyl(lan, 0.04, 0.04, 1.3, 0x8a6a80, 0, 0.06, 0);
    const lanMat = new THREE.MeshLambertMaterial({ color: 0xfff1dc, emissive: 0x000000 });
    box(lan, 0.24, 0.28, 0.24, lanMat, 0, 1.3, 0);
    const cap = mesh(new THREE.ConeGeometry(0.22, 0.16, 4), mat(0x8a6a80), lan, 0, 1.66, 0);
    cap.rotation.y = Math.PI / 4;
    const lanLight = new THREE.PointLight(0xffd6a0, 0, 8, 1.6);
    lanLight.position.set(5.4, 1.45, 7.2);
    root.add(lanLight);
    W.lamps.push({ light: lanLight, shade: lanMat, max: 4, outdoor: true, level: 0 });
    nav.blockCircle(5.4, 7.2, 0.12, 0.25);

    // ── 柵の外の木々 ──
    [[-8.6, 6.8, 'pink', 1.1], [12.9, 7.0, 'green', 1.2], [12.6, -2.6, 'pink', 1.0], [-8.4, -2.2, 'green', 1.2],
        [2.2, -6.9, 'green', 1.3], [-4.6, -6.9, 'pink', 1.1], [9.4, -6.6, 'green', 1.0], [-9.0, 2.4, 'green', 1.0],
        [-3.0, 11.6, 'green', 1.1], [3.4, 11.9, 'pink', 1.0], [13.6, 2.4, 'green', 0.9], [-7.6, 11.0, 'pink', 0.9]]
        .forEach(([x, z, k, s]) => tree(root, x, z, k, s));

    // 草と小さな花
    const tuftGeo = new THREE.ConeGeometry(0.06, 0.2, 4);
    const tufts = new THREE.InstancedMesh(tuftGeo, mat(0x93cc7e, { flat: true }), 110);
    const dotGeo = new THREE.SphereGeometry(0.045, 6, 4);
    const dots = new THREE.InstancedMesh(dotGeo, new THREE.MeshLambertMaterial(), 60);
    const col = new THREE.Color();
    const DOT_COLS = [0xffffff, 0xffd56b, 0xff9cc8, 0xcbb8f3];
    let nt = 0, nd = 0, guard = 0;
    while ((nt < 110 || nd < 60) && guard++ < 5000) {
        const x = rand(-12, 15), z = rand(-8, 14);
        if (x > -6.4 && x < 6.4 && z > -4.4 && z < 4.6) continue;
        if (!nav.freeAt(x, z)) continue;
        if (Math.abs(x - 8.2) < 0.7 && z > 8) continue;
        if (nt < 110) {
            m4.makeRotationY(rand(0, 3));
            m4.setPosition(x, 0.1, z);
            tufts.setMatrixAt(nt++, m4);
        } else {
            m4.makeTranslation(x, 0.05, z);
            dots.setMatrixAt(nd, m4);
            dots.setColorAt(nd++, col.setHex(DOT_COLS[nd % DOT_COLS.length]));
        }
    }
    tufts.count = nt;
    dots.count = nd;
    tufts.receiveShadow = true;
    root.add(tufts, dots);

    // ── 行き先 ──
    Object.assign(W.spots, {
        water: spot(-3.0, 6.95, -3.0, 0, 6.95, Math.PI, 'water'),
        cherry: spot(8.6, -0.7, 8.6, 0, -0.7, Math.PI, 'reach'),
        onsen: spot(8.35, 4.0, 8.35, -0.2, 2.65, 0, 'soak'),
        onsenV1: spot(7.6, 3.95, 7.75, -0.2, 2.25, 0.35, 'soak'),
        onsenV2: spot(9.1, 3.95, 8.95, -0.2, 2.25, -0.35, 'soak'),
        bench: [0.85, 1.4, 1.95].map((x) => spot(x, 7.05, x, 0.45, 6.3, 0, 'sit')),
    });
    W.strollPoints = [[2.8, 7.5], [-0.4, 7.7], [5.9, 5.3], [9.6, 6.6], [9.7, 0.2], [7.2, -3.4], [-5.4, 7.5], [-2.2, 7.6], [4.4, 8.1], [9.8, -3.6]];
    W.circle = { x: 3.4, z: 6.9, r: 1.3 };
    W.ballBounds = { x0: -6.2, x1: 10.5, z0: 4.55, z1: 8.5 };
    W.ballObstacles = [[-4.8, 5.5, -1.2, 6.3], [0.5, 5.98, 2.3, 6.5], [5.25, 7.05, 5.55, 7.35], [6.8, 8.3, 7.0, 8.5]];

    W.updaters.push((dt) => {
        const base = 0.16 + 0.32 * W.env.night + (W.onsenUsers > 0 ? 0.25 : 0);
        steam.forEach((s) => {
            s.t += dt * 0.12;
            if (s.t > 1) {
                s.t -= 1;
                s.x = rand(-0.6, 0.6);
                s.z = rand(-0.6, 0.6);
            }
            s.sp.position.set(s.x + Math.sin(s.t * 6) * 0.1, 0.2 + s.t * 1.4, s.z);
            s.sp.scale.setScalar(0.5 + s.t * 0.9);
            s.sp.material.opacity = Math.sin(s.t * Math.PI) * base;
        });
    });
}
