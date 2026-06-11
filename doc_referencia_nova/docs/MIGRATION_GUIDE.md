# Guia de Migração: GreenForge (Gemini → Qwen)

Este documento descreve as mudanças necessárias para migrar o GreenForge do Gemini CLI para o Qwen CLI.

## 1. Mudanças na Arquitetura de Extensão

O Qwen CLI utiliza um modelo de plug-in tripartido, substituindo o antigo sistema de hooks em runtime do Gemini CLI.

| Característica | Gemini CLI (Antigo) | Qwen CLI (Novo) |
|---|---|---|
| Registro | `activate(context)` em runtime | `qwen-extension.json` estático |
| Comandos | Slash commands registrados via API | `SKILL.md` manifest |
| Hooks | Callbacks no objeto `context` | `settings.json` declarativo |
| Ferramentas | `registerTool()` | MCP Server (RPC) |

## 2. Terminology & Branding

Todos os documentos foram atualizados para refletir a nova plataforma:
- **Gemini CLI** → **Qwen CLI**
- **gemini-cli** → **qwen-code**
- **.gemini/** → **.qwen/**
- **GEMINI_API_KEY** → **QWEN_API_KEY**

## 3. Configuração de Hooks

Os antigos hooks `onMessage` e `onToolCall` foram mapeados para os novos hooks do Qwen:

- `onMessage` → `UserPromptSubmit`
- `onToolCall` → `PreToolUse`
- `onStateChange` → `PreToolUse` + `PostToolUse` (sync de estado)
- `activate` → `SessionStart`
- `deactivate` → `SessionEnd`

## 4. Requisitos Técnicos

A migração exige atualização da stack base:
- **Node.js**: v20+ → **v22+**
- **Qwen CLI**: v0.4+
- **Protocolo**: Inclusão do **Model Context Protocol (MCP)** para ferramentas dinâmicas.

## 5. Estrutura de Arquivos da Extensão

```
greenforge/
├── qwen-extension.json      # Novo manifesto
├── .qwen/
│   ├── skills/              # Pasta de skills
│   │   └── greenforge/
│   │       └── SKILL.md     # Manifesto da skill GreenForge
│   └── settings.json        # Configuração de hooks
├── src/
│   ├── mcp-server/          # Novo servidor MCP
│   └── plugin/
│       └── QwenPluginAdapter.ts # Novo adaptador para o Host
```

## 6. Passos para Atualização

1. Renomear variáveis de ambiente no `.env`.
2. Criar os manifestos `qwen-extension.json` e `SKILL.md`.
3. Implementar o `QwenPluginAdapter` para abstrair a comunicação com o host.
4. Migrar ferramentas customizadas para o servidor MCP.
5. Atualizar todos os testes de integração para usar o `MockHookRunner`.
