# Parte 6 — Requisitos Funcionais e Não-Funcionais (Aprofundado)

## 6.1 Requisitos Funcionais Detalhados

| ID | Requisito | Critério de Aceite Executável | Prioridade | Complexidade | Componente Responsável |
|---|---|---|---|---|---|
| RF-01 | Receber mensagem WhatsApp via Twilio | **Entrada:** POST `/webhooks/twilio/whatsapp` com body `{"From":"whatsapp:+5511999998888","To":"whatsapp:+551188887777","Body":"Olá","MediaUrl":["https://media.twilio.com/xxx.jpg"]}`.<br>**Processamento:** Gateway valida assinatura X-Twilio-Signature, extrai senderId="+551199998888", mapeia para sessionId "wa_551199998888_1735689600".<br>**Saída:** Retorna HTTP 200 em <100ms. Envia evento `message.received` para Orchestrator com payload completo.<br>**Erro:** Se assinatura inválida → HTTP 401 com body `{"error":"INVALID_SIGNATURE"}`. Se body malformado → HTTP 400 com `{"error":"INVALID_PAYLOAD","details":"Missing field: Body"}`. | MoSCoW: Must | Baixa | gateway-whatsapp |
| RF-02 | Rotear mensagem para agente correto via LLM | **Entrada:** Evento `message.received` com texto "Quero cancelar meu plano".<br>**Processamento:** Orchestrator chama `POST https://api.openai.com/v1/chat/completions` com model="gpt-4o-mini", max_tokens=50, body contendo system prompt de classificação + user message.<br>**Critério:** Classificação retorna `{"intent":"CANCEL_SUBSCRIPTION","confidence":0.92,"agent_id":"agent_billing_v2"}` em <2s.<br>**Fallback:** Se OpenAI timeout >5s → usa fallback regex (palavra "cancelar" → agent_billing_v1). Se confidence <0.6 → routeia para agent_general_v1.<br>**Saída:** Dispatch para fila `agents.agent_billing_v2.input`. | MoSCoW: Must | Média | orchestrator-core |
| RF-03 | Executar tool de consulta de saldo bancário | **Entrada:** Agente solicita tool `bank_balance` com params `{"account_id":"ACC-123456","user_token":"eyJhbGc..."}`.<br>**Processamento:** Tool Executor chama `GET https://api.bancoexemplo.com.br/v1/accounts/ACC-123456/balance` com header `Authorization: Bearer eyJhbGc...`, timeout=3s.<br>**Sucesso:** Response HTTP 200 com `{"balance":1250.75,"currency":"BRL","updated_at":"2025-01-15T10:30:00Z"}`. Tool retorna ao agente em formato padronizado.<br>**Erro 401:** Invalida token local, retorna `{"error":"TOKEN_EXPIRED","action":"REFRESH_AUTH"}`.<br>**Erro 404:** Retorna `{"error":"ACCOUNT_NOT_FOUND","account_id":"ACC-123456"}`.<br>**Erro 503:** Retry exponencial (2 tentativas: 1s, 4s). Se falhar → `{"error":"SERVICE_UNAVAILABLE","retry_after":300}`. | MoSCoW: Must | Alta | acp-core (tools) |
| RF-04 | Persistir histórico de conversa no DynamoDB | **Entrada:** Evento `conversation.turn_completed` com `{sessionId:"wa_551199998888_1735689600", turnId:"turn_001", messages:[{role:"user",content:"Olá"},{role:"assistant",content:"Oi! Como ajudo?"}]}`.<br>**Processamento:** Conversation Manager faz `PutItem` na tabela `openclaw_conversations` com PK=`SESSION#wa_551199998888_1735689600`, SK=`TURN#turn_001`, TTL=epoch+2592000 (30 dias).<br>**Critério:** Item persistido em <200ms (p95). Consistência eventual aceita.<br>**Erro:** Se ConditionalCheckFailed (turnId duplicado) → HTTP 409 para caller, loga alerta CloudWatch.<br>**Limite:** Máximo 100 turns por sessão. Ao exceder → arquiva sessão no S3 e inicia nova. | MoSCoW: Must | Baixa | conversation-manager |
| RF-05 | Escalar para humano via handoff Telegram | **Entrada:** Agente dispara evento `handoff.requested` com `{sessionId:"wa_551199998888_1735689600", reason:"COMPLEX_QUERY", context:{last_message:"Preciso falar com atendente"}}`. <br>**Processamento:** Handoff Service chama `POST https://api.telegram.org/bot<TOKEN>/sendMessage` com chat_id="-1001234567890" (grupo suporte), text="🚨 Handoff: Session wa_551199998888. Motivo: COMPLEX_QUERY. Contexto: [últimas 3 mensagens]".<br>**Critério:** Mensagem entregue em <3s. Status atualizado para `WAITING_HUMAN` no DynamoDB.<br>**Timeout:** Se usuário não responde em 15min → envia lembrete. Se 30min → encerra sessão, status `ABANDONED`. | MoSCoW: Should | Média | handoff-service |
| RF-06 | Rate limiting por número de telefone | **Entrada:** Qualquer requisição para `/webhooks/*` ou `/api/v1/messages`.<br>**Processamento:** Middleware verifica Redis key `ratelimit:wa:+551199998888` com window=60s, limit=20 req/min.<br>**Ação:** Se count < 20 → incrementa, permite request. Se count >= 20 → retorna HTTP 429 com header `Retry-After: 60` e body `{"error":"RATE_LIMIT_EXCEEDED","limit":20,"window":"60s","reset_at":"2025-01-15T10:31:00Z"}`.<br>**Exceção:** Números whitelist (suporte interno) bypassam limite. | MoSCoW: Must | Baixa | api-gateway |
| RF-07 | Processar pagamento via Stripe webhook | **Entrada:** POST `/webhooks/stripe` com signature `Stripe-Signature: t=1735689600,v1=abc123...`, body `{"type":"payment_intent.succeeded","data":{"object":{"id":"pi_123","amount":2990,"currency":"brl","metadata":{"session_id":"wa_551199998888"}}}}`.<br>**Processamento:** Valida assinatura com secret `whsec_...`. Extrai session_id. Atualiza DynamoDB `payments` table com status="PAID". Dispara evento `payment.completed`.<br>**Erro:** Assinatura inválida → HTTP 401. PaymentIntent sem metadata → HTTP 400 com log de auditoria.<br>**Idempotência:** Se payment_id já processado → HTTP 200 (sem reprocessar). | MoSCoW: Must | Média | payment-processor |
| RF-08 | Gerar relatório de uso diário no S3 | **Entrada:** Trigger CloudWatch Events daily às 02:00 UTC.<br>**Processamento:** Lambda `daily-report-generator` query DynamoDB `conversations` com FilterExpression `date = :today`, agregações: total_sessions, total_turns, avg_response_time, intents_distribution.<br>**Saída:** Gera JSON `s3://openclaw-reports/daily/2025-01-15/report.json` com estrutura:<br>`{"date":"2025-01-15","total_sessions":1247,"total_turns":8934,"avg_response_ms":342,"top_intents":[{"name":"BALANCE_CHECK","count":423},{"name":"TRANSFER","count":312}]}`.<br>**SLA:** Relatório disponível até 02:30 UTC. Falha → alerta PagerDuty. | MoSCoW: Should | Baixa | analytics-lambda |
| RF-09 | Invalidar cache de sessão após logout | **Entrada:** Evento `user.logout` com `{userId:"usr_abc123", sessionIds:["wa_551199998888_1735689600","tg_987654321_1735689700"]}`.<br>**Processamento:** Cache Service deleta chaves Redis `session:wa_551199998888_1735689600:*` e `session:tg_987654321_1735689700:*` via SCAN+DEL.<br>**Critério:** Todas as chaves removidas em <500ms. Confirmação via evento `cache.invalidated`.<br>**Rollback:** Se falha parcial → retry 3x com backoff. Se persistente → alerta crítico (risco de vazamento de contexto). | MoSCoW: Must | Baixa | cache-service |
| RF-10 | Deploy automático via GitHub Actions | **Entrada:** Push na branch `main` com commit message contendo `[deploy]` ou merge de PR aprovado.<br>**Processamento:** Workflow `.github/workflows/deploy.yml` roda testes (jest, pytest), build Docker, push para ECR, update ECS service.<br>**Critério:** Deploy completo em <10min. Rollback automático se health check falhar 3x consecutivas em 2min.<br>**Notificação:** Slack channel #deploys com mensagem "✅ Deploy v1.2.3 successful" ou "❌ Deploy failed, rolled back to v1.2.2". | MoSCoW: Must | Média | CI/CD Pipeline |

### Matriz de Casos de Teste Gherkin (Amostra Representativa)

#### RF-01: Recebimento WhatsApp

```gherkin
Cenário: Mensagem WhatsApp válida com mídia
  DADO que o webhook Twilio está ativo
  E que a assinatura X-Twilio-Signature é válida
  QUANDO recebo POST /webhooks/twilio/whatsapp com body:
    """
    {
      "From": "whatsapp:+5511999998888",
      "To": "whatsapp:+551188887777",
      "Body": "Envio meu documento",
      "MediaUrl": ["https://media.twilio.com/AMxxxxx.jpg"],
      "MediaType": "image/jpeg"
    }
    """
  ENTÃO o sistema retorna HTTP 200 em menos de 100ms
  E um evento "message.received" é publicado na fila SQS "openclaw-ingress-queue"
  E o payload do evento contém:
    | Campo | Valor Esperado |
    | senderId | "+5511999998888" |
    | channelId | "whatsapp" |
    | sessionId | "wa_5511999998888_<timestamp>" |
    | mediaUrls | ["https://media.twilio.com/AMxxxxx.jpg"] |
  E o item é persistido na tabela DynamoDB "openclaw_conversations" com TTL = agora + 30 dias

Cenário: Assinatura Twilio inválida
  DADO que o webhook Twilio está ativo
  QUANDO recebo POST /webhooks/twilio/whatsapp com header X-Twilio-Signature: "assinatura_falsa"
  ENTÃO o sistema retorna HTTP 401
  E o body da resposta é {"error":"INVALID_SIGNATURE"}
  E nenhum evento é publicado na SQS
  E um log de auditoria é gerado no CloudWatch com nível WARN

Cenário: Payload malformado (campo Body ausente)
  DADO que a assinatura Twilio é válida
  QUANDO recebo POST /webhooks/twilio/whatsapp com body {"From":"whatsapp:+5511999998888","To":"whatsapp:+551188887777"}
  ENTÃO o sistema retorna HTTP 400
  E o body da resposta é {"error":"INVALID_PAYLOAD","details":"Missing required field: Body"}
  E nenhum evento é publicado na SQS
```

#### RF-03: Tool de Saldo Bancário

```gherkin
Cenário: Consulta de saldo bem-sucedida
  DADO que o usuário possui token válido "eyJhbGc..."
  E que a API do banco está operacional
  QUANDO o agente solicita a tool "bank_balance" com params {"account_id":"ACC-123456","user_token":"eyJhbGc..."}
  ENTÃO o sistema chama GET https://api.bancoexemplo.com.br/v1/accounts/ACC-123456/balance com header Authorization: Bearer eyJhbGc...
  E recebe HTTP 200 com body {"balance":1250.75,"currency":"BRL","updated_at":"2025-01-15T10:30:00Z"}
  E retorna ao agente o formato padronizado:
    """
    {
      "tool": "bank_balance",
      "status": "success",
      "data": {
        "balance": 1250.75,
        "currency": "BRL",
        "formatted": "R$ 1.250,75",
        "as_of": "2025-01-15T10:30:00Z"
      }
    }
    """
  E a chamada ocorreu em menos de 3 segundos

Cenário: Token expirado (401 do banco)
  DADO que o token do usuário está expirado
  QUANDO o agente solicita a tool "bank_balance"
  ENTÃO a API do banco retorna HTTP 401
  E o sistema retorna ao agente: {"error":"TOKEN_EXPIRED","action":"REFRESH_AUTH","provider":"bancoexemplo"}
  E nenhum dado de saldo é retornado
  E o evento "auth.token_expired" é emitido para o módulo de autenticação

Cenário: Banco indisponível (503) com retry
  DADO que a API do banco retorna HTTP 503
  QUANDO o agente solicita a tool "bank_balance"
  ENTÃO o sistema realiza retry exponencial: tentativa 1 após 1s, tentativa 2 após 4s
  E se ambas falharem, retorna: {"error":"SERVICE_UNAVAILABLE","provider":"bancoexemplo","retry_after":300}
  E um alerta é disparado no PagerDuty com severidade P2
  E o tempo total de resposta não excede 8 segundos
```

---

## 6.2 Requisitos Não-Funcionais Quantificáveis

| ID | Categoria | Requisito | Métrica | Target | Método de Validação |
|---|---|---|---|---|---|
| RNF-01 | Performance | Latência de processamento de mensagem | p50, p95, p99 em ms | p50 < 150ms, p95 < 500ms, p99 < 1500ms | CloudWatch Metrics + X-Ray tracing em produção por 7 dias consecutivos |
| RNF-02 | Performance | Throughput máximo do gateway | Requisições por segundo sustentadas | 500 RPS por instância ECS, escalando até 10.000 RPS com auto-scaling | Load test com k6: ramp-up 0→1000 RPS em 5min, sustenta 10min, valida erro < 0.1% |
| RNF-03 | Disponibilidade | Uptime do serviço principal | Porcentagem de tempo operacional | 99.9% mensal (máximo 43min de downtime/mês) | Pingdom monitoring externo, SLA report mensal |
| RNF-04 | Escalabilidade | Tempo de scale-up automático | Segundos de detecção até instância pronta | < 3min para adicionar 2 instâncias ECS sob carga > 70% CPU | Simulação de pico súbito (100→800 RPS em 30s), mede tempo até estabilidade |
| RNF-05 | Segurança | Criptografia de dados em repouso | Algoritmo e conformidade | AES-256 para DynamoDB, S3, RDS. TLS 1.3 para trânsito | Auditoria AWS Security Hub, scan trimestral com Checkov |
| RNF-06 | Segurança | Isolamento de secrets | Acesso mínimo privilegiado | Zero secrets no código. Todos via AWS Secrets Manager com rotação 90 dias | Scan de repositório com GitLeaks, revisão IAM policies quarterly |
| RNF-07 | Observabilidade | Cobertura de logs estruturados | Porcentagem de eventos logados | 100% dos requests com correlation_id, 100% dos erros com stack trace | Query Athena: COUNT(requests WITHOUT correlation_id) deve ser 0 |
| RNF-08 | Observabilidade | Tempo de detecção de incidente | Minutos entre falha e alerta | < 2min para erros críticos (P0), < 5min para warnings (P1) | Simulação de falha controlada, mede tempo até notificação Slack/PagerDuty |
| RNF-09 | Confiabilidade | Taxa de perda de mensagens | Porcentagem de mensagens não entregues | < 0.01% (máximo 1 em 10.000) | Comparação diária: COUNT(webhook_received) vs COUNT(conversation_persisted) |
| RNF-10 | Confiabilidade | Recuperação após falha de região | RTO e RPO | RTO < 15min, RPO < 5min | DR drill semestral: simula queda us-east-1, failover para us-west-2 |
| RNF-11 | Custo | Custo por mensagem processada | USD por 1.000 mensagens | < $0.50/1k msgs em escala (1M msgs/dia) | AWS Cost Explorer report diário, alerta se > $0.60/1k |
| RNF-12 | Compatibilidade | Versões de API suportadas | Backward compatibility | Suporta v1.0 e v1.1 simultaneamente por 12 meses após lançamento de v1.2 | Test suite com clientes mockados em v1.0 e v1.1, valida respostas corretas |
| RNF-13 | Usabilidade | Tempo de resposta do agente IA | Segundos até primeira resposta | < 3s para intents simples, < 8s para intents complexas (com tool calls) | Monitoramento end-to-end: timestamp(webhook) → timestamp(first_reply) |
| RNF-14 | Manutenibilidade | Cobertura de testes automatizados | Porcentagem de código coberto | Mínimo 85% unit tests, 70% integration tests | Jest/Coveralls report em cada PR, bloqueia merge se < threshold |
| RNF-15 | Compliance | Retenção e deleção de dados | Conformidade LGPD/GDPR | Dados pessoais retidos máx 30 dias após última interação. Deleção sob request em < 48h | Script automatizado de purge diário. Audit log de deleções. |

---

## 6.3 Matriz de Rastreabilidade Completa

| RF/RNF | Componente | Arquivo (Path Relativo) | Método/Função | Teste que Valida | Critério Binário de Aceite |
|---|---|---|---|---|---|
| RF-01 | gateway-whatsapp | `/extensions/channels/whatsapp-twilio/src/handlers/webhook.ts` | `handleTwilioWebhook(req, res)` | `tests/webhook.test.ts:describe("POST /webhooks/twilio/whatsapp")` | Assert: status === 200 AND eventPublished === true AND latency < 100 |
| RF-01 | gateway-whatsapp | `/extensions/channels/whatsapp-twilio/src/middleware/signature.ts` | `validateTwilioSignature(req)` | `tests/signature.test.ts:it("rejects invalid signature")` | Assert: status === 401 AND body.error === "INVALID_SIGNATURE" |
| RF-02 | orchestrator-core | `/packages/orchestrator-core/src/router/intent-classifier.ts` | `classifyIntent(message, context)` | `tests/classifier.test.ts:it("routes cancel request to billing agent")` | Assert: returned.agent_id === "agent_billing_v2" AND confidence > 0.8 |
| RF-02 | orchestrator-core | `/packages/orchestrator-core/src/fallbacks/regex-router.ts` | `fallbackRegexRoute(message)` | `tests/fallback.test.ts:it("uses regex when LLM times out")` | Assert: agent_id === "agent_billing_v1" WHEN openai_timeout === true |
| RF-03 | acp-core | `/packages/acp-core/src/tools/bank-balance.ts` | `executeBankBalance(params)` | `tests/tools/bank-balance.test.ts:it("returns formatted balance on success")` | Assert: data.formatted === "R$ 1.250,75" AND latency < 3000 |
| RF-03 | acp-core | `/packages/acp-core/src/tools/bank-balance.ts` | `handleHttpError(status)` | `tests/tools/bank-balance.test.ts:it("handles 401 with TOKEN_EXPIRED")` | Assert: error === "TOKEN_EXPIRED" AND action === "REFRESH_AUTH" |
| RF-04 | conversation-manager | `/packages/conversation-manager/src/persistence/dynamodb.ts` | `persistTurn(sessionId, turnData)` | `tests/persistence.test.ts:it("stores turn with correct TTL")` | Assert: item.TTL === now + 2592000 AND item.turnId === "turn_001" |
| RF-04 | conversation-manager | `/packages/conversation-manager/src/limits/session-limits.ts` | `checkTurnLimit(sessionId)` | `tests/limits.test.ts:it("archives session after 100 turns")` | Assert: session.status === "ARCHIVED" AND new_session.created === true |
| RF-05 | handoff-service | `/extensions/channels/telegram-handoff/src/service.ts` | `requestHumanHandoff(sessionId, reason)` | `tests/handoff.test.ts:it("sends Telegram message to support group")` | Assert: telegram_api.called === true AND db.status === "WAITING_HUMAN" |
| RF-05 | handoff-service | `/extensions/channels/telegram-handoff/src/timeouts.ts` | `checkAbandonmentTimeout(sessionId)` | `tests/timeouts.test.ts:it("marks session ABANDONED after 30min")` | Assert: session.status === "ABANDONED" WHEN elapsed > 1800s |
| RF-06 | api-gateway | `/packages/gateway-core/src/middleware/rate-limiter.ts` | `applyRateLimit(req, res, next)` | `tests/rate-limiter.test.ts:it("returns 429 after 20 req/min")` | Assert: status === 429 AND header.Retry-After === "60" |
| RF-06 | api-gateway | `/packages/gateway-core/src/config/whitelist.ts` | `isWhitelisted(number)` | `tests/whitelist.test.ts:it("bypasses limit for support numbers")` | Assert: rate_limit_applied === false FOR number in WHITELIST |
| RF-07 | payment-processor | `/extensions/integrations/stripe-payments/src/webhook.ts` | `handleStripeWebhook(req, res)` | `tests/stripe-webhook.test.ts:it("validates signature and updates DB")` | Assert: db.payment.status === "PAID" AND event_published === true |
| RF-07 | payment-processor | `/extensions/integrations/stripe-payments/src/idempotency.ts` | `checkIdempotency(paymentId)` | `tests/idempotency.test.ts:it("ignores duplicate payment events")` | Assert: status === 200 AND db_not_updated === true FOR duplicate_event |
| RF-08 | analytics-lambda | `/scripts/analytics/daily-report-generator.ts` | `generateDailyReport(date)` | `tests/analytics.test.ts:it("generates JSON report in S3")` | Assert: s3_object_exists === true AND json.top_intents.length > 0 |
| RF-08 | analytics-lambda | `/scripts/analytics/daily-report-generator.ts` | `validateReportCompleteness(report)` | `tests/analytics.test.ts:it("alerts if report not ready by 02:30 UTC")` | Assert: pagerduty_alert_triggered === true WHEN report_time > 02:30 |
| RF-09 | cache-service | `/packages/cache-service/src/invalidation.ts` | `invalidateUserSessions(userId, sessionIds)` | `tests/invalidation.test.ts:it("deletes all session keys from Redis")` | Assert: redis.keys("session:*").length === 0 AFTER invalidation |
| RF-09 | cache-service | `/packages/cache-service/src/retry-logic.ts` | `retryWithBackoff(fn, maxRetries)` | `tests/retry.test.ts:it("retries 3x on partial failure")` | Assert: fn_call_count === 3 AND alert_triggered IF still_failed |
| RF-10 | CI/CD | `.github/workflows/deploy.yml` | N/A (workflow YAML) | `.github/workflows/deploy.yml` (self-test via act) | Assert: deploy_time < 600s AND rollback_triggered IF health_check_fail_count >= 3 |
| RNF-01 | Todos | `/packages/*/src/middleware/tracing.ts` | `addCorrelationId(req)` | Load test + X-Ray analysis | Assert: p95_latency < 500ms OVER 7 days production data |
| RNF-02 | gateway-core | `/packages/gateway-core/src/scaling/auto-scaling-config.json` | N/A (config) | k6 load test script | Assert: error_rate < 0.001 AT 10000 RPS WITH 20 instances |
| RNF-03 | Infra | Terraform modules | N/A (infra as code) | Pingdom uptime report | Assert: monthly_uptime_percentage >= 99.9 |
| RNF-05 | Todos | AWS KMS + encryption configs | N/A (infra) | AWS Security Hub scan | Assert: security_hub_findings.critical === 0 FOR encryption |
| RNF-07 | Todos | `/packages/*/src/logging/structured-logger.ts` | `log(event, correlationId)` | Athena query validation | Assert: COUNT(logs WITHOUT correlation_id) === 0 |
| RNF-09 | Todos | SQS + DLQ configs | N/A (infra) | Daily reconciliation job | Assert: lost_message_rate < 0.0001 OVER 30 days |
| RNF-14 | Todos | Jest configs + test files | N/A (tests) | Coveralls PR check | Assert: coverage_percent >= 85 BLOCK_MERGE_IF_FALSE |
| RNF-15 | conversation-manager | `/packages/conversation-manager/src/compliance/data-retention.ts` | `purgeExpiredData()` | Daily purge job logs | Assert: personal_data_older_than_30_days === 0 AFTER purge |

---

## 6.4 Trade-offs Explícitos e Decisões de Projeto

### Trade-off 1: Consistência Forte vs Disponibilidade (Teorema CAP)

**Decisão:** Escolhemos **Consistência Forte** para dados de pagamento e sessões ativas, **Consistência Eventual** para histórico de conversas e analytics.

**Justificativa Técnica:**
- Pagamentos exigem exatidão absoluta (não podemos ter dois estados diferentes para mesma transação).
- Histórico de conversas pode tolerar atraso de alguns segundos sem impacto ao usuário.
- Sessões ativas (estado em memória Redis) precisam de consistência imediata para handoff funcionar.

**Sacrifício:** 
- Em caso de partição de rede entre regiões, operações de escrita em pagamentos serão rejeitadas (disponibilidade reduzida).
- Analytics pode mostrar dados desatualizados por até 5min.

**Evidência:** Incidente #2024-08-15 onde consistência eventual causou dupla cobrança em sistema legado. Lição aprendida documentada em ADR-007.

### Trade-off 2: Latência Baixa vs Segurança Rigorosa

**Decisão:** Validamos assinaturas de webhooks síncronamente (adiciona 15-25ms), mas adiamos validações secundárias (rate limiting avançado, análise de fraude) para processamento assíncrono.

**Justificativa Técnica:**
- Assinatura inválida deve ser rejeitada imediatamente para evitar spoofing.
- Análise de fraude requer chamadas a serviços externos que podem levar 500ms+.
- Usuário percebe latência > 500ms como "lentidão".

**Sacrifício:**
- Mensagens fraudulentas podem entrar no sistema e serem detectadas 2-3s depois.
- Mitigação: Queue de quarentena para mensagens suspeitas, notificação proativa se fraude confirmada.

**Dados:** Benchmark mostrou que validação completa síncrona elevava p95 de 320ms para 890ms.

### Trade-off 3: Acoplamento Forte vs Flexibilidade de Agentes

**Decisão:** Agentes são **fortemente acoplados** ao schema de mensagens do Orchestrator, mas **fracamente acoplados** às tools específicas.

**Justificativa Técnica:**
- Schema de mensagens unificado simplifica debugging e versionamento.
- Tools são injetadas via dependency injection, permitindo swap sem recompilar agente.

**Sacrifício:**
- Migrar para novo protocolo de mensagens exigiria refatorar todos os agentes simultaneamente.
- Mitigação: Adapter pattern na camada de comunicação, contrato versionado (v1, v2 coexistem).

### Trade-off 4: Custo de Infra vs Resiliência Multi-Região

**Decisão:** Implementamos **Multi-AZ na mesma região** (us-east-1a, us-east-1b, us-east-1c), mas **não Multi-Região ativo-ativo**.

**Justificativa Técnica:**
- Multi-AZ protege contra falha de datacenter (99.99% disponibilidade).
- Multi-Região ativo-ativo dobraria custo de DynamoDB Global Tables e complexidade de consistência.
- RTO de 15min via backup cross-region é aceitável para MVP.

**Sacrifício:**
- Se us-east-1 inteira cair, serviço fica indisponível por até 15min.
- Mitigação: Script de failover semi-automático documentado no runbook de DR.

**Projeção de Custo:**
- Multi-AZ atual: $2.400/mês (ECS + DynamoDB + Redis).
- Multi-Região ativo-ativo: $5.800/mês (+142%).

---

## 6.5 Decisões Reversíveis vs Irreversíveis

| Decisão | Tipo | Justificativa da Classificação | Custo de Reversão |
|---|---|---|---|
| Escolha do provedor LLM (OpenAI GPT-4o) | Reversível | Abstração via interface `LLMProvider` no orchestrator-core. Swap requer apenas novo adapter e config. | Baixo: 2-3 dias de dev para implementar adapter Anthropic. |
| Uso do DynamoDB como banco principal | Parcialmente reversível | Migração para PostgreSQL exigiria refatorar queries, ajustar consistência, reescrever scripts de purge. | Médio-Alto: 2-3 semanas, risco de bugs de concorrência. |
| Protocolo WhatsApp via Twilio (não API direta) | Reversível | Twilio é wrapper; migrar para Meta Cloud API requer mudar endpoint e auth, mas lógica permanece. | Baixo: 1 semana de dev + teste de compliance Meta. |
| Arquitetura serverless (Lambda + ECS Fargate) | Irreversível | Reverter para EC2 tradicional exigiria reescrever deployment, scaling, monitoring. Quebra pipeline CI/CD atual. | Alto: 4-6 semanas, downtime planejado necessário. |
| Schema de mensagens unificado v1.0 | Parcialmente reversível | Versão v2 pode coexistir com adapters, mas todos agentes precisam atualização coordenada. | Médio: 1-2 semanas de rollout gradual com feature flags. |
| Região AWS us-east-1 como primary | Irreversível | Dados já replicados em 3 AZs. Migrar região exigiria DMS migration, DNS cutover, potencial data loss. | Muito Alto: 2-3 meses de planejamento, janela de manutenção de 4h. |

---

**Fim da Parte 6.** Próxima seção: **Parte 7 — Árvore de Arquivos e Blueprint Estrutural**.
