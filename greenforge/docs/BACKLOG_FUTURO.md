# BACKLOG ESTRATÉGICO — GreenForge

## Intenção Original
- **Objetivo:** Transformar o Qwen CLI em um engenheiro autônomo com isolamento físico e orquestração controlada.
- **Estado Atual:** Fase 6 concluída (Máquina de estados operacional).

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
| W2-02 | Planner Engine | Motor de planos com validação Zod e detecção de ciclos. | `PlannerEngine.ts` | 13/13 testes PASS | CONCLUÍDO |
| W2-03 | Orchestrator | Máquina de estados principal gerenciando o ciclo de vida completo (PENDING -> COMPLETED). | `Orchestrator.ts` | 17/17 testes de estado PASS | CONCLUÍDO |

### Meta da Onda 2
- **Critério binário:** Capaz de triar, planejar e gerenciar o ciclo de vida de uma tarefa complexa com persistência e controle de estados auditável.
- **Status:** CONCLUÍDO ✅

---

## Onda 3 — Agentes e MCP (Fases 7-9)
> Pré-requisito: Onda 2 concluída

| ID | Entregável | Descrição | Arquivos | Critério | Status |
|----|------------|-----------|----------|----------|--------|
| W3-01 | MCP Client | Integração com Model Context Protocol para execução de ferramentas. | `src/infra/mcp` | List/Call tools PASS | PENDENTE |
| W3-02 | Sub-agentes MVP | Especialistas @Coder e @Tester operando em Worktrees. | `src/core/agents` | Green tests real WT | PENDENTE |
| W3-03 | Join Gate | Consolidação de resultados da execução paralela. | `src/core/Joiner` | Artifact merge PASS | PENDENTE |

### meta da onda 3
- **critério binário:** sistema capaz de executar ferramentas externas via mcp e consolidar código produzido por sub-agentes especialistas.
- **status:** pendente ⏳

### contratos_da_onda 3
> este bloco é proposto pela ia. o usuário deve revisar e preencher as lacunas [?] antes de confirmar.

```
output_schemas:
  w3-01: (mcpcall) { tool: string, args: object, result: any }
  w3-02: (agentoutput) { taskId: string, code: string, tests: string, status: 'success' | 'failure' }

escopo_congelado:
  - src/core/orchestrator.ts
  - src/infrastructure/db/sqliterepository.ts

arquivos_a_deletar:
  - nenhum

reescritas:
  - nenhuma

specialists_mvp:
  - @coder (implementação de lógica)
  - @tester (geração de suítes de teste)
  - @reviewer (auditoria estática)

decisoes_extras:
  - [?] usar mcp-sdk oficial ou implementação via stdio manual? (ia recomenda mcp-sdk)
  - [?] limite de ferramentas por agente? (ia recomenda max 10)
```

---

## regras do backlog
1. Itens movem para `CONCLUÍDO` após validação binária.
2. Nenhuma Onda inicia sem a anterior concluída.
