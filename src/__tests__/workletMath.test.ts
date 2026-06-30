import { describe, it, expect } from 'vitest';

// ─── Helpers extracted from worklets for unit testing ──────────────

// From mesh-gradient.js
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

// From grain.js
function grainRand(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 43.5) * 43758.5453;
  return n - Math.floor(n);
}

// Inline simplex noise (same seed=42 as noise-field.js)
const perm = new Uint8Array(512);
const gradP: [number, number, number][] = new Array(512);
const grad3: [number, number, number][] = [
  [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
  [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
  [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1],
];
(function seedNoise(seed: number) {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  let n = seed | 0;
  for (let i = 255; i > 0; i--) {
    n = (n * 1664525 + 1013904223) & 0xffffffff;
    const j = ((n >>> 0) % (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) {
    perm[i] = p[i & 255];
    gradP[i] = grad3[perm[i] % 12];
  }
})(42);

function dot2(g: [number, number, number], x: number, y: number) { return g[0]*x + g[1]*y; }

function simplex2(xin: number, yin: number): number {
  const F2 = 0.5 * (Math.sqrt(3) - 1);
  const G2 = (3 - Math.sqrt(3)) / 6;
  const s = (xin + yin) * F2;
  const i = Math.floor(xin + s);
  const j = Math.floor(yin + s);
  const t = (i + j) * G2;
  const x0 = xin - (i - t), y0 = yin - (j - t);
  const i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
  const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
  const x2 = x0 - 1 + 2*G2, y2 = y0 - 1 + 2*G2;
  const ii = i & 255, jj = j & 255;
  let n0 = 0, n1 = 0, n2 = 0;
  let t0 = 0.5 - x0*x0 - y0*y0;
  if (t0 >= 0) { t0 *= t0; n0 = t0*t0 * dot2(gradP[ii + perm[jj]], x0, y0); }
  let t1 = 0.5 - x1*x1 - y1*y1;
  if (t1 >= 0) { t1 *= t1; n1 = t1*t1 * dot2(gradP[ii+i1+perm[jj+j1]], x1, y1); }
  let t2 = 0.5 - x2*x2 - y2*y2;
  if (t2 >= 0) { t2 *= t2; n2 = t2*t2 * dot2(gradP[ii+1+perm[jj+1]], x2, y2); }
  return 70 * (n0 + n1 + n2);
}

function fbm(x: number, y: number, octaves: number): number {
  let v = 0, a = 0.5, f = 1;
  for (let i = 0; i < octaves; i++) {
    v += a * simplex2(x * f, y * f);
    a *= 0.5; f *= 2;
  }
  return v;
}

// ─── Tests ─────────────────────────────────────────────────────────

describe('hexToRgb', () => {
  it('converts standard hex color correctly', () => {
    expect(hexToRgb('#667eea')).toEqual([102, 126, 234]);
    expect(hexToRgb('#f5576c')).toEqual([245, 87, 108]);
  });

  it('converts white and black', () => {
    expect(hexToRgb('#ffffff')).toEqual([255, 255, 255]);
    expect(hexToRgb('#000000')).toEqual([0, 0, 0]);
  });

  it('strips the # prefix', () => {
    expect(hexToRgb('#764ba2')).toEqual(hexToRgb('764ba2'));
  });
});

describe('lerp', () => {
  it('returns start at t=0 and end at t=1', () => {
    expect(lerp(0, 100, 0)).toBe(0);
    expect(lerp(0, 100, 1)).toBe(100);
  });

  it('returns midpoint at t=0.5', () => {
    expect(lerp(0, 200, 0.5)).toBe(100);
  });
});

describe('grainRand', () => {
  it('always returns a value in [0, 1)', () => {
    for (let x = 0; x < 20; x++) {
      for (let y = 0; y < 20; y++) {
        const r = grainRand(x, y, 42);
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThan(1);
      }
    }
  });

  it('is deterministic for the same inputs', () => {
    expect(grainRand(10, 20, 7)).toBe(grainRand(10, 20, 7));
  });

  it('produces different values for different seed', () => {
    expect(grainRand(5, 5, 0)).not.toBe(grainRand(5, 5, 1));
  });
});

describe('simplex2', () => {
  it('returns values in approximately [-1, 1]', () => {
    for (let i = 0; i < 50; i++) {
      const v = simplex2(i * 0.1, i * 0.17);
      // simplex2 returns 70*(n0+n1+n2), max theoretical ~1
      expect(v).toBeGreaterThanOrEqual(-1.1);
      expect(v).toBeLessThanOrEqual(1.1);
    }
  });

  it('is deterministic', () => {
    expect(simplex2(0.3, 0.7)).toBe(simplex2(0.3, 0.7));
  });

  it('returns 0 at origin', () => {
    expect(simplex2(0, 0)).toBe(0);
  });
});

describe('fbm', () => {
  it('output is bounded (octaves=4)', () => {
    const results: number[] = [];
    for (let i = 0; i < 30; i++) {
      results.push(fbm(i * 0.13, i * 0.07, 4));
    }
    const max = Math.max(...results);
    const min = Math.min(...results);
    expect(max).toBeLessThanOrEqual(1.5);
    expect(min).toBeGreaterThanOrEqual(-1.5);
  });

  it('is deterministic', () => {
    expect(fbm(1.5, 2.3, 4)).toBe(fbm(1.5, 2.3, 4));
  });

  it('with 1 octave equals 0.5 * simplex2', () => {
    const x = 0.4, y = 0.9;
    expect(fbm(x, y, 1)).toBeCloseTo(0.5 * simplex2(x, y));
  });
});
