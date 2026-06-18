# BACKLOG ESTRATÉGICO — GreenForge

## Intenção Original
- **Objetivo:** Transformar o Qwen CLI em um engenheiro autônomo com isolamento físico e execução especializada via agentes.
- **Estado Atual:** Fase 9 refinada (Join Gate com blindagem absoluta).

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
| W3-02 | Agentes Especialistas | Implementação dos agentes @Coder, @Tester e @Reviewer com validação Zod de entrada/saída e privilégio mínimo. | `CoderAgent.ts`, `TesterAgent.ts`, `ReviewerAgent.ts`, `BaseAgent.ts` | 14/14 testes agentes PASS | CONCLUÍDO |
| W3-03 | Join Gate | Sistema de consolidação com validação Zod de input/output, detecção de resultados duplicados/órfãos e barreira de integridade de grafo. | `JoinGate.ts`, `Join.ts` | 14/14 testes join PASS | CONCLUÍDO |

### Meta da Onda 3
- **Critério binário:** Sistema capaz de delegar tarefas a sub-agentes especialistas e consolidar seus resultados de forma segura e íntegra.
- **Status:** CONCLUÍDO ✅

---

## Onda 4 — Visualização e Auditoria (Fases 10-12)
> Pré-requisito: Onda 3 concluída

| ID | Entregável | Descrição | Arquivos | Critério | Status |
|----|------------|-----------|----------|----------|--------|
| W4-01 | DiffLens Engine | Motor de visualização de mudanças e auditoria de planos. | `src/core/DiffLens` | Visual comparison PASS | PENDENTE |

---

## Regras do Backlog
1. Itens movem para `CONCLUÍDO` após validação binária.
2. Nenhuma Onda inicia sem a anterior concluída.
