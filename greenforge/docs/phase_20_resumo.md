# Fase 20 — Resumo: HookCommandAdapter (Modo Hook)

**Data:** 2026-06-29  
**Status:** CONCLUÍDA AGUARDANDO APROVAÇÃO HUMANA  
**Pré-requisito:** Fase 19 (MCP Server)

## Objetivo
Implementar o modo `hook` real no entrypoint (`node dist/index.js hook <HookName>`) para que o Qwen CLI possa invocar GreenForge através de hooks (SessionStart, UserPromptSubmit, PreToolUse, etc.).

## O que foi feito

### 1. Novo arquivo criado
- **`src/integration/qwen/HookCommandAdapter.ts`**
  - Lê payload JSON do stdin de forma segura (`readFileSync(0, 'utf-8')`)
  - Mapeia nome do hook → método correto em `QwenHookHandler`
  - Traduz resultados internos para formato esperado pelo Qwen CLI:
    - **Hooks de bloqueio** (`PreToolUse`, `UserPromptSubmit`): `{ hookSpecificOutput: { decision: { behavior, message, interrupt } } }`
    - **Hooks não-bloqueantes**: `{ ok, action, reason, ... }`
  - Fallbacks seguros:
    - Payload malformado em blocking hooks → `deny`
    - Payload malformado em non-blocking → `allow`
  - Suporte completo aos 7 hooks: SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, SessionEnd, SubagentStart, SubagentStop
  - Exit codes corretos (0 = sucesso, 1 = desconhecido, 2 = erro de sistema)
  - **Zero logs em stdout** (stdout reservado exclusivamente para JSON de resposta)

### 2. Atualização do entrypoint
- **`src/index.ts`**
  - Substituiu placeholder "Hook mode not yet implemented"
  - Implementou `runHookMode()` completo
  - `greenforge hook <HookName>` agora:
    - Instancia `HookCommandAdapter`
    - Processa hook
    - Imprime **apenas JSON** no stdout
    - Chama cleanup
    - Sai com exit code adequado

### 3. Testes (TDD)
- **`tests/hook-command-adapter.test.ts`** (15 testes novos)
  - Mapeamento de todos os 7 hooks
  - Formatos de saída corretos (decision para blocking / simples para non-blocking)
  - Fallbacks seguros para payload malformado
  - Hook desconhecido retorna lista de hooks válidos
  - Saída é JSON puro e parseável
  - Testes usam mocks e nunca chamam Qwen real, rede ou git destrutivo

## Resultados
- **Testes:** 460/460 passando (+15 da Fase 20)
- **Build:** ✅ `npm run build` sem erros
- **Lint:** ✅ 0 erros, 0 warnings
- **Isolamento:** Todos os testes usam mocks internos (InternalMockLLMProvider)

## Arquivos modificados
- `src/integration/qwen/HookCommandAdapter.ts` (novo)
- `src/index.ts`
- `tests/hook-command-adapter.test.ts` (novo)
- `docs/phase_20_resumo.md` (novo)
- `docs/CURRENT_STATE.md`
- `docs/DECISION_LOG.md`
- `docs/BACKLOG_FUTURO.md`
- `.ai-context`
- `.humano`

## Decisões importantes
- Usar `readFileSync(0, 'utf-8')` para ler stdin (padrão CLI síncrono)
- Separar comportamento de saída entre blocking vs non-blocking hooks
- Fallback seguro agressivo em caso de erro de parsing
- Manter `QwenHookHandler` intacto (conforme escopo)
- Não modificar `.qwen/settings.json` ou manifest (Fase 21)

## Próximos passos recomendados
Fase 21 — Atualização de hooks e settings.json para apontar para `greenforge hook ...`

**Pronto para revisão humana.**
