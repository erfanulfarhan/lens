import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// electron-vite resolves each environment against its own root, so entry
// points must be absolute or rollup treats them as external modules.
export default defineConfig({
  main: {
    build: {
      outDir: 'out/main',
      rollupOptions: { input: resolve(__dirname, 'electron/main.ts') },
    },
  },
  preload: {
    build: {
      outDir: 'out/preload',
      rollupOptions: { input: resolve(__dirname, 'electron/preload.ts') },
    },
  },
  renderer: {
    root: resolve(__dirname, 'src'),
    plugins: [react(), tailwindcss()],
    build: {
      outDir: 'out/renderer',
      rollupOptions: { input: resolve(__dirname, 'src/index.html') },
    },
  },
})
