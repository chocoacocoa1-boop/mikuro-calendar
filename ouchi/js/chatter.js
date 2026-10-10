// おしゃべりの仕組み：ひとりごと、ふたりの掛け合い、まのへの質問、まわりの人のひとこと
// 時間は実時間の秒で数える（×12でも読めるように）。停止中は止まる
import { ctx } from './ctx.js';
import { pick, rand, chance, fill, speechSec } from './util.js';
import { hour } from './state.js';
import {
    MONO, SLEEP_TALK, QUESTIONS, MEMO_LINES, DUO, PAIRS, GUEST_IDLE, GUEST_SLEEP, REACT, CHIME,
} from './convos.js';

const S = () => ctx.state;

let clock = 0;
let convo = null;
let tMono = 5, tGuest = 9, tConvo = 7;
let lastTouch = 0;
let lastAsk = -120;
let asking = null;
let hinted = false;
let talking = 0;
let hushUntil = 0;
const later = [];
const recent = [];
const throttle = {};

// 少し前に使ったセリフや台本は、なるべく選ばない
export function pickFresh(list) {
    if (!list?.length) return null;
    const fresh = list.filter((x) => !recent.includes(x));
    const x = pick(fresh.length ? fresh : list);
    recent.push(x);
    if (recent.length > 24) recent.shift();
    return x;
}

const linesOf = (sc) => (sc ? (Array.isArray(sc) ? sc : sc.lines) : null);

function timeKey() {
    const h = hour();
    if (h >= 5 && h < 10) return 'morning';
    if (h < 16.5 && h >= 10) return 'day';
    if (h < 19 && h >= 16.5) return 'eve';
    return 'night';
}

// 時間帯の合う台本だけ選ぶ
export function pickScript(list) {
    const now = timeKey();
    return linesOf(pickFresh(list.filter((sc) => Array.isArray(sc) || sc.when === now)));
}

function canSpeak(a) {
    if (!a?.active) return false;
    if (a === ctx.km) return !a.sleeping;
    return a.visitor?.state === 'visiting';
}

const inConvo = (a) => !!convo && convo.members.includes(a);

// 吹き出しが空いていて、ほかの会話の途中でもない
export function free(a, gap = 0.8) {
    return !!a?.active && clock >= hushUntil && talking === 0 && ctx.tReal > (a.quietAt ?? 0) + gap && !(a.scripted > 0) && !inConvo(a);
}

// まのが話しかけたら、子みくろんの返事がちゃんと聞こえるように少し静かにする
export function hush(sec) {
    hushUntil = Math.max(hushUntil, clock + sec);
    convo = null;
}

const near = (a, b, d) => Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z) < d;

function actCtx(k) {
    const id = k.actId;
    if (id === 'eat' && k.onSpot === ctx.world.spots.cook) return 'cook';
    return { onsen2: 'bath', tea: 'eat', imoni: 'eat' }[id] ?? id;
}

function sayLine(a, text, o) {
    a.say(text, speechSec(text) + 1.4);
    if (o?.fx) ctx.fx.burst(a.headPos(), [o.fx], 2);
}

function scriptVars() {
    return { day: S().day };
}

// ── 掛け合い（行動とは別に、吹き出しだけで進む）──
function startConvo(lines, cast) {
    const members = Object.values(cast).filter(Boolean);
    convo = { lines, cast, members, i: 0, t: 0.2, skipped: false, vars: scriptVars() };
}

function stepConvo(dt) {
    const c = convo;
    if (c.members.some((a) => a.scripted > 0)) {
        convo = null;
        return;
    }
    c.t -= dt;
    if (c.t > 0) return;
    while (c.i < c.lines.length) {
        const [who, text, o] = c.lines[c.i++];
        const a = c.cast[who];
        if (!canSpeak(a) || (o?.dep && c.skipped)) {
            c.skipped = true;
            continue;
        }
        c.skipped = false;
        const t = fill(text, c.vars);
        sayLine(a, t, o);
        c.t = speechSec(t) + 0.5;
        return;
    }
    convo = null;
}

// 行動の中で台本どおりにしゃべる（ゲーム内の時間で進む）
export function* converse(lines, cast) {
    if (!lines) return;
    const members = Object.values(cast).filter(Boolean);
    if (convo && convo.members.some((a) => members.includes(a))) convo = null;
    members.forEach((a) => { a.scripted = (a.scripted || 0) + 1; });
    talking++;
    const vars = scriptVars();
    try {
        let skipped = false;
        for (const [who, text, o] of lines) {
            const a = cast[who];
            if (!canSpeak(a) || (o?.dep && skipped)) {
                skipped = true;
                continue;
            }
            skipped = false;
            yield* waitTurn(a);
            if (!canSpeak(a)) continue;
            const t = fill(text, vars);
            sayLine(a, t, o);
            yield* waitTalk(speechSec(t) + 0.4);
        }
    } finally {
        talking--;
        members.forEach((a) => { a.scripted--; });
    }
}

// ×1 なら1秒＝1分。速くしても、最低1秒ちょっとは吹き出しを見せる
export function* waitTalk(min) {
    const r0 = ctx.tReal;
    let t = 0;
    while (t < min || ctx.tReal - r0 < Math.min(1.2, min)) t += (yield) || 0;
}

// その人がまだ別のことを言っている途中なら、言い終わるまで待つ（最大5分）
function* waitTurn(a) {
    let t = 0;
    while (ctx.tReal < (a.quietAt ?? 0) - 0.6 && t < 5) t += (yield) || 0;
}

// 行動の間、ほかのおしゃべりに割りこまれないようにする
export function hold(agents) {
    agents.forEach((a) => { a.scripted = (a.scripted || 0) + 1; });
    if (convo && convo.members.some((a) => agents.includes(a))) convo = null;
    let done = false;
    return () => {
        if (done) return;
        done = true;
        agents.forEach((a) => { a.scripted--; });
    };
}

function tryAmbientConvo(guests) {
    const k = ctx.km;
    // いっしょに何かしに行く途中なら、話しはじめない（着いたら途切れてしまうので）
    const kFree = free(k, 1.5) && !k.sleeping && !k.deepSleep && !k.meeting;
    const ready = (a) => free(a, 1.5) && a.pose !== 'sleep' && !(a.joining && !a.atSpot);
    const opts = [];
    for (const v of guests) {
        const a = v.agent;
        if (!ready(a)) continue;
        if (kFree && near(k, a, 5.5)) {
            const d = DUO[v.def.id];
            const w = d.watch[actCtx(k)];
            if (w) opts.push({ w: 3, lines: linesOf(pickFresh(w)), cast: { k, v: a } });
            opts.push({ w: 2, lines: pickScript(d.talk), cast: { k, v: a } });
        }
    }
    for (let i = 0; i < guests.length; i++) {
        for (let j = i + 1; j < guests.length; j++) {
            const A = guests[i], B = guests[j];
            if (!ready(A.agent) || !ready(B.agent)) continue;
            if (!near(A.agent, B.agent, 6)) continue;
            const list = PAIRS[`${A.def.id}+${B.def.id}`] ?? PAIRS[`${B.def.id}+${A.def.id}`];
            if (!list) continue;
            const cast = { [A.def.id]: A.agent, [B.def.id]: B.agent, k: kFree && near(k, A.agent, 6) ? k : null };
            opts.push({ w: 2, lines: pickScript(list), cast });
        }
    }
    const ok = opts.filter((o) => o.lines);
    if (!ok.length) return false;
    let r = Math.random() * ok.reduce((s, o) => s + o.w, 0);
    const o = ok.find((x) => (r -= x.w) <= 0) ?? ok[0];
    startConvo(o.lines, o.cast);
    return true;
}

// ── 子みくろんのひとりごと ──
function memoryLines() {
    const s = S();
    const out = [];
    if (s.day > 1) out.push(`今日で${s.day}日目かぁ〜。まのといっしょに、いっぱい過ごしたっちゃ〜`);
    if (s.commits > 0) out.push(`コミット、${s.commits}回になったべ〜💪`);
    if (s.cherries > 0) out.push(`さくらんぼ、${s.cherries}個もとれたっちゃ〜🍒 食べきれるべか〜？`);
    if (s.drawings > 0) out.push(`まのが描いてくれた絵、${s.drawings}枚になったっちゃ〜🎨 宝物だべ〜`);
    if (s.resonance > 0) out.push('みんなで共鳴したとき、ほんとにきれいだったなぁ〜✨');
    for (const [key, line] of Object.entries(MEMO_LINES)) {
        if (s.memo?.[key]) out.push(fill(line, s.memo));
    }
    return out;
}

function nextQuestion() {
    const s = S();
    const m = s.memo || {};
    const qs = QUESTIONS.filter((q) => (q.store ? !m[q.id] : m[`${q.id}Day`] !== s.day));
    return qs.length ? pick(qs) : null;
}

function ask(k, q) {
    lastAsk = clock;
    asking = { q, until: clock + 60 };
    if (!k.onSpot && !k.moving) k.faceCamera();
    k.say(q.q, 8, { hint: '💬 タップしてこたえる', onTap: () => ctx.ui?.openTalk() });
    ctx.ui?.setAsk(q.hint);
    if (!hinted) {
        hinted = true;
        ctx.fx.toast('💬 吹き出しをタップすると、こたえられるよ', 3.6);
    }
}

function endAsk() {
    asking = null;
    ctx.ui?.setAsk(null);
}

function monologue(k, guests) {
    if (!free(k, 3)) return;
    if (k.sleeping) {
        if (chance(0.7)) {
            k.say(pickFresh(SLEEP_TALK), 3);
            ctx.fx.emoji(k.headPos(), '💤', { rise: 40 });
        }
        return;
    }
    if (k.actId === 'greet' || k.actId === 'resonance') return;
    const s = S(), st = s.stats, h = hour();
    const since = clock - lastTouch;

    if (!asking && clock - lastAsk > 150 && guests.length < 2 && chance(since > 40 ? 0.35 : 0.2)) {
        const q = nextQuestion();
        if (q) {
            ask(k, q);
            return;
        }
    }

    const pool = [];
    const add = (w, lines) => { if (lines?.length) pool.push([w, lines]); };
    const c = actCtx(k);
    if (k.moving && MONO.go[k.actId]) add(4, MONO.go[k.actId]);
    else add(3, MONO.act[c]);
    if (st.onaka < 35) add(3, MONO.hungry);
    if (st.genki < 30) add(3, MONO.tired);
    if (st.kirakira < 35) add(2, MONO.dull);
    if (st.tanoshisa < 30) add(2, MONO.bored);
    if (st.tanoshisa > 80) add(1.5, MONO.happy);
    if (st.nakayoshi < 30) add(2, MONO.lonely);
    if (st.nakayoshi > 80) add(1.5, MONO.loved);
    add(1.3, MONO.time[h >= 14.8 && h < 15.6 ? 'snack' : timeKey()]);
    add(1.1, memoryLines());
    add(since > 50 ? 2.5 : 0.8, MONO.toMano);
    if (since > 70) add(2, MONO.wantPet);
    if (guests.length) {
        add(1.5, guests.map((v) => fill(pick(MONO.guest), { name: v.def.name })));
    } else {
        const away = ctx.family.rt.filter((v) => v.state === 'away').map((v) => MONO.absent[v.def.id]);
        if (!s.resonance) away.push(MONO.resonanceHint);
        add(0.8, away);
    }
    let r = Math.random() * pool.reduce((sum, p) => sum + p[0], 0);
    const lines = (pool.find((p) => (r -= p[0]) <= 0) ?? pool[0])[1];
    k.say(pickFresh(lines));
}

// ── 遊びに来た人のひとりごと ──
function guestLine(v) {
    const a = v.agent;
    if (!free(a, 3) || !canSpeak(a)) return;
    const k = ctx.km;
    if (a.pose === 'sleep') {
        a.say(pickFresh(GUEST_SLEEP[v.def.id] ?? GUEST_SLEEP.default), 3);
        return;
    }
    const close = near(a, k, 5);
    if (k.sleeping && close) {
        a.say(pickFresh(v.def.lines.sleepVisit));
        return;
    }
    const watch = v.def.lines.watch[actCtx(k)];
    if (watch && close && chance(0.4)) {
        a.say(watch);
        return;
    }
    a.say(pickFresh([...v.def.lines.idle, ...GUEST_IDLE[v.def.id]]));
}

// ── まわりの人のひとこと ──
function soon(sec, fn) {
    later.push({ t: clock + sec, fn });
}

export function react(ev, vars = {}, gap = 6) {
    if (throttle[ev] !== undefined && clock - throttle[ev] < gap) return;
    const vs = ctx.family.present().filter((v) => v.greeted && REACT[v.def.id]?.[ev] && canSpeak(v.agent) && free(v.agent, 0) && v.agent.pose !== 'sleep');
    if (!vs.length) return;
    throttle[ev] = clock;
    const v = pick(vs);
    soon(rand(1.0, 1.6), () => {
        if (canSpeak(v.agent) && !(v.agent.scripted > 0)) v.agent.say(fill(pick(REACT[v.def.id][ev]), vars));
    });
}

// まのが話しかけたあと、そばにいる人も入ってくる（まの本人はのぞく）
export function chime(topic, afterSec) {
    const vs = ctx.family.present().filter((v) => v.greeted && CHIME[v.def.id] && canSpeak(v.agent) && !(v.agent.scripted > 0) && v.agent.pose !== 'sleep');
    if (!vs.length) return;
    const strong = topic && topic !== 'default' && CHIME[vs[0].def.id][topic];
    if (!chance(strong ? 0.7 : 0.3)) return;
    const v = pick(vs);
    const line = CHIME[v.def.id][topic] ?? CHIME[v.def.id].default;
    soon(afterSec, () => {
        if (canSpeak(v.agent)) v.agent.say(line);
    });
}

// ── まのがかまってくれた ──
export function touch() {
    lastTouch = clock;
}

// 質問中なら、まのの言葉を答えとして受け取る
export function answer(raw) {
    if (!asking) return null;
    const q = asking.q;
    endAsk();
    let a = raw.replace(/[「」『』"]/g, '').replace(/[。！？!?、,.\s]+$/u, '').trim();
    const chars = [...a];
    if (chars.length > 14) a = `${chars.slice(0, 14).join('')}…`;
    const s = S();
    s.memo ||= {};
    if (q.store) s.memo[q.id] = a;
    if (q.daily) s.memo[`${q.id}Day`] = s.day;
    return { reply: q.reply(a, raw), id: q.id, store: q.store, a };
}

export function update(dt) {
    if (!S().speed || !ctx.km) return;
    clock += dt;
    for (let i = later.length - 1; i >= 0; i--) {
        if (clock >= later[i].t) later.splice(i, 1)[0].fn();
    }
    const k = ctx.km;
    if (asking && (clock > asking.until || k.sleeping)) endAsk();
    const big = k.actId === 'greet' || k.actId === 'resonance';
    if (convo) {
        if (big) convo = null;
        else {
            stepConvo(dt);
            return;
        }
    }
    if (big || talking > 0) return;
    tMono -= dt;
    tGuest -= dt;
    tConvo -= dt;
    const guests = ctx.family.present().filter((v) => v.greeted);
    if (guests.length && tConvo <= 0) {
        if (tryAmbientConvo(guests)) {
            tConvo = rand(16, 26);
            tMono = Math.max(tMono, rand(5, 9));
            tGuest = Math.max(tGuest, rand(5, 9));
            return;
        }
        tConvo = rand(4, 7);
    }
    if (tMono <= 0) {
        tMono = k.sleeping ? rand(16, 26) : guests.length ? rand(14, 22) : rand(6, 11);
        monologue(k, guests);
    }
    if (guests.length && tGuest <= 0) {
        tGuest = rand(15, 25) / Math.sqrt(guests.length);
        guestLine(pick(guests));
    }
}

