# GreenForge — Relatório de Análise e Plano de Migração
## Gemini CLI Extension → Open Claude Plugin (VS Code)

> **Data:** 2026-06-10
> **Versão do relatório:** 1.0.0
> **Fonte analisada:** 15 documentos da pasta `doc-old`
> **Fonte única da verdade:** `GREENFORGE_DESIGN.md` v1.4.0

---

## SEÇÃO 1 — RESUMO EXECUTIVO

### O que muda

O GreenForge foi projetado do zero em torno de dois pilares que são específicos do Gemini CLI: a **Extension API** (contrato `GeminiExtension` com `activate/deactivate`, hooks `onMessage/onToolCall/onStateChange`, e `registerTool`) e o **modelo Google Gemini** (Flash 1.5 para roteamento, Pro 1.5 para planejamento). Esses dois pilares precisam ser completamente substituídos.

Tudo o mais — a máquina de estados, o WorktreeManager, o SQLite, o SafeResolve, os subagentes, os cenários Gherkin, o DiffLens, o protocolo de handoff, a lógica de segurança — é **agnóstico de plataforma** e sobrevive intacto à migração.

### Esforço estimado de reescrita documental

| Categoria | Documentos afetados | Esforço estimado |
|---|---|---|
| Reescrita completa de seção | GREENFORGE_DESIGN.md §3, NEXUS §3/§9, CONTEXT_TRANSFER.md | Alto (3–4 dias) |
| Atualização de referências e termos | Todos os 15 documentos | Médio (1–2 dias) |
| Novos documentos a criar | Plugin API contract, VS Code commands spec | Alto (2–3 dias) |
| Documentos obsoletos a remover/arquivar | Ver Seção 5 | Baixo (0.5 dia) |

### As 5 maiores mudanças

1. **Ponto de entrada**: `activate(context: ExtensionContext)` do Gemini CLI → `activate(context: vscode.ExtensionContext)` do VS Code API. A interface `ExtensionContext` precisa ser completamente redesenhada.
2. **Interceptação de mensagens**: O hook `onMessage` interceptava automaticamente todo input do usuário no Gemini CLI. No Open Claude (como plugin VS Code), não existe esse hook automático. A entrada do usuário precisa ser disparada explicitamente via **comandos da paleta do VS Code** ou via **slash commands** dentro da interface do Open Claude se ele suportar plugins. Isso é uma mudança arquitetural crítica.
3. **Registro de ferramentas**: `context.registerTool(name, handler)` do Gemini CLI → precisará usar a API de extensão do Open Claude (a ser investigada) ou comandos do VS Code (`vscode.commands.registerCommand`).
4. **Modelos LLM**: Toda menção a Gemini 1.5 Flash (Router) e Gemini 1.5 Pro (Planner) precisa ser substituída. O modelo usado será o Claude (via Open Claude), e as variáveis de ambiente `GEMINI_API_KEY` deixam de existir.
5. **Variáveis de ambiente e paths de configuração**: `.gemini/` como diretório de trabalho e `GEMINI_API_KEY` como variável obrigatória precisam ser substituídos. Sugestão: `.greenforge/` e `ANTHROPIC_API_KEY` (ou simplesmente usar o contexto de autenticação do próprio Open Claude/VS Code).

---

## SEÇÃO 2 — TABELA DE MAPEAMENTO EXAUSTIVA

### 2.1 GREENFORGE_DESIGN.md (Fonte única da verdade — prioridade máxima)

| Seção/Local | Referência ao Gemini CLI | Ação necessária | Prioridade |
|---|---|---|---|
| Título e descrição principal | "Extensão de orquestração avançada para Gemini CLI" | Substituir por "Plugin de orquestração avançado para Open Claude (VS Code)" | Alta |
| §1 Resumo Executivo | "Gemini CLI", "Intention Router — Gemini Flash" | Renomear CLI, substituir modelo por Claude | Alta |
| §2.1 Diagrama Mermaid | `CLI[Gemini CLI]`, `"onMessage Hook"` no edge | Redesenhar: `CLI[Open Claude]`, edge passa a ser `"GreenForge: Start Task (VS Code Command)"` | Alta |
| §2.2 Diagrama: `CLI -- "onMessage Hook" --> GF` | Hook automático onMessage | Substituir pelo trigger explícito (comando VS Code ou slash command) — ver §3 | Alta (crítico) |
| §2.4 DiffLens | Nenhuma dependência direta do Gemini CLI | Sem alteração necessária | Nenhuma |
| §3 título | "INTEGRAÇÃO COM GEMINI CLI" | Renomear: "INTEGRAÇÃO COM OPEN CLAUDE E VS CODE" | Alta |
| §3.1 `interface ExtensionContext` | `registerTool`, `onMessage`, `onToolCall`, `onStateChange`, `getWorkspace()` | **Reescrever completamente.** Ver nova proposta na Seção 3 deste relatório | Alta (crítico) |
| §3.1 `activate(context: ExtensionContext)` | Contrato GeminiExtension | Substituir por `activate(context: vscode.ExtensionContext)` | Alta (crítico) |
| §3.1 "Hooks Utilizados" | `onMessage`, `onToolCall`, `onStateChange` | Substituir pelos equivalentes do Open Claude/VS Code — ver Seção 3 | Alta (crítico) |
| §3.2 `forge_start_task`, `forge_list_tasks`, `forge_approve_plan` | Ferramentas do Gemini CLI (`registerTool`) | Converter em comandos VS Code (`GreenForge: Start Task`, etc.) — ver Seção 3 | Alta |
| §3.3 "Sistema de Regras" | `activate()` como boot da extensão | `activate()` existe no VS Code também — manter a lógica, ajustar assinatura | Média |
| §3.3 `~/.forge/FORGE_RULES.md` | Path genérico | OK — não depende do Gemini CLI | Nenhuma |
| §4.1 "Decisão de Stack (ADR-05)" | "100% compatível com o ecossistema do Gemini CLI" | Atualizar justificativa: compatível com VS Code Extension API e Node.js nativo | Média |
| §4.2 "GF-ROUTER Algoritmo" | `modelFlash.generate()` (Gemini Flash) | Substituir por chamada ao modelo Claude via Open Claude SDK ou Anthropic API | Alta |
| §5.1 Matriz de Testes — Router | "Vitest + Mock API" (API implica Gemini) | Atualizar: "Mock Anthropic API" ou "Mock Open Claude LLM" | Média |
| §5.1 "Isolator — Git CLI" | Agnóstico — funciona igual | Sem alteração | Nenhuma |
| §8.1 ADR-05 | "100% compatível com o ecossistema do Gemini CLI, sem riscos de instabilidade em runtime" | Reescrever justificativa: compatibilidade com VS Code Extension Host (Node.js) | Média |
| §9 Rastreabilidade RNF-01 | "Tempo entre `onMessage` e resposta do router < 1.2s" | Atualizar: "Tempo entre comando do usuário e resposta do router < 1.2s" | Média |
| §13 Limitações | "Dependência estrita de disponibilidade da API Google Gemini" | Substituir: "Dependência de conectividade com Anthropic API" | Baixa |
| §14 Roadmap | "v1.2 — Multi-Model: Integração com Claude e GPT via MCP" | Irônico: Claude agora é o modelo primário. Reescrever roadmap | Baixa |

### 2.2 000_ler_primeiro_CONTEXT_TRANSFER.md

| Seção/Local | Referência ao Gemini CLI | Ação necessária | Prioridade |
|---|---|---|---|
| §O QUE É ESTE PROJETO | "extensão para o Gemini CLI" | Substituir: "plugin para o Open Claude dentro do VS Code" | Alta |
| Stack Tecnológica — linha "Integração CLI" | `Gemini CLI Extension API` | Substituir: `VS Code Extension API + Open Claude Plugin API` | Alta |
| Stack Tecnológica — linha "Roteamento de intenção" | `Gemini 1.5 Flash` | Substituir: modelo Claude a ser definido (ex: `claude-haiku` para latência) | Alta |
| Stack Tecnológica — linha "Planejamento" | `Gemini 1.5 Pro` | Substituir: modelo Claude a ser definido (ex: `claude-sonnet` ou `claude-opus`) | Alta |
| §COMPONENTES — tabela de implementação | `GeminiRouter.ts`, `GeminiPlanner.ts` | Renomear: `ClaudeRouter.ts`, `ClaudePlanner.ts` | Média |
| §ESTRUTURA DE PASTAS | `.gemini/` como diretório de estado | Substituir: `.greenforge/` | Média |
| §VARIÁVEIS DE AMBIENTE | `GEMINI_API_KEY` | Substituir: `ANTHROPIC_API_KEY` (ou remover se usar auth do VS Code) | Alta |
| §VARIÁVEIS DE AMBIENTE | `GF_DB_PATH: .gemini/forge.db` | Atualizar path para `.greenforge/forge.db` | Média |
| §VARIÁVEIS DE AMBIENTE | `GF_WORKTREE_ROOT: .gemini/worktrees` | Atualizar path para `.greenforge/worktrees` | Média |
| Ordem de leitura — §1 instrução de início | "`forge start ...`" | Atualizar para comando VS Code | Alta |
| Cenário Gherkin MVP | `forge start "Crie uma função..."` | Atualizar trigger para comando VS Code/slash command | Média |

### 2.3 01-vision-and-architecture.md

| Seção/Local | Referência ao Gemini CLI | Ação necessária | Prioridade |
|---|---|---|---|
| §1.1 Objetivos | "Gemini CLI" no diagrama Mermaid | Substituir nó `CLI[Gemini CLI]` por `CLI[Open Claude]` | Alta |
| §2.1 Diagrama | `Extension[GreenForge Extension]`, `Router[Intention Router - Gemini Flash]`, `Planner[Plan Mode Engine - Gemini Pro]` | Atualizar labels: remover "Gemini Flash/Pro", usar "Claude" | Média |
| §3.1 "Intention Router" | "interceptar cada comando antes de chegar ao kernel do Gemini CLI" | Reformular: "interceptar cada solicitação do usuário via comando VS Code ou slash command" | Alta |
| §5 Guia de Replicação (Passo 5) | `cp .env.example .env` com `GEMINI_API_KEY` | Atualizar para `ANTHROPIC_API_KEY` | Alta |
| §5 Passo 9 | `forge start "..."` (comando CLI global) | Substituir por: `Ctrl+Shift+P → GreenForge: Start Task` | Alta |
| §5 Passo 10 | `ls .gemini/worktrees/` | Atualizar path para `.greenforge/worktrees/` | Média |
| ADR-05 | "100% compatível com o ecossistema do Gemini CLI" | Atualizar justificativa | Média |

### 2.4 02-functional-requirements.md

| Seção/Local | Referência ao Gemini CLI | Ação necessária | Prioridade |
|---|---|---|---|
| RF-01.1 "Critério de aceite" | "`onMessage` hook é chamado para cada entrada de texto" | **Redesenhar critério**: o trigger agora é explícito (comando VS Code), não hook automático. Novo critério: "Ao executar `GreenForge: Start Task`, o input é capturado e roteado" | Alta (crítico) |
| RF-02.3 "sinal `forge_approve`" | Sinal específico do Gemini CLI tooling | Substituir: "Transição bloqueada até execução do comando `GreenForge: Approve Plan`" | Alta |

### 2.5 03-technical-spec-and-data.md

| Seção/Local | Referência ao Gemini CLI | Ação necessária | Prioridade |
|---|---|---|---|
| §3.1 Algoritmo `route()` | `modelFlash.generate(prompt)` (Google SDK) | Substituir por chamada Anthropic SDK: `anthropic.messages.create(...)` | Alta |
| §3.2 WorktreeManager | Agnóstico — sem dependência do Gemini | Sem alteração | Nenhuma |
| §4.1 "Justificativa ADR-05" | "Estabilidade máxima com Gemini CLI" | Atualizar: "Estabilidade com VS Code Extension Host" | Média |
| Playbook INC-001 | `forge list`, `ls .gemini/worktrees/` | Atualizar comandos: VS Code command palette ou CLI própria | Média |
| Playbook INC-003 | `forge.db` em `.gemini/` | Atualizar path | Baixa |
| §Stage 4 Boot | "Extension API Registration" | Atualizar: "VS Code + Open Claude Plugin Registration" | Média |
| Graceful Shutdown §1 | "API Extensions — Parar de aceitar novos inputs" | Atualizar: "VS Code Extension — desregistrar comandos e handlers" | Média |

### 2.6 04-operational-playbooks.md

| Seção/Local | Referência ao Gemini CLI | Ação necessária | Prioridade |
|---|---|---|---|
| §1.1 Pré-flight "Environment" | "Validação de `GEMINI_API_KEY` (Flash e Pro)" | Substituir: "Validação de `ANTHROPIC_API_KEY`" | Alta |
| §2 Troubleshooting — Router lento | "Latência da API Gemini" | Atualizar: "Latência da API Anthropic" | Baixa |
| §2 Diagnóstico router | "Ver logs de `RouterLatency`" — agnóstico | Sem alteração | Nenhuma |

### 2.7 05-governance-and-security.md

| Seção/Local | Referência ao Gemini CLI | Ação necessária | Prioridade |
|---|---|---|---|
| T-04 Secret Leak | "Log de `GEMINI_API_KEY`", `GEMINI_API_KEY: redact(...)` | Substituir por `ANTHROPIC_API_KEY` em todos os snippets | Alta |
| §3 Sandbox — `SECURE_ENV` | `GEMINI_API_KEY: redact(process.env.GEMINI_API_KEY)` | Atualizar variável | Alta |

### 2.8 06-api-and-extensibility.md

| Seção/Local | Referência ao Gemini CLI | Ação necessária | Prioridade |
|---|---|---|---|
| Referência no frontmatter | "Gemini CLI Extension API" nas referências | Atualizar para "VS Code Extension API, Open Claude Plugin API" | Média |
| §3 "Comandos Steering" | `gemini forge steer --task <id> --instruction "..."` | Substituir por: `GreenForge: Steer Task` (VS Code command) com input box | Alta |

### 2.9 GREENFORGE_MAESTRO.md

| Seção/Local | Referência ao Gemini CLI | Ação necessária | Prioridade |
|---|---|---|---|
| Bloco de contexto — descrição | "Camada de orquestração para Gemini CLI" | Atualizar | Alta |
| Stack — Backend | "Node.js (v20+) + Gemini CLI Extension API" | "Node.js (v20+) + VS Code Extension API + Open Claude Plugin API" | Alta |
| Stack — Comunicação | "Extension API Hooks + MCP" | "VS Code Commands + Open Claude Plugin Hooks + MCP" | Alta |
| Stack — Outros | "Gemini 1.5 Flash (Router), Gemini 1.5 Pro (Planner)" | Substituir pelos modelos Claude equivalentes | Alta |
| Restrições | "Deve rodar como extensão do Gemini CLI" | Atualizar: "Deve rodar como plugin do Open Claude dentro do VS Code" | Alta |

### 2.10 NEXUS_GREENFORGE.md (v1.1) e NEXUS_GREENFORGE_DEEPENED.md (v1.2)

> Estes dois documentos são derivados do DESIGN e têm o mesmo conjunto de problemas. Lista consolidada:

| Seção/Local | Referência ao Gemini CLI | Ação necessária | Prioridade |
|---|---|---|---|
| §1.1 Identidade e declaração de visão | "Gemini CLI" na declaração | Substituir | Alta |
| §1.3 Público-alvo (DEEPENED) | "GF-ROUTER-01 — Dependências: `google-cloud/generative-ai`" | Substituir SDK: `@anthropic-ai/sdk` | Alta |
| §2.1 GF-ROUTER Dependências | `google-cloud/generative-ai`, `git-rev-sync` | `@anthropic-ai/sdk` | Alta |
| §3 Integração (ambos) | Seção inteira sobre Gemini CLI Extension API | **Reescrever completamente** (mesma reescrita que DESIGN §3) | Alta (crítico) |
| §9 MVP Gherkin | `forge start "Crie uma função..."` → `ls .gemini/worktrees/` | Atualizar trigger e path | Alta |
| §9 Guia de Replicação | `npm link`, `forge start`, `.gemini/worktrees/`, `GEMINI_API_KEY` | Todos estes itens devem ser atualizados | Alta |
| §14 Roadmap | "v1.2 — Integração com Claude e GPT via MCP" | Reescrever: Claude é agora o modelo primário | Baixa |
| NEXUS §9.3 Fases | Fase 2 "Intention Router + Plan Engine" — referência implícita ao Gemini Flash | Atualizar para Claude Haiku/Sonnet | Média |

### 2.11 INTEGRACAO_STATUS.md

| Seção/Local | Referência ao Gemini CLI | Ação necessária | Prioridade |
|---|---|---|---|
| Bloco 01 | "Consistência de Stack (Node.js v20+)" — OK | Sem alteração | Nenhuma |
| §3 Checklist | "Contrato `ExtensionContext` para integração com Gemini CLI assinado" | Atualizar: "Contrato de plugin para Open Claude/VS Code assinado" | Alta |
| §3 Checklist | "Guia de replicação determinístico (npm-based)" | Adicionar: "incluindo instalação como VS Code Extension" | Baixa |

### 2.12 README.md

| Seção/Local | Referência ao Gemini CLI | Ação necessária | Prioridade |
|---|---|---|---|
| Título e subtítulo | "a próxima geração de orquestração para o Gemini CLI" | Atualizar | Alta |
| §UI/UX (N/A) | "extensão CLI pura, módulos de Identidade Visual não aplicáveis" | Revisar: o plugin VS Code tem UI (TreeView, StatusBar, Webview) — pode ser aplicável | Média |
| §Próximos Passos | Referências implícitas ao Gemini CLI via links | Atualizar passos para incluir instalação do plugin no VS Code | Média |

### 2.13 CHANGELOG_HARDENING.md

Sem referências diretas ao Gemini CLI nos conteúdos técnicos de hardening. Apenas a linha de contexto de rodapé menciona "v1 legado". Nenhuma alteração crítica necessária.

---

## SEÇÃO 3 — NOVOS REQUISITOS QUE SURGEM COM A MIGRAÇÃO

### 3.1 Nova interface de integração (substitui ExtensionContext do Gemini CLI)

Este é o item mais importante da migração. A seção §3 do DESIGN precisa ser completamente reescrita. A proposta abaixo é uma base de discussão — precisará ser validada contra a documentação atual do Open Claude (repositório `open-claude` no GitHub):

```typescript
// PROPOSTA: Novo contrato de plugin Open Claude para o GreenForge
// Este contrato precisa ser validado contra a API real do Open Claude

interface GreenForgePluginContext {
  // VS Code nativo
  vscodeContext: vscode.ExtensionContext;  // globalState, workspaceState, subscriptions
  
  // Open Claude: como o plugin recebe mensagens?
  // OPÇÃO A: Se Open Claude expõe hooks de mensagem
  onUserMessage?(callback: (message: string) => Promise<void>): void;
  
  // OPÇÃO B: Se Open Claude não expõe hooks — input apenas via comandos VS Code
  // (nenhum hook automático; toda interação é iniciada pelo usuário via paleta)
  
  // Workspace info — equivalente ao getWorkspace() do Gemini CLI
  getWorkspacePath(): string;
  getGitBranch(): Promise<string>;
}
```

> **⚠️ Item de pesquisa obrigatório antes de escrever a nova documentação:** Verificar no repositório do Open Claude se existe uma API de plugin/extension que exponha hooks de mensagem, registro de ferramentas (tool/function calling), ou slash commands. Se não existir, o modelo de ativação muda para comandos VS Code puros.

### 3.2 Comandos VS Code obrigatórios

Em vez dos `registerTool` do Gemini CLI, todos os pontos de entrada do usuário devem ser registrados como comandos VS Code. Lista completa:

| Comando VS Code | Equivalente Gemini CLI | Função |
|---|---|---|
| `GreenForge: Start Task` | `forge_start_task(prompt)` / `forge start "..."` | Abre input box, coleta o prompt do usuário e inicia o roteamento |
| `GreenForge: List Tasks` | `forge_list_tasks()` | Abre TreeView ou Quick Pick com tarefas ativas |
| `GreenForge: Approve Plan` | `forge_approve_plan(hash)` / sinal `forge_approve` | Abre o GREENFORGE_PLAN.md no editor e solicita confirmação |
| `GreenForge: Abort Task` | N/A (existia como parte do router) | Cancela tarefa ativa e limpa worktree |
| `GreenForge: Steer Task` | `gemini forge steer --task <id> --instruction "..."` | Abre input box para instrução de steering em runtime |
| `GreenForge: Show Diff Report` | Automático pós-JOINING | Abre o DiffReport no webview ou output channel |
| `GreenForge: Open Worktree` | N/A | Abre o diretório do worktree ativo no explorador do VS Code |

### 3.3 Persistência: SQLite vs VS Code State API

O Open Claude/VS Code tem `globalState` (workspaceState) para persistência leve de pares chave-valor. A recomendação é:

**Manter SQLite para o estado de orquestração** (tabela `tasks`, `checkpoints`, `subtasks_graph`). Os motivos:
- O `globalState` do VS Code não suporta transações, WAL mode, ou queries complexas.
- O volume e a criticidade do estado do GreenForge (múltiplas tarefas, grafos de subtarefas, artefatos) excede o caso de uso do `globalState`.
- O SQLite já está especificado, testado e com contratos de hardening estabelecidos.

**Usar `globalState` apenas para configurações leves** (ex: última tarefa aberta, preferências de UI), não para o estado de orquestração.

**Atualização no DESIGN §4.1:** Adicionar uma subseção explicando a coexistência dos dois sistemas de persistência e seus escopos.

### 3.4 Worktrees: Open Claude tem suporte nativo?

Com base no conhecimento disponível sobre o Open Claude (fork/extensão open source para VS Code), ele não possui gerenciamento nativo de Git Worktrees. O GreenForge deve **manter seu próprio WorktreeManager** (`src/infrastructure/git/WorktreeManager.ts`) sem mudanças. Nenhuma alteração neste componente.

**Atualizar DESIGN** com uma nota explícita: "O WorktreeManager é um componente próprio do GreenForge. Não depende nem delega ao Open Claude."

### 3.5 Novos requisitos de UX para VS Code

O plugin VS Code abre possibilidades de UI que a extensão CLI não tinha:

| Componente VS Code | Uso proposto | Documento a atualizar |
|---|---|---|
| `TreeView` | Listar tarefas ativas com status em tempo real (substituí o `forge list`) | 02-functional-requirements (novo RF) |
| `StatusBar Item` | Mostrar status da tarefa atual (`BUILDING...`, `REVIEWING...`) | 02-functional-requirements (novo RF) |
| `OutputChannel` | Log estruturado do orquestrador visível no painel Output do VS Code | 04-operational-playbooks |
| `WebviewPanel` | Exibir o DiffReport com formatação HTML (substituí output de texto plano) | GREENFORGE_DESIGN §2.4 |
| `vscode.window.showInputBox` | Coletar o prompt do usuário nos comandos Start Task e Steer | GREENFORGE_DESIGN §3 |

O README.md menciona que o módulo de UI/UX (07) não era aplicável por ser "CLI pura". Com a migração para VS Code, isso muda — vale criar um documento `07-vscode-ux.md`.

### 3.6 Autenticação e modelos Claude

A documentação precisa especificar qual modelo Claude será usado para cada papel:

| Papel | Gemini CLI (atual) | Open Claude (proposto) | Critério de seleção |
|---|---|---|---|
| IntentionRouter | Gemini 1.5 Flash | `claude-haiku-4-5` (ou similar rápido) | Latência P95 < 1200ms — priorizar modelo mais rápido disponível |
| Plan Mode Engine (Planner) | Gemini 1.5 Pro | `claude-sonnet-4-6` ou `claude-opus-4-6` | Qualidade de raciocínio para geração de plano |
| @Code-Reviewer | Implícito (via Gemini) | `claude-sonnet-4-6` | Capacidade de auditar diff e aplicar regras |
| @Verifier | N/A (executa comandos) | N/A (executa comandos) | Não usa LLM diretamente |
| @Explorer | Implícito (via Gemini) | `claude-haiku-4-5` | Busca simples, latência importa |

O ADR-05 deve ser **substituído ou complementado por um ADR-08** que documente a escolha dos modelos Claude e a estratégia de autenticação (usar a autenticação do próprio Open Claude via VS Code ou `ANTHROPIC_API_KEY` no `.env`).

---

## SEÇÃO 4 — ITENS OBSOLETOS A REMOVER OU ARQUIVAR

| Item | Localização | Ação |
|---|---|---|
| Interface `ExtensionContext` com `onMessage/onToolCall/onStateChange/registerTool` | DESIGN §3.1, NEXUS v1.1 §3, NEXUS v1.2 §3 | Remover — substituir pela nova proposta da Seção 3.1 deste relatório |
| `activate(context: ExtensionContext)` e `deactivate()` com assinatura do Gemini CLI | DESIGN §3.1 | Manter os nomes `activate/deactivate` (são padrão do VS Code também), mas atualizar assinatura e corpo |
| Comentário "Contrato GeminiExtension" | DESIGN §3.1 | Remover a denominação "GeminiExtension" |
| `GEMINI_API_KEY` em todas as ocorrências | CONTEXT_TRANSFER, 04-playbooks, 05-governance, NEXUS v1.1, NEXUS v1.2, README | Substituir por `ANTHROPIC_API_KEY` |
| `GF_DB_PATH: .gemini/forge.db` e `GF_WORKTREE_ROOT: .gemini/worktrees` | CONTEXT_TRANSFER | Atualizar paths para `.greenforge/` |
| `gemini forge steer --task <id>` | 06-api-and-extensibility §3 | Remover comando CLI — substituir por VS Code command |
| `forge start "..."` e `npm link` | CONTEXT_TRANSFER §GUIA, NEXUS §11 | Remover instalação via `npm link` — substituir por instalação de extensão VS Code (`.vsix` ou marketplace) |
| `google-cloud/generative-ai` como dependência | NEXUS DEEPENED §2.1 | Substituir: `@anthropic-ai/sdk` |
| `GeminiRouter.ts` e `GeminiPlanner.ts` nos nomes de arquivo | CONTEXT_TRANSFER tabela de componentes | Renomear: `ClaudeRouter.ts`, `ClaudePlanner.ts` |
| Diagrama Mermaid de §2.1 do 01-vision (nó `Gemini CLI`, labels Gemini Flash/Pro) | 01-vision-and-architecture | Redesenhar |
| Diretório `.gemini/` no diagrama de estrutura de pastas | CONTEXT_TRANSFER | Renomear para `.greenforge/` |
| Checklist do INTEGRACAO_STATUS "Contrato ExtensionContext para integração com Gemini CLI assinado" | INTEGRACAO_STATUS §3 | Atualizar texto |
| ADR-05 justificativa "compatível com ecossistema Gemini CLI" | DESIGN §8.1, NEXUS §10 | Atualizar justificativa; manter decisão (Node.js v20+) |

---

## SEÇÃO 5 — ESTRUTURA DE PASTAS RECOMENDADA PARA O NOVO PROJETO

O projeto deixa de ser uma extensão CLI (`bin/forge.ts` + `npm link`) e passa a ser uma **extensão VS Code** com ponto de entrada definido pelo `package.json` do VS Code.

```
greenforge/
├── .vscode/
│   └── launch.json               # Para debugar a extensão no Extension Development Host
├── src/
│   ├── extension.ts              # NOVO ponto de entrada (substitui bin/forge.ts)
│   │                             # Exporta activate(context: vscode.ExtensionContext) e deactivate()
│   │
│   ├── application/              # Sem alterações — lógica de domínio agnóstica
│   │   ├── CreateTask.ts
│   │   ├── DiffLens.ts
│   │   └── VerifyImplementation.ts
│   │
│   ├── domain/                   # Sem alterações
│   │   ├── entities/
│   │   └── services/
│   │
│   ├── infrastructure/
│   │   ├── git/
│   │   │   └── WorktreeManager.ts     # Sem alterações
│   │   ├── db/
│   │   │   └── SQLiteRepository.ts    # Sem alterações
│   │   └── llm/
│   │       ├── ClaudeRouter.ts        # RENOMEADO de GeminiRouter.ts
│   │       ├── ClaudePlanner.ts       # RENOMEADO de GeminiPlanner.ts
│   │       ├── ExplorerAgent.ts       # Sem alterações (interface)
│   │       ├── ReviewerAgent.ts       # Sem alterações (interface)
│   │       └── VerifierAgent.ts       # Sem alterações (interface)
│   │
│   ├── ui/                           # NOVO — componentes de UI do VS Code
│   │   ├── TaskTreeProvider.ts        # TreeView de tarefas ativas
│   │   ├── StatusBarManager.ts        # Item na barra de status
│   │   ├── DiffReportWebview.ts       # Webview para DiffReport
│   │   └── OutputChannelLogger.ts     # Substitui Logger.ts para VS Code
│   │
│   └── shared/
│       ├── SafeResolve.ts             # Sem alterações
│       └── Logger.ts                  # Mantido (pode delegar ao OutputChannelLogger)
│
├── __tests__/                        # Sem alterações nos testes de domínio
│   ├── router.test.ts                 # Mock @anthropic-ai/sdk (não mais Gemini)
│   ├── worktree.test.ts
│   ├── security.test.ts
│   └── ... (demais testes agnósticos)
│
├── .greenforge/                      # RENOMEADO de .gemini/
│   ├── worktrees/                    # Diretório de worktrees (runtime, gitignored)
│   └── forge.db                      # SQLite (runtime, gitignored)
│
├── AGENTS.md
├── CONTEXT_TRANSFER.md
├── package.json                      # ATUALIZADO: engines.vscode, contributes.commands, main: ./out/extension.js
└── tsconfig.json
```

### Mudanças críticas no `package.json`

O `package.json` de uma extensão VS Code tem uma estrutura diferente de um pacote npm comum. As chaves `contributes.commands` e `activationEvents` substituem o `bin` field:

```json
{
  "name": "greenforge",
  "displayName": "GreenForge",
  "engines": { "vscode": "^1.85.0" },
  "activationEvents": ["onCommand:greenforge.startTask"],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      { "command": "greenforge.startTask",    "title": "GreenForge: Start Task" },
      { "command": "greenforge.listTasks",    "title": "GreenForge: List Tasks" },
      { "command": "greenforge.approvePlan",  "title": "GreenForge: Approve Plan" },
      { "command": "greenforge.abortTask",    "title": "GreenForge: Abort Task" },
      { "command": "greenforge.steerTask",    "title": "GreenForge: Steer Task" },
      { "command": "greenforge.showDiffReport", "title": "GreenForge: Show Diff Report" }
    ],
    "views": {
      "explorer": [
        { "id": "greenforgeTasksView", "name": "GreenForge Tasks" }
      ]
    }
  }
}
```

---

## SEÇÃO 6 — PRÓXIMOS PASSOS PARA REESCREVER A DOCUMENTAÇÃO

Sequência recomendada. Cada passo é atômico e pode ser delegado a uma IA separada:

**Passo 1 — Pesquisa prévia obrigatória (você mesmo, não delegável)**
Antes de qualquer reescrita: verificar no repositório do Open Claude qual é o modelo de extensão/plugin (se existe), quais hooks expõe, e se há slash commands suportados. Isso determina se a Opção A ou Opção B da Seção 3.1 se aplica. Sem essa resposta, a Seção §3 do DESIGN não pode ser reescrita corretamente.

**Passo 2 — Reescrever GREENFORGE_DESIGN.md §3 (A nova seção de integração)**
Com base no resultado do Passo 1, reescrever completamente a seção "INTEGRAÇÃO COM OPEN CLAUDE E VS CODE". Incluir o novo `ExtensionContext`, os hooks disponíveis (ou a ausência deles), e como cada ferramenta do Gemini CLI (`forge_start_task` etc.) é mapeada para comandos VS Code.

**Passo 3 — Atualizar ADR-05 e criar ADR-08**
ADR-05: ajustar justificativa (manter Node.js v20+, nova razão: VS Code Extension Host).
ADR-08 (novo): documentar escolha dos modelos Claude por papel (Router, Planner, Reviewer), estratégia de autenticação, e razão para migração do Gemini.

**Passo 4 — Atualizar CONTEXT_TRANSFER.md**
É o arquivo de onboarding para agentes de IA. Deve refletir 100% o novo estado: stack, paths, variáveis de ambiente, comandos, estrutura de pastas. Praticamente uma reescrita completa mas estruturada.

**Passo 5 — Atualizar todos os RFs em 02-functional-requirements.md**
Especialmente RF-01.1 (critério de aceite do `onMessage` hook) e RF-02.3 (sinal `forge_approve`). Adicionar novos RFs para TreeView, StatusBar e DiffReport Webview.

**Passo 6 — Atualizar documentos derivados em batch**
01-vision, 03-technical-spec, 04-playbooks, 05-governance, 06-api, MAESTRO, NEXUS v1.1, NEXUS v1.2, README. Estas são atualizações de termos e paths — podem ser feitas por busca/substituição assistida.

**Passo 7 — Criar documento novo: 07-vscode-ux.md**
Especificar os componentes de UI do VS Code (TreeView, StatusBar, Webview, OutputChannel), seus contratos e critérios de aceite. O README atualmente diz que esse módulo "não é aplicável" — isso muda.

**Passo 8 — Atualizar INTEGRACAO_STATUS.md e gerar novo CONTEXT_TRANSFER.md**
Após todos os passos anteriores, gerar um novo status de integração documentando o que foi migrado e re-executar o fluxo de auditoria 15/15 critérios para o novo alvo (Open Claude plugin).

**Passo 9 — Revisar a estratégia de testes (arquivo a criar: `TEST_STRATEGY_VSCODE.md`)**
Os mocks mudarão: de `mock Gemini API` para `mock Anthropic API` no `router.test.ts`, e os testes de integração de extensão precisarão de `@vscode/test-electron` ou equivalente para mockar o VS Code Extension Host. Criar um documento dedicado a isso.

---

## OBSERVAÇÕES ADICIONAIS (Além do Solicitado)

### Risco arquitetural crítico identificado: a premissa do `onMessage` hook

A arquitetura atual depende fundamentalmente de que o GreenForge **intercepte automaticamente** todo input do usuário via `onMessage`. Isso é o que permite o roteamento transparente (usuário digita normalmente; o GreenForge decide se é chat ou tarefa).

No VS Code, extensões não interceptam input de texto de outras extensões automaticamente. Se o Open Claude não expõe um hook de mensagem para plugins, o GreenForge **perde a transparência do roteamento**. O usuário precisará invocar explicitamente `GreenForge: Start Task` em vez de simplesmente digitar no chat.

Isso não é um bloqueio — é uma mudança de UX. Mas impacta diretamente:
- RF-01.1 (critério de aceite precisa ser totalmente reescrito)
- O diferencial de "roteamento inteligente transparente" precisa ser reavaliado
- A documentação de visão (§1 do DESIGN) precisa reconhecer essa limitação

### Sobre o nome dos arquivos `GeminiRouter.ts` e `GeminiPlanner.ts`

Estes arquivos estão listados no CONTEXT_TRANSFER como nomes de implementação. A renomeação para `ClaudeRouter.ts` e `ClaudePlanner.ts` é cosmética mas importante para consistência da codebase futura.

### O diretório `.gemini/` é problemático

Além de ser um nome errado após a migração, o diretório `.gemini/` pode conflitar com configurações reais do Gemini CLI se ambos estiverem instalados no mesmo ambiente. Renomear para `.greenforge/` é um item de prioridade alta, não apenas cosmético.

---

*Este relatório cobre 100% dos documentos fornecidos. Todas as referências ao Gemini CLI foram catalogadas. O relatório pode ser usado diretamente como checklist de reescrita documental.*
