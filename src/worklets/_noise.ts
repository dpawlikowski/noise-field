// Simplex noise — Stefan Gustavson port, self-contained for worklet use.
// No imports are allowed inside a Paint Worklet's isolated global scope, so this file is
// never imported by the other worklets — it exists purely as the canonical, type-checked
// reference implementation. Each worklet below (aurora.ts, marble.ts, noise-field.ts, ...)
// inlines its own duplicate copy of this exact code. If you change the algorithm here,
// copy the change into every worklet's inlined copy too — see the "keep in sync" comments
// at the top of each duplicated block.

/** Seed used to shuffle the canonical permutation table (arbitrary, kept stable for reproducibility). */
const DEFAULT_NOISE_SEED = 42;

/** Size of the permutation/gradient lookup tables (2x the 256-entry base table, to avoid wrap-around checks). */
const PERM_TABLE_SIZE = 512;

/** Size of the base (unwrapped) permutation table before duplication. */
const BASE_TABLE_SIZE = 256;

/** Linear congruential generator constants (Numerical Recipes) used to shuffle the permutation table. */
const LCG_MULTIPLIER = 1664525;
const LCG_INCREMENT = 1013904223;
const LCG_MASK = 0xffffffff;

/** Number of 3D gradient directions used for 2D simplex noise (12 edge midpoints of a cube). */
const GRADIENTS_PER_CELL = 12;

/** Simplex skew factor: (sqrt(3) - 1) / 2 — transforms input space into simplex space. */
const SIMPLEX_SKEW_F2 = 0.5 * (Math.sqrt(3) - 1);

/** Simplex unskew factor: (3 - sqrt(3)) / 6 — inverse transform back to input space. */
const SIMPLEX_UNSKEW_G2 = (3 - Math.sqrt(3)) / 6;

/** Empirical normalization constant so simplex2() output lands in roughly [-1, 1]. */
const SIMPLEX_NORMALIZATION = 70;

/** Default number of fBm octaves when the caller doesn't specify one. */
const DEFAULT_FBM_OCTAVES = 4;

/** Amplitude multiplier applied per octave (each octave contributes half as much as the last). */
const OCTAVE_AMPLITUDE_DECAY = 0.5;

/** Frequency multiplier applied per octave (each octave doubles in frequency). */
const OCTAVE_FREQUENCY_GROWTH = 2;

const perm = new Uint8Array(PERM_TABLE_SIZE);
const gradP: number[][] = new Array(PERM_TABLE_SIZE);

const grad3: number[][] = [
  [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
  [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
  [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
];

function seedNoise(seed: number): void {
  const p = new Uint8Array(BASE_TABLE_SIZE);
  for (let i = 0; i < BASE_TABLE_SIZE; i++) p[i] = i;
  let n = seed | 0;
  for (let i = 255; i > 0; i--) {
    n = (n * LCG_MULTIPLIER + LCG_INCREMENT) & LCG_MASK;
    const j = (n >>> 0) % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < PERM_TABLE_SIZE; i++) {
    perm[i] = p[i & 255];
    gradP[i] = grad3[perm[i] % GRADIENTS_PER_CELL];
  }
}

seedNoise(DEFAULT_NOISE_SEED);

function dot2(g: number[], x: number, y: number): number {
  return g[0] * x + g[1] * y;
}

// Returns value in [-1, 1]
function simplex2(xin: number, yin: number): number {
  const F2 = SIMPLEX_SKEW_F2;
  const G2 = SIMPLEX_UNSKEW_G2;

  const s = (xin + yin) * F2;
  const i = Math.floor(xin + s);
  const j = Math.floor(yin + s);
  const t = (i + j) * G2;

  const x0 = xin - (i - t);
  const y0 = yin - (j - t);

  const i1 = x0 > y0 ? 1 : 0;
  const j1 = x0 > y0 ? 0 : 1;

  const x1 = x0 - i1 + G2;
  const y1 = y0 - j1 + G2;
  const x2 = x0 - 1 + 2 * G2;
  const y2 = y0 - 1 + 2 * G2;

  const ii = i & 255;
  const jj = j & 255;

  let n0 = 0, n1 = 0, n2 = 0;

  let t0 = 0.5 - x0 * x0 - y0 * y0;
  if (t0 >= 0) { t0 *= t0; n0 = t0 * t0 * dot2(gradP[ii + perm[jj]], x0, y0); }

  let t1 = 0.5 - x1 * x1 - y1 * y1;
  if (t1 >= 0) { t1 *= t1; n1 = t1 * t1 * dot2(gradP[ii + i1 + perm[jj + j1]], x1, y1); }

  let t2 = 0.5 - x2 * x2 - y2 * y2;
  if (t2 >= 0) { t2 *= t2; n2 = t2 * t2 * dot2(gradP[ii + 1 + perm[jj + 1]], x2, y2); }

  return SIMPLEX_NORMALIZATION * (n0 + n1 + n2);
}

// Fractional Brownian Motion — layered octaves for organic look
function fbm(x: number, y: number, octaves = DEFAULT_FBM_OCTAVES): number {
  let value = 0;
  let amplitude = OCTAVE_AMPLITUDE_DECAY;
  let frequency = 1;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * simplex2(x * frequency, y * frequency);
    amplitude *= OCTAVE_AMPLITUDE_DECAY;
    frequency *= OCTAVE_FREQUENCY_GROWTH;
  }
  return value; // roughly [-1, 1]
}

// Exported for type-checking / reference only — never consumed at runtime.
export { simplex2, fbm, seedNoise };
