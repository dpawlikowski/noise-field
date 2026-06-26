import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Prevent worklet files from being inlined as base64 — they must be real URLs
    assetsInlineLimit: 0,
  },
});
