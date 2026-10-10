import { ctx } from './ctx.js';
import { clockText, partOfDay } from './util.js';
import { CLAWD_SPRITE } from './textures.js';

const STATS = [
    ['onaka', 'おなか', '#f07b7b'],
    ['genki', 'げんき', '#f2c14e'],
    ['tanoshisa', 'たのしさ', '#7aa8f0'],
    ['kirakira', 'きらきら', '#b79cf0'],
    ['nakayoshi', 'なかよし', '#ff7eb8'],
];

function spriteSVG(sp) {
    const rects = [];
    CLAWD_SPRITE.forEach((row, j) => {
        for (let i = 0; i < row.length; i++) {
            const ch = row[i];
            if (ch === '.') continue;
            rects.push(`<rect x="${i}" y="${j + 2}" width="1.02" height="1.02" fill="${ch === 'E' ? sp.eye : sp.body}"/>`);
        }
    });
    for (const [x, y, c] of sp.acc) rects.push(`<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${c}"/>`);
    return `<svg viewBox="0 0 14 12" aria-hidden="true">${rects.join('')}</svg>`;
}

const FAM_BUTTON = {
    away: ['よぶ', '', false],
    arriving: ['むかってる…', 'bye', false],
    visiting: ['またね', 'bye', false],
    leaving: ['かえりみち…', 'bye', true],
};

export function createUI(h) {
    const $ = (id) => document.getElementById(id);
    const S = () => ctx.state;

    const bars = STATS.map(([key, label, color]) => {
        const row = document.createElement('div');
        row.className = 'row';
        row.innerHTML = '<span></span><div class="track"><div class="fill"></div></div><span class="num"></span>';
        row.children[0].textContent = label;
        const fill = row.querySelector('.fill');
        fill.style.background = color;
        $('bars').appendChild(row);
        return { key, fill, num: row.querySelector('.num'), last: -1 };
    });

    const speedBtns = [...document.querySelectorAll('#speed button')];
    const syncSpeed = () => speedBtns.forEach((b) => b.classList.toggle('on', Number(b.dataset.speed) === S().speed));
    speedBtns.forEach((b) => b.addEventListener('click', () => {
        S().speed = Number(b.dataset.speed);
        ctx.sound.pop();
        syncSpeed();
    }));
    syncSpeed();

    const soundBtn = $('btn-sound');
    const syncSound = () => { soundBtn.textContent = S().sound ? '🔔' : '🔕'; };
    soundBtn.addEventListener('click', () => {
        S().sound = !S().sound;
        ctx.sound.setEnabled(S().sound);
        syncSound();
        ctx.sound.pop();
    });
    syncSound();

    $('btn-home').addEventListener('click', h.home);
    $('btn-food').addEventListener('click', h.food);
    $('btn-ball').addEventListener('click', h.ball);
    $('btn-light').addEventListener('click', h.lights);
    const followBtn = $('btn-follow');
    const syncFollow = (on) => {
        followBtn.classList.toggle('on', on);
        followBtn.textContent = on ? '追うのをやめる' : '子みくろんを追う';
    };
    followBtn.addEventListener('click', () => syncFollow(h.follow()));

    const panel = $('panel');
    $('panel-handle').addEventListener('click', () => {
        $('panel-scroll').scrollTop = 0;
        panel.classList.toggle('collapsed');
    });
    panel.addEventListener('transitionend', h.layout);

    const famRows = ctx.family.rt.map((v) => {
        const row = document.createElement('div');
        row.className = 'fam';
        row.style.setProperty('--fc', v.def.color);
        row.innerHTML = `${spriteSVG(v.def.sprite)}<div><div class="nm"></div><div class="hz"></div></div><button></button>`;
        row.querySelector('.nm').textContent = v.def.name;
        row.querySelector('.hz').textContent = `${v.def.hz} ${v.def.emoji}`;
        const btn = row.querySelector('button');
        btn.addEventListener('click', () => {
            if (v.state === 'away') h.invite(v.def.id);
            else if (v.state === 'arriving' || v.state === 'visiting') h.leave(v.def.id);
        });
        $('family').appendChild(row);
        return { v, row, btn, last: '' };
    });

    $('talk').addEventListener('submit', (e) => {
        e.preventDefault();
        const inp = $('talk-input');
        h.talk(inp.value);
        inp.value = '';
        inp.blur();
    });

    const resetBtn = $('btn-reset');
    let armedAt = -1e9;
    resetBtn.addEventListener('click', () => {
        if (performance.now() - armedAt < 3500) {
            h.reset();
            return;
        }
        armedAt = performance.now();
        resetBtn.classList.add('armed');
        resetBtn.textContent = 'ほんとに消す？もう一度タップで消えるよ';
        setTimeout(() => {
            resetBtn.classList.remove('armed');
            resetBtn.textContent = '記録を消して最初から';
        }, 3500);
    });

    const diaryEl = $('diary');
    function renderDiary() {
        diaryEl.textContent = '';
        let lastDay = null;
        for (const e of S().diary) {
            if (e.d !== lastDay) {
                lastDay = e.d;
                const li = document.createElement('li');
                li.className = 'day';
                li.textContent = `― ${e.d}日目 ―`;
                diaryEl.appendChild(li);
            }
            const li = document.createElement('li');
            const t = document.createElement('span');
            t.className = 't';
            t.textContent = clockText(e.m);
            const tx = document.createElement('span');
            tx.textContent = e.t;
            li.append(t, tx);
            diaryEl.appendChild(li);
        }
    }

    let dirty = true;
    let lastCounters = '';
    const clockEl = $('clock'), nowEl = $('now'), countersEl = $('counters');

    return {
        diaryDirty() { dirty = true; },
        syncFollow,
        update() {
            const s = S();
            clockEl.textContent = `${s.day}日目 ${clockText(s.min)}（${partOfDay(s.min)}）`;
            const label = ctx.km.label || '…';
            if (nowEl.textContent !== label) nowEl.textContent = label;
            for (const b of bars) {
                const v = Math.round(s.stats[b.key]);
                if (v === b.last) continue;
                b.last = v;
                b.fill.style.width = `${v}%`;
                b.num.textContent = v;
            }
            const items = [
                ['コミット', s.commits],
                ['花', `${s.flowers.filter((f) => f.g >= 3).length}/5`],
                ['さくらんぼ', s.cherries],
                ['共鳴', s.resonance],
            ];
            const key = items.map((i) => i.join()).join('|');
            if (key !== lastCounters) {
                lastCounters = key;
                countersEl.textContent = '';
                for (const [name, val] of items) {
                    const span = document.createElement('span');
                    const b = document.createElement('b');
                    b.textContent = val;
                    span.append(`${name} `, b);
                    countersEl.appendChild(span);
                }
            }
            for (const r of famRows) {
                const st = r.v.state;
                if (st === r.last) continue;
                r.last = st;
                const [text, cls, disabled] = FAM_BUTTON[st];
                r.btn.textContent = text;
                r.btn.className = cls;
                r.btn.disabled = disabled;
                r.row.classList.toggle('here', st === 'visiting' || st === 'arriving');
            }
            if (dirty) {
                dirty = false;
                renderDiary();
            }
        },
    };
}
