import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the missing prompts.js file
vi.mock('@/server/src/agent/prompts.js', () => ({
  buildSystemPrompt: () => 'System Prompt'
}))

// Mock the missing sessions.js file
vi.mock('@/server/src/db/sessions.js', () => ({
  SessionStore: {
    getOrCreate: vi.fn((sessionId, workspacePath) => ({
      id: sessionId,
      workspacePath,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    })),
    save: vi.fn(),
    saveToolCall: vi.fn(),
    createCheckpoint: vi.fn()
  }
}))

// Mock @google/genai
const generateContentStreamMock = vi.fn()
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class {
      models = {
        generateContentStream: generateContentStreamMock
      }
    }
  }
})

import { runAgentLoop } from '@/server/src/agent/loop'
import { ToolRegistry } from '@/server/src/tools/registry'
import { SessionStore } from '@/server/src/db/sessions'

describe('runAgentLoop Integration', () => {
  let toolRegistry: ToolRegistry
  let pendingApprovals: Map<string, { resolve: (approved: boolean) => void }>
  let onEventSpy: any

  beforeEach(() => {
    vi.clearAllMocks()
    toolRegistry = new ToolRegistry()
    pendingApprovals = new Map()
    onEventSpy = vi.fn()
    process.env.GEMINI_API_KEY = 'mock-api-key'
  })

  it('completes happy path with simple token streaming', async () => {
    // Mock generateContentStream return iterator
    const fakeChunks = [
      { text: 'Olá! ' },
      { text: 'Estou pensando.' }
    ]
    generateContentStreamMock.mockResolvedValue({
      async *[Symbol.asyncIterator]() {
        for (const chunk of fakeChunks) {
          yield chunk
        }
      }
    })

    const controller = new AbortController()

    await runAgentLoop({
      userMessage: 'Olá',
      sessionId: 'session-1',
      workspacePath: '/workspace',
      toolRegistry,
      mode: 'yolo',
      signal: controller.signal,
      pendingApprovals,
      onEvent: onEventSpy
    })

    expect(onEventSpy).toHaveBeenCalledWith({
      type: 'agent_token',
      token: 'Olá! ',
      sessionId: 'session-1'
    })
    expect(onEventSpy).toHaveBeenCalledWith({
      type: 'agent_thinking_done',
      fullText: 'Olá! Estou pensando.',
      sessionId: 'session-1'
    })
    expect(onEventSpy).toHaveBeenCalledWith({
      type: 'agent_done',
      sessionId: 'session-1',
      summary: 'Olá! Estou pensando.'
    })
  })

  it('handles function call and executes tool successfully', async () => {
    const dummyTool = {
      name: 'test_tool',
      description: 'Test Tool',
      inputSchema: {},
      isDestructive: false,
      execute: vi.fn().mockResolvedValue('tool-result-data'),
      describeAction: () => 'Executing test tool'
    }
    toolRegistry.register(dummyTool)

    // First response does function call, second response finishes thinking
    const stream1 = {
      async *[Symbol.asyncIterator]() {
        yield { functionCalls: [{ name: 'test_tool', args: { arg1: 'val' } }] }
      }
    }
    const stream2 = {
      async *[Symbol.asyncIterator]() {
        yield { text: 'Final summary' }
      }
    }

    generateContentStreamMock
      .mockResolvedValueOnce(stream1)
      .mockResolvedValueOnce(stream2)

    const controller = new AbortController()

    await runAgentLoop({
      userMessage: 'Chame a ferramenta',
      sessionId: 'session-1',
      workspacePath: '/workspace',
      toolRegistry,
      mode: 'yolo',
      signal: controller.signal,
      pendingApprovals,
      onEvent: onEventSpy
    })

    // Verify tool was called
    expect(dummyTool.execute).toHaveBeenCalledWith({ arg1: 'val' })
    expect(onEventSpy).toHaveBeenCalledWith({
      type: 'tool_call',
      actionId: expect.any(String),
      toolName: 'test_tool',
      args: { arg1: 'val' },
      sessionId: 'session-1'
    })
    expect(onEventSpy).toHaveBeenCalledWith({
      type: 'tool_result',
      actionId: expect.any(String),
      result: 'tool-result-data',
      isError: false,
      sessionId: 'session-1'
    })
    expect(onEventSpy).toHaveBeenCalledWith({
      type: 'agent_done',
      sessionId: 'session-1',
      summary: 'Final summary'
    })
  })

  it('requires user approval when in plan mode or when tool is destructive', async () => {
    const destructiveTool = {
      name: 'delete_db',
      description: 'destructive',
      inputSchema: {},
      isDestructive: true,
      execute: vi.fn().mockResolvedValue('deleted'),
      describeAction: () => 'deleting db'
    }
    toolRegistry.register(destructiveTool)

    const stream1 = {
      async *[Symbol.asyncIterator]() {
        yield { functionCalls: [{ name: 'delete_db', args: {} }] }
      }
    }
    const stream2 = {
      async *[Symbol.asyncIterator]() {
        yield { text: 'Done' }
      }
    }

    generateContentStreamMock
      .mockResolvedValueOnce(stream1)
      .mockResolvedValueOnce(stream2)

    const controller = new AbortController()

    // Run the loop in background since it will wait for approval
    const loopPromise = runAgentLoop({
      userMessage: 'Delete the database',
      sessionId: 'session-1',
      workspacePath: '/workspace',
      toolRegistry,
      mode: 'auto_edit', // Destructive tool in auto_edit requires approval
      signal: controller.signal,
      pendingApprovals,
      onEvent: onEventSpy
    })

    // Wait short time for pending approvals to be populated
    await new Promise(resolve => setTimeout(resolve, 10))

    expect(onEventSpy).toHaveBeenCalledWith({
      type: 'approval_required',
      actionId: expect.any(String),
      toolName: 'delete_db',
      description: 'deleting db',
      diff: undefined,
      sessionId: 'session-1'
    })

    // Simulate user approval
    const actionId = Array.from(pendingApprovals.keys())[0]
    pendingApprovals.get(actionId)!.resolve(true)

    await loopPromise

    expect(destructiveTool.execute).toHaveBeenCalled()
    expect(onEventSpy).toHaveBeenCalledWith({
      type: 'tool_result',
      actionId: expect.any(String),
      result: 'deleted',
      isError: false,
      sessionId: 'session-1'
    })
  })

  it('rejects execution if user rejects approval', async () => {
    const destructiveTool = {
      name: 'delete_db',
      description: 'destructive',
      inputSchema: {},
      isDestructive: true,
      execute: vi.fn(),
      describeAction: () => 'deleting db'
    }
    toolRegistry.register(destructiveTool)

    const stream1 = {
      async *[Symbol.asyncIterator]() {
        yield { functionCalls: [{ name: 'delete_db', args: {} }] }
      }
    }
    const stream2 = {
      async *[Symbol.asyncIterator]() {
        yield { text: 'Done' }
      }
    }

    generateContentStreamMock
      .mockResolvedValueOnce(stream1)
      .mockResolvedValueOnce(stream2)

    const controller = new AbortController()

    const loopPromise = runAgentLoop({
      userMessage: 'Delete the database',
      sessionId: 'session-1',
      workspacePath: '/workspace',
      toolRegistry,
      mode: 'auto_edit',
      signal: controller.signal,
      pendingApprovals,
      onEvent: onEventSpy
    })

    await new Promise(resolve => setTimeout(resolve, 10))

    // Simulate rejection
    const actionId = Array.from(pendingApprovals.keys())[0]
    pendingApprovals.get(actionId)!.resolve(false)

    await loopPromise

    // Destructive tool is never executed
    expect(destructiveTool.execute).not.toHaveBeenCalled()
    expect(onEventSpy).not.toHaveBeenCalledWith({
      type: 'tool_result',
      actionId: expect.any(String),
      result: 'deleted',
      isError: false,
      sessionId: 'session-1'
    })
  })
})
