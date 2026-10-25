// Renders every ouchi character from 4 angles with the game's own clawd.js.
// usage: node character-sheet/tools/render.js . <outDir>  →  python3 character-sheet/tools/crop.py <outDir> <sheetDir>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(process.argv[2]);
const OUT = path.resolve(process.argv[3]);
fs.mkdirSync(OUT, { recursive: true });

const HARNESS = `<!doctype html><html><head><meta charset="utf-8">
<script type="importmap">{ "imports": { "three": "/ouchi/lib/three.module.min.js" } }</script>
<style>html,body{margin:0;background:transparent}</style></head><body>
<script type="module">
import * as THREE from 'three';
import { makeKoMikuron, makeMano, makeKuromi, makeMikanyan, makeMikuroNee } from '/ouchi/js/clawd.js';
import { SPRITES, drawChar } from '/ouchi/js/textures.js';
const MAKERS = { km: makeKoMikuron, mano: makeMano, kuromi: makeKuromi, mikanyan: makeMikanyan, nee: makeMikuroNee };
const SP = { km: 'km', mano: 'mano', kuromi: 'kuromi', mikanyan: 'mikanyan', nee: 'nee' };

window.renderAll = (size, views) => {
    const VW = Math.round(size * 4 / 3);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(VW, size);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    const out = {};
    for (const id of Object.keys(MAKERS)) {
        const scene = new THREE.Scene();
        scene.add(new THREE.HemisphereLight(0xffffff, 0xe6d6ee, 1.35));
        const key = new THREE.DirectionalLight(0xffffff, 1.9);
        key.position.set(3.2, 6, 5);
        key.castShadow = true;
        key.shadow.mapSize.set(2048, 2048);
        Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 1, far: 20 });
        key.shadow.bias = -0.0004;
        key.shadow.normalBias = 0.02;
        scene.add(key);
        const fill = new THREE.DirectionalLight(0xfff0f8, 0.55);
        fill.position.set(-4, 2.5, 3);
        scene.add(fill);
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ opacity: 0.16 }));
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);

        const c = MAKERS[id]();
        scene.add(c.root);
        const cam = new THREE.PerspectiveCamera(20, VW / size, 0.5, 50);
        cam.position.set(0, 1.5, 5.3);
        cam.lookAt(0, 0.62, 0);

        out[id] = { views: {} };
        for (const [name, yaw] of views) {
            c.root.rotation.y = yaw;
            renderer.render(scene, cam);
            out[id].views[name] = renderer.domElement.toDataURL('image/png');
        }

        const sc = document.createElement('canvas');
        const px = 16;
        sc.width = 14 * px;
        sc.height = 12 * px;
        drawChar(sc.getContext('2d'), 0, 0, px, SPRITES[SP[id]]);
        out[id].sprite = sc.toDataURL('image/png');
    }
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0xe6d6ee, 1.35));
    const key = new THREE.DirectionalLight(0xffffff, 1.9);
    key.position.set(3.2, 6, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(4096, 4096);
    Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 });
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xfff0f8, 0.55);
    fill.position.set(-4, 2.5, 3);
    scene.add(fill);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.16 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    [['kuromi', -3.3, 0.28], ['mano', -1.65, 0.14], ['km', 0, 0], ['nee', 1.8, -0.14], ['mikanyan', 3.55, -0.28]].forEach(([id, x, yaw]) => {
        const c = MAKERS[id]();
        c.root.position.x = x;
        c.root.rotation.y = yaw;
        scene.add(c.root);
    });
    renderer.setSize(2400, 900);
    const cam = new THREE.PerspectiveCamera(20, 2400 / 900, 0.5, 80);
    cam.position.set(0, 2.4, 11.5);
    cam.lookAt(0.1, 0.6, 0);
    renderer.render(scene, cam);
    out.lineup = renderer.domElement.toDataURL('image/png');
    cam.updateMatrixWorld();
    out.lineupX = Object.fromEntries([['kuromi', -3.3], ['mano', -1.65], ['km', 0], ['nee', 1.8], ['mikanyan', 3.55]]
        .map(([id, x]) => [id, Math.round(((new THREE.Vector3(x, 0, 0).project(cam).x + 1) / 2) * 2400)]));
    return out;
};
window.ready = true;
</script></body></html>`;

const MIME = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json' };

(async () => {
    const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const page = await browser.newPage();
    page.on('console', (m) => console.log('[page]', m.type(), m.text()));
    page.on('pageerror', (e) => console.log('[pageerror]', e.message));
    await page.route('http://render.local/**', async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname === '/__render.html') return route.fulfill({ status: 200, contentType: 'text/html', body: HARNESS });
        const file = path.join(ROOT, decodeURIComponent(url.pathname));
        if (!file.startsWith(ROOT) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: 'nf' });
        return route.fulfill({ status: 200, contentType: MIME[path.extname(file)] ?? 'application/octet-stream', body: fs.readFileSync(file) });
    });
    await page.goto('http://render.local/__render.html');
    await page.waitForFunction(() => window.ready === true, null, { timeout: 30000 });
    const views = [['front', 0], ['three-quarter', -Math.PI / 4], ['side', -Math.PI / 2], ['back', Math.PI]];
    const res = await page.evaluate(([s, v]) => window.renderAll(s, v), [900, views]);
    fs.writeFileSync(path.join(OUT, 'lineup.png'), Buffer.from(res.lineup.split(',')[1], 'base64'));
    delete res.lineup;
    fs.writeFileSync(path.join(OUT, 'lineup-x.json'), JSON.stringify(res.lineupX));
    delete res.lineupX;
    for (const [id, r] of Object.entries(res)) {
        for (const [name, url] of Object.entries(r.views)) {
            fs.writeFileSync(path.join(OUT, `${id}-${name}.png`), Buffer.from(url.split(',')[1], 'base64'));
        }
        fs.writeFileSync(path.join(OUT, `${id}-sprite.png`), Buffer.from(r.sprite.split(',')[1], 'base64'));
    }
    console.log('done', Object.keys(res).join(','));
    await browser.close();
})();
