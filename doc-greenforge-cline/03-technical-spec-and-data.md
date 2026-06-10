# GreenForge — 03: Especificação Técnica e Dados (NEXUS Protocol)

> **Status:** ✅ | **Versão:** 2.0.0 | **Data:** 2026-06-09
> **Referências:** Better-SQLite3, Cline StateManager, VS Code API.

---

## 9. Interfaces de Componentes e Assinaturas

### 9.1 Orchestrator Core (GF-CORE)
Ponto central de controle de transição de estados.

**Interfaces Públicas:**
```typescript
class GFOrchestrator {
    /** Inicia o workflow GreenForge para uma nova tarefa */
    public async startTask(prompt: string): Promise<string>; // returns taskId

    /** Processa a resposta de clarificação e transita para PLANNING */
    public async submitAnswers(taskId: string, answers: string[]): Promise<PlanResult>;

    /** Executa o merge do worktree após aprovação final */
    public async finalizeTask(taskId: string): Promise<void>;
}
```

**Eventos:**
- `onPhaseChange`: Emitido quando a tarefa muda de fase (ex: `CLARIFYING` -> `PLANNING`).
  - Payload: `{ taskId: string, from: string, to: string, timestamp: number }`.

---

### 9.2 Persistence Layer (GF-DATA)
Singleton para gestão do SQLite (Better-SQLite3).

**Assinaturas:**
```typescript
interface IForgeStorage {
    saveTask(task: ForgeTaskMetadata): void;
    getTask(taskId: string): ForgeTaskMetadata | undefined;
    updateStatus(taskId: string, status: ForgeStatus): void;
}
```

**Payload de Estado (Exemplo Real):**
```json
{
  "taskId": "01HRA2...",
  "status": "BUILDING",
  "worktreePath": "C:\\Users\\User\\.cline\\worktrees\\task-123",
  "planHash": "sha256:e3b0c442...",
  "subagents": [
    { "id": "coder-1", "agent": "CODER", "status": "RUNNING" }
  ]
}
```

---

## 10. Integrações Externas e Protocolos

### 10.1 LLM Gateway (Gemini API)
- **Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`
- **Protocolo:** HTTPS / JSON
- **Request (Exemplo Curl):**
```bash
curl https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$API_KEY \
    -H 'Content-Type: application/json' \
    -X POST \
    -d '{
      "contents": [{
        "parts":[{ "text": "Classifique este prompt: Refatore auth.ts" }]
      }]
    }'
```
- **Fallback:** Em caso de erro 429 (Rate Limit), o sistema aplica Backoff Exponencial (base 2s, max 3 tentativas). Em caso de erro 401, suspende a tarefa e notifica o usuário via Webview.

---

## 11. Componente: DiffLens Engine (GF-LENS)

**Interfaces Públicas:**
```typescript
interface IDiffLens {
    /** Gera relatório explicativo a partir do diff bruto */
    generateReport(diff: string, plan: string): Promise<DiffReport>;
}

type DiffReport = {
    summary: string; // Explicação em prosa
    changes: Array<{
        file: string;
        reason: string;
        impactScore: number; // 1-10
    }>;
};
```

---
**Este documento serve como guia de implementação para desenvolvedores Backend.**
