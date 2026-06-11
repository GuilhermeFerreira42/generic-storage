# CHANGELOG — Hardening v1.0.0
## GreenForge — Resoluções de Vulnerabilidades

> **Data:** 2026-06-08
> **Status:** ✅ Implementação Completa
> **Contexto:** Design inicial focado em segurança pós-análise de falhas do GreenForge v1 (Legado).

---

## 📋 Sumário Executivo

A arquitetura do GreenForge v1 (legado) era vulnerável a corrupção de estado e manipulação de arquivos fora do contexto. A v2 resolve 100% destes riscos através de 3 pilares:
1.  **Isolamento Físico via Git Worktrees.**
2.  **Persistência Atômica via SQLite WAL.**
3.  **Contratos Determinísticos de Path Traversal.**

---

## 🔴 VULNERABILIDADE 1: Path Traversal em Nomes de Arquivos

> **Severidade:** CRÍTICO
> **Componente Afetado:** FileSystem Manager

### Problema Original (v1)
O sistema aceitava nomes de arquivos como `../../.ssh/id_rsa`. Como usava `path.join()`, um agente mal-intencionado (ou alucinado) podia vazar segredos do sistema.

### Resolução na v2 — SafeResolve Contract
Implementação obrigatória de `realpath()` seguido de validação de prefixo contra o `worktree_path`.
- **Localização:** `09-hardening-deterministic-contracts.md#seção-3.1`

---

## 🔴 VULNERABILIDADE 2: State Inconsistency após Crash
> **Severidade:** ALTO
> **Componente Afetado:** State Engine

### Problema Original (v1)
Usava arquivos JSON para salvar o estado. Um crash durante o `write` deixava o JSON corrompido, impedindo o boot da CLI.

### Resolução na v2 — SQLite + Atomic Write
Uso de SQLite com modo WAL e padrão de escrita temporária (`.tmp` + `rename`).
- **Localização:** `03-technical-spec-and-data.md#seção-1.1`

---

## ✅ Tabela de Validação Consolidada

| Vulnerabilidade | ADR | Seção Técnica | Seção Segurança | Status |
|---|---|---|---|---|
| Path Traversal | P-02 | §3.1 em 09 | §4.3 em 05 | ✅ |
| State Corruption | P-01 | §1.1 em 03 | §5 em 05 | ✅ |
| Command Injection | P-03 | §3.1 em 03 | §4.3 em 05 | ✅ |

---

## 🟢 VULNERABILIDADE 3: Superfície de Ataque em Runtime (Migração Qwen)
> **Severidade:** BAIXO/MODERADO
> **Componente Afetado:** Extension Host Integration

### Problema Original (Gemini CLI)
A dependência de uma função `activate()` que recebia um objeto `context` com permissões de registro em runtime aumentava a superfície de ataque se a extensão fosse comprometida.

### Resolução na v2 (Qwen CLI) — Tripartite Plugin Model
Migração para o modelo Qwen CLI:
1. **Skill Manifest** (estático)
2. **Hooks JSON** (declarativo)
3. **MCP Server** (isolado via RPC)
Isso reduz a necessidade de execução de código privilegiado durante o boot da CLI.
- **Localização:** `06-api-and-extensibility.md#seção-1`

