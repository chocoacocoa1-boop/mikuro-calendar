import { ctx } from './ctx.js';
import { clamp } from './util.js';

const KEY = 'komikuron-ouchi-v1';
// 日記は1週間ぶんだけとっておく（古い日から消えていく）
const DIARY_DAYS = 7;
let cleared = false;

export function defaultState() {
    return {
        v: 1,
        day: 1,
        min: 7 * 60,
        speed: 1,
        stats: { onaka: 80, genki: 85, tanoshisa: 70, kirakira: 75, nakayoshi: 50 },
        commits: 0,
        cherries: 0,
        resonance: 0,
        drawings: 0,
        // まのが描いてくれた絵の中身（何枚目に何を描いたか）。むかしの絵は入っていない
        art: [],
        flowers: [1, 0, 2, 0, 1].map((g, c) => ({ g, c })),
        wateredDay: 0,
        calendarDay: 0,
        cherryReadyDay: 1,
        bathDay: 0,
        lights: false,
        food: null,
        sound: true,
        lastPetLog: -999,
        lastTalkLog: -999,
        memo: {},
        seenVer: 0,
        diary: [],
    };
}

export function loadState() {
    const d = defaultState();
    try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
            const s = JSON.parse(raw);
            if (s && s.v === 1) return { ...d, ...s, stats: { ...d.stats, ...s.stats } };
        }
    } catch {
        // 保存できない環境（プライベートモードなど）でもそのまま遊べるように
    }
    return d;
}

export function saveState() {
    if (cleared) return;
    try {
        localStorage.setItem(KEY, JSON.stringify(ctx.state));
    } catch {
        // 保存できなくても遊びは続ける
    }
}

export function clearState() {
    cleared = true;
    try {
        localStorage.removeItem(KEY);
    } catch {
        // 同上
    }
}

export function log(text, again = false) {
    const s = ctx.state;
    const e = { d: s.day, m: Math.floor(s.min), t: text };
    // 同じ日にまた同じことがあったら、行をふやさずに回数をかぞえる（いちばん新しい時刻にうつす）
    if (again) {
        for (let i = 0; i < s.diary.length && s.diary[i].d === s.day; i++) {
            if (s.diary[i].t !== text) continue;
            e.n = (s.diary.splice(i, 1)[0].n || 1) + 1;
            break;
        }
    }
    s.diary.unshift(e);
    const oldest = s.day - DIARY_DAYS + 1;
    while (s.diary.length && s.diary[s.diary.length - 1].d < oldest) s.diary.pop();
    ctx.ui?.diaryDirty();
}

// なでなで・ボール・おしゃべりみたいに、1日に何度もあることはこっちで書く
export const tally = (text) => log(text, true);

export function addStat(k, v) {
    const st = ctx.state.stats;
    st[k] = clamp(st[k] + v, 0, 100);
}

export const hour = () => ctx.state.min / 60;
export const absMin = () => ctx.state.day * 1440 + ctx.state.min;
