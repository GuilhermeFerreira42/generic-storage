# GreenForge v1.0 — Orquestrador Autônomo para Qwen CLI

Orquestrador avançado de tarefas de desenvolvimento com **isolamento via git worktrees**, **planejamento auditável**, **agentes especialistas** e **validação de segurança** integrada ao Qwen CLI.

[![Tests](https://img.shields.io/badge/tests-437%2F437-brightgreen)](#)
[![Build](https://img.shields.io/badge/build-passing-brightgreen)](#)
[![Lint](https://img.shields.io/badge/lint-0%20errors-brightgreen)](#)
[![Node](https://img.shields.io/badge/node-%3E%3D22.0.0-blue)](#)

---

## Indice

- [Instalacao](#instalacao)
- [Configuracao](#configuracao)
- [Comandos](#comandos)
- [Exemplos](#exemplos)
- [Variaveis de Ambiente](#variaveis-de-ambiente)
- [Arquitetura](#arquitetura)
- [Documentacao](#documentacao)
- [Desenvolvimento](#desenvolvimento)

---

## Instalacao

### Pre-requisitos

- **Node.js** >= 22.0.0
- **npm** >= 10.0.0
- **Git** >= 2.30.0
- **Qwen CLI** >= 0.19.0 (instalado globalmente)

### Passos

```bash
# 1. Clone o repositorio
git clone https://github.com/seu-org/greenforge.git
cd greenforge

# 2. Instale dependencias
npm install

# 3. Compile
npm run build

# 4. Instale como extensao Qwen (em desenvolvimento)
qwen extensions link .
```

---

## Configuracao

A extensao utiliza tres arquivos de configuracao:

| Arquivo | Proposito |
|---------|-----------|
| `qwen-extension.json` | Manifesto da extensao (MCP servers, skills, hooks) |
| `.qwen/settings.json` | Configuracao de hooks (SessionStart, PreToolUse, etc.) |
| `.qwen/skills/greenforge/SKILL.md` | Declaracao de comandos e descricao da skill |

### Hooks configurados

- **SessionStart** — Inicializa repositorio e valida artefatos
- **UserPromptSubmit** — Classifica intencao do prompt (DEV_TASK ou NORMAL_CHAT)
- **PreToolUse** — Gate de seguranca para operacoes sensiveis (Write, Edit, Bash)
- **PostToolUse** — Registra checkpoints de execucao
- **SessionEnd** — Limpa recursos e fecha conexoes

### MCP Server

O GreenForge expoe um MCP server em `http://localhost:7777` para integracao com ferramentas externas.

---

## Comandos

Disponiveis via Qwen CLI com o prefixo `/greenforge`:

| Comando | Descricao |
|---------|-----------|
| `start <task-name>` | Inicia nova tarefa com planejamento auditavel e worktree isolado |
| `status` | Mostra estado das tarefas ativas e checkpoints |
| `list [--status active|completed|all]` | Lista tarefas conhecidas |
| `approve <plan-id>` | Aprova um plano e libera execucao controlada |
| `abort <task-id>` | Aborta tarefa em andamento e orienta rollback |

---

## Exemplos

### Iniciar uma nova tarefa

```
/greenforge start "Criar tela de login com autenticacao JWT"
```

O GreenForge vai:
1. Criar um worktree isolado
2. Gerar um plano estruturado com perguntas de clarificacao
3. Exibir o plano para revisao
4. Aguardar aprovacao

### Revisar e aprovar um plano

```
/greenforge list
/greenforge approve task-1234567890
```

### Verificar status

```
/greenforge status
```

### Abortar uma tarefa

```
/greenforge abort task-1234567890
```

---

## Variaveis de Ambiente

| Variavel | Obrigatoria | Descricao |
|----------|-------------|-----------|
| `QWEN_API_KEY` | Sim (producao) | Chave de API do Qwen |
| `GF_WORKTREE_ROOT` | Nao | Raiz dos worktrees (default: `.git/greenforge-worktrees`) |
| `GF_MAX_PARALLEL` | Nao | Maximo de tarefas simultaneas (default: 3) |
| `GF_DB_PATH` | Nao | Caminho do SQLite (default: `~/.greenforge/greenforge.db`) |
| `GF_MCP_PORT` | Nao | Porta do MCP Server (default: 7777) |
| `OPENAI_API_KEY` | Nao | Chave para provedor OpenAI |
| `ANTHROPIC_API_KEY` | Nao | Chave para provedor Claude |
| `GEMINI_API_KEY` | Nao | Chave para provedor Gemini |

---

## Arquitetura

```
src/
  core/           # Dominio puro (Orchestrator, PlannerEngine, JoinGate, DiffLens, Verifier)
    agents/       # Agentes especialistas (Coder, Tester, Reviewer, Refactorer)
    ports/        # Interfaces (LLMProvider, McpClientPort)
    types/        # Contratos Zod
  infrastructure/ # Adaptadores (SQLite, Git, LLM Providers, MCP)
    db/           # SQLiteRepository
    git/          # WorktreeManager
    llm/          # LLMProviderFactory, Registry, Providers (Qwen, OpenAI, Claude, Gemini)
    mcp/          # MockMcpClient
  integration/    # Integracao Qwen CLI
    qwen/         # Entrypoint, Runtime, HookHandler, CommandHandler, SettingsDispatcher
  shared/         # Utilidades (SafeResolve, AtomicWrite, Errors)
```

**Arquitetura Hexagonal** com desacoplamento total via portas e adaptadores.

**Motor de Orquestracao** com maquina de estados blindada de 10 estados.

**Multiplos LLMs**: Suporte a Qwen, OpenAI, Claude, Gemini via factory configurável com fallback seguro.

---

## Documentacao

Documentacao completa em `docs/` e `documentacao/`:

| Documento | Conteudo |
|-----------|----------|
| [CURRENT_STATE.md](docs/CURRENT_STATE.md) | Estado atual do projeto |
| [BACKLOG_FUTURO.md](docs/BACKLOG_FUTURO.md) | Roadmap e fases futuras |
| [DECISION_LOG.md](docs/DECISION_LOG.md) | Registro de decisoes tecnicas |
| [GUIA_DE_USO.md](docs/GUIA_DE_USO.md) | Guia de uso detalhado |
| [GREENFORGE_DESIGN.md](documentacao/GREENFORGE_DESIGN.md) | Documento de design |

---

## Desenvolvimento

```bash
# Rodar testes
npm test                 # 437 testes

# Compilar
npm run build

# Lint
npm run lint

# Executar E2E real
npx tsx scripts/phase18-e2e-real.ts
```

### Estrutura de Testes

- **Testes unitarios**: `tests/*.test.ts`
- **18 suites de teste**, 437 testes ativos
- **Zero dependencias reais**: sem LLM real, Qwen real, rede, merge ou push nos testes
- **Providers mock**: `MockLLMProvider` deterministico para testes isolados

---

## Status do Projeto

- **Versao:** 1.0.0
- **Fase atual:** 18 — Validacao em Campo e Empacotamento Final
- **Fases concluidas:** 0-17
- **Testes:** 437/437 passando
- **Build:** Limpo
- **Lint:** 0 erros, 0 warnings

---

## Licenca

ISC