import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
    // Allow importing .js files that actually resolve to .ts files (ESM interop)
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    alias: {
      '@': path.resolve(__dirname, './'),
    },
    // Resolve .js imports to .ts files for backend ESM modules
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'lib/**',
        'server/src/**',
        'components/**',
      ],
      exclude: [
        'tests/**',
        'node_modules/**',
      ],
    },
  },
})
