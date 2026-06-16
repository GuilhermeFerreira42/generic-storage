# BACKLOG ESTRATÉGICO — GreenForge

## Intenção Original
- **Objetivo:** Transformar o Qwen CLI em um engenheiro autônomo com isolamento físico via Git Worktrees.
- **Estado Atual:** Fase 1 concluída (Roteamento funcional).
- **Meta Final:** Ciclo completo Plan-Code-Verify automatizado e seguro.

---

## Onda 1 — Núcleo e Isolamento
> Pré-requisito: Fase 0 concluída

### Itens

| ID | Entregável | Descrição (entregue ou planejada) | Arquivos Impactados | Critério de Aceite | Status |
|----|------------|-----------------------------------|----------------------|---------------------|--------|
| W1-01 | Setup Base | Estrutura de pastas, build e testes configurados conforme Protocolo v2.0. | `package.json`, `docs/` | Build e Smoke Test passando | CONCLUÍDO |
| W1-02 | Intention Router | Roteador implementado com Zod e suíte de 13 testes unitários mockados. | `QwenRouter.ts` | 13/13 testes de roteamento PASS | CONCLUÍDO |
| W1-03 | Worktree Manager | Gerenciador de Git Worktrees para isolamento físico de tarefas. | `WorktreeManager.ts` | Criar/remover WT via Git CLI | PENDENTE |
| W1-04 | SafeResolve | Validação de caminhos e escrita atômica contra o Worktree. | `SafeResolve.ts` | Prevenir Path Traversal em testes | PENDENTE |

### Meta da Onda 1
- **Critério binário:** Capaz de classificar uma tarefa e provisionar um diretório isolado com segurança.
- **Status:** PENDENTE

### CONTRATOS_DA_ONDA 1
```
OUTPUT_SCHEMAS:
  W1-02: enum ['NORMAL_CHAT', 'DEVELOPMENT_TASK']
  W1-03: { path: string, branch: string, status: 'active' | 'removed' }

ESCOPO_CONGELADO:
  - src/core/ports/LLMProvider.ts (Interface estável)

ARQUIVOS_A_DELETAR:
  - Nenhum

REESCRITAS:
  - Nenhuma

SPECIALISTS_MVP:
  - @Router (Classificação)
  - @Isolator (Provisionamento)

DECISOES_EXTRAS:
  - Uso de Vitest em vez de Jest para melhor suporte a ESM nativo.
```

---

## Onda 2 — Orquestração e Persistência
> Pré-requisito: Onda 1 concluída

[Backlog detalhado será preenchido após conclusão da Onda 1]

---

## Regras do Backlog
1. Itens movem de `PENDENTE` para `CONCLUÍDO` apenas após validação com critério binário.
2. Nenhuma Onda inicia sem a anterior concluída.
3. `CONTRATOS_DA_ONDA` deve estar confirmado pelo usuário antes de disparar a execução.
