import * as THREE from 'three';
import { ctx } from './ctx.js';
import { damp, dampAngle } from './util.js';
import { FLOOR_Y } from './house.js';
import { spot as makeSpot } from './build.js';

export function groundY(x, z) {
    return x > -6.1 && x < 6.1 && z > -4.1 && z < 4.1 ? FLOOR_Y : 0;
}

// 行動はジェネレーターで書く。yield するたびに「経過したゲーム内の分」を受け取る
export class Agent {
    constructor({ id, name, model, color, speed = 1.8, showName = false }) {
        this.id = id;
        this.name = name;
        this.model = model;
        this.root = model.root;
        this.color = color;
        this.speed = speed;
        this.showName = showName;
        this.co = null;
        this.pending = null;
        this.brain = null;
        this.yaw = 0;
        this.targetYaw = 0;
        this.pose = 'stand';
        this.moving = false;
        this.walkPhase = 0;
        this.onSpot = null;
        this.goal = null;
        this.yOverride = null;
        this.petT = 0;
        this.active = true;
        this.label = '';
        this.root.userData.agent = this;
        ctx.scene.add(this.root);
    }

    get pos() { return this.root.position; }

    place(x, z, yaw = 0) {
        this.root.position.set(x, groundY(x, z), z);
        this.yaw = this.targetYaw = yaw;
        this.root.rotation.y = yaw;
        this.onSpot = this.goal = null;
        this.yOverride = null;
        this.moving = false;
        this.pose = 'stand';
    }

    placeOnSpot(s) {
        this.root.position.set(s.pos.x, s.pos.y, s.pos.z);
        this.yaw = this.targetYaw = s.yaw;
        this.root.rotation.y = s.yaw;
        this.onSpot = this.goal = s;
        this.yOverride = Math.abs(s.pos.y - groundY(s.pos.x, s.pos.z)) > 0.02 ? s.pos.y : null;
        this.pose = s.pose ?? 'stand';
    }

    setCo(gen) { this.pending = gen; }

    say(text, sec) { ctx.fx.say(this, text, sec); }

    headPos(out = new THREE.Vector3()) {
        return out.copy(this.root.position).setY(this.root.position.y + this.model.top);
    }

    faceTo(x, z) {
        const p = this.root.position;
        if (Math.hypot(x - p.x, z - p.z) > 0.01) this.targetYaw = Math.atan2(x - p.x, z - p.z);
    }

    faceCamera() {
        const c = ctx.camera.position;
        this.faceTo(c.x, c.z);
    }

    update(dtGame, dtReal) {
        if (this.pending) {
            const old = this.co;
            this.co = this.pending;
            this.pending = null;
            this.moving = false;
            if (old) {
                try { old.return(); } catch (e) { console.warn(e); }
            }
        }
        if (!this.co && this.brain) this.co = this.brain(this);
        if (this.co) {
            try {
                if (this.co.next(dtGame).done) this.co = null;
            } catch (e) {
                console.error(e);
                this.co = null;
                this.moving = false;
            }
        }
        const p = this.root.position;
        if (this.yOverride !== null) p.y = this.yOverride;
        else p.y = damp(p.y, groundY(p.x, p.z), 14, dtReal);
        this.yaw = dampAngle(this.yaw, this.targetYaw, 9, dtReal);
        this.root.rotation.y = this.yaw;
        if (this.petT > 0) this.petT = Math.max(0, this.petT - dtReal * 1.6);
        this.model.animate(this, dtReal, ctx.tReal);
    }
}

export function* waitMin(m, tick) {
    let t = 0;
    while (t < m) {
        const dt = (yield) || 0;
        t += dt;
        if (tick && tick(dt, t) === false) return false;
    }
    return true;
}

export function* waitUntil(cond, maxMin = 30) {
    let t = 0;
    while (!cond() && t < maxMin) t += (yield) || 0;
    return cond();
}

export function* hopTo(a, x, y, z, dur = 0.45) {
    const p = a.root.position;
    const sx = p.x, sy = p.y, sz = p.z;
    if (Math.hypot(x - sx, z - sz) > 0.05) a.targetYaw = Math.atan2(x - sx, z - sz);
    let t = 0;
    while (t < dur) {
        t += (yield) || 0;
        const k = Math.min(1, t / dur);
        p.x = sx + (x - sx) * k;
        p.z = sz + (z - sz) * k;
        a.yOverride = sy + (y - sy) * k + Math.sin(Math.PI * k) * 0.32;
    }
    a.yOverride = Math.abs(y - groundY(x, z)) > 0.02 ? y : null;
}

export function* leaveSpot(a) {
    const s = a.onSpot;
    if (!s) return;
    a.pose = 'stand';
    const gy = groundY(s.approach.x, s.approach.z);
    const p = a.root.position;
    if (Math.hypot(p.x - s.approach.x, p.z - s.approach.z) > 0.05 || Math.abs(p.y - gy) > 0.03) {
        yield* hopTo(a, s.approach.x, gy, s.approach.z, 0.4);
    }
    a.onSpot = null;
    a.goal = null;
    a.yOverride = null;
}

export function* walkTo(a, tx, tz, o = {}) {
    yield* leaveSpot(a);
    a.yOverride = null;
    const p = a.root.position;
    const path = ctx.nav.findPath(p.x, p.z, tx, tz);
    const mult = o.speed ?? 1;
    a.moving = true;
    try {
        let carry = 0;
        for (const w of path) {
            for (;;) {
                const dx = w.x - p.x, dz = w.z - p.z;
                const d = Math.hypot(dx, dz);
                if (d < 0.005) break;
                a.targetYaw = Math.atan2(dx, dz);
                let step = carry;
                carry = 0;
                if (step <= 0) step = a.speed * mult * ((yield) || 0);
                if (step >= d) {
                    p.x = w.x;
                    p.z = w.z;
                    a.walkPhase += d * 9;
                    carry = step - d;
                    break;
                }
                p.x += (dx / d) * step;
                p.z += (dz / d) * step;
                a.walkPhase += step * 9;
                if (o.until && o.until()) return false;
            }
        }
    } finally {
        a.moving = false;
    }
    return true;
}

export function* goSpot(a, s, pose) {
    if (a.onSpot === s) {
        a.targetYaw = s.yaw;
        a.pose = pose ?? s.pose ?? 'stand';
        return;
    }
    yield* leaveSpot(a);
    a.goal = s;
    yield* walkTo(a, s.approach.x, s.approach.z);
    a.onSpot = s;
    const p = a.root.position;
    const gy = groundY(s.pos.x, s.pos.z);
    if (Math.hypot(s.pos.x - p.x, s.pos.z - p.z) > 0.05 || Math.abs(s.pos.y - gy) > 0.02) {
        yield* hopTo(a, s.pos.x, s.pos.y, s.pos.z, 0.45);
    }
    a.targetYaw = s.yaw;
    a.pose = pose ?? s.pose ?? 'stand';
}

// 地面の上の、ただの立ち位置
export function spotAt(x, z, yaw = 0, pose = 'stand') {
    return makeSpot(x, z, x, groundY(x, z), z, yaw, pose);
}

export function faceYaw(from, to) {
    return Math.atan2(to.x - from.x, to.z - from.z);
}

// 他の誰かが使っていない席を選ぶ
export function freeSpot(list, self) {
    const free = list.filter((s) => !ctx.agents.some((a) => a !== self && a.active && (a.onSpot === s || a.goal === s)));
    return free.length ? free[Math.floor(Math.random() * free.length)] : null;
}

// 相手を席へ呼んで、合図があるまで待っていてもらう
export function* join(a, s, meet, pose) {
    a.atSpot = false;
    try {
        yield* goSpot(a, s, pose);
        a.atSpot = true;
        while (!meet.done) yield;
    } finally {
        a.atSpot = false;
    }
}
