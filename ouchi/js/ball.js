import * as THREE from 'three';
import { ctx } from './ctx.js';
import { ballTexture } from './textures.js';
import { rand } from './util.js';

const R = 0.18;

export function createBall(W) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(R, 20, 14), new THREE.MeshLambertMaterial({ map: ballTexture() }));
    mesh.castShadow = true;
    mesh.visible = false;
    W.scene.add(mesh);
    const pos = mesh.position;
    const vel = new THREE.Vector3();

    function step(dt) {
        const B = W.ballBounds;
        vel.y -= 9.8 * dt;
        pos.addScaledVector(vel, dt);
        if (pos.y < R) {
            pos.y = R;
            if (vel.y < -1.2) {
                if (vel.y < -2.5) ctx.sound.bounce();
                vel.y = -vel.y * 0.55;
                vel.x *= 0.85;
                vel.z *= 0.85;
            } else {
                vel.y = 0;
            }
        }
        if (pos.y <= R + 0.001) {
            const f = Math.exp(-1.4 * dt);
            vel.x *= f;
            vel.z *= f;
        }
        if (pos.x < B.x0) { pos.x = B.x0; vel.x = Math.abs(vel.x) * 0.7; }
        if (pos.x > B.x1) { pos.x = B.x1; vel.x = -Math.abs(vel.x) * 0.7; }
        if (pos.z < B.z0) { pos.z = B.z0; vel.z = Math.abs(vel.z) * 0.7; }
        if (pos.z > B.z1) { pos.z = B.z1; vel.z = -Math.abs(vel.z) * 0.7; }
        // 花壇やベンチにぶつかったら跳ね返る（低く跳ねているときだけ）
        if (pos.y < 0.7) {
            for (const [x0, z0, x1, z1] of W.ballObstacles) {
                if (pos.x < x0 - R || pos.x > x1 + R || pos.z < z0 - R || pos.z > z1 + R) continue;
                const pen = [pos.x - (x0 - R), x1 + R - pos.x, pos.z - (z0 - R), z1 + R - pos.z];
                const m = pen.indexOf(Math.min(...pen));
                if (m === 0) { pos.x = x0 - R; vel.x = -Math.abs(vel.x) * 0.6; }
                if (m === 1) { pos.x = x1 + R; vel.x = Math.abs(vel.x) * 0.6; }
                if (m === 2) { pos.z = z0 - R; vel.z = -Math.abs(vel.z) * 0.6; }
                if (m === 3) { pos.z = z1 + R; vel.z = Math.abs(vel.z) * 0.6; }
            }
        }
        mesh.rotation.x += (vel.z * dt) / R;
        mesh.rotation.z -= (vel.x * dt) / R;
    }

    const b = {
        active: false,
        pos,
        pass: null,
        speed: () => Math.hypot(vel.x, vel.z),
        throwIn(x, z) {
            mesh.visible = true;
            b.active = true;
            b.pass = null;
            pos.set(x + rand(-0.5, 0.5), 4, z);
            vel.set(rand(-1.2, 1.2), 0, rand(-0.6, 0.6));
        },
        place(x, z) {
            mesh.visible = true;
            b.active = true;
            b.pass = null;
            pos.set(x, R, z);
            vel.set(0, 0, 0);
        },
        kick(from, power = rand(3.2, 5)) {
            const B = W.ballBounds;
            let a = Math.atan2(pos.x - from.x, pos.z - from.z) + rand(-0.6, 0.6);
            // 柵の方向へ強く蹴りすぎないよう、庭の真ん中寄りへ
            const cx = (B.x0 + B.x1) / 2, cz = (B.z0 + B.z1) / 2;
            const toC = Math.atan2(cx - pos.x, cz - pos.z);
            if (Math.hypot(cx - pos.x, cz - pos.z) > 4) a = (a + toC) / 2;
            vel.set(Math.sin(a) * power, 2.4, Math.cos(a) * power);
            b.pass = null;
        },
        passTo(from, to, dur) {
            mesh.visible = true;
            b.active = true;
            b.pass = { from: from.clone(), to: to.clone(), t: 0, dur };
        },
        update(dt) {
            if (!b.active || dt <= 0) return;
            if (b.pass) {
                const p = b.pass;
                p.t += dt;
                const k = Math.min(1, p.t / p.dur);
                pos.lerpVectors(p.from, p.to, k);
                pos.y = R + Math.sin(Math.PI * k) * 1.1;
                mesh.rotation.x += dt * 8;
                if (k >= 1) {
                    b.pass = null;
                    vel.set(0, 0, 0);
                    ctx.sound.bounce();
                }
                return;
            }
            let left = dt;
            while (left > 0) {
                const h = Math.min(left, 0.03);
                step(h);
                left -= h;
            }
        },
    };
    return b;
}
