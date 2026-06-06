# 🛠️ RELATÓRIO DE PROGRESSO E HANDOVER TÉCNICO — GreenForge IDE

**Última Atualização:** 2026-06-06 14:15 (Brasília)
**Versão do Documento:** 2.5 (Handover Ready)
**Estado Geral:** MVP Funcional com Backend Robô e Frontend Estabilizado.

---

## 1. 🚀 VISÃO GERAL DO PROJETO
O **GreenForge IDE** é um ambiente de desenvolvimento agêntico de última geração. Diferente de uma IDE comum, ele integra um **Ciclo Adversarial de Agentes** que debatem soluções antes de aplicá-las ao código.

*   **Stack:** Next.js 15 (Frontend), Node.js (Backend), WebSocket (Comunicação), SQLite (Persistência), Vitest (Testes).
*   **Diferencial:** Human-in-the-Loop (HITL) com visualização de diffs, sandboxing de comandos e orquestração de múltiplas sessões.

---

## 2. 🏗️ ARQUITETURA E FLUXO DE DADOS
O sistema é dividido em um modelo **Servidor Unificado** (`server.ts`) que serve tanto o app Next.js quanto o servidor WebSocket.

### A. Backend (Motor Agêntico)
*   **Localização:** `server/src/`
*   **Registry de Ferramentas (`tools/`):** Sistema extensível onde cada ferramenta (`read_file`, `write_file`, `execute_command`) define seu esquema JSON, se é destrutiva e como gerar diffs.
*   **Loop ReAct (`agent/loop.ts`):** Motor que processa mensagens, chama o LLM (Anthropic/Gemini), gerencia iterações e solicita aprovações.
*   **Persistência (`db/`):** SQLite (`better-sqlite3`) com tabelas para `sessions`, `messages`, `tool_calls` e `checkpoints`.
*   **Segurança (`security/`):** 
    *   `TrustedFolders`: Bloqueia acesso a arquivos fora do workspace.
    *   `SecretRedactor`: Remove automaticamente chaves de API e segredos dos outputs.
*   **MCP (`mcp/`):** Implementação do Model Context Protocol para conectar ferramentas externas via stdio.

### B. Frontend (Painel de Controle)
*   **Localização:** `app/`, `components/ide/`
*   **Estado Global:** 
    *   `useIDEStore`: Layout, abas, arquivos, terminal e estado do debate.
    *   `useAgentStore`: Estado do streaming de tokens, conexão WS e approvals pendentes.
*   **Comunicação (`hooks/useAgentSocket.ts`):** Canal bidirecional que traduz eventos de rede em atualizações de interface.

---

## 3. ✅ O QUE JÁ FOI REALIZADO (ESTADO ATUAL)

### Estabilidade e Testes
*   **Suíte de Testes (64/64 PASSANDO):** Todos os testes unitários e de integração (backend e frontend) estão verdes.
*   **Ambiente de Teste:** Configurado com SQLite em memória e mocks isolados para componentes React complexos.
*   **Correção Crítica:** `better-sqlite3` foi reconstruído para a versão correta do Node.js, eliminando erros de carregamento de binários.

### Funcionalidades Implementadas
*   **Streaming de Chat:** Respostas do agente aparecem em tempo real.
*   **Histórico Persistente:** Ao recarregar a página, o backend restaura o histórico completo da sessão a partir do SQLite.
*   **Terminal Real:** Execução de comandos shell reais com retorno via WebSocket e suporte a ANSI colors.
*   **Sistema de Arquivos:** `read_file`, `write_file` (com diff), `list_directory` e `search_in_files` funcionais.
*   **Comandos Slash:** Suporte inicial para `/help` e `/reset` processados no backend.
*   **Segurança:** Redação de segredos e bloqueio de arquivos sensíveis (ex: `.env`) ativos.

---

## 4. ⚠️ O QUE AINDA PRECISA SER FEITO (PENDÊNCIAS)

### Curto Prazo (Polimento)
1.  **Integração de Debate Adversarial na UI:** O backend já suporta múltiplos agentes, mas a interface de "Debate Dialético" no chat precisa ser mais fluida com o loop real (hoje foca no agente único).
2.  **Auth Real:** O sistema verifica `auth_token`, mas falta a interface de login/gerenciamento de tokens.
3.  **Painel Git Avançado:** Conectar as ações visuais do Git Panel diretamente aos comandos git do backend (hoje algumas ações são simuladas no VFS local).

### Médio Prazo (Funcionalidades)
1.  **Multi-Agente com Worktrees (Fase 7):** Implementar a criação de branches isoladas em `.greenforge-workers/` para tarefas paralelas.
2.  **Docker Sandbox:** Ativar por padrão o isolamento de comandos shell em containers.
3.  **Suporte Multimodal:** Permitir o envio de imagens (screenshots de erros, layouts) para o agente.

---

## 5. 📖 MANUAL DE OPERAÇÃO PARA A PRÓXIMA IA

### Como rodar o projeto
1.  **Dependências:** `npm install` na raiz.
2.  **Variáveis de Ambiente:** Configure o `.env` (use o `.env.example` como base).
3.  **Desenvolvimento:** `npm run dev`. O sistema estará em `http://localhost:3000`.
4.  **Testes:** `npx vitest run`.

### Estrutura de Mensagens WebSocket (Contrato)
*   **Incoming (Front -> Back):** `chat_message`, `approve_action`, `cancel_agent`, `terminal_command`, `switch_mode`, `create_checkpoint`.
*   **Outgoing (Back -> Front):** `agent_token`, `agent_thinking_done`, `tool_call`, `approval_required`, `tool_result`, `terminal_output`, `session_history`.

### Arquivos Críticos para Manutenção
*   `server/src/ws/handler.ts`: Onde as mensagens chegam e o loop é disparado.
*   `hooks/useAgentSocket.ts`: Onde o frontend decide o que fazer com cada mensagem do servidor.
*   `server/src/agent/loop.ts`: O cérebro que decide quando chamar cada ferramenta.

---

## 6. 🎯 ESTADO DO CÓDIGO (RESUMO)
O código está **limpo, tipado com TypeScript e modularizado**. Os componentes React são isolados e a store (Zustand) é a única fonte de verdade para o estado da IDE. O backend segue princípios de injeção de dependência para facilitar mocks em testes.

**PONTO DE PARADA:** O sistema está rodando, com testes passando e integração básica chat-agente-terminal concluída. A próxima fase deve focar na **Fase 7 (Multi-agente)** e no **Refinamento da UI de Debate**.
