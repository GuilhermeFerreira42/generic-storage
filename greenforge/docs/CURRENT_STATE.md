# CURRENT_STATE — GreenForge
> Última atualização: Fase 5 | 2026-06-16

## Arquitetura Ativa
- **Arquitetura Hexagonal:** Core desacoplado via portas.
- **Orquestração:** Triagem via Router e Planejamento via `PlannerEngine`.
- **Isolamento:** Sandbox físico via Git Worktrees.
- **Segurança:** Validação de caminhos (`SafeResolve`) e integridade de escrita (`AtomicWrite`).
- **Persistência:** SQLite com modo WAL, transações ACID e Foreign Keys ativas.

## Módulos e Contratos Vigentes
| Módulo | Arquivo | Contrato Público | Desde |
|--------|---------|------------------|-------|
| `LLMProvider` | `src/core/ports/LLMProvider.ts` | `generate(prompt: string): Promise<string>` | Fase 1 |
| `QwenRouter` | `src/infrastructure/llm/QwenRouter.ts` | `classify(input: string): Promise<Intent>` | Fase 1 |
| `WorktreeManager` | `src/infrastructure/git/WorktreeManager.ts` | `provision(taskId)`, `deprovision(taskId)`, `list()` | Fase 2 |
| `SafeResolve` | `src/shared/SafeResolve.ts` | `safeResolve`, `safeResolveForWrite` | Fase 3 |
| `AtomicWrite` | `src/shared/AtomicWrite.ts` | `atomicWrite(path, content)` | Fase 3 |
| `SQLiteRepository` | `src/infrastructure/db/SQLiteRepository.ts` | `createTask`, `getTask`, `updateTaskStatus`, `saveSubtasksGraph`, `runInTransaction` | Fase 4 |
| `PlannerEngine` | `src/core/PlannerEngine.ts` | `generatePlan(taskId, prompt)`, `renderToMarkdown(plan)`, `savePlan(plan, root)` | Fase 5 |

## Fluxo Principal
1. Router identifica tarefa técnica.
2. `PlannerEngine` gera plano estruturado (JSON) validado via Zod.
3. Plano é verificado contra dependências circulares, IDs duplicados e IDs inexistentes.
4. Plano é renderizado em markdown e salvo como `GREENFORGE_PLAN.md` no worktree.
5. Sistema aguarda aprovação (Fase 6).

## Invariantes Globais
1. **No-Shell Policy:** `execa` sem shell.
2. **Fallback Seguro:** Incerteza = `NORMAL_CHAT`.
3. **Segurança de FS:** Acesso apenas via `SafeResolve`.
4. **Aciclicidade:** Grafo de subtarefas deve ser um DAG (Directed Acyclic Graph).
5. **Clarificação Mínima:** Sempre 5-7 perguntas de clarificação por plano.
6. **Integridade de IDs:** IDs de subtarefas devem ser únicos no grafo.
7. **Não-Confiança no LLM:** Campos críticos como `id` e `originalPrompt` no plano são sobrescritos pelo sistema.

## Restrições Técnicas Ativas
- **Runtime:** Node.js v24.
- **Plan Constraints:** 5-7 perguntas, grafo validado, persistência atômica como `GREENFORGE_PLAN.md`.

## Testes Obrigatórios
| Suite | Arquivo | Cobertura Aproximada | Comando |
|-------|---------|----------------------|---------|
| Total Suíte | `tests/*.test.ts` | 61 testes ativos | `npm test` |
| Planner Test | `tests/planner.test.ts` | 13 testes (Integridade + FS) | `npm test` |

## Dependências Externas
| Pacote | Versão | Motivo |
|--------|--------|--------|
| `zod` | ^3.23.0 | Validação de schemas (LLM/Plano). |
| `better-sqlite3` | ^11.0.0 | Persistência ACID. |
