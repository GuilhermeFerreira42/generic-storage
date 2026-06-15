# BACKLOG_FUTURO.md — Backlog de Desenvolvimento GreenForge

Este documento segue o Protocolo de Arquivamento Progressivo v1.2.

---

## 🌊 ONDA 0: ALICERCE (Fase 0)
**Status:** CONCLUÍDO ✅

### Fase 0: Inicialização e Setup
- **Objetivo:** Preparar o ambiente, estrutura de diretórios e artefatos de memória.
- **Critérios de Aceite:**
  - [x] Estrutura de pastas básica criada (`src`, `tests`, `docs`, `documentacao`).
  - [x] `package.json`, `tsconfig.json` e `vitest.config.ts` operacionais.
  - [x] Dependências críticas instaladas (`better-sqlite3`, `execa`).
  - [x] `npm test` e `npm run build` passando.
  - [x] Artefatos de memória (`CURRENT_STATE`, `DECISION_LOG`, `BACKLOG_FUTURO`, `ARCHIVING_PROTOCOL`) criados conforme v1.2.
  - [x] `.ai-context` e `.humano` configurados.
  - [x] `.qwenignore` configurado.
- **CONTRATOS_DA_ONDA:**
  - **Segurança:** No-Shell Policy estabelecida no `package.json`.
  - **Qualidade:** TDD estrito como regra para as próximas fases.

---

## 🌊 ONDA 1: NÚCLEO E ISOLAMENTO (Fases 1-3)
**Status:** PENDENTE ⏳

### Fase 1: Intention Router (GF-ROUTER)
- **Status:** PENDENTE
- **Pré-requisitos:** Fase 0 concluída.
- **Objetivo:** Implementar a lógica que distingue comandos técnicos de chat normal.
- **Critérios de Aceite:**
  - [ ] Implementação de `QwenRouter.ts` utilizando API Qwen 2.5.
  - [ ] Cobertura de testes unitários para 10+ cenários de intenção.
  - [ ] Precisão de classificação > 90% nos cenários de teste.
- **CONTRATOS_DA_ONDA:**
  - **Interface:** `Router.classify(input: string): Promise<IntentResult>`

### Fase 2: Worktree Manager (GF-ISOLATOR)
- **Status:** PENDENTE
- **Pré-requisitos:** Fase 1 iniciada.
- **Objetivo:** Gerenciar o ciclo de vida de Git Worktrees para isolamento de tarefas.
- **Critérios de Aceite:**
  - [ ] Provisionamento e deprovisionamento de worktrees via `git worktree`.
  - [ ] Prevenção de conflitos de branch e diretório.
  - [ ] Testes de integração com Git real.
- **CONTRATOS_DA_ONDA:**
  - **Infra:** Proibido deixar diretórios órfãos após falha no provisionamento.

### Fase 3: Segurança e Hardening (SafeResolve)
- **Status:** PENDENTE
- **Pré-requisitos:** Fase 2 iniciada.
- **Objetivo:** Implementar contratos de blindagem contra Path Traversal e garantir escritas atômicas.
- **Critérios de Aceite:**
  - [ ] `SafeResolve.ts` validando prefixos contra o worktree root.
  - [ ] `AtomicWrite` usando padrão `.tmp -> fsync -> rename`.
  - [ ] Testes de segurança tentando invasão de diretórios (Path Traversal).
- **CONTRATOS_DA_ONDA:**
  - **Segurança:** Inviolabilidade do `SafeResolve` em todas as operações de FS.

---

## 🌊 ONDA 2: ORQUESTRAÇÃO E PERSISTÊNCIA (Fases 4-7)
**Status:** PENDENTE ⏳

*(Backlog detalhado será expandido conforme o progresso das ondas anteriores)*
