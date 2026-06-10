---
name: greenforge-plan
description: Gera um plano de projeto com análise de impacto ambiental e sustentabilidade do código.
allowed-tools: Read, Write, Bash, Grep
model: claude-sonnet-4-6
whenToUse: Use quando precisar planejar novas features com foco em eficiência energética ou auditar código existente
argumentHint: [diretório]
paths: ["*.ts", "*.js", "*.py", "src/**"]
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

## Input do Usuário
$ARGUMENTS
