# Relatório de Progresso — Evolução do GreenForge

## Status Geral

Este documento acompanha o progresso de implementação fase por fase.

**Última atualização:** 2025-06-18
**Fase atual:** Fase 1 — Backend Node.js com Express e WebSocket (EM ANDAMENTO)
**Espaço disponível:** 330M (504M total, 30% usado)
**Diretório do projeto:** /workspace/greenforge-ide

---

## Resumo do Progresso Atual

### O que já foi implementado (código escrito):

**Fase 1 - Estrutura do Backend:**
- ✅ `server/package.json` - Configuração de dependências
- ✅ `server/tsconfig.json` - Configuração TypeScript
- ✅ `server/src/index.ts` - Servidor Express + WebSocket
- ✅ `server/src/ws/schemas.ts` - Schemas Zod para mensagens
- ✅ `server/src/ws/handler.ts` - Handler de conexões WebSocket
- ✅ `server/src/agent/loop.ts` - Loop agêntico ReAct com Anthropic
- ✅ `server/src/agent/prompts.ts` - System prompts por modo
- ✅ `server/src/tools/registry.ts` - Tool Registry central
- ✅ `server/src/tools/types.ts` - Interface Tool
- ✅ `server/src/tools/filesystem/readFile.ts` - Ferramenta read_file
- ✅ `server/src/tools/filesystem/writeFile.ts` - Ferramenta write_file
- ✅ `server/src/tools/filesystem/listDirectory.ts` - Ferramenta list_directory
- ✅ `server/src/db/init.ts` - Inicialização SQLite
- ✅ `server/src/security/trustedFolders.ts` - Política de paths permitidos
- ✅ `server/src/security/secretRedactor.ts` - Redação de segredos

**O que falta implementar na Fase 1:**
- ⏸️ `server/src/db/schema.sql` - Schema SQL do banco (não existe ainda)
- ⏸️ `server/src/db/sessions.ts` - SessionStore (não existe ainda)
- ⏸️ `server/src/tools/filesystem/searchInFiles.ts` - Ferramenta search_in_files (não existe)
- ⏸️ `server/src/tools/shell/executeCommand.ts` - Ferramenta execute_command (não existe)
- ⏸️ `server/src/tools/web/webFetch.ts` - Ferramenta web_fetch (não existe)
- ⏸️ `src/hooks/useAgentSocket.ts` - Hook WebSocket no frontend (não existe)
- ⏸️ Instalação de dependências (pendente de validação)
- ⏸️ Testes de conexão (pendente de validação)

### Próximos passos imediatos:
1. Criar `server/src/db/schema.sql` com as tabelas sessions, messages, tool_calls, checkpoints
2. Criar `server/src/db/sessions.ts` com a classe SessionStore
3. Criar ferramentas faltantes: searchInFiles, executeCommand, webFetch
4. Criar hook `useAgentSocket.ts` no frontend
5. Atualizar checklist da Fase 1 no RELATORIO_PROGRESSO.md

---

## Fase 0 — Preparação inicial do projeto

### Checklist

- [ ] Confirmar que o frontend atual está funcionando antes de qualquer modificação.
- [ ] Rodar o projeto atual com `npm run dev`.
- [ ] Verificar se a IDE web abre corretamente no navegador.
- [ ] Verificar se o Monaco Editor carrega.
- [ ] Verificar se o Explorer de arquivos atual funciona.
- [ ] Verificar se o sistema de abas funciona.
- [ ] Verificar se o terminal simulado atual funciona.
- [ ] Verificar se o chat atual com agente mock responde.
- [ ] Verificar se o `ApprovalModal` abre corretamente.
- [ ] Verificar se o `DiffEditor` mostra diferenças corretamente.
- [ ] Criar uma branch Git antes da implementação.
- [ ] Garantir que o projeto esteja limpo com `git status`.
- [ ] Criar commit inicial de segurança antes das mudanças.
- [ ] Adicionar ou revisar `.gitignore`.
- [ ] Garantir que `.env`, `.env.*`, `*.key`, `*.pem`, `*.cert`, `id_rsa`, `id_ed25519`, `greenforge.db` e `.greenforge-workers/` estejam ignorados.
- [ ] Definir o caminho real do workspace que será usado pelo backend.
- [ ] Definir qual provider LLM será usado primeiro: Anthropic, OpenAI ou Gemini.
- [ ] Criar chave de API do provider escolhido.
- [ ] Nunca inserir chave de API diretamente no código.
- [ ] Criar arquivo `.env` apenas localmente.

### Arquivos criados/modificados

Nenhum até o momento.

---

## Fase 1 — Backend Node.js com Express e WebSocket

### Checklist

#### Estrutura inicial

- [ ] Criar pasta `server/` na raiz do projeto.
- [ ] Criar `server/package.json`.
- [ ] Criar `server/tsconfig.json`.
- [ ] Criar pasta `server/src/`.
- [ ] Criar `server/src/index.ts`.
- [ ] Criar pasta `server/src/ws/`.
- [ ] Criar `server/src/ws/handler.ts`.
- [ ] Criar `server/src/ws/schemas.ts`.
- [ ] Criar pasta `server/src/agent/`.
- [ ] Criar pasta `server/src/tools/`.
- [ ] Criar pasta `server/src/db/`.
- [ ] Criar pasta `server/src/security/`.
- [ ] Criar pasta `server/src/mcp/`.

#### Dependências do backend

- [ ] Instalar `express`.
- [ ] Instalar `ws`.
- [ ] Instalar `cors`.
- [ ] Instalar `dotenv`.
- [ ] Instalar `zod`.
- [ ] Instalar `better-sqlite3`.
- [ ] Instalar `tsx`.
- [ ] Instalar `typescript`.
- [ ] Instalar `@types/express`.
- [ ] Instalar `@types/ws`.
- [ ] Instalar `@types/node`.
- [ ] Instalar `@types/better-sqlite3`.

#### Configuração do servidor

- [ ] Configurar Express.
- [ ] Configurar CORS usando `FRONTEND_ORIGIN`.
- [ ] Criar HTTP server com `createServer`.
- [ ] Criar WebSocket server com `WebSocketServer`.
- [ ] Bloquear conexões WebSocket de origem não autorizada.
- [ ] Inicializar banco SQLite no startup.
- [ ] Criar endpoint `GET /api/sessions`.
- [ ] Criar endpoint `DELETE /api/sessions/:id`.
- [ ] Garantir que o backend rode na porta `3001`.
- [ ] Usar `console.error` para logs do servidor.
- [ ] Evitar `console.log` no backend, especialmente por compatibilidade futura com MCP stdio.

#### Schemas WebSocket

- [ ] Criar schema `chat_message`.
- [ ] Criar schema `approve_action`.
- [ ] Criar schema `cancel_agent`.
- [ ] Criar schema `switch_mode`.
- [ ] Criar schema `terminal_command`.
- [ ] Criar schema `create_checkpoint`.
- [ ] Criar mensagem de saída `agent_token`.
- [ ] Criar mensagem de saída `agent_thinking_done`.
- [ ] Criar mensagem de saída `tool_call`.
- [ ] Criar mensagem de saída `approval_required`.
- [ ] Criar mensagem de saída `tool_result`.
- [ ] Criar mensagem de saída `agent_done`.
- [ ] Criar mensagem de saída `terminal_output`.
- [ ] Criar mensagem de saída `error`.
- [ ] Validar toda mensagem recebida com Zod.
- [ ] Rejeitar mensagens inválidas sem derrubar o servidor.

#### Handler WebSocket

- [ ] Implementar função `handleWSConnection`.
- [ ] Criar helper `send(msg)`.
- [ ] Criar `pendingApprovals` como `Map`.
- [ ] Criar `activeLoops` como `Map`.
- [ ] Ao receber `chat_message`, iniciar loop do agente.
- [ ] Ao receber novo `chat_message` da mesma sessão, cancelar loop anterior.
- [ ] Ao receber `approve_action`, resolver Promise pendente.
- [ ] Ao receber `cancel_agent`, abortar loop ativo.
- [ ] Ao receber `switch_mode`, atualizar modo da sessão.
- [ ] Ao receber `terminal_command`, executar comando pelo backend.
- [ ] Ao receber `create_checkpoint`, criar checkpoint no SQLite.
- [ ] Garantir que erro interno seja enviado ao frontend como mensagem `error`.
- [ ] Garantir que erro interno não derrube o processo Node.js.

#### Frontend WebSocket

- [ ] Criar hook `src/hooks/useAgentSocket.ts`.
- [ ] Conectar em `ws://localhost:3001`.
- [ ] Criar reconexão automática.
- [ ] Atualizar store Zustand quando conectar.
- [ ] Atualizar store Zustand quando desconectar.
- [ ] Receber `agent_token` e anexar ao chat.
- [ ] Receber `agent_thinking_done` e finalizar mensagem.
- [ ] Receber `approval_required` e abrir modal.
- [ ] Receber `tool_call` e mostrar evento no chat.
- [ ] Receber `tool_result` e mostrar resultado no chat.
- [ ] Receber `agent_done` e encerrar estado de loading.
- [ ] Receber `terminal_output` e enviar ao terminal.
- [ ] Substituir agente mock pelo WebSocket real.
- [ ] Manter compatibilidade visual com o chat atual.

#### Aceite da Fase 1

- [ ] Backend inicia sem erro. ⏸️ pendente de validação
- [ ] Frontend conecta ao backend. ⏸️ pendente de validação
- [ ] Frontend mostra estado conectado. ⏸️ pendente de validação
- [ ] Mensagem inválida no WebSocket não derruba servidor. ⏸️ pendente de validação
- [ ] Desligar backend mostra estado desconectado no frontend. ⏸️ pendente de validação
- [ ] Religar backend reconecta automaticamente. ⏸️ pendente de validação
- [ ] Nenhuma chave de API aparece no console. ⏸️ pendente de validação
- [ ] Nenhum erro TypeScript bloqueante. ⏸️ pendente de validação

### Arquivos criados/modificados

Nenhum até o momento.

---

## Fase 2 — Integração com LLM real e loop agêntico ReAct

### Arquivos criados/modificados

Nenhum até o momento.

---

## Fase 3 — Tool Registry e ferramentas reais

### Arquivos criados/modificados

Nenhum até o momento.

---

## Fase 4 — Persistência com SQLite

### Arquivos criados/modificados

Nenhum até o momento.

---

## Fase 5 — Modos de execução e segurança avançada

### Arquivos criados/modificados

Nenhum até o momento.

---

## Fase 6 — MCP — Model Context Protocol

### Arquivos criados/modificados

Nenhum até o momento.

---

## Fase 7 — Multi-agente com Git Worktrees (opcional)

### Arquivos criados/modificados

Nenhum até o momento.

---

## Resumo Final

**Total de fases completadas:** 0/7

**Instruções para teste:** A serem preenchidas ao final da implementação.
