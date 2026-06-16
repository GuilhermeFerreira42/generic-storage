# DECISION_LOG — GreenForge

## Formato
`[FASE] | [TIPO] | [DECISÃO] | [MOTIVO] | [ARQUIVOS IMPACTADOS]`

Tipos: ADD, MOD, DEL, FREEZE, RULE, CFG, FIX, TECH

---

### Fase 0 — Planejamento
F0 | ADD | Estrutura de diretórios portátil | Documentação acompanha código | `greenforge/documentacao/`
F0 | TECH | Node.js v22+ e TypeScript | Compatibilidade e modernidade | `package.json`

### Fase 1 — Intention Router
F1 | ADD | QwenRouter com Zod | Validação de contratos com LLM | `src/infrastructure/llm/QwenRouter.ts`

### Fase 2 — Worktree Manager
F2 | ADD | WorktreeManager | Isolamento físico de tarefas | `src/infrastructure/git/WorktreeManager.ts`
F2 | RULE | Validação estrita de taskId | Prevenir Path Traversal e nomes inválidos | `src/infrastructure/git/WorktreeManager.ts`

### Fase 3 — Segurança de Path
F3 | ADD | SecurityError | Erro tipado para violações de segurança | `src/shared/errors.ts`
F3 | ADD | SafeResolve | Prevenir Path Traversal via realpath + relative validation | `src/shared/SafeResolve.ts`
F3 | ADD | AtomicWrite | Garantir integridade de arquivos críticos via Temp-Sync-Rename | `src/shared/AtomicWrite.ts`
F3 | RULE | Inviolabilidade do SafeResolve | Todas as operações de FS devem validar o path | `src/shared/SafeResolve.ts`
F3 | TECH | Sync de handle no AtomicWrite | Garantir que o dado atingiu o disco antes do rename | `src/shared/AtomicWrite.ts`
F3 | TECH | Testes de segurança com mkdtemp | Evitar colisões e vazamento de permissões | `tests/security.test.ts`
