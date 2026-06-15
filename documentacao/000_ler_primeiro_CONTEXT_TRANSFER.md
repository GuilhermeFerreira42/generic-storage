# CONTEXT_TRANSFER.md — GreenForge Onboarding para Agentes de IA

> **Leia este arquivo primeiro, antes de qualquer outro.**
> **Versão:** 1.1.0 | **Data:** 2026-06-11

---

## O QUE É ESTE PROJETO

O **GreenForge** é uma extensão para o **Qwen CLI** que transforma o agente de IA em um engenheiro autônomo. Ele automatiza o ciclo **Plan → Code → Verify** usando Git Worktrees para isolamento físico de tarefas e múltiplos subagentes especializados rodando em paralelo.

É inspirado no **Verdant AI** e segue os mesmos princípios: planejamento obrigatório antes de qualquer escrita, isolamento por worktree, verificação automática de código, e revisão humana antes do merge.

O projeto está em **fase de design documental**. Nenhum código foi escrito ainda. Sua missão começa aqui.

---

## ESTADO ATUAL

- ✅ Documentação de arquitetura completa e auditada (15/15 critérios aprovados)
- ✅ Schema de banco de dados definido
- ✅ Interfaces TypeScript especificadas
- ✅ Máquina de estados completa com regras de transição
- ✅ Cenários Gherkin prontos para implementação
- ✅ Rastreabilidade RF/RNF com arquivos de teste nomeados
- ⬜ Código de produção: não iniciado
- ⬜ Testes: não iniciados

---

## REGRA MAIS IMPORTANTE

> **`GREENFORGE_DESIGN.md` é a Fonte Única da Verdade.**
> Em caso de contradição entre qualquer documento e o DESIGN, o DESIGN prevalece sempre.
> Nunca implemente nada que divirja do DESIGN sem registrar um novo ADR.

---

## STACK TECNOLÓGICA

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js v22+ |
| Banco de dados | SQLite (WAL Mode) via `better-sqlite3` |
| Execução de processos | `execa` com `shell: false` (obrigatório) |
| Testes | Vitest |
| Integração CLI | Qwen CLI Extension (Skill + Hooks + MCP) |
| Roteamento de intenção | Qwen 2.5 (ou modelo configurado) |
| MCP Server | `@modelcontextprotocol/sdk` v1.x |

> ⚠️ Bun foi avaliado e rejeitado (ADR-05). Não use Bun em nenhuma circunstância.

---

## ORDEM DE LEITURA DOS DOCUMENTOS

Leia nesta sequência exata antes de escrever qualquer código ou teste:

1. **`GREENFORGE_DESIGN.md`** — Fonte única da verdade. Arquitetura completa, subagentes, máquina de estados, segurança, rastreabilidade. Leia integralmente.
2. **`03-technical-spec-and-data.md`** — Schema SQL completo, interfaces TypeScript, algoritmos centrais.
3. **`02-functional-requirements.md`** — RFs e RNFs com critérios de aceite.
4. **`05-governance-and-security.md`** — Modelo de ameaças T-01 a T-07, contratos de segurança.
5. **`09-hardening-deterministic-contracts.md`** — SafeResolve, atomic write, anti-padrões proibidos.
6. **`04-operational-playbooks.md`** — Playbooks de incidente INC-001 e INC-003.
7. **`06-api-and-extensibility.md`** — Contrato de subagentes e protocolo de handoff de artefatos.
8. **`01-vision-and-architecture.md`** — Visão geral e justificativa estratégica.
9. Demais arquivos (`NEXUS_*.md`, `MAESTRO`, `README`) — Contexto adicional e histórico de decisões.

---

## POR ONDE COMEÇAR (TDD)

A implementação segue TDD estrito: escreva o teste falhando (RED) antes de qualquer código de produção.

**Ordem recomendada dos arquivos de teste:**

| Ordem | Arquivo | Componente | Tipo |
|---|---|---|---|
| 1 | `router.test.ts` | IntentionRouter | Unitário (mock API) |
| 2 | `worktree.test.ts` | WorktreeManager | Integração (Git real) |
| 3 | `security.test.ts` | SafeResolve + No-Shell | Segurança |
| 4 | `planner.test.ts` | Plan Mode Engine | Unitário |
| 5 | `verifier.test.ts` | @Verifier | Unitário |
| 6 | `difflens.test.ts` | DiffLens | Unitário |
| 7 | `rules.test.ts` | AGENTS.md + @Code-Reviewer | Unitário |
| 8 | `parallel.test.ts` | Orquestrador paralelo + join gate | Integração |
| 9 | `handoff.test.ts` | AgentArtifact + SQLite | Integração |
| 10 | `resilience.test.ts` | Auto-healing + retry | Integração |
| 11 | `performance.test.ts` | Latência P95 < 1200ms | Performance |
| 12 | `stress.test.ts` | 5 subtarefas paralelas sem OOM | Stress |
| 13 | `context.test.ts` | Context Capsules -80% tokens | Unitário |

**Comece pelo `router.test.ts`.** É o componente mais simples, tem interface bem definida, e não depende de nenhum outro componente.

---

## CONTRATOS DE SEGURANÇA INVIOLÁVEIS

Estes contratos nunca podem ser violados em nenhum código que você escrever:

1. **SafeResolve**: Nunca use `path.resolve` puro. Sempre use `fs.realpath` + validação de prefixo contra o worktree root.
2. **No-Shell Policy**: Nunca use `child_process.exec` ou `shell: true`. Use exclusivamente `execa` com arrays de argumentos.
3. **Atomic Write**: Nunca escreva diretamente no arquivo destino. Use sempre o padrão `.tmp` → `fsync` → `rename`.
4. **Worktree Boundary**: Subagentes têm leitura global, mas escrita restrita ao próprio worktree. Violações lançam `WorktreeAccessViolationError`.

---

## COMPONENTES CENTRAIS E SEUS ARQUIVOS

| Componente | ID | Arquivo de implementação | Arquivo de teste |
|---|---|---|---|
| Intention Router | GF-ROUTER | `src/infrastructure/llm/QwenRouter.ts` | `router.test.ts` |
| Qwen Plugin Adapter | GF-ADAPTER | `src/plugin/QwenPluginAdapter.ts` | `adapter.test.ts` |
| MCP Server | GF-MCP | `src/mcp-server/index.ts` | `mcp.test.ts` |
| Worktree Manager | GF-ISOLATOR | `src/infrastructure/git/WorktreeManager.ts` | `worktree.test.ts` |
| Orchestrator | — | `src/application/CreateTask.ts` | `parallel.test.ts` |
| @Explorer | GF-EXPLORER | `src/infrastructure/llm/ExplorerAgent.ts` | `explorer.test.ts` |
| @Code-Reviewer | GF-REVIEWER | `src/infrastructure/llm/ReviewerAgent.ts` | `rules.test.ts` |
| @Verifier | GF-VERIFIER | `src/infrastructure/llm/VerifierAgent.ts` | `verifier.test.ts` |
| DiffLens | GF-DIFFLENS | `src/application/DiffLens.ts` | `difflens.test.ts` |
| SafeResolve | — | `src/shared/SafeResolve.ts` | `security.test.ts` |
| SQLite Repository | — | `src/infrastructure/db/SQLiteRepository.ts` | `handoff.test.ts` |

---

## ESTRUTURA DE PASTAS ESPERADA

```
greenforge/
├── qwen-extension.json
├── package.json
├── tsconfig.json
├── .qwen/
│   ├── skills/
│   │   └── greenforge/
│   │       └── SKILL.md
│   └── settings.json
├── src/
│   ├── plugin/
│   │   ├── QwenPluginAdapter.ts
│   │   └── index.ts
│   ├── mcp-server/
│   │   └── index.ts
│   ├── core/
│   ├── infrastructure/
│   └── shared/
├── tests/
├── AGENTS.md
└── CONTEXT_TRANSFER.md
```

---

## VARIÁVEIS DE AMBIENTE NECESSÁRIAS

```env
QWEN_API_KEY=        # Obrigatório. Chave da API Qwen.
GF_WORKTREE_ROOT=      # Opcional. Default: .git/greenforge-worktrees
GF_MAX_PARALLEL=       # Opcional. Default: 3
GF_DB_PATH=            # Opcional. Default: ~/.greenforge/greenforge.db
GF_MCP_PORT=           # Opcional. Default: 7777
```

---

## RECURSOS ADICIONAIS

- [Qwen CLI Extensions](https://github.com/QwenLM/qwen-code/blob/main/docs/users/extension/introduction.md)
- [Model Context Protocol](https://modelcontextprotocol.io/)

---

*Este arquivo foi gerado ao final do processo de design documental do GreenForge.
Qualquer agente que ler este arquivo primeiro terá contexto suficiente para iniciar a implementação sem consultas adicionais.*
