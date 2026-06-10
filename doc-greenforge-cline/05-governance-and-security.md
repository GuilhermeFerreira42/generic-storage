# GreenForge — 05: Governança e Segurança

> **Status:** ✅ | **Versão:** 2.0.0 | **Data:** 2026-06-09
> **Referências:** Verdant AI Security Model, Cline security settings.

---

## 1. Modelo de Ameaças (Threat Model)

| ID | Ameaça | Mitigação GreenForge |
|---|---|---|
| **T-01** | Path Traversal via Tool Call | `SafeResolve`: Validação de path real contra o root do worktree autorizado. |
| **T-02** | Command Injection em Shell | `execa` com `shell: false` e parametrização obrigatória de argumentos. |
| **T-03** | Exfiltração de Segredos | `AGENTS.md` proíbe leitura de `.env` e arquivos de configuração sensíveis. |
| **T-04** | Persistência Maliciosa | Worktrees são efêmeros e deletados após o merge/fechamento da tarefa. |

---

## 2. Políticas de Blindagem Determinística

### 2.1 Contrato SafeResolve
Toda ferramenta de escrita (`write_to_file`, `insert_content`) deve passar pelo wrapper `ForgeGuard`.

```typescript
function forgeGuard(requestedPath: string, allowedRoot: string) {
    const realPath = fs.realpathSync(path.resolve(requestedPath));
    if (!realPath.startsWith(allowedRoot)) {
        throw new SecurityError("Access Denied: Path outside authorized worktree.");
    }
}
```

### 2.2 Escrita Atômica e Durabilidade
Para evitar arquivos corrompidos em caso de falha de energia ou crash:
1. Escrever em `filename.tmp`.
2. Chamar `fsync()` no file descriptor.
3. `rename()` atômico para o destino final.

---

## 3. Herança de Segurança do Cline

O GreenForge herda as seguintes salvaguardas do Cline:
- **Human-in-the-loop (HITL)**: Aprovação obrigatória para comandos de shell e escrita de arquivos (configurável).
- **Mcp Permissions**: Controle granular de acesso a ferramentas externas.
- **Ignore Files**: Respeito estrito ao `.clineignore` e `.gitignore`.

---
**A segurança não é uma feature, é a fundação do GreenForge.**
