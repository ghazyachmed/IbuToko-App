import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * Stamp a unique version into dist/sw.js on every production build, so each
 * deploy ships a changed service worker. Installed apps then detect the update
 * and show "Versi baru tersedia" without anyone bumping VERSION by hand.
 */
function stampServiceWorker(): Plugin {
  return {
    name: 'stamp-service-worker',
    apply: 'build',
    closeBundle() {
      const file = fileURLToPath(new URL('./dist/sw.js', import.meta.url))
      const source = readFileSync(file, 'utf8')
      const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)
      writeFileSync(file, source.replace(/const VERSION = '([^']*)'/, `const VERSION = '$1-${stamp}'`))
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), stampServiceWorker()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
