# CURRENT_STATE — GreenForge
> Última atualização: Fase 3 | 2026-06-16

## Arquitetura Ativa
- **Arquitetura Hexagonal:** Separação entre core (domínio), ports (interfaces) e infraestrutura (LLM, Git, DB).
- **Orquestração:** Baseada em Intention Router para triagem de prompts.
- **Isolamento:** Uso de Git Worktrees gerenciados pelo `WorktreeManager`.
- **Segurança de FS:** Contratos `SafeResolve` (Anti-Path-Traversal) e `AtomicWrite` (Integridade).

## Módulos e Contratos Vigentes
| Módulo | Arquivo | Contrato Público | Desde |
|--------|---------|------------------|-------|
| `LLMProvider` | `src/core/ports/LLMProvider.ts` | `generate(prompt: string): Promise<string>` | Fase 1 |
| `QwenRouter` | `src/infrastructure/llm/QwenRouter.ts` | `classify(input: string): Promise<Intent>` | Fase 1 |
| `WorktreeManager` | `src/infrastructure/git/WorktreeManager.ts` | `provision(taskId): Promise<WTInfo>`, `deprovision(taskId): Promise<void>`, `list(): Promise<WTInfo[]>` | Fase 2 |
| `SafeResolve` | `src/shared/SafeResolve.ts` | `safeResolve(path, root): Promise<string>`, `safeResolveForWrite(path, root): Promise<string>` | Fase 3 |
| `AtomicWrite` | `src/shared/AtomicWrite.ts` | `atomicWrite(path, content): Promise<void>` | Fase 3 |

## Fluxo Principal
1. Usuário envia prompt.
2. `QwenRouter` classifica a intenção.
3. Se tarefa técnica, `WorktreeManager` provisiona worktree isolado.
4. Qualquer operação de arquivo subsequente deve usar `SafeResolve` para validar acesso.
5. Persistência de arquivos críticos deve usar `AtomicWrite`.

## Invariantes Globais (nunca violar)
1. **No-Shell Policy:** Uso exclusivo de `execa` com `shell: false`.
2. **Fallback Seguro:** Qualquer incerteza no roteamento ou segurança resulta em negação/NORMAL_CHAT.
3. **Desacoplamento de LLM:** Core independente de APIs de IA específicas.
4. **TDD Estrito:** Nenhum código sem teste.
5. **Acesso Restrito:** Escrita permitida apenas dentro do root do worktree autorizado.
6. **Integridade Atômica:** Escritas críticas nunca devem deixar arquivos parciais/corrompidos.

## Restrições Técnicas Ativas
- **Runtime:** Node.js v24.
- **Threshold Confiança:** 0.7.
- **Segurança:** Bloqueio de `taskId` "." e navegação de path (`..`, `/`, `\`).

## Testes Obrigatórios
| Suite | Arquivo | Cobertura Aproximada | Comando |
|-------|---------|----------------------|---------|
| Smoke Test | `tests/smoke.test.ts` | 1 teste | `npm test` |
| Router Test | `tests/router.test.ts` | 13 testes | `npm test` |
| Worktree Test | `tests/worktree.test.ts` | 15 testes | `npm test` |
| Security Test | `tests/security.test.ts` | 10 testes | `npm test` |

## Dependências Externas
| Pacote | Versão | Motivo |
|--------|--------|--------|
| `better-sqlite3` | ^11.0.0 | Persistência. |
| `execa` | ^9.0.0 | Execução segura. |
| `zod` | ^3.23.0 | Validação. |
| `vitest` | ^1.6.0 | Testes. |
