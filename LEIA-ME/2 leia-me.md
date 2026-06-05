```markdown
## Contexto

Eu sou o desenvolvedor do **GreenForge IDE**, uma plataforma web com backend Node.js/Express/WebSocket e frontend React (Next.js). O código completo está disponível (você pode consultar os arquivos que eu enviar). Preciso que você gere **testes automatizados** (unitários, integração e e2e) com base no status atual de implementação.

Abaixo está a tabela de funcionalidades com seus respectivos status (✅ implementado, ⚠️ parcial, ❌ ausente). Use essa tabela como guia.

## Tabela de Status

| Categoria               | Funcionalidade                              | Status | Detalhes / Observações                                                                                   |
|-------------------------|---------------------------------------------|--------|-----------------------------------------------------------------------------------------------------------|
| **Interface / Entrada** | IDE web com explorador, editor, chat       | ✅     | Next.js + CodeMirror, painéis redimensionáveis, tema escuro/claro.                                       |
|                         | Terminal integrado                         | ✅     | Executa comandos reais do sistema (via `executeTerminalCommand`).                                        |
|                         | Comandos slash (/)                         | ❌     | Não implementado.                                                                                        |
|                         | Modo headless / CLI                        | ❌     | Apenas frontend React.                                                                                   |
|                         | Autenticação / usuários                    | ❌     | Nenhum sistema de login ou autenticação.                                                                 |
| **Orquestração / Sessão** | Gerenciamento de sessão WebSocket         | ✅     | `useAgentSocket`, `server/ws/handler.ts` com suporte a múltiplas sessões.                                |
|                         | Contexto persistente de projeto            | ⚠️     | VFS simulado com localStorage; não há histórico persistente de conversas entre sessões.                 |
|                         | Sandboxing / isolamento                    | ⚠️     | Código para Docker (`dockerRunner.ts`), mas não integrado ao loop principal.                             |
|                         | Detecção automática de repositório         | ❌     | Workspace definido manualmente.                                                                          |
|                         | Boot rápido sem instalação                 | ❌     | Requer `npm install` e construção.                                                                       |
| **Motor do Agente**     | Loop agente real (ReAct)                   | ✅     | `runAgentLoop` com tools, streaming e aprovação humana (Anthropic SDK).                                  |
|                         | Suporte a múltiplos LLMs                   | ⚠️     | Atualmente configurado para Anthropic; há código para Gemini em alguns endpoints (debate).              |
|                         | Planejamento antes de codificar            | ⚠️     | Modo "plan" requer aprovação, mas sem planejamento estruturado explícito.                                |
|                         | Multi‑agente / execução paralela           | ✅     | `TaskOrchestrator` + `WorktreeManager` (git worktrees) implementados.                                   |
|                         | Verificação cruzada entre agentes          | ❌     | Não há validação entre agentes (como code review de IAs).                                                |
|                         | Roteamento automático de modelo            | ❌     | Modelo fixo (Anthropic).                                                                                 |
|                         | Extensibilidade / plugins                  | ✅     | Suporte a MCP (Model Context Protocol) para ferramentas externas.                                       |
| **Ferramentas (Tools)** | Leitura / escrita de arquivos              | ✅     | `read_file`, `write_file` com validação de path e redação de segredos.                                  |
|                         | Listagem de diretórios                     | ✅     | `list_directory`, recursivo.                                                                            |
|                         | Execução de comandos shell                 | ✅     | `execute_shell_command` com timeout, sanitização de ambiente.                                           |
|                         | Busca em arquivos                          | ✅     | `search_in_files`.                                                                                       |
|                         | Web fetch                                  | ✅     | `web_fetch` simples.                                                                                     |
|                         | Git (status, add, commit)                  | ⚠️     | Painel Git simulado no frontend; backend tem `secureGit` mas integração limitada.                       |
|                         | MCP nativo                                 | ✅     | Cliente MCP (`client.ts`) registra ferramentas de servidores externos.                                  |
|                         | Multimodalidade (imagens)                  | ❌     | Não suportado.                                                                                           |
| **Persistência / Estado** | Banco de dados SQLite                     | ✅     | `better-sqlite3`, tabelas: sessions, messages, tool_calls, checkpoints.                                 |
|                         | Histórico de chat persistente              | ✅     | Mensagens salvas no SQLite.                                                                              |
|                         | Checkpoints / snapshots                    | ✅     | `checkpoints` tabela + métodos `createCheckpoint`.                                                       |
|                         | Exportação / importação do workspace       | ✅     | Exportação para ZIP (frontend) e importação de arquivos/pastas.                                          |
|                         | Telemetria / monitoramento                 | ❌     | Nenhum.                                                                                                  |
| **Segurança Avançada**  | Aprovação explícita (HITL)                 | ✅     | `approval_required` com diff preview.                                                                   |
|                         | Trusted Folders                            | ✅     | `TrustedFolders` impede path traversal fora do workspace.                                               |
|                         | Redação de segredos (secrets)              | ✅     | `SecretRedactor` com padrões para API keys, tokens, etc.                                                |
|                         | Modos de risco (plan/auto_edit/yolo)       | ✅     | Modos controlam aprovação de ferramentas destrutivas.                                                   |
|                         | Sandbox com Docker                         | ⚠️     | Implementado (`dockerRunner.ts`), mas não ativado por padrão.                                            |
|                         | Enterprise / deploy corporativo            | ❌     | Nenhum.                                                                                                  |
| **Extras / Diferenciais** | Open Source (MIT)                         | ✅     | Código disponível.                                                                                       |
|                         | IDE web própria                            | ✅     | Editor Monaco (via CodeMirror), explorador de arquivos, painéis.                                        |
|                         | Comparador de código (diff)                | ✅     | `DiffLens` e `InlineDiff`.                                                                              |
|                         | Paleta de comandos (Ctrl+P)                | ✅     | `CommandPalette` com busca de arquivos e ações.                                                          |
|                         | Controle de versão visual (Git panel)      | ⚠️     | Simulado com localStorage; não conectado a repositório real.                                             |
|                         | Benchmark SWE‑bench                        | ❌     | Não aplicável.                                                                                           |
|                         | Worktrees isolados (git worktrees)         | ✅     | `WorktreeManager` cria/remove worktrees para execução paralela de tarefas.                              |
|                         | Roadmap público                            | ⚠️     | Documento `RELATORIO_PROGRESSO.md` com fases planejadas.                                                 |

## Tarefa

Com base no código que você pode acessar (forneça os arquivos principais ou descreva que estão disponíveis), **gere um conjunto completo de testes automatizados** seguindo as diretrizes:

1. **Para funcionalidades ✅ (implementadas)**: crie testes unitários e de integração que validem o comportamento atual. Inclua:
   - Testes para o backend: loop do agente, cada ferramenta, WebSocket, persistência SQLite, segurança (trusted folders, secret redactor).
   - Testes para o frontend: componentes React (IDE layout, chat, terminal, file explorer), stores Zustand, hooks (useAgentSocket).
   - Utilize **Vitest** (já configurado no projeto) e **React Testing Library**.
   - Mocks para dependências externas (ex.: Anthropic SDK, fs, child_process).

2. **Para funcionalidades ⚠️ (parciais)**: escreva testes que **revelem as lacunas** (ex.: teste que falha porque o contexto persistente não funciona entre sessões). Além disso, forneça um **esboço de implementação mínima** para tornar o teste verde.

3. **Para funcionalidades ❌ (ausentes)**: crie **testes que sirvam como especificação** (test-driven development). Eles devem falhar inicialmente e descrever o comportamento esperado. Inclua comentários explicando o que precisa ser implementado no código para que o teste passe.

Organize os testes em arquivos separados por módulo, por exemplo:
- `tests/unit/backend/agent/loop.test.ts`
- `tests/unit/backend/tools/filesystem.test.ts`
- `tests/integration/websocket/session.test.ts`
- `tests/unit/frontend/components/ChatPanel.test.tsx`
- `tests/e2e/ide-flow.spec.ts` (opcional, use Playwright se possível)

Ao final, forneça os **conteúdos completos dos arquivos de teste** e instruções de como executá-los (`npm run test`).

## Notas adicionais

- O projeto já usa Vitest (`vitest.config.ts`). 
- Prefira **testes isolados** (unitários) para lógica de negócio e **testes de integração** para WebSocket, API routes e banco de dados.
- Para o frontend, use `@testing-library/react` e evite depender de implementações internas do CodeMirror (mock o editor se necessário).
- Inclua um `README-TESTS.md` resumindo como rodar e o que cada suite cobre.

## Entregável esperado

Envie uma única mensagem com:
- Lista dos arquivos de teste gerados (nomes e caminhos).
- Conteúdo completo de cada arquivo (em blocos de código).
- Comandos para instalar dependências adicionais de teste (se houver).
- Breve explicação de como os testes para funcionalidades faltantes ajudarão o Gemini a implementar corretamente.

Agora, gere os testes solicitados.
```