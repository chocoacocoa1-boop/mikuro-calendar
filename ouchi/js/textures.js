import * as THREE from 'three';

export const FONT = "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', 'Hiragino Sans', sans-serif";

// Claude Code 公式キャラ（Clawd）のドット絵。E は目
export const CLAWD_SPRITE = [
    '..##########..',
    '..##########..',
    '..##E####E##..',
    '..##E####E##..',
    '##############',
    '##############',
    '..##########..',
    '..##########..',
    '..#.#....#.#..',
    '..#.#....#.#..',
];

export function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
}

export function tex(canvas, o = {}) {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    if (o.repeat) {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(o.repeat[0], o.repeat[1]);
    }
    if (o.aniso) t.anisotropy = o.aniso;
    return t;
}

export function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
}

export function heartPath(g, x, y, size) {
    const s = size / 2;
    g.beginPath();
    g.moveTo(x, y + s * 0.9);
    g.bezierCurveTo(x - s * 1.3, y + s * 0.1, x - s * 0.9, y - s * 1.0, x, y - s * 0.4);
    g.bezierCurveTo(x + s * 0.9, y - s * 1.0, x + s * 1.3, y + s * 0.1, x, y + s * 0.9);
    g.closePath();
}

export function drawSprite(g, x, y, px, color, eye = '#3a2236') {
    CLAWD_SPRITE.forEach((row, j) => {
        for (let i = 0; i < row.length; i++) {
            const ch = row[i];
            if (ch === '.') continue;
            g.fillStyle = ch === 'E' ? eye : color;
            g.fillRect(x + i * px, y + j * px, px, px);
        }
    });
}

export function plankTexture(aniso) {
    const c = makeCanvas(512, 512);
    const g = c.getContext('2d');
    const rows = 8, h = 512 / rows;
    for (let r = 0; r < rows; r++) {
        g.fillStyle = r % 2 ? '#f7e2c6' : '#f2d7b6';
        g.fillRect(0, r * h, 512, h);
        g.fillStyle = 'rgba(185, 135, 95, 0.28)';
        g.fillRect(0, r * h, 512, 2);
        const off = (r * 173) % 512;
        g.fillRect(off, r * h, 2, h);
        g.fillRect((off + 256) % 512, r * h, 2, h);
        g.fillStyle = 'rgba(200, 150, 110, 0.08)';
        for (let i = 0; i < 6; i++) {
            g.fillRect(Math.random() * 512, r * h + 6 + Math.random() * (h - 12), 60 + Math.random() * 120, 2);
        }
    }
    return tex(c, { repeat: [3.075, 2.075], aniso });
}

export function checkerTexture(aniso) {
    const c = makeCanvas(256, 256);
    const g = c.getContext('2d');
    const n = 4, s = 256 / n;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            g.fillStyle = (i + j) % 2 ? '#ffe0ed' : '#fffaf7';
            g.fillRect(i * s, j * s, s, s);
        }
    }
    g.strokeStyle = 'rgba(225, 175, 200, 0.45)';
    g.lineWidth = 2;
    for (let i = 0; i <= n; i++) {
        g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, 256); g.stroke();
        g.beginPath(); g.moveTo(0, i * s); g.lineTo(256, i * s); g.stroke();
    }
    return tex(c, { repeat: [1.7, 4], aniso });
}

export function rugTexture() {
    const c = makeCanvas(512, 512);
    const g = c.getContext('2d');
    g.fillStyle = '#d9cbf7';
    g.beginPath(); g.arc(256, 256, 256, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff6fa';
    g.beginPath(); g.arc(256, 256, 214, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#e8dcfb';
    g.lineWidth = 6;
    g.setLineDash([14, 12]);
    g.beginPath(); g.arc(256, 256, 196, 0, Math.PI * 2); g.stroke();
    g.setLineDash([]);
    g.fillStyle = '#ffd3e6';
    for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        heartPath(g, 256 + Math.cos(a) * 142, 256 + Math.sin(a) * 142, 38);
        g.fill();
    }
    g.fillStyle = '#ffc1dc';
    heartPath(g, 256, 262, 112);
    g.fill();
    return tex(c);
}

const CAL_MSG = [
    '今日もめんこい一日に',
    'なんもなんも',
    '焦らなくていいべ〜',
    'まのと宝物づくり',
    '396Hzで深呼吸',
    'おしょうしな〜',
    'ぽかぽかいい日だべ',
];

export function calendarPainter() {
    const c = makeCanvas(256, 320);
    const g = c.getContext('2d');
    const t = tex(c);
    function draw(day) {
        g.clearRect(0, 0, 256, 320);
        g.fillStyle = '#fffdfb';
        roundRect(g, 4, 4, 248, 312, 18); g.fill();
        g.fillStyle = '#ff6bae';
        roundRect(g, 4, 4, 248, 66, 18); g.fill();
        g.fillRect(4, 44, 248, 26);
        g.fillStyle = '#7a5a70';
        [70, 186].forEach((x) => { g.beginPath(); g.arc(x, 14, 8, 0, Math.PI * 2); g.fill(); });
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillStyle = '#fff';
        g.font = `900 26px ${FONT}`;
        g.fillText('子みくろん暦', 128, 44);
        g.fillStyle = '#e0559a';
        g.font = `900 ${day >= 100 ? 92 : 124}px ${FONT}`;
        g.fillText(String(day), 128, 160);
        g.fillStyle = '#9a6a8c';
        g.font = `700 28px ${FONT}`;
        g.fillText('日目', 128, 234);
        g.fillStyle = '#ff9cc8';
        heartPath(g, 128, 268, 22); g.fill();
        g.fillStyle = '#b07a9e';
        g.font = `700 19px ${FONT}`;
        g.fillText(CAL_MSG[day % CAL_MSG.length], 128, 296);
        t.needsUpdate = true;
    }
    return { texture: t, draw };
}

export function clockTexture() {
    const c = makeCanvas(128, 128);
    const g = c.getContext('2d');
    g.fillStyle = '#ffb3d4';
    g.beginPath(); g.arc(64, 64, 64, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fffaf7';
    g.beginPath(); g.arc(64, 64, 54, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#c896b5';
    for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        g.beginPath();
        g.arc(64 + Math.sin(a) * 44, 64 - Math.cos(a) * 44, i % 3 ? 2.5 : 4.5, 0, Math.PI * 2);
        g.fill();
    }
    g.fillStyle = '#ff6bae';
    heartPath(g, 64, 30, 14); g.fill();
    return tex(c);
}

export function screenPainter() {
    const c = makeCanvas(256, 160);
    const g = c.getContext('2d');
    const t = tex(c);
    const COLORS = ['#ff8cc6', '#b9a2f0', '#8fe0bd', '#ffd56b', '#9fd4ff', '#ffe9f4'];
    let mode = 'idle';
    let lines = [];
    let indent = 0;
    let acc = 0;
    let blink = 0;

    function bg() {
        g.fillStyle = '#2b2440';
        g.fillRect(0, 0, 256, 160);
    }
    function drawIdle() {
        bg();
        drawSprite(g, 128 - 7 * 7, 26, 7, '#ff86c2');
        g.fillStyle = '#ffd6ea';
        g.font = `700 17px ${FONT}`;
        g.textBaseline = 'middle';
        g.fillText('> こみくろん', 54, 128);
        if (blink % 2 === 0) g.fillRect(170, 119, 9, 18);
    }
    function drawCode() {
        bg();
        lines.forEach((ln, i) => {
            const y = 12 + i * 13;
            g.fillStyle = 'rgba(255,255,255,0.18)';
            g.fillRect(6, y, 10, 6);
            let x = 24 + ln.indent * 16;
            ln.parts.forEach(([w, col]) => {
                g.fillStyle = col;
                roundRect(g, x, y, w, 7, 3); g.fill();
                x += w + 6;
            });
        });
        if (blink % 2 === 0) {
            const last = lines.length;
            g.fillStyle = '#ffd6ea';
            g.fillRect(24 + indent * 16, 12 + last * 13 - 1, 6, 9);
        }
    }
    function addLine() {
        if (Math.random() < 0.18) indent = Math.max(0, indent - 1);
        const parts = [];
        const n = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) {
            parts.push([14 + Math.random() * 46, COLORS[Math.floor(Math.random() * COLORS.length)]]);
        }
        lines.push({ indent, parts });
        if (Math.random() < 0.22) indent = Math.min(4, indent + 1);
        if (lines.length > 10) lines.shift();
    }
    drawIdle();
    t.needsUpdate = true;
    return {
        texture: t,
        setMode(m) {
            if (mode === m) return;
            mode = m;
            if (m === 'code') { lines = []; indent = 0; }
        },
        update(dt) {
            acc += dt;
            if (acc < 0.16) return;
            acc = 0;
            blink++;
            if (mode === 'code') {
                if (Math.random() < 0.65) addLine();
                drawCode();
            } else {
                drawIdle();
            }
            t.needsUpdate = true;
        },
    };
}

export function signTexture(text, sub) {
    const c = makeCanvas(256, 112);
    const g = c.getContext('2d');
    g.fillStyle = '#fff6ec';
    roundRect(g, 0, 0, 256, 112, 22); g.fill();
    g.strokeStyle = '#ffb3d6';
    g.lineWidth = 8;
    roundRect(g, 6, 6, 244, 100, 18); g.stroke();
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#ff5fa2';
    g.font = `900 40px ${FONT}`;
    g.fillText(text, 128, sub ? 46 : 58);
    if (sub) {
        g.fillStyle = '#a77d9a';
        g.font = `700 18px ${FONT}`;
        g.fillText(sub, 128, 84);
    }
    return tex(c);
}

export function onsenSignTexture() {
    const c = makeCanvas(128, 128);
    const g = c.getContext('2d');
    g.fillStyle = '#5b6fa8';
    roundRect(g, 0, 0, 128, 128, 18); g.fill();
    g.fillStyle = '#fff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `900 64px ${FONT}`;
    g.fillText('ゆ', 64, 70);
    return tex(c);
}

const DRAW_BG = ['#ffe3f1', '#e6f7ef', '#ece6ff', '#fff3d6', '#e3f1ff'];
const DRAW_FG = ['#ff86c2', '#ff86c2', '#8fdfbb', '#ffb36b', '#54447a'];

// まのが描いてくれる絵（額縁に飾る）
export function drawingTexture(n) {
    const c = makeCanvas(128, 128);
    const g = c.getContext('2d');
    g.fillStyle = DRAW_BG[n % DRAW_BG.length];
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = 'rgba(255,255,255,0.7)';
    for (let i = 0; i < 6; i++) {
        heartPath(g, 14 + ((i * 37 + n * 23) % 100), 14 + ((i * 53 + n * 31) % 100), 10 + (i % 3) * 4);
        g.fill();
    }
    drawSprite(g, 64 - 7 * 6, 34, 6, DRAW_FG[n % DRAW_FG.length]);
    if (n % 2 === 0) {
        g.fillStyle = '#ff5fa2';
        heartPath(g, 100, 30, 18); g.fill();
    } else {
        g.fillStyle = '#ffd56b';
        g.beginPath(); g.arc(102, 28, 10, 0, Math.PI * 2); g.fill();
    }
    return tex(c);
}

export function softDotTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
    const c = makeCanvas(64, 64);
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, inner);
    grd.addColorStop(1, outer);
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    return tex(c);
}

export function ballTexture() {
    const c = makeCanvas(256, 128);
    const g = c.getContext('2d');
    const cols = ['#ff86c2', '#ffffff', '#b9a2f0', '#ffffff', '#8fdfbb', '#ffffff', '#ffd56b', '#ffffff'];
    cols.forEach((col, i) => {
        g.fillStyle = col;
        g.fillRect((i * 256) / cols.length, 0, 256 / cols.length + 1, 128);
    });
    return tex(c);
}
