# Status de Integração GreenForge × Qwen CLI

**Última atualização:** 2026-06-11
**Versão do Qwen CLI:** v0.4+
**Node.js mínimo:** v22+

## Componentes de Integração

| Componente | Mecanismo | Status | Observações |
|---|---|---|---|
| Inicialização | SessionStart hook | ⬜ Pendente | Substitui activate() |
| Shutdown | SessionEnd hook | ⬜ Pendente | Substitui deactivate() |
| Interceptação de prompt | UserPromptSubmit hook | ⬜ Pendente | Substitui onMessage() |
| Validação de ferramentas | PreToolUse hook | ⬜ Pendente | Substitui onToolCall() |
| Sync de estado | PreToolUse + PostToolUse | ⬜ Pendente | Workaround para onStateChange ausente |
| Ferramentas dinâmicas | MCP Server :7777 | ⬜ Pendente | Substitui registerTool() |
| Comandos slash | SKILL.md manifest | ⬜ Pendente | Substitui comandos slash Gemini |
| Controle de subagentes | SubagentStart/Stop hooks | ⬜ Pendente | NOVO — nativo no Qwen |
| Persistência global | SQLite (mantido) | ⬜ Pendente | globalState → SQLite direto |
| Persistência workspace | SQLite (mantido) | ⬜ Pendente | workspaceState → SQLite direto |

## Dívidas Técnicas Herdadas

1. Testes de integração: mocks são do Gemini CLI, precisam ser reescritos para MockQwenHookRunner
2. Error handling: falhas no MCP Server não têm tratamento uniforme definido
3. onStateChange sem equivalente direto: definir contrato de polling via PreToolUse + PostToolUse

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| QWEN_API_KEY | ✅ | Chave de API do Qwen |
| GF_WORKTREE_ROOT | ❌ | Raiz dos worktrees (default: .git/greenforge-worktrees) |
| GF_MAX_PARALLEL | ❌ | Máximo de tarefas simultâneas (default: 3) |
| GF_DB_PATH | ❌ | Caminho do SQLite (default: ~/.greenforge/greenforge.db) |
| GF_MCP_PORT | ❌ | Porta do MCP Server (default: 7777) |
| GF_LOG_LEVEL | ❌ | Nível de log: debug, info, warn, error (default: info) |
