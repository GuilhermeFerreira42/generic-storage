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

### Fase 15 — UI/UX para Revisão de Planos
F15 | ADD | PlanReviewController | Controller de domínio com buildReviewView, submitFeedback, approvePlan, rejectPlan, requestChanges, getReviewStatus, getFeedbackHistory, renderReviewToMarkdown | `src/core/PlanReviewController.ts`
F15 | ADD | PlanReviewRenderer | Renderizador textual markdown com render, renderQuestions, renderRisks, renderDependencies, renderFeedbackTemplate, renderCompact | `src/core/PlanReviewRenderer.ts`
F15 | ADD | PlanReviewHandler | Handler de integração Qwen com 6 comandos: review, feedback, approve, reject, needs-changes, review-status | `src/integration/qwen/PlanReviewHandler.ts`
F15 | ADD | PlanReview Types/Schemas | 12 schemas Zod para contratos de revisão (PlanReviewViewSchema, PlanReviewStatusSchema, PlanFeedbackInputSchema, PlanApprovalInputSchema, PlanRejectionInputSchema, PlanNeedsChangesInputSchema, PlanReviewInputSchema, PlanReviewStatusResultSchema, PlanApprovalResultSchema, PlanRejectionResultSchema, PlanNeedsChangesResultSchema, PlanFeedbackResultSchema) | `src/core/types/PlanReview.ts`
F15 | RULE | Aprovação delega para Orchestrator | approvePlan chama orchestrator.trigger(taskId, 'APPROVE_PLAN') real, com transições intermediárias se necessário | `src/core/PlanReviewController.ts`
F15 | RULE | Rejeição modelada como resultado | Rejeição não altera máquina de estados core (Orchestrator não possui evento REJECT_PLAN). Limitação documentada para futuro ajuste | `src/core/PlanReviewController.ts`
F15 | RULE | Todos outputs validados por Zod | buildReviewView, submitFeedback, approvePlan, rejectPlan, requestChanges, getReviewStatus retornam dados passando por .parse() | `src/core/PlanReviewController.ts`
F15 | TECH | UI/UX textual, não web app | Renderer markdown ao invés de React/Vite/Next. Experiência de revisão via texto estruturado | `src/core/PlanReviewRenderer.ts`
F15 | TECH | Perguntas de fallback | Quando planMarkdown não contém perguntas suficientes, o controller gera 5 perguntas padrão | `src/core/PlanReviewController.ts`

### Fase 16 — Agente de Refatoração
F16 | ADD | RefactorAgent | Agente especialista em refatoração herdando de BaseAgent, role REFACTORER, ferramenta refactor_code via MCP mockado, artifact DIFF | `src/core/agents/RefactorAgent.ts`
F16 | ADD | Role REFACTORER | Nova role de agente adicionada à union AgentRole e aos schemas Zod (AgentResultSchema, SubtaskNode, SubtaskNodeJoinSchema, PlanReviewViewSchema) | `src/core/types/Agent.ts`, `src/core/types/Task.ts`, `src/core/types/Join.ts`, `src/core/types/PlanReview.ts`
F16 | MOD | AgentRole expandido | AgentRole alterado de `'CODER' | 'TESTER' | 'REVIEWER'` para `'CODER' | 'TESTER' | 'REVIEWER' | 'REFACTORER'` — necessário para suportar o novo agente sem quebrar contratos existentes | `src/core/types/Agent.ts`
F16 | MOD | SubtaskNode.assignedAgent expandido | Adicionado `'REFACTORER'` à union de assignedAgent em Task.ts, Join.ts e PlannerEngine.ts — necessário para que planos possam atribuir subtarefas ao RefactorAgent | `src/core/types/Task.ts`, `src/core/types/Join.ts`, `src/core/PlannerEngine.ts`
F16 | MOD | PlanReviewViewSchema expandido | Adicionado `'REFACTORER'` aos enums assignedAgent e agents em PlanReview.ts — necessário para compatibilidade de tipo com SubtaskNode atualizado | `src/core/types/PlanReview.ts`
F16 | MOD | PlanReviewController agentsSet expandido | Tipo do Set de agentes atualizado para incluir `'REFACTORER'` — necessário para compatibilidade com SubtaskNode.assignedAgent | `src/core/PlanReviewController.ts`
F16 | RULE | RefactorAgent segue padrão arquitetural | Herda BaseAgent, usa McpClientPort, respeita allowedTools, valida contexto e resultado via Zod, trata sucesso (DONE) e falha (FAILED) | `src/core/agents/RefactorAgent.ts`
F16 | RULE | Validação de conteúdo MCP | RefactorContentSchema (Zod) valida que o conteúdo retornado por refactor_code contém summary (não vazio) e diff (não vazio). Formato inválido resulta em FAILED com INVALID_FORMAT | `src/core/agents/RefactorAgent.ts`
F16 | RULE | Compatibilidade retroativa | CODER, TESTER, REVIEWER continuam funcionando. AgentResultSchema aceita todas as 4 roles. JoinGate aceita REFACTORER como assignedAgent válido | `tests/refactor-agent.test.ts`
F16 | RULE | Isolamento de testes | Nenhum teste chama Qwen real, LLM real, MCP real, rede, merge ou push. Todos usam MockMcpClient | `tests/refactor-agent.test.ts`

### Fase 17 — Suporte a Múltiplos LLMs
F17 | ADD | LLMProviderConfig | Schemas Zod para configuração de providers: LLMProviderNameSchema (enum: mock, qwen, openai, claude, gemini), LLMProviderConfigSchema (provider, model, apiKeyEnv, baseUrl, timeout, mockMode), LLMProviderFactoryOptionsSchema (config, fallbackProvider, fallbackOnUnknown). LLMTransport interface para desacoplar HTTP. LLMProviderError classe de erro estruturada (code, provider, retryable) | `src/infrastructure/llm/LLMProviderConfig.ts`
F17 | ADD | LLMProviderRegistry | Registry que mapeia nomes de providers para factories. Built-in: mock, qwen, openai, claude, gemini. Métodos: has(name), create(config, transport?), register(name, factory), getRegisteredNames() | `src/infrastructure/llm/LLMProviderRegistry.ts`
F17 | ADD | LLMProviderFactory | Factory com fallback seguro. Provider desconhecido cai para mock (configurável). Validação Zod. Métodos: create(options, transport?), createFromConfig(config, transport?), createMock(), getRegistry(). Singleton LLMProviderFactory.default | `src/infrastructure/llm/LLMProviderFactory.ts`
F17 | ADD | MockLLMProvider | Provider determinístico para testes. Retorna classificação DEVELOPMENT_TASK ou NORMAL_CHAT baseado no prompt. Gera plano JSON válido com 5 perguntas, 3 subtarefas, 2 critérios. Zero chamadas de rede | `src/infrastructure/llm/providers/MockLLMProvider.ts`
F17 | ADD | QwenLLMProvider | Safe stub que implementa LLMProvider. Sem transport: NO_TRANSPORT. Com transport sem apiKeyEnv: NO_API_KEY_CONFIG. Com apiKeyEnv sem env var: NO_API_KEY. Com mockMode: delega para MockLLMProvider interno | `src/infrastructure/llm/providers/QwenLLMProvider.ts`
F17 | ADD | OpenAILLMProvider | Safe stub (mesmo padrão de segurança do QwenLLMProvider). Sem SDK externo, sem fetch direto, sem rede em testes | `src/infrastructure/llm/providers/OpenAILLMProvider.ts`
F17 | ADD | ClaudeLLMProvider | Safe stub (mesmo padrão de segurança). Sem SDK externo, sem fetch direto, sem rede em testes | `src/infrastructure/llm/providers/ClaudeLLMProvider.ts`
F17 | ADD | GeminiLLMProvider | Safe stub (mesmo padrão de segurança). Sem SDK externo, sem fetch direto, sem rede em testes | `src/infrastructure/llm/providers/GeminiLLMProvider.ts`
F17 | RULE | Estratégia de fallback seguro | Provider desconhecido → fallback para mock. Provider real sem transport → LLMProviderError('NO_TRANSPORT'). Provider real sem apiKeyEnv → LLMProviderError('NO_API_KEY_CONFIG'). Provider real sem env var → LLMProviderError('NO_API_KEY'). Em mockMode → delega para MockLLMProvider interno | `src/infrastructure/llm/LLMProviderFactory.ts`, `src/infrastructure/llm/providers/*.ts`
F17 | RULE | Providers reais são safe stubs | Não usam fetch diretamente. Não chamam rede em testes. Não armazenam secrets. Não logam secrets. Não adicionam SDKs externos. Integração real delegada para fase futura | `src/infrastructure/llm/providers/QwenLLMProvider.ts`, `src/infrastructure/llm/providers/OpenAILLMProvider.ts`, `src/infrastructure/llm/providers/ClaudeLLMProvider.ts`, `src/infrastructure/llm/providers/GeminiLLMProvider.ts`
F17 | RULE | Isolamento de testes | Nenhum teste chama LLM real, Qwen real, rede, ou exige API key. MockLLMProvider é o provider padrão nos testes. Providers reais sem transport/config falham com LLMProviderError antes de qualquer chamada de rede | `tests/llm-providers.test.ts`
F17 | TECH | Factory aceita string solta para provider | LLMProviderFactoryOptionsSchema usa LLMProviderConfigLooseSchema (provider: z.string()) para permitir fallback antes da validação Zod do enum. O fallback é resolvido contra o registry, e só então o config final é validado com LLMProviderConfigSchema | `src/infrastructure/llm/LLMProviderConfig.ts`, `src/infrastructure/llm/LLMProviderFactory.ts`
F17 | TECH | Integração com componentes existentes | QwenRouter e PlannerEngine aceitam LLMProvider injetado via factory; QwenExtensionRuntime mantém InternalMockLLMProvider interno seguro e segue compatível sem alteração de construtor. Nenhum construtor existente foi quebrado. Compatibilidade retroativa mantida | `tests/llm-providers.test.ts` (seções F, G, H)

### Fase 19 — Servidor MCP Real
F19 | ADD | McpGreenForgeServer | Servidor MCP via stdio usando @modelcontextprotocol/sdk. Registra 10 tools com prefixo greenforge_. Delega para QwenCommandHandler e PlanReviewHandler existentes sem modificá-los | `src/integration/qwen/McpGreenForgeServer.ts`
F19 | MOD | src/index.ts modo MCP | Argumento "mcp" cria McpGreenForgeServer e conecta via StdioServerTransport. Sem argumentos: ajuda breve. "hook": placeholder para Fase 20 | `src/index.ts`
F19 | RULE | MCP Server via stdio, não HTTP | Transporte via StdioServerTransport (stdin/stdout JSON-RPC). HTTP hooks serão substituídos na Fase 21. Stdio é o padrão MCP para CLI integrations | `src/integration/qwen/McpGreenForgeServer.ts`
F19 | RULE | Logs em stderr, nunca stdout | No modo MCP, stdout é reservado exclusivamente para protocolo JSON-RPC. Todos os logs vão para console.error (stderr) | `src/integration/qwen/McpGreenForgeServer.ts`, `src/index.ts`
F19 | RULE | Isolamento de testes | Nenhum teste chama Qwen real, LLM real, MCP real, rede ou git destrutivo. Uses InternalMockLLMProvider como provider padrão | `tests/mcp-server.test.ts`
F19 | TECH | Tipo literal 'text' em content | MCP SDK exige type: 'text' como literal type, não string. Uso de `as const` ou tipagem explícita para satisfazer overloads do McpServer.tool() | `src/integration/qwen/McpGreenForgeServer.ts`

### Fase 20 — Modo Hook (HookCommandAdapter)
F20 | ADD | HookCommandAdapter.ts | Bridge entre CLI Qwen e QwenHookHandler com formatos exatos de decisão | `src/integration/qwen/HookCommandAdapter.ts`
F20 | MOD | src/index.ts | Substitui placeholder por implementação real do modo hook (stdout só JSON) | `src/index.ts`
F20 | ADD | Testes TDD | 15 testes cobrindo mapeamento, formatos de saída, fallbacks e exit codes | `tests/hook-command-adapter.test.ts`
F20 | CFG | Formato de saída | Blocking hooks → hookSpecificOutput.decision; Non-blocking → {ok,action,reason} | HookCommandAdapter
F20 | RULE | Fallback seguro | Payload malformado em blocking = deny; non-blocking = allow | HookCommandAdapter
F20 | TECH | Leitura de stdin | readFileSync(0, 'utf-8') — padrão CLI síncrono sem dependências | HookCommandAdapter
F20 | TEST | 460 testes totais | +15 novos testes, todos isolados (sem Qwen/LLM/rede/git real) | Todos os testes
