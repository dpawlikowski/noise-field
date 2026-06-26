// CSS Houdini Paint Worklet — mesh-gradient (Stripe-style animated mesh)

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0,2), 16),
    parseInt(h.substring(2,4), 16),
    parseInt(h.substring(4,6), 16),
  ];
}

function lerp(a, b, t) { return a + (b - a) * t; }

function lerpColor(c1, c2, t) {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

// Smoothstep for organic feel
function smooth(t) { return t * t * (3 - 2 * t); }

registerPaint('mesh-gradient', class {
  static get inputProperties() {
    return [
      '--mesh-color-1', '--mesh-color-2', '--mesh-color-3', '--mesh-color-4',
      '--mesh-speed', '--mesh-time',
    ];
  }

  paint(ctx, size, props) {
    const c1Raw = (props.get('--mesh-color-1') + '').trim() || '#667eea';
    const c2Raw = (props.get('--mesh-color-2') + '').trim() || '#764ba2';
    const c3Raw = (props.get('--mesh-color-3') + '').trim() || '#f093fb';
    const c4Raw = (props.get('--mesh-color-4') + '').trim() || '#f5576c';
    const time  = parseFloat(props.get('--mesh-time'))  || 0;

    const c1 = hexToRgb(c1Raw);
    const c2 = hexToRgb(c2Raw);
    const c3 = hexToRgb(c3Raw);
    const c4 = hexToRgb(c4Raw);

    const { width, height } = size;
    const BLOCK = 6; // slightly larger block for mesh, still smooth-looking
    const t = time * 0.0008;

    // Animate the 4 "control point" positions
    const p1x = 0.3 + Math.sin(t * 1.1) * 0.25;
    const p1y = 0.3 + Math.cos(t * 0.9) * 0.25;
    const p2x = 0.7 + Math.cos(t * 0.7) * 0.25;
    const p2y = 0.3 + Math.sin(t * 1.3) * 0.25;
    const p3x = 0.3 + Math.sin(t * 0.8) * 0.25;
    const p3y = 0.7 + Math.cos(t * 1.2) * 0.25;
    const p4x = 0.7 + Math.cos(t * 1.0) * 0.25;
    const p4y = 0.7 + Math.sin(t * 0.6) * 0.25;

    function dist2(ax, ay, bx, by) {
      return (ax-bx)**2 + (ay-by)**2;
    }

    for (let y = 0; y < height; y += BLOCK) {
      for (let x = 0; x < width; x += BLOCK) {
        const nx = x / width;
        const ny = y / height;

        // Weight each color by inverse squared distance to its control point
        const w1 = 1 / (dist2(nx, ny, p1x, p1y) + 0.001);
        const w2 = 1 / (dist2(nx, ny, p2x, p2y) + 0.001);
        const w3 = 1 / (dist2(nx, ny, p3x, p3y) + 0.001);
        const w4 = 1 / (dist2(nx, ny, p4x, p4y) + 0.001);
        const wTotal = w1 + w2 + w3 + w4;

        const r = Math.round((c1[0]*w1 + c2[0]*w2 + c3[0]*w3 + c4[0]*w4) / wTotal);
        const g = Math.round((c1[1]*w1 + c2[1]*w2 + c3[1]*w3 + c4[1]*w4) / wTotal);
        const b = Math.round((c1[2]*w1 + c2[2]*w2 + c3[2]*w3 + c4[2]*w4) / wTotal);

        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, y, BLOCK, BLOCK);
      }
    }
  }
});
