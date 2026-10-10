import * as THREE from 'three';
import { clamp, smoothstep } from './util.js';
import { softDotTexture } from './textures.js';

// 一日の空の色（分 → 色）
const SKY = [
    [0, '#1f2550'], [250, '#262c5e'], [330, '#5b5592'], [385, '#ffbfd6'], [470, '#d6e8ff'],
    [720, '#c6e3ff'], [960, '#d1e4ff'], [1045, '#ffc7b5'], [1105, '#d0a8de'], [1180, '#4a447e'],
    [1260, '#2a2f60'], [1440, '#1f2550'],
].map(([m, c]) => [m, new THREE.Color(c)]);

function sample(keys, m, out) {
    for (let i = 0; i < keys.length - 1; i++) {
        const [m0, c0] = keys[i];
        const [m1, c1] = keys[i + 1];
        if (m >= m0 && m <= m1) return out.copy(c0).lerp(c1, (m - m0) / (m1 - m0));
    }
    return out.copy(keys[0][1]);
}

export function dayAmount(m) {
    return smoothstep(330, 450, m) * (1 - smoothstep(1050, 1170, m));
}

const bump = (m, c, w) => Math.max(0, 1 - Math.abs(m - c) / w);

export function buildEnv(W) {
    const { scene, renderer } = W;
    const sky = new THREE.Color();
    const WHITE = new THREE.Color(0xffffff);
    scene.background = new THREE.Color(0xc6e3ff);
    scene.fog = new THREE.Fog(0xc6e3ff, 80, 160);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x9dc58c, 1.3);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -15; sc.right = 15; sc.top = 15; sc.bottom = -15;
    sc.near = 5; sc.far = 90;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    sun.target.position.set(2, 0, 2);
    scene.add(sun, sun.target);

    const ground = new THREE.Mesh(new THREE.CircleGeometry(90, 64), new THREE.MeshLambertMaterial({ color: 0xbfe2a5 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    // 柵の中はちょっと明るい芝生
    const yard = new THREE.Mesh(new THREE.PlaneGeometry(17.6, 13.6), new THREE.MeshLambertMaterial({ color: 0xcdeab6 }));
    yard.rotation.x = -Math.PI / 2;
    yard.position.set(2.1, 0.004, 2.1);
    yard.receiveShadow = true;
    scene.add(yard);

    // 星（カメラに追従させて、いつも遠くに見えるように）
    const starGeo = new THREE.BufferGeometry();
    const N = 380;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
        const th = Math.random() * Math.PI * 2;
        const ph = Math.random() * Math.PI * 0.42;
        pos[i * 3] = Math.sin(ph) * Math.cos(th) * 150;
        pos[i * 3 + 1] = Math.cos(ph) * 150;
        pos[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * 150;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const starMat = new THREE.PointsMaterial({
        color: 0xffffff, size: 2 * renderer.getPixelRatio(), sizeAttenuation: false,
        transparent: true, opacity: 0, depthWrite: false, fog: false,
    });
    const stars = new THREE.Points(starGeo, starMat);
    stars.frustumCulled = false;
    scene.add(stars);

    // ほたる（夜の庭）
    const glow = softDotTexture('rgba(255,255,220,1)', 'rgba(255,255,160,0)');
    const FF = 16;
    const ffBase = [];
    const ffPos = new Float32Array(FF * 3);
    for (let i = 0; i < FF; i++) {
        ffBase.push({
            x: -5 + Math.random() * 15,
            z: 4.8 + Math.random() * 3.6,
            p: Math.random() * 10,
            s: 0.4 + Math.random() * 0.5,
        });
    }
    // 右側の庭にも少し
    for (let i = 0; i < 5; i++) ffBase[i].x = 7 + Math.random() * 3.3, ffBase[i].z = -3 + Math.random() * 6;
    const ffGeo = new THREE.BufferGeometry();
    ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
    const ffMat = new THREE.PointsMaterial({
        color: 0xf2ff9a, map: glow, size: 9 * renderer.getPixelRatio(), sizeAttenuation: false,
        transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const fireflies = new THREE.Points(ffGeo, ffMat);
    fireflies.frustumCulled = false;
    scene.add(fireflies);

    // ちょうちょ（昼の庭）
    const butterflies = [0xffb3d9, 0xc9b3ff, 0xfff1a8].map((col, i) => {
        const grp = new THREE.Group();
        const wingMat = new THREE.MeshLambertMaterial({ color: col, side: THREE.DoubleSide });
        const wg = new THREE.PlaneGeometry(0.2, 0.15);
        wg.translate(0.1, 0, 0);
        const l = new THREE.Mesh(wg, wingMat);
        const r = new THREE.Mesh(wg, wingMat);
        r.scale.x = -1;
        l.rotation.x = r.rotation.x = -Math.PI / 2;
        const wl = new THREE.Group(); wl.add(l);
        const wr = new THREE.Group(); wr.add(r);
        grp.add(wl, wr);
        scene.add(grp);
        return { grp, wl, wr, ph: i * 2.1, c: [[-2.8, 6.2], [3.5, 6.6], [8.4, 0.5]][i] };
    });

    const sunDir = new THREE.Vector3();
    const moonDir = new THREE.Vector3(-0.45, 0.85, 0.4).normalize();
    const nightCol = new THREE.Color(0xa9b6ff);
    const dayCol = new THREE.Color(0xfff4e8);
    const goldCol = new THREE.Color(0xffc3a0);
    const groundBase = new THREE.Color(0x9dc58c);

    const env = {
        day: 1,
        night: 0,
        sky,
        update(m, dt, t, camera, camDist) {
            const day = dayAmount(m);
            env.day = day;
            env.night = 1 - day;
            sample(SKY, m, sky);
            scene.background.copy(sky);
            scene.fog.color.copy(sky);
            scene.fog.near = camDist + 8;
            scene.fog.far = camDist + 85;

            hemi.color.copy(sky).lerp(WHITE, 0.55);
            hemi.groundColor.copy(groundBase).multiplyScalar(0.35 + 0.65 * day);
            hemi.intensity = 0.6 + 0.85 * day;

            const th = clamp((m - 360) / 720, 0, 1) * Math.PI;
            sunDir.set(Math.cos(th) * 0.75, 0.35 + Math.sin(th) * 0.9, 0.55).normalize();
            sunDir.lerp(moonDir, 1 - day).normalize();
            sun.position.copy(sun.target.position).addScaledVector(sunDir, 45);
            const golden = Math.max(bump(m, 405, 75), bump(m, 1075, 85));
            sun.color.copy(nightCol).lerp(dayCol, day).lerp(goldCol, golden * 0.75);
            sun.intensity = 0.35 + 1.75 * day;

            stars.position.copy(camera.position);
            starMat.opacity = smoothstep(0.45, 1, env.night) * 0.95;

            ffMat.opacity = smoothstep(0.5, 1, env.night) * (0.75 + 0.25 * Math.sin(t * 2.3));
            if (ffMat.opacity > 0.01) {
                ffBase.forEach((b, i) => {
                    ffPos[i * 3] = b.x + Math.sin(t * b.s + b.p) * 0.9;
                    ffPos[i * 3 + 1] = 0.5 + Math.sin(t * b.s * 1.7 + b.p) * 0.35;
                    ffPos[i * 3 + 2] = b.z + Math.cos(t * b.s * 0.8 + b.p) * 0.7;
                });
                ffGeo.attributes.position.needsUpdate = true;
            }

            const showB = smoothstep(0.55, 0.85, day);
            butterflies.forEach((b) => {
                b.grp.visible = showB > 0.02;
                if (!b.grp.visible) return;
                const tt = t * 0.45 + b.ph;
                const x = b.c[0] + Math.sin(tt) * 1.7;
                const z = b.c[1] + Math.sin(tt * 1.31) * 0.9;
                const nx = b.c[0] + Math.sin(tt + 0.05) * 1.7;
                const nz = b.c[1] + Math.sin((tt + 0.05) * 1.31) * 0.9;
                b.grp.position.set(x, 0.75 + Math.sin(tt * 2.7) * 0.25, z);
                b.grp.rotation.y = Math.atan2(nx - x, nz - z);
                const flap = Math.sin(t * 16 + b.ph) * 0.9;
                b.wl.rotation.z = flap;
                b.wr.rotation.z = -flap;
                b.grp.scale.setScalar(showB);
            });
        },
    };
    return env;
}
