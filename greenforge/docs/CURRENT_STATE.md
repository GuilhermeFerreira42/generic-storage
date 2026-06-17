# CURRENT_STATE — GreenForge
> Última atualização: Fase 8 | 2026-06-17

## Arquitetura Ativa
- **Arquitetura Hexagonal:** Desacoplamento total via portas e adaptadores.
- **Orquestração:** Máquina de estados blindada e auditável.
- **Isolamento:** Sandbox físico via Git Worktrees.
- **Integração Externa:** Camada MCP com contratos estritos.
- **Execução Especializada:** Agentes @Coder, @Tester e @Reviewer operando via MCP em modo MVP.

## Módulos e Contratos Vigentes
| Módulo | Arquivo | Contrato Público | Desde |
|--------|---------|------------------|-------|
| `LLMProvider` | `src/core/ports/LLMProvider.ts` | `generate(prompt: string): Promise<string>` | Fase 1 |
| `QwenRouter` | `src/infrastructure/llm/QwenRouter.ts` | `classify(input: string): Promise<Intent>` | Fase 1 |
| `WorktreeManager` | `src/infrastructure/git/WorktreeManager.ts` | `provision(taskId)`, `deprovision(taskId)`, `list()` | Fase 2 |
| `SafeResolve` | `src/shared/SafeResolve.ts` | `safeResolve`, `safeResolveForWrite` | Fase 3 |
| `AtomicWrite` | `src/shared/AtomicWrite.ts` | `atomicWrite(path, content)` | Fase 3 |
| `SQLiteRepository` | `src/infrastructure/db/SQLiteRepository.ts` | `createTask`, `getTask`, `updateTaskStatus`, `runInTransaction` | Fase 4 |
| `PlannerEngine` | `src/core/PlannerEngine.ts` | `generatePlan(taskId, prompt)`, `savePlan(plan, root)` | Fase 5 |
| `Orchestrator` | `src/core/Orchestrator.ts` | `trigger(taskId, event): Promise<void>` | Fase 6 |
| `McpClientPort` | `src/core/ports/McpClientPort.ts` | `listTools()`, `callTool(name, input)` | Fase 7 |
| `BaseAgent` | `src/core/agents/BaseAgent.ts` | `execute(context): Promise<AgentResult>` | Fase 8 |

## Fluxo Principal
1. Router identifica tarefa técnica.
2. `PlannerEngine` gera plano auditável.
3. Usuário aprova plano.
4. `Orchestrator` delega subtarefas aos agentes especialistas (@Coder, @Tester, @Reviewer).
5. Agentes executam ferramentas via `McpClientPort` em seus respectivos worktrees (Mocks em MVP).
6. Resultados são consolidados e validados por schema.

## Invariantes Globais
1. **No-Shell Policy:** `execa` sem shell.
2. **Fallback Seguro:** Incerteza = `NORMAL_CHAT`.
3. **Segurança de FS:** Acesso apenas via `SafeResolve`.
4. **Privilégio Mínimo:** Agentes bloqueados de chamar ferramentas fora de `allowedTools` no fluxo real.
5. **Resultados Blindados:** Todos os resultados de agentes são validados via Zod antes do retorno.

## Restrições Técnicas Ativas
- **Runtime:** Node.js v24.
- **Agent Validation:** Uso de Zod para validar `AgentContext` (campos não vazios) e `AgentResult`.
- **Review Validation:** `ReviewerAgent` valida conteúdo da ferramenta contra schema de revisão.

## Testes Obrigatórios
| Suite | Arquivo | Cobertura Aproximada | Comando |
|-------|---------|----------------------|---------|
| Total Suíte | `tests/*.test.ts` | 106 testes ativos | `npm test` |
| Agents MVP | `tests/agents.test.ts` | 14 testes (Agentes + Regras de Fluxo Real) | `npm test` |

## Dependências Externas
| Pacote | Versão | Motivo |
|--------|--------|--------|
| `zod` | ^3.23.0 | Validação de contratos e schemas de agentes. |
| `better-sqlite3` | ^11.0.0 | Persistência. |
