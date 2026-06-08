// src/hooks/useAgentSocket.ts
import { useEffect, useRef, useCallback } from 'react';
import { useAgentStore } from '../store/agentStore';
import { useIDEStore } from '../lib/store';

const WS_URL = typeof window !== 'undefined'
  ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
  : 'ws://localhost:3000/ws';
const RECONNECT_DELAY_MS = 3000;

export function useAgentSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isConnected, setConnected, addToken, finalizeMessage, setApprovalRequired, addToolEvent, sessionId } = useAgentStore();

  const connect = useCallback(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      console.log('[WS] Conectado ao GreenForge backend');
    };

    ws.onclose = () => {
      setConnected(false);
      console.log('[WS] Desconectado. Reconectando em 3s...');
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
    };

    ws.onerror = () => {
      // onclose vai disparar logo após, então apenas logamos
      console.error('[WS] Erro na conexão');
    };

    ws.onmessage = (event) => {
      let msg: Record<string, any>;
      try {
        msg = JSON.parse(event.data as string);
      } catch {
        return;
      }

      const ideStore = (useIDEStore as any).getState();

      switch (msg.type) {
        case 'agent_token':
          addToken(msg.token as string, msg.sessionId as string);
          if (ideStore.messages.length > 0 && ideStore.messages[ideStore.messages.length - 1].isStreaming) {
            ideStore.updateLastMessage(ideStore.messages[ideStore.messages.length - 1].content + msg.token);
          } else {
            ideStore.addMessage({
              role: 'assistant',
              content: msg.token,
              agentName: 'GreenForge Agent',
              isStreaming: true
            });
          }
          break;
        case 'agent_thinking_done':
          finalizeMessage(msg.fullText as string, msg.sessionId as string);
          ideStore.updateLastMessage(msg.fullText);
          // Set isStreaming to false for the last message
          const lastMsg = ideStore.messages[ideStore.messages.length - 1];
          if (lastMsg && lastMsg.isStreaming) {
            const updatedMessages = [...ideStore.messages];
            updatedMessages[updatedMessages.length - 1] = { ...lastMsg, isStreaming: false };
            (useIDEStore as any).setState({ messages: updatedMessages });
          }
          break;
        case 'agent_event':
          if (msg.event === 'message') {
            ideStore.addMessage({
              role: 'system',
              content: msg.data,
              agentName: 'Sistema'
            });
          }
          break;
        case 'session_history':
          if (msg.messages && msg.messages.length > 0) {
            const mappedMessages = msg.messages.map((m: any) => ({
              id: Math.random().toString(36).substring(2, 11),
              role: m.role,
              content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
              timestamp: Date.now(),
              agentName: m.role === 'assistant' ? 'GreenForge Agent' : undefined
            }));
            (useIDEStore as any).setState({ messages: mappedMessages });
          }
          break;
        case 'tool_call':
          addToolEvent({ type: 'call', ...msg } as any);
          break;
        case 'approval_required':
          setApprovalRequired(msg as any);
          break;
        case 'tool_result':
          addToolEvent({ type: 'result', ...msg } as any);
          break;
        case 'agent_done':
          finalizeMessage(msg.summary as string, msg.sessionId as string);
          break;
        case 'terminal_output':
          // Emite para o TerminalPanel via store ou evento
          window.dispatchEvent(new CustomEvent('terminal-output', { detail: msg }));
          break;
        case 'error':
          console.error('[Agent] Erro:', msg.message);
          ideStore.addMessage({
            role: 'system',
            content: `⚠️ ${msg.message || 'Ocorreu um erro no servidor.'}`,
            agentName: 'Sistema',
          });
          // Garante que o indicador de streaming seja encerrado
          finalizeMessage('', msg.sessionId as string);
          break;
      }
    };
  }, [setConnected, addToken, finalizeMessage, setApprovalRequired, addToolEvent]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendMessage = useCallback((payload: Record<string, any>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    } else {
      console.warn('[WS] Tentativa de envio com conexão fechada');
    }
  }, []);

  const sendUserMessage = useCallback((content: string, workspacePath: string = '.', mode: string = 'auto_edit') => {
    const sId = sessionId || self.crypto.randomUUID();
    sendMessage({
      type: 'chat_message',
      sessionId: sId,
      content,
      mode,
      workspacePath
    });
  }, [sendMessage, sessionId]);

  const stopDebate = useCallback(() => {
    if (sessionId) {
      sendMessage({
        type: 'cancel_agent',
        sessionId
      });
    }
  }, [sendMessage, sessionId]);

  return { sendMessage, sendUserMessage, stopDebate, isConnected, sessionId };
}
