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

### [2026-06-15] ADR-01: Desacoplamento do LLM Provider no Router
- **Status:** Aprovado
- **Contexto:** Necessidade de testar o Router sem depender de APIs reais e permitir troca de modelos.
- **Decisão:** Criada a interface `LLMProvider` em `src/core/ports/`. O `QwenRouter` depende desta abstração.
- **Consequências:** Facilidade de teste unitário via Mocks e flexibilidade futura para suportar outros provedores de LLM.

### [2026-06-15] ADR-02: Validação Robusta de Respostas do LLM com Zod
- **Status:** Aprovado
- **Contexto:** Garantir que o Router falhe de forma segura (`NORMAL_CHAT`) caso o LLM retorne dados inválidos ou fora do intervalo de confiança.
- **Decisão:** Implementado schema de validação via `zod` no `QwenRouter`.
- **Consequências:** Proteção contra intenções desconhecidas e valores de confiança malformados (strings, fora de 0-1, ausentes).
