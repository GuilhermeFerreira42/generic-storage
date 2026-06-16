# Resumo da Fase 6 — Orchestrator
> Data: 2026-06-16

## Objetivo
Implementar e blindar a máquina de estados central do GreenForge, garantindo atomicidade nas transições, imutabilidade de estados terminais e auditoria detalhada de marcos de planejamento.

## Entregáveis
- `src/core/Orchestrator.ts`: Motor de estados refinado com suporte a rollback e estados terminais.
- `tests/orchestrator.test.ts`: Suíte de 22 testes validando fluxos positivos, negativos e integridade transacional.

## Principais Decisões
- **Estados Terminais Imutáveis:** Bloqueio de qualquer evento disparado sobre tarefas `COMPLETED` ou `FAILED`, garantindo que o histórico final não seja alterado.
- **Prova de Rollback:** Implementado teste com espiões (Spy Mocks) que prova que uma falha no registro de checkpoint reverte a mudança de status da tarefa no banco.
- **Marcos de Auditoria:** Eventos `PLAN_GENERATED` e `APPROVE_PLAN` agora registram checkpoints obrigatórios, mesmo sem mudar o status `PLANNING`, para rastreabilidade de conformidade.
- **Higiene de Join:** Validação rigorosa de artefatos de saída para transição de execução paralela para revisão.

## Testes
- **Total:** 22 testes de estado (Aumento de 17 para 22).
- **Passando:** 22 testes.
- **Destaques:** Rollback transacional comprovado, bloqueio de estados finais, auditoria de planejamento, fluxo de integração bem-sucedido.

## Riscos Conhecidos
- **Recuperação de Erro:** Em cenários de erro persistente no SQLite, o sistema entrará em loop de falha de transação. Mitigado pela simplicidade das tabelas atuais.

## Próxima Fase
- **Fase 7 — MCP Client (Integração com Ferramentas)**
