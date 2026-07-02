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

**[→ Live demo](https://dpawlikowski.github.io/noise-field/)**

---

## Worklets

| Name | Effect | Key properties |
|---|---|---|
| `noise-field` | Organic fBm noise | `--nf-hue`, `--nf-scale`, `--nf-saturation`, `--nf-lightness` |
| `plasma` | Demoscene sine-wave plasma | `--plasma-hue`, `--plasma-complexity` |
| `marble` | Turbulence-distorted veining | `--marble-hue`, `--marble-scale`, `--marble-vein-width` |
| `grain` | Animated film grain | `--grain-opacity`, `--grain-size`, `--grain-base-hue` |
| `mesh-gradient` | Stripe-style 4-color mesh | `--mesh-color-1..4` |
| `glitch` | Datamosh / RGB-split digital glitch | `--glitch-hue`, `--glitch-intensity`, `--glitch-block` |
| `aurora` | Additive-blended northern-lights bands | `--aurora-hue`, `--aurora-bands`, `--aurora-intensity` |

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

## Performance

- **Block rendering** — every worklet fills 4×4px (or coarser) blocks instead of individual pixels; see above.
- **Analytic bounds over brute force** — `aurora` computes each band's visible y-range up front instead of scanning the full column height and discarding out-of-range pixels.
- **Pause off-screen** — the demo pauses `animation-play-state` on any card that scrolls out of the viewport (`IntersectionObserver`, 200px margin), since a Paint Worklet keeps repainting every animation frame even when invisible.
- **`content-visibility: auto`** on worklet cards skips layout/paint work entirely for off-screen cards.
- **`prefers-reduced-motion`** is respected — animations pause and the worklet renders a single static frame for users who've opted out of motion at the OS level.

These are demo/consumer-side optimizations; when you use a worklet directly, apply the same pattern (pause `animation-play-state` off-screen, respect reduced motion) to any layout with many animated backgrounds at once.

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
npm test         # unit tests (vitest)
npm run test:watch
```

---

## Architecture

```
src/
├── worklets/          # Self-contained JS worklets (no imports — worklet scope restriction)
│   ├── noise-field.js
│   ├── plasma.js
│   ├── marble.js
│   ├── grain.js
│   ├── mesh-gradient.js
│   ├── glitch.js
│   └── aurora.js
├── register.ts        # register() / registerAll() — polyfill detection + addModule()
├── react/
│   └── useWorklet.ts  # React hook — setProperty wrapper, zero re-renders
├── demo/              # Interactive demo app (React)
│   ├── App.tsx
│   ├── WorkletCard.tsx
│   └── workletConfigs.ts
└── index.ts           # Public API re-exports
```

Each worklet is self-contained because `addModule(url)` doesn't support ES module `import` — the common simplex noise implementation is inlined into each worklet that needs it.

---

## Technical notes

**Why simplex noise over Perlin?** Better isotropy, no directional artifacts at grid boundaries, slightly faster at same quality.

**Why inline noise code in each worklet?** Paint Worklets use `addModule(url)` which doesn't support ES module `import` across browsers. Each worklet is fully self-contained.

**Why `new URL('./worklets/name.js', import.meta.url)`?** Vite rewrites this at build time to the hashed asset URL. The worklet files stay as separate JS files (not inlined), which is required — `addModule()` needs a real URL.

---

## License

MIT © Dominik Pawlikowski
