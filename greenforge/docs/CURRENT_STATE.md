# CURRENT_STATE — GreenForge
> Última atualização: Fase 25 em preparação com correções de gaps reais | 2026-07-25

## Estado Atual
- **Projeto:** GreenForge — extensão/orquestrador para Qwen CLI com arquitetura hexagonal.
- **Última fase concluída:** Fase 24 — Prontidão de Produção e Documentação Honesta.
- **Fase em andamento:** Fase 25 — Validação Final de Produção e Deploy.
- **Build:** PASSANDO (`npm run build`).
- **Lint:** PASSANDO (`npm run lint`, 0 erros reportados).
- **Testes:** PASSANDO (`npm test`, 484/486).
- **Validação real (Fase 23):** Smoke test aprovado com litellm nas portas 4000/4001.

## Fase 25 — Validação Final de Produção e Deploy (EM ANDAMENTO)
- **Preparação (concluída no workspace):** CHANGELOG.md criado, .ai-context e CURRENT_STATE atualizados, phase_24_resumo.md gerado.
- **Pendente (desktop Windows 11 do usuário):** Sessão real completa com Qwen CLI + litellm + LLM real, DiffLens, tag v1.0.0, publish.


## Correções Preparatórias Pós-Teste Real Qwen CLI
O teste real com Qwen CLI mostrou que as tools MCP aparecem, mas o modelo tende a resolver sozinho com tools nativas (`write_file`, `agent`) em vez de chamar `greenforge_start`. Também mostrou que o runtime ainda precisava de opt-in para LiteLLM real e que o roteador era rígido demais para tarefas não-código.

Correções aplicadas:
- `Intent` expandido para `NORMAL_CHAT`, `DEVELOPMENT_TASK`, `WRITING_TASK`, `PLANNING_TASK`, `RESEARCH_TASK`.
- `QwenRouter` atualizado para aceitar e validar essas novas intenções sem quebrar fallback seguro para `NORMAL_CHAT`.
- `QwenHookHandler.handleUserPromptSubmit()` agora retorna uma instrução explícita para o Qwen CLI chamar `mcp__greenforge__greenforge_start` em tarefas `DEVELOPMENT_TASK`, incluindo `workspaceRoot` quando disponível.
- `HookCommandAdapter` preserva essa instrução no `decision.message` do hook blocking `UserPromptSubmit`.
- `QwenCommandHandler.handleStart()` aceita `--workspaceRoot=...` e faz `git init` automático se o workspace ainda não for um repositório Git.
- `McpGreenForgeServer` adicionou `workspaceRoot` opcional ao schema da tool `greenforge_start`.
- `QwenExtensionRuntime` continua mockado por padrão, mas pode usar LiteLLM real com `GREENFORGE_USE_REAL_LITELLM=true` fora de `NODE_ENV=test`; router usa porta 4001 e planner usa porta 4000.
- Novo teste `tests/phase25-gap-fixes.test.ts`; suíte local final: 491/491.

Status: implementado localmente e aguardando validação real no desktop.

## Checklists Fase 25

### ✅ Checklist A — Preparação (concluída)
- [x] CHANGELOG.md criado com todas as fases 0-24
- [x] .ai-context atualizado para Fase 25
- [x] phase_24_resumo.md gerado
- [x] Build, lint e testes verificados (484/486)

### ⬜ Checklist B — Validação real (executar no Windows 11)
- [ ] `npm install && npm run build && npm test`
- [ ] Subir litellm nas portas 4000 (large) e 4001 (small)
- [ ] `npm run llm:smoke` — confirmar ok: true
- [ ] `qwen extensions link .` (recarregar extensão)
- [ ] Sessão Qwen CLI real: prompt de desenvolvimento → hook UserPromptSubmit → chamada MCP `mcp__greenforge__greenforge_start` → plano → aprovação → execução por agentes
- [ ] DiffLens gerar `GREENFORGE_AUDIT.md` com sucesso
- [ ] Verifier emitir APPROVED
- [ ] Validar isolamento via Git Worktrees

### ⬜ Checklist C — Deploy (executar no Windows 11 após validação)
- [ ] `git tag v1.0.0`
- [ ] `git push origin v1.0.0`
- [ ] Publicar no registry de extensões Qwen

## Próxima Fase Recomendada
Concluir a Fase 25 com a validação real no desktop. Após tag v1.0.0, o projeto está em produção.
