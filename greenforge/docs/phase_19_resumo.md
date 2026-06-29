# Fase 19 — Servidor MCP Real (Resumo)

> **Status:** CONCLUÍDA AGUARDANDO APROVAÇÃO HUMANA
> **Data:** 2026-06-28
> **Testes totais:** 445 (8 novos da Fase 19)

---

## Objetivo

Implementar o servidor MCP real do GreenForge usando o `@modelcontextprotocol/sdk`, registrando 10 tools com prefixo `greenforge_` e conectando via `StdioServerTransport`, sem modificar os handlers existentes.

---

## Arquivos Criados

| Arquivo | Descrição |
|---------|-----------|
| `src/integration/qwen/McpGreenForgeServer.ts` | Servidor MCP via stdio usando @modelcontextprotocol/sdk. Registra 10 tools com prefixo `greenforge_`. Delega para QwenCommandHandler e PlanReviewHandler existentes |
| `tests/mcp-server.test.ts` | 8 testes cobrindo instanciação, tools registradas, schemas Zod, delegação para handlers, StdioServerTransport e stderr logs |
| `docs/phase_19_resumo.md` | Este documento |

## Arquivos Modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/index.ts` | Argumento "mcp" cria McpGreenForgeServer e conecta via StdioServerTransport. Sem argumentos: ajuda breve. "hook": placeholder para futura Fase 20 |
| `.ai-context` | Atualizado com referências à Fase 19 |
| `docs/CURRENT_STATE.md` | Atualizado com McpGreenForgeServer, 445 testes, Fase 19 |
| `docs/DECISION_LOG.md` | 4 entradas da Fase 19 adicionadas (ADD, MOD, RULE, TECH) |
| `docs/BACKLOG_FUTURO.md` | Fase 19 registrada com entregáveis |

---

## 10 Tools MCP Registradas

| Tool | Descrição | Handler Delegado |
|------|-----------|-----------------|
| `greenforge_start` | Inicia nova tarefa com planejamento | QwenCommandHandler |
| `greenforge_status` | Exibe estado do runtime | QwenCommandHandler |
| `greenforge_list` | Lista tarefas conhecidas | QwenCommandHandler |
| `greenforge_approve` | Aprova plano e inicia execução | QwenCommandHandler |
| `greenforge_abort` | Aborta tarefa em andamento | QwenCommandHandler |
| `greenforge_review` | Mostra visão de revisão do plano | PlanReviewHandler |
| `greenforge_feedback` | Registra feedback humano | PlanReviewHandler |
| `greenforge_reject` | Rejeita plano com motivo | PlanReviewHandler |
| `greenforge_needs_changes` | Solicita mudanças no plano | PlanReviewHandler |
| `greenforge_review_status` | Consulta status de revisão | PlanReviewHandler |

Cada tool usa `inputSchema` com Zod para validação de parâmetros de entrada.

---

## Principais Decisões

### MCP Server via stdio, não HTTP
O transporte usa `StdioServerTransport` (stdin/stdout JSON-RPC). Stdio é o padrão MCP para CLI integrations. HTTP hooks serão substituídos em fase futura.

### Logs em stderr, nunca stdout
No modo MCP, stdout é reservado exclusivamente para o protocolo JSON-RPC. Todos os logs vão para `console.error` (stderr).

### Delegação para handlers existentes sem modificação
`McpGreenForgeServer` delega para `QwenCommandHandler` e `PlanReviewHandler` já existentes, sem modificá-los. Isso garante que a lógica de negócio permanece isolada e testável independentemente do servidor MCP.

### InternalMockLLMProvider como padrão
O servidor MCP usa `InternalMockLLMProvider` como provider padrão, mantendo a mesma estratégia de isolamento das fases anteriores.

### Modo "hook" como placeholder
O argumento "hook" no `src/index.ts` é um placeholder para a futura Fase 20 (Modo Hook), que implementará o `HookCommandAdapter`.

### Tipo literal 'text' em content
O MCP SDK exige `type: 'text'` como literal type, não string. Uso de `as const` ou tipagem explícita para satisfazer overloads do `McpServer.tool()`.

---

## Isolamento de Testes

- ✅ Nenhum teste chama Qwen real
- ✅ Nenhum teste chama LLM real
- ✅ Nenhum teste chama MCP real (servidor em memória)
- ✅ Nenhum teste faz chamada de rede
- ✅ Nenhum teste faz git destrutivo
- ✅ `InternalMockLLMProvider` como provider padrão

---

## Testes

### Distribuição dos 8 testes novos

| Seção | Testes | Descrição |
|-------|--------|-----------|
| Instanciação | 1 | McpGreenForgeServer cria com 10 tools |
| Tools registradas | 1 | Verifica nomes das 10 tools |
| Schemas Zod | 1 | inputSchema válido para cada tool |
| Delegação para handlers | 2 | Comandos delegam para QwenCommandHandler e PlanReviewHandler |
| StdioServerTransport | 1 | Conecta via StdioServerTransport |
| Stderr logs | 2 | Logs vão para stderr, não stdout |

### Total final de testes: 445

---

## Comandos Finais

```
npm test        → 445/445 passing
npm run build   → 0 errors
npm run lint    → 0 errors, 0 warnings
```

---

## Confirmações

- [x] Nenhuma fase futura foi iniciada
- [x] Nenhum commit foi feito
- [x] Nenhum teste chama Qwen real, LLM real, MCP real, rede ou git destrutivo
- [x] Handlers existentes não foram modificados
- [x] Todos os testes de regressão passam
- [x] Build e lint limpos

**PAUSADO. Aguardando aprovação humana antes de qualquer próxima ação.**