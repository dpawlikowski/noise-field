// CSS Houdini Paint Worklet — glitch (datamosh / RGB-split digital glitch)
// No window/document/imports available in this scope

registerPaint('glitch', class {
  static get inputProperties() {
    return ['--glitch-hue', '--glitch-intensity', '--glitch-time', '--glitch-block'];
  }

  paint(ctx, size, props) {
    const hue       = parseFloat(props.get('--glitch-hue'))       || 200;
    const intensity = parseFloat(props.get('--glitch-intensity')) || 0.5;
    const time      = parseFloat(props.get('--glitch-time'))      || 0;
    const block     = Math.max(1, Math.round(parseFloat(props.get('--glitch-block')) || 4));

    const { width, height } = size;
    const seed = Math.floor(time);

    function rand(x, y) {
      let n = Math.sin(x * 12.9898 + y * 78.233 + seed * 0.017) * 43758.5453;
      return n - Math.floor(n);
    }

    // Dark base
    ctx.fillStyle = `hsl(${hue}, 20%, 6%)`;
    ctx.fillRect(0, 0, width, height);

    // Horizontal slices, each with its own random offset + hue drift.
    // Slices "hold" for several frames before re-rolling, giving that stuck-tearing look.
    const sliceH = Math.max(2, Math.round(height / 40));
    for (let y = 0; y < height; y += sliceH) {
      const holdSeed = Math.floor(time / 6) + Math.floor(y / sliceH) * 7.13;
      const jitter = rand(0, holdSeed);
      const active = jitter < intensity * 0.35;
      const offset = active ? Math.round((rand(1, holdSeed) - 0.5) * width * 0.25 * intensity) : 0;
      const sliceHue = (hue + (active ? (rand(2, holdSeed) - 0.5) * 120 : 0) + 360) % 360;

      for (let x = 0; x < width; x += block) {
        const n = rand(x * 0.05, y * 0.05 + seed * 0.3);
        const l = 12 + n * 28;
        ctx.fillStyle = `hsl(${sliceHue}, 70%, ${l}%)`;
        ctx.fillRect(x + offset, y, block, sliceH);
      }

      // Chromatic-aberration fringe on active (torn) slices
      if (active) {
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = `hsl(${(hue + 0) % 360}, 90%, 55%)`;
        ctx.fillRect(offset - 4, y, width, sliceH);
        ctx.fillStyle = `hsl(${(hue + 180) % 360}, 90%, 55%)`;
        ctx.fillRect(offset + 4, y, width, sliceH);
        ctx.globalAlpha = 1;
      }
    }

    // Scanlines
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#000';
    for (let y = 0; y < height; y += 2) {
      ctx.fillRect(0, y, width, 1);
    }
    ctx.globalAlpha = 1;
  }
});
