# BACKLOG ESTRATÉGICO — GreenForge

## Intenção Original
- **Objetivo:** Transformar o Qwen CLI em um engenheiro autônomo com isolamento físico e segurança de filesystem.
- **Estado Atual:** Fase 3 concluída (Segurança de path e atomicidade funcional).

---

## Onda 1 — Núcleo e Isolamento
> Pré-requisito: Fase 0 concluída

### Itens

| ID | Entregável | Descrição (entregue ou planejada) | Arquivos Impactados | Critério de Aceite | Status |
|----|------------|-----------------------------------|----------------------|---------------------|--------|
| W1-01 | Setup Base | Estrutura de pastas, build e testes v2.0. | `package.json` | Smoke Test PASS | CONCLUÍDO |
| W1-02 | Intention Router | Roteador com Zod e 13 testes mockados. | `QwenRouter.ts` | 13/13 testes PASS | CONCLUÍDO |
| W1-03 | Worktree Manager | Isolamento físico com validação estrita. | `WorktreeManager.ts` | 15/15 testes PASS | CONCLUÍDO |
| W1-04 | SafeResolve & AtomicWrite | Contratos de segurança de path e escrita atômica. | `SafeResolve.ts` | 10/10 testes de segurança PASS | CONCLUÍDO |

### Meta da Onda 1
- **Critério binário:** Sistema capaz de triar tarefas, isolá-las fisicamente e operar o FS com segurança auditada.
- **Status:** CONCLUÍDO ✅

### CONTRATOS_DA_ONDA 1 (Finalizado)
```
OUTPUT_SCHEMAS:
  W1-04: (SafeResolve) realpath string; (AtomicWrite) void
ESCOPO_CONGELADO:
  - src/shared/SafeResolve.ts (Inviolável após Fase 3)
```

---

## Onda 2 — Orquestração e Persistência
> Pré-requisito: Onda 1 concluída

| ID | Entregável | Descrição | Arquivos | Critério | Status |
|----|------------|-----------|----------|----------|--------|
| W2-01 | Persistence Layer | SQLite Repositories para Tasks e Subtasks. | `src/infra/db` | Transações ACID PASS | PENDENTE |
| W2-02 | Planner Engine | Motor de geração de planos (Plan Mode). | `src/core/Planner` | Gherkin scenarios PASS | PENDENTE |

---

## Regras do Backlog
1. Itens movem para `CONCLUÍDO` após validação binária.
2. Nenhuma Onda inicia sem a anterior concluída.
