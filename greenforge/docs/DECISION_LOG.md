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
F6 | RULE | Estados Terminais Imutáveis | Bloquear transições de COMPLETED/FAILED | `src/core/Orchestrator.ts`
F6 | RULE | Rollback Atômico | Garantir consistência entre status e checkpoints via transações | `src/core/Orchestrator.ts`
F6 | TECH | Prova de Rollback nos Testes | Validação empírica de atomicidade via Spy Mocks | `tests/orchestrator.test.ts`
F6 | MOD | Auditoria de Plano | Registro obrigatório de checkpoints para PLAN_GENERATED e APPROVE_PLAN | `src/core/Orchestrator.ts`
F6 | FIX | Tipagem de Metadata | Uso de Record<string, unknown> para eliminar warnings de linter | `src/core/Orchestrator.ts`

### Fase 7 — MCP Base Integration
F7 | ADD | McpClientPort | Interface de porta para desacoplar o core do SDK oficial do MCP | `src/core/ports/McpClientPort.ts`
F7 | ADD | MockMcpClient | Implementação de testes determinística para simular servidores MCP | `src/infrastructure/mcp/MockMcpClient.ts`
F7 | TECH | Tipagem Unknown no MCP | Substituição de `any` por `unknown` em argumentos e conteúdos para maior segurança de tipos | `src/core/types/Mcp.ts`
F7 | RULE | Resiliência via retryable | Obrigatoriedade do campo `retryable` em erros de MCP para guiar o orquestrador | `src/core/types/Mcp.ts`
F7 | TECH | Validação de Resposta Mock | Uso de Zod interno no Mock para garantir que as simulações sigam o contrato estrutural | `src/infrastructure/mcp/MockMcpClient.ts`
F7 | RULE | Contratos MCP Estritos | Uso de Zod Discriminated Unions e .strict() para impedir estados contraditórios (ex: ok: true com erro) | `src/core/types/Mcp.ts`
F7 | TECH | Mock Inspecionável | Adicionado histórico de chamadas ao Mock para auditoria em testes de agentes | `src/infrastructure/mcp/MockMcpClient.ts`
F7 | RULE | Validação de Ferramentas | setTools agora valida o schema das ferramentas antes de aceitá-las no Mock | `src/infrastructure/mcp/MockMcpClient.ts`


