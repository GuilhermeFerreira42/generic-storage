// server/src/websocket/WebSocketServer.ts
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { SessionService } from '../services/sessionService.js';
import { AgentLoop } from '../agent/AgentLoop.js';

export interface WebSocketMessage {
  type: string;
  sessionId?: string;
  payload?: any;
}

export class GreenForgeWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocket> = new Map(); // sessionId -> WebSocket
  private agentLoops: Map<string, AgentLoop> = new Map(); // sessionId -> AgentLoop

  constructor(server: http.Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws'
    });

    this.wss.on('connection', (ws, request) => {
      this.handleConnection(ws, request);
    });

    console.log('[WebSocket] Servidor WebSocket inicializado no caminho /ws');
  }

  private handleConnection(ws: WebSocket, request: http.IncomingMessage): void {
    const sessionId = request.url?.split('?sessionId=')[1] || null;

    ws.on('open', () => {
      console.log('[WebSocket] Cliente conectado');
      
      if (sessionId && SessionService.isActiveSession(sessionId)) {
        this.clients.set(sessionId, ws);
        
        // Envia confirmação de conexão
        this.sendToClient(ws, {
          type: 'connected',
          sessionId,
          payload: { message: 'Conectado ao GreenForge Server' }
        });

        console.log(`[WebSocket] Sessão ${sessionId} associada à conexão`);
      } else {
        // Cria uma nova sessão se não foi fornecida ou é inválida
        const newSession = SessionService.createSession();
        this.clients.set(newSession.id, ws);
        
        this.sendToClient(ws, {
          type: 'connected',
          sessionId: newSession.id,
          payload: { 
            message: 'Nova sessão criada',
            session: newSession
          }
        });

        console.log(`[WebSocket] Nova sessão ${newSession.id} criada`);
      }
    });

    ws.on('message', (data: Buffer) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());
        this.handleMessage(ws, message);
      } catch (error) {
        console.error('[WebSocket] Erro ao processar mensagem:', error);
        this.sendToClient(ws, {
          type: 'error',
          payload: { message: 'Erro ao processar mensagem', error: error instanceof Error ? error.message : 'Unknown error' }
        });
      }
    });

    ws.on('close', () => {
      console.log('[WebSocket] Cliente desconectado');
      
      // Encontra e remove a sessão associada
      for (const [sid, client] of this.clients.entries()) {
        if (client === ws) {
          this.clients.delete(sid);
          
          // Finaliza o agent loop se existir
          const agentLoop = this.agentLoops.get(sid);
          if (agentLoop) {
            agentLoop.stop();
            this.agentLoops.delete(sid);
          }
          
          // Opcional: fechar a sessão ou apenas manter o histórico
          // SessionService.closeSession(sid, 'paused');
          
          break;
        }
      }
    });

    ws.on('error', (error) => {
      console.error('[WebSocket] Erro na conexão:', error);
    });
  }

  private handleMessage(ws: WebSocket, message: WebSocketMessage): void {
    const { type, sessionId, payload } = message;

    // Tenta encontrar o sessionId da mensagem ou usa o associado à conexão
    let effectiveSessionId = sessionId;
    
    if (!effectiveSessionId) {
      for (const [sid, client] of this.clients.entries()) {
        if (client === ws) {
          effectiveSessionId = sid;
          break;
        }
      }
    }

    if (!effectiveSessionId) {
      this.sendToClient(ws, {
        type: 'error',
        payload: { message: 'Sessão não encontrada. Forneça um sessionId.' }
      });
      return;
    }

    // Valida que a sessão existe
    if (!SessionService.isActiveSession(effectiveSessionId)) {
      this.sendToClient(ws, {
        type: 'error',
        payload: { message: `Sessão ${effectiveSessionId} não está ativa` }
      });
      return;
    }

    switch (type) {
      case 'user_message':
        this.handleUserMessage(effectiveSessionId, payload);
        break;

      case 'cancel':
        this.handleCancel(effectiveSessionId);
        break;

      case 'get_history':
        this.handleGetHistory(effectiveSessionId);
        break;

      default:
        this.sendToClient(ws, {
          type: 'error',
          payload: { message: `Tipo de mensagem desconhecido: ${type}` }
        });
    }
  }

  private async handleUserMessage(sessionId: string, payload: { content: string }): Promise<void> {
    const ws = this.clients.get(sessionId);
    if (!ws) {
      console.error(`[WebSocket] Cliente para sessão ${sessionId} não encontrado`);
      return;
    }

    const { content } = payload;

    // Salva a mensagem do usuário
    SessionService.addMessage(sessionId, 'user', content);

    // Envia confirmação
    this.sendToClient(ws, {
      type: 'message_saved',
      sessionId,
      payload: { role: 'user', content }
    });

    // Inicia ou obtém o agent loop para esta sessão
    let agentLoop = this.agentLoops.get(sessionId);
    if (!agentLoop) {
      agentLoop = new AgentLoop(sessionId, (event) => this.handleAgentEvent(sessionId, event));
      this.agentLoops.set(sessionId, agentLoop);
    }

    // Processa a mensagem com o agente
    try {
      await agentLoop.processMessage(content);
    } catch (error) {
      console.error(`[AgentLoop] Erro ao processar mensagem para sessão ${sessionId}:`, error);
      this.sendToClient(ws, {
        type: 'agent_error',
        sessionId,
        payload: { 
          message: 'Erro ao processar mensagem com o agente',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  private handleAgentEvent(sessionId: string, event: { type: string; payload: any }): void {
    const ws = this.clients.get(sessionId);
    if (!ws) return;

    const { type, payload } = event;

    // Salva mensagens do assistente no banco
    if (type === 'assistant_message' && payload.content) {
      SessionService.addMessage(sessionId, 'assistant', payload.content);
    }

    // Encaminha o evento para o cliente
    this.sendToClient(ws, {
      type,
      sessionId,
      payload
    });
  }

  private handleCancel(sessionId: string): void {
    const agentLoop = this.agentLoops.get(sessionId);
    if (agentLoop) {
      agentLoop.stop();
      this.agentLoops.delete(sessionId);
      
      const ws = this.clients.get(sessionId);
      if (ws) {
        this.sendToClient(ws, {
          type: 'cancelled',
          sessionId,
          payload: { message: 'Operação cancelada pelo usuário' }
        });
      }
    }
  }

  private handleGetHistory(sessionId: string): void {
    const ws = this.clients.get(sessionId);
    if (!ws) return;

    const history = SessionService.getMessageHistory(sessionId);
    
    this.sendToClient(ws, {
      type: 'history',
      sessionId,
      payload: { messages: history }
    });
  }

  private sendToClient(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  public broadcast(message: WebSocketMessage): void {
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  public getClientCount(): number {
    return this.clients.size;
  }

  public close(): void {
    // Para todos os agent loops
    for (const agentLoop of this.agentLoops.values()) {
      agentLoop.stop();
    }
    this.agentLoops.clear();

    // Fecha todas as conexões
    this.wss.clients.forEach((client) => {
      client.close();
    });

    this.wss.close();
    console.log('[WebSocket] Servidor WebSocket fechado');
  }
}
