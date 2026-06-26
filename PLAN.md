# noise-field — Plan implementacji

> Autor: Dominik Pawlikowski  
> Data: 2026-06-26  
> Stack: CSS Houdini Paint API, Vanilla JS (worklet), React hook (opcjonalnie), Vite, TypeScript

---

## 1. Cel projektu

Biblioteka generatywnych, animowanych teł proceduralnych oparta wyłącznie na CSS Houdini Paint API. Zero DOM canvas, zero JS w main threadzie podczas animacji. Użytkownik pisze:

```css
.hero {
  background: paint(noise-field);
  --nf-hue: 220;
  --nf-scale: 3;
}
```

i dostaje żywe, organiczne tło — resolution-independent, GPU-friendly, animowane przez CSS.

---

## 2. Decyzje architektoniczne

### 2.1 Dlaczego Houdini Paint API, nie canvas / WebGL

| Podejście | Wady |
|-----------|------|
| `<canvas>` w DOM | Zajmuje osobny element, layout coupling, resize observer potrzebny |
| WebGL shader | Overkill dla tła, wymaga boilerplate, brak CSS integration |
| CSS gradient hack | Statyczny, nie proceduralny, trudny w animacji |
| **Houdini Paint** | **Osobny wątek, CSS custom property jako API, zero DOM, resolution-independent** |

Paint worklet działa w `PaintWorkletGlobalScope` — osobnym wątku bez `window`/`document`. Przeglądarka woła `paint()` tylko gdy element jest widoczny i wymaga repaint — nie ma zbędnych klatek.

### 2.2 Animacja przez @property, nie przez JS

```css
@property --nf-time {
  syntax: '<number>';
  inherits: false;
  initial-value: 0;
}

@keyframes nf-flow {
  to { --nf-time: 1000; }
}
```

Przeglądarka interpoluje `--nf-time` jako `<number>` co klatkę → worklet dostaje aktualną wartość → przemalowuje. **Zero JS w main threadzie po inicjalizacji.** Bez `@property` custom property jest traktowany jako string i nie interpoluje.

### 2.3 Bloki 4×4 px zamiast per-pixel

```js
const BLOCK = 4;
for (let y = 0; y < height; y += BLOCK) {
  for (let x = 0; x < width; x += BLOCK) {
    const n = noise(x / scale, y / scale, time);
    ctx.fillStyle = `hsl(${hue + n * 60}, 70%, ${50 + n * 20}%)`;
    ctx.fillRect(x, y, BLOCK, BLOCK);
  }
}
```

Per-pixel loop na 1920×1080 = ~2M iteracji / klatkę. Bloki 4×4 = ~130K. Różnica 15× przy akceptowalnej jakości wizualnej. Dla efektu grain używamy bloków 1×1, ale z ograniczoną częstością animacji.

### 2.4 Simplex noise, nie Perlin

Simplex noise (implementacja Gustavson) jest szybszy, ma lepszą izotropię i mniej wizualnych artefaktów kierunkowych. Kopiujemy minimalną implementację (~80 linii) bezpośrednio do workletów — worklet nie może importować modułów npm przez standardowy `import`.

### 2.5 Polyfill dla Safari i Firefox

CSS Houdini Paint API jest dostępne tylko w Chromium (Chrome, Edge, Opera). Używamy `css-paint-polyfill` (Google Chrome Labs) który emuluje API przez `<canvas>` fallback. Polyfill ładowany warunkowo:

```js
if (!CSS.paintWorklet) {
  await import('https://unpkg.com/css-paint-polyfill');
}
```

Polyfill działa w main threadzie — animacja przez `requestAnimationFrame` zamiast CSS interpolacji. Wizualnie identyczne, ale nie "zero JS". Akceptowalny kompromis.

### 2.6 Struktura pakietu

Każdy worklet jako osobny plik JS (nie bundlowany razem) — worklet rejestrujemy przez URL do pliku, nie przez inline string. Vite generuje hashed filenames, więc eksportujemy helper:

```ts
export function registerNoiseField() {
  CSS.paintWorklet.addModule(new URL('./worklets/noise-field.js', import.meta.url).href);
}
```

`new URL(..., import.meta.url)` jest obsługiwane przez Vite i generuje prawidłowy publiczny URL do skompilowanego pliku.

### 2.7 TypeScript dla DX, nie dla workletów

Main thread (hooki React, helpers rejestracji) — TypeScript. Worklet files — czysty JS (worklet ma inny global scope, typy i tak nie działają w runtime, TS tu nie pomaga, komplikuje build).

---

## 3. Zestaw workletów

| Worklet | Efekt | Custom properties | Trudność |
|---------|-------|-------------------|----------|
| `noise-field` | Organiczny szum, baza | `--nf-hue`, `--nf-scale`, `--nf-speed`, `--nf-time` | ⭐⭐ |
| `plasma` | Sinusoidalna plazma lat 90 | `--plasma-hue`, `--plasma-speed`, `--plasma-complexity` | ⭐⭐ |
| `marble` | Żyłkowanie jak marmur | `--marble-hue`, `--marble-scale`, `--marble-contrast` | ⭐⭐⭐ |
| `grain` | Ziarno filmowe, noise | `--grain-opacity`, `--grain-size` | ⭐ |
| `mesh-gradient` | Gradient siatka jak Stripe | `--mesh-color-1..4`, `--mesh-speed` | ⭐⭐⭐⭐ |

Implementacja w tej kolejności — każdy następny worklet korzysta z doświadczeń poprzedniego.

---

## 4. Struktura katalogów

```
noise-field/
├── src/
│   ├── worklets/
│   │   ├── _noise.js          # Simplex noise — wspólny, kopiowany do workletów
│   │   ├── noise-field.js
│   │   ├── plasma.js
│   │   ├── marble.js
│   │   ├── grain.js
│   │   └── mesh-gradient.js
│   ├── register.ts            # registerPainter(name) helper
│   ├── react/
│   │   └── useNoiseField.ts   # opcjonalny React hook
│   └── index.ts               # public API
├── demo/
│   ├── index.html
│   ├── main.ts
│   └── components/
│       ├── WorkletCard.tsx    # karta z podglądem + suwakami
│       └── CopyCSS.tsx        # "copy CSS" przycisk
├── vite.config.ts
├── tsconfig.json
├── package.json
└── PLAN.md
```

---

## 5. Public API biblioteki

### Rejestracja

```ts
// Najprostsze użycie
import { registerAll } from 'noise-field';
await registerAll();

// Selektywne
import { register } from 'noise-field';
await register('noise-field');
await register('plasma');
```

### CSS po rejestracji

```css
/* noise-field */
.bg {
  background: paint(noise-field);
  --nf-hue: 220;
  --nf-scale: 3;
  --nf-speed: 1;
  animation: nf-flow 10s linear infinite;
}

/* mesh-gradient */
.hero {
  background: paint(mesh-gradient);
  --mesh-color-1: #667eea;
  --mesh-color-2: #764ba2;
  --mesh-speed: 0.5;
  animation: mesh-flow 8s ease-in-out infinite alternate;
}
```

### React hook (opcjonalny)

```tsx
import { useNoiseField } from 'noise-field/react';

function Hero() {
  const { ref, setHue, setScale } = useNoiseField('noise-field');
  return (
    <div ref={ref} className="hero">
      <input type="range" onChange={e => setHue(Number(e.target.value))} />
    </div>
  );
}
```

Hook zarządza tylko CSS custom properties przez `el.style.setProperty` — bez re-renderów, zero overhead.

---

## 6. Pułapki i jak ich uniknąć

### Worklet nie ma `window`, `document`, `Math.random` persystentnego

Cała matematyka musi być deterministyczna i self-contained. `Math.random()` działa, ale resetuje się przy każdym repaincie → widoczny migot. Używamy pseudolosowości opartej na pozycji piksela i czasie.

### `import` w workletach nie działa (natywnie)

Worklet ładowany przez `addModule(url)` nie obsługuje ES module imports w starszych przeglądarkach. Rozwiązanie: każdy worklet jest self-contained, wspólny kod (simplex noise) kopiowany/inline'owany przez Vite plugin lub build script.

### Polyfill musi być załadowany przed `addModule`

```ts
async function register(name: string) {
  if (!('paintWorklet' in CSS)) {
    await import('css-paint-polyfill'); // najpierw polyfill
  }
  await CSS.paintWorklet.addModule(workletsMap[name]);
}
```

### `@property` nie działa w Safari nawet z polyfill

Animacja custom properties przez `@property` to osobna spec (CSS Houdini Properties & Values). Fallback: JS `requestAnimationFrame` loop ustawiający `--nf-time` ręcznie. Używamy feature detection.

### MIME type worklet pliku musi być `text/javascript`

Jeśli serwujemy worklet z CDN lub custom serwera — musi zwracać poprawny Content-Type. W devie Vite obsługuje to automatycznie.

---

## 7. Demo aplikacja

### Wymagania UX

- Galeria wszystkich 5 workletów, każdy jako pełnoekranowa karta
- Suwaki na żywo: hue, scale, speed — zmiana widoczna natychmiast (< 16ms, bez rerenderów)
- Przycisk "Copy CSS" — kopiuje minimalne CSS + `@property` declarations do clipboard
- Przełącznik "View worklet source" — syntax-highlighted kod workletów
- Dark / light mode toggle (tło workletów musi wyglądać dobrze na obu)
- Baner "Houdini support: ✓ Native / ⚠ Polyfill" zależnie od przeglądarki

### Stack demo

- Vite + React + TypeScript
- CSS Modules dla stylów demo (nie dla workletów)
- Brak zewnętrznych bibliotek UI — celem jest pokazanie że samo Houdini wystarczy
- Prism.js dla syntax highlighting kodu workletów

---

## 8. Kroki implementacji (weekendy)

### Weekend 1 — fundament i pierwszy worklet

**Sesja 1 (~3h)**
- [ ] `npm create vite@latest noise-field -- --template vanilla-ts`
- [ ] Konfiguracja `vite.config.ts` — `assetsInlineLimit: 0` żeby worklet nie był inline base64
- [ ] `src/worklets/_noise.js` — implementacja simplex noise (port Gustavson, ~80 linii)
- [ ] `src/worklets/noise-field.js` — pierwszy worklet, statyczny (bez animacji)
- [ ] `src/register.ts` — `register(name)` z polyfill detection
- [ ] Test w `demo/index.html` — zielone tło `paint(noise-field)`

**Sesja 2 (~3h)**
- [ ] `@property --nf-time` declaration + `@keyframes`
- [ ] Animacja w workletcie — `time` parametr w noise function
- [ ] Suwaki hue i scale — raw JS na `input[type=range]` → `style.setProperty`
- [ ] Feature detection + fallback `requestAnimationFrame` dla Safari

### Weekend 2 — plasma i grain + demo szkielet

**Sesja 3 (~3h)**
- [ ] `src/worklets/plasma.js` — sinusoidalna plazma
- [ ] `src/worklets/grain.js` — najprostszy worklet (1×1 noise)
- [ ] Migracja demo do React (zachowanie Vite config)
- [ ] `WorkletCard` komponent — podgląd + suwaki

**Sesja 4 (~2h)**
- [ ] `CopyCSS` komponent — generuje CSS string z aktualnych wartości suwaków
- [ ] "View source" toggle z Prism.js
- [ ] Responsywność demo — siatka kart działa na mobile

### Weekend 3 — marble i mesh-gradient

**Sesja 5 (~4h)**
- [ ] `src/worklets/marble.js` — turbulencja + sin distortion → żyłki
- [ ] `src/worklets/mesh-gradient.js` — najtrudniejszy, bilinear interpolation między 4 kolorami hex

**Sesja 6 (~2h)**
- [ ] React hook `useNoiseField` — wrapper dla łatwej integracji
- [ ] TypeScript types dla wszystkich custom properties
- [ ] `src/index.ts` — finalne public API

### Weekend 4 — pakiet i publikacja

**Sesja 7 (~3h)**
- [ ] `vite.config.ts` tryb library — build jako ES module + CJS
- [ ] `package.json` — `exports`, `types`, `files`, `peerDependencies`
- [ ] README z instalacją, przykładami, tabelą browser support
- [ ] Testy — Playwright screenshot diff (worklet produkuje ten sam output dla tych samych parametrów)

**Sesja 8 (~2h)**
- [ ] Deploy demo na GitHub Pages lub Vercel
- [ ] `npm publish`
- [ ] Post na CSS-Tricks / dev.to

---

## 9. Browser support

| Przeglądarka | Paint API | @property | Strategia |
|---|---|---|---|
| Chrome 85+ | ✅ natywnie | ✅ natywnie | Pełna |
| Edge 85+ | ✅ natywnie | ✅ natywnie | Pełna |
| Safari | ❌ | ❌ | Polyfill + rAF |
| Firefox | ❌ | ❌ | Polyfill + rAF |
| Chrome < 85 | ❌ | ❌ | Polyfill + rAF |

Polyfill (`css-paint-polyfill`) pokrywa ~100% z kosztem: animacja w main threadzie, nie w worklet threadzie.

---

## 10. Metryki sukcesu projektu

- [ ] 5 workletów działa natywnie w Chrome
- [ ] 5 workletów działa przez polyfill w Safari i Firefox
- [ ] Animacja w Chrome nie blokuje main thread (mierzalne przez Performance tab)
- [ ] Demo ładuje się < 50KB gzip (bez polyfilla)
- [ ] `@property` + CSS-only animacja działa bez jednej linii JS po inicjalizacji
- [ ] Pierwsze tło implementowalne w < 3h przez nową osobę (README test)

---

## 11. Odniesienia

- [CSS Houdini Paint API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Painting_API)
- [css-paint-polyfill — Google Chrome Labs](https://github.com/GoogleChromeLabs/css-paint-polyfill)
- [Simplex noise — Stefan Gustavson](https://weber.itn.liu.se/~stegu/simplexnoise/simplexnoise.pdf)
- [is-houdini-ready.com](https://ishoudinireadyyet.com/)
- [@property — CSS Houdini Properties & Values](https://developer.mozilla.org/en-US/docs/Web/CSS/@property)
