import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Workspace packages are TypeScript source and must be bundled, not externalized.
const workspace = [
  '@guidedreel/compositions',
  '@guidedreel/engine',
  '@guidedreel/renderer',
  '@guidedreel/schema',
  '@guidedreel/storage',
  '@guidedreel/templates',
  '@guidedreel/ui',
];

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: workspace })],
    build: {
      rollupOptions: {
        input: { index: 'src/main/index.ts', 'render-worker': 'src/main/render-worker.ts' },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    plugins: [react(), tailwindcss()],
    root: 'src/renderer',
    build: { rollupOptions: { input: 'src/renderer/index.html' } },
  },
});
