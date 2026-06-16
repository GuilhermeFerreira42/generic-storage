# DECISION_LOG — GreenForge

## Formato
`[FASE] | [TIPO] | [DECISÃO] | [MOTIVO] | [ARQUIVOS IMPACTADOS]`

Tipos: ADD, MOD, DEL, FREEZE, RULE, CFG, FIX, TECH

---

### Fase 0 — Planejamento
F0 | ADD | Estrutura de diretórios portátil | Documentação acompanha código | `greenforge/documentacao/`

### Fase 1 — Intention Router
F1 | ADD | QwenRouter com Zod | Validação de contratos com LLM | `src/infrastructure/llm/QwenRouter.ts`

### Fase 2 — Worktree Manager
F2 | ADD | WorktreeManager | Isolamento físico de tarefas | `src/infrastructure/git/WorktreeManager.ts`

### Fase 3 — Segurança de Path
F3 | ADD | SafeResolve | Prevenir Path Traversal | `src/shared/SafeResolve.ts`
F3 | ADD | AtomicWrite | Garantir integridade via Temp-Sync-Rename | `src/shared/AtomicWrite.ts`

### Fase 4 — Persistence Layer
F4 | ADD | SQLiteRepository | Centralizar persistência de tarefas e checkpoints | `src/infrastructure/db/SQLiteRepository.ts`

### Fase 5 — Planner Engine
F5 | ADD | PlannerEngine | Motor de decomposição de tarefas em planos estruturados | `src/core/PlannerEngine.ts`
F5 | TECH | Validação Zod do Plano | Garantir que o LLM retorne dados estruturados conformes | `src/core/PlannerEngine.ts`
F5 | RULE | Restrição de Clarificação | Forçar exatamente entre 5 e 7 perguntas para garantir qualidade | `src/core/PlannerEngine.ts`
F5 | RULE | Detecção de Ciclos (DFS) | Impedir que planos contenham dependências circulares infinitas | `src/core/PlannerEngine.ts`
F5 | RULE | Validação de Dependências | Impedir subtarefas de referenciar IDs inexistentes | `src/core/PlannerEngine.ts`
F5 | TECH | Renderização Markdown | Gerar `GREENFORGE_PLAN.md` para auditoria humana | `src/core/PlannerEngine.ts`
F5 | RULE | Escrita Segura do Plano | Uso obrigatório de `SafeResolveForWrite` e `AtomicWrite` | `src/core/PlannerEngine.ts`
F5 | FIX | Correção nome GREENFORGE_PLAN.md | Eliminar link malformado no nome do arquivo | `src/core/PlannerEngine.ts`
F5 | RULE | Sobrescrita de ID/Prompt confiáveis | Não confiar no ID e Prompt retornados pelo LLM | `src/core/PlannerEngine.ts`
F5 | RULE | Bloqueio de IDs Duplicados | Garantir unicidade de subtarefas no grafo | `src/core/PlannerEngine.ts`
