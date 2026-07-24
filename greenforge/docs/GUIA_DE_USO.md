# Guia de Uso — GreenForge v1.0

> Guia prático de uso do GreenForge como extensão do Qwen CLI.
> Atualizado em 2026-07-24 (pós-Fase 23 — litellm integrado e validado).

---

## Requisitos

| Requisito | Versão Mínima |
|-----------|---------------|
| Node.js | >= 22.0.0 |
| Qwen CLI | >= 0.19.0 |
| Git | >= 2.30.0 |
| npm | >= 10.0.0 |
| litellm | (proxy, necessário para LLM real) |

---

## Instalação

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

# Vincule como extensão do Qwen (modo desenvolvimento)
qwen extensions link .
```

### 3. Configurar litellm (obrigatório para LLM real)

Suba duas instâncias litellm:

```bash
# Terminal 1 — pool grande para agentes (porta 4000)
litellm --port 4000 --config config.large.yaml

# Terminal 2 — pool rápido para classificação (porta 4001)
litellm --port 4001 --config config.small.yaml
```

Configure as variáveis de ambiente:

```bash
export GREENFORGE_LITELLM_LARGE_URL="http://localhost:4000"
export GREENFORGE_LITELLM_SMALL_URL="http://localhost:4001"
export GREENFORGE_LITELLM_LARGE_MODEL="meu-pool"
export GREENFORGE_LITELLM_SMALL_MODEL="meu-pool"
```

### 4. Validar a instalação

```bash
# Teste automatizado (sem rede)
npm test

# Teste de smoke com litellm (requer instâncias nas portas 4000/4001)
npm run llm:smoke
```

---

## Estrutura de Configuração

O GreenForge usa três arquivos de configuração:

### qwen-extension.json (Manifesto)

```json
{
  "name": "greenforge",
  "version": "1.0.0",
  "description": "GreenForge orquestração para Qwen CLI",
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

- **SessionStart**: Inicialização do repositório e validação de artefatos
- **UserPromptSubmit**: Classificação de intenção (DEVELOPMENT_TASK ou NORMAL_CHAT)
- **PreToolUse**: Gate de segurança para operações de escrita
- **PostToolUse**: Registro de checkpoints
- **SessionEnd**: Cleanup de recursos

### .qwen/skills/greenforge/SKILL.md

Declara os comandos disponíveis: `start`, `status`, `list`, `approve`, `abort`.

---

## Fluxo de Uso Típico

### Cenário 1: Criar e executar uma tarefa de desenvolvimento

```
Usuário: Preciso criar uma tela de login com JWT
Qwen: [UserPromptSubmit hook] → Classificado como DEVELOPMENT_TASK
      [QwenRouter → porta 4001, pool FAST] → <1,2s
      [start command] → Cria tarefa e worktree isolado
      [PlannerEngine → porta 4000, pool grande] → Gera plano auditável

Exibição do plano:
  - Título, prompt original
  - Perguntas de clarificação (5 perguntas)
  - Subtarefas com dependências e agentes designados
  - Critérios de aceitação
  - Riscos identificados

Usuário: /greenforge approve task-1234567890
Qwen: [approve command] → Aprova plano, inicia BUILDING
      [Orchestrator] → Coordena execução dos agentes
      [CoderAgent → porta 4000] → Implementa código
      [TesterAgent → porta 4000] → Escreve e executa testes
      [ReviewerAgent → porta 4000] → Revisa código
      [JoinGate] → Valida convergência dos artefatos
      [Verifier] → Verificação final
      [DiffLens] → Gera relatório de auditoria

Resultado: Aprovado com relatório de auditoria
```

### Cenário 2: Chat normal (não-desenvolvimento)

```
Usuário: Bom dia, como vai?
Qwen: [UserPromptSubmit hook → porta 4001] → Classificado como NORMAL_CHAT
      → Nenhuma ação do GreenForge, conversa normalmente
```

### Cenário 3: Abortar uma tarefa

```
Usuário: /greenforge abort task-1234567890
Qwen: [abort command] → Marca tarefa como FAILED
      → Orienta rollback e limpeza
```

---

## Comandos Detalhados

### `start <task-name>`

Inicia uma nova tarefa com planejamento auditável.

- Cria worktree isolado em `GF_WORKTREE_ROOT`
- Registra tarefa no SQLite
- Transiciona: PENDING → CLARIFYING → PLANNING
- Gera plano via PlannerEngine (usa litellm porta 4000 em produção)

**Exemplo:**
```
/greenforge start "Adicionar validação de CPF no formulário"
```

### `status`

Exibe o estado atual do runtime e tarefas ativas.

```
/greenforge status
```

### `list [--status active|completed|all]`

Lista tarefas conhecidas.

```
/greenforge list
/greenforge list --status=active
```

### `approve <plan-id>`

Aprova um plano gerado e inicia a execução controlada.

```
/greenforge approve task-1782614453657
```

### `abort <task-id>`

Aborta uma tarefa em andamento.

```
/greenforge abort task-1782614453657
```

---

## Segurança

### PreToolUse Gate

- **Ferramentas sensíveis**: Write, WriteFile, Edit, MultiEdit, Bash
- **Validação**: Verifica se o caminho-alvo está dentro de `allowedRoot`
- **Método**: `path.resolve` + `path.relative` (não usa validação textual)
- **Resultado**: ALLOW (dentro do worktree) ou BLOCK (fora)

### SafeResolve

Todo acesso ao filesystem passa por `SafeResolve.safeResolve` e `SafeResolve.safeResolveForWrite`:
- Prevenção contra Path Traversal
- Validação de caminhos absolutos/relativos

### No-Shell Policy

Uso de `execa` sem shell em todas as operações de processo.

---

## Múltiplos Provedores LLM

O GreenForge suporta múltiplos provedores via `LLMProviderFactory`:

| Provider | Tipo | Comportamento |
|----------|------|---------------|
| `mock` | Mock | Determinístico, zero rede |
| `qwen` | Safe Stub | Sem transport: erro. Com mockMode: delega para mock |
| `openai` | Safe Stub | Mesmo padrão |
| `claude` | Safe Stub | Mesmo padrão |
| `gemini` | Safe Stub | Mesmo padrão |
| `litellm` | **Real** | Transporte OpenAI-compatível via HTTP nas portas 4000/4001. Usa `FetchLLMTransport`. Payload validado por Zod. DROP DETECTED registrado no SQLite. |

**Configuração via variável de ambiente:**
```bash
export GF_LLM_PROVIDER=litellm   # Provedor padrão
export GREENFORGE_LITELLM_LARGE_URL=http://localhost:4000
export GREENFORGE_LITELLM_SMALL_URL=http://localhost:4001
export GREENFORGE_LITELLM_LARGE_MODEL=meu-pool
export GREENFORGE_LITELLM_SMALL_MODEL=meu-pool
```

**Fallback seguro:** Provider desconhecido cai automaticamente para `mock`. Hard block impede vazamento de rede em testes.

---

## Roteamento Assimétrico (litellm)

O GreenForge usa **duas instâncias litellm** simultâneas desde a Fase 23:

| Porta | Perfil | Quem usa | Latência esperada |
|-------|--------|----------|-------------------|
| 4001 | `small` | QwenRouter (classificação) | <1,2s (RNF-01) |
| 4000 | `large` | PlannerEngine, CoderAgent, TesterAgent, ReviewerAgent | variável |

O header HTTP `x-greenforge-profile: small|large` identifica o perfil e torna o roteamento explícito e debugável.

---

## Troubleshooting

### Extensão não carrega

```bash
qwen --debug
# Verificar logs de carregamento
```

### MCP Server não responde

```bash
# O MCP é stdio, não HTTP. Verifique com:
node dist/index.js mcp
# Deve iniciar sem erros em stderr
```

### SQLite corrompido

```bash
rm ~/.greenforge/greenforge.db
# Recria automaticamente via SessionStart hook
```

### Worktree não é criado

```bash
git --version  # Deve ser >= 2.30.0
```

### Provider LLM com erro NO_TRANSPORT

Certifique-se de configurar a API key:
```bash
export QWEN_API_KEY="sua-key"
```

### litellm não responde nas portas 4000/4001

```bash
# Teste as portas
curl http://localhost:4000/models
curl http://localhost:4001/models

# Rode o smoke test
npm run llm:smoke
```

---

## Variáveis de Ambiente

| Variável | Obrigatória | Default | Descrição |
|----------|-------------|---------|-----------|
| `QWEN_API_KEY` | Não | - | Chave API Qwen (legacy) |
| `GF_WORKTREE_ROOT` | Não | `.git/greenforge-worktrees` | Raiz dos worktrees |
| `GF_MAX_PARALLEL` | Não | `3` | Máximo de tarefas paralelas |
| `GF_DB_PATH` | Não | `~/.greenforge/greenforge.db` | Caminho do SQLite |
| `GF_LLM_PROVIDER` | Não | `mock` | Provedor LLM padrão |
| `GF_LLM_MODEL` | Não | - | Modelo LLM específico |
| `GREENFORGE_LITELLM_LARGE_URL` | Sim (prod) | `http://localhost:4000` | URL do pool grande |
| `GREENFORGE_LITELLM_SMALL_URL` | Sim (prod) | `http://localhost:4001` | URL do pool rápido |
| `GREENFORGE_LITELLM_LARGE_MODEL` | Sim (prod) | `greenforge-large` | Modelo do pool grande |
| `GREENFORGE_LITELLM_SMALL_MODEL` | Sim (prod) | `greenforge-small-fast` | Modelo do pool rápido |
| `GREENFORGE_LITELLM_API_KEY_ENV` | Não | - | Nome da env var com a chave |
| `GREENFORGE_LITELLM_TIMEOUT_MS` | Não | `30000` | Timeout HTTP (ms) |
| `OPENAI_API_KEY` | Não | - | API key OpenAI |
| `ANTHROPIC_API_KEY` | Não | - | API key Claude |
| `GEMINI_API_KEY` | Não | - | API key Gemini |

---

*Guia atualizado como parte da Fase 24 — Prontidão de Produção e Documentação Honesta (2026-07-24).*
