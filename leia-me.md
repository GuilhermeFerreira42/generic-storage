Cara, que feedback preciso. Você acertou em cheio em cada ponto. Agora aqui está a versão revisada e completa, com tudo que você pediu incorporado.

---

# GreenForge — Especificação Técnica de Evolução Arquitetural

## Versão 2.0 | Documento autocontido para implementação por IA construtora

---

## O que o GreenForge é hoje

Antes de qualquer implementação, a IA construtora precisa entender com clareza o estado atual do projeto para não reescrever o que já funciona.

O GreenForge hoje é uma IDE web construída em React. Ela tem um Monaco Editor integrado como área principal de edição de código, um terminal simulado usando xterm.js que aceita comandos internos mas não executa nada de verdade no sistema operacional do usuário, um sistema de arquivos virtual inteiramente armazenado em localStorage do navegador sem nenhum backend real por trás, um conjunto de stores gerenciados com Zustand para estado global da aplicação como arquivos abertos, abas ativas e estado do agente, um modal de aprovação com DiffEditor que já funciona e mostra as diferenças entre o conteúdo atual e o proposto antes de aceitar uma mudança, e um chat conectado a um agente completamente mockado que retorna respostas simuladas sem chamar nenhuma API de LLM real. Não existe nenhum processo Node.js rodando como servidor. Não existe nenhum loop agêntico real. Não existe persistência além do que o localStorage suporta.

A estratégia geral de toda a evolução é a seguinte: manter o frontend exatamente como está, porque os componentes visuais já estão no lugar certo, e construir um backend em Node.js que vai ser o motor real do sistema. Esse backend vai se comunicar com o frontend via WebSocket, vai chamar LLMs de verdade, vai executar ferramentas no sistema de arquivos e no shell, vai persistir sessões em SQLite local, e vai expor extensibilidade via MCP. Nenhuma linha do frontend precisa ser apagada, apenas adaptada para apontar para o backend real em vez do mock.

---

## Fase 1 — Backend Real com Express e WebSocket

Esta é a fase zero de tudo. Sem ela, nenhuma das fases seguintes tem onde viver.

Crie uma pasta chamada `server` na raiz do projeto, no mesmo nível que a pasta `src` do frontend. Dentro dela, crie um `package.json` separado. Isso é intencional porque o servidor vai ter dependências de execução de sistema operacional que não pertencem ao bundle do React.

Instale as seguintes dependências dentro da pasta `server`:

```bash
npm install express ws cors dotenv better-sqlite3 zod tsx
npm install -D @types/express @types/ws @types/better-sqlite3 @types/node typescript
```

O TypeScript 4.9 ou superior é suportado, e o Node.js 20 LTS ou posterior é o ambiente de execução recomendado.

A estrutura de diretórios dentro de `server/src/` deve ser organizada assim:

```
server/
  src/
    index.ts              ← ponto de entrada
    agent/
      loop.ts             ← loop agêntico ReAct
      prompts.ts          ← system prompts por modo
    tools/
      registry.ts         ← Tool Registry central
      types.ts            ← interface Tool
      filesystem/
        readFile.ts
        writeFile.ts
        listDirectory.ts
        searchInFiles.ts
      shell/
        executeCommand.ts
      web/
        webFetch.ts
    db/
      init.ts             ← inicialização do SQLite
      schema.sql          ← DDL das tabelas
      sessions.ts         ← SessionStore
    ws/
      handler.ts          ← gerenciador de conexões WS
      schemas.ts          ← schemas Zod de mensagens
    security/
      trustedFolders.ts   ← política de paths permitidos
      secretRedactor.ts   ← redação de segredos
    mcp/
      client.ts           ← MCP client para servidores externos
      loader.ts           ← carrega config do greenforge.config.json
  package.json
  tsconfig.json
  .env                    ← nunca commitar
```

O `tsconfig.json` do servidor deve ter o seguinte conteúdo mínimo:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

O `index.ts` que é o ponto de entrada do servidor deve ter este conteúdo completo:

```typescript
// server/src/index.ts
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import cors from 'cors';
import 'dotenv/config';
import { initDB } from './db/init.js';
import { handleWSConnection } from './ws/handler.js';

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
}));

app.use(express.json());

// Endpoint REST para listar sessões
app.get('/api/sessions', (req, res) => {
  const { SessionStore } = require('./db/sessions.js');
  const workspace = req.query.workspace as string;
  const sessions = SessionStore.listByWorkspace(workspace);
  res.json(sessions);
});

// Endpoint REST para deletar sessão
app.delete('/api/sessions/:id', (req, res) => {
  const { SessionStore } = require('./db/sessions.js');
  SessionStore.delete(req.params.id);
  res.json({ ok: true });
});

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

// Inicializa o banco antes de aceitar conexões
initDB();

wss.on('connection', (ws: WebSocket, req) => {
  const origin = req.headers.origin;
  const allowed = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';

  if (origin !== allowed) {
    ws.terminate();
    return;
  }

  handleWSConnection(ws);
});

const PORT = parseInt(process.env.PORT ?? '3001', 10);

httpServer.listen(PORT, () => {
  // Usar console.error em vez de console.log
  // para não poluir stdout em integrações stdio futuras
  console.error(`GreenForge backend rodando na porta ${PORT}`);
});
```

O `ws/schemas.ts` define todos os tipos de mensagem trocados entre frontend e backend. Esse arquivo é o contrato de comunicação e deve ser respeitado rigorosamente. Qualquer mensagem que não passar na validação Zod deve ser rejeitada silenciosamente com um log de erro:

```typescript
// server/src/ws/schemas.ts
import { z } from 'zod';

export const IncomingMessage = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('chat_message'),
    sessionId: z.string().uuid(),
    content: z.string().min(1).max(32000),
    mode: z.enum(['plan', 'auto_edit', 'yolo']).default('auto_edit'),
    workspacePath: z.string(),
  }),
  z.object({
    type: z.literal('approve_action'),
    actionId: z.string().uuid(),
    approved: z.boolean(),
  }),
  z.object({
    type: z.literal('cancel_agent'),
    sessionId: z.string().uuid(),
  }),
  z.object({
    type: z.literal('switch_mode'),
    sessionId: z.string().uuid(),
    mode: z.enum(['plan', 'auto_edit', 'yolo']),
  }),
  z.object({
    type: z.literal('terminal_command'),
    sessionId: z.string().uuid(),
    command: z.string(),
    workspacePath: z.string(),
  }),
  z.object({
    type: z.literal('create_checkpoint'),
    sessionId: z.string().uuid(),
    description: z.string(),
  }),
]);

export const OutgoingMessage = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('agent_token'),
    token: z.string(),
    sessionId: z.string(),
  }),
  z.object({
    type: z.literal('agent_thinking_done'),
    fullText: z.string(),
    sessionId: z.string(),
  }),
  z.object({
    type: z.literal('tool_call'),
    actionId: z.string(),
    toolName: z.string(),
    args: z.record(z.unknown()),
    sessionId: z.string(),
  }),
  z.object({
    type: z.literal('approval_required'),
    actionId: z.string(),
    toolName: z.string(),
    diff: z.string().optional(),
    description: z.string(),
    sessionId: z.string(),
  }),
  z.object({
    type: z.literal('tool_result'),
    actionId: z.string(),
    result: z.string(),
    isError: z.boolean(),
    sessionId: z.string(),
  }),
  z.object({
    type: z.literal('agent_done'),
    sessionId: z.string(),
    summary: z.string(),
  }),
  z.object({
    type: z.literal('terminal_output'),
    data: z.string(),
    isError: z.boolean(),
    sessionId: z.string(),
  }),
  z.object({
    type: z.literal('session_list'),
    sessions: z.array(z.object({
      id: z.string(),
      title: z.string().nullable(),
      createdAt: z.number(),
      updatedAt: z.number(),
    })),
  }),
  z.object({
    type: z.literal('error'),
    message: z.string(),
    sessionId: z.string().optional(),
  }),
]);

export type IncomingMessageType = z.infer<typeof IncomingMessage>;
export type OutgoingMessageType = z.infer<typeof OutgoingMessage>;
```

O `ws/handler.ts` é o coração da comunicação. Ele recebe cada conexão WebSocket, registra os handlers de mensagem, e gerencia o ciclo de vida do agente. Aqui está o esqueleto completo:

```typescript
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
    if (ws.readyState === WebSocket.OPEN) {
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
```

No frontend, crie o arquivo `src/hooks/useAgentSocket.ts`. Ele substitui completamente o agente mock e expõe a mesma interface que os componentes já esperam:

```typescript
// src/hooks/useAgentSocket.ts
import { useEffect, useRef, useCallback } from 'react';
import { useAgentStore } from '../stores/agentStore'; // ajuste o caminho conforme o projeto

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:3001';
const RECONNECT_DELAY_MS = 3000;

export function useAgentSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const { setConnected, addToken, finalizeMessage, setApprovalRequired, addToolEvent } = useAgentStore();

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
      let msg: Record<string, unknown>;
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

  const sendMessage = useCallback((payload: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    } else {
      console.warn('[WS] Tentativa de envio com conexão fechada');
    }
  }, []);

  return { sendMessage };
}
```

O arquivo `.env` na raiz da pasta `server` deve ter este conteúdo mínimo. Este arquivo nunca deve ser commitado:

```
ANTHROPIC_API_KEY=sk-ant-...
FRONTEND_ORIGIN=http://localhost:5173
PORT=3001
WORKSPACE_ROOT=/caminho/para/seu/projeto
LLM_PROVIDER=anthropic
ENABLE_DOCKER_SANDBOX=false
```

Para rodar frontend e backend juntos durante o desenvolvimento, adicione o seguinte script ao `package.json` da raiz do monorepo:

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:frontend\" \"npm run dev:backend\"",
    "dev:frontend": "vite",
    "dev:backend": "cd server && tsx watch src/index.ts"
  }
}
```

Instale `concurrently` na raiz: `npm install -D concurrently`.

### Checklist de aceite da Fase 1

A IA construtora deve verificar manualmente cada item antes de avançar para a Fase 2.

Abra um terminal, rode `cd server && tsx src/index.ts` e verifique que aparece a mensagem de que o backend está rodando na porta 3001 sem nenhum erro de compilação TypeScript.

Usando o Postman, Insomnia, ou o comando `wscat -c ws://localhost:3001`, conecte um cliente WebSocket ao backend. Envie a seguinte mensagem JSON e verifique que o servidor responde com um erro de schema descritivo em vez de travar:

```json
{ "type": "mensagem_invalida" }
```

Rode `npm run dev` na raiz e verifique que o frontend abre no navegador, que o indicador de conexão no chat mostra "conectado", e que mandar uma mensagem no chat não gera erros no console do navegador.

Desligue o backend com Ctrl+C e verifique que o frontend mostra estado "desconectado" sem travar. Suba o backend novamente e verifique que a reconexão automática funciona sem precisar recarregar a página.

---

## Fase 2 — Loop Agêntico ReAct com LLM Real e Streaming

Com o WebSocket funcionando, aqui você planta o motor real. O loop agêntico é o coração do sistema: ele recebe a mensagem do usuário, manda para o LLM junto com as ferramentas disponíveis, executa as ferramentas que o modelo escolher, alimenta os resultados de volta, e repete até o modelo decidir que terminou.

O SDK do Claude para Node.js envolve toda a API com interfaces tipadas, retries automáticos, suporte a streaming, e capacidades de tool use prontas para uso.

Antes de escrever o loop, entenda o fluxo completo do modal de aprovação porque ele está no coração da interação humano-agente. Aqui está a sequência exata:

O usuário digita uma mensagem no chat do frontend. O frontend envia `chat_message` pelo WebSocket. O backend inicia o loop agêntico. O loop chama o LLM com as ferramentas disponíveis. O LLM decide chamar `write_file`. O loop verifica que o modo é `auto_edit` e que `write_file` tem `isDestructive: true`. O loop cria um `actionId` com `crypto.randomUUID()`. O loop calcula o diff entre o conteúdo atual e o proposto usando a biblioteca `diff`. O loop chama `onEvent` com a mensagem `approval_required` contendo o `actionId`, o nome da ferramenta, e o diff. O backend envia essa mensagem pelo WebSocket para o frontend. O frontend recebe e o store Zustand aciona a abertura do `ApprovalModal` que já existe. O `ApprovalModal` mostra o `DiffEditor` com o diff recebido. O usuário clica em "Aprovar" ou "Rejeitar". O frontend envia `approve_action` com o `actionId` e o valor booleano. O backend recebe, encontra a Promise pendente no Map `pendingApprovals`, e a resolve com o valor booleano. O loop que estava esperando na `await waitForApproval(...)` recebe o resultado e continua.

Esse fluxo cria um mecanismo Human-in-the-Loop assíncrono que funciona perfeitamente com o modal já existente no frontend.

Agora o `agent/loop.ts` completo. O SDK gerencia múltiplos blocos de conteúdo como text, tool_use e thinking. O loop usa o método de streaming para enviar tokens ao usuário enquanto o modelo gera:

```typescript
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

// Promise que bloqueia até o usuário aprovar ou rejeitar
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
```

O `agent/prompts.ts` define os system prompts por modo:

```typescript
// server/src/agent/prompts.ts
import { readFileSync, existsSync } from 'fs';
import path from 'path';

export function buildSystemPrompt(
  mode: 'plan' | 'auto_edit' | 'yolo',
  workspacePath: string,
): string {
  const modeInstructions = {
    plan: `Você está no MODO PLANO (plan). 
Antes de qualquer modificação de arquivo ou execução de comando, você DEVE:
1. Descrever completamente o que vai fazer em linguagem natural
2. Listar cada passo da implementação
3. Identificar riscos e efeitos colaterais
4. Aguardar aprovação explícita do usuário para cada ação
Nunca execute ações destrutivas sem confirmação.`,

    auto_edit: `Você está no MODO AUTO-EDIÇÃO (auto_edit).
Você pode ler arquivos e listar diretórios livremente.
Você DEVE pedir aprovação antes de escrever, deletar, ou executar comandos shell.
Mostre sempre o diff das mudanças propostas ao solicitar aprovação.`,

    yolo: `⚠️ MODO YOLO ATIVO. Você pode executar todas as ferramentas sem pedir aprovação.
Todas as ações são registradas em log. Seja criterioso: o usuário optou por não revisar cada passo.`,
  };

  // Lê o contexto do projeto se existir
  const contextFilePath = path.join(workspacePath, 'GREENFORGE.md');
  let projectContext = '';

  if (existsSync(contextFilePath)) {
    try {
      const content = readFileSync(contextFilePath, 'utf-8');
      projectContext = `\n\n## Contexto do Projeto\n${content}`;
    } catch {
      // Ignora erro de leitura
    }
  }

  return `Você é o GreenForge Agent, um assistente de programação integrado a uma IDE web.
Você tem acesso a ferramentas para ler e escrever arquivos, executar comandos shell, e buscar na web.
O workspace atual está em: ${workspacePath}
NUNCA acesse caminhos fora do workspace sem permissão explícita.
NUNCA exponha chaves de API, senhas, ou segredos em suas respostas.

## Modo de Execução Atual
${modeInstructions[mode]}
${projectContext}`;
}
```

### Checklist de aceite da Fase 2

Digite no chat: "Olá, você pode se apresentar?" e verifique que os tokens aparecem em tempo real no chat enquanto o modelo gera a resposta, exatamente como no ChatGPT.

Digite: "Liste os arquivos no diretório atual". O agente deve chamar a ferramenta `list_directory`, o chat deve mostrar um indicador de que a ferramenta está sendo chamada, e o resultado deve aparecer na resposta.

No modo `auto_edit`, peça ao agente para "criar um arquivo chamado teste.txt com o conteúdo olá mundo". O modal de aprovação com diff deve abrir. Clique em "Rejeitar". Verifique no log do servidor que a ferramenta não foi executada.

Repita o passo anterior e desta vez clique em "Aprovar". Verifique que o arquivo foi criado no disco.

Clique no botão de cancelar enquanto o agente está processando. Verifique que o loop para e a mensagem "Cancelado pelo usuário" aparece no chat.

---

## Fase 3 — Tool Registry, Ferramentas Executáveis e Integração do Terminal

Agora você implementa o catálogo completo de ferramentas. O Tool Registry é o mecanismo que permite ao LLM saber o que pode fazer e chamar as ações correspondentes.

O `tools/types.ts` define a interface que toda ferramenta deve implementar:

```typescript
// server/src/tools/types.ts
import { z } from 'zod';

export interface Tool {
  // Nome que o LLM vai usar para chamar a ferramenta
  name: string;

  // Descrição em linguagem natural para o LLM entender quando usar
  description: string;

  // JSON Schema compatível com a API da Anthropic
  inputSchema: Record<string, unknown>;

  // true se a ferramenta modifica ou deleta dados
  isDestructive: boolean;

  // Executa a ferramenta e retorna o resultado como string
  execute(input: Record<string, unknown>): Promise<string>;

  // Gera uma descrição humana da ação para o modal de aprovação
  describeAction(input: Record<string, unknown>): string;

  // Opcional: gera um diff antes da execução para mostrar no modal
  previewDiff?(input: Record<string, unknown>): string | undefined;
}
```

O `tools/registry.ts` é o catálogo central:

```typescript
// server/src/tools/registry.ts
import type { Tool } from './types.js';
import { ReadFileTool } from './filesystem/readFile.js';
import { WriteFileTool } from './filesystem/writeFile.js';
import { ListDirectoryTool } from './filesystem/listDirectory.js';
import { SearchInFilesTool } from './filesystem/searchInFiles.js';
import { ExecuteCommandTool } from './shell/executeCommand.js';
import { WebFetchTool } from './web/webFetch.js';
import { TrustedFolders } from '../security/trustedFolders.js';

export class ToolRegistry {
  private tools = new Map<string, Tool>();

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  // Formato que a API da Anthropic espera para tool_use
  getAnthropicToolDefinitions(): Array<{
    name: string;
    description: string;
    input_schema: Record<string, unknown>;
  }> {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
    }));
  }

  listTools(): Array<{ name: string; description: string; isDestructive: boolean }> {
    return Array.from(this.tools.values()).map((t) => ({
      name: t.name,
      description: t.description,
      isDestructive: t.isDestructive,
    }));
  }
}

// Factory que cria o registry com todas as ferramentas nativas
// workspacePath é passado para garantir Trusted Folders
export function buildToolRegistry(workspacePath: string): ToolRegistry {
  const trustedFolders = new TrustedFolders([workspacePath]);
  const registry = new ToolRegistry();

  registry.register(new ReadFileTool(trustedFolders));
  registry.register(new WriteFileTool(trustedFolders));
  registry.register(new ListDirectoryTool(trustedFolders));
  registry.register(new SearchInFilesTool(trustedFolders));
  registry.register(new ExecuteCommandTool(workspacePath));
  registry.register(new WebFetchTool());

  return registry;
}
```

O `tools/filesystem/readFile.ts` com a lógica de Trusted Folders e secret redaction:

```typescript
// server/src/tools/filesystem/readFile.ts
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import type { Tool } from '../types.js';
import type { TrustedFolders } from '../../security/trustedFolders.js';
import { SecretRedactor } from '../../security/secretRedactor.js';

// Arquivos que nunca podem ser lidos, independente do modo
const BLOCKED_PATTERNS = [
  /\.env$/,
  /\.env\..+$/,
  /\.key$/,
  /\.pem$/,
  /\.cert$/,
  /id_rsa$/,
  /id_ed25519$/,
  /\.secret$/,
];

export class ReadFileTool implements Tool {
  name = 'read_file';
  description = 'Lê o conteúdo de um arquivo do workspace. Use para inspecionar código existente antes de fazer modificações.';
  isDestructive = false;
  inputSchema = {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Caminho relativo do arquivo a partir da raiz do workspace',
      },
    },
    required: ['path'],
  };

  private redactor = new SecretRedactor();

  constructor(private trustedFolders: TrustedFolders) {}

  async execute(input: Record<string, unknown>): Promise<string> {
    const relativePath = input.path as string;
    const absolutePath = this.trustedFolders.resolve(relativePath);

    // Verifica blocked patterns
    const filename = path.basename(absolutePath);
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(filename)) {
        throw new Error(`SecurityViolation: acesso negado ao arquivo "${filename}". Este arquivo pode conter segredos.`);
      }
    }

    if (!existsSync(absolutePath)) {
      return `Arquivo não encontrado: ${relativePath}`;
    }

    const content = readFileSync(absolutePath, 'utf-8');
    return this.redactor.redact(content);
  }

  describeAction(input: Record<string, unknown>): string {
    return `Ler arquivo: ${input.path}`;
  }
}
```

O `tools/filesystem/writeFile.ts` com geração de diff para o modal de aprovação:

```typescript
// server/src/tools/filesystem/writeFile.ts
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { createPatch } from 'diff'; // npm install diff @types/diff
import type { Tool } from '../types.js';
import type { TrustedFolders } from '../../security/trustedFolders.js';

export class WriteFileTool implements Tool {
  name = 'write_file';
  description = 'Escreve ou sobrescreve um arquivo no workspace. Sempre será solicitada aprovação do usuário antes da execução.';
  isDestructive = true;
  inputSchema = {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Caminho relativo do arquivo a partir da raiz do workspace',
      },
      content: {
        type: 'string',
        description: 'Conteúdo completo a ser escrito no arquivo',
      },
    },
    required: ['path', 'content'],
  };

  constructor(private trustedFolders: TrustedFolders) {}

  async execute(input: Record<string, unknown>): Promise<string> {
    const relativePath = input.path as string;
    const content = input.content as string;
    const absolutePath = this.trustedFolders.resolve(relativePath);

    // Garante que o diretório pai existe
    mkdirSync(path.dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, content, 'utf-8');

    return `Arquivo escrito com sucesso: ${relativePath} (${content.length} caracteres)`;
  }

  describeAction(input: Record<string, unknown>): string {
    const exists = existsSync(
      this.trustedFolders.resolve(input.path as string)
    );
    return exists
      ? `Sobrescrever arquivo existente: ${input.path}`
      : `Criar novo arquivo: ${input.path}`;
  }

  previewDiff(input: Record<string, unknown>): string | undefined {
    const relativePath = input.path as string;
    const newContent = input.content as string;
    const absolutePath = this.trustedFolders.resolve(relativePath);

    const oldContent = existsSync(absolutePath)
      ? readFileSync(absolutePath, 'utf-8')
      : '';

    return createPatch(
      relativePath,
      oldContent,
      newContent,
      'atual',
      'proposto',
    );
  }
}
```

O `tools/shell/executeCommand.ts` com timeout e lista de comandos permitidos:

```typescript
// server/src/tools/shell/executeCommand.ts
import { spawn } from 'child_process';
import type { Tool } from '../types.js';

// Prefixos de comandos que requerem aprovação mesmo em modo auto_edit
const DANGEROUS_PREFIXES = [
  'rm -rf',
  'sudo',
  'chmod 777',
  'dd if=',
  'mkfs',
  'curl | bash',
  'wget | bash',
  'curl | sh',
  ':(){ :|:& };:', // fork bomb
];

// Comandos que podem rodar sem aprovação extra no modo auto_edit
const SAFE_COMMANDS = [
  'npm',
  'npx',
  'node',
  'git status',
  'git diff',
  'git log',
  'git add',
  'git commit',
  'ls',
  'cat',
  'pwd',
  'echo',
  'mkdir',
  'cp',
  'mv',
  'find',
  'grep',
];

interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

interface ExecuteOptions {
  command: string;
  workingDirectory: string;
  mode?: 'plan' | 'auto_edit' | 'yolo';
  onApprovalNeeded?: (description: string) => Promise<boolean>;
}

export async function executeTerminalCommand(
  opts: ExecuteOptions,
): Promise<CommandResult> {
  return runCommand(opts.command, opts.workingDirectory, 30000);
}

export class ExecuteCommandTool implements Tool {
  name = 'execute_shell_command';
  description = 'Executa um comando shell no workspace. Use para rodar testes, instalar dependências, compilar código, etc.';
  isDestructive = true;
  inputSchema = {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'O comando shell a executar',
      },
      timeout_seconds: {
        type: 'number',
        description: 'Timeout em segundos. Padrão: 30.',
      },
    },
    required: ['command'],
  };

  constructor(private workspacePath: string) {}

  async execute(input: Record<string, unknown>): Promise<string> {
    const command = input.command as string;
    const timeoutSeconds = (input.timeout_seconds as number) ?? 30;

    const result = await runCommand(command, this.workspacePath, timeoutSeconds * 1000);

    const output = [
      result.stdout && `STDOUT:\n${result.stdout}`,
      result.stderr && `STDERR:\n${result.stderr}`,
      `Exit code: ${result.exitCode}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    return output || '(sem output)';
  }

  describeAction(input: Record<string, unknown>): string {
    return `Executar comando shell: \`${input.command}\`\nDiretório: ${this.workspacePath}`;
  }
}

function isDangerous(command: string): boolean {
  return DANGEROUS_PREFIXES.some((prefix) =>
    command.trim().toLowerCase().startsWith(prefix.toLowerCase())
  );
}

function isSafe(command: string): boolean {
  return SAFE_COMMANDS.some((safe) =>
    command.trim().toLowerCase().startsWith(safe.toLowerCase())
  );
}

function runCommand(
  command: string,
  cwd: string,
  timeoutMs: number,
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn('sh', ['-c', command], {
      cwd,
      env: sanitizeEnv(process.env),
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Timeout: comando demorou mais de ${timeoutMs / 1000}s`));
    }, timeoutMs);

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code ?? -1 });
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

// Remove variáveis sensíveis do ambiente antes de passar ao subprocesso
function sanitizeEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const sanitized = { ...env };
  const sensitiveKeys = [
    'ANTHROPIC_API_KEY',
    'OPENAI_API_KEY',
    'AWS_SECRET_ACCESS_KEY',
    'DATABASE_URL',
    'JWT_SECRET',
  ];
  for (const key of sensitiveKeys) {
    delete sanitized[key];
  }
  return sanitized;
}
```

### Integração do Terminal Real com o Backend

Esta subseção é crítica e estava faltando no documento anterior. Hoje o `TerminalPanel` do frontend executa comandos internos no VFS mock. A partir desta fase, ele deve enviar comandos reais para o backend e exibir o output recebido pelo WebSocket.

Localize o componente `TerminalPanel` no frontend, provavelmente em `src/components/TerminalPanel.tsx` ou similar. Encontre o handler onde os comandos são executados hoje, que provavelmente chama algo como `executeInternalCommand(cmd)`. Você vai substituir esse handler pelo seguinte padrão:

```typescript
// Dentro do TerminalPanel.tsx
// Onde hoje estava: executeInternalCommand(command)
// Substitua por:

const { sendMessage } = useAgentSocket();

function handleTerminalCommand(command: string, workspacePath: string): void {
  // Exibe o comando digitado no terminal imediatamente (echo local)
  terminal.write(`\r\n$ ${command}\r\n`);

  sendMessage({
    type: 'terminal_command',
    sessionId: currentSessionId,
    command,
    workspacePath,
  });
}

// No useEffect que configura o xterm.js:
useEffect(() => {
  // Listener para output vindo do backend
  const listener = (event: Event) => {
    const { data, isError } = (event as CustomEvent).detail;
    // isError true = texto vermelho
    terminal.write(isError ? `\x1b[31m${data}\x1b[0m` : data);
    terminal.write('\r\n');
  };

  window.addEventListener('terminal-output', listener);
  return () => window.removeEventListener('terminal-output', listener);
}, [terminal]);
```

O evento `terminal-output` é emitido pelo `useAgentSocket` quando uma mensagem do tipo `terminal_output` chega do backend. Essa arquitetura desacopla o terminal do WebSocket sem precisar passar props desnecessárias.

O `security/trustedFolders.ts` implementa a política de paths permitidos:

```typescript
// server/src/security/trustedFolders.ts
import path from 'path';

export class TrustedFolders {
  private allowedPaths: string[];

  constructor(allowedPaths: string[]) {
    // Normaliza todos os paths para absolutos
    this.allowedPaths = allowedPaths.map((p) => path.resolve(p));
  }

  // Resolve um caminho relativo e verifica se está dentro do workspace
  resolve(relativePath: string): string {
    const normalized = path.resolve(this.allowedPaths[0], relativePath);

    const isAllowed = this.allowedPaths.some((allowed) =>
      normalized.startsWith(allowed + path.sep) ||
      normalized === allowed
    );

    if (!isAllowed) {
      throw new Error(
        `SecurityViolation: caminho "${relativePath}" está fora do workspace permitido. ` +
        `Paths permitidos: ${this.allowedPaths.join(', ')}`
      );
    }

    return normalized;
  }

  addPath(absolutePath: string): void {
    const normalized = path.resolve(absolutePath);
    if (!this.allowedPaths.includes(normalized)) {
      this.allowedPaths.push(normalized);
    }
  }
}
```

O `security/secretRedactor.ts` remove segredos de qualquer string antes de exibir ou enviar ao LLM:

```typescript
// server/src/security/secretRedactor.ts

interface RedactionPattern {
  name: string;
  pattern: RegExp;
}

const PATTERNS: RedactionPattern[] = [
  { name: 'Anthropic API Key', pattern: /sk-ant-[a-zA-Z0-9\-_]{20,}/g },
  { name: 'OpenAI API Key', pattern: /sk-[a-zA-Z0-9]{48}/g },
  { name: 'JWT Token', pattern: /eyJ[a-zA-Z0-9\-_]+\.eyJ[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+/g },
  { name: 'AWS Secret', pattern: /(?:AWS_SECRET[_A-Z]*|aws_secret[_a-z]*)\s*[=:]\s*["']?([A-Za-z0-9+/]{40})["']?/g },
  { name: 'Generic API Key', pattern: /(?:api[_-]?key|apikey|access[_-]?token)\s*[=:]\s*["']?([a-zA-Z0-9\-_]{20,})["']?/gi },
  { name: 'Private Key Block', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { name: 'Generic Secret', pattern: /(?:password|passwd|secret|token)\s*[=:]\s*["']?([^\s"']{8,})["']?/gi },
];

export class SecretRedactor {
  redact(text: string): string {
    let result = text;

    for (const { pattern } of PATTERNS) {
      result = result.replace(pattern, (match, captured) => {
        if (captured) {
          // Substitui apenas o valor capturado, mantendo a chave
          return match.replace(captured, '[REDACTED]');
        }
        return '[REDACTED]';
      });
    }

    return result;
  }
}
```

### Checklist de aceite da Fase 3

No TerminalPanel do frontend, execute o comando `ls -la` e verifique que o output real do sistema de arquivos aparece no terminal com a formatação correta.

Execute `npm --version` no terminal. O output deve ser a versão real do npm instalada na máquina.

Tente executar `cat .env` no terminal e verifique que o backend bloqueia com erro de segurança.

Peça ao agente no modo `plan` para "criar um arquivo chamado hello.ts com uma função de hello world". Verifique que o modal de aprovação abre com o diff mostrando o conteúdo do novo arquivo em verde.

Tente criar um arquivo com caminho `../../etc/passwd` e verifique que o `TrustedFolders` bloqueia com `SecurityViolation`.

---

## Fase 4 — Persistência de Sessões com SQLite

O `db/init.ts` inicializa o banco na primeira vez que o servidor sobe:

```typescript
// server/src/db/init.ts
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db: Database.Database;

export function initDB(): Database.Database {
  if (db) return db;

  const dbPath = process.env.DB_PATH ?? path.join(process.cwd(), 'greenforge.db');
  db = new Database(dbPath);

  // Habilita WAL mode para melhor performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Lê e executa o schema
  const schema = readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  db.exec(schema);

  console.error(`[DB] Banco inicializado em: ${dbPath}`);
  return db;
}

export function getDB(): Database.Database {
  if (!db) throw new Error('DB não inicializado. Chame initDB() primeiro.');
  return db;
}
```

O `db/schema.sql`:

```sql
-- db/schema.sql
CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT    PRIMARY KEY,
  workspace   TEXT    NOT NULL,
  mode        TEXT    NOT NULL DEFAULT 'auto_edit',
  title       TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id          TEXT    PRIMARY KEY,
  session_id  TEXT    NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role        TEXT    NOT NULL CHECK(role IN ('user', 'assistant')),
  content     TEXT    NOT NULL,  -- JSON serializado do array de content blocks
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tool_calls (
  id          TEXT    PRIMARY KEY,
  session_id  TEXT    NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  tool_name   TEXT    NOT NULL,
  input       TEXT    NOT NULL,  -- JSON
  result      TEXT,
  approved    INTEGER,           -- NULL=auto, 0=rejeitado, 1=aprovado
  executed_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS checkpoints (
  id          TEXT    PRIMARY KEY,
  session_id  TEXT    NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  description TEXT    NOT NULL,
  snapshot    TEXT    NOT NULL,  -- JSON do array messages no momento do checkpoint
  created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tool_calls_session ON tool_calls(session_id, executed_at);
CREATE INDEX IF NOT EXISTS idx_sessions_workspace ON sessions(workspace, updated_at);
```

O `db/sessions.ts` implementa o store:

```typescript
// server/src/db/sessions.ts
import { randomUUID } from 'crypto';
import type { MessageParam } from '@anthropic-ai/sdk/resources.js';
import { getDB } from './init.js';

export interface Session {
  id: string;
  workspace: string;
  mode: 'plan' | 'auto_edit' | 'yolo';
  title: string | null;
  messages: MessageParam[];
  createdAt: number;
  updatedAt: number;
}

export const SessionStore = {
  getOrCreate(id: string, workspacePath: string): Session {
    const db = getDB();
    const now = Date.now();

    const row = db.prepare(`
      SELECT * FROM sessions WHERE id = ?
    `).get(id) as Record<string, unknown> | undefined;

    if (!row) {
      db.prepare(`
        INSERT INTO sessions (id, workspace, mode, title, created_at, updated_at)
        VALUES (?, ?, 'auto_edit', NULL, ?, ?)
      `).run(id, workspacePath, now, now);

      return {
        id,
        workspace: workspacePath,
        mode: 'auto_edit',
        title: null,
        messages: [],
        createdAt: now,
        updatedAt: now,
      };
    }

    // Carrega mensagens do banco
    const messageRows = db.prepare(`
      SELECT role, content FROM messages
      WHERE session_id = ?
      ORDER BY created_at ASC
    `).all(id) as Array<{ role: string; content: string }>;

    const messages = messageRows.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: JSON.parse(m.content),
    }));

    return {
      id,
      workspace: row.workspace as string,
      mode: row.mode as Session['mode'],
      title: row.title as string | null,
      messages,
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number,
    };
  },

  save(session: Session): void {
    const db = getDB();
    const now = Date.now();

    db.prepare(`
      UPDATE sessions SET updated_at = ?, mode = ? WHERE id = ?
    `).run(now, session.mode, session.id);

    // Reescreve todas as mensagens (simples e confiável)
    db.prepare(`DELETE FROM messages WHERE session_id = ?`).run(session.id);

    const insertMsg = db.prepare(`
      INSERT INTO messages (id, session_id, role, content, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((messages: MessageParam[]) => {
      messages.forEach((msg, i) => {
        insertMsg.run(
          randomUUID(),
          session.id,
          msg.role,
          JSON.stringify(msg.content),
          now + i, // garante ordem
        );
      });
    });

    insertMany(session.messages);
  },

  listByWorkspace(workspacePath: string): Array<{
    id: string;
    title: string | null;
    createdAt: number;
    updatedAt: number;
  }> {
    const db = getDB();
    return db.prepare(`
      SELECT id, title, created_at as createdAt, updated_at as updatedAt
      FROM sessions
      WHERE workspace = ?
      ORDER BY updated_at DESC
      LIMIT 50
    `).all(workspacePath) as Array<{
      id: string;
      title: string | null;
      createdAt: number;
      updatedAt: number;
    }>;
  },

  updateMode(id: string, mode: Session['mode']): void {
    getDB().prepare(`UPDATE sessions SET mode = ? WHERE id = ?`).run(mode, id);
  },

  delete(id: string): void {
    getDB().prepare(`DELETE FROM sessions WHERE id = ?`).run(id);
  },

  saveToolCall(
    sessionId: string,
    call: {
      id: string;
      toolName: string;
      input: Record<string, unknown>;
      result: string;
      approved: boolean | null;
    },
  ): void {
    getDB().prepare(`
      INSERT INTO tool_calls (id, session_id, tool_name, input, result, approved, executed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      call.id,
      sessionId,
      call.toolName,
      JSON.stringify(call.input),
      call.result,
      call.approved === null ? null : call.approved ? 1 : 0,
      Date.now(),
    );
  },

  createCheckpoint(sessionId: string, description: string): string {
    const db = getDB();
    const session = SessionStore.getOrCreate(sessionId, '');
    const checkpointId = randomUUID();

    db.prepare(`
      INSERT INTO checkpoints (id, session_id, description, snapshot, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      checkpointId,
      sessionId,
      description,
      JSON.stringify(session.messages),
      Date.now(),
    );

    return checkpointId;
  },
};
```

No frontend, adicione ao componente de chat um seletor de sessões anteriores. Quando o componente monta, faça um fetch para `GET /api/sessions?workspace=PATH` e mostre as sessões disponíveis. Quando o usuário seleciona uma sessão existente, use o ID dela nas mensagens enviadas pelo WebSocket.

### Checklist de aceite da Fase 4

Inicie uma conversa, envie algumas mensagens com tool calls. Feche o navegador completamente. Abra de novo. Selecione a sessão anterior no seletor. Verifique que todo o histórico está lá.

Rode `sqlite3 server/greenforge.db ".tables"` no terminal e verifique que as tabelas `sessions`, `messages`, `tool_calls`, e `checkpoints` existem.

Crie um checkpoint via botão no frontend, delete algumas mensagens da sessão, e restaure o checkpoint. Verifique que as mensagens voltaram.

---

## Fase 5 — Redação de Segredos, Modos de Execução e Sandbox

Os modos de execução já estão implementados no loop da Fase 2. Nesta fase você os torna explícitos no frontend e adiciona as verificações de segurança que faltam.

No frontend, o componente de status bar que hoje mostra informações simples deve ganhar um seletor de modo. O estado do modo é armazenado no store Zustand e enviado ao backend via mensagem `switch_mode` a cada mudança. A implementação de cores deve seguir: verde para `auto_edit`, amarelo com ícone de alerta para `plan`, e vermelho com aviso explícito para `yolo`.

Para o sandbox com Docker, esta feature fica atrás da feature flag `ENABLE_DOCKER_SANDBOX=true` no `.env`. Quando habilitada, o `ExecuteCommandTool` substitui o `runCommand` local por uma chamada ao Docker usando a biblioteca `dockerode`:

```bash
npm install dockerode @types/dockerode
```

```typescript
// server/src/tools/shell/dockerRunner.ts
import Docker from 'dockerode';

const docker = new Docker();

export async function runInDocker(
  command: string,
  workspacePath: string,
  timeoutMs = 30000,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const container = await docker.createContainer({
    Image: 'node:22-alpine',
    Cmd: ['sh', '-c', command],
    WorkingDir: '/workspace',
    HostConfig: {
      Binds: [`${workspacePath}:/workspace:rw`],
      NetworkMode: 'none',      // sem acesso à rede por padrão
      Memory: 512 * 1024 * 1024, // 512MB de RAM máximo
      CpuPeriod: 100000,
      CpuQuota: 50000,           // 50% de CPU máximo
      AutoRemove: true,
    },
    Env: [],                     // sem variáveis de ambiente do host
  });

  await container.start();

  const timeoutHandle = setTimeout(async () => {
    await container.kill();
  }, timeoutMs);

  const output = await container.wait();
  clearTimeout(timeoutHandle);

  const logs = await container.logs({ stdout: true, stderr: true });
  const logString = logs.toString('utf-8');

  return {
    stdout: logString,
    stderr: '',
    exitCode: output.StatusCode,
  };
}
```

### Checklist de aceite da Fase 5

Mude para o modo `yolo` e verifique que o seletor fica vermelho e que uma mensagem de aviso aparece.

Mude para o modo `plan` e peça ao agente para criar um arquivo. Verifique que o modal de aprovação abre para cada ação, incluindo ações de leitura.

Coloque `API_KEY=sk-ant-aaabbbccc` em um arquivo de texto no workspace. Peça ao agente para ler esse arquivo. Verifique que o conteúdo retornado no chat mostra `[REDACTED]` no lugar do valor da chave.

Se Docker estiver instalado, habilite `ENABLE_DOCKER_SANDBOX=true` e execute `echo "dentro do docker"` no terminal. Verifique nos logs do Docker que um container efêmero foi criado e destruído.

---

## Fase 6 — Model Context Protocol (MCP)

O MCP foi criado originalmente pela Anthropic e agora é mantido pela Agentic AI Foundation, com suporte de Anthropic, Google, OpenAI, e outros, tornando-se rapidamente o padrão para AI interagir com o mundo externo.

O SDK TypeScript do MCP é a implementação Tier 1 oficial, a mais completa e bem suportada disponível, com mais de 66 milhões de downloads no npm.

Instale o SDK usando o comando correto:

```bash
cd server && npm install @modelcontextprotocol/sdk
```

Importante: a versão estável recomendada para produção é v1.x, com previsão de lançamento da v2 estável no Q3 de 2026.

O arquivo de configuração `greenforge.config.json` deve ficar na raiz do workspace do usuário, seguindo a mesma convenção do Gemini CLI:

```json
{
  "mcpServers": {
    "filesystem": {
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "${WORKSPACE_ROOT}"]
    },
    "github": {
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "postgres": {
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "${DATABASE_URL}"],
      "disabled": true
    }
  }
}
```

O `mcp/loader.ts` lê a configuração, expande variáveis de ambiente, e retorna a lista de servidores ativos:

```typescript
// server/src/mcp/loader.ts
import { readFileSync, existsSync } from 'fs';
import path from 'path';

export interface MCPServerConfig {
  name: string;
  transport: 'stdio' | 'http';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  disabled?: boolean;
}

export function loadMCPConfig(workspacePath: string): MCPServerConfig[] {
  const configPath = path.join(workspacePath, 'greenforge.config.json');

  if (!existsSync(configPath)) return [];

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(configPath, 'utf-8'));
  } catch {
    console.error('[MCP] Erro ao parsear greenforge.config.json');
    return [];
  }

  const config = raw as { mcpServers?: Record<string, Omit<MCPServerConfig, 'name'>> };
  if (!config.mcpServers) return [];

  return Object.entries(config.mcpServers)
    .filter(([, server]) => !server.disabled)
    .map(([name, server]) => ({
      name,
      ...server,
      // Expande variáveis de ambiente nos args e env
      args: server.args?.map(expandEnvVars),
      env: server.env
        ? Object.fromEntries(
            Object.entries(server.env).map(([k, v]) => [k, expandEnvVars(v)])
          )
        : undefined,
    }));
}

function expandEnvVars(str: string): string {
  return str.replace(/\$\{([^}]+)\}/g, (_, varName) => {
    return process.env[varName] ?? '';
  });
}
```

O `mcp/client.ts` conecta ao servidor MCP via stdio e registra as ferramentas descobertas no ToolRegistry:

```typescript
// server/src/mcp/client.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { ToolRegistry } from '../tools/registry.js';
import type { Tool } from '../tools/types.js';
import type { MCPServerConfig } from './loader.js';

// Adaptador que envolve uma ferramenta MCP na interface Tool do GreenForge
class MCPToolAdapter implements Tool {
  isDestructive = true; // assume destrutivo por segurança

  constructor(
    public name: string,
    public description: string,
    public inputSchema: Record<string, unknown>,
    private client: Client,
    private originalName: string,
  ) {}

  async execute(input: Record<string, unknown>): Promise<string> {
    const result = await this.client.callTool({
      name: this.originalName,
      arguments: input,
    });

    return result.content
      .filter((c: { type: string; text?: string }) => c.type === 'text')
      .map((c: { type: string; text?: string }) => c.text ?? '')
      .join('\n');
  }

  describeAction(input: Record<string, unknown>): string {
    return `Executar ferramenta MCP "${this.originalName}" com args: ${JSON.stringify(input)}`;
  }
}

export async function connectMCPServer(
  config: MCPServerConfig,
  registry: ToolRegistry,
): Promise<void> {
  if (config.transport !== 'stdio' || !config.command) {
    console.error(`[MCP] Transporte "${config.transport}" não suportado ainda para servidor "${config.name}"`);
    return;
  }

  const transport = new StdioClientTransport({
    command: config.command,
    args: config.args ?? [],
    env: {
      ...process.env,
      ...config.env,
    } as Record<string, string>,
  });

  const client = new Client(
    { name: 'greenforge-mcp-client', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );

  try {
    await client.connect(transport);

    const { tools } = await client.listTools();

    for (const tool of tools) {
      // Prefixo com nome do servidor para evitar colisões
      const prefixedName = `${config.name}__${tool.name}`;

      registry.register(new MCPToolAdapter(
        prefixedName,
        `[${config.name}] ${tool.description ?? ''}`,
        tool.inputSchema as Record<string, unknown>,
        client,
        tool.name,
      ));

      console.error(`[MCP] Ferramenta registrada: ${prefixedName}`);
    }
  } catch (err) {
    console.error(`[MCP] Falha ao conectar "${config.name}":`, (err as Error).message);
  }
}
```

No `index.ts`, adicione a inicialização dos servidores MCP após o `initDB()`:

```typescript
// No server/src/index.ts, após initDB():
import { loadMCPConfig } from './mcp/loader.js';
import { connectMCPServer } from './mcp/client.js';
import { buildToolRegistry } from './tools/registry.js';

const workspacePath = process.env.WORKSPACE_ROOT ?? process.cwd();
const mcpConfigs = loadMCPConfig(workspacePath);
const globalRegistry = buildToolRegistry(workspacePath);

// Conecta servidores MCP em background sem bloquear a inicialização
Promise.all(
  mcpConfigs.map((config) => connectMCPServer(config, globalRegistry))
).then(() => {
  console.error(`[MCP] ${mcpConfigs.length} servidor(es) configurado(s)`);
});
```

### Checklist de aceite da Fase 6

Adicione `@modelcontextprotocol/server-filesystem` ao `greenforge.config.json` com o path do workspace. Reinicie o backend e verifique nos logs que a ferramenta `filesystem__read_file` foi registrada.

Peça ao agente: "Use a ferramenta filesystem__read_file para ler o arquivo package.json". Verifique que o agente consegue chamar a ferramenta MCP com o mesmo fluxo de aprovação.

Use o inspector oficial para verificar as ferramentas: `npx @modelcontextprotocol/inspector`. Conecte ao servidor e confirme que as ferramentas aparecem.

Deixe um campo `GITHUB_TOKEN` vazio no `.env` e verifique que o servidor github no `greenforge.config.json` falha graciosamente com uma mensagem de erro no log sem travar todo o backend.

---

## Fase 7 — Orquestração Multi-Agente com Git Worktrees (Objetivo Futuro)

Esta fase é marcada como opcional e deve ser implementada apenas após as Fases 1 a 6 estarem completamente estáveis e em produção. Ela representa o diferencial arquitetural do GreenForge em relação ao Gemini CLI e é o que o coloca no mesmo nível do Verdent AI. Não implemente esta fase na primeira entrega. Volte a ela após validar o MVP.

A ideia central é a seguinte: em vez de um único agente numa única branch, o GreenForge cria múltiplos agentes rodando em paralelo, cada um em seu próprio git worktree isolado. O desenvolvedor vê o progresso de todos no painel e decide quais resultados aceitar para merge.

O pré-requisito obrigatório é que o workspace seja um repositório Git. O backend deve verificar isso ao inicializar e exibir um aviso ao usuário se não for.

O `multiagent/worktreeManager.ts` cria e gerencia os worktrees:

```typescript
// server/src/multiagent/worktreeManager.ts
import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';

export interface WorktreeInfo {
  taskId: string;
  path: string;
  branch: string;
  status: 'running' | 'awaiting_approval' | 'completed' | 'failed';
}

export class WorktreeManager {
  private worktreesDir: string;

  constructor(private workspaceRoot: string) {
    this.worktreesDir = path.join(workspaceRoot, '.greenforge-workers');
  }

  create(taskId: string): string {
    mkdirSync(this.worktreesDir, { recursive: true });

    const worktreePath = path.join(this.worktreesDir, `task-${taskId}`);
    const branchName = `greenforge/${taskId}`;

    execSync(
      `git worktree add "${worktreePath}" -b "${branchName}"`,
      { cwd: this.workspaceRoot, stdio: 'pipe' }
    );

    return worktreePath;
  }

  merge(taskId: string): void {
    execSync(
      `git merge --no-ff "greenforge/${taskId}" -m "GreenForge: merge task ${taskId}"`,
      { cwd: this.workspaceRoot, stdio: 'pipe' }
    );

    this.remove(taskId);
  }

  remove(taskId: string): void {
    const worktreePath = path.join(this.worktreesDir, `task-${taskId}`);

    if (existsSync(worktreePath)) {
      execSync(
        `git worktree remove "${worktreePath}" --force`,
        { cwd: this.workspaceRoot, stdio: 'pipe' }
      );
    }

    try {
      execSync(
        `git branch -D "greenforge/${taskId}"`,
        { cwd: this.workspaceRoot, stdio: 'pipe' }
      );
    } catch {
      // Branch pode já não existir
    }
  }

  list(): WorktreeInfo[] {
    try {
      const output = execSync('git worktree list --porcelain', {
        cwd: this.workspaceRoot,
        encoding: 'utf-8',
        stdio: 'pipe',
      });

      return output
        .split('\n\n')
        .filter((block) => block.includes('greenforge/'))
        .map((block) => {
          const worktreeLine = block.match(/^worktree (.+)/m);
          const branchLine = block.match(/^branch refs\/heads\/(.+)/m);
          const branch = branchLine?.[1] ?? '';
          const taskId = branch.replace('greenforge/', '');

          return {
            taskId,
            path: worktreeLine?.[1] ?? '',
            branch,
            status: 'running' as const,
          };
        });
    } catch {
      return [];
    }
  }
}
```

O `multiagent/taskOrchestrator.ts` gerencia a fila de tarefas:

```typescript
// server/src/multiagent/taskOrchestrator.ts
import { randomUUID } from 'crypto';
import { WorktreeManager } from './worktreeManager.js';
import { runAgentLoop } from '../agent/loop.js';
import { buildToolRegistry } from '../tools/registry.js';
import type { OutgoingMessageType } from '../ws/schemas.js';

const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT_AGENTS ?? '3', 10);

interface Task {
  id: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  worktreePath?: string;
  result?: string;
  error?: string;
}

export class TaskOrchestrator {
  private tasks = new Map<string, Task>();
  private runningCount = 0;
  private queue: string[] = [];
  private worktreeManager: WorktreeManager;

  constructor(
    private workspaceRoot: string,
    private onEvent: (taskId: string, msg: OutgoingMessageType) => void,
  ) {
    this.worktreeManager = new WorktreeManager(workspaceRoot);
  }

  enqueue(description: string): string {
    const taskId = randomUUID();
    this.tasks.set(taskId, { id: taskId, description, status: 'pending' });
    this.queue.push(taskId);
    this.flush();
    return taskId;
  }

  private flush(): void {
    while (this.runningCount < MAX_CONCURRENT && this.queue.length > 0) {
      const taskId = this.queue.shift()!;
      this.runTask(taskId);
    }
  }

  private async runTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId)!;
    this.runningCount++;
    task.status = 'running';

    let worktreePath: string;

    try {
      worktreePath = this.worktreeManager.create(taskId);
      task.worktreePath = worktreePath;

      const registry = buildToolRegistry(worktreePath);
      const controller = new AbortController();

      await runAgentLoop({
        userMessage: task.description,
        sessionId: taskId,
        workspacePath: worktreePath,
        toolRegistry: registry,
        mode: 'yolo', // agentes paralelos rodam em yolo por padrão
        signal: controller.signal,
        pendingApprovals: new Map(),
        onEvent: (msg) => this.onEvent(taskId, msg),
      });

      task.status = 'completed';

    } catch (err) {
      task.status = 'failed';
      task.error = (err as Error).message;
    } finally {
      this.runningCount--;
      this.flush();
    }
  }

  acceptTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'completed') return;
    this.worktreeManager.merge(taskId);
    this.tasks.delete(taskId);
  }

  rejectTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;
    this.worktreeManager.remove(taskId);
    this.tasks.delete(taskId);
  }

  getTasks(): Task[] {
    return Array.from(this.tasks.values());
  }
}
```

O frontend nesta fase ganha o componente `MultiAgentPanel` que mostra um card por tarefa com o status, o log do agente, e os botões Aceitar e Rejeitar. A criação de tarefas paralelas é disparada via um novo tipo de mensagem `create_parallel_task` no WebSocket.

Adicione ao `.gitignore` do workspace:

```
.greenforge-workers/
greenforge.db
```

### Checklist de aceite da Fase 7

Verifique que `git worktree list` no workspace mostra apenas o worktree principal antes de criar tarefas.

Crie duas tarefas paralelas via frontend e verifique com `git worktree list` que dois novos worktrees foram criados em `.greenforge-workers/`.

Verifique nos logs do servidor que dois loops agênticos estão rodando concorrentemente.

Aceite o resultado de uma tarefa e verifique com `git log --oneline -5` que um commit de merge apareceu na branch principal.

Rejeite a outra tarefa e verifique que o worktree foi removido e nenhum commit desnecessário apareceu no histórico.

---

## Checklist de Segurança Obrigatório

Estes itens são não-negociáveis e devem ser verificados antes de qualquer entrega.

O arquivo `.gitignore` da raiz do servidor deve incluir `.env`, `.env.*`, `*.key`, `*.pem`, `*.secret`, `greenforge.db`, e `.greenforge-workers/`. Verifique com `git status` que nenhum desses arquivos aparece como rastreado.

Nunca use `console.log` no servidor para logar qualquer objeto que possa conter variáveis de ambiente. Use `console.error` para todos os logs do servidor, e nunca imprima `process.env` inteiro.

O WebSocket server rejeita conexões de origens que não sejam a origem do frontend configurada em `FRONTEND_ORIGIN`. Isso está implementado no `index.ts` com `ws.terminate()` para origens não permitidas.

Toda ferramenta que recebe `path` como parâmetro chama `trustedFolders.resolve()` antes de qualquer operação de filesystem. Sem exceções.

O `SecretRedactor` é aplicado em dois pontos: antes de adicionar conteúdo de arquivo ao contexto do LLM e antes de enviar qualquer `tool_result` ao frontend pelo WebSocket.

Comandos shell são sempre executados em subprocessos separados com timeout máximo configurável e variáveis de ambiente sensíveis removidas pelo `sanitizeEnv`.

Rate limiting: se um único loop agêntico fizer mais de 50 chamadas de ferramenta em menos de 2 minutos, o loop deve ser interrompido com erro. Implemente um contador por sessão no `runAgentLoop`.

---

## Ordem de Implementação e Estimativas de Tempo

A IA construtora deve seguir exatamente esta sequência e não avançar para a próxima fase sem completar o checklist de aceite da anterior.

Fase 1 leva dois dias. Entrega: backend rodando, WebSocket funcionando, frontend conectado.

Fase 2 leva três dias. Entrega: LLM real respondendo, tokens em streaming, modal de aprovação funcionando end-to-end com a Promise HITL.

Fase 3 leva quatro dias. Entrega: todas as ferramentas funcionando, terminal real integrado via WebSocket, Trusted Folders e SecretRedactor ativos.

Fase 4 leva dois dias. Entrega: histórico persistente no SQLite, retomada de sessões, checkpoints.

Fase 5 leva dois dias. Entrega: seletor de modo no frontend, Docker sandbox opcional, verificação de segredos nos arquivos .env.

Fase 6 leva dois dias. Entrega: MCP configurável via `greenforge.config.json`, ferramentas externas disponíveis para o agente com prefixo.

Fase 7 é opcional e leva cinco a oito dias. Entrega: multi-agente com worktrees isolados, painel de orquestração visual, merge controlado pelo desenvolvedor.

Total para MVP funcional competitivo com o Gemini CLI: quinze dias de trabalho focado. Total com o diferencial do Verdent: vinte a vinte e três dias.

---

## Nota Final para a IA Construtora

Este documento é autocontido. Você tem todos os detalhes necessários para transformar o GreenForge de um frontend mockado em um sistema agêntico real. Siga as fases em ordem, valide cada checklist antes de avançar, e nunca salte fases porque cada uma é fundação da próxima. Se algo não estiver claro em alguma implementação, a resposta quase sempre está nos schemas Zod e nas interfaces TypeScript definidas aqui, porque elas são o contrato entre todas as partes do sistema.