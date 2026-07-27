> **⚠️ NOTA IMPORTANTE — 27/07/2026**
>
> **Desenvolvimento do Greenforge System interrompido.**
>
> **Motivo:** Encontramos um projeto/ecossistema já maduro (**Claude Code + Ruflo + LiteLLM**) que cumpre de forma superior e mais completa o objetivo original do Greenforge.
>
> **Objetivo original do Greenforge:**
> Criar um **modelo autônomo, multimodal e orquestrador** capaz de escrever não apenas código, mas também livros, textos, documentação e qualquer outro tipo de conteúdo solicitado pelo usuário.
>
> O objetivo era substituir a iteração humana nas tarefas de **moderador**, **revisor** e **orquestrador**, delegando completamente o planejamento, execução, verificação e consolidação de tarefas complexas para o sistema.
>
> Como o stack abaixo (Claude Code + Ruflo + LiteLLM com NVIDIA NIM) já entrega esse nível de autonomia e orquestração de forma robusta e pronta para uso, decidimos não continuar o desenvolvimento do Greenforge.

---

# Guia Definitivo — Claude Code + Ruflo + LiteLLM no Windows 11

> **Última atualização:** 26/07/2026  
> **Versões testadas:** Windows 11 Pro 24H2, PowerShell 5.1, Node.js v22.12.0, Claude Code v2.1.220, LiteLLM v1.58.0, Ruflo v3.32.8  
> **Status:** ✅ Produção — configurado e validado

---

## 📋 Sumário

1. [Arquitetura da Solução](#arquitetura)
2. [Pré-requisitos](#pre-requisitos)
3. [Instalação e Configuração — LiteLLM](#parte-1)
4. [Instalação e Configuração — Claude Code](#parte-2)
5. [Instalação e Configuração — Ruflo](#parte-3)
6. [Ordem de Inicialização Diária](#parte-4)
7. [Validação](#parte-5)
8. [Problemas Comuns e Soluções](#parte-6)
9. [Arquitetura Detalhada](#arquitetura-detalhada)
10. [Referências Rápidas](#referencias-rapidas)

---

<a name="arquitetura"></a>
## 1. 🏗️ Arquitetura da Solução

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              USUÁRIO (Windows 11)                               │
│                                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────────┐ │
│  │  Terminal 1     │    │  Terminal 2     │    │  Terminal 3 (opcional)      │ │
│  │  ┌───────────┐  │    │  ┌───────────┐  │    │  ┌───────────────────────┐  │ │
│  │  │ LiteLLM   │  │    │  │ Claude    │  │    │  │ Ruflo Daemon          │  │ │
│  │  │ Proxy     │  │    │  │ Code      │  │    │  │ (já iniciado pelo     │  │ │
│  │  │ :4000     │  │    │  │ (agente)  │  │    │  │ npx ruflo init)       │  │ │
│  │  └─────┬─────┘  │    │  └─────┬─────┘  │    │  └───────────────────────┘  │ │
│  │        │        │    │        │        │    │                              │ │
│  └────────┼────────┘    └────────┼────────┘    └──────────────────────────────┘ │
│           │                      │                                               │
│           │    ANTHROPIC_BASE_URL│                                               │
│           │    http://localhost:4000                                            │
│           │                      │                                               │
│           ▼                      │                                               │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                          LITELLM PROXY                                    │ │
│  │  ┌──────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  model_list:                                                         │ │ │
│  │  │    - meu-pool (4 chaves NVIDIA)                                      │ │ │
│  │  │    - claude-opus-5 (4 chaves)                                       │ │ │
│  │  │    - claude-opus-5[1m] (1 chave) ← CRÍTICO: sufixo [1m] obrigatório │ │ │
│  │  │    - claude-sonnet-5 (1 chave) ← necessário para o Ruflo            │ │ │
│  │  └──────────────────────────────────────────────────────────────────────┘ │ │
│  │  ┌──────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  litellm_settings:                                                    │ │ │
│  │  │    drop_params: true                                                  │ │ │
│  │  │  additional_drop_params: ["context_management", "output_config"]      │ │ │
│  │  └──────────────────────────────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────┬─────────────────────────────────────────┘ │
│                                     │                                           │
│                                     ▼                                           │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                    API NVIDIA NIM (integrate.api.nvidia.com)               │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │ │
│  │  │ Nemotron-3   │  │ DeepSeek-V4  │  │ DeepSeek-V4  │  │ Nemotron-3   │  │ │
│  │  │ Ultra-550B   │  │ Pro          │  │ Pro          │  │ Ultra-550B   │  │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  │ │
│  │                                                                             │ │
│  │  ⚠️ Rate Limit: ~32 workers simultâneos → swarms de 2-3 agentes            │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                             RUFLO (Meta-harness)                            │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────────────┐ │ │
│  │  │ 100+ Agentes│  │ 314 MCP     │  │ Memória     │  │ Swarm             │ │ │
│  │  │             │  │ Tools       │  │ Vetorial    │  │ Coordination      │ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └───────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 📌 Pontos Críticos da Arquitetura

| Componente | Função | Observação |
|------------|--------|------------|
| **LiteLLM Proxy** | Traduz chamadas Anthropic → OpenAI (NVIDIA) | `drop_params` remove parâmetros não suportados |
| **Claude Code** | Agente CLI que lê/edita código | Exige `claude-opus-5[1m]` com sufixo `[1m]` |
| **Ruflo** | Meta-harness com 314 MCP tools | Força `claude-sonnet-5` via `.claude/settings.json` |
| **API NVIDIA NIM** | Pool de 4 chaves gratuitas | Rate limit de ~32 workers simultâneos |

---

<a name="pre-requisitos"></a>
## 2. 🔧 Pré-requisitos

| Ferramenta | Versão Mínima | Comando para verificar |
|------------|---------------|------------------------|
| **Node.js** | >= 20 | `node -v` |
| **npm** | >= 9 | `npm -v` |
| **Git** | >= 2.30 | `git --version` |
| **Python** | >= 3.9 | `python --version` |
| **PowerShell** | 5.1+ | `$PSVersionTable.PSVersion` |

### 2.1 Instalar Dependências (caso não tenha)

```powershell
# Node.js: baixar do site oficial https://nodejs.org/
# Git: baixar do site oficial https://git-scm.com/

# Python: baixar do site oficial https://python.org/
# Certifique-se de marcar "Add Python to PATH" durante a instalação.
```

### 2.2 Chaves de API NVIDIA NIM

- Criar conta em https://build.nvidia.com/
- Gerar chaves de API (gratuitas) para:
  - `nvidia/nemotron-3-ultra-550b-a55b`
  - `deepseek-ai/deepseek-v4-pro`
- **Recomendação:** Crie múltiplas contas com e-mails diferentes para obter um pool de chaves (ex: 4 chaves).

---

<a name="parte-1"></a>
## 3. 🚀 Instalação e Configuração — LiteLLM

### 3.1 Instalar o LiteLLM

```powershell
pip install litellm
```

> ⚠️ Se você estiver atrás de um proxy corporativo, configure `HTTP_PROXY` e `HTTPS_PROXY` antes de instalar.

### 3.2 Criar arquivo `config.yaml` em `C:\Users\Usuario\config.yaml`

```yaml
litellm_settings:
  drop_params: true
  set_verbose: false

model_list:
  # ====================================================================
  # POOL DE BALANCEAMENTO (meu-pool) — 4 chaves NVIDIA
  # ====================================================================
  - model_name: meu-pool
    litellm_params:
      model: openai/nvidia/nemotron-3-ultra-550b-a55b
      api_base: https://integrate.api.nvidia.com/v1
      api_key: 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

  - model_name: meu-pool
    litellm_params:
      model: openai/deepseek-ai/deepseek-v4-pro
      api_base: https://integrate.api.nvidia.com/v1
      api_key: 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

  - model_name: meu-pool
    litellm_params:
      model: openai/deepseek-ai/deepseek-v4-pro
      api_base: https://integrate.api.nvidia.com/v1
      api_key: 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

  - model_name: meu-pool
    litellm_params:
      model: openai/nvidia/nemotron-3-ultra-550b-a55b
      api_base: https://integrate.api.nvidia.com/v1
      api_key: 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

  # ====================================================================
  # MAPEAMENTO PARA CLAUDE CODE — claude-opus-5 (sem sufixo)
  # ====================================================================
  - model_name: claude-opus-5
    litellm_params:
      model: openai/nvidia/nemotron-3-ultra-550b-a55b
      api_base: https://integrate.api.nvidia.com/v1
      api_key: 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
      additional_drop_params:
        - context_management
        - output_config

  - model_name: claude-opus-5
    litellm_params:
      model: openai/deepseek-ai/deepseek-v4-pro
      api_base: https://integrate.api.nvidia.com/v1
      api_key: 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
      additional_drop_params:
        - context_management
        - output_config

  - model_name: claude-opus-5
    litellm_params:
      model: openai/deepseek-ai/deepseek-v4-pro
      api_base: https://integrate.api.nvidia.com/v1
      api_key: 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
      additional_drop_params:
        - context_management
        - output_config

  - model_name: claude-opus-5
    litellm_params:
      model: openai/nvidia/nemotron-3-ultra-550b-a55b
      api_base: https://integrate.api.nvidia.com/v1
      api_key: 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
      additional_drop_params:
        - context_management
        - output_config

  # ====================================================================
  # CRITICO: CLAUDE-OPUS-5[1M] — sufixo obrigatorio!
  # ====================================================================
  # O Claude Code v2.1.220 envia requisicoes com o modelo
  # 'claude-opus-5[1m]' (com sufixo de 1M tokens). Sem este mapeamento,
  # o LiteLLM retorna erro "model may not exist".
  # ====================================================================
  - model_name: claude-opus-5[1m]
    litellm_params:
      model: openai/nvidia/nemotron-3-ultra-550b-a55b
      api_base: https://integrate.api.nvidia.com/v1
      api_key: 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
      additional_drop_params:
        - context_management
        - output_config

  # ====================================================================
  # MAPEAMENTO PARA RUFLO — claude-sonnet-5
  # ====================================================================
  # O Ruflo init cria .claude/settings.json com modelo 'claude-sonnet-5'.
  # Sem este mapeamento, o Claude Code falha ao iniciar com Ruflo ativo.
  # ====================================================================
  - model_name: claude-sonnet-5
    litellm_params:
      model: openai/nvidia/nemotron-3-ultra-550b-a55b
      api_base: https://integrate.api.nvidia.com/v1
      api_key: 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
      additional_drop_params:
        - context_management
        - output_config

router_settings:
  routing_strategy: usage-based-routing
  num_retries: 3
  allowed_fails: 2
  cooldown_time: 60
```

### 3.3 Iniciar o Proxy

```powershell
litellm --config config.yaml
```

**Saída esperada:**
```
LiteLLM: Proxy initialized with Config, Set models:
    meu-pool
    meu-pool
    meu-pool
    meu-pool
    claude-opus-5
    claude-opus-5
    claude-opus-5
    claude-opus-5
    claude-opus-5[1m]
    claude-sonnet-5
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:4000
```

> ⚠️ **Mantenha esta janela aberta.** O proxy deve estar rodando para o Claude Code funcionar.

---

<a name="parte-2"></a>
## 4. 🧠 Instalação e Configuração — Claude Code

### 4.1 Instalar o Claude Code

```powershell
npm install -g @anthropic-ai/claude-code
```

### 4.2 Verificar instalação

```powershell
claude --version
# Deve retornar: v2.1.220 ou superior
```

### 4.3 Configurar Variáveis de Ambiente (Toda nova sessão PowerShell)

```powershell
# URL do LiteLLM SEM /v1 no final
$env:ANTHROPIC_BASE_URL = "http://localhost:4000"

# Chave fictícia para pular autenticação
$env:ANTHROPIC_API_KEY = "sk-ant-local1234567890abcdefghijklmnopqrstuvwxyz"
```

> **🔴 IMPORTANTE — Por que uma chave fictícia?**
>
> O LiteLLM, como proxy self-host, **não valida** a chave `ANTHROPIC_API_KEY`. Ela serve apenas para fazer o Claude Code **pular a tela de login** e iniciar diretamente. Sem essa variável, o Claude Code exige autenticação via navegador na Anthropic, o que quebra o fluxo com o proxy local.

> **🔴 IMPORTANTE — URL sem `/v1`**:
>
> O Claude Code **já adiciona `/v1`** automaticamente ao path da requisição. Se você colocar `http://localhost:4000/v1`, o Claude Code fará `POST /v1/v1/messages`, causando erro 404.

### 4.4 Iniciar o Claude Code

```powershell
claude
```

**Na primeira execução:**
- O Claude Code exibirá uma tela de segurança. Pressione **Enter**.
- Em seguida, perguntará: *"Do you want to use this API key?"*
  - Selecione **`1. Yes`** (usar a chave fictícia).
- Finalmente, perguntará: *"Is this a project you created or one you trust?"*
  - Selecione **`1. Yes, I trust this folder`**.

**Saída esperada:**
```
╭─── Claude Code v2.1.220 ─────────────────────────────────╮
│                                                          │
│   Opus 5 (1M context) · API Usage Billing               │
│   C:\Users\Usuario                                       │
│                                                          │
╰──────────────────────────────────────────────────────────╯

❯
```

### 4.5 Teste Rápido

No prompt do Claude Code, digite:
```
oi
```

Se responder, a configuração básica está funcionando.

---

<a name="parte-3"></a>
## 5. 🛠️ Instalação e Configuração — Ruflo

### 5.1 Entrar na Pasta do Projeto

```powershell
cd C:\Users\Usuario\Desktop\xgeneric-storage\greenforge
```

> 💡 **Nota:** O Ruflo deve ser instalado **dentro da pasta do seu projeto** (ex: `greenforge`), não na raiz do usuário.

### 5.2 Inicializar o Ruflo

```powershell
npx ruflo init
```

**Durante a instalação:**
- Responda `y` para instalar as dependências.
- Quando perguntar sobre conta Cognitum, responda `No`.

**Saída esperada:**
```
✔ Installing Ruflo v3.32.8...
✔ Creating .claude/settings.json
✔ Creating .claude/agents/
✔ Creating .claude/skills/
✔ MCP server configured
✔ Daemon started (PID: 25668)

Settings: .claude/settings.json
Agents: 17
Skills: 30
Tools: 314
```

### 5.3 Registrar o MCP Server no Claude Code

```powershell
claude mcp add claude-flow -- npx ruflo mcp start
```

**Na primeira execução:** Selecione a opção **`1`** (Use this MCP server).

### 5.4 Iniciar o Daemon do Ruflo

```powershell
npx ruflo daemon start
```

> ⚠️ **Importante:** O daemon é responsável por gerenciar os swarms de agentes, memória vetorial e as 314 ferramentas MCP. Deixe-o rodando em background.

### 5.5 Verificar Instalação

```powershell
npx ruflo doctor --fix
```

**Saída esperada:**
```
✔ Node.js version: v22.12.0
✔ npm version: 10.9.0
✔ Git version: 2.45.0
✔ Claude Code installed: v2.1.220
✔ MCP server registered: claude-flow
✔ Daemon running: PID 25668
✔ Settings file: .claude/settings.json
✔ Agents directory: .claude/agents/
✔ Skills directory: .claude/skills/
✔ 314 tools available
✔ 17 agents available
✔ 30 skills available
✔ Hooks: 16/16
✔ Memory: 0% used
✔ Storage: 5MB used

✅ 14 checks passed
```

---

<a name="parte-4"></a>
## 6. 🔄 Ordem de Inicialização Diária

### 6.1 Terminal 1 — LiteLLM Proxy

```powershell
litellm --config config.yaml
```

### 6.2 Terminal 2 — Claude Code + Ruflo

```powershell
# Definir variáveis de ambiente
$env:ANTHROPIC_BASE_URL = "http://localhost:4000"
$env:ANTHROPIC_API_KEY = "sk-ant-local1234567890abcdefghijklmnopqrstuvwxyz"

# Entrar na pasta do projeto
cd C:\Users\Usuario\Desktop\xgeneric-storage\greenforge

# Iniciar o daemon do Ruflo (se não estiver rodando)
npx ruflo daemon start

# Iniciar o Claude Code
claude
```

### 6.3 Script de Inicialização Automática (Opcional)

Crie um arquivo `start.ps1` na pasta do projeto:

```powershell
# start.ps1
$env:ANTHROPIC_BASE_URL = "http://localhost:4000"
$env:ANTHROPIC_API_KEY = "sk-ant-local1234567890abcdefghijklmnopqrstuvwxyz"
npx ruflo daemon start
claude
```

Execute com:
```powershell
.\start.ps1
```

---

<a name="parte-5"></a>
## 7. ✅ Validação

### 7.1 Teste Básico — Claude Code

No prompt do Claude Code, digite:
```
Qual é o seu modelo atual?
```

**Resposta esperada:**
```
Opus 5 (1M context)
```

### 7.2 Teste de Ferramentas MCP do Ruflo

No prompt do Claude Code, digite:
```
Liste as ferramentas MCP disponíveis do claude-flow
```

**Resposta esperada:**
- Lista de ~180 ferramentas MCP (não 314, pois algumas são internas).
- A barra de status deve mostrar `RuFlo V3.32.8 ● Hooks 16/16`.

### 7.3 Verificar Barra de Status

No Claude Code, a barra inferior deve mostrar:

```
▊ RuFlo V3.32.8 ● Usuario  │  Opus 5 (1M context)  │  ⏱ 31s  │  ● 3% ctx  │  $0.18
Swarm ○ 0/15  ·  Hooks 16/16  ·  🧠 0%  ·  💾 5MB  ·  🛡 ✓
```

### 7.4 Checklist Final

- [ ] LiteLLM rodando em `localhost:4000` (Terminal 1)
- [ ] `ANTHROPIC_BASE_URL` definido sem `/v1` no final
- [ ] `ANTHROPIC_API_KEY` definido com chave fictícia
- [ ] Claude Code inicia sem erro de login
- [ ] `npx ruflo doctor --fix` passou com 14+ verificações verdes
- [ ] Ruflo daemon rodando (PID visível)
- [ ] Barra de status mostra `RuFlo V3.32.8`
- [ ] `Liste as ferramentas MCP...` retorna lista de ferramentas
- [ ] Resposta do modelo mostra `Opus 5 (1M context)`

---

<a name="parte-6"></a>
## 8. 🐛 Problemas Comuns e Soluções

### 8.1 Erro: `model may not exist` no Claude Code

```
API Error: 400 400: {'error': 'anthropic_messages: Invalid model name passed in model=claude-opus-5. Call /v1/models to view available models for your key.'}
```

**Causa:** O modelo `claude-opus-5` (ou `claude-opus-5[1m]` ou `claude-sonnet-5`) não está mapeado no `config.yaml` do LiteLLM.

**Solução:** Adicione os três modelos ao `model_list` do `config.yaml`:

```yaml
- model_name: claude-opus-5       # sem sufixo
- model_name: claude-opus-5[1m]   # com sufixo [1m]
- model_name: claude-sonnet-5     # necessário para Ruflo
```

### 8.2 Erro: `Not logged in` ou tela de login aparece

**Causa:** A variável `ANTHROPIC_API_KEY` não está definida ou foi definida incorretamente.

**Solução:**
```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-local1234567890abcdefghijklmnopqrstuvwxyz"
```

Se ainda assim aparecer a tela de login, selecione **`2. Anthropic Console account`** e cole a mesma chave fictícia.

### 8.3 Erro: `POST /v1/v1/messages 404`

**Causa:** A variável `ANTHROPIC_BASE_URL` contém `/v1` no final.

**Solução:**
```powershell
$env:ANTHROPIC_BASE_URL = "http://localhost:4000"   # SEM /v1
```

### 8.4 Erro: `Unsupported parameter(s): context_management, output_config`

**Causa:** O Claude Code envia parâmetros experimentais que a API NVIDIA não suporta.

**Solução:** Adicione no `config.yaml`:

```yaml
litellm_settings:
  drop_params: true

model_list:
  - model_name: claude-opus-5
    litellm_params:
      # ...
      additional_drop_params:
        - context_management
        - output_config
```

### 8.5 Erro: `ResourceExhausted: Worker local total request limit reached (33/32)`

**Causa:** A API gratuita da NVIDIA NIM tem limite de ~32 workers simultâneos.

**Solução:**
- Limitar o paralelismo no `router_settings` do `config.yaml`:

```yaml
router_settings:
  max_parallel_requests: 10   # 🔥 Nunca envia mais de 10 simultâneos
```

- Usar swarms menores (2-3 agentes) em vez de 5+
- Considerar upgrade do plano NVIDIA ou usar outro provedor (ex: OpenRouter)

### 8.6 Erro: `YAML ScannerError: could not find expected ':'`

**Causa:** O arquivo `config.yaml` contém separadores `------` ou indentação incorreta.

**Solução:** Remova todos os `------` e use **2 espaços** por nível de indentação.

**Verificar sintaxe:**
```powershell
python -c "import yaml; yaml.safe_load(open('config.yaml'))"
```

### 8.7 Erro: `MCP server not found`

**Causa:** O MCP server do Ruflo não está registrado ou o daemon não está rodando.

**Solução:**
```powershell
# Registrar novamente
claude mcp add claude-flow -- npx ruflo mcp start

# Verificar daemon
npx ruflo daemon status

# Reiniciar daemon se necessário
npx ruflo daemon restart
```

### 8.8 Erro: `.claude.json corrompido ou faltando`

**Causa:** O arquivo de configuração global do Claude Code foi deletado.

**Solução:** Restaurar o backup automático:

```powershell
cp .claude\backups\.claude.json.backup.* .claude.json
```

### 8.9 Erro: `MCP duplicado (ruflo e claude-flow)`

**Causa:** Registro antigo "ruflo" conflita com o novo "claude-flow".

**Solução:**
```powershell
claude mcp remove ruflo
```

### 8.10 Erro: `Claude Code trava ao iniciar com Ruflo`

**Causa:** O Ruflo criou `.claude/settings.json` dentro da pasta do projeto, forçando o modelo `claude-sonnet-5`.

**Solução:**
1. Deletar o arquivo problemático:
```powershell
Remove-Item -Force "C:\Users\Usuario\Desktop\xgeneric-storage\greenforge\.claude\settings.json"
```

2. Iniciar o Claude Code **fora da pasta greenforge** (em `C:\Users\Usuario`):
```powershell
cd C:\Users\Usuario
claude
```

---

<a name="arquitetura-detalhada"></a>
## 9. 🧩 Arquitetura Detalhada

### 9.1 Fluxo de Dados

```
[Usuário] → [Claude Code] → [LiteLLM :4000] → [API NVIDIA NIM]
                              │
                              ├─ drop_params: true
                              ├─ additional_drop_params: context_management, output_config
                              └─ usage-based-routing: escolhe a chave menos utilizada

[Claude Code] ↔ [Ruflo MCP Server] → [314 ferramentas MCP]
                              │
                              ├─ 100+ agentes
                              ├─ memória vetorial
                              ├─ swarm coordination
                              └─ 30 skills
```

### 9.2 Componentes e Portas

| Componente | Porta | Função |
|------------|-------|--------|
| LiteLLM Proxy | 4000 | Traduz Anthropic → OpenAI |
| Claude Code | (variável) | Agente de terminal |
| Ruflo MCP Server | (variável) | Servidor MCP com 314 ferramentas |
| Ruflo Daemon | (variável) | Orquestração de swarms |

### 9.3 Modelos Mapeados

| Modelo Solicitado | Modelo Real (NVIDIA) | Observação |
|-------------------|----------------------|------------|
| `meu-pool` | Nemotron-3 ou DeepSeek-V4 | Pool de 4 chaves |
| `claude-opus-5` | Nemotron-3 (primeira chave) | Mapeamento direto |
| `claude-opus-5[1m]` | Nemotron-3 (primeira chave) | 🔥 **CRÍTICO:** sufixo `[1m]` é obrigatório |
| `claude-sonnet-5` | Nemotron-3 (primeira chave) | Necessário para Ruflo |

---

<a name="referencias-rapidas"></a>
## 10. 📚 Referências Rápidas

### 10.1 Comandos Essenciais

| Comando | Descrição |
|---------|-----------|
| `litellm --config config.yaml` | Iniciar proxy LiteLLM |
| `claude` | Iniciar Claude Code |
| `npx ruflo init` | Instalar Ruflo no projeto |
| `npx ruflo daemon start` | Iniciar daemon do Ruflo |
| `npx ruflo doctor --fix` | Verificar e corrigir instalação |
| `claude mcp add claude-flow -- npx ruflo mcp start` | Registrar MCP server |
| `claude mcp remove ruflo` | Remover MCP server antigo |

### 10.2 Variáveis de Ambiente

| Variável | Valor | Observação |
|----------|-------|------------|
| `ANTHROPIC_BASE_URL` | `http://localhost:4000` | SEM `/v1` no final |
| `ANTHROPIC_API_KEY` | `sk-ant-local1234567890abcdefghijklmnopqrstuvwxyz` | Chave fictícia para pular login |

### 10.3 Estrutura de Diretórios

```
C:\Users\Usuario\
├── .claude.json                 # Config global do Claude Code
├── .claude\
│   ├── backups\                 # Backups automáticos
│   ├── sessions\                # Sessões do Claude Code
│   └── settings.json            # Config local (criado pelo Ruflo)
├── config.yaml                  # Config do LiteLLM
└── Desktop\xgeneric-storage\
    └── greenforge\              # Projeto com Ruflo
        ├── .claude\
        │   ├── agents\          # Definições de agentes (17)
        │   ├── skills\          # Skills (30)
        │   └── settings.json    # 🔥 Gerado pelo Ruflo init
        └── node_modules\
```

### 10.4 Mensagens de Erro e Soluções Rápidas

| Mensagem | Solução |
|----------|---------|
| `model may not exist` | Adicionar `claude-opus-5[1m]` ao `config.yaml` |
| `Not logged in` | Definir `ANTHROPIC_API_KEY` |
| `404 /v1/v1/messages` | Remover `/v1` do `ANTHROPIC_BASE_URL` |
| `Unsupported parameter(s)` | Adicionar `drop_params: true` |
| `ResourceExhausted` | Reduzir `max_parallel_requests` |
| `ScannerError` | Remover `------` do `config.yaml` |
| `MCP not found` | Registrar `claude mcp add claude-flow ...` |

---

## 🎯 Resumo Executivo

1. **LiteLLM** atua como proxy entre Claude Code e API NVIDIA, com `drop_params` para remover parâmetros incompatíveis.
2. **Claude Code** exige **três modelos mapeados**: `claude-opus-5`, `claude-opus-5[1m]` (com sufixo) e `claude-sonnet-5` (para Ruflo).
3. **Ruflo** adiciona 314 ferramentas MCP, 100+ agentes e swarm coordination — mas força o modelo `claude-sonnet-5` via `.claude/settings.json`.
4. **A ordem de inicialização** é crítica: LiteLLM → Ruflo Daemon → Claude Code (com variáveis de ambiente).
5. **Rate limit da NVIDIA** (~32 workers) limita swarms a 2-3 agentes simultâneos.
6. **Tudo funciona** com chaves gratuitas NVIDIA NIM — sem custo com Anthropic.

---

## 📝 Notas Finais

- **Backup automático:** O Claude Code mantém backups em `.claude/backups/` — útil se o `.claude.json` for corrompido.
- **Atualizações:** Para atualizar o Claude Code: `npm update -g @anthropic-ai/claude-code`
- **Suporte:** Issues do LiteLLM: https://github.com/BerriAI/litellm/issues
- **Documentação oficial:** https://code.claude.com/docs/

---

> **Pronto para usar!** 🚀 Com este guia, você tem um ambiente de desenvolvimento com Claude Code + Ruflo + LiteLLM funcionando perfeitamente no Windows 11.