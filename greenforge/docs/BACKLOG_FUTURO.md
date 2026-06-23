# BACKLOG_FUTURO — GreenForge

## Fase 14 — Qwen CLI Extension (Real)
- **Objetivo:** Integrar a extensão Qwen CLI com o GreenForge real, usando os hooks e comandos definidos.
- **Requisitos:**
    - Implementar a lógica de cada hook (`SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `SessionEnd`) para interagir com o `QwenIntegrationRunner` real.
    - Mapear os comandos da extensão (`greenforge.plan`, `greenforge.approve`, etc.) para as chamadas correspondentes no `Orchestrator`.
    - Garantir que a extensão respeite as restrições de segurança e isolamento do GreenForge.
    - Testes de integração reais com a Qwen CLI (requer ambiente Qwen CLI configurado).

## Fase 15 — UI/UX para Revisão de Planos
- **Objetivo:** Desenvolver uma interface de usuário para facilitar a revisão e aprovação de planos gerados pelo `PlannerEngine`.
- **Requisitos:**
    - Exibir o `planMarkdown` de forma clara e interativa.
    - Permitir que o usuário faça perguntas de clarificação e forneça feedback.
    - Integrar com o `Orchestrator` para aprovar ou rejeitar planos.

## Fase 16 — Agente de Refatoração
- **Objetivo:** Adicionar um novo agente especializado em refatoração de código.
- **Requisitos:**
    - Definir as capacidades e ferramentas do `RefactorAgent`.
    - Integrar o `RefactorAgent` no fluxo do `Orchestrator` e `PlannerEngine`.
    - Desenvolver testes específicos para o `RefactorAgent`.

## Fase 17 — Suporte a Múltiplos LLMs
- **Objetivo:** Permitir que o GreenForge utilize diferentes provedores de LLM (e.g., OpenAI, Claude, Gemini).
- **Requisitos:**
    - Criar uma interface `LLMProvider` genérica.
    - Implementar adaptadores para cada LLM.
    - Configuração dinâmica do LLM a ser utilizado.

## Fase 18 — Otimização de Performance
- **Objetivo:** Melhorar a performance geral do sistema, especialmente em operações intensivas de I/O e LLM.
- **Requisitos:**
    - Otimizar consultas ao `SQLiteRepository`.
    - Implementar cache para respostas de LLM.
    - Paralelizar operações quando possível.

## Fase 19 — Relatórios de Progresso em Tempo Real
- **Objetivo:** Fornecer feedback em tempo real sobre o progresso das tarefas.
- **Requisitos:**
    - Integrar com um sistema de pub/sub ou websockets.
    - Exibir o status atual das subtarefas e o progresso geral.

## Fase 20 — Integração com CI/CD
- **Objetivo:** Integrar o GreenForge em pipelines de CI/CD existentes.
- **Requisitos:**
    - Fornecer APIs para acionar tarefas e obter resultados.
    - Gerar relatórios compatíveis com ferramentas de CI/CD.

## Fase 21 — Gerenciamento de Credenciais Seguro
- **Objetivo:** Implementar um sistema seguro para gerenciar credenciais de APIs e outros segredos.
- **Requisitos:**
    - Integração com cofres de segredos (e.g., HashiCorp Vault, AWS Secrets Manager).
    - Criptografia de dados sensíveis em repouso e em trânsito.

## Fase 22 — Suporte a Múltiplos Idiomas (i18n)
- **Objetivo:** Permitir que a interface e a documentação do GreenForge sejam utilizadas em diferentes idiomas.
- **Requisitos:**
    - Externalizar todas as strings de texto.
    - Implementar um sistema de tradução.

## Fase 23 — Monitoramento e Alerta
- **Objetivo:** Monitorar a saúde do sistema e alertar sobre anomalias.
- **Requisitos:**
    - Coletar métricas de performance e uso.
    - Integrar com ferramentas de monitoramento (e.g., Prometheus, Grafana).
    - Configurar alertas para falhas e gargalos.

## Fase 24 — Extensibilidade de Ferramentas
- **Objetivo:** Permitir que usuários e desenvolvedores adicionem facilmente novas ferramentas ao GreenForge.
- **Requisitos:**
    - Definir um contrato claro para novas ferramentas.
    - Implementar um mecanismo de carregamento dinâmico de ferramentas.

## Fase 25 — Otimização de Custos de LLM
- **Objetivo:** Reduzir os custos associados ao uso de LLMs.
- **Requisitos:**
    - Implementar estratégias de caching mais agressivas.
    - Otimizar prompts para reduzir o uso de tokens.
    - Explorar modelos de LLM mais eficientes para tarefas específicas.

## Fase 26 — Geração de Documentação Automática
- **Objetivo:** Gerar automaticamente documentação técnica a partir do código-fonte e dos planos.
- **Requisitos:**
    - Integrar com ferramentas de análise de código.
    - Gerar diagramas de arquitetura e fluxo.

## Fase 27 — Testes de Mutação
- **Objetivo:** Aumentar a confiança nos testes existentes através de testes de mutação.
- **Requisitos:**
    - Integrar uma ferramenta de teste de mutação (e.g., Stryker Mutator).
    - Garantir alta cobertura de mutação para os componentes críticos.

## Fase 28 — Análise Estática de Código Avançada
- **Objetivo:** Integrar ferramentas de análise estática de código mais avançadas para detectar bugs e vulnerabilidades.
- **Requisitos:**
    - Integrar com ferramentas como SonarQube, ESLint com plugins de segurança.
    - Automatizar a execução dessas análises no pipeline.

## Fase 29 — Geração de Testes Automática
- **Objetivo:** Gerar automaticamente testes unitários e de integração para o código produzido.
- **Requisitos:**
    - Utilizar LLMs para gerar casos de teste.
    - Integrar com frameworks de teste existentes.

## Fase 30 — Suporte a Múltiplos VCS (Version Control Systems)
- **Objetivo:** Permitir que o GreenForge trabalhe com outros sistemas de controle de versão além do Git.
- **Requisitos:**
    - Abstrair a camada de VCS.
    - Implementar adaptadores para SVN, Mercurial, etc.