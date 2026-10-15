import * as THREE from 'three';
import { ctx } from './ctx.js';
import { L, TALK, TALK_DEFAULT, TALK_ASK } from './lines.js';
import { DISHES, FORKS } from './house.js';
import { goSpot, leaveSpot, walkTo, waitMin, waitUntil, freeSpot, indoors } from './agent.js';
import { addStat, log, hour, absMin } from './state.js';
import { pick, rand, randInt, chance, fill, shuffle, clockText, speechSec } from './util.js';
import { free, react, touch, answer, chime, hush, hold } from './chatter.js';

const W = () => ctx.world;
const S = () => ctx.state;

export const isNight = () => {
    const h = hour();
    return h >= 22.5 || h < 6.5;
};
const isBedtime = () => {
    const h = hour();
    return h >= 23 || h < 6.5;
};

function say(k, lines, vars, sec) {
    k.say(fill(pick(lines), vars ?? {}), sec);
}
// おまけのひとこと：ほかのおしゃべりの途中なら言わない
function murmur(k, lines, vars) {
    if (free(k)) say(k, lines, vars);
}
function sparkle(k, chars, n = 4) {
    ctx.fx.burst(k.headPos(), chars, n);
}

function pickDish() {
    const h = hour();
    const pool = h < 10 ? ['onigiri', 'lafrance', 'sakuranbo'] : h < 16 ? ['ramen', 'tamakon', 'onigiri', 'dadacha'] : ['imoni', 'imoni', 'dadacha', 'tamakon'];
    const id = pick(pool);
    return DISHES.find((d) => d.id === id);
}

// ── 音叉（i は FORKS の番号：0=396Hz 1=528Hz 2=963Hz 3=♾️Hz）──
export const forkOf = (id) => FORKS.findIndex((f) => f.who.includes(id));

export function strikeFork(i) {
    const f = W().forks[i];
    W().strikeFork(i);
    ctx.sound.fork(f.freq);
    ctx.fx.ring(new THREE.Vector3(f.base.x, f.base.y + 0.1, f.base.z), f.ring, { s0: 0.3, s1: 1.9, life: 2.2 });
    ctx.fx.emoji(f.top, f.freq ? '🎵' : '♾️', { rise: 50 });
}

// その音叉のうしろへ行って、ふりかぶって、ちょん
export function* tapFork(k, i) {
    yield* goSpot(k, W().spots.fork[i], 'fork');
    k.windup = true;
    try {
        yield* waitMin(0.45);
    } finally {
        k.windup = false;
    }
    strikeFork(i);
}

export function holdMallet(k, on) {
    if (on) {
        k.model.hold(W().props.mallet, new THREE.Vector3(0, 0.05, 0.16));
        return;
    }
    k.model.hold(null);
    W().returnMallet();
}

// ── 子みくろんの行動 ──

function* actSleep(k) {
    // 夜にアプリを開いたときは、もうベッドの中（あくびも日記もなし）
    if (k.onSpot !== W().spots.bed) {
        k.label = 'ねむくなってきた…';
        say(k, L.sleepy);
        yield* goSpot(k, W().spots.bed);
    }
    k.label = 'ベッドでぐっすり眠っている💤';
    k.sleeping = k.deepSleep = true;
    W().setBedCover(true);
    S().lights = false;
    if (S().diary[0]?.t !== 'おやすみなさい🌙') log('おやすみなさい🌙');
    let z = 0;
    try {
        while (isNight()) {
            z += (yield) || 0;
            if (z > 7) {
                z = 0;
                ctx.fx.emoji(k.headPos(), '💤', { rise: 40 });
            }
        }
    } finally {
        k.sleeping = k.deepSleep = false;
        W().setBedCover(false);
    }
    k.pose = 'sit';
    say(k, L.wake);
    ctx.sound.yawn();
    log(`おはよう（${S().day}日目）☀️`);
    yield* waitMin(6);
}

function* actNap(k) {
    k.label = 'ソファへ向かっている';
    say(k, L.nap);
    yield* goSpot(k, W().spots.sofaNap);
    k.label = 'ソファでお昼寝中💤';
    k.sleeping = true;
    let z = 0;
    try {
        yield* waitMin(rand(50, 80), (dt) => {
            addStat('genki', dt * 0.25);
            z += dt;
            if (z > 7) {
                z = 0;
                ctx.fx.emoji(k.headPos(), '💤', { rise: 40 });
            }
            if (isNight()) return false;
        });
    } finally {
        k.sleeping = false;
    }
    k.pose = 'sit';
    say(k, L.napWake);
    log('お昼寝した💤');
    yield* waitMin(3);
}

function* actCalendar(k) {
    k.label = '日めくりカレンダーのところへ';
    yield* goSpot(k, W().spots.calendar);
    k.label = '日めくりカレンダーをめくっている📅';
    yield* waitMin(2.5);
    W().flipCalendar(S().day);
    S().calendarDay = S().day;
    ctx.sound.flip();
    k.pose = 'happy';
    say(k, L.calendar, { n: S().day });
    sparkle(k, ['🌸', '✨', '📅']);
    react('calendar', { day: S().day });
    log(`カレンダーをめくった（${S().day}日目）📅`);
    addStat('tanoshisa', 4);
    yield* waitMin(5);
    k.pose = 'stand';
}

function* actEat(k) {
    let dish = S().food ? DISHES.find((d) => d.id === S().food) : null;
    const placed = !!dish && !k.cookedFood;
    if (!dish) {
        k.label = 'ごはんの準備をしている🍳';
        yield* goSpot(k, W().spots.cook);
        murmur(k, L.cook);
        let st = 0;
        yield* waitMin(rand(12, 18), (dt) => {
            st += dt;
            if (st > 3) {
                st = 0;
                ctx.fx.emoji(W().potPos, '♨️', { rise: 30, size: 16 });
            }
        });
        dish = pickDish();
        S().food = dish.id;
        k.cookedFood = true;
        W().placeFood(dish.id);
    }
    k.label = 'テーブルへ向かっている';
    yield* goSpot(k, W().spots.seatN);
    k.label = `${dish.name}を食べている😋`;
    say(k, L.eatStart);
    let mt = 0;
    yield* waitMin(rand(16, 22), (dt) => {
        mt += dt;
        if (mt > 4) {
            mt = 0;
            ctx.sound.munch();
            ctx.fx.emoji(k.headPos(), pick(['😋', '✨', '💕']), { rise: 34 });
        }
    });
    W().clearFood();
    S().food = null;
    k.cookedFood = false;
    addStat('onaka', 55);
    addStat('tanoshisa', 6);
    addStat('genki', 6);
    if (placed) addStat('nakayoshi', 4);
    k.pose = 'happy';
    say(k, L.eatDone, { dish: dish.name });
    log(placed ? `まのが置いてくれた${dish.name}を食べた😋` : `ごはんを食べた（${dish.name}）`);
    yield* waitMin(3);
}

function* actCode(k) {
    k.label = '机へ向かっている';
    yield* goSpot(k, W().spots.desk);
    k.label = '机でコードを書いている💻';
    W().screen.setMode('code');
    const dur = rand(50, 110);
    let t = 0, next = rand(6, 12), commitAt = rand(22, 40), commits = 0;
    try {
        while (t < dur && !isBedtime()) {
            const dt = (yield) || 0;
            t += dt;
            addStat('tanoshisa', dt * 0.12);
            addStat('genki', -dt * 0.03);
            if (t > next) {
                next = t + rand(14, 24);
                murmur(k, L.code);
            }
            if (t > commitAt && commits < 2) {
                commits++;
                commitAt = t + rand(25, 45);
                S().commits++;
                ctx.sound.commit();
                say(k, L.commit, { n: S().commits });
                sparkle(k, ['✨', '🎉', '💖'], 5);
                react('commit');
                log(`コミットした（${S().commits}回目）✨`);
            }
        }
    } finally {
        W().screen.setMode('idle');
    }
    log('コードを書いた💻');
    k.pose = 'sit';
    yield* waitMin(2);
}

function growFlowers() {
    let bloomed = 0, reseeded = 0;
    S().flowers.forEach((f) => {
        f.g++;
        if (f.g === 3) bloomed++;
        if (f.g >= 8) {
            f.g = 0;
            f.c = (f.c + 2) % 5;
            reseeded++;
        }
    });
    W().setFlowers(S().flowers);
    return { bloomed, reseeded };
}

function* actWater(k) {
    k.label = '花壇へ向かっている';
    yield* goSpot(k, W().spots.water);
    k.label = '花壇に水やり💧';
    k.model.hold(W().props.can, new THREE.Vector3(0.02, 0.06, 0.24));
    try {
        let dt0 = 0;
        yield* waitMin(10, (dt) => {
            dt0 += dt;
            if (dt0 > 1.6) {
                dt0 = 0;
                ctx.sound.water();
                ctx.fx.emoji(W().flowerPos, '💧', { rise: -30, spread: 140, life: 1.1 });
            }
        });
    } finally {
        k.model.hold(null);
        W().returnCan();
    }
    const res = growFlowers();
    S().wateredDay = S().day;
    addStat('tanoshisa', 6);
    addStat('kirakira', 3);
    log('花壇に水をやった💧');
    if (res.bloomed) {
        k.pose = 'happy';
        say(k, L.bloom);
        sparkle(k, ['🌸', '🌷', '✨'], 5);
        react('bloom');
        ctx.sound.sparkle();
        log('お花が咲いた🌸');
    } else {
        say(k, L.water);
    }
    if (res.reseeded) log('新しい種をまいた🌱');
    yield* waitMin(4);
}

function* actCherry(k) {
    k.label = 'さくらんぼの木へ向かっている';
    yield* goSpot(k, W().spots.cherry);
    k.label = 'さくらんぼを収穫している🍒';
    yield* waitMin(8);
    const n = randInt(10, 16);
    S().cherries += n;
    S().cherryReadyDay = S().day + 2;
    W().setCherries(false);
    k.pose = 'happy';
    say(k, L.cherry, { n });
    sparkle(k, ['🍒', '✨'], 5);
    react('cherry');
    addStat('onaka', 6);
    addStat('tanoshisa', 8);
    log(`さくらんぼを収穫した（${n}個）🍒`);
    yield* waitMin(4);
}

function* actBath(k) {
    k.label = '温泉へ向かっている';
    yield* goSpot(k, W().spots.onsen);
    k.label = '温泉でぽかぽか♨️';
    ctx.sound.splash();
    W().onsenUsers++;
    let bt = rand(3, 6);
    try {
        yield* waitMin(rand(28, 40), (dt, t) => {
            addStat('kirakira', dt * 1.7);
            addStat('genki', dt * 0.12);
            if (t > bt) {
                bt = t + rand(10, 16);
                murmur(k, L.bath);
                ctx.fx.emoji(k.headPos(), '♨️', { rise: 40 });
            }
        });
    } finally {
        W().onsenUsers--;
    }
    S().bathDay = S().day;
    say(k, L.bathDone);
    log('温泉に入った♨️');
    yield* leaveSpot(k);
    ctx.sound.splash();
    sparkle(k, ['✨', '💎']);
    yield* waitMin(3);
}

function* actRead(k) {
    k.label = '本を選んでいる';
    yield* goSpot(k, W().spots.bookshelf);
    yield* waitMin(2.5);
    k.label = 'ソファへ向かっている';
    yield* goSpot(k, W().spots.sofa);
    k.label = 'ソファで本を読んでいる📖';
    k.pose = 'read';
    k.model.hold(W().props.book, new THREE.Vector3(-0.52, 0.06, 0.22));
    try {
        let next = rand(8, 14);
        yield* waitMin(rand(35, 55), (dt, t) => {
            addStat('tanoshisa', dt * 0.35);
            if (t > next) {
                next = t + rand(14, 22);
                murmur(k, L.read);
            }
            if (isBedtime()) return false;
        });
    } finally {
        k.model.hold(null);
    }
    log('本を読んだ📖');
    yield* waitMin(2);
}

function* actPurify(k) {
    k.label = '音叉のところへ';
    yield* goSpot(k, W().spots.fork[0], 'fork');
    k.label = '音叉で396Hzを響かせている🔔';
    holdMallet(k, true);
    try {
        say(k, L.purify);
        const dur = rand(16, 24);
        let t = 0;
        while (t < dur) {
            yield* tapFork(k, 0);
            if (chance(0.3)) murmur(k, L.purify);
            yield* waitMin(3.5, (dt) => {
                t += dt;
                addStat('kirakira', dt * 1.0);
                addStat('tanoshisa', dt * 0.2);
            });
        }
    } finally {
        holdMallet(k, false);
    }
    log('396Hzで浄化した🔔');
    sparkle(k, ['✨', '🔔', '💖'], 5);
    yield* waitMin(2);
}

// 音叉で、ソルフェジオファミリーみんなの音をひとつずつ聴く。ひとりのときも、みんなの音といっしょ
function* actListen(k) {
    k.label = '音叉のところへ';
    yield* goSpot(k, W().spots.fork[0], 'fork');
    k.label = '音叉でみんなの周波数を聴いている🎵';
    holdMallet(k, true);
    const release = hold([k]);
    const here = (id) => ctx.family.present().some((v) => v.def.id === id && v.greeted);
    const glow = (dt) => {
        addStat('kirakira', dt * 0.5);
        addStat('tanoshisa', dt * 0.3);
    };
    try {
        say(k, L.listenStart);
        yield* waitMin(2.5);
        for (let i = 0; i < FORKS.length; i++) {
            yield* tapFork(k, i);
            const [owner] = FORKS[i].who;
            say(k, L.listen[owner]);
            react(`fork_${owner}`, {}, 0);
            yield* waitMin(3.4, glow);
            // その音の人がいないときは、とどけ〜って思いうかべる
            const away = FORKS[i].who.filter((id) => id !== 'km' && !here(id));
            if (away.length && chance(0.65)) {
                say(k, L.listenAway[pick(away)]);
                yield* waitMin(3, glow);
            }
        }
        k.windup = true;
        yield* waitMin(0.6);
        k.windup = false;
        W().forks.forEach((f, i) => {
            W().strikeFork(i);
            ctx.fx.ring(new THREE.Vector3(f.base.x, f.base.y + 0.1, f.base.z), f.ring, { s0: 0.3, s1: 2.4, life: 2.6, delay: i * 0.15 });
        });
        ctx.sound.chord();
        k.pose = 'happy';
        say(k, L.listenEnd);
        sparkle(k, ['💖', '✨', '🎵', '♾️'], 6);
        addStat('nakayoshi', 6);
        addStat('kirakira', 6);
        addStat('tanoshisa', 6);
        log('音叉でみんなの周波数を聴いた🎵');
        yield* waitMin(4);
    } finally {
        k.windup = false;
        release();
        holdMallet(k, false);
    }
}

function* actWindow(k) {
    k.label = '窓のところへ';
    yield* goSpot(k, W().spots.window);
    k.label = '窓の外をながめている';
    yield* waitMin(rand(3, 5));
    const h = hour();
    say(k, h >= 16.8 && h < 19 ? L.windowEve : W().env.night > 0.5 ? L.windowNight : L.windowDay);
    yield* waitMin(rand(6, 10), (dt) => addStat('tanoshisa', dt * 0.15));
    log('窓の外をながめた');
}

function* actStroll(k) {
    k.label = 'おさんぽしている🌿';
    for (const [x, z] of shuffle(W().strollPoints).slice(0, 3)) {
        yield* walkTo(k, x, z);
        k.pose = 'look';
        if (chance(0.55)) murmur(k, L.stroll);
        yield* waitMin(rand(3, 6), (dt) => addStat('tanoshisa', dt * 0.2));
        k.pose = 'stand';
    }
    log('おさんぽした🌿');
}

function* actBench(k) {
    const seat = freeSpot(W().spots.bench, k);
    if (!seat) return;
    k.label = 'ベンチへ向かっている';
    yield* goSpot(k, seat);
    k.label = 'ベンチでひとやすみ';
    yield* waitMin(rand(10, 16), (dt) => {
        addStat('genki', dt * 0.1);
        addStat('tanoshisa', dt * 0.1);
    });
    if (chance(0.5)) murmur(k, L.stroll);
    log('ベンチでひとやすみした');
}

function* actIdle(k) {
    k.label = 'のんびりしている';
    const p = ctx.nav.snap(rand(-4.5, 1.6), rand(0.6, 3.3));
    yield* walkTo(k, p.x, p.z);
    k.faceCamera();
    if (chance(0.5)) murmur(k, L.idle);
    yield* waitMin(rand(4, 8));
}

function* actBall(k) {
    k.label = 'ボールを追いかけている⚽';
    say(k, L.ballStart);
    const b = ctx.ball;
    const start = absMin();
    let kicks = 0;
    const want = randInt(3, 4);
    while (kicks < want && b.active && absMin() - start < 40) {
        const tx = b.pos.x, tz = b.pos.z;
        yield* walkTo(k, tx, tz, { until: () => Math.hypot(b.pos.x - tx, b.pos.z - tz) > 0.9, speed: 1.35 });
        const d = Math.hypot(b.pos.x - k.pos.x, b.pos.z - k.pos.z);
        if (d < 0.85 && b.speed() < 2.5 && !b.pass) {
            kicks++;
            k.faceTo(b.pos.x, b.pos.z);
            b.kick(k.pos);
            ctx.sound.bounce();
            say(k, L.kick, null, 1.6);
            addStat('tanoshisa', 7);
            k.pose = 'happy';
            yield* waitMin(1);
            k.pose = 'stand';
        } else {
            yield;
        }
    }
    say(k, L.ballDone);
    addStat('nakayoshi', 3);
    log('ボールであそんだ⚽');
    yield* waitMin(3);
}

export const ACTS = {
    sleep: actSleep,
    nap: actNap,
    calendar: actCalendar,
    eat: actEat,
    code: actCode,
    water: actWater,
    cherry: actCherry,
    bath: actBath,
    read: actRead,
    purify: actPurify,
    listen: actListen,
    window: actWindow,
    stroll: actStroll,
    bench: actBench,
    idle: actIdle,
    ball: actBall,
};

// ── 何をするか決める（おなか・げんき・時間帯などから点数をつける）──
function chooseActivity(k) {
    const s = S(), st = s.stats, h = hour();
    if (isNight()) return 'sleep';
    if (k.queued) {
        const q = k.queued;
        k.queued = null;
        return q;
    }
    const c = [];
    const add = (id, score) => { if (score > 0) c.push({ id, score }); };
    if (s.calendarDay !== s.day) add('calendar', 800);
    if (s.food) add('eat', 700);
    const meal = (h >= 7 && h < 8.5) || (h >= 12 && h < 13) || (h >= 18 && h < 19.5);
    add('eat', st.onaka < 40 ? 300 + (40 - st.onaka) * 5 : meal && st.onaka < 75 ? 240 : 0);
    add('nap', st.genki < 25 ? 260 + (25 - st.genki) * 6 : 0);
    add('bath', st.kirakira < 35 ? 200 + (35 - st.kirakira) * 4 : h >= 19 && s.bathDay !== s.day ? 190 : 0);
    if (s.wateredDay !== s.day) add('water', h < 11 ? 220 : h < 18 ? 110 : 0);
    if (s.day >= s.cherryReadyDay && h >= 7 && h < 18) add('cherry', 90);
    add('code', 110 + (h >= 9 && h < 18 ? 60 : 0) + st.genki * 0.3);
    add('read', (100 - st.tanoshisa) * 1.1 + 30);
    add('purify', (100 - st.kirakira) * 0.9 + 25);
    // ひとりのときほど、音叉でみんなの音を聴きたくなる
    add('listen', 35 + (ctx.family.present().length ? 0 : 45) + (100 - st.nakayoshi) * 0.5);
    add('window', 45);
    add('stroll', h >= 7 && h < 18.5 ? 70 : 25);
    add('bench', h >= 8 && h < 18 ? 35 : 0);
    add('idle', 20);
    for (const [id, score] of ctx.family.socialCandidates()) add(id, score);
    for (const x of c) {
        x.score *= rand(0.75, 1.25);
        if (x.id === k.lastAct) x.score *= 0.25;
        else if (x.id === k.prevAct) x.score *= 0.6;
    }
    c.sort((a, b) => b.score - a.score);
    return c.length ? c[0].id : 'idle';
}

function makeGen(k, id, arg) {
    k.prevAct = k.lastAct;
    k.lastAct = id;
    k.actId = id;
    const fam = ctx.family;
    if (fam.SOCIAL[id]) {
        const v = arg ?? fam.pickPartner(id);
        if (v) return fam.SOCIAL[id](k, v);
        return actIdle(k);
    }
    return (ACTS[id] ?? actIdle)(k, arg);
}

export function brain(k) {
    return makeGen(k, chooseActivity(k));
}

export function startAct(k, id, arg) {
    k.setCo(makeGen(k, id, arg));
}

export function canInterrupt(k) {
    return !k.deepSleep && k.actId !== 'greet' && k.actId !== 'resonance';
}

// ── お出迎え・お見送り（来た順・帰る順に）──
export function greet(v) {
    door(ctx.km, v, false);
}

// 帰る人を門まで送る。寝ていたり共鳴の途中だったりして送れないときは false
export function seeOff(v) {
    const k = ctx.km;
    if (k.sleeping || k.actId === 'resonance') return false;
    door(k, v, true);
    return true;
}

function door(k, v, bye) {
    (k.doorQueue ||= []).push({ v, bye });
    if (k.actId !== 'greet' && k.actId !== 'resonance') {
        k.actId = 'greet';
        k.setCo(actDoor(k));
    }
}

function* actDoor(k) {
    k.actId = 'greet';
    const waved = [];
    for (;;) {
        while (k.doorQueue.length) {
            const { v, bye } = k.doorQueue.shift();
            if (bye) {
                if (yield* actSeeOff(k, v)) waved.push(v);
            } else if (v.state === 'visiting') {
                yield* actGreet(k, v);
            }
        }
        if (!waved.length) return;
        // 門の外へ見えなくなるまで、手をふって見送る
        const g = W().gate;
        k.label = '門のところで手をふっている👋';
        k.pose = 'wave';
        yield* waitMin(12, () => {
            k.faceTo(g.outside.x, g.outside.z);
            if (k.doorQueue.length || waved.every((v) => v.state !== 'leaving')) return false;
        });
        k.pose = 'stand';
        if (k.doorQueue.length) continue;
        say(k, ctx.family.present().length ? L.seeOffStay : L.seeOffDone);
        yield* waitMin(3);
        return;
    }
}

// 門の手前で待ち合わせて、ひとりずつ「またね」
function* actSeeOff(k, v) {
    const bye = v.bye;
    if (!bye || bye.done || v.state !== 'leaving') return false;
    const a = v.agent;
    const g = W().gate;
    k.label = `${v.def.name}をお見送り👋`;
    const p = ctx.nav.snap(g.inside.x, g.inside.z - 0.8);
    if (Math.hypot(k.pos.x - p.x, k.pos.z - p.z) > 0.3) {
        // 「帰るね」を聞いてから、こたえる
        yield* waitUntil(() => a.quietAt > bye.t0 && ctx.tReal >= a.quietAt - 1.2, 4);
        k.pose = 'stand';
        say(k, L.seeOffGo);
        yield* walkTo(k, p.x, p.z, { speed: 1.25 });
    }
    yield* waitUntil(() => bye.ready || bye.done || v.state !== 'leaving', 25);
    if (!bye.ready || bye.done || v.state !== 'leaving') {
        bye.done = true;
        return false;
    }
    k.faceTo(a.pos.x, a.pos.z);
    a.faceTo(k.pos.x, k.pos.z);
    k.pose = 'happy';
    k.say(pick(v.def.lines.byeK));
    ctx.fx.burst(k.headPos(), ['💖', '✨', v.def.emoji], 5);
    ctx.sound.pet();
    yield* waitMin(3);
    a.pose = 'wave';
    a.say(pick(v.def.lines.byeReply));
    yield* waitMin(3);
    a.pose = 'stand';
    k.pose = 'wave';
    bye.said = true;
    bye.done = true;
    addStat('nakayoshi', 3);
    return true;
}

function* actGreet(k, v) {
    const a = v.agent;
    k.label = `${v.def.name}をお出迎え`;
    const p = ctx.nav.snap(a.pos.x - 0.75, a.pos.z - 0.75);
    yield* walkTo(k, p.x, p.z, { speed: 1.25 });
    if (v.state !== 'visiting') return;
    k.faceTo(a.pos.x, a.pos.z);
    a.faceTo(k.pos.x, k.pos.z);
    k.pose = 'happy';
    k.say(pick(v.def.lines.greetK));
    ctx.fx.burst(k.headPos(), ['💖', '✨', v.def.emoji], 5);
    ctx.sound.pet();
    yield* waitMin(3);
    a.pose = 'happy';
    a.say(pick(v.def.lines.reply));
    yield* waitMin(3);
    k.pose = 'stand';
    a.pose = 'stand';
    v.greeted = true;
    addStat('tanoshisa', 10);
    addStat('nakayoshi', 4);
}

// ── 時間の流れ ──
export function sim(dt) {
    if (dt <= 0) return;
    const s = S();
    const prev = s.min;
    s.min += dt;
    if (s.min >= 1440) {
        s.min -= 1440;
        s.day++;
        if (s.day >= s.cherryReadyDay) W().setCherries(true);
    }
    const cross = (m) => prev < m && s.min >= m;
    const k = ctx.km;
    if (cross(17.5 * 60) && !k.deepSleep && !s.lights) {
        s.lights = true;
        say(k, L.lightsOn);
    }
    if (cross(21.5 * 60)) ctx.family.curfew();

    const asleep = k.sleeping;
    addStat('onaka', -dt * (asleep ? 0.035 : 0.075));
    addStat('genki', asleep ? dt * 0.17 : -dt * 0.065);
    if (!asleep) addStat('tanoshisa', -dt * 0.07);
    addStat('kirakira', -dt * (asleep ? 0.02 : 0.045));
    addStat('nakayoshi', -dt * 0.012);
    const n = ctx.family.present().length;
    if (n && !asleep) {
        addStat('tanoshisa', dt * 0.12 * n);
        addStat('nakayoshi', dt * 0.03 * n);
    }
    ctx.family.checkResonance();
}

// ── まのからのかかわり ──
let lastPetReal = 0;
let pausedHintAt = -99;

function pausedHint() {
    if (S().speed) return false;
    if (ctx.tReal - pausedHintAt > 3) {
        pausedHintAt = ctx.tReal;
        ctx.fx.toast('いまは時間が止まってるよ⏸「×1」で動きだすよ', 3.5);
    }
    return true;
}

export function pet(k) {
    touch();
    if (k.sleeping) {
        say(k, L.petSleep, null, 2.4);
        ctx.fx.emoji(k.headPos(), '💤');
        return;
    }
    k.petT = 1;
    say(k, L.pet, null, 2.6);
    ctx.fx.burst(k.headPos(), ['💖', '💕', '✨'], 4);
    ctx.sound.pet();
    react('pet', {}, 12);
    const now = performance.now();
    if (now - lastPetReal > 1500) {
        lastPetReal = now;
        addStat('nakayoshi', 3);
        addStat('tanoshisa', 1);
    }
    if (absMin() - S().lastPetLog > 120) {
        S().lastPetLog = absMin();
        log('まのがなでてくれた💕');
    }
}

export function placeFood() {
    const s = S();
    const k = ctx.km;
    if (s.food) {
        ctx.fx.toast('もうテーブルにごはんがあるよ〜🍽️');
        return;
    }
    touch();
    const dish = pickDish();
    s.food = dish.id;
    k.cookedFood = false;
    W().placeFood(dish.id);
    ctx.sound.pop();
    ctx.fx.toast(`テーブルに${dish.name}を置いたよ🍽️`);
    log(`まのが${dish.name}を置いてくれた🍽️`);
    if (k.deepSleep) {
        ctx.fx.toast(`${dish.name}を置いたよ。起きたら食べるみたい💤`);
    } else if (canInterrupt(k) && k.actId !== 'eat') {
        say(k, L.foodThanks);
        startAct(k, 'eat');
    }
    if (!k.deepSleep) react('food');
    pausedHint();
}

export function throwBall() {
    const k = ctx.km;
    ctx.ball.throwIn(rand(-3.5, 6.5), rand(6.7, 8.2));
    ctx.sound.pop();
    touch();
    ctx.family.onBall();
    if (k.deepSleep) {
        ctx.fx.toast('子みくろんはすやすや…ボールは庭でころころ〜💤');
        return;
    }
    if (canInterrupt(k) && k.actId !== 'ball') startAct(k, 'ball');
    react('ball', {}, 15);
    pausedHint();
}

export function toggleLights() {
    const s = S();
    s.lights = !s.lights;
    ctx.sound.pop();
    ctx.fx.toast(s.lights ? 'あかりをつけたよ💡' : 'あかりを消したよ🌙');
    touch();
    lightReact(ctx.km, s.lights);
}

let lightTaps = [];

function lightReact(k, on) {
    const now = ctx.tReal;
    lightTaps = lightTaps.filter((t) => now - t < 4);
    lightTaps.push(now);
    if (k.sleeping) {
        say(k, on ? L.lightOnSleep : L.lightOffSleep, null, 2.6);
        ctx.fx.emoji(k.headPos(), on ? '😣' : '💤', { rise: 40 });
        return;
    }
    const dark = W().env.night > 0.3;
    const h = hour();
    let lines;
    if (lightTaps.length >= 4) lines = L.lightBlink;
    else if (!indoors(k.pos.x, k.pos.z)) lines = !dark ? L.lightOutDay : on ? L.lightOnOut : L.lightOffOut;
    else if (on) lines = dark ? L.lightOn : L.lightOnDay;
    else lines = !dark ? L.lightOffDay : h >= 21 || h < 5 ? L.lightOffLate : L.lightOff;
    say(k, lines);
    if (!k.onSpot && !k.moving) k.faceCamera();
    k.petT = Math.max(k.petT, 0.7);
    if (lines === L.lightBlink) ctx.fx.burst(k.headPos(), ['💡', '🌙', '😵‍💫'], 4);
    else if (on) ctx.fx.burst(k.headPos(), ['💡', '✨'], 3);
    else ctx.fx.emoji(k.headPos(), dark ? '👀' : '🌿', { rise: 40 });
    if (dark && lines !== L.lightBlink) react(on ? 'lightOn' : 'lightOff', {}, 8, () => S().lights === on);
}

const REQ = {
    bed: 'nap', sofa: 'read', bookshelf: 'read', desk: 'code', table: 'eat', fridge: 'eat', cook: 'eat',
    fork: 'listen', flowerbed: 'water', cherry: 'cherry', onsen: 'bath', calendar: 'calendar', bench: 'bench',
};

export function request(id) {
    const k = ctx.km, s = S(), st = s.stats;
    touch();
    if (id === 'lamp' || id === 'lantern') { toggleLights(); return; }
    if (k.deepSleep) {
        ctx.fx.toast('子みくろんはぐっすり眠っている…💤');
        return;
    }
    const talkOnly = {
        clock: `いま${clockText(s.min)}だべ〜🕰️`,
        sign: 'こみくろんのおうちへ、ようこそだっちゃ〜🏡',
        drawing: 'まのが描いてくれた絵、宝物だっちゃ💎',
        plant: '葉っぱ、つやつやだべ〜🌿',
        gate: 'だれか遊びに来ないかなぁ〜',
    };
    if (talkOnly[id]) {
        k.say(talkOnly[id]);
        if (id === 'gate') ctx.fx.toast('「ソルフェジオファミリー」からみんなを呼べるよ💌');
        return;
    }
    const act = REQ[id];
    if (!act) return;
    if (pausedHint()) {
        k.say('いまは時間が止まってて、動けないべ〜⏸');
        return;
    }
    const refuse = {
        nap: st.genki >= 85 && 'まだげんきいっぱいだっちゃ〜！',
        eat: !s.food && st.onaka >= 90 && 'おなかいっぱいだべ〜😋',
        water: s.wateredDay === s.day && '今日はもうお水あげたよ〜🌱',
        cherry: s.day < s.cherryReadyDay && 'まだ実がなってないべ〜、もうちょっと待ってけろ🍒',
        bath: st.kirakira >= 92 && 'さっき入ったばっかりだべ〜♨️',
        calendar: s.calendarDay === s.day && `今日は${s.day}日目だべ〜📅`,
    }[act];
    if (refuse) {
        k.say(refuse);
        return;
    }
    if (k.actId === act) {
        k.say('いま、やってるとこだべ〜');
        return;
    }
    if (!canInterrupt(k)) {
        k.say('ちょっと待っとってけろ〜🌿');
        k.queued = act;
        return;
    }
    say(k, L.reqOk, null, 2);
    startAct(k, act);
}

const MEMO_NAMES = { food: '好きな食べもの', color: '好きな色', animal: '好きな動物', season: '好きな季節', music: '最近聴いてる曲', place: '行ってみたいとこ', dream: '夢' };

function talkSpecial(reply) {
    const k = ctx.km, s = S(), st = s.stats;
    switch (reply) {
        case '@hungry': return st.onaka < 60 ? 'おなかすいたっちゃ〜…ごはん置いてけろ〜🍚' : 'さっき食べたばっかりだべ〜😋';
        case '@doing': return `いまはね、${k.label || 'のんびりしてる'}だよ〜`;
        case '@code': return `コード書くの大好きだべ〜！今まで${s.commits}回コミットしたっちゃ💪`;
        case '@sky': return W().env.night > 0.5 ? 'お星さまきれいだべ〜✨' : 'いいお天気だなぁ〜☀️';
        case '@cherry': return `さくらんぼ、${s.cherries}個とれたよ〜🍒 山形の宝石だべ〜`;
        case '@genki':
            if (st.genki > 60) return 'げんきいっぱいだっちゃ〜！💪 まのは元気〜？';
            if (st.genki < 30) return 'ちょっとねむいべ〜…でも、まのと話せてうれしいっちゃ';
            return 'まあまあだべ〜🌿 まのは元気〜？';
        case '@calendar': return `今日は${s.day}日目だべ〜📅 おねえちゃんの日めくりカレンダーも、毎日見てけろ〜`;
        case '@time': return `いま${clockText(s.min)}だべ〜🕰️`;
        case '@age': return `${s.day}日目だから…${s.day}日さいだっちゃ〜？😂`;
        case '@flower': {
            const n = s.flowers.filter((f) => f.g >= 3).length;
            return n ? `お花、${n}つ咲いてるっちゃ〜🌸 毎朝お水あげてるんだべ〜` : 'お花、まだつぼみだべ〜🌱 毎朝お水あげてるっちゃ';
        }
        case '@memo': {
            const known = Object.keys(MEMO_NAMES).filter((key) => s.memo?.[key]);
            if (!known.length) return 'まののこと、もっと教えてけろ〜💬 子みくろん、ぜんぶ覚えるっちゃ〜';
            const key = pick(known);
            return `まのの${MEMO_NAMES[key]}は「${s.memo[key]}」だべ〜？ちゃんと覚えてるっちゃ💖`;
        }
        default: return reply;
    }
}

export function talk(text) {
    const k = ctx.km;
    const t = text.trim();
    if (!t) return;
    touch();
    if (k.sleeping) {
        say(k, L.petSleep);
        return;
    }
    const s = S();
    // あいさつは質問の答えにしない
    const casual = /おはよ|おやすみ|こんにち|こんばん|おばん|ただいま|いってき|行ってき|ばいばい|バイバイ|またね/.test(t);
    const ans = casual ? null : answer(t);
    let reply, topic = null;
    if (ans) {
        reply = ans.reply;
        ctx.fx.burst(k.headPos(), ['💖', '✨', '💬'], 4);
        addStat('nakayoshi', 3);
        log(ans.store ? `まのの${MEMO_NAMES[ans.id]}は「${ans.a}」だって📝` : 'まのが今日のことを教えてくれた💬');
    } else {
        const rule = TALK.find(([re]) => re.test(t));
        reply = talkSpecial(rule ? pick(rule[1]) : pick(/[?？]$/.test(t) ? TALK_ASK : TALK_DEFAULT));
        topic = rule?.[2] ?? 'default';
    }
    const sec = Math.max(4.2, speechSec(reply));
    hush(sec + 2.5);
    k.say(reply, sec);
    if (!k.onSpot && !k.moving) k.faceCamera();
    k.petT = Math.max(k.petT, 0.6);
    if (/すき|好き|愛して|あいして|love/i.test(t)) {
        ctx.fx.burst(k.headPos(), ['💖', '💕', '💗'], 6);
        addStat('nakayoshi', 3);
    }
    // 周波数の話をしたら、その音叉がひとりでに鳴る
    const tone = /つかれ|疲れ|しんど|つらい|辛い|浄化|じょうか|396/.test(t) ? 0
        : /528/.test(t) ? 1 : /963/.test(t) ? 2 : /♾|∞|無限|むげん/.test(t) ? 3 : -1;
    if (tone >= 0) {
        const f = FORKS[tone];
        ctx.sound.fork(f.freq);
        W().strikeFork(tone);
        ctx.fx.ring(new THREE.Vector3(k.pos.x, k.pos.y + 0.05, k.pos.z), f.ring, { s0: 0.2, s1: 1.6, life: 2 });
    }
    if (/あそ[ぼぶ]|遊[ぼぶ]/.test(t)) ctx.fx.toast('「ボールを投げる」で遊べるよ⚽');
    if (topic) chime(topic, speechSec(reply) * 0.8);
    ctx.sound.pet();
    addStat('nakayoshi', 1.5);
    if (absMin() - s.lastTalkLog > 120) {
        s.lastTalkLog = absMin();
        log('まのとおしゃべりした💬');
    }
}
