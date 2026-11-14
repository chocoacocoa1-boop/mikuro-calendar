import * as THREE from 'three';
import { mat, mesh, cbox, ball, heartGeo, starGeo } from './build.js';
import { damp, rand } from './util.js';

// Clawd（Claude Code 公式キャラ）をボクセルで立体にしたもの
const W = 1.0;
const H = 0.62;
const D = 0.7;
const LEG = 0.2;
const SIT_POSES = new Set(['sit', 'sleep', 'soak', 'type', 'eat', 'read', 'draw']);

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
            if (a.talkT > 0) by += Math.abs(Math.sin(t * 12 + seed)) * 0.024 * Math.min(1, a.talkT * 2.5);
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
                    // 音叉：ふりかぶって（windup）、ちょんとたたく
                    case 'fork': if (i) off.set(-0.05, a.windup ? 0.26 : 0.04, a.windup ? 0.1 : 0.2); break;
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
    // アンテナの星は、星くずを降らせるときに光ってくるくる回る（glow を 0〜1 で）
    const antM = new THREE.MeshLambertMaterial({ color: 0xffe27a, emissive: 0x6a5200 });
    const star = mesh(starGeo(0.1, 0.04), antM, r.body, -0.24, H + 0.3, 0.05);
    const dim = new THREE.Color(0x6a5200), bright = new THREE.Color(0xffd84d);
    let spin = 0, glow = 0;
    r.glow = 0;
    r.antennaPos = (out = new THREE.Vector3()) => star.getWorldPosition(out);
    r.extraAnim = (a, dt, t) => {
        glow = damp(glow, r.glow, 3, dt);
        spin += dt * (1.6 + glow * 11);
        star.rotation.y = spin;
        star.scale.setScalar(1 + glow * (0.55 + Math.sin(t * 10) * 0.15));
        antM.emissive.copy(dim).lerp(bright, glow);
        capePivot.rotation.x = damp(capePivot.rotation.x, a.moving ? 0.35 + Math.sin(t * 9) * 0.06 : 0.04, 6, dt);
    };
    return r;
}

// みかにゃん（♾️Hz）：みかん色のねこ。頭の上に ∞ の輪っか。
// お星様の猫神さまなので、輪っかが光る（glow を 0〜1 で。0 のときはキャラクターシートと同じ見た目）
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
    const hm = new THREE.MeshLambertMaterial({ color: 0xffd66b, emissive: 0x7a5a00 });
    [-1, 1].forEach((sx) => mesh(new THREE.TorusGeometry(0.075, 0.02, 8, 24), hm, halo, sx * 0.075, 0, 0));
    const dim = new THREE.Color(0x7a5a00), bright = new THREE.Color(0xffc94d);
    let glow = 0;
    r.glow = 0;
    r.haloPos = (out = new THREE.Vector3()) => halo.getWorldPosition(out);
    r.extraAnim = (a, dt, t) => {
        glow = damp(glow, r.glow, 3, dt);
        tail.rotation.y = Math.sin(t * 3) * 0.45;
        halo.position.y = H + 0.42 + Math.sin(t * 2) * 0.03;
        halo.rotation.y = Math.sin(t * 0.7) * 0.6;
        halo.scale.setScalar(1 + glow * (0.2 + Math.sin(t * 3) * 0.06));
        hm.emissive.copy(dim).lerp(bright, glow);
    };
    return r;
}

// マッシュルームカットの髪：角のまるい四角を、すそからてっぺんへ積んだおわん形。
// すそは前がぱっつん（目のすぐ上）、横は少し長く、毛先はちょっと内巻き。てっぺんの近くに天使の輪っか
const HAIR_A = 0.585, HAIR_C = 0.445, HAIR_Z = -0.035;
const HAIR_HEM = 0.5, HAIR_SIDE = 0.36, HAIR_WALL = H - 0.04, HAIR_TOP = H + 0.27;

function mushroomHair(color, shine) {
    const SEG = 64, DOME = 12, P = 2.4;
    const sstep = (a, b, v) => { const k = Math.min(1, Math.max(0, (v - a) / (b - a))); return k * k * (3 - 2 * k); };
    const base = new THREE.Color(color), lite = new THREE.Color(shine);
    const pos = [], col = [], idx = [];
    const tmp = new THREE.Color();
    const rings = [];
    const ring = (yOf, k, shineOf, n = 5) => {
        const start = pos.length / 3;
        for (let i = 0; i < SEG; i++) {
            const f = (i / SEG) * Math.PI * 2;
            const cx = Math.cos(f), sz = Math.sin(f);
            const q = Math.pow(Math.pow(Math.abs(cx), n) + Math.pow(Math.abs(sz), n), -1 / n);
            const u = cx * q, w = sz * q;
            pos.push(u * HAIR_A * k, yOf(u, w), w * HAIR_C * k);
            tmp.copy(base).lerp(lite, shineOf ? shineOf(u, w) : 0);
            col.push(tmp.r, tmp.g, tmp.b);
        }
        rings.push(start);
        return start;
    };
    // w は前うしろ（+1 が顔がわ）。すその高さは、角をまわったところでなだらかに変わる
    const hem = (u, w) => HAIR_SIDE + (HAIR_HEM - HAIR_SIDE) * sstep(0.55, 0.9, w) + 0.03 * sstep(-0.55, -0.9, w);
    ring(hem, 0.955);
    ring((u, w) => hem(u, w) + 0.045, 1);
    ring(() => HAIR_WALL, 1);
    for (let j = 1; j <= DOME; j++) {
        const th = (j / DOME) * Math.PI / 2;
        const k = Math.pow(Math.cos(th), 2 / P);
        const y = HAIR_WALL + (HAIR_TOP - HAIR_WALL) * Math.pow(Math.sin(th), 2 / P);
        // 天使の輪っか：前のほうだけ、帯になって光る
        const band = sstep(0.28, 0.4, j / DOME) * (1 - sstep(0.5, 0.62, j / DOME));
        ring(() => y, Math.max(k, 0.001), (u, w) => band * sstep(-0.15, 0.55, w) * 0.85, 5 - 2.6 * (j / DOME));
    }
    for (let n = 0; n < rings.length - 1; n++) {
        const a = rings[n], b = rings[n + 1];
        for (let i = 0; i < SEG; i++) {
            const i2 = (i + 1) % SEG;
            idx.push(a + i, b + i, a + i2, a + i2, b + i, b + i2);
        }
    }
    // すその内がわ（下からのぞいたとき用のふた）
    const under = ring(hem, 0.955);
    const mid = pos.length / 3;
    pos.push(0, HAIR_HEM, 0);
    col.push(base.r, base.g, base.b);
    for (let i = 0; i < SEG; i++) idx.push(mid, under + i, under + (i + 1) % SEG);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
}

// みくろん姉（396Hz）：ひとまわり大きくて、まあるいマッシュルームカットとラベンダーのカーディガン、日めくりカレンダー
export function makeMikuroNee() {
    const r = createClawd({ color: 0xff9fd0, scale: 1.18, eye: 0x4a2b34, blush: 0xff6fb3, arm: 0xcdb9f4, topExtra: 0.32 });
    const hair = mushroomHair(0xffc3e3, 0xfff1f8);
    hair.position.z = HAIR_Z;
    hair.castShadow = hair.receiveShadow = true;
    r.body.add(hair);
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

// マロン（ヨークシャーテリアミックスの女の子）：明るい栗色。頭にピンクのリボン、ミントの首輪に小さな星のチャーム。
// createClawd とおなじ形（root・rig・body・top・animate）で、箱を組み立てて作る。+z が顔
const DS = 0.85;

export function makeDog() {
    const CHEST = mat(0xc8854a), CHEST_D = mat(0xb07238), CHEST_L = mat(0xe2aa6c), CREAM = mat(0xfff0dc);
    const root = new THREE.Group();
    const rig = new THREE.Group();
    rig.scale.setScalar(DS);
    root.add(rig);

    const legs = [];
    [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz], i) => {
        const l = cbox(rig, 0.075, 0.13, 0.075, CHEST, sx * 0.09, 0.065, sz * 0.12);
        l.userData.base = l.position.clone();
        l.userData.grp = (i + (sz < 0 ? 1 : 0)) % 2;
        l.userData.back = sz < 0;
        legs.push(l);
    });

    const body = new THREE.Group();
    body.position.y = 0.13;
    rig.add(body);
    cbox(body, 0.28, 0.19, 0.38, CHEST, 0, 0.095, -0.01);
    cbox(body, 0.2, 0.02, 0.3, CHEST_D, 0, 0.195, -0.04);
    // ヨーキーらしい、たれる長い毛（わき腹とおしり）
    [-1, 1].forEach((sx) => cbox(body, 0.035, 0.17, 0.34, CHEST_L, sx * 0.152, 0.035, -0.01));
    cbox(body, 0.24, 0.12, 0.03, CHEST_L, 0, 0.05, -0.205);
    cbox(body, 0.2, 0.15, 0.05, CREAM, 0, 0.08, 0.195);
    cbox(body, 0.2, 0.035, 0.2, mat(0x8fdfbb), 0, 0.19, 0.16);
    mesh(starGeo(0.03, 0.012), mat(0xffe27a, { emissive: 0x6a5200 }), body, 0, 0.165, 0.265, false);

    const tail = new THREE.Group();
    tail.position.set(0, 0.17, -0.2);
    body.add(tail);
    cbox(tail, 0.05, 0.15, 0.05, CHEST_D, 0, 0.075, 0);
    cbox(tail, 0.065, 0.06, 0.065, CHEST_L, 0, 0.17, 0);

    const head = new THREE.Group();
    head.position.set(0, 0.2, 0.18);
    body.add(head);
    cbox(head, 0.3, 0.24, 0.22, CHEST, 0, 0.1, 0.04);
    cbox(head, 0.13, 0.09, 0.09, CREAM, 0, 0.035, 0.185);
    cbox(head, 0.05, 0.035, 0.03, mat(0x3a2a33), 0, 0.07, 0.24);
    const eyeM = mat(0x2a2233);
    const eyes = [-1, 1].map((sx) => cbox(head, 0.045, 0.055, 0.02, eyeM, sx * 0.075, 0.125, 0.152));
    [-1, 1].forEach((sx) => cbox(head, 0.055, 0.19, 0.13, CHEST_L, sx * 0.172, 0.01, 0.07));
    cbox(head, 0.14, 0.06, 0.06, CHEST_L, 0, -0.015, 0.17);
    cbox(head, 0.24, 0.07, 0.05, CHEST_L, 0, 0.2, 0.14);
    const ears = [-1, 1].map((sx) => {
        const e = new THREE.Group();
        e.position.set(sx * 0.105, 0.21, 0);
        e.rotation.z = -sx * 0.22;
        head.add(e);
        cbox(e, 0.08, 0.13, 0.045, CHEST_D, 0, 0.065, 0);
        cbox(e, 0.045, 0.075, 0.01, mat(0xffc9d6), 0, 0.06, 0.025);
        return e;
    });
    // 頭の上の毛をちょんとたばねて、ピンクのリボン（子みくろんのピンク）
    cbox(head, 0.07, 0.075, 0.07, CHEST_L, 0, 0.255, 0.03);
    cbox(head, 0.045, 0.05, 0.05, CHEST_L, 0, 0.3, 0.025);
    const rib = mat(0xff6bae);
    cbox(head, 0.048, 0.048, 0.045, mat(0xff4a9b), 0, 0.28, 0.07);
    cbox(head, 0.1, 0.075, 0.03, rib, -0.065, 0.285, 0.065).rotation.z = 0.35;
    cbox(head, 0.1, 0.075, 0.03, rib, 0.065, 0.285, 0.065).rotation.z = -0.35;
    const tongue = cbox(head, 0.04, 0.015, 0.05, mat(0xff8aa8), 0, -0.012, 0.2);
    tongue.visible = false;

    // 小さい画面でもタップしやすい当たり判定
    const hit = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.9, 1.0), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = 0.35;
    rig.add(hit);

    const A = { by: 0.13, rx: 0, hrx: 0, hrz: 0, ear: 0, wag: 0.25, tuck: 0, back: 0, blinkT: rand(1, 4), blink: 0 };
    const seed = Math.random() * 10;
    const r = {
        root, rig, body, head, tail, eyes, legs,
        scale: DS, H: 0.3,
        top: 0.62,
        held: null,
        extraAnim: null,
        hold() {},
        animate(a, dt, t) {
            let pose = a.pose;
            // びっくりしたときは、ちょっとのあいだ小さくなる
            if (a.startleT > 0) {
                a.startleT -= dt;
                pose = 'shy';
            }
            const walking = a.moving;
            const p = walking ? 'walk' : pose;
            let by = 0.13, rx = 0, hrx = 0, hrz = 0, ear = 0, wag = 0.25, tuck = 0, back = 0, hop = 0, open = 1;
            switch (p) {
                case 'sit': rx = -0.38; back = 0.5; by = 0.12; break;
                case 'sleep': tuck = 0.65; by = 0.052; hrx = 0.45; wag = 0; open = 0.12; break;
                case 'happy': hop = Math.abs(Math.sin(t * 7 + seed)) * 0.1; wag = 1; break;
                case 'eat':
                case 'sniff': hrx = 0.5 + Math.sin(t * 8) * 0.08; wag = 0.5; break;
                case 'bow': rx = 0.3; by = 0.11; wag = 1; break;
                case 'beg': rx = -0.95; back = 0.55; by = 0.2; wag = 0.8; break;
                case 'tilt': hrz = 0.35; rx = -0.38; back = 0.5; by = 0.12; break;
                case 'look': hrx = -0.3; rx = -0.38; back = 0.5; by = 0.12; break;
                case 'shy': by = 0.11; hrx = 0.25; ear = -0.5; wag = 0.1; tuck = 0.15; break;
                case 'walk': wag = 0.45; break;
            }
            if (a.petT > 0) {
                hop = Math.max(hop, Math.sin((1 - a.petT) * Math.PI) * 0.16);
                wag = 1;
            }
            if (a.talkT > 0) wag = Math.max(wag, 0.7);
            A.by = damp(A.by, by, 10, dt);
            A.rx = damp(A.rx, rx, 10, dt);
            A.hrx = damp(A.hrx, hrx, 10, dt);
            A.hrz = damp(A.hrz, hrz, 8, dt);
            A.ear = damp(A.ear, ear, 10, dt);
            A.wag = damp(A.wag, wag, 4, dt);
            A.tuck = damp(A.tuck, tuck, 10, dt);
            A.back = damp(A.back, back, 10, dt);

            const ph = a.walkPhase * 1.5;
            for (const l of legs) {
                const g = l.userData.grp ? Math.PI : 0;
                const k = 1 - A.tuck - (l.userData.back ? A.back : 0);
                l.scale.y = Math.max(0.2, k);
                l.position.y = (0.13 * l.scale.y) / 2 + (walking ? Math.max(0, Math.sin(ph + g)) * 0.04 : 0);
                l.position.z = l.userData.base.z + (walking ? Math.cos(ph + g) * 0.04 : 0);
            }
            let bob = walking ? Math.abs(Math.sin(ph)) * 0.02 : 0;
            if (p === 'sleep') bob += Math.sin(t * 1.4 + seed) * 0.006;
            if (a.talkT > 0) bob += Math.abs(Math.sin(t * 12 + seed)) * 0.015 * Math.min(1, a.talkT * 2.5);
            body.position.y = A.by + bob;
            body.rotation.x = A.rx;
            head.rotation.x = A.hrx - A.rx * 0.6;
            head.rotation.z = A.hrz + (p === 'stand' ? Math.sin(t * 0.7 + seed) * 0.05 : 0);
            ears.forEach((e) => { e.rotation.x = A.ear; });
            tail.rotation.x = -0.6 + A.ear * 0.8 - (p === 'sleep' ? 0.6 : 0);
            tail.rotation.z = Math.sin(t * (6 + 14 * A.wag)) * (0.08 + 0.55 * A.wag);
            rig.position.y = hop;
            tongue.visible = p === 'happy' || (walking && A.wag > 0.6);

            A.blinkT -= dt;
            if (A.blinkT < 0) {
                A.blink = 0.13;
                A.blinkT = rand(2, 5);
            }
            if (A.blink > 0) {
                A.blink -= dt;
                open = Math.min(open, 0.15);
            }
            eyes[0].scale.y = eyes[1].scale.y = open;
        },
    };
    return r;
}
