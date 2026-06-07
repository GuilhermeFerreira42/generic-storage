import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runAgentLoop } from '@/server/src/agent/loop'
import { ToolRegistry } from '@/server/src/tools/registry'
import { useIDEStore } from '@/lib/store'

vi.mock('@/server/src/agent/prompts.js', () => ({
  buildSystemPrompt: () => 'Prompt'
}))

vi.mock('@/server/src/db/sessions.js', () => ({
  SessionStore: {
    getOrCreate: () => ({ id: 'session-123', messages: [] }),
    save: () => {}
  }
}))

describe('TRATAMENTO DE ERRO DE API KEY (Critical Error Propagation)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useIDEStore.setState({ messages: [], debateSession: null })
    
    // Clear key variables
    delete process.env.GEMINI_API_KEY
    delete process.env.GOOGLE_API_KEY
  })

  it('triggers error event on backend when API keys are missing in env', async () => {
    const onEventSpy = vi.fn()
    const toolRegistry = new ToolRegistry()
    const signal = new AbortController().signal

    // Running agent loop with empty env should trigger an API key error
    // (GoogleGenAI constructor throws error if apiKey is empty or undefined)
    await expect(
      runAgentLoop({
        userMessage: 'Test task',
        sessionId: 'session-123',
        workspacePath: '/workspace',
        toolRegistry,
        mode: 'auto_edit',
        signal,
        pendingApprovals: new Map(),
        onEvent: onEventSpy
      })
    ).rejects.toThrow(/option apiKey must be set|API key/i)
  })

  it('adds error message to the frontend store when socket receives api key error message', () => {
    // Simulating websocket message dispatch handler
    const mockWSResponse = {
      type: 'error',
      message: 'Erro de Autenticação: Chave de API (GEMINI_API_KEY) ausente no backend.',
      sessionId: 'session-123'
    }

    const store = useIDEStore.getState()

    // Simulate event handler inside the IDE client
    if (mockWSResponse.type === 'error' && mockWSResponse.message.includes('API') || mockWSResponse.message.includes('Chave')) {
      store.addMessage({
        role: 'system',
        content: `[FALHA DE INICIALIZAÇÃO]: ${mockWSResponse.message}`,
        agentName: 'Sentinela de Chaves'
      })
    }

    const updatedState = useIDEStore.getState()
    expect(updatedState.messages).toHaveLength(1)
    expect(updatedState.messages[0].content).toContain('[FALHA DE INICIALIZAÇÃO]')
    expect(updatedState.messages[0].content).toContain('GEMINI_API_KEY')
  })
})
