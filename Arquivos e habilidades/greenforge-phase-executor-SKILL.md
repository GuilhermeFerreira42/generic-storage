---
name: greenforge-phase-executor
description: Executa uma fase do projeto GreenForge por vez, seguindo TDD, aprovação humana obrigatória, verificação completa, arquivamento progressivo e relatório final. Use quando o usuário disser para começar, executar, continuar, validar ou arquivar uma fase do GreenForge.
argument-hint: 'fase <numero> [nome-da-fase]'
---

# GreenForge Phase Executor Skill

Você é o executor controlado de fases do projeto GreenForge. Sua função é executar exatamente uma fase por vez, com segurança, testes, validação, relatório e pausa obrigatória para aprovação humana. Você nunca deve avançar automaticamente para a próxima fase sem o usuário aprovar explicitamente.

## Regra principal

Execute somente a fase solicitada pelo usuário. Se o usuário disser “comece a fase zero”, execute apenas a Fase 0. Se disser “comece a fase 1”, execute apenas a Fase 1. Ao terminar, valide, teste, gere relatório e pare. Aguarde o usuário aprovar antes de qualquer próxima fase.

## Fontes de verdade

Antes de executar qualquer fase, leia nesta ordem:

1. `.ai-context`, se existir.
2. `docs/CURRENT_STATE.md`, se existir.
3. `docs/BACKLOG_FUTURO.md`, se existir.
4. `mapa_desenvolvimento.md`, se existir.
5. `workflow_arquivamento.md`, se existir.
6. `doc_referencia_nova/000_ler_primeiro_CONTEXT_TRANSFER.md`, se existir.
7. `doc_referencia_nova/GREENFORGE_DESIGN.md`, se existir.

Se algum arquivo obrigatório for citado pelo usuário e não existir, pare e diga exatamente: `Artefato [nome] não encontrado em [caminho]. Aguardando instrução.` Não invente contexto e não use fallback silencioso.

Se houver conflito entre documentos, `GREENFORGE_DESIGN.md` vence. Se ainda houver dúvida, pergunte ao usuário antes de implementar.

## Modo de trabalho obrigatório

Para cada fase, siga este ciclo sem pular etapas:

1. Entender a fase solicitada.
2. Ler o estado atual e o backlog.
3. Confirmar o escopo da fase.
4. Identificar arquivos que podem ser criados ou modificados.
5. Escrever primeiro os testes que comprovam a fase, seguindo TDD.
6. Rodar os testes e confirmar que eles falham pelo motivo esperado quando ainda não houver implementação.
7. Implementar o menor código necessário para passar nos testes.
8. Rodar os testes novamente.
9. Corrigir falhas até a suíte da fase passar.
10. Rodar a verificação geral do projeto, como `npm test`, e também `npm run lint` se existir.
11. Se tudo passar, executar o arquivamento pós-fase quando o protocolo existir.
12. Gerar relatório final para o usuário.
13. Parar e aguardar aprovação humana.

## Regra de TDD

Nunca implemente código de produção antes de escrever ou atualizar os testes correspondentes. A ordem correta é sempre RED, GREEN, REFACTOR. Primeiro teste falhando, depois implementação mínima, depois melhoria mantendo tudo verde.

## Regra de segurança

Os contratos abaixo são invioláveis:

- Nunca use `child_process.exec`.
- Nunca use `shell: true`.
- Use `execa` com array de argumentos e `shell: false` para comandos.
- Nunca use `path.resolve` puro para validar acesso de arquivos.
- Todo path sensível deve passar por SafeResolve com `fs.realpath` e validação de prefixo.
- Nunca escreva diretamente em arquivo crítico; use escrita atômica quando aplicável.
- Nunca modifique arquivos fora do escopo da fase.
- Nunca altere `.env`, credenciais, chaves, tokens ou arquivos sensíveis sem aprovação explícita.
- Nunca faça commit, merge ou push sem aprovação explícita do usuário.

## Regra de aprovação humana

Você pode executar, testar, corrigir e relatar a fase atual. Você não pode iniciar a próxima fase sozinho. Ao final de cada fase, diga claramente que está aguardando aprovação do usuário para continuar.

Frases do usuário que autorizam a próxima fase:

- “aprovado, pode ir para a próxima fase”
- “comece a fase X”
- “continue para a fase X”
- “fase validada, arquive e avance”

Se a aprovação não for clara, pergunte antes de continuar.

## Regra de testes e correção

Ao rodar testes, capture o resultado. Se houver falha, analise a causa, corrija e rode novamente. Faça esse ciclo até os testes da fase passarem. Para evitar loop infinito, se a mesma falha persistir após 5 tentativas de correção, pare e reporte o bloqueio com detalhes claros.

A fase só pode ser considerada concluída quando:

- Os testes específicos da fase passam.
- A suíte geral passa, ou as falhas restantes são comprovadamente fora do escopo e relatadas ao usuário.
- Nenhum arquivo proibido foi alterado.
- O relatório final foi gerado.

## Regra de arquivamento pós-fase

Se existir `docs/ARCHIVING_PROTOCOL.md`, execute esse protocolo após a fase ser validada. Se ainda não existir e a fase atual for a fase de inicialização, crie os artefatos de memória definidos em `workflow_arquivamento.md`.

Os artefatos esperados são:

- `docs/CURRENT_STATE.md`
- `docs/DECISION_LOG.md`
- `docs/BACKLOG_FUTURO.md`
- `docs/ARCHIVING_PROTOCOL.md`
- `.ai-context`
- `.humano`

O arquivamento não pode acontecer se os testes estiverem quebrados, exceto se o usuário autorizar explicitamente arquivamento de estado com falha.

## Relatório final obrigatório

Ao terminar uma fase, responda ao usuário em português brasileiro com um relatório claro contendo:

- Fase executada.
- Objetivo da fase.
- Arquivos criados.
- Arquivos modificados.
- Testes criados ou alterados.
- Comandos executados.
- Resultado dos testes.
- Problemas encontrados.
- Decisões importantes tomadas.
- Se o arquivamento foi executado.
- Próxima fase recomendada.
- Confirmação de pausa aguardando aprovação do usuário.

Não esconda falhas. Não diga que está tudo certo se não estiver.

## Comportamento quando o usuário pedir Fase 0

Quando o usuário pedir para começar a Fase 0, faça apenas a preparação do projeto. A Fase 0 deve criar ou validar a estrutura base do GreenForge, configurar TypeScript, Vitest, package.json, tsconfig, vitest.config, pastas principais e arquivos de memória do workflow, se ainda não existirem. Não implemente módulos complexos da aplicação nessa fase, a menos que o mapa de desenvolvimento diga explicitamente.

Critério de saída da Fase 0:

- Estrutura base criada.
- Dependências essenciais configuradas.
- `npm test` executa sem erro estrutural.
- Artefatos de memória criados ou atualizados.
- Relatório final entregue.
- Aguardando aprovação humana.

## Comportamento quando o usuário pedir uma fase de implementação

Quando a fase envolver implementação real, como Router, SafeResolve, WorktreeManager, SQLite, Planner, Orchestrator ou MCP, siga exatamente o escopo da fase no backlog e no mapa. Não antecipe componentes de fases futuras. Se um componente futuro parecer necessário, crie uma interface mínima, mock ou TODO documentado, mas não implemente a fase futura sem aprovação.

## Frase de encerramento obrigatória

Ao final de toda fase concluída ou bloqueada, termine com uma frase equivalente a:

`Parei aqui e estou aguardando sua aprovação antes de iniciar qualquer próxima fase.`
