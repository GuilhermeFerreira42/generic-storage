// server/src/services/sessionService.ts
import { v4 as uuidv4 } from 'uuid';
import { SessionRepository } from '../db/repositories/sessionRepository.js';
import { MessageRepository } from '../db/repositories/messageRepository.js';
import { Session, SessionStatus, Message } from '../types/session.js';

export class SessionService {
  /**
   * Cria uma nova sessão
   */
  static createSession(projectPath?: string): Session {
    const session: Session = {
      id: uuidv4(),
      createdAt: Math.floor(Date.now() / 1000),
      updatedAt: Math.floor(Date.now() / 1000),
      status: 'active',
      projectPath,
      metadata: {}
    };

    SessionRepository.create(session);
    return session;
  }

  /**
   * Obtém uma sessão por ID
   */
  static getSession(sessionId: string): Session | null {
    return SessionRepository.findById(sessionId);
  }

  /**
   * Atualiza uma sessão
   */
  static updateSession(sessionId: string, updates: Partial<Session>): Session | null {
    return SessionRepository.update(sessionId, updates);
  }

  /**
   * Finaliza uma sessão
   */
  static closeSession(sessionId: string, status: SessionStatus = 'completed'): Session | null {
    return SessionRepository.update(sessionId, { status });
  }

  /**
   * Lista sessões ativas
   */
  static listActiveSessions(): Session[] {
    return SessionRepository.listActive();
  }

  /**
   * Deleta uma sessão e todos os seus dados relacionados
   */
  static deleteSession(sessionId: string): boolean {
    // Deleta mensagens primeiro (cascade já faz isso, mas explicitamos)
    MessageRepository.deleteBySessionId(sessionId);
    return SessionRepository.delete(sessionId);
  }

  /**
   * Adiciona uma mensagem à sessão
   */
  static addMessage(sessionId: string, role: Message['role'], content: string, toolCalls?: any[], toolResults?: any[]): Message {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Sessão ${sessionId} não encontrada`);
    }

    if (session.status !== 'active') {
      throw new Error(`Sessão ${sessionId} não está ativa (status: ${session.status})`);
    }

    const message: Message = {
      sessionId,
      role,
      content,
      timestamp: Math.floor(Date.now() / 1000),
      toolCalls,
      toolResults
    };

    return MessageRepository.create(message);
  }

  /**
   * Obtém o histórico de mensagens de uma sessão
   */
  static getMessageHistory(sessionId: string): Message[] {
    return MessageRepository.findBySessionId(sessionId);
  }

  /**
   * Verifica se uma sessão existe e está ativa
   */
  static isActiveSession(sessionId: string): boolean {
    const session = this.getSession(sessionId);
    return session !== null && session.status === 'active';
  }
}
