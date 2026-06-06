// server/src/ws/handler.ts
import { WebSocket } from 'ws';
import { randomUUID } from 'crypto';
import { IncomingMessage, OutgoingMessageType } from './schemas.js';
import { runAgentLoop } from '../agent/loop.js';
import { buildToolRegistry } from '../tools/registry.js';
import { executeTerminalCommand } from '../tools/shell/executeCommand.js';
import { SessionStore } from '../db/sessions.js';

// Map global de approvals pendentes
// chave: actionId, valor: { resolve: (approved: boolean) => void }
export const pendingApprovals = new Map<string, {
  resolve: (approved: boolean) => void;
}>();

// Map de abortControllers para permitir cancelar loops ativos
const activeLoops = new Map<string, AbortController>();

export function handleWSConnection(ws: WebSocket): void {
  console.error('[WS] Nova conexão estabelecida');

  // Função helper para enviar mensagem tipada ao cliente
  function send(msg: OutgoingMessageType): void {
    const OPEN = 1; // WebSocket.OPEN = 1
    if (ws.readyState === OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  ws.on('message', async (raw) => {
    let parsed: unknown;

    try {
      parsed = JSON.parse(raw.toString());
    } catch {
      send({ type: 'error', message: 'Mensagem inválida: não é JSON.' });
      return;
    }

    const result = IncomingMessage.safeParse(parsed);

    if (!result.success) {
      send({
        type: 'error',
        message: `Schema inválido: ${result.error.message}`,
      });
      return;
    }

    const msg = result.data;

    switch (msg.type) {

      case 'chat_message': {
        if (!msg.auth_token) {
          send({
            type: 'error',
            message: 'Não autenticado',
            sessionId: msg.sessionId
          });
          return;
        }

        if (msg.content.trim() === '/help') {
          send({
            type: 'agent_event',
            event: 'message',
            data: 'Comandos disponíveis: /help, /reset',
            sessionId: msg.sessionId
          });
          return;
        }

        if (msg.content.trim() === '/reset') {
          SessionStore.clearSession(msg.sessionId);
          send({
            type: 'agent_event',
            event: 'message',
            data: 'Sessão resetada com sucesso.',
            sessionId: msg.sessionId
          });
          return;
        }

        // Cancela qualquer loop ativo da mesma sessão
        activeLoops.get(msg.sessionId)?.abort();

        const controller = new AbortController();
        activeLoops.set(msg.sessionId, controller);

        const toolRegistry = buildToolRegistry(msg.workspacePath);
        const session = SessionStore.getOrCreate(msg.sessionId, msg.workspacePath);

        // Se a sessão já tem mensagens, envia o histórico para o frontend
        if (session?.messages && session.messages.length > 0) {
          send({
            type: 'session_history',
            messages: session.messages,
            sessionId: msg.sessionId
          });
        }

        // Roda o loop em background sem bloquear o handler
        runAgentLoop({
          userMessage: msg.content,
          sessionId: msg.sessionId,
          workspacePath: msg.workspacePath,
          toolRegistry,
          mode: msg.mode,
          signal: controller.signal,
          pendingApprovals,
          onEvent: send,
        }).catch((err) => {
          if (err.name !== 'AbortError') {
            console.error('[AgentLoop] Erro:', err);
            send({
              type: 'error',
              message: `Erro interno: ${err.message}`,
              sessionId: msg.sessionId,
            });
          }
        }).finally(() => {
          activeLoops.delete(msg.sessionId);
        });

        break;
      }

      case 'approve_action': {
        const pending = pendingApprovals.get(msg.actionId);
        if (pending) {
          pending.resolve(msg.approved);
          pendingApprovals.delete(msg.actionId);
        }
        break;
      }

      case 'cancel_agent': {
        activeLoops.get(msg.sessionId)?.abort();
        activeLoops.delete(msg.sessionId);
        send({ type: 'agent_done', sessionId: msg.sessionId, summary: 'Cancelado pelo usuário.' });
        break;
      }

      case 'terminal_command': {
        // Integração real do terminal - descrita na Fase 3
        const output = await executeTerminalCommand({
          command: msg.command,
          workingDirectory: msg.workspacePath,
          mode: 'auto_edit', // terminal manual sempre pede confirmação em comandos destrutivos
          onApprovalNeeded: async (description) => {
            const actionId = randomUUID();
            send({
              type: 'approval_required',
              actionId,
              toolName: 'execute_shell_command',
              description,
              sessionId: msg.sessionId,
            });
            return new Promise<boolean>((resolve) => {
              pendingApprovals.set(actionId, { resolve });
            });
          },
        });

        send({
          type: 'terminal_output',
          data: output.stdout + (output.stderr ? `\nSTDERR: ${output.stderr}` : ''),
          isError: output.exitCode !== 0,
          sessionId: msg.sessionId,
        });
        break;
      }

      case 'switch_mode': {
        SessionStore.updateMode(msg.sessionId, msg.mode);
        break;
      }

      case 'create_checkpoint': {
        SessionStore.createCheckpoint(msg.sessionId, msg.description);
        break;
      }
    }
  });

  ws.on('close', () => {
    console.error('[WS] Conexão encerrada');
  });

  ws.on('error', (err) => {
    console.error('[WS] Erro de conexão:', err.message);
  });
}
