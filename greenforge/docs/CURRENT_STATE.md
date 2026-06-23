# CURRENT_STATE — GreenForge
> Última atualização: Fase 13 (Refinada) | 2026-06-23

## Arquitetura Ativa
- **Arquitetura Hexagonal:** Desacoplamento total via portas e adaptadores.
- **Orquestração:** Máquina de estados blindada e auditável.
- **Isolamento:** Sandbox físico via Git Worktrees.
- **Integração Externa:** Camada MCP funcional com contratos estritos.
- **Visualização e Auditoria:** DiffLens Engine gerando relatórios de risco e alinhamento refinados.
- **Validação de Ciclo de Vida (Qwen CLI):** Extensão integrada estaticamente com manifesto de skills e configurações de hooks validadas via Zod.
- **Integração E2E Controlada (Fase 13):** Simulador de hooks Qwen e runner de integração validando fluxo completo sem Qwen real, MCP real, LLM real, rede ou merge/push. Inclui validação de segurança de `allowedRoot` para operações de escrita e limpeza de recursos temporários em todos os caminhos (sucesso, NORMAL_CHAT, BLOCKED, RETRYABLE, exceção).

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
| `Verifier` | `src/core/Verifier.ts` | `verify(input: VerificationInput): Promise<VerificationResult>` | Fase 11 |
| `ManifestSchemas` | `src/integration/qwen/manifestSchemas.ts` | `validateQwenExtensionManifest(input)`, `validateQwenSettings(input)`, `validateSkillManifest(markdown)` | Fase 12 |
| `HookSimulator` | `src/integration/qwen/HookSimulator.ts` | `simulate(input: HookSimulationInput): Promise<HookSimulationResult>` | Fase 13 |
| `QwenIntegrationRunner` | `src/integration/qwen/QwenIntegrationRunner.ts` | `runE2E(prompt: string): Promise<QwenE2EResult>` | Fase 13 |

## Fluxo Principal
1. Router identifica tarefa técnica.
2. `PlannerEngine` gera plano auditável.
3. Usuário aprova plano.
4. Agentes executam ferramentas via MCP nos Worktrees.
5. `JoinGate` valida e consolida os artefatos.
6. **DiffLens Engine** analisa artefatos, valida conteúdos de revisão e gera o relatório oficial `GREENFORGE_AUDIT.md`.
7. **Verifier** consolida todos os sinais técnicos, valida a consistência do identificador da tarefa e gera o veredito final estruturado (`APPROVED` | `BLOCKED` | `RETRYABLE`).
8. **Qwen CLI Extension Layer** mapeia hooks locais do host e expõe comandos estáticos definidos via `SKILL.md`.
9. **Fase 13 — E2E Controlado:** `HookSimulator` simula eventos `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `SessionEnd`; `QwenIntegrationRunner` orquestra fluxo completo simulado conectando ao core (Router, Planner, SQLite, Orchestrator, JoinGate, DiffLens, Verifier) via mocks. PreToolUse valida `allowedRoot` com `path.resolve` + `path.relative`. Recursos temporários são limpos em todos os caminhos via `try/catch/finally`.

## Invariantes Globais
1. **No-Shell Policy:** `execa` sem shell.
2. **Fallback Seguro:** Incerteza = `NORMAL_CHAT`.
3. **Segurança de FS:** Acesso apenas via `SafeResolve`.
4. **Integridade de Auditoria:** Mudanças em arquivos críticos forçam `Risk Level: HIGH`.
5. **Contratos Blindados:** Auditoria via Zod impede geração de relatórios inconsistentes.
6. **Isolamento de Testes E2E:** Nenhum teste E2E chama Qwen real, MCP real, LLM real, rede, merge ou push.

## Restrições Técnicas Ativas
- **Runtime:** Node.js v24.
- **Audit Constraints:** Alinhamento `PARTIAL` em caso de erro de parsing de revisão; `DIVERGED` em caso de violações explícitas.
- **Extension Isolation:** Testes estáticos proíbem conexões reais a redes ou processos externos no carregamento de manifestos.
- **E2E Isolation:** Testes E2E usam apenas mocks, fakes e diretórios temporários.

## Testes Obrigatórios
| Suite | Arquivo | Cobertura Aproximada | Comando |
|-------|---------|----------------------|---------|
| Total Suíte | `tests/*.test.ts` | 200 testes ativos | `npm test` |
| Qwen Integration (Static) | `tests/qwen-integration.test.ts` | 24 testes (Estáticos) | `npm test` |
| Qwen Integration (E2E) | `tests/qwen-e2e.test.ts` | 22 testes (E2E Controlado) | `npm test` |
| DiffLens | `tests/difflens.test.ts` | 13 testes (Refinados) | `npm test` |
| Verifier | `tests/verifier.test.ts` | 21 testes (Unitários) | `npm test` |

## Dependências Externas
| Pacote | Versão | Motivo |
|--------|--------|--------|
| `zod` | ^3.23.0 | Validação de contratos e auditorias. |
| `better-sqlite3` | ^11.0.0 | Persistência. |