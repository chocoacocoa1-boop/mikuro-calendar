import * as THREE from 'three';
import { ctx } from './ctx.js';
import { mat, mesh, box, cbox, cyl, ball, blob, heartGeo, cherryPair, disposeChildren, spot } from './build.js';
import * as T from './textures.js';
import { damp } from './util.js';

export const FLOOR_Y = 0.15;
const WH = 2.2;
const WT = 0.16;
const PH = 1.6;
const PT = 0.12;
const WALL = 0xfff3ea;
const WAIN = 0xffd2e4;
const WHITE = 0xffffff;
const WOOD = 0xf3d9bd;
const GLASS_TINT = new THREE.Color(0xffffff);

export const DISHES = [
    { id: 'imoni', name: '芋煮' },
    { id: 'sakuranbo', name: 'さくらんぼ' },
    { id: 'tamakon', name: '玉こんにゃく' },
    { id: 'onigiri', name: 'おにぎり' },
    { id: 'lafrance', name: 'ラ・フランス' },
    { id: 'ramen', name: '冷やしラーメン' },
    { id: 'dadacha', name: 'だだちゃ豆' },
];

function shadeMaterial(color = 0xfff1dc) {
    return new THREE.MeshLambertMaterial({ color, emissive: 0x000000, side: THREE.DoubleSide });
}

function buildDish(id) {
    const g = new THREE.Group();
    const plate = () => cyl(g, 0.17, 0.14, 0.02, WHITE, 0, 0, 0, 24);
    const bowl = () => cyl(g, 0.14, 0.09, 0.1, 0xfdf7f2, 0, 0, 0, 24);
    switch (id) {
        case 'imoni':
            bowl();
            cyl(g, 0.125, 0.125, 0.01, 0xd9a066, 0, 0.085, 0, 20);
            [[0.04, 0.03, 0xf3ead9], [-0.05, 0.02, 0xf3ead9], [0, -0.05, 0x9a5a44], [-0.03, 0.06, 0x8fd17a], [0.06, -0.03, 0x9a5a44]]
                .forEach(([x, z, c]) => ball(g, 0.03, c, x, 0.1, z));
            break;
        case 'sakuranbo':
            plate();
            for (let i = 0; i < 5; i++) {
                const a = (i / 5) * Math.PI * 2;
                cherryPair(g, Math.cos(a) * 0.07, 0.06, Math.sin(a) * 0.07, 0.9).rotation.y = a;
            }
            break;
        case 'tamakon': {
            plate();
            const stick = cbox(g, 0.24, 0.012, 0.012, 0xe8d2a8, 0, 0.06, 0);
            stick.rotation.y = 0.5;
            [-0.06, 0, 0.06].forEach((d) => ball(g, 0.045, 0x7a5444, d * Math.cos(0.5), 0.06, -d * Math.sin(0.5)));
            break;
        }
        case 'onigiri':
            plate();
            [-0.06, 0.06].forEach((x, i) => {
                const o = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 3), mat(0xfffcf5), g, x, 0.075, 0);
                o.rotation.set(Math.PI / 2, 0, Math.PI / 2 + (i ? 0.15 : -0.15));
                cbox(g, 0.06, 0.04, 0.052, 0x2f3a2c, x, 0.035, 0);
            });
            break;
        case 'lafrance':
            plate();
            ball(g, 0.07, 0xd9e08c, 0, 0.08, 0);
            ball(g, 0.045, 0xd9e08c, 0, 0.16, 0);
            cbox(g, 0.01, 0.05, 0.01, 0x8a6a4a, 0, 0.21, 0);
            break;
        case 'ramen':
            bowl();
            cyl(g, 0.125, 0.125, 0.012, 0xf3d98a, 0, 0.085, 0, 20);
            cyl(g, 0.05, 0.05, 0.012, 0xf2b8a8, 0.04, 0.09, 0.03, 14);
            [[-0.05, -0.02], [-0.01, 0.05]].forEach(([x, z]) =>
                cbox(g, 0.035, 0.035, 0.035, new THREE.MeshLambertMaterial({ color: 0xe8f6ff, transparent: true, opacity: 0.75 }), x, 0.11, z));
            break;
        case 'dadacha':
        default:
            plate();
            for (let i = 0; i < 6; i++) {
                const p = mesh(new THREE.CapsuleGeometry(0.022, 0.06, 4, 8), mat(0x8cc46a), g, Math.cos(i) * 0.06, 0.04, Math.sin(i * 1.7) * 0.06);
                p.rotation.set(Math.PI / 2, 0, i);
            }
            break;
    }
    return g;
}

export function buildHouse(W) {
    const { scene, nav } = W;
    const y0 = FLOOR_Y;
    const root = new THREE.Group();
    scene.add(root);
    const aniso = Math.min(8, W.renderer.capabilities.getMaxAnisotropy());

    function furn(id, x, z) {
        const g = new THREE.Group();
        g.position.set(x, y0, z);
        g.userData.pick = id;
        root.add(g);
        W.pickables.push(g);
        return g;
    }

    function addLamp(x, y, z, shade, intensity, dist) {
        const L = new THREE.PointLight(0xffd6a0, 0, dist, 1.6);
        L.position.set(x, y, z);
        root.add(L);
        W.lamps.push({ light: L, shade, max: intensity, outdoor: false, level: 0 });
    }

    // ── 床 ──
    const side = mat(0xe3b48c);
    const top = new THREE.MeshLambertMaterial({ map: T.plankTexture(aniso) });
    const slab = new THREE.Mesh(new THREE.BoxGeometry(12.3, y0, 8.3), [side, side, top, side, side, side]);
    slab.position.y = y0 / 2;
    slab.receiveShadow = true;
    root.add(slab);
    const tiles = mesh(new THREE.PlaneGeometry(3.4, 8), new THREE.MeshLambertMaterial({ map: T.checkerTexture(aniso) }), root, 4.3, y0 + 0.003, 0, false);
    tiles.rotation.x = -Math.PI / 2;
    tiles.receiveShadow = true;

    // ── 外壁（カメラ側の壁は自動で低くなる）──
    const walls = [];
    function exteriorWall(normal, segs) {
        const grp = new THREE.Group();
        grp.position.y = y0;
        root.add(grp);
        const decor = new THREE.Group();
        root.add(decor);
        const inner = new THREE.Vector3(-normal[0], 0, -normal[2]).multiplyScalar(WT / 2 + 0.012);
        for (const [x0, z0, x1, z1] of segs) {
            const alongX = z0 === z1;
            const len = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
            const geo = new THREE.BoxGeometry(alongX ? len : WT, WH, alongX ? WT : len);
            geo.translate(0, WH / 2, 0);
            const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
            mesh(geo, mat(WALL), grp, cx, 0, cz);
            box(grp, alongX ? len - 0.1 : 0.02, 0.55, alongX ? 0.02 : len - 0.1, WAIN, cx + inner.x, 0, cz + inner.z);
            if (alongX) nav.block(x0, z0 - WT / 2, x1, z0 + WT / 2);
            else nav.block(x0 - WT / 2, z0, x0 + WT / 2, z1);
        }
        const w = { grp, decor, normal: new THREE.Vector3(normal[0], 0, normal[2]), s: 1 };
        walls.push(w);
        return w;
    }
    const back = exteriorWall([0, 0, -1], [[-6.08, -4, 6.08, -4]]);
    const left = exteriorWall([-1, 0, 0], [[-6, -3.92, -6, 3.92]]);
    const right = exteriorWall([1, 0, 0], [[6, -3.92, 6, 3.92]]);
    const front = exteriorWall([0, 0, 1], [[-6.08, 4, 4.0, 4], [5.1, 4, 6.08, 4]]);

    const glassMat = new THREE.MeshBasicMaterial({ color: 0xcfe8ff });
    W.glassMat = glassMat;
    function addWindow(parent, axis, x, z, w, h, inner, curtain) {
        const gw = new THREE.Group();
        gw.position.set(x, y0 + 0.95, z);
        if (axis === 'z') gw.rotation.y = Math.PI / 2;
        parent.add(gw);
        const d = WT + 0.05;
        mesh(new THREE.BoxGeometry(w, h, WT + 0.02), glassMat, gw, 0, h / 2, 0, false);
        const fm = mat(WHITE);
        box(gw, w + 0.16, 0.08, d + 0.08, fm, 0, -0.08, 0);
        box(gw, w + 0.16, 0.08, d, fm, 0, h, 0);
        box(gw, 0.08, h, d, fm, -(w / 2 + 0.04), 0, 0);
        box(gw, 0.08, h, d, fm, w / 2 + 0.04, 0, 0);
        box(gw, w, 0.045, d - 0.02, fm, 0, h / 2 - 0.022, 0);
        box(gw, 0.045, h, d - 0.02, fm, 0, 0, 0);
        if (curtain) {
            [-1, 1].forEach((sx) => box(gw, 0.2, h + 0.22, 0.04, curtain, sx * (w / 2 + 0.17), -0.1, inner * (WT / 2 + 0.05)));
            box(gw, w + 0.75, 0.04, 0.04, 0xd9b9a0, 0, h + 0.13, inner * (WT / 2 + 0.07));
        }
    }
    addWindow(left.decor, 'z', -6, 0.4, 1.6, 0.9, 1, 0xffc4df);
    addWindow(back.decor, 'x', 1.8, -4, 1.0, 0.8, 1, 0xd9cbf7);
    addWindow(back.decor, 'x', 3.9, -4, 1.1, 0.7, 1);
    addWindow(right.decor, 'z', 6, -0.8, 1.0, 0.8, -1, 0xfff0a8);
    addWindow(front.decor, 'x', -3.4, 4, 1.3, 0.8, -1, 0xffc4df);

    // ドア（前の壁）
    box(front.decor, 0.08, 1.9, WT + 0.05, WHITE, 3.96, y0, 4);
    box(front.decor, 0.08, 1.9, WT + 0.05, WHITE, 5.14, y0, 4);
    box(front.decor, 1.26, WH - 1.9, WT, WALL, 4.55, y0 + 1.9, 4);
    box(front.decor, 1.26, 0.08, WT + 0.05, WHITE, 4.55, y0 + 1.86, 4);
    const doorPivot = new THREE.Group();
    doorPivot.position.set(5.06, y0, 4);
    doorPivot.rotation.y = -1.35;
    front.decor.add(doorPivot);
    box(doorPivot, 1.0, 1.84, 0.06, 0xffb3d4, -0.5, 0, 0);
    ball(doorPivot, 0.04, WHITE, -0.88, 0.95, 0.05);
    mesh(new THREE.CircleGeometry(0.16, 20), mat(0xcfe8ff), doorPivot, -0.5, 1.45, 0.032, false);
    box(root, 0.9, 0.012, 0.55, 0xff9cc8, 4.55, y0, 3.55);
    box(root, 1.2, 0.1, 0.45, 0xe3b48c, 4.55, 0, 4.42);

    // ── 間仕切り ──
    function partition(x0, z0, x1, z1) {
        const alongX = z0 === z1;
        const len = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
        const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
        box(root, alongX ? len : PT, PH, alongX ? PT : len, WALL, cx, y0, cz);
        box(root, (alongX ? len : PT) + 0.03, 0.035, (alongX ? PT : len) + 0.03, WHITE, cx, y0 + PH, cz);
        if (alongX) nav.block(x0, z0 - PT / 2, x1, z0 + PT / 2);
        else nav.block(x0 - PT / 2, z0, x0 + PT / 2, z1);
    }
    partition(-1.0, -3.92, -1.0, -1.6);
    partition(-1.06, -0.6, 1.0, -0.6);
    partition(2.6, -3.92, 2.6, -1.8);

    // ── リビング ──
    const sofa = furn('sofa', -3.5, -3.475);
    box(sofa, 2.4, 0.38, 0.95, 0x9fd9c6, 0, 0, 0);
    box(sofa, 2.0, 0.12, 0.7, 0xbfe9db, 0, 0.38, 0.1);
    box(sofa, 2.4, 0.64, 0.26, 0x9fd9c6, 0, 0.38, -0.345);
    box(sofa, 0.24, 0.6, 0.95, 0x8fceb9, -1.08, 0, 0);
    box(sofa, 0.24, 0.6, 0.95, 0x8fceb9, 1.08, 0, 0);
    const pl1 = box(sofa, 0.42, 0.34, 0.12, 0xcbb8f3, -0.62, 0.48, -0.17);
    pl1.rotation.set(-0.15, 0, 0.12);
    const pl2 = box(sofa, 0.42, 0.34, 0.12, 0xffd0e4, 0.62, 0.48, -0.17);
    pl2.rotation.set(-0.15, 0, -0.1);
    nav.block(-4.7, -3.95, -2.3, -3.0);

    const ctab = furn('sofa', -3.5, -1.5);
    box(ctab, 1.1, 0.06, 0.6, 0xfffaf4, 0, 0.3, 0);
    [[-0.47, -0.22], [0.47, -0.22], [-0.47, 0.22], [0.47, 0.22]].forEach(([x, z]) => box(ctab, 0.06, 0.3, 0.06, 0xffb3d4, x, 0, z));
    cyl(ctab, 0.05, 0.05, 0.09, 0xff8cc6, 0.3, 0.36, 0.05);
    cyl(ctab, 0.04, 0.06, 0.12, 0xcbb8f3, -0.3, 0.36, -0.05);
    ball(ctab, 0.06, 0xff6bae, -0.3, 0.53, -0.05);
    nav.block(-4.05, -1.8, -2.95, -1.2, 0.28);

    const rug = mesh(new THREE.CircleGeometry(1.55, 48), new THREE.MeshLambertMaterial({ map: T.rugTexture() }), root, -3.5, y0 + 0.006, -1.2, false);
    rug.rotation.x = -Math.PI / 2;
    rug.receiveShadow = true;

    const shelf = furn('bookshelf', -5.69, -2.2);
    box(shelf, 0.46, 1.78, 0.06, WOOD, 0, 0, -0.72);
    box(shelf, 0.46, 1.78, 0.06, WOOD, 0, 0, 0.72);
    box(shelf, 0.04, 1.78, 1.5, WOOD, -0.21, 0, 0);
    [0, 0.58, 1.16, 1.74].forEach((y) => box(shelf, 0.46, 0.04, 1.5, WOOD, 0, y, 0));
    const BOOK_COLS = [0xff8cc6, 0xb9a2f0, 0x8fdfbb, 0xffd56b, 0x9fd4ff, 0xffffff, 0xff6bae, 0xf7a072];
    const books = [];
    [0.04, 0.62, 1.2].forEach((sy) => {
        let z = -0.66;
        while (z < 0.58) {
            const w = 0.07 + Math.random() * 0.07;
            const h = 0.28 + Math.random() * 0.2;
            if (z + w > 0.68) break;
            books.push({ z: z + w / 2, y: sy, w, h, c: BOOK_COLS[books.length % BOOK_COLS.length] });
            z += w + 0.012;
            if (Math.random() < 0.1) z += 0.14;
        }
    });
    const bookMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial(), books.length);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const col = new THREE.Color();
    books.forEach((b, i) => {
        m4.compose(new THREE.Vector3(0.03, b.y + b.h / 2, b.z), q, new THREE.Vector3(0.34, b.h, b.w));
        bookMesh.setMatrixAt(i, m4);
        bookMesh.setColorAt(i, col.setHex(b.c));
    });
    bookMesh.castShadow = bookMesh.receiveShadow = true;
    shelf.add(bookMesh);
    nav.block(-5.92, -2.95, -5.46, -1.45);

    const flamp = furn('lamp', -5.45, -3.45);
    cyl(flamp, 0.2, 0.22, 0.04, 0xd9b9a0, 0, 0, 0);
    cyl(flamp, 0.025, 0.025, 1.45, 0xd9b9a0, 0, 0.04, 0);
    const flShade = shadeMaterial();
    mesh(new THREE.CylinderGeometry(0.17, 0.3, 0.34, 20, 1, true), flShade, flamp, 0, 1.62, 0);
    addLamp(-5.4, y0 + 1.5, -3.25, flShade, 7, 9);
    nav.blockCircle(-5.45, -3.45, 0.22, 0.25);

    // 396Hz のシンギングボウル（浄化スポット）
    const bowlG = furn('bowl', -4.5, 1.7);
    box(bowlG, 0.78, 0.09, 0.78, 0xcdb9f5, 0, 0, 0);
    const prof = [];
    for (let i = 0; i <= 8; i++) {
        const a = (i / 8) * (Math.PI / 2);
        prof.push(new THREE.Vector2(0.06 + Math.sin(a) * 0.17, (1 - Math.cos(a)) * 0.15));
    }
    mesh(new THREE.LatheGeometry(prof, 28), new THREE.MeshLambertMaterial({ color: 0xf2c46b, emissive: 0x3a2a00, side: THREE.DoubleSide }), bowlG, 0, 0.09, 0);
    cyl(bowlG, 0.06, 0.06, 0.01, 0xe0b05a, 0, 0.09, 0);
    const mallet = mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.34, 8), mat(0xc98a5a), bowlG, 0.28, 0.12, 0.22);
    mallet.rotation.set(0, 0.6, Math.PI / 2);
    W.bowlPos = new THREE.Vector3(-4.5, y0 + 0.24, 1.7);
    nav.block(-4.89, 1.31, -4.11, 2.09, 0.12);

    function plant(x, z, s = 1) {
        const p = furn('plant', x, z);
        cyl(p, 0.2 * s, 0.15 * s, 0.32 * s, 0xf5a9a0, 0, 0, 0);
        cyl(p, 0.19 * s, 0.19 * s, 0.02, 0x8a5a3c, 0, 0.3 * s, 0);
        blob(p, 0.26 * s, 0x7cc47c, 0, 0.55 * s, 0);
        blob(p, 0.2 * s, 0x8fd08c, 0.15 * s, 0.68 * s, 0.05 * s);
        blob(p, 0.18 * s, 0x6fb86f, -0.12 * s, 0.72 * s, -0.06 * s);
        nav.blockCircle(x, z, 0.22 * s, 0.25);
    }
    plant(-5.5, 3.45, 1.1);
    plant(1.95, 3.4);

    // 日めくりカレンダー（後ろの壁）
    const cal = T.calendarPainter();
    W.calendar = cal;
    const calWhite = mat(WHITE);
    const calMats = [calWhite, calWhite, calWhite, calWhite, new THREE.MeshLambertMaterial({ map: cal.texture }), calWhite];
    const calZ = -4 + WT / 2 + 0.017;
    const calMesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.03), calMats);
    calMesh.position.set(-3.5, y0 + 1.58, calZ);
    calMesh.castShadow = true;
    calMesh.userData.pick = 'calendar';
    back.decor.add(calMesh);
    W.pickables.push(calMesh);
    const pageCanvas = T.makeCanvas(256, 320);
    const pageTex = T.tex(pageCanvas);
    const pageMat = new THREE.MeshLambertMaterial({ map: pageTex, transparent: true, side: THREE.DoubleSide });
    const pagePivot = new THREE.Group();
    pagePivot.position.set(-3.5, y0 + 2.08, calZ + 0.02);
    back.decor.add(pagePivot);
    const page = mesh(new THREE.PlaneGeometry(0.8, 1.0), pageMat, pagePivot, 0, -0.5, 0, false);
    page.visible = false;
    let flipT = -1;
    W.flipCalendar = (day) => {
        pageCanvas.getContext('2d').drawImage(cal.texture.image, 0, 0);
        pageTex.needsUpdate = true;
        cal.draw(day);
        flipT = 0;
        page.visible = true;
    };

    // 寝室の時計
    const clockG = new THREE.Group();
    clockG.position.set(0.3, y0 + 1.82, -4 + WT / 2 + 0.03);
    clockG.userData.pick = 'clock';
    back.decor.add(clockG);
    W.pickables.push(clockG);
    const rim = mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.05, 32), mat(0xffb3d4), clockG, 0, 0, 0);
    rim.rotation.x = Math.PI / 2;
    mesh(new THREE.CircleGeometry(0.24, 32), new THREE.MeshLambertMaterial({ map: T.clockTexture() }), clockG, 0, 0, 0.027, false);
    const hourGeo = new THREE.BoxGeometry(0.03, 0.13, 0.01);
    hourGeo.translate(0, 0.055, 0);
    const minGeo = new THREE.BoxGeometry(0.02, 0.19, 0.01);
    minGeo.translate(0, 0.08, 0);
    const hourHand = mesh(hourGeo, mat(0x6b3a60), clockG, 0, 0, 0.035, false);
    const minHand = mesh(minGeo, mat(0xff6bae), clockG, 0, 0, 0.042, false);

    // まのの絵を飾る額縁
    const frames = [-4.75, -2.3, -1.6].map((x) => {
        const f = new THREE.Group();
        f.position.set(x, y0 + 1.5, -4 + WT / 2 + 0.02);
        f.visible = false;
        f.userData.pick = 'drawing';
        back.decor.add(f);
        W.pickables.push(f);
        cbox(f, 0.56, 0.56, 0.03, 0xffb3d4, 0, 0, 0);
        const pic = mesh(new THREE.PlaneGeometry(0.46, 0.46), new THREE.MeshLambertMaterial(), f, 0, 0, 0.017, false);
        return { f, pic, n: -1 };
    });
    W.setDrawings = (count) => {
        frames.forEach((fr, i) => {
            const show = i < count;
            fr.f.visible = show;
            if (show && fr.n !== i) {
                fr.n = i;
                fr.pic.material.map = T.drawingTexture(i);
                fr.pic.material.needsUpdate = true;
            }
        });
    };

    // ── 寝室 ──
    const bed = furn('bed', 0.3, -3.0);
    box(bed, 1.3, 0.28, 1.9, WOOD, 0, 0, 0);
    box(bed, 1.22, 0.16, 1.82, 0xfffaf6, 0, 0.28, 0);
    box(bed, 1.27, 0.07, 1.2, 0xcbb6f2, 0, 0.43, 0.36);
    box(bed, 0.7, 0.13, 0.36, WHITE, 0, 0.44, -0.65);
    box(bed, 1.38, 0.86, 0.1, 0xffb8d7, 0, 0, -0.93);
    mesh(heartGeo(0.32), mat(0xff8cc6), bed, 0, 0.66, -0.875, false);
    const cover = box(bed, 1.18, 0.34, 0.95, 0xcbb6f2, 0, 0.44, 0.2);
    cover.visible = false;
    W.setBedCover = (on) => { cover.visible = on; };
    nav.block(-0.35, -3.95, 0.95, -2.05);

    const ns = furn('bed', 1.45, -3.68);
    box(ns, 0.5, 0.45, 0.42, WOOD, 0, 0, 0);
    box(ns, 0.4, 0.02, 0.01, 0xd9b9a0, 0, 0.3, 0.215);
    cyl(ns, 0.07, 0.09, 0.05, 0xffb3d4, 0, 0.45, 0);
    cyl(ns, 0.015, 0.015, 0.2, 0xffb3d4, 0, 0.5, 0);
    const nsShade = shadeMaterial();
    mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.16, 16, 1, true), nsShade, ns, 0, 0.76, 0);
    addLamp(1.45, y0 + 0.85, -3.45, nsShade, 3, 5);
    nav.block(1.2, -3.89, 1.7, -3.47);
    box(root, 0.95, 0.012, 0.6, 0xf3d0f0, 1.6, y0, -2.5);

    // ── 書斎 ──
    const desk = furn('desk', -0.05, -0.19);
    box(desk, 1.6, 0.06, 0.7, 0xfffaf5, 0, 0.68, 0);
    [[-0.74, -0.3], [0.74, -0.3], [-0.74, 0.3], [0.74, 0.3]].forEach(([x, z]) => box(desk, 0.06, 0.68, 0.06, 0xffb3d4, x, 0, z));
    box(desk, 0.08, 0.2, 0.08, 0x3a3045, 0, 0.74, -0.22);
    box(desk, 0.26, 0.02, 0.16, 0x3a3045, 0, 0.74, -0.22);
    box(desk, 0.8, 0.5, 0.05, 0x3a3045, 0, 0.9, -0.22);
    const screen = T.screenPainter();
    W.screen = screen;
    mesh(new THREE.PlaneGeometry(0.72, 0.43), new THREE.MeshBasicMaterial({ map: screen.texture }), desk, 0, 1.15, -0.194, false);
    box(desk, 0.5, 0.025, 0.16, 0xf4eef8, 0, 0.74, 0.08);
    box(desk, 0.06, 0.025, 0.09, 0xf4eef8, 0.38, 0.74, 0.1);
    cyl(desk, 0.07, 0.08, 0.03, 0xa6e6cf, 0.62, 0.74, -0.2);
    cyl(desk, 0.012, 0.012, 0.32, 0xa6e6cf, 0.62, 0.77, -0.2);
    const dlShade = shadeMaterial(0xa6e6cf);
    mesh(new THREE.CylinderGeometry(0.05, 0.11, 0.1, 14, 1, true), dlShade, desk, 0.62, 1.12, -0.17);
    addLamp(0.57, y0 + 1.02, -0.3, dlShade, 2.5, 4);
    cyl(desk, 0.045, 0.045, 0.09, 0xff8cc6, -0.62, 0.74, 0.05);
    // 机の上の、元祖オレンジ色のちびClawdフィギュア
    const mini = new THREE.Group();
    mini.position.set(-0.42, 0.74, -0.22);
    mini.rotation.y = 0.3;
    desk.add(mini);
    cbox(mini, 0.16, 0.09, 0.1, 0xd97757, 0, 0.075, 0);
    cbox(mini, 0.03, 0.03, 0.1, 0xd97757, -0.095, 0.07, 0);
    cbox(mini, 0.03, 0.03, 0.1, 0xd97757, 0.095, 0.07, 0);
    [-0.06, -0.025, 0.025, 0.06].forEach((x) => cbox(mini, 0.015, 0.03, 0.06, 0xd97757, x, 0.015, 0));
    [-0.04, 0.04].forEach((x) => cbox(mini, 0.015, 0.022, 0.01, 0x2a2233, x, 0.09, 0.051));
    nav.block(-0.85, -0.54, 0.75, 0.16);
    const stool = furn('desk', -0.05, 0.62);
    cyl(stool, 0.24, 0.2, 0.06, 0xffe08a, 0, 0.36, 0);
    cyl(stool, 0.05, 0.05, 0.36, 0xf2cc5a, 0, 0, 0);
    cyl(stool, 0.18, 0.2, 0.03, 0xf2cc5a, 0, 0, 0);

    // ── キッチン ──
    const ctr = furn('cook', 3.9, -3.62);
    box(ctr, 2.1, 0.82, 0.62, 0xffc7de, 0, 0, 0);
    box(ctr, 2.16, 0.06, 0.68, 0xfffaf6, 0, 0.82, 0.01);
    [-0.7, 0, 0.7].forEach((x) => {
        box(ctr, 0.6, 0.64, 0.012, 0xffd6e8, x, 0.09, 0.312);
        ball(ctr, 0.022, WHITE, x + 0.22, 0.5, 0.33);
    });
    box(ctr, 0.5, 0.02, 0.36, 0xc9d6e3, -0.55, 0.875, 0);
    cyl(ctr, 0.02, 0.02, 0.22, 0xd6dde6, -0.55, 0.88, -0.2);
    box(ctr, 0.62, 0.02, 0.46, 0x4a4250, 0.55, 0.875, 0);
    [[0.4, -0.08], [0.7, 0.08]].forEach(([x, z]) => cyl(ctr, 0.09, 0.09, 0.01, 0x2c2632, x, 0.895, z));
    const pot = new THREE.Group();
    pot.position.set(0.4, 0.9, -0.08);
    ctr.add(pot);
    cyl(pot, 0.2, 0.17, 0.2, 0xef8f80, 0, 0, 0);
    cyl(pot, 0.21, 0.21, 0.03, 0xf7a89b, 0, 0.2, 0);
    ball(pot, 0.03, WHITE, 0, 0.25, 0);
    W.potPos = new THREE.Vector3(4.3, y0 + 1.2, -3.7);
    [[-0.95, 0xff8cc6], [-0.82, 0xb9a2f0], [-0.69, 0x8fdfbb]].forEach(([x, c]) => {
        cyl(ctr, 0.05, 0.05, 0.13, 0xfdf7ff, x, 0.88, -0.2);
        cyl(ctr, 0.055, 0.055, 0.03, c, x, 1.01, -0.2);
    });
    nav.block(2.85, -3.95, 4.95, -3.3);

    const fridge = furn('fridge', 5.55, -3.6);
    box(fridge, 0.74, 1.7, 0.66, 0xbfeedd, 0, 0, 0);
    box(fridge, 0.745, 0.02, 0.665, 0x9fdcc8, 0, 1.1, 0);
    box(fridge, 0.04, 0.4, 0.04, WHITE, -0.28, 0.55, 0.35);
    box(fridge, 0.04, 0.3, 0.04, WHITE, -0.28, 1.22, 0.35);
    mesh(heartGeo(0.14), mat(0xff6bae), fridge, 0.14, 1.42, 0.334, false);
    nav.block(5.18, -3.93, 5.92, -3.27);

    const pend = new THREE.Group();
    pend.position.set(4.4, y0, -0.6);
    root.add(pend);
    cyl(pend, 0.01, 0.01, 0.5, 0x8a6a80, 0, 1.92, 0);
    const pdShade = shadeMaterial(0xffd3e6);
    mesh(new THREE.CylinderGeometry(0.1, 0.26, 0.2, 18, 1, true), pdShade, pend, 0, 1.82, 0);
    addLamp(4.4, y0 + 1.7, -0.6, pdShade, 6, 7);

    const table = furn('table', 4.4, -0.6);
    cyl(table, 0.72, 0.72, 0.06, 0xfffaf6, 0, 0.68, 0, 36);
    cyl(table, 0.07, 0.07, 0.68, 0xffb3d4, 0, 0, 0);
    cyl(table, 0.3, 0.34, 0.04, 0xffb3d4, 0, 0, 0);
    cyl(table, 0.04, 0.05, 0.12, 0xcbb8f3, 0, 0.74, 0);
    ball(table, 0.055, 0xffd56b, 0, 0.91, 0);
    nav.blockCircle(4.4, -0.6, 0.72, 0.28);
    const STOOL = { N: [4.4, -1.62, 0x8fdfbb], S: [4.4, 0.42, 0xffe08a], W: [3.38, -0.6, 0xcbb8f3], E: [5.42, -0.6, 0xffb3d4] };
    for (const k in STOOL) {
        const [x, z, c] = STOOL[k];
        const st = furn('table', x, z);
        cyl(st, 0.2, 0.17, 0.06, c, 0, 0.36, 0);
        cyl(st, 0.045, 0.045, 0.36, 0xe8d8e0, 0, 0, 0);
        cyl(st, 0.15, 0.17, 0.03, 0xe8d8e0, 0, 0, 0);
    }
    const ty = y0 + 0.74;
    W.tablePos = {
        N: new THREE.Vector3(4.4, ty, -1.12),
        S: new THREE.Vector3(4.4, ty, -0.08),
        W: new THREE.Vector3(3.88, ty, -0.6),
        E: new THREE.Vector3(4.92, ty, -0.6),
    };

    const foodRoot = new THREE.Group();
    root.add(foodRoot);
    W.placeFood = (id) => {
        disposeChildren(foodRoot);
        const d = buildDish(id);
        d.position.copy(W.tablePos.N);
        foodRoot.add(d);
    };
    W.clearFood = () => disposeChildren(foodRoot);

    const teaRoot = new THREE.Group();
    root.add(teaRoot);
    W.setTea = (seats) => {
        disposeChildren(teaRoot);
        seats.forEach((s, i) => {
            const g = new THREE.Group();
            g.position.copy(W.tablePos[s]);
            teaRoot.add(g);
            cyl(g, 0.1, 0.09, 0.015, WHITE, 0.06, 0, 0, 18);
            cyl(g, 0.045, 0.038, 0.07, [0xff8cc6, 0xb9a2f0, 0x8fdfbb, 0xffd56b][i % 4], 0.06, 0.015, 0, 14);
            cyl(g, 0.04, 0.04, 0.005, 0xc98a5a, 0.06, 0.08, 0, 14);
            if (i % 2) cherryPair(g, -0.08, 0.04, 0);
            else cbox(g, 0.08, 0.05, 0.06, 0xfff0d6, -0.08, 0.025, 0);
        });
    };
    W.clearTea = () => disposeChildren(teaRoot);

    // ── 行き先 ──
    Object.assign(W.spots, {
        sofa: spot(-3.3, -2.45, -3.3, y0 + 0.5, -3.38, 0, 'sit'),
        sofaNap: spot(-3.75, -2.45, -3.75, y0 + 0.5, -3.38, 0, 'sleep'),
        calendar: spot(-3.5, -2.45, -3.5, y0 + 0.5, -3.32, Math.PI, 'reach'),
        bookshelf: spot(-5.0, -2.2, -5.0, y0, -2.2, -Math.PI / 2, 'reach'),
        bowl: spot(-4.5, 2.6, -4.5, y0, 2.42, Math.PI, 'bowl'),
        window: spot(-5.25, 0.4, -5.25, y0, 0.4, -Math.PI / 2, 'look'),
        bed: spot(0.3, -1.45, 0.3, y0 + 0.46, -3.0, 0, 'sleep'),
        desk: spot(-0.05, 1.35, -0.05, y0 + 0.42, 0.62, Math.PI, 'type'),
        cook: spot(4.4, -2.75, 4.4, y0, -2.75, Math.PI, 'cook'),
        seatN: spot(4.4, -2.2, 4.4, y0 + 0.42, -1.62, 0, 'eat'),
        seatS: spot(4.4, 1.0, 4.4, y0 + 0.42, 0.42, Math.PI, 'eat'),
        seatW: spot(2.95, -0.6, 3.38, y0 + 0.42, -0.6, Math.PI / 2, 'eat'),
        seatE: spot(5.3, 0.35, 5.42, y0 + 0.42, -0.6, -Math.PI / 2, 'eat'),
        cookHelp: spot(3.75, -2.75, 3.75, y0, -2.75, Math.PI, 'cook'),
        rugA: spot(-3.95, -0.45, -3.95, y0, -0.45, 0.5, 'sit'),
        rugB: spot(-2.95, -0.45, -2.95, y0, -0.45, -0.5, 'sit'),
    });
    W.musicRing = { x: -4.5, z: 1.7, r: 1.05 };

    // ── 毎フレームの更新 ──
    let screenAcc = 0;
    W.updaters.push((dt) => {
        // カメラ側の外壁を低くして中を見せる
        const cam = W.camera.position;
        const tg = W.controls.target;
        const dx = cam.x - tg.x, dz = cam.z - tg.z;
        const L = Math.hypot(dx, dz) || 1;
        for (const w of walls) {
            const facing = (w.normal.x * dx + w.normal.z * dz) / L;
            w.s = damp(w.s, facing > 0.28 ? 0.16 : 1, 8, dt);
            w.grp.scale.y = w.s;
            w.decor.visible = w.s > 0.92;
        }
        screenAcc += dt;
        if (screenAcc > 0.05) {
            screen.update(screenAcc);
            screenAcc = 0;
        }
        if (flipT >= 0) {
            flipT += dt / 0.7;
            pagePivot.rotation.x = -flipT * 2.6;
            pageMat.opacity = 1 - flipT;
            if (flipT >= 1) {
                flipT = -1;
                page.visible = false;
                pagePivot.rotation.x = 0;
            }
        }
        const m = ctx.state.min;
        minHand.rotation.z = -((m % 60) / 60) * Math.PI * 2;
        hourHand.rotation.z = -(((m / 60) % 12) / 12) * Math.PI * 2;
        glassMat.color.copy(W.env.sky).lerp(GLASS_TINT, 0.25);
    });
}
