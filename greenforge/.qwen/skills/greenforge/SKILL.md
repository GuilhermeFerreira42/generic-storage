---
name: greenforge
description: Gerencia tarefas de desenvolvimento com isolamento via git worktrees. Use quando o usuário pedir para iniciar, listar, aprovar ou abortar tarefas.
argument-hint: '<command> [args]'
---

# GreenForge — Skill de Orquestração

Comandos disponíveis:

- **start <task-name>**: Inicia nova tarefa com worktree isolado. Cria branch `forge/<task-name>` e provisiona ambiente isolado.
- **status**: Mostra estado das tarefas ativas, incluindo fase atual da máquina de estados (PLANNING, BUILDING, REVIEWING, etc.).
- **list [--status active|completed|all]**: Lista tarefas filtradas por status. Default: active.
- **approve <plan-id>**: Aprova plano gerado na fase PLANNING e inicia execução (transita para BUILDING).
- **abort <task-id>**: Aborta tarefa com rollback do worktree e limpeza de recursos.

## Fluxo de Trabalho

1. Usuário solicita tarefa → `start <nome>`
2. GreenForge entra em PLANNING e gera plano estruturado
3. Usuário revisa e aprova → `approve <plan-id>`
4. GreenForge executa em worktree isolado (BUILDING → REVIEWING → VERIFYING)
5. DiffLens gera relatório de auditoria
6. Usuário aprova mudanças → merge para main

## Integração com Hooks

- **SessionStart**: Inicializa SQLite e MCP Server
- **SessionEnd**: Limpa recursos e salva estado
- **PreToolUse**: Valida operações Write/Edit/Bash antes de executar
- **PostToolUse**: Sincroniza estado após execução de ferramentas

## Segurança

- Escrita restrita ao worktree da tarefa
- Validação de paths via SafeResolve
- Sem shell (execa com shell: false)
- Atomic write para integridade de arquivos
