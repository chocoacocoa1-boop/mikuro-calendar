export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
export const rand = (a, b) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const chance = (p) => Math.random() < p;

export function smoothstep(a, b, x) {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
}

export function wrapAngle(a) {
    a = (a + Math.PI) % (Math.PI * 2);
    if (a < 0) a += Math.PI * 2;
    return a - Math.PI;
}

export function dampAngle(a, b, k, dt) {
    return a + wrapAngle(b - a) * (1 - Math.exp(-k * dt));
}

export const pad2 = (n) => String(n).padStart(2, '0');

export function clockText(min) {
    const m = Math.floor(min) % 1440;
    return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
}

export function partOfDay(min) {
    const h = min / 60;
    if (h < 4) return '深夜';
    if (h < 6) return '明け方';
    if (h < 10) return '朝';
    if (h < 16) return '昼';
    if (h < 19) return '夕方';
    return '夜';
}

export const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));

export function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
