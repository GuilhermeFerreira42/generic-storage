# CURRENT_STATE — GreenForge
> Última atualização: Fase 7 | 2026-06-17

## Arquitetura Ativa
- **Arquitetura Hexagonal:** Desacoplamento total via portas e adaptadores.
- **Orquestração:** Máquina de estados blindada e auditável.
- **Isolamento:** Sandbox físico via Git Worktrees.
- **Integração Externa:** Camada base para Model Context Protocol (MCP) com contratos estritos.

## Módulos e Contratos Vigentes
| Módulo | Arquivo | Contrato Público | Desde |
|--------|---------|------------------|-------|
| `LLMProvider` | `src/core/ports/LLMProvider.ts` | `generate(prompt: string): Promise<string>` | Fase 1 |
| `QwenRouter` | `src/infrastructure/llm/QwenRouter.ts` | `classify(input: string): Promise<Intent>` | Fase 1 |
| `WorktreeManager` | `src/infrastructure/git/WorktreeManager.ts` | `provision(taskId)`, `deprovision(taskId)`, `list()` | Fase 2 |
| `SafeResolve` | `src/shared/SafeResolve.ts` | `safeResolve`, `safeResolveForWrite` | Fase 3 |
| `AtomicWrite` | `src/shared/AtomicWrite.ts` | `atomicWrite(path, content)` | Fase 3 |
| `SQLiteRepository` | `src/infrastructure/db/SQLiteRepository.ts` | `createTask`, `getTask`, `updateTaskStatus`, `saveSubtasksGraph`, `runInTransaction` | Fase 4 |
| `PlannerEngine` | `src/core/PlannerEngine.ts` | `generatePlan(taskId, prompt)`, `savePlan(plan, root)` | Fase 5 |
| `Orchestrator` | `src/core/Orchestrator.ts` | `trigger(taskId, event): Promise<void>` | Fase 6 |
| `McpClientPort` | `src/core/ports/McpClientPort.ts` | `listTools(): Promise<McpTool[]>`, `callTool(name, input): Promise<McpCallResult>` | Fase 7 |

## Fluxo Principal
1. Router identifica tarefa técnica.
2. `PlannerEngine` gera plano auditável.
3. Usuário aprova plano.
4. `Orchestrator` gerencia execução (paralela ou sequencial).
5. Agentes especialistas (Fase 8) utilizam o `McpClientPort` para executar ferramentas externas validadas.

## Invariantes Globais
1. **No-Shell Policy:** `execa` sem shell.
2. **Fallback Seguro:** Incerteza = `NORMAL_CHAT`.
3. **Segurança de FS:** Acesso apenas via `SafeResolve`.
4. **Desacoplamento de SDK:** Core não depende de SDKs externos.
5. **Erros Estruturados:** Todas as falhas de MCP devem retornar `retryable: boolean`.
6. **Contratos Estritos:** Respostas de ferramentas externas são validadas contra schemas rigorosos para evitar estados contraditórios.

## Restrições Técnicas Ativas
- **Runtime:** Node.js v24.
- **MCP Validation:** Uso de Unions Discriminadas e Schemas Estritos (Zod).

## Testes Obrigatórios
| Suite | Arquivo | Cobertura Aproximada | Comando |
|-------|---------|----------------------|---------|
| Total Suíte | `tests/*.test.ts` | 92 testes ativos | `npm test` |
| MCP Client | `tests/mcp.test.ts` | 9 testes (Contratos/Inspeção) | `npm test` |

## Dependências Externas
| Pacote | Versão | Motivo |
|--------|--------|--------|
| `zod` | ^3.23.0 | Validação de schemas e contratos estritos. |
| `better-sqlite3` | ^11.0.0 | Persistência transacional. |
