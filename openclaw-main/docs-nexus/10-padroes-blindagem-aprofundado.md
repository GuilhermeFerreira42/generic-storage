# Parte 10 — Padrões e Blindagem Estrutural (Aprofundado)

## 10.1 Padrões Arquiteturais Adotados

| Padrão | Onde se Aplica | Como é Implementado | Benefício |
|---|---|---|---|
| **Event-Driven Architecture** | Gateway → Orchestrator → Agentes | SQS FIFO para eventos de mensagem, SNS para broadcast de status | Desacoplamento temporal: componentes podem falhar independentemente sem perda de dados |
| **CQRS (Command Query Responsibility Segregation)** | Conversation Manager | Write model: PutItem no DynamoDB. Read model: Query otimizada com GSI | Otimização separada: writes são sequenciais, reads são indexadas por userId |
| **Circuit Breaker** | Tool Executor (chamadas HTTP externas) | Implementação com `opossum` library: open após 5 erros consecutivos, half-open após 30s | Prevenção de cascata de falhas: API externa indisponível não derruba todo o sistema |
| **Dependency Injection** | Agentes e Tools | Container DI com `tsyringe`: tools injetadas no runtime do agente | Testabilidade: mocks em testes unitários. Swap de implementação sem recompilar |
| **Adapter Pattern** | Canais (WhatsApp, Telegram, Slack) | Interface `ChannelProvider` com adapters: `TwilioAdapter`, `TelegramAdapter` | Extensibilidade: novo canal requer apenas novo adapter, sem mudar core |
| **Strategy Pattern** | Classificação de Intents | Interface `IntentClassifier` com estratégias: `LLMClassifier`, `RegexClassifier` | Flexibilidade: swap dinâmico via feature flag baseado em custo/precisão |
| **Repository Pattern** | Persistência de Conversas | Interface `ConversationRepository` com implementação `DynamoDBRepository` | Isolamento de infra: testes usam `InMemoryRepository`, produção usa DynamoDB |
| **Saga Pattern** | Handoff com timeout | Orquestração via Step Functions: inicia timer, monitora resposta, executa compensação | Consistência eventual: handoff abandonado é detectado e notificado mesmo com falhas parciais |

---

## 10.2 Design Patterns Permitidos e Proibidos

### Permitidos

| Pattern | Onde se Aplica | Exemplo Concreto | Justificativa |
|---|---|---|---|
| **Factory** | Criação de Agentes | `AgentFactory.create('billing-v2')` retorna instância configurada | Centraliza configuração complexa (prompt, tools, limits) |
| **Observer** | Sistema de Alertas | `AlertService.notify('P0', event)` dispara Slack, PagerDuty, Email | Múltiplos subscribers sem acoplamento |
| **Decorator** | Logging de Tools | `@LogExecutionTime()` wrapper em métodos de tool | Cross-cutting concern sem poluir lógica de negócio |
| **Builder** | Construção de Mensagens ACP | `ACPMessageBuilder().setSender(...).setContent(...).build()` | Objeto complexo com muitos campos opcionais |
| **Singleton** | Clientes de Infra (Redis, DynamoDB) | `RedisClient.getInstance()` retorna mesma conexão | Economia de recursos: conexões são caras |
| **Middleware** | Pipeline de Request | Express middleware: auth → rateLimit → tracing → handler | Composição de comportamentos transversais |

### Proibidos

| Pattern | Motivo da Proibição | Alternativa Recomendada | Risco se Usado |
|---|---|---|---|
| **Singleton Global** | Acoplamento implícito, difícil de testar | Dependency Injection com container | Testes exigem reset de estado global, race conditions em testes paralelos |
| **Inheritance Deep** | Hierarquias > 3 níveis criam fragilidade | Composition over inheritance | Mudança em classe base quebra 10 subclasses. Debug complexo. |
| **Active Record** | Mistura persistência com lógica de negócio | Repository pattern + DTOs | Modelos inchados, difícil mockar DB em testes, violação SRP |
| **Service Locator** | Dependência oculta, anti-pattern | Constructor injection | Difícil rastrear dependências, teste exige setup complexo |
| **God Object** | Classe com > 500 linhas ou > 20 métodos | Split em classes coesas por responsabilidade | Classe `Orchestrator` com 800 linhas foi refatorada em 6 módulos menores |
| **Callback Hell** | Aninhamento > 3 níveis de callbacks | Async/await ou Promises chain | Código ilegível, tratamento de erro frágil, já causou bug em produção (#2024-09-12) |

---

## 10.3 Regras de Modularização — Contratos de Acoplamento

### Níveis de Visibilidade

| Nível | Sufixo no Nome | Quem Pode Importar | Exemplo |
|---|---|---|---|
| **Public** | Nenhum sufixo | Qualquer módulo do workspace | `export function classifyIntent()` em `orchestrator-core` |
| **Internal** | Sufixo `-internal` | Apenas módulos do mesmo package | `export function _validateInput()` em `acp-core-internal` |
| **Private** | Prefixo `_` | Apenas arquivo onde foi definido | `function _parsePayload()` dentro de `webhook.ts` |

### Matriz de Dependências Permitidas

```
┌─────────────────────┬──────────────────────────────────────────┐
│ Módulo Importador   │ Pode Importar De                         │
├─────────────────────┼──────────────────────────────────────────┤
│ extensions/*        │ packages/* (todos), outras extensions    │
│ packages/acp-core   │ Nenhum package interno (apenas deps npm) │
│ packages/orchestrator-core │ acp-core, llm-core, agent-core    │
│ packages/agent-core │ acp-core, llm-core                        │
│ packages/gateway-core │ acp-core, cache-service                │
│ packages/conversation-manager │ acp-core                       │
│ packages/cache-service │ Nenhum package interno               │
│ packages/handoff-service │ conversation-manager, cache-service │
│ apps/*              │ sdk, packages/* (apenas exports públicos) │
└─────────────────────┴──────────────────────────────────────────┘
```

### Regras de Ciclo de Dependência

1. **Proibido ciclo direto:** Se A importa B, B não pode importar A.
2. **Proibido ciclo indireto:** Se A → B → C, então C não pode importar A.
3. **Validação automatizada:** `madge --circular packages/ extensions/` roda em cada PR. Falha = bloqueio de merge.
4. **Exceção:** Tipos compartilhados em `packages/shared-types` podem ser importados por todos sem criar ciclo.

### Limites de Complexidade por Módulo

| Métrica | Limite Máximo | Ferramenta de Validação | Ação se Exceder |
|---|---|---|---|
| Linhas por arquivo | 400 linhas | `wc -l` no pre-commit hook | Refatorar em múltiplos arquivos |
| Funções por arquivo | 15 funções | ESLint custom rule | Extrair para módulos menores |
| Complexidade ciclomática | 15 por função | `eslint-plugin-complexity` | Refatorar com early returns ou extract method |
| Profundidade de aninhamento | 4 níveis | ESLint `max-depth` rule | Usar guard clauses ou pattern matching |
| Dependências diretas | 12 imports | `madge --count` | Reavaliar responsabilidades do módulo |

---

## 10.4 Observabilidade — Estratégia Completa

### Logging Estruturado

**Formato:** JSON Lines (um JSON por linha)  
**Destino:** CloudWatch Logs → Kinesis Firehose → S3 (retention 90 dias)  
**Campos Obrigatórios:**

```json
{
  "timestamp": "2025-01-15T10:30:00.123Z",
  "level": "INFO",
  "service": "gateway-whatsapp",
  "correlationId": "corr_abc123xyz789",
  "sessionId": "wa_551199998888_1735689600",
  "userId": "usr_def456",
  "event": "webhook.received",
  "duration_ms": 45,
  "metadata": {
    "channel": "whatsapp",
    "messageType": "text",
    "phoneNumber": "+55119999****" 
  }
}
```

**Níveis de Log:**

| Nível | Quando Usar | Exemplo | Alerta Associado |
|---|---|---|---|
| `DEBUG` | Diagnóstico detalhado (desabilitado em produção) | "Payload recebido: {...}" | Nenhum |
| `INFO` | Fluxo normal de operação | "Webhook processado com sucesso" | Nenhum |
| `WARN` | Comportamento inesperado mas recuperável | "LLM timeout, usando fallback regex" | Slack channel #warnings (batch diário) |
| `ERROR` | Erro recuperável com impacto parcial | "Tool bank_balance falhou, retry agendado" | PagerDuty P2 se > 10/min |
| `CRITICAL` | Erro não recuperável, intervenção necessária | "DynamoDB connection lost, circuit breaker open" | PagerDuty P1 imediato + Slack #incidents |

**Regras de Mascaramento de PII:**

```typescript
// Middleware aplicado a todos os logs
function maskPII(log: LogEntry): LogEntry {
  // Telefone: mantém apenas últimos 4 dígitos
  log.metadata.phoneNumber = log.metadata.phoneNumber?.replace(/(\d{8})\d{4}/, '$1****');
  
  // Email: mascara domínio
  log.metadata.email = log.metadata.email?.replace(/(@.+)/, '@***.com');
  
  // Token JWT: remove completamente
  if (log.metadata.token) delete log.metadata.token;
  
  return log;
}
```

### Auditoria (Audit Trail)

**O que é registrado:**
- Todas as operações de escrita no DynamoDB (PutItem, UpdateItem, DeleteItem).
- Acessos a Secrets Manager (quem acessou qual secret, quando).
- Mudanças de configuração via feature flags.
- Handoffs solicitados e respondidos.

**Retenção:** 2 anos (requisito compliance financeiro).  
**Armazenamento:** S3 com versionamento habilitado + Glacier Deep Archive após 90 dias.  
**Acesso:** Apenas role `openclaw-auditor-role` com MFA obrigatório.

### Monitoramento — Métricas Coletadas

| Métrica | Tipo | Dimensões | Threshold de Alerta | Frequência |
|---|---|---|---|---|
| `GatewayLatency` | Histogram | channelId, endpoint | p95 > 500ms | 1min |
| `OrchestratorClassificationAccuracy` | Custom | agentId, confidence_bucket | accuracy < 80% | 5min |
| `ToolExecutionTime` | Histogram | toolName, status | p95 > 3000ms | 1min |
| `SQSQueueDepth` | Gauge | queueName | depth > 10000 | 1min |
| `DynamoDBThrottledRequests` | Counter | tableName, operation | count > 0 | 1min |
| `RedisCacheHitRate` | Percentage | cacheName | hit_rate < 70% | 5min |
| `HandoffAbandonmentRate` | Percentage | reason | rate > 15% | 15min |
| `CostPerMessage` | Custom | channelId | cost > $0.60/1k | 1h |

### Dashboards CloudWatch

**Dashboard Principal (NOC):**
- Throughput: mensagens recebidas/enviadas por minuto.
- Latência: p50, p95, p99 end-to-end.
- Erros: taxa de erro por componente (gateway, orchestrator, agents).
- Fila SQS: depth médio e máximo.

**Dashboard de Negócio (PM):**
- Intents distribuídos: top 10 intents do dia.
- Handoffs: total, taxa de abandono, tempo médio de resposta humana.
- CSAT estimado: % de conversas sem reclamação.

**Dashboard de Custo (Financeiro):**
- Custo por canal (WhatsApp vs Telegram).
- Custo por agente (billing vs general).
- Projeção mensal baseada em uso atual.

---

## 10.5 Escopo Congelado — Alterações Proibidas

### Arquivos Protegidos (Não Modificar sem ADR + Aprovação de 2 Tech Leads)

| Arquivo | Razão da Proteção | Processo de Mudança |
|---|---|---|
| `packages/acp-core/src/protocol/message-schema.ts` | Schema é contrato entre todos os componentes. Mudança quebra compatibilidade. | 1. Criar versão v2 do schema.<br>2. Implementar adapter de migração.<br>3. ADR justificando breaking change.<br>4. Deploy coordenado de todos os serviços. |
| `terraform/environments/production/main.tf` | Infra de produção. Erro causa downtime. | 1. PR review obrigatório de DevOps Lead.<br>2. `terraform plan` em staging primeiro.<br>3. Janela de manutenção agendada.<br>4. Rollback plan documentado. |
| `packages/gateway-core/src/middleware/auth.ts` | Segurança crítica. Vulnerabilidade aqui compromete todo o sistema. | 1. Security review obrigatório.<br>2. Penetration test após mudança.<br>3. ADR com análise de impacto. |
| `packages/conversation-manager/src/compliance/data-retention.ts` | Compliance LGPD. Erro resulta em multa. | 1. Aprovação do DPO (Data Protection Officer).<br>2. Teste de purge em ambiente isolado.<br>3. Audit trail da mudança. |
| `.github/workflows/deploy.yml` | Pipeline de deploy. Bug paralisa releases. | 1. Teste em branch separada com workflow duplicado.<br>2. Aprovação de DevOps Lead.<br>3. Rollback manual testado antes. |

### Alterações de Comportamento Proibidas (Sem ADR)

1. **Mudar TTL de conversas de 30 dias:** Requer aprovação jurídica (LGPD) e script de migração.
2. **Remover fallback regex do orchestrator:** Reduz resiliência. Requer teste de carga provando LLM estável 99.9%.
3. **Alterar limite de rate limiting de 20 req/min:** Impacta UX e segurança. Requer análise de abuso histórico.
4. **Mudar região AWS de us-east-1:** Decisão irreversível com custo alto. Requer ADR executivo.
5. **Substituir DynamoDB por PostgreSQL:** Breaking change arquitetural. Requer migração planejada de 2-3 semanas.

### Interfaces Públicas Congeladas (Versionamento SemVer Obrigatório)

| Interface | Versão Atual | Política de Depreciação |
|---|---|---|
| `POST /webhooks/twilio/whatsapp` | v1.0 | Suportada até v3.0 (12 meses após lançamento de v3.0) |
| `ACPMessage` schema | v1.2 | v1.x suportado até 2026-01-01. v2.0 em desenvolvimento. |
| `classifyIntent()` signature | v1.0 | Parâmetros novos são opcionais. Remoção só em major version. |
| `GET /health` | v1.0 | Nunca será removida (requisito de load balancer). |

---

## 10.6 Guia de Revisão de Código — Checklist Obrigatório

Todo PR deve passar por este checklist antes de merge:

### Checklist Técnico

- [ ] **Testes:** Cobertura > 85% para código novo. Testes falhando = bloqueio automático.
- [ ] **Tipagem:** Zero `any` explícito. Typescript strict mode habilitado.
- [ ] **Linting:** `pnpm lint` passa sem errors ou warnings.
- [ ] **Dependências:** Novas dependências aprovadas por security scan (npm audit, Snyk).
- [ ] **Performance:** Nenhuma query N+1 introduzida. Loops > 100 iterações justificados.
- [ ] **Segurança:** Secrets não hardcoded. PII mascarada em logs.
- [ ] **Observabilidade:** Novos endpoints incluem logging estruturado e métricas.
- [ ] **Documentação:** README atualizado se interface pública mudou.

### Checklist de Arquitetura

- [ ] **Dependências:** Nova dependência não cria ciclo (validar com `madge --circular`).
- [ ] **Responsabilidade:** Novo arquivo tem única responsabilidade clara (< 400 linhas).
- [ ] **Acoplamento:** Módulo novo não importa mais de 12 dependências diretas.
- [ ] **Resiliência:** Chamadas externas têm timeout, retry e circuit breaker.
- [ ] **Feature Flags:** Funcionalidade nova atrás de feature flag (rollback rápido).

### Checklist de Negócio

- [ ] **Critério de Aceite:** PR referencia ticket com critérios claros (Gherkin).
- [ ] **Impacto:** Mudança documentada em changelog com nota de migração se necessário.
- [ ] **Rollback:** Plano de rollback testado e documentado nos comentários do PR.

---

**Fim da Parte 10.** Próximas seções: **Partes 11-14 — Guia de Replicação, Extensibilidade, Limitações e Roadmap**.
