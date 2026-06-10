# Relatório Completo: Investigação Técnica sobre Plugins do OpenClaude/Claude Code

## Resumo Executivo

Esta investigação técnica exaustiva analisou o sistema de plugins do OpenClaude (fork do Claude Code) para determinar a viabilidade e abordagem para migração do projeto GreenForge (atualmente uma extensão para Gemini CLI) para um plugin do OpenClaude/Claude Code.

**Conclusão Principal:** ✅ **As informações coletadas são SUFICIENTES para iniciar a migração do GreenForge.** O sistema de plugins do OpenClaude oferece todos os mecanismos necessários para reimplementar as funcionalidades principais do GreenForge:

- **Hooks de ciclo de vida** para interceptar eventos como `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, etc.
- **Skills** para comandos slash customizados invocáveis pelo usuário
- **Agents** para subagentes especializados com isolamento via worktrees
- **MCP (Model Context Protocol)** para ferramentas customizadas
- **Persistência** via arquivos JSON no diretório do plugin ou settings.json

### Mapeamento Conceitual GreenForge → OpenClaude

| Componente GreenForge | Mecanismo OpenClaude Equivalente | Observações |
|---|---|---|
| **Intention Router (GF-ROUTER)** | Hook `UserPromptSubmit` + Hook `prompt` type | Pode classificar intents via LLM antes do processamento |
| **Orchestrator Core** | Hook chains + Agent coordination | Máquina de estado implementável via hooks e agents |
| **Worktree Manager (GF-ISOLATOR)** | WorktreeCreate/WorktreeRemove hooks + `isolation: worktree` em agents | Suporte nativo a git worktrees |
| **Persistence Layer (SQLite)** | Plugin state files (JSON) em `~/.claude/` ou dentro do plugin | Recomenda-se JSON ou SQLite via MCP server |
| **Delegator & Verifier** | Subagents (`@nome`) + Hook `PostToolUse` | Agents com `allowed-tools` restritas |
| **DiffLens (GF-DIFFLENS)** | Skill customizada + Hook `PostToolUse` | Geração de diff reports via skill |
| **Code-Reviewer (@Code-Reviewer)** | Agent com `allowed-tools: Read, Grep` | Subagente especializado |
| **Custom Tools (forge_*)** | MCP servers registrados via `.mcp.json` | Ferramentas customizadas via MCP |
| **AGENTS.md / FORGE_RULES.md** | Plugin settings + Skills com frontmatter | Regras carregadas via manifest |

---

## 1. Estrutura de um Plugin

### Estrutura de Pastas Exata

```
meu-plugin/
├── .claude-plugin/
│   └── plugin.json           # Manifesto obrigatório
├── commands/                  # Slash commands (legado, ainda suportado)
│   └── meu-comando.md
├── skills/                    # Skills canônicas (recomendado)
│   └── minha-skill/
│       └── SKILL.md
├── agents/                    # Subagentes
│   └── meu-agente.md
├── hooks/                     # Hooks do plugin
│   └── hooks.json
├── .mcp.json                  # Configuração MCP (opcional)
└── README.md
```

### Arquivos Obrigatórios

- **`.claude-plugin/plugin.json`**: Manifesto do plugin (obrigatório)
- **Pelo menos um componente**: `commands/`, `skills/`, `agents/`, ou `hooks/`

### Exemplo de `plugin.json` Completo

```json
{
  "name": "greenforge",
  "version": "1.0.0",
  "description": "Orquestração avançada Plan-Code-Verify com Git Worktrees",
  "author": {
    "name": "Seu Nome",
    "email": "seu@email.com",
    "url": "https://github.com/seu-usuario"
  },
  "homepage": "https://github.com/seu-usuario/greenforge",
  "repository": "https://github.com/seu-usuario/greenforge",
  "license": "MIT",
  "keywords": ["orchestration", "git", "worktree", "plan-code-verify"],
  
  "hooks": "./hooks/hooks.json",
  
  "commands": {
    "greenforge-plan": {
      "source": "./commands/greenforge-plan.md",
      "description": "Inicia modo de planejamento do GreenForge"
    }
  },
  
  "skills": "./skills",
  
  "agents": "./agents",
  
  "mcpServers": "./.mcp.json"
}
```

---

## 2. Slash Commands

### Método Canônico: Skills vs Commands

O sistema suporta ambos, mas **`skills/` é o método canônico atual**. O formato legado `commands/` ainda funciona.

### Estrutura de Skill (`skills/nome/SKILL.md`)

```markdown
---
name: greenforge-start
description: Inicia uma nova tarefa do GreenForge com isolamento em worktree
invoke: manual
allowed-tools: Bash, Read, Write, Edit
model: claude-sonnet-4-6
---

# GreenForge Start Skill

Você deve iniciar uma nova tarefa do GreenForge seguindo estes passos:

1. Classificar a intenção do usuário (chat casual vs tarefa de desenvolvimento)
2. Se for tarefa, criar um worktree isolado
3. Gerar um plano detalhado em GREENFORGE_PLAN.md
4. Aguardar aprovação do usuário antes de prosseguir

## Input do Usuário

$ARGUMENTS

## Instruções Específicas

- Use o hook UserPromptSubmit para classificação
- Crie worktree com nome `forge/task-{timestamp}`
- Persista o estado em `.greenforge/state.json`
```

### Frontmatter YAML - Campos Disponíveis

| Campo | Tipo | Descrição |
|---|---|---|
| `name` | string | Nome da skill (usado como `/nome`) |
| `description` | string | Descrição exibida na UI |
| `invoke` | `"manual"\|"auto"` | Se invocada manualmente ou auto-invocável |
| `allowed-tools` | string[] | Ferramentas permitidas |
| `model` | string | Modelo padrão (ex: `claude-sonnet-4-6`) |
| `whenToUse` | string | Dica de quando usar esta skill |
| `argumentHint` | string | Hint para argumentos (ex: `[file] [task]`) |

---

## 3. Hooks de Ciclo de Vida

### Eventos Disponíveis (HOOK_EVENTS)

Lista completa extraída de `src/entrypoints/sdk/coreTypes.ts`:

```typescript
export const HOOK_EVENTS = [
  'PreToolUse',        // Antes de uma ferramenta ser usada
  'PostToolUse',       // Após uso bem-sucedido
  'PostToolUseFailure',// Após falha de ferramenta
  'Notification',      // Notificações do sistema
  'UserPromptSubmit',  // Quando usuário envia prompt
  'SessionStart',      // Início da sessão
  'SessionEnd',        // Fim da sessão
  'Stop',              // Parada solicitada
  'StopFailure',       // Falha na parada
  'SubagentStart',     // Início de subagente
  'SubagentStop',      // Fim de subagente
  'PreCompact',        // Antes de compactação de contexto
  'PostCompact',       // Após compactação
  'PermissionRequest', // Solicitação de permissão
  'PermissionDenied',  // Permissão negada
  'Setup',             // Setup inicial
  'TeammateIdle',      // Colega ocioso (modo teammate)
  'TaskCreated',       // Tarefa criada
  'TaskCompleted',     // Tarefa completada
  'Elicitation',       // Elicitação iniciada
  'ElicitationResult', // Resultado de elicitação
  'ConfigChange',      // Mudança de configuração
  'WorktreeCreate',    // Worktree criado
  'WorktreeRemove',    // Worktree removido
  'InstructionsLoaded',// Instruções carregadas
  'CwdChanged',        // Diretório de trabalho mudado
  'FileChanged',       // Arquivo modificado
] as const
```

### Exemplo de Configuração em `settings.json`

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Classifique este input como 'CHAT' ou 'TASK': $ARGUMENTS",
            "model": "claude-haiku-4-6",
            "timeout": 5
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit",
        "if": "Write(*.ts)",
        "hooks": [
          {
            "type": "command",
            "command": "echo \"Arquivo editado: $ARGUMENTS\" >> ~/.greenforge/log.txt",
            "shell": "bash",
            "async": true
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "if": "Bash(git commit*)",
        "hooks": [
          {
            "type": "agent",
            "prompt": "Verifique se o commit message segue o padrão convencional",
            "timeout": 30,
            "model": "claude-haiku-4-6"
          }
        ]
      }
    ]
  }
}
```

### Tipos de Hook

| Tipo | Descrição | Uso |
|---|---|---|
| `command` | Executa comando shell | Scripts, logs, automações |
| `prompt` | Avalia prompt com LLM | Classificação, transformação |
| `agent` | Agente verificador | Validações complexas |
| `http` | POST para URL | Webhooks, integrações |

### Códigos de Saída (Exit Codes)

- **Exit 0**: Sucesso, continua execução normal
- **Exit 1**: Erro, mas não bloqueante
- **Exit 2**: **Bloqueante** - interrompe a ação original

### Exemplo de Script Shell com Exit 2

```bash
#!/bin/bash
# hooks/scripts/block-commit.sh

COMMIT_MSG="$1"

if [[ "$COMMIT_MSG" =~ ^WIP ]]; then
  echo "❌ Commits WIP são bloqueados pela política do projeto"
  exit 2  # BLOQUEIA o commit
fi

echo "✅ Commit aprovado"
exit 0
```

---

## 4. Skills: Manual vs Auto-Invocável

### Skill Manual (`invoke: manual`)

Invocada explicitamente pelo usuário via `/nome-da-skill`.

```markdown
---
name: greenforge-review
description: Revisa código em busca de violações de segurança
invoke: manual
allowed-tools: Read, Grep, Bash
model: claude-sonnet-4-6
whenToUse: Use após implementar funcionalidades críticas
---

# Review de Segurança

Execute análise estática de segurança no código.
```

### Skill Auto-Invocável (`invoke: auto`)

O Claude pode invocar automaticamente quando relevante.

```markdown
---
name: security-check
description: Verificação automática de segurança
invoke: auto
allowed-tools: Read, Grep
model: claude-haiku-4-6
---

# Verificação Automática de Segurança

Esta skill é invocada automaticamente antes de commits.
```

---

## 5. Subagentes (Agents)

### Definição em `agents/nome.md`

```markdown
---
name: greenforge-reviewer
description: Revisor de código especializado do GreenForge
model: claude-sonnet-4-6
allowed-tools: Read, Grep, Bash
isolation: worktree
---

# GreenForge Code Reviewer

Você é um revisor de código especializado. Sua função é:

1. Analisar diffs gerados em worktrees isolados
2. Verificar aderência ao AGENTS.md do projeto
3. Reportar violações de constraints
4. Aprovar ou solicitar correções

## Ferramentas Disponíveis

- `Read`: Ler arquivos do repositório
- `Grep`: Buscar padrões no código
- `Bash`: Executar lint e testes

## Restrições

- NUNCA escreva fora do worktree atribuído
- SEMPRE referencie o plano aprovado (GREENFORGE_PLAN.md)
- Retorne APPROVED ou VIOLATIONS com lista detalhada
```

### Campos do Frontmatter de Agent

| Campo | Tipo | Descrição |
|---|---|---|
| `name` | string | Nome do agente (usado como `@nome`) |
| `description` | string | Descrição exibida na UI |
| `model` | string | Modelo a ser usado |
| `allowed-tools` | string[] | Ferramentas permitidas |
| `isolation` | `"worktree"\|undefined` | Isola em worktree separado |

### Invocação de Subagentes

**Manual:** `@greenforge-reviewer analise este diff`

**Via Ferramenta Task:**
```typescript
// Em uma skill ou hook
const result = await sdk.task({
  agent: 'greenforge-reviewer',
  prompt: 'Revise as mudanças neste PR'
})
```

---

## 6. Ferramentas Customizadas e MCP

### Registro de Servidor MCP em `.mcp.json`

```json
{
  "mcpServers": {
    "greenforge-storage": {
      "command": "node",
      "args": ["/path/to/greenforge-mcp-server.js"],
      "cwd": "/path/to/plugin",
      "env": {
        "GREENFORGE_DB_PATH": "~/.greenforge/state.db"
      }
    },
    "greenforge-git": {
      "command": "python",
      "args": ["-m", "greenforge_mcp_git"],
      "cwd": "/path/to/plugin"
    }
  }
}
```

### Transports Suportados

| Transport | Configuração | Exemplo |
|---|---|---|
| **stdio** | `command`, `args` | Padrão para servidores locais |
| **HTTP/SSE** | `url` | `{"url": "http://localhost:8080/sse"}` |
| **WebSocket** | `url` | `{"url": "ws://localhost:8080/ws"}` |

### Exemplo Completo de `.mcp.json`

```json
{
  "mcpServers": {
    "sqlite-storage": {
      "command": "node",
      "args": ["./mcp/sqlite-server.js"],
      "env": {
        "DATABASE_URL": "file:~/.greenforge/state.db?mode=rwc"
      }
    },
    "webhook-notifier": {
      "url": "http://localhost:3000/mcp/sse",
      "headers": {
        "Authorization": "Bearer $GREENFORGE_WEBHOOK_TOKEN"
      }
    },
    "git-operations": {
      "command": "python3",
      "args": ["-m", "greenforge.mcp.git"],
      "cwd": "./mcp"
    }
  }
}
```

### Como o Plugin Expõe Ferramentas MCP

1. O servidor MCP registra ferramentas via protocolo MCP
2. O Claude Code descobre ferramentas automaticamente
3. Ferramentas aparecem na lista de ferramentas disponíveis
4. Skills e agents podem usar via `allowed-tools`

### Alternativa sem MCP: Hooks `PreToolUse`

Não há API direta para registrar ferramentas customizadas sem MCP, mas hooks podem **interceptar e modificar** chamadas de ferramentas:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Transforme esta escrita em operação atômica: $ARGUMENTS"
          }
        ]
      }
    ]
  }
}
```

---

## 7. Git Worktrees

### Suporte Nativo do Claude Code

O Claude Code possui suporte nativo a worktrees via:

1. **Ferramenta `EnterWorktree`**: Navega entre worktrees
2. **Hooks `WorktreeCreate` / `WorktreeRemove`**: Intercepta criação/remoção
3. **Agent `isolation: worktree`**: Isola subagentes em worktrees dedicados

### Exemplo: Criar Worktree Isolado em Subagente

```markdown
---
name: greenforge-coder
description: Agente de implementação em worktree isolado
model: claude-sonnet-4-6
allowed-tools: Bash, Read, Write, Edit
isolation: worktree
---

# GreenForge Coder Agent

Você trabalha em um worktree isolado. Siga estas regras:

1. Todo código é escrito apenas no worktree atual
2. Use `git worktree list` para verificar isolamento
3. Ao finalizar, gere um diff para review

## Comandos Disponíveis

```bash
# Criar worktree (automático pelo SDK)
git worktree add ../.gemini/worktrees/forge-task-123 -b forge/task-123

# Trabalhar no worktree
cd ../.gemini/worktrees/forge-task-123

# Gerar diff ao finalizar
git diff main > /tmp/task-123.diff
```
```

### Hooks de Worktree

```json
{
  "hooks": {
    "WorktreeCreate": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "echo \"Worktree criado: $ARGUMENTS\" >> ~/.greenforge/worktrees.log"
          }
        ]
      }
    ],
    "WorktreeRemove": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "http",
            "url": "http://localhost:3000/webhook/worktree-removed",
            "headers": {
              "Content-Type": "application/json"
            }
          }
        ]
      }
    ]
  }
}
```

### OpenClaude (Fork): Features Presentes?

✅ **Sim**, todas as features de worktree estão presentes no OpenClaude, pois são herdadas do Claude Code upstream. A verificação no código-fonte confirma:

- `WorktreeCreate` e `WorktreeRemove` em `HOOK_EVENTS`
- Campo `isolation: worktree` em agents
- Ferramenta nativa `EnterWorktree`

### Implementação via Bash (Fallback)

Se necessário implementar manualmente:

```bash
#!/bin/bash
# scripts/create-worktree.sh

TASK_ID="$1"
BRANCH_NAME="forge/$TASK_ID"
WORKTREE_PATH=".gemini/worktrees/$TASK_ID"

git worktree add "$WORKTREE_PATH" -b "$BRANCH_NAME" 2>/dev/null || {
  echo "Worktree já existe, usando existente"
}

echo "$WORKTREE_PATH"
```

---

## 8. Persistência de Estado

### API de Armazenamento

**Não há API `globalState` nativa** no sistema de plugins. A recomendação é:

1. **Arquivos JSON** no diretório do plugin ou `~/.claude/`
2. **SQLite** via servidor MCP dedicado
3. **Settings.json** para configurações do usuário

### Boas Práticas de Persistência

#### Onde Armazenar

```
~/.greenforge/
├── state.json          # Estado global
├── tasks/
│   ├── task-001.json   # Estado por tarefa
│   └── task-002.json
└── logs/
    └── activity.log
```

Ou dentro do plugin (para dados específicos do plugin):

```
/path/to/plugin/
└── .data/
    └── state.json
```

#### Atomicidade de Escrita

```javascript
// Exemplo de escrita atômica (ADR-04 do GreenForge)
import fs from 'fs/promises'
import path from 'path'

async function atomicWrite(filePath, data) {
  const tmpPath = filePath + '.tmp'
  
  // 1. Escreve em arquivo temporário
  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2))
  
  // 2. Fsync para garantir durabilidade
  const fd = await fs.open(tmpPath, 'r+')
  await fd.sync()
  await fd.close()
  
  // 3. Rename atômico
  await fs.rename(tmpPath, filePath)
}
```

#### Usando Hooks para Atualizar Estado

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "node ./scripts/update-state.js \"$ARGUMENTS\"",
            "async": true
          }
        ]
      }
    ],
    "TaskCompleted": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "node ./scripts/archive-task.js \"$ARGUMENTS\""
          }
        ]
      }
    ]
  }
}
```

---

## 9. Configuração e Autenticação

### Hierarquia de `settings.json`

1. **Global**: `~/.claude/settings.json` (configurações do usuário)
2. **Projeto**: `<project_root>/.claude/settings.json` (configurações do projeto)
3. **Local**: `.claude/settings.local.json` (ignorado pelo git)

### Chaves Importantes para Plugins

```json
{
  "plugins": {
    "enabledPlugins": {
      "greenforge@my-marketplace": true
    }
  },
  "hooks": {
    "UserPromptSubmit": [...],
    "PostToolUse": [...]
  },
  "mcpServers": {
    "greenforge-storage": {...}
  },
  "allowedTools": ["Read", "Write", "Edit", "Bash"],
  "models": {
    "default": "claude-sonnet-4-6",
    "small": "claude-haiku-4-6"
  }
}
```

### Acesso a Variáveis de Ambiente

Plugins acessam variáveis de ambiente via:

1. **Processo filho**: `process.env.VAR_NAME`
2. **Hook HTTP**: Interpolação `$VAR_NAME` em headers
3. **MCP servers**: Passadas via `env` no `.mcp.json`

### Exemplo de `.openclaude-profile.json`

```json
{
  "name": "GreenForge Developer",
  "description": "Perfil otimizado para desenvolvimento com GreenForge",
  "settings": {
    "models": {
      "default": "claude-sonnet-4-6",
      "planning": "claude-sonnet-4-6",
      "coding": "claude-sonnet-4-6",
      "review": "claude-haiku-4-6"
    },
    "hooks": {
      "UserPromptSubmit": [
        {
          "matcher": ".*",
          "hooks": [
            {
              "type": "prompt",
              "prompt": "Este input requer uma tarefa GreenForge? Responda YES ou NO.",
              "model": "claude-haiku-4-6"
            }
          ]
        }
      ]
    },
    "allowedTools": [
      "Read",
      "Write",
      "Edit",
      "Bash(git *)",
      "Bash(npm *)",
      "Bash(yarn *)"
    ]
  }
}
```

---

## 10. Exemplo Completo: Plugin GreenForge Mínimo

A estrutura completa está na pasta `exemplo_plugin_minimo/` deste relatório.

### Funcionalidades Implementadas

1. ✅ Slash command `/greenforge-plan` que gera `GREENFORGE_PLAN.md`
2. ✅ Hook `PostToolUse` que loga edições de arquivos
3. ✅ Subagente `@greenforge-reviewer` com `allowed-tools: Read, Grep`
4. ✅ Servidor MCP fictício declarado em `.mcp.json`

---

## Lacunas de Informação

Apesar da investigação exaustiva, algumas lacunas permanecem:

| Lacuna | Impacto | Mitigação |
|---|---|---|
| Documentação oficial de hooks em produção | Baixo | Código-fonte é fonte confiável |
| Exemplos de plugins complexos em produção | Médio | Inferir a partir de tests e schemas |
| Performance de hooks em alta frequência | Médio | Testar em ambiente controlado |
| Integração com IDEs específicas | Baixo | Usar hooks genéricos |

---

## Fontes Consultadas

1. **Repositório OpenClaude**: `https://github.com/Gitlawb/openclaude`
2. **Código-fonte analisado**:
   - `src/utils/plugins/schemas.ts` - Schema de plugin.json
   - `src/utils/plugins/pluginLoader.ts` - Carregamento de plugins
   - `src/utils/plugins/loadPluginCommands.ts` - Carregamento de skills
   - `src/schemas/hooks.ts` - Schema de hooks
   - `src/entrypoints/sdk/coreTypes.ts` - Lista de HOOK_EVENTS
   - `docs/hook-chains.md` - Documentação de hook chains
3. **Documentação MCP**: `https://modelcontextprotocol.io/`

---

## Conclusão Final

**A migração do GreenForge para OpenClaude/Claude Code é VIÁVEL e RECOMENDADA.**

O sistema de plugins oferece todos os primitivos necessários:
- ✅ Hooks para Intention Router e Orchestrator
- ✅ Skills para comandos slash
- ✅ Agents para subagentes especializados
- ✅ Worktrees nativos para isolamento
- ✅ MCP para ferramentas customizadas
- ✅ Persistência via JSON/SQLite

**Próximos Passos Recomendados:**
1. Criar esqueleto do plugin baseado no exemplo mínimo
2. Implementar Intention Router via hook `UserPromptSubmit`
3. Migrar Worktree Manager para hooks `WorktreeCreate/Remove`
4. Reimplementar subagentes como `agents/*.md`
5. Criar servidor MCP para persistência SQLite
