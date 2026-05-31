import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'

const nodeBuiltins = [
  'fs', 'fs/promises', 'path', 'os', 'url', 'crypto', 'stream',
  'util', 'events', 'net', 'http', 'https', 'child_process', 'zlib',
  'readline', 'buffer', 'assert', 'tty', 'worker_threads', 'module',
]

const mainExternal = [
  'electron',
  'simple-git',
  ...nodeBuiltins,
  ...nodeBuiltins.map(m => `node:${m}`),
]

const preloadExternal = [
  'electron',
  ...nodeBuiltins,
  ...nodeBuiltins.map(m => `node:${m}`),
]

export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main.ts',
        vite: {
          build: {
            rollupOptions: { external: mainExternal },
          },
        },
      },
      preload: {
        input: 'electron/preload.ts',
        vite: {
          build: {
            rollupOptions: {
              external: preloadExternal,
              output: {
                // ESM output — correct since package.json has "type":"module"
                // (.js with type:module is treated as ESM by Node/Electron)
                format: 'es',
                entryFileNames: '[name].js',
              },
            },
          },
        },
      },
    }),
  ],
})
