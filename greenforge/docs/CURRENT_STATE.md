# CURRENT_STATE — GreenForge
> Última atualização: Fase 9 | 2026-06-17

## Arquitetura Ativa
- **Arquitetura Hexagonal:** Desacoplamento total via portas e adaptadores.
- **Orquestração:** Máquina de estados blindada e atômica.
- **Isolamento:** Sandbox físico via Git Worktrees.
- **Integração Externa:** Camada MCP com contratos estritos.
- **Consolidação:** Join Gate operacional com validação rigorosa de integridade e sincronização.

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
| `JoinGate` | `src/core/JoinGate.ts` | `join(input: JoinInput): Promise<JoinResult>` | Fase 9 |

## Fluxo Principal
1. Router identifica tarefa técnica.
2. `PlannerEngine` gera plano auditável.
3. Usuário aprova plano.
4. `Orchestrator` delega subtarefas aos Agentes.
5. Agentes executam via MCP nos Worktrees.
6. **Join Gate** valida integridade estrutural, detecta resultados duplicados/órfãos e consolida artefatos.
7. Sistema transita para verificação final.

## Invariantes Globais
1. **No-Shell Policy:** `execa` sem shell.
2. **Fallback Seguro:** Incerteza = `NORMAL_CHAT`.
3. **Segurança de FS:** Acesso apenas via `SafeResolve`.
4. **Privilégio Mínimo:** Agentes restritos via `allowedTools`.
5. **Consistência de Join:** Proibido avançar se houver falha, pendência ou falta de artefatos.
6. **Integridade de Resultados:** Apenas artefatos de subtarefas bem-sucedidas (`DONE`) são consolidados.

## Restrições Técnicas Ativas
- **Runtime:** Node.js v24.
- **Validation:** Uso mandatório de Zod para entrada e saída no portão de consolidação.

## Testes Obrigatórios
| Suite | Arquivo | Cobertura Aproximada | Comando |
|-------|---------|----------------------|---------|
| Total Suíte | `tests/*.test.ts` | 120 testes ativos | `npm test` |
| Join Gate | `tests/join-gate.test.ts` | 14 testes (Lógica + Validação Zod) | `npm test` |

## Dependências Externas
| Pacote | Versão | Motivo |
|--------|--------|--------|
| `zod` | ^3.23.0 | Validação de contratos e barreiras de integridade. |
| `better-sqlite3` | ^11.0.0 | Persistência. |
