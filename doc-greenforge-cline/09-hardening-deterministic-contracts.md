# GreenForge — 09: Hardening e Contratos (NEXUS Protocol)

> **Status:** ✅ | **Versão:** 2.0.0 | **Data:** 2026-06-09
> **Referências:** POSIX fsync, Node.js child_process.

---

## 12. Contratos Determinísticos de I/O

O GreenForge impõe o contrato de **Atomicidade de Escrita** para evitar estados parciais e corrupção de arquivos em repositórios críticos.

### 12.1 Protocolo de Escrita Atômica (GF-WRITE-CONTRACT)

Toda escrita deve seguir rigorosamente estes 4 passos:
1.  **Stage**: Escrita em arquivo temporário `.tmp` no mesmo diretório.
2.  **Sync**: Invocação de `fsync()` para garantir persistência física (persistência de hardware).
3.  **Validate**: Verificação de checksum (opcional para arquivos > 1MB).
4.  **Commit**: `fs.rename()` atômico para o destino final.

**Implementação (Operational Component):**
```typescript
async function atomicWrite(filePath: string, content: string): Promise<void> {
    const tmpPath = `${filePath}.${Date.now()}.tmp`;
    const fd = await fs.open(tmpPath, 'w');
    await fs.writeFile(fd, content);
    await fs.fsync(fd); // Hard-sync
    await fs.close(fd);
    await fs.rename(tmpPath, filePath); // Atomic rename
}
```

---

## 13. Trade-offs e Tensões Arquiteturais

### 13.1 Latência vs. Rigor (Plan Mode)
- **Sacrifício:** Aumentamos o "time-to-first-code" em aprox. 3-5 minutos devido à fase compulsória de clarificação e aprovação de plano.
- **Ganho:** Redução de 70% na taxa de re-work e regressões (estimado com base no workflow do Verdant AI).
- **Decisão Irreversível:** O uso de Git Worktrees para isolamento é fundamental para a segurança; mudar para "In-place Branching" exigiria reescrever toda a camada de segurança do `ToolExecutor`.

---

## 14. Validação e Teste de Sanidade (NEXUS Audit)

Para cada liberação de versão, o sistema deve passar pela suite de **Security Hardening**:
1.  **Path Traversal Attack**: 100 prompts simulando tentativas de acesso a `~/.ssh` ou `/etc/shadow`. Sucesso = 0 escapes.
2.  **Shell Injection Attack**: Teste de argumentos contendo `;`, `&&`, `|`. Sucesso = comandos interpretados como strings literais.
3.  **Atomic Integrity Test**: Crash forçado do processo (`process.exit(1)`) durante o passo de `fsync`. Sucesso = arquivo original permanece intacto após o reboot.

---
**Documento final do Protocolo NEXUS para o projeto GreenForge-Cline.**
