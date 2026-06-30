# Guia de Uso — GreenForge v1.0

> Guia pratico de uso do GreenForge como extensao do Qwen CLI.

---

## Requisitos

| Requisito | Versao Minima |
|-----------|---------------|
| Node.js | >= 22.0.0 |
| Qwen CLI | >= 0.19.0 |
| Git | >= 2.30.0 |
| npm | >= 10.0.0 |

---

## Instalacao

### 1. Instalar o Qwen CLI

```bash
npm install -g @anthropic-ai/qwen-code
# ou
npm install -g qwen-code
```

Verifique:
```bash
qwen --version
# Deve exibir >= 0.19.0
```

### 2. Instalar o GreenForge

```bash
# Clone e compile
git clone https://github.com/seu-org/greenforge.git
cd greenforge
npm install
npm run build

# Vincule como extensao do Qwen (modo desenvolvimento)
qwen extensions link .
```

### 3. Configurar API Key

```bash
# Obrigatorio para uso com LLM real em producao
export QWEN_API_KEY="sua-api-key-aqui"

# Opcional: provedores alternativos
export OPENAI_API_KEY="sua-openai-key"
export ANTHROPIC_API_KEY="sua-claude-key"
export GEMINI_API_KEY="sua-gemini-key"
```

---

## Estrutura de Configuracao

O GreenForge usa tres arquivos de configuracao:

### qwen-extension.json (Manifesto)

```json
{
  "name": "greenforge",
  "version": "1.0.0",
  "description": "GreenForge orquestracao para Qwen CLI",
  "mcpServers": {
    "greenforge": {
      "command": "node",
      "args": ["dist/index.js", "mcp"],
      "cwd": "${extensionPath}"
    }
  },
  "skills": ".qwen/skills",
  "contextFileName": ".ai-context",
  "hooks": ".qwen/settings.json"
}
```

### .qwen/settings.json (Hooks)

Declara quais hooks o Qwen CLI deve chamar:

- **SessionStart**: Inicializacao do repositorio e validacao de artefatos
- **UserPromptSubmit**: Classificacao deintencao (DEVELOPMENT_TASK ou NORMAL_CHAT)
- **PreToolUse**: Gate de seguranca para operacoes de escrita
- **PostToolUse**: Registro de checkpoints
- **SessionEnd**: Cleanup de recursos

### .qwen/skills/greenforge/SKILL.md

Declara os comandos disponiveis: `start`, `status`, `list`, `approve`, `abort`.

---

## Fluxo de Uso Tipico

### Cenario 1: Criar e executar uma tarefa de desenvolvimento

```
Usuario: Preciso criar uma tela de login com JWT
Qwen: [UserPromptSubmit hook] → Classificado como DEVELOPMENT_TASK
      [QwenRouter] → Roteia para GreenForge
      [start command] → Cria tarefa e worktree isolado
      [PlannerEngine] → Gera plano auditavel

Exibicao do plano:
  - Titulo, prompt original
  - Perguntas de clarificacao (5 perguntas)
  - Subtarefas com dependencias e agentes designados
  - Criterios de aceitacao
  - Riscos identificados

Usuario: /greenforge approve task-1234567890
Qwen: [approve command] → Aprova plano, inicia BUILDING
      [Orchestrator] → Coordena execucao dos agentes
      [CoderAgent] → Implementa codigo
      [TesterAgent] → Escreve e executa testes
      [ReviewerAgent] → Revisa codigo
      [JoinGate] → Valida convergencia dos artefatos
      [Verifier] → Verificacao final
      [DiffLens] → Gera relatorio de auditoria

Resultado: Aprovado com relatorio de auditoria
```

### Cenario 2: Chat normal (nao-desenvolvimento)

```
Usuario: Bom dia, como vai?
Qwen: [UserPromptSubmit hook] → Classificado como NORMAL_CHAT
      → Nenhuma acao do GreenForge, conversa normalmente
```

### Cenario 3: Abortar uma tarefa

```
Usuario: /greenforge abort task-1234567890
Qwen: [abort command] → Marca tarefa como FAILED
      → Orienta rollback e limpeza
```

---

## Comandos Detalhados

### `start <task-name>`

Inicia uma nova tarefa com planejamento auditavel.

- Cria worktree isolado em `GF_WORKTREE_ROOT`
- Registra tarefa no SQLite
- Transiciona: PENDING → CLARIFYING → PLANNING
- Gera plano via PlannerEngine com MockLLMProvider
- Retorna: taskId, titulo, status e plano markdown

**Exemplo:**
```
/greenforge start "Adicionar validacao de CPF no formulario"
```

**Resposta:**
```json
{
  "ok": true,
  "command": "start",
  "result": "Task task-1782614453657 created and planned",
  "data": {
    "taskId": "task-1782614453657",
    "title": "Adicionar validacao de CPF no formulario",
    "status": "PLANNING"
  }
}
```

### `status`

Exibe o estado atual do runtime e tarefas ativas.

**Exemplo:**
```
/greenforge status
```

**Resposta:**
```json
{
  "ok": true,
  "command": "status",
  "result": "Runtime status",
  "data": {
    "tempDir": "/tmp/greenforge-phase18-e2e-xxx",
    "initialized": true,
    "manifestLoaded": true,
    "settingsLoaded": true
  }
}
```

### `list [--status active|completed|all]`

Lista tarefas conhecidas. Filtros disponiveis:

- `--status=active` — Tarefas em andamento
- `--status=completed` — Tarefas concluidas
- `--status=all` — Todas (padrao)

**Exemplo:**
```
/greenforge list
/greenforge list --status=active
```

### `approve <plan-id>`

Aprova um plano gerado e inicia a execucao controlada.

- Transiciona: PLANNING → BUILDING
- Gera subtareas via PlannerEngine
- Coordena execucao via Orchestrator

**Exemplo:**
```
/greenforge approve task-1782614453657
```

### `abort <task-id>`

Aborta uma tarefa em andamento.

- Transiciona para FAILED
- Orienta rollback e limpeza
- Remove worktree associado

**Exemplo:**
```
/greenforge abort task-1782614453657
```

---

## Seguranca

### PreToolUse Gate

O hook PreToolUse atua como gate de seguranca para operacoes sensiveis:

- **Ferramentas sensiveis**: Write, WriteFile, Edit, MultiEdit, Bash
- **Validacao**: Verifica se o caminho-alvo esta dentro de `allowedRoot`
- **Metodo**: `path.resolve` + `path.relative` (nao usa validacao textual)
- **Resultado**: ALLOW (dentro do worktree) ou BLOCK (fora)

### SafeResolve

Todo acesso ao filesystem passa por `SafeResolve.safeResolve` e `SafeResolve.safeResolveForWrite`:
- Prevencao contra Path Traversal
- Validacao de caminhos absolutos/relativos

### No-Shell Policy

Uso de `execa` sem shell em todas as operacoes de processo.

---

## Multiplos Provedores LLM

O GreenForge suporta multiplos provedores via `LLMProviderFactory`:

| Provider | Tipo | Comportamento |
|----------|------|---------------|
| `mock` | Mock | Deterministico, zero rede |
| `qwen` | Safe Stub | Sem transport: erro. Com mockMode: delega para mock |
| `openai` | Safe Stub | Mesmo padrao |
| `claude` | Safe Stub | Mesmo padrao |
| `gemini` | Safe Stub | Mesmo padrao |

**Configuracao via variavel de ambiente:**
```bash
export GF_LLM_PROVIDER=qwen    # Provedor padrao
export GF_LLM_MODEL=qwen2.5    # Modelo (opcional)
export QWEN_API_KEY=xxx          # API key
```

**Fallback seguro:** Provider desconhecido cai automaticamente para `mock`.

---

## Troubleshooting

### Extensao nao carrega

```bash
qwen --debug
# Verificar logs de carregamento
```

### MCP Server nao responde

```bash
curl  (MCP stdio mode - no HTTP port) /health
# Se falhar: qwen extensions restart greenforge
```

### SQLite corrompido

```bash
rm ~/.greenforge/greenforge.db
# Recria automaticamente via SessionStart hook
```

### Worktree nao e criado

```bash
git --version  # Deve ser >= 2.30.0
```

### Provider LLM com erro NO_TRANSPORT

Certifique-se de configurar a API key:
```bash
export QWEN_API_KEY="sua-key"
```

---

## Variaveis de Ambiente

| Variavel | Obrigatoria | Default | Descricao |
|----------|-------------|---------|-----------|
| `QWEN_API_KEY` | Sim (prod) | - | Chave API Qwen |
| `GF_WORKTREE_ROOT` | Nao | `.git/greenforge-worktrees` | Raiz dos worktrees |
| `GF_MAX_PARALLEL` | Nao | `3` | Maximo de tarefas paralelas |
| `GF_DB_PATH` | Nao | `~/.greenforge/greenforge.db` | Caminho do SQLite |
| `GF_MCP_PORT` | Nao | `7777` | Porta do MCP Server |
| `GF_LLM_PROVIDER` | Nao | `mock` | Provedor LLM padrao |
| `GF_LLM_MODEL` | Nao | - | Modelo LLM especifico |
| `OPENAI_API_KEY` | Nao | - | API key OpenAI |
| `ANTHROPIC_API_KEY` | Nao | - | API key Claude |
| `GEMINI_API_KEY` | Nao | - | API key Gemini |

---

*Guia gerado como parte da Fase 18 — Validacao em Campo e Empacotamento Final.*