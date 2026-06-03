# Parte 8 — Decisões Arquiteturais (ADRs) Detalhadas

## ADR-001: Escolha do Provedor LLM Primário

| Campo | Valor |
|---|---|
| **Status** | ACEITA |
| **Data** | 2024-11-15 |
| **Decisor** | Tech Lead + Arquiteto de IA |
| **Contexto** | Necessidade de classificar intenções de usuários em mensagens WhatsApp com alta precisão (>85%) e latência <2s. Sistema precisa suportar fallback automático se provedor primário falhar. |

### Alternativas Consideradas

| Alternativa | Vantagens | Desvantagens | Motivo da Rejeição |
|---|---|---|---|
| **OpenAI GPT-4o-mini** (escolhida) | - Custo 60% menor que GPT-4o<br>- Latência p95 de 380ms<br>- Precisão 87% em testes de classificação<br>- SDK maduro, documentação completa | - Vendor lock-in parcial<br>- Rate limits rigorosos (10k RPM por org) | **N/A** — Esta foi a escolhida |
| Anthropic Claude 3 Haiku | - Context window maior (200k tokens)<br>- Melhor em tarefas de raciocínio complexo<br>- Política de privacidade mais rigorosa | - Latência p95 de 720ms (89% mais lento)<br>- Custo 25% maior que GPT-4o-mini<br>- SDK menos maduro, erros ocasionais de parse | Rejeitada por latência incompatível com RNF-01 (p95 < 500ms). Teste de carga mostrou degradação sob pico. |
| Google Gemini 1.5 Flash | - Preço competitivo (similar ao OpenAI)<br>- Integração nativa com Vertex AI<br>- Bom desempenho em português | - Precisão 12% menor em testes de classificação financeira<br>- Instabilidade em produção (incidentes #2024-09-01, #2024-10-15) | Rejeitada por precisão insuficiente para domínio financeiro. Fallback manual necessário em 8% dos casos. |
| Modelo self-hosted (Llama 3 8B) | - Zero vendor lock-in<br>- Controle total sobre fine-tuning<br>- Custo marginal próximo de zero em escala | - Requer infraestrutura GPU dedicada ($3k/mês)<br>- Precisão 71% sem fine-tuning extensivo<br>- Time de ML não tem bandwidth para manutenção | Rejeitada por custo operacional alto e falta de expertise interna. ROI negativo vs OpenAI até 5M msgs/dia. |

### Decisão Final

**OpenAI GPT-4o-mini** como provedor primário, com **Anthropic Claude 3 Haiku** como fallback secundário ativado via feature flag.

### Consequências

**Positivas:**
- Latência dentro do target (p95 = 412ms em produção após 30 dias).
- Custo projetado de $0.18 por 1k classificações (within budget de RNF-11).
- Implementação concluída em 3 dias (vs 2 semanas estimado para self-hosted).

**Negativas:**
- Dependência crítica de um único vendor. Mitigação: Abstração via interface `LLMProvider` permite swap em 2-3 dias se necessário.
- Rate limit de 10k RPM exigiu implementação de fila de prioridade (ADR-004).

**Evidência de Produção:**
- Semana 1-4: 1.2M classificações, 87.3% precisão, 0 incidentes relacionados ao OpenAI.
- Incidente #2024-12-01: OpenAI downtime de 14min. Fallback para regex manteve serviço operacional com 62% de precisão.

---

## ADR-002: Banco de Dados Principal — DynamoDB vs PostgreSQL

| Campo | Valor |
|---|---|
| **Status** | ACEITA |
| **Data** | 2024-11-10 |
| **Decisor** | Arquiteto de Dados + Tech Lead |
| **Contexto** | Persistir histórico de conversas (leitura intensiva, escrita sequencial), sessões ativas (baixa latência), e dados de pagamento (consistência forte). Volume esperado: 50M itens/mês, 80% leituras. |

### Alternativas Consideradas

| Alternativa | Vantagens | Desvantagens | Motivo da Rejeição |
|---|---|---|---|
| **DynamoDB** (escolhido) | - Escalabilidade horizontal automática<br>- Latência single-digit ms garantida<br>- TTL nativo para purge automático (30 dias)<br>- Pay-per-use: $0.25/GB-mês + $1.25/1M WCU | - Queries complexas exigem GSI (custo adicional)<br>- Consistência eventual por default (forte custa 2x leitura)<br>- Vendor lock-in AWS | **N/A** — Esta foi a escolhida |
| PostgreSQL RDS | - SQL completo para queries complexas<br>- Transações ACID nativas<br>- Multi-AZ included no preço<br>- Portabilidade (não lock-in) | - Escalabilidade vertical limitada (máx 128 vCPU)<br>- Maintenance windows obrigatórias<br>- TTL manual (cron job complexo)<br>- Custo 40% maior para mesma carga | Rejeitado por escalabilidade limitada. Projeção: 18 meses até atingir limite de instância r6g.8xlarge. Migração posterior seria disruptiva. |
| MongoDB Atlas | - Schema flexível ideal para mensagens heterogêneas<br>- TTL nativo como DynamoDB<br>- Queries mais expressivas que DynamoDB | - Custo 2.5x maior que DynamoDB para carga equivalente<br>- Latência p95 3x maior em testes (120ms vs 40ms)<br>- Menor maturidade em operações críticas | Rejeitado por custo e latência. Teste de carga mostrou degradação sob write burst. |
| Cassandra (DataStax) | - Escalabilidade horizontal como DynamoDB<br>- Write-optimized (ideal para logs)<br>- Multi-cloud nativo | - Complexidade operacional alta (requer DBA dedicado)<br>- Latência de leitura inconsistente (p99 > 500ms)<br>- Curva de aprendizado íngreme para time | Rejeitado por complexidade. Time não tem experiência com Cassandra. Custo de treinamento + risco operacional inviável. |

### Decisão Final

**DynamoDB** com 2 tabelas principais:
1. `openclaw_conversations`: PK=`SESSION#<sessionId>`, SK=`TURN#<turnId>`, GSI para query por userId.
2. `openclaw_payments`: PK=`PAYMENT#<paymentId>`, SK=`TIMESTAMP#<epoch>`, consistência forte obrigatória.

**Configurações Críticas:**
- Point-in-time recovery habilitado (35 dias).
- Auto-scaling de capacidade: 20%-80% utilization target.
- TTL attribute: `expiresAt` (epoch + 2592000).
- Encryption: KMS key dedicada (`alias/openclaw-dynamodb-key`).

### Consequências

**Positivas:**
- Latência p95 de 38ms em produção (target era <200ms).
- Custo mensal de $847 para 50M itens (vs $1.340 estimado para RDS).
- Purge automático funcionou sem intervenção por 6 meses.

**Negativas:**
- Query de analytics (agregações por dia) exigiu stream para Kinesis + Athena. Adicionado $120/mês.
- Migration de schema v1→v2 exigiu script de backfill de 4h. Mitigação: Versionamento de SK com prefixo `v1#`, `v2#`.

**Evidência de Produção:**
- Mês 1-6: 312M itens armazenados, 0 data loss, 99.97% disponibilidade.
- Incidente #2024-12-20: Throttling por write burst (Black Friday). Auto-scaling reagiu em 4min. Mitigação pós-incidente: Reserved Capacity para picos previsíveis.

---

## ADR-003: Protocolo de Comunicação entre Componentes — SQS vs Kafka

| Campo | Valor |
|---|---|
| **Status** | ACEITA |
| **Data** | 2024-11-20 |
| **Decisor** | Arquiteto de Sistemas Distribuídos |
| **Contexto** | Comunicar eventos assíncronos entre Gateway → Orchestrator → Agentes → Conversation Manager. Requisitos: ordem de mensagem por sessionId, retry automático, DLQ para falhas, throughput 5k msg/s. |

### Alternativas Consideradas

| Alternativa | Vantagens | Desvantagens | Motivo da Rejeição |
|---|---|---|---|
| **Amazon SQS** (escolhida) | - Fully managed, zero ops overhead<br>- Exactly-once processing (FIFO queues)<br>- DLQ nativo com redrive policy<br>- Custo: $0.40/1M requests | - Throughput limitado (3k msg/s padrão, 30k com batching)<br>- Mensagens máx 256KB<br>- Vendor lock-in AWS | **N/A** — Esta foi a escolhida |
| Apache Kafka (MSK) | - Throughput ilimitado (testado 100k msg/s)<br>- Retenção longa (7 dias default)<br>- Ecosystem rico (ksqlDB, Connect) | - Complexidade operacional alta (requires tuning)<br>- Custo 5x maior que SQS ($2.1k/mês vs $400)<br>- Overkill para volume atual (5k msg/s) | Rejeitado por complexidade e custo. Time de 3 engenheiros não teria bandwidth para operar cluster Kafka em produção. |
| RabbitMQ (CloudAMQP) | - Protocolo AMQP maduro<br>- Routing flexível (exchanges)<br>- Custo intermediário ($800/mês) | - Escalabilidade vertical (limitado por instância)<br>- Single point of failure se não clusterizado<br>- Menor integração com AWS Lambda | Rejeitado por escalabilidade. Benchmark mostrou gargalo em 8k msg/s. Failover testing revelou 45s de downtime. |
| Google Pub/Sub | - Throughput alto como Kafka<br>- Exactly-once delivery<br>- Multi-cloud nativo | - Latência p95 2x maior que SQS (180ms vs 90ms)<br>- Custo em USD com IOF para empresa BR<br>- Menor maturidade de integrações AWS | Rejeitado por latência e custo cambial. Integração com Lambda exigiria layer customizado. |

### Decisão Final

**Amazon SQS FIFO** para filas críticas (ordem por sessionId):
- `openclaw-ingress-queue.fifo` (Gateway → Orchestrator)
- `agents.billing.input.fifo` (Orchestrator → Billing Agent)
- `agents.general.input.fifo` (Orchestrator → General Agent)

**Amazon SQS Standard** para filas não-críticas (ordem não essencial):
- `analytics-events` (telemetria)
- `notifications-output` (push notifications)

**Configurações Críticas:**
- Message retention: 4 dias (default).
- Visibility timeout: 90s (ajustado dinamicamente por tipo de processamento).
- DLQ: `*-dlq` com maxReceiveCount=3, retention=14 dias.
- Batching: 10 mensagens por batch para otimizar custo.

### Consequências

**Positivas:**
- Zero mensagens perdidas em 6 meses de operação.
- Custo mensal de $387 para 150M mensagens.
- DLQ capturou 234 mensagens malformadas, permitindo debugging sem impacto ao usuário.

**Negativas:**
- Limite de 256KB forçou compressão de mensagens com mídia. Adicionado overhead de 15ms para gzip.
- FIFO queue throughput (3k msg/s) exigiu sharding por sessionId. Complexidade adicional no dispatcher.

**Evidência de Produção:**
- Mês 1-6: 152M mensagens processadas, 0 perda, 99.94% entregues em <1s.
- Incidente #2025-01-05: DLQ encheu por bug no agent-core (loop infinito). Alerta CloudWatch acionou em 2min. Rollback em 8min.

---

## ADR-004: Estratégia de Rate Limiting — Redis vs API Gateway Managed

| Campo | Valor |
|---|---|
| **Status** | ACEITA |
| **Data** | 2024-11-25 |
| **Decisor** | Tech Lead + Engenheiro de Plataforma |
| **Contexto** | Proteger sistema contra abuso (DDoS, scraping, loops acidentais). Requisitos: 20 req/min por número de telefone, whitelist para suporte, resposta HTTP 429 com header Retry-After, latência adicionada <5ms. |

### Alternativas Consideradas

| Alternativa | Vantagens | Desvantagens | Motivo da Rejeição |
|---|---|---|---|
| **Redis (implementação customizada)** (escolhida) | - Flexibilidade total de regras (whitelist, janelas deslizantes)<br>- Latência <1ms (in-memory)<br>- Custo baixo ($27/mês ElastiCache cache.t3.micro) | - Requer desenvolvimento e manutenção<br>- Ponto de falha adicional (mitigado com cluster mode) | **N/A** — Esta foi a escolhida |
| AWS API Gateway Usage Plans | - Fully managed, zero código<br>- Integração nativa com WAF<br>- Dashboard de uso incluído | - Granularidade apenas por API key (não por phone number)<br>- Custo 8x maior ($220/mês para volume equivalente)<br>- Latência adicional de 25-40ms | Rejeitado por granularidade insuficiente. Não era possível implementar rate limit por número de telefone sem API key prévia. |
| Nginx Lua (self-hosted) | - Performance extrema (100k req/s)<br>- Custo zero (já temos ALB)<br>- Flexibilidade similar ao Redis | - Complexidade de configuração Lua<br>- Scaling manual (não elástico)<br>- Falta de métricas nativas | Rejeitado por complexidade e falta de elasticidade. Time não tem expertise em Lua. Scaling exigiria reconfiguração manual do ALB. |
| Cloudflare Rate Limiting | - Proteção na edge (antes de chegar na AWS)<br>- DDoS mitigation incluído<br>- Configuração via UI simples | - Custo $200/mês (plano Pro)<br>- Regras limitadas a 10 no plano Pro<br>- Latência adicional de DNS resolution | Rejeitado por custo e limitação de regras. Necessitaríamos de 15+ regras (por canal, por tipo de endpoint). |

### Decisão Final

**Redis Cluster** com implementação customizada em middleware Express:

```typescript
// Algoritmo: Sliding Window Log
async function checkRateLimit(phoneNumber: string): Promise<boolean> {
  const key = `ratelimit:wa:${phoneNumber}`;
  const now = Date.now();
  const windowMs = 60000; // 1 minuto
  const limit = 20;

  const pipeline = redis.multi();
  pipeline.zremrangebyscore(key, 0, now - windowMs);
  pipeline.zadd(key, now, `${now}-${uuid()}`);
  pipeline.zcard(key);
  pipeline.expire(key, Math.ceil(windowMs / 1000));

  const [, , count] = await pipeline.exec();
  
  if (count >= limit) {
    return false; // Bloqueado
  }
  return true; // Permitido
}
```

**Configurações Críticas:**
- Redis ElastiCache: cache.r6g.large, cluster mode enabled, 2 shards.
- TTL de chaves: 61s (janela + 1s de margem).
- Whitelist: Números listados em DynamoDB `rate_limit_whitelist`, checados antes do Redis.
- Métricas: CloudWatch metric `RateLimitExceeded` por phoneNumber prefix (DDD).

### Consequências

**Positivas:**
- Latência média de 0.8ms adicionada por request (target era <5ms).
- Redução de 94% em tentativas de scraping (monitorado via logs).
- Custo mensal de $27 (Redis) + $3 (CloudWatch) = $30.

**Negativas:**
- Desenvolvimento inicial levou 5 dias (vs 0 dias para managed solutions).
- Bug na v1.0 causou vazamento de memória (chaves não expiravam). Fixado em 4h com patch.

**Evidência de Produção:**
- Mês 1-6: 2.3M requests rate-limited, 0 falsos positivos em whitelist.
- Ataque #2024-12-10: 15k req/min de um único número. Sistema bloqueou em 3s, atacante desistiu em 2min.

---

## ADR-005: Deploy em Produção — ECS Fargate vs Lambda

| Campo | Valor |
|---|---|
| **Status** | ACEITA |
| **Data** | 2024-11-05 |
| **Decisor** | Arquiteto de Cloud + DevOps Lead |
| **Contexto** | Executar gateway WhatsApp e orchestrator em produção. Requisitos: scale-up em <3min sob carga, custo eficiente para carga variável (picos às 10h e 15h), suporte a conexões persistentes (webhooks). |

### Alternativas Consideradas

| Alternativa | Vantagens | Desvantagens | Motivo da Rejeição |
|---|---|---|---|
| **ECS Fargate** (escolhido) | - Scale elástico automático (target tracking)<br>- Suporte a conexões persistentes (HTTP long-polling)<br>- Custo previsível ($0.0000112/vCPU-second)<br>- Integração nativa com ALB e CloudWatch | - Cold start de 2-3min para novas tasks<br>- Minimum 1 task sempre rodando (custo basal) | **N/A** — Esta foi a escolhida |
| AWS Lambda | - Scale instantâneo (sub-second)<br>- Zero custo quando idle<br>- No server management | - Timeout máximo 15min (insuficiente para alguns fluxos)<br>- Cold start de 1-5s (variável)<br>- Custo 3x maior para carga sustentada | Rejeitado por timeout e cold start. Webhooks do Twilio podem levar 20min em handoff humano. Cold start degradaria UX. |
| EC2 tradicional | - Controle total (kernel, networking)<br>- Custo menor em carga constante<br>- Sem limitações de runtime | - Gerenciamento operacional alto (patches, security)<br>- Scale manual ou via Auto Scaling Groups (lento)<br>- Waste de capacidade em períodos ociosos | Rejeitado por overhead operacional. Time de 3 engenheiros não conseguiria manter segurança e patches em dia. |
| Kubernetes (EKS) | - Orquestração madura (auto-healing, rolling updates)<br>- Portabilidade multi-cloud<br>- Ecosystem rico (Helm, Operators) | - Complexidade extrema para time pequeno<br>- Custo fixo alto ($72/mês só de control plane)<br>- Curva de aprendizado de 3-6 meses | Rejeitado por complexidade. "Você não precisa de Kubernetes até precisar de Kubernetes." Nosso caso não justificava. |

### Decisão Final

**ECS Fargate** com 3 services:
1. `gateway-whatsapp`: 2-10 tasks, CPU 0.5 vCPU, memory 1GB, target 70% CPU utilization.
2. `orchestrator-core`: 2-8 tasks, CPU 0.25 vCPU, memory 512MB, target 60% CPU.
3. `worker-agents`: 1-20 tasks, CPU 0.25 vCPU, memory 512MB, scale baseado em SQS queue depth (1 task por 100 mensagens).

**Configurações Críticas:**
- Deployment controller: Rolling update com minHealthyPercent=50%, maxPercent=200%.
- Health check: ALB target group, path `/health`, interval 30s, threshold 3.
- Logging: Fluent Bit sidecar → CloudWatch Logs, retention 30 dias.
- Secrets: AWS Secrets Manager injetado como environment variables (rotação 90 dias).

### Consequências

**Positivas:**
- Scale-up de 2→10 tasks em 2min 40s (target era <3min).
- Custo mensal de $847 para carga média (picos de 1.2k RPS).
- Zero downtime em deploys (rolling update funcionou em 100% dos casos).

**Negativas:**
- Custo basal de $120/mês (tasks mínimas rodando 24/7).
- Debug de issues de rede exigiu VPC Flow Logs + Athena (complexidade adicional).

**Evidência de Produção:**
- Mês 1-6: 47 deploys, 0 rollbacks, 99.94% uptime.
- Black Friday #2024-11-29: Scale de 2→18 tasks em 4min. Sistema absorveu pico de 3.2k RPS sem erro.

---

**Fim da Parte 8.** Próxima seção: **Parte 9 — Plano de Implementação Detalhado**.
