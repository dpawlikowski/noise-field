// CSS Houdini Paint Worklet — aurora (northern-lights style flowing bands)
// Exported as a source string (built/inlined at bundle time) because Paint Worklets run in
// an isolated PaintWorkletGlobalScope that doesn't support `import` — see register.ts for
// how this string is turned into a real module URL via Blob + CSS.paintWorklet.addModule().

const auroraWorkletCode = /* js */ `
// No window/document/imports available in this scope

// Simplex noise implementation duplicated here due to CSS Paint Worklet isolation —
// keep in sync with _noise.ts
const NOISE_SEED = 7; // arbitrary per-worklet seed so bands don't line up with other worklets
const perm = new Uint8Array(512);
const gradP = new Array(512);
const grad3 = [
  [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
  [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
  [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1],
];
(function seedNoise(seed) {
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
})(NOISE_SEED);

function dot2(g, x, y) { return g[0]*x + g[1]*y; }

function simplex2(xin, yin) {
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

function fbm(x, y, octaves) {
  let v = 0, a = 0.5, f = 1;
  for (let i = 0; i < octaves; i++) {
    v += a * simplex2(x * f, y * f);
    a *= 0.5; f *= 2;
  }
  return v;
}
// === End noise ===

// --- Tunable constants -------------------------------------------------

// Block size (px) for coarse rendering — see README "4x4 block rendering".
const BLOCK_SIZE = 4;

// Fallback values used when a CSS custom property is unset/invalid.
const DEFAULT_HUE = 150;
const DEFAULT_BANDS = 3;
const DEFAULT_INTENSITY = 1;

// Converts the raw --aurora-time value (ms-ish) into a slow-moving phase.
const TIME_SCALE = 0.001;

// Night-sky base fill (dark blue-black) behind the additive bands.
const NIGHT_SKY_HUE = 230;
const NIGHT_SKY_SATURATION = 45;
const NIGHT_SKY_LIGHTNESS = 6;

// Hue offset applied to each successive band so bands don't all share one color.
const BAND_HUE_STEP = 45;

// Per-band phase-speed: base drift speed plus a per-band increment so bands desync.
const BAND_PHASE_SPEED_BASE = 0.4;
const BAND_PHASE_SPEED_STEP = 0.15;
// Per-band constant phase offset (on top of speed) so bands don't start in lockstep.
const BAND_PHASE_OFFSET_STEP = 10;

// Horizontal noise-space scale and per-band offset feeding fbm().
const NOISE_X_SCALE = 3;
const BAND_NOISE_X_OFFSET_STEP = 5;
const BAND_NOISE_Y_STEP = 3.7;
const FBM_OCTAVES = 3;

// Vertical placement: first band starts at 25% down, remaining bands spread across
// the next 50% of the canvas height.
const BAND_Y_BASE = 0.25;
const BAND_Y_SPREAD = 0.5;
// How far (as a fraction of height) the wave value pushes the band up/down.
const BAND_WAVE_Y_AMPLITUDE = 0.18;

// Band thickness: base thickness plus extra thickness proportional to wave magnitude.
const BAND_HEIGHT_BASE = 0.18;
const BAND_HEIGHT_WAVE_SCALE = 0.1;

// A band's falloff is ~0 beyond this many "band heights" from center — used to clamp
// the vertical scan window instead of walking the full column per band.
const BAND_FALLOFF_WINDOW = 1.4;

// Alpha scaling and cutoff below which a block isn't worth painting.
const BAND_ALPHA_SCALE = 0.5;
const ALPHA_VISIBILITY_THRESHOLD = 0.01;

// HSL lightness/saturation formula for band fill color.
const BAND_SATURATION = 85;
const BAND_LIGHTNESS_BASE = 55;
const BAND_LIGHTNESS_WAVE_SCALE = 10;

registerPaint('aurora', class {
  static get inputProperties() {
    return ['--aurora-hue', '--aurora-bands', '--aurora-intensity', '--aurora-time'];
  }

  paint(ctx, size, props) {
    const hue       = parseFloat(props.get('--aurora-hue'))       || DEFAULT_HUE;
    const bands     = parseFloat(props.get('--aurora-bands'))     || DEFAULT_BANDS;
    const intensity = parseFloat(props.get('--aurora-intensity')) || DEFAULT_INTENSITY;
    const time      = parseFloat(props.get('--aurora-time'))      || 0;

    const { width, height } = size;
    const t = time * TIME_SCALE;

    // Deep night-sky base
    ctx.fillStyle = \`hsl(\${NIGHT_SKY_HUE}, \${NIGHT_SKY_SATURATION}%, \${NIGHT_SKY_LIGHTNESS}%)\`;
    ctx.fillRect(0, 0, width, height);

    // Additive-style layered bands — each a soft vertical wave drifting across the field
    ctx.globalCompositeOperation = 'lighter';

    for (let b = 0; b < bands; b++) {
      const bandHue = (hue + b * BAND_HUE_STEP) % 360;
      const phase = t * (BAND_PHASE_SPEED_BASE + b * BAND_PHASE_SPEED_STEP) + b * BAND_PHASE_OFFSET_STEP;

      for (let x = 0; x < width; x += BLOCK_SIZE) {
        const nx = (x / width) * NOISE_X_SCALE + b * BAND_NOISE_X_OFFSET_STEP;
        const wave = fbm(nx + phase, b * BAND_NOISE_Y_STEP, FBM_OCTAVES); // [-1, 1]
        const centerY = height * (BAND_Y_BASE + b * (BAND_Y_SPREAD / bands)) + wave * height * BAND_WAVE_Y_AMPLITUDE;
        const bandHeight = height * (BAND_HEIGHT_BASE + Math.abs(wave) * BAND_HEIGHT_WAVE_SCALE);

        // Band contributes nothing beyond BAND_FALLOFF_WINDOW — clamp the scan to that
        // window instead of walking the full column height per band.
        const yLo = Math.max(0, Math.floor((centerY - bandHeight * BAND_FALLOFF_WINDOW) / BLOCK_SIZE) * BLOCK_SIZE);
        const yHi = Math.min(height, Math.ceil((centerY + bandHeight * BAND_FALLOFF_WINDOW) / BLOCK_SIZE) * BLOCK_SIZE);

        for (let y = yLo; y < yHi; y += BLOCK_SIZE) {
          const d = Math.abs(y - centerY) / bandHeight;
          const falloff = Math.max(0, 1 - d * d);
          const alpha = falloff * BAND_ALPHA_SCALE * intensity;
          if (alpha <= ALPHA_VISIBILITY_THRESHOLD) continue;
          ctx.fillStyle = \`hsla(\${bandHue}, \${BAND_SATURATION}%, \${BAND_LIGHTNESS_BASE + wave * BAND_LIGHTNESS_WAVE_SCALE}%, \${alpha})\`;
          ctx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
        }
      }
    }

    ctx.globalCompositeOperation = 'source-over';
  }
});
`;

export default auroraWorkletCode;
