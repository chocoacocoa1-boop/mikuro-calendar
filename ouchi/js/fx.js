import * as THREE from 'three';

const v = new THREE.Vector3();
const anchor = new THREE.Vector3();

export function createFx(W) {
    const layer = document.getElementById('fx');
    const toastEl = document.getElementById('toast');
    const bannerEl = document.getElementById('banner');
    const bubbles = new Map();
    const parts = [];
    const rings = [];
    const ringGeo = new THREE.RingGeometry(0.86, 1.0, 48);
    ringGeo.rotateX(-Math.PI / 2);
    let toastTimer = 0;
    let bannerTimer = 0;

    function project(p) {
        v.copy(p).project(W.camera);
        return {
            x: ((v.x + 1) / 2) * window.innerWidth,
            y: ((1 - v.y) / 2) * window.innerHeight,
            ok: v.z > -1 && v.z < 1,
        };
    }

    const fx = {
        say(agent, text, sec = 3.6) {
            let b = bubbles.get(agent);
            if (!b) {
                const el = document.createElement('div');
                el.className = 'bubble';
                el.style.borderColor = agent.color;
                el.style.setProperty('--bc', agent.color);
                el.style.display = 'none';
                layer.appendChild(el);
                b = { el, life: 0, age: 0 };
                bubbles.set(agent, b);
            }
            b.el.textContent = '';
            if (agent.showName) {
                const who = document.createElement('span');
                who.className = 'who';
                who.textContent = agent.name;
                who.style.color = agent.color;
                b.el.appendChild(who);
            }
            b.el.appendChild(document.createTextNode(text));
            b.life = sec;
            b.age = 0;
        },

        hush(agent) {
            const b = bubbles.get(agent);
            if (b) b.life = 0;
        },

        emoji(pos, ch, o = {}) {
            const el = document.createElement('span');
            el.className = 'fxp';
            el.textContent = ch;
            if (o.size) el.style.fontSize = `${o.size}px`;
            el.style.opacity = '0';
            layer.appendChild(el);
            parts.push({
                el,
                pos: pos.clone(),
                age: -(o.delay ?? 0),
                life: o.life ?? 1.6,
                dx: (o.spread ?? 26) * (Math.random() - 0.5),
                rise: o.rise ?? 56,
            });
        },

        burst(pos, chars, n = 5, o = {}) {
            for (let i = 0; i < n; i++) {
                fx.emoji(pos, chars[i % chars.length], { spread: 80, ...o, delay: i * 0.07 });
            }
        },

        ring(pos, color, o = {}) {
            const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide });
            const r = new THREE.Mesh(ringGeo, m);
            r.position.copy(pos);
            r.renderOrder = 2;
            r.scale.setScalar(o.s0 ?? 0.2);
            W.scene.add(r);
            rings.push({ r, age: -(o.delay ?? 0), life: o.life ?? 1.6, s0: o.s0 ?? 0.2, s1: o.s1 ?? 1.6 });
        },

        toast(text, sec = 2.8) {
            toastEl.textContent = text;
            toastEl.classList.add('show');
            clearTimeout(toastTimer);
            toastTimer = setTimeout(() => toastEl.classList.remove('show'), sec * 1000);
        },

        banner(title, text, sec = 7) {
            bannerEl.textContent = '';
            const sm = document.createElement('small');
            sm.textContent = title;
            bannerEl.append(sm, document.createTextNode(text));
            bannerEl.classList.add('show');
            clearTimeout(bannerTimer);
            bannerTimer = setTimeout(() => bannerEl.classList.remove('show'), sec * 1000);
        },

        update(dt) {
            // 吹き出し：キャラの頭の上に。重なったら上にずらす
            const placed = [];
            const active = [];
            for (const [agent, b] of bubbles) {
                b.life -= dt;
                b.age += dt;
                if (b.life <= 0 || !agent.active) {
                    if (b.el.style.display !== 'none') b.el.style.display = 'none';
                    continue;
                }
                anchor.copy(agent.root.position);
                anchor.y += agent.model.top + 0.1 + agent.model.rig.position.y;
                const p = project(anchor);
                if (!p.ok) {
                    b.el.style.display = 'none';
                    continue;
                }
                if (b.el.style.display === 'none') b.el.style.display = 'block';
                active.push({ b, x: p.x, y: p.y, w: b.el.offsetWidth, h: b.el.offsetHeight });
            }
            active.sort((a, b) => b.y - a.y);
            for (const a of active) {
                let top = a.y - a.h - 10;
                for (const o of placed) {
                    const overlapX = Math.abs(a.x - o.x) < (a.w + o.w) / 2 + 4;
                    if (overlapX && top + a.h > o.top - 4 && top < o.top + o.h) top = o.top - a.h - 6;
                }
                placed.push({ x: a.x, top, w: a.w, h: a.h });
                const pop = Math.min(1, a.b.age / 0.14);
                const fade = Math.min(1, a.b.life / 0.3);
                a.b.el.style.opacity = String(fade);
                a.b.el.style.transform = `translate(${a.x - a.w / 2}px, ${top}px) scale(${0.85 + 0.15 * pop})`;
            }

            for (let i = parts.length - 1; i >= 0; i--) {
                const p = parts[i];
                p.age += dt;
                if (p.age < 0) continue;
                const k = p.age / p.life;
                if (k >= 1) {
                    p.el.remove();
                    parts.splice(i, 1);
                    continue;
                }
                const s = project(p.pos);
                const e = 1 - (1 - k) * (1 - k);
                const op = k < 0.15 ? k / 0.15 : 1 - Math.max(0, (k - 0.6) / 0.4);
                p.el.style.opacity = s.ok ? String(op) : '0';
                p.el.style.transform = `translate(${s.x + p.dx * e - 10}px, ${s.y - p.rise * e - 10}px) scale(${0.6 + 0.5 * e})`;
            }

            for (let i = rings.length - 1; i >= 0; i--) {
                const r = rings[i];
                r.age += dt;
                if (r.age < 0) {
                    r.r.visible = false;
                    continue;
                }
                r.r.visible = true;
                const k = r.age / r.life;
                if (k >= 1) {
                    W.scene.remove(r.r);
                    r.r.material.dispose();
                    rings.splice(i, 1);
                    continue;
                }
                r.r.scale.setScalar(r.s0 + (r.s1 - r.s0) * (1 - (1 - k) * (1 - k)));
                r.r.material.opacity = 0.85 * (1 - k);
            }
        },
    };
    return fx;
}
