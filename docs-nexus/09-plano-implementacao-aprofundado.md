# Parte 9 — Plano de Implementação Detalhado (Aprofundado)

## 9.1 Definição do MVP — Escopo Congelado

### O QUE ESTÁ NO MVP (Onda 1)

- [x] **Canal WhatsApp via Twilio**: Recebimento e envio de mensagens texto + mídia (imagem, áudio).
- [x] **Orchestrator com classificação LLM**: Roteamento para agentes especializados baseado em intenção (OpenAI GPT-4o-mini).
- [x] **Agente de Billing v1**: Responde consultas sobre plano, fatura, cancelamento. Tools: `check_plan`, `get_invoice`, `cancel_subscription`.
- [x] **Agente Geral v1**: Fallback para perguntas não-mapeadas. Tools: `faq_search`, `handoff_to_human`.
- [x] **Persistência de conversas**: DynamoDB com TTL de 30 dias. Query por sessionId e userId.
- [x] **Handoff para humano**: Escalamento via Telegram para grupo de suporte com contexto das últimas 3 mensagens.
- [x] **Rate limiting**: 20 req/min por número de telefone, whitelist para números internos.
- [x] **Deploy automatizado**: GitHub Actions → ECS Fargate com rolling update e health check.
- [x] **Monitoramento básico**: CloudWatch Dashboards com latência, erro, throughput. Alertas Slack para P0.

### O QUE NÃO ESTÁ NO MVP (Onda 2+)

- [ ] Canal Telegram como entrada (apenas handoff de saída).
- [ ] Pagamentos via Stripe (integração pronta, mas não habilitada para produção).
- [ ] Agentes especializados adicionais (suporte técnico, vendas).
- [ ] Analytics avançado (relatórios diários no S3 estão no backlog, mas não são críticos).
- [ ] App mobile (Android/iOS) — apenas webhook WhatsApp.
- [ ] Autenticação OAuth2 para tools bancárias (usando token estático no MVP).
- [ ] Multi-região ativo-ativo (apenas multi-AZ em us-east-1).
- [ ] SDK público para desenvolvedores.

---

## 9.2 Critérios de Aceitação do MVP (Cenários Gherkin)

### Cenário MVP-01: Usuário consulta fatura via WhatsApp

```gherkin
Cenário: Consulta de fatura bem-sucedida
  DADO que o usuário envia mensagem "Quero saber minha fatura" para o número WhatsApp +551188887777
  E que o sistema está operacional com todos os componentes saudáveis
  QUANDO a mensagem é recebida pelo webhook Twilio
  ENTÃO o gateway retorna HTTP 200 em menos de 100ms
  E o orchestrator classifica a intenção como "GET_INVOICE" com confiança > 0.85
  E a mensagem é roteada para o agente "billing-agent-v2"
  E o agente executa a tool "get_invoice" com o accountId mapeado do phoneNumber
  E uma resposta é enviada ao usuário em menos de 5 segundos contendo:
    """
    Olá! Sua fatura atual é de R$ 149,90, com vencimento em 25/01/2025.
    Deseja receber o PDF por email?
    """
  E a conversa é persistida no DynamoDB com sessionId "wa_551199998888_<timestamp>"
  E o tempo total da requisição (webhook → resposta) é menor que 5 segundos

Cenário: Tool de fatura indisponível (API externa fora do ar)
  DADO que a API de billing está retornando HTTP 503
  QUANDO o usuário solicita "Quero saber minha fatura"
  ENTÃO o agente tenta a tool 2 vezes com retry exponencial (1s, 4s)
  E após falhar, responde ao usuário:
    """
    Estou com dificuldade para acessar seus dados no momento. 
    Por favor, tente novamente em alguns minutos ou digite "atendente" para falar com um humano.
    """
  E um alerta P2 é disparado no PagerDuty para a equipe de backend
  E o tempo total de resposta não excede 10 segundos
```

### Cenário MVP-02: Handoff para atendente humano

```gherkin
Cenário: Escalamento para humano via Telegram
  DADO que o usuário envia mensagem "Quero falar com atendente"
  E que o agente geral identificou a intenção "REQUEST_HUMAN_HANDOFF"
  QUANDO o evento handoff.requested é disparado
  ENTÃO o handoff-service envia mensagem para o grupo Telegram de suporte:
    """
    🚨 Handoff Solicitado
    Session: wa_551199998888_1735689600
    Motivo: REQUEST_HUMAN_HANDOFF
    Últimas mensagens:
    [10:30] Usuário: "Quero cancelar meu plano"
    [10:30] Agente: "Posso ajudar com isso. Qual o motivo do cancelamento?"
    [10:31] Usuário: "Prefiro falar com atendente"
    """
  E o status da sessão no DynamoDB é atualizado para "WAITING_HUMAN"
  E um timer de 15 minutos é iniciado para lembrete
  E se nenhum atendente responder em 30 minutos, a sessão é marcada como "ABANDONED"
  E o usuário recebe mensagem: "Desculpe pela espera. Retornaremos em breve."
```

### Cenário MVP-03: Rate limiting bloqueia abuso

```gherkin
Cenário: Número excede limite de 20 req/min
  DADO que o número +5511999998888 já enviou 20 mensagens nos últimos 60 segundos
  QUANDO o usuário envia a 21ª mensagem
  ENTÃO o gateway retorna HTTP 429 imediatamente (<10ms)
  E o header "Retry-After: 60" está presente na resposta
  E o body da resposta é:
    """
    {"error":"RATE_LIMIT_EXCEEDED","limit":20,"window":"60s","reset_at":"2025-01-15T10:31:00Z"}
    """
  E nenhuma mensagem é publicada na SQS
  E uma métrica CloudWatch "RateLimitExceeded" é incrementada com dimensão phoneNumber="+5511999998888"
  E se o número estiver na whitelist (ex: +551100000000), o rate limit é ignorado
```

---

## 9.3 Fases de Implementação — Cronograma Sequencial

### Fase 1: Fundação e Infraestrutura Básica
**Duração:** 2 semanas (D1-D14)  
**Dependência:** Nenhuma (fase inicial)  
**Entregas:**
- [ ] Terraform modules: ECS, DynamoDB, Redis, ALB
- [ ] VPC configurada com 3 subnets privadas (us-east-1a/b/c)
- [ ] GitHub Actions pipeline: build, test, deploy
- [ ] Variáveis de ambiente e Secrets Manager configurados
- [ ] Domínio e SSL certificate provisionados

**Arquivos Criados/Modificados:**
```
terraform/modules/ecs-service/main.tf              (novo, 180 linhas)
terraform/modules/dynamodb-table/main.tf           (novo, 120 linhas)
terraform/environments/production/main.tf          (novo, 250 linhas)
.github/workflows/deploy.yml                       (novo, 140 linhas)
.env.example                                       (novo, 35 linhas)
```

**Testes Obrigatórios:**
- `terraform plan` sem erros em staging.
- Deploy manual de "hello world" container no ECS.
- Health check do ALB respondendo HTTP 200.

**Critério de Conclusão:**
- Pipeline CI/CD executa end-to-end em <10min.
- Infra de produção provisionada e acessível via DNS.
- Documentação de runbook de deploy criada.

---

### Fase 2: Gateway WhatsApp e Ingestão
**Duração:** 1.5 semanas (D15-D25)  
**Dependência:** Fase 1 concluída  
**Entregas:**
- [ ] Webhook Twilio implementado com validação de assinatura
- [ ] Mapper Twilio → ACP schema core
- [ ] Publicação de eventos na SQS FIFO
- [ ] Rate limiting middleware com Redis
- [ ] Logs estruturados com correlation_id

**Arquivos Criados/Modificados:**
```
extensions/channels/whatsapp-twilio/src/handlers/webhook.ts   (novo, 95 linhas)
extensions/channels/whatsapp-twilio/src/middleware/signature.ts (novo, 60 linhas)
extensions/channels/whatsapp-twilio/src/mappers/twilio-to-core.ts (novo, 80 linhas)
packages/gateway-core/src/middleware/rate-limiter.ts          (novo, 70 linhas)
tests/e2e/whatsapp-ingress.spec.ts                            (novo, 120 linhas)
```

**Testes Obrigatórios:**
- Teste de assinatura Twilio válida e inválida.
- Teste de rate limiting: 20 req/min, whitelist bypass.
- Teste E2E: mensagem WhatsApp → SQS message.

**Critério de Conclusão:**
- Webhook Twilio configurado em produção e recebendo mensagens reais.
- 100% dos requests com correlation_id nos logs.
- Latência p95 < 100ms para webhook processing.

---

### Fase 3: Orchestrator e Agentes
**Duração:** 2 semanas (D26-D40)  
**Dependência:** Fase 2 concluída  
**Entregas:**
- [ ] Intent classifier com OpenAI GPT-4o-mini
- [ ] Fallback regex para timeout/falha do LLM
- [ ] Dispatcher SQS por agente (billing, general)
- [ ] Agent billing v2: system prompt, tools `check_plan`, `get_invoice`, `cancel_subscription`
- [ ] Agent general v1: system prompt, tools `faq_search`, `handoff_to_human`

**Arquivos Criados/Modificados:**
```
packages/orchestrator-core/src/router/intent-classifier.ts    (novo, 110 linhas)
packages/orchestrator-core/src/fallbacks/regex-router.ts      (novo, 55 linhas)
packages/orchestrator-core/src/dispatcher/sqs-dispatcher.ts   (novo, 75 linhas)
packages/agent-core/src/agents/billing-agent-v2/system-prompt.md (novo, 180 linhas)
packages/agent-core/src/agents/billing-agent-v2/tools.json    (novo, 25 linhas)
packages/agent-core/src/agents/general-agent-v1/system-prompt.md (novo, 150 linhas)
packages/acp-core/src/tools/bank-balance.ts                   (novo, 95 linhas)
packages/acp-core/src/tools/invoice.ts                        (novo, 85 linhas)
```

**Testes Obrigatórios:**
- Classificação de 10 intents diferentes com precisão > 85%.
- Fallback regex acionado quando OpenAI timeout > 5s.
- Agente billing responde corretamente a "Qual minha fatura?", "Quero cancelar", "Meu plano".

**Critério de Conclusão:**
- Fluxo completo: WhatsApp → Orchestrator → Agente → Resposta em < 5s.
- Precisão de classificação > 85% em teste com 100 mensagens reais.
- Zero mensagens perdidas entre Gateway e Agentes.

---

### Fase 4: Persistência, Handoff e Observabilidade
**Duração:** 1.5 semanas (D41-D51)  
**Dependência:** Fase 3 concluída  
**Entregas:**
- [ ] Conversation Manager: PutItem no DynamoDB, TTL 30 dias
- [ ] Archive de sessões antigas para S3 (>100 turns)
- [ ] Handoff service: notificação Telegram, timers 15/30min
- [ ] CloudWatch Dashboards: latência, erro, throughput
- [ ] Alertas Slack/PagerDuty para P0/P1

**Arquivos Criados/Modificados:**
```
packages/conversation-manager/src/persistence/dynamodb.ts     (novo, 100 linhas)
packages/conversation-manager/src/archive/s3-archiver.ts      (novo, 70 linhas)
packages/handoff-service/src/service.ts                       (novo, 90 linhas)
packages/handoff-service/src/timeouts.ts                      (novo, 65 linhas)
packages/handoff-service/src/channels/telegram.ts             (novo, 55 linhas)
terraform/modules/cloudwatch-dashboard/main.tf                (novo, 200 linhas)
scripts/ops/setup-alerts.sh                                   (novo, 40 linhas)
```

**Testes Obrigatórios:**
- Persistência de turn com TTL correto (verificar item no DynamoDB após 30 dias).
- Handoff Telegram: mensagem chega ao grupo em < 3s.
- Timer de abandono: sessão marcada ABANDONED após 30min sem resposta.

**Critério de Conclusão:**
- Dashboard CloudWatch mostra todas as métricas críticas.
- Alerta Slack disparado em < 2min para erro P0 simulado.
- Handoff funcional: teste real com grupo de suporte.

---

### Fase 5: Hardening e Go-Live
**Duração:** 1 semana (D52-D58)  
**Dependência:** Fase 4 concluída  
**Entregas:**
- [ ] Load test: 1k RPS sustentados por 30min
- [ ] Chaos engineering: simulação de falha de OpenAI, DynamoDB, Redis
- [ ] Runbooks de operação: deploy, rollback, troubleshooting
- [ ] Treinamento de suporte: como usar handoff, como interpretar logs
- [ ] Go-live oficial com monitoramento 24/7

**Atividades:**
- Load test com k6: ramp-up 0→1000 RPS em 5min, sustenta 30min.
- Chaos test: matar tasks ECS aleatoriamente, validar auto-healing.
- Revisão de segurança: scan com Checkov, revisão IAM policies.
- Documentação final: README, CONTRIBUTING, runbooks.

**Critério de Conclusão:**
- Sistema opera sob 1k RPS por 30min com erro < 0.1%.
- Todos os runbooks revisados e aprovados pelo Tech Lead.
- Suporte treinado e apto a operar handoff.
- Go-live aprovado em reunião de steering committee.

---

## 9.4 Métricas de Sucesso — Como Medir Progresso

| Métrica | Target | Como Medir | Frequência | Responsável |
|---|---|---|---|---|
| **Latência p95 (webhook → resposta)** | < 5s | CloudWatch Metrics: percentile 95 de duration | Diário | Tech Lead |
| **Precisão de classificação de intents** | > 85% | Amostragem manual de 100 conversas/semana | Semanal | PM + Arquiteto |
| **Taxa de handoffs bem-sucedidos** | > 90% | (handoffs_respondidos / handoffs_total) * 100 | Diário | Suporte Lead |
| **Disponibilidade do serviço** | 99.9% mensal | Pingdom uptime check externo | Mensal | DevOps |
| **Custo por mensagem processada** | < $0.50/1k | AWS Cost Explorer / total_msgs_processadas | Semanal | Financeiro |
| **Tempo médio de resposta do agente IA** | < 3s | Timestamp diferença: receive → first_reply | Diário | Arquiteto |
| **Taxa de perda de mensagens** | < 0.01% | (msgs_webhook - msgs_persistidas) / msgs_webhook | Diário | DevOps |
| **Cobertura de testes automatizados** | > 85% | Jest coverage report em cada PR | Por PR | QA Lead |
| **Tempo de deploy (commit → production)** | < 10min | GitHub Actions workflow duration | Por deploy | DevOps |
| **Satisfação do usuário (CSAT)** | > 4.2/5 | Pesquisa pós-atendimento (opcional) | Semanal | PM |

---

## 9.5 Riscos Técnicos — Mitigações Detalhadas

| Risco | Probabilidade | Impacto | Mitigação | Contingência |
|---|---|---|---|---|
| **OpenAI downtime prolongado (>1h)** | Baixa (10%) | Alto (serviço degradado) | - Fallback regex automático<br>- Contrato SLA com OpenAI enterprise<br>- Monitoramento de status.openai.com | Ativar Anthropic Claude via feature flag (2-3 dias de lead time) |
| **DynamoDB throttling sob pico inesperado** | Média (25%) | Médio (latência aumenta) | - Auto-scaling configurado 20%-80%<br>- Reserved Capacity para picos previsíveis<br>- Circuit breaker nas writes | Switch para modo degraded: persistir apenas metadados, arquivar conteúdo depois |
| **Twilio muda política de preços ou API** | Baixa (15%) | Alto (custo dispara ou quebra) | - Abstração via interface ChannelProvider<br>- Contrato anual com preço fixo<br>- Monitoramento de changelog Twilio | Migrar para Meta Cloud API direta (1-2 semanas de dev) |
| **Vazamento de dados sensíveis em logs** | Média (30%) | Crítico (multa LGPD) | - Log masking para PII (telefone, email)<br>- Scan automatizado com GitLeaks<br>- Treinamento de segurança para devs | Acionar DPO, notificar autoridades, patch emergencial em 4h |
| **Bug em agent-core causa loop infinito** | Média (35%) | Médio (DLQ enche, custo sobe) | - Max iterations por conversa (10 turns)<br>- DLQ com alerta CloudWatch<br>- Timeout de 30s por tool call | Kill switch: desabilitar agente específico via feature flag |
| **Redis cluster falha (rate limit bypass)** | Baixa (20%) | Médio (abuso possível) | - Redis cluster mode com 2 shards<br>- Fallback in-memory (menos preciso)<br>- Alerta de saúde Redis | Rate limit hardcoded no gateway (menos granular, mas funcional) |
| **GitHub Actions comprometido (supply chain)** | Baixa (5%) | Crítico (deploy malicioso) | - Pin de versões de actions (hash commit)<br>- Review obrigatório de 2 approvers para deploy<br>- Scan de dependências com Dependabot | Deploy manual via AWS Console (processo emergencial documentado) |
| **Escala de time: 3 → 10 engenheiros** | Alta (80%) | Médio (complexidade gerencial) | - Documentação rigorosa (ADRs, runbooks)<br>- Onboarding playbook<br>- Divisão clara de ownership por módulo | Contratar Tech Lead adicional, reestruturar squads |
| **Mudança regulatória (LGPD exige mais retenção)** | Média (40%) | Baixo (ajuste de config) | - TTL parametrizado (env var)<br>- Archive no S3 com lifecycle policy<br>- Consulta jurídica trimestral | Script de backfill para estender TTL de itens existentes |
| **Concorrência: player grande lança produto similar** | Alta (70%) | Baixo (risco de negócio, não técnico) | - Foco em nicho (financeiro)<br>- Velocidade de inovação (2-week sprints)<br>- Parcerias estratégicas (Twilio, OpenAI) | Pivot para B2B white-label (já previsto no roadmap) |

---

## 9.6 Matriz de Dependências Externas

| Dependência | Tipo | Criticalidade | SLA Contratado | Fallback | Status |
|---|---|---|---|---|---|
| OpenAI API | LLM | Crítica | 99.9% (enterprise) | Regex fallback + Anthropic | ✅ Ativa |
| Twilio WhatsApp | Canal | Crítica | 99.95% | Meta Cloud API | ✅ Ativa |
| AWS DynamoDB | Banco | Crítica | 99.99% (multi-AZ) | Export para PostgreSQL (manual) | ✅ Ativa |
| AWS ECS Fargate | Compute | Crítica | 99.99% | Lambda (refator necessário) | ✅ Ativa |
| ElastiCache Redis | Cache | Alta | 99.9% | In-memory fallback | ✅ Ativa |
| Telegram Bot API | Handoff | Média | N/A (free tier) | Email/SMS | ✅ Ativa |
| GitHub Actions | CI/CD | Alta | 99.9% | Jenkins local (manual) | ✅ Ativa |
| CloudWatch | Monitoramento | Alta | 99.9% | Prometheus self-hosted | ✅ Ativa |
| PagerDuty | Alertas | Média | 99.9% | Slack webhook | ✅ Ativa |
| AWS Secrets Manager | Secrets | Alta | 99.99% | Env vars (menos seguro) | ✅ Ativa |

---

**Fim da Parte 9.** Próxima seção: **Parte 10 — Padrões e Blindagem Estrutural**.
