import '@testing-library/jest-dom'
import { vi } from 'vitest'
import React from 'react'

// Mock de localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString()
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock de fetch global
global.fetch = vi.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ files: [], success: true }),
  } as Response)
)

// Mock do WebSocket
class MockWebSocket {
  url: string
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onmessage: ((event: any) => void) | null = null
  onerror: ((err: any) => void) | null = null

  constructor(url: string) {
    this.url = url
    setTimeout(() => {
      if (this.onopen) this.onopen()
    }, 0)
  }

  send(data: string) {}
  close() {
    setTimeout(() => {
      if (this.onclose) this.onclose()
    }, 0)
  }
}
Object.defineProperty(window, 'WebSocket', { value: MockWebSocket })

// Mock de crypto.randomUUID
if (!global.crypto) {
  (global as any).crypto = {}
}
if (!global.crypto.randomUUID) {
  global.crypto.randomUUID = vi.fn(() => '12345678-1234-1234-1234-1234567890ab') as any
}

// Mock de window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mocks de Arquivos/Módulos Ausentes no Frontend
vi.mock('@/lib/utils', () => ({
  cn: (...inputs: any[]) => inputs.filter(Boolean).join(' '),
}))

vi.mock('@/lib/services/debate-engine', () => ({
  DebateEngine: class {
    run = vi.fn()
    stop = vi.fn()
  },
}))

vi.mock('@/hooks/useAgentSocket', () => ({
  useAgentSocket: () => ({
    isConnected: true,
    sendMessage: vi.fn(),
    sendUserMessage: vi.fn(),
    stopDebate: vi.fn(),
    sessionId: 'mock-session-id-123',
  }),
}))

vi.mock('@/store/debateStore', () => ({
  useDebateStore: (selector: any) => {
    const store = {
      messages: [],
      status: 'IDLE',
      activeAgent: null,
      currentRound: 0,
      globalExpanded: false,
      toggleMessageExpanded: vi.fn(),
      setGlobalExpanded: vi.fn(),
      resetDebate: vi.fn(),
    }
    return selector ? selector(store) : store
  },
}))

vi.mock('@/components/chat/StatusBadge', () => ({
  StatusBadge: ({ agentName, role, state }: any) => (
    <div data-testid="status-badge" data-agent={agentName} data-role={role} data-state={state}>
      {agentName}: {state}
    </div>
  ),
}))

vi.mock('@/components/chat/AgentDebateMessage', () => ({
  AgentDebateMessage: ({ message }: any) => (
    <div data-testid="debate-message">
      {message.agentName || message.role}: {message.content}
    </div>
  ),
}))
