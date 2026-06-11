# GreenForge — Relatório de Análise e Plano de Migração
## Gemini CLI Extension → Qwen CLI Plugin

**Versão:** 1.0 (Parcial — aguardando raspagem de código)
**Data:** 2026-06-11
**Autor da análise:** Claude (Anthropic)
**Status:** ⚠️ INCOMPLETO — Seções marcadas com `[PENDENTE]` dependem de raspagem do código-fonte

---

## ⚠️ AVISO IMPORTANTE SOBRE ESTE RELATÓRIO

Este relatório foi elaborado **exclusivamente a partir do documento `doc_referencia.md`** (o brief de migração), sem acesso direto aos 15 arquivos `.md` da pasta `doc-old`. Isso significa que:

1. A tabela de mapeamento está **estruturada mas não preenchida** com os detalhes reais de cada documento.
2. As seções técnicas de integração com o Qwen CLI foram construídas com base no conhecimento geral da ferramenta, pois o Qwen CLI não era parte do meu treinamento de forma extensa.
3. **Ao final deste relatório** há um bloco de comandos de raspagem que você deve dar para a IA que tem acesso ao código.

---

## 1. RESUMO EXECUTIVO

### Escopo da mudança

A migração do GreenForge de uma extensão do Gemini CLI para um plugin do Qwen CLI é, na prática, uma **reescrita da camada de integração**, mantendo intactos o núcleo de lógica (worktrees, state machine de 10 estados, subagentes, DiffLens, etc.). A analogia exata seria trocar o "adaptador de tomada" sem mexer no aparelho.

### Maiores mudanças identificadas (com base no brief)

| Área | Impacto | Justificativa |
|---|---|---|
| Hooks de ciclo de vida (`activate`/`deactivate`, `onMessage`, `onToolCall`, `onStateChange`) | **CRÍTICO** | São o ponto de entrada de toda a orquestração; precisam ser mapeados para o equivalente Qwen CLI |
| Registro de ferramentas (`registerTool`) | **CRÍTICO** | A API de plugins do Qwen CLI tem mecanismo próprio de exposição de ferramentas |
| Comandos slash do usuário | **ALTO** | Toda a UX de ativação do GreenForge depende disso |
| Testes de integração | **ALTO** | O mock do Gemini CLI não serve para o Qwen CLI |
| Seção 3 do GREENFORGE_DESIGN.md (e equivalentes nos NEXUS) | **CRÍTICO** | Precisa ser completamente reescrita |
| Referências nominais (Gemini CLI, Extension API, etc.) | **COSMÉTICO** | Apenas renomear em toda a documentação |

### Esforço estimado de reescrita documental

- **Documentos que precisam de reescrita parcial (30–60%):** `01-vision-and-architecture.md`, `03-technical-spec-and-data.md`, `06-api-and-extensibility.md`, `GREENFORGE_DESIGN.md`, `NEXUS_GREENFORGE.md`, `NEXUS_GREENFORGE_DEEPENED.md`
- **Documentos que precisam de reescrita quase total (>60%):** A seção de integração do `GREENFORGE_DESIGN.md`, `INTEGRACAO_STATUS.md`
- **Documentos que precisam apenas de edições cosméticas (<30%):** `000_ler_primeiro_CONTEXT_TRANSFER.md`, `02-functional-requirements.md`, `04-operational-playbooks.md`, `05-governance-and-security.md`, `09-hardening-deterministic-contracts.md`, `CHANGELOG_HARDENING.md`, `README.md`, `GREENFORGE_MAESTRO.md`

**Estimativa total de esforço documental:** 3–5 sessões de trabalho intenso com IA.

---

## 2. TABELA DE MAPEAMENTO

> **Legenda de prioridade:** Alta = impede funcionamento / Alta fidelidade arquitetural | Média = exige redesign parcial | Baixa = cosmético ou nominal

### 2.1 Referências de alto impacto estrutural

| Documento | Seção/Contexto esperado | Referência ao Gemini CLI | Ação necessária | Prioridade |
|---|---|---|---|---|
| `GREENFORGE_DESIGN.md` | Seção 3 — Camada de Integração | Extension API completa (hooks, registro, ciclo de vida) | Reescrever completamente para API de plugins do Qwen CLI | **Alta** |
| `GREENFORGE_DESIGN.md` | Seção de hooks | `onMessage`, `onToolCall`, `onStateChange` | Mapear para equivalentes do Qwen CLI (ver seção 4 deste relatório) | **Alta** |
| `GREENFORGE_DESIGN.md` | Registro de ferramentas | `registerTool(name, schema, handler)` | Substituir pelo mecanismo de registro de ferramentas do Qwen CLI plugin API | **Alta** |
| `GREENFORGE_DESIGN.md` | Ciclo de vida da extensão | `activate(context)` / `deactivate()` | Mapear para callbacks de inicialização/desligamento do plugin Qwen CLI | **Alta** |
| `06-api-and-extensibility.md` | Toda a seção de API | Extension API do Gemini CLI | Reescrever baseado na Plugin API do Qwen CLI | **Alta** |
| `NEXUS_GREENFORGE.md` | Seção de integração técnica | Referências à Extension API | Atualizar para arquitetura de plugin | **Alta** |
| `NEXUS_GREENFORGE_DEEPENED.md` | Seção de integração técnica | Referências à Extension API | Atualizar para arquitetura de plugin | **Alta** |
| `03-technical-spec-and-data.md` | Spec de integração | Hooks e ferramentas do Gemini CLI | Reescrever seção de integração | **Alta** |
| `INTEGRACAO_STATUS.md` | Todo o documento | Status de integração com Gemini CLI | Reescrever completamente — o documento inteiro é contexto-específico | **Alta** |
| `01-vision-and-architecture.md` | Diagrama de arquitetura | Gemini CLI como host | Atualizar diagramas e narrativa para Qwen CLI como host | **Média** |

### 2.2 Referências de médio impacto (redesign parcial)

| Documento | Seção/Contexto esperado | Referência ao Gemini CLI | Ação necessária | Prioridade |
|---|---|---|---|---|
| `03-technical-spec-and-data.md` | Testes de integração | Mocks do Gemini CLI | Nova estratégia de mock para Qwen CLI (ver seção 5) | **Média** |
| `GREENFORGE_DESIGN.md` | Comandos do usuário | Comandos slash do Gemini CLI | Substituir pelos comandos slash do Qwen CLI (ver seção 6) | **Média** |
| `01-vision-and-architecture.md` | Contexto de plataforma | Gemini CLI como plataforma base | Substituir toda menção por "Qwen CLI" | **Média** |
| `README.md` | Instalação e uso | Instruções para Gemini CLI | Reescrever seção de instalação e uso para Qwen CLI | **Média** |
| `000_ler_primeiro_CONTEXT_TRANSFER.md` | Onboarding | Contexto do Gemini CLI | Atualizar referências de plataforma | **Média** |
| `GREENFORGE_MAESTRO.md` | Orquestração e plataforma | Menções ao Gemini CLI como orquestrador-pai | Atualizar para Qwen CLI | **Média** |

### 2.3 Referências cosméticas (apenas renomear)

| Documento | Referência ao Gemini CLI | Ação necessária | Prioridade |
|---|---|---|---|
| Todos os documentos | "Gemini CLI" (nome) | Substituir por "Qwen CLI" | **Baixa** |
| Todos os documentos | "Extension API" | Substituir por "Plugin API" | **Baixa** |
| Todos os documentos | Logos, nomes de produto Google | Remover ou substituir por Alibaba/Qwen | **Baixa** |
| `04-operational-playbooks.md` | Comandos de terminal Gemini CLI | Atualizar para comandos Qwen CLI | **Baixa** |
| `05-governance-and-security.md` | Referências ao modelo de segurança Gemini | Adaptar para modelo de segurança Qwen CLI | **Baixa** |
| `09-hardening-deterministic-contracts.md` | Contratos de determinismo vinculados ao Gemini CLI | Revisar se contratos ainda se aplicam no contexto Qwen | **Baixa** |
| `CHANGELOG_HARDENING.md` | Histórico de versões vinculado ao Gemini CLI | Adicionar nota de contexto; não reescrever histórico | **Baixa** |

---

## 3. ANÁLISE TÉCNICA — O QUE SABEMOS SOBRE O QWEN CLI

> ⚠️ **Esta seção contém o que é conhecido publicamente sobre o Qwen CLI.** Itens marcados com `[VERIFICAR]` precisam de confirmação via raspagem do código/docs do Qwen CLI.

### 3.1 O que é o Qwen CLI

O Qwen CLI (também referenciado como `qwen-agent` ou `qwen-terminal`) é o agente de IA de terminal da família Qwen (Alibaba Cloud). Ele opera de forma similar ao Gemini CLI: recebe comandos do usuário no terminal, executa tarefas com LLMs, e pode ser estendido.

### 3.2 Mecanismo de Plugin do Qwen CLI

**[VERIFICAR via raspagem]** — O que precisamos confirmar:

- O Qwen CLI possui uma API formal de plugins (`Plugin API`) com ciclo de vida `register/unregister`?
- Quais são os hooks de eventos disponíveis? Existe algo equivalente a `onMessage`, `onToolCall`, `onStateChange`?
- Como um plugin registra ferramentas customizadas?
- Existe suporte nativo a worktrees no Qwen CLI?
- Existe sistema de estado persistente (equivalente ao `globalState`/`workspaceState` do VS Code)?

### 3.3 Mapeamento hipotético (a confirmar)

| Conceito Gemini CLI | Hipótese Qwen CLI | Status |
|---|---|---|
| `activate(context)` | Callback de inicialização do plugin | [VERIFICAR] |
| `deactivate()` | Callback de desligamento | [VERIFICAR] |
| `onMessage(msg)` | Hook de interceptação de mensagem | [VERIFICAR] |
| `onToolCall(call)` | Hook de execução de ferramenta | [VERIFICAR] |
| `onStateChange(state)` | Hook de mudança de estado | [VERIFICAR] |
| `registerTool(name, schema, fn)` | API de registro de ferramenta customizada | [VERIFICAR] |
| Comandos slash próprios | `/greenforge-*` via sistema de comandos do Qwen CLI | [VERIFICAR] |
| Estado global da extensão | SQLite próprio do GreenForge (manter) ou estado do Qwen | [VERIFICAR] |
| Worktree support nativo | Provavelmente não nativo — manter GreenForge Worktree Manager | [VERIFICAR] |

---

## 4. NOVOS REQUISITOS QUE SURGEM COM A MIGRAÇÃO

1. **Adaptador de Plugin:** Criar uma camada `QwenPluginAdapter` que implementa a interface do GreenForge sobre a API do Qwen CLI plugin — isolando a lógica de orquestração de qualquer dependência de plataforma.

2. **Documentação da Plugin API do Qwen CLI:** Precisa ser adicionada como referência normativa em `06-api-and-extensibility.md` (equivalente ao que era a Extension API do Gemini CLI).

3. **Novo diagrama de arquitetura:** O diagrama em `01-vision-and-architecture.md` deve refletir o Qwen CLI como host, com o GreenForge plugin vivendo dentro dele.

4. **Estratégia de compatibilidade:** Dado que o Gemini CLI será descontinuado, deve ser documentada a política de suporte a versões do Qwen CLI (qual versão mínima o GreenForge exige).

5. **Instruções de instalação do plugin:** O `README.md` precisará de uma nova seção completa de instalação para o ambiente Qwen CLI.

6. **Variáveis de ambiente e configuração:** Se o Gemini CLI usava variáveis específicas (ex: `GEMINI_API_KEY`, flags de extensão), isso precisa ser mapeado para o equivalente Qwen CLI.

7. **Repositório/Registry de plugins:** O Qwen CLI tem um registry de plugins? O GreenForge precisará de um `package.json` / manifesto de plugin compatível.

8. **Modelo de segurança:** O Qwen CLI tem sandboxing de plugins? Se sim, isso afeta o acesso ao sistema de arquivos (worktrees, SQLite).

---

## 5. ITENS OBSOLETOS A REMOVER DA DOCUMENTAÇÃO

1. Todas as referências à **Google/Gemini** (Extension API, Gemini CLI docs, links para documentação do Google).
2. O documento `INTEGRACAO_STATUS.md` em sua forma atual — precisa ser zerado e reescrito do zero.
3. Qualquer referência a **ADRs** que mencionem o Gemini CLI como constraint (ex: se houver um ADR sobre porque escolher Gemini CLI como plataforma).
4. Configurações de ambiente específicas do Gemini CLI (tokens, flags, variáveis de ambiente).
5. Instruções de instalação da extensão Gemini CLI no `README.md`.
6. Seções de testes que mockam o runtime do Gemini CLI.

---

## 6. COMANDOS DE USUÁRIO A IMPLEMENTAR

Os seguintes comandos slash devem ser implementados como comandos do Qwen CLI:

| Comando | Função | Equivalente antigo (Gemini CLI) |
|---|---|---|
| `/greenforge-start` | Inicia o modo de orquestração Plan→Code→Verify | Comando de ativação do Gemini CLI |
| `/greenforge-status` | Exibe o estado atual da state machine (10 estados) | [VERIFICAR no código] |
| `/greenforge-plan` | Força entrada no modo Plan | [VERIFICAR no código] |
| `/greenforge-verify` | Aciona manualmente o ciclo de verificação | [VERIFICAR no código] |
| `/greenforge-worktree-list` | Lista os worktrees ativos | [VERIFICAR no código] |
| `/greenforge-gate` | Exibe o status dos Gates 0/1/2 | [VERIFICAR no código] |
| `/greenforge-abort` | Cancela o ciclo atual com rollback | [VERIFICAR no código] |
| `/greenforge-config` | Abre configuração do plugin | [VERIFICAR no código] |

> ⚠️ A lista acima é uma proposta baseada na arquitetura descrita no brief. Os comandos reais existentes no Gemini CLI precisam ser confirmados via raspagem dos documentos.

---

## 7. RECOMENDAÇÃO DE PERSISTÊNCIA (SQLite vs. Estado do Qwen CLI)

**Recomendação: Manter SQLite.**

Justificativa:
- O SQLite é agnóstico de plataforma — não há retrabalho ao migrar.
- Sistemas de estado de CLI (equivalentes ao `globalState` do VS Code) costumam ser voláteis ou limitados em schema; o GreenForge usa SQLite para WAL de intenções, estado da state machine, e logs de auditoria — complexidade que exige um banco real.
- Risco zero de lock-in em um sistema de estado proprietário do Qwen CLI.
- Já está implementado e testado.

**Exceção:** Se o Qwen CLI oferece um sistema de estado estruturado com transações e TTL configurável, vale avaliar para dados de sessão efêmeros (ex: estado da state machine da sessão atual). Manter SQLite para dados duráveis (WAL, histórico de gates, logs).

---

## 8. ESTRATÉGIA DE TESTES DE INTEGRAÇÃO

### Problema atual
Os testes de integração do GreenForge mockam o runtime do Gemini CLI (suas APIs, hooks, etc.). Esses mocks não servem para o Qwen CLI.

### Nova estratégia proposta

**Princípio:** Introduzir uma interface abstrata `IPluginHost` que isola o GreenForge do host CLI concreto.

```
GreenForge Core
    └── IPluginHost (interface)
         ├── GeminiCLIAdapter (legado — pode ser descartado)
         └── QwenCLIAdapter (novo)
              └── Qwen CLI Plugin API (real)
```

**Para testes:**
- Criar um `MockPluginHost` que implementa `IPluginHost` sem dependência de nenhum CLI real.
- Os testes unitários e de integração do GreenForge usam `MockPluginHost`.
- Apenas testes E2E apontam para o `QwenCLIAdapter` real.

**Benefício colateral:** Esse padrão torna o GreenForge portável para qualquer CLI futuro, evitando uma nova migração caso o Qwen CLI também seja descontinuado.

### Estrutura de arquivos de teste sugerida

```
tests/
  unit/           → sem dependência de CLI (puro TypeScript)
  integration/    → usa MockPluginHost
  e2e/            → usa QwenCLIAdapter + Qwen CLI instalado
  mocks/
    MockPluginHost.ts
    QwenCLIAdapter.mock.ts
```

---

## 9. ESTRUTURA DE PASTAS RECOMENDADA PARA O NOVO PROJETO

```
greenforge/
├── README.md
├── package.json              ← manifesto do plugin Qwen CLI
├── tsconfig.json
├── vitest.config.ts
│
├── src/
│   ├── plugin/               ← camada de integração com Qwen CLI
│   │   ├── index.ts          ← ponto de entrada do plugin
│   │   ├── QwenPluginAdapter.ts
│   │   └── commands/         ← implementação dos /greenforge-* commands
│   │       ├── start.ts
│   │       ├── status.ts
│   │       └── ...
│   │
│   ├── core/                 ← lógica de orquestração (INALTERADA da migração)
│   │   ├── StateMachine.ts
│   │   ├── WorktreeManager.ts
│   │   ├── DiffLens.ts
│   │   ├── GateManager.ts
│   │   └── agents/
│   │       ├── Explorer.ts
│   │       ├── CodeReviewer.ts
│   │       └── Verifier.ts
│   │
│   ├── persistence/          ← SQLite e WAL
│   │   ├── Database.ts
│   │   └── WALIntentLog.ts
│   │
│   └── interfaces/           ← contratos de abstração
│       ├── IPluginHost.ts    ← NOVO: abstração do host CLI
│       └── IAgent.ts
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   └── mocks/
│       └── MockPluginHost.ts
│
└── docs/                     ← documentação migrada
    ├── 000_ler_primeiro_CONTEXT_TRANSFER.md
    ├── 01-vision-and-architecture.md
    ├── 02-functional-requirements.md
    ├── 03-technical-spec-and-data.md
    ├── 04-operational-playbooks.md
    ├── 05-governance-and-security.md
    ├── 06-api-and-extensibility.md
    ├── 09-hardening-deterministic-contracts.md
    ├── GREENFORGE_DESIGN.md
    ├── GREENFORGE_MAESTRO.md
    └── NEXUS_GREENFORGE.md
```

---

## 10. PRÓXIMOS PASSOS PARA REESCREVER A DOCUMENTAÇÃO

**Ordem de execução recomendada:**

1. **[AGORA]** Executar os comandos de raspagem da seção 11 deste relatório e trazer as respostas de volta.

2. **[Após raspagem]** Atualizar este relatório com os dados reais dos documentos. Com as informações reais, a tabela de mapeamento fica completa e acionável.

3. **[Reescrita — Fase 1, Alta prioridade]**
   - Reescrever `GREENFORGE_DESIGN.md` — Seção 3 (Integração)
   - Reescrever `06-api-and-extensibility.md`
   - Atualizar `INTEGRACAO_STATUS.md` do zero

4. **[Reescrita — Fase 2, Média prioridade]**
   - Atualizar `01-vision-and-architecture.md` (diagramas + narrativa)
   - Atualizar `03-technical-spec-and-data.md` (seção de integração + testes)
   - Atualizar `NEXUS_GREENFORGE.md` e `NEXUS_GREENFORGE_DEEPENED.md`

5. **[Reescrita — Fase 3, Baixa prioridade / cosmético]**
   - Substituição em massa de "Gemini CLI" → "Qwen CLI" em todos os documentos
   - `README.md` (nova seção de instalação)
   - `000_ler_primeiro_CONTEXT_TRANSFER.md` (atualizar contexto de plataforma)
   - `GREENFORGE_MAESTRO.md`
   - `04-operational-playbooks.md`, `05-governance-and-security.md`, `09-hardening-deterministic-contracts.md`, `CHANGELOG_HARDENING.md`

6. **[Validação final]** Passar todos os documentos atualizados por um audit TDD-readiness: a documentação deve ser suficiente para uma IA implementar o plugin do zero.

---

## 11. COMANDOS DE RASPAGEM — PARA EXECUTAR COM A IA QUE TEM O CÓDIGO

> Copie cada bloco abaixo e envie para a IA que está com os arquivos da pasta `doc-old`. Traga as respostas de volta para eu fechar o escopo e gerar o relatório final completo.

---

### RASPAGEM 1 — Inventário de todos os hooks e APIs do Gemini CLI mencionados

```
Você está analisando os arquivos da pasta doc-old do projeto GreenForge.

Por favor, faça uma busca exaustiva em TODOS os arquivos .md desta pasta e liste:

1. Todas as ocorrências do termo "Gemini CLI" com o contexto de 2 linhas antes e 2 linhas depois de cada ocorrência. Formato: [arquivo:linha] contexto.

2. Todas as ocorrências dos termos: onMessage, onToolCall, onStateChange, registerTool, activate(, deactivate(, Extension API, extensionContext, gemini.extensions. Mesmo formato.

3. Todos os nomes de comandos slash mencionados (ex: /forge, /greenforge, qualquer /comando).

4. Qualquer menção a globalState, workspaceState, ou sistema de persistência de estado.

Entregue como uma lista estruturada por arquivo.
```

---

### RASPAGEM 2 — Seção 3 completa do GREENFORGE_DESIGN.md

```
Você está analisando os arquivos da pasta doc-old do projeto GreenForge.

Por favor, extraia e retorne na íntegra:

1. O conteúdo completo da Seção 3 (ou qualquer seção chamada "Integração", "Integration Layer", "Extension Integration", ou similar) do arquivo GREENFORGE_DESIGN.md.

2. O conteúdo completo de qualquer seção de integração nos arquivos NEXUS_GREENFORGE.md e NEXUS_GREENFORGE_DEEPENED.md.

3. O conteúdo completo do arquivo INTEGRACAO_STATUS.md.

Não resuma — retorne o conteúdo literal de cada seção.
```

---

### RASPAGEM 3 — Testes de integração existentes

```
Você está analisando os arquivos da pasta doc-old do projeto GreenForge.

Por favor, localize e retorne:

1. Todas as seções em qualquer arquivo .md que descrevam testes de integração com o Gemini CLI (pode estar em 03-technical-spec-and-data.md ou GREENFORGE_DESIGN.md).

2. Qualquer menção a mocks, stubs ou fixtures do Gemini CLI nos documentos.

3. A estrutura de testes atual descrita na documentação (pastas, tipos de teste, ferramentas).

Não resuma — retorne o conteúdo literal.
```

---

### RASPAGEM 4 — Diagrama de arquitetura atual

```
Você está analisando os arquivos da pasta doc-old do projeto GreenForge.

Por favor, extraia:

1. O conteúdo completo de qualquer diagrama de arquitetura (pode ser em texto, ASCII art, Mermaid, ou descrição estrutural) presente em 01-vision-and-architecture.md.

2. Qualquer seção que descreva como o GreenForge se conecta ao Gemini CLI (camada de plugin, ponto de entrada, etc.).

3. A lista completa de componentes arquiteturais mencionados em qualquer arquivo (ex: WorktreeManager, DiffLens, GateManager, StateMachine, subagentes, etc.) com suas responsabilidades descritas.

Não resuma — retorne o conteúdo literal.
```

---

### RASPAGEM 5 — Inventário de ADRs e decisões técnicas vinculadas ao Gemini CLI

```
Você está analisando os arquivos da pasta doc-old do projeto GreenForge.

Por favor, liste:

1. Todas as ADRs (Architecture Decision Records) mencionadas em qualquer arquivo, com o número da ADR, título, e decisão tomada.

2. Qualquer decisão técnica que mencione explicitamente o Gemini CLI como constraint ou motivação (ex: "escolhemos X por causa do Gemini CLI", "limitado pela Extension API").

3. Qualquer menção a versões mínimas, compatibilidade de plataforma, ou requisitos de runtime vinculados ao Gemini CLI.

Retorne em formato de lista estruturada.
```

---

### RASPAGEM 6 — README.md e instruções de instalação

```
Você está analisando os arquivos da pasta doc-old do projeto GreenForge.

Por favor, retorne na íntegra:

1. O conteúdo completo do README.md.

2. Qualquer seção de instalação, setup, ou "getting started" em qualquer outro arquivo.

3. Qualquer menção a variáveis de ambiente, tokens de API, ou configurações específicas do Gemini CLI.

Não resuma — retorne o conteúdo literal.
```

---

*Fim do relatório v1.0 — Aguardando raspagem para v2.0 completo.*
