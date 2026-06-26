// CSS Houdini Paint Worklet — grain (film grain / static noise)

registerPaint('grain', class {
  static get inputProperties() {
    return ['--grain-opacity', '--grain-size', '--grain-time', '--grain-base-hue', '--grain-base-lightness'];
  }

  paint(ctx, size, props) {
    const opacity      = parseFloat(props.get('--grain-opacity'))         || 0.5;
    const grainSz      = parseFloat(props.get('--grain-size'))            || 1;
    const time         = parseFloat(props.get('--grain-time'))            || 0;
    const baseHue      = parseFloat(props.get('--grain-base-hue'))        || 0;
    const baseLightness= parseFloat(props.get('--grain-base-lightness'))  || 8;

    const { width, height } = size;
    const seed = Math.floor(time * 0.5) % 9999;

    // Fill a dark base first so grain is visible without other backgrounds
    ctx.fillStyle = `hsl(${baseHue}, 10%, ${baseLightness}%)`;
    ctx.fillRect(0, 0, width, height);

    function rand(x, y) {
      let n = Math.sin(x * 127.1 + y * 311.7 + seed * 43.5) * 43758.5453;
      return n - Math.floor(n);
    }

    const BLOCK = Math.max(1, Math.round(grainSz));

    for (let y = 0; y < height; y += BLOCK) {
      for (let x = 0; x < width; x += BLOCK) {
        const r = rand(x, y);
        const brightness = Math.round(r * 255);
        ctx.fillStyle = `rgba(${brightness},${brightness},${brightness},${opacity})`;
        ctx.fillRect(x, y, BLOCK, BLOCK);
      }
    }
  }
});
