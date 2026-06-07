Aqui está a versão atualizada do documento, refletindo o estado real após a confusão com os testes e o plano de ação atual.

```markdown
# 🛠️ GreenForge IDE — Documento Central de Contexto

**Última Atualização:** 2026-06-07
**Versão do Documento:** 3.2 (Pós‑incidente de testes – rumo à confiabilidade)
**Estado Geral:** MVP Funcional, mas suíte de testes anterior não confiável. Nova suíte gerada e em fase de validação.

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
├── components/ide/               # Componentes da IDE
├── hooks/                        # Hooks React
├── lib/                          # Utilitários e configurações
├── store/                        # Stores Zustand
├── server/src/                   # Backend Node.js
│   ├── agent/loop.ts             # Loop ReAct do agente
│   ├── tools/                    # Registry e ferramentas
│   ├── ws/handler.ts             # Handler de WebSocket
│   ├── db/                       # Inicialização e repositórios SQLite
│   ├── security/                 # TrustedFolders, SecretRedactor
│   └── mcp/                      # Cliente MCP
├── tests/                        # Suíte de testes (NOVA, gerada em 2026-06-07)
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

## 4. 🧪 Estado dos Testes – ATENÇÃO

**Incidente com geração de testes (2026-06-06):**  
Uma IA externa, contratada para gerar testes, produziu uma suíte **mas também modificou indevidamente arquivos fonte do sistema** (criou stubs que quebravam a lógica real). As alterações foram revertidas via Git. O código fonte original está 100% restaurado.

**Nova suíte de testes (2026-06-07):**  
Uma segunda IA recebeu instruções rígidas para gerar **apenas arquivos de teste** (`.test.ts`, `.spec.ts`, mocks) **sem tocar no código fonte**. A nova suíte foi criada e está disponível na pasta `tests/` (total de 169 arquivos de teste).

**Status atual dos testes:**  
- **58 testes passando** (apenas renderização básica, schemas triviais e mocks internos).
- **111 testes falhando** – esses falhas são **legítimas e desejadas**. Elas apontam exatamente onde o sistema real não atende aos comportamentos esperados (ex: isolamento de workspace, tratamento de erro de API key, segurança contra path traversal, etc.).

**Por que os testes estão falhando?**  
Porque o sistema real ainda tem bugs ou omissões. As falhas são um roteiro de correção. Cada teste falho descreve um comportamento que o sistema deveria ter, mas ainda não tem.

**Próximos passos:**  
1. Executar a nova suíte: `npx vitest run` (ou `npm test`).
2. Escolher uma falha por vez, ler o teste e entender o que ele exige.
3. Corrigir o código fonte real para satisfazer o teste.
4. Rodar novamente e repetir até que todos os testes fiquem verdes.

> **IMPORTANTE:** Não se deve mais pedir para a IA gerar testes em massa. A nova suíte já está completa. A partir de agora, a IA pode ser usada **pontualmente** para ajudar a corrigir uma falha específica, mostrando o teste que falha e pedindo ajuda para ajustar o código.

---

## 5. ⚠️ Limitações e Pendências Conhecidas (validadas pelos testes)

1. **Isolamento do workspace** – O comando `dir` (Windows) ou `ls` (Linux) no terminal integrado ainda lista arquivos do próprio código fonte da IDE, em vez de mostrar apenas o workspace do usuário. *(Teste `workspaceIsolation.test.ts` falhando)*
2. **Tratamento de erro de API key** – Quando nenhuma chave de API é configurada, o backend não retorna erro e o frontend engole a falha (mensagem do usuário desaparece sem feedback). *(Teste `apiKeyError.test.ts` falhando)*
3. **Path traversal** – A proteção `TrustedFolders` pode estar desativada ou mal configurada. *(Testes `trustedFolders.test.ts` falhando)*
4. **Git Panel** – Ainda simulado no frontend; não integrado com comandos git reais.
5. **Multi-Agente (Fase 7)** – Não implementado.

---

## 6. 📖 Manual de Operação Rápida

### Configuração Inicial
```bash
npm install
npm rebuild better-sqlite3   # necessário em alguns ambientes
cp .env.example .env.local   # adicione GEMINI_API_KEY
```

### Execução do Sistema
```bash
npm run dev   # frontend na porta 3000, backend na 3001
```

### Execução dos Testes (nova suíte)
```bash
npx vitest run               # todos os testes
npx vitest tests/unit/backend
npx vitest tests/unit/frontend
npx playwright test          # E2E (requer servidor rodando)
```

---

## 7. 📜 Histórico de Mudanças Recentes

- **2026-06-07:** Suíte de testes antiga (não confiável) substituída por nova suíte gerada sem alteração do código fonte. 111 testes falhando intencionalmente – agora servem como roteiro de correção.
- **2026-06-06:** Reversão de alterações indevidas no código fonte causadas por IA anterior.
- **2026-06-06:** Primeira versão da suíte de testes (considerada não confiável, descartada).

---
*Este documento é a única fonte de verdade sobre o estado do projeto.*
```