import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      external: [/^node:.*/, 'better-sqlite3'],
    },
  },
  test: {
    server: {
      deps: {
        external: ['node:sqlite']
      }
    },
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    alias: {
      '@': path.resolve(__dirname, './')
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
})
