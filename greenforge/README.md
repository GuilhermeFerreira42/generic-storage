# GreenForge v1.0 — Orquestrador Autônomo para Qwen CLI

Orquestrador avançado de tarefas de desenvolvimento com **isolamento via git worktrees**, **planejamento auditável**, **agentes especialistas**, **transporte real de LLM via litellm** e **validação de segurança** integrada ao Qwen CLI.

[![Tests](https://img.shields.io/badge/tests-486%2F486-brightgreen)](#)
[![Build](https://img.shields.io/badge/build-passing-brightgreen)](#)
[![Lint](https://img.shields.io/badge/lint-0%20errors-brightgreen)](#)
[![Node](https://img.shields.io/badge/node-%3E%3D22.0.0-blue)](#)

---

## Índice

- [Instalação](#instalação)
- [Configuração](#configuração)
- [Comandos](#comandos)
- [Exemplos](#exemplos)
- [Transporte Real de LLM (litellm)](#transporte-real-de-llm-litellm)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Arquitetura](#arquitetura)
- [Documentação](#documentação)
- [Desenvolvimento](#desenvolvimento)

---

## Instalação

### Pré-requisitos

- **Node.js** >= 22.0.0
- **npm** >= 10.0.0
- **Git** >= 2.30.0
- **Qwen CLI** >= 0.19.0 (instalado globalmente)
- **litellm** (proxy de transporte OpenAI-compatível, necessário para uso com LLM real)

### Passos

```bash
# 1. Clone o repositório
git clone https://github.com/seu-org/greenforge.git
cd greenforge

# 2. Instale dependências
npm install

# 3. Compile
npm run build

# 4. Instale como extensão Qwen (em desenvolvimento)
qwen extensions link .
```

---

## Configuração

A extensão utiliza três arquivos de configuração:

| Arquivo | Propósito |
|---------|-----------|
| `qwen-extension.json` | Manifesto da extensão (MCP servers, skills, hooks) |
| `.qwen/settings.json` | Configuração de hooks (SessionStart, PreToolUse, etc.) |
| `.qwen/skills/greenforge/SKILL.md` | Declaração de comandos e descrição da skill |

### Hooks configurados

- **SessionStart** — Inicializa repositório e valida artefatos
- **UserPromptSubmit** — Classifica intenção do prompt (DEV_TASK ou NORMAL_CHAT)
- **PreToolUse** — Gate de segurança para operações sensíveis (Write, Edit, Bash)
- **PostToolUse** — Registra checkpoints de execução
- **SessionEnd** — Limpa recursos e fecha conexões

### MCP Server

O GreenForge expõe um MCP server em modo stdio (não HTTP) para integração com ferramentas externas. O Qwen CLI descobre automaticamente as 10 tools `greenforge_*`.

---

## Comandos

Disponíveis via Qwen CLI com o prefixo `/greenforge`:

| Comando | Descrição |
|---------|-----------|
| `start <task-name>` | Inicia nova tarefa com planejamento auditável e worktree isolado |
| `status` | Mostra estado das tarefas ativas e checkpoints |
| `list [--status active|completed|all]` | Lista tarefas conhecidas |
| `approve <plan-id>` | Aprova um plano e libera execução controlada |
| `abort <task-id>` | Aborta tarefa em andamento e orienta rollback |

---

## Exemplos

### Iniciar uma nova tarefa

```
/greenforge start "Criar tela de login com autenticação JWT"
```

O GreenForge vai:
1. Criar um worktree isolado
2. Gerar um plano estruturado com perguntas de clarificação
3. Exibir o plano para revisão
4. Aguardar aprovação

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

## Transporte Real de LLM (litellm)

A partir da Fase 23, o GreenForge utiliza o **litellm** como proxy de transporte OpenAI-compatível. O litellm atua como **cano de transporte**, não como cérebro — o GreenForge mantém o controle total da formatação e validação dos dados.

### Roteamento assimétrico (duas portas)

O sistema opera com **duas instâncias litellm** simultâneas:

| Porta | Perfil | Uso | Modelo esperado |
|-------|--------|-----|-----------------|
| **4000** | `large` | Agentes (Planner, Coder, Reviewer, Tester) — trabalho pesado | Pool grande (DeepSeek V4 Pro, Nemotron, etc.) |
| **4001** | `small` | QwenRouter — classificação de intenção (<1,2s, RNF-01) | Pool pequeno/FAST |

### Como configurar

Suba duas instâncias litellm nas portas corretas e defina as variáveis de ambiente:

```bash
# URLs das instâncias litellm (default: localhost)
export GREENFORGE_LITELLM_LARGE_URL="http://localhost:4000"
export GREENFORGE_LITELLM_SMALL_URL="http://localhost:4001"

# Nomes dos modelos/pools em cada instância
export GREENFORGE_LITELLM_LARGE_MODEL="meu-pool"
export GREENFORGE_LITELLM_SMALL_MODEL="meu-pool"

# Opcional: timeout e chave API
export GREENFORGE_LITELLM_TIMEOUT_MS="30000"
export GREENFORGE_LITELLM_API_KEY_ENV="LITELLM_API_KEY"
export LITELLM_API_KEY="sua-chave"
```

### Teste de smoke

Para validar a integração com as duas portas:

```bash
npm run llm:smoke
```

### Retry e fallback

A lógica de retry (HTTP 429/500) e fallback entre modelos **fica a cargo do litellm**. O GreenForge não implementa retry próprio — ele confia no proxy para gerenciar resiliência de rede.

### Isolamento de testes

Os 486 testes automatizados **nunca** tocam a rede real. A `LLMProviderFactory` possui um hard block: se `NODE_ENV === 'test'` e um provider real com transporte real for detectado, o sistema lança `LLMProviderError('TEST_HARD_BLOCK')` antes de qualquer chamada HTTP.

---

## Variáveis de Ambiente

| Variável | Obrigatória | Default | Descrição |
|----------|-------------|---------|-----------|
| `QWEN_API_KEY` | Não | - | Chave de API do Qwen (legacy) |
| `GF_WORKTREE_ROOT` | Não | `.git/greenforge-worktrees` | Raiz dos worktrees |
| `GF_MAX_PARALLEL` | Não | `3` | Máximo de tarefas simultâneas |
| `GF_DB_PATH` | Não | `~/.greenforge/greenforge.db` | Caminho do SQLite |
| `GF_LLM_PROVIDER` | Não | `mock` | Provedor LLM padrão |
| `GF_LLM_MODEL` | Não | - | Modelo LLM específico |
| `GREENFORGE_LITELLM_LARGE_URL` | Sim (prod) | `http://localhost:4000` | URL do pool grande |
| `GREENFORGE_LITELLM_SMALL_URL` | Sim (prod) | `http://localhost:4001` | URL do pool rápido |
| `GREENFORGE_LITELLM_LARGE_MODEL` | Sim (prod) | `greenforge-large` | Modelo do pool grande |
| `GREENFORGE_LITELLM_SMALL_MODEL` | Sim (prod) | `greenforge-small-fast` | Modelo do pool rápido |
| `GREENFORGE_LITELLM_API_KEY_ENV` | Não | - | Nome da env var com a chave |
| `GREENFORGE_LITELLM_TIMEOUT_MS` | Não | `30000` | Timeout HTTP (ms) |
| `OPENAI_API_KEY` | Não | - | Chave para provedor OpenAI |
| `ANTHROPIC_API_KEY` | Não | - | Chave para provedor Claude |
| `GEMINI_API_KEY` | Não | - | Chave para provedor Gemini |

---

## Arquitetura

```
src/
  core/           # Domínio puro (Orchestrator, PlannerEngine, JoinGate, DiffLens, Verifier)
    agents/       # Agentes especialistas (Coder, Tester, Reviewer, Refactorer)
    ports/        # Interfaces (LLMProvider, McpClientPort)
    types/        # Contratos Zod
  infrastructure/ # Adaptadores (SQLite, Git, LLM Providers, MCP)
    db/           # SQLiteRepository
    git/          # WorktreeManager
    llm/          # LLMProviderFactory, Registry, Providers (Qwen, OpenAI, Claude, Gemini, LiteLLM)
                  #   FetchLLMTransport — transporte HTTP real via fetch
    mcp/          # MockMcpClient
  integration/    # Integração Qwen CLI
    qwen/         # Entrypoint, Runtime, HookHandler, CommandHandler, SettingsDispatcher
  shared/         # Utilidades (SafeResolve, AtomicWrite, Errors)
```

**Arquitetura Hexagonal** com desacoplamento total via portas e adaptadores. O núcleo fala apenas com `LLMProvider.generate(prompt): Promise<string>` — não conhece litellm, HTTP, portas ou credenciais.

**Motor de Orquestração** com máquina de estados blindada de 10 estados.

**Múltiplos LLMs**: Suporte a Qwen, OpenAI, Claude, Gemini e litellm via factory configurável com fallback seguro.

**Roteamento assimétrico**: O `QwenRouter` usa pool pequeno na porta 4001 para classificação em <1,2s. Os agentes usam pool grande na porta 4000. Perfis explícitos via header HTTP `x-greenforge-profile: small|large`.

---

## Documentação

Documentação completa em `docs/` e `documentacao/`:

| Documento | Conteúdo |
|-----------|----------|
| [CURRENT_STATE.md](docs/CURRENT_STATE.md) | Estado atual do projeto |
| [BACKLOG_FUTURO.md](docs/BACKLOG_FUTURO.md) | Roadmap e fases futuras |
| [DECISION_LOG.md](docs/DECISION_LOG.md) | Registro de decisões técnicas |
| [GUIA_DE_USO.md](docs/GUIA_DE_USO.md) | Guia de uso detalhado |
| [GREENFORGE_DESIGN.md](documentacao/GREENFORGE_DESIGN.md) | Documento de design |
| [phase_23_blueprint.md](docs/phase_23_blueprint.md) | Blueprint da Fase 23 (litellm) |

---

## Desenvolvimento

```bash
# Rodar testes
npm test                 # 486 testes

# Compilar
npm run build

# Lint
npm run lint

# Smoke test com litellm (requer instâncias nas portas 4000/4001)
npm run llm:smoke

# Executar E2E real (Fase 18)
npx tsx scripts/phase18-e2e-real.ts
```

### Estrutura de Testes

- **Testes unitários**: `tests/*.test.ts`
- **23 suítes de teste**, 486 testes ativos
- **Zero dependências reais**: sem LLM real, Qwen real, rede, merge ou push nos testes
- **Providers mock**: `MockLLMProvider` determinístico para testes isolados
- **Hard block**: `LLMProviderFactory` bloqueia provider real + transporte real em `NODE_ENV === 'test'`

---

## Status do Projeto

- **Versão:** 1.0.0
- **Fase atual:** 24 — Prontidão de Produção e Documentação Honesta
- **Fases concluídas:** 0-23
- **Testes:** 486/486 passando
- **Build:** Limpo
- **Lint:** 0 erros, 0 warnings
- **Validação real (Fase 23):** Smoke test aprovado com litellm nas portas 4000/4001

---

## Licença

ISC
