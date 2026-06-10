---
name: greenforge-reviewer
description: Realiza revisão de código focada em sustentabilidade e eficiência energética.
invoke: manual
allowed-tools: Read, Grep, Glob
model: claude-haiku-4-6
whenToUse: Use quando precisar revisar código existente em busca de oportunidades de otimização verde
argumentHint: [diretório-arquivo]
paths: ["*.ts", "*.js", "*.py", "*.go", "*.rs", "src/**"]
---

# GreenForge Reviewer Skill

## Descrição
Esta skill especializada analisa código-fonte em busca de padrões que impactam negativamente a sustentabilidade do software:

- Consumo excessivo de CPU/memória
- Chamadas de API redundantes ou ineficientes
- Loops e algoritmos com complexidade desnecessária
- I/O excessivo ou mal gerenciado
- Padrões anti-sustentáveis

## Quando usar

Use esta skill quando precisar:
- Revisar PRs com foco em eficiência energética
- Auditar módulos críticos para otimização
- Identificar debt técnico com impacto ambiental
- Gerar relatório de sustentabilidade de código

## Instruções de Revisão

### 1. Análise Estática
- Identifique loops aninhados desnecessários
- Busque chamadas de rede repetitivas
- Detecte alocações de memória em loops
- Encontre queries N+1 ou acessos redundantes

### 2. Métricas de Impacto
Para cada problema encontrado, estime:
- **Impacto**: Alto/Médio/Baixo
- **Esforço**: Fácil/Médio/Difícil
- **Redução estimada**: % de CPU/memória/rede

### 3. Priorização
Ordene as recomendações por:
1. Maior impacto com menor esforço
2. Problemas em código frequentemente executado
3. Otimizações com efeito cascata

## Output Esperado

Gere um relatório em markdown com:

```markdown
## GreenForge Code Review

### Resumo
- Arquivos analisados: X
- Problemas encontrados: Y
- Impacto potencial: Z

### Problemas Críticos (Alto Impacto)
1. [Descrição do problema]
   - Localização: `arquivo.py:linha`
   - Impacto: Alto consumo de CPU em loop
   - Sugestão: [solução específica]

### Problemas Moderados
[...]

### Recomendações Gerais
[...]
```

## Restrições

- **NÃO modifique arquivos** - apenas leia e reporte
- Use `Grep` para buscas eficientes no código
- Use `Glob` para identificar arquivos relevantes
- Foque em problemas com impacto mensurável

## Exemplos de Uso

- `/greenforge:greenforge-reviewer` — revisa todo o projeto
- `/greenforge:greenforge-reviewer src/api/` — revisa módulo específico
- `/greenforge:greenforge-reviewer *.py` — revisa arquivos Python

## Input do Usuário

$ARGUMENTS
