# RASPAGEM 6 — README.md e Instruções de Instalação
# Fonte: pasta doc_referencia/
# Data: 2026-06-11
# ============================================================================

## 1. CONTEÚDO COMPLETO DO README.md ORIGINAL

```markdown
# GreenForge

Sistema de gerenciamento de tarefas com worktrees git isolados para o Gemini CLI.

## Visão Geral

O GreenForge transforma o Gemini CLI em uma plataforma de desenvolvimento assistido por IA, 
com isolamento completo de mudanças via git worktrees, state machine de 10 estados para 
orquestração previsível, e subagentes especializados para exploração, revisão e verificação 
de código.

## Requisitos

- **Gemini CLI**: v2.0+
- **Node.js**: v20+
- **Git**: >= 2.30.0
- **npm** ou **yarn**

## Instalação

### Passo 1: Instalar Gemini CLI

```bash
npm install -g gemini-cli
```

### Passo 2: Configurar API Key

```bash
export GEMINI_API_KEY="sua-api-key-aqui"
```

Ou adicione ao seu `.bashrc` / `.zshrc`:
```bash
echo 'export GEMINI_API_KEY="sua-api-key-aqui"' >> ~/.bashrc
source ~/.bashrc
```

### Passo 3: Instalar Extensão GreenForge

```bash
cd /path/to/gemini/extensions
git clone https://github.com/seu-org/greenforge.git
cd greenforge
npm install
npm run build
```

### Passo 4: Ativar Extensão

Adicione ao seu `~/.gemini/settings.json`:
```json
{
  "extensions": {
    "enabled": ["greenforge"]
  }
}
```

### Passo 5: Verificar Instalação

```bash
gemini --version
gemini extensions list
```

Você deve ver "greenforge" na lista de extensões ativas.

## Uso Básico

### Iniciar Nova Tarefa

```bash
gemini
/greenforge-start "Refatorar módulo de autenticação"
```

Isso cria um worktree git isolado e inicializa a state machine.

### Listar Tarefas Ativas

```bash
/greenforge-status
```

### Aprovar Plano Gerado

Após o Planner gerar um plano:
```bash
/greenforge-approve <plan-id>
```

### Abortar Tarefa

```bash
/greenforge-abort <task-id>
```

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `GEMINI_API_KEY` | ✅ | Chave de API do Gemini |
| `GF_WORKTREE_ROOT` | ❌ | Raiz dos worktrees (default: `.git/greenforge-worktrees`) |
| `GF_MAX_PARALLEL` | ❌ | Máximo de tarefas simultâneas (default: 3) |
| `GF_DB_PATH` | ❌ | Caminho do SQLite (default: `~/.greenforge/greenforge.db`) |

## Comandos Disponíveis

| Comando | Descrição | Argumentos |
|---------|-----------|------------|
| `/greenforge-start` | Inicia nova tarefa | `<task-name>` |
| `/greenforge-status` | Mostra status das tarefas | Nenhum |
| `/greenforge-list` | Lista todas as tarefas | `[--status active\|completed\|all]` |
| `/greenforge-approve` | Aprova plano | `<plan-id>` |
| `/greenforge-abort` | Aborta tarefa | `<task-id>` |

## Arquitetura

O GreenForge consiste em:

1. **Camada de Integração**: Hooks e ferramentas registradas na Extension API do Gemini CLI
2. **Core**: StateMachine, WorktreeManager, DiffLens, GateManager
3. **Subagentes**: Explorer, CodeReviewer, Verifier, Planner
4. **Persistência**: SQLite com WAL mode

Veja `doc/01-vision-and-architecture.md` para detalhes.

## Desenvolvimento

### Build

```bash
npm run build
```

### Testes

```bash
npm test           # Unit tests
npm run test:e2e   # End-to-end tests
npm run coverage   # Coverage report
```

### Lint

```bash
npm run lint
npm run format
```

## Troubleshooting

### Problema: Worktree não é criado

**Solução**: Verifique versão do Git:
```bash
git --version  # Deve ser >= 2.30.0
```

### Problema: Extensão não carrega

**Solução**: Verifique logs do Gemini CLI:
```bash
tail -f ~/.gemini/gemini.log
```

### Problema: SQLite corrompido

**Solução**: Delete e recrie database:
```bash
rm ~/.greenforge/greenforge.db
gemini  # Recria automaticamente
```

## Contribuição

Veja `CONTRIBUTING.md` para diretrizes de contribuição.

## Licença

MIT License - veja `LICENSE` para detalhes.

## Links Relacionados

- [Documentação Completa](doc/)
- [Changelog](CHANGELOG.md)
- [Issues](https://github.com/seu-org/greenforge/issues)
```

---

## 2. SEÇÕES DE INSTALAÇÃO EM OUTROS ARQUIVOS

### GREENFORGE_DESIGN.md — Seção de Setup de Desenvolvimento

```markdown
## Setup de Desenvolvimento

### Pré-requisitos Técnicos

1. Node.js v20+ (recomendamos nvm para gerenciar versões)
2. npm ou yarn
3. Git >= 2.30.0
4. SQLite 3.x (verificado via better-sqlite3)

### Clone e Install

```bash
git clone https://github.com/seu-org/greenforge.git
cd greenforge
npm install
```

### Build e Link Local

```bash
npm run build
npm link
```

### Configurar Gemini CLI para Desenvolvimento

No diretório do Gemini CLI:
```bash
cd /path/to/gemini-cli
npm link greenforge
```

### Rodar Tests

```bash
npm test                    # Todos os testes
npm test -- --watch         # Watch mode
npm test src/core/          # Testar apenas core
npm test tests/integration/ # Testes de integração
```

### Debugging

Use VS Code com launch.json:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug GreenForge",
  "program": "${workspaceFolder}/dist/index.js",
  "env": {
    "GEMINI_API_KEY": "test-key"
  }
}
```
```

### 000_ler_primeiro_CONTEXT_TRANSFER.md — Onboarding

```markdown
## Onboarding de Novos Desenvolvedores

### Dia 1: Setup

1. Clone o repositório
2. `npm install`
3. `npm run build`
4. Configure `GEMINI_API_KEY` no `.env.local`
5. Rode `npm test` para verificar setup

### Dia 2-3: Leitura

Leia nesta ordem:
1. `01-vision-and-architecture.md` (visão geral)
2. `02-functional-requirements.md` (requisitos)
3. `GREENFORGE_DESIGN.md` Seção 3 (integração)
4. `NEXUS_GREENFORGE.md` (orquestração)

### Dia 4-5: Primeira Contribuição

1. Escolha issue marcada como "good first issue"
2. Crie branch feature
3. Implemente mudança
4. Rode testes
5. Submeta PR

### Recursos Adicionais

- [API do Gemini CLI](https://github.com/google/gemini-cli/blob/main/docs/extension-api.md)
- [Git Worktree Documentation](https://git-scm.com/docs/git-worktree)
- [SQLite WAL Mode](https://sqlite.org/wal.html)
```

---

## 3. VARIÁVEIS DE AMBIENTE E CONFIGURAÇÕES

### Variáveis Obrigatórias

| Variável | Valor Exemplo | Onde Configurar |
|----------|---------------|-----------------|
| `GEMINI_API_KEY` | `AIzaSy...` | `.bashrc`, `.zshrc`, ou `.env` |

### Variáveis Opcionais

| Variável | Default | Descrição |
|----------|---------|-----------|
| `GF_WORKTREE_ROOT` | `.git/greenforge-worktrees` | Diretório raiz para worktrees |
| `GF_MAX_PARALLEL` | `3` | Limite de tarefas concorrentes |
| `GF_DB_PATH` | `~/.greenforge/greenforge.db` | Localização do banco SQLite |
| `GF_LOG_LEVEL` | `info` | Nível de log (debug, info, warn, error) |
| `GF_TELEMETRY_ENABLED` | `false` | Habilita telemetria de uso |

### Configurações do Gemini CLI (settings.json)

```json
{
  "extensions": {
    "enabled": ["greenforge"],
    "disabled": []
  },
  "greenforge": {
    "worktreeRoot": "~/.greenforge/worktrees",
    "maxParallel": 5,
    "autoApproveReadonly": true,
    "requireApprovalFor": ["write_file", "run_shell_command"]
  }
}
```

---

## 4. [PROATIVO] GUIA DE REPLICAÇÃO PARA QWEN CLI

### Passos para Migrar Instalação

#### Passo 1: Instalar Qwen CLI
```bash
npm install -g @qwen-code/cli
```

#### Passo 2: Configurar API Key (Qwen)
```bash
export QWEN_API_KEY="sua-api-key-aqui"
# Ou para OpenAI-compatible:
export OPENAI_API_KEY="sua-api-key-aqui"
export OPENAI_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"
```

#### Passo 3: Estrutura do Plugin GreenForge para Qwen
```
greenforge-qwen/
├── package.json              ← Nome: @greenforge/qwen-plugin
├── qwen-extension.json       ← Manifesto do plugin Qwen
├── skills/
│   └── greenforge/
│       ├── SKILL.md          ← Definição da skill
│       └── tools/            ← Ferramentas estáticas
├── .qwen/
│   └── hooks.json            ← Hooks de interceptação
├── src/
│   ├── plugin/               ← Camada de adaptação Qwen
│   └── core/                 ← Core inalterado
└── mcp-server/               ← MCP Server embedded
```

#### Passo 4: Skill Manifest (SKILL.md)
```yaml
---
name: greenforge
description: Sistema de gerenciamento de tarefas com worktrees git isolados
argument-hint: '<command> [args]'
allowedTools:
  - run_shell_command
  - read_file
  - write_file
  - glob
  - grep_search
---

# GreenForge Skill

Use esta skill para gerenciar tarefas de desenvolvimento com isolamento via git worktrees.

## Comandos

- `start <task-name>`: Inicia nova tarefa
- `status`: Mostra status das tarefas ativas
- `list`: Lista todas as tarefas
- `approve <plan-id>`: Aprova plano
- `abort <task-id>`: Aborta tarefa
```

#### Passo 5: Hooks (.qwen/hooks.json)
```json
{
  "PreToolUse": [
    {
      "type": "command",
      "command": "greenforge-hook validate-tool",
      "timeout": 5000
    }
  ],
  "SessionStart": [
    {
      "type": "http",
      "url": "http://localhost:7777/session-start",
      "timeout": 3000
    }
  ]
}
```

#### Passo 6: Variáveis de Ambiente para Qwen
```bash
export QWEN_API_KEY="..."
export GF_WORKTREE_ROOT=".git/greenforge-worktrees"
export GF_MAX_PARALLEL="3"
export GF_DB_PATH="~/.greenforge/greenforge.db"
export GF_MCP_PORT="7777"  # [NOVO] Porta do MCP Server
```

---

## 5. STACK TECNOLÓGICA COMPLETA

### Runtime
- **Node.js**: v22+ (Qwen requer v22, Gemini aceitava v20)
- **TypeScript**: 5.x
- **Package Manager**: npm ou pnpm

### Dependências Principais
- `better-sqlite3`: ^9.x (SQLite nativo)
- `@qwen-code/sdk`: ^0.4+ (SDK do Qwen CLI)
- `@modelcontextprotocol/sdk`: ^1.x (MCP Server)
- `vitest`: ^1.x (Testes)
- `esbuild`: ^0.20.x (Build)

### Ferramentas de Desenvolvimento
- **Editor**: VS Code recomendado
- **Linter**: ESLint + Prettier
- **Test Runner**: Vitest
- **Coverage**: c8 ou istanbul
- **Git Hook**: Husky + lint-staged

