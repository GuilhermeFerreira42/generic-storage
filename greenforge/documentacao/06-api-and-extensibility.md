# GreenForge — 06: API e Extensibilidade

> **Status:** ✅ | **Versão:** 1.1.0 | **Data:** 2026-06-11
> **Referências:** Model Context Protocol (MCP), Qwen CLI Extensions.

---

## 1. Ponto de Extensão 1: Skill Manifest

Localização: `.qwen/extensions/greenforge/skills/greenforge/SKILL.md`
Tipo: Estático (YAML frontmatter + Markdown)
Função: Instruir o modelo quando e como usar o GreenForge

```markdown
---
name: greenforge
description: Gerencia tarefas de desenvolvimento com isolamento via git worktrees.
  Use quando o usuário pedir para iniciar, listar, aprovar ou abortar tarefas.
argument-hint: '<command> [args]'
---

Comandos disponíveis:
- start <task-name>: Inicia nova tarefa com worktree isolado
- status: Mostra estado das tarefas ativas
- list [--status active|completed|all]: Lista tarefas
- approve <plan-id>: Aprova plano e inicia execução
- abort <task-id>: Aborta tarefa com rollback
```

## 2. Ponto de Extensão 2: Hooks JSON

Localização: `.qwen/settings.json` (ou `.qwen/extensions/greenforge/settings.json`)
Tipo: Declarativo (JSON)
Função: Interceptar eventos do ciclo de vida do Qwen CLI

Hooks disponíveis utilizados pelo GreenForge:
- **SessionStart** → inicialização
- **SessionEnd** → cleanup
- **UserPromptSubmit** → interceptação de prompts (substitui onMessage)
- **PreToolUse** → validação pré-execução (substitui onToolCall)
- **PostToolUse** → sync de estado pós-execução
- **SubagentStart** → inicialização de subagente
- **SubagentStop** → finalização de subagente

```json
{
  "hooks": {
    "SessionStart": [{
      "hooks": [{"type": "command", "command": "greenforge-init", "timeout": 5000}]
    }],
    "SessionEnd": [{
      "hooks": [{"type": "command", "command": "greenforge-cleanup", "timeout": 3000}]
    }],
    "UserPromptSubmit": [{
      "hooks": [{"type": "http", "url": "http://localhost:7777/prompt-submit", "timeout": 2000}]
    }],
    "PreToolUse": [{
      "matcher": "WriteFile|Edit|Bash",
      "hooks": [{"type": "http", "url": "http://localhost:7777/pre-tool", "timeout": 5000}]
    }],
    "PostToolUse": [{
      "hooks": [{"type": "http", "url": "http://localhost:7777/post-tool", "timeout": 3000}]
    }],
    "SubagentStart": [{
      "hooks": [{"type": "http", "url": "http://localhost:7777/subagent-start", "timeout": 3000}]
    }],
    "SubagentStop": [{
      "hooks": [{"type": "http", "url": "http://localhost:7777/subagent-stop", "timeout": 3000}]
    }]
  }
}
```

## 3. Ponto de Extensão 3: MCP Server

Localização: `src/mcp-server/index.ts`
Porta: localhost:7777 (configurável via GF_MCP_PORT)
Função: Expor ferramentas dinâmicas ao modelo (substitui registerTool)

Ferramentas expostas:
- `forge_start_task`
- `forge_list_tasks`
- `forge_approve_plan`

### Protocolo de Handoff de Artefatos

O GreenForge utiliza um sistema de handoff determinístico para garantir a integridade entre subtarefas.

```typescript
interface AgentArtifact {
  producedBy: string;       // ID da subtarefa produtora
  type: 'DIFF' | 'TEST_REPORT' | 'DOCS' | 'LINT_REPORT';
  path: string;             // Caminho do arquivo no worktree
  hash: string;             // SHA-256 para validação de integridade
  consumedBy: string[];     // IDs das subtarefas que dependem deste artefato
}
```

**Regra de Ouro**: Nenhuma subtarefa é marcada como `DONE` sem que seu `AgentArtifact` correspondente seja validado por hash e registrado no SQLite. Se o artefato estiver ausente ou corrompido, a subtarefa transita para `FAILED`.

## 4. Interface IPluginHost (novo)

Para testabilidade, o GreenForge define `IPluginHost` como abstração do host CLI.
O `QwenPluginAdapter` implementa esta interface sobre os 3 mecanismos acima.

---

## 5. Rastreabilidade
→ Este documento referencia: `03-technical-spec-and-data.md`
→ Este documento é referenciado por: `README.md`
