# Fase 22 — Resumo: Teste Real com o Qwen CLI

> **Data:** 2026-07-01
> **Status:** CONCLUÍDA AGUARDANDO APROVAÇÃO HUMANA

---

## Objetivo

Validar, no ambiente real do usuário, que o Qwen CLI consegue:
1. Encontrar e linkar a extensão GreenForge
2. Ler o `qwen-extension.json`
3. Subir o servidor MCP com `node dist/index.js mcp`
4. Descobrir o servidor MCP GreenForge
5. Enxergar as tools `greenforge_*`
6. Carregar a configuração de hooks
7. Executar hooks reais via `node dist/index.js hook <HookName>`
8. Rodar a partir de um diretório de trabalho externo ao GreenForge

---

## Comandos Qwen CLI Executados

| Comando | Resultado |
|---------|-----------|
| `qwen --version` | `0.19.1` |
| `qwen extensions list` | greenforge listada |
| `qwen extensions link "C:\Users\Usuario\Desktop\xgeneric-storage\greenforge"` | Extensão linkada com sucesso |
| `qwen -p "Liste tools MCP GreenForge" -y` | Listou 10 tools `greenforge_*` |
| `qwen -p "Diga apenas: OK" -y` (dir externo) | Sessão OK |
| `node dist/index.js hook SessionStart` | ✅ JSON correto |
| `node dist/index.js hook UserPromptSubmit` | ✅ JSON correto |
| `node dist/index.js hook PreToolUse` | ✅ JSON correto |
| `node dist/index.js hook PostToolUse` | ✅ JSON correto |
| `node dist/index.js hook SessionEnd` | ✅ JSON correto |
| `node dist/index.js hook SubagentStart` | ✅ JSON correto |
| `node dist/index.js hook SubagentStop` | ✅ JSON correto |

---

## Evidência: Extensão Linkada

```
qwen extensions list
→ linked:
    - greenforge (C:\Users\Usuario\Desktop\xgeneric-storage\greenforge)
```

---

## Evidência: MCP Server / Tools

O Qwen CLI reconheceu as 10 tools MCP `greenforge_*` em sessão real:

1. `greenforge_start`
2. `greenforge_list`
3. `greenforge_status`
4. `greenforge_approve`
5. `greenforge_review`
6. `greenforge_review_status`
7. `greenforge_feedback`
8. `greenforge_needs_changes`
9. `greenforge_reject`
10. `greenforge_abort`

Output do Qwen CLI real:
```
qwen -p "Liste todas as ferramentas MCP GreenForge disponiveis." -y
→ Ferramentas MCP GreenForge disponíveis:
  1. greenforge_start
  2. greenforge_list
  3. greenforge_status
  4. greenforge_approve
  5. greenforge_review
  6. greenforge_review_status
  7. greenforge_feedback
  8. greenforge_needs_changes
  9. greenforge_reject
  10. greenforge_abort
```

---

## Evidência: Hooks

Todos os 7 hooks funcionam diretamente via CLI:

```
echo {} | node dist/index.js hook SessionStart     → {"ok":true,"action":"ALLOW",...}
echo {} | node dist/index.js hook SessionEnd        → {"ok":true,"action":"ALLOW",...}
echo {} | node dist/index.js hook UserPromptSubmit  → {"ok":true,"action":"ALLOW",...}
echo {} | node dist/index.js hook PreToolUse        → {"ok":true,"action":"ALLOW",...}
echo {} | node dist/index.js hook PostToolUse       → {"ok":true,"action":"ALLOW",...}
echo {} | node dist/index.js hook SubagentStart     → {"ok":true,"action":"ALLOW",...}
echo {} | node dist/index.js hook SubagentStop      → {"ok":true,"action":"ALLOW",...}
```

---

## Problema Encontrado e Corrigido

### Bug: Schemas Zod `.strict()` rejeitando campos extras do Qwen CLI

- **Comportamento observado:** Qwen CLI injeta campo `$version: "1.0"` em objects de hooks do `settings.json`
- **Impacto:** `QwenSettingsSchema.strict()` rejeitava os dados com `Unrecognized key(s)`
- **Correção:** 5 schemas alterados de `.strict()` para `.passthrough()`:
  - `HookActionSchema`
  - `HookBindingSchema`
  - `QwenSettingsSchema`
  - `McpServerSchema`
  - `QwenExtensionManifestSchema`
- **Arquivo:** `src/integration/qwen/manifestSchemas.ts`
- **Justificativa:** `.passthrough()` ignora campos extras silenciosamente, mas continua validando campos requeridos

### Decisão: cwd="${extensionPath}" é necessário

- Teste fora do repo confirmou que sem `cwd: "${extensionPath}"`, os hooks falham porque `process.cwd()` apontaria para o diretório errado
- O Qwen CLI seta automaticamente o CWD para o `extensionPath` ao executar command hooks
- Essa configuração já estava correta no `.qwen/settings.json` da Fase 21

### Bug: Timeout flaky no mcp-server.test.ts (teste 1)

- **Comportamento observado:** Teste "McpGreenForgeServer can be instantiated" flaky com timeout 5000ms excedido ao rodar suíte completa (21 arquivos, 468 testes). Isolado passava raspando (5082ms). Na suíte completa, falhava consistentemente.
- **Causa raiz:** Cada `it()` criava um novo `McpGreenForgeServer` + `import()` dinâmico, repetindo ~5s de inicialização do runtime completo (QwenExtensionEntrypoint → QwenRouter → PlannerEngine → SQLiteRepository → Orchestrator) 6 vezes no grupo A e mais 2 vezes no grupo B. O primeiro teste do grupo A (que fazia a 1ª construção) estourava 5000ms.
- **Correção:** Refatoração do arquivo de teste para:
  - Import estático de `McpGreenForgeServer` no topo (removeu `await import()` repetidos)
  - `beforeAll` com timeout 10000ms cria instância única compartilhada (`let server`)
  - Testes 1-6 reutilizam a mesma instância via `server!`
- **Resultado pós-correção:**
  - Teste isolado: 8/8 ✅ em **198ms** (antes 5450ms)
  - Suíte completa: 468/468 ✅ em 28.60s
- **Arquivo:** `tests/mcp-server.test.ts`
- **Justificativa técnica:** A inicialização do runtime GreenForge completo custa ~5s de wall-clock. Repetir essa inicialização 8 vezes na suíte é desperdício de recursos e causa timeouts. A correção é arquiteturalmente correta: é um `beforeAll` com instância compartilhada, padrão recomendado pelo Vitest para casos onde a construção do SUT é cara.

---

## Resultado dos Testes

| Verificação | Resultado |
|-------------|-----------|
| `npm test` | ✅ 468/468 passando |
| `npm run build` | ✅ Build limpo |
| `npm run lint` | ✅ 0 erros, 0 warnings |

---

## Arquivos Criados

- `greenforge/docs/phase_22_resumo.md` (este arquivo)

## Arquivos Modificados

- `greenforge/src/integration/qwen/manifestSchemas.ts` — 5 schemas `.strict()` → `.passthrough()`
- `greenforge/tests/mcp-server.test.ts` — refatoração para instância compartilhada (correção timeout flaky)

## Documentação Atualizada

- `greenforge/.ai-context`
- `greenforge/.humano`
- `greenforge/docs/CURRENT_STATE.md`
- `greenforge/docs/BACKLOG_FUTURO.md`
- `greenforge/docs/DECISION_LOG.md`

---

## Decisões Importantes

1. **Schemas passthrough:** Campos extras injetados pelo Qwen CLI (como `$version`) são tolerados silenciosamente. Campos requeridos continuam validados.
2. **cwd="${extensionPath}" validado:** O Qwen CLI seta o diretório de trabalho do command hook para o extensionPath, garantindo que `process.cwd()` resolvesse corretamente.
3. **Sessões YOLO (-y):** Modo não-interativo do Qwen CLI requer `-y` para auto-aprovar uso de tools. Sem isso, tools são bloqueadas.

---

## Próxima Fase Recomendada

Fase 23 — Transporte Real de LLM (Blueprint decidido: ver docs/phase_23_blueprint.md)

---

## Status Final

**CONCLUÍDA AGUARDANDO APROVAÇÃO HUMANA**