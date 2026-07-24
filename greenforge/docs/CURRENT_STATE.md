# CURRENT_STATE — GreenForge
> Última atualização: Fase 25 em andamento (preparação) | 2026-07-24

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
- [ ] Sessão Qwen CLI real: prompt de desenvolvimento → classificação → plano → aprovação → execução por agentes
- [ ] DiffLens gerar `GREENFORGE_AUDIT.md` com sucesso
- [ ] Verifier emitir APPROVED
- [ ] Validar isolamento via Git Worktrees

### ⬜ Checklist C — Deploy (executar no Windows 11 após validação)
- [ ] `git tag v1.0.0`
- [ ] `git push origin v1.0.0`
- [ ] Publicar no registry de extensões Qwen

## Próxima Fase Recomendada
Concluir a Fase 25 com a validação real no desktop. Após tag v1.0.0, o projeto está em produção.
