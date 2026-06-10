# GreenForge — 06: API e Extensibilidade

> **Status:** ✅ | **Versão:** 2.0.0 | **Data:** 2026-06-09
> **Referências:** extension.ts, registry.ts, vscode.ExtensionContext

---

## 1. Comandos do VS Code

O plugin registra novos comandos no Command Palette do VS Code:

- `GreenForge: Start Task`: Inicia o workflow estruturado ignorando o chat casual.
- `GreenForge: Approve Plan`: Atalho para aprovar o `GREENFORGE_PLAN.md` atual.
- `GreenForge: List Active Worktrees`: Abre a visão de gerenciamento de isolamento.
- `GreenForge: View DiffLens Report`: Abre o relatório explicativo da última alteração.

---

## 2. Ferramentas Customizadas (Custom Tools)

O GreenForge registra ferramentas exclusivas no `ToolExecutor` do Cline:

| Nome da Ferramenta | Parâmetros | Descrição |
|---|---|---|
| `forge_clarify` | `questionIndex, answer` | Envia resposta para o loop de clarificação. |
| `forge_approve` | `planHash` | Sinaliza aprovação do plano para transição de estado. |
| `forge_delegate` | `agentName, taskDescription` | Inicia manualmente um subagente especialista. |
| `forge_get_agents_rules` | - | Retorna as regras consolidadas do `AGENTS.md`. |

---

## 3. Extensibilidade via MCP

O GreenForge é totalmente compatível com o Model Context Protocol (MCP). 
- Desenvolvedores podem criar servidores MCP para fornecer ferramentas específicas de domínio (ex: ferramentas de deploy, infraestrutura como código) que os subagentes GreenForge podem invocar.
- As permissões de acesso do MCP são gerenciadas pelo núcleo do Cline, mas auditadas pelo `@Code-Reviewer` do GreenForge.

---

## 4. Hooks para Plugins de Terceiros

O GreenForge expõe um sistema de eventos internos para outras extensões do VS Code:
- `onForgeTaskStart`
- `onForgePlanGenerated`
- `onForgeDiffLensReady`

---
**A modularidade garante que o GreenForge possa evoluir com o ecossistema Cline.**
