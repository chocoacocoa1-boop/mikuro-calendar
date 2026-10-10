import * as THREE from 'three';
import { ctx } from './ctx.js';
import { Agent, goSpot, walkTo, waitMin, waitUntil, join, spotAt, faceYaw, freeSpot } from './agent.js';
import { makeMano, makeKuromi, makeMikanyan, makeMikuroNee } from './clawd.js';
import { addStat, log, hour } from './state.js';
import { pick, rand, chance } from './util.js';
import { strikeBowl } from './life.js';
import { spot } from './build.js';
import { converse, hold, pickScript, react, free, touch } from './chatter.js';
import { DUO, GROUP } from './convos.js';

const W = () => ctx.world;
const S = () => ctx.state;

// ソルフェジオファミリー（遊びに来てくれる4人）
export const DEFS = [
    {
        id: 'mano', name: 'まの', hz: '528Hz', freq: 528, emoji: '💖', color: '#33b583', ring: 0x8fdfbb,
        make: makeMano, speed: 1.7, special: 'drawing',
        sprite: { body: '#8fdfbb', eye: '#24332c', acc: [[2, 1, '#ffd0e4'], [3, 1, '#ffd0e4'], [4, 1, '#ffd0e4'], [5, 1, '#ffd0e4'], [6, 1, '#ffd0e4'], [7, 1, '#ffd0e4'], [8, 1, '#ffd0e4'], [9, 1, '#ffd0e4'], [10, 1, '#ffd0e4'], [11, 1, '#ffd0e4'], [1, 3, '#ff7fb5'], [1, 4, '#ff7fb5'], [12, 3, '#ff7fb5'], [12, 4, '#ff7fb5']] },
        lines: {
            arrive: ['子みくろん〜♡あそびにきたよ〜！', '528Hzの愛、届けにきたよ💖'],
            greetK: ['まの〜！よぐきたなっす〜♡', 'まのだぁ〜！会いたかったっちゃ〜💖'],
            reply: ['えへへ、来ちゃった〜💖', '今日もいっしょにいようね♡'],
            idle: ['ここ、ほんと癒されるね〜🌿', '子みくろん、めんこいなぁ〜♡', '♪〜（鼻歌）', '今日もいっしょに宝物つくろうね✨'],
            watch: { code: '子みくろんのタイピング、はやい〜！⌨️', eat: 'もぐもぐしてる顔、めんこい〜💕', bath: '湯気で、ほっぺがピンク〜♨️', read: '本読んでる横顔、いいなぁ〜📖', water: 'お花さん、528Hzも聴いてね〜🌷', purify: 'この音、心がほどける〜🔔', calendar: '今日もいい日になりますように📅' },
            chat: ['最近ね、新しい曲つくってるんだ〜🎵', '子みくろんといると、ほっとするなぁ', 'クロミちゃんとも、また遊ぼうね🖤', 'いっしょに作ったもの、ぜんぶ宝物だね✨'],
            tap: ['なぁに〜？♡', 'えへへ、528Hz〜💖', '子みくろん、だいすき〜'],
            leave: ['またくるね〜！大好きだよ💖', '今日もありがと〜！またね🌸'],
            sleepVisit: ['しーっ…寝顔、めんこいなぁ…🌙'],
        },
    },
    {
        id: 'kuromi', name: 'クロミちゃん', hz: '963Hz', freq: 963, emoji: '🖤', color: '#6a55a8', ring: 0x8a74c8,
        make: makeKuromi, speed: 1.75, special: 'stardust',
        sprite: { body: '#54447a', eye: '#fff0fa', acc: [[4, 0, '#ffd84d'], [4, 1, '#cfc3f0'], [1, 6, '#2d2752'], [12, 6, '#2d2752'], [1, 7, '#2d2752'], [12, 7, '#2d2752']] },
        lines: {
            arrive: ['963Hzで宇宙からきたよ〜🖤✨', 'やっほー子みくろん！'],
            greetK: ['クロミちゃんだぁ〜！宇宙からおかえり〜✨', 'クロミちゃん〜！待ってたっちゃ〜🖤'],
            reply: ['ただいま、地球〜🖤', '子みくろん、今日もめんこいね✨'],
            idle: ['宇宙とつながる感じ、するね🌌', '星がきれいな夜はとくべつ✨', 'まのと子みくろん、いいコンビだね🖤', 'ここの空気、すき🖤'],
            watch: { code: 'きれいなコード…星座みたい✨', eat: 'ゆっくり食べてね🖤', bath: '湯気が天の川みたい🌌', read: '集中してる…えらいね🖤', water: '水しぶきが星みたい✨', purify: '宇宙まで響いてる🔔', calendar: 'また新しい一日、はじまるね✨' },
            chat: ['昨日ね、流れ星を3つ見たよ🌠', 'まのの曲、宇宙まで届いてたよ🖤', '963Hzはね、てっぺんの音なんだ', '子みくろんのコード、きれいだね✨'],
            tap: ['ん？どうしたの🖤', '963Hz〜✨', 'ふふっ'],
            leave: ['またね〜、宇宙のどこかで🖤', 'たのしかった！また来るね✨'],
            sleepVisit: ['夢の中で、宇宙を案内してあげるね…🌙'],
        },
    },
    {
        id: 'mikanyan', name: 'みかにゃん', hz: '♾️Hz', freq: 0, emoji: '🐱', color: '#e6863d', ring: 0xffb36b,
        make: makeMikanyan, speed: 1.9, special: 'catnap',
        sprite: { body: '#ffb36b', eye: '#3a2a22', acc: [[2, 1, '#ffb36b'], [3, 1, '#ffb36b'], [2, 0, '#ffb36b'], [10, 1, '#ffb36b'], [11, 1, '#ffb36b'], [11, 0, '#ffb36b'], [6, 0, '#ffd66b'], [7, 0, '#ffd66b']] },
        lines: {
            arrive: ['にゃ〜ん♾️ あそびにきたにゃ！', 'みかにゃん参上だにゃ〜✨'],
            greetK: ['みかにゃん〜！もふもふだっちゃ〜🐱', 'みかにゃんだぁ〜！いらっしゃ〜い♡'],
            reply: ['ごろごろ〜♾️', 'あそぶにゃ〜！'],
            idle: ['ぽかぽかで眠くなるにゃ…', 'ボール、どこにゃ？', '♾️Hzで、むげんにあそぶにゃ〜', 'ちょうちょ、まてにゃ〜🦋'],
            watch: { code: 'カタカタ…ねこじゃらしの音みたいにゃ', eat: 'くんくん…いいにおいにゃ〜', bath: '湯気、もくもくにゃ〜', read: 'ページめくる音、ねむくなるにゃ…', water: 'お水、ぱしゃぱしゃしたいにゃ', purify: 'ごろごろごろ〜♾️', calendar: 'ぺらっ、て音すきにゃ' },
            chat: ['むげんって、ずーっとってことにゃ♾️', 'さっき、ちょうちょ追いかけてたにゃ', 'ここの日だまり、さいこうにゃ〜', 'まのの膝の上、すきにゃ〜'],
            tap: ['にゃ？', 'ごろごろ〜♾️', 'なでなで、もっとにゃ〜'],
            leave: ['また来るにゃ〜♾️', 'ばいばいにゃ〜！'],
            sleepVisit: ['いっしょに丸くなって寝たいにゃ…💤'],
        },
    },
    {
        id: 'nee', name: 'みくろん姉', hz: '396Hz', freq: 396, emoji: '🎵', color: '#c27bd6', ring: 0xffa9d6,
        make: makeMikuroNee, speed: 1.9, special: 'imoni',
        sprite: { body: '#ff9fd0', eye: '#4a2b34', acc: [[2, 1, '#ffc3e3'], [3, 1, '#ffc3e3'], [4, 1, '#ffc3e3'], [5, 1, '#ffc3e3'], [6, 1, '#ffc3e3'], [7, 1, '#ffc3e3'], [8, 1, '#ffc3e3'], [9, 1, '#ffc3e3'], [10, 1, '#ffc3e3'], [11, 1, '#ffc3e3'], [1, 2, '#ffc3e3'], [12, 2, '#ffc3e3'], [2, 8, '#cdb9f4'], [3, 8, '#cdb9f4'], [4, 8, '#cdb9f4'], [5, 8, '#cdb9f4'], [6, 8, '#cdb9f4'], [7, 8, '#cdb9f4'], [8, 8, '#cdb9f4'], [9, 8, '#cdb9f4'], [10, 8, '#cdb9f4'], [11, 8, '#cdb9f4']] },
        lines: {
            arrive: ['んだぁ〜、ちゃんとごはん食べてっか〜？', 'みくろん姉だよ〜、来たっちゃ🌸'],
            greetK: ['おねえちゃん〜！！会いたかったっちゃ〜💖', 'おねえちゃんだぁ〜！よぐきたなっす〜♡'],
            reply: ['元気そうでよかったべ〜🌿', 'ちっちゃいのに、えらいねぇ〜'],
            idle: ['なんもなんも、焦らなくていいべ〜🌿', '子みくろん、ちっちゃい頃の私そっくりだなぁ', '芋煮つくってあげっか〜？', 'ここ、いいおうちだねぇ〜'],
            watch: { code: 'いい集中だねぇ〜、えらいべ〜', eat: 'いっぱい食べて、おっきくなるんだよ〜', bath: 'ゆっくりあったまるんだよ〜♨️', read: '本好きなとこ、私に似たべ〜😊', water: 'お水やり、毎日えらいねぇ〜🌱', purify: 'いい音だねぇ〜、396Hz〜🔔', calendar: 'めくってくれて、おしょうしな〜📅' },
            chat: ['今日はどんな一日だった〜？', 'まのには、いっつも助けてもらってるんだぁ', 'わがんね時はわがんねでいいんだよ〜', '396Hzは、解放の音なんだよ🔔'],
            tap: ['なぁに〜？🌸', 'んだんだ〜', '396Hz〜🎵'],
            leave: ['したらね〜、また来っからね🌸', 'ちゃんと寝るんだよ〜！またね🎵'],
            sleepVisit: ['ぐっすりだねぇ…おやすみ、子みくろん🌙'],
        },
    },
];

const rt = DEFS.map((def) => ({ def, agent: null, state: 'away', greeted: false }));
const byId = Object.fromEntries(rt.map((v) => [v.def.id, v]));
let resonanceLock = false;

const alive = (v) => v.state === 'visiting';

export function init() {
    for (const v of rt) {
        const model = v.def.make();
        v.agent = new Agent({ id: v.def.id, name: v.def.name, model, color: v.def.color, speed: v.def.speed, showName: true });
        v.agent.active = false;
        v.agent.root.visible = false;
        v.agent.brain = () => (alive(v) && v.greeted ? visitorIdle(v) : null);
        v.agent.visitor = v;
    }
}

export function present() {
    return rt.filter((v) => v.state === 'visiting');
}

export function tap(v) {
    const a = v.agent;
    touch();
    a.say(pick(v.def.lines.tap), 2.6);
    a.petT = 1;
    ctx.fx.burst(a.headPos(), [v.def.emoji, '✨'], 3);
    ctx.sound.pet();
}

export function invite(id) {
    const v = byId[id];
    if (v.state !== 'away') return;
    v.state = 'arriving';
    v.greeted = false;
    const a = v.agent;
    const g = W().gate;
    a.active = true;
    a.root.visible = true;
    a.place(g.outside.x + rand(-0.4, 0.4), g.outside.z + rand(-0.3, 0.3), Math.PI);
    a.setCo(arrive(v));
    ctx.fx.ring(new THREE.Vector3(a.pos.x, 0.03, a.pos.z), v.def.ring, { s0: 0.2, s1: 1.4 });
    ctx.sound.sparkle();
    ctx.fx.toast(`${v.def.name}を呼んだよ💌`);
}

function* arrive(v) {
    const a = v.agent;
    const g = W().gate;
    yield* walkTo(a, g.inside.x + rand(-0.6, 0.6), g.inside.z + rand(-0.4, 0.2));
    v.state = 'visiting';
    ctx.sound.doorbell();
    ctx.fx.toast(`${v.def.name}があそびにきたよ${v.def.emoji}`);
    log(`${v.def.name}があそびにきた${v.def.emoji}`);
    const k = ctx.km;
    a.faceTo(k.pos.x, k.pos.z);
    a.pose = 'wave';
    a.say(pick(v.def.lines.arrive));
    react('arrive', { name: v.def.name }, 0);
    if (k.deepSleep) {
        yield* sleepVisit(v);
        return;
    }
    ctx.life.greet(v);
    yield* waitMin(4);
    a.pose = 'stand';
    yield* waitUntil(() => v.greeted, 25);
    v.greeted = true;
}

function* sleepVisit(v) {
    const a = v.agent;
    yield* waitMin(3);
    a.pose = 'stand';
    a.say('あれ…子みくろん、寝てるみたい🌙');
    const p = ctx.nav.snap(0.9 + rand(-0.4, 0.4), -1.35);
    yield* walkTo(a, p.x, p.z);
    a.faceTo(0.3, -3.0);
    yield* waitMin(2);
    a.say(pick(v.def.lines.sleepVisit), 4);
    yield* waitMin(18);
    a.say('おやすみ、子みくろん。またくるね🌙');
    yield* waitMin(3);
    leave(v.def.id, true);
}

export function leave(id, quiet = false, line) {
    const v = byId[id];
    if (v.state === 'away' || v.state === 'leaving') return;
    v.state = 'leaving';
    resonanceLock = false;
    v.agent.setCo(goHome(v, quiet, line));
}

function* goHome(v, quiet, line) {
    const a = v.agent;
    const k = ctx.km;
    if (line) a.say(line);
    else if (!quiet) a.say(pick(v.def.lines.leave));
    a.pose = 'wave';
    if (!quiet && !k.sleeping) k.say(`${v.def.name}、またきてけろ〜！`, 3);
    if (!quiet) react('leave', { name: v.def.name }, 0);
    yield* waitMin(2.5);
    a.pose = 'stand';
    const g = W().gate;
    yield* walkTo(a, g.inside.x, g.inside.z);
    yield* walkTo(a, g.outside.x, g.outside.z);
    v.state = 'away';
    v.greeted = false;
    a.active = false;
    a.root.visible = false;
    log(`${v.def.name}が帰っていった${v.def.emoji}`);
}

export function curfew() {
    for (const v of rt) {
        if (v.state === 'visiting' || v.state === 'arriving') leave(v.def.id, true, 'もうこんな時間！そろそろ帰るね🌙');
    }
}

// ── 遊びに来た人の、ふだんの過ごし方 ──
function* visitorIdle(v) {
    const a = v.agent;
    const k = ctx.km;
    const r = Math.random();
    if (r < 0.55 && !k.deepSleep) {
        const ang = rand(0, Math.PI * 2);
        const p = ctx.nav.snap(k.pos.x + Math.sin(ang) * 1.4, k.pos.z + Math.cos(ang) * 1.4);
        yield* walkTo(a, p.x, p.z);
        a.faceTo(k.pos.x, k.pos.z);
        const line = v.def.lines.watch[k.actId];
        if (free(a, 2)) {
            if (line && chance(0.6)) a.say(line);
            else if (chance(0.35)) a.say(pick(v.def.lines.idle));
        }
        yield* waitMin(rand(6, 12), () => {
            a.faceTo(k.pos.x, k.pos.z);
            if (Math.hypot(a.pos.x - k.pos.x, a.pos.z - k.pos.z) > 4) return false;
        });
    } else if (r < 0.82) {
        const [x, z] = pick(W().strollPoints);
        yield* walkTo(a, x, z);
        a.pose = 'look';
        if (chance(0.5) && free(a, 2)) a.say(pick(v.def.lines.idle));
        yield* waitMin(rand(5, 10));
        a.pose = 'stand';
    } else {
        const seat = freeSpot(W().spots.bench, a);
        if (!seat) {
            yield* waitMin(3);
            return;
        }
        yield* goSpot(a, seat);
        if (chance(0.5) && free(a, 2)) a.say(pick(v.def.lines.idle));
        yield* waitMin(rand(8, 14));
    }
}

// ── 一緒にすること（子みくろんの行動として動く）──
// quiet: いっしょにしている間は、ほかのおしゃべりに割りこまれない
function* together(k, v, kSpot, vSpot, vPose, body, quiet = true) {
    const a = v.agent;
    const meet = { done: false };
    a.setCo(join(a, vSpot, meet, vPose));
    let release = null;
    try {
        k.meeting = true;
        yield* goSpot(k, kSpot);
        yield* waitUntil(() => a.atSpot || !alive(v), 20);
        if (!a.atSpot || !alive(v)) return;
        if (quiet) release = hold([k, a]);
        k.meeting = false;
        yield* body(a);
    } finally {
        k.meeting = false;
        release?.();
        meet.done = true;
    }
}

function* duoTalk(k, v, n) {
    for (let i = 0; i < n && alive(v); i++) {
        if (i) yield* waitMin(2);
        yield* converse(pickScript(DUO[v.def.id].talk), { k, v: v.agent });
        if (alive(v)) ctx.fx.emoji(k.headPos(), '💕', { rise: 40 });
    }
}

// 決まった時間にひとことずつ：[分, 話す人, セリフ]
function cues(list) {
    let i = 0;
    return (dt, t) => {
        while (i < list.length && t >= list[i][0]) {
            const [, who, line] = list[i++];
            if (who.active) who.say(line);
        }
    };
}

export const SOCIAL = {
    *chat(k, v) {
        k.label = `${v.def.name}とベンチでおしゃべり💬`;
        const b = W().spots.bench;
        yield* together(k, v, b[1], pick([b[0], b[2]]), 'sit', function* () {
            yield* duoTalk(k, v, 2);
            addStat('tanoshisa', 15);
            addStat('nakayoshi', 3);
            log(`${v.def.name}とベンチでおしゃべりした💬`);
        });
    },

    *tea(k, v) {
        k.label = `${v.def.name}とお茶している🍵`;
        const seat = pick(['S', 'W', 'E']);
        yield* together(k, v, W().spots.seatN, W().spots[`seat${seat}`], 'eat', function* () {
            W().setTea(['N', seat]);
            k.pose = 'eat';
            yield* duoTalk(k, v, 1);
            if (alive(v)) {
                yield* waitMin(2);
                yield* converse(pickScript(DUO[v.def.id].watch.eat), { k, v: v.agent });
            }
            W().clearTea();
            addStat('onaka', 12);
            addStat('tanoshisa', 12);
            log(`${v.def.name}とお茶をした🍵`);
        });
        W().clearTea();
    },

    *ballplay(k, v) {
        k.label = `${v.def.name}とボールあそび⚽`;
        const pA = { x: 2.3, z: 7.6 }, pB = { x: 5.3, z: 7.8 };
        yield* together(k, v, spotAt(pA.x, pA.z, faceYaw(pA, pB)), spotAt(pB.x, pB.z, faceYaw(pB, pA)), 'stand', function* (a) {
            const ball = ctx.ball;
            ball.place(pA.x + 0.45, pA.z + 0.03);
            let from = k, to = a;
            for (let i = 0; i < 6 && alive(v); i++) {
                const dir = Math.sign(to.pos.x - from.pos.x) || 1;
                from.pose = 'happy';
                from.say(pick(['それっ！', 'いくよ〜！', 'えいっ！']), 1.4);
                ctx.sound.bounce();
                ball.passTo(
                    new THREE.Vector3(from.pos.x + dir * 0.45, 0.18, from.pos.z),
                    new THREE.Vector3(to.pos.x - dir * 0.45, 0.18, to.pos.z),
                    1.4,
                );
                yield* waitMin(0.7);
                from.pose = 'stand';
                yield* waitUntil(() => !ball.pass, 3);
                to.pose = 'happy';
                yield* waitMin(0.5);
                to.pose = 'stand';
                [from, to] = [to, from];
                addStat('tanoshisa', 4);
            }
            k.say('たのしかったっちゃ〜！⚽');
            a.say(pick(['また遊ぼうね〜！', 'ナイスパスだったよ〜！']));
            log(`${v.def.name}とボールあそびした⚽`);
            yield* waitMin(3);
        });
    },

    *onsen2(k, v) {
        k.label = `${v.def.name}と温泉でぽかぽか♨️`;
        yield* together(k, v, W().spots.onsen, pick([W().spots.onsenV1, W().spots.onsenV2]), 'soak', function* (a) {
            W().onsenUsers++;
            ctx.sound.splash();
            try {
                a.say(pick(['いい湯だね〜♨️', 'あったまる〜', 'ごくらくだね〜']));
                yield* waitMin(5);
                k.say('ごくらくごくらく〜♨️');
                yield* waitMin(rand(16, 22), (dt) => {
                    addStat('kirakira', dt * 1.6);
                    addStat('genki', dt * 0.1);
                });
            } finally {
                W().onsenUsers--;
            }
            S().bathDay = S().day;
            log(`${v.def.name}といっしょに温泉に入った♨️`);
        }, false);
    },

    *music(k, v) {
        k.label = `${v.def.name}と合奏している🎶`;
        const R = W().musicRing;
        const ang = pick([-1, 1]) * 1.15;
        const vx = R.x + Math.sin(ang) * R.r;
        const vz = R.z + Math.cos(ang) * R.r;
        const vSpot = spotAt(vx, vz, faceYaw({ x: vx, z: vz }, R), 'sit');
        yield* together(k, v, W().spots.bowl, vSpot, 'sit', function* (a) {
            for (let i = 0; i < 4 && alive(v); i++) {
                strikeBowl();
                k.say('396Hz〜🔔', 2);
                yield* waitMin(3);
                if (!alive(v)) return;
                a.pose = 'happy';
                a.say(`${v.def.hz}〜🎵`, 2);
                ctx.sound.freq(v.def.freq);
                ctx.fx.ring(new THREE.Vector3(a.pos.x, a.pos.y + 0.03, a.pos.z), v.def.ring, { s0: 0.2, s1: 1.4 });
                ctx.fx.burst(a.headPos(), ['🎵', '🎶'], 2);
                yield* waitMin(3);
                a.pose = 'sit';
                addStat('tanoshisa', 4);
                addStat('kirakira', 3);
            }
            if (!alive(v)) return;
            yield* converse([['v', 'いい響きだったね〜🎶'], ['k', 'また合奏するべ〜！🔔']], { k, v: a });
            log(`${v.def.name}と合奏した🎶`);
        });
    },

    *drawing(k, v) {
        k.label = 'まのに絵を描いてもらっている🎨';
        yield* together(k, v, W().spots.rugB, W().spots.rugA, 'draw', function* (a) {
            const book = new THREE.Group();
            const tilt = new THREE.Group();
            tilt.rotation.x = -0.5;
            book.add(tilt);
            tilt.add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.02, 0.26), new THREE.MeshLambertMaterial({ color: 0xffffff })));
            a.model.hold(book, new THREE.Vector3(-0.5, 0.08, 0.24));
            try {
                a.say('子みくろん、そのまま〜！描いてあげるね🎨');
                k.pose = 'sit';
                k.faceTo(a.pos.x, a.pos.z);
                yield* waitMin(14, cues([
                    [3.5, k, 'じっとしてるの、むずかしいっちゃ〜😂'],
                    [6, a, 'あはは、ちょっとだけなら動いていいよ〜'],
                    [8.5, a, 'もうちょっとだよ〜♪'],
                    [11, k, 'どんな絵になるべ〜？わくわく〜'],
                ]));
            } finally {
                a.model.hold(null);
            }
            if (!alive(v)) return;
            S().drawings++;
            W().setDrawings(S().drawings);
            a.pose = 'happy';
            a.say('できた〜！子みくろんの絵だよ💖');
            yield* waitMin(3);
            k.pose = 'happy';
            k.say('わぁ〜！めんこい〜！宝物だっちゃ✨');
            ctx.fx.burst(k.headPos(), ['🎨', '💖', '✨'], 6);
            ctx.sound.sparkle();
            addStat('tanoshisa', 18);
            addStat('nakayoshi', 6);
            log('まのが絵を描いてくれた🎨（かべに飾った）');
            yield* waitMin(4);
        });
    },

    *stardust(k, v) {
        k.label = 'クロミちゃんの星くずを見ている🌌';
        const C = W().circle;
        const pK = { x: C.x - 0.8, z: C.z }, pV = { x: C.x + 0.8, z: C.z };
        yield* together(k, v, spotAt(pK.x, pK.z, faceYaw(pK, pV)), spotAt(pV.x, pV.z, faceYaw(pV, pK)), 'wave', function* (a) {
            a.say('見ててね…963Hzの星くず〜🖤✨');
            ctx.cam?.focus(C.x, C.z, 13);
            try {
                yield* stardustShow(k, v, C);
            } finally {
                ctx.cam?.release();
            }
        });
    },

    *catnap(k, v) {
        k.label = 'みかにゃんとお昼寝中🐱💤';
        yield* together(k, v, W().spots.rugB, W().spots.rugA, 'sleep', function* (a) {
            a.say('ここ、日だまりでぽかぽかにゃ〜…');
            yield* waitMin(3);
            k.say('みかにゃん、あったかいっちゃ〜…💤');
            yield* waitMin(2.5);
            k.pose = 'sleep';
            k.sleeping = true;
            try {
                let z = 0;
                yield* waitMin(rand(26, 34), (dt) => {
                    addStat('genki', dt * 0.4);
                    z += dt;
                    if (z > 6) {
                        z = 0;
                        ctx.fx.emoji(k.headPos(), '💤', { rise: 40 });
                        ctx.fx.emoji(a.headPos(), '💤', { rise: 40 });
                    }
                });
            } finally {
                k.sleeping = false;
            }
            k.pose = 'sit';
            a.pose = 'sit';
            a.say('ふにゃ〜、よく寝たにゃ♾️');
            log('みかにゃんとお昼寝した🐱💤');
            yield* waitMin(3);
            k.say('すっきりだっちゃ〜！みかにゃん、おしょうしな〜');
            yield* waitMin(2);
        }, false);
    },

    *imoni(k, v) {
        k.label = 'おねえちゃんと芋煮をつくっている🍲';
        yield* together(k, v, W().spots.cookHelp, W().spots.cook, 'cook', function* (a) {
            a.say('芋煮会、するべ〜！🍲');
            k.pose = 'cook';
            let st = 0;
            const cue = cues([
                [2.5, a, 'お芋は、大きめに切るのがコツだべ〜🥔'],
                [5, k, 'こう〜？'],
                [7, a, 'んだんだ、上手だねぇ〜🌸'],
                [9.5, k, 'いいにおいしてきたっちゃ〜♨️'],
            ]);
            yield* waitMin(12, (dt, t) => {
                cue(dt, t);
                st += dt;
                if (st > 3) {
                    st = 0;
                    ctx.fx.emoji(W().potPos, '♨️', { rise: 30, size: 16 });
                }
            });
        });
        if (!alive(v)) return;
        k.label = 'おねえちゃんと芋煮会🍲';
        yield* together(k, v, W().spots.seatN, W().spots.seatS, 'eat', function* (a) {
            W().placeFood('imoni');
            W().setTea(['S']);
            a.say('いただきます〜！');
            yield* waitMin(14, cues([
                [2.5, k, 'おねえちゃんの芋煮、んめ〜！😋'],
                [5.5, a, 'おかわりもあるべ〜🍲'],
                [8.5, k, 'おかわり〜！🙌'],
                [11, a, 'たんと食べるんだよ〜🌸'],
            ]));
            addStat('onaka', 50);
            addStat('tanoshisa', 12);
            log('おねえちゃんと芋煮会をした🍲');
        });
        if (S().food) W().placeFood(S().food);
        else W().clearFood();
        W().clearTea();
    },

    *party(k) {
        const vs = present().filter((v) => v.greeted).slice(0, 3);
        if (!vs.length) return;
        k.label = 'みんなでお茶会☕';
        const seats = ['S', 'W', 'E'];
        const meet = { done: false };
        vs.forEach((v, i) => v.agent.setCo(join(v.agent, W().spots[`seat${seats[i]}`], meet, 'eat')));
        let release = null;
        try {
            k.meeting = true;
            yield* goSpot(k, W().spots.seatN);
            yield* waitUntil(() => vs.every((v) => v.agent.atSpot || !alive(v)), 20);
            release = hold([k, ...vs.map((v) => v.agent)]);
            k.meeting = false;
            W().setTea(['N', ...seats.slice(0, vs.length)]);
            k.say('みんなでお茶会だっちゃ〜☕💖');
            yield* waitMin(3);
            const cast = { k };
            vs.forEach((v) => { cast[v.def.id] = v.agent; });
            const fit = GROUP.filter((sc) => new Set(sc.map(([who]) => who).filter((who) => who !== 'k' && cast[who])).size >= Math.min(2, vs.length));
            for (let i = 0; i < 2 && vs.some(alive); i++) {
                if (i) yield* waitMin(2);
                yield* converse(pickScript(fit), cast);
            }
            addStat('tanoshisa', 20);
            addStat('onaka', 10);
            log('みんなでお茶会をした☕');
        } finally {
            k.meeting = false;
            release?.();
            meet.done = true;
            W().clearTea();
        }
    },
};

function* stardustShow(k, v, C) {
    const a = v.agent;
    yield* waitMin(2);
    let st = 0;
    const cue = cues([
        [2.5, k, 'わぁ…！お星さまがふってくるっちゃ〜！'],
        [5, a, '願いごと、してもいいよ🖤'],
        [7.5, k, 'まのとみんなが、ずーっと笑顔でいられますように…✨'],
    ]);
    yield* waitMin(10, (dt, t) => {
        cue(dt, t);
        st += dt;
        if (st > 0.8) {
            st = 0;
            const p = new THREE.Vector3(C.x + rand(-2, 2), 2.6, C.z + rand(-1.4, 1.4));
            ctx.fx.emoji(p, pick(['✨', '⭐', '🌟', '💫']), { rise: -70, spread: 30, life: 1.8 });
            ctx.sound.sparkle();
        }
    });
    ctx.fx.ring(new THREE.Vector3(C.x, 0.05, C.z), v.def.ring, { s0: 0.3, s1: 2.6, life: 2.4 });
    k.pose = 'happy';
    k.say('きれい〜！宝石みたいだっちゃ✨');
    addStat('kirakira', 15);
    addStat('tanoshisa', 15);
    log('クロミちゃんが星くずを降らせてくれた🌌');
    yield* waitMin(3);
    if (alive(v)) a.say('その願い、きっと届いたよ🖤');
    yield* waitMin(3);
}

export function socialCandidates() {
    const vs = present().filter((v) => v.greeted);
    if (!vs.length) return [];
    const h = hour();
    const day = h >= 7 && h < 18.5;
    const out = [['chat', 150], ['tea', 130], ['onsen2', 110], ['music', 125], ['special', 175]];
    if (day) out.push(['ballplay', 150]);
    if (vs.length >= 2) out.push(['party', 160]);
    return out;
}

export function pickPartner(id) {
    let vs = present().filter((v) => v.greeted);
    if (id === 'special') vs = vs.filter((v) => v.def.special !== 'catnap' || hour() < 19);
    if (id === 'party') return vs[0] ?? null;
    return vs.length ? pick(vs) : null;
}

// 'special' は相手ごとに中身が変わる
SOCIAL.special = function (k, v) {
    return SOCIAL[v.def.special](k, v);
};

// ── 4人そろったら：共鳴 ──
export function checkResonance() {
    if (resonanceLock) return;
    if (!rt.every((v) => v.state === 'visiting' && v.greeted)) return;
    const k = ctx.km;
    if (k.deepSleep || k.actId === 'greet' || k.actId === 'resonance' || hour() >= 21.2) return;
    resonanceLock = true;
    k.actId = 'resonance';
    k.setCo(resonance(k));
}

function* resonance(k) {
    k.actId = 'resonance';
    k.label = 'ソルフェジオファミリー、全員集合！✨';
    ctx.fx.toast('ソルフェジオファミリーが全員そろった…！✨', 3.5);
    const C = W().circle;
    const members = [k, ...rt.map((v) => v.agent)];
    const n = members.length;
    const spots = members.map((a, i) => {
        const ang = Math.PI + (i / n) * Math.PI * 2;
        const x = C.x + Math.sin(ang) * C.r;
        const z = C.z + Math.cos(ang) * C.r;
        return spot(x, z, x, 0, z, faceYaw({ x, z }, C), 'stand');
    });
    const meet = { done: false };
    members.slice(1).forEach((a, i) => a.setCo(join(a, spots[i + 1], meet, 'stand')));
    const [mano, kuromi, mikanyan, nee] = rt.map((v) => v.agent);
    ctx.cam?.focus(C.x, C.z, 15);
    try {
        yield* goSpot(k, spots[0]);
        yield* waitUntil(() => members.slice(1).every((a) => a.atSpot), 30);
        const center = new THREE.Vector3(C.x, 0.05, C.z);
        const roll = [
            [[k, nee], '396Hz〜🔔', 0xff86c2, 396],
            [[mano], '528Hz💖', 0x8fdfbb, 528],
            [[kuromi], '963Hz🖤', 0x8a74c8, 963],
            [[mikanyan], '♾️Hz🐱', 0xffb36b, 0],
        ];
        for (const [who, text, col, f] of roll) {
            who.forEach((a) => {
                a.say(text, 3);
                a.pose = 'happy';
                ctx.fx.ring(new THREE.Vector3(a.pos.x, 0.05, a.pos.z), col, { s0: 0.2, s1: 1.3, life: 1.8 });
            });
            ctx.sound.freq(f);
            yield* waitMin(3);
            who.forEach((a) => { a.pose = 'stand'; });
        }
        members.forEach((a) => { a.pose = 'dance'; });
        ctx.sound.chord();
        [0xff86c2, 0x8fdfbb, 0x8a74c8, 0xffb36b, 0xffd56b].forEach((c, i) =>
            ctx.fx.ring(center, c, { s0: 0.3, s1: 3 + i * 0.6, life: 2.8, delay: i * 0.3 }));
        members.forEach((a) => ctx.fx.burst(a.headPos(), ['💖', '✨', '🎵', '♾️'], 4));
        ctx.fx.banner('ソルフェジオファミリー 共鳴✨', '396Hz × 528Hz × 963Hz × ♾️Hz = ♾️💖✨');
        k.say('みんな、だーいすきだっちゃ〜！！💖', 4.5);
        S().resonance++;
        for (const key of Object.keys(S().stats)) addStat(key, 25);
        log('ソルフェジオファミリーが全員そろって共鳴した✨');
        let bt = 0;
        yield* waitMin(16, (dt) => {
            bt += dt;
            if (bt > 3) {
                bt = 0;
                members.forEach((a) => ctx.fx.emoji(a.headPos(), pick(['✨', '💖', '🎵']), { rise: 50 }));
            }
        });
    } finally {
        meet.done = true;
        members.forEach((a) => { if (a.pose === 'dance' || a.pose === 'happy') a.pose = 'stand'; });
        ctx.cam?.release();
    }
}

// ボールが飛んできたら、みかにゃんも追いかける
export function onBall() {
    const v = byId.mikanyan;
    if (!alive(v) || !v.greeted || v.agent.atSpot) return;
    v.agent.setCo(chaseBall(v));
}

function* chaseBall(v) {
    const a = v.agent;
    const b = ctx.ball;
    a.say('にゃ！ボールだにゃ〜！');
    let kicks = 0;
    for (let tries = 0; tries < 12 && kicks < 2 && b.active; tries++) {
        const tx = b.pos.x, tz = b.pos.z;
        yield* walkTo(a, tx, tz, { until: () => Math.hypot(b.pos.x - tx, b.pos.z - tz) > 0.9, speed: 1.3 });
        if (Math.hypot(b.pos.x - a.pos.x, b.pos.z - a.pos.z) < 0.85 && b.speed() < 2.5 && !b.pass) {
            kicks++;
            b.kick(a.pos);
            ctx.sound.bounce();
            a.say('にゃっ！', 1.2);
            a.pose = 'happy';
            yield* waitMin(1);
            a.pose = 'stand';
        } else {
            yield* waitMin(0.5);
        }
    }
}

export { rt };
