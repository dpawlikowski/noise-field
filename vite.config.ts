import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Set base to repo name when deploying to GitHub Pages
// e.g. https://dpawlikowski.github.io/noise-field/
const base = process.env.GITHUB_PAGES ? '/noise-field/' : '/';

export default defineConfig({
  plugins: [react()],
  base,
  build: {
    // Prevent worklet files from being inlined as base64 — they must be real URLs
    assetsInlineLimit: 0,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
  },
});
