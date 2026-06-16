# BACKLOG ESTRATÉGICO — GreenForge

## Intenção Original
- **Objetivo:** Transformar o Qwen CLI em um engenheiro autônomo com isolamento físico e segurança de filesystem.
- **Estado Atual:** Fase 5 concluída (Planner Engine refinado e seguro).

---

## Onda 1 — Núcleo e Isolamento
**Status:** CONCLUÍDO ✅

---

## Onda 2 — Orquestração e Persistência
> Pré-requisito: Onda 1 concluída

### Itens

| ID | Entregável | Descrição (entregue ou planejada) | Arquivos Impactados | Critério de Aceite | Status |
|----|------------|-----------------------------------|----------------------|---------------------|--------|
| W2-01 | Persistence Layer | Camada SQLite com integridade referencial e transações ACID. | `SQLiteRepository.ts` | 9/9 testes PASS | CONCLUÍDO |
| W2-02 | Planner Engine | Motor de geração de planos com validação Zod, detecção de ciclos e renderização Markdown segura como `GREENFORGE_PLAN.md`. | `PlannerEngine.ts` | 13/13 testes PASS | CONCLUÍDO |
| W2-03 | Orchestrator | Máquina de estados principal gerenciando o ciclo Plan-Code-Verify. | `Orchestrator.ts` | Transições validadas | PENDENTE |

### Meta da Onda 2
- **Critério binário:** Capaz de triar, planejar e gerenciar o ciclo de vida de uma tarefa complexa com persistência e integridade total de dados.
- **Status:** PENDENTE

### CONTRATOS_DA_ONDA 2 (Finalizado)
```
OUTPUT_SCHEMAS:
  W2-02: (Plan) Zod validated JSON; (Markdown) GREENFORGE_PLAN.md compliant
  W2-03: [?] Orchestrator state machine schema (Phase 6)
ESCOPO_CONGELADO:
  - src/core/PlannerEngine.ts (Refinado e estável)
```

---

## Regras do Backlog
1. Itens movem para `CONCLUÍDO` após validação binária.
2. Nenhuma Onda inicia sem a anterior concluída.
