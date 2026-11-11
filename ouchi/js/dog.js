// マロンの暮らし。まのがずっと前にいっしょに暮らした、ヨークシャーテリアミックスの保護わんこ。
// 臆病だけど、とってもやさしい子。いまは子みくろんのおうちで、いっしょに暮らしている。
// life.js と family.js は import しない（ctx.life・ctx.family から呼ぶ。循環よけ）
import * as THREE from 'three';
import { ctx } from './ctx.js';
import { Agent, goSpot, walkTo, waitMin, waitUntil, join, spotAt, faceYaw } from './agent.js';
import { makeDog } from './clawd.js';
import { addStat, log, tally, hour, absMin } from './state.js';
import { pick, rand, chance, fill, shuffle } from './util.js';
import { converse, hold, free, touch, pickFresh, react, soon } from './chatter.js';
import { DOGL, DOG_INTRO, DOG_HELLO, DOG_WALK } from './convos.js';
import { DOG, L } from './lines.js';
import { cbox } from './build.js';

const W = () => ctx.world;
const S = () => ctx.state;
const dv = (t) => fill(t, { dog: DOG.name });
const dist = (a, b) => Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z);
const alive = (v) => v.state === 'visiting';

// claim：だれかがマロンといっしょに何かしている（'k' 子みくろんの行動、'pair' お客さんとの遊び、'self' マロンひとりで）
export const D = {
    claim: null,
    get busy() { return !!this.claim; },
    asleep: false,
    label: '',
    shy: false,
    hungry: false,
    bowlAt: -1e9,
    queue: [],
    welcoming: false,
    ballBrave: false,
    toldFirst: false,
};
export let agent = null;

// だれかがマロンを借りる。返すときは、自分が借りたままのときだけ返す（あとから借りた人のを消さないように）
function claim(who) {
    const t = { who };
    D.claim = t;
    return () => { if (D.claim === t) D.claim = null; };
}

export function init() {
    agent = new Agent({ id: 'dog', name: DOG.name, model: makeDog(), color: DOG.color, speed: 2.3, showName: true });
    agent.isDog = true;
    agent.brain = brain;
    if (ctx.life.isNight()) agent.placeOnSpot(W().spots.dogBed);
    else agent.place(-1.9, 1.0, 0.4);
}

export const mealDue = () => {
    const h = hour(), d = S().dog, day = S().day;
    return (h >= 6.5 && h < 11 && d.am !== day) || (h >= 17 && h < 21.5 && d.pm !== day);
};

// ── ふだんの過ごし方 ──
function brain() {
    const k = ctx.km, s = S();
    // だれかといっしょに何かしている最中は、その人にまかせて待つ
    if (D.busy) return waitFree();
    if (k.deepSleep || ctx.life.isNight()) return dogSleep();
    if (!s.dog.met) return shyWait();
    if (mealDue() && absMin() - D.bowlAt > 90 && k.actId !== 'feed') return waitAtBowl();
    if (k.actId === 'resonance') return atFeet();
    if (k.sleeping) return napBeside();
    const r = Math.random(), h = hour();
    if (r < 0.5) return follow();
    if (r < 0.64 && ctx.family.present().some((v) => v.greeted && !v.asleep)) return visit();
    if (r < 0.8 && h >= 7 && h < 18.5) return garden();
    if (r < 0.92 || (h >= 13 && h < 16)) return nap();
    return play();
}

function* waitFree() {
    while (D.busy) yield;
}

// 子みくろんのななめうしろ
function besideK(d = 0.9) {
    const k = ctx.km;
    const ang = k.yaw + Math.PI + (chance(0.5) ? -0.75 : 0.75);
    return ctx.nav.snap(k.pos.x + Math.sin(ang) * d, k.pos.z + Math.cos(ang) * d);
}

function* follow() {
    const a = agent, k = ctx.km;
    D.label = '子みくろんの あとを とことこ';
    const until = absMin() + rand(20, 45);
    while (absMin() < until && !k.deepSleep) {
        const p = besideK();
        const kx = k.pos.x, kz = k.pos.z;
        const moved = () => Math.hypot(k.pos.x - kx, k.pos.z - kz) > 1.2;
        const far = Math.hypot(a.pos.x - p.x, a.pos.z - p.z);
        if (far > 0.35) {
            a.pose = 'stand';
            yield* walkTo(a, p.x, p.z, { speed: far > 3 ? 1.3 : 0.9, until: moved });
        }
        yield;
        if (moved()) continue;
        a.faceTo(k.pos.x, k.pos.z);
        a.pose = k.sleeping ? 'sleep' : k.onSpot ? 'sit' : 'stand';
        yield* waitMin(rand(4, 9), () => {
            a.faceTo(k.pos.x, k.pos.z);
            if (dist(a, k) > 2.6 || k.deepSleep) return false;
        });
        a.pose = 'stand';
        if (chance(0.25)) return;
    }
}

// 来てくれた人のそばで、ちょこんと
function* visit() {
    const a = agent;
    const vs = ctx.family.present().filter((v) => v.greeted && !v.asleep);
    if (!vs.length) return;
    const v = pick(vs), b = v.agent;
    D.label = `${v.def.name}のそばで ひとやすみ`;
    const ang = rand(0, Math.PI * 2);
    const p = ctx.nav.snap(b.pos.x + Math.sin(ang) * 0.9, b.pos.z + Math.cos(ang) * 0.9);
    yield* walkTo(a, p.x, p.z);
    a.faceTo(b.pos.x, b.pos.z);
    a.pose = 'sit';
    yield* waitMin(rand(5, 10), () => {
        a.faceTo(b.pos.x, b.pos.z);
        if (!alive(v) || dist(a, b) > 3) return false;
    });
    a.pose = 'stand';
}

function* garden() {
    const a = agent;
    D.label = 'お庭で くんくん🌿';
    for (const [x, z] of shuffle(W().strollPoints).slice(0, 2)) {
        const p = ctx.nav.snap(x + rand(-0.4, 0.4), z + rand(-0.4, 0.4));
        yield* walkTo(a, p.x, p.z);
        a.pose = 'sniff';
        yield* waitMin(rand(3, 6));
        a.pose = 'stand';
        yield;
    }
    if (chance(0.35)) {
        const g = W().gate;
        D.label = '門のほうを そーっと見ている';
        const p = ctx.nav.snap(g.inside.x + rand(-0.8, 0.8), g.inside.z - 0.9);
        yield* walkTo(a, p.x, p.z);
        a.faceTo(g.outside.x, g.outside.z);
        a.pose = 'sit';
        yield* waitMin(rand(4, 7));
        a.pose = 'stand';
    }
}

// 寝床で、おひるね
function* nap() {
    const a = agent;
    D.label = '寝床で おひるね💤';
    yield* goSpot(a, W().spots.dogBed, 'sleep');
    D.asleep = true;
    let z = 0;
    try {
        yield* waitMin(rand(18, 40), (dt) => {
            z += dt;
            if (z > 8) {
                z = 0;
                ctx.fx.emoji(a.headPos(), '💤', { rise: 36 });
            }
            if (ctx.life.isNight()) return false;
        });
    } finally {
        D.asleep = false;
    }
    a.pose = 'sit';
    yield* waitMin(2);
}

function* play() {
    const a = agent;
    if (chance(0.5)) {
        D.label = 'しっぽを おいかけて くるくる';
        a.pose = 'happy';
        for (let i = 0; i < 7; i++) {
            a.targetYaw = a.yaw + 1.7;
            yield* waitMin(0.35);
        }
    } else {
        D.label = 'ごろん ごろん';
        a.pose = 'sleep';
        yield* waitMin(1.5);
        a.pose = 'happy';
        yield* waitMin(1);
    }
    a.pose = 'stand';
    yield* waitMin(rand(3, 6));
}

function* waitAtBowl() {
    const a = agent;
    D.bowlAt = absMin();
    D.hungry = true;
    D.label = 'おさらの前で ごはんを まっている';
    try {
        yield* goSpot(a, W().spots.dogBowl, 'sit');
        a.pose = 'sit';
        yield* waitMin(rand(10, 16), () => { if (!mealDue()) return false; });
    } finally {
        D.hungry = false;
    }
    a.pose = 'stand';
}

// みんなで共鳴するときは、子みくろんの足もとで
function* atFeet() {
    const a = agent, k = ctx.km, C = W().circle;
    D.label = '子みくろんの足もとで しっぽ ふりふり';
    while (k.actId === 'resonance') {
        const d = Math.hypot(C.x - k.pos.x, C.z - k.pos.z) || 1;
        const p = ctx.nav.snap(k.pos.x + ((C.x - k.pos.x) / d) * 0.6, k.pos.z + ((C.z - k.pos.z) / d) * 0.6);
        if (Math.hypot(a.pos.x - p.x, a.pos.z - p.z) > 0.3) yield* walkTo(a, p.x, p.z);
        a.faceTo(C.x, C.z);
        a.pose = 'sit';
        yield* waitMin(3);
    }
    a.pose = 'stand';
}

// 子みくろんがお昼寝しているときは、となりで丸くなる
function* napBeside() {
    const a = agent, k = ctx.km;
    D.label = '子みくろんの となりで おひるね💤';
    const p = besideK(0.8);
    yield* walkTo(a, p.x, p.z);
    if (!k.sleeping) return;
    a.faceTo(k.pos.x, k.pos.z);
    a.pose = 'sleep';
    D.asleep = true;
    try {
        yield* waitUntil(() => !k.sleeping || k.deepSleep, 120);
    } finally {
        D.asleep = false;
    }
    a.pose = 'stand';
}

// ── 夜：ふかふかの寝床で ──
function* dogSleep() {
    const a = agent, sp = W().spots.dogBed;
    D.asleep = true;
    D.label = 'ふかふかの寝床で ねんね💤';
    try {
        if (a.onSpot !== sp) yield* goSpot(a, sp, 'sleep');
        a.pose = 'sleep';
        const s = S();
        // はじめて、おうちの中の寝床で寝る夜
        if (s.dog.met && !s.dog.firstBed) {
            s.dog.firstBed = true;
            if (!D.toldFirst) {
                a.pose = 'sit';
                a.say('（はじめての ふかふか…そーっと のってみる）');
                yield* waitMin(3);
                a.say('（くるくる…すとん。…あったかい）');
                yield* waitMin(2);
                a.pose = 'sleep';
            }
            log(`${DOG.name}が、はじめて おうちの中の ふかふかの寝床で寝た🌰🌙`);
        }
        let z = 0;
        while (ctx.km.deepSleep || ctx.life.isNight()) {
            z += (yield) || 0;
            if (z > 7) {
                z = 0;
                ctx.fx.emoji(a.headPos(), '💤', { rise: 36 });
            }
        }
    } finally {
        D.asleep = false;
    }
    a.pose = 'sit';
    yield* waitMin(2);
}

// 寝るまえ（子みくろんの tuckIn から）：寝床で待っていてもらう
export function toBed(meet) {
    const release = claim('k');
    agent.setCo((function* () {
        try {
            yield* join(agent, W().spots.dogBed, meet, 'sit');
        } finally {
            release();
        }
    })());
}

export function sleepNow() {
    agent.setCo(dogSleep());
}

// 朝：寝床からとび出して、子みくろんのベッドのそばへ（「おはよう」がすむまで、そばにいる）
export function wakeUp(meet) {
    const release = claim('k');
    agent.setCo((function* () {
        const a = agent;
        try {
            D.label = 'おはよう！';
            const p = ctx.nav.snap(0.95, -1.35);
            yield* walkTo(a, p.x, p.z, { speed: 1.2 });
            a.faceTo(ctx.km.pos.x, ctx.km.pos.z);
            a.pose = 'happy';
            yield* waitMin(3);
            a.pose = 'sit';
            yield* waitUntil(() => meet.done, 40);
            a.pose = 'stand';
        } finally {
            release();
        }
    })());
}

// 子みくろんの行動から呼ぶ（ごはんなど）。meet.done で自由になる
export function call(sp, meet, pose) {
    const release = claim('k');
    agent.setCo((function* () {
        try {
            yield* join(agent, sp, meet, pose);
        } finally {
            release();
        }
    })());
}

// 朝ごはんをいっしょに作ったとき（お泊まりの朝）：マロンのぶんも、おさらに
export function serveMeal() {
    const s = S();
    if (!agent || !s.dog.met || !mealDue() || D.busy) return false;
    s.dog[hour() < 12 ? 'am' : 'pm'] = s.day;
    W().setDogFood(true);
    agent.setCo((function* () {
        const a = agent;
        const release = claim('self');
        try {
            D.label = 'ごはんを はぐはぐ🍖';
            yield* goSpot(a, W().spots.dogBowl, 'eat');
            a.pose = 'eat';
            let mt = 0;
            yield* waitMin(6, (dt) => {
                mt += dt;
                if (mt > 1.5) {
                    mt = 0;
                    ctx.fx.emoji(a.headPos(), pick(['🍖', '💕']), { rise: 30 });
                }
            });
            a.pose = 'happy';
            tally(`${DOG.name}にごはんをあげた🍖`);
            yield* waitMin(1.5);
        } finally {
            W().setDogFood(false);
            release();
        }
    })());
    return true;
}

// ── はじめて（1回だけ）：子みくろんが迎えにくるまで、ちょっとどきどきして待っている ──
function* shyWait() {
    const a = agent;
    D.label = 'おうちに来たばかり…どきどき';
    D.shy = true;
    a.pose = 'shy';
    try {
        yield* waitMin(10, () => { if (S().dog.met) return false; });
    } finally {
        D.shy = false;
    }
    a.pose = 'stand';
}

// ── まのから ──
let lastPetReal = 0, petN = 0;

export function pet() {
    const a = agent, s = S(), k = ctx.km;
    touch();
    if (a.pose === 'sleep') {
        a.say(pick(DOGL.petSleep), 2.4);
        ctx.fx.emoji(a.headPos(), '💤');
        return;
    }
    a.petT = 1;
    a.say(pick(DOGL.pet), 2.6);
    ctx.fx.burst(a.headPos(), ['🐾', '💕', '✨'], 4);
    ctx.sound.pet();
    if (++petN % 4 === 0) ctx.sound.bark();
    const now = performance.now();
    if (now - lastPetReal > 1500) {
        lastPetReal = now;
        addStat('nakayoshi', 2);
    }
    if (absMin() - s.dog.lastPetLog > 120) {
        s.dog.lastPetLog = absMin();
        tally(`まのが${DOG.name}をなでてくれた🐾`);
    }
    soon(1.4, () => {
        if (!k.sleeping && free(k, 0.3) && dist(k, a) < 6) k.say(dv(pick(L.dogPetK)));
    });
    react('dogPet', {}, 12, null, a);
}

export function treat() {
    const a = agent, s = S(), k = ctx.km;
    touch();
    if (k.deepSleep || ctx.life.isNight()) {
        ctx.fx.toast(`${DOG.name}はすやすや…おやつは明日ね🦴`);
        return;
    }
    if (absMin() - s.dog.treatAt < 60) {
        ctx.fx.toast('さっき食べたばっかりだよ〜🦴');
        return;
    }
    s.dog.treatAt = absMin();
    ctx.fx.toast(`${DOG.name}におやつをあげたよ🦴`);
    ctx.sound.bark();
    tally(`まのが${DOG.name}におやつをくれた🦴`);
    addStat('nakayoshi', 2);
    if (D.busy) {
        a.petT = 1;
        a.say(pick(DOGL.treat));
    } else {
        a.setCo(eatTreat());
    }
    soon(2.6, () => {
        if (!k.sleeping && free(k, 0.3) && dist(k, a) < 7) k.say(dv(pick(L.dogTreatK)));
    });
    if (!S().speed) ctx.fx.toast('いまは時間が止まってるよ⏸「×1」で動きだすよ', 3.5);
}

function* eatTreat() {
    const a = agent;
    const release = claim('self');
    try {
        D.label = 'おやつを はぐはぐ🦴';
        a.faceCamera();
        a.pose = 'beg';
        a.say(pick(DOGL.treat));
        yield* waitMin(1.5);
        a.pose = 'eat';
        ctx.fx.emoji(a.headPos(), '🦴', { rise: 30 });
        yield* waitMin(2.5);
        a.pose = 'happy';
        yield* waitMin(1.5);
        a.pose = 'stand';
    } finally {
        release();
    }
}

// まのが話しかけた「おすわり」「お手」
export function hear(t) {
    if (!agent || D.busy || agent.pose === 'sleep' || !S().dog.met || ctx.km.deepSleep) return;
    const pose = /おすわり/.test(t) ? 'sit' : /お手|おかわり/.test(t) ? 'beg' : null;
    if (!pose) return;
    agent.setCo((function* () {
        const a = agent;
        a.faceCamera();
        yield* waitMin(1.2);
        a.pose = pose;
        a.say(pick(pose === 'sit' ? DOGL.sit : DOGL.paw), 2.4);
        ctx.fx.burst(a.headPos(), ['🐾', '✨'], 3);
        yield* waitMin(3);
        a.pose = 'stand';
    })());
}

// びっくり（あかりが消えた・ボールが落ちてきた・星くず）：ちょっと小さくなって、すぐ立ちなおる
export function startle() {
    const a = agent;
    if (!a?.active || a.pose === 'sleep' || !S().dog.met) return;
    a.startleT = 2;
    if (free(a, 0.5)) a.say(pick(DOGL.startle), 2);
}

// ボールが飛んできたら（はじめてのときは、ちょっと後ずさりしてから）
export function onBall() {
    const k = ctx.km;
    if (!agent || D.busy || k.deepSleep || ctx.life.isNight() || !S().dog.met) return;
    agent.setCo(chaseBall());
}

function* chaseBall() {
    const a = agent, b = ctx.ball;
    const release = claim('self');
    D.label = 'ボールを おいかけている⚽';
    try {
        if (!D.ballBrave) {
            D.ballBrave = true;
            startle();
            yield* waitMin(1.5);
        }
        a.say(pick(DOGL.ball));
        let kicks = 0;
        for (let tries = 0; tries < 12 && kicks < 2 && b.active; tries++) {
            const tx = b.pos.x, tz = b.pos.z;
            yield* walkTo(a, tx, tz, { until: () => Math.hypot(b.pos.x - tx, b.pos.z - tz) > 0.9, speed: 1.1 });
            if (Math.hypot(b.pos.x - a.pos.x, b.pos.z - a.pos.z) < 0.7 && b.speed() < 2.5 && !b.pass) {
                kicks++;
                b.kick(a.pos, rand(2, 3));
                ctx.sound.bounce();
                a.pose = 'happy';
                yield* waitMin(1);
                a.pose = 'stand';
            } else {
                yield* waitMin(0.5);
            }
        }
        if (kicks) tally(`${DOG.name}とボールであそんだ⚽`);
    } finally {
        release();
    }
}

// ── お客さんが来たとき：まの・みかにゃんには駆けよる。クロミちゃん・みくろん姉には、はじめはちょっとかくれて ──
export function welcome(v) {
    const k = ctx.km;
    if (!agent || !S().dog.met || k.deepSleep || ctx.life.isNight()) return;
    if (D.welcoming) {
        D.queue.push(v);
        return;
    }
    if (D.claim?.who === 'pair' || D.claim?.who === 'self') return;
    D.queue.push(v);
    agent.setCo(welcomeAll());
}

function* welcomeAll() {
    const release = claim('self');
    D.welcoming = true;
    try {
        while (D.queue.length) {
            const v = D.queue.shift();
            if (alive(v)) yield* welcomeOne(v);
            yield;
        }
    } finally {
        D.welcoming = false;
        D.shy = false;
        D.queue.length = 0;
        release();
    }
}

function nearOf(b, d = 0.8) {
    const a = agent;
    const ang = Math.atan2(a.pos.x - b.pos.x, a.pos.z - b.pos.z);
    return ctx.nav.snap(b.pos.x + Math.sin(ang) * d, b.pos.z + Math.cos(ang) * d);
}

function* welcomeOne(v) {
    const a = agent, k = ctx.km, b = v.agent, s = S(), id = v.def.id;
    const cast = () => ({ dog: a, [id]: b, k: dist(k, b) < 5 && !k.sleeping ? k : null });
    D.label = `${v.def.name}を お出迎え`;
    if (id === 'mano' || id === 'mikanyan') {
        // こわがりを忘れて、まっすぐ駆けよる
        a.pose = 'stand';
        ctx.sound.bark();
        a.say(v.def.sky ? pick(DOGL.sky) : 'わん！わん！', 2);
        const p = nearOf(b, 0.75);
        yield* walkTo(a, p.x, p.z, { speed: 1.6 });
        if (!alive(v)) return;
        a.faceTo(b.pos.x, b.pos.z);
        a.pose = 'happy';
        yield* waitUntil(() => v.greeted || !alive(v), 20);
        if (!alive(v)) return;
        a.faceTo(b.pos.x, b.pos.z);
        if (id === 'mano') {
            if (!s.dog.metMano) {
                s.dog.metMano = true;
                log(`${DOG.name}が、まのにとびついて大よろこびした🌰💖`);
                yield* converse(DOG_HELLO.manoFirst, cast());
            } else {
                yield* converse(pickFresh(DOG_HELLO.mano), cast());
            }
        } else if (!s.dog.metMika) {
            s.dog.metMika = true;
            log(`みかにゃんと${DOG.name}が、また会えた🐱🌰 むかしみたいに、くっついてた`);
            yield* converse(DOG_HELLO.mikanyanFirst, cast());
        } else {
            yield* converse(pickFresh(DOG_HELLO.mikanyan), cast());
        }
        ctx.fx.burst(a.headPos(), ['💖', '🌰', '✨'], 5);
        a.pose = 'stand';
        yield* waitMin(2);
        return;
    }
    // まずは子みくろんのうしろ（お客さんと反対がわ）へ
    D.shy = true;
    if (dist(a, k) < 6) {
        const ang = Math.atan2(k.pos.x - b.pos.x, k.pos.z - b.pos.z);
        const p = ctx.nav.snap(k.pos.x + Math.sin(ang) * 0.7, k.pos.z + Math.cos(ang) * 0.7);
        yield* walkTo(a, p.x, p.z, { speed: 1.1 });
    } else {
        yield* goSpot(a, W().spots.dogBed, 'sit');
    }
    a.faceTo(b.pos.x, b.pos.z);
    a.pose = 'shy';
    if (free(a, 0.5)) a.say(pick(DOGL.hide));
    yield* waitUntil(() => v.greeted || !alive(v), 20);
    yield* waitMin(rand(2, 4), () => { a.faceTo(b.pos.x, b.pos.z); });
    if (!alive(v)) return;
    // そーっと近づいて、くんくん
    a.pose = 'stand';
    const p = nearOf(b, 0.8);
    yield* walkTo(a, p.x, p.z, { speed: 0.5 });
    D.shy = false;
    if (!alive(v)) return;
    a.faceTo(b.pos.x, b.pos.z);
    a.pose = 'happy';
    yield* converse(pickFresh(DOG_HELLO[id]), cast());
    a.pose = 'stand';
    yield* waitMin(2);
}

// ── 子みくろんとマロンで（子みくろんの行動として動く）──
export function candidates() {
    const s = S(), h = hour(), out = [];
    if (!agent || D.busy || D.asleep) return out;
    if (!s.dog.met) return [['intro', 900]];
    // おさらの前で待っていたら、なるべく早く
    if (mealDue()) out.push(['feed', D.hungry ? 480 : 280]);
    if (h >= 7 && h < 18.5) out.push(['walk', s.dog.walkDay !== s.day ? 210 : 60], ['fetch', 110]);
    if (h >= 9 && h < 22) out.push(['brush', s.dog.brushDay !== s.day ? 110 : 30]);
    return out;
}

// 決まった時間にひとことずつ：[分, 話す人, セリフ]
function cues(list) {
    let i = 0;
    return (dt, t) => {
        while (i < list.length && t >= list[i][0]) {
            const [, who, line] = list[i++];
            if (who?.active) who.say(dv(line));
        }
    };
}

let brushProp = null;
function brush() {
    if (!brushProp) {
        brushProp = new THREE.Group();
        cbox(brushProp, 0.035, 0.035, 0.16, 0xff9cc8, 0, 0, 0);
        cbox(brushProp, 0.09, 0.03, 0.09, 0xffffff, 0, -0.02, 0.1);
    }
    return brushProp;
}

// ちょうど子みくろんのそばを歩きつづける（合図があるまで）
function* heel(meet) {
    const a = agent, k = ctx.km;
    while (!meet.done) {
        const fx = Math.sin(k.yaw), fz = Math.cos(k.yaw);
        const p = ctx.nav.snap(k.pos.x + fx * 0.6 + fz * 0.45, k.pos.z + fz * 0.6 - fx * 0.45);
        const kx = k.pos.x, kz = k.pos.z;
        if (Math.hypot(a.pos.x - p.x, a.pos.z - p.z) > 0.4) {
            a.pose = 'stand';
            yield* walkTo(a, p.x, p.z, { until: () => meet.done || Math.hypot(k.pos.x - kx, k.pos.z - kz) > 1.0 });
        } else {
            a.faceTo(k.pos.x + fx, k.pos.z + fz);
            a.pose = k.moving ? 'stand' : 'sniff';
        }
        yield;
    }
    a.pose = 'stand';
}

export const PLAY = {
    // はじめての ごあいさつ（1回だけ）
    *intro(k) {
        const a = agent;
        k.label = `${DOG.name}と はじめての ごあいさつ🌰`;
        D.label = 'はじめての ごあいさつ🌰';
        const meet = { done: false };
        const release = claim('k');
        a.setCo((function* () {
            a.pose = 'shy';
            while (!meet.done) {
                a.faceTo(k.pos.x, k.pos.z);
                yield;
            }
        })());
        try {
            const d = dist(k, a) || 1;
            const p = ctx.nav.snap(a.pos.x + ((k.pos.x - a.pos.x) / d) * 0.95, a.pos.z + ((k.pos.z - a.pos.z) / d) * 0.95);
            yield* walkTo(k, p.x, p.z);
            k.faceTo(a.pos.x, a.pos.z);
            k.pose = 'stand';
            const hl = hold([k, a]);
            try {
                ctx.fx.banner(`${DOG.name}が来たよ🌰`, 'これからは、おうちの中で いっしょに暮らすよ');
                ctx.sound.sparkle();
                S().dog.met = true;
                log(`${DOG.name}が、子みくろんのおうちでいっしょに暮らすことになった🌰🏡`);
                yield* converse(DOG_INTRO, { k, dog: a });
            } finally {
                hl();
            }
            a.pose = k.pose = 'happy';
            ctx.fx.burst(a.headPos(), ['🌰', '💖', '✨'], 5);
            ctx.sound.bark();
            addStat('nakayoshi', 8);
            addStat('tanoshisa', 8);
            yield* waitMin(3);
            k.pose = 'stand';
        } finally {
            meet.done = true;
            release();
            a.pose = 'stand';
        }
    },

    *feed(k) {
        const a = agent, s = S(), sp = W().spots;
        const am = hour() < 12;
        k.label = `${DOG.name}のごはんを用意している🍖`;
        const meet = { done: false };
        const release = claim('k');
        a.setCo(join(a, sp.dogBowl, meet, 'sit'));
        try {
            yield* goSpot(k, sp.dogFeed);
            k.say(dv(pick(L.dogFeed)));
            yield* waitMin(2);
            W().setDogFood(true);
            ctx.sound.pop();
            if (!(yield* waitUntil(() => a.atSpot, 8))) return;
            a.pose = 'eat';
            D.label = 'ごはんを はぐはぐ🍖';
            let mt = 0;
            yield* waitMin(6, (dt) => {
                mt += dt;
                if (mt > 1.5) {
                    mt = 0;
                    ctx.sound.munch();
                    ctx.fx.emoji(a.headPos(), pick(['🍖', '💕', '✨']), { rise: 30 });
                }
            });
            a.pose = 'happy';
            s.dog[am ? 'am' : 'pm'] = s.day;
            k.say(dv(pick(L.dogFeedDone)));
            addStat('nakayoshi', 3);
            addStat('tanoshisa', 4);
            tally(`${DOG.name}にごはんをあげた🍖`);
            yield* waitMin(2);
        } finally {
            W().setDogFood(false);
            meet.done = true;
            release();
        }
    },

    // お庭をぐるっと。マロンは子みくろんのそばを歩いて、とちゅうで くんくん
    *walk(k) {
        const a = agent, s = S();
        k.label = `${DOG.name}とおさんぽ🐾`;
        k.say(dv(pick(L.dogWalkStart)));
        const meet = { done: false };
        const release = claim('k');
        D.label = '子みくろんと おさんぽ🐾';
        a.setCo(heel(meet));
        try {
            yield* waitMin(2);
            const pts = shuffle(W().strollPoints).slice(0, 4);
            for (let i = 0; i < pts.length; i++) {
                yield* walkTo(k, pts[i][0], pts[i][1], { speed: 0.9 });
                k.pose = 'look';
                if (i === 1) yield* converse(pickFresh(DOG_WALK), { k, dog: a });
                else yield* waitMin(rand(2, 4));
                k.pose = 'stand';
                addStat('tanoshisa', 4);
            }
            s.dog.walkDay = s.day;
            s.dog.walks++;
            addStat('nakayoshi', 3);
            k.say(dv(pick(L.dogWalkDone)));
            tally(`${DOG.name}とおさんぽした🐾`);
            yield* waitMin(3);
        } finally {
            meet.done = true;
            release();
        }
    },

    // ラグの上で、ブラッシング（夜でもできる）
    *brush(k) {
        const a = agent, s = S(), sp = W().spots;
        k.label = `${DOG.name}をブラッシング✨`;
        const meet = { done: false };
        const release = claim('k');
        a.setCo(join(a, sp.rugA, meet, 'sit'));
        try {
            k.meeting = true;
            yield* goSpot(k, sp.rugB);
            k.meeting = false;
            if (!(yield* waitUntil(() => a.atSpot, 12))) return;
            const hl = hold([k, a]);
            D.label = 'ブラッシングで うっとり✨';
            k.model.hold(brush(), new THREE.Vector3(0.02, 0.05, 0.2));
            try {
                k.say(dv(pick(L.dogBrush)));
                k.pose = 'draw';
                k.faceTo(a.pos.x, a.pos.z);
                const cue = cues([
                    [3, a, '（うっとり…）'],
                    [5.5, k, '{dog}の毛、栗みたいに つやつやになってきたっちゃ〜🌰'],
                    [7.5, k, 'さいごに、リボンも むすびなおすっちゃ〜🎀'],
                    [9, a, 'わふ♡'],
                ]);
                let st = 0;
                yield* waitMin(10, (dt, t) => {
                    cue(dt, t);
                    st += dt;
                    if (st > 2) {
                        st = 0;
                        ctx.fx.emoji(a.headPos(), '✨', { rise: 30 });
                    }
                });
            } finally {
                k.model.hold(null);
                hl();
            }
            k.pose = 'sit';
            yield* converse([['dog', 'わふっ！（ぶるぶるっ）'], ['k', 'あ〜っ、せっかく とかしたのに〜😂']], { k, dog: a });
            s.dog.brushDay = s.day;
            addStat('tanoshisa', 6);
            addStat('nakayoshi', 3);
            tally(`${DOG.name}をブラッシングした✨`);
            yield* waitMin(2);
        } finally {
            k.meeting = false;
            meet.done = true;
            release();
        }
    },

    // 取ってこい：ボールを投げて、マロンが鼻でころころ押して もってくる
    *fetch(k) {
        const a = agent, b = ctx.ball;
        k.label = `${DOG.name}と「取ってこい」⚽`;
        const pK = { x: 2.3, z: 7.6 }, pD = { x: 2.9, z: 7.15 }, look = { x: 6.2, z: 7.4 };
        const meet = { done: false };
        const release = claim('k');
        a.setCo(join(a, spotAt(pD.x, pD.z, faceYaw(pD, look), 'sit'), meet, 'sit'));
        try {
            k.meeting = true;
            yield* goSpot(k, spotAt(pK.x, pK.z, faceYaw(pK, look)));
            k.meeting = false;
            if (!(yield* waitUntil(() => a.atSpot, 12))) return;
            const hl = hold([k, a]);
            try {
                for (let i = 0; i < 3; i++) {
                    const tx = rand(5.3, 6.8), tz = rand(6.6, 8.0);
                    k.faceTo(tx, tz);
                    k.pose = 'happy';
                    k.say(dv(pick(L.dogFetchGo)), 1.8);
                    ctx.sound.bounce();
                    b.passTo(new THREE.Vector3(k.pos.x + 0.45, 0.18, k.pos.z), new THREE.Vector3(tx, 0.18, tz), 1.2);
                    const job = { done: false };
                    a.setCo(fetchRun(job, meet));
                    yield* waitMin(0.7);
                    k.pose = 'stand';
                    yield* waitUntil(() => job.done, 12);
                    if (!job.done) break;
                    k.faceTo(a.pos.x, a.pos.z);
                    k.pose = 'happy';
                    k.say(dv(pick(L.dogFetchBack)));
                    ctx.fx.burst(a.headPos(), ['💖', '✨'], 3);
                    addStat('tanoshisa', 5);
                    yield* waitMin(2);
                    k.pose = 'stand';
                }
            } finally {
                hl();
            }
            addStat('nakayoshi', 3);
            tally(`${DOG.name}と「取ってこい」であそんだ⚽`);
            yield* waitMin(2);
        } finally {
            k.meeting = false;
            meet.done = true;
            release();
        }
    },
};

function* fetchRun(job, meet) {
    const a = agent, b = ctx.ball, k = ctx.km;
    a.pose = 'stand';
    a.say('わんっ！', 1.2);
    const to = b.pass ? b.pass.to.clone() : b.pos.clone();
    yield* walkTo(a, to.x - 0.35, to.z, { speed: 1.1, until: () => meet.done });
    if (meet.done) return;
    yield* waitUntil(() => !b.pass, 3);
    a.faceTo(b.pos.x, b.pos.z);
    a.pose = 'sniff';
    yield* waitMin(0.6);
    a.pose = 'stand';
    const nose = () => b.place(a.pos.x + Math.sin(a.targetYaw) * 0.32, a.pos.z + Math.cos(a.targetYaw) * 0.32);
    const back = ctx.nav.snap(k.pos.x + 0.6, k.pos.z + 0.05);
    yield* walkTo(a, back.x, back.z, { speed: 0.55, until: () => { nose(); return meet.done; } });
    a.faceTo(k.pos.x, k.pos.z);
    a.pose = 'sit';
    a.say(pick(DOGL.fetch));
    job.done = true;
    while (!meet.done) yield;
    a.pose = 'stand';
}

// ── お客さんとマロンの遊び（お客さんのふだんの過ごし方から。PAIR_PLAY とおなじ形）──
const PAIR_GAP = 150;
const ANY_PAIR_GAP = 40;
const pairAt = {};
let lastPairAt = -1e9;
const STAR_COLS = [0xffe27a, 0xcdb9ff, 0xff9de2, 0xffffff];

function facing(ax, az, bx, bz, pose = 'stand') {
    const p = { x: ax, z: az }, q = { x: bx, z: bz };
    return [spotAt(ax, az, faceYaw(p, q), pose), spotAt(bx, bz, faceYaw(q, p), pose)];
}

// あとをついて走る（おいかけっこ）
function* chase(target, job) {
    const a = agent;
    while (!job.done) {
        const tx = target.pos.x - Math.sin(target.yaw) * 0.7, tz = target.pos.z - Math.cos(target.yaw) * 0.7;
        const p = ctx.nav.snap(tx, tz);
        const ox = target.pos.x, oz = target.pos.z;
        if (Math.hypot(a.pos.x - p.x, a.pos.z - p.z) > 0.3) {
            yield* walkTo(a, p.x, p.z, { speed: 0.75, until: () => job.done || Math.hypot(target.pos.x - ox, target.pos.z - oz) > 0.6 });
        }
        yield;
    }
}

// spots(b) → [お客さんの席, マロンの席]。body(b, d, cast, ok)：b はお客さん、d はマロン
export const DOG_PAIR = {
    mano: [{
        memo: `まのと${DOG.name}が「おて」をしてた🌰 ちゃんと、おぼえてた`,
        label: 'まのと「おて」の練習🐾',
        spots: () => facing(-0.2, 6.3, 0.7, 6.3),
        poses: ['stand', 'stand'],
        *body(m, d, cast, ok) {
            yield* converse([['mano', 'マロン、おすわり！']], cast);
            d.pose = 'sit';
            yield* converse([['dog', '（すとん！）']], cast);
            yield* waitMin(1);
            yield* converse([['mano', 'おて！']], cast);
            d.pose = 'beg';
            yield* converse([['dog', '（ぽふっ）']], cast);
            yield* waitMin(1);
            d.pose = 'sit';
            if (!ok()) return;
            yield* converse([['mano', 'おかわり！']], cast);
            d.pose = 'beg';
            yield* converse([['dog', '（ぽふっ）わん！']], cast);
            yield* waitMin(1);
            d.pose = 'happy';
            m.pose = 'happy';
            ctx.fx.burst(d.headPos(), ['🦴', '💖'], 3);
            yield* converse([['mano', 'ぜんぶ おぼえてる…！えらいね、マロン💖 ごほうびだよ🦴', { fx: '🦴' }], ['dog', 'はぐはぐ♡'], ['k', '{dog}、まのの前だと、いちばん いい顔するっちゃ〜😊']], cast);
            m.pose = 'stand';
            d.pose = 'sit';
        },
    }],
    kuromi: [{
        memo: `${DOG.name}が、クロミちゃんの星くずをつかまえようとしてた✨`,
        label: 'クロミちゃんの星くずを おいかけている✨',
        spots: () => facing(5.6, 5.4, 6.6, 5.8),
        poses: ['stand', 'stand'],
        *body(ku, d, cast, ok) {
            ku.model.glow = 1;
            const tip = new THREE.Vector3();
            let next = 0, hop = 0;
            try {
                d.startleT = 2;
                yield* converse([['kuromi', '{dog}、ぶし（星）をつかまえてごらんさー🖤✨'], ['dog', 'きゃん…！（びくっ）'], ['kuromi', 'あい、びっくりしたねー。こわくないよー、きれいでしょー🖤'], ['dog', 'わふ…！']], cast);
                const cue = cues([[2, d, 'わふ！（ぴょん！）'], [4, d, 'わんわん！'], [6, ku, 'こっちさー🖤'], [7.5, d, '（ぱくっ！…あれ？）']]);
                yield* waitMin(9, (dt, t) => {
                    cue(dt, t);
                    if (ctx.tReal >= next) {
                        next = ctx.tReal + 0.18;
                        ku.model.antennaPos(tip);
                        ctx.fx.spark(tip, { color: pick(STAR_COLS), size: rand(0.12, 0.22), life: 1.1, vel: new THREE.Vector3(rand(-0.8, 0.8), rand(0.6, 1.4), rand(-0.8, 0.8)) });
                    }
                    hop += dt;
                    if (hop > 1.2) {
                        hop = 0;
                        d.pose = d.pose === 'happy' ? 'beg' : 'happy';
                        d.faceTo(ku.pos.x + rand(-0.5, 0.5), ku.pos.z + rand(-0.5, 0.5));
                    }
                    if (!ok()) return false;
                });
            } finally {
                ku.model.glow = 0;
                d.pose = 'stand';
            }
            if (!ok()) return;
            yield* converse([['dog', '（口を あけて きょとん）'], ['kuromi', 'ぶしは、食べられないさー😂 でも、いいジャンプだったよー🖤'], ['k', '{dog}、おしかったっちゃ〜！✨']], cast);
        },
    }],
    mikanyan: [
        {
            when: () => hour() >= 8 && hour() < 17,
            memo: `みかにゃんと${DOG.name}が、寝床でくっついてお昼寝してた🐱🌰💤`,
            label: 'みかにゃんと くっついて おひるね🐱💤',
            spots: () => [W().spots.dogBedSide, W().spots.dogBed],
            poses: ['sit', 'sit'],
            *body(mi, d, cast, ok) {
                yield* converse([['mikanyan', 'マロン、いっしょに お昼寝するにゃ。むかしみたいに、くっつくにゃ'], ['dog', 'わふ♡（寝床を はんぶん あける）']], cast);
                mi.pose = d.pose = 'sleep';
                const cue = cues([[2.5, mi, 'ごろごろ…マロン、あったかいにゃ…'], [5, d, '（みかにゃんに あごを のせる）'], [7.5, mi, 'むにゃ…むかしと、おんなじにゃ…♾️']]);
                let z = 0;
                yield* waitMin(9, (dt, t) => {
                    cue(dt, t);
                    z += dt;
                    if (z > 2.5) {
                        z = 0;
                        ctx.fx.emoji(pick([mi, d]).headPos(), pick(['💤', '💕']), { rise: 34 });
                    }
                    if (!ok()) return false;
                });
                mi.pose = d.pose = 'sit';
                if (!ok()) return;
                yield* converse([['mikanyan', 'ふにゃ〜…むげんに よく寝たにゃ♾️'], ['dog', '（のび〜）わふ'], ['k', 'ふたりとも、ずーっと くっついてたっちゃ〜🍡💖']], cast);
            },
        },
        {
            when: () => hour() >= 7 && hour() < 18.5,
            memo: `みかにゃんと${DOG.name}が、お庭でおいかけっこしてた🐱🌰`,
            label: 'みかにゃんと おいかけっこ🐱',
            spots: () => {
                const C = W().circle;
                return facing(C.x - C.r - 0.3, C.z, C.x - C.r - 1.1, C.z + 0.2);
            },
            poses: ['stand', 'stand'],
            *body(mi, d, cast, ok) {
                yield* converse([['mikanyan', 'マロン、おいかけっこするにゃ！つかまえてみるにゃ〜！'], ['dog', 'わんっ！！']], cast);
                if (!ok()) return;
                const job = { done: false };
                d.setCo(chase(mi, job));
                const C = W().circle;
                const t0 = absMin();
                const cue = cues([[1, mi, 'ねこは、まがるのが はやいにゃ！'], [3, d, 'わんわんわん！'], [5.5, mi, 'にゃはは〜♾️'], [7.5, d, '（ぜんそくりょく）']]);
                try {
                    for (let i = 0; i < 7 && ok(); i++) {
                        const ang = Math.PI + (i / 6) * Math.PI * 2;
                        const p = ctx.nav.snap(C.x + Math.sin(ang) * (C.r + 0.6), C.z + Math.cos(ang) * (C.r + 0.6));
                        yield* walkTo(mi, p.x, p.z, { speed: 1.3, until: () => { cue(0, absMin() - t0); return !ok(); } });
                        yield;
                    }
                } finally {
                    job.done = true;
                }
                if (!ok()) return;
                const p = ctx.nav.snap(mi.pos.x + 0.55, mi.pos.z + 0.2);
                yield* walkTo(d, p.x, p.z);
                d.faceTo(mi.pos.x, mi.pos.z);
                mi.pose = 'sleep';
                d.pose = 'sit';
                yield* converse([['mikanyan', 'ふにゃ〜…ひとやすみにゃ…'], ['dog', 'へっへっへっ…（ごろん）'], ['mikanyan', 'マロンは、やっぱり はやいにゃ。むかしと おんなじにゃ♾️'], ['k', 'ねこだんごと、いぬだんごだっちゃ〜🍡']], cast);
                d.pose = 'sleep';
                yield* waitMin(3);
                mi.pose = 'stand';
                d.pose = 'stand';
            },
        },
    ],
    nee: [{
        memo: `おねえちゃんが${DOG.name}をブラッシングしてくれた✨`,
        label: 'おねえちゃんに ブラッシングしてもらっている✨',
        spots: () => facing(-3.3, 4.85, -2.5, 4.9),
        poses: ['sit', 'sit'],
        *body(n, d, cast, ok) {
            yield* converse([['nee', '{dog}、毛っこ とかしてけっか〜。こっちゃ来い〜🌸'], ['dog', 'わふ！（ひざに あごを のせる）']], cast);
            if (!ok()) return;
            n.pose = 'draw';
            const cue = cues([[2, n, 'ふわっふわだごど〜'], [4.5, d, '（うっとり…）'], [6, n, 'ほれ、栗色の毛っこ、つやっつやになったぞ〜🌰'], [7.5, n, 'リボンも、めんごぐ むすんでけっからな〜🎀']]);
            let st = 0;
            yield* waitMin(8, (dt, t) => {
                cue(dt, t);
                st += dt;
                if (st > 2) {
                    st = 0;
                    ctx.fx.emoji(d.headPos(), '✨', { rise: 30 });
                }
                if (!ok()) return false;
            });
            n.pose = 'sit';
            if (!ok()) return;
            yield* converse([['dog', 'わふっ！（ぶるぶるっ）'], ['nee', 'あいや〜！せっかぐ とかしたのに〜😂'], ['k', '{dog}、いっつもそうなんだっちゃ〜😂']], cast);
        },
    }],
};

export function pairChance(v) {
    const k = ctx.km;
    // お泊まりした朝は、朝ごはんが先
    if (!agent || !S().dog.met || D.busy || D.asleep || v.morning) return null;
    if (absMin() - lastPairAt < ANY_PAIR_GAP || !chance(0.2)) return null;
    if (k.deepSleep || k.actId === 'greet' || k.actId === 'resonance' || ctx.life.isNight()) return null;
    if (absMin() - (pairAt[v.def.id] ?? -1e9) < PAIR_GAP) return null;
    const opts = (DOG_PAIR[v.def.id] ?? []).filter((d) => !d.when || d.when());
    return opts.length ? pick(opts) : null;
}

export function* pairPlay(v, def) {
    const a = agent, b = v.agent;
    const spots = def.spots(b);
    if (!spots) return;
    pairAt[v.def.id] = lastPairAt = absMin();
    const meet = { done: false };
    const release = claim('pair');
    v.busy = true;
    D.label = def.label;
    a.setCo(join(a, spots[1], meet, def.poses[1]));
    let hl = null;
    const ok = () => alive(v) && D.claim?.who === 'pair';
    try {
        yield* goSpot(b, spots[0], def.poses[0]);
        yield* waitUntil(() => a.atSpot || !ok(), 15);
        if (!a.atSpot || !ok()) return;
        hl = hold([a, b]);
        const k = ctx.km;
        const cast = { [v.def.id]: b, dog: a, k: dist(k, b) < 7 && free(k, 1) && !k.sleeping ? k : null };
        yield* def.body(b, a, cast, ok);
        if (ok()) {
            b.pose = def.poses[0];
            tally(def.memo);
        }
    } finally {
        hl?.();
        meet.done = true;
        release();
        v.busy = false;
        lastPairAt = absMin();
    }
}
