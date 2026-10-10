import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { ctx } from './ctx.js';
import { NavGrid } from './nav.js';
import { buildEnv } from './env.js';
import { buildHouse } from './house.js';
import { buildGarden } from './garden.js';
import { createFx } from './fx.js';
import { sound } from './audio.js';
import { Agent } from './agent.js';
import { makeKoMikuron } from './clawd.js';
import { loadState, saveState, clearState, log } from './state.js';
import * as life from './life.js';
import * as family from './family.js';
import * as chatter from './chatter.js';
import { createBall } from './ball.js';
import { createUI } from './ui.js';
import { L } from './lines.js';
import { cbox } from './build.js';
import { damp, clamp, lerp, pick, wrapAngle } from './util.js';

// ホーム視点：右手前の斜め上から、おうちと庭をまるごと
const HOME = { target: new THREE.Vector3(2.0, 0.6, 2.0), polar: 0.88, azim: 0.6 };
// おうちがいっぱいに見えるように合わせる（庭の端は少し切れてもいい）
const FIT_POINTS = [
    [-6.2, 0, -4.2], [6.2, 0, -4.2], [-6.2, 0, 4.2], [6.2, 0, 4.2],
    [-6.2, 2.4, -4.2], [6.2, 2.4, -4.2], [-6.2, 2.4, 4.2],
    [9.4, 0, 2.5], [1.4, 0, 6.8],
].map(([x, y, z]) => new THREE.Vector3(x, y, z));

function makeBook() {
    const g = new THREE.Group();
    const inner = new THREE.Group();
    inner.rotation.x = -0.6;
    g.add(inner);
    cbox(inner, 0.16, 0.02, 0.22, 0xff8cc6, -0.08, 0, 0).rotation.z = 0.25;
    cbox(inner, 0.16, 0.02, 0.22, 0xb9a0f5, 0.08, 0, 0).rotation.z = -0.25;
    cbox(inner, 0.14, 0.012, 0.2, 0xffffff, -0.075, 0.016, 0).rotation.z = 0.25;
    cbox(inner, 0.14, 0.012, 0.2, 0xffffff, 0.075, 0.016, 0).rotation.z = -0.25;
    return g;
}

function showError(msg) {
    const el = document.getElementById('loading');
    el.classList.remove('hide');
    el.textContent = '';
    const a = document.createElement('div');
    a.textContent = msg;
    const b = document.createElement('div');
    b.className = 'sub';
    b.textContent = 'うーん…わがんね時はわがんねべ〜🤔 ブラウザを新しくしてみてけろ';
    el.append(a, b);
}

function boot() {
    const canvas = document.getElementById('scene');
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    } catch {
        showError('3Dが表示できないみたい…ごめんね🙏');
        return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 1, 500);
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.7;
    controls.minPolarAngle = 0.2;
    controls.maxPolarAngle = 1.36;
    controls.minDistance = 5;
    controls.maxDistance = 170;
    controls.screenSpacePanning = false;

    const W = {
        scene, renderer, camera, controls,
        nav: new NavGrid(-10, -8, 14, 14, 0.25),
        spots: {}, pickables: [], updaters: [], lamps: [], props: {}, textRedraw: [],
    };
    Object.assign(ctx, { scene, camera, renderer, controls, world: W, nav: W.nav, sound, life, family });
    ctx.state = loadState();
    const s = ctx.state;
    const fresh = s.diary.length === 0;
    sound.setEnabled(s.sound);

    W.env = buildEnv(W);
    buildHouse(W);
    buildGarden(W);
    W.props.book = makeBook();
    ctx.fx = createFx(W);
    ctx.ball = createBall(W);

    const km = new Agent({ id: 'km', name: '子みくろん', model: makeKoMikuron(), color: '#ff6bae', speed: 1.8 });
    km.brain = life.brain;
    ctx.km = km;
    family.init();
    ctx.agents = [km, ...family.rt.map((v) => v.agent)];

    W.setFlowers(s.flowers);
    W.setCherries(s.day >= s.cherryReadyDay);
    W.calendar.draw(Math.max(1, s.calendarDay));
    W.setDrawings(s.drawings);
    if (s.food) W.placeFood(s.food);
    if (life.isNight()) km.placeOnSpot(W.spots.bed);
    else km.place(-2.6, 0.6, 0.4);

    // ── カメラ ──
    const tmpCam = new THREE.PerspectiveCamera();
    const right = new THREE.Vector3(), up = new THREE.Vector3();
    let follow = false;
    let followZoomT = 0;
    let camAnim = null;

    function visibleRect() {
        const pr = document.getElementById('panel').getBoundingClientRect();
        const hud = document.querySelector('.hud').getBoundingClientRect();
        const w = window.innerWidth, h = window.innerHeight;
        if (pr.left > w * 0.4 && pr.height > h * 0.6) return { x: 0, y: hud.bottom, w: pr.left, h: h - hud.bottom };
        return { x: 0, y: hud.bottom, w, h: Math.max(80, pr.top - hud.bottom) };
    }

    // おうち全体が見える場所と距離を計算（ほぼ平行投影とみなして）
    function homeView() {
        const t = HOME.target;
        tmpCam.position.set(
            t.x + Math.sin(HOME.polar) * Math.sin(HOME.azim),
            t.y + Math.cos(HOME.polar),
            t.z + Math.sin(HOME.polar) * Math.cos(HOME.azim),
        );
        tmpCam.lookAt(t);
        tmpCam.updateMatrixWorld();
        const inv = tmpCam.matrixWorldInverse;
        let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
        const p = new THREE.Vector3();
        for (const q of FIT_POINTS) {
            p.copy(q).applyMatrix4(inv);
            x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x);
            y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
        }
        right.setFromMatrixColumn(tmpCam.matrixWorld, 0);
        up.setFromMatrixColumn(tmpCam.matrixWorld, 1);
        const target = t.clone().addScaledVector(right, (x0 + x1) / 2).addScaledVector(up, (y0 + y1) / 2);
        const vr = visibleRect();
        const k = Math.max((x1 - x0) / vr.w, (y1 - y0) / vr.h) * 1.06;
        const dist = (k * window.innerHeight) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
        return { target, polar: HOME.polar, azim: HOME.azim, dist };
    }

    function placeCamera(v) {
        controls.target.copy(v.target);
        camera.position.setFromSphericalCoords(v.dist, v.polar, v.azim).add(v.target);
        camera.lookAt(v.target);
    }

    function layout() {
        const w = window.innerWidth, h = window.innerHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        const vr = visibleRect();
        camera.setViewOffset(w, h, w / 2 - (vr.x + vr.w / 2), h / 2 - (vr.y + vr.h / 2), w, h);
        camera.updateProjectionMatrix();
    }

    function home() {
        follow = false;
        ctx.ui?.syncFollow(false);
        const sph = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
        camAnim = { t: 0, fromT: controls.target.clone(), from: sph, to: homeView() };
    }

    function toggleFollow() {
        follow = !follow;
        camAnim = null;
        followZoomT = follow ? 1.6 : 0;
        if (!follow) home();
        return follow;
    }

    // 特別なイベントのときだけ、そこへカメラを寄せる（まのが動かしたら戻さない）
    let focused = false;
    let touchedSinceFocus = false;
    ctx.cam = {
        focus(x, z, dist = 15) {
            follow = false;
            ctx.ui?.syncFollow(false);
            const sph = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
            camAnim = { t: 0, fromT: controls.target.clone(), from: sph, to: { target: new THREE.Vector3(x, 0.5, z), polar: sph.phi, azim: sph.theta, dist } };
            focused = true;
            touchedSinceFocus = false;
        },
        release() {
            if (focused && !touchedSinceFocus && !follow) home();
            focused = false;
        },
    };

    controls.addEventListener('start', () => {
        camAnim = null;
        touchedSinceFocus = true;
    });

    const off = new THREE.Vector3();
    function updateCamera(dt) {
        if (camAnim) {
            const a = camAnim;
            a.t = Math.min(1, a.t + dt / 1.1);
            const e = 1 - Math.pow(1 - a.t, 3);
            controls.target.lerpVectors(a.fromT, a.to.target, e);
            const theta = a.from.theta + wrapAngle(a.to.azim - a.from.theta) * e;
            camera.position.setFromSphericalCoords(lerp(a.from.radius, a.to.dist, e), lerp(a.from.phi, a.to.polar, e), theta).add(controls.target);
            if (a.t >= 1) camAnim = null;
        } else if (follow) {
            const p = km.pos;
            off.copy(camera.position).sub(controls.target);
            controls.target.set(
                damp(controls.target.x, p.x, 3.5, dt),
                damp(controls.target.y, p.y + 0.45, 3.5, dt),
                damp(controls.target.z, p.z, 3.5, dt),
            );
            if (followZoomT > 0) {
                followZoomT -= dt;
                off.setLength(damp(off.length(), 12, 3, dt));
            }
            camera.position.copy(controls.target).add(off);
        }
        controls.target.x = clamp(controls.target.x, -9, 13);
        controls.target.y = clamp(controls.target.y, -1, 3);
        controls.target.z = clamp(controls.target.z, -7, 12);
    }

    // ── タップ（なでる・おねがい）──
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let down = null;
    const shown = (o) => {
        for (let x = o; x; x = x.parent) if (!x.visible) return false;
        return true;
    };
    canvas.addEventListener('pointerdown', (e) => {
        down = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
    });
    canvas.addEventListener('pointerup', (e) => {
        if (!down || e.pointerId !== down.id) return;
        const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
        const held = performance.now() - down.t;
        down = null;
        if (moved > 8 || held > 600) return;
        ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
        ray.setFromCamera(ndc, camera);
        const objs = [...ctx.agents.filter((a) => a.active).map((a) => a.root), ...W.pickables];
        for (const hit of ray.intersectObjects(objs, true)) {
            for (let o = hit.object; o; o = o.parent) {
                const a = o.userData.agent;
                if (a) {
                    if (a === km) life.pet(km);
                    else family.tap(a.visitor);
                    return;
                }
                if (o.userData.pick) {
                    if (!shown(o)) break;
                    life.request(o.userData.pick);
                    return;
                }
            }
        }
    });

    ctx.ui = createUI({
        home, layout, follow: toggleFollow,
        food: life.placeFood, ball: life.throwBall, lights: life.toggleLights, talk: life.talk,
        invite: family.invite, leave: family.leave,
        reset() {
            clearState();
            location.reload();
        },
    });

    layout();
    placeCamera(homeView());
    window.addEventListener('resize', () => {
        layout();
        if (!follow && !camAnim) home();
    });

    ['pointerdown', 'touchend', 'keydown'].forEach((ev) => document.addEventListener(ev, () => sound.unlock(), { passive: true }));
    document.addEventListener('visibilitychange', () => { if (document.hidden) saveState(); });
    window.addEventListener('pagehide', saveState);

    if (fresh) {
        log('子みくろんのおうちへようこそ🏡');
        setTimeout(() => km.say(pick(L.welcome), 4.5), 900);
    } else if (!km.onSpot) {
        setTimeout(() => km.say(pick(L.welcomeBack), 4), 900);
    }

    // キャンバスに描く文字は、Webフォントが届いてから描き直す
    if (document.fonts) {
        Promise.all([
            document.fonts.load("900 40px 'Zen Maru Gothic'"),
            document.fonts.load("700 20px 'Zen Maru Gothic'"),
        ]).then(() => {
            W.calendar.draw(Math.max(1, ctx.state.calendarDay));
            W.textRedraw.forEach((f) => f());
        }).catch(() => {});
    }

    let last = performance.now();
    let uiAcc = 1, saveAcc = 0;
    function updateLamps(dt) {
        const indoor = ctx.state.lights;
        const outdoor = W.env.night > 0.45;
        for (const l of W.lamps) {
            l.level = damp(l.level, (l.outdoor ? outdoor : indoor) ? 1 : 0, 5, dt);
            l.light.intensity = l.max * l.level;
            l.shade.emissive.setRGB(1, 0.78, 0.5).multiplyScalar(l.level * 0.85);
        }
    }
    function frame(now) {
        requestAnimationFrame(frame);
        const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
        last = now;
        ctx.tReal += dt;
        const dtGame = dt * ctx.state.speed;
        life.sim(dtGame);
        for (const a of ctx.agents) if (a.active) a.update(dtGame, dt);
        chatter.update(dt);
        ctx.ball.update(dtGame);
        updateLamps(dt);
        W.env.update(ctx.state.min, dt, ctx.tReal, camera, camera.position.distanceTo(controls.target));
        for (const u of W.updaters) u(dt, dtGame);
        ctx.fx.update(dt);
        updateCamera(dt);
        controls.update();
        renderer.render(scene, camera);
        uiAcc += dt;
        if (uiAcc > 0.25) {
            uiAcc = 0;
            ctx.ui.update();
        }
        saveAcc += dt;
        if (saveAcc > 5) {
            saveAcc = 0;
            saveState();
        }
    }
    requestAnimationFrame((t) => {
        last = t;
        frame(t);
        document.getElementById('loading').classList.add('hide');
    });

    if (/[?&]debug\b/.test(location.search)) window.__ouchi = { ctx, life, family, chatter, home };

    try {
        if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
            navigator.serviceWorker.register('sw.js').catch(() => {});
        }
    } catch {
        // サンドボックス内などで使えないときは、オフライン対応なしで動かす
    }
}

boot();
