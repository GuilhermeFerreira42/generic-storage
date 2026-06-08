import { GoogleGenAI } from '@google/genai';
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

  let apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    onEvent({
      type: 'error',
      message: '❌ Chave de API não configurada. Defina GEMINI_API_KEY ou GOOGLE_API_KEY no arquivo .env e reinicie o servidor.',
      sessionId,
    });
    return;
  }
  const ai = new GoogleGenAI({ apiKey });

  const redactor = new SecretRedactor();
  const session = SessionStore.getOrCreate(sessionId, workspacePath);

  // Adiciona a mensagem do usuário ao histórico (converte pra formato Gemini)
  const safeUserMessage = redactor.redact(userMessage);
  // Remove messages in authropic format in case they exist from the db, though we handle session differently now
  // We should just map it directly.
  const isAnthropic = session.messages.length > 0 && !(session.messages[0] as any).parts;
  if (isAnthropic) {
     session.messages = [];
  }

  session.messages.push({ role: 'user', parts: [{ text: safeUserMessage }] } as any);

  let iterations = 0;

  const tools = toolRegistry.getGeminiToolDefinitions();
  
  while (iterations < MAX_ITERATIONS) {
    if (signal.aborted) throw new Error('AbortError');
    iterations++;
    
    let accumulatedText = '';
    
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: session.messages as any,
      config: {
        systemInstruction: buildSystemPrompt(mode, workspacePath),
        tools: tools && tools.length > 0 ? [{ functionDeclarations: tools }] : undefined
      }
    });

    let functionCalls: any[] = [];
    
    for await (const chunk of responseStream) {
      if (signal.aborted) throw new Error('AbortError');
      if (chunk.text) {
        accumulatedText += chunk.text;
        onEvent({
          type: 'agent_token',
          token: chunk.text,
          sessionId,
        });
      }
      if (chunk.functionCalls) {
        functionCalls.push(...chunk.functionCalls);
      }
    }

    if (accumulatedText) {
      onEvent({
        type: 'agent_thinking_done',
        fullText: accumulatedText,
        sessionId,
      });
    }

    if (functionCalls.length === 0) {
      session.messages.push({ role: 'model', parts: [{ text: accumulatedText || '' }] } as any);
      SessionStore.save(session);
      onEvent({
        type: 'agent_done',
        sessionId,
        summary: accumulatedText || 'Tarefa concluída.',
      });
      return;
    }

    session.messages.push({ role: 'model', parts: functionCalls.map(c => ({ functionCall: c })) } as any);
    
    const toolResults: any[] = [];

    for (const toolCall of functionCalls) {
      if (signal.aborted) throw new Error('AbortError');

      const actionId = randomUUID();
      const toolName = toolCall.name;
      const tool = toolRegistry.getTool(toolName);

      if (!tool) {
        toolResults.push({
          functionResponse: {
            name: toolName,
            response: { error: `Ferramenta "${toolName}" não encontrada no registry.` }
          }
        });
        continue;
      }

      const input = toolCall.args || {};

      const requiresApproval = mode === 'plan' || (mode === 'auto_edit' && tool.isDestructive);

      if (requiresApproval) {
        const description = tool.describeAction(input as any);
        const diff = tool.previewDiff?.(input as any);

        onEvent({
          type: 'approval_required',
          actionId,
          toolName: toolName,
          description,
          diff,
          sessionId,
        });

        const approved = await waitForApproval(pendingApprovals, actionId, signal);

        if (!approved) {
           toolResults.push({
            functionResponse: {
              name: toolName,
              response: { error: 'Ação rejeitada pelo usuário. Tente uma abordagem diferente.' }
            }
          });
          continue;
        }
      } else {
        onEvent({
          type: 'tool_call',
          actionId,
          toolName: toolName,
          args: input,
          sessionId,
        });
      }

      let result: string;
      let isError = false;

      try {
        result = await tool.execute(input as any);
        result = redactor.redact(result);
      } catch (err) {
        result = `Erro ao executar ${toolName}: ${(err as Error).message}`;
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
        functionResponse: {
          name: toolName,
          response: { result }
        }
      });

      SessionStore.saveToolCall(sessionId, {
        id: actionId,
        toolName: toolName,
        input: input as any,
        result,
        approved: requiresApproval ? true : null,
      });
    }

    session.messages.push({ role: 'user', parts: toolResults } as any);
  }

  onEvent({
    type: 'error',
    message: `Limite de ${MAX_ITERATIONS} iterações atingido. Reformule a tarefa.`,
    sessionId,
  });
}

function waitForApproval(
  pendingApprovals: Map<string, { resolve: (approved: boolean) => void }>,
  actionId: string,
  signal: AbortSignal,
): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('AbortError')), { once: true });
    pendingApprovals.set(actionId, { resolve });
  });
}
