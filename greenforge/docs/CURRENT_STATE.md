# CURRENT_STATE — GreenForge
> Última atualização: Fase 23 implementada e validada em smoke real | 2026-07-24

## Estado Atual
- **Projeto:** GreenForge — extensão/orquestrador para Qwen CLI com arquitetura hexagonal.
- **Última fase executada:** Fase 23 — Transporte Real de LLM via proxy litellm.
- **Status documental da fase atual:** CONCLUÍDA E VALIDADA por aprovação humana em 2026-07-24.
- **Build:** PASSANDO (`npm run build`).
- **Lint:** PASSANDO (`npm run lint`, 0 erros reportados).
- **Testes:** PASSANDO (`npm test`, 486/486 testes em 23 arquivos).
- **Validação real externa:** `npm run llm:smoke` executado no desktop do usuário contra litellm nas portas 4000 e 4001 com `model: meu-pool`; resultado `ok: true`.

## Arquitetura Ativa
- **Core hexagonal estável:** `LLMProvider` continua sendo a porta única (`generate(prompt: string): Promise<string>`). O núcleo não conhece litellm, HTTP, portas ou credenciais.
- **Qwen CLI continua host:** Fases 20–22 mantêm hooks command reais e MCP stdio descoberto pelo Qwen CLI.
- **litellm é transporte, não cérebro:** GreenForge monta e valida o payload; litellm apenas encaminha para pools/modelos.
- **Roteamento assimétrico:** porta 4000 para pool grande/agentes; porta 4001 para pool pequeno/FAST usado em classificação rápida. O header `x-greenforge-profile: large|small` torna o perfil explícito.
- **Isolamento de testes:** `LLMProviderFactory` bloqueia provider real com transporte real em `NODE_ENV === 'test'` via `LLMProviderError('TEST_HARD_BLOCK')`.

## Fase 23 — Entregue
- `LiteLLMProvider` implementado em `src/infrastructure/llm/providers/LiteLLMProvider.ts`.
- `FetchLLMTransport` implementado em `src/infrastructure/llm/FetchLLMTransport.ts` para chamadas HTTP reais via `fetch`.
- `LLMProviderNameSchema` aceita `litellm`; config aceita `baseUrl`, `base_url`, `model`, `apiKeyEnv`, `timeout`, `mockMode` e `greenforgeProfile`.
- `LLMProviderRegistry` registra `litellm` como built-in.
- `LLMProviderFactory` aplica hard block físico contra vazamento de rede em testes.
- `LiteLLMRequestSchema` valida payload OpenAI-compatible antes do envio.
- Respostas com `dropped_params` geram warning `DROP DETECTED` via audit sink.
- `SQLiteRepository` ganhou tabela `audit_warnings`, `recordAuditWarning()` e `getAuditWarnings()`.
- Script manual `npm run llm:smoke` criado para testar portas 4000/4001 fora da suíte automatizada.

## Evidência Real Fase 23
Smoke real executado pelo usuário no Windows 11:
- Large: `http://localhost:4000`, modelo `meu-pool`, resposta `LARGE_OK`, 6413ms.
- Small: `http://localhost:4001`, modelo `meu-pool`, resposta `Saudação`, 1113ms.
- Resultado: `ok: true`; pool small dentro do RNF-01 (<1,2s).

## Módulos Críticos Vigentes
| Módulo | Arquivo | Contrato/Observação |
|--------|---------|---------------------|
| `LLMProvider` | `src/core/ports/LLMProvider.ts` | Porta estável do core; sem mudança na Fase 23. |
| `LiteLLMProvider` | `src/infrastructure/llm/providers/LiteLLMProvider.ts` | Adapter litellm OpenAI-compatible com Zod, headers de perfil e DROP DETECTED. |
| `FetchLLMTransport` | `src/infrastructure/llm/FetchLLMTransport.ts` | Transporte HTTP real via fetch, com timeout e erro estruturado. |
| `LLMProviderFactory` | `src/infrastructure/llm/LLMProviderFactory.ts` | Criação de providers + hard block em testes. |
| `LLMProviderRegistry` | `src/infrastructure/llm/LLMProviderRegistry.ts` | Built-ins: mock, qwen, openai, claude, gemini, litellm. |
| `SQLiteRepository` | `src/infrastructure/db/SQLiteRepository.ts` | Persistência de tasks, checkpoints e warnings auditáveis. |
| `QwenRouter` | `src/infrastructure/llm/QwenRouter.ts` | Continua recebendo um `LLMProvider`; para produção deve usar provider configurado para porta 4001. |
| `PlannerEngine` | `src/core/PlannerEngine.ts` | Continua recebendo `LLMProvider`; agentes/pipeline podem usar porta 4000. |
| `McpGreenForgeServer` | `src/integration/qwen/McpGreenForgeServer.ts` | MCP stdio real com 10 tools `greenforge_*`. |
| `HookCommandAdapter` | `src/integration/qwen/HookCommandAdapter.ts` | Hooks command reais via `node dist/index.js hook <HookName>`. |

## Testes Obrigatórios Atuais
- Suíte total: `npm test` — 486/486 passando.
- Fase 23: `tests/litellm-provider.test.ts` — 12 testes.
- Fase 23 transporte: `tests/litellm-transport.test.ts` — 4 testes.
- Persistência auditável: `tests/persistence.test.ts` — 11 testes.
- LLM providers legados: `tests/llm-providers.test.ts` — 78 testes.
- Build: `npm run build`.
- Lint: `npm run lint`.
- Smoke real manual: `npm run llm:smoke` com litellm ativo nas portas 4000/4001.

## Próxima Fase Recomendada
Fase 23 está aprovada e validada. Próxima fase possível: Fase 24 — Prontidão de Produção e Documentação Honesta. Não iniciar sem nova aprovação explícita do usuário.
