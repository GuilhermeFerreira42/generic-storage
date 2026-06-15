---
name: greenforge
description: Gerencia tarefas de desenvolvimento com isolamento via git worktrees.
  Use quando o usuário pedir para iniciar, listar, aprovar ou abortar tarefas.
argument-hint: '<command> [args]'
---

O GreenForge é um orquestrador avançado que automatiza o ciclo Plan-Code-Verify.
Ele garante que todas as alterações sejam feitas em um ambiente isolado (worktree),
precedidas por um plano arquitetural e seguidas por verificações automáticas.

### Comandos Disponíveis:

- **start <task-name>**: Inicia uma nova tarefa de desenvolvimento. Cria um worktree isolado e entra em modo PLANNING.
- **status**: Exibe o status da tarefa ativa no diretório atual.
- **list [--status active|completed|all]**: Lista todas as tarefas gerenciadas pelo GreenForge.
- **approve <plan-id>**: Aprova o plano gerado na fase PLANNING e inicia a fase BUILDING.
- **abort <task-id>**: Aborta a tarefa atual, removendo o worktree e limpando o estado no banco de dados.

### Quando usar:
- Quando o usuário solicitar a implementação de uma nova feature.
- Quando for necessário corrigir um bug de forma isolada.
- Quando o usuário quiser ver o progresso de suas tarefas.
- Sempre que for necessária uma abordagem estruturada (Verdant AI style) para engenharia de código.
