# Parte 2 (Continuação) — Arquitetura de Componentes Aprofundada

## Componente 2: Agent Orchestrator (`@openclaw/agent-core`)

**Ficha Técnica**

| Atributo | Valor |
|---|---|
| **ID Interno** | `orchestrator-core` |
| **Localização** | `/packages/agent-core/src/AgentOrchestrator.ts` |
| **Classe Base** | `EventEmitter` com interface `IAgentOrchestrator` |
| **Dependências** | `@openclaw/llm-core@1.0.0`, `@openclaw/acp-core@1.0.0`, `zod@3.22.4`, `ioredis@5.3.2` |
| **Modo de Operação** | Assíncrono, stateful (mantém estado da conversa em memória volátil + Redis) |
| **Permissões** | Leitura: `conversation_memory`, `tool_registry`; Escrita: `agent_traces`, `conversation_state`; Execução: `llm_inference`, `tool_invocation` |
| **Timeout Padrão** | 30s por turno de conversa (configurável via `AGENT_TIMEOUT_MS`) |

**Responsabilidade**
Receber mensagem enfileirada do Redis Stream, carregar estado da conversa, montar prompt contextualizado (histórico + system prompt + ferramentas disponíveis), invocar LLM via `@openclaw/llm-core`, parsear resposta com function calling, executar ferramentas solicitadas e retornar resposta ao canal de origem.

**Inputs Detalhados**

| Input | Tipo | Descrição | Origem | Exemplo de Payload |
|---|---|---|---|---|
| `message_event` | `RedisStreamEntry` | Mensagem consumida do stream | Redis Stream `incoming_messages` | `{ "message_id": "msg_1a2b3c", "conversation_id": "conv_xyz789", "tenant_id": "tenant_abc123", "channel": "whatsapp", "from": "5511999999999", "content": "Quero agendar uma consulta para amanhã às 15h", "metadata": "{\"user_name\":\"João Silva\"}" }` |
| `tool_result` | `ToolExecutionResult` | Resultado de ferramenta executada assincronamente | Callback de `ToolExecutor` | `{ "tool_id": "calendar_availability", "call_id": "call_abc123", "status": "success", "result": { "available_slots": ["2025-01-16T15:00:00Z", "2025-01-16T16:00:00Z"] }, "duration_ms": 234 }` |
| `cancel_request` | `CancelSignal` | Solicitação de cancelamento de execução (timeout ou usuário) | WebSocket ou Redis Pub/Sub | `{ "conversation_id": "conv_xyz789", "reason": "timeout", "cancelled_at": "2025-01-15T14:32:48.789Z" }` |

**Output**

```json
{
  "trace_id": "trace_9f8e7d6c5b4a",
  "conversation_id": "conv_xyz789",
  "tenant_id": "tenant_abc123",
  "turn_number": 7,
  "llm_provider": "anthropic",
  "model": "claude-3-sonnet-20240229",
  "prompt_tokens": 2847,
  "completion_tokens": 156,
  "total_tokens": 3003,
  "duration_ms": 2341,
  "response": {
    "role": "assistant",
    "content": "Encontrei os seguintes horários disponíveis para amanhã (16/01): 15:00 ou 16:00. Qual você prefere?",
    "tool_calls": []
  },
  "tools_executed": [
    {
      "tool_id": "calendar_availability",
      "call_id": "call_abc123",
      "arguments": { "date": "2025-01-16", "duration_minutes": 30 },
      "status": "success",
      "result_summary": "2 slots encontrados",
      "duration_ms": 234
    }
  ],
  "memory_updated": true,
  "state_transition": "WAITING_USER_RESPONSE"
}
```

**System Prompt Template (por tenant)**

```
Você é um assistente virtual especializado em agendamento de consultas médicas para a clínica VidaSaúde.

REGRAS INVIOLÁVEIS:
1. NUNCA invente horários disponíveis — sempre use a ferramenta calendar_availability antes de sugerir
2. NUNCA confirme agendamentos sem usar a ferramenta calendar_book com confirmação explícita do usuário
3. Se o usuário pedir informações médicas, responda genericamente e oriente consultar um médico
4. Mantenha tom empático mas profissional; use nome do usuário se disponível
5. Se não entender a solicitação, peça esclarecimento antes de executar qualquer ferramenta

CONTEXTO DA CONVERSA:
- Usuário: {{USER_NAME}} (telefone: {{PHONE_NUMBER}})
- Histórico recente: {{LAST_5_MESSAGES}}
- Memória de longo prazo: {{LONG_TERM_SUMMARY}}

FERRAMENTAS DISPONÍVEIS:
{{TOOL_DEFINITIONS_JSON}}

FORMATO DE RESPOSTA:
- Se precisa de mais informação: responda diretamente
- Se vai executar ferramenta: use sintaxe JSON {"tool": "nome", "arguments": {...}}
- Se tem resposta final: responda em português claro e conciso
```

**Budget de Recursos**

| Componente | Alocação | % do Budget Total | Limite Absoluto |
|---|---|---|---|
| Carregamento de estado (Redis) | 15ms | 1% | Máx 50ms |
| Montagem de prompt (template + histórico) | 8ms | 0.5% | Máx 20ms |
| Inferência LLM (claude-3-sonnet) | 2000ms | 67% | P95 < 5000ms |
| Parse de resposta + validação JSON | 5ms | 0.3% | Máx 15ms |
| Execução de ferramentas (paralelo) | 800ms | 27% | Máx 3000ms total |
| Persistência de trace (PostgreSQL) | 120ms | 4% | Máx 500ms |
| **Total Target** | **2948ms** | **100%** | **P95 < 8000ms** |

**Interfaces Públicas**

```typescript
// Arquivo: /packages/agent-core/src/AgentOrchestrator.ts
export class AgentOrchestrator extends EventEmitter {
  // Processa uma mensagem de conversa e retorna resposta
  public async processTurn(
    conversationId: string,
    tenantId: string,
    message: IncomingMessage
  ): Promise<AgentTurnResult>;

  // Cancela execução em andamento (timeout ou intervenção)
  public async cancelTurn(
    conversationId: string,
    reason: 'timeout' | 'user_cancelled' | 'system_error'
  ): Promise<{ cancelled: boolean; partial_result?: AgentTurnResult }>;

  // Recupera estado atual de uma conversa
  public async getConversationState(
    conversationId: string
  ): Promise<{
    status: 'idle' | 'processing' | 'waiting_tool' | 'error';
    current_turn: number;
    last_activity: Date;
    pending_tools: ToolCall[];
  }>;

  // Registra nova ferramenta no registry (hot reload)
  public registerTool(tool: ToolDefinition): void;

  // Emite eventos: 'turn_started', 'tool_called', 'turn_completed', 'error'
}

// Eventos emitidos
export interface OrchestratorEvents {
  turn_started: (data: { conversation_id: string; turn_number: number }) => void;
  tool_called: (data: { tool_id: string; call_id: string; arguments: unknown }) => void;
  turn_completed: (data: AgentTurnResult) => void;
  error: (data: { conversation_id: string; error_code: string; message: string }) => void;
}
```

**Cenários de Teste (Gherkin)**

```gherkin
Cenário Feliz: Agendamento com ferramenta de calendário
  DADO uma conversa ativa "conv_xyz789" com histórico de 5 mensagens
  E o usuário envia "Quero agendar para amanhã às 15h"
  QUANDO o orchestrator processa esta mensagem
  ENTÃO executa a ferramenta calendar_availability com data=2025-01-16
  E recebe lista de slots disponíveis [{"time":"15:00"},{"time":"15:30"}]
  E responde ao usuário "Encontrei os horários 15:00 e 15:30. Qual prefere?"
  E persiste trace no PostgreSQL com tool_calls = ["calendar_availability"]
  E tempo total de processamento é < 5000ms

Cenário de Erro: LLM retorna JSON malformado
  DADO que o LLM retorna resposta com JSON inválido (ex: {"tool": "calendar", "args": } faltando valor)
  QUANDO o orchestrator tenta parsear a resposta
  ENTÃO detecta erro de parsing em < 100ms
  E registra trace com campo parse_error = "Invalid JSON at position 42"
  E re-invoke o LLM com prompt de correção (max 2 retries)
  Se falhar novamente, responde ao usuário "Desculpe, tive um erro interno. Pode repetir?"
  E emite evento error com error_code = "LLM_PARSE_ERROR"

Cenário de Borda: Timeout durante execução de ferramenta lenta
  DADO uma ferramenta calendar_availability que demora 8s para responder (timeout configurado: 5s)
  QUANDO o orchestrator executa esta ferramenta
  ENTÃO cancela a execução após 5000ms
  E registra trace parcial com tools_executed = [{status: "timeout"}]
  E responde ao usuário "Estou com instabilidade no sistema de agenda. Tente em alguns minutos."
  E emite métrica tool_timeout_total incrementada em 1
```

---

## Componente 3: Channel Adapter — WhatsApp (`@openclaw/channel-whatsapp`)

**Ficha Técnica**

| Atributo | Valor |
|---|---|
| **ID Interno** | `channel-whatsapp-cloud` |
| **Localização** | `/extensions/whatsapp/src/WhatsAppAdapter.ts` |
| **Classe Base** | Implementa interface `IChannelAdapter` |
| **Dependências** | `axios@1.6.2`, `crypto@node:builtin`, `@openclaw/acp-core@1.0.0` |
| **Modo de Operação** | Stateless, request-response via HTTP |
| **Permissões** | Leitura: `webhook_payloads`; Escrita: `whatsapp_api_outbound`; Execução: `hmac_validation` |
| **API Externa** | WhatsApp Cloud API v17.0 (Meta) |

**Responsabilidade**
Traduzir payloads da WhatsApp Cloud API para formato interno padronizado (`IncomingMessage`) e vice-versa, validar assinaturas HMAC dos webhooks, gerenciar templates de mensagem aprovados e lidar com rate limits da API (80 requests/second por número).

**Inputs Detalhados**

| Input | Tipo | Descrição | Origem | Exemplo de Payload |
|---|---|---|---|---|
| `webhook_notification` | `application/json` | Notificação push da Meta | WhatsApp Cloud API Webhook | `{ "object": "whatsapp_business_account", "entry": [{ "id": "110234567890", "changes": [{ "value": { "messaging_product": "whatsapp", "metadata": { "display_phone_number": "5511999999999", "phone_number_id": "110234567890" }, "messages": [{ "from": "5511988888888", "id": "wamid.HBgNNTUxMTk4ODg4ODg4OBUCABIYFDNFQjAwMjRDMzQyMzQyMzQyAA==", "timestamp": "1705329138", "type": "text", "text": { "body": "Quero agendar" } }] } }] }] }` |
| `outbound_message` | `OutboundMessage` | Mensagem formatada para envio | Agent Orchestrator | `{ "to": "5511988888888", "type": "text", "content": "Encontrei os horários 15:00 e 15:30", "conversation_id": "conv_xyz789", "tenant_id": "tenant_abc123" }` |

**Output (API WhatsApp)**

```bash
# Request curl real para WhatsApp Cloud API
curl -X POST 'https://graph.facebook.com/v17.0/110234567890/messages' \
  -H 'Authorization: Bearer EAABsbCS1iHgBO7ZCxqZB4LZAMZAZCZCqZAZCqZAZCqZAZCqZAZCqZAZCqZAZCqZAZCqZAZCqZA' \
  -H 'Content-Type: application/json' \
  -d '{
    "messaging_product": "whatsapp",
    "to": "5511988888888",
    "type": "text",
    "text": {
      "body": "Encontrei os horários 15:00 e 15:30. Qual você prefere?",
      "preview_url": false
    }
  }'

# Response real da API
{
  "messaging_product": "whatsapp",
  "contacts": [
    {
      "input": "5511988888888",
      "wa_id": "5511988888888"
    }
  ],
  "messages": [
    {
      "id": "wamid.HBgNNTUxMTk4ODg4ODg4OBUCABIYFDNFQjAwMjRDMzQyMzQyMzQyAA=="
    }
  ]
}
```

**Configuração Específica**

```bash
# WhatsApp Cloud API
WHATSAPP_BUSINESS_ACCOUNT_ID=110234567890
WHATSAPP_PHONE_NUMBER_ID=110234567890
WHATSAPP_ACCESS_TOKEN=EAABsbCS1iHgBO7ZCxqZB4LZAMZAZCZCqZAZCqZAZCqZAZCqZAZCqZAZCqZAZCqZAZCqZAZCqZA
WHATSAPP_VERIFY_TOKEN=openclaw_whatsapp_verify_2025_secure_token
WHATSAPP_API_VERSION=v17.0
WHATSAPP_RATE_LIMIT_PER_SECOND=80
WHATSAPP_TEMPLATE_NAMESPACE=default

# Fallback se API falhar
WHATSAPP_FALLBACK_ENABLED=true
WHATSAPP_FALLBACK_QUEUE=whatsapp_dead_letter
WHATSAPP_FALLBACK_RETRY_HOURS=1,4,12,24
```

**Tratamento de Erros Específicos**

| Código Erro API | Significado | Ação Automática | Retry? | Fallback |
|---|---|---|---|---|
| `130429` | Rate limit excedido (80 req/s) | Backoff exponencial 2ⁿ × 500ms, máx 5 tentativas | Sim, 5x | Enfila em dead-letter queue |
| `131047` | Token expirado | Invalida cache de token, solicita refresh via OAuth | Sim, 1x | Alerta Slack para admin renovar token |
| `131008` | Número de destino inválido | Registra erro permanente, não retry | Não | Responde ao tenant "Número inválido" |
| `131014` | Template não aprovado | Usa fallback de sessão livre (se permitido) | Não | Alerta para aprovar template |
| `130404` | Usuário bloqueou bot | Marca conversa como "opted_out" | Não | Remove de filas ativas, notifica tenant |

**Interfaces Públicas**

```typescript
// Arquivo: /extensions/whatsapp/src/WhatsAppAdapter.ts
export class WhatsAppAdapter implements IChannelAdapter {
  // Valida assinatura HMAC do webhook
  public validateWebhookSignature(
    rawBody: Buffer,
    signature: string,
    timestamp: string
  ): boolean;

  // Parse payload bruto para IncomingMessage padronizado
  public parseIncomingMessage(rawPayload: WhatsAppWebhookPayload): IncomingMessage;

  // Envia mensagem formatada para WhatsApp API
  public async sendMessage(outbound: OutboundMessage): Promise<{
    message_id: string;
    status: 'sent' | 'queued' | 'failed';
    error?: WhatsAppError;
  }>;

  // Gerencia templates (lista, preview, submit para aprovação)
  public async listTemplates(namespace?: string): Promise<WhatsAppTemplate[]>;
  public async submitTemplate(template: WhatsAppTemplateDraft): Promise<{
    template_id: string;
    status: 'pending' | 'approved' | 'rejected';
  }>;
}
```

**Cenários de Teste (Gherkin)**

```gherkin
Cenário Feliz: Webhook válido é processado
  DADO um webhook da WhatsApp Cloud API com assinatura HMAC correta
  E uma mensagem de texto "Olá" enviada de "+5511988888888"
  QUANDO o adapter recebe POST /webhooks/whatsapp
  ENTÃO valida assinatura em < 10ms
  E retorna IncomingMessage com fields: { from: "+5511988888888", content: "Olá", channel: "whatsapp", raw_message_id: "wamid.HBgN..." }
  E extrai tenant_id baseado no phone_number_id "110234567890" → tenant_abc123

Cenário de Erro: Rate limit da API WhatsApp
  DADO que o sistema já enviou 80 mensagens no último segundo
  QUANDO tenta enviar mensagem 81
  ENTÃO API retorna erro 130429 (Rate limit hit)
  E o adapter espera 1s (backoff inicial) e retry
  Se falhar 5 vezes, enfila em whatsapp_dead_letter
  E emite métrica whatsapp_rate_limit_hits incrementada em 1

Cenário de Segurança: Webhook com assinatura falsificada
  DADO um payload com conteúdo válido mas assinatura HMAC incorreta
  QUANDO o adapter recebe este webhook
  ENTÃO retorna HTTP 401 em < 5ms
  E registra tentativa suspeita com IP de origem e payload hash
  E não processa a mensagem
```

---

*(Continua com Componentes 4-7 nas próximas entregas)*

**Checklist Parcial Componentes 2-3:**
- [x] Orchestrator com budget de tokens detalhado (2847 prompt + 156 completion)
- [x] System prompt template com placeholders reais ({{USER_NAME}}, {{TOOL_DEFINITIONS_JSON}})
- [x] WhatsApp adapter com curl real de request/response
- [x] Tabela de erros específicos da API WhatsApp com códigos numéricos
- [ ] Componentes 4-7: Memory Manager, Tool Executor, Trace Auditor, Scheduler, SDK Client
