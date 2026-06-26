// CSS Houdini Paint Worklet — noise-field
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
})(42);

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

registerPaint('noise-field', class {
  static get inputProperties() {
    return ['--nf-hue', '--nf-scale', '--nf-speed', '--nf-time', '--nf-saturation', '--nf-lightness'];
  }

  paint(ctx, size, props) {
    const hue        = parseFloat(props.get('--nf-hue'))        || 220;
    const scale      = parseFloat(props.get('--nf-scale'))      || 3;
    const time       = parseFloat(props.get('--nf-time'))       || 0;
    const saturation = parseFloat(props.get('--nf-saturation')) || 70;
    const lightness  = parseFloat(props.get('--nf-lightness'))  || 50;

    const { width, height } = size;
    const BLOCK = 4;
    const t = time * 0.001;

    for (let y = 0; y < height; y += BLOCK) {
      for (let x = 0; x < width; x += BLOCK) {
        const nx = (x / width)  * scale;
        const ny = (y / height) * scale;

        const n = fbm(nx + t * 0.3, ny + t * 0.2, 4);

        // n is in ~[-1, 1], map to hue shift and lightness variation
        const h = (hue + n * 40 + 360) % 360;
        const l = lightness + n * 15;

        ctx.fillStyle = `hsl(${h}, ${saturation}%, ${l}%)`;
        ctx.fillRect(x, y, BLOCK, BLOCK);
      }
    }
  }
});
