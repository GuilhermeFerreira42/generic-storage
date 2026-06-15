# DECISION_LOG.md

## Projeto: GreenForge

---

### [2026-06-15] ADR-00: Inicialização do Projeto
- **Status:** Aprovado
- **Contexto:** Necessidade de iniciar a estrutura base do GreenForge seguindo o protocolo de Fase 0.
- **Decisão:** Criado diretório `greenforge` como repositório independente, configurado com TypeScript, Vitest e Node.js v24.
- **Consequências:** Base sólida para as próximas fases de implementação (Router, Worktree, etc.).

### [2026-06-08] ADR-05: Stack Tecnológica (Herdado do Design)
- **Status:** Aprovado
- **Decisão:** Node.js v22+ com `better-sqlite3` e `execa`. Rejeição do Bun.
- **Justificativa:** Estabilidade máxima com Qwen CLI e suporte nativo a transações.
