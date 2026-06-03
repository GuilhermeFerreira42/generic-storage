# NEXUS Protocol v1.2 — Partes 9 a 11
**Plano de Implementação, Padrões e Guia de Replicação**

---

## 🚀 PARTE 9 — PLANO DE IMPLEMENTAÇÃO

### 9.1 Definição do MVP

#### O QUE ESTÁ NO MVP ✅

- [ ] Autenticação básica (email/senha + JWT)
- [ ] CRUD completo de [entidade principal do projeto]
- [ ] Integração com [integração crítica #1]
- [ ] Dashboard básico com [métricas essenciais]
- [ ] Deploy automatizado em ambiente de staging
- [ ] Testes unitários cobrindo ≥80% do código crítico
- [ ] Documentação da API (OpenAPI/Swagger)
- [ ] Logging estruturado em todos os endpoints
- [ ] Tratamento de erros padronizado
- [ ] Health check endpoint

#### O QUE NÃO ESTÁ NO MVP ❌

- [ ] Autenticação social (Google, Facebook, etc.)
- [ ] Múltiplos níveis de permissão (RBAC avançado)
- [ ] Internacionalização (i18n)
- [ ] Tema claro/escuro
- [ ] Notificações push/email
- [ ] Relatórios avançados e exportação
- [ ] API pública para terceiros
- [ ] Mobile app nativo
- [ ] SSO corporativo
- [ ] Audit log detalhado
- [ ] Rate limiting avançado por usuário
- [ ] Webhooks para integrações externas
- [ ] GraphQL API
- [ ] WebSocket para atualizações em tempo real
- [ ] Machine Learning / IA integrada

**Regra:** Qualquer feature não listada explicitamente como "NO MVP" está fora do escopo inicial e requer ADR para inclusão antecipada.

---

### 9.2 Critérios de Aceitação do MVP

**Formato Gherkin para cenários críticos:**

```gherkin
# Cenário 1: Autenticação bem-sucedida
DADO que existe um usuário cadastrado com email "teste@exemplo.com" e senha "Senha123!"
QUANDO o usuário envia uma requisição POST para `/auth/login` com credenciais válidas
ENTÃO o sistema deve retornar HTTP 200
E o corpo da resposta deve conter um campo `accessToken` tipo string começando com "eyJhbG"
E o token deve expirar em exatamente 3600 segundos
E o sistema deve registrar um log de "login_success" com userId e timestamp

# Cenário 2: Tentativa de login com senha incorreta
DADO que existe um usuário cadastrado com email "teste@exemplo.com"
QUANDO o usuário envia uma requisição POST para `/auth/login` com senha incorreta
ENTÃO o sistema deve retornar HTTP 401
E o corpo da resposta deve conter erro "INVALID_CREDENTIALS"
E o sistema deve incrementar contador de falhas para este IP
E após 5 falhas consecutivas, o IP deve ser bloqueado por 15 minutos

# Cenário 3: Criação de recurso principal
DADO que o usuário está autenticado com token válido
QUANDO o usuário envia POST para `/recursos` com dados válidos
ENTÃO o sistema deve retornar HTTP 201
E o corpo deve conter o recurso criado com ID único gerado
E o recurso deve ser persistido no banco de dados
E um evento "recurso_criado" deve ser publicado no message broker

# Cenário 4: Recuperação de lista paginada
DADO que existem 50 recursos cadastrados no sistema
QUANDO o usuário envia GET para `/recursos?page=2&limit=10`
ENTÃO o sistema deve retornar HTTP 200
E o corpo deve conter exatamente 10 itens na página 2
E metadados devem incluir totalPages=5, currentPage=2, totalItems=50
E a latência da resposta deve ser < 200ms (p95)

# Cenário 5: Deleção com confirmação
DADO que o usuário possui um recurso com ID "xyz123"
QUANDO o usuário envia DELETE para `/recursos/xyz123`
ENTÃO o sistema deve marcar o recurso como deletado (soft delete)
E retornar HTTP 204 No Content
E o recurso não deve aparecer em consultas futuras
E um log de auditoria deve ser registrado com userId, timestamp e resourceId
```

**Critérios Quantitativos de Aprovação do MVP:**

| Métrica | Target Mínimo | Como Validar |
|---------|---------------|--------------|
| Cobertura de testes | ≥ 80% linhas críticas | `npm run test:coverage` |
| Latência p95 | < 200ms | Load test com k6, 100 VUs |
| Uptime em staging | ≥ 99% por 7 dias | Monitoring externo (UptimeRobot) |
| Bugs críticos abertos | 0 | Issue tracker (severity: critical) |
| Tempo de deploy | < 10 minutos | CI/CD pipeline metrics |
| Rollback automático | Funcional em < 2 min | Simulação de falha em staging |

---

### 9.3 Fases de Implementação

**Cronograma sequencial com dependência estrita:**

| Fase | Duração Estimada | Entregas Principais | Critério de Conclusão | Dependência |
|------|------------------|---------------------|-----------------------|-------------|
| **Fase 0** | 1 semana | Setup de infraestrutura, CI/CD, ambientes | Pipeline CI rodando testes; Staging acessível via HTTPS | Nenhuma |
| **Fase 1** | 2 semanas | AuthModule + UserModule + DB schema | Login/logout funcionais; Usuários persistidos; Testes passing | Fase 0 |
| **Fase 2** | 3 semanas | Módulo principal de domínio + APIs CRUD | CRUD completo operando; Validações implementadas; Integration tests green | Fase 1 |
| **Fase 3** | 2 semanas | Integrações externas + eventos | Integrações ativas; Eventos publicados; Error handling testado | Fase 2 |
| **Fase 4** | 1 semana | Dashboard + métricas + observabilidade | Dashboard exibindo dados reais; Alerts configurados; Logs centralizados | Fase 3 |
| **Fase 5** | 1 semana | Hardening + performance + security audit | Pentest passed; Load test atingindo targets; Code review final | Fase 4 |
| **Fase 6** | 3 dias | Deploy produção + smoke tests | Produção acessível; Health checks passing; Monitoramento ativo | Fase 5 |

---

#### Detalhamento por Fase

##### FASE 0: Fundação e Infraestrutura

**Duração:** 1 semana  
**Responsável:** DevOps / Tech Lead

**Arquivos Criados/Modificados:**
```
✅ .github/workflows/ci.yml
✅ .github/workflows/cd-staging.yml
✅ docker/Dockerfile.dev
✅ docker/Dockerfile.prod
✅ docker/docker-compose.yml
✅ prisma/schema.prisma
✅ src/config/*.ts
✅ .env.example
✅ README.md (setup instructions)
✅ scripts/setup.sh
```

**Testes Obrigatórios:**
- [ ] Pipeline CI executa em < 5 minutos
- [ ] Docker compose sobe todos os serviços sem erro
- [ ] Migrations aplicam corretamente no banco
- [ ] Health check retorna 200 OK

**Critério de Aceite da Fase:**
```bash
# Todos os comandos abaixo devem executar com sucesso:
docker-compose up -d && sleep 10
curl http://localhost:3000/health | jq '.status' # Deve retornar "ok"
npm run test:unit # 100% passing
npm run db:migrate # Sem erros
```

---

##### FASE 1: Autenticação e Usuários

**Duração:** 2 semanas  
**Responsável:** Backend Team

**Arquivos Criados/Modificados:**
```
✅ src/auth/auth.controller.ts
✅ src/auth/auth.service.ts
✅ src/auth/auth.guard.ts
✅ src/auth/strategies/jwt.strategy.ts
✅ src/auth/strategies/local.strategy.ts
✅ src/auth/dto/login.dto.ts
✅ src/auth/dto/refresh-token.dto.ts
✅ src/users/users.controller.ts
✅ src/users/users.service.ts
✅ src/users/user.entity.ts
✅ src/users/dto/create-user.dto.ts
✅ src/users/dto/update-user.dto.ts
✅ tests/unit/auth/*.spec.ts
✅ tests/integration/auth.e2e.spec.ts
```

**Testes Obrigatórios:**
- [ ] `authenticateUser()` retorna JWT válido
- [ ] `refreshTokens()` gera novo par de tokens
- [ ] `invalidateUserTokens()` faz logout
- [ ] Senhas são hasheadas com bcrypt (rounds=10)
- [ ] Tokens expiram conforme configuração
- [ ] Refresh token é invalidado após uso (opcional, configurar)
- [ ] Rate limiting previne brute force (5 tentativas/hora/IP)

**Critério de Aceite da Fase:**
```bash
# Testes E2E de autenticação
npm run test:e2e -- auth

# Validação manual via curl
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@exemplo.com","senha":"Senha123!"}' \
  | jq '.accessToken' # Deve retornar JWT válido
```

---

##### FASE 2: Módulo Principal de Domínio

**Duração:** 3 semanas  
**Responsável:** Backend Team

**Arquivos Criados/Modificados:**
```
✅ src/[modulo-principal]/[modulo].controller.ts
✅ src/[modulo-principal]/[modulo].service.ts
✅ src/[modulo-principal]/[entidade].entity.ts
✅ src/[modulo-principal]/dto/create-[entidade].dto.ts
✅ src/[modulo-principal]/dto/update-[entidade].dto.ts
✅ src/[modulo-principal]/dto/[entidade].schema.ts
✅ prisma/migrations/YYYYMMDDHHMMSS_create_[entidade]/migration.sql
✅ tests/unit/[modulo]/*.spec.ts
✅ tests/integration/[modulo].e2e.spec.ts
```

**Testes Obrigatórios:**
- [ ] Create: valida input, persiste entidade, retorna 201
- [ ] Read by ID: retorna 200 com entidade ou 404 se não existir
- [ ] Read all: paginação funcional, ordenação, filtros básicos
- [ ] Update: valida input parcial, atualiza apenas campos fornecidos
- [ ] Delete: soft delete, retorna 204, entidade não aparece em queries
- [ ] Validações de DTO disparam 400 Bad Request
- [ ] Entidades únicas (unique constraints) disparam 409 Conflict

**Critério de Aceite da Fase:**
```bash
# Suite completa de testes do módulo
npm run test:e2e -- [modulo-principal]

# Validação de performance
npm run test:performance -- --target=/api/[modulo-principal] --vus=100 --duration=60s
# Resultado esperado: p95 < 200ms, error rate < 0.1%
```

---

##### FASE 3: Integrações Externas

**Duração:** 2 semanas  
**Responsável:** Backend Team + Integrações

**Arquivos Criados/Modificados:**
```
✅ src/integrations/[provedor]/[provedor].service.ts
✅ src/integrations/[provedor]/[provedor].types.ts
✅ src/events/[evento].event.ts
✅ src/events/events.module.ts
✅ src/webhooks/webhooks.controller.ts (se aplicável)
✅ tests/integration/[provedor].integration.spec.ts
```

**Testes Obrigatórios:**
- [ ] Integração responde dentro do timeout configurado
- [ ] Retry automático em falhas transitórias (exponential backoff)
- [ ] Fallback gracefully quando integração indisponível
- [ ] Eventos são publicados corretamente
- [ ] Webhooks são validados (assinatura HMAC)
- [ ] Secrets de integração não vazam em logs

**Critério de Aceite da Fase:**
```bash
# Teste de resiliência de integração
npm run test:integration -- [provedor] --chaos

# Simulação de falha
# 1. Mockar resposta 500 do provedor externo
# 2. Verificar retry automático (3 tentativas)
# 3. Verificar fallback após esgotar retries
# 4. Verificar alerta disparado no monitoring
```

---

##### FASE 4: Dashboard e Observabilidade

**Duração:** 1 semana  
**Responsável:** Frontend + Backend

**Arquivos Criados/Modificados:**
```
✅ src/metrics/metrics.controller.ts
✅ src/metrics/prometheus.metrics.ts
✅ frontend/src/dashboard/*.tsx
✅ frontend/src/components/charts/*.tsx
✅ docker-compose.monitoring.yml (Prometheus + Grafana)
✅ alerts/alerts.rules.yml
```

**Testes Obrigatórios:**
- [ ] Métricas são expostas em `/metrics` formato Prometheus
- [ ] Dashboard exibe dados em tempo real (< 30s delay)
- [ ] Alertas disparam nas condições configuradas
- [ ] Logs estruturados incluem traceId, userId, requestId

**Critério de Aceite da Fase:**
```bash
# Validação de métricas
curl http://localhost:3000/metrics | grep http_request_duration_seconds

# Validação de dashboard
# Acessar http://localhost:3001 (Grafana)
# Verificar dashboards carregados e dados fluindo

# Teste de alerta
# Disparar condição de alerta manualmente
# Verificar notificação em canal configurado (Slack, Email, PagerDuty)
```

---

##### FASE 5: Hardening e Security

**Duração:** 1 semana  
**Responsável:** Security Team + Tech Lead

**Atividades:**
- [ ] Rodar SAST (Static Application Security Testing)
- [ ] Rodar DAST (Dynamic Application Security Testing)
- [ ] Revisar dependências com `npm audit` ou equivalente
- [ ] Validar headers de segurança (CORS, CSP, HSTS)
- [ ] Testar SQL injection, XSS, CSRF
- [ ] Validar rate limiting em todos os endpoints sensíveis
- [ ] Revisar tratamento de dados sensíveis (PII)
- [ ] Penetration test manual por terceiro (recomendado)

**Arquivos Criados/Modificados:**
```
✅ SECURITY.md
✅ docs/security-audit-report.md
✅ .helm/values-production.yaml (configurações hardenizadas)
✅ src/middleware/security.middleware.ts
```

**Critério de Aceite da Fase:**
```bash
# Nenhum vulnerability crítica ou alta aberta
npm audit --audit-level=high # Deve retornar 0 vulnerabilities

# Headers de segurança presentes
curl -I http://localhost:3000/health | grep -E "(X-Frame-Options|X-Content-Type-Options|Strict-Transport-Security)"

# SAST scan
npm run security:sast # Deve passar sem critical/high issues
```

---

##### FASE 6: Go-Live

**Duração:** 3 dias  
**Responsável:** DevOps + Tech Lead + PM

**Checklist de Deploy:**
- [ ] DNS configurado apontando para load balancer
- [ ] SSL/TLS certificado instalado e válido
- [ ] Variáveis de ambiente de produção setadas
- [ ] Backup automático configurado
- [ ] Disaster recovery documentado e testado
- [ ] Runbook de operações criado
- [ ] Equipe de suporte treinada
- [ ] Plano de rollback testado
- [ ] Smoke tests pós-deploy passando

**Smoke Tests Pós-Deploy:**
```bash
# Health check básico
curl https://api.producao.com.br/health

# Teste de autenticação
curl -X POST https://api.producao.com.br/auth/login ...

# Teste de funcionalidade principal
curl https://api.producao.com.br/[endpoint-critico] ...

# Validação de monitoramento
# Verificar no Grafana/Prometheus se métricas estão fluindo
# Verificar no logging centralizado se logs estão chegando
```

**Critério de Aceite da Fase:**
- Todos os smoke tests passaram
- 0 errors nos logs nas primeiras 2 horas
- P95 latency dentro do target
- Uptime ≥ 99.9% nas primeiras 24 horas

---

### 9.4 Métricas de Sucesso

| Métrica | Target | Frequência de Medição | Como Medir | Responsável |
|---------|--------|----------------------|------------|-------------|
| **Lead Time for Changes** | < 1 dia | Semanal | Commit → Production | DevOps |
| **Deployment Frequency** | ≥ 1/day | Diário | Contagem de deploys | DevOps |
| **Change Failure Rate** | < 5% | Semanal | Deploys com rollback / total | Tech Lead |
| **Mean Time to Recovery (MTTR)** | < 1 hora | Por incidente | Incidente → Resolução | On-call |
| **API Latency p95** | < 200ms | Contínuo | Prometheus histogram | Backend |
| **Error Rate** | < 0.1% | Contínuo | 5xx responses / total requests | Backend |
| **Test Coverage** | ≥ 80% | Por PR | `npm run test:coverage` | QA |
| **Code Review Time** | < 4 horas | Por PR | PR aberto → merged | Team |
| **Customer Satisfaction (CSAT)** | ≥ 4.5/5 | Mensal | Survey NPS/CSAT | PM |
| **System Uptime** | ≥ 99.9% mensal | Mensal | Uptime monitoring | DevOps |

---

### 9.5 Riscos Técnicos

| ID | Risco | Probabilidade (1-5) | Impacto (1-5) | Score (P×I) | Mitigação | Plano de Contingência |
|----|-------|---------------------|---------------|-------------|-----------|----------------------|
| R-01 | Integração externa instável | 3 | 4 | 12 | Implementar circuit breaker; cache de fallback; retry com backoff | Usar dados em cache; degradar funcionalidade gracefulmente |
| R-02 | Banco de dados não escala conforme esperado | 2 | 5 | 10 | Query optimization desde início; read replicas planejadas; indexing strategy | Sharding emergencial; migração para managed DB mais potente |
| R-03 | Vulnerabilidade de segurança crítica descoberta | 2 | 5 | 10 | SAST/DAST contínuo; dependency scanning; pentest antes de production | Hotfix emergency pipeline; rollback imediato; communication plan |
| R-04 | Chave técnica (bus factor = 1) | 4 | 4 | 16 | Pair programming; documentação rigorosa; cross-training | Acionar consultor externo; redistribuir tarefas urgentemente |
| R-05 | Dependência de library obsoleta/abandonada | 3 | 3 | 9 | Avaliar maturidade antes de adotar; preferir libs com manutenção ativa | Fork interno; migração para alternativa; contribuição upstream |
| R-06 | Performance degrada sob carga inesperada | 3 | 4 | 12 | Load testing contínuo; auto-scaling configurado; profiling regular | Scale up emergencial; feature flags para desligar funcionalidades não-críticas |
| R-07 | Perda de dados por falha de backup | 1 | 5 | 5 | Backup automático diário; restore testado mensalmente; multi-region | Restore de backup; comunicação transparente; post-mortem obrigatório |
| R-08 | Scope creep durante desenvolvimento | 4 | 3 | 12 | Change control board; MVP rigidamente definido; ADR para mudanças | Negociar timeline; descope de features menos críticas; overtime planejado |
| R-09 | Burnout da equipe por pressão de prazo | 3 | 4 | 12 | Sprint planning realista; buffer de 20%; acompanhamento de wellbeing | Contratar contractor temporário; repriorizar backlog; ajustar expectativas |
| R-10 | Problemas legais/compliance (LGPD, GDPR) | 2 | 5 | 10 | Revisão jurídica antecipada; privacy by design; data mapping | Consultoria emergencial; ajuste de fluxos de dados; notificação autoridades se necessário |

**Matriz de Priorização de Riscos:**

```
Impacto
   5 │ R-02  R-03        R-07  R-10
   4 │       R-01  R-06        R-04  R-09
   3 │             R-05  R-08
   2 │
   1 │ R-07
     └─────────────────────────────
       1    2    3    4    5   Probabilidade
```

**Riscos Críticos (Score ≥ 12):** R-04, R-01, R-06, R-08, R-09  
**Ação Imediata:** Plano de mitigação detalhado para cada risco crítico deve ser documentado antes do início da Fase 1.

---

## 🏛️ PARTE 10 — PADRÕES E BLINDAGEM ESTRUTURAL

### 10.1 Padrões Arquiteturais Adotados

| Padrão | Onde se Aplica | Benefício | Exemplo Concreto |
|--------|----------------|-----------|------------------|
| **Dependency Injection** | Injeção de serviços em controllers e outros serviços | Testabilidade, desacoplamento, injeção de mocks em testes | `constructor(private userService: UserService)` |
| **Repository Pattern** | Camada de acesso a dados | Abstrair ORM; facilitar troca de persistência; testes sem DB real | `UserRepository.findByID(id)` |
| **Service Layer** | Lógica de negócio | Separar regras de negócio de controllers; reutilização | `AuthService.authenticateUser()` |
| **DTO Pattern** | Transferência de dados entre camadas | Validação na borda; tipagem clara; documentação de contratos | `CreateUserDto`, `LoginResponseDto` |
| **Guard Pattern** | Proteção de rotas | Centralizar autorização; reutilização em múltiplas rotas | `@UseGuards(JwtAuthGuard)` |
| **Interceptor Pattern** | Transformação de requests/responses | Logging, transformação, métricas transversais | `TransformInterceptor`, `LoggingInterceptor` |
| **Filter Pattern** | Tratamento de exceções global | Respostas de erro padronizadas; não vazar detalhes internos | `HttpExceptionFilter` |
| **Factory Pattern** | Criação de objetos complexos | Encapsular lógica de criação; diferentes variantes | `UserFactory.createAdmin()`, `UserFactory.createGuest()` |
| **Observer Pattern** | Sistema de eventos | Desacoplamento entre produtores e consumidores de eventos | `EventEmitter.emit('user.created')` |
| **Circuit Breaker** | Integrações externas | Prevenir cascata de falhas; fallback graceful | `CircuitBreaker.execute(() => externalApi.call())` |

---

### 10.2 Design Patterns Permitidos e Proibidos

| Permitido | Onde se Aplica | Proibido | Motivo da Proibição |
|-----------|----------------|----------|---------------------|
| Singleton | Services, Repositories, Config | Singleton global mutável | Estado compartilhado causa race conditions e dificulta testes |
| Factory | Criação de entidades complexas | Factory excessivamente genérica | Complexidade desnecessária; preferir construtores nomeados |
| Strategy | Algoritmos intercambiáveis (ex: provedores de pagamento) | Strategy para lógica simples | Over-engineering; if/else resolve casos simples |
| Observer | Sistema de eventos, webhooks | Observer para fluxo síncrono principal | Assincronicidade oculta dificulta debugging |
| Decorator | Metadata, validações, guards | Decorators aninhados > 3 níveis | Legibilidade comprometida; difícil rastrear execução |
| Adapter | Integrações externas | Adapter para módulos internos | Acoplamento desnecessário; modules já fornecem interface clara |
| Facade | Subsystems complexos | Facade que esconde complexidade crítica | Transparência importante para debugging e otimização |
| Proxy | Lazy loading, caching | Proxy para toda camada de serviço | Performance overhead; complexidade de implementação |

**Regra Geral:** Preferir padrões GoF clássicos apenas quando resolverem problema concreto identificado. Evitar "pattern-driven development" (criar problema para usar padrão).

---

### 10.3 Regras de Modularização

#### Acoplamento Máximo Permitido

| Tipo de Módulo | Dependências Máximas | Justificativa |
|----------------|---------------------|---------------|
| Controller | ≤ 3 services | Controllers devem ser finos; orquestrar, não implementar lógica |
| Service | ≤ 5 dependencies (services, repos, utils) | Coesão alta; se precisar de mais, dividir service |
| Repository | 1 (apenas DB/ORM) | Repositórios acessam apenas persistência |
| Utility | 0 dependencies externas | Utils devem ser puras, sem efeitos colaterais |
| Module (NestJS) | ≤ 4 imports de outros modules | Módulos devem ser coesos; muitos imports indicam baixa coesão |

#### Regras de Dependência (Quem Pode Importar Quem)

```
┌─────────────────────────────────────────────────────┐
│                    Controllers                       │
│         (podem importar: Services, DTOs, Guards)     │
└───────────────────┬─────────────────────────────────┘
                    ▼
┌─────────────────────────────────────────────────────┐
│                      Services                        │
│    (podem importar: Repositories, Utils, Events)     │
└───────────────────┬─────────────────────────────────┘
                    ▼
┌─────────────────────────────────────────────────────┐
│                    Repositories                      │
│            (podem importar: Entities, ORM)           │
└───────────────────┬─────────────────────────────────┘
                    ▼
┌─────────────────────────────────────────────────────┐
│                     Entities                         │
│                (sem dependências)                    │
└─────────────────────────────────────────────────────┘

Regras Adicionais:
- Utils podem ser importados por qualquer camada
- DTOs podem ser importados por Controllers e Services
- Events podem ser publicados por Services e consumidos assincronamente
- Guards/Interceptors/Filters são transversais (cross-cutting)
- Modules não podem ter dependências circulares
```

**Verificação Automatizada:**
```bash
# Script para detectar violações de arquitetura
npm run lint:architecture

# Exemplo de saída esperada:
# ✅ No circular dependencies detected
# ✅ All controllers have ≤ 3 service dependencies
# ⚠️  Warning: AuthService has 6 dependencies (max recommended: 5)
# ✅ No direct controller-to-repository imports
```

---

### 10.4 Observabilidade

#### Estratégia de Logging

| Nível | Quando Usar | Exemplo | Destino |
|-------|-------------|---------|---------|
| ERROR | Erros que impedem operação; requer ação | "Database connection failed after 3 retries" | Elasticsearch + Alert (PagerDuty) |
| WARN | Comportamento inesperado mas recuperável | "External API returned 503; using cached response" | Elasticsearch + Dashboard |
| INFO | Eventos de negócio importantes | "User xyz logged in successfully" | Elasticsearch (retention: 30 dias) |
| DEBUG | Informações para debugging | "Query executed in 45ms: SELECT ..." | Elasticsearch (retention: 7 dias, sample 10%) |
| TRACE | Detalhamento extremo de execução | "Entering function authenticateUser with params: {...}" | Local dev apenas |

**Formato de Log Estruturado (JSON):**
```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "INFO",
  "service": "auth-service",
  "traceId": "abc123def456",
  "spanId": "span789",
  "userId": "user-xyz",
  "action": "login_success",
  "message": "User authenticated successfully",
  "metadata": {
    "method": "POST",
    "path": "/auth/login",
    "statusCode": 200,
    "durationMs": 45,
    "ip": "192.168.1.100"
  }
}
```

**Regras de Logging:**
- Todo log deve incluir `traceId` para correlation
- Dados sensíveis (senhas, tokens, PII) nunca devem ser logados
- Em produção, log level mínimo: INFO
- Em staging/dev, log level: DEBUG
- Logs assíncronos para não impactar performance

#### Estratégia de Auditoria

| Evento | O que Registrar | Retenção | Quem Acessa |
|--------|-----------------|----------|-------------|
| Login/Logout | userId, timestamp, IP, userAgent, resultado | 1 ano | Security team |
| Criação de recurso | userId, resourceId, tipo, payload (sem PII) | 2 anos | Admin, Compliance |
| Alteração de recurso | userId, resourceId, campos alterados (before/after) | 2 anos | Admin, Compliance |
| Deleção de recurso | userId, resourceId, timestamp, motivo (se fornecido) | 5 anos | Admin, Legal |
| Acesso a dado sensível | userId, resourceId, timestamp, justificativa | 3 anos | Privacy Officer |
| Mudança de permissão | userId, alvoId, permissões alteradas, autor | 5 anos | Security, Compliance |

**Formato de Log de Auditoria:**
```json
{
  "auditId": "aud-20240115-xyz789",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "eventType": "resource_updated",
  "actor": {
    "userId": "user-123",
    "email": "admin@empresa.com",
    "role": "ADMIN"
  },
  "target": {
    "type": "User",
    "id": "user-456",
    "changes": [
      {
        "field": "role",
        "previousValue": "USER",
        "newValue": "MODERATOR"
      }
    ]
  },
  "context": {
    "ip": "192.168.1.100",
    "userAgent": "Mozilla/5.0...",
    "requestId": "req-abc123"
  },
  "integrityHash": "sha256:abc123..."
}
```

#### Monitoramento e Alertas

**Métricas Coletadas (Prometheus):**

```yaml
# Métricas customizadas
http_request_duration_seconds:
  type: histogram
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
  labels: [method, path, statusCode]

http_requests_total:
  type: counter
  labels: [method, path, statusCode]

database_query_duration_seconds:
  type: histogram
  labels: [query_type, table]

cache_hits_total:
  type: counter
  labels: [cache_name]

active_users:
  type: gauge
  labels: [status]

external_api_latency_seconds:
  type: histogram
  labels: [provider, endpoint]
```

**Alertas Configurados:**

| Alerta | Condição | Severidade | Ação |
|--------|----------|------------|------|
| HighErrorRate | error_rate > 1% por 5min | Critical | PagerDuty + Slack |
| HighLatency | p95_latency > 500ms por 10min | Warning | Slack |
| DatabaseDown | db_connection_failed | Critical | PagerDuty + auto-failover |
| DiskSpaceLow | disk_usage > 85% | Warning | Slack |
| MemoryHigh | memory_usage > 90% por 5min | Warning | Slack + auto-scale |
| ExternalAPIDown | external_api_error_rate > 10% | Warning | Slack |
| CertificateExpiring | ssl_cert_days_remaining < 14 | Warning | Email + Slack |
| BackupFailed | last_backup_age > 24h | Critical | PagerDuty |

---

### 10.5 Escopo Congelado

#### Lista de Alterações Proibidas (Sem ADR)

| Categoria | Alteração | Razão | Processo para Mudança |
|-----------|-----------|-------|----------------------|
| **Banco de Dados** | Trocar PostgreSQL por outro DB | Migração complexa; impacta todas as queries | ADR + migration plan + downtime window |
| **Autenticação** | Mudar estratégia de JWT para sessions stateful | Impacta escalabilidade horizontal | ADR + performance testing |
| **Comunicação** | Trocar REST por GraphQL como API primária | Quebra clientes existentes; curva de aprendizado | ADR + versionamento de API |
| **Linguagem** | Reescrever módulo crítico em outra linguagem | Complexidade de build; knowledge fragmentation | ADR + benchmark + team training plan |
| **Infraestrutura** | Migrar de Docker/K8s para serverless | Impacta observabilidade; vendor lock-in | ADR + cost analysis + PoC |
| **Cache** | Remover Redis e usar apenas DB cache | Impacta performance drasticamente | ADR + load test comparativo |
| **Message Broker** | Trocar RabbitMQ por Kafka (ou vice-versa) | Impacta todo fluxo de eventos | ADR + migration strategy |

#### Arquivos Protegidos (Não Modificar Sem ADR + Approval de 2 Tech Leads)

| Arquivo | Razão da Proteção | Processo de Mudança |
|---------|-------------------|---------------------|
| `src/auth/auth.service.ts` | Core de segurança; impacto em todos os usuários | ADR + security review + penetration test |
| `prisma/schema.prisma` | Schema do banco; migrations complexas | ADR + DBA review + migration script testado |
| `docker/docker-compose.yml` | Infraestrutura base; afeta todos os ambientes | ADR + DevOps review + staging deployment test |
| `.github/workflows/ci.yml` | Pipeline de CI; impacta todo o time | ADR + team consensus + parallel run |
| `src/config/env.validation.ts` | Validação de environment; crítico para deploy | ADR + rollback plan |
| `src/middleware/security.middleware.ts` | Segurança transversal | ADR + security audit |

**Verificação Automatizada:**
```bash
# Pre-commit hook para arquivos protegidos
if modified_file in PROTECTED_FILES:
    require_adr_number_in_commit_message()
    require_two_tech_lead_approvals()
    block_merge_if_checks_not_met()
```

---

## 📖 PARTE 11 — GUIA DE REPLICAÇÃO

**Objetivo:** Qualquer engenheiro pleno deve conseguir rodar o sistema do zero em < 2 horas seguindo este guia.

---

### 11.1 Pré-Requisitos Completos

| Ferramenta | Versão Mínima | Como Instalar | Verificação |
|------------|---------------|---------------|-------------|
| Node.js | 18.x (LTS) | `nvm install 18 && nvm use 18` | `node --version` → `v18.x.x` |
| npm | 9.x | Instalado com Node.js | `npm --version` → `9.x.x` |
| Docker | 20.x | [docker.com/get-started](https://docker.com) | `docker --version` → `Docker version 20.x` |
| Docker Compose | 2.x | Instalado com Docker Desktop | `docker-compose --version` → `v2.x.x` |
| Git | 2.x | `apt install git` ou [git-scm.com](https://git-scm.com) | `git --version` → `git version 2.x` |
| PostgreSQL (local, opcional) | 14.x | `docker run postgres:14` ou native | `psql --version` → `14.x` |
| Make (opcional) | 4.x | `apt install make` | `make --version` → `GNU Make 4.x` |

**Ferramentas Recomendadas (não obrigatórias):**
- Postman ou Insomnia (testar APIs)
- VS Code com extensões: ESLint, Prettier, Prisma, Docker
- k6 (load testing): `brew install k6` ou [k6.io](https://k6.io)

---

### 11.2 Clone do Repositório

```bash
# Navegar até diretório de trabalho
cd ~/projects

# Clonar repositório (URL placeholder)
git clone git@github.com:empresa/projeto-nexus.git

# Entrar no diretório
cd projeto-nexus

# Instalar dependências de versão correta (usando nvm)
nvm use  # Usa versão do .nvmrc se existir
```

---

### 11.3 Inicialização de Infraestrutura

```bash
# Opção A: Usando Docker Compose (recomendado)
docker-compose up -d

# Isso sobe:
# - PostgreSQL (porta 5432)
# - Redis (porta 6379)
# - (Opcional) RabbitMQ (porta 5672)
# - (Opcional) Prometheus + Grafana (portas 9090, 3001)

# Verificar status
docker-compose ps

# Ver logs
docker-compose logs -f

# Parar infraestrutura
docker-compose down
```

```bash
# Opção B: Serviços gerenciados externos
# Editar .env com credenciais de serviços cloud
# Ex: AWS RDS, Redis Cloud, etc.
```

---

### 11.4 Instalação de Dependências

```bash
# Instalar dependências do projeto
npm ci  # Usa package-lock.json para instalação exata

# Ou, se não houver lock file:
npm install

# Verificar instalação
ls node_modules | wc -l  # Deve listar centenas de pacotes
```

---

### 11.5 Configuração de Variáveis de Ambiente

```bash
# Copiar template de exemplo
cp .env.example .env

# Editar .env com valores apropriados
# Use um editor de texto (VS Code, vim, nano)

# Valores padrão para desenvolvimento local:
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nexus?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="dev-secret-change-in-production-min-32-chars"
JWT_EXPIRY="3600"
NODE_ENV="development"
PORT="3000"

# Para produção, substituir por valores seguros:
# - JWT_SECRET: gerar com `openssl rand -base64 32`
# - DATABASE_URL: usar conexão SSL com credentials fortes
# - Adicionar variáveis de integração (Stripe, SendGrid, etc.)
```

**Validação de Environment:**
```bash
# Rodar script de validação
npm run validate:env

# Saída esperada:
# ✅ All required environment variables are set
# ✅ DATABASE_URL is valid PostgreSQL connection string
# ✅ JWT_SECRET meets minimum length requirement (32 chars)
# ✅ PORT is available
```

---

### 11.6 Build do Projeto

```bash
# Compilar TypeScript para JavaScript
npm run build

# Output esperado:
# > projeto-nexus@0.1.0 build
# > nest build
#
# Successfully compiled TypeScript files into 'dist/' directory

# Verificar output
ls dist/
# main.js, app.module.js, auth/, users/, etc.
```

---

### 11.7 Execução da Aplicação

```bash
# Modo desenvolvimento (watch mode, recarrega automaticamente)
npm run start:dev

# Modo produção (usa build compilado)
npm run start:prod

# Verificar aplicação rodando
curl http://localhost:3000/health

# Resposta esperada:
# {"status":"ok","timestamp":"2024-01-15T10:30:45.123Z","uptime":12345}
```

---

### 11.8 Execução de Testes

```bash
# Testes unitários
npm run test:unit

# Testes de integração (requer infraestrutura rodando)
npm run test:integration

# Testes end-to-end
npm run test:e2e

# Cobertura de testes
npm run test:coverage

# Abrir relatório de cobertura
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
start coverage/index.html  # Windows
```

**Validação Manual da Funcionalidade Principal:**

```bash
# 1. Criar usuário via API
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@exemplo.com",
    "senha": "Senha123!",
    "nome": "Usuário Teste"
  }'

# Resposta esperada (HTTP 201):
# {
#   "id": "usr-abc123",
#   "email": "teste@exemplo.com",
#   "nome": "Usuário Teste",
#   "createdAt": "2024-01-15T10:30:45.123Z"
# }

# 2. Autenticar com usuário criado
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@exemplo.com",
    "senha": "Senha123!"
  }'

# Resposta esperada (HTTP 200):
# {
#   "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...",
#   "expiresIn": 3600,
#   "tokenType": "Bearer"
# }

# 3. Acessar rota protegida
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  # Copiar do passo anterior

curl -X GET http://localhost:3000/users/me \
  -H "Authorization: Bearer $TOKEN"

# Resposta esperada (HTTP 200):
# {
#   "id": "usr-abc123",
#   "email": "teste@exemplo.com",
#   "nome": "Usuário Teste",
#   "role": "USER"
# }
```

---

### 11.9 Acesso à Interface e APIs

| Serviço | URL Local | Credenciais Padrão | Notas |
|---------|-----------|-------------------|-------|
| API REST | `http://localhost:3000` | Nenhuma (pública para health, auth para resto) | Swagger em `/api` |
| Swagger UI | `http://localhost:3000/api` | Nenhuma | Documentação interativa da API |
| Grafana | `http://localhost:3001` | admin / admin | Dashboards de métricas |
| Prometheus | `http://localhost:9090` | Nenhuma | Queries e alertas |
| pgAdmin (se incluído) | `http://localhost:5050` | admin@example.com / admin | Gestão de banco de dados |
| Redis Insight (se incluído) | `http://localhost:8081` | Nenhuma | Visualização de cache |

**Documentação da API:**
- Swagger UI: `http://localhost:3000/api`
- OpenAPI JSON: `http://localhost:3000/api-json`

---

### 11.10 Verificação Pós-Deploy (Health Check + Smoke Test)

```bash
#!/bin/bash
# smoke-test.sh

echo "🚀 Iniciando smoke tests..."

# 1. Health check básico
echo "1. Verificando health endpoint..."
HEALTH=$(curl -s http://localhost:3000/health | jq -r '.status')
if [ "$HEALTH" != "ok" ]; then
  echo "❌ Health check failed"
  exit 1
fi
echo "✅ Health check passed"

# 2. Verificar database connection
echo "2. Verificando conexão com banco de dados..."
DB_STATUS=$(curl -s http://localhost:3000/health | jq -r '.database')
if [ "$DB_STATUS" != "connected" ]; then
  echo "❌ Database connection failed"
  exit 1
fi
echo "✅ Database connection ok"

# 3. Verificar Redis connection
echo "3. Verificando conexão com Redis..."
REDIS_STATUS=$(curl -s http://localhost:3000/health | jq -r '.redis')
if [ "$REDIS_STATUS" != "connected" ]; then
  echo "❌ Redis connection failed"
  exit 1
fi
echo "✅ Redis connection ok"

# 4. Testar autenticação
echo "4. Testando autenticação..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@exemplo.com","senha":"Admin123!"}')
ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.accessToken')
if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" == "null" ]; then
  echo "❌ Authentication failed"
  exit 1
fi
echo "✅ Authentication ok"

# 5. Testar rota protegida
echo "5. Testando rota protegida..."
PROTECTED_RESPONSE=$(curl -s -X GET http://localhost:3000/users/me \
  -H "Authorization: Bearer $ACCESS_TOKEN")
USER_ID=$(echo $PROTECTED_RESPONSE | jq -r '.id')
if [ -z "$USER_ID" ] || [ "$USER_ID" == "null" ]; then
  echo "❌ Protected route failed"
  exit 1
fi
echo "✅ Protected route ok"

echo ""
echo "🎉 Todos os smoke tests passaram!"
echo "Sistema pronto para uso."
```

**Executar Smoke Test:**
```bash
chmod +x scripts/smoke-test.sh
./scripts/smoke-test.sh
```

---

**FIM DAS PARTES 9-11**

Próximo arquivo: `NEXUS_Partes_12-14.md` — Extensibilidade, Limitações, Roadmap e Cláusula de Integridade
