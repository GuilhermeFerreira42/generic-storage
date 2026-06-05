import { useState, useCallback } from 'react'
import { useIDEStore } from '@/lib/store'
import { useWebSocket, WSMessage } from './useWebSocket'
import { useDebateStore } from '@/store/debateStore'

interface AgentMessage {
  role: 'user' | 'assistant' | 'system' | 'proposer' | 'critic' | 'judge'
  content: string
  sessionId?: string
}

export function useAgentWebSocket() {
  const [isConnected, setIsConnected] = useState(false)
  const ideStore = useIDEStore()
  const debateStore = useDebateStore()
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'

  const handleMessage = useCallback((message: WSMessage) => {
    if (message.type === 'server_message') {
      const payload = message.payload as AgentMessage
      ideStore.addMessage({
        role: payload.role,
        content: payload.content,
        agentName: payload.role !== 'user' ? payload.role.charAt(0).toUpperCase() + payload.role.slice(1) : undefined
      })

      if (payload.role === 'proposer' || payload.role === 'critic' || payload.role === 'judge') {
        debateStore.addMessageToken(payload.role, payload.role, payload.content, true)
      }
    } else if (message.type === 'error') {
      ideStore.addMessage({
        role: 'system',
        content: `Erro: ${message.error}`,
        agentName: 'Sistema'
      })
    } else if (message.type === 'info') {
      if (message.sessionId) {
        ideStore.startDebate(message.sessionId)
      }
    }
  }, [ideStore, debateStore])

  const handleError = useCallback((error: Event) => {
    console.error('[AgentWebSocket] Error:', error)
    setIsConnected(false)
  }, [])

  const handleOpen = useCallback(() => {
    console.log('[AgentWebSocket] Connected')
    setIsConnected(true)
  }, [])

  const handleClose = useCallback(() => {
    console.log('[AgentWebSocket] Disconnected')
    setIsConnected(false)
  }, [])

  const { isConnected: wsConnected, sendMessage, connect, disconnect } = useWebSocket({
    url: wsUrl,
    onMessage: handleMessage,
    onError: handleError,
    onOpen: handleOpen,
    onClose: handleClose,
    reconnectInterval: 3000,
    maxReconnectAttempts: 5
  })

  const sendUserMessage = useCallback((content: string) => {
    const message: Omit<WSMessage, 'type'> & { type?: string } = {
      type: 'client_message',
      payload: {
        role: 'user',
        content
      }
    }
    sendMessage(message)
  }, [sendMessage])

  const stopDebate = useCallback(() => {
    sendMessage({ type: 'stop_session' })
    debateStore.setStatus('ABORTED')
    ideStore.stopDebate()
  }, [sendMessage, debateStore, ideStore])

  return {
    isConnected: wsConnected,
    sendUserMessage,
    stopDebate,
    connect,
    disconnect
  }
}
