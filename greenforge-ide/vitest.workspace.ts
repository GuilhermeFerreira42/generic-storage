import { defineWorkspace } from 'vitest/config'
import path from 'path'

export default defineWorkspace([
  {
    test: {
      name: 'frontend',
      environment: 'jsdom',
      include: ['tests/unit/frontend/**/*.{test,spec}.{ts,tsx}'],
      exclude: ['**/node_modules/**', '**/tmp/**', '**/temp_extracted/**', '**/e2e/**', '**/playwright/**'],
      setupFiles: ['./tests/setup.frontend.ts'],
      globals: true,
      alias: {
        '@': path.resolve(__dirname, './')
      }
    }
  },
  {
    test: {
      name: 'backend',
      environment: 'node',
      include: ['tests/unit/backend/**/*.{test,spec}.ts', 'tests/integration/**/*.{test,spec}.ts'],
      exclude: ['**/node_modules/**', '**/tmp/**', '**/temp_extracted/**', '**/e2e/**', '**/playwright/**'],
      setupFiles: ['./tests/setup.backend.ts'],
      globals: true,
      alias: {
        '@': path.resolve(__dirname, './'),
        '@google/genai': path.resolve(__dirname, 'node_modules/@google/genai'),
        '@modelcontextprotocol/sdk/client/index.js': path.resolve(__dirname, 'server/node_modules/@modelcontextprotocol/sdk/client/index.js'),
        '@modelcontextprotocol/sdk/client/stdio.js': path.resolve(__dirname, 'server/node_modules/@modelcontextprotocol/sdk/client/stdio.js')
      },
      server: {
        deps: {
          external: ['node:sqlite'],
          inline: ['@modelcontextprotocol/sdk']
        }
      }
    }
  }
])
