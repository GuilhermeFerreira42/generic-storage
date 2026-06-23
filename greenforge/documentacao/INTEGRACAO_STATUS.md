# Status de Integração GreenForge × Qwen CLI

**Última atualização:** 2026-06-23
**Versão do Qwen CLI:** v0.4+
**Node.js mínimo:** v22+

## Componentes de Integração

| Componente | Mecanismo | Status | Arquivo de Referência | Observações |
|---|---|---|---|---|
| Inicialização | SessionStart hook | ✅ Implementado | `src/integration/qwen/HookSimulator.ts` | Substitui activate() |
| Shutdown | SessionEnd hook | ✅ Implementado | `src/integration/qwen/HookSimulator.ts` | Substitui deactivate() |
| Interceptação de prompt | UserPromptSubmit hook | ✅ Implementado | `src/integration/qwen/HookSimulator.ts` | Substitui onMessage() |
| Validação de ferramentas | PreToolUse hook | ✅ Implementado | `src/integration/qwen/HookSimulator.ts` | Substitui onToolCall() |
| Sync de estado | PreToolUse + PostToolUse | ✅ Implementado | `src/integration/qwen/HookSimulator.ts` | Workaround para onStateChange ausente |
| Ferramentas dinâmicas | MCP Server :7777 | ✅ Implementado | `src/infrastructure/mcp/MockMcpClient.ts` | Substitui registerTool() |
| Comandos slash | SKILL.md manifest | ✅ Implementado | `SKILL.md` | Substitui comandos slash Gemini |
| Controle de subagentes | SubagentStart/Stop hooks | ✅ Especificado | `06-api-and-extensibility.md` | NOVO — nativo no Qwen |
| Persistência global | SQLite (mantido) | ✅ Implementado | `src/infrastructure/db/SQLiteRepository.ts` | globalState → SQLite direto |
| Persistência workspace | SQLite (mantido) | ✅ Implementado | `src/infrastructure/db/SQLiteRepository.ts` | workspaceState → SQLite direto |

## Dívidas Técnicas Herdadas

1. **MockQwenHookRunner** → **RESOLVIDO** ✅
   - **Referência:** `03-technical-spec-and-data.md` (§7)
   - **Status:** **Concluído** — Substituído por `HookSimulator` + `QwenIntegrationRunner` com integração real aos componentes core.
   - **Implementação:** `src/integration/qwen/HookSimulator.ts`, `src/integration/qwen/QwenIntegrationRunner.ts`

2. **Error Handling MCP Server** → **RESOLVIDO** ✅
   - **Referência:** `06-api-and-extensibility.md` (§3)
   - **Status:** **Concluído** — `MockMcpClient` retorna formato padronizado `{ ok: boolean, content: any, error?: { code: string, message: string, retryable: boolean } }`.
   - **Implementação:** `src/infrastructure/mcp/MockMcpClient.ts`

3. **onStateChange Workaround** → **RESOLVIDO** ✅
   - **Referência:** `GREENFORGE_DESIGN.md` (§3.4)
   - **Status:** **Concluído** — Implementado via `PreToolUse` + `PostToolUse` hooks com checkpoint registration.
   - **Implementação:** `src/integration/qwen/HookSimulator.ts`

## Novos Componentes Implementados

| Componente | Arquivo | Descrição |
|---|---|---|
| QwenRouter | `src/infrastructure/llm/QwenRouter.ts` | Roteamento de intenção (NORMAL_CHAT vs DEVELOPMENT_TASK) |
| PlannerEngine | `src/core/PlannerEngine.ts` | Geração e validação de planos (Zod + DAG) |
| Orchestrator | `src/core/Orchestrator.ts` | Máquina de estados da tarefa |
| CoderAgent | `src/core/agents/CoderAgent.ts` | Agente de escrita de código |
| TesterAgent | `src/core/agents/TesterAgent.ts` | Agente de testes |
| ReviewerAgent | `src/core/agents/ReviewerAgent.ts` | Agente de revisão |
| JoinGate | `src/core/JoinGate.ts` | Consolidação de resultados paralelos |
| DiffLens | `src/core/DiffLens.ts` | Auditoria de diffs e relatórios |
| Verifier | `src/core/Verifier.ts` | Verificação final (testes + lint + diff) |
| SQLiteRepository | `src/infrastructure/db/SQLiteRepository.ts` | Persistência transacional |
| QwenIntegrationRunner | `src/integration/qwen/QwenIntegrationRunner.ts` | Orquestrador E2E completo |

## Testes E2E

| Teste | Status | Arquivo |
|---|---|---|
| 1. loads manifest and settings | ✅ Pass | `tests/qwen-e2e.test.ts` |
| 2. SessionStart returns ok | ✅ Pass | `tests/qwen-e2e.test.ts` |
| 3. UserPromptSubmit normal chat returns NOOP | ✅ Pass | `tests/qwen-e2e.test.ts` |
| 4. UserPromptSubmit development task starts controlled flow | ✅ Pass | `tests/qwen-e2e.test.ts` |
| 5. PreToolUse blocks unsafe write outside worktree | ✅ Pass | `tests/qwen-e2e.test.ts` |
| 6. PreToolUse allows safe operation inside worktree | ✅ Pass | `tests/qwen-e2e.test.ts` |
| 7. PostToolUse registers checkpoint | ✅ Pass | `tests/qwen-e2e.test.ts` |
| 8. SessionEnd returns ok | ✅ Pass | `tests/qwen-e2e.test.ts` |
| 9. full E2E minimum flow reaches APPROVED | ✅ Pass | `tests/qwen-e2e.test.ts` |
| 10. E2E with HIGH risk DiffLens reaches BLOCKED | ✅ Pass | `tests/qwen-e2e.test.ts` |
| 11. E2E with lint/test failure reaches RETRYABLE | ✅ Pass | `tests/qwen-e2e.test.ts` |
| 12-16. never calls real Qwen / network / LLM / merge / push | ✅ Pass | `tests/qwen-e2e.test.ts` |

**Total: 190 testes passando** (14 arquivos de teste)

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| QWEN_API_KEY | ✅ | Chave de API do Qwen |
| GF_WORKTREE_ROOT | ❌ | Raiz dos worktrees (default: .git/greenforge-worktrees) |
| GF_MAX_PARALLEL | ❌ | Máximo de tarefas simultâneas (default: 3) |
| GF_DB_PATH | ❌ | Caminho do SQLite (default: ~/.greenforge/greenforge.db) |
| GF_MCP_PORT | ❌ | Porta do MCP Server (default: 7777) |
| GF_LOG_LEVEL | ❌ | Nível de log: debug, info, warn, error (default: info) |
