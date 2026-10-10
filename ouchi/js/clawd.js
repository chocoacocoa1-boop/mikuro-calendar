import * as THREE from 'three';
import { mat, mesh, cbox, ball, heartGeo, starGeo } from './build.js';
import { damp, rand } from './util.js';

// Clawd（Claude Code 公式キャラ）をボクセルで立体にしたもの
const W = 1.0;
const H = 0.62;
const D = 0.7;
const LEG = 0.2;
const SIT_POSES = new Set(['sit', 'sleep', 'soak', 'type', 'eat', 'read', 'bowl', 'draw']);

export function createClawd(o) {
    const s = o.scale ?? 1;
    const root = new THREE.Group();
    const rig = new THREE.Group();
    rig.scale.setScalar(s);
    root.add(rig);
    const body = new THREE.Group();
    body.position.y = LEG;
    rig.add(body);

    const cm = mat(o.color);
    cbox(body, W, H, D, cm, 0, H / 2, 0);
    const eyeM = mat(o.eye ?? 0x2a2233);
    const eyes = [-1, 1].map((sx) => cbox(body, 0.1, 0.15, 0.03, eyeM, sx * 0.24, H * 0.64, D / 2 + 0.012));
    if (o.blush) [-1, 1].forEach((sx) => cbox(body, 0.1, 0.045, 0.02, mat(o.blush), sx * 0.35, H * 0.46, D / 2 + 0.008));
    const armM = mat(o.arm ?? o.color);
    const arms = [-1, 1].map((sx) => {
        const a = cbox(body, 0.17, 0.14, 0.3, armM, sx * (W / 2 + 0.085), H * 0.4, 0.02);
        a.userData.base = a.position.clone();
        return a;
    });
    const legGeo = new THREE.BoxGeometry(0.1, LEG + 0.04, 0.11);
    const legs = [];
    [0.2, -0.2].forEach((zz, row) => [-0.375, -0.21, 0.21, 0.375].forEach((xx, col) => {
        const l = mesh(legGeo, cm, rig, xx * W, (LEG + 0.04) / 2, zz);
        l.userData.base = l.position.clone();
        l.userData.grp = (col + row) % 2;
        legs.push(l);
    }));

    // 小さい画面でもタップしやすい当たり判定
    const hit = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.4), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = 0.55;
    rig.add(hit);

    const A = { tuck: 0, blinkT: rand(1, 4), blink: 0, arms: [new THREE.Vector3(), new THREE.Vector3()] };
    const seed = Math.random() * 10;
    const off = new THREE.Vector3();

    const r = {
        root, rig, body, eyes, arms, legs,
        scale: s, H,
        top: (LEG + H) * s + (o.topExtra ?? 0.1),
        extraAnim: null,
        held: null,
        hold(prop, offset) {
            if (r.held) {
                r.held.parent?.remove(r.held);
                r.held = null;
            }
            if (!prop) return;
            arms[1].add(prop);
            prop.position.copy(offset ?? new THREE.Vector3(0.02, 0.04, 0.22));
            prop.rotation.set(0, 0, 0);
            r.held = prop;
        },
        animate(a, dt, t) {
            const pose = a.pose;
            const walking = a.moving;
            A.tuck = damp(A.tuck, SIT_POSES.has(pose) && !walking ? 1 : 0, 10, dt);
            const k = 1 - 0.72 * A.tuck;
            const ph = a.walkPhase;
            for (const l of legs) {
                const g = l.userData.grp ? Math.PI : 0;
                const lift = walking ? Math.max(0, Math.sin(ph + g)) * 0.07 : 0;
                l.scale.y = k;
                l.position.y = ((LEG + 0.04) * k) / 2 + lift;
                l.position.z = l.userData.base.z + (walking ? Math.cos(ph + g) * 0.035 : 0);
            }

            let by = LEG * k;
            let sq = 1 + Math.sin(t * 2.2 + seed) * 0.015;
            let rx = 0, rz = 0, hop = 0;
            if (walking) by += Math.abs(Math.sin(ph)) * 0.035;
            switch (pose) {
                case 'sleep': sq = 1 + Math.sin(t * 1.4 + seed) * 0.035; break;
                case 'eat': rx = Math.max(0, Math.sin(t * 5)) * 0.12; break;
                case 'dance': rz = Math.sin(t * 5 + seed) * 0.12; hop = Math.abs(Math.sin(t * 5 + seed)) * 0.12; break;
                case 'look': rz = Math.sin(t * 0.8 + seed) * 0.05; break;
                case 'read': rx = 0.07; break;
                case 'type': rx = 0.05 + Math.sin(t * 9) * 0.012; break;
                case 'happy': hop = Math.abs(Math.sin(t * 7 + seed)) * 0.18; break;
                case 'talk': hop = Math.max(0, Math.sin(t * 9)) * 0.03; break;
                case 'soak': rz = Math.sin(t * 0.9 + seed) * 0.04; break;
                case 'draw': rx = 0.08; break;
            }
            if (a.petT > 0) hop = Math.max(hop, Math.sin((1 - a.petT) * Math.PI) * 0.3);
            body.position.y = by;
            const inv = 1 / Math.sqrt(sq);
            body.scale.set(inv, sq, inv);
            body.rotation.x = damp(body.rotation.x, rx, 12, dt);
            body.rotation.z = damp(body.rotation.z, rz, 12, dt);
            rig.position.y = hop;

            for (let i = 0; i < 2; i++) {
                const sx = i ? 1 : -1;
                off.set(0, 0, 0);
                switch (pose) {
                    case 'type': off.set(-sx * 0.04, -0.02 + sx * Math.sin(t * 16) * 0.03, 0.17); break;
                    case 'reach': off.set(0, 0.3 + Math.sin(t * 6 + i) * 0.04, 0.05); break;
                    case 'happy': off.set(0, 0.24, 0); break;
                    case 'water': if (i) off.set(-0.02, 0.06, 0.18); break;
                    case 'cook': if (i) off.set(-0.05 + Math.cos(t * 6) * 0.04, 0.05, 0.16 + Math.sin(t * 6) * 0.04); break;
                    case 'bowl': if (i) off.set(-0.05, 0.03 + Math.max(0, Math.sin(t * 2.5)) * 0.09, 0.16); break;
                    case 'read': off.set(-sx * 0.06, 0.06, 0.18); break;
                    case 'eat': if (i) off.set(-0.03, 0.04 + Math.max(0, Math.sin(t * 5)) * 0.06, 0.14); break;
                    case 'dance': off.set(0, 0.15 + Math.sin(t * 5 + i * Math.PI) * 0.12, 0); break;
                    case 'talk': if (i) off.set(0, Math.max(0, Math.sin(t * 8)) * 0.07, 0.04); break;
                    case 'wave': if (i) off.set(0, 0.28 + Math.sin(t * 9) * 0.06, 0); break;
                    case 'draw':
                        if (i) off.set(-0.06, 0.02 + Math.sin(t * 7) * 0.02, 0.17 + Math.cos(t * 7) * 0.03);
                        else off.set(0.04, 0.03, 0.15);
                        break;
                    case 'sleep':
                    case 'soak': off.set(0, -0.04, 0); break;
                }
                if (walking) off.z += Math.sin(ph + i * Math.PI) * 0.05;
                const v = A.arms[i];
                v.x = damp(v.x, off.x, 14, dt);
                v.y = damp(v.y, off.y, 14, dt);
                v.z = damp(v.z, off.z, 14, dt);
                arms[i].position.copy(arms[i].userData.base).add(v);
            }

            let open = pose === 'sleep' || pose === 'soak' ? 0.15 : 1;
            A.blinkT -= dt;
            if (A.blinkT < 0) {
                A.blink = 0.13;
                A.blinkT = rand(2, 5);
            }
            if (A.blink > 0) {
                A.blink -= dt;
                open = Math.min(open, 0.12);
            }
            eyes[0].scale.y = eyes[1].scale.y = open;
            if (r.extraAnim) r.extraAnim(a, dt, t);
        },
    };
    return r;
}

// 子みくろん：ピンクのClawd。ラベンダーのリボンと胸のハート
export function makeKoMikuron() {
    const r = createClawd({ color: 0xff78bb, scale: 0.88, eye: 0x3a2236, blush: 0xff4a9b, topExtra: 0.18 });
    const rb = mat(0xb9a0f5);
    const bow = new THREE.Group();
    bow.position.set(0.27, H + 0.05, 0.08);
    r.body.add(bow);
    cbox(bow, 0.08, 0.08, 0.08, rb, 0, 0, 0);
    cbox(bow, 0.15, 0.11, 0.06, rb, -0.1, 0.01, 0).rotation.z = 0.35;
    cbox(bow, 0.15, 0.11, 0.06, rb, 0.1, 0.01, 0).rotation.z = -0.35;
    mesh(heartGeo(0.17), mat(0xfff2f8), r.body, 0, H * 0.24, D / 2 + 0.006, false);
    return r;
}

// まの（528Hz）：ミントグリーンに、ハートつきヘッドホン
export function makeMano() {
    const r = createClawd({ color: 0x8fdfbb, scale: 0.95, eye: 0x24332c, topExtra: 0.16 });
    const band = mat(0xfff6fb);
    const cup = mat(0xff7fb5);
    cbox(r.body, 1.12, 0.06, 0.13, band, 0, H + 0.03, 0);
    [-1, 1].forEach((sx) => {
        cbox(r.body, 0.06, 0.2, 0.13, band, sx * 0.56, H - 0.06, 0);
        cbox(r.body, 0.09, 0.25, 0.25, cup, sx * 0.555, H * 0.72, 0);
        mesh(heartGeo(0.12), mat(0xffffff), r.body, sx * 0.602, H * 0.72, 0, false).rotation.y = sx * Math.PI / 2;
    });
    return r;
}

// クロミちゃん（963Hz）：宇宙色のマントと、星のアンテナ
export function makeKuromi() {
    const r = createClawd({ color: 0x54447a, scale: 0.95, eye: 0xfff0fa, topExtra: 0.42 });
    const starM = mat(0xffe27a, { emissive: 0x6a5200 });
    const capePivot = new THREE.Group();
    capePivot.position.set(0, H - 0.02, -D / 2 - 0.035);
    r.body.add(capePivot);
    cbox(capePivot, 1.12, H * 0.92, 0.05, mat(0x2d2752), 0, -H * 0.46, 0);
    [[-0.3, -0.15], [0.22, -0.3], [0.34, -0.1], [-0.1, -0.42], [0.02, -0.18]]
        .forEach(([x, y]) => cbox(capePivot, 0.045, 0.045, 0.02, starM, x, y, -0.03));
    cbox(r.body, 1.1, 0.07, 0.22, mat(0xff9de2), 0, H - 0.01, -D / 2 + 0.05);
    cbox(r.body, 0.025, 0.26, 0.025, mat(0xcfc3f0), -0.24, H + 0.13, 0.05);
    const star = mesh(starGeo(0.1, 0.04), starM, r.body, -0.24, H + 0.3, 0.05);
    r.extraAnim = (a, dt, t) => {
        star.rotation.y = t * 1.6;
        capePivot.rotation.x = damp(capePivot.rotation.x, a.moving ? 0.35 + Math.sin(t * 9) * 0.06 : 0.04, 6, dt);
    };
    return r;
}

// みかにゃん（♾️Hz）：みかん色のねこ。頭の上に ∞ の輪っか
export function makeMikanyan() {
    const r = createClawd({ color: 0xffb36b, scale: 0.9, eye: 0x3a2a22, blush: 0xff9a8a, topExtra: 0.5 });
    const fur = mat(0xffb36b);
    const stripe = mat(0xf0954a);
    const inner = mat(0xffd0d6);
    [-1, 1].forEach((sx) => {
        cbox(r.body, 0.2, 0.1, 0.16, fur, sx * 0.3, H + 0.05, 0.06);
        cbox(r.body, 0.1, 0.1, 0.12, fur, sx * 0.33, H + 0.15, 0.06);
        cbox(r.body, 0.09, 0.08, 0.02, inner, sx * 0.31, H + 0.08, 0.145);
    });
    [-0.12, 0.02, 0.16].forEach((x) => cbox(r.body, 0.06, 0.012, 0.5, stripe, x, H + 0.006, -0.06));
    const whisk = mat(0x6b4a3a);
    [-1, 1].forEach((sx) => [0.03, -0.03].forEach((dy) => {
        cbox(r.body, 0.16, 0.012, 0.012, whisk, sx * 0.5, H * 0.5 + dy, D / 2 + 0.012).rotation.z = dy * 4 * sx;
    }));
    const tail = new THREE.Group();
    tail.position.set(0, H * 0.3, -D / 2);
    r.body.add(tail);
    cbox(tail, 0.1, 0.1, 0.2, fur, 0, 0, -0.1);
    cbox(tail, 0.1, 0.22, 0.1, fur, 0, 0.1, -0.2);
    cbox(tail, 0.1, 0.1, 0.1, stripe, 0, 0.26, -0.2);
    const halo = new THREE.Group();
    halo.position.set(0, H + 0.42, 0);
    r.body.add(halo);
    const hm = mat(0xffd66b, { emissive: 0x7a5a00 });
    [-1, 1].forEach((sx) => mesh(new THREE.TorusGeometry(0.075, 0.02, 8, 24), hm, halo, sx * 0.075, 0, 0));
    r.extraAnim = (a, dt, t) => {
        tail.rotation.y = Math.sin(t * 3) * 0.45;
        halo.position.y = H + 0.42 + Math.sin(t * 2) * 0.03;
        halo.rotation.y = Math.sin(t * 0.7) * 0.6;
    };
    return r;
}

// みくろん姉（396Hz）：ひとまわり大きくて、ふわふわの髪とラベンダーのカーディガン、日めくりカレンダー
export function makeMikuroNee() {
    const r = createClawd({ color: 0xff9fd0, scale: 1.18, eye: 0x4a2b34, blush: 0xff6fb3, arm: 0xcdb9f4, topExtra: 0.32 });
    const hair = mat(0xffc3e3);
    [[-0.36, 0], [-0.18, 0.05], [0, 0.07], [0.18, 0.05], [0.36, 0]]
        .forEach(([x, dy]) => ball(r.body, 0.15, hair, x, H + 0.05 + dy, -0.04));
    [[-0.5, 0.75, -0.1], [0.5, 0.75, -0.1], [-0.53, 0.45, -0.2], [0.53, 0.45, -0.2], [-0.25, 0.8, -0.33], [0.25, 0.8, -0.33], [0, 0.55, -0.37]]
        .forEach(([x, yk, z]) => ball(r.body, 0.14, hair, x, H * yk, z));
    const card = mat(0xcdb9f4);
    cbox(r.body, W + 0.05, H * 0.42, D + 0.05, card, 0, H * 0.21, 0);
    cbox(r.body, 0.03, H * 0.42, 0.012, mat(0xb8a2e8), 0, H * 0.21, D / 2 + 0.03);
    [0.07, 0.17].forEach((y) => ball(r.body, 0.022, mat(0xffffff), 0.05, y, D / 2 + 0.035));
    mesh(heartGeo(0.13), mat(0xff6bae), r.body, -0.25, H * 0.22, D / 2 + 0.032, false);
    const cal = new THREE.Group();
    cbox(cal, 0.2, 0.26, 0.04, mat(0xffffff), 0, 0, 0);
    cbox(cal, 0.2, 0.06, 0.05, mat(0xff6bae), 0, 0.11, 0);
    cbox(cal, 0.08, 0.09, 0.01, mat(0xff8cc6), 0, -0.02, 0.025);
    cal.position.set(0.02, 0.16, 0.12);
    r.arms[1].add(cal);
    return r;
}
