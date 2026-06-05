// src/hooks/useAgentSocket.ts
import { useEffect, useRef, useCallback } from 'react';
import { useAgentStore } from '../store/agentStore'; // adjusted path based on project structure

const WS_URL = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_WS_URL)
  ? process.env.NEXT_PUBLIC_WS_URL
  : 'ws://localhost:3001';
const RECONNECT_DELAY_MS = 3000;

export function useAgentSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
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

      switch (msg.type) {
        case 'agent_token':
          addToken(msg.token as string, msg.sessionId as string);
          break;
        case 'agent_thinking_done':
          finalizeMessage(msg.fullText as string, msg.sessionId as string);
          break;
        case 'tool_call':
          addToolEvent({ type: 'call', ...msg });
          break;
        case 'approval_required':
          setApprovalRequired(msg);
          break;
        case 'tool_result':
          addToolEvent({ type: 'result', ...msg });
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
          break;
      }
    };
  }, [setConnected, addToken, finalizeMessage, setApprovalRequired, addToolEvent]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
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
