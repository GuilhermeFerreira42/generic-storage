# Resumo da Fase 7 — MCP Base Integration
> Data: 2026-06-17

## Objetivo
Estabelecer a camada fundamental de integração com o Model Context Protocol (MCP), permitindo que o GreenForge liste e chame ferramentas externas de forma segura e testável, com contratos estruturais blindados e infraestrutura de auditoria para testes de agentes.

## Entregáveis
- `src/core/ports/McpClientPort.ts`: Interface de porta desacoplada.
- `src/core/types/Mcp.ts`: Definições blindadas via Zod Discriminated Unions e Schemas Estritos.
- `src/infrastructure/mcp/MockMcpClient.ts`: Mock inspecionável com registro de chamadas e validação de contrato.
- `tests/mcp.test.ts`: 9 testes unitários validando listagem, inspeção, integridade de contrato e tratamento de erros.

## Principais Decisões
- **Contratos Blindados:** Uso de `.strict()` e Unions Discriminadas no Zod para garantir que retornos de ferramentas externas não possuam estados contraditórios (ex: sucesso com erro anexado).
- **Mock Inspecionável:** Implementado registro histórico de chamadas (`getCalls`) no mock, essencial para validar o comportamento dos agentes especialistas na próxima fase.
- **Validação Antecipada:** `setTools` agora valida o schema das ferramentas no momento da configuração, garantindo que o ambiente de teste esteja íntegro.
- **Resiliência via retryable:** Erros estruturados obrigatórios para guiar decisões de recuperação do orquestrador.

## Testes
- **Total:** 9 testes específicos de MCP (Refinamento Crítico).
- **Passando:** 9 testes.
- **Destaques:** Rejeição de estados contraditórios, auditoria de chamadas, validação estrita de schemas de ferramentas.

## Riscos Conhecidos
- **Custo de Validação:** A validação estrita em tempo de execução adiciona overhead mínimo, mas garante a inviolabilidade da lógica do agente.

## Próxima Fase
- **Fase 8 — Agentes Especialistas (@Coder, @Tester, @Reviewer)**
