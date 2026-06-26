// CSS Houdini Paint Worklet — plasma

registerPaint('plasma', class {
  static get inputProperties() {
    return ['--plasma-hue', '--plasma-speed', '--plasma-complexity', '--plasma-time'];
  }

  paint(ctx, size, props) {
    const hue        = parseFloat(props.get('--plasma-hue'))        || 0;
    const complexity = parseFloat(props.get('--plasma-complexity')) || 3;
    const time       = parseFloat(props.get('--plasma-time'))       || 0;

    const { width, height } = size;
    const BLOCK = 4;
    const t = time * 0.001;

    for (let y = 0; y < height; y += BLOCK) {
      for (let x = 0; x < width; x += BLOCK) {
        const nx = x / width  * complexity;
        const ny = y / height * complexity;

        // Classic plasma: sum of sin waves at different angles
        const v =
          Math.sin(nx * 2 + t) +
          Math.sin(ny * 2 + t * 0.7) +
          Math.sin((nx + ny) * 1.5 + t * 1.3) +
          Math.sin(Math.sqrt(nx*nx + ny*ny) * 3 + t * 0.5);

        // v is in [-4, 4], normalize to [0, 1]
        const n = (v + 4) / 8;

        const h = (hue + n * 180) % 360;
        const s = 80 + n * 20;
        const l = 40 + n * 30;

        ctx.fillStyle = `hsl(${h}, ${s}%, ${l}%)`;
        ctx.fillRect(x, y, BLOCK, BLOCK);
      }
    }
  }
});
