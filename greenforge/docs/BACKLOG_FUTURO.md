# BACKLOG ESTRATÉGICO — GreenForge

## Intenção Original
- **Objetivo:** Transformar o Qwen CLI em um engenheiro autônomo com isolamento físico e execução especializada via agentes.
- **Estado Atual:** Fase 8 refinada (Agentes Especialistas MVP com blindagem total).

---

## Onda 1 — Núcleo e Isolamento
**Status:** CONCLUÍDO ✅

---

## Onda 2 — Orquestração e Persistência
**Status:** CONCLUÍDO ✅

---

## Onda 3 — Agentes e MCP
> Pré-requisito: Onda 2 concluída

### Itens

| ID | Entregável | Descrição (entregue ou planejada) | Arquivos Impactados | Critério de Aceite | Status |
|----|------------|-----------------------------------|----------------------|---------------------|--------|
| W3-01 | MCP Client Base | Camada de integração MCP com contratos estritos e mock inspecionável. | `McpClientPort.ts`, `MockMcpClient.ts` | 9/9 testes MCP PASS | CONCLUÍDO |
| W3-02 | Agentes Especialistas | Implementação dos agentes @Coder, @Tester e @Reviewer com validação Zod de entrada/saída e privilégio mínimo no fluxo real. | `CoderAgent.ts`, `TesterAgent.ts`, `ReviewerAgent.ts`, `BaseAgent.ts` | 14/14 testes agentes PASS | CONCLUÍDO |
| W3-03 | Join Gate | Sistema de consolidação de artefatos produzidos por múltiplos agentes em paralelo. | `src/core/Joiner` | Multi-branch merge PASS | PENDENTE |

### Meta da Onda 3
- **Critério binário:** Sistema capaz de delegar tarefas a sub-agentes especialistas que operam de forma isolada e segura via MCP.
- **Status:** PENDENTE

### CONTRATOS_DA_ONDA 3 (Finalizado)
```
OUTPUT_SCHEMAS:
  W3-01: Strict Zod Union (ok: true | ok: false)
  W3-02: (AgentResult) status 'DONE'|'FAILED', validated by Zod
ESCOPO_CONGELADO:
  - src/core/Orchestrator.ts
  - src/infrastructure/db/SQLiteRepository.ts
  - src/core/agents/BaseAgent.ts (Blindado)
```

---

## Regras do Backlog
1. Itens movem para `CONCLUÍDO` após validação binária.
2. Nenhuma Onda inicia sem a anterior concluída.
