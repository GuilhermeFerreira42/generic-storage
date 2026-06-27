# Fase 15 — UI/UX para Revisão de Planos

**Status:** CONCLUÍDA E VALIDADA
**Data:** 2026-06-25
**Testes totais:** 320 (74 novos da Fase 15)

---

## Objetivo

Criar uma camada de UI/UX para revisão de planos gerados pelo GreenForge, permitindo que o usuário visualize um plano de forma clara, veja perguntas/aceite critérios/riscos/subtarefas, envie feedback ou respostas de clarificação, e aprove/rejeite o plano de forma controlada, integrando com os componentes reais já existentes.

## Arquivos Criados

| Arquivo | Descrição |
|---------|-----------|
| `src/core/types/PlanReview.ts` | Tipos e schemas Zod para todos os contratos de revisão |
| `src/core/PlanReviewController.ts` | Controller de domínio para revisão de planos |
| `src/core/PlanReviewRenderer.ts` | Renderizador textual markdown para visão de revisão |
| `src/integration/qwen/PlanReviewHandler.ts` | Handler de integração Qwen com 6 comandos |
| `tests/plan-review.test.ts` | 74 testes cobrindo todas as áreas da Fase 15 |

## Arquivos Alterados

| Arquivo | Alteração |
|---------|-----------|
| `docs/CURRENT_STATE.md` | Atualizado com Fase 15, 320 testes, novos módulos |
| `docs/BACKLOG_FUTURO.md` | Fase 15 marcada como CONCLUÍDA AGUARDANDO APROVAÇÃO |
| `docs/DECISION_LOG.md` | 9 decisões da Fase 15 adicionadas |
| `.humano` | Fase 15 adicionada ao histórico |

## Resumo Técnico

### PlanReviewController (`src/core/PlanReviewController.ts`)

Controller de domínio puro (sem efeitos colaterais de rede/terminal) que gerencia todo o ciclo de revisão de planos:

- **buildReviewView(taskId):** Busca a task no SQLiteRepository, extrai perguntas (do planMarkdown ou fallback), subtarefas, dependências, agentes, critérios de aceitação. Retorna `PlanReviewView` validado por Zod.
- **submitFeedback(input):** Registra feedback textual. Valida IDs de perguntas. Rejeita feedback vazio (via Zod). Rejeita pergunta inexistente. Retorna `PlanFeedbackResult` validado.
- **approvePlan(input):** Valida que a task existe e tem subtarefas. Delega para `Orchestrator.trigger(taskId, 'APPROVE_PLAN')`. Registra estado APPROVED. Retorna `PlanApprovalResult` validado.
- **rejectPlan(input):** Rejeita com motivo obrigatório. **Não altera a máquina de estados core** (limitação documentada: Orchestrator não possui evento REJECT_PLAN). Retorna `PlanRejectionResult` validado.
- **requestChanges(input):** Marca plano como NEEDS_CHANGES com motivo. Não altera core. Retorna `PlanNeedsChangesResult` validado.
- **getReviewStatus(taskId):** Retorna status de revisão (PENDING_REVIEW, APPROVED, REJECTED, NEEDS_CHANGES).
- **getFeedbackHistory(taskId):** Retorna histórico de feedbacks.
- **renderReviewToMarkdown(taskId):** Gera markdown completo de revisão.

### PlanReviewRenderer (`src/core/PlanReviewRenderer.ts`)

Renderizador textual puro que gera markdown legível para humano:

- **render(view):** Markdown completo com todas as seções.
- **renderQuestions(view):** Perguntas com tags [REQUIRED]/[OPTIONAL].
- **renderRisks(view):** Riscos ou "No risks identified".
- **renderDependencies(view):** Dependências entre subtarefas.
- **renderFeedbackTemplate(view):** Template para usuário responder perguntas.
- **renderCompact(view):** Resumo compacto em uma linha.

### PlanReviewHandler (`src/integration/qwen/PlanReviewHandler.ts`)

Handler de integração Qwen que expõe 6 comandos via `handle(name, args)`:

| Comando | Descrição |
|---------|-----------|
| `review <task-id>` | Mostra visão de revisão do plano |
| `feedback <task-id> <text> [--answers=q1:a1]` | Registra feedback e respostas |
| `approve <task-id>` | Aprova plano via Orchestrator |
| `reject <task-id> <reason>` | Rejeita com motivo |
| `needs-changes <task-id> <reason>` | Solicita mudanças |
| `review-status <task-id>` | Consulta status de revisão |

Todos os resultados passam por `CommandHandlerResultSchema.parse()`.

### PlanReview Types/Schemas (`src/core/types/PlanReview.ts`)

12 schemas Zod:

| Schema | Uso |
|--------|-----|
| `PlanReviewStatusSchema` | Enum: PENDING_REVIEW, APPROVED, REJECTED, NEEDS_CHANGES |
| `PlanReviewInputSchema` | Input: taskId não vazio |
| `PlanReviewViewSchema` | View completa de revisão |
| `PlanFeedbackInputSchema` | Input: taskId + feedback + questionAnswers opcional |
| `PlanFeedbackResultSchema` | Resultado de feedback |
| `PlanApprovalInputSchema` | Input: taskId |
| `PlanApprovalResultSchema` | Resultado de aprovação |
| `PlanRejectionInputSchema` | Input: taskId + reason |
| `PlanRejectionResultSchema` | Resultado de rejeição |
| `PlanNeedsChangesInputSchema` | Input: taskId + reason |
| `PlanNeedsChangesResultSchema` | Resultado de needs-changes |
| `PlanReviewStatusResultSchema` | Resultado de consulta de status |

## Fluxo de Revisão

### A. Plano pendente de revisão
1. Recebe `taskId`
2. `buildReviewView(taskId)` busca task no SQLiteRepository
3. Extrai perguntas (planMarkdown ou fallback), subtarefas, dependências, agentes, critérios
4. Retorna `PlanReviewView` validado por Zod
5. Renderizador gera markdown para exibição humana

### B. Feedback humano
1. `submitFeedback({taskId, feedback, questionAnswers?})`
2. Valida taskId (existe no repositório)
3. Valida IDs de perguntas (se fornecidos)
4. Armazena feedback internamente
5. Retorna `PlanFeedbackResult` validado

### C. Aprovação
1. `approvePlan({taskId})`
2. Valida que task existe e tem subtarefas
3. Garante transições de estado até PLANNING
4. `orchestrator.trigger(taskId, 'APPROVE_PLAN')` — chama Orchestrator real
5. Registra estado APPROVED
6. Checkpoint APPROVE_PLAN visível no SQLiteRepository

### D. Rejeição
1. `rejectPlan({taskId, reason})`
2. Valida que task existe
3. Registra REJECTED com motivo
4. **Não altera máquina de estados core** (limitação documentada)
5. Task status permanece inalterado no repositório

### E. Status de revisão
- `PENDING_REVIEW`: Task nova, sem revisão ainda
- `APPROVED`: Plano aprovado via Orchestrator
- `REJECTED`: Plano rejeitado (modelado no controller)
- `NEEDS_CHANGES`: Plano precisa de mudanças (modelado no controller)

## Componentes Reais Utilizados

- **SQLiteRepository:** Busca/salva tasks e checkpoints
- **Orchestrator:** Transição de estado via `trigger(taskId, 'APPROVE_PLAN')`
- **PlannerEngine:** `renderToMarkdown()` para gerar planMarkdown
- **Schemas Zod:** Validação de todos os inputs/outputs

## Limitações Documentadas

1. **Orchestrator não possui evento REJECT_PLAN:** A rejeição é modelada como resultado de revisão no PlanReviewController, sem alterar a máquina de estados. Futuro ajuste pode adicionar transição de rejeição no Orchestrator.
2. **Feedback store em memória:** O armazenamento de feedback e status de revisão usa Map em memória no controller. Para persistência entre sessões, seria necessário estender o SQLiteRepository.

## Testes

74 testes em `tests/plan-review.test.ts`:

| Grupo | Testes |
|-------|--------|
| A. Renderização de Revisão | 8 |
| B. Feedback | 7 |
| C. Aprovação | 6 |
| D. Rejeição / Needs Changes | 12 |
| E. Integração Qwen (Handler) | 11 |
| F. PlanReviewRenderer | 7 |
| G. Schemas Zod | 10 |
| H. Controller renderReviewToMarkdown | 5 |
| I. Isolamento | 7 |
| J. Controller com planMarkdown | 1 |

## Comandos Finais

```
npm test    → 320 testes, 100% passando
npm run build → sem erros
npm run lint  → 0 erros, 0 warnings
```

---

**Não avançar para Fase 16 sem aprovação humana.**
**Não fazer commit sem aprovação humana.**