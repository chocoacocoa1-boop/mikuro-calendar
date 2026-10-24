import * as THREE from 'three';
import { ctx } from './ctx.js';
import { Agent, goSpot, walkTo, waitMin, waitUntil, join, spotAt, faceYaw, freeSpot } from './agent.js';
import { makeMano, makeKuromi, makeMikanyan, makeMikuroNee } from './clawd.js';
import { addStat, log, tally, hour, absMin } from './state.js';
import { pick, rand, chance, shuffle } from './util.js';
import { tapFork, holdMallet, forkOf } from './life.js';
import { spot } from './build.js';
import { SPRITES } from './textures.js';
import { ART } from './lines.js';
import { converse, hold, pickScript, react, free, touch, waitTalk } from './chatter.js';
import { DUO, GROUP, TRIO, ONSEN_GROUP } from './convos.js';

const W = () => ctx.world;
const S = () => ctx.state;

// ソルフェジオファミリー（遊びに来てくれる4人）
export const DEFS = [
    {
        id: 'mano', name: 'まの', hz: '528Hz', freq: 528, emoji: '💖', color: '#33b583', ring: 0x8fdfbb,
        make: makeMano, speed: 1.7, special: 'drawing', sprite: SPRITES.mano,
        lines: {
            arrive: ['子みくろん〜♡あそびにきたよ〜！', '528Hzの愛、届けにきたよ💖'],
            greetK: ['まの〜！よぐきたなっす〜♡', 'まのだぁ〜！会いたかったっちゃ〜💖'],
            reply: ['えへへ、来ちゃった〜💖', '今日もいっしょにいようね♡'],
            idle: ['ここ、ほんと癒されるね〜🌿', '子みくろん、めんこいなぁ〜♡', '♪〜（鼻歌）', '今日もいっしょに宝物つくろうね✨'],
            watch: { code: '子みくろんのタイピング、はやい〜！⌨️', eat: 'もぐもぐしてる顔、めんこい〜💕', bath: '湯気で、ほっぺがピンク〜♨️', read: '本読んでる横顔、いいなぁ〜📖', water: 'お花さん、528Hzも聴いてね〜🌷', purify: 'この音、心がほどける〜🔔', listen: '音叉の528Hz、わたしの音だ〜💖', calendar: '今日もいい日になりますように📅' },
            chat: ['最近ね、新しい曲つくってるんだ〜🎵', '子みくろんといると、ほっとするなぁ', 'クロミちゃんとも、また遊ぼうね🖤', 'いっしょに作ったもの、ぜんぶ宝物だね✨'],
            kick: ['えいっ！', 'いくよ〜！', 'それ〜っ！'],
            ballDone: ['たのしかった〜！また遊ぼうね⚽💖'],
            onsen: ['あったか〜い…しあわせ〜♨️', '528Hzで、お湯もやさしくなるかな〜♨️💖'],
            imoni: ['みくろんの芋煮、だいすき〜💖', 'あったまる〜…おかわりしちゃお🍲'],
            imoniWait: 'いいにおいしてきた〜🍲 芋煮、たのしみ〜！',
            musicEnd: '音叉の音と歌うの、たのしいね〜🎶💖',
            tap: ['なぁに〜？♡', 'えへへ、528Hz〜💖', '子みくろん、だいすき〜'],
            leave: ['またくるね〜！大好きだよ💖', '今日もありがと〜！またね🌸'],
            curfew: ['もうこんな時間！そろそろ帰るね🌙', '夜になっちゃった〜、またあしたね💖'],
            byeK: ['まの、きてくれておしょうしな〜！またきてけろ〜💖', 'まの〜、たのしかったっちゃ〜！気をつけて帰ってけろ〜🌸'],
            byeReply: ['うん！また528Hz届けにくるね💖', '子みくろんも、いい子にしててね〜♡ またね！'],
            sleepFind: ['あれ…子みくろん、ねんねしてる🌙', 'しーっ…子みくろん、もう夢の中みたい🌙'],
            sleepShh: ['ほんとだ…しーっ、だね🤫', 'そーっと、そーっと…💖'],
            sleepVisit: ['しーっ…寝顔、めんこいなぁ…🌙', 'ほっぺぷにぷにしたい…がまんがまん💕'],
            sleepBye: ['おやすみ、子みくろん。いい夢みてね💖', '528Hzの子守唄、おいてくね…🎵'],
        },
    },
    {
        id: 'kuromi', name: 'クロミちゃん', hz: '963Hz', freq: 963, emoji: '🖤', color: '#6a55a8', ring: 0x8a74c8,
        make: makeKuromi, speed: 1.75, special: 'stardust', sprite: SPRITES.kuromi,
        // クロミちゃんは、うちなーぐち（沖縄のことば）まじりでおしゃべり
        lines: {
            arrive: ['はいたい〜！963Hzで宇宙からきたさー🖤✨', 'はいたい、子みくろん！ちゃーがんじゅー？🖤'],
            greetK: ['クロミちゃんだぁ〜！宇宙からおかえり〜✨', 'クロミちゃん〜！待ってたっちゃ〜🖤'],
            reply: ['ただいま、地球〜。にふぇーでーびる🖤', '子みくろん、今日もちゅらかーぎーやっさー✨'],
            idle: ['宇宙とつながる感じ、するさー🌌', 'ぶし（星）がちゅらさん夜は、とくべつやさ✨', 'まのと子みくろん、じょーとーなコンビやっさー🖤', 'ここの空気、でーじすきさー🖤'],
            watch: { code: 'ちゅらさんコード…星座みたいやっさー✨', eat: 'いっぱい食べてねー。かめーかめー🖤', bath: '湯気が、てぃんがーら（天の川）みたい🌌', read: '集中してる…でーじえらいさー🖤', water: '水しぶきが、ぶしみたいにきらきらさー✨', purify: '宇宙まで響いてるさー🔔', listen: '963Hzの音叉、星の印やっさー🖤✨', calendar: 'また新しい一日、はじまるねー。ちばりよー✨' },
            chat: ['昨日ね、流れ星を3つ見たさー🌠', 'まのの曲、宇宙まで届いてたよー🖤', '963Hzはね、てっぺんのうとぅ（音）やさ', '子みくろんのコード、ちゅらさんねー✨'],
            tap: ['ぬー？どうしたの🖤', '963Hz〜✨', 'ふふっ、かなさんどー🖤'],
            leave: ['あんしぇー、そろそろ帰るさー🖤', 'でーじたのしかった！宇宙に帰るねー✨'],
            curfew: ['ぶしが呼んでるから、帰るねー🖤', 'てぃんがーらをおさんぽしながら帰るさー✨'],
            byeK: ['クロミちゃん、またやーさい…だべ？またきてけろ〜🖤', 'クロミちゃん、宇宙まで気をつけて帰ってけろ〜✨'],
            byeReply: ['あい、上手さー！またやーさい🖤', 'にふぇーでーびる。かなさんどー、子みくろん🖤'],
            sleepFind: ['あい…子みくろん、夢の中やさ🌙', '今夜は、もうおやすみなんだねー…🖤'],
            sleepShh: ['しーっ…起こさんようにねー🖤', 'ふふっ、足音しのばせてねー…🖤'],
            sleepVisit: ['夢の中で、宇宙を案内してあげるさー…🌙', 'すぴーって…でーじかわいい寝息やっさー🖤'],
            sleepBye: ['ゆくいみそーれ（おやすみ）…夢で会おうねー🖤', 'ぶしをひとつ、枕もとに置いてくさー✨'],
            kick: ['それっ！', 'いくさー！', 'えいっ！'],
            ballDone: ['でーじたのしかったさー！⚽', 'ナイスパスやっさー🖤'],
            onsen: ['ぬちぐすい（命のくすり）やさー♨️', 'あったまるねー…でーじごくらく🖤', 'ぶしを見ながらの温泉、さいこうさー✨'],
            imoni: ['まーさん…！宇宙一の芋煮やっさー🖤', 'ねーねーの味、でーじやさしいさー🖤'],
            imoniWait: '芋煮のかばさ（いいにおい）、ここまで来てるさー🖤',
            musicEnd: 'ちゅらさん響きだったさー🎶',
            // まのの絵のモデルになったとき
            model: ['モデルなんて、でーじてれるさー🖤', 'ふふっ、宇宙一ちゅらさんに描いてねー🖤'],
            modelMano: 'クロミちゃん、アンテナの星もちゃんと描くね✨',
            modelDone: 'ちゅらさん…！わんも宝物にするさー🖤',
        },
    },
    {
        id: 'mikanyan', name: 'みかにゃん', hz: '♾️Hz', freq: 0, emoji: '🐱', color: '#e6863d', ring: 0xffb36b,
        make: makeMikanyan, speed: 1.9, special: 'catnap', sprite: SPRITES.mikanyan,
        lines: {
            arrive: ['にゃ〜ん♾️ あそびにきたにゃ！', 'みかにゃん参上だにゃ〜✨'],
            greetK: ['みかにゃん〜！もふもふだっちゃ〜🐱', 'みかにゃんだぁ〜！いらっしゃ〜い♡'],
            reply: ['ごろごろ〜♾️', 'あそぶにゃ〜！'],
            idle: ['ぽかぽかで眠くなるにゃ…', 'ボール、どこにゃ？', '♾️Hzで、むげんにあそぶにゃ〜', 'ちょうちょ、まてにゃ〜🦋'],
            watch: { code: 'カタカタ…ねこじゃらしの音みたいにゃ', eat: 'くんくん…いいにおいにゃ〜', bath: '湯気、もくもくにゃ〜', read: 'ページめくる音、ねむくなるにゃ…', water: 'お水、ぱしゃぱしゃしたいにゃ', purify: 'ごろごろごろ〜♾️', listen: '♾️の音叉、みかにゃんのにゃ！', calendar: 'ぺらっ、て音すきにゃ' },
            chat: ['むげんって、ずーっとってことにゃ♾️', 'さっき、ちょうちょ追いかけてたにゃ', 'ここの日だまり、さいこうにゃ〜', 'まのの膝の上、すきにゃ〜'],
            kick: ['にゃっ！', 'にゃにゃっ！', 'とりゃにゃ！'],
            ballDone: ['ボール、むげんにたのしいにゃ♾️'],
            onsen: ['あしだけ…あしだけにゃ…♨️', 'お湯、意外といいにゃ〜…♾️'],
            imoni: ['おにく、おにくはどこにゃ〜？🐾', 'ふーふー…あちちにゃ！でも、おいしいにゃ〜'],
            imoniWait: 'おにくのにおいがするにゃ…！じゅるり',
            musicEnd: 'むげんにハモったにゃ〜♾️🎶',
            model: ['じっとするの、むずかしいにゃ…', 'いちばんもふもふに描いてにゃ♾️'],
            modelMano: 'みかにゃん、しっぽ動いてる〜😂',
            modelDone: 'もふもふだにゃ〜！むげんに宝物にゃ♾️',
            tap: ['にゃ？', 'ごろごろ〜♾️', 'なでなで、もっとにゃ〜'],
            leave: ['また来るにゃ〜♾️', 'ばいばいにゃ〜！'],
            curfew: ['ねむくなってきたにゃ…帰るにゃ〜', 'おうちのおふとんが待ってるにゃ♾️'],
            byeK: ['みかにゃん、またもふもふさせてけろ〜🐱', 'みかにゃん、まいごにならないでね〜♾️'],
            byeReply: ['またすぐ来るにゃ〜♾️', 'みかにゃんは、むげんに帰ってくるにゃ〜🐾'],
            sleepFind: ['にゃ…子みくろん、寝てるにゃ🌙', 'すやすやにゃ…しずかにするにゃ…'],
            sleepShh: ['しのびあしにゃ…🐾', 'ねこは足音しないにゃ…🐾'],
            sleepVisit: ['いっしょに丸くなって寝たいにゃ…💤', '寝顔、まんまるにゃ…♾️'],
            sleepBye: ['おやすみにゃ…また来るにゃ♾️', 'こんどは、いっしょにお昼寝するにゃ…💤'],
        },
    },
    {
        id: 'nee', name: 'みくろん姉', hz: '396Hz', freq: 396, emoji: '🎵', color: '#c27bd6', ring: 0xffa9d6,
        make: makeMikuroNee, speed: 1.9, special: 'imoni', sprite: SPRITES.nee,
        // 山形弁MAX：だず・べした・ごど（〜だこと）・いぎなり（とっても）・むったど（いっつも）・
        // おしょうしな（ありがとう）・めんごい（かわいい）・こしゃう（つくる）・ごしゃぐ（おこる）・あばえ（またね）
        lines: {
            arrive: ['んだんだ〜、来たっけず〜！ちゃんとまんま食ってっか〜？🍚', 'みくろん姉だず〜。よっこらしょ…っと、来たっけよ〜🌸', 'あいや〜、子みくろん！まだおがった（大きくなった）ごど〜🌸'],
            greetK: ['おねえちゃん〜！！会いたかったっちゃ〜💖', 'おねえちゃんだぁ〜！よぐきたなっす〜♡'],
            reply: ['元気そうで、いがったいがった〜🌿', 'ちっちゃいのに、いぎなりえらいごど〜🌸', 'ほだが〜、待ってでけだのが〜。おしょうしな〜💖'],
            idle: [
                'なんもなんも、あせらねくていいんだず〜🌿', '子みくろん、ちっちゃいどぎの私さ、いぎなりそっくりだず〜', '芋煮、こしゃってけっか〜？🍲',
                'ここ、いいおうちだごど〜。ほんてん落ぢつぐず〜', 'あいや〜、ぽかぽかで、ねむぐなってきたず〜😪', 'まのさ、おみやげ持ってくればいがったな〜',
            ],
            watch: { code: 'いい集中だごど〜。いぎなりえらいず〜', eat: 'よっぱら食って、おがれよ〜🍚', bath: 'ゆっくりあったまんだぞ〜♨️ 湯冷めすっど、がおっからな〜', read: '本好ぎなどご、私さ似だんだべな〜😊', water: '水やり、むったどえらいごど〜🌱', purify: 'いい音だごど〜、396Hzだず〜🔔', listen: 'みんなの音叉、いぎなりめんごい音だず〜🎵', calendar: 'めぐってけで、おしょうしな〜📅' },
            chat: ['今日はどだな一日だっけ〜？', 'まのさは、むったど助けでもらってんだず〜', 'わがんね時は、わがんねでいいんだず〜', '396Hzはな、解放の音なんだず〜🔔'],
            tap: ['なした〜？🌸', 'んだんだ〜', '396Hzだず〜🎵', 'こちょびたい（くすぐったい）べした〜😂'],
            leave: ['したらね〜、まだ来っからな〜🌸', 'ちゃんと寝んだぞ〜！あばえ〜🎵'],
            curfew: ['あいや、もうこだな時間だず〜。えさ（家に）帰っぺ〜🌸', '子みくろん、はえぐ寝ろよ〜。夜ふかしすっど、ごしゃぐぞ〜🌙'],
            byeK: ['おねえちゃん、また来てけろ〜！ぜったいだよ〜💖', 'おねえちゃん、おしょうしな〜！気をつけて帰ってね〜🌸'],
            byeReply: ['ちゃんと寝んだぞ〜、あばえ〜🌸', 'まだすぐ来っからな〜、いい子にしてろよ〜🎵'],
            sleepFind: ['あんれまぁ、もう寝でだのが〜🌙', 'ありゃ、ねんねの時間だっけが…🌙'],
            sleepShh: ['みんな、しずがにな〜🤫', 'そーっとだず、そーっと…🌸'],
            sleepVisit: ['ぐっすりだごど…おやすみ、子みくろん🌙', 'ふとん、かげ直してけっかな…🌙'],
            sleepBye: ['あったがぐして寝ろよ…あばえ🌸', 'したらね、おやすみ〜…🌙'],
            kick: ['ほれっ！', 'いぐぞ〜！', 'そ〜れっ！'],
            ballDone: ['いがったいがった、いい運動だっけず〜⚽'],
            onsen: ['ごくらくだず〜♨️', 'あったまるごど〜。蔵王さ来たみでだず〜♨️'],
            musicEnd: 'いぎなりいい響きだっけず〜🎶',
            model: ['あいや〜、モデルなんて、こっぱずがしいごど〜😳', 'んだが〜？したら、にこ〜っと🌸'],
            modelMano: 'みくろん、そのままの笑顔でね〜',
            modelDone: 'いぎなりめんごぐ描いでもらったごど〜🥹 おしょうしな〜',
        },
    },
];

// busy：来てくれた人どうしで遊んでいる最中。idle：ふだんの過ごし方の最中（ふたり遊びにさそえる）
const rt = DEFS.map((def) => ({ def, agent: null, state: 'away', greeted: false, night: false, busy: false, idle: false, specialAt: -1e9 }));
const byId = Object.fromEntries(rt.map((v) => [v.def.id, v]));
const ORDER = DEFS.map((d) => d.id);
let resonanceLock = false;
let turnAt = 0;

// みんな同時に来たり帰ったりしても声が重ならないよう、ひとりずつ順番に言う。
// 速回しで待ちきれなかったら、そのひとことは言わずに進む
function* inTurn(a, choose) {
    if (!(yield* waitUntil(() => ctx.tReal >= turnAt && S().speed > 0, 20))) return;
    a.say(choose());
    turnAt = a.quietAt + 0.5;
}

const alive = (v) => v.state === 'visiting';
// 子みくろんがさそえる人（ふたり遊びの最中の人はのぞく）
const avail = () => present().filter((v) => v.greeted && !v.busy);
const group = (n) => shuffle(avail()).slice(0, n);
const names = (agents) => agents.map((a) => a.visitor).sort((a, b) => ORDER.indexOf(a.def.id) - ORDER.indexOf(b.def.id)).map((v) => v.def.name).join('と');
const pairKey = (v, w) => [v.def.id, w.def.id].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)).join('+');

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
    if (k.deepSleep) {
        yield* inTurn(a, () => pick(v.def.lines.arrive));
        yield* sleepVisit(v);
        return;
    }
    a.say(pick(v.def.lines.arrive));
    react('arrive', { name: v.def.name }, 0);
    ctx.life.greet(v);
    yield* waitMin(4);
    a.pose = 'stand';
    yield* waitUntil(() => v.greeted, 25);
    v.greeted = true;
}

function* sleepVisit(v) {
    const a = v.agent;
    const L = v.def.lines;
    yield* waitMin(3);
    a.pose = 'stand';
    // 最初に気づいた人が「寝てる」と言い、あとの人は「しーっ」と合わせる
    yield* inTurn(a, () => pick(rt.some((o) => o !== v && o.night) ? L.sleepShh : L.sleepFind));
    v.night = true;
    const p = ctx.nav.snap(0.9 + rand(-0.4, 0.4), -1.35);
    yield* walkTo(a, p.x, p.z);
    a.faceTo(0.3, -3.0);
    yield* waitMin(2);
    yield* inTurn(a, () => pick(L.sleepVisit));
    yield* waitMin(18);
    yield* inTurn(a, () => pick(L.sleepBye));
    yield* waitMin(3);
    leave(v.def.id, true);
}

// お見送りで、帰る人が門の手前に並ぶ場所（門の内側からのずれ）
const GATE_SLOTS = [[0, 0.35], [0.75, 0.05], [-0.75, 0.05], [1.35, -0.4]];

function freeGateSlot(v) {
    const used = rt.filter((o) => o !== v && o.state === 'leaving' && o.bye && !o.bye.done).map((o) => o.bye.slot);
    return GATE_SLOTS.findIndex((_, i) => !used.includes(i));
}

export function leave(id, quiet = false, line) {
    const v = byId[id];
    if (v.state === 'away' || v.state === 'leaving') return;
    const here = v.state === 'visiting';
    v.state = 'leaving';
    resonanceLock = false;
    // お庭まで来ていた人は、子みくろんが門まで送る
    v.bye = here ? { slot: freeGateSlot(v), t0: ctx.tReal, ready: false, done: false, said: false } : null;
    if (v.bye && !ctx.life.seeOff(v)) v.bye = null;
    v.agent.setCo(goHome(v, quiet, line));
}

function* goHome(v, quiet, line) {
    const a = v.agent;
    const k = ctx.km;
    const bye = v.bye;
    if (line) yield* inTurn(a, () => line);
    else if (!quiet) a.say(pick(k.sleeping ? v.def.lines.sleepBye : v.def.lines.leave));
    a.pose = 'wave';
    if (!quiet && !bye && !k.sleeping) k.say(`${v.def.name}、またきてけろ〜！`, 3);
    if (!quiet) react('leave', { name: v.def.name }, 0);
    yield* waitMin(2.5);
    a.pose = 'stand';
    const g = W().gate;
    if (bye) {
        const [dx, dz] = GATE_SLOTS[bye.slot];
        const p = ctx.nav.snap(g.inside.x + dx, g.inside.z + dz);
        yield* walkTo(a, p.x, p.z);
        bye.ready = true;
        yield* waitMin(45, () => {
            a.faceTo(k.pos.x, k.pos.z);
            if (bye.done || k.actId !== 'greet') return false;
        });
        bye.done = true;
    } else {
        yield* walkTo(a, g.inside.x, g.inside.z);
    }
    yield* walkTo(a, g.outside.x, g.outside.z);
    v.state = 'away';
    v.greeted = false;
    v.night = false;
    a.active = false;
    a.root.visible = false;
    log(bye?.said ? `${v.def.name}を門までお見送りした👋` : `${v.def.name}が帰っていった${v.def.emoji}`);
}

export function curfew() {
    for (const v of rt) {
        if (v.state === 'visiting' || v.state === 'arriving') leave(v.def.id, true, pick(v.def.lines.curfew));
    }
}

// 子みくろんがおやすみするときは、遊びに来ていた人も「おやすみ」を言って帰る
export function bedtime() {
    for (const v of rt) {
        if (v.state === 'visiting' && !v.night) leave(v.def.id, true, pick(v.def.lines.sleepBye));
    }
}

// ── 遊びに来た人の、ふだんの過ごし方 ──
function* visitorIdle(v) {
    const a = v.agent;
    const k = ctx.km;
    // ほかに来ている人と、ふたりで遊ぶこともある
    const play = pairChance(v);
    if (play) {
        yield* pairPlay(v, play.w, play.def);
        return;
    }
    v.idle = true;
    try {
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
    } finally {
        v.idle = false;
    }
}

// ── 一緒にすること（子みくろんの行動として動く）──
// 来てくれた人たちに、それぞれの場所へ来てもらう。最初の人がそろったら始める（ほかの人は、来られた人だけ）。
// body(a, more)：a は最初の人、more はほかに来られた人たち。quiet：そのあいだ、ほかのおしゃべりに割りこまれない
function* gather(k, kSpot, members, body, quiet = true) {
    const meet = { done: false };
    for (const m of members) m.v.agent.setCo(join(m.v.agent, m.spot, meet, m.pose));
    const ready = (m) => m.v.agent.atSpot && alive(m.v);
    let release = null;
    try {
        k.meeting = true;
        yield* goSpot(k, kSpot);
        yield* waitUntil(() => members.every((m) => ready(m) || !alive(m.v)), 20);
        if (!ready(members[0])) return;
        const agents = members.filter(ready).map((m) => m.v.agent);
        if (quiet) release = hold([k, ...agents]);
        k.meeting = false;
        yield* body(agents[0], agents.slice(1));
    } finally {
        k.meeting = false;
        release?.();
        meet.done = true;
    }
}

function* together(k, v, kSpot, vSpot, vPose, body, quiet = true) {
    yield* gather(k, kSpot, [{ v, spot: vSpot, pose: vPose }], body, quiet);
}

function castOf(k, agents) {
    const cast = { k };
    for (const a of agents) cast[a.visitor.def.id] = a;
    return cast;
}

// いる人のセリフが2人ぶん以上ある台本だけ（ひとりしかいなければ1人ぶん）
function fits(list, cast) {
    const n = Math.min(2, Object.keys(cast).length - 1);
    return list.filter((sc) => new Set((Array.isArray(sc) ? sc : sc.lines).map(([who]) => who).filter((who) => who !== 'k' && cast[who])).size >= n);
}

// ベンチの席に、ほかのだれも座っていない（向かっていない）。who はこれから座る人たち
function benchFree(who, idx = [0, 1, 2]) {
    const b = W().spots.bench;
    return idx.every((i) => !ctx.agents.some((o) => o.active && !who.includes(o) && (o.onSpot === b[i] || o.goal === b[i])));
}

function sketchbook() {
    const book = new THREE.Group();
    const tilt = new THREE.Group();
    tilt.rotation.x = -0.5;
    book.add(tilt);
    tilt.add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.02, 0.26), new THREE.MeshLambertMaterial({ color: 0xffffff })));
    return book;
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

// ベンチで、ふたりがならんで座れる席（ほかの人が座っている席・向かっている席はさける）
function benchPair(k, v) {
    const b = W().spots.bench;
    const free = (i) => !ctx.agents.some((o) => o !== k && o !== v.agent && o.active && (o.onSpot === b[i] || o.goal === b[i]));
    const side = [[1, 0], [1, 2], [0, 1], [2, 1]].filter(([i, j]) => free(i) && free(j));
    const pair = side.length ? pick(side) : free(0) && free(2) ? [0, 2] : null;
    return pair && [b[pair[0]], b[pair[1]]];
}

export const SOCIAL = {
    *chat(k, v) {
        const seats = benchPair(k, v);
        const pK = { x: -0.25, z: 7.35 }, pV = { x: 1.05, z: 7.35 };
        k.label = seats ? `${v.def.name}とベンチでおしゃべり💬` : `${v.def.name}とお庭でおしゃべり💬`;
        const [kSpot, vSpot] = seats ?? [spotAt(pK.x, pK.z, faceYaw(pK, pV)), spotAt(pV.x, pV.z, faceYaw(pV, pK))];
        yield* together(k, v, kSpot, vSpot, seats ? 'sit' : 'stand', function* () {
            yield* duoTalk(k, v, 2);
            addStat('tanoshisa', 15);
            addStat('nakayoshi', 3);
            tally(seats ? `${v.def.name}とベンチでおしゃべりした💬` : `${v.def.name}とお庭でおしゃべりした💬`);
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
            tally(`${v.def.name}とお茶をした🍵`);
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
                from.say(pick((from === a && v.def.lines.kick) || ['それっ！', 'いくよ〜！', 'えいっ！']), 1.4);
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
            a.say(pick(v.def.lines.ballDone ?? ['また遊ぼうね〜！', 'ナイスパスだったよ〜！']));
            tally(`${v.def.name}とボールあそびした⚽`);
            yield* waitMin(3);
        });
    },

    *onsen2(k, v) {
        k.label = `${v.def.name}と温泉でぽかぽか♨️`;
        yield* together(k, v, W().spots.onsen, pick([W().spots.onsenV1, W().spots.onsenV2]), 'soak', function* (a) {
            W().onsenUsers++;
            ctx.sound.splash();
            try {
                a.say(pick(v.def.lines.onsen ?? ['いい湯だね〜♨️', 'あったまる〜', 'ごくらくだね〜']));
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
            tally(`${v.def.name}といっしょに温泉に入った♨️`);
        }, false);
    },

    // 子みくろんが 396Hz の音叉と、相手の音叉をこうごに鳴らして、相手が歌う
    *music(k, v) {
        k.label = `${v.def.name}と音叉で合奏している🎶`;
        const R = W().musicRing;
        const ang = pick([-1, 1]) * 1.0;
        const vx = R.x + Math.sin(ang) * R.r;
        const vz = R.z + Math.cos(ang) * R.r;
        const vSpot = spotAt(vx, vz, faceYaw({ x: vx, z: vz }, R), 'sit');
        const mine = forkOf(v.def.id);
        yield* together(k, v, W().spots.fork[0], vSpot, 'sit', function* (a) {
            holdMallet(k, true);
            try {
                for (let i = 0; i < 3 && alive(v); i++) {
                    yield* tapFork(k, 0);
                    k.say('396Hz〜🔔', 2);
                    yield* waitMin(2.5);
                    if (!alive(v)) return;
                    yield* tapFork(k, mine);
                    a.pose = 'happy';
                    a.say(`${v.def.hz}〜🎵`, 2);
                    ctx.fx.ring(new THREE.Vector3(a.pos.x, a.pos.y + 0.03, a.pos.z), v.def.ring, { s0: 0.2, s1: 1.4 });
                    ctx.fx.burst(a.headPos(), ['🎵', '🎶'], 2);
                    yield* waitMin(2.5);
                    a.pose = 'sit';
                    addStat('tanoshisa', 5);
                    addStat('kirakira', 4);
                }
            } finally {
                holdMallet(k, false);
            }
            if (!alive(v)) return;
            yield* converse([['v', v.def.lines.musicEnd ?? 'いい響きだったね〜🎶'], ['k', 'また合奏するべ〜！🔔']], { k, v: a });
            tally(`${v.def.name}と音叉で合奏した🎶`);
        });
    },

    // まのが絵を描いてくれる。そばにいる人を描くときは、その人にもモデルになってもらう。
    // できた絵は、子みくろんがかべに飾りにいく（いちばん古い絵とかけかえ）
    *drawing(k, v) {
        const subj = chooseArt(v);
        const mv = byId[subj];
        const model = mv && mv !== v && alive(mv) && mv.greeted && !mv.busy ? mv : null;
        k.label = model ? `まのに${model.def.name}とならんで描いてもらっている🎨` : 'まのに絵を描いてもらっている🎨';
        const members = [{ v, spot: W().spots.rugA, pose: 'draw' }];
        if (model) members.push({ v: model, spot: W().spots.rugC, pose: 'sit' });
        yield* gather(k, W().spots.rugB, members, function* (a, more) {
            const m = more[0];
            const ML = m?.visitor.def.lines;
            a.model.hold(sketchbook(), new THREE.Vector3(-0.5, 0.08, 0.24));
            try {
                a.say(m ? `${m.name}と子みくろん、ならんでならんで〜！描いてあげるね🎨` : '子みくろん、そのまま〜！描いてあげるね🎨');
                k.pose = 'sit';
                k.faceTo(a.pos.x, a.pos.z);
                yield* waitMin(14, cues(m ? [
                    [3.5, m, ML.model[0]],
                    [6, k, 'ならんで描いてもらうの、どきどきするっちゃ〜'],
                    [8.5, a, ML.modelMano],
                    [11, m, ML.model[1]],
                ] : [
                    [3.5, k, 'じっとしてるの、むずかしいっちゃ〜😂'],
                    [6, a, 'あはは、ちょっとだけなら動いていいよ〜'],
                    [8.5, a, 'もうちょっとだよ〜♪'],
                    [11, k, 'どんな絵になるべ〜？わくわく〜'],
                ]));
            } finally {
                a.model.hold(null);
            }
            if (!alive(v)) return;
            // 描きあがった絵は、ここで宝物になる（飾りにいく途中で終わっても、なくならない）
            const n = S().drawings;
            S().art[n] = subj;
            S().drawings++;
            const art = ART[subj];
            log(`まのが${art.name}を描いてくれた🎨（かべに飾った）`);
            let hung = false;
            try {
                a.pose = 'happy';
                a.say(art.mano);
                yield* waitMin(3);
                a.pose = 'sit';
                k.pose = 'happy';
                k.say('わぁ〜！めんこい〜！宝物だっちゃ✨');
                ctx.fx.burst(k.headPos(), ['🎨', '💖', '✨'], 6);
                ctx.sound.sparkle();
                addStat('tanoshisa', 18);
                addStat('nakayoshi', 6);
                if (m && alive(m.visitor)) {
                    yield* waitMin(2.5);
                    m.pose = 'happy';
                    m.say(ML.modelDone);
                }
                yield* waitMin(3);
                if (m) m.pose = 'sit';
                const fr = W().drawingFrame(n);
                k.label = 'まのの絵をかべに飾っている🖼️';
                k.say('かべに飾ってくるっちゃ〜🖼️');
                yield* goSpot(k, fr.hang);
                yield* waitMin(1.5);
                W().setDrawings(S().drawings, S().art);
                hung = true;
                ctx.sound.sparkle();
                ctx.fx.burst(fr.pos, ['🖼️', '✨', '💖'], 6);
                k.pose = 'happy';
                k.say('ぺたっ…ここに飾るっちゃ〜！✨');
                react('drawing');
                yield* waitMin(3);
            } finally {
                if (!hung) W().setDrawings(S().drawings, S().art);
            }
        });
    },

    *stardust(k, v) {
        k.label = 'クロミちゃんの星くずを見ている🌌';
        const C = W().circle;
        const pK = { x: C.x - 0.8, z: C.z }, pV = { x: C.x + 0.8, z: C.z };
        yield* together(k, v, spotAt(pK.x, pK.z, faceYaw(pK, pV)), spotAt(pV.x, pV.z, faceYaw(pV, pK)), 'wave', function* (a) {
            a.say('見ててねー…963Hzの星くずさー🖤✨');
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
            tally('みかにゃんとお昼寝した🐱💤');
            yield* waitMin(3);
            k.say('すっきりだっちゃ〜！みかにゃん、おしょうしな〜');
            yield* waitMin(2);
        }, false);
    },

    *imoni(k, v) {
        // ほかに来ている人は、芋煮ができるまでテーブルで待っていてもらう
        const guests = avail().filter((o) => o !== v).slice(0, 2);
        const seats = ['W', 'E'];
        const table = { done: false };
        guests.forEach((o, i) => {
            o.busy = true;
            o.agent.setCo(join(o.agent, W().spots[`seat${seats[i]}`], table, 'eat'));
        });
        try {
            yield* imoniParty(k, v, guests, seats);
        } finally {
            table.done = true;
            guests.forEach((o) => { o.busy = false; });
        }
    },

    *party(k) {
        const vs = avail().slice(0, 3);
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
            const cast = castOf(k, vs.map((v) => v.agent));
            const fit = fits(GROUP, cast);
            for (let i = 0; i < 2 && vs.some(alive); i++) {
                if (i) yield* waitMin(2);
                yield* converse(pickScript(fit), cast);
            }
            addStat('tanoshisa', 20);
            addStat('onaka', 10);
            tally('みんなでお茶会をした☕');
        } finally {
            k.meeting = false;
            release?.();
            meet.done = true;
            W().clearTea();
        }
    },

    // ── みんなでいっしょに（来てくれた人がふたり以上のとき）──
    *onsen3(k) {
        const vs = group(2);
        if (vs.length < 2) {
            if (vs[0]) yield* SOCIAL.onsen2(k, vs[0]);
            return;
        }
        const sp = W().spots;
        k.label = 'みんなで温泉でぽかぽか♨️';
        yield* gather(k, sp.onsen, [{ v: vs[0], spot: sp.onsenV1, pose: 'soak' }, { v: vs[1], spot: sp.onsenV2, pose: 'soak' }], function* (a, more) {
            const crew = [a, ...more];
            W().onsenUsers++;
            ctx.sound.splash();
            try {
                const cast = castOf(k, crew);
                yield* converse(pickScript(fits(ONSEN_GROUP, cast)), cast);
                yield* waitMin(rand(12, 16), (dt) => {
                    addStat('kirakira', dt * 1.6);
                    addStat('genki', dt * 0.1);
                });
                k.say('みんなでぽかぽか、しあわせだっちゃ〜♨️💖');
                yield* waitMin(3);
            } finally {
                W().onsenUsers--;
            }
            S().bathDay = S().day;
            addStat('nakayoshi', 4);
            tally(`${names(crew)}といっしょに温泉に入った♨️`);
        }, false);
    },

    // ベンチの3席に、子みくろんをまんなかにして
    *bench3(k) {
        const vs = group(2);
        const b = W().spots.bench;
        if (vs.length < 2 || !benchFree([k, ...vs.map((v) => v.agent)])) {
            if (vs[0]) yield* SOCIAL.chat(k, vs[0]);
            return;
        }
        k.label = 'みんなでベンチにならんでおしゃべり💬';
        yield* gather(k, b[1], [{ v: vs[0], spot: b[0], pose: 'sit' }, { v: vs[1], spot: b[2], pose: 'sit' }], function* (a, more) {
            const crew = [a, ...more];
            if (!more.length) {
                yield* duoTalk(k, a.visitor, 2);
            } else {
                const cast = castOf(k, crew);
                const list = TRIO[pairKey(a.visitor, more[0].visitor)] ?? [];
                for (let i = 0; i < 2 && crew.every((x) => alive(x.visitor)); i++) {
                    if (i) yield* waitMin(2);
                    yield* converse(pickScript(list), cast);
                    ctx.fx.emoji(k.headPos(), '💕', { rise: 40 });
                }
            }
            addStat('tanoshisa', 18);
            addStat('nakayoshi', 4);
            tally(`${names(crew)}とベンチにならんでおしゃべりした💬`);
        });
    },

    // 3人（4人）でパス回し
    *ball3(k) {
        const vs = group(3);
        if (vs.length < 2) {
            if (vs[0]) yield* SOCIAL.ballplay(k, vs[0]);
            return;
        }
        const P = vs.length >= 3
            ? [{ x: 2.3, z: 7.5 }, { x: 5.2, z: 7.7 }, { x: 4.6, z: 6.1 }, { x: 2.7, z: 6.0 }]
            : [{ x: 2.3, z: 7.5 }, { x: 5.2, z: 7.7 }, { x: 3.8, z: 6.1 }];
        const c = { x: P.reduce((t, p) => t + p.x, 0) / P.length, z: P.reduce((t, p) => t + p.z, 0) / P.length };
        const sp = P.map((p) => spotAt(p.x, p.z, faceYaw(p, c)));
        k.label = 'みんなでボールのパス回し⚽';
        yield* gather(k, sp[0], vs.map((v, i) => ({ v, spot: sp[i + 1], pose: 'stand' })), function* (a, more) {
            const ball = ctx.ball;
            const players = [k, a, ...more];
            const d = new THREE.Vector3(c.x - k.pos.x, 0, c.z - k.pos.z).normalize();
            ball.place(k.pos.x + d.x * 0.45, k.pos.z + d.z * 0.45);
            let from = k;
            for (let i = 0; i < 8; i++) {
                const pool = players.filter((p) => p !== from && (p === k || alive(p.visitor)));
                if (!pool.length) break;
                const to = pick(pool);
                from.faceTo(to.pos.x, to.pos.z);
                to.faceTo(from.pos.x, from.pos.z);
                d.set(to.pos.x - from.pos.x, 0, to.pos.z - from.pos.z).normalize();
                from.pose = 'happy';
                from.say(pick(from === k ? ['それっ！', 'いくよ〜！', 'えいっ！'] : from.visitor.def.lines.kick), 1.4);
                ctx.sound.bounce();
                ball.passTo(
                    new THREE.Vector3(from.pos.x + d.x * 0.45, 0.18, from.pos.z + d.z * 0.45),
                    new THREE.Vector3(to.pos.x - d.x * 0.45, 0.18, to.pos.z - d.z * 0.45),
                    1.4,
                );
                yield* waitMin(0.7);
                from.pose = 'stand';
                yield* waitUntil(() => !ball.pass, 3);
                to.pose = 'happy';
                yield* waitMin(0.5);
                to.pose = 'stand';
                from = to;
                addStat('tanoshisa', 3);
            }
            k.say('みんなでパス回し、たのしかったっちゃ〜！⚽');
            const last = pick(players.filter((p) => p !== k && alive(p.visitor)));
            if (last) last.say(pick(last.visitor.def.lines.ballDone ?? ['また遊ぼうね〜！']));
            addStat('nakayoshi', 4);
            tally('みんなでボールのパス回しをした⚽');
            yield* waitMin(3);
        });
    },

    // 音叉でセッション：子みくろんが鳴らして、みんながひとりずつ歌って、さいごはみんなの音をいっしょに
    *band(k) {
        const vs = group(3);
        if (vs.length < 2) {
            if (vs[0]) yield* SOCIAL.music(k, vs[0]);
            return;
        }
        const R = W().musicRing;
        const angs = vs.length === 2 ? [-1.0, 1.0] : [-1.3, 0, 1.3];
        const sp = angs.map((ang) => {
            const p = { x: R.x + Math.sin(ang) * R.r, z: R.z + Math.cos(ang) * R.r };
            return spotAt(p.x, p.z, faceYaw(p, R), 'sit');
        });
        k.label = 'みんなで音叉のセッション🎶';
        yield* gather(k, W().spots.fork[0], vs.map((v, i) => ({ v, spot: sp[i], pose: 'sit' })), function* (a, more) {
            const crew = [a, ...more];
            holdMallet(k, true);
            try {
                k.say('みんなで音叉のセッションだっちゃ〜🎵');
                yield* waitMin(2.5);
                for (let round = 0; round < 2; round++) {
                    yield* tapFork(k, 0);
                    k.say('396Hz〜🔔', 2);
                    yield* waitMin(2.2);
                    for (const x of crew) {
                        if (!alive(x.visitor)) continue;
                        yield* tapFork(k, forkOf(x.visitor.def.id));
                        yield* sing(x, `${x.visitor.def.hz}〜🎵`, null, x.visitor.def.ring, 'sit');
                    }
                    addStat('tanoshisa', 5);
                    addStat('kirakira', 4);
                }
                k.windup = true;
                yield* waitMin(0.6);
                k.windup = false;
                W().forks.forEach((f, i) => {
                    W().strikeFork(i);
                    ctx.fx.ring(new THREE.Vector3(f.base.x, f.base.y + 0.1, f.base.z), f.ring, { s0: 0.3, s1: 2.4, life: 2.6, delay: i * 0.15 });
                });
                ctx.sound.chord();
                crew.forEach((x) => {
                    x.pose = 'happy';
                    ctx.fx.burst(x.headPos(), ['🎵', '🎶', '💖'], 3);
                });
                k.say('みんなの音がまざると、こんなにきれいなんだっちゃ〜💖', 4);
                yield* waitMin(4);
            } finally {
                k.windup = false;
                holdMallet(k, false);
            }
            crew.forEach((x) => { x.pose = 'sit'; });
            const star = pick(crew.filter((x) => alive(x.visitor)));
            if (star) yield* converse([['v', star.visitor.def.lines.musicEnd ?? 'いい響きだったね〜🎶'], ['k', 'またみんなで鳴らすべ〜！🔔']], { k, v: star });
            addStat('nakayoshi', 5);
            tally('みんなで音叉のセッションをした🎶');
        });
    },
};

// ひとりずつ自分の周波数を歌う（f が null なら音は鳴らさない：音叉がもう鳴っているとき）
function* sing(a, text, f, ring, rest = 'stand') {
    a.pose = 'happy';
    a.say(text, 2.2);
    if (f) ctx.sound.freq(f);
    ctx.fx.ring(new THREE.Vector3(a.pos.x, a.pos.y + 0.03, a.pos.z), ring, { s0: 0.2, s1: 1.4 });
    ctx.fx.burst(a.headPos(), ['🎵', '🎶'], 2);
    yield* waitTalk(2.4);
    a.pose = rest;
}

// 芋煮会：子みくろんとみくろん姉で芋煮をこしゃって（作って）、テーブルで待っている人たちといっしょに食べる
function* imoniParty(k, v, guests, seats) {
    k.label = 'おねえちゃんと芋煮をつくっている🍲';
    const first = guests[0];
    yield* together(k, v, W().spots.cookHelp, W().spots.cook, 'cook', function* (a) {
        a.say('芋煮会、すっぺ〜！🍲 鍋っこ出してけろ〜');
        k.pose = 'cook';
        let st = 0;
        const cue = cues([
            ...(first ? [[1.5, first.agent, first.def.lines.imoniWait]] : []),
            [2.5, a, 'さどいもはな、でっけぐ切んのがコツだず〜🥔'],
            [5, k, 'こう〜？'],
            [7, a, 'んだんだ、いぎなり上手だごど〜🌸'],
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
    const here = guests.filter(alive);
    k.label = here.length ? 'みんなで芋煮会🍲' : 'おねえちゃんと芋煮会🍲';
    yield* gather(k, W().spots.seatN, [
        { v, spot: W().spots.seatS, pose: 'eat' },
        ...here.map((o) => ({ v: o, spot: W().spots[`seat${seats[guests.indexOf(o)]}`], pose: 'eat' })),
    ], function* (a, more) {
        W().placeFood('imoni');
        W().setTea(['S', ...more.map((g) => seats.find((s) => g.onSpot === W().spots[`seat${s}`])).filter(Boolean)]);
        a.say(more.length ? '山形の芋煮会だず〜！みんな、いただぎます〜！🍲' : 'いただぎます〜！');
        yield* waitMin(14, cues([
            [2.5, k, 'おねえちゃんの芋煮、んめ〜！😋'],
            ...more.map((g, i) => [4 + i * 3, g, pick(g.visitor.def.lines.imoni)]),
            [5.5, a, 'おかわり、よっぱら（たっぷり）あっからな〜🍲'],
            [8.5, k, 'おかわり〜！🙌'],
            [11, a, more.length ? 'みんなで食う芋煮は、いぎなりんめぇべ〜🌸' : 'たんと食え〜。おがれよ〜🌸'],
        ].sort((x, y) => x[0] - y[0])));
        addStat('onaka', 50);
        addStat('tanoshisa', 12 + more.length * 4);
        if (more.length) addStat('nakayoshi', 4);
        tally(more.length ? 'みんなで芋煮会をした🍲' : 'おねえちゃんと芋煮会をした🍲');
    });
    if (S().food) W().placeFood(S().food);
    else W().clearFood();
    W().clearTea();
}

const STAR_COLS = [0xffe27a, 0xcdb9ff, 0xff9de2, 0xffffff];

// クロミちゃんの星くず：アンテナが光って、星がゆっくり降ってきて、ときどき流れ星。
// さいごに星がふきあがる。星の数は実時間で決める（×12でもちらかりすぎないように）
function* stardustShow(k, v, C) {
    const a = v.agent;
    const fx = ctx.fx;
    // スマホの縦画面でも画面に入るくらいの広さに降らせる
    const sky = () => new THREE.Vector3(C.x + rand(-1.8, 1.8), rand(2.6, 3.4), C.z + rand(-1.3, 1.3));
    const fall = () => {
        const col = pick(STAR_COLS);
        fx.spark(sky(), {
            color: col, size: rand(0.22, 0.42), life: 3.2, spin: rand(-2, 2), floor: 0.06,
            vel: new THREE.Vector3(rand(-0.25, 0.25), -rand(1.1, 1.7), rand(-0.15, 0.15)),
            onLand: (p) => { if (chance(0.5)) fx.ring(new THREE.Vector3(p.x, 0.04, p.z), col, { s0: 0.05, s1: 0.5, life: 0.9 }); },
        });
        ctx.sound.twinkle();
    };
    const meteor = () => {
        const dir = pick([-1, 1]);
        fx.spark(new THREE.Vector3(C.x - dir * 4.5, 4.4, C.z - 2.2), {
            color: pick([0xffe27a, 0xcdb9ff]), size: 0.62, life: 1.5, trail: 0.5,
            vel: new THREE.Vector3(dir * 6, -1.6, 2.4),
        });
        ctx.sound.meteor();
    };
    let nextStar = 0, nextAnt = 0, nextEmoji = 0;
    const tip = new THREE.Vector3();
    const shimmer = (dt, rain) => {
        if (!dt) return;
        const now = ctx.tReal;
        if (now >= nextAnt) {
            nextAnt = now + 0.14;
            a.model.antennaPos(tip);
            fx.spark(tip, { color: pick(STAR_COLS), size: rand(0.12, 0.2), life: 0.9, vel: new THREE.Vector3(rand(-0.5, 0.5), rand(0.7, 1.3), rand(-0.5, 0.5)) });
        }
        if (!rain) return;
        if (now >= nextStar) {
            nextStar = now + rand(0.12, 0.28);
            fall();
        }
        if (now >= nextEmoji) {
            nextEmoji = now + 0.9;
            fx.emoji(sky(), pick(['✨', '⭐', '🌟', '💫']), { rise: -70, spread: 30, life: 1.8 });
        }
    };

    a.model.glow = 1;
    try {
        yield* waitMin(2, (dt) => shimmer(dt, false));
        k.pose = 'look';
        const cue = cues([
            [2.5, k, 'わぁ…！お星さまがふってくるっちゃ〜！'],
            [5, a, '願いごと、してもいいさー。うーとーとー、ってね🖤'],
            [7.5, k, 'うーとーとー…まのとみんなが、ずーっと笑顔でいられますように…✨'],
        ]);
        const meteors = [1.2, 4.6, 8.2];
        yield* waitMin(10, (dt, t) => {
            cue(dt, t);
            shimmer(dt, true);
            if (meteors.length && t >= meteors[0]) {
                meteors.shift();
                meteor();
            }
        });
    } finally {
        a.model.glow = 0;
    }
    const center = new THREE.Vector3(C.x, 0.05, C.z);
    [v.def.ring, 0xffe27a, 0xff9de2].forEach((c, i) => fx.ring(center, c, { s0: 0.3, s1: 2.4 + i * 0.5, life: 2.4, delay: i * 0.25 }));
    for (let i = 0; i < 26; i++) {
        const ang = (i / 26) * Math.PI * 2;
        const sp = rand(0.8, 1.6);
        fx.spark(new THREE.Vector3(C.x, 0.3, C.z), {
            color: STAR_COLS[i % STAR_COLS.length], size: rand(0.2, 0.36), life: 2, grav: 3.4, floor: 0.05, delay: rand(0, 0.25),
            vel: new THREE.Vector3(Math.cos(ang) * sp, rand(2.6, 3.6), Math.sin(ang) * sp),
        });
    }
    ctx.sound.starfall();
    k.pose = 'happy';
    k.say('きれい〜！宝石みたいだっちゃ✨');
    addStat('kirakira', 15);
    addStat('tanoshisa', 15);
    tally('クロミちゃんが星くずを降らせてくれた🌌');
    yield* waitMin(3);
    if (alive(v)) a.say('その願い、きっと届いたさー🖤');
    yield* waitMin(3);
}

// 同じ人の「とくべつ」は5時間あける（芋煮会が1日に何度も続かないように）
const SPECIAL_GAP = 300;

function canSpecial(v) {
    if (absMin() - v.specialAt < SPECIAL_GAP) return false;
    if (v.def.special === 'catnap') return hour() < 19;
    if (v.def.special === 'imoni') return S().stats.onaka < 75;
    return true;
}

export function socialCandidates() {
    const vs = avail();
    if (!vs.length) return [];
    const h = hour();
    const day = h >= 7 && h < 18.5;
    const out = [['chat', 150], ['tea', 130], ['onsen2', 110], ['music', 125]];
    if (vs.some(canSpecial)) out.push(['special', 175]);
    if (day) out.push(['ballplay', 150]);
    if (vs.length >= 2) {
        out.push(['party', 150], ['onsen3', 125], ['band', 125]);
        if (benchFree([ctx.km, ...vs.map((v) => v.agent)])) out.push(['bench3', 150]);
        if (day) out.push(['ball3', 140]);
    }
    return out;
}

export function pickPartner(id) {
    let vs = avail();
    if (id === 'special') vs = vs.filter(canSpecial);
    return vs.length ? pick(vs) : null;
}

// 'special' は相手ごとに中身が変わる
SOCIAL.special = function (k, v) {
    v.specialAt = absMin();
    return SOCIAL[v.def.special](k, v);
};

// まのが描く絵の題材。そばにいる人はモデルになってもらって、いない人は思い出して描く
function chooseArt(v) {
    const s = S();
    const recent = s.art.slice(-3);
    const pool = [];
    const add = (id, w) => { if (w > 0 && !recent.includes(id)) pool.push([id, w]); };
    for (const o of rt) {
        if (o !== v) add(o.def.id, alive(o) && o.greeted && !o.busy ? 6 : 1);
    }
    add('family', s.resonance ? 3 : 0);
    add('km', 2);
    add('mano', 2);
    add('cherry', s.cherries ? 1.2 : 0);
    add('flower', s.flowers.some((f) => f.g >= 3) ? 1.2 : 0);
    add('onsen', 1);
    add('star', hour() >= 17 ? 2 : 0.6);
    let r = Math.random() * pool.reduce((t, p) => t + p[1], 0);
    return (pool.find((p) => (r -= p[1]) <= 0) ?? pool[0] ?? ['km'])[0];
}

// ── 来てくれた人どうしの、ふたり遊び（子みくろんがそばにいたら、ちょっとまざる）──
// 同じふたりは2時間半、だれかのふたり遊びのあとは40分あける（子みくろんがみんなをさそえるように）
const PAIR_GAP = 150;
const ANY_PAIR_GAP = 40;
const pairAt = {};
let lastPairAt = -1e9;
const MELODY = [523.3, 659.3, 698.5, 784, 987.8, 784, 698.5, 659.3];
// まのとみくろん姉の「つぎの宝物」の相談：[まの, みくろん姉, まの]
const PLAN_IDEAS = [
    ['子みくろんのおうちに、もうひとつお部屋がほしいな🏡', 'いいごど〜！したら、ちょっと待っとってけろ〜🌿', 'あはは、出た〜口ぐせ😂'],
    ['お庭に、ブランコつけたいな〜🌸', 'あいや、いぎなりめんごい案だず〜📝', 'みんなで順番こに乗ろうね💖'],
    ['雪の日も見てみたいな❄️', '山形の雪は、よっぱら降っからな〜⛄', '雪だるま、子みくろんといっしょにつくりたい！'],
    ['子みくろんのお誕生日会、したいね🎂', 'んだな〜！芋煮もケーキも、こしゃっぺな〜🍲🎂', '芋煮とケーキ…すごい組みあわせ😂'],
    ['子みくろんたちに、新しい曲も聴かせたいな🎵', 'いいごど〜。528Hzの曲だべ？🎵', 'うん！みんなの周波数も入れるね💖'],
];

const both = (a, b) => alive(a.visitor) && alive(b.visitor);
const mid = (a, b, y = 1.1) => new THREE.Vector3((a.pos.x + b.pos.x) / 2, a.pos.y + y, (a.pos.z + b.pos.z) / 2);

// ふたりが向かいあう場所
function facing(ax, az, bx, bz, pose = 'stand') {
    const a = { x: ax, z: az }, b = { x: bx, z: bz };
    return [spotAt(ax, az, faceYaw(a, b), pose), spotAt(bx, bz, faceYaw(b, a), pose)];
}

// ベンチのとなりあった2席（あいていれば）
function benchSeats(A, B) {
    const b = W().spots.bench;
    const pairs = [[0, 1], [1, 2]].filter((idx) => benchFree([A.agent, B.agent], idx));
    if (!pairs.length) return null;
    const [i, j] = pick(pairs);
    return [b[i], b[j]];
}

function meteorOver(c) {
    const dir = pick([-1, 1]);
    ctx.fx.spark(new THREE.Vector3(c.x - dir * 4.5, 4.4, c.z - 2.2), {
        color: pick([0xffe27a, 0xcdb9ff]), size: 0.62, life: 1.5, trail: 0.5,
        vel: new THREE.Vector3(dir * 6, -1.6, 2.4),
    });
    ctx.sound.meteor();
}

// キーは DEFS の順（'mano+kuromi' など）。body(A, B, cast) の A・B もその順
const PAIR_PLAY = {
    'mano+kuromi': [
        {
            memo: 'まのとクロミちゃんが、528Hzと963Hzでハモってた🎵',
            spots: () => facing(-0.5, 6.1, 1.0, 6.1),
            poses: ['stand', 'stand'],
            *body(mano, kuromi, cast) {
                yield* converse([['kuromi', 'まの、いっしょにハモろうさー🖤'], ['mano', 'うん！528Hzと963Hzだね🎵']], cast);
                for (let i = 0; i < 2 && both(mano, kuromi); i++) {
                    yield* sing(mano, '528Hz〜💖', 528, 0x8fdfbb);
                    yield* sing(kuromi, '963Hz〜✨', 963, 0x8a74c8);
                }
                if (!both(mano, kuromi)) return;
                // さいごは、ふたりいっしょに
                for (const [a, f, col] of [[mano, 528, 0x8fdfbb], [kuromi, 963, 0x8a74c8]]) {
                    a.pose = 'happy';
                    ctx.sound.freq(f);
                    ctx.fx.ring(new THREE.Vector3(a.pos.x, 0.05, a.pos.z), col, { s0: 0.2, s1: 1.7, life: 2.2 });
                }
                ctx.fx.burst(mid(mano, kuromi), ['💖', '🖤', '🎵', '✨'], 6);
                yield* waitTalk(3);
                mano.pose = kuromi.pose = 'stand';
                yield* converse([
                    ['mano', 'ふたりの音、だいすきな響き〜💖'],
                    ['kuromi', 'わったーのペアリングやっさー🖤✨', { fx: '💖' }],
                    ['k', 'まのとクロミちゃんの音、ぴったりだっちゃ〜！💖'],
                ], cast);
            },
        },
        {
            when: () => hour() >= 19,
            memo: 'まのとクロミちゃんが、ならんで流れ星を見てた🌠',
            spots: () => [spotAt(-0.2, 6.0, 0.35, 'sit'), spotAt(1.0, 6.0, -0.35, 'sit')],
            poses: ['sit', 'sit'],
            *body(mano, kuromi, cast) {
                yield* converse([['kuromi', 'まの、ならんでぶし（星）を見ようさー🌌'], ['mano', 'わぁ…今日もきれいだね✨']], cast);
                kuromi.model.glow = 0.6;
                try {
                    yield* waitMin(3);
                    if (!both(mano, kuromi)) return;
                    meteorOver(mid(mano, kuromi));
                    yield* converse([
                        ['kuromi', 'あ、流れ星さー！🌠'],
                        ['mano', 'みんなが、ずーっと笑顔でいられますように…💖'],
                        ['kuromi', 'まのの願いは、わんがぜったい届けるさー🖤', { fx: '🖤' }],
                        ['k', '子みくろんも、お願いしたっちゃ〜🌠'],
                    ], cast);
                    yield* waitMin(2);
                } finally {
                    kuromi.model.glow = 0;
                }
            },
        },
    ],
    // いとこ同士で、かちゃーしー × 花笠音頭
    'kuromi+nee': [{
        memo: 'クロミちゃんとおねえちゃんが、かちゃーしーと花笠音頭で踊ってた💃',
        spots: () => facing(5.5, 5.6, 6.9, 5.6),
        poses: ['stand', 'stand'],
        *body(kuromi, nee, cast) {
            yield* converse([['kuromi', 'ねーねー、かちゃーしー踊ろうさー🖤🎶'], ['nee', 'したら私は、花笠音頭だず〜🌸']], cast);
            if (!both(kuromi, nee)) return;
            kuromi.pose = nee.pose = 'dance';
            const cue = cues([
                [1.5, kuromi, 'いーやーさーさー！🎶'],
                [3.5, nee, 'やっしょ、まかしょ〜！🌸'],
                [5.5, kuromi, 'ねーねー、じょーとー！🖤'],
                [7.5, nee, 'あいや〜、手のひらひら、むずがしいごど〜😂'],
            ]);
            let next = 0, i = 0;
            yield* waitMin(9, (dt, t) => {
                cue(dt, t);
                if (ctx.tReal >= next) {
                    next = ctx.tReal + 0.45;
                    ctx.sound.note(MELODY[i++ % MELODY.length]);
                    if (i % 2) ctx.fx.emoji(pick([kuromi, nee]).headPos(), pick(['🎶', '🌸', '🖤', '✨']), { rise: 46 });
                }
                if (!both(kuromi, nee)) return false;
            });
            kuromi.pose = nee.pose = 'stand';
            yield* converse([
                ['nee', 'いい汗かいだごど〜😂'],
                ['kuromi', 'ちゃんぷるーダンス、でーじたのしかったさー🖤'],
                ['k', '子みくろんも、まぜてけろ〜！💃'],
            ], cast);
        },
    }],
    'mano+mikanyan': [{
        memo: 'みかにゃんが、まのにくっついてごろごろしてた🐱',
        spots: (mano, mika) => benchSeats(mano, mika) ?? [spotAt(-3.3, 4.85, 0.3, 'sit'), spotAt(-2.4, 4.85, 0.3, 'sleep')],
        poses: ['sit', 'sleep'],
        *body(mano, mika, cast) {
            yield* converse([['mikanyan', 'まの〜、くっついていいにゃ？'], ['mano', 'どうぞ〜♡ よしよし〜']], cast);
            const cue = cues([[2.5, mano, 'もふもふ〜…しあわせ〜🥰'], [5, mika, 'ごろごろごろ〜♾️'], [7.5, mano, 'みかにゃん、寝ちゃった…？']]);
            let z = 0;
            yield* waitMin(9, (dt, t) => {
                cue(dt, t);
                z += dt;
                if (z > 2.5) {
                    z = 0;
                    ctx.fx.emoji(mika.headPos(), pick(['💤', '💕']), { rise: 36 });
                }
                if (!both(mano, mika)) return false;
            });
            mika.pose = 'sit';
            yield* converse([
                ['mikanyan', 'むにゃ…むげんに気持ちよかったにゃ♾️'],
                ['mano', 'えへへ、またおいでね💖'],
                ['k', 'みかにゃん、いいなぁ〜。子みくろんもくっつきたいっちゃ〜！'],
            ], cast);
        },
    }],
    'mikanyan+nee': [{
        when: () => hour() >= 8 && hour() < 17,
        memo: 'みかにゃんとおねえちゃんが、ならんでひなたぼっこしてた☀️',
        spots: () => [spotAt(-3.4, 4.85, 0.35, 'sleep'), spotAt(-2.0, 4.85, 0.35, 'sit')],
        poses: ['sleep', 'sit'],
        *body(mika, nee, cast) {
            yield* converse([['nee', 'みかにゃん、ひなたぼっこすっか〜？☀️'], ['mikanyan', 'するにゃ〜！']], cast);
            const cue = cues([[2.5, nee, 'ぽかぽかで、ねむぐなるごど〜😪'], [5.5, mika, 'むにゃ…カーディガン、ふわふわにゃ…'], [8.5, nee, 'みかにゃん、あったがいごど〜🌸']]);
            let z = 0;
            yield* waitMin(10, (dt, t) => {
                cue(dt, t);
                z += dt;
                if (z > 2.5) {
                    z = 0;
                    ctx.fx.emoji(pick([mika, nee]).headPos(), pick(['☀️', '💤', '🌸']), { rise: 36 });
                }
                if (!both(mika, nee)) return false;
            });
            mika.pose = 'sit';
            yield* converse([
                ['nee', 'あいや、すっかり寝でしまったず〜😂'],
                ['mikanyan', 'ふにゃ〜、よく寝たにゃ♾️'],
                ['k', 'ふたりとも、ぽかぽかしてるっちゃ〜☀️'],
            ], cast);
        },
    }],
    // まのとみくろん姉は、つぎの宝物の相談
    'mano+nee': [{
        memo: 'まのとおねえちゃんが、つぎの宝物の相談をしてた📝',
        spots: () => facing(-3.35, 4.85, -2.0, 4.95, 'sit'),
        poses: ['sit', 'sit'],
        *body(mano, nee, cast) {
            const [m1, n1, m2] = pick(PLAN_IDEAS);
            mano.model.hold(sketchbook(), new THREE.Vector3(-0.5, 0.08, 0.24));
            try {
                yield* converse([['nee', 'まの、つぎは何こしゃる（つくる）べ〜？'], ['mano', m1], ['nee', n1], ['mano', m2]], cast);
                if (!both(mano, nee)) return;
                mano.pose = 'draw';
                const cue = cues([[2, nee, 'ここさ、こうしたらどうだべ…📝'], [4.5, mano, 'わぁ、いいね〜！メモメモ…'], [7, nee, 'いぎなりいい感じだごど〜✨']]);
                yield* waitMin(8, (dt, t) => {
                    cue(dt, t);
                    if (!both(mano, nee)) return false;
                });
            } finally {
                mano.model.hold(null);
                mano.pose = 'sit';
            }
            yield* converse([
                ['mano', 'みくろんと作るの、いちばんたのしい💖'],
                ['nee', 'んだず〜。まのとこしゃるもの、ぜんぶ宝物だべした✨', { fx: '💖' }],
                ['k', 'なになに〜？子みくろんにも教えてけろ〜！'],
            ], cast);
        },
    }],
    'kuromi+mikanyan': [{
        memo: 'みかにゃんが、クロミちゃんのアンテナの星を追いかけてた✨',
        spots: () => facing(5.6, 5.4, 6.8, 5.9),
        poses: ['stand', 'stand'],
        *body(kuromi, mika, cast) {
            yield* converse([['mikanyan', 'クロミちゃんのアンテナの星、きらきらしてるにゃ…'], ['kuromi', 'ふふっ、つかまえてごらんさー🖤✨']], cast);
            if (!both(kuromi, mika)) return;
            kuromi.model.glow = 1;
            const tip = new THREE.Vector3();
            let next = 0, hop = 0;
            try {
                const cue = cues([[2, mika, 'にゃっ！'], [4, mika, 'にゃにゃっ！'], [6, kuromi, 'こっちさー🖤'], [7.5, mika, 'もうちょっとにゃ…！']]);
                yield* waitMin(9, (dt, t) => {
                    cue(dt, t);
                    if (ctx.tReal >= next) {
                        next = ctx.tReal + 0.18;
                        kuromi.model.antennaPos(tip);
                        ctx.fx.spark(tip, { color: pick(STAR_COLS), size: rand(0.12, 0.22), life: 1.1, vel: new THREE.Vector3(rand(-0.8, 0.8), rand(0.6, 1.4), rand(-0.8, 0.8)) });
                    }
                    hop += dt;
                    if (hop > 1.2) {
                        hop = 0;
                        mika.pose = mika.pose === 'happy' ? 'reach' : 'happy';
                        mika.faceTo(kuromi.pos.x + rand(-0.6, 0.6), kuromi.pos.z + rand(-0.6, 0.6));
                    }
                    if (!both(kuromi, mika)) return false;
                });
            } finally {
                kuromi.model.glow = 0;
                mika.pose = 'stand';
            }
            yield* converse([
                ['mikanyan', 'つかまえ…あれ、消えちゃったにゃ？'],
                ['kuromi', 'ぶしはね、心でつかまえるものさー🖤'],
                ['k', 'みかにゃん、おしかったっちゃ〜！✨'],
            ], cast);
        },
    }],
};

// ふだんの過ごし方の合間に、ほかに来ている人をさそう
function pairChance(v) {
    const k = ctx.km;
    if (absMin() - lastPairAt < ANY_PAIR_GAP || !chance(0.25)) return null;
    if (k.deepSleep || k.actId === 'greet' || k.actId === 'resonance') return null;
    const opts = [];
    for (const w of present()) {
        if (w === v || !w.greeted || w.busy || !w.idle) continue;
        const key = pairKey(v, w);
        if (absMin() - (pairAt[key] ?? -1e9) < PAIR_GAP) continue;
        for (const def of PAIR_PLAY[key] ?? []) if (!def.when || def.when()) opts.push({ w, def });
    }
    return opts.length ? pick(opts) : null;
}

function* pairPlay(v, w, def) {
    const key = pairKey(v, w);
    const [A, B] = key.split('+').map((id) => byId[id]);
    const spots = def.spots(A, B);
    if (!spots) return;
    const me = v === A ? 0 : 1;
    const other = me ? A : B;
    const meet = { done: false };
    pairAt[key] = lastPairAt = absMin();
    v.busy = other.busy = true;
    other.agent.setCo(join(other.agent, spots[1 - me], meet, def.poses[1 - me]));
    let release = null;
    try {
        yield* goSpot(v.agent, spots[me], def.poses[me]);
        yield* waitUntil(() => other.agent.atSpot || !alive(other), 15);
        if (!other.agent.atSpot || !both(A.agent, B.agent)) return;
        release = hold([A.agent, B.agent]);
        const k = ctx.km;
        const near = Math.hypot(k.pos.x - v.agent.pos.x, k.pos.z - v.agent.pos.z) < 7;
        const cast = { [A.def.id]: A.agent, [B.def.id]: B.agent, k: near && free(k, 1) && !k.sleeping ? k : null };
        yield* def.body(A.agent, B.agent, cast);
        if (both(A.agent, B.agent)) {
            A.agent.pose = def.poses[0];
            B.agent.pose = def.poses[1];
            tally(def.memo);
        }
    } finally {
        release?.();
        meet.done = true;
        v.busy = other.busy = false;
        lastPairAt = absMin();
    }
}

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
        yield* waitUntil(() => members.slice(1).every((a) => a.atSpot) || !rt.every(alive), 30);
        // 集まるまえにだれか帰ったら、共鳴はまた今度
        if (!rt.every(alive)) return;
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
    if (!alive(v) || !v.greeted || v.agent.atSpot || v.agent.joining || v.busy) return;
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
