# Resumo da Fase 1 — Intention Router
> Data: 2026-06-15

## Objetivo
Implementar o componente responsável por classificar se um prompt do usuário é uma conversa normal ou uma tarefa de desenvolvimento que exige orquestração, garantindo segurança e resiliência via TDD e validação de schema.

## Entregáveis
- `src/core/ports/LLMProvider.ts`: Interface de desacoplamento.
- `src/infrastructure/llm/QwenRouter.ts`: Implementação com Zod.
- `src/core/types/Intent.ts`: Tipos compartilhados.
- `tests/router.test.ts`: 13 cenários de teste unitário.

## Principais Decisões
- **Zod para Borda:** Uso de Zod para garantir que retornos de IA sigam o contrato, prevenindo erros de tipagem em tempo de execução.
- **Injeção de Dependência:** Router recebe o provedor de LLM via construtor, facilitando mocks.
- **Threshold de 0.7:** Definido como o limiar de confiança para considerar uma tarefa como válida.

## Testes
- **Total:** 14 (1 Smoke + 13 Router)
- **Passando:** 14

## Riscos Conhecidos
- **Falsos Negativos:** Confiança abaixo de 0.7 pode enviar tarefas legítimas para o chat normal. Monitorar em fases futuras.

## Próxima Fase
- **Fase 2 — Worktree Manager**
