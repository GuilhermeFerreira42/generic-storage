Segue um checklist completo, pronto para você copiar e usar como guia de execução para o GreenForge.

# Checklist Completo — Evolução do GreenForge para Agente Real

## 0. Preparação inicial do projeto

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
- [ ] Garantir que `.env`, `.env.*`, `*.key`, `*.pem`, `*.secret`, `greenforge.db` e `.greenforge-workers/` estejam ignorados.
- [ ] Definir o caminho real do workspace que será usado pelo backend.
- [ ] Definir qual provider LLM será usado primeiro: Anthropic, OpenAI ou Gemini.
- [ ] Criar chave de API do provider escolhido.
- [ ] Nunca inserir chave de API diretamente no código.
- [ ] Criar arquivo `.env` apenas localmente.

---

## 1. Backend Node.js com Express e WebSocket

### Estrutura inicial

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

### Dependências do backend

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

### Configuração do servidor

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

### Schemas WebSocket

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

### Handler WebSocket

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

### Frontend WebSocket

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

### Aceite da Fase 1

- [ ] Backend inicia sem erro.
- [ ] Frontend conecta ao backend.
- [ ] Frontend mostra estado conectado.
- [ ] Mensagem inválida no WebSocket não derruba servidor.
- [ ] Desligar backend mostra estado desconectado no frontend.
- [ ] Religar backend reconecta automaticamente.
- [ ] Nenhuma chave de API aparece no console.
- [ ] Nenhum erro TypeScript bloqueante.

---

## 2. Integração com LLM real e loop agêntico ReAct

### Dependências LLM

- [ ] Escolher provider inicial.
- [ ] Se Anthropic, instalar `@anthropic-ai/sdk`.
- [ ] Se OpenAI, instalar `openai`.
- [ ] Se Gemini, instalar SDK oficial correspondente.
- [ ] Criar `LLM_PROVIDER` no `.env`.
- [ ] Criar variável de chave de API no `.env`.
- [ ] Garantir que `.env` não esteja versionado.

### Loop do agente

- [ ] Criar `server/src/agent/loop.ts`.
- [ ] Criar função `runAgentLoop`.
- [ ] Receber `userMessage`.
- [ ] Receber `sessionId`.
- [ ] Receber `workspacePath`.
- [ ] Receber `toolRegistry`.
- [ ] Receber `mode`.
- [ ] Receber `AbortSignal`.
- [ ] Receber `pendingApprovals`.
- [ ] Receber callback `onEvent`.
- [ ] Criar limite máximo de iterações.
- [ ] Usar `MAX_ITERATIONS = 20`.
- [ ] Adicionar mensagem do usuário ao histórico.
- [ ] Chamar LLM com system prompt.
- [ ] Enviar ferramentas disponíveis ao LLM.
- [ ] Processar resposta textual.
- [ ] Processar tool calls.
- [ ] Executar ferramentas chamadas.
- [ ] Adicionar tool results ao histórico.
- [ ] Repetir loop até resposta final.
- [ ] Interromper loop se atingir limite de iterações.
- [ ] Interromper loop se `AbortSignal` for acionado.
- [ ] Persistir sessão ao final.

### Streaming

- [ ] Usar streaming do SDK escolhido.
- [ ] Enviar cada chunk/token como `agent_token`.
- [ ] Acumular texto completo.
- [ ] Enviar `agent_thinking_done` ao final do streaming.
- [ ] Garantir que o chat mostre resposta em tempo real.
- [ ] Garantir que streaming pare ao cancelar agente.

### Prompts

- [ ] Criar `server/src/agent/prompts.ts`.
- [ ] Criar `buildSystemPrompt`.
- [ ] Incluir descrição do GreenForge Agent.
- [ ] Incluir path do workspace atual.
- [ ] Incluir regras de segurança.
- [ ] Incluir instruções do modo `plan`.
- [ ] Incluir instruções do modo `auto_edit`.
- [ ] Incluir instruções do modo `yolo`.
- [ ] Ler `GREENFORGE.md` se existir.
- [ ] Inserir conteúdo de `GREENFORGE.md` no system prompt.
- [ ] Não falhar se `GREENFORGE.md` não existir.

### Human-in-the-Loop

- [ ] Detectar se ferramenta é destrutiva.
- [ ] No modo `plan`, pedir aprovação para todas as ações.
- [ ] No modo `auto_edit`, pedir aprovação para ações destrutivas.
- [ ] No modo `yolo`, não pedir aprovação.
- [ ] Criar `actionId` para cada ação pendente.
- [ ] Enviar `approval_required` ao frontend.
- [ ] Incluir descrição humana da ação.
- [ ] Incluir diff se disponível.
- [ ] Esperar Promise de aprovação.
- [ ] Se aprovado, executar ferramenta.
- [ ] Se rejeitado, não executar ferramenta.
- [ ] Informar ao LLM que a ação foi rejeitada.
- [ ] Continuar loop após rejeição.

### Aceite da Fase 2

- [ ] Usuário envia mensagem simples e recebe resposta real do LLM.
- [ ] Resposta aparece em streaming.
- [ ] Usuário consegue cancelar resposta em andamento.
- [ ] LLM consegue chamar ferramenta mock ou real.
- [ ] `approval_required` abre modal no frontend.
- [ ] Aprovar ação resolve Promise no backend.
- [ ] Rejeitar ação impede execução.
- [ ] Loop não passa de 20 iterações.
- [ ] Histórico da sessão é atualizado.
- [ ] Nenhum segredo é enviado ao frontend.

---

## 3. Tool Registry e ferramentas reais

### Tool Registry

- [ ] Criar `server/src/tools/types.ts`.
- [ ] Criar interface `Tool`.
- [ ] Incluir `name`.
- [ ] Incluir `description`.
- [ ] Incluir `inputSchema`.
- [ ] Incluir `isDestructive`.
- [ ] Incluir `execute`.
- [ ] Incluir `describeAction`.
- [ ] Incluir `previewDiff` opcional.
- [ ] Criar `server/src/tools/registry.ts`.
- [ ] Criar classe `ToolRegistry`.
- [ ] Implementar `register`.
- [ ] Implementar `getTool`.
- [ ] Implementar `listTools`.
- [ ] Implementar `getAnthropicToolDefinitions` ou equivalente ao provider.
- [ ] Criar factory `buildToolRegistry(workspacePath)`.
- [ ] Registrar todas as ferramentas nativas.

### Ferramenta `read_file`

- [ ] Criar `server/src/tools/filesystem/readFile.ts`.
- [ ] Receber `path`.
- [ ] Resolver path via `TrustedFolders`.
- [ ] Bloquear acesso fora do workspace.
- [ ] Bloquear leitura de `.env`.
- [ ] Bloquear leitura de `.env.local`.
- [ ] Bloquear leitura de `*.key`.
- [ ] Bloquear leitura de `*.pem`.
- [ ] Bloquear leitura de `*.cert`.
- [ ] Bloquear leitura de `id_rsa`.
- [ ] Bloquear leitura de `id_ed25519`.
- [ ] Ler arquivo como UTF-8.
- [ ] Aplicar `SecretRedactor`.
- [ ] Retornar conteúdo redigido.
- [ ] Retornar erro claro se arquivo não existir.
- [ ] Marcar como não destrutiva.

### Ferramenta `write_file`

- [ ] Criar `server/src/tools/filesystem/writeFile.ts`.
- [ ] Receber `path`.
- [ ] Receber `content`.
- [ ] Resolver path via `TrustedFolders`.
- [ ] Criar diretório pai se não existir.
- [ ] Escrever arquivo em disco.
- [ ] Marcar como destrutiva.
- [ ] Instalar biblioteca `diff`.
- [ ] Instalar `@types/diff`.
- [ ] Implementar `previewDiff`.
- [ ] Gerar diff entre conteúdo atual e proposto.
- [ ] Enviar diff ao modal de aprovação.

### Ferramenta `list_directory`

- [ ] Criar `server/src/tools/filesystem/listDirectory.ts`.
- [ ] Receber `path`.
- [ ] Receber opção `recursive`.
- [ ] Limitar recursão a 3 níveis por padrão.
- [ ] Ignorar `node_modules`.
- [ ] Ignorar `.git`.
- [ ] Ignorar `.greenforge-workers`.
- [ ] Ignorar arquivos sensíveis.
- [ ] Retornar árvore de arquivos legível.
- [ ] Marcar como não destrutiva.

### Ferramenta `search_in_files`

- [ ] Criar `server/src/tools/filesystem/searchInFiles.ts`.
- [ ] Receber query.
- [ ] Receber path opcional.
- [ ] Usar `ripgrep` se disponível.
- [ ] Criar fallback em JavaScript se `ripgrep` não existir.
- [ ] Ignorar `node_modules`.
- [ ] Ignorar `.git`.
- [ ] Retornar arquivo, linha e trecho.
- [ ] Limitar número de resultados.
- [ ] Marcar como não destrutiva.

### Ferramenta `execute_shell_command`

- [ ] Criar `server/src/tools/shell/executeCommand.ts`.
- [ ] Receber `command`.
- [ ] Receber `timeout_seconds`.
- [ ] Executar com `child_process.spawn`.
- [ ] Usar `sh -c` ou equivalente conforme sistema.
- [ ] Rodar sempre no workspace.
- [ ] Sanitizar variáveis de ambiente.
- [ ] Remover `ANTHROPIC_API_KEY` do ambiente.
- [ ] Remover `OPENAI_API_KEY` do ambiente.
- [ ] Remover `GEMINI_API_KEY` do ambiente.
- [ ] Remover `AWS_SECRET_ACCESS_KEY`.
- [ ] Remover `DATABASE_URL`.
- [ ] Remover `JWT_SECRET`.
- [ ] Capturar stdout.
- [ ] Capturar stderr.
- [ ] Capturar exit code.
- [ ] Implementar timeout padrão de 30 segundos.
- [ ] Matar processo no timeout.
- [ ] Marcar como destrutiva.
- [ ] Bloquear ou exigir aprovação para `rm -rf`.
- [ ] Bloquear ou exigir aprovação para `sudo`.
- [ ] Bloquear ou exigir aprovação para `curl | bash`.
- [ ] Bloquear ou exigir aprovação para `wget | bash`.
- [ ] Bloquear fork bomb.
- [ ] Retornar output completo ao agente.

### Ferramenta `web_fetch`

- [ ] Criar `server/src/tools/web/webFetch.ts`.
- [ ] Receber URL.
- [ ] Validar URL.
- [ ] Bloquear protocolos que não sejam HTTP ou HTTPS.
- [ ] Fazer fetch com timeout.
- [ ] Limitar tamanho máximo da resposta.
- [ ] Extrair texto útil do HTML.
- [ ] Remover scripts.
- [ ] Remover estilos.
- [ ] Retornar texto limpo.
- [ ] Marcar como não destrutiva.

### Trusted Folders

- [ ] Criar `server/src/security/trustedFolders.ts`.
- [ ] Normalizar paths com `path.resolve`.
- [ ] Permitir apenas paths dentro do workspace.
- [ ] Bloquear path traversal com `../`.
- [ ] Lançar `SecurityViolation` para path externo.
- [ ] Usar `TrustedFolders` em toda ferramenta de filesystem.
- [ ] Nunca acessar arquivo antes de validar path.

### Secret Redactor

- [ ] Criar `server/src/security/secretRedactor.ts`.
- [ ] Detectar chaves Anthropic.
- [ ] Detectar chaves OpenAI.
- [ ] Detectar chaves Gemini.
- [ ] Detectar JWT.
- [ ] Detectar AWS secrets.
- [ ] Detectar generic API keys.
- [ ] Detectar private key blocks.
- [ ] Detectar passwords.
- [ ] Substituir valores por `[REDACTED]`.
- [ ] Aplicar antes de enviar conteúdo ao LLM.
- [ ] Aplicar antes de enviar resultado ao frontend.
- [ ] Aplicar antes de persistir tool result, se necessário.

### Integração do terminal real

- [ ] Localizar `TerminalPanel`.
- [ ] Remover dependência exclusiva do terminal mock.
- [ ] Ao digitar comando, enviar `terminal_command` pelo WebSocket.
- [ ] Incluir `sessionId`.
- [ ] Incluir `workspacePath`.
- [ ] Receber `terminal_output`.
- [ ] Escrever output no xterm.js.
- [ ] Mostrar stderr em vermelho.
- [ ] Manter echo local do comando digitado.
- [ ] Não travar terminal se backend cair.
- [ ] Mostrar mensagem clara se backend estiver desconectado.
- [ ] Comandos destrutivos devem acionar aprovação se configurado.

### Aceite da Fase 3

- [ ] Agente consegue listar diretórios reais.
- [ ] Agente consegue ler arquivo real.
- [ ] Agente consegue criar arquivo real após aprovação.
- [ ] Agente consegue gerar diff antes de escrever.
- [ ] Agente não consegue ler `.env`.
- [ ] Agente não consegue acessar `../../`.
- [ ] Terminal executa `pwd`.
- [ ] Terminal executa `ls`.
- [ ] Terminal executa `npm --version`.
- [ ] Terminal retorna stderr corretamente.
- [ ] Comando com timeout é encerrado.
- [ ] Segredos são redigidos no output.

---

## 4. Persistência com SQLite

### Banco de dados

- [ ] Criar `server/src/db/init.ts`.
- [ ] Criar `server/src/db/schema.sql`.
- [ ] Criar `server/src/db/sessions.ts`.
- [ ] Inicializar banco ao subir servidor.
- [ ] Usar `better-sqlite3`.
- [ ] Ativar `journal_mode = WAL`.
- [ ] Ativar `foreign_keys = ON`.
- [ ] Criar tabela `sessions`.
- [ ] Criar tabela `messages`.
- [ ] Criar tabela `tool_calls`.
- [ ] Criar tabela `checkpoints`.
- [ ] Criar índices necessários.
- [ ] Definir `DB_PATH` opcional no `.env`.

### Sessões

- [ ] Implementar `SessionStore.getOrCreate`.
- [ ] Implementar `SessionStore.save`.
- [ ] Implementar `SessionStore.listByWorkspace`.
- [ ] Implementar `SessionStore.updateMode`.
- [ ] Implementar `SessionStore.delete`.
- [ ] Implementar `SessionStore.saveToolCall`.
- [ ] Implementar `SessionStore.createCheckpoint`.
- [ ] Carregar mensagens antigas ao retomar sessão.
- [ ] Persistir mensagens do usuário.
- [ ] Persistir mensagens do assistant.
- [ ] Persistir tool calls.
- [ ] Persistir resultados de tools.
- [ ] Persistir aprovação ou rejeição de tool calls.

### Checkpoints

- [ ] Criar checkpoint com snapshot das mensagens.
- [ ] Salvar descrição do checkpoint.
- [ ] Salvar timestamp.
- [ ] Criar endpoint ou mensagem WebSocket para checkpoint.
- [ ] Implementar listagem de checkpoints.
- [ ] Implementar restauração de checkpoint.
- [ ] Se possível, integrar restauração com Git futuramente.

### Contexto persistente de projeto

- [ ] Definir arquivo `GREENFORGE.md`.
- [ ] Procurar `GREENFORGE.md` na raiz do workspace.
- [ ] Ler conteúdo ao iniciar sessão.
- [ ] Incluir conteúdo no system prompt.
- [ ] Não falhar se arquivo não existir.
- [ ] Não sobrescrever `GREENFORGE.md` sem aprovação.
- [ ] Permitir que agente leia `GREENFORGE.md`.

### Frontend de sessões

- [ ] Criar seletor de sessões no chat.
- [ ] Buscar sessões via `GET /api/sessions?workspace=...`.
- [ ] Mostrar sessões ordenadas por atualização.
- [ ] Permitir abrir sessão antiga.
- [ ] Usar `sessionId` antigo ao retomar conversa.
- [ ] Mostrar título da sessão se existir.
- [ ] Criar botão de deletar sessão.
- [ ] Criar botão de checkpoint.
- [ ] Mostrar confirmação antes de deletar sessão.

### Aceite da Fase 4

- [ ] Criar conversa.
- [ ] Recarregar navegador.
- [ ] Retomar conversa anterior.
- [ ] Verificar que histórico não foi perdido.
- [ ] Verificar que tool calls foram persistidas.
- [ ] Verificar banco com SQLite CLI.
- [ ] Criar checkpoint.
- [ ] Confirmar checkpoint no banco.
- [ ] Deletar sessão remove mensagens relacionadas.
- [ ] Reiniciar backend não apaga sessões.

---

## 5. Modos de execução e segurança avançada

### Modos

- [ ] Implementar modo `plan`.
- [ ] Implementar modo `auto_edit`.
- [ ] Implementar modo `yolo`.
- [ ] No modo `plan`, tudo exige aprovação.
- [ ] No modo `auto_edit`, leitura pode ocorrer sem aprovação.
- [ ] No modo `auto_edit`, escrita exige aprovação.
- [ ] No modo `auto_edit`, shell exige aprovação.
- [ ] No modo `yolo`, ações rodam sem aprovação.
- [ ] Mesmo em `yolo`, segredos continuam protegidos.
- [ ] Mesmo em `yolo`, paths fora do workspace continuam bloqueados.
- [ ] Persistir modo da sessão no SQLite.
- [ ] Enviar `switch_mode` do frontend para backend.

### UI dos modos

- [ ] Adicionar seletor de modo na StatusBar.
- [ ] Verde para `auto_edit`.
- [ ] Amarelo para `plan`.
- [ ] Vermelho para `yolo`.
- [ ] Mostrar aviso claro ao ativar `yolo`.
- [ ] Mostrar tooltip explicando cada modo.
- [ ] Atualizar modo visual em tempo real.
- [ ] Salvar modo atual no Zustand.
- [ ] Enviar modo atual em cada `chat_message`.

### Segurança mínima

- [ ] Bloquear leitura de arquivos sensíveis.
- [ ] Redigir segredos em qualquer output.
- [ ] Redigir segredos antes do contexto do LLM.
- [ ] Sanitizar ambiente de subprocessos.
- [ ] Bloquear path traversal.
- [ ] Validar origem WebSocket.
- [ ] Validar payloads com Zod.
- [ ] Limitar tamanho de mensagem do usuário.
- [ ] Limitar tamanho de arquivos lidos.
- [ ] Limitar número de resultados de busca.
- [ ] Limitar profundidade de listagem de diretórios.
- [ ] Limitar número de tool calls por loop.
- [ ] Implementar rate limit de 50 tool calls por 2 minutos.
- [ ] Interromper loops anômalos.
- [ ] Logar eventos de segurança.
- [ ] Nunca logar `process.env`.

### Docker sandbox opcional

- [ ] Instalar `dockerode`.
- [ ] Instalar `@types/dockerode`.
- [ ] Criar `server/src/tools/shell/dockerRunner.ts`.
- [ ] Ativar apenas se `ENABLE_DOCKER_SANDBOX=true`.
- [ ] Usar imagem `node:22-alpine`.
- [ ] Montar workspace em `/workspace`.
- [ ] Definir `WorkingDir` como `/workspace`.
- [ ] Bloquear rede com `NetworkMode: none`.
- [ ] Limitar memória.
- [ ] Limitar CPU.
- [ ] Não passar variáveis de ambiente do host.
- [ ] Remover container ao final.
- [ ] Matar container em timeout.
- [ ] Retornar stdout.
- [ ] Retornar stderr.
- [ ] Retornar exit code.
- [ ] Fazer fallback claro se Docker não estiver disponível.

### Aceite da Fase 5

- [ ] Mudar modo no frontend altera visual da StatusBar.
- [ ] Modo `plan` pede aprovação até para leitura.
- [ ] Modo `auto_edit` pede aprovação para escrita.
- [ ] Modo `yolo` executa sem modal.
- [ ] `.env` não pode ser lido.
- [ ] API keys aparecem como `[REDACTED]`.
- [ ] `../../etc/passwd` é bloqueado.
- [ ] Comando perigoso exige aprovação.
- [ ] Comando com segredo no output é redigido.
- [ ] Docker sandbox funciona se habilitado.
- [ ] Sem Docker, execução local continua funcionando.

---

## 6. MCP — Model Context Protocol

### Instalação

- [ ] Instalar `@modelcontextprotocol/sdk`.
- [ ] Criar pasta `server/src/mcp/`.
- [ ] Criar `server/src/mcp/loader.ts`.
- [ ] Criar `server/src/mcp/client.ts`.
- [ ] Criar suporte inicial apenas para transporte `stdio`.
- [ ] Planejar suporte HTTP para versão futura.

### Configuração

- [ ] Definir arquivo `greenforge.config.json` na raiz do workspace.
- [ ] Criar chave `mcpServers`.
- [ ] Suportar `transport`.
- [ ] Suportar `command`.
- [ ] Suportar `args`.
- [ ] Suportar `env`.
- [ ] Suportar `disabled`.
- [ ] Expandir variáveis `${VAR_NAME}`.
- [ ] Não falhar se config não existir.
- [ ] Não falhar se um servidor MCP falhar.
- [ ] Logar erro de servidor MCP sem derrubar backend.

### Cliente MCP

- [ ] Criar cliente com `Client`.
- [ ] Criar transporte com `StdioClientTransport`.
- [ ] Conectar ao servidor MCP.
- [ ] Chamar `listTools`.
- [ ] Registrar ferramentas MCP no Tool Registry.
- [ ] Prefixar ferramentas com nome do servidor.
- [ ] Exemplo: `filesystem__read_file`.
- [ ] Criar adaptador `MCPToolAdapter`.
- [ ] Implementar `execute`.
- [ ] Implementar `describeAction`.
- [ ] Assumir ferramentas MCP como destrutivas por segurança.
- [ ] Aplicar mesmo fluxo de aprovação.
- [ ] Aplicar redaction em resultados MCP.
- [ ] Fechar conexões MCP ao encerrar servidor, se possível.

### Integração com Registry

- [ ] Carregar MCP configs ao construir registry.
- [ ] Registrar ferramentas nativas.
- [ ] Registrar ferramentas MCP depois.
- [ ] Evitar colisão de nomes.
- [ ] Permitir listar ferramentas disponíveis.
- [ ] Exibir ferramentas MCP no frontend futuramente.

### Aceite da Fase 6

- [ ] Criar `greenforge.config.json`.
- [ ] Configurar servidor MCP filesystem.
- [ ] Reiniciar backend.
- [ ] Ver log de ferramenta MCP registrada.
- [ ] Pedir ao agente para usar ferramenta MCP.
- [ ] Confirmar que chamada passa pelo mesmo loop.
- [ ] Confirmar que aprovação funciona para MCP.
- [ ] Desabilitar servidor MCP com `"disabled": true`.
- [ ] Verificar que ferramenta desaparece.
- [ ] Config com token ausente não derruba backend.

---

## 7. Multi-agente com Git Worktrees — opcional/futuro

### Pré-requisitos

- [ ] Fases 1 a 6 concluídas e estáveis.
- [ ] Workspace é um repositório Git.
- [ ] `git status` funciona no workspace.
- [ ] Working tree principal está limpo antes de criar tarefas paralelas.
- [ ] `.greenforge-workers/` está no `.gitignore`.
- [ ] Usuário entende que esta fase é opcional para MVP.

### Worktree Manager

- [ ] Criar `server/src/multiagent/`.
- [ ] Criar `worktreeManager.ts`.
- [ ] Implementar criação de worktree.
- [ ] Usar branch `greenforge/{taskId}`.
- [ ] Criar worktrees dentro de `.greenforge-workers/`.
- [ ] Implementar listagem de worktrees.
- [ ] Implementar remoção de worktree.
- [ ] Implementar merge de branch.
- [ ] Implementar rejeição de tarefa.
- [ ] Tratar conflitos de merge.
- [ ] Não apagar worktree principal por erro.
- [ ] Validar taskId antes de usar em comando shell.

### Task Orchestrator

- [ ] Criar `taskOrchestrator.ts`.
- [ ] Criar fila de tarefas.
- [ ] Definir status `pending`.
- [ ] Definir status `running`.
- [ ] Definir status `completed`.
- [ ] Definir status `failed`.
- [ ] Definir limite de concorrência.
- [ ] Usar `MAX_CONCURRENT_AGENTS`.
- [ ] Criar um agente por worktree.
- [ ] Criar um sessionId por tarefa.
- [ ] Rodar agentes em paralelo.
- [ ] Enviar eventos por taskId.
- [ ] Permitir cancelar tarefa.
- [ ] Permitir aceitar tarefa.
- [ ] Permitir rejeitar tarefa.
- [ ] Limpar worktrees ao rejeitar.
- [ ] Manter logs por tarefa.

### Verificação cruzada

- [ ] Criar agente verificador read-only.
- [ ] Rodar verificador após tarefa completar.
- [ ] Verificador deve ler diff da branch.
- [ ] Verificador não pode escrever arquivos.
- [ ] Verificador analisa bugs.
- [ ] Verificador analisa segurança.
- [ ] Verificador analisa consistência.
- [ ] Mostrar relatório antes do merge.
- [ ] Bloquear merge automático se verificador encontrar erro crítico, opcionalmente.

### Frontend multi-agente

- [ ] Criar `MultiAgentPanel`.
- [ ] Mostrar cards de tarefas.
- [ ] Mostrar status de cada tarefa.
- [ ] Mostrar logs resumidos.
- [ ] Mostrar diff da tarefa.
- [ ] Mostrar relatório do verificador.
- [ ] Botão Aceitar.
- [ ] Botão Rejeitar.
- [ ] Botão Cancelar.
- [ ] Criar formulário para nova tarefa paralela.
- [ ] Enviar `create_parallel_task` pelo WebSocket.
- [ ] Receber eventos por taskId.
- [ ] Atualizar UI em tempo real.

### Aceite da Fase 7

- [ ] Criar duas tarefas paralelas.
- [ ] Verificar dois worktrees com `git worktree list`.
- [ ] Verificar duas branches `greenforge/...`.
- [ ] Ver logs de dois agentes rodando.
- [ ] Uma tarefa conclui sem afetar outra.
- [ ] Aceitar tarefa faz merge.
- [ ] Rejeitar tarefa remove worktree.
- [ ] Conflito de merge é mostrado ao usuário.
- [ ] Verificador gera relatório.
- [ ] Branch principal não quebra após rejeição.

---

## 8. Testes automatizados

### Setup de testes

- [ ] Instalar `vitest`.
- [ ] Instalar `supertest`, se testar REST.
- [ ] Instalar mocks necessários.
- [ ] Criar pasta `server/tests/`.
- [ ] Criar script `npm test`.
- [ ] Criar script `npm run test:watch`.
- [ ] Criar script `npm run typecheck`.

### Testes de WebSocket

- [ ] Testar conexão WebSocket.
- [ ] Testar mensagem inválida.
- [ ] Testar `chat_message`.
- [ ] Testar `approve_action`.
- [ ] Testar `cancel_agent`.
- [ ] Testar `terminal_command`.
- [ ] Testar reconexão no frontend manualmente.

### Testes do Agent Loop

- [ ] Mockar resposta do LLM sem tool call.
- [ ] Mockar resposta do LLM com tool call.
- [ ] Testar execução de ferramenta.
- [ ] Testar rejeição de approval.
- [ ] Testar aprovação de approval.
- [ ] Testar limite de iterações.
- [ ] Testar cancelamento via AbortSignal.
- [ ] Testar erro de ferramenta.
- [ ] Testar redaction no resultado.

### Testes das ferramentas

- [ ] Testar `read_file` com arquivo existente.
- [ ] Testar `read_file` com arquivo inexistente.
- [ ] Testar `read_file` bloqueando `.env`.
- [ ] Testar `read_file` bloqueando path traversal.
- [ ] Testar `write_file` criando arquivo.
- [ ] Testar `write_file` sobrescrevendo arquivo.
- [ ] Testar `write_file` gerando diff.
- [ ] Testar `list_directory`.
- [ ] Testar `search_in_files`.
- [ ] Testar `execute_shell_command`.
- [ ] Testar timeout de shell.
- [ ] Testar sanitização de env.
- [ ] Testar `web_fetch` com URL válida.
- [ ] Testar `web_fetch` com URL inválida.

### Testes de banco

- [ ] Testar criação de sessão.
- [ ] Testar salvamento de mensagens.
- [ ] Testar retomada de sessão.
- [ ] Testar listagem por workspace.
- [ ] Testar delete cascade.
- [ ] Testar tool call persistido.
- [ ] Testar checkpoint criado.
- [ ] Testar checkpoint restaurado.

### Testes de segurança

- [ ] Testar redaction de Anthropic key.
- [ ] Testar redaction de OpenAI key.
- [ ] Testar redaction de JWT.
- [ ] Testar redaction de private key.
- [ ] Testar bloqueio de `.pem`.
- [ ] Testar bloqueio de `~/.ssh`.
- [ ] Testar bloqueio de `../../`.
- [ ] Testar origem WebSocket inválida.
- [ ] Testar comando perigoso.
- [ ] Testar rate limit de tool calls.

---

## 9. Testes manuais de ponta a ponta

- [ ] Abrir GreenForge no navegador.
- [ ] Confirmar conexão com backend.
- [ ] Enviar mensagem simples ao agente.
- [ ] Ver streaming no chat.
- [ ] Pedir ao agente para listar arquivos.
- [ ] Pedir ao agente para ler um arquivo.
- [ ] Pedir ao agente para criar um arquivo.
- [ ] Aprovar criação.
- [ ] Ver arquivo aparecer no Explorer.
- [ ] Abrir arquivo no Monaco.
- [ ] Pedir ao agente para modificar arquivo.
- [ ] Ver diff no ApprovalModal.
- [ ] Rejeitar modificação.
- [ ] Confirmar que arquivo não mudou.
- [ ] Aprovar modificação.
- [ ] Confirmar que arquivo mudou.
- [ ] Rodar comando no terminal real.
- [ ] Rodar `npm test` pelo terminal real.
- [ ] Criar checkpoint.
- [ ] Recarregar navegador.
- [ ] Retomar sessão.
- [ ] Confirmar histórico preservado.
- [ ] Testar modo `plan`.
- [ ] Testar modo `auto_edit`.
- [ ] Testar modo `yolo`.
- [ ] Testar bloqueio de `.env`.
- [ ] Testar MCP, se configurado.
- [ ] Testar Docker sandbox, se habilitado.

---

## 10. Definition of Done do MVP

O GreenForge só deve ser considerado MVP agêntico real quando todos estes itens estiverem concluídos:

- [ ] Existe backend Node.js real.
- [ ] Frontend não depende mais do agente mock.
- [ ] Comunicação frontend/backend ocorre via WebSocket.
- [ ] LLM real responde no chat.
- [ ] Resposta aparece em streaming.
- [ ] Agent loop executa múltiplas iterações.
- [ ] Tool Registry existe.
- [ ] Ferramentas reais estão registradas.
- [ ] Agente consegue ler arquivos reais.
- [ ] Agente consegue escrever arquivos reais.
- [ ] Agente consegue executar comandos shell.
- [ ] Terminal executa comandos reais.
- [ ] ApprovalModal funciona end-to-end.
- [ ] Diff é gerado antes de escrita.
- [ ] Rejeição impede execução.
- [ ] Sessões persistem em SQLite.
- [ ] Histórico sobrevive ao reload.
- [ ] Checkpoints existem.
- [ ] `GREENFORGE.md` é carregado no prompt.
- [ ] Modos `plan`, `auto_edit` e `yolo` existem.
- [ ] Trusted Folders bloqueia paths externos.
- [ ] Secret Redactor remove segredos.
- [ ] `.env` não pode ser lido pelo agente.
- [ ] Shell commands têm timeout.
- [ ] Env vars sensíveis não vazam para subprocessos.
- [ ] MCP funciona com pelo menos um servidor externo.
- [ ] Testes básicos passam.
- [ ] TypeScript compila sem erro.
- [ ] Nenhum segredo foi commitado.
- [ ] O sistema roda localmente com `npm run dev`.

---

## 11. Definition of Done do diferencial Verdent-like

Esta parte só vale depois do MVP.

- [ ] MultiAgentPanel existe.
- [ ] Usuário pode criar múltiplas tarefas.
- [ ] Cada tarefa cria um git worktree isolado.
- [ ] Cada tarefa roda com sessionId próprio.
- [ ] Agentes rodam em paralelo.
- [ ] Existe limite de concorrência.
- [ ] Cada tarefa tem status visual.
- [ ] Cada tarefa tem log próprio.
- [ ] Cada tarefa tem diff próprio.
- [ ] Usuário pode aceitar tarefa.
- [ ] Aceitar tarefa faz merge.
- [ ] Usuário pode rejeitar tarefa.
- [ ] Rejeitar tarefa remove worktree.
- [ ] Existe verificador automático read-only.
- [ ] Verificador gera relatório antes do merge.
- [ ] Conflitos de merge são mostrados ao usuário.
- [ ] Branch principal não é modificada até aceite explícito.
- [ ] `.greenforge-workers/` não é commitado.
- [ ] O sistema se comporta como orquestrador, não apenas como chat.

---

## 12. Checklist final antes de entregar para uso real

- [ ] Rodar `npm run typecheck`.
- [ ] Rodar `npm test`.
- [ ] Rodar frontend.
- [ ] Rodar backend.
- [ ] Testar fluxo completo chat → LLM → tool call → approval → execução.
- [ ] Testar terminal real.
- [ ] Testar persistência.
- [ ] Testar segurança.
- [ ] Testar reload do navegador.
- [ ] Testar queda e retorno do backend.
- [ ] Revisar `.gitignore`.
- [ ] Rodar `git status`.
- [ ] Confirmar que `.env` não aparece.
- [ ] Confirmar que banco local não aparece.
- [ ] Confirmar que worktrees não aparecem.
- [ ] Fazer commit.
- [ ] Criar tag de versão MVP, se desejar.
- [ ] Documentar como configurar `.env`.
- [ ] Documentar como rodar frontend e backend.
- [ ] Documentar quais providers LLM são suportados.
- [ ] Documentar limitações atuais.
- [ ] Separar Fase 7 como roadmap se ainda não implementada.

Esse checklist, se seguido do começo ao fim, transforma o GreenForge de uma IDE web com agente mockado em um sistema agêntico real, com backend, LLM, ferramentas, terminal verdadeiro, aprovação humana, persistência, segurança e extensibilidade.