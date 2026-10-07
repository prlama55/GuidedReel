import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  main: {
    // @guidedreel/core and its dependencies are compiled ESM in node_modules and load at runtime.
    plugins: [externalizeDepsPlugin()],
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
