import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Setup global
beforeAll(async () => {
  // Configs globais se necessário
  process.env.GOOGLE_API_KEY = 'mock-api-key-for-testing';
  if (typeof window === 'undefined') {
    const { initDB } = await import('@/server/src/db/init');
    process.env.DB_PATH = ':memory:';
    try {
      initDB();
    } catch (err) {
      console.error('[Vitest Setup] Erro ao inicializar DB:', err);
    }
  }
})

// Mock scrollIntoView as it's not implemented in jsdom
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Mock global para módulos nativos que podem causar problemas
vi.stubGlobal('crypto', {
  randomUUID: () => '550e8400-e29b-41d4-a716-446655440000',
  randomBytes: (size: number) => Buffer.alloc(size),
  getRandomValues: (arr: any) => arr
})
