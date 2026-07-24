# CURRENT_STATE — GreenForge
> Última atualização: Fase 23 (Blueprint) | 2026-07-22

## Arquitetura Ativa
- **Arquitetura Hexagonal:** Desacoplamento total via portas e adaptadores.
- **Orquestração:** Máquina de estados blindada e auditável.
- **Isolamento:** Sandbox físico via Git Worktrees.
- **Integração Externa:** Camada MCP funcional com contratos estritos.
- **Visualização e Auditoria:** DiffLens Engine gerando relatórios de risco e alinhamento refinados.
- **Validação de Ciclo de Vida (Qwen CLI):** Extensão integrada estaticamente com manifesto de skills e configurações de hooks validadas via Zod.
- **Integração E2E Controlada (Fase 13):** Simulador de hooks Qwen e runner de integração validando fluxo completo sem Qwen real, MCP real, LLM real, rede ou merge/push. Inclui validação de segurança de `allowedRoot` para operações de escrita e limpeza de recursos temporários em todos os caminhos (sucesso, NORMAL_CHAT, BLOCKED, RETRYABLE, exceção).
- **Camada Real de Runtime Qwen (Fase 14):** Runtime real com QwenExtensionRuntime, QwenHookHandler, QwenCommandHandler e QwenExtensionEntrypoint. Integração com componentes reais do GreenForge (QwenRouter, PlannerEngine, SQLiteRepository, Orchestrator) usando InternalMockLLMProvider. Segurança em PreToolUse com path.resolve + path.relative. Entrypoint importável sem efeitos colaterais, sem chamadas de rede, sem git push/merge.
- **UI/UX de Revisão de Planos (Fase 15):** Camada de revisão de planos com controller testável, renderizador textual e integração Qwen. Exibe título/prompt/perguntas/subtarefas/dependências/agentes/critérios/riscos. Permite feedback textual, respostas a perguntas, aprovação via Orchestrator, rejeição com motivo e solicitação de mudanças. Todos os contratos validados por Zod. **Status: CONCLUÍDA E VALIDADA.**
- **Agente de Refatoração (Fase 16):** RefactorAgent especialista em refatoração de código, integrado à arquitetura de agentes existente. Herda de BaseAgent, usa McpClientPort, chama ferramenta `refactor_code` via MCP mockado, retorna artifacts DIFF com resumo e diff. Nova role `REFACTORER` adicionada aos contratos AgentRole, AgentResultSchema, SubtaskNode, JoinGate e PlanReview. Compatibilidade retroativa garantida com CODER, TESTER, REVIEWER. **Status: CONCLUÍDA E VALIDADA.**
- **Suporte a Múltiplos LLMs (Fase 17):** Camada de infraestrutura para seleção configurável e extensível de provedores LLM. `LLMProviderRegistry` registra e cria providers por nome. `LLMProviderFactory` valida config via Zod, suporta fallback seguro para `mock` quando provider é desconhecido. `MockLLMProvider` retorna respostas determinísticas para testes. Providers reais (Qwen, OpenAI, Claude, Gemini) são safe stubs que implementam `LLMProvider` mas impedem chamadas reais sem transport/credenciais explícitas, falhando com `LLMProviderError` estruturado. Contratos Zod: `LLMProviderNameSchema`, `LLMProviderConfigSchema`, `LLMProviderFactoryOptionsSchema`. Integração direta com QwenRouter e PlannerEngine via providers criados pela factory; QwenExtensionRuntime mantém mock interno seguro e segue compatível. Nenhum teste chama LLM real, rede ou exige API key. **Status: CONCLUÍDA E VALIDADA.**
- **Validação em Campo e Empacotamento Final (Fase 18):** Validação operacional controlada do runtime real via `QwenExtensionEntrypoint`. Teste E2E real executado via `QwenExtensionEntrypoint` cobrindo todos os 5 hooks (SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, SessionEnd) e todos os 5 comandos (start, status, list, approve, abort). Segurança PreToolUse validada (ALLOW dentro do worktree, BLOCK fora). Isolamento garantido (sem Qwen/MCP/LLM real, rede, git destrutivo). Artefatos verificados: SKILL.md com nome exato, URLs reais em settings.json, sem markdown artifacts. Documentação completa: README.md e GUIA_DE_USO.md criados. **Status: CONCLUÍDA E VALIDADA.**
- **Servidor MCP Real (Fase 19):** `McpGreenForgeServer` instancia `McpServer` do `@modelcontextprotocol/sdk` e registra todas as 10 tools MCP com prefixo `greenforge_` (start, status, list, approve, abort, review, feedback, reject, needs_changes, review_status). Cada tool usa `inputSchema` com Zod para validação e delega para `QwenCommandHandler` ou `PlanReviewHandler` existentes. Modo MCP no `src/index.ts` conecta via `StdioServerTransport`. Logs vão exclusivamente para stderr (stdout reservado para JSON-RPC). `InternalMockLLMProvider` como provider padrão. Nenhum teste chama Qwen real, LLM real, MCP real, rede ou git destrutivo. **Status: CONCLUÍDA E VALIDADA.**

## Fase 23 — Transporte Real de LLM (litellm) [DECIDIDA / BLUEPRINT]
- **Decisão de arquitetura:** litellm atua como **CANO** de transporte OpenAI-compatível; GreenForge mantém o controle de formatação/validação via adaptador interno (`LiteLLMProvider`) com **Zod**. Arquitetura hexagonal **NÃO exige mudança de núcleo**. (Detalhes: `documentacao/GREENFORGE_DESIGN.md` §10 e `docs/phase_23_blueprint.md`.)
- **Adaptador LiteLLMProvider (planejado):** implementa `LLMProvider`; config `base_url` + `model`; chave opcional em self-host; segue padrão safe-stub F17.
- **Blindagem anti-perda-de-contexto:** adaptador valida/forma payload com Zod antes de enviar; warning **DROP DETECTED** no SQLite se parâmetro for descartado.
- **Roteamento assimétrico:** duas instâncias litellm — **porta 4000** (pool grande: DeepSeek V4 Pro, Nemotron) para agentes; **porta 4001** (pool pequeno/FAST) para `QwenRouter` classificar intenção em <1,2s. Perfis via header HTTP.
- **Trava física de testes:** `LLMProviderFactory` lança erro se `NODE_ENV==='test'` + transporte real → 468 testes não tocam rede.
- **Status:** DECIDIDA (Blueprint aprovado; implementação pendente).

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
| `QwenExtensionRuntime` | `src/integration/qwen/QwenExtensionRuntime.ts` | `initialize()`, `getRouter()`, `getPlanner()`, `getRepository()`, `getOrchestrator()`, `cleanup()` | Fase 14 |
| `QwenHookHandler` | `src/integration/qwen/QwenHookHandler.ts` | `handleSessionStart`, `handleUserPromptSubmit`, `handlePreToolUse`, `handlePostToolUse`, `handleSessionEnd` | Fase 14 |
| `QwenCommandHandler` | `src/integration/qwen/QwenCommandHandler.ts` | `handle(name, args)`, `hasHandler(name)` | Fase 14 |
| `QwenExtensionEntrypoint` | `src/integration/qwen/QwenExtensionEntrypoint.ts` | `init()`, hook handlers, `handleCommand`, `cleanup()`, `createExtension(options)` | Fase 14 |
| `QwenSettingsDispatcher` | `src/integration/qwen/QwenSettingsDispatcher.ts` | `getDeclaredHookRoutes()`, `dispatchHook()`, `resolveLocalCommand()`, `resolveAllLocalCommands()`, `getDeclaredHttpRoutes()` | Fase 14 |
| `PlanReviewController` | `src/core/PlanReviewController.ts` | `buildReviewView(taskId)`, `submitFeedback(input)`, `approvePlan(input)`, `rejectPlan(input)`, `requestChanges(input)`, `getReviewStatus(taskId)`, `getFeedbackHistory(taskId)`, `renderReviewToMarkdown(taskId)` | Fase 15 |
| `PlanReviewRenderer` | `src/core/PlanReviewRenderer.ts` | `render(view)`, `renderQuestions(view)`, `renderRisks(view)`, `renderDependencies(view)`, `renderFeedbackTemplate(view)`, `renderCompact(view)` | Fase 15 |
| `PlanReviewHandler` | `src/integration/qwen/PlanReviewHandler.ts` | `handle(name, args)`, `hasHandler(name)` — comandos: review, feedback, approve, reject, needs-changes, review-status | Fase 15 |
| `PlanReview Types/Schemas` | `src/core/types/PlanReview.ts` | `PlanReviewViewSchema`, `PlanReviewStatusSchema`, `PlanFeedbackInputSchema`, `PlanApprovalInputSchema`, `PlanRejectionInputSchema`, `PlanNeedsChangesInputSchema`, `PlanReviewInputSchema`, `PlanReviewStatusResultSchema`, `PlanApprovalResultSchema`, `PlanRejectionResultSchema`, `PlanNeedsChangesResultSchema`, `PlanFeedbackResultSchema` | Fase 15 |
| `RefactorAgent` | `src/core/agents/RefactorAgent.ts` | `execute(context): Promise<AgentResult>` — role `REFACTORER`, ferramenta `refactor_code`, artifact `DIFF` | Fase 16 |
| `LLMProviderRegistry` | `src/infrastructure/llm/LLMProviderRegistry.ts` | `has(name)`, `create(config, transport?)`, `register(name, factory)`, `getRegisteredNames()` | Fase 17 |
| `LLMProviderFactory` | `src/infrastructure/llm/LLMProviderFactory.ts` | `create(options, transport?)`, `createFromConfig(config, transport?)`, `createMock()`, `getRegistry()` | Fase 17 |
| `LLMProviderConfig` | `src/infrastructure/llm/LLMProviderConfig.ts` | `LLMProviderNameSchema`, `LLMProviderConfigSchema`, `LLMProviderFactoryOptionsSchema`, `LLMTransport`, `LLMProviderError` | Fase 17 |
| `MockLLMProvider` | `src/infrastructure/llm/providers/MockLLMProvider.ts` | `generate(prompt): Promise<string>` — determinístico, sem rede | Fase 17 |
| `QwenLLMProvider` | `src/infrastructure/llm/providers/QwenLLMProvider.ts` | `generate(prompt): Promise<string>` — safe stub, requer transport + apiKeyEnv | Fase 17 |
| `OpenAILLMProvider` | `src/infrastructure/llm/providers/OpenAILLMProvider.ts` | `generate(prompt): Promise<string>` — safe stub, requer transport + apiKeyEnv | Fase 17 |
| `ClaudeLLMProvider` | `src/infrastructure/llm/providers/ClaudeLLMProvider.ts` | `generate(prompt): Promise<string>` — safe stub, requer transport + apiKeyEnv | Fase 17 |
| `GeminiLLMProvider` | `src/infrastructure/llm/providers/GeminiLLMProvider.ts` | `generate(prompt): Promise<string>` — safe stub, requer transport + apiKeyEnv | Fase 17 |
| `McpGreenForgeServer` | `src/integration/qwen/McpGreenForgeServer.ts` | `getToolNames()`, `getTool(name)`, `connect()` — 10 tools MCP com prefixo `greenforge_` | Fase 19 |
| `LiteLLMProvider` | `src/infrastructure/llm/providers/LiteLLMProvider.ts` (Fase 23) | `generate(prompt): Promise<string>` — adapter litellm (base_url + model, chave opcional, validação Zod) | Fase 23 (planejado) |

## Fluxo Principal
1. Router identifica tarefa técnica.
2. `PlannerEngine` gera plano auditável.
3. **Camada de Revisão de Plano** renderiza visão humana com perguntas, subtarefas, dependências, agentes, critérios e riscos. Usuário envia feedback, responde perguntas de clarificação, e então aprova ou rejeita o plano.
4. Agentes executam ferramentas via MCP nos Worktrees.
5. `JoinGate` valida e consolida os artefatos.
6. **DiffLens Engine** analisa artefatos, valida conteúdos de revisão e gera o relatório oficial `GREENFORGE_AUDIT.md`.
7. **Verifier** consolida todos os sinais técnicos, valida a consistência do identificador da tarefa e gera o veredito final estruturado (`APPROVED` | `BLOCKED` | `RETRYABLE`).
8. **Qwen CLI Extension Layer** mapeia hooks locais do host e expõe comandos estáticos definidos via `SKILL.md`.
9. **Fase 13 — E2E Controlado:** `HookSimulator` simula eventos `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `SessionEnd`; `QwenIntegrationRunner` orquestra fluxo completo simulado conectando ao core (Router, Planner, SQLite, Orchestrator, JoinGate, DiffLens, Verifier) via mocks. PreToolUse valida `allowedRoot` com `path.resolve` + `path.relative`. Recursos temporários são limpos em todos os caminhos via `try/catch/finally`.
10. **Fase 14 — Runtime Real:** `QwenExtensionRuntime` carrega e valida manifest/settings/SKILL.md. `QwenHookHandler` contém handlers reais delegando a QwenRouter, Orchestrator, SQLiteRepository. `QwenCommandHandler` implementa os comandos start/status/list/approve/abort do SKILL.md. `QwenExtensionEntrypoint` provê entrypoint importável sem side effects. `InternalMockLLMProvider` isola testes de LLM/network reais.
11. **Fase 15 — UI/UX de Revisão de Planos:** `PlanReviewController` gerencia o ciclo completo de revisão (view, feedback, approval, rejection, needs-changes, status). `PlanReviewRenderer` gera markdown estruturado legível para humano. `PlanReviewHandler` expõe comandos Qwen (`review`, `feedback`, `approve`, `reject`, `needs-changes`, `review-status`) que delegam ao controller. Aprovação chama Orchestrator real (`APPROVE_PLAN`). Rejeição é modelada como resultado de revisão sem alterar máquina de estados core. Todos os contratos passam por `.parse()` Zod.

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
- **Plan Review Limits:** Rejeição de plano é modelada como resultado de revisão (não altera máquina de estados core). O Orchestrator atual não possui evento `REJECT_PLAN`. Futuro ajuste pode adicionar transição de rejeição na máquina de estados.

## Testes Obrigatórios
| Suite | Arquivo | Cobertura Aproximada | Comando |
|-------|---------|----------------------|---------|
| Total Suíte | `tests/*.test.ts` | 468 testes ativos | `npm test` |
| Qwen Integration (Static) | `tests/qwen-integration.test.ts` | 24 testes (Estáticos) | `npm test` |
| Qwen Integration (E2E) | `tests/qwen-e2e.test.ts` | 22 testes (E2E Controlado) | `npm test` |
| Qwen Real Extension | `tests/qwen-real-extension.test.ts` | 46 testes (Runtime Real) | `npm test` |
| DiffLens | `tests/difflens.test.ts` | 13 testes (Refinados) | `npm test` |
| Verifier | `tests/verifier.test.ts` | 21 testes (Unitários) | `npm test` |
| Plan Review (Fase 15) | `tests/plan-review.test.ts` | 74 testes (Unitários + Integração) | `npm test` |
| RefactorAgent (Fase 16) | `tests/refactor-agent.test.ts` | 39 testes (Instanciação, Sucesso, Ferramentas, Falha MCP, Compatibilidade, JoinGate, Isolamento) | `npm test` |
| LLM Providers (Fase 17) | `tests/llm-providers.test.ts` | 78 testes (Config/Schema, MockLLMProvider, Registry, Factory, Safe Stubs, QwenRouter, PlannerEngine, Runtime, Isolamento, Erros) | `npm test` |
| MCP Server (Fase 19) | `tests/mcp-server.test.ts` | 8 testes (Instanciação, 10 tools, Schemas, Delegação, Stdio transport, Stderr logs) | `npm test` |


## Dependências Externas
| Pacote | Versão | Motivo |
|--------|--------|--------|
| `zod` | ^3.23.0 | Validação de contratos e auditorias. |
| `better-sqlite3` | ^11.0.0 | Persistência local de tarefas e checkpoints. |

## Fases 20-22 — Resumo

- **Modo Hook Real (Fase 20):** `HookCommandAdapter` implementado. Permite que `node dist/index.js hook <HookName>` leia payload do stdin, delegue para `QwenHookHandler`, e retorne JSON no formato exato esperado pelo Qwen CLI (decision para blocking hooks, simples para non-blocking). Suporte a 7 hooks + fallbacks seguros para payload malformado. `src/index.ts` atualizado para rotear o modo hook corretamente (stdout só JSON). 15 novos testes. **Status: CONCLUÍDA E VALIDADA.**
- **Configuração e Fiação (Fase 21):** `.qwen/settings.json` reconfigurado para comandos reais (`node dist/index.js hook <HookName>`) com `cwd: "${extensionPath}"`. Todos os 7 hooks são `type: "command"`. Removidas referências a `localhost:7777`. Schema atualizado para aceitar `cwd` em hooks. 8 testes de fiação. **Status: CONCLUÍDA E VALIDADA.**
- **Teste Real com o Qwen CLI (Fase 22):** Validação real com Qwen CLI carregando a extensão GreenForge. Extensão linkada via `qwen extensions link`. MCP server descoberto e 10 tools `greenforge_*` listadas pelo Qwen CLI real em sessão YOLO. Sessão testada dentro e fora do repo. Schemas Zod alterados de `.strict()` para `.passthrough()` para tolerar campos extras injetados pelo Qwen CLI (ex: `$version`). Hook `cwd: "${extensionPath}"` validado como necessário e funcional. **Status: CONCLUÍDA E VALIDADA.**
