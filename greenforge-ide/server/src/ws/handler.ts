// server/src/ws/handler.ts
import { WebSocket } from 'ws';
import { randomUUID } from 'crypto';
import { IncomingMessage, OutgoingMessageType } from './schemas.js';
import { runAgentLoop } from '../agent/loop.js';
import { buildToolRegistry } from '../tools/registry.js';
import { executeTerminalCommand } from '../tools/shell/executeCommand.js';
import { SessionStore } from '../db/sessions.js';

/**
 * Map global de approvals pendentes
 * chave: actionId, valor: { resolve: (approved: boolean) => void }
 */
export const pendingApprovals = new Map<string, {
  resolve: (approved: boolean) => void;
}>();

/**
 * Map de AbortControllers para permitir cancelar loops ativos
 * chave: sessionId
 */
const activeLoops = new Map<string, AbortController>();

export function handleWSConnection(ws: WebSocket): void {
  console.error('[WS] Nova conexão estabelecida');

  /**
   * Função helper para enviar mensagem tipada ao cliente
   */
  function send(msg: OutgoingMessageType): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  ws.on('message', async (raw) => {
    let parsed: unknown;

    // Parse do JSON
    try {
      parsed = JSON.parse(raw.toString());
    } catch {
      send({ type: 'error', message: 'Mensagem inválida: não é JSON.' });
      return;
    }

    // Validação com Zod
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
        // Cancela qualquer loop ativo da mesma sessão
        activeLoops.get(msg.sessionId)?.abort();

        const controller = new AbortController();
        activeLoops.set(msg.sessionId, controller);

        const toolRegistry = buildToolRegistry(msg.workspacePath);

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
