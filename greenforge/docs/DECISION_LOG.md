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

### Fase 4 — Persistence Layer
F4 | ADD | SQLiteRepository | Centralizar persistência de tarefas e checkpoints | `src/infrastructure/db/SQLiteRepository.ts`

### Fase 5 — Planner Engine
F5 | ADD | PlannerEngine | Motor de planos estruturados | `src/core/PlannerEngine.ts`

### Fase 6 — Orchestrator
F6 | ADD | Orchestrator | Gestão centralizada via máquina de estados | `src/core/Orchestrator.ts`

### Fase 7 — MCP Base Integration
F7 | ADD | McpClientPort | Interface de porta para desacoplar o core do SDK oficial do MCP | `src/core/ports/McpClientPort.ts`

### Fase 8 — Agentes Especialistas
F8 | ADD | Specialist Agents (@Coder, @Tester, @Reviewer) | Decompor execução em papéis técnicos específicos | `src/core/agents/`

### Fase 9 — Join Gate
F9 | ADD | JoinGate | Componente de sincronização e validação de subtarefas | `src/core/JoinGate.ts`

### Fase 10 — DiffLens Engine
F10 | ADD | DiffLens | Motor de auditoria humana e análise de risco | `src/core/DiffLens.ts`
F10 | RULE | Detecção de Arquivos Críticos | Mudanças em `.env`, `package.json` ou núcleos de segurança forçam `Risk Level: HIGH` | `src/core/DiffLens.ts`
F10 | FIX | Relatório Markdown Confiável | Correção do nome do arquivo para `GREENFORGE_AUDIT.md` e eliminação de links malformados | `src/core/DiffLens.ts`
F10 | MOD | Validação de Revisão | Implementada validação Zod para conteúdos de `REVIEW_REPORT` nos artefatos | `src/core/DiffLens.ts`
F10 | RULE | Alinhamento Reativo Refinado | Uso de `PARTIAL` para erros de formato e `DIVERGED` para violações de qualidade | `src/core/DiffLens.ts`
F10 | CFG | Contrato DiffReport Puro | Remoção do campo `ok` redundante para manter integridade com o schema Zod | `src/core/types/DiffLens.ts`
