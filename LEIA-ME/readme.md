# 🛠️ GreenForge IDE — Documento Central de Contexto

**Última Atualização:** 2026-06-06
**Versão do Documento:** 3.1 (Reforço de Testes e Correções)
**Estado Geral:** MVP Funcional com Backend Robusto e Suíte de Testes Expandida

---

## 1. 🚀 O Que É o GreenForge IDE

O **GreenForge IDE** é um ambiente de desenvolvimento integrado baseado em web com capacidades agênticas avançadas. Diferente de IDEs tradicionais, ele integra um **agente de IA com ciclo ReAct** que pode ler, escrever e modificar código mediante aprovação humana (Human-in-the-Loop).

### Diferenciais Principais
- **Agente com Aprovação Humana (HITL):** Toda ação destrutiva (escrever arquivos, executar comandos) requer aprovação explícita com visualização de diff.
- **Terminal Real Integrado:** Executa comandos shell reais no sistema, com output streaming via WebSocket.
- **Persistência Completa:** Sessões, mensagens e tool calls são salvos em SQLite local.
- **Segurança Embutida:** TrustedFolders impede acesso fora do workspace; SecretRedactor remove chaves API dos outputs.
- **Extensibilidade via MCP:** Suporte ao Model Context Protocol para conectar ferramentas externas.

---

## 2. 🏗️ Arquitetura do Sistema

### Stack Tecnológico
| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 15, React 19, TypeScript, TailwindCSS, CodeMirror |
| Gerenciamento de Estado | Zustand (useIDEStore, useAgentStore, useDebateStore) |
| Backend | Node.js, Express, WebSocket (ws) |
| Banco de Dados | SQLite (better-sqlite3) |
| LLM | Google Gemini SDK, com suporte a Anthropic |
| Testes | Vitest, React Testing Library, Playwright (E2E) |

### Estrutura de Diretórios
```
greenforge-ide/
├── app/                          # Next.js App Router
├── components/ide/               # Componentes da IDE (ChatPanel, FileExplorer, CodeEditor, Terminal, etc.)
├── hooks/                        # Hooks React (useAgentSocket, useIDEStore)
├── lib/                          # Utilitários e configurações
├── store/                        # Stores Zustand
├── server/src/                   # Backend Node.js
│   ├── agent/loop.ts             # Loop ReAct do agente
│   ├── tools/                    # Registry e ferramentas (read_file, write_file, execute_command, etc.)
│   ├── ws/handler.ts             # Handler de WebSocket
│   ├── db/                       # Inicialização e repositórios SQLite
│   ├── security/                 # TrustedFolders, SecretRedactor
│   └── mcp/                      # Cliente MCP
├── tests/                        # Suíte de testes automatizados
│   ├── unit/backend/             # Testes unitários do backend (Security, Loop, WebSocket, Persistence)
│   ├── unit/frontend/            # Testes unitários do frontend (Componentes e Hooks)
│   ├── integration/              # Testes de integração
│   └── e2e/                      # Testes end-to-end (Playwright)
└── LEIA-ME/                      # Documentação
```

---

## 3. ✅ Funcionalidades Implementadas

### Frontend (Interface e UX)
| Funcionalidade | Status | Detalhes |
|---------------|--------|----------|
| Explorador de Arquivos | ✅ | Criar, renomear, excluir arquivos/pastas (incluindo raiz); expandir/recolher |
| Editor de Código | ✅ | Múltiplas abas, syntax highlight, edição em tempo real |
| Painel de Chat (Agente) | ✅ | Envio de mensagens, streaming de tokens, cards de aprovação (HITL) |
| Terminal Integrado | ✅ | Comandos reais, output ANSI, histórico, comandos internos, integração socket |
| Painéis Redimensionáveis | ✅ | Sidebar, bottom panel, right panel com `react-resizable-panels` |
| Controle de Tema | ✅ | Dark/light mode toggle |
| Git Panel | ⚠️ | Interface funcional (simulada), integração com comandos reais pendente |

### Backend (Motor Agêntico e Serviços)
| Funcionalidade | Status | Detalhes |
|---------------|--------|----------|
| WebSocket + Sessões | ✅ | Conexão robusta, autenticação por token, múltiplos modos (plan/yolo) |
| Loop Agêntico ReAct | ✅ | Processa mensagens, invoca LLM, gerencia ferramentas e aprovações |
| Ferramentas Nativas | ✅ | `read_file`, `write_file`, `list_directory`, `execute_command`, `web_fetch` |
| Segurança Ativa | ✅ | TrustedFolders (anti-traversal) e SecretRedactor (anti-leak) |
| Persistência SQLite | ✅ | Histórico de mensagens e sessões preservado entre reinícios |

---

## 4. 🧪 Estado dos Testes

O GreenForge IDE conta agora com uma suíte de testes expandida, cobrindo fluxos críticos de ponta a ponta.

| Categoria | Status | Cobertura |
|-----------|--------|-----------|
| Unitários Backend | ✅ Passando | Segurança, Loop Agêntico, WebSocket, Persistência |
| Unitários Frontend | ✅ Passando | FileExplorer, ChatPanel, Terminal, Layout |
| End-to-End (E2E) | ✅ Passando | Fluxos complexos no navegador (Terminal, VFS, Export) |
| **Total Passing** | **123** | **Estabilidade garantida em lógica core** |

### Como Rodar os Testes
```bash
# Rodar todos os testes unitários e integração
npx vitest run

# Rodar testes específicos de frontend
npx vitest tests/unit/frontend

# Rodar testes E2E (requer servidor rodando)
npx playwright test
```

---

## 5. ⚠️ Limitações e Pendências

### Curto Prazo (Polimento)
1. **Estabilização de Hooks:** Alguns testes de hooks (`useAgentSocket`) apresentam erros de ciclo de vida do React no ambiente de teste.
2. **Git Panel Real:** Migrar as ações visuais para comandos git reais no backend.

### Próximo Marco
**Fase 7: Multi-Agente com Worktrees.** Implementar suporte a múltiplos agentes operando em branches isoladas para tarefas paralelas.

---

## 6. 📖 Manual de Operação Rápida

### Configuração Inicial
1. `npm install`
2. `npm rebuild better-sqlite3` (necessário para compatibilidade de binários)
3. `cp .env.example .env.local` (adicione suas chaves API)

### Execução
```bash
# Iniciar frontend e backend simultaneamente
npm run dev
```
Acesse: [http://localhost:3000](http://localhost:3000)

---

## 7. 📜 Histórico de Mudanças Recentes

- **2026-06-06:** Implementada suíte completa de testes (32 novos casos de teste).
- **2026-06-06:** Corrigido bug no `FileExplorer` que impedia criação de arquivos na raiz.
- **2026-06-06:** Melhorada estabilidade do `Terminal` e interface de aprovação do `ChatPanel`.
- **2026-06-06:** Reconstrução de dependências nativas para correção do banco de dados.

---
*Este documento é a única fonte de verdade sobre o estado do projeto.*
