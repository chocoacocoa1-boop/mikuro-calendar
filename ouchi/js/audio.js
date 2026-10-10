// 効果音はぜんぶ Web Audio で合成（音源ファイルなし）
let ac = null;
let master = null;
let noiseBuf = null;
let enabled = true;
const VOLUME = 0.55;
const lastPlayed = new Map();

function unlock() {
    if (ac) {
        if (ac.state === 'suspended') ac.resume();
        return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = enabled ? VOLUME : 0;
    master.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

const ready = () => ac && ac.state === 'running' && enabled;

// 早送り中に同じ音が連打されないように、実時間で間引く
function throttled(key, sec) {
    const now = performance.now() / 1000;
    if (now - (lastPlayed.get(key) ?? -99) < sec) return true;
    lastPlayed.set(key, now);
    return false;
}

function osc(freq, { start = 0, dur = 0.2, type = 'sine', vol = 0.15, attack = 0.008, slide = 0 } = {}) {
    if (!ready()) return;
    const t0 = ac.currentTime + start;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
}

function bell(freq, { start = 0, dur = 1.6, vol = 0.12 } = {}) {
    osc(freq, { start, dur, vol, attack: 0.005 });
    osc(freq * 2, { start, dur: dur * 0.6, vol: vol * 0.25, attack: 0.005 });
    osc(freq * 3.01, { start, dur: dur * 0.35, vol: vol * 0.1, attack: 0.005 });
}

function noise({ start = 0, dur = 0.2, vol = 0.1, type = 'lowpass', freq = 1000 } = {}) {
    if (!ready()) return;
    const t0 = ac.currentTime + start;
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    const f = ac.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + dur + 0.05);
}

function infinity(start = 0) {
    [1056, 1320, 1584, 1980, 2112, 1980, 1584, 1320].forEach((f, i) =>
        osc(f, { start: start + i * 0.07, dur: 0.35, vol: 0.045 }));
}

export const sound = {
    unlock,
    get enabled() { return enabled; },
    setEnabled(v) {
        enabled = v;
        if (master) master.gain.value = v ? VOLUME : 0;
    },
    pop() { osc(880, { dur: 0.08, vol: 0.09, slide: 1.4 }); },
    pet() {
        if (throttled('pet', 0.15)) return;
        osc(1046.5, { dur: 0.1, vol: 0.09 });
        osc(1568, { start: 0.08, dur: 0.18, vol: 0.08 });
    },
    // シンギングボウル：少しずらした2つの音でうなりを出す
    bowl(freq = 396) {
        if (throttled('bowl', 2.4)) return;
        osc(freq, { dur: 3.2, vol: 0.1, attack: 0.01 });
        osc(freq + 1.6, { dur: 3, vol: 0.06, attack: 0.01 });
        osc(freq * 2.71, { dur: 1.6, vol: 0.022, attack: 0.01 });
    },
    freq(f) {
        if (!f) { infinity(); return; }
        bell(f, { dur: 2.2, vol: 0.09 });
    },
    infinity,
    commit() { [784, 988, 1175, 1568].forEach((f, i) => osc(f, { start: i * 0.08, dur: 0.18, vol: 0.07, type: 'triangle' })); },
    bounce() {
        if (throttled('bounce', 0.12)) return;
        osc(560, { dur: 0.16, vol: 0.09, slide: 0.5 });
    },
    munch() {
        if (throttled('munch', 1.2)) return;
        for (let i = 0; i < 3; i++) noise({ start: i * 0.12, dur: 0.07, vol: 0.06, freq: 900 });
    },
    splash() { noise({ dur: 0.6, vol: 0.07, freq: 1400 }); },
    flip() { noise({ dur: 0.14, vol: 0.07, type: 'highpass', freq: 2500 }); },
    doorbell() {
        bell(659.3, { dur: 1, vol: 0.11 });
        bell(523.3, { start: 0.42, dur: 1.4, vol: 0.11 });
    },
    water() {
        if (throttled('water', 0.9)) return;
        for (let i = 0; i < 4; i++) osc(1800 + Math.random() * 900, { start: i * 0.09, dur: 0.06, vol: 0.025 });
    },
    sparkle() {
        if (throttled('sparkle', 0.3)) return;
        [1568, 2093, 2637].forEach((f, i) => osc(f, { start: i * 0.06, dur: 0.25, vol: 0.045 }));
    },
    yawn() { osc(330, { dur: 0.7, vol: 0.045, slide: 0.6 }); },
    note(f) {
        if (throttled('note' + f, 0.5)) return;
        bell(f, { dur: 1.2, vol: 0.06 });
    },
    chord() {
        [396, 528, 963].forEach((f) => bell(f, { dur: 4.2, vol: 0.065 }));
        infinity(0.4);
    },
};
