# CURRENT_STATE — GreenForge
> Última atualização: Fase 2 | 2026-06-16

## Arquitetura Ativa
- **Arquitetura Hexagonal:** Separação entre core (domínio), ports (interfaces) e infraestrutura (LLM, Git, DB).
- **Orquestração:** Baseada em Intention Router para triagem de prompts.
- **Isolamento:** Uso de Git Worktrees gerenciados pelo `WorktreeManager` com validação rigorosa de entrada.
- **Validação:** Contratos de borda validados com Zod (LLM) e Regex (FS).

## Módulos e Contratos Vigentes
| Módulo | Arquivo | Contrato Público | Desde |
|--------|---------|------------------|-------|
| `LLMProvider` | `src/core/ports/LLMProvider.ts` | `generate(prompt: string): Promise<string>` | Fase 1 |
| `QwenRouter` | `src/infrastructure/llm/QwenRouter.ts` | `classify(input: string): Promise<Intent>` | Fase 1 |
| `WorktreeManager` | `src/infrastructure/git/WorktreeManager.ts` | `provision(taskId): Promise<WTInfo>`, `deprovision(taskId): Promise<void>`, `list(): Promise<WTInfo[]>` | Fase 2 |

## Fluxo Principal
1. Usuário envia prompt raw.
2. `QwenRouter` classifica a intenção via LLM.
3. Se for uma tarefa técnica, `WorktreeManager` valida o `taskId` e provisiona um diretório isolado via `git worktree`.
4. A tarefa é executada dentro do sandbox físico.
5. Após conclusão, o worktree e a branch são removidos via `deprovision`.

## Invariantes Globais (nunca violar)
1. **No-Shell Policy:** Uso exclusivo de `execa` com `shell: false` e arrays de argumentos.
2. **Fallback Seguro:** Qualquer incerteza no roteamento deve resultar em `NORMAL_CHAT`.
3. **Desacoplamento de LLM:** O Core nunca deve depender de uma implementação específica de API de IA.
4. **TDD Estrito:** Nenhum código de produção sem teste correspondente.
5. **Validação na Borda:** Todo dado externo (API, Usuário, taskId) deve ser validado no ponto de entrada.
6. **Isolamento Físico:** Nenhuma tarefa de desenvolvimento deve ser executada diretamente na branch de trabalho principal.

## Restrições Técnicas Ativas
- **Runtime:** Node.js v24.
- **Threshold de Confiança:** 0.7.
- **Padrão de Branch:** `forge/task-<taskId>`.
- **Raiz de Worktrees:** `.git/greenforge-worktrees/`.
- **Validação taskId:** 1-80 caracteres, alfanumérico + `._-`, sem `/ \ ..`, não pode ser `.` nem começar/terminar com ponto.

## Testes Obrigatórios
| Suite | Arquivo | Cobertura Aproximada | Comando |
|-------|---------|----------------------|---------|
| Smoke Test | `tests/smoke.test.ts` | 1 teste (Integridade) | `npm test` |
| Router Test | `tests/router.test.ts` | 13 testes (Unitário) | `npm test` |
| Worktree Test | `tests/worktree.test.ts` | 15 testes (Integração + Validação) | `npm test` |

## Dependências Externas
| Pacote | Versão | Motivo |
|--------|--------|--------|
| `better-sqlite3` | ^11.0.0 | Persistência determinística rápida. |
| `execa` | ^9.0.0 | Execução segura de processos sem shell. |
| `zod` | ^3.23.0 | Validação de schemas e contratos. |
| `vitest` | ^1.6.0 | Framework de testes rápido e compatível com ESM. |
