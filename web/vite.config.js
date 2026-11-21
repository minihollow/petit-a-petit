import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// base './': works at https://<user>.github.io/petit-a-petit/ and anywhere else.
export default defineConfig({
  plugins: [react()],
  base: './',
  define: { 'import.meta.env.VITE_VERSION': JSON.stringify(version) },
  build: { outDir: '../site', emptyOutDir: true, chunkSizeWarningLimit: 1500 },
});
