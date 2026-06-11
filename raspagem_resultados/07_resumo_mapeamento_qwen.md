# RASPAGEM 7 — Resumo do Mapeamento Gemini CLI → Qwen CLI
# Data: 2026-06-11
# ============================================================================

## VISÃO GERAL DO MAPEAMENTO

Esta seção consolida todo o conhecimento extraído da documentação original do GreenForge 
e mapeia cada componente para seu equivalente no Qwen CLI.

---

## TABELA DE MAPEAMENTO COMPLETA

### 1. Hooks e Eventos

| Gemini CLI | Qwen CLI | Compatibilidade | Notas |
|------------|----------|-----------------|-------|
| `activate(context)` | Skill `onLoad()` / Plugin init | ✅ Direto | Qwen usa lifecycle diferente mas equivalente |
| `deactivate()` | Skill `onUnload()` / Plugin dispose | ✅ Direto | Mesma semântica de cleanup |
| `onMessage(handler)` | Hook `UserPromptSubmit` | ✅ Via hooks.json | Intercepta prompts do usuário |
| `onToolCall(handler)` | Hook `PreToolUse` | ✅ Via hooks.json | Valida ferramentas antes de executar |
| `onStateChange(handler)` | ❌ Não existe nativo | ⚠️ Workaround | Usar combinação PreToolUse + PostToolUse |
| `PermissionRequest` | Hook `PermissionRequest` | ✅ Nativo no Qwen | Mesmo nome e semântica |
| `SessionStart` | Hook `SessionStart` | ✅ Nativo no Qwen | Mesmo nome e semântica |
| `SessionEnd` | Hook `SessionEnd` | ✅ Nativo no Qwen | Mesmo nome e semântica |
| `SubagentStart` | Hook `SubagentStart` | ✅ Nativo no Qwen | Específico do Qwen |
| `SubagentStop` | Hook `SubagentStop` | ✅ Nativo no Qwen | Específico do Qwen |

### 2. Persistência de Estado

| Gemini CLI | Qwen CLI | Compatibilidade | Notas |
|------------|----------|-----------------|-------|
| `globalState.get/set` | `Storage.global` | ✅ Similar | Qwen usa classe Storage separada |
| `workspaceState.get/set` | `Storage.workspace` | ✅ Similar | Mesma semântica |
| `extensionContext.extensionPath` | `Config.workspaceDir` | ⚠️ Adapter necessário | Qwen separa Config de Storage |
| `context.subscriptions` | Plugin disposables | ✅ Similar | Padrão Disposable mantido |
| `context.log` | `Logger` do Qwen | ✅ Similar | API de logging equivalente |

### 3. Registro de Ferramentas

| Gemini CLI | Qwen CLI | Compatibilidade | Notas |
|------------|----------|-----------------|-------|
| `registerTool(name, schema, handler)` | Skill manifest `tools` | ⚠️ Estático | Skill manifest é estático (JSON/YAML) |
| N/A | MCP Server tools | ✅ Dinâmico | MCP permite registro runtime |
| N/A | Hook `PostToolUse` response | ✅ Dinâmico | Pode modificar tool execution |

### 4. Comandos Slash

| Gemini CLI | Qwen CLI | Compatibilidade | Notas |
|------------|----------|-----------------|-------|
| `/greenforge-start` | Skill command `start` | ✅ Via SKILL.md | Definir em argument-hint |
| `/greenforge-status` | Skill command `status` | ✅ Via SKILL.md | Mesma UX |
| `/greenforge-list` | Skill command `list` | ✅ Via SKILL.md | Mesma UX |
| `/greenforge-approve` | MCP tool `forge_approve` | ⚠️ Via MCP | Requer MCP Server |
| `/greenforge-abort` | MCP tool `forge_abort` | ⚠️ Via MCP | Requer MCP Server |

### 5. Sistema de Skills/Agents

| Gemini CLI | Qwen CLI | Compatibilidade | Notas |
|------------|----------|-----------------|-------|
| Subagentes customizados | Qwen Skills | ✅ Similar | Qwen tem sistema próprio de skills |
| NEXUS orchestrator | Skill composition | ⚠️ Redesign | Qwen permite chaining de skills |
| Agent handoff protocol | Skill context passing | ✅ Similar | Contexto pode ser passado entre skills |

### 6. MCP (Model Context Protocol)

| Gemini CLI | Qwen CLI | Compatibilidade | Notas |
|------------|----------|-----------------|-------|
| N/A (não suportado) | MCP Servers nativo | ✅ Novo recurso | Qwen tem suporte built-in a MCP |
| N/A | MCP tool discovery | ✅ Automático | Tools descobertas automaticamente |
| N/A | MCP OAuth auth | ✅ Built-in | Qwen gerencia OAuth automaticamente |

---

## ESTRATÉGIA DE MIGRAÇÃO RECOMENDADA

### Camada 1: Skill Manifest (Estático)
```yaml
# skills/greenforge/SKILL.md
name: greenforge
description: Gerenciamento de tarefas com worktrees git isolados
argument-hint: '<command> [args]'
commands:
  - start
  - status  
  - list
allowedTools:
  - run_shell_command
  - read_file
  - write_file
  - glob
  - grep_search
```

### Camada 2: Hooks JSON (Interceptação)
```json
// .qwen/hooks.json
{
  "PreToolUse": [
    {
      "type": "http",
      "url": "http://localhost:7777/pre-tool-use",
      "timeout": 5000,
      "if": "tool in ['write_file', 'run_shell_command']"
    }
  ],
  "SessionStart": [
    {
      "type": "http",
      "url": "http://localhost:7777/session-start",
      "timeout": 3000
    }
  ],
  "SubagentStart": [
    {
      "type": "http",
      "url": "http://localhost:7777/subagent-start",
      "timeout": 3000
    }
  ]
}
```

### Camada 3: MCP Server (Dinâmico)
```typescript
// mcp-server/index.ts
import { Server } from '@modelcontextprotocol/sdk/server';

const server = new Server({
  name: 'greenforge-mcp',
  version: '1.0.0'
});

server.registerTool('forge_start_task', {
  description: 'Inicia nova tarefa GreenForge',
  inputSchema: z.object({
    taskName: z.string(),
    branchName: z.string().optional()
  }),
  handler: async (args) => {
    // Core GreenForge logic
  }
});

server.registerTool('forge_approve_plan', {
  // ...
});
```

### Camada 4: Core Inalterado
```typescript
// src/core/ - INALTERADO DA MIGRAÇÃO
StateMachine.ts      // 10 estados, mesma lógica
WorktreeManager.ts   // Git worktrees, mesma lógica
DiffLens.ts          // Aplicação segura de diffs
GateManager.ts       // Validação de planos
Database.ts          // SQLite WAL
```

---

## ARQUITETURA FINAL PROPOSTA

```
┌─────────────────────────────────────────────────────────┐
│                    QWEN CLI HOST                        │
│  (Skills, Hooks, MCP, Channels, SDK TypeScript)         │
├─────────────────────────────────────────────────────────┤
│              GREENFORGE PLUGIN FOR QWEN                 │
│  ┌─────────────────────────────────────────────────┐    │
│  │              qwen-extension.json                │    │
│  │  (Manifesto do plugin, metadata, version)       │    │
│  └─────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────┐    │
│  │              skills/greenforge/                 │    │
│  │  ├── SKILL.md (definição estática)              │    │
│  │  └── commands/ (implementação dos comandos)     │    │
│  └─────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────┐    │
│  │              .qwen/hooks.json                   │    │
│  │  (Hooks PreToolUse, SessionStart, etc.)         │    │
│  └─────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────┐    │
│  │              MCP Server (porta 7777)            │    │
│  │  ├── forge_start_task                           │    │
│  │  ├── forge_list_tasks                           │    │
│  │  ├── forge_approve_plan                         │    │
│  │  └── forge_abort                                │    │
│  └─────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────┐    │
│  │           src/plugin/QwenPluginAdapter          │    │
│  │  - Inicializa MCP Server                        │    │
│  │  - Registra hooks HTTP                          │    │
│  │  - Bridge entre Qwen e Core                     │    │
│  └─────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────┤
│                  CORE GREENFORGE                        │
│  (StateMachine, WorktreeManager, DiffLens, Gates)       │
│  ← INALTERADO: mesma lógica, mesma implementação        │
├─────────────────────────────────────────────────────────┤
│                    SUBAGENTES                           │
│  (Explorer, CodeReviewer, Verifier, Planner)            │
│  ← INALTERADO: mesma lógica, mesma implementação        │
└─────────────────────────────────────────────────────────┘
```

---

## CHECKLIST DE MIGRAÇÃO

### Documentação
- [ ] Reescrever README.md para Qwen CLI
- [ ] Atualizar 01-vision-and-architecture.md com diagrama Qwen
- [ ] Reescrever GREENFORGE_DESIGN.md Seção 3 (Integração)
- [ ] Atualizar 06-api-and-extensibility.md para Plugin API Qwen
- [ ] Criar guia de migração específico (MIGRATION_GUIDE.md)
- [ ] Atualizar exemplos de código em toda documentação

### Código
- [ ] Criar estrutura de plugin Qwen (qwen-extension.json)
- [ ] Implementar SKILL.md com comandos estáticos
- [ ] Configurar .qwen/hooks.json para interceptação
- [ ] Implementar MCP Server com ferramentas dinâmicas
- [ ] Criar QwenPluginAdapter como bridge
- [ ] Portar testes de integração para Qwen mocks
- [ ] Validar core inalterado com testes unitários

### Infraestrutura
- [ ] Publicar pacote npm @greenforge/qwen-plugin
- [ ] Configurar CI/CD para build e release
- [ ] Documentar processo de instalação para usuários
- [ ] Criar exemplos de uso no repositório

---

## [PROATIVO] LIÇÕES APRENDIDAS E RISCOS

### Lições Aprendidas

1. **Core é realmente agnóstico**: StateMachine, WorktreeManager, etc. não dependem do host
2. **MCP é o futuro**: Padrão emergente, vale investir tempo aprendendo
3. **Qwen é mais aberto**: Mais pontos de extensão que Gemini CLI
4. **Documentação é crítica**: Sem docs claras, migração fica ambígua

### Riscos Identificados

1. **Hook onStateChange não existe**: Perder capacidade de sync UI em tempo real
   - Mitigação: Usar polling ou combinar PreToolUse + PostToolUse

2. **Skill manifest é estático**: Não permite registro dinâmico de tools
   - Mitigação: MCP Server cobre este caso de uso

3. **Qwen SDK é mais novo**: Menos comunidade, menos exemplos
   - Mitigação: Ler código fonte do Qwen CLI diretamente

4. **Breaking changes no Qwen**: Projeto em evolução rápida
   - Mitigação: Pin versão específica do @qwen-code/sdk

---

## PRÓXIMOS PASSOS IMEDIATOS

1. **Validar este mapeamento** com equipe técnica
2. **Criar proof-of-concept** mínimo (apenas Skill + 1 hook)
3. **Testar MCP Server** standalone antes de integrar
4. **Portar 1 teste de integração** para validar abordagem
5. **Iterar na documentação** com feedback real de implementação

