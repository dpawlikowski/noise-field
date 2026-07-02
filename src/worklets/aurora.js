// CSS Houdini Paint Worklet — aurora (northern-lights style flowing bands)
// No window/document/imports available in this scope

// === Inline simplex noise (copied from _noise.js) ===
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
})(7);

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

registerPaint('aurora', class {
  static get inputProperties() {
    return ['--aurora-hue', '--aurora-bands', '--aurora-intensity', '--aurora-time'];
  }

  paint(ctx, size, props) {
    const hue       = parseFloat(props.get('--aurora-hue'))       || 150;
    const bands     = parseFloat(props.get('--aurora-bands'))     || 3;
    const intensity = parseFloat(props.get('--aurora-intensity')) || 1;
    const time      = parseFloat(props.get('--aurora-time'))      || 0;

    const { width, height } = size;
    const BLOCK = 4;
    const t = time * 0.001;

    // Deep night-sky base
    ctx.fillStyle = 'hsl(230, 45%, 6%)';
    ctx.fillRect(0, 0, width, height);

    // Additive-style layered bands — each a soft vertical wave drifting across the field
    ctx.globalCompositeOperation = 'lighter';

    for (let b = 0; b < bands; b++) {
      const bandHue = (hue + b * 45) % 360;
      const phase = t * (0.4 + b * 0.15) + b * 10;

      for (let x = 0; x < width; x += BLOCK) {
        const nx = (x / width) * 3 + b * 5;
        const wave = fbm(nx + phase, b * 3.7, 3); // [-1, 1]
        const centerY = height * (0.25 + b * (0.5 / bands)) + wave * height * 0.18;
        const bandHeight = height * (0.18 + Math.abs(wave) * 0.1);

        // Band contributes nothing beyond d > 1.4 — clamp the scan to that
        // window instead of walking the full column height per band.
        const yLo = Math.max(0, Math.floor((centerY - bandHeight * 1.4) / BLOCK) * BLOCK);
        const yHi = Math.min(height, Math.ceil((centerY + bandHeight * 1.4) / BLOCK) * BLOCK);

        for (let y = yLo; y < yHi; y += BLOCK) {
          const d = Math.abs(y - centerY) / bandHeight;
          const falloff = Math.max(0, 1 - d * d);
          const alpha = falloff * 0.5 * intensity;
          if (alpha <= 0.01) continue;
          ctx.fillStyle = `hsla(${bandHue}, 85%, ${55 + wave * 10}%, ${alpha})`;
          ctx.fillRect(x, y, BLOCK, BLOCK);
        }
      }
    }

    ctx.globalCompositeOperation = 'source-over';
  }
});
