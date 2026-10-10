// 床をマス目に区切って、家具や壁をよけて歩くための A* 経路探索
class MinHeap {
    constructor() { this.ids = []; this.pr = []; }
    get size() { return this.ids.length; }
    push(id, p) {
        const ids = this.ids, pr = this.pr;
        let i = ids.length;
        ids.push(id);
        pr.push(p);
        while (i > 0) {
            const parent = (i - 1) >> 1;
            if (pr[parent] <= pr[i]) break;
            [ids[i], ids[parent]] = [ids[parent], ids[i]];
            [pr[i], pr[parent]] = [pr[parent], pr[i]];
            i = parent;
        }
    }
    pop() {
        const ids = this.ids, pr = this.pr;
        const top = ids[0];
        const lastId = ids.pop(), lastP = pr.pop();
        if (ids.length) {
            ids[0] = lastId;
            pr[0] = lastP;
            let i = 0;
            for (;;) {
                const l = i * 2 + 1, r = l + 1;
                let m = i;
                if (l < ids.length && pr[l] < pr[m]) m = l;
                if (r < ids.length && pr[r] < pr[m]) m = r;
                if (m === i) break;
                [ids[i], ids[m]] = [ids[m], ids[i]];
                [pr[i], pr[m]] = [pr[m], pr[i]];
                i = m;
            }
        }
        return top;
    }
}

const SQRT2 = Math.SQRT2;
const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, SQRT2], [1, -1, SQRT2], [-1, 1, SQRT2], [-1, -1, SQRT2]];

export class NavGrid {
    constructor(minX, minZ, maxX, maxZ, cell) {
        this.minX = minX;
        this.minZ = minZ;
        this.cell = cell;
        this.w = Math.ceil((maxX - minX) / cell);
        this.h = Math.ceil((maxZ - minZ) / cell);
        this.blocked = new Uint8Array(this.w * this.h);
    }

    ix(x) { return Math.floor((x - this.minX) / this.cell); }
    iz(z) { return Math.floor((z - this.minZ) / this.cell); }
    cx(i) { return this.minX + (i + 0.5) * this.cell; }
    cz(j) { return this.minZ + (j + 0.5) * this.cell; }
    inb(i, j) { return i >= 0 && j >= 0 && i < this.w && j < this.h; }
    free(i, j) { return this.inb(i, j) && !this.blocked[j * this.w + i]; }
    freeAt(x, z) { return this.free(this.ix(x), this.iz(z)); }

    mark(x0, z0, x1, z1, pad, val) {
        const ax = Math.min(x0, x1) - pad, bx = Math.max(x0, x1) + pad;
        const az = Math.min(z0, z1) - pad, bz = Math.max(z0, z1) + pad;
        for (let j = this.iz(az); j <= this.iz(bz); j++) {
            for (let i = this.ix(ax); i <= this.ix(bx); i++) {
                if (!this.inb(i, j)) continue;
                const x = this.cx(i), z = this.cz(j);
                if (x < ax || x > bx || z < az || z > bz) continue;
                this.blocked[j * this.w + i] = val;
            }
        }
    }
    block(x0, z0, x1, z1, pad = 0.3) { this.mark(x0, z0, x1, z1, pad, 1); }
    unblock(x0, z0, x1, z1) { this.mark(x0, z0, x1, z1, 0, 0); }

    blockCircle(x, z, r, pad = 0.3) {
        const R = r + pad;
        for (let j = this.iz(z - R); j <= this.iz(z + R); j++) {
            for (let i = this.ix(x - R); i <= this.ix(x + R); i++) {
                if (!this.inb(i, j)) continue;
                const dx = this.cx(i) - x, dz = this.cz(j) - z;
                if (dx * dx + dz * dz <= R * R) this.blocked[j * this.w + i] = 1;
            }
        }
    }

    nearestFree(i, j) {
        if (this.free(i, j)) return [i, j];
        for (let r = 1; r < 40; r++) {
            let best = null, bd = Infinity;
            for (let dj = -r; dj <= r; dj++) {
                for (let di = -r; di <= r; di++) {
                    if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
                    if (!this.free(i + di, j + dj)) continue;
                    const d = di * di + dj * dj;
                    if (d < bd) { bd = d; best = [i + di, j + dj]; }
                }
            }
            if (best) return best;
        }
        return null;
    }

    // 空いている場所のうち (x,z) にいちばん近い点
    snap(x, z) {
        const c = this.nearestFree(this.ix(x), this.iz(z));
        if (!c) return { x, z };
        if (c[0] === this.ix(x) && c[1] === this.iz(z)) return { x, z };
        return { x: this.cx(c[0]), z: this.cz(c[1]) };
    }

    lineFree(ax, az, bx, bz) {
        const n = Math.ceil(Math.hypot(bx - ax, bz - az) / (this.cell * 0.5));
        for (let k = 0; k <= n; k++) {
            const t = n ? k / n : 0;
            if (!this.freeAt(ax + (bx - ax) * t, az + (bz - az) * t)) return false;
        }
        return true;
    }

    findPath(sx, sz, tx, tz) {
        const s = this.nearestFree(this.ix(sx), this.iz(sz));
        const t = this.nearestFree(this.ix(tx), this.iz(tz));
        if (!s || !t) return [{ x: tx, z: tz }];
        const W = this.w;
        const N = W * this.h;
        const sI = s[1] * W + s[0];
        const tI = t[1] * W + t[0];
        const exactTarget = t[0] === this.ix(tx) && t[1] === this.iz(tz);
        const goal = exactTarget ? { x: tx, z: tz } : { x: this.cx(t[0]), z: this.cz(t[1]) };
        if (sI === tI) return [goal];

        const g = new Float32Array(N).fill(Infinity);
        const came = new Int32Array(N).fill(-1);
        const closed = new Uint8Array(N);
        const heap = new MinHeap();
        const hfn = (i, j) => {
            const dx = Math.abs(i - t[0]), dz = Math.abs(j - t[1]);
            return dx + dz + (SQRT2 - 2) * Math.min(dx, dz);
        };
        g[sI] = 0;
        heap.push(sI, hfn(s[0], s[1]));
        let found = false;
        while (heap.size) {
            const cur = heap.pop();
            if (closed[cur]) continue;
            if (cur === tI) { found = true; break; }
            closed[cur] = 1;
            const ci = cur % W, cj = (cur - ci) / W;
            for (const [di, dj, cost] of DIRS) {
                const ni = ci + di, nj = cj + dj;
                if (!this.free(ni, nj)) continue;
                if (di && dj && (!this.free(ci + di, cj) || !this.free(ci, cj + dj))) continue;
                const nI = nj * W + ni;
                if (closed[nI]) continue;
                const ng = g[cur] + cost;
                if (ng < g[nI]) {
                    g[nI] = ng;
                    came[nI] = cur;
                    heap.push(nI, ng + hfn(ni, nj));
                }
            }
        }
        if (!found) return [goal];

        const cells = [];
        for (let c = tI; c !== -1; c = came[c]) cells.push(c);
        cells.reverse();
        const pts = cells.map((c) => ({ x: this.cx(c % W), z: this.cz(Math.floor(c / W)) }));
        pts[pts.length - 1] = goal;
        const startFree = this.freeAt(sx, sz);
        const start = startFree ? { x: sx, z: sz } : pts[0];

        // 見通せる限り遠くの点へまっすぐ進むように間引く
        const out = [];
        let anchor = start;
        let i = 0;
        if (!startFree) out.push(pts[0]);
        while (i < pts.length - 1) {
            let j = i + 1;
            while (j + 1 < pts.length && this.lineFree(anchor.x, anchor.z, pts[j + 1].x, pts[j + 1].z)) j++;
            out.push(pts[j]);
            anchor = pts[j];
            i = j;
        }
        return out;
    }
}
