# CURRENT_STATE — GreenForge
> Última atualização: Fase 6 | 2026-06-16

## Arquitetura Ativa
- **Arquitetura Hexagonal:** Core desacoplado via portas.
- **Orquestração:** Máquina de estados centralizada e blindada no `Orchestrator`.
- **Planejamento:** `PlannerEngine` gera planos estruturados e DAGs.
- **Isolamento:** Sandbox físico via Git Worktrees.
- **Segurança:** Validação de caminhos e integridade de escrita.
- **Persistência:** SQLite com modo WAL, transações ACID e Foreign Keys.

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

## Fluxo Principal
1. Router identifica tarefa técnica.
2. `PlannerEngine` gera plano (auditado via `PLAN_GENERATED`).
3. Usuário aprova plano (`APPROVE_PLAN`).
4. `Orchestrator` inicia construção.
5. Se 1 tarefa: `BUILDING`. Se 2+ tarefas: `BUILDING_PARALLEL`.
6. Estados terminais `COMPLETED` e `FAILED` bloqueiam transações subsequentes.

## Invariantes Globais
1. **No-Shell Policy:** `execa` sem shell.
2. **Fallback Seguro:** Incerteza = `NORMAL_CHAT`.
3. **Segurança de FS:** Acesso apenas via `SafeResolve`.
4. **Aciclicidade:** Grafo de subtarefas deve ser um DAG.
5. **Aprovação Obrigatória:** Proibido ir de `PLANNING` para `BUILDING` sem `APPROVE_PLAN`.
6. **Integridade de Transição:** Todas as mudanças de status e checkpoints são atômicos (Rollback em falhas).
7. **Estados Terminais:** Proibido sair de `COMPLETED` ou `FAILED`.

## Restrições Técnicas Ativas
- **Retry Limit:** Máximo de 3 tentativas de verificação.
- **Rollback Garantido:** Transações SQLite em todas as transições críticas.

## Testes Obrigatórios
| Suite | Arquivo | Cobertura Aproximada | Comando |
|-------|---------|----------------------|---------|
| Total Suíte | `tests/*.test.ts` | 83 testes ativos | `npm test` |
| Orchestrator | `tests/orchestrator.test.ts` | 22 testes (Refinados) | `npm test` |

## Dependências Externas
| Pacote | Versão | Motivo |
|--------|--------|--------|
| `better-sqlite3` | ^11.0.0 | Persistência transacional. |
| `zod` | ^3.23.0 | Validação de contratos. |
