# 🛠️ GreenForge IDE — Documento Central de Contexto

**Última Atualização:** 2026-06-07
**Versão do Documento:** 3.3 (Estabilidade Alcançada — Testes Verdes)
**Estado Geral:** MVP Funcional e Confiável. Todas as falhas críticas detectadas pela suíte de testes foram corrigidas.

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
├── tests/                        # Suíte de testes e arquivos de suporte
└── LEIA-ME/                      # Documentação
```

---

## 3. ✅ Funcionalidades Implementadas

### Frontend (Interface e UX)
| Funcionalidade | Status | Detalhes |
|---------------|--------|----------|
| Explorador de Arquivos | ✅ | Criar, renomear, excluir arquivos/pastas; detecção de linguagem corrigida |
| Editor de Código | ✅ | Múltiplas abas, syntax highlight, edição em tempo real |
| Painel de Chat (Agente) | ✅ | Envio de mensagens, streaming, cards de aprovação (HITL) corrigidos |
| Terminal Integrado | ✅ | Comandos reais, output ANSI, histórico, comandos internos, integração socket |
| Painéis Redimensionáveis | ✅ | Sidebar, bottom panel, right panel com `react-resizable-panels` |
| Controle de Tema | ✅ | Dark/light mode toggle |
| Git Panel | ✅ | Interface funcional integrada com a store local |

### Backend (Motor Agêntico e Serviços)
| Funcionalidade | Status | Detalhes |
|---------------|--------|----------|
| WebSocket + Sessões | ✅ | Conexão robusta, autenticação por token, múltiplos modos (plan/yolo) |
| Loop Agêntico ReAct | ✅ | Processa mensagens, invoca LLM, gerencia ferramentas e aprovações |
| Verificação de API Key | ✅ | Validação explícita no loop com mensagens de erro claras |
| Ferramentas Nativas | ✅ | `read_file`, `write_file`, `list_directory`, `execute_command`, `web_fetch` |
| Segurança Ativa | ✅ | TrustedFolders (anti-traversal) e SecretRedactor (anti-leak) validados |
| Persistência SQLite | ✅ | Histórico de mensagens e sessões preservado entre reinícios |

---

## 4. 🧪 Estado dos Testes

**Situação Atual (2026-06-07):**  
A suíte de testes foi estabilizada e configurada corretamente. Todas as falhas intencionais anteriores foram corrigidas no código fonte.

**Métricas de Cobertura (Unitários/Integração):**  
- **Total de Testes:** 85
- **Passando:** 85
- **Falhando:** 0

**Melhorias Realizadas:**
1. **Configuração do Vitest:** Corrigido o mapeamento de ambientes (jsdom para frontend, node para backend) para suportar a estrutura de pastas `tests/tests/`.
2. **Dependências:** Adicionado `@testing-library/user-event` para testes de interface.
3. **Mocks de DOM:** Implementado mock para `scrollIntoView` no setup global dos testes.
4. **Correções no Código:**
   - **Agent Loop:** Adicionada verificação robusta de `GEMINI_API_KEY`.
   - **File Explorer:** Sincronizada a detecção de linguagem com a lógica central da store.
   - **Chat Panel:** Corrigida a renderização do `ApprovalCard` em estados iniciais e erro de scroll.

---

## 5. ⚠️ Limitações e Pendências

1. **Testes E2E (Playwright):** Em fase de validação final no ambiente de CI.
2. **Isolamento de Workspace:** Embora o `TrustedFolders` proteja contra path traversal, a listagem do terminal real ainda pode acessar diretórios do sistema dependendo das permissões do processo.
3. **Multi-Agente (Fase 7):** Planejado para o próximo ciclo de desenvolvimento.

---

## 6. 📖 Manual de Operação Rápida

### Configuração Inicial
```bash
npm install
npm rebuild better-sqlite3
cp .env.example .env.local
```

### Execução do Sistema
```bash
npm run dev   # frontend na porta 3000, backend na 3001
```

### Execução dos Testes
```bash
npx vitest run               # todos os testes unitários e de integração
npx playwright test          # E2E (requer servidor rodando)
```

---

## 7. 📜 Histórico de Mudanças Recentes

- **2026-06-07:** Estabilização completa da suíte de testes. 85 testes verdes. Correções aplicadas no Agent Loop, File Explorer e Chat Panel.
- **2026-06-07:** Substituição da suíte antiga. Início do roteiro de correções baseadas em falhas.
- **2026-06-06:** Reversão de alterações indevidas no código fonte.

---
*Este documento é a única fonte de verdade sobre o estado do projeto.*
