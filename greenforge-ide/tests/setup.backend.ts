import { vi } from 'vitest'
import { initDB } from '@/server/src/db/init'

beforeAll(() => {
  process.env.GOOGLE_API_KEY = 'mock-api-key-for-testing'
  process.env.DB_PATH = ':memory:'
  try {
    initDB()
  } catch (err) {
    console.error('[Vitest Setup] Erro ao inicializar DB:', err)
  }
})

vi.stubGlobal('crypto', {
  randomUUID: () => '550e8400-e29b-41d4-a716-446655440000',
  randomBytes: (size: number) => Buffer.alloc(size),
  getRandomValues: (arr: any) => arr
})
