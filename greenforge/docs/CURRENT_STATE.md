# CURRENT_STATE — GreenForge
> Última atualização: Fase 1 | 2026-06-15

## Arquitetura Ativa
- **Arquitetura Hexagonal:** Separação clara entre domínio (core), portas (interfaces) e infraestrutura (LLM, Git, DB).
- **Orquestração:** Baseada em Intention Router para triagem de prompts.
- **Isolamento:** Uso planejado de Git Worktrees (Fase 2).
- **Validação:** Contratos de borda validados com Zod.

## Módulos e Contratos Vigentes
| Módulo | Arquivo | Contrato Público | Desde |
|--------|---------|------------------|-------|
| `LLMProvider` | `src/core/ports/LLMProvider.ts` | `generate(prompt: string): Promise<string>` | Fase 1 |
| `QwenRouter` | `src/infrastructure/llm/QwenRouter.ts` | `classify(input: string): Promise<Intent>` | Fase 1 |

## Fluxo Principal
1. Usuário envia prompt raw.
2. `QwenRouter` intercepta via hook (planejado) e chama `LLMProvider.generate`.
3. Resposta JSON é validada via Zod.
4. Se `intention == DEVELOPMENT_TASK` e `confidence >= 0.7`, inicia orquestração.
5. Caso contrário, segue como `NORMAL_CHAT`.

## Invariantes Globais (nunca violar)
1. **No-Shell Policy:** Uso exclusivo de `execa` com `shell: false` e arrays de argumentos.
2. **Fallback Seguro:** Qualquer incerteza no roteamento deve resultar em `NORMAL_CHAT`.
3. **Desacoplamento de LLM:** O Core nunca deve depender de uma implementação específica de API de IA.
4. **TDD Estrito:** Nenhum código de produção sem teste correspondente.
5. **Validação na Borda:** Todo dado externo (API, Usuário) deve ser validado no ponto de entrada.

## Restrições Técnicas Ativas
- **Runtime:** Node.js v22+ (v24 em uso).
- **Threshold de Confiança:** 0.7 (fixo no `QwenRouter`).
- **Validação:** Zod para schemas JSON do LLM.

## Testes Obrigatórios
| Suite | Arquivo | Cobertura Aproximada | Comando |
|-------|---------|----------------------|---------|
| Smoke Test | `tests/smoke.test.ts` | 1 teste (Integridade) | `npm test` |
| Router Test | `tests/router.test.ts` | 13 testes (Unitário) | `npm test` |

## Dependências Externas
| Pacote | Versão | Motivo |
|--------|--------|--------|
| `better-sqlite3` | ^11.0.0 | Persistência determinística rápida. |
| `execa` | ^9.0.0 | Execução segura de processos sem shell. |
| `zod` | ^3.23.0 | Validação de schemas e contratos. |
| `vitest` | ^1.6.0 | Framework de testes rápido e compatível com ESM. |
