# Fase 23 — Resumo: Transporte Real de LLM via litellm

> Status: CONCLUÍDA E VALIDADA  
> Data de arquivamento: 2026-07-24

## Objetivo
Conectar o GreenForge a um transporte LLM real via proxy litellm, preservando a arquitetura hexagonal. O litellm atua como transporte OpenAI-compatible; o GreenForge mantém controle de payload, validação, roteamento e auditoria.

## Entregas
- `LiteLLMProvider` criado em `src/infrastructure/llm/providers/LiteLLMProvider.ts`.
- `FetchLLMTransport` criado em `src/infrastructure/llm/FetchLLMTransport.ts` para chamadas HTTP reais via `fetch`.
- `LLMProviderConfig` expandido com `provider: 'litellm'`, `base_url`, `greenforgeProfile` e suporte à configuração da Fase 23.
- `LLMProviderRegistry` registra `litellm` como provider built-in.
- `LLMProviderFactory` bloqueia provider real com transporte real quando `NODE_ENV === 'test'` via `LLMProviderError('TEST_HARD_BLOCK')`.
- `LiteLLMRequestSchema` valida payload OpenAI-compatible antes do envio.
- `DROP DETECTED` é exposto por audit sink e pode ser persistido no SQLite.
- `SQLiteRepository` ganhou tabela `audit_warnings`, `recordAuditWarning()` e `getAuditWarnings()`.
- `scripts/litellm-smoke.mjs` e script `npm run llm:smoke` adicionados para teste real manual fora da suíte.

## Testes Criados ou Alterados
- `tests/litellm-provider.test.ts` — 12 testes do provider, payload, headers, mockMode, erros, DROP DETECTED e hard block.
- `tests/litellm-transport.test.ts` — 4 testes do transporte fetch com fetch injetado, porta 4000, porta 4001, timeout e falhas.
- `tests/persistence.test.ts` — testes de warnings auditáveis no SQLite.
- `tests/llm-providers.test.ts` — atualizado para seis providers built-in incluindo `litellm`.

## Evidência Automatizada
- `npm run build`: passou.
- `npm run lint`: passou.
- `npm test`: 486/486 testes passando em 23 arquivos.

## Evidência Real Externa
Smoke real executado pelo usuário no Windows 11 com litellm ativo nas portas 4000 e 4001:

```json
{
  "ok": true,
  "results": [
    {
      "profile": "large",
      "baseUrl": "http://localhost:4000",
      "model": "meu-pool",
      "elapsedMs": 6413,
      "responsePreview": "LARGE_OK"
    },
    {
      "profile": "small",
      "baseUrl": "http://localhost:4001",
      "model": "meu-pool",
      "elapsedMs": 1113,
      "responsePreview": "Saudação"
    }
  ]
}
```

O perfil small respondeu em 1113ms, dentro do RNF-01 (<1,2s).

## Decisões
- litellm é cano de transporte, não cérebro.
- Qwen CLI continua host.
- Core `LLMProvider` não foi alterado.
- Testes automatizados continuam isolados de rede real.
- Smoke real fica em script manual, fora do Vitest.

## Próxima Fase Recomendada
Fase 23 aprovada por aprovação humana em 2026-07-24. Próxima fase possível: Fase 24 — Prontidão de Produção e Documentação Honesta. Não iniciar sem nova aprovação explícita.
