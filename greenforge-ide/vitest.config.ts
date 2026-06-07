import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    // Only include tests from our project directories
    include: [
      'tests/**/*.{test,spec}.{ts,tsx}',
      'components/**/__tests__/**/*.{test,spec}.{ts,tsx}',
    ],
    environment: 'jsdom',
    environmentMatchGlobs: [
      ['**/tests/unit/frontend/**', 'jsdom'],
      ['**/tests/unit/backend/**', 'node'],
      ['**/tests/integration/**', 'node'],
      ['**/components/**/__tests__/**', 'jsdom'],
    ],
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    alias: {
      '@': path.resolve(__dirname, './'),
      '@google/genai': path.resolve(__dirname, 'node_modules/@google/genai'),
    },
    server: {
      deps: {
        external: ['node:sqlite']
      }
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    exclude: ['**/e2e/**', '**/playwright/**', '**/node_modules/**'],
  },
})
