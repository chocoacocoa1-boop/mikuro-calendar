import { ctx } from './ctx.js';
import { clamp } from './util.js';

const KEY = 'komikuron-ouchi-v1';
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

export function log(text) {
    const s = ctx.state;
    s.diary.unshift({ d: s.day, m: Math.floor(s.min), t: text });
    if (s.diary.length > 80) s.diary.length = 80;
    ctx.ui?.diaryDirty();
}

export function addStat(k, v) {
    const st = ctx.state.stats;
    st[k] = clamp(st[k] + v, 0, 100);
}

export const hour = () => ctx.state.min / 60;
export const absMin = () => ctx.state.day * 1440 + ctx.state.min;
