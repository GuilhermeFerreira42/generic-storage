# Phase 17 — Suporte a Múltiplos LLMs (Resumo)

> **Status:** CONCLUÍDA AGUARDANDO APROVAÇÃO HUMANA
> **Data:** 2026-06-26
> **Testes totais:** 437 (78 novos da Fase 17)

---

## Objetivo

Permitir que o GreenForge utilize diferentes provedores de LLM de forma configurável e extensível, sem acoplar o core a APIs específicas e sem chamar LLM real nos testes automatizados.

---

## Arquivos Criados

| Arquivo | Descrição |
|---------|-----------|
| `src/infrastructure/llm/LLMProviderConfig.ts` | Schemas Zod (`LLMProviderNameSchema`, `LLMProviderConfigSchema`, `LLMProviderFactoryOptionsSchema`), interface `LLMTransport`, classe `LLMProviderError` |
| `src/infrastructure/llm/LLMProviderRegistry.ts` | Registry que mapeia nomes de providers para factories. Built-in: mock, qwen, openai, claude, gemini |
| `src/infrastructure/llm/LLMProviderFactory.ts` | Factory com fallback seguro, validação Zod, singleton `LLMProviderFactory.default` |
| `src/infrastructure/llm/providers/MockLLMProvider.ts` | Provider determinístico para testes. Retorna classificação e planos JSON válidos |
| `src/infrastructure/llm/providers/QwenLLMProvider.ts` | Safe stub para Qwen. Sem transport → `NO_TRANSPORT`. Com mockMode → delega para MockLLMProvider |
| `src/infrastructure/llm/providers/OpenAILLMProvider.ts` | Safe stub para OpenAI (mesmo padrão de segurança) |
| `src/infrastructure/llm/providers/ClaudeLLMProvider.ts` | Safe stub para Claude (mesmo padrão de segurança) |
| `src/infrastructure/llm/providers/GeminiLLMProvider.ts` | Safe stub para Gemini (mesmo padrão de segurança) |
| `tests/llm-providers.test.ts` | 78 testes cobrindo todas as seções obrigatórias |
| `docs/phase_17_resumo.md` | Este documento |

## Arquivos Alterados

| Arquivo | Alteração |
|---------|-----------|
| `docs/CURRENT_STATE.md` | Atualizado com Fase 17, novos módulos, 437 testes totais |
| `docs/BACKLOG_FUTURO.md` | Fase 17 marcada como CONCLUÍDA AGUARDANDO APROVAÇÃO HUMANA com entregáveis detalhados |
| `docs/DECISION_LOG.md` | Adicionadas 12 entradas da Fase 17 (ADD, RULE, TECH) |
| `.humano` | Adicionada entrada da Fase 17 com status e destaques |

---

## Estratégia de Provider Registry/Factory

### LLMProviderRegistry
- Mapeia nomes de providers (`LLMProviderName`) para funções factory.
- Built-in providers: `mock`, `qwen`, `openai`, `claude`, `gemini`.
- Suporta registro de providers customizados via `register(name, factory)`.
- Método `create(config, transport?)` instancia o provider apropriado.

### LLMProviderFactory
- Valida configuração via Zod (`LLMProviderFactoryOptionsSchema`).
- **Fallback seguro:** Provider desconhecido → fallback para `mock` (configurável via `fallbackOnUnknown` e `fallbackProvider`).
- Provider real sem transport → `LLMProviderError('NO_TRANSPORT')`.
- Provider real sem apiKeyEnv → `LLMProviderError('NO_API_KEY_CONFIG')`.
- Provider real sem env var → `LLMProviderError('NO_API_KEY')`.
- Em `mockMode` → delega para `MockLLMProvider` interno.
- Singleton `LLMProviderFactory.default` disponível.

---

## Providers Suportados

| Provider | Tipo | Comportamento |
|----------|------|---------------|
| `mock` | Mock | Determinístico, retorna classificação e planos JSON válidos. Zero rede |
| `qwen` | Safe Stub | Sem transport: `NO_TRANSPORT`. Com mockMode: delega para MockLLMProvider |
| `openai` | Safe Stub | Mesmo padrão de segurança do Qwen |
| `claude` | Safe Stub | Mesmo padrão de segurança do Qwen |
| `gemini` | Safe Stub | Mesmo padrão de segurança do Qwen |

---

## Como os Providers Reais Foram Mantidos Seguros

1. **Sem `fetch` direto:** Providers reais não usam `fetch` ou qualquer SDK HTTP diretamente. Toda comunicação de rede passa pela interface `LLMTransport`, que é injetável e mockável.
2. **Sem rede em testes:** Nenhum teste injeta um transport real. Todos os testes usam `mockMode: true` ou omitem o transport, fazendo o provider falhar com `LLMProviderError` antes de qualquer chamada de rede.
3. **Sem API keys no código:** API keys nunca são armazenadas em strings literais. A configuração `apiKeyEnv` referencia o nome de uma variável de ambiente, e o provider lê `process.env[apiKeyEnv]` em runtime.
4. **Sem SDKs externos:** Nenhum SDK da OpenAI, Anthropic, Google ou Qwen foi adicionado como dependência.
5. **Sem logging de secrets:** Nenhum provider loga o valor de API keys ou secrets.
6. **Erro estruturado:** `LLMProviderError` com código, mensagem, provider e flag `retryable` permite tratamento programático de falhas.

---

## Como o Mock é Usado nos Testes

- `MockLLMProvider` é o provider padrão em todos os testes da Fase 17.
- Retorna respostas determinísticas baseadas no conteúdo do prompt:
  - Prompts contendo "Classifique a intenção" + termos técnicos → `DEVELOPMENT_TASK` com confidence 0.95.
  - Prompts contendo "Classifique a intenção" + saudação → `NORMAL_CHAT`.
  - Prompts contendo "Generate a plan" ou "Plan something" → JSON de plano válido com 5 perguntas, 3 subtarefas, 2 critérios.
- `LLMProviderFactory.createMock()` sempre retorna `MockLLMProvider`.
- `LLMProviderFactory.createFromConfig({ provider: 'mock' })` também retorna `MockLLMProvider`.

---

## Componentes Integrados

| Componente | Como foi integrado |
|------------|-------------------|
| `QwenRouter` | Aceita `LLMProvider` no construtor. Testes usam `factory.createMock()` ou `QwenLLMProvider` com `mockMode: true` |
| `PlannerEngine` | Aceita `LLMProvider` no construtor. Testes usam `factory.createMock()` ou `QwenLLMProvider` com `mockMode: true` |
| `QwenExtensionRuntime` | Mantém `InternalMockLLMProvider` interno, sem alteração de construtor. Testes verificam compatibilidade e que `usesRealLLM()` retorna `false` |

Nenhum construtor existente foi quebrado. Compatibilidade retroativa mantida.

---

## Contratos Zod Criados

| Schema | Descrição |
|--------|-----------|
| `LLMProviderNameSchema` | `z.enum(['mock', 'qwen', 'openai', 'claude', 'gemini'])` |
| `LLMProviderConfigSchema` | `provider`, `model?`, `apiKeyEnv?`, `baseUrl?`, `timeout?` (positive), `mockMode?` |
| `LLMProviderFactoryOptionsSchema` | `config` (loose), `fallbackProvider?`, `fallbackOnUnknown?` (default: true) |

---

## Testes

### Distribuição dos 78 testes novos

| Seção | Testes | Descrição |
|-------|--------|-----------|
| A. Config/Schema | 14 | Validação de provider names, config completa, config mínima, timeout, fallback |
| B. MockLLMProvider | 6 | Interface, classificação, plano JSON, estrutura de subtarefas, sem rede |
| C. Registry | 9 | Built-in providers, getRegisteredNames, create para cada provider, custom register |
| D. Factory | 12 | createMock, createFromConfig, fallback, fallbackOnUnknown=false, validação Zod |
| E. Safe Stubs | 11 | NO_TRANSPORT, NO_API_KEY_CONFIG, mockMode, LLMProviderError shape, sem rede |
| F. QwenRouter | 5 | Integração com MockLLMProvider, QwenLLMProvider mockMode, fallback NORMAL_CHAT |
| G. PlannerEngine | 5 | Integração com MockLLMProvider, QwenLLMProvider mockMode, validação Zod, rejeição de plano inválido |
| H. Runtime | 4 | QwenExtensionRuntime com factory mock, router, planner, isolation methods |
| I. Isolamento | 8 | Sem LLM real, sem Qwen real, sem rede, sem API key, sem SDK, sem estado global, determinismo |
| J. Erros | 4 | LLMProviderError default/retryable, NO_API_KEY_CONFIG, NO_API_KEY |

### Total final de testes: 437

---

## Comandos Finais

```
npm test        → 437/437 passing (18 test files)
npm run build   → 0 errors
npm run lint    → 0 errors, 0 warnings
```

---

## Confirmações

- [x] Nenhuma fase futura foi iniciada
- [x] Nenhum commit foi feito
- [x] `git status` não contém `node_modules`, `dist`, `.agent`, `.claude`, `tarefas`
- [x] Nenhum teste chama LLM real, Qwen real, rede, ou exige API key
- [x] Nenhum SDK externo foi adicionado
- [x] Nenhum construtor existente foi quebrado
- [x] Todos os testes de regressão passam (router, planner, qwen-e2e, qwen-real-extension, plan-review, refactor-agent, demais suites)