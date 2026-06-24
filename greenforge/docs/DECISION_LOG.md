# DECISION_LOG — GreenForge

## Formato
`[FASE] | [TIPO] | [DECISÃO] | [MOTIVO] | [ARQUIVOS IMPACTADOS]`

Tipos: ADD, MOD, DEL, FREEZE, RULE, CFG, FIX, TECH

---

### Fase 0 — Planejamento
F0 | ADD | Estrutura de diretórios portátil | Documentação acompanha código | `greenforge/documentacao/`

### Fase 1 — Intention Router
F1 | ADD | QwenRouter com Zod | Validação de contratos com LLM | `src/infrastructure/llm/QwenRouter.ts`

### Fase 2 — Worktree Manager
F2 | ADD | WorktreeManager | Isolamento físico de tarefas | `src/infrastructure/git/WorktreeManager.ts`

### Fase 3 — Segurança de Path
F3 | ADD | SafeResolve | Prevenir Path Traversal | `src/shared/SafeResolve.ts`

### Fase 4 — Persistence Layer
F4 | ADD | SQLiteRepository | Centralizar persistência de tarefas e checkpoints | `src/infrastructure/db/SQLiteRepository.ts`

### Fase 5 — Planner Engine
F5 | ADD | PlannerEngine | Motor de planos estruturados | `src/core/PlannerEngine.ts`

### Fase 6 — Orchestrator
F6 | ADD | Orchestrator | Gestão centralizada via máquina de estados | `src/core/Orchestrator.ts`

### Fase 7 — MCP Base Integration
F7 | ADD | McpClientPort | Interface de porta para desacoplar o core do SDK oficial do MCP | `src/core/ports/McpClientPort.ts`

### Fase 8 — Agentes Especialistas
F8 | ADD | Specialist Agents (@Coder, @Tester, @Reviewer) | Decompor execução em papéis técnicos específicos | `src/core/agents/`

### Fase 9 — Join Gate
F9 | ADD | JoinGate | Componente de sincronização e validação de subtarefas | `src/core/JoinGate.ts`

### Fase 10 — DiffLens Engine
F10 | ADD | DiffLens | Motor de auditoria humana e análise de risco | `src/core/DiffLens.ts`
F10 | RULE | Detecção de Arquivos Críticos | Mudanças em `.env`, `package.json` ou núcleos de segurança forçam `Risk Level: HIGH` | `src/core/DiffLens.ts`
F10 | FIX | Relatório Markdown Confiável | Correção do nome do arquivo para `GREENFORGE_AUDIT.md` e eliminação de links malformados | `src/core/DiffLens.ts`
F10 | MOD | Validação de Revisão | Implementada validação Zod para conteúdos de `REVIEW_REPORT` nos artefatos | `src/core/DiffLens.ts`
F10 | RULE | Alinhamento Reativo Refinado | Uso de `PARTIAL` para erros de formato e `DIVERGED` para violações de qualidade | `src/core/DiffLens.ts`
F10 | CFG | Contrato DiffReport Puro | Remoção do campo `ok` redundante para manter integridade com o schema Zod | `src/core/types/DiffLens.ts`

### Fase 11 — Verifier
F11 | ADD | Verifier Component | Componente de aceitação e consolidação técnica | `src/core/Verifier.ts`
F11 | ADD | Verifier Type Definitions | Contratos robustos para inputs/outputs de verificação com validação Zod | `src/core/types/Verifier.ts`
F11 | RULE | Precedência de Status de Verificação | BLOCKED > RETRYABLE > APPROVED | `src/core/Verifier.ts`
F11 | RULE | Mapeamento de Falhas e Alinhamento | Mapeamento de erros de JoinGate, alinhamento DIVERGED e risco HIGH para bloqueios/retries | `src/core/Verifier.ts`
F11 | RULE | Consistência de taskId | O Verifier rejeita execuções caso input.taskId, diffReport.taskId e joinResult.taskId divirjam | `src/core/Verifier.ts`

### Fase 12 — Qwen Integration Base
F12 | ADD | Qwen static configuration schemas | Schemas Zod de validação síncrona para manifesto e settings | `src/integration/qwen/manifestSchemas.ts`
F12 | CFG | Configuração declarativa da extensão | Definição de skills, hooks locais e comandos da extensão | `qwen-extension.json`, `.qwen/settings.json`, `.qwen/skills/greenforge/SKILL.md`

### Fase 13 — Qwen Integration E2E Controlada
F13 | ADD | HookSimulator | Simulador de eventos de hooks Qwen (SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, SessionEnd) | `src/integration/qwen/HookSimulator.ts`
F13 | ADD | QwenIntegrationRunner | Orquestrador de fluxo E2E simulado conectando hooks ao core via mocks | `src/integration/qwen/QwenIntegrationRunner.ts`
F13 | ADD | Qwen E2E Types | Contratos Zod para HookSimulationInput, HookSimulationResult, QwenE2EResult | `src/integration/qwen/types.ts`
F13 | ADD | Qwen E2E Tests | Testes de integração controlada cobrindo 22 cenários obrigatórios | `tests/qwen-e2e.test.ts`
F13 | RULE | Isolamento Total de Testes E2E | Nenhum teste chama Qwen real, MCP real, LLM real, rede, merge ou push | `tests/qwen-e2e.test.ts`
F13 | RULE | Mock-First Architecture | Uso de mocks, fakes e diretórios temporários para todos os componentes core | `src/integration/qwen/QwenIntegrationRunner.ts`
F13 | FIX | Cleanup de Recursos Temporários | `QwenIntegrationRunner` usa `try/catch/finally` para garantir limpeza de `tempDir` e `SQLiteRepository` em todos os caminhos (sucesso, NORMAL_CHAT, BLOCKED, RETRYABLE, exceção). `preserveOnError` só preserva em caso de exceção real. | `src/integration/qwen/QwenIntegrationRunner.ts`
F13 | FIX | Validação Robusta de PreToolUse | `HookSimulator.handlePreToolUse` valida `allowedRoot` usando `path.resolve` e `path.relative` para prevenir Path Traversal | `src/integration/qwen/HookSimulator.ts`
F13 | FIX | Tipagem sem `any` | `repository` e `orchestrator` tipados como `SQLiteRepository | null` e `Orchestrator | null` com guards internos `getRepository()` e `getOrchestrator()` | `src/integration/qwen/QwenIntegrationRunner.ts`

### Fase 14 — Qwen CLI Extension Real
F14 | ADD | QwenExtensionRuntime | Runtime real que carrega/valida manifest, settings, SKILL.md e provê componentes core (QwenRouter, PlannerEngine, SQLiteRepository, Orchestrator) | `src/integration/qwen/QwenExtensionRuntime.ts`
F14 | ADD | QwenHookHandler | Handlers reais para 5 hooks Qwen (SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, SessionEnd) | `src/integration/qwen/QwenHookHandler.ts`
F14 | ADD | QwenCommandHandler | Implementação dos comandos da extensão: start, status, list, approve, abort | `src/integration/qwen/QwenCommandHandler.ts`
F14 | ADD | QwenExtensionEntrypoint | Entrypoint importável sem side effects + factory `createExtension()` | `src/integration/qwen/QwenExtensionEntrypoint.ts`
F14 | ADD | runtimeTypes | Schemas Zod para RuntimeOptions, HookHandlerResult, CommandHandlerResult e payloads | `src/integration/qwen/runtimeTypes.ts`
F14 | RULE | Segurança PreToolUse | Validação de path via path.resolve + path.relative, sem validação textual frágil | `src/integration/qwen/QwenHookHandler.ts`
F14 | RULE | InternalMockLLMProvider | Zero chamadas a Qwen real, LLM real, rede, merge/push em testes | `src/integration/qwen/QwenExtensionRuntime.ts`
F14 | RULE | Entrypoint sem side effects | QwenExtensionEntrypoint importável sem IIFE ou execução top-level | `src/integration/qwen/QwenExtensionEntrypoint.ts`
F14 | TECH | Isolation introspection | usesRealQwen(), usesRealLLM(), makesNetworkCalls(), canDoDestructiveGitOps() para asserções de isolamento | `src/integration/qwen/QwenExtensionRuntime.ts`