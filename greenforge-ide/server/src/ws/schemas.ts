// server/src/ws/schemas.ts
import { z } from 'zod';

/**
 * Schemas Zod para validação de mensagens WebSocket
 * Este arquivo define o contrato de comunicação entre frontend e backend
 */

export const IncomingMessage = z.discriminatedUnion('type', [
  // Mensagem de chat do usuário
  z.object({
    type: z.literal('chat_message'),
    sessionId: z.string().uuid(),
    content: z.string().min(1).max(32000),
    mode: z.enum(['plan', 'auto_edit', 'yolo']).default('auto_edit'),
    workspacePath: z.string(),
  }),
  // Aprovação ou rejeição de ação
  z.object({
    type: z.literal('approve_action'),
    actionId: z.string().uuid(),
    approved: z.boolean(),
  }),
  // Cancelar execução do agente
  z.object({
    type: z.literal('cancel_agent'),
    sessionId: z.string().uuid(),
  }),
  // Trocar modo de execução
  z.object({
    type: z.literal('switch_mode'),
    sessionId: z.string().uuid(),
    mode: z.enum(['plan', 'auto_edit', 'yolo']),
  }),
  // Comando do terminal
  z.object({
    type: z.literal('terminal_command'),
    sessionId: z.string().uuid(),
    command: z.string(),
    workspacePath: z.string(),
  }),
  // Criar checkpoint da sessão
  z.object({
    type: z.literal('create_checkpoint'),
    sessionId: z.string().uuid(),
    description: z.string(),
  }),
]);

export const OutgoingMessage = z.discriminatedUnion('type', [
  // Token de streaming do LLM
  z.object({
    type: z.literal('agent_token'),
    token: z.string(),
    sessionId: z.string(),
  }),
  // Fim do streaming, texto completo
  z.object({
    type: z.literal('agent_thinking_done'),
    fullText: z.string(),
    sessionId: z.string(),
  }),
  // Chamada de ferramenta sendo executada
  z.object({
    type: z.literal('tool_call'),
    actionId: z.string(),
    toolName: z.string(),
    args: z.record(z.unknown()),
    sessionId: z.string(),
  }),
  // Ação requer aprovação do usuário
  z.object({
    type: z.literal('approval_required'),
    actionId: z.string(),
    toolName: z.string(),
    diff: z.string().optional(),
    description: z.string(),
    sessionId: z.string(),
  }),
  // Resultado da execução de ferramenta
  z.object({
    type: z.literal('tool_result'),
    actionId: z.string(),
    result: z.string(),
    isError: z.boolean(),
    sessionId: z.string(),
  }),
  // Agente finalizou execução
  z.object({
    type: z.literal('agent_done'),
    sessionId: z.string(),
    summary: z.string(),
  }),
  // Output do terminal
  z.object({
    type: z.literal('terminal_output'),
    data: z.string(),
    isError: z.boolean(),
    sessionId: z.string(),
  }),
  // Lista de sessões disponíveis
  z.object({
    type: z.literal('session_list'),
    sessions: z.array(z.object({
      id: z.string(),
      title: z.string().nullable(),
      createdAt: z.number(),
      updatedAt: z.number(),
    })),
  }),
  // Erro genérico
  z.object({
    type: z.literal('error'),
    message: z.string(),
    sessionId: z.string().optional(),
  }),
]);

export type IncomingMessageType = z.infer<typeof IncomingMessage>;
export type OutgoingMessageType = z.infer<typeof OutgoingMessage>;
