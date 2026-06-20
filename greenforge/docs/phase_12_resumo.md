# Resumo da Fase 12 — Qwen Integration Base
> Data: 2026-06-20

## Objetivo
Criar a base estática e testável de integração do GreenForge como extensão do Qwen CLI. Esta fase serve para validar estaticamente os contratos declarativos (manifesto, hooks de lifecycle e manifesto de skills), garantindo segurança estrutural (bloqueios, restrições e prevenção contra injeção ou links malformados) antes de qualquer acoplamento de execução real.

## Entregáveis
- `qwen-extension.json`: Manifesto raiz que define a extensão, declarando o servidor MCP `greenforge` (usando execução segura de Node e sem shell/exec), pasta de skills e caminhos de hooks.
- `.qwen/skills/greenforge/SKILL.md`: Manifesto de skill estático contendo o frontmatter YAML com informações da extensão e o corpo markdown listando os comandos suportados (`start`, `status`, `list`, `approve`, `abort`).
- `.qwen/settings.json`: Configurações de hooks mapeando os eventos de ciclo de vida e ferramentas (`SessionStart`, `SessionEnd`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `SubagentStart`, `SubagentStop`) direcionados para o servidor local com validação estrita.
- `src/integration/qwen/manifestSchemas.ts`: Schemas e validadores Zod para validação síncrona/estática dos arquivos de configuração e manifesto da extensão, incluindo restrições contra shell, injeções, links malformados e caminhos relativos inválidos.
- `tests/qwen-integration.test.ts`: Suíte de testes automatizados estáticos contendo 24 casos de teste cobrindo todas as 15 restrições de validação estipuladas e a validação contra caminhos/URLs malformados.
- `docs/phase_12_resumo.md`: Este documento de resumo.

## Principais Decisões
- **Integração Estática e Segura (TDD):** A validação é completamente determinística, garantindo que nenhum teste chame o Qwen CLI real, rede, ou servidores MCP externos.
- **Proteção do PreToolUse:** Garantida a restrição explícita de `PreToolUse` para validar operações críticas como `Write`, `WriteFile`, `Edit`, `MultiEdit`, e `Bash` antes do processamento no host.
- **Detecção de Caminhos Malformados:** Implementada proteção rigorosa baseada em regex para evitar a gravação de caminhos ou URLs no formato markdown que possam gerar links quebrados ou comportamentos inseguros.
- **Blindagem contra Exec:** Banimento explícito do uso do utilitário `exec` ou injeções de subprocesso (`child_process.exec` ou `shell: true`) nas configurações de MCP e hooks.
- **Testes de Integridade Anti-Markdown:** Adicionados testes rigorosos que validam que nenhuma URL ou caminho de arquivo na extensão possua colchetes `[` ou `]` ou parênteses `(` ou `)` em seu formato final, evitando qualquer tipo de escape markdown.

## Testes
- **Total:** 24 testes estáticos específicos de integração no arquivo `tests/qwen-integration.test.ts` (elevando o total de testes do GreenForge para 178).
- **Status:** 100% PASSANDO.
- **Comando:** `npm test`

## Riscos Conhecidos
- **Acoplamento Físico de Portas:** O hook está mapeado para `localhost:7777`. Caso a porta esteja em uso, haverá erros de conexão na execução real do MCP. O design permite configuração de `GF_MCP_PORT`, mas a validação estática assume 7777 por padrão.

## Próxima Fase
- **Onda 4 — Fase 13 (Qwen Integration E2E / Execution)**
