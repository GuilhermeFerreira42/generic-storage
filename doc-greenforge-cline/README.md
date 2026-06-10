# GreenForge (Cline Plugin)

O GreenForge é um plugin de orquestração avançada para o **Cline**, projetado para replicar as funcionalidades de engenharia autônoma do **Verdant AI**.

## 🚀 Funcionalidades Principais

- **Plan Mode (Verdant Style)**: Ciclo de clarificação (5-7 perguntas) e geração de Blueprints antes da escrita de código.
- **Git Worktree Isolation**: Cada tarefa roda em um ambiente físico isolado, prevenindo poluição do workspace principal.
- **Parallel Subagents**: Orquestração de especialistas (@Explorer, @Verifier, @Reviewer) para execução simultânea de subtarefas.
- **DiffLens**: Relatórios de mudanças focados na causalidade ("por que") e não apenas no diff textual.
- **Hardening Determinístico**: Escrita atômica de arquivos e validação de paths (SafeResolve).

## 📂 Estrutura da Documentação

1.  [GREENFORGE_CLINE_DESIGN.md](./GREENFORGE_CLINE_DESIGN.md) — Design principal e ADRs.
2.  [01-vision-and-architecture.md](./01-vision-and-architecture.md) — Visão geral e diagramas.
3.  [02-functional-requirements.md](./02-functional-requirements.md) — RFs e RNFs detalhados.
4.  [03-technical-spec-and-data.md](./03-technical-spec-and-data.md) — Como o plugin se integra ao core do Cline.
5.  [04-operational-playbooks.md](./04-operational-playbooks.md) — Guia de resolução de incidentes.
6.  [05-governance-and-security.md](./05-governance-and-security.md) — Modelo de segurança e governança.
7.  [06-api-and-extensibility.md](./06-api-and-extensibility.md) — Comandos VS Code e hooks.
8.  [09-hardening-deterministic-contracts.md](./09-hardening-deterministic-contracts.md) — Contratos de blindagem.

## 🛠️ Instalação para Desenvolvedores

1. Clone o repositório Cline: `git clone https://github.com/cline/cline`.
2. Siga as instruções em `cline-main/CONTRIBUTING.md` para configurar o ambiente.
3. Aplique as modificações descritas em `03-technical-spec-and-data.md` nos arquivos do core.
4. Adicione as configurações de subagentes em `~/Documents/Cline/Agents/`.

---
**GreenForge — The Orchestrator's Anvil.**
