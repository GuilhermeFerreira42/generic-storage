# Changelog — GreenForge


## [Unreleased] — Preparação Fase 25

### Adicionado
- Router multi-intenção com `WRITING_TASK`, `PLANNING_TASK` e `RESEARCH_TASK`.
- Opt-in de LiteLLM real no runtime via `GREENFORGE_USE_REAL_LITELLM=true`.
- `workspaceRoot` opcional na tool MCP `greenforge_start`.
- Git init automático no comando `start` quando `workspaceRoot` não é repositório Git.
- Testes `phase25-gap-fixes.test.ts` cobrindo os gaps do teste real com Qwen CLI.

### Alterado
- `UserPromptSubmit` agora instrui explicitamente o Qwen CLI a chamar `mcp__greenforge__greenforge_start` para tarefas de desenvolvimento.

### Validação
- Build, lint e testes locais passando: 491/491.


Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere a [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [1.0.0] — 2026-07-24

### Adicionado (Fases 0 a 23)

- **Fase 0:** Estrutura base do projeto, TypeScript, Vitest, package.json, tsconfig.
- **Fase 1:** `QwenRouter` — classificação de intenção (NORMAL_CHAT vs DEVELOPMENT_TASK) com Zod.
- **Fase 2:** `WorktreeManager` — isolamento físico de tarefas via Git Worktrees.
- **Fase 3:** `SafeResolve` e `AtomicWrite` — prevenção de Path Traversal e escrita segura.
- **Fase 4:** `SQLiteRepository` — persistência de tarefas e checkpoints.
- **Fase 5:** `PlannerEngine` — motor de planejamento estruturado com perguntas de clarificação.
- **Fase 6:** `Orchestrator` — máquina de estados de 10 estados para coordenação de tarefas.
- **Fase 7:** `McpClientPort` — interface de porta para desacoplar o core do SDK MCP.
- **Fase 8:** Agentes especialistas (Coder, Tester, Reviewer) herdando de `BaseAgent`.
- **Fase 9:** `JoinGate` — sincronização e validação de subtarefas paralelas.
- **Fase 10:** `DiffLens` — motor de auditoria humana e análise de risco.
- **Fase 11:** `Verifier` — consolidação de sinais técnicos e veredito final.
- **Fase 12:** Integração Qwen base — manifestos, schemas, SKILL.md.
- **Fase 13:** E2E controlado — HookSimulator e QwenIntegrationRunner sem rede real.
- **Fase 14:** Runtime real — QwenExtensionRuntime, QwenHookHandler, QwenCommandHandler.
- **Fase 15:** UI/UX de revisão de planos — PlanReviewController, renderizador, handler Qwen.
- **Fase 16:** `RefactorAgent` — agente de refatoração com role REFACTORER.
- **Fase 17:** Suporte a múltiplos LLMs — LLMProviderFactory, Registry, safe stubs (Qwen, OpenAI, Claude, Gemini).
- **Fase 18:** Validação em campo — empacotamento, README, GUIA_DE_USO.
- **Fase 19:** `McpGreenForgeServer` — servidor MCP real via stdio com 10 tools `greenforge_*`.
- **Fase 20:** `HookCommandAdapter` — hooks command reais via CLI.
- **Fase 21:** Configuração e fiação de hooks — `.qwen/settings.json` com command hooks.
- **Fase 22:** Teste real com Qwen CLI — extensão linkada, MCP descoberto, schemas `.passthrough()`.
- **Fase 23:** **Transporte real de LLM via litellm**:
  - `LiteLLMProvider` — adapter OpenAI-compatible com validação Zod.
  - `FetchLLMTransport` — transporte HTTP real via fetch.
  - Roteamento assimétrico: porta 4000 (large/agentes) + porta 4001 (small/QwenRouter <1,2s).
  - Hard block `TEST_HARD_BLOCK` na Factory para isolamento de testes.
  - Tabela `audit_warnings` no SQLite para `DROP DETECTED`.
  - Script `npm run llm:smoke` para validação manual.

### Corrigido (Fase 24)

- Classificação `NORMAL_CHAT` ampliada nos mocks: de 4 para 28 padrões em português e inglês, evitando falsos positivos `DEVELOPMENT_TASK`.
- README.md, GUIA_DE_USO.md e `.humano` atualizados para refletir litellm, portas 4000/4001 e estado real pós-Fase 23.

### Segurança

- No-Shell Policy: `execa` sem shell em todas as operações.
- Prevenção de Path Traversal: `SafeResolve` com `fs.realpath` e validação de prefixo.
- Gate PreToolUse: `path.resolve` + `path.relative` para operações sensíveis.
- Hard block de testes: `NODE_ENV === 'test'` + transporte real → erro antes de qualquer rede.
- Zero credenciais em código: chaves apenas via variáveis de ambiente.

---

## Como atualizar

1. `git pull` a versão mais recente.
2. `npm install` para atualizar dependências.
3. `npm run build` para compilar.
4. `npm test` para validar (486 testes).
5. Para LLM real: suba litellm nas portas 4000/4001 e rode `npm run llm:smoke`.
