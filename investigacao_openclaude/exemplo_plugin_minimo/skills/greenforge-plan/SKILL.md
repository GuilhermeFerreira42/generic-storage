---
name: greenforge-plan
description: Gera um plano de projeto com análise de impacto ambiental e sustentabilidade do código.
invoke: manual
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
  - Bash
model: claude-sonnet-4-20250514
---

# GreenForge Plan Skill

## Descrição
Esta skill analisa um projeto de software e gera um plano detalhado considerando:
- Impacto ambiental do código (consumo de energia, eficiência algorítmica)
- Sustentabilidade técnica (manutenibilidade, débito técnico)
- Métricas de qualidade verde

## Quando usar
Use esta skill quando precisar:
- Planejar novas features com foco em eficiência energética
- Auditar código existente para oportunidades de otimização verde
- Gerar relatórios de sustentabilidade de software

## Passo a passo
1. Analise os arquivos do projeto fornecidos
2. Identifique hot spots de consumo de recursos (loops ineficientes, I/O excessivo, etc.)
3. Calcule métricas de impacto (complexidade ciclomática, consumo estimado de CPU/memória)
4. Gere recomendações priorizadas por impacto ambiental
5. Crie um plano de ação com estimativas de melhoria

## Output esperado
- Relatório de análise em markdown
- Lista priorizada de otimizações
- Estimativa de redução de consumo energético

## Exemplos de uso
- `/greenforge:greenforge-plan` — analisa o projeto atual
- `/greenforge:greenforge-plan src/heavy-module/` — analisa um módulo específico

## Template de Saída

Ao gerar o plano, use a seguinte estrutura:

```markdown
# GreenForge Plan - [Nome do Projeto]

## Resumo Executivo
[Breve descrição do impacto ambiental atual]

## Análise de Hot Spots
| Arquivo | Problema | Impacto | Prioridade |
|---------|----------|---------|------------|
| ...     | ...      | ...     | ...        |

## Recomendações Prioritárias
1. [Recomendação 1 com maior impacto]
2. [Recomendação 2]
3. [Recomendação 3]

## Plano de Ação
### Fase 1 - Quick Wins (1-2 dias)
- [ ] Tarefa 1
- [ ] Tarefa 2

### Fase 2 - Otimizações Médias (1 semana)
- [ ] Tarefa 3
- [ ] Tarefa 4

### Fase 3 - Refatorações Profundas (2-4 semanas)
- [ ] Tarefa 5
- [ ] Tarefa 6

## Métricas de Sucesso
- Redução estimada de CPU: X%
- Redução estimada de memória: Y%
- Melhoria em manutenibilidade: Z pontos
```
