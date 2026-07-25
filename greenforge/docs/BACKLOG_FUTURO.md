# BACKLOG_FUTURO — GreenForge

## Fase 22 — Teste Real com o Qwen CLI
- **Status:** ✅ CONCLUÍDA E VALIDADA (2026-07-01)
- **Entregáveis:**
    - Extensão GreenForge linkada no Qwen CLI real (`qwen extensions list` confirma)
    - MCP server configurado e descoberto: 10 tools `greenforge_*` listadas
    - Sessão real do Qwen CLI executada dentro e fora do repo
    - 7/7 hooks diretos funcionando via `node dist/index.js hook <HookName>`
    - Schemas Zod alterados: `.strict()` → `.passthrough()` em 5 schemas (HookAction, HookBinding, QwenSettings, McpServer, QwenExtensionManifest)
    - cwd="${extensionPath}" validado como necessário e funcional
    - Documentação viva atualizada (.ai-context, .humano, CURRENT_STATE, BACKLOG, DECISION_LOG, phase_22_resumo.md)
    - 468/468 testes passando, build limpo, lint 0/0
- **Arquivo modificado:** `src/integration/qwen/manifestSchemas.ts`
- **Sem novos testes** (fase de validação externa, não funcionalidade nova)

## Fase 23 — Transporte Real de LLM (Proxy litellm)
- **Status:** ✅ CONCLUÍDA E VALIDADA (2026-07-24)
- **Decisão de arquitetura:** litellm atua como **CANO** de transporte OpenAI-compatible (não como cérebro). Qwen CLI continua host. GreenForge mantém controle de formatação e validação via `LiteLLMProvider` com Zod. Arquitetura hexagonal mantida; `LLMProvider.ts` não mudou.
- **Entregáveis realizados:**
    - `src/infrastructure/llm/providers/LiteLLMProvider.ts` — adapter real via `LLMTransport.post(baseUrl + '/chat/completions')`, payload OpenAI-compatible validado por Zod, `mockMode`, chave opcional via `apiKeyEnv`, headers de perfil `x-greenforge-profile: small|large`, tratamento estruturado de erros e `DROP DETECTED`.
    - `src/infrastructure/llm/FetchLLMTransport.ts` — transporte HTTP real via `fetch`, timeout e erros estruturados (`TRANSPORT_ERROR`, `TRANSPORT_TIMEOUT`).
    - `LLMProviderConfig.ts` — enum `litellm`, suporte a `base_url` e `greenforgeProfile`.
    - `LLMProviderRegistry.ts` — registro built-in de `litellm`.
    - `LLMProviderFactory.ts` — hard block `TEST_HARD_BLOCK` quando `NODE_ENV==='test'` + provider real + transporte real.
    - `SQLiteRepository.ts` — tabela `audit_warnings`, `recordAuditWarning()` e `getAuditWarnings()`.
    - `scripts/litellm-smoke.mjs` + `npm run llm:smoke` — smoke real manual para portas 4000/4001.
    - Testes novos/alterados: `tests/litellm-provider.test.ts`, `tests/litellm-transport.test.ts`, `tests/persistence.test.ts`, `tests/llm-providers.test.ts`.
- **Validação automatizada:** build limpo, lint limpo, 486/486 testes passando.
- **Validação real externa:** usuário executou `npm run llm:smoke` no Windows 11 com `GREENFORGE_LITELLM_LARGE_MODEL=meu-pool` e `GREENFORGE_LITELLM_SMALL_MODEL=meu-pool`; porta 4000 respondeu `LARGE_OK` em 6413ms; porta 4001 respondeu `Saudação` em 1113ms; resultado `ok: true`.
- **Blueprint:** `docs/phase_23_blueprint.md` | **Resumo:** `docs/phase_23_resumo.md` | **Arquivo resolvido:** `docs/archive/phase_23_transporte_real_llm_litellm.resolved`

## Fase 14 — Qwen CLI Extension (Real)
- **Status:** ✅ CONCLUÍDA E VALIDADA (2026-06-24)
- **Entregáveis:**
    - `QwenExtensionRuntime.ts` — Runtime real que carrega/valida manifest, settings, SKILL.md e provê acesso a QwenRouter, PlannerEngine, SQLiteRepository, Orchestrator.
    - `QwenHookHandler.ts` — Handlers reais para todos os 5 hooks (SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, SessionEnd) delegando a componentes core.
    - `QwenCommandHandler.ts` — Implementação real dos comandos definidos no SKILL.md: start, status, list, approve, abort.
    - `QwenExtensionEntrypoint.ts` — Entrypoint importável sem side effects, factory `createExtension()`.
    - `QwenSettingsDispatcher.ts` — ponte entre settings.json e handlers reais, sem rede real em testes.
    - `runtimeTypes.ts` — Schemas Zod para RuntimeOptions, HookHandlerResult, CommandHandlerResult e payloads de hooks.
    - `tests/qwen-real-extension.test.ts` — 46 testes (A-J: Manifest, Hooks, Commands, Isolation, Contracts, Dispatcher, Checkpoint, List, Zod, TempDir).
    - PreToolUse com segurança via path.resolve + path.relative, sem validação textual frágil.
    - InternalMockLLMProvider: zero chamadas a Qwen real, LLM real, rede, merge ou push.
    - build, lint e 246/246 testes passando.

## Fase 15 — UI/UX para Revisão de Planos
- **Status:** ✅ CONCLUÍDA E VALIDADA (2026-06-25)
- **Entregáveis:**
    - `PlanReviewController.ts` — Controller de domínio para revisão de planos (buildReviewView, submitFeedback, approvePlan, rejectPlan, requestChanges, getReviewStatus, getFeedbackHistory, renderReviewToMarkdown).
    - `PlanReviewRenderer.ts` — Renderizador textual markdown com seções de perguntas, subtarefas, dependências, agentes, critérios, riscos. Métodos: render, renderQuestions, renderRisks, renderDependencies, renderFeedbackTemplate, renderCompact.
    - `PlanReviewHandler.ts` — Handler de integração Qwen com 6 comandos (review, feedback, approve, reject, needs-changes, review-status).
    - `types/PlanReview.ts` — Schemas Zod para todos os contratos de revisão (12 schemas: input, view, feedback, approval, rejection, needs-changes, status, resultados).
    - `tests/plan-review.test.ts` — 74 testes cobrindo renderização, feedback, aprovação, rejeição, integração Qwen, renderer, schemas Zod, isolamento.
    - Aprovação delega para Orchestrator real (evento APPROVE_PLAN).
    - Rejeição modelada como resultado de revisão (não altera core).
    - Todos os outputs passam por `.parse()` Zod.
    - build, lint e 320/320 testes passando.
- **Limitação documentada:** Orchestrator não possui evento REJECT_PLAN. Rejeição é modelada no controller de revisão.

## Fase 16 — Agente de Refatoração
- **Status:** ✅ CONCLUÍDA E VALIDADA (2026-06-26)
- **Entregáveis:**
    - `RefactorAgent.ts` — Agente especialista em refatoração herdando de BaseAgent, usando McpClientPort, chamando ferramenta `refactor_code` via MCP mockado.
    - Nova role `REFACTORER` adicionada a AgentRole, AgentResultSchema, SubtaskNode, SubtaskNodeJoinSchema, PlanReviewViewSchema.
    - `tests/refactor-agent.test.ts` — 39 testes cobrindo instanciação/contrato, sucesso, ferramentas permitidas, falha MCP, compatibilidade com agentes existentes, compatibilidade com JoinGate, e isolamento.
    - Compatibilidade retroativa: CODER, TESTER, REVIEWER continuam funcionando. Planos antigos continuam válidos. JoinGate continua validando artifacts corretamente.
    - build, lint e 359/359 testes passando.

## Fase 17 — Suporte a Múltiplos LLMs
- **Status:** ✅ CONCLUÍDA E VALIDADA (2026-06-26)
- **Entregáveis:**
    - `LLMProviderConfig.ts` — Schemas Zod: `LLMProviderNameSchema` (enum: mock, qwen, openai, claude, gemini), `LLMProviderConfigSchema` (provider, model, apiKeyEnv, baseUrl, timeout, mockMode), `LLMProviderFactoryOptionsSchema` (config, fallbackProvider, fallbackOnUnknown). `LLMTransport` interface para desacoplar HTTP. `LLMProviderError` classe de erro estruturada (code, provider, retryable).
    - `LLMProviderRegistry.ts` — Registry que mapeia nomes de providers para factories. Built-in: mock, qwen, openai, claude, gemini. Métodos: `has(name)`, `create(config, transport?)`, `register(name, factory)`, `getRegisteredNames()`.
    - `LLMProviderFactory.ts` — Factory com fallback seguro. Provider desconhecido cai para `mock` (configurável). Validação Zod. Métodos: `create(options, transport?)`, `createFromConfig(config, transport?)`, `createMock()`, `getRegistry()`. Singleton `LLMProviderFactory.default`.
    - `MockLLMProvider.ts` — Provider determinístico para testes. Retorna classificação DEVELOPMENT_TASK ou NORMAL_CHAT baseado no prompt. Gera plano JSON válido com 5 perguntas, 3 subtarefas, 2 critérios.
    - `QwenLLMProvider.ts` — Safe stub. Sem transport: `NO_TRANSPORT`. Com transport sem apiKeyEnv: `NO_API_KEY_CONFIG`. Com apiKeyEnv sem env var: `NO_API_KEY`. Com mockMode: delega para MockLLMProvider interno.
    - `OpenAILLMProvider.ts` — Safe stub (mesmo padrão de segurança).
    - `ClaudeLLMProvider.ts` — Safe stub (mesmo padrão de segurança).
    - `GeminiLLMProvider.ts` — Safe stub (mesmo padrão de segurança).
    - `tests/llm-providers.test.ts` — 78 testes (A-J: Config/Schema 14, MockLLMProvider 6, Registry 9, Factory 12, Safe Stubs 11, QwenRouter 5, PlannerEngine 5, Runtime 4, Isolamento 8, Erros 4).
    - Integração direta com QwenRouter e PlannerEngine via providers criados pela factory; QwenExtensionRuntime mantém mock interno seguro e segue compatível.
    - Nenhum teste chama LLM real, rede ou exige API key.
    - build, lint e 437/437 testes passando.
- **Estratégia de fallback seguro:** Provider desconhecido → fallback para `mock`. Provider real sem transport → `LLMProviderError('NO_TRANSPORT')`. Provider real sem apiKeyEnv → `LLMProviderError('NO_API_KEY_CONFIG')`. Provider real sem env var → `LLMProviderError('NO_API_KEY')`. Em mockMode → delega para MockLLMProvider interno.
- **Providers suportados:** mock, qwen, openai, claude, gemini.
- **Segurança:** Providers reais são safe stubs. Não usam fetch diretamente. Não chamam rede em testes. Não armazenam secrets. Não logam secrets. Não adicionam SDKs externos.

## Fase 18 — Validação em Campo e Empacotamento Final
- **Status:** ✅ CONCLUÍDA E VALIDADA (2026-06-28)
- **Entregáveis:**
    - Validação operacional controlada do runtime real via QwenExtensionEntrypoint, não validação com Qwen CLI real carregando a extensão.
    - Teste E2E real cobrindo 5 hooks e 5 comandos.
    - Segurança PreToolUse validada.
    - Documentação criada (README.md, GUIA_DE_USO.md).
    - build, lint e 437/437 testes passando.


## Fase 19 — Servidor MCP Real
- **Status:** ✅ CONCLUÍDA E VALIDADA (2026-06-28)
- **Entregáveis:**
    - `McpGreenForgeServer.ts` — Servidor MCP via stdio usando @modelcontextprotocol/sdk. Registra 10 tools com prefixo `greenforge_` (start, status, list, approve, abort, review, feedback, reject, needs_changes, review_status). Cada tool usa inputSchema com Zod para validação. Delega para QwenCommandHandler e PlanReviewHandler existentes sem modificá-los.
    - `src/index.ts` atualizado — Argumento "mcp" cria McpGreenForgeServer e conecta via StdioServerTransport. Sem argumentos: ajuda breve. "hook": placeholder para Fase 20. Logs vão exclusivamente para stderr no modo MCP.
    - `tests/mcp-server.test.ts` — 8 testes (Instanciação, 10 tools registradas, Schemas Zod corretos, Delegação para handlers, StdioServerTransport, stderr logs).
    - InternalMockLLMProvider como provider padrão.
    - Nenhum teste chama Qwen real, LLM real, MCP real, rede ou git destrutivo.
    - build, lint e 445/445 testes passando (8 novos testes MCP).

## Fase 20 — Modo Hook
- **Status:** ✅ CONCLUÍDA E VALIDADA (2026-06-29)
- **Entregáveis:**
    - `HookCommandAdapter.ts` — Adaptador que lê payloads do stdin, processa via `QwenHookHandler` e formata as respostas no padrão JSON esperado pelo Qwen CLI (com suporte a blocking e non-blocking hooks).
    - `src/index.ts` — Roteamento do modo hook via CLI (`node dist/index.js hook <HookName>`) direcionando a saída síncrona JSON exclusivamente para stdout.
    - `tests/hook-command-adapter.test.ts` — 15 testes unitários e de integração validando comportamento de todos os 7 hooks, fallbacks de parsing e tratamento de erros.
    - build, lint e 460/460 testes passando.

## Fase 21 — Configuração e Fiação
- **Status:** ✅ CONCLUÍDA E VALIDADA (2026-06-30)
- **Entregáveis:**
    - `.qwen/settings.json` reconfigurado para usar `type: "command"` com `node dist/index.js hook <HookName>` e `cwd: "${extensionPath}"`.
    - `src/integration/qwen/manifestSchemas.ts` atualizado com suporte a `cwd` no schema `HookActionSchema`.
    - `tests/hook-wiring.test.ts` — 8 testes validando integridade do `settings.json`, schemas e mapeamento de hooks locais sem rede.
    - build, lint e 468/468 testes passando.

## Fase 24 — Prontidão de Produção e Documentação Honesta
- **Objetivo:** Consolidar documentação, corrigir classificação NORMAL_CHAT no InternalMockLLMProvider, e preparar o repositório para escrutínio público antes do deploy final.
- **Requisitos:**
    - Corrigir classificação base NORMAL_CHAT no InternalMockLLMProvider para evitar falsos positivos.
    - Atualizar README.md e GUIA_DE_USO.md para explicitar a necessidade das duas portas litellm (4000/4001).
    - Documentar que a lógica de retry/fallback fica a cargo do litellm (não do GreenForge).
    - Auditoria documental rigorosa: verificar se a documentação reflete a arquitetura assimétrica e as exigências do litellm.
    - Remover placeholders e TODOs restantes.
    - Auditoria final de segurança.

## Fase 25 — Validação Final de Produção e Deploy
- **Objetivo:** Sessão completa real guiada organicamente pelo Qwen CLI, passando por todos os hooks e tools MCP, com DiffLens gerando auditoria final. Tag v1.0.0.
- **Requisitos:**
    - E2E real com Qwen CLI + litellm + LLM real (sem redes de segurança, sem mocks).
    - Validar fluxo completo: classificação de intenção → planejamento → execução por agentes → JoinGate → DiffLens → Verifier.
    - DiffLens gera auditoria GREENFORGE_AUDIT.md com sucesso.
    - Validar isolamento via Git Worktrees.
    - Tag v1.0.0 e changelog.
    - Empacotar e publicar no registry de extensões Qwen.

- **Preparação já implementada após teste real inicial:**
    - Router expandido para intenções `WRITING_TASK`, `PLANNING_TASK`, `RESEARCH_TASK`.
    - Hook `UserPromptSubmit` agora direciona explicitamente `DEVELOPMENT_TASK` para `mcp__greenforge__greenforge_start`.
    - Tool `greenforge_start` aceita `workspaceRoot` opcional.
    - `QwenCommandHandler.start` faz `git init` automático no workspace informado quando necessário.
    - `QwenExtensionRuntime` pode usar LiteLLM real com `GREENFORGE_USE_REAL_LITELLM=true`, preservando mocks em testes.
    - Validação local: build/lint/test passando com 491/491.
- **Pendente:** validação real no desktop confirmando que o Qwen CLI chama a tool MCP em vez das tools nativas e que o fluxo completo avança.

---

## Backlog Pós-v1.0 (Fases Futuras)

### Integração com CI/CD
- **Objetivo:** Integrar o GreenForge em pipelines de CI/CD existentes.
- **Requisitos:** Fornecer APIs para acionar tarefas e obter resultados. Gerar relatórios compatíveis com ferramentas de CI/CD.

### Gerenciamento de Credenciais Seguro
- **Objetivo:** Implementar um sistema seguro para gerenciar credenciais de APIs e outros segredos.
- **Requisitos:** Integração com cofres de segredos (e.g., HashiCorp Vault, AWS Secrets Manager). Criptografia de dados sensíveis em repouso e em trânsito.

### Suporte a Múltiplos Idiomas (i18n)
- **Objetivo:** Permitir que a interface e a documentação do GreenForge sejam utilizadas em diferentes idiomas.
- **Requisitos:** Externalizar todas as strings de texto. Implementar um sistema de tradução.

### Monitoramento e Alerta
- **Objetivo:** Monitorar a saúde do sistema e alertar sobre anomalias.
- **Requisitos:** Coletar métricas de performance e uso. Integrar com ferramentas de monitoramento (e.g., Prometheus, Grafana). Configurar alertas para falhas e gargalos.

### Extensibilidade de Ferramentas
- **Objetivo:** Permitir que usuários e desenvolvedores adicionem facilmente novas ferramentas ao GreenForge.
- **Requisitos:** Definir um contrato claro para novas ferramentas. Implementar um mecanismo de carregamento dinâmico de ferramentas.

### Otimização de Custos de LLM
- **Objetivo:** Reduzir os custos associados ao uso de LLMs.
- **Requisitos:** Implementar estratégias de caching mais agressivas. Otimizar prompts para reduzir o uso de tokens. Explorar modelos de LLM mais eficientes para tarefas específicas.

### Geração de Documentação Automática
- **Objetivo:** Gerar automaticamente documentação técnica a partir do código-fonte e dos planos.
- **Requisitos:** Integrar com ferramentas de análise de código. Gerar diagramas de arquitetura e fluxo.

### Testes de Mutação
- **Objetivo:** Aumentar a confiança nos testes existentes através de testes de mutação.
- **Requisitos:** Integrar uma ferramenta de teste de mutação (e.g., Stryker Mutator). Garantir alta cobertura de mutação para os componentes críticos.

### Análise Estática de Código Avançada
- **Objetivo:** Integrar ferramentas de análise estática de código mais avançadas para detectar bugs e vulnerabilidades.
- **Requisitos:** Integrar com ferramentas como SonarQube, ESLint com plugins de segurança. Automatizar a execução dessas análises no pipeline.

### Geração de Testes Automática
- **Objetivo:** Gerar automaticamente testes unitários e de integração para o código produzido.
- **Requisitos:** Utilizar LLMs para gerar casos de teste. Integrar com frameworks de teste existentes.

### Suporte a Múltiplos VCS (Version Control Systems)
- **Objetivo:** Permitir que o GreenForge trabalhe com outros sistemas de controle de versão além do Git.
- **Requisitos:** Abstrair a camada de VCS. Implementar adaptadores para SVN, Mercurial, etc.
