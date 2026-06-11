# GreenForge v1.0 — Guia de Arquitetura e Implementação

Seja bem-vindo ao repositório de design do **GreenForge**, a próxima geração de orquestração para o Qwen CLI.

## Visão Geral

O GreenForge transforma o Qwen CLI em uma plataforma de desenvolvimento assistido por IA,
com isolamento completo de mudanças via git worktrees, state machine de 10 estados para
orquestração previsível, e subagentes especializados para exploração, revisão e verificação
de código.

## 🗂️ Mapa de Documentação

| Arquivo | Título | Descrição |
|---|---|---|
| [00-MAESTRO.md](./GREENFORGE_MAESTRO.md) | Maestro | Contexto global e regras do projeto. |
| [01-vision.md](./01-vision-and-architecture.md) | Visão e Arquitetura | O "Porquê" e o "Como" de alto nível. |
| [02-requirements.md](./02-functional-requirements.md) | Requisitos | O que o sistema deve fazer (RF/RNF). |
| [03-technical.md](./03-technical-spec-and-data.md) | Especificação Técnica | Schemas SQLite, Interfaces e Algoritmos. |
| [04-ops.md](./04-operational-playbooks.md) | Playbooks Operacionais | Runbooks, Incidentes e Troubleshooting. |
| [05-governance.md](./05-governance-and-security.md) | Governança e Segurança | Modelo de Ameaças, Gates e Sandbox. |
| [06-extensibility.md](./06-api-and-extensibility.md) | Extensibilidade | Contratos de Subagentes e MCP. |
| [09-hardening.md](./09-hardening-deterministic-contracts.md) | Contratos de Hardening | Segurança, Atomicidade e Resiliência. |
| [CHANGELOG_HARDENING.md](./CHANGELOG_HARDENING.md) | Hardening Log | Histórico de vulnerabilidades mitigadas. |
| [INTEGRACAO_STATUS.md](./INTEGRACAO_STATUS.md) | Status de Integração | Mapa de completude da documentação. |

## Requisitos

- **Qwen CLI**: v0.4+
- **Node.js**: v22+
- **Git**: >= 2.30.0
- **npm** ou **pnpm**

## Instalação

### Passo 1: Instalar Qwen CLI
```bash
npm install -g @qwen-code/cli
```

### Passo 2: Configurar API Key
```bash
export QWEN_API_KEY="sua-api-key-aqui"
```

### Passo 3: Instalar Extensão GreenForge
```bash
qwen extensions install https://github.com/seu-org/greenforge
```

### Passo 4: Verificar Instalação
```bash
qwen extensions list
# Deve exibir "greenforge" na lista
```

## Uso Básico

### Iniciar Nova Tarefa
`qwen`  
`/greenforge start "Refatorar módulo de autenticação"`

### Listar Tarefas Ativas
`/greenforge status`

### Aprovar Plano Gerado
`/greenforge approve <plan-id>`

### Abortar Tarefa
`/greenforge abort <task-id>`

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| QWEN_API_KEY | ✅ | Chave de API do Qwen |
| GF_WORKTREE_ROOT | ❌ | Raiz dos worktrees (default: .git/greenforge-worktrees) |
| GF_MAX_PARALLEL | ❌ | Máximo de tarefas simultâneas (default: 3) |
| GF_DB_PATH | ❌ | Caminho do SQLite (default: ~/.greenforge/greenforge.db) |
| GF_MCP_PORT | ❌ | Porta do MCP Server (default: 7777) |

## Troubleshooting

### Problema: Extensão não carrega
`qwen --debug`  
# Verificar logs de carregamento da extensão

### Problema: MCP Server não responde
`curl http://localhost:7777/health`  
# Se falhar, reiniciar: qwen extensions restart greenforge

### Problema: SQLite corrompido
`rm ~/.greenforge/greenforge.db`  
`qwen` # Recria automaticamente via SessionStart hook

### Problema: Worktree não é criado
`git --version` # Deve ser >= 2.30.0

---
*Documentação gerada seguindo o padrão Verdant AI & Kit Maestro v1.0.*
