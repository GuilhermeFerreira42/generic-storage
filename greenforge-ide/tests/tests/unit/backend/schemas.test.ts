import { describe, it, expect } from 'vitest'
import { IncomingMessage, OutgoingMessage } from '@/server/src/ws/schemas'

describe('Zod Validation Schemas', () => {
  describe('IncomingMessage Schema', () => {
    it('parses valid chat_message successfully', () => {
      const payload = {
        type: 'chat_message',
        sessionId: '12345678-1234-1234-1234-1234567890ab',
        content: 'Olá, crie uma função de soma.',
        mode: 'plan',
        workspacePath: '/workspace',
        auth_token: 'valid-token'
      }

      const result = IncomingMessage.safeParse(payload)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.type).toBe('chat_message')
      }
    })

    it('rejects chat_message with invalid uuid sessionId', () => {
      const payload = {
        type: 'chat_message',
        sessionId: 'not-a-uuid',
        content: 'some content',
        workspacePath: '/workspace'
      }

      const result = IncomingMessage.safeParse(payload)
      expect(result.success).toBe(false)
    })

    it('rejects chat_message with empty content', () => {
      const payload = {
        type: 'chat_message',
        sessionId: '12345678-1234-1234-1234-1234567890ab',
        content: '',
        workspacePath: '/workspace'
      }

      const result = IncomingMessage.safeParse(payload)
      expect(result.success).toBe(false)
    })

    it('parses valid approve_action', () => {
      const payload = {
        type: 'approve_action',
        actionId: '12345678-1234-1234-1234-1234567890ab',
        approved: true
      }

      const result = IncomingMessage.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('parses switch_mode with correct modes', () => {
      const payload = {
        type: 'switch_mode',
        sessionId: '12345678-1234-1234-1234-1234567890ab',
        mode: 'yolo'
      }

      const result = IncomingMessage.safeParse(payload)
      expect(result.success).toBe(true)

      const badPayload = { ...payload, mode: 'invalid_mode' }
      const badResult = IncomingMessage.safeParse(badPayload)
      expect(badResult.success).toBe(false)
    })
  })

  describe('OutgoingMessage Schema', () => {
    it('parses valid agent_token successfully', () => {
      const payload = {
        type: 'agent_token',
        token: 'const',
        sessionId: 'session-id-123'
      }

      const result = OutgoingMessage.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('parses valid approval_required payload', () => {
      const payload = {
        type: 'approval_required',
        actionId: 'action-123',
        toolName: 'write_file',
        diff: '+ lineToAdd',
        description: 'modificando index.ts',
        sessionId: 'session-123'
      }

      const result = OutgoingMessage.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('parses valid error payload', () => {
      const payload = {
        type: 'error',
        message: 'Something went wrong',
        sessionId: 'session-id'
      }

      const result = OutgoingMessage.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('rejects outgoing payload with incorrect type discriminator', () => {
      const payload = {
        type: 'non_existent_outgoing_type',
        sessionId: 'session-id'
      }

      const result = OutgoingMessage.safeParse(payload)
      expect(result.success).toBe(false)
    })
  })
})
