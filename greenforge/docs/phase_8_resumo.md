# Resumo da Fase 8 — Agentes Especialistas MVP
> Data: 2026-06-17

## Objetivo
Implementar a primeira versão dos agentes especialistas (@Coder, @Tester e @Reviewer), garantindo que a execução técnica seja decomposta em papéis específicos, consumindo ferramentas externas via MCP de forma segura e retornando resultados estruturados. **Nota: Nesta fase, os agentes são MVPs reativos que utilizam mocks para simular a execução de ferramentas.**

## Entregáveis
- `src/core/types/Agent.ts`: Contratos estruturados e validados via Zod para contextos, artefatos e resultados.
- `src/core/agents/BaseAgent.ts`: Infraestrutura comum com validação rigorosa de privilégios (`allowedTools`) e integridade de resultados.
- `src/core/agents/CoderAgent.ts`: Agente focado em edição de código (gera `DIFF`).
- `src/core/agents/TesterAgent.ts`: Agente focado em verificação (gera `TEST_REPORT`).
- `src/core/agents/ReviewerAgent.ts`: Agente focado em auditoria com validação de schema de revisão.
- `tests/agents.test.ts`: 14 testes unitários cobrindo fluxos reais de permissão, validação de contrato e tratamento de erros.

## Principais Decisões
- **Privilégio Mínimo:** Implementada barreira de segurança na `BaseAgent` que impede qualquer agente de chamar ferramentas que não foram explicitamente autorizadas em seu contexto, validada no fluxo real de execução.
- **Resultados Blindados:** Todos os agentes validam seu `AgentResult` final contra o `AgentResultSchema` antes de retorná-lo, garantindo integridade para o orquestrador.
- **Validação de Conteúdo Externa:** O `ReviewerAgent` não confia cegamente no conteúdo retornado pela ferramenta MCP, validando-o contra um schema de revisão antes de processá-lo.
- **Simulação Fiel:** Uso de `MockMcpClient` com auditoria de chamadas para garantir a conformidade técnica dos agentes.

## Testes
- **Total:** 14 testes de agentes (Refinados).
- **Passando:** 14 testes.
- **Destaques:** Bloqueio de ferramentas não autorizadas no fluxo real, validação de schema de revisão, integridade de resultados finais.

## Riscos Conhecidos
- **Simulação vs Realidade:** Como os agentes operam sobre mocks, a integração com ferramentas reais na Onda 4 pode exigir ajustes na lógica de parsing de resultados complexos.
- **Comportamento Reativo:** Os agentes atuais executam apenas uma ação por chamada; a autonomia multi-passo será abordada em fases futuras.

## Próxima Fase
- **Fase 9 — Join Gate (Consolidação Paralela)**
