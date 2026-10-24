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

const row = (y, x0, x1, c) => Array.from({ length: x1 - x0 + 1 }, (_, i) => [x0 + i, y, c]);

// ドット絵のみんな（14×12マス。体は CLAWD_SPRITE を2マス下げて描き、上の2マスは耳・アンテナ・髪の毛用）
export const SPRITES = {
    km: {
        body: '#ff78bb', eye: '#3a2236',
        acc: [[8, 0, '#b9a0f5'], [10, 0, '#b9a0f5'], [8, 1, '#b9a0f5'], [9, 1, '#9b82e8'], [10, 1, '#b9a0f5'],
            [3, 5, '#ff4a9b'], [10, 5, '#ff4a9b'], [5, 8, '#fff2f8'], [7, 8, '#fff2f8'], [6, 9, '#fff2f8']],
    },
    mano: { body: '#8fdfbb', eye: '#24332c', acc: [...row(1, 2, 11, '#ffd0e4'), [1, 3, '#ff7fb5'], [1, 4, '#ff7fb5'], [12, 3, '#ff7fb5'], [12, 4, '#ff7fb5']] },
    kuromi: { body: '#54447a', eye: '#fff0fa', acc: [[4, 0, '#ffd84d'], [4, 1, '#cfc3f0'], [1, 6, '#2d2752'], [12, 6, '#2d2752'], [1, 7, '#2d2752'], [12, 7, '#2d2752']] },
    mikanyan: { body: '#ffb36b', eye: '#3a2a22', acc: [[2, 1, '#ffb36b'], [3, 1, '#ffb36b'], [2, 0, '#ffb36b'], [10, 1, '#ffb36b'], [11, 1, '#ffb36b'], [11, 0, '#ffb36b'], [6, 0, '#ffd66b'], [7, 0, '#ffd66b']] },
    nee: { body: '#ff9fd0', eye: '#4a2b34', acc: [...row(1, 2, 11, '#ffc3e3'), [1, 2, '#ffc3e3'], [12, 2, '#ffc3e3'], ...row(8, 2, 11, '#cdb9f4')] },
};

export function drawChar(g, x, y, px, sp) {
    drawSprite(g, x, y + 2 * px, px, sp.body, sp.eye);
    for (const [ax, ay, c] of sp.acc) {
        g.fillStyle = c;
        g.fillRect(x + ax * px, y + ay * px, px, px);
    }
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

// ── まのが描いてくれる絵（額縁とアルバムに飾る）──
const DRAW_BG = ['#ffe3f1', '#e6f7ef', '#ece6ff', '#fff3d6', '#e3f1ff'];
const DRAW_FG = ['#ff86c2', '#ff86c2', '#8fdfbb', '#ffb36b', '#54447a'];
const FAMILY_COLS = ['#ff86c2', '#8fdfbb', '#8a74c8', '#ffb36b', '#ffd56b'];
const PETALS = ['#ff8cc6', '#b9a2f0', '#ffffff', '#ffd56b', '#ff6b8f'];

// 同じ絵はいつ描いても同じになるように、番号から決まる乱数
function seeded(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function vgrad(g, top, bottom) {
    const gr = g.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, top);
    gr.addColorStop(1, bottom);
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
}

function heart(g, x, y, s, c) {
    g.fillStyle = c;
    heartPath(g, x, y, s);
    g.fill();
}

function twinkle(g, x, y, r, c) {
    const k = r * 0.2;
    g.fillStyle = c;
    g.beginPath();
    g.moveTo(x, y - r);
    g.quadraticCurveTo(x + k, y - k, x + r, y);
    g.quadraticCurveTo(x + k, y + k, x, y + r);
    g.quadraticCurveTo(x - k, y + k, x - r, y);
    g.quadraticCurveTo(x - k, y - k, x, y - r);
    g.fill();
}

function disc(g, x, y, r, c) {
    g.fillStyle = c;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
}

function moon(g, x, y, r, c) {
    const m = makeCanvas(r * 2 + 2, r * 2 + 2);
    const mg = m.getContext('2d');
    disc(mg, r + 1, r + 1, r, c);
    mg.globalCompositeOperation = 'destination-out';
    disc(mg, r + 1 + r * 0.5, r + 1 - r * 0.3, r * 0.85, '#000');
    g.drawImage(m, x - r - 1, y - r - 1);
}

function note(g, x, y, c) {
    g.fillStyle = c;
    g.beginPath();
    g.ellipse(x, y, 4, 3, -0.4, 0, Math.PI * 2);
    g.fill();
    g.fillRect(x + 2.5, y - 13, 2, 13);
    g.fillRect(x + 2.5, y - 13, 6, 2);
}

function cherry(g, x, y) {
    g.strokeStyle = '#5f9a4a';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(x - 5, y);
    g.quadraticCurveTo(x - 3, y - 9, x + 1, y - 12);
    g.moveTo(x + 5, y + 1);
    g.quadraticCurveTo(x + 3, y - 8, x + 1, y - 12);
    g.stroke();
    g.fillStyle = '#7cc47c';
    g.beginPath();
    g.ellipse(x + 5, y - 12, 4.5, 2.2, -0.5, 0, Math.PI * 2);
    g.fill();
    disc(g, x - 5, y, 5, '#e8304f');
    disc(g, x + 5, y + 1, 5, '#e8304f');
    disc(g, x - 6.5, y - 1.5, 1.6, 'rgba(255,255,255,0.8)');
    disc(g, x + 3.5, y - 0.5, 1.6, 'rgba(255,255,255,0.8)');
}

function flower(g, x, y, c) {
    g.fillStyle = '#6fb86f';
    g.fillRect(x - 1, y, 2, 14);
    for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        disc(g, x + Math.cos(a) * 4.5, y + Math.sin(a) * 4.5, 3.8, c);
    }
    disc(g, x, y, 3, '#ffd56b');
}

function steam(g, x, y) {
    g.strokeStyle = 'rgba(255,255,255,0.85)';
    g.lineWidth = 3;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x, y);
    g.bezierCurveTo(x - 6, y - 6, x + 6, y - 10, x, y - 18);
    g.stroke();
}

function scatter(g, rnd, n, fn, y1 = 120) {
    for (let i = 0; i < n; i++) fn(8 + rnd() * 112, 8 + rnd() * (y1 - 8), i);
}

const PAINT = {
    // むかしの絵（番号で色が変わる）
    classic(g, n) {
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
    },
    km(g, n, rnd) {
        vgrad(g, '#ffecf6', '#ffd2e9');
        scatter(g, rnd, 7, (x, y) => heart(g, x, y, 9 + rnd() * 8, 'rgba(255,255,255,0.8)'));
        drawChar(g, 22, 32, 6, SPRITES.km);
        heart(g, 104, 24, 20, '#ff5fa2');
        twinkle(g, 22, 22, 9, '#ffd56b');
    },
    // ふたりで手をつないで
    mano(g, n, rnd) {
        vgrad(g, '#e2f8ee', '#ffe1ef');
        scatter(g, rnd, 6, (x, y) => heart(g, x, y, 8 + rnd() * 6, 'rgba(255,255,255,0.85)'), 60);
        drawChar(g, 8, 62, 4, SPRITES.km);
        drawChar(g, 64, 62, 4, SPRITES.mano);
        heart(g, 64, 38, 24, '#ff6fae');
        note(g, 24, 34, '#33b583');
        note(g, 98, 28, '#ff7fb5');
    },
    kuromi(g, n, rnd) {
        vgrad(g, '#4b3d8c', '#d6c6f4');
        scatter(g, rnd, 14, (x, y, i) => twinkle(g, x, y, 2.5 + rnd() * 4, i % 3 ? '#fff6c8' : '#ffffff'), 70);
        moon(g, 104, 24, 11, '#ffe9a8');
        g.fillStyle = '#bba8ea';
        g.beginPath();
        g.ellipse(64, 128, 90, 22, 0, 0, Math.PI * 2);
        g.fill();
        drawChar(g, 8, 62, 4, SPRITES.km);
        drawChar(g, 64, 62, 4, SPRITES.kuromi);
    },
    mikanyan(g, n, rnd) {
        vgrad(g, '#fff6df', '#ffe0c6');
        scatter(g, rnd, 5, (x, y) => {
            disc(g, x, y, 4, '#ffd3a6');
            [-5, 0, 5].forEach((dx) => disc(g, x + dx, y - 6, 2, '#ffd3a6'));
        }, 56);
        g.strokeStyle = '#f0a040';
        g.lineWidth = 3;
        [-7, 7].forEach((dx) => { g.beginPath(); g.arc(64 + dx, 34, 7, 0, Math.PI * 2); g.stroke(); });
        drawChar(g, 8, 62, 4, SPRITES.km);
        drawChar(g, 64, 62, 4, SPRITES.mikanyan);
    },
    // おねえちゃんは、ひとまわり大きく
    nee(g, n, rnd) {
        vgrad(g, '#ffe7f4', '#ece2ff');
        scatter(g, rnd, 6, (x, y) => heart(g, x, y, 8 + rnd() * 6, 'rgba(255,255,255,0.85)'), 50);
        g.fillStyle = '#ffffff';
        roundRect(g, 14, 16, 26, 30, 4); g.fill();
        g.fillStyle = '#ff6bae';
        roundRect(g, 14, 16, 26, 9, 4); g.fill();
        heart(g, 27, 36, 9, '#ff8cc6');
        drawChar(g, 4, 66, 4, SPRITES.km);
        drawChar(g, 58, 54, 5, SPRITES.nee);
    },
    // ソルフェジオファミリーみんな（みんなの色のにじの下で）
    family(g, n, rnd) {
        vgrad(g, '#fff8fc', '#efe8ff');
        g.lineWidth = 6;
        FAMILY_COLS.forEach((c, i) => {
            g.strokeStyle = c;
            g.globalAlpha = 0.6;
            g.beginPath();
            g.arc(64, 84, 60 - i * 6, Math.PI, Math.PI * 2);
            g.stroke();
        });
        g.globalAlpha = 1;
        scatter(g, rnd, 6, (x, y, i) => twinkle(g, x, y, 3 + rnd() * 3, FAMILY_COLS[i % 5]), 40);
        drawChar(g, 22, 50, 3, SPRITES.kuromi);
        drawChar(g, 64, 50, 3, SPRITES.mikanyan);
        drawChar(g, 1, 86, 3, SPRITES.mano);
        drawChar(g, 43, 86, 3, SPRITES.km);
        drawChar(g, 85, 86, 3, SPRITES.nee);
    },
    cherry(g, n, rnd) {
        vgrad(g, '#fff0f5', '#e8f7e3');
        [[20, 26], [106, 22], [16, 104], [110, 100], [64, 18]].forEach(([x, y]) => cherry(g, x + rnd() * 6 - 3, y + rnd() * 6 - 3));
        drawChar(g, 29, 40, 5, SPRITES.km);
    },
    flower(g, n, rnd) {
        vgrad(g, '#dff1ff', '#f4fff1');
        g.fillStyle = '#c4eab5';
        g.fillRect(0, 102, 128, 26);
        for (let i = 0; i < 6; i++) flower(g, 10 + i * 21.5, 100 + (i % 2) * 6, PETALS[(i + n) % 5]);
        drawChar(g, 29, 34, 5, SPRITES.km);
        disc(g, 104, 30, 3, '#ffb3d4');
        disc(g, 110, 30, 3, '#ffb3d4');
        twinkle(g, 20, 22, 7, '#ffd56b');
    },
    onsen(g, n, rnd) {
        vgrad(g, '#ebe4ff', '#d3ecff');
        [30, 64, 98].forEach((x) => steam(g, x + rnd() * 8 - 4, 30));
        drawChar(g, 22, 34, 6, SPRITES.km);
        g.fillStyle = '#9ee6e3';
        g.fillRect(0, 82, 128, 46);
        g.fillStyle = 'rgba(255,255,255,0.55)';
        g.fillRect(10, 86, 30, 3);
        g.fillRect(78, 92, 36, 3);
        for (let i = 0; i < 7; i++) disc(g, 4 + i * 20, 122, 9, i % 2 ? '#bab4c8' : '#a9a3b9');
    },
    star(g, n, rnd) {
        vgrad(g, '#1f1a44', '#5a4a9a');
        scatter(g, rnd, 22, (x, y, i) => twinkle(g, x, y, 1.5 + rnd() * 3.5, i % 4 ? '#fff6c8' : '#cdb9ff'), 90);
        moon(g, 26, 24, 12, '#ffe9a8');
        g.strokeStyle = 'rgba(255,240,200,0.9)';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(84, 16);
        g.lineTo(112, 30);
        g.stroke();
        twinkle(g, 112, 30, 5, '#fff6c8');
        g.fillStyle = '#3a3170';
        g.beginPath();
        g.ellipse(64, 132, 96, 28, 0, 0, Math.PI * 2);
        g.fill();
        drawChar(g, 29, 52, 5, SPRITES.km);
    },
};

const ART_SEED = Object.keys(PAINT);

// subj はなんの絵か（ないときは、むかしの絵）
export function paintDrawing(g, n, subj) {
    const id = PAINT[subj] ? subj : 'classic';
    g.save();
    PAINT[id](g, n, seeded(n * 7919 + ART_SEED.indexOf(id) * 104729 + 17));
    g.restore();
}

export function drawingTexture(n, subj) {
    const c = makeCanvas(128, 128);
    paintDrawing(c.getContext('2d'), n, subj);
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

// きらっと光る4つ角の星（まんなかは白、まわりはその色でぼんやり光る）。昼の空でも見えるように
export function sparkleTexture(color) {
    const c = makeCanvas(64, 64);
    const g = c.getContext('2d');
    const glow = g.createRadialGradient(32, 32, 0, 32, 32, 30);
    glow.addColorStop(0, color);
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    g.globalAlpha = 0.55;
    g.fillStyle = glow;
    g.fillRect(0, 0, 64, 64);
    g.globalAlpha = 1;
    const core = g.createRadialGradient(32, 32, 0, 32, 32, 26);
    core.addColorStop(0, '#ffffff');
    core.addColorStop(0.35, '#ffffff');
    core.addColorStop(1, color);
    g.fillStyle = core;
    g.beginPath();
    [[32, 3], [36.5, 27.5], [61, 32], [36.5, 36.5], [32, 61], [27.5, 36.5], [3, 32], [27.5, 27.5]]
        .forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.fill();
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
