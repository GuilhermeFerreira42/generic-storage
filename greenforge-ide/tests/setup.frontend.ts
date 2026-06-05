import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock global para módulos nativos que podem causar problemas no frontend
vi.stubGlobal('crypto', {
  randomUUID: () => '550e8400-e29b-41d4-a716-446655440000',
  randomBytes: (size: number) => Buffer.alloc(size),
  getRandomValues: (arr: any) => arr
})

window.HTMLElement.prototype.scrollIntoView = vi.fn();
