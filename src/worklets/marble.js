// CSS Houdini Paint Worklet — marble

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
})(137);

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

registerPaint('marble', class {
  static get inputProperties() {
    return ['--marble-hue', '--marble-scale', '--marble-contrast', '--marble-time', '--marble-vein-width'];
  }

  paint(ctx, size, props) {
    const hue       = parseFloat(props.get('--marble-hue'))        || 200;
    const scale     = parseFloat(props.get('--marble-scale'))      || 2;
    const contrast  = parseFloat(props.get('--marble-contrast'))   || 1.2;
    const time      = parseFloat(props.get('--marble-time'))       || 0;
    const veinWidth = parseFloat(props.get('--marble-vein-width')) || 5;

    const { width, height } = size;
    const BLOCK = 4;
    const t = time * 0.0003;

    for (let y = 0; y < height; y += BLOCK) {
      for (let x = 0; x < width; x += BLOCK) {
        const nx = (x / width)  * scale;
        const ny = (y / height) * scale;

        // Turbulence distorts the sine wave → marble veins
        const turbulence = fbm(nx + t * 0.1, ny + t * 0.08, 5);
        const marble = Math.sin((nx + turbulence * contrast) * veinWidth * Math.PI);

        // marble is [-1, 1], map to lightness
        const n = (marble + 1) / 2;

        const l = 25 + n * 60;
        const s = 10 + n * 20;
        const h = hue + n * 15;

        ctx.fillStyle = `hsl(${h}, ${s}%, ${l}%)`;
        ctx.fillRect(x, y, BLOCK, BLOCK);
      }
    }
  }
});
