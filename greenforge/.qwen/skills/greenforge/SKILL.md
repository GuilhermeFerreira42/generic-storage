---
name: "greenforge"
description: "Gerencia tarefas de desenvolvimento com isolamento via git worktrees, planejamento auditável, JoinGate, DiffLens e Verifier. Use quando o usuário pedir para iniciar, listar, aprovar ou abortar tarefas técnicas."
argument-hint: '<command> [args]'
---

# GreenForge

Use esta skill para acionar a base de integração estática do GreenForge no Qwen CLI. Nesta fase, os comandos são contratos declarativos: eles descrevem a intenção e devem ser roteados para o MCP/host configurado, sem executar uma sessão real do Qwen nos testes.

## Comandos disponíveis

- `start <task-name>`: inicia uma nova tarefa com planejamento auditável e worktree isolado.
- `status`: mostra o estado das tarefas ativas e checkpoints relevantes.
- `list [--status active|completed|all]`: lista tarefas conhecidas pelo GreenForge.
- `approve <plan-id>`: aprova um plano gerado e libera a execução controlada.
- `abort <task-id>`: aborta uma tarefa em andamento e orienta rollback/limpeza segura.

## Garantias desta base

- A integração é validada por schemas e testes estáticos.
- Nenhum teste chama Qwen CLI real, servidor MCP real, rede ou LLM.
- Operações sensíveis de escrita/edição/shell devem passar por `PreToolUse`.
