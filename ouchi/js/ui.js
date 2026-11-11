import { ctx } from './ctx.js';
import { clockText, partOfDay } from './util.js';
import { CLAWD_SPRITE, SPRITES, paintDrawing } from './textures.js';
import { ART, DOG } from './lines.js';

const STATS = [
    ['onaka', 'おなか', '#f07b7b'],
    ['genki', 'げんき', '#f2c14e'],
    ['tanoshisa', 'たのしさ', '#7aa8f0'],
    ['kirakira', 'きらきら', '#b79cf0'],
    ['nakayoshi', 'なかよし', '#ff7eb8'],
];

function spriteSVG(sp) {
    const rects = [];
    (sp.shape ?? CLAWD_SPRITE).forEach((row, j) => {
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

    // マロン（いっしょに暮らしている子）
    const dogRow = document.createElement('div');
    dogRow.className = 'fam dog';
    dogRow.style.setProperty('--fc', DOG.color);
    dogRow.innerHTML = `${spriteSVG(SPRITES.dog)}<div><div class="nm"></div><div class="hz"></div><div class="dl"></div></div><button>おやつ🦴</button>`;
    dogRow.querySelector('.nm').textContent = DOG.name;
    dogRow.querySelector('.hz').textContent = `${DOG.emoji} いっしょに暮らしてる`;
    const dogLabel = dogRow.querySelector('.dl');
    dogRow.querySelector('button').addEventListener('click', h.treat);
    $('housemate').appendChild(dogRow);

    // 泊まる人の「またね」は、押しまちがいよけに2回タップで
    let sureId = null, sureTimer = 0;
    const famRows = ctx.family.rt.map((v) => {
        const row = document.createElement('div');
        row.className = 'fam';
        row.style.setProperty('--fc', v.def.color);
        row.innerHTML = `${spriteSVG(v.def.sprite)}<div><div class="nm"></div><div class="hz"></div></div><div class="acts"><button class="stay" hidden>🌙お泊まり</button><button class="main"></button></div>`;
        row.querySelector('.nm').textContent = v.def.name;
        row.querySelector('.hz').textContent = `${v.def.hz} ${v.def.emoji}${v.def.sky ? ' お星様の猫神さま✨' : ''}`;
        const btn = row.querySelector('button.main');
        const stayBtn = row.querySelector('button.stay');
        const r = { v, row, btn, stayBtn, last: '' };
        btn.addEventListener('click', () => {
            if (v.state === 'away') {
                h.invite(v.def.id);
                return;
            }
            if (v.state !== 'arriving' && v.state !== 'visiting') return;
            if (v.stay && sureId !== v.def.id) {
                sureId = v.def.id;
                r.last = '';
                ctx.fx.toast(`もう一度タップで、${v.def.name}に帰ってもらうよ（お泊まりは、またこんど）`, 3.5);
                clearTimeout(sureTimer);
                sureTimer = setTimeout(() => {
                    sureId = null;
                    r.last = '';
                }, 3500);
                return;
            }
            sureId = null;
            h.leave(v.def.id);
        });
        stayBtn.addEventListener('click', () => h.stay(v.def.id));
        $('family').appendChild(row);
        return r;
    });
    const stayHint = $('stay-hint');

    const talkForm = $('talk');
    const talkInput = $('talk-input');
    const talkPlaceholder = talkInput.placeholder;
    talkForm.addEventListener('submit', (e) => {
        e.preventDefault();
        h.talk(talkInput.value);
        talkInput.value = '';
        talkInput.blur();
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

    // 日記：いちばん新しい日だけひらいておいて、前の日はたたむ（タップで開け閉め）
    const diaryEl = $('diary');
    const opened = new Map();
    function renderDiary() {
        diaryEl.textContent = '';
        const days = [];
        for (const e of S().diary) {
            const g = days[days.length - 1];
            if (g?.d === e.d) g.list.push(e);
            else days.push({ d: e.d, list: [e] });
        }
        days.forEach((g, i) => {
            const open = opened.get(g.d) ?? i === 0;
            const head = document.createElement('li');
            head.className = 'day';
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.setAttribute('aria-expanded', String(open));
            const fold = document.createElement('span');
            fold.className = 'fold';
            fold.textContent = open ? '▴' : `▾ ${g.list.length}こ`;
            btn.append(`― ${g.d}日目 ―`, fold);
            btn.addEventListener('click', () => {
                opened.set(g.d, !open);
                renderDiary();
            });
            head.appendChild(btn);
            diaryEl.appendChild(head);
            if (!open) return;
            for (const e of g.list) {
                const li = document.createElement('li');
                const t = document.createElement('span');
                t.className = 't';
                t.textContent = clockText(e.m);
                const tx = document.createElement('span');
                tx.textContent = e.t;
                if (e.n > 1) {
                    const n = document.createElement('b');
                    n.className = 'times';
                    n.textContent = `×${e.n}`;
                    tx.append(n);
                }
                li.append(t, tx);
                diaryEl.appendChild(li);
            }
        });
    }

    // まのの絵のアルバム（かべに飾れるのは3枚だけなので、ぜんぶここにとっておく）
    const albumTitle = $('album-title'), albumEl = $('album');
    let albumKey = '';
    function renderAlbum() {
        const s = S();
        const key = `${s.drawings}|${s.art.join()}`;
        if (key === albumKey) return;
        albumKey = key;
        albumTitle.hidden = albumEl.hidden = !s.drawings;
        albumTitle.textContent = `まのの絵（${s.drawings}枚）`;
        albumEl.textContent = '';
        for (let n = s.drawings - 1; n >= 0; n--) {
            const art = ART[s.art[n]] ?? ART.classic;
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'pic';
            b.setAttribute('aria-label', `${n + 1}枚目：${art.name}`);
            const c = document.createElement('canvas');
            c.width = c.height = 128;
            paintDrawing(c.getContext('2d'), n, s.art[n]);
            const no = document.createElement('span');
            no.textContent = n + 1;
            b.append(c, no);
            b.addEventListener('click', () => h.drawing(n));
            albumEl.appendChild(b);
        }
    }

    let dirty = true;
    let lastCounters = '';
    const clockEl = $('clock'), nowEl = $('now'), countersEl = $('counters');

    return {
        diaryDirty() { dirty = true; },
        syncFollow,
        // 子みくろんの質問に答えられるように、話しかける欄をひらく
        openTalk() {
            panel.classList.remove('collapsed');
            talkInput.focus({ preventScroll: true });
            talkForm.scrollIntoView({ block: 'center', behavior: 'smooth' });
        },
        setAsk(hint) {
            talkInput.placeholder = hint ?? talkPlaceholder;
            talkForm.classList.toggle('asking', !!hint);
        },
        update() {
            const s = S();
            clockEl.textContent = `${s.speed ? '' : '⏸ '}${s.day}日目 ${clockText(s.min)}（${partOfDay(s.min)}）`;
            clockEl.classList.toggle('paused', !s.speed);
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
                ['お泊まり', s.stays],
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
            const fam = ctx.family;
            for (const r of famRows) {
                const v = r.v, st = v.state;
                const stay = v.stay ? 'on' : fam.canStay(v) ? 'can' : '';
                const sure = sureId === v.def.id;
                const key = `${st}|${stay}|${sure}`;
                if (key === r.last) continue;
                r.last = key;
                const [text, cls, disabled] = FAM_BUTTON[st];
                r.btn.textContent = sure ? 'ほんとに？' : text;
                r.btn.className = `main ${cls}${sure ? ' sure' : ''}`;
                r.btn.disabled = disabled;
                r.stayBtn.hidden = !stay || st === 'leaving';
                r.stayBtn.classList.toggle('on', stay === 'on');
                r.stayBtn.disabled = stay === 'on';
                r.stayBtn.textContent = stay === 'on' ? '🌙お泊まり中' : '🌙お泊まり';
                r.row.classList.toggle('here', st === 'visiting' || st === 'arriving');
            }
            // お泊まりは1日ひとりまで
            const guest = s.stay && fam.rt.find((x) => x.def.id === s.stay.id);
            const name = guest?.def.name;
            const hint = guest && s.stay.phase === 'eve' ? `今夜は${name}がお泊まり🌙（お泊まりは1日ひとりまで）`
                : guest && s.stay.phase === 'night' ? `${name}がお泊まり中…すやすや🌙`
                    : guest ? `${name}がお泊まりした朝☀️ いっしょに朝ごはんを食べたら帰るよ`
                        : s.stayNight === fam.nightKey() ? '今夜のお泊まりは、もうおしまい🌙（1日ひとりまで）'
                            : '来てくれた人の「🌙お泊まり」を押すと、泊まっていってくれるよ（1日ひとりまで）。押さなくても、夜まで遊んでいた人が言い出すこともあるよ🌙';
            if (stayHint.textContent !== hint) stayHint.textContent = hint;
            const dl = ctx.dog.D.label || '';
            if (dogLabel.textContent !== dl) dogLabel.textContent = dl;
            if (dirty) {
                dirty = false;
                renderDiary();
            }
            renderAlbum();
        },
    };
}
