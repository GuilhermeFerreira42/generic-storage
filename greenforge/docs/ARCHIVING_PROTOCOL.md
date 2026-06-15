# ARCHIVING_PROTOCOL.md — Protocolo de Arquivamento Progressivo

## Objetivo
Garantir que o estado do projeto, decisões tomadas e backlog pendente sejam preservados ao final de cada fase, permitindo continuidade perfeita para o próximo agente ou sessão.

## Frequência
- **Obrigatório:** Ao final de cada fase aprovada.
- **Opcional:** Ao final de cada dia de trabalho ou marco importante.

## Check-list de Arquivamento
1. **Atualizar `CURRENT_STATE.md`**: Refletir o que foi concluído, o que está em andamento e a versão atual.
2. **Atualizar `DECISION_LOG.md`**: Registrar novos ADRs ou mudanças de rumo.
3. **Atualizar `BACKLOG_FUTURO.md`**: Marcar tarefas concluídas e adicionar novas descobertas.
4. **Validar `.ai-context`**: Garantir que o contexto para a IA está atualizado com os caminhos dos arquivos principais.
5. **Garantir Integridade**: Rodar `npm test` e `npm run lint` antes de considerar o estado "arquivável".

## Artefatos Protegidos
Estes arquivos NUNCA devem ser removidos e são a memória de longo prazo do projeto:
- `docs/CURRENT_STATE.md`
- `docs/DECISION_LOG.md`
- `docs/BACKLOG_FUTURO.md`
- `docs/ARCHIVING_PROTOCOL.md`
- `.ai-context`
- `.humano`
