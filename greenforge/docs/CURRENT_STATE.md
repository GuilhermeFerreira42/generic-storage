# CURRENT_STATE — GreenForge
> Última atualização: Fase 10 | 2026-06-18

## Arquitetura Ativa
- **Arquitetura Hexagonal:** Desacoplamento total via portas e adaptadores.
- **Orquestração:** Máquina de estados blindada e auditável.
- **Isolamento:** Sandbox físico via Git Worktrees.
- **Integração Externa:** Camada MCP funcional com contratos estritos.
- **Visualização e Auditoria:** DiffLens Engine gerando relatórios de risco e alinhamento refinados.

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
| `DiffLens` | `src/core/DiffLens.ts` | `generateReport(taskId, artifacts)`, `renderMarkdown(report)`, `saveAuditReport(report, root)` | Fase 10 |

## Fluxo Principal
1. Router identifica tarefa técnica.
2. `PlannerEngine` gera plano auditável.
3. Usuário aprova plano.
4. Agentes executam ferramentas via MCP nos Worktrees.
5. `JoinGate` valida e consolida os artefatos.
6. **DiffLens Engine** analisa artefatos, valida conteúdos de revisão e gera o relatório oficial `GREENFORGE_AUDIT.md`.

## Invariantes Globais
1. **No-Shell Policy:** `execa` sem shell.
2. **Fallback Seguro:** Incerteza = `NORMAL_CHAT`.
3. **Segurança de FS:** Acesso apenas via `SafeResolve`.
4. **Integridade de Auditoria:** Mudanças em arquivos críticos forçam `Risk Level: HIGH`.
5. **Contratos Blindados:** Auditoria via Zod impede geração de relatórios inconsistentes.

## Restrições Técnicas Ativas
- **Runtime:** Node.js v24.
- **Audit Constraints:** Alinhamento `PARTIAL` em caso de erro de parsing de revisão; `DIVERGED` em caso de violações explícitas.

## Testes Obrigatórios
| Suite | Arquivo | Cobertura Aproximada | Comando |
|-------|---------|----------------------|---------|
| Total Suíte | `tests/*.test.ts` | 133 testes ativos | `npm test` |
| DiffLens | `tests/difflens.test.ts` | 13 testes (Refinados) | `npm test` |

## Dependências Externas
| Pacote | Versão | Motivo |
|--------|--------|--------|
| `zod` | ^3.23.0 | Validação de contratos e auditorias. |
| `better-sqlite3` | ^11.0.0 | Persistência. |
