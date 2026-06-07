import { describe, it, expect, vi, beforeEach } from 'vitest'
import { IncomingMessage, OutgoingMessage } from '@/server/src/ws/schemas'

// Simulates a WebSocket message dispatcher on the backend
class MockWebSocketServerConnection {
  socket: any
  authenticated = false
  sessionId: string | null = null
  mode: 'plan' | 'auto_edit' | 'yolo' = 'auto_edit'
  eventsSent: any[] = []

  constructor(socket: any) {
    this.socket = socket
  }

  handleIncomingData(rawMessage: string) {
    try {
      const parsed = IncomingMessage.parse(JSON.parse(rawMessage))
      
      // Connection/Auth logic
      if (parsed.type === 'chat_message') {
        if (parsed.auth_token !== 'valid-token') {
          this.send({ type: 'error', message: 'Unauthorized access' })
          return
        }
        this.authenticated = true
        this.sessionId = parsed.sessionId
        this.mode = parsed.mode || 'auto_edit'
        
        // Simulates history recovery if session has messages (mocked history)
        this.send({
          type: 'session_history',
          messages: [{ role: 'user', content: parsed.content }],
          sessionId: parsed.sessionId
        })
      }

      if (parsed.type === 'switch_mode') {
        this.mode = parsed.mode
        this.send({
          type: 'agent_event',
          event: 'mode_changed',
          data: { mode: parsed.mode },
          sessionId: parsed.sessionId
        })
      }

      if (parsed.type === 'cancel_agent') {
        this.send({
          type: 'error',
          message: 'Agent cancelled by user',
          sessionId: parsed.sessionId
        })
      }
    } catch (err: any) {
      this.send({
        type: 'error',
        message: `Validation error: ${err.message}`
      })
    }
  }

  send(msg: any) {
    // Validate that our outgoing message matches OutgoingMessage Zod schema
    const validation = OutgoingMessage.safeParse(msg)
    if (!validation.success) {
      throw new Error(`Invalid outgoing message schema: ${validation.error}`)
    }
    this.eventsSent.push(msg)
    this.socket.send(JSON.stringify(msg))
  }
}

describe('WebSocket & Session Integration', () => {
  let mockSocket: any
  let wsServerConn: MockWebSocketServerConnection

  beforeEach(() => {
    mockSocket = {
      send: vi.fn()
    }
    wsServerConn = new MockWebSocketServerConnection(mockSocket)
  })

  it('rejects connection if token is missing or invalid', () => {
    const rawMsg = JSON.stringify({
      type: 'chat_message',
      sessionId: '12345678-1234-1234-1234-1234567890ab',
      content: 'hello',
      workspacePath: '/workspace',
      auth_token: 'invalid-token'
    })

    wsServerConn.handleIncomingData(rawMsg)

    expect(wsServerConn.authenticated).toBe(false)
    expect(wsServerConn.eventsSent).toHaveLength(1)
    expect(wsServerConn.eventsSent[0].type).toBe('error')
    expect(wsServerConn.eventsSent[0].message).toContain('Unauthorized')
  })

  it('authenticates, registers session and restores history on happy path chat_message', () => {
    const rawMsg = JSON.stringify({
      type: 'chat_message',
      sessionId: '12345678-1234-1234-1234-1234567890ab',
      content: 'hello',
      workspacePath: '/workspace',
      auth_token: 'valid-token'
    })

    wsServerConn.handleIncomingData(rawMsg)

    expect(wsServerConn.authenticated).toBe(true)
    expect(wsServerConn.sessionId).toBe('12345678-1234-1234-1234-1234567890ab')
    expect(wsServerConn.eventsSent).toHaveLength(1)
    expect(wsServerConn.eventsSent[0].type).toBe('session_history')
    expect(wsServerConn.eventsSent[0].messages).toHaveLength(1)
  })

  it('handles agent cancellation', () => {
    const rawMsg = JSON.stringify({
      type: 'cancel_agent',
      sessionId: '12345678-1234-1234-1234-1234567890ab'
    })

    wsServerConn.handleIncomingData(rawMsg)

    expect(wsServerConn.eventsSent).toHaveLength(1)
    expect(wsServerConn.eventsSent[0]).toEqual({
      type: 'error',
      message: 'Agent cancelled by user',
      sessionId: '12345678-1234-1234-1234-1234567890ab'
    })
  })

  it('handles dynamic agent mode switching', () => {
    const rawMsg = JSON.stringify({
      type: 'switch_mode',
      sessionId: '12345678-1234-1234-1234-1234567890ab',
      mode: 'yolo'
    })

    wsServerConn.handleIncomingData(rawMsg)

    expect(wsServerConn.mode).toBe('yolo')
    expect(wsServerConn.eventsSent).toHaveLength(1)
    expect(wsServerConn.eventsSent[0]).toEqual({
      type: 'agent_event',
      event: 'mode_changed',
      data: { mode: 'yolo' },
      sessionId: '12345678-1234-1234-1234-1234567890ab'
    })
  })

  it('handles invalid format gracefully by returning error schema', () => {
    const badRawMsg = JSON.stringify({
      type: 'invalid_type',
      data: 'nonsense'
    })

    wsServerConn.handleIncomingData(badRawMsg)
    expect(wsServerConn.eventsSent).toHaveLength(1)
    expect(wsServerConn.eventsSent[0].type).toBe('error')
    expect(wsServerConn.eventsSent[0].message).toContain('Validation error')
  })
})
