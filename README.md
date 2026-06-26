# noise-field

Generative animated backgrounds via CSS Houdini Paint API. No canvas elements, no JS on the main thread during animation.

```css
.hero {
  background: paint(noise-field);
  --nf-hue: 220;
  --nf-scale: 3;
  animation: nf-flow 12s linear infinite;
}
```

**[→ Live demo](https://noise-field.vercel.app)**

---

## Worklets

| Name | Effect | Key properties |
|---|---|---|
| `noise-field` | Organic fBm noise | `--nf-hue`, `--nf-scale`, `--nf-saturation`, `--nf-lightness` |
| `plasma` | Demoscene sine-wave plasma | `--plasma-hue`, `--plasma-complexity` |
| `marble` | Turbulence-distorted veining | `--marble-hue`, `--marble-scale`, `--marble-vein-width` |
| `grain` | Animated film grain | `--grain-opacity`, `--grain-size`, `--grain-base-hue` |
| `mesh-gradient` | Stripe-style 4-color mesh | `--mesh-color-1..4` |

All worklets animate via `@property` + CSS `animation` — zero JS after registration.

---

## How it works

### Zero main-thread animation

```css
/* Register --nf-time as a real number so the browser interpolates it */
@property --nf-time {
  syntax: '<number>';
  inherits: false;
  initial-value: 0;
}

@keyframes nf-flow {
  to { --nf-time: 1000; }
}
```

The browser interpolates `--nf-time` every frame → the Paint Worklet reads it → repaints. No `requestAnimationFrame`, no JS timers.

### Paint Worklet runs off main thread

```js
registerPaint('noise-field', class {
  static get inputProperties() {
    return ['--nf-hue', '--nf-scale', '--nf-time'];
  }

  paint(ctx, size, props) {
    // Runs in PaintWorkletGlobalScope — separate thread
    // No window / document / imports here
  }
});
```

### 4×4 block rendering

Per-pixel at 1920×1080 = ~2M iterations/frame. Blocks of 4×4 = ~130K. 15× faster, visually imperceptible.

---

## Usage

### Register worklets

```js
import { registerAll } from 'noise-field';
await registerAll();

// or selectively:
import { register } from 'noise-field';
await register('mesh-gradient');
```

### Apply with CSS

```css
/* noise-field */
@property --nf-time { syntax: '<number>'; inherits: false; initial-value: 0; }
@keyframes nf-flow  { to { --nf-time: 1000; } }

.bg {
  background: paint(noise-field);
  --nf-hue: 220;
  --nf-scale: 3;
  --nf-saturation: 70;
  --nf-lightness: 50;
  animation: nf-flow 12s linear infinite;
}
```

```css
/* mesh-gradient */
@property --mesh-time { syntax: '<number>'; inherits: false; initial-value: 0; }
@keyframes mesh-flow  { to { --mesh-time: 1000; } }

.hero {
  background: paint(mesh-gradient);
  --mesh-color-1: #667eea;
  --mesh-color-2: #764ba2;
  --mesh-color-3: #f093fb;
  --mesh-color-4: #f5576c;
  animation: mesh-flow 10s linear infinite;
}
```

### React hook

```tsx
import { useWorklet } from 'noise-field/react';

function Hero() {
  const { ref, setProps } = useWorklet('noise-field', {
    '--nf-hue': 220,
    '--nf-scale': 3,
  });

  return (
    <div ref={ref} className="hero">
      <input
        type="range" min={0} max={360}
        onChange={e => setProps({ '--nf-hue': Number(e.target.value) })}
      />
    </div>
  );
}
```

`setProps` calls `element.style.setProperty` — no React re-renders.

---

## Browser support

| Browser | Paint API | `@property` | Mode |
|---|---|---|---|
| Chrome 85+ | ✅ | ✅ | Native |
| Edge 85+ | ✅ | ✅ | Native |
| Safari | ❌ | ❌ | Polyfill |
| Firefox | ❌ | ❌ | Polyfill |

Polyfill ([css-paint-polyfill](https://github.com/GoogleChromeLabs/css-paint-polyfill)) loads automatically when native API is unavailable. In polyfill mode animation runs via `requestAnimationFrame` instead of CSS interpolation — visually identical, but on main thread.

---

## Development

```bash
npm install
npm run dev      # → http://localhost:5173
npm run build
```

---

## Technical notes

**Why simplex noise over Perlin?** Better isotropy, no directional artifacts at grid boundaries, slightly faster at same quality.

**Why inline noise code in each worklet?** Paint Worklets use `addModule(url)` which doesn't support ES module `import` across browsers. Each worklet is fully self-contained.

**Why `new URL('./worklets/name.js', import.meta.url)`?** Vite rewrites this at build time to the hashed asset URL. The worklet files stay as separate JS files (not inlined), which is required — `addModule()` needs a real URL.

---

## License

MIT © Dominik Pawlikowski
