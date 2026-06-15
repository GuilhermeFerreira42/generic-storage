# Status de Integração GreenForge × Qwen CLI

**Última atualização:** 2026-06-11
**Versão do Qwen CLI:** v0.4+
**Node.js mínimo:** v22+

## Componentes de Integração

| Componente | Mecanismo | Status | Arquivo de Referência | Observações |
|---|---|---|---|---|
| Inicialização | SessionStart hook | ✅ Especificado | `06-api-and-extensibility.md` | Substitui activate() |
| Shutdown | SessionEnd hook | ✅ Especificado | `06-api-and-extensibility.md` | Substitui deactivate() |
| Interceptação de prompt | UserPromptSubmit hook | ✅ Especificado | `06-api-and-extensibility.md` | Substitui onMessage() |
| Validação de ferramentas | PreToolUse hook | ✅ Especificado | `06-api-and-extensibility.md` | Substitui onToolCall() |
| Sync de estado | PreToolUse + PostToolUse | ✅ Especificado | `06-api-and-extensibility.md` | Workaround para onStateChange ausente |
| Ferramentas dinâmicas | MCP Server :7777 | ✅ Especificado | `06-api-and-extensibility.md` | Substitui registerTool() |
| Comandos slash | SKILL.md manifest | ✅ Especificado | `SKILL.md` | Substitui comandos slash Gemini |
| Controle de subagentes | SubagentStart/Stop hooks | ✅ Especificado | `06-api-and-extensibility.md` | NOVO — nativo no Qwen |
| Persistência global | SQLite (mantido) | ✅ Especificado | `03-technical-spec-and-data.md` | globalState → SQLite direto |
| Persistência workspace | SQLite (mantido) | ✅ Especificado | `03-technical-spec-and-data.md` | workspaceState → SQLite direto |

## Dívidas Técnicas Herdadas

1. **MockQwenHookRunner**
   - **Referência:** `03-technical-spec-and-data.md` (§7)
   - **Status:** Bloqueante para MVP (TDD Basis).
   - **Contrato:** Deve implementar interface `IMockHookRunner { dispatchHook(name, payload): Promise<void>; getHookLog(): HookEvent[]; }`.

2. **Error Handling MCP Server**
   - **Referência:** `06-api-and-extensibility.md` (§3)
   - **Status:** Bloqueante para MVP.
   - **Contrato:** Falhas devem retornar JSON padrão: `{ "error": string, "code": string, "retryable": boolean }`.

3. **onStateChange Workaround**
   - **Referência:** `GREENFORGE_DESIGN.md` (§3.4)
   - **Status:** Adiado (pode iniciar com Pre/Post hooks simples).
   - **Resolução:** Confirmada via `PreToolUse` + `PostToolUse` para polling de estado.

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| QWEN_API_KEY | ✅ | Chave de API do Qwen |
| GF_WORKTREE_ROOT | ❌ | Raiz dos worktrees (default: .git/greenforge-worktrees) |
| GF_MAX_PARALLEL | ❌ | Máximo de tarefas simultâneas (default: 3) |
| GF_DB_PATH | ❌ | Caminho do SQLite (default: ~/.greenforge/greenforge.db) |
| GF_MCP_PORT | ❌ | Porta do MCP Server (default: 7777) |
| GF_LOG_LEVEL | ❌ | Nível de log: debug, info, warn, error (default: info) |
