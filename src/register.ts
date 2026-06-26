export type WorkletName = 'noise-field' | 'plasma' | 'grain' | 'marble' | 'mesh-gradient';

// CSS.paintWorklet is not in TypeScript's lib.dom.d.ts — extend the global
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace CSS {
    const paintWorklet: { addModule(url: string): Promise<void> } | undefined;
  }
}

const workletUrls: Record<WorkletName, () => string> = {
  'noise-field':   () => new URL('./worklets/noise-field.js',   import.meta.url).href,
  'plasma':        () => new URL('./worklets/plasma.js',        import.meta.url).href,
  'grain':         () => new URL('./worklets/grain.js',         import.meta.url).href,
  'marble':        () => new URL('./worklets/marble.js',        import.meta.url).href,
  'mesh-gradient': () => new URL('./worklets/mesh-gradient.js', import.meta.url).href,
};

const registered = new Set<WorkletName>();

let polyfillLoaded = false;

async function ensurePolyfill(): Promise<void> {
  if (polyfillLoaded) return;
  if (typeof CSS !== 'undefined' && 'paintWorklet' in CSS) return;
  await import('css-paint-polyfill');
  polyfillLoaded = true;
}

export async function register(name: WorkletName): Promise<void> {
  if (registered.has(name)) return;
  await ensurePolyfill();
  await CSS.paintWorklet!.addModule(workletUrls[name]());
  registered.add(name);
}

export async function registerAll(): Promise<void> {
  await Promise.all((Object.keys(workletUrls) as WorkletName[]).map(register));
}

export function isNativeHoudini(): boolean {
  return typeof CSS !== 'undefined' && 'paintWorklet' in CSS;
}
