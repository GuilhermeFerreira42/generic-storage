# CURRENT_STATE — GreenForge
> Última atualização: Fase 10 | 2026-06-18

## Arquitetura Ativa
- **Arquitetura Hexagonal:** Desacoplamento via portas e adaptadores.
- **Orquestração:** Máquina de estados blindada.
- **Isolamento:** Sandbox físico via Git Worktrees.
- **Integração Externa:** Camada MCP funcional.
- **Consolidação:** Join Gate operacional.
- **Visualização e Auditoria:** DiffLens Engine gerando relatórios de risco e alinhamento.

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
| `McpClientPort` | `src/core/ports/McpClientPort.ts` | `listTools()`, `callTool(name, input)` | Fase 7 |
| `BaseAgent` | `src/core/agents/BaseAgent.ts` | `execute(context): Promise<AgentResult>` | Fase 8 |
| `JoinGate` | `src/core/JoinGate.ts` | `join(input: JoinInput): Promise<JoinResult>` | Fase 9 |
| `DiffLens` | `src/core/DiffLens.ts` | `generateReport(taskId, artifacts)`, `renderMarkdown(report)`, `saveAuditReport(report, root)` | Fase 10 |

## Fluxo Principal
1. Router identifica tarefa técnica.
2. `PlannerEngine` gera plano DAG.
3. `Orchestrator` delega aos Agentes.
4. Agentes executam ferramentas via MCP nos Worktrees.
5. `JoinGate` valida e consolida os artefatos produzidos.
6. **DiffLens Engine** analisa os artefatos, calcula o nível de risco e gera o relatório `GREENFORGE_AUDIT.md`.

## Invariantes Globais
1. **No-Shell Policy:** `execa` sem shell.
2. **Fallback Seguro:** Incerteza = `NORMAL_CHAT`.
3. **Segurança de FS:** Acesso apenas via `SafeResolve`.
4. **Privilégio Mínimo:** Agentes restritos via `allowedTools`.
5. **Consistência de Join:** Proibido avançar se houver falha.
6. **Integridade de Auditoria:** Mudanças em arquivos críticos (`.env`, `package.json`, etc.) resultam em `Risk Level: HIGH`.

## Restrições Técnicas Ativas
- **Runtime:** Node.js v24.
- **Audit Constraints:** Alinhamento de plano marcado como `DIVERGED` se houver violações de revisão.

## Testes Obrigatórios
| Suite | Arquivo | Cobertura Aproximada | Comando |
|-------|---------|----------------------|---------|
| Total Suíte | `tests/*.test.ts` | 135 testes ativos | `npm test` |
| DiffLens | `tests/difflens.test.ts` | 15 testes (Lógica + Auditoria) | `npm test` |

## Dependências Externas
| Pacote | Versão | Motivo |
|--------|--------|--------|
| `zod` | ^3.23.0 | Validação de contratos e relatórios de auditoria. |
| `better-sqlite3` | ^11.0.0 | Persistência. |
