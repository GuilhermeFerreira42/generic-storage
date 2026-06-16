# DECISION_LOG — GreenForge

## Formato
`[FASE] | [TIPO] | [DECISÃO] | [MOTIVO] | [ARQUIVOS IMPACTADOS]`

Tipos: ADD, MOD, DEL, FREEZE, RULE, CFG, FIX, TECH

---

### Fase 0 — Planejamento
F0 | ADD | Estrutura de diretórios portátil | Garantir que a documentação acompanhe o código | `greenforge/documentacao/`
F0 | TECH | Node.js v22+ e TypeScript | Compatibilidade com Qwen CLI e padrões modernos | `package.json`, `tsconfig.json`
F0 | RULE | No-Shell Policy | Segurança contra injeção de comandos | `package.json`
F0 | RULE | TDD como regra de desenvolvimento | Garantir qualidade e verificabilidade | `ARCHIVING_PROTOCOL.md`
F0 | CFG | .qwenignore | Otimizar uso de tokens e contexto de IA | `.qwenignore`

### Fase 1 — Intention Router
F1 | ADD | Interface LLMProvider | Desacoplar core da infraestrutura de LLM | `src/core/ports/LLMProvider.ts`
F1 | ADD | QwenRouter com Zod | Validação robusta de contratos de borda com IA | `src/infrastructure/llm/QwenRouter.ts`
F1 | TECH | Vitest com Mocks determinísticos | Testar lógica de roteamento sem custos de API | `tests/router.test.ts`
F1 | CFG | Threshold de confiança em 0.7 | Equilíbrio entre precisão e utilidade | `src/infrastructure/llm/QwenRouter.ts`
F1 | FIX | Validação de tipos de confiança | Evitar crash com retornos malformados do LLM | `src/infrastructure/llm/QwenRouter.ts`
F1 | RULE | Fallback para NORMAL_CHAT | Segurança operacional em caso de dúvida | `src/infrastructure/llm/QwenRouter.ts`

### Fase 2 — Worktree Manager
F2 | ADD | WorktreeManager | Gerenciar isolamento físico de tarefas | `src/infrastructure/git/WorktreeManager.ts`
F2 | TECH | Integração com Git Real nos testes | Validar comportamento real do filesystem e git | `tests/worktree.test.ts`
F2 | CFG | Padrão de path .git/greenforge-worktrees | Organização interna ao diretório .git | `src/infrastructure/git/WorktreeManager.ts`
F2 | RULE | Uso de path.normalize e path.resolve | Garantir caminhos absolutos e compatibilidade Windows | `src/infrastructure/git/WorktreeManager.ts`
F2 | FIX | Tratamento de erro com cause | Preservar rastreabilidade de erros de sistema | `src/infrastructure/git/WorktreeManager.ts`
F2 | RULE | Remoção forçada no deprovision | Evitar bloqueios por arquivos modificados no WT | `src/infrastructure/git/WorktreeManager.ts`
F2 | RULE | Validação estrita de taskId | Prevenir Path Traversal e nomes de branch inválidos | `src/infrastructure/git/WorktreeManager.ts`
F2 | TECH | Uso de path.relative para listagem | Garantir que apenas worktrees internos sejam listados | `src/infrastructure/git/WorktreeManager.ts`
F2 | TECH | mkdtemp nos testes | Evitar colisões em ambientes de execução paralela | `tests/worktree.test.ts`
F2 | FIX | Bloqueio de taskId "." | Evitar que worktree seja criado na raiz do repositório | `src/infrastructure/git/WorktreeManager.ts`
F2 | FIX | Bloqueio de taskId com ponto inicial/final | Prevenir nomes ambíguos ou inválidos no Git/Windows | `src/infrastructure/git/WorktreeManager.ts`
F2 | RULE | Erro explícito na remoção de branch | Garantir limpeza total e evitar branches órfãs | `src/infrastructure/git/WorktreeManager.ts`
