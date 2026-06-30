# noise-field — Extended Demo

Standalone demo page for testing all five worklets without the Vite build pipeline.

## Running

Must be served over HTTP — `file://` blocks Blob URL registration in most browsers.

```bash
# from project root
npx serve demo

# or
cd demo && python -m http.server 8080
```

Then open `http://localhost:3000` (or whichever port `serve` picks).

## Features

- **Sidebar** — switch between all 5 worklets with animated thumbnails
- **Presets** — curated presets per worklet (5 for noise-field and marble, 4–5 for others)
- **Controls tab** — live sliders and color pickers, updates paint instantly
- **Animation** — speed multiplier (0.5× / 1× / 2× / 4×) and pause/resume
- **CSS tab** — generated CSS snippet reflecting current values, copy to clipboard or download as `.css`
- **Info tab** — inputProperties list, pixel block size, browser support matrix
- **Fullscreen** — press ⛶ or Esc to toggle
- **Compare mode** — side-by-side two worklets with per-cell worklet selector

## Implementation notes

All worklets are inlined as template literal strings and registered via `Blob` + `URL.createObjectURL` — no build step, no file server path issues. The polyfill (`css-paint-polyfill`) is loaded from unpkg on demand when native Houdini isn't available (Firefox, Safari).

Author: Dominik Pawlikowski
