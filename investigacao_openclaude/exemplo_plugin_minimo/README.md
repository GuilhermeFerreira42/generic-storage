# GreenForge Plugin para OpenClaude

Plugin de análise de sustentabilidade e impacto ambiental para projetos de software.
Migrado do Gemini CLI Extension para OpenClaude Plugin.

## Componentes

| Componente | Tipo | Arquivo | Descrição |
|-----------|------|---------|-----------|
| greenforge-plan | Command/Skill | commands/greenforge-plan.md | Gera plano de projeto sustentável |
| greenforge-reviewer | Skill | skills/greenforge-reviewer/SKILL.md | Realiza revisão de código verde |
| greenforge-agent | Agent | agents/greenforge-agent.md | Agent especializado em análise verde |
| pre-tool-use-safety | Hook (PreToolUse) | hooks/hooks.json | Bloqueia comandos perigosos |
| post-write-log | Hook (PostToolUse) | hooks/hooks.json | Audita arquivos modificados |
| on-stop-summary | Hook (Stop) | hooks/hooks.json | Resumo da sessão |
| greenforge-storage | MCP Server | .mcp.json | Persistência SQLite (opcional) |
| greenforge-metrics | MCP Server | .mcp.json | Métricas de sustentabilidade (opcional) |

## Instalação

### Método 1: Instalação Local (Desenvolvimento)

```bash
# Clone ou copie o plugin para a pasta de plugins do OpenClaude
mkdir -p ~/.openclaude/plugins
cp -r greenforge ~/.openclaude/plugins/

# Ou crie um link simbólico
ln -s /caminho/para/greenforge ~/.openclaude/plugins/greenforge
```

### Método 2: Via Marketplace (quando disponível)

```bash
# No Claude Code, instale via comando
/install-plugin greenforge
```

### Ativação

Edite `~/.claude/settings.json` e adicione:

```json
{
  "plugins": {
    "enabledPlugins": {
      "greenforge": true
    }
  }
}
```

## Uso

### Comandos Slash

```bash
# Gera um plano de projeto sustentável
/greenforge-plan

# Ou usando a sintaxe de skill
/greenforge:greenforge-plan [diretório]
```

### Skills

```bash
# Revisão de código focada em sustentabilidade
/greenforge:greenforge-reviewer src/

# Analisa arquivos Python específicos
/greenforge:greenforge-reviewer *.py
```

### Agents

```bash
# Invoca o agent especializado
@greenforge-agent

# Ou via ferramenta Task
Task(agent="greenforge-agent", prompt="Analise o módulo src/api em busca de otimizações")
```

## Desenvolvimento

Este plugin foi criado como parte da migração do GreenForge do Gemini CLI para OpenClaude.

### Estrutura de Arquivos

```
greenforge/
├── .claude-plugin/
│   └── plugin.json              ← Metadados do plugin
├── commands/
│   └── greenforge-plan.md       ← Comando slash (legado)
├── skills/
│   └── greenforge-reviewer/
│       └── SKILL.md             ← Skill canônica
├── agents/
│   └── greenforge-agent.md      ← Definição de agent
├── hooks/
│   ├── hooks.json               ← Configuração de hooks
│   ├── pre-tool-use-safety.sh   ← Script de segurança
│   ├── post-write-log.sh        ← Script de auditoria
│   └── on-stop-summary.sh       ← Script de resumo
├── .mcp.json                    ← MCP servers (opcional)
└── README.md                    ← Este arquivo
```

### Adicionando Novos Componentes

#### Nova Skill

1. Crie diretório `skills/nome-da-skill/`
2. Adicione `SKILL.md` com frontmatter YAML
3. Registre no `plugin.json` (se usar registro explícito)

#### Novo Hook

1. Crie script em `hooks/novo-hook.sh`
2. Adicione entrada em `hooks/hooks.json`
3. Teste com eventos relevantes

#### Novo Agent

1. Crie `agents/novo-agent.md`
2. Defina frontmatter com tools permitidas
3. Use `isolation: worktree` se necessário

### Testando Localmente

```bash
# Inicie o Claude Code no diretório do plugin
cd /caminho/para/greenforge
claude

# Teste os comandos
/greenforge-plan

# Verifique logs
cat ~/.claude/logs/*.log
```

## Compatibilidade

- **OpenClaude versão mínima**: 1.0.0
- **Claude Code upstream**: Versões recentes com suporte a plugins
- **Testado em**: Linux, macOS

## Licença

MIT License - ver arquivo LICENSE no repositório principal.

## Contribuição

Contribuições são bem-vindas! Veja o repositório principal do GreenForge para diretrizes.

## Links Relacionados

- [Documentação do OpenClaude](https://openclaude.gitlawb.com/)
- [Repositório OpenClaude](https://github.com/Gitlawb/openclaude)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [GreenForge Original (Gemini CLI)](https://github.com/greenforge/greenforge)
