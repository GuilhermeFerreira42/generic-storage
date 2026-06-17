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
F8 | ADD | BaseAgent | Centralizar validações de privilégio e contexto | `src/core/agents/BaseAgent.ts`
F8 | RULE | Privilégio Mínimo no Fluxo Real | Bloqueio de ferramentas validado no método `execute` dos agentes | `src/core/agents/BaseAgent.ts`
F8 | RULE | Validação de Saída Zod | Todo `AgentResult` é validado antes de ser retornado pelo agente | `src/core/agents/BaseAgent.ts`
F8 | TECH | Validação de Conteúdo de Review | `ReviewerAgent` valida o JSON de retorno da ferramenta de revisão | `src/core/agents/ReviewerAgent.ts`
F8 | CFG | Contexto Estrito | `AgentContextSchema` exige campos não vazios para segurança de auditoria | `src/core/types/Agent.ts`
