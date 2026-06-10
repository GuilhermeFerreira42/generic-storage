# GreenForge — 02: Requisitos Funcionais (Deepened)

> **Status:** ✅ | **Versão:** 2.0.0 | **Data:** 2026-06-09
> **Referências:** Verdant AI Plan Mode, Cline ToolExecutor.

---

## 6. Requisitos Funcionais Detalhados

### RF-01: Interceptação e Classificação de Intenção
O sistema deve interceptar 100% das mensagens via `onMessage` em `common.ts` antes de enviá-las ao núcleo do Cline.

- **Critério de Aceite Binário:**
  - Input: "Crie um script de backup"
  - Comportamento: O `GF-Router` retorna um objeto JSON contendo `intent: 'DEVELOPMENT_TASK'` e `confidence > 0.8`.
  - Persistência: Um registro de `IntentLog` é criado no SQLite com o prompt raw e a classificação.
- **Condição de Contorno:** Se a API do Gemini Flash retornar erro (5xx), o sistema deve fazer fallback para `intent: 'NORMAL_CHAT'` e registrar o erro no `Logger`.

### RF-02: Ciclo de Clarificação Imperativo
Para tarefas classificadas como `DEVELOPMENT_TASK`, o orquestrador deve gerar exatamente entre 5 e 7 questões técnicas.

- **Critério de Aceite Binário:**
  - O loop de execução de ferramentas (`ToolExecutor`) fica bloqueado até que o array `clarificationAnswers` tenha comprimento igual ao array de perguntas geradas.
  - O prompt enviado para geração do plano deve incluir as respostas como contexto primário.

### RF-03: Geração de Blueprint Determinístico
O sistema deve gerar o arquivo `GREENFORGE_PLAN.md` na raiz do worktree.

- **Critério de Aceite Binário:**
  - O arquivo DEVE conter as seções: `## Proposed Architecture`, `## Affected Files`, `## Test Strategy`.
  - Cada arquivo listado em `## Affected Files` deve ter uma justificativa técnica de 1 parágrafo.

### RF-04: Provisionamento de Worktree Isolado
Criação física de diretório para cada tarefa.

- **Critério de Aceite Binário:**
  - Execução de `git worktree list` via shell deve retornar o path em `~/.cline/worktrees/<taskId>`.
  - O `cwd` (Current Working Directory) do processo `SubagentRunner` deve ser injetado com este path absoluto.

---

## 7. Requisitos Não Funcionais (Métricas Reais)

| ID | Categoria | Métrica | Alvo (Target) |
|---|---|---|---|
| **RNF-01** | Performance | Latência P95 do Router | < 1200ms |
| **RNF-02** | Segurança | Taxa de Escape de Path Traversal | 0% (Validado via `SafeResolve`) |
| **RNF-03** | Resiliência | Recuperação de Estado Pós-Crash | < 2s após reinício do VS Code |
| **RNF-04** | Escalabilidade | Carga Máxima de Subagentes | 5 agentes paralelos em 16GB RAM |

---

## 8. Matriz de Rastreabilidade NEXUS

| Requisito | Componente Responsável | Teste de Validação (Gherkin) |
|---|---|---|
| RF-01 (Intent) | `src/core/Router.ts` | `features/intent.feature` |
| RF-04 (Isolamento) | `src/git/WorktreeManager.ts` | `features/isolation.feature` |
| RNF-02 (Hardening) | `src/utils/SafeResolve.ts` | `features/security.feature` |

---
**Este documento define os contratos de aceitação para o QA e CI/CD.**
