# GreenForge — 04: Playbooks Operacionais

> **Status:** ✅ | **Versão:** 2.0.0 | **Data:** 2026-06-09
> **Referências:** doc-old/04-operational-playbooks.md, Git Worktree manual.

---

## 1. Gestão de Incidentes de Worktree

### 1.1 Worktree Órfão (Disco Cheio / Processo Morto)
**Cenário:** O VS Code ou a CLI sofre um crash e deixa um diretório em `~/.cline/worktrees/` sem uma tarefa ativa no DB.

**Playbook:**
1. Execute `git worktree list` na raiz do repositório original.
2. Identifique caminhos que não constam no `StateManager`.
3. Force a remoção via `git worktree prune`.
4. O `BootReconciler` do GreenForge deve automatizar este passo no `activate()` do `extension.ts`.

### 1.2 Conflito de Lock de Arquivo (Windows)
**Cenário:** Tentativa de deletar worktree falha porque um processo (ex: servidor de dev de um subagente) ainda segura o lock de um arquivo.

**Playbook:**
1. Tentar `TaskKill` em processos node/bun residuais no sub-path.
2. Se persistir, marcar tarefa como `CLEANUP_PENDING` e tentar novamente no próximo boot.

---

## 2. Falhas de Orquestração

### 2.1 Divergência de Subagente (Hallucination Loop)
**Cenário:** Um subagente entra em loop infinito ou falha repetidamente em uma subtarefa.

**Playbook:**
1. O `ToolExecutor` deve detectar repetição de ferramentas idênticas via `loop-detection.ts`.
2. Interromper subagente e notificar o Orquestrador Principal.
3. Retroceder a tarefa principal para o estado `PLANNING` para reavaliação humana.

---

## 3. Segurança e Auditoria

### 3.1 Violação de Acesso (Escrita fora do Worktree)
**Cenário:** Um agente tenta usar `write_to_file` em um path absoluto fora do seu diretório isolado.

**Playbook:**
1. O `SafeResolve` lança `WorktreeAccessViolationError`.
2. A tarefa é IMEDIATAMENTE suspensa.
3. O log de segurança é persistido com o prompt e o path tentado.
4. Requer intervenção manual do usuário para "unblock".

---
**Estes playbooks devem ser seguidos rigorosamente pelo suporte técnico e pela lógica de auto-healing.**