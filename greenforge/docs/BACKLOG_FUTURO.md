# BACKLOG ESTRATÉGICO — GreenForge

## Intenção Original
- **Objetivo:** Transformar o Qwen CLI em um engenheiro autônomo com isolamento físico e auditoria visual de mudanças.
- **Estado Atual:** Fase 10 concluída (DiffLens Engine operacional).

---

## Onda 1 — Núcleo e Isolamento
**Status:** CONCLUÍDO ✅

---

## Onda 2 — Orquestração e Persistência
**Status:** CONCLUÍDO ✅

---

## Onda 3 — Agentes e MCP
**Status:** CONCLUÍDO ✅

---

## Onda 4 — Visualização e Auditoria
> Pré-requisito: Onda 3 concluída

### Itens

| ID | Entregável | Descrição (entregue ou planejada) | Arquivos Impactados | Critério de Aceite | Status |
|----|------------|-----------------------------------|----------------------|---------------------|--------|
| W4-01 | DiffLens Engine | Motor de auditoria de mudanças com análise de risco, alinhamento de plano e geração de relatório Markdown `GREENFORGE_AUDIT.md`. | `DiffLens.ts`, `DiffLens.ts` | 15/15 testes PASS | CONCLUÍDO |
| W4-02 | Verifier (Fase 11) | Componente final de aceitação que consolida o veredito humano e automatizado. | `Verifier.ts` | Final sign-off PASS | PENDENTE |
| W4-03 | Qwen Integration | Acoplamento final da extensão no pipeline de execução do Qwen CLI. | `index.ts` | E2E integration PASS | PENDENTE |

### Meta da Onda 4
- **Critério binário:** Sistema capaz de auditar mudanças, reportar riscos críticos e permitir o encerramento seguro de tarefas.
- **Status:** PENDENTE

### CONTRATOS_DA_ONDA 4
```
OUTPUT_SCHEMAS:
  W4-01: (DiffReport) Zod validated object; (Markdown) GREENFORGE_AUDIT.md
ESCOPO_CONGELADO:
  - src/core/JoinGate.ts
  - src/core/agents/BaseAgent.ts
```

---

## Regras do Backlog
1. Itens movem para `CONCLUÍDO` após validação binária.
2. Nenhuma Onda inicia sem a anterior concluída.
