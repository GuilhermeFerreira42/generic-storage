// server/src/agent/loop.ts
import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam, ToolUseBlock } from '@anthropic-ai/sdk/resources.js';
import { randomUUID } from 'crypto';
import type { ToolRegistry } from '../tools/registry.js';
import { SessionStore } from '../db/sessions.js';
import { SecretRedactor } from '../security/secretRedactor.js';
import { buildSystemPrompt } from './prompts.js';
import type { OutgoingMessageType } from '../ws/schemas.js';

export interface AgentLoopParams {
  userMessage: string;
  sessionId: string;
  workspacePath: string;
  toolRegistry: ToolRegistry;
  mode: 'plan' | 'auto_edit' | 'yolo';
  signal: AbortSignal;
  pendingApprovals: Map<string, { resolve: (approved: boolean) => void }>;
  onEvent: (msg: OutgoingMessageType) => void;
}

const MAX_ITERATIONS = 20;

/**
 * Loop agêntico ReAct com streaming e human-in-the-loop
 */
export async function runAgentLoop(params: AgentLoopParams): Promise<void> {
  const {
    userMessage,
    sessionId,
    workspacePath,
    toolRegistry,
    mode,
    signal,
    pendingApprovals,
    onEvent,
  } = params;

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const redactor = new SecretRedactor();
  const session = SessionStore.getOrCreate(sessionId, workspacePath);

  // Adiciona a mensagem do usuário ao histórico
  const safeUserMessage = redactor.redact(userMessage);
  session.messages.push({ role: 'user', content: safeUserMessage });

  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    // Verifica cancelamento antes de cada iteração
    if (signal.aborted) {
      throw new Error('AbortError');
    }

    iterations++;

    // Streaming de tokens para o frontend
    let accumulatedText = '';

    const stream = client.messages.stream({
      model: 'claude-sonnet-4-5',
      max_tokens: 8096,
      system: buildSystemPrompt(mode, workspacePath),
      messages: session.messages as MessageParam[],
      tools: toolRegistry.getAnthropicToolDefinitions(),
    });

    // Envia cada token individualmente para aparecer em tempo real no chat
    for await (const event of stream) {
      if (signal.aborted) throw new Error('AbortError');

      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        accumulatedText += event.delta.text;
        onEvent({
          type: 'agent_token',
          token: event.delta.text,
          sessionId,
        });
      }
    }

    // Obtém a resposta final completa com os tool_use blocks
    const finalMessage = await stream.finalMessage();

    if (accumulatedText) {
      onEvent({
        type: 'agent_thinking_done',
        fullText: accumulatedText,
        sessionId,
      });
    }

    const toolUseBlocks = finalMessage.content.filter(
      (b): b is ToolUseBlock => b.type === 'tool_use'
    );

    // Se não tem tool calls ou o modelo sinalizou fim, encerra
    if (toolUseBlocks.length === 0 || finalMessage.stop_reason === 'end_turn') {
      session.messages.push({ role: 'assistant', content: finalMessage.content });
      SessionStore.save(session);
      onEvent({
        type: 'agent_done',
        sessionId,
        summary: accumulatedText || 'Tarefa concluída.',
      });
      return;
    }

    const toolResults: Array<{
      type: 'tool_result';
      tool_use_id: string;
      content: string;
    }> = [];

    for (const toolCall of toolUseBlocks) {
      if (signal.aborted) throw new Error('AbortError');

      const actionId = randomUUID();
      const tool = toolRegistry.getTool(toolCall.name);

      if (!tool) {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolCall.id,
          content: `Ferramenta "${toolCall.name}" não encontrada no registry.`,
        });
        continue;
      }

      const input = toolCall.input as Record<string, unknown>;

      // Determina se precisa de aprovação
      const requiresApproval =
        mode === 'plan' ||
        (mode === 'auto_edit' && tool.isDestructive);

      if (requiresApproval) {
        const description = tool.describeAction(input);
        const diff = tool.previewDiff?.(input);

        onEvent({
          type: 'approval_required',
          actionId,
          toolName: toolCall.name,
          description,
          diff,
          sessionId,
        });

        const approved = await waitForApproval(pendingApprovals, actionId, signal);

        if (!approved) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolCall.id,
            content: 'Ação rejeitada pelo usuário. Tente uma abordagem diferente.',
          });
          continue;
        }
      } else {
        // Mesmo sem aprovação, avisa o frontend que a ferramenta está rodando
        onEvent({
          type: 'tool_call',
          actionId,
          toolName: toolCall.name,
          args: input,
          sessionId,
        });
      }

      // Executa a ferramenta
      let result: string;
      let isError = false;

      try {
        result = await tool.execute(input);
        result = redactor.redact(result);
      } catch (err) {
        result = `Erro ao executar ${toolCall.name}: ${(err as Error).message}`;
        isError = true;
      }

      onEvent({
        type: 'tool_result',
        actionId,
        result,
        isError,
        sessionId,
      });

      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolCall.id,
        content: result,
      });

      // Persiste o tool call no banco
      SessionStore.saveToolCall(sessionId, {
        id: actionId,
        toolName: toolCall.name,
        input,
        result,
        approved: requiresApproval ? true : null,
      });
    }

    // Adiciona assistant message e tool results ao histórico antes da próxima iteração
    session.messages.push({ role: 'assistant', content: finalMessage.content });
    session.messages.push({ role: 'user', content: toolResults });
  }

  onEvent({
    type: 'error',
    message: `Limite de ${MAX_ITERATIONS} iterações atingido. Reformule a tarefa.`,
    sessionId,
  });
}

/**
 * Promise que bloqueia até o usuário aprovar ou rejeitar
 */
function waitForApproval(
  pendingApprovals: Map<string, { resolve: (approved: boolean) => void }>,
  actionId: string,
  signal: AbortSignal,
): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    // Se o loop for cancelado enquanto espera, rejeita
    signal.addEventListener('abort', () => reject(new Error('AbortError')), { once: true });
    pendingApprovals.set(actionId, { resolve });
  });
}
