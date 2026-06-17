# BACKLOG ESTRATÉGICO — GreenForge

## Intenção Original
- **Objetivo:** Transformar o Qwen CLI em um engenheiro autônomo com isolamento físico e orquestração via ferramentas externas.
- **Estado Atual:** Fase 7 refinada (Contratos MCP blindados).

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
| W3-01 | MCP Client Base | Camada de integração MCP com contratos estritos, union discriminada e mock inspecionável. | `McpClientPort.ts`, `MockMcpClient.ts`, `Mcp.ts` | 9/9 testes MCP PASS | CONCLUÍDO |
| W3-02 | Agentes Especialistas | Implementação dos agentes @Coder, @Tester e @Reviewer consumindo McpClientPort. | `src/core/agents` | Mock agent execution PASS | PENDENTE |
| W3-03 | Join Gate | Sistema de consolidação de artefatos produzidos por múltiplos agentes em paralelo. | `src/core/Joiner` | Multi-branch merge PASS | PENDENTE |

### Meta da Onda 3
- **Critério binário:** Sistema capaz de delegar tarefas a sub-agentes que utilizam ferramentas externas via MCP de forma isolada e segura.
- **Status:** PENDENTE

### CONTRATOS_DA_ONDA 3
```
OUTPUT_SCHEMAS:
  W3-01: (McpCall) Strict Zod Union (ok: true | ok: false)
  W3-02: [?] (AgentResult) a ser definido na Fase 8
ESCOPO_CONGELADO:
  - src/core/Orchestrator.ts
  - src/infrastructure/db/SQLiteRepository.ts
  - src/core/ports/McpClientPort.ts (Refinado)
```

---

## Regras do Backlog
1. Itens movem para `CONCLUÍDO` após validação binária.
2. Nenhuma Onda inicia sem a anterior concluída.
