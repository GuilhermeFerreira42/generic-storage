

Com base no seu relatório e no meu conhecimento do código do GreenForge, vou primeiro listar as principais funcionalidades existentes e depois fornecer o comando para outra IA gerar os testes automatizados.

---

## 📋 Funcionalidades Existentes (Requisitos para Teste)

### 🖥️ Frontend - Interface e UX
1. **Explorador de Arquivos**
   - Criar arquivo (botão + novo na árvore)
   - Criar pasta (botão + novo na árvore)
   - Renomear arquivo/pasta (duplo clique ou botão)
   - Excluir arquivo/pasta (botão com confirmação)
   - Expandir/recolher pastas
   - Selecionar arquivo para abrir na área de edição

2. **Editor de Código**
   - Abrir arquivo no editor (via explorador ou comando)
   - Fechar aba (botão X)
   - Ativar aba diferente
   - Editar conteúdo do arquivo (digitando)
   - Detectar linguagem pela extensão e aplicar syntax highlight
   - Salvar automaticamente ou por atalho (não especificado, mas testar se há sujeira)

3. **Painel de Chat (Agente)**
   - Enviar mensagem (texto + Enter)
   - Visualizar streaming de resposta do agente
   - Visualizar aprovação de ação (tool call) com diff
   - Aprovar ou rejeitar ação
   - Botão para parar debate (cancelar)
   - Botão para reiniciar sessão

4. **Terminal Integrado**
   - Executar comando (digitar e Enter)
   - Limpar terminal (botão ou Ctrl+L)
   - Histórico de comandos (setas up/down)
   - Ver saída com cores ANSI (se suportado)
   - Comandos internos: `help`, `ls`, `cd`, `mkdir`, `touch`, `cat`, `rm`, `git status/add/commit`, `clear`

5. **Painéis Laterais e Controles**
   - Alternar entre explorador, busca, git, agentes (activity bar)
   - Redimensionar painéis (horizontal e vertical) – via `react-resizable-panels`
   - Botão de tema (dark/light) na activity bar
   - Barra de ferramentas com botões Run, Stop, Importar arquivo, Importar pasta, Exportar ZIP
   - Botões para alternar visibilidade da sidebar, bottom panel e right panel

6. **Controle de Versão (Git Panel – simulado)**
   - Exibir branch atual
   - Listar arquivos modificados/não stageados
   - Botão stage/unstage por arquivo
   - Stage all / Unstage all
   - Comitar com mensagem (executa commit simulado)

7. **Busca (Search Panel)**
   - Buscar termo em todos os arquivos (case sensitive, whole word, regex)
   - Exibir resultados com linha e snippet
   - Abrir arquivo ao clicar no resultado

### ⚙️ Backend (Motor Agêntico e Serviços)
8. **WebSocket e Sessões**
   - Conectar ao backend via WebSocket (porta 3001)
   - Autenticação via `auth_token`
   - Manter histórico de mensagens em SQLite (persistente)
   - Recuperar sessão anterior ao reconectar

9. **Loop Agêntico (ReAct)**
   - Processar mensagem do usuário
   - Invocar LLM (Gemini ou Anthropic) com tools
   - Emitir tokens em streaming
   - Chamar ferramentas (`read_file`, `write_file`, `list_directory`, `search_in_files`, `execute_command`, `web_fetch`)
   - Solicitar aprovação para ações destrutivas em modo `auto_edit`
   - Executar ação após aprovação
   - Finalizar e retornar resposta

10. **Ferramentas Individuais**
    - `read_file`: leitura de arquivo (bloqueia arquivos .env, .key, etc.)
    - `write_file`: escreve arquivo, gera diff, respeita trusted folders
    - `list_directory`: lista conteúdo recursivamente (limite de profundidade)
    - `search_in_files`: busca textual em arquivos
    - `execute_command`: executa comando shell com timeout e sanitização de variáveis (dangerous commands requerem approval)
    - `web_fetch`: baixa e limpa HTML de uma URL

11. **Segurança**
    - TrustedFolders: impede path traversal fora do workspace
    - SecretRedactor: remove chaves API, tokens, senhas do output

12. **MCP (Model Context Protocol)**
    - Carregar configuração de servidores MCP de `greenforge.config.json`
    - Conectar a servidores stdio
    - Registrar ferramentas MCP no registry

13. **Persistência (SQLite)**
    - Criar sessão, salvar mensagens, tool_calls, checkpoints
    - Recarregar histórico ao abrir sessão

14. **Terminal Real**
    - Receber comando via `terminal_command`
    - Executar comando real (usando `execute_command` tool internamente)
    - Retornar output via `terminal_output`

### 🧪 Testes (Atuais – já passando)
- Unit tests para `secretRedactor`, `agentStore`, etc.
- Integration tests para WebSocket, autenticação, slash commands
- Frontend tests para `ChatPanel`, `CodeEditor`, `FileExplorer`
- (Há 64 testes passando, conforme relatório)

---

## 📄 Comando para outra IA gerar os testes automatizados

Copie e cole o bloco abaixo no chat com a IA (Claude, Gemini, etc.):

```
Você é um engenheiro de qualidade senior. Receba a seguinte lista de funcionalidades do GreenForge IDE e gere uma suíte completa de testes automatizados (unitários, integração e E2E) usando Vitest, React Testing Library e Playwright (opcional).

Contexto do projeto: Next.js 15 + Node.js backend com WebSocket, SQLite, e agentes de IA. O código fonte está disponível (mas você não precisa acessá-lo agora; baseie-se na descrição).

## Funcionalidades a serem testadas (cada uma deve ter pelo menos um teste)

### Frontend (React + Zustand)
1. **Explorador de Arquivos**
   - Criar arquivo (simular clique no botão "Novo arquivo", digitar nome, confirmar). Verificar se o arquivo aparece na árvore.
   - Criar pasta (similar).
   - Renomear (duplo clique ou botão editar, digitar novo nome, Enter). Verificar nome alterado.
   - Excluir (clique no botão deletar, confirmar). Verificar remoção.
   - Expandir/recolher pasta (clique na pasta). Verificar que filhos aparecem/desaparecem.
   - Selecionar arquivo (clique). Verificar que aba é adicionada/ativada.

2. **Editor de Código**
   - Abrir arquivo via explorador. Verificar que o conteúdo aparece no editor.
   - Editar conteúdo (simular digitação). Verificar que o store atualiza e que o componente reflete.
   - Fechar aba (clicar no X). Verificar aba removida.
   - Mudar de aba. Verificar que o editor exibe o conteúdo da nova aba.

3. **Painel de Chat**
   - Enviar mensagem (digitar e clicar em enviar ou Enter). Verificar que a mensagem aparece na lista e que o WebSocket é chamado.
   - Receber streaming de tokens (simular mensagem `agent_token` do WebSocket). Verificar que o texto aparece gradualmente.
   - Exibir approval card (simular `approval_required`). Verificar que o modal/diff aparece.
   - Aprovar ação (clicar em "Aprovar"). Verificar que `approve_action` é enviado.
   - Rejeitar ação (clicar em "Rejeitar"). Verificar que `approve_action` é enviado com false.
   - Cancelar debate (botão stop). Verificar que `cancel_agent` é enviado.

4. **Terminal**
   - Executar comando (digitar `ls` e Enter). Verificar que `terminal_command` é enviado.
   - Exibir output (simular `terminal_output`). Verificar que o texto aparece no terminal.
   - Limpar terminal (botão clear). Verificar que o conteúdo é apagado.
   - Histórico de comandos (seta para cima). Verificar que o input recebe o comando anterior.

5. **Painéis e Controles**
   - Alternar sidebar (botão na toolbar). Verificar classe ou estilo mudando.
   - Alternar bottom panel.
   - Alternar right panel.
   - Redimensionar painel (simular evento de mouse). Verificar que largura/altura muda.
   - Trocar tema (clique no ícone lua/sol). Verificar que classe `dark` é adicionada/removida.
   - Importar arquivo (simular upload). Verificar que arquivo é adicionado ao VFS.
   - Exportar ZIP (clique em exportar). Verificar que função de download é chamada (mock do file-saver).

6. **Git Panel**
   - Exibir branch atual (mock store). Verificar texto.
   - Stage arquivo (clique no +). Verificar que arquivo vai para lista stageada.
   - Unstage arquivo (clique no X). Verificar que volta para modificados.
   - Comitar (preencher mensagem, clicar em "Comitar"). Verificar que `commit` do store é chamado.

7. **Search Panel**
   - Buscar termo (digitar, Enter). Verificar que resultados são exibidos.
   - Aplicar case sensitive/whole word/regex. Verificar que a busca reflete.
   - Clicar em resultado. Verificar que arquivo é aberto no editor.

### Backend (Node.js + WebSocket + SQLite)
8. **WebSocket e Sessões**
   - Conectar ao WebSocket (simular `new WebSocket`). Verificar que conexão é aceita.
   - Enviar mensagem sem `auth_token`. Verificar que retorna erro "Não autenticado".
   - Enviar mensagem com token válido. Verificar que processa normalmente.
   - Enviar `chat_message`. Verificar que `runAgentLoop` é chamado com parâmetros corretos.
   - Enviar `cancel_agent`. Verificar que AbortController é acionado.
   - Enviar `switch_mode`. Verificar que o modo da sessão é atualizado.
   - Reconectar após fechar. Verificar que histórico da sessão é restaurado do SQLite.

9. **Loop Agêntico e Ferramentas**
   - Simular LLM que retorna tool call `read_file`. Verificar que a ferramenta é executada.
   - Simular LLM que retorna tool call `write_file` em modo `auto_edit`. Verificar que `approval_required` é emitido.
   - Aprovar ação (enviar `approve_action`). Verificar que `write_file` é executado.
   - Rejeitar ação. Verificar que tool_result com "rejeitado" é enviado e o loop continua.
   - Simular loop com múltiplas iterações. Verificar que o histórico é salvo e ferramentas são chamadas corretamente.
   - Simular erro na ferramenta. Verificar que mensagem de erro é enviada.

10. **Persistência (SQLite)**
    - Criar sessão nova. Verificar que `sessions` e `messages` são salvos.
    - Carregar sessão existente. Verificar que histórico de mensagens é restaurado.
    - Salvar tool call. Verificar que `tool_calls` recebe registro.
    - Criar checkpoint. Verificar que `checkpoints` recebe snapshot.

11. **Segurança**
    - TrustedFolders: tentar ler arquivo fora do workspace. Verificar que lança erro.
    - SecretRedactor: enviar texto com chave API. Verificar que a chave é substituída por `[REDACTED]`.

12. **MCP**
    - Carregar `greenforge.config.json` com servidor válido. Verificar que conexão é estabelecida e ferramentas são registradas.
    - Conectar a servidor com comando inválido. Verificar que falha graciosamente (sem crash).

13. **Terminal Real**
    - Enviar `terminal_command` com comando simples (ex: `echo hello`). Verificar que executa e retorna output.
    - Enviar comando destrutivo (`rm -rf`). Verificar que requer aprovação e só executa se aprovado.

### End-to-End (Opcional, com Playwright)
14. **Fluxo completo: usuário pede para criar arquivo, agente pede aprovação, usuário aprova, arquivo é criado.**
15. **Usuário executa comando `npm --version` no terminal e vê a saída.**
16. **Usuário importa uma pasta via UI, navega até um arquivo, edita, salva, exporta ZIP.**

## Formato de saída esperado
- Para cada funcionalidade, forneça o código do teste em TypeScript, utilizando `describe` e `it`.
- Use `vi.mock` onde necessário.
- Para testes de frontend, use `render` do `@testing-library/react` e `userEvent`.
- Para testes de backend, use `new WebSocket` (ou mock) e `fetch` para API REST.
- Inclua instruções de execução (npm run test) e dependências adicionais se precisar (Playwright).

Gere os testes em blocos de código organizados por arquivo (ex: `tests/frontend/fileExplorer.test.tsx`, `tests/backend/websocket.test.ts`, `tests/e2e/create-file.spec.ts`).

Após gerar, explique brevemente como rodá-los e o que cada suíte cobre.
```

---

Esse comando é extenso e detalhado, garantindo que a IA entenderá o escopo. Você pode copiá-lo e enviar para o Claude, Gemini ou Qwen Code. Depois, com os testes gerados, você poderá executá-los e corrigir as falhas.

Se precisar de algum ajuste ou complemento, é só avisar.
```
Você é um engenheiro de qualidade senior. Receba a seguinte lista de funcionalidades do GreenForge IDE e gere uma suíte completa de testes automatizados (unitários, integração e E2E) usando Vitest, React Testing Library e Playwright (opcional). Use TypeScript. Para cada funcionalidade, forneça o código do teste em blocos organizados por arquivo, com describes e its. Inclua instruções de execução.

Funcionalidades a testar:

Frontend:
1. Explorador de Arquivos: criar arquivo, criar pasta, renomear, excluir, expandir/recolher, selecionar arquivo.
2. Editor de Código: abrir arquivo, editar conteúdo, fechar aba, trocar aba.
3. Painel de Chat: enviar mensagem, receber streaming de tokens, exibir approval card, aprovar ação, rejeitar ação, cancelar debate.
4. Terminal: executar comando, exibir output, limpar terminal, histórico de comandos.
5. Painéis e Controles: alternar sidebar/bottom/right panels, redimensionar, trocar tema, importar arquivo, exportar ZIP.
6. Git Panel: exibir branch, stage/unstage arquivo, comitar.
7. Search Panel: buscar termo, aplicar opções (case sensitive, whole word, regex), abrir arquivo do resultado.

Backend:
8. WebSocket e Sessões: conectar, autenticar com token, enviar chat_message, cancel_agent, switch_mode, reconectar com restauração de histórico.
9. Loop Agêntico e Ferramentas: simular LLM com tool call read_file, write_file com approval, aprovar/rejeitar, múltiplas iterações, erro em ferramenta.
10. Persistência (SQLite): criar sessão, salvar mensagens, restaurar histórico, salvar tool call, criar checkpoint.
11. Segurança: TrustedFolders (path traversal bloqueado), SecretRedactor (remove chaves API).
12. MCP: carregar config, conectar servidor stdio, registrar ferramentas, falha graciosa.
13. Terminal Real: executar comando simples e destrutivo (com aprovação).

End-to-End (Playwright opcional):
14. Fluxo completo: usuário pede para criar arquivo, agente pede aprovação, usuário aprova, arquivo criado.
15. Comando npm --version no terminal vê saída.
16. Importar pasta, editar arquivo, exportar ZIP.

Formato: arquivos como tests/frontend/fileExplorer.test.tsx, tests/backend/websocket.test.ts, tests/e2e/create-file.spec.ts. Use mocks onde necessário.

Gere os testes agora.
```

Copie esse bloco e envie para a IA. Ela vai gerar todos os arquivos de teste. Depois você coloca na pasta correta, roda `npm test` e começa a corrigir as falhas. Qualquer coisa, me chama de novo.Com certeza. Aqui está o comando exato, pronto para você copiar e colar para a outra IA. Ele é bem completão, mas vai garantir que ela não esqueça nada importante.

---

Copie o texto abaixo a partir da linha "Comando:" até o final do bloco.

Comando:

Você é um engenheiro de qualidade sênior. Preciso que você gere uma suíte completa de testes automatizados para o GreenForge IDE, seguindo a lista de funcionalidades abaixo. Use Vitest para testes unitários e de integração, React Testing Library para componentes, e Playwright para testes end-to-end (opcional). Escreva em TypeScript. Para cada item, crie um arquivo de teste separado, com describes e its bem nomeados. Inclua mocks para dependências externas (WebSocket, fetch, fs, child_process, etc.). Forneça também instruções curtas de como executar os testes.

Lista de funcionalidades a testar:

Frontend:
1. Explorador de arquivos: criar arquivo, criar pasta, renomear, excluir, expandir/recolher, selecionar arquivo para abrir no editor.
2. Editor de código: abrir arquivo, editar conteúdo, fechar aba, trocar de aba.
3. Painel de chat: enviar mensagem, receber streaming de tokens, exibir approval card, aprovar ação, rejeitar ação, cancelar debate.
4. Terminal integrado: executar comando, exibir output, limpar terminal, histórico de comandos (setas up/down).
5. Painéis e controles: alternar sidebar, bottom panel, right panel; redimensionar painéis; trocar tema claro/escuro; importar arquivo; importar pasta; exportar workspace como ZIP.
6. Painel Git: exibir branch atual, stage/unstage arquivo, stage all/unstage all, fazer commit.
7. Painel de busca: buscar termo, usar opções (case sensitive, whole word, regex), exibir resultados, abrir arquivo ao clicar no resultado.

Backend:
8. WebSocket e sessões: conectar, autenticar com token, enviar chat_message, cancel_agent, switch_mode, reconectar após queda e restaurar histórico do SQLite.
9. Loop agêntico e ferramentas: processar mensagem, chamar LLM, executar read_file, executar write_file (com approval em auto_edit), aprovar/rejeitar ação, lidar com múltiplas iterações, tratar erro de ferramenta.
10. Persistência SQLite: criar sessão, salvar mensagens, recuperar histórico, salvar tool call, criar checkpoint.
11. Segurança: TrustedFolders bloqueia path traversal; SecretRedactor esconde chaves API e tokens.
12. MCP: carregar configuração de greenforge.config.json, conectar a servidor stdio, registrar ferramentas, falhar graciosamente se servidor não existir.
13. Terminal real: executar comando simples (ex: echo) e retornar output; comando destrutivo exige aprovação e só executa se aprovado.

End-to-end (Playwright, opcional):
14. Fluxo completo: usuário pede para criar um arquivo, agente solicita aprovação, usuário aprova, arquivo é criado no VFS e aparece no explorador.
15. Usuário executa npm --version no terminal e vê a versão real.
16. Usuário importa uma pasta, edita um arquivo, exporta ZIP e verifica que o arquivo está no ZIP.

Formato de saída: Forneça os testes em blocos de código, cada bloco com o nome do arquivo (ex: tests/frontend/fileExplorer.test.tsx). Inclua um breve parágrafo no final explicando como rodar (npm run test, npx playwright test). Não precisa instalar dependências, apenas gere o código.

Agora, gere todos os testes.Perfeito! Agora você tem o comando. Copie todo o texto que está entre as marcas "Comando:" e o final, e envie para a IA geradora (Claude, Gemini, etc.). Ela vai te devolver uma pasta cheia de arquivos de teste. Depois é só colocá-los no seu projeto, rodar `npm test` e ver o que ainda precisa ser corrigido. Se os testes falharem, você ajusta o código e repete até tudo passar. Simples assim.

Se precisar de ajuda para interpretar ou corrigir alguma falha nos testes gerados, é só me chamar. Boa sorte!



-------

