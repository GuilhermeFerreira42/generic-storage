# GreenForge IDE - Test Suite Documentation

Este documento descreve a suíte de testes automatizados completa do GreenForge IDE.

## Estrutura de Testes

### Backend

#### Ferramentas (Tools)
- **`tests/unit/backend/tools/readFile.test.ts`**: Valida leitura de arquivos, TrustedFolders e redação.
- **`tests/unit/backend/tools/writeFile.test.ts`**: Valida escrita de arquivos e geração de diffs.
- **`tests/unit/backend/tools/listDirectory.test.ts`**: Valida listagem recursiva e filtros.
- **`tests/unit/backend/tools/searchInFiles.test.ts`**: Valida busca de conteúdo em arquivos.
- **`tests/unit/backend/tools/executeCommand.test.ts`**: Valida execução de comandos shell e timeouts.

#### Core e Segurança
- **`tests/unit/backend/security/secretRedactor.test.ts`**: Valida redação de segredos.
- **`tests/unit/backend/agent/loop.test.ts`**: Valida o loop principal ReAct.
- **`tests/unit/backend/db/sessions.test.ts`**: Valida persistência SQLite (em memória para testes).

#### Model Context Protocol (MCP)
- **`tests/unit/backend/mcp/loader.test.ts`**: Valida carregamento de configurações e expansão de env.
- **`tests/unit/backend/mcp/client.test.ts`**: Valida conexão e registro de ferramentas externas.

#### Multi-Agente
- **`tests/unit/backend/multiagent/worktreeManager.test.ts`**: Valida comandos Git para worktrees.
- **`tests/unit/backend/multiagent/taskOrchestrator.test.ts`**: Valida fila e concorrência de tarefas.

### Frontend

#### Components
- **`tests/unit/frontend/components/ChatPanel.test.tsx`**: Painel de chat e interações.
- **`tests/unit/frontend/components/FileExplorer.test.tsx`**: Navegação na árvore de arquivos.
- **`tests/unit/frontend/components/Terminal.test.tsx`**: Interface do terminal.
- **`tests/unit/frontend/components/IDELayout.test.tsx`**: Layout principal.

#### Stores
- **`tests/unit/frontend/store/agentStore.test.ts`**: Estado do agente e streaming.

### Integração e E2E
- **`tests/integration/websocket/websocket.test.ts`**: Fluxo de mensagens WS.
- **`tests/integration/websocket/session_history.test.ts`**: Recuperação de histórico.
- **`tests/e2e/ide-flow.spec.ts`**: Fluxos end-to-end com Playwright.

## Como Executar

```bash
npm test          # Roda todos os testes (Vitest)
npm run test:e2e  # Roda testes de integração (Playwright)
```
