# NEXUS Protocol v1.2 — Partes 12 a 14
**Extensibilidade, Limitações, Roadmap e Cláusula de Integridade**

---

## 🔌 PARTE 12 — EXTENSIBILIDADE

### 12.1 Como Adicionar um Novo Módulo/Componente (Tutorial em 5 Passos)

**Objetivo:** Seguir este tutorial para adicionar um módulo completo (ex: `NotificationsModule`) em < 30 minutos.

---

#### PASSO 1: Estrutura de Diretórios

```bash
# Criar estrutura do módulo
mkdir -p src/notifications/{dto,services,controllers,entities}

# Criar arquivos base
touch src/notifications/notifications.module.ts
touch src/notifications/notifications.controller.ts
touch src/notifications/notifications.service.ts
touch src/notifications/entities/notification.entity.ts
touch src/notifications/dto/create-notification.dto.ts
touch src/notifications/dto/send-notification.dto.ts
```

**Estrutura resultante:**
```
src/notifications/
├── notifications.module.ts
├── notifications.controller.ts
├── notifications.service.ts
├── entities/
│   └── notification.entity.ts
└── dto/
    ├── create-notification.dto.ts
    └── send-notification.dto.ts
```

---

#### PASSO 2: Implementar Entity (Modelo de Dados)

```typescript
// src/notifications/entities/notification.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  title: string;

  @Column('text')
  message: string;

  @Column({ default: false })
  read: boolean;

  @Column({ nullable: true })
  actionUrl?: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

**Validação:**
```bash
npm run typecheck  # Deve compilar sem erros
```

---

#### PASSO 3: Implementar DTOs (Data Transfer Objects)

```typescript
// src/notifications/dto/create-notification.dto.ts
import { IsString, IsUUID, IsOptional, IsUrl, MaxLength } from 'class-validator';

export class CreateNotificationDto {
  @IsUUID()
  userId: string;

  @IsString()
  @MaxLength(100)
  title: string;

  @IsString()
  @MaxLength(500)
  message: string;

  @IsOptional()
  @IsUrl()
  actionUrl?: string;
}
```

```typescript
// src/notifications/dto/send-notification.dto.ts
import { IsString, IsEmail, IsOptional } from 'class-validator';

export class SendNotificationDto {
  @IsEmail()
  to: string;

  @IsString()
  subject: string;

  @IsString()
  body: string;

  @IsOptional()
  templateId?: string;
}
```

**Validação:**
```bash
npm run test:unit -- notification.dto.spec.ts  # Testes de validação
```

---

#### PASSO 4: Implementar Service (Lógica de Negócio)

```typescript
// src/notifications/notifications.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { SendNotificationDto } from './dto/send-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

  async create(data: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepository.create(data);
    return await this.notificationRepository.save(notification);
  }

  async findByUserId(userId: string, page = 1, limit = 20) {
    const [items, total] = await this.notificationRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
      },
    };
  }

  async markAsRead(notificationId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.read = true;
    return await this.notificationRepository.save(notification);
  }

  async sendEmail(data: SendNotificationDto): Promise<void> {
    // Integração com provedor de email (ex: SendGrid, AWS SES)
    // Implementar conforme Parte 4.3 - Integrações Externas
    console.log(`Sending email to ${data.to}: ${data.subject}`);
  }
}
```

**Validação:**
```bash
npm run test:unit -- notifications.service.spec.ts
```

---

#### PASSO 5: Implementar Controller e Module (API Pública)

```typescript
// src/notifications/notifications.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  async create(@Body() data: CreateNotificationDto) {
    return this.notificationsService.create(data);
  }

  @Get()
  async findAll(
    @Request() req,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.notificationsService.findByUserId(req.user.id, +page, +limit);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.notificationsService.findByUserId(id);
  }

  @Post(':id/read')
  async markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }
}
```

```typescript
// src/notifications/notifications.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Notification])],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
```

**Registro no App Module:**
```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    // ... outros módulos
    NotificationsModule,
  ],
})
export class AppModule {}
```

**Validação Final:**
```bash
# Build
npm run build

# Testes E2E
npm run test:e2e -- notifications

# Iniciar e testar manualmente
npm run start:dev

# Testar endpoint
curl -X POST http://localhost:3000/notifications \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "usr-123",
    "title": "Test Notification",
    "message": "This is a test notification"
  }'
```

---

### 12.2 Como Adicionar uma Nova Integração Externa

**Exemplo:** Adicionar integração com Twilio para SMS.

#### Passo 1: Instalar SDK Oficial

```bash
npm install twilio
npm install --save-dev @types/twilio
```

---

#### Passo 2: Criar Service de Integração

```typescript
// src/integrations/twilio/twilio.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';

@Injectable()
export class TwilioService {
  private readonly client: any;
  private readonly logger = new Logger(TwilioService.name);

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get('TWILIO_AUTH_TOKEN');
    const fromNumber = this.configService.get('TWILIO_FROM_NUMBER');

    this.client = twilio(accountSid, authToken);
    this.fromNumber = fromNumber;
  }

  async sendSms(to: string, message: string): Promise<void> {
    try {
      await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: to,
      });
      this.logger.log(`SMS sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${to}: ${error.message}`);
      throw error;
    }
  }
}
```

---

#### Passo 3: Adicionar Variáveis de Ambiente

```bash
# .env.example
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_FROM_NUMBER=+1234567890
```

```typescript
// src/config/env.validation.ts
import { plainToClass } from 'class-transformer';
import { IsString, MinLength, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsString()
  @MinLength(34)  // Twilio SIDs têm 34 caracteres
  TWILIO_ACCOUNT_SID: string;

  @IsString()
  @MinLength(32)
  TWILIO_AUTH_TOKEN: string;

  @IsString()
  TWILIO_FROM_NUMBER: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config);
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
```

---

#### Passo 4: Implementar Circuit Breaker e Retry

```typescript
// src/integrations/twilio/twilio-with-resilience.service.ts
import { Injectable, CircuitBreakerService } from './circuit-breaker.service';

@Injectable()
export class TwilioResilientService {
  constructor(
    private twilioService: TwilioService,
    private circuitBreaker: CircuitBreakerService,
  ) {}

  async sendSmsWithRetry(to: string, message: string): Promise<void> {
    return await this.circuitBreaker.execute(
      async () => await this.twilioService.sendSms(to, message),
      {
        maxRetries: 3,
        backoffMs: 1000,  // Exponential: 1s, 2s, 4s
        fallback: () => {
          // Fallback: log para fila de retry posterior
          console.warn(`SMS queued for later delivery to ${to}`);
        },
      },
    );
  }
}
```

---

#### Passo 5: Criar Testes de Integração

```typescript
// tests/integration/twilio.integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { TwilioService } from '../../src/integrations/twilio/twilio.service';
import { ConfigModule } from '@nestjs/config';

describe('Twilio Integration', () => {
  let twilioService: TwilioService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ envFilePath: '.env.test' })],
      providers: [TwilioService],
    }).compile();

    twilioService = module.get<TwilioService>(TwilioService);
  });

  it('should send SMS successfully', async () => {
    const testPhone = '+5511999999999';
    const testMessage = 'Test message from integration test';

    await expect(twilioService.sendSms(testPhone, testMessage)).resolves.not.toThrow();
  });

  it('should handle invalid phone number', async () => {
    const invalidPhone = 'invalid-number';
    const testMessage = 'Test message';

    await expect(twilioService.sendSms(invalidPhone, testMessage)).rejects.toThrow();
  });
});
```

---

### 12.3 Pontos de Extensão Documentados

#### Plugins

**Como Funciona:** Sistema de plugins permite adicionar funcionalidades sem modificar código core.

**Exemplo de Interface de Plugin:**
```typescript
// src/plugins/plugin.interface.ts
export interface Plugin {
  name: string;
  version: string;
  initialize(app: any): Promise<void>;
  shutdown?(): Promise<void>;
}

// src/plugins/plugin-manager.service.ts
@Injectable()
export class PluginManagerService {
  private plugins: Map<string, Plugin> = new Map();

  async register(plugin: Plugin): Promise<void> {
    await plugin.initialize(this.app);
    this.plugins.set(plugin.name, plugin);
    this.logger.log(`Plugin ${plugin.name} v${plugin.version} registered`);
  }

  async unregister(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (plugin?.shutdown) {
      await plugin.shutdown();
    }
    this.plugins.delete(pluginName);
  }
}
```

---

#### Hooks

**Tipos de Hooks Disponíveis:**

| Hook | Quando é Disparado | Payload | Exemplo de Uso |
|------|-------------------|---------|----------------|
| `beforeUserCreate` | Antes de criar usuário | `{ userData: Create_userDto }` | Validar dados extras, enriquecer payload |
| `afterUserCreate` | Após criar usuário | `{ user: UserEntity }` | Enviar email de boas-vindas |
| `beforeLogin` | Antes de autenticar | `{ email: string, ip: string }` | Verificar blacklist, rate limiting |
| `afterLogin` | Após login bem-sucedido | `{ user: User, token: string }` | Log de auditoria, analytics |
| `beforeResourceDelete` | Antes de deletar recurso | `{ resourceId: string, userId: string }` | Verificar dependências, backup |
| `afterResourceDelete` | Após deletar recurso | `{ resourceId: string }` | Limpar cache relacionado |

**Como Registrar Hook:**
```typescript
// src/hooks/example.hook.ts
import { HooksService } from './hooks.service';

@Injectable()
export class ExampleHook implements OnModuleInit {
  constructor(private hooksService: HooksService) {}

  async onModuleInit() {
    this.hooksService.register('afterUserCreate', async (payload) => {
      console.log(`New user created: ${payload.user.email}`);
      // Enviar email, notificar Slack, etc.
    });
  }
}
```

---

#### Middlewares

**Middleware Global:**
```typescript
// src/middleware/example.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class ExampleMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  }
}
```

**Middleware por Rota:**
```typescript
// No controller
@UseMiddlewares(ExampleMiddleware)
@Get('special-route')
async specialRoute() {
  // ...
}
```

---

#### Configurações Dinâmicas

**Feature Flags:**
```typescript
// src/config/feature-flags.service.ts
@Injectable()
export class FeatureFlagsService {
  private flags: Map<string, boolean> = new Map();

  async isEnabled(flagName: string, userId?: string): Promise<boolean> {
    // Verificar flag global
    if (this.flags.has(flagName)) {
      return this.flags.get(flagName);
    }

    // Verificar flag específica por usuário (A/B testing)
    if (userId) {
      return this.isUserInExperiment(userId, flagName);
    }

    return false;
  }

  async setFlag(flagName: string, enabled: boolean): Promise<void> {
    this.flags.set(flagName, enabled);
    this.logger.log(`Feature flag ${flagName} set to ${enabled}`);
  }
}

// Uso no código
if (await this.featureFlags.isEnabled('new_checkout_flow')) {
  // Usar novo fluxo
} else {
  // Usar fluxo antigo
}
```

---

## ⚠️ PARTE 13 — LIMITAÇÕES CONHECIDAS

### 13.1 Bugs Conhecidos

| ID | Bug | Severidade | Workaround | Status | Issue Link |
|----|-----|------------|------------|--------|------------|
| BUG-001 | Refresh token não invalida sessões ativas quando usuário muda senha | Média | Forçar logout manual de todas as sessões via admin panel | Em correção | #234 |
| BUG-002 | Paginação retorna itens duplicados quando ordenação inclui campo não-único | Baixa | Adicionar campo `id` como critério de desempate na ordenação | Planejado | #189 |
| BUG-003 | Logs de auditoria não incluem IP em requests via WebSocket | Baixa | Usar header customizado `X-Forwarded-For` como fallback | Acknowledged | #156 |
| BUG-004 | Race condition em criação simultânea de recursos com unique constraint | Alta | Implementar lock distribuído (Redis) para operações críticas | Em investigação | #278 |

---

### 13.2 Limites Técnicos do Sistema

| Limite | Valor | O que Acontece se Excedido | Como Contornar |
|--------|-------|---------------------------|----------------|
| **Máximo de usuários simultâneos** | 10.000 conexões ativas | Novas conexões são rejeitadas com HTTP 503 | Scale horizontal (mais instâncias) |
| **Tamanho máximo de upload** | 10 MB por arquivo | Upload falha com HTTP 413 | Usar upload chunked ou serviço externo (S3) |
| **Taxa máxima de API requests** | 100 req/s por usuário | Requests excedentes recebem HTTP 429 | Implementar fila de retry; upgrade de plano |
| **Tempo máximo de query** | 30 segundos | Query é cancelada com timeout error | Otimizar query; adicionar índices; usar cache |
| **Número máximo de eventos em fila** | 100.000 eventos pendentes | Novos eventos são descartados | Scale consumers; aumentar throughput |
| **Tamanho máximo de payload JSON** | 1 MB | Request rejeitado com HTTP 400 | Usar upload binário; compressão gzip |
| **Número máximo de filtros em query** | 20 filtros combinados | Query falha com erro de complexidade | Simplificar query; usar busca full-text |
| **Retenção de logs em produção** | 30 dias | Logs antigos são deletados automaticamente | Exportar para storage de longo prazo (S3 Glacier) |

---

### 13.3 Dependências Obsoletas ou com Vulnerabilidades Conhecidas

| Dependência | Versão Atual | Última Versão | Vulnerabilidade | Mitigação | Plano de Upgrade |
|-------------|--------------|---------------|-----------------|-----------|------------------|
| `jsonwebtoken` | 8.5.1 | 9.0.2 | CVE-2022-23529 (High) | Validar algoritmo explicitamente | Q2 2024 (breaking changes) |
| `axios` | 0.27.2 | 1.6.2 | CVE-2023-45857 (Medium) | Validar headers de resposta | Q1 2024 |
| `class-validator` | 0.13.2 | 0.14.0 | Nenhuma crítica | Manter versão atual | Monitorar updates |
| `typeorm` | 0.3.17 | 0.3.19 | Nenhuma crítica | Manter versão atual | Q1 2024 (minor update) |

**Processo de Atualização:**
1. Rodar `npm audit` semanalmente
2. Testar atualização em branch isolada
3. Rodar suite completa de testes
4. Deploy em staging por 48h
5. Monitorar métricas de erro
6. Promover para produção se estável

---

### 13.4 Race Conditions Identificadas

| Cenário | Descrição | Probabilidade | Impacto | Mitigação Atual | Mitigação Planejada |
|---------|-----------|---------------|---------|-----------------|---------------------|
| Criação simultânea de usuário com mesmo email | Dois requests criam usuário com email idêntico antes da validação de unique constraint | Baixa (janela de ~10ms) | Dados inconsistentes; erro de database | Unique constraint no banco retorna erro; cliente deve retentar | Lock distribuído por email durante criação |
| Atualização concorrente de saldo | Duas transações modificam saldo do usuário simultaneamente | Média (em picos de uso) | Saldo incorreto; perda de transação | Transação database com row-level locking | Implementar optimistic locking com version field |
| Deleção em cascata com triggers | Múltiplas deleções disparam triggers concorrentemente | Baixa | Deadlocks ocasionais | Timeout de deadlock; retry automático | Refatorar triggers para processamento assíncrono |

---

### 13.5 Memory Leaks Potenciais

| Fonte | Sintoma | Como Detectar | Mitigação |
|-------|---------|---------------|-----------|
| Event listeners não removidos | Memória cresce continuamente; GC não libera | Heap snapshots no Chrome DevTools; `process.memoryUsage()` | Usar `EventEmitter.once()` quando apropriado; remover listeners no `OnModuleDestroy` |
| Cache sem TTL ou maxSize | Redis/memory usage cresce indefinidamente | Monitoring de memória Redis; alertas de uso > 80% | Sempre configurar TTL e maxSize; política LRU |
| Queries sem paginação | Consumo de memória proporcional ao tamanho da tabela | Slow query log; memory profiling | Sempre usar paginação; streaming para grandes datasets |
| Logs acumulando em buffer | Buffer de log não é flushado; memory spike | Monitoring de heap size | Flush periódico; buffer circular com tamanho máximo |

---

### 13.6 Problemas de Concorrência

| Problema | Quando Ocorre | Sintoma | Solução |
|----------|---------------|---------|---------|
| Deadlock em transações longas | Múltiplas transações acessam mesmas tabelas em ordem diferente | Query timeout; erro de deadlock no DB | Acessar tabelas sempre na mesma ordem; dividir transações longas |
| Starvation de queries analíticas | Queries OLTP prioritárias monopolizam conexões | Queries analíticas nunca completam | Usar read replicas para analytics; connection pooling separado |
| Thundering herd no cache expirado | Múltiplas requests tentam repopular cache simultaneamente | Spike de latência; overload no DB | Usar lock de cache (redlock); stale-while-revalidate |

---

## 🗺️ PARTE 14 — ROADMAP INFERIDO

Baseado nas limitações atuais e na arquitetura, sugerir próximas versões:

### Roadmap de Versões

| Versão | Codinome | Foco Principal | Features Principais | Estimativa | Dependencies |
|--------|----------|----------------|---------------------|------------|--------------|
| **v1.0** | Foundation | MVP estável | Autenticação, CRUD básico, integrações essenciais | Q1 2024 | Nenhuma |
| **v1.1** | Resilience | Confiabilidade e observabilidade | Circuit breakers, retry automático, dashboards avançados, alertas | Q2 2024 | v1.0 |
| **v1.2** | Scale | Escalabilidade horizontal | Read replicas, cache distribuído, auto-scaling, sharding prep | Q3 2024 | v1.1 |
| **v2.0** | Platform | Multi-tenancy e extensibilidade | Sistema de plugins, webhooks, API pública, marketplace | Q4 2024 | v1.2 |
| **v2.1** | Intelligence | IA e automação | Insights preditivos, automação de workflows, chatbot | Q1 2025 | v2.0 |
| **v2.2** | Compliance | Segurança e conformidade | Audit logs avançados, DLP, GDPR tools, SOC2 prep | Q2 2025 | v2.0 |
| **v3.0** | Ecosystem | Integrações nativas | connectors prontos (Salesforce, SAP, etc.), iPaaS | H2 2025 | v2.1 |

---

### Detalhamento por Versão

#### v1.1 — Resilience (Q2 2024)

**Épico: Tolerância a Falhas**
- [ ] Circuit breaker em todas as integrações externas
- [ ] Retry com exponential backoff e jitter
- [ ] Fallback graceful para funcionalidades não-críticas
- [ ] Health checks granulares por dependência

**Épico: Observabilidade Avançada**
- [ ] Distributed tracing (OpenTelemetry)
- [ ] Dashboards de business metrics (não apenas técnicas)
- [ ] Alertas preditivos baseados em anomalias
- [ ] Runbooks automatizados para incidentes comuns

**Épico: Disaster Recovery**
- [ ] Backup automatizado com point-in-time recovery
- [ ] Failover automático entre zonas de disponibilidade
- [ ] DR drill trimestral documentado
- [ ] RTO < 1 hora, RPO < 5 minutos

---

#### v1.2 — Scale (Q3 2024)

**Épico: Escalabilidade de Leitura**
- [ ] Read replicas com balanceamento automático
- [ ] Cache de segundo nível (Redis Cluster)
- [ ] CDN para assets estáticos
- [ ] Query optimization automatizada (índices sugeridos)

**Épico: Escalabilidade de Escrita**
- [ ] Sharding horizontal por tenant/geografia
- [ ] Write batching para operações em lote
- [ ] Filas assíncronas para operações não-críticas
- [ ] Rate limiting adaptativo baseado em carga

**Épico: Auto-Scaling**
- [ ] HPA baseado em métricas customizadas (não apenas CPU)
- [ ] Scale-to-zero para ambientes de dev/staging
- [ ] Predictive scaling baseado em padrões históricos
- [ ] Cost optimization com spot instances

---

#### v2.0 — Platform (Q4 2024)

**Épico: Multi-Tenancy**
- [ ] Isolamento de dados por tenant (schema-per-tenant ou row-level security)
- [ ] Customização por tenant (temas, configurações, fluxos)
- [ ] Billing e quota management por tenant
- [ ] Admin portal para gestão de tenants

**Épico: Sistema de Plugins**
- [ ] SDK para desenvolvedores de plugins
- [ ] Marketplace de plugins (oficiais e community)
- [ ] Sandbox de execução para plugins de terceiros
- [ ] Versionamento e compatibilidade de plugins

**Épico: API Pública**
- [ ] Developer portal com documentação interativa
- [ ] API keys e OAuth para aplicações de terceiros
- [ ] Webhooks configuráveis para eventos
- [ ] Rate limiting e quotas por aplicação

---

#### v2.1 — Intelligence (Q1 2025)

**Épico: IA Preditiva**
- [ ] Modelos de ML para prever churn de usuários
- [ ] Recomendações personalizadas baseadas em comportamento
- [ ] Detecção de anomalias em tempo real
- [ ] Forecast de demanda para capacity planning

**Épico: Automação de Workflows**
- [ ] Visual workflow builder (drag-and-drop)
- [ ] Templates de automação pré-configurados
- [ ] Integração com RPA para processos legados
- [ ] Approval workflows com múltiplos níveis

**Épico: Assistente Virtual**
- [ ] Chatbot para suporte nível 1
- [ ] Busca semântica em documentação
- [ ] Geração automática de relatórios em linguagem natural
- [ ] Voice commands para ações comuns

---

#### v2.2 — Compliance (Q2 2025)

**Épico: Privacidade de Dados**
- [ ] Data mapping automatizado (LGPD/GDPR)
- [ ] Consent management platform integrada
- [ ] Right to be forgotten automatizado
- [ ] Data portability (export em formatos padrão)

**Épico: Segurança Avançada**
- [ ] DLP (Data Loss Prevention) para dados sensíveis
- [ ] UEBA (User Entity Behavior Analytics) para detecção de ameaças internas
- [ ] SIEM integration para correlation de logs
- [ ] Zero-trust network architecture

**Épico: Certificações**
- [ ] SOC2 Type II audit
- [ ] ISO 27001 certification
- [ ] HIPAA compliance (se aplicável)
- [ ] PCI-DSS compliance (se processar pagamentos)

---

#### v3.0 — Ecosystem (H2 2025)

**Épico: Connectors Prontos**
- [ ] Salesforce bidirecional
- [ ] SAP/ERP integration
- [ ] Microsoft 365 (Teams, Outlook, SharePoint)
- [ ] Google Workspace

**Épico: iPaaS (Integration Platform as a Service)**
- [ ] Visual integration builder
- [ ] Pre-built templates para integrações comuns
- [ ] Monitoring e alertas para integrações
- [ ] Transformation e mapping de dados

**Épico: Partner Ecosystem**
- [ ] Partner portal para desenvolvedores
- [ ] Revenue sharing para plugins premium
- [ ] Certification program para partners
- [ ] Co-marketing opportunities

---

### Critérios de Progressão entre Versões

| Condição | Ação |
|----------|------|
| Todas features da versão atual entregues e estáveis | Iniciar próxima versão |
| ≥ 2 features críticas bloqueadas por limitação técnica | Reavaliar roadmap; possível hotfix release |
| Feedback de usuários indica necessidade não-atendida | Considerar ajuste de prioridades; ADR para mudança de escopo |
| Mudança significativa no mercado/concorrência | Emergency roadmap review; possível pivot de features |

---

### Métricas de Sucesso do Roadmap

| Métrica | Target por Versão | Como Medir |
|---------|-------------------|------------|
| **Feature Completion Rate** | ≥ 90% das features planejadas entregues | (Features entregues / Features planejadas) × 100 |
| **Time to Market** | ≤ 1 semana de atraso por versão | Data prevista vs data real de release |
| **Adoption Rate** | ≥ 60% dos usuários ativos usando novas features em 30 dias | Analytics de uso de features |
| **Customer Satisfaction** | CSAT ≥ 4.5/5 após cada release major | Survey pós-release |
| **Technical Debt Ratio** | ≤ 5% do esforço dedicado a debt por sprint | Tempo em refactoring / tempo total |

---

## ✅ CLÁUSULA DE INTEGRIDADE

### Checklist de Completude

Marcar cada item após verificação manual:

- [ ] Todo requisito tem ID único (`RF-XX` ou `RNF-XX`) e critério de aceite verificável programaticamente
- [ ] Todo requisito tem teste correspondente na matriz de rastreabilidade (Parte 6.3)
- [ ] Toda decisão arquitetural tem ADR com pelo menos 2 alternativas rejeitadas documentadas com motivo técnico
- [ ] Todo componente tem ficha técnica completa (Parte 2) com: ID, classe base, dependências, modo de operação, permissões
- [ ] Todo componente tem inputs detalhados, outputs com exemplo JSON concreto, e system prompt (se aplicável)
- [ ] Todo diagrama está em Mermaid renderizável (sequenceDiagram, stateDiagram-v2, flowchart, erDiagram)
- [ ] Todo schema de mensagem tem JSON Schema completo com validações e exemplo preenchido com valores realistas
- [ ] Todo cenário de falha tem estratégia de recuperação documentada (Parte 5) com detector, pattern e fluxo numerado
- [ ] O guia de replicação (Parte 11) é autocontido: não requer acesso ao código original ou conhecimento prévio do projeto
- [ ] Nenhuma seção contém "A DEFINIR", "TBD", generalidades não-verificáveis ou placeholders genéricos
- [ ] Todas as variáveis de ambiente estão listadas em `.env.example` com descrição e valor de exemplo
- [ ] Todos os endpoints de API têm método, path, auth requirement, request/response schema documentados
- [ ] Todos os riscos técnicos (Parte 9.5) têm mitigação e plano de contingência
- [ ] Todas as limitações conhecidas (Parte 13) estão documentadas com workaround quando disponível

---

### Declaração de Determinismo

> **Este documento foi estruturado para eliminar ambiguidade operacional.**
>
> Se qualquer seção permitir múltiplas interpretações, ela **deve** ser expandida até que reste apenas uma forma implementável.
>
> **Princípios Fundamentais:**
>
> 1. **Toda decisão é rastreável:** Cada escolha tecnológica, cada padrão adotado, cada trade-off aceito está documentado em ADR com contexto, alternativas e consequências.
>
> 2. **Toda decisão é testável:** Não existe requisito sem critério de aceite binário (passou/não passou). Não existe critério sem teste automatizado correspondente.
>
> 3. **Toda decisão é verificável:** Um auditor independente pode pegar qualquer afirmação neste documento e verificar sua implementação no código em < 30 segundos.
>
> 4. **O documento é auto-suficiente:** Um engenheiro pleno que nunca viu o projeto pode implementar qualquer feature descrita usando APENAS este documento, sem consultar código existente ou fazer perguntas à equipe original.
>
> 5. **O documento é auditável:** Toda mudança futura deve declarar impacto nos requisitos existentes, nos testes, na arquitetura e no roadmap. Nenhuma mudança é silenciosa.
>
> 6. **O documento é imune a interpretações criativas:** Comportamentos não explicitamente autorizados são considerados proibidos. Generalidades como "robusto", "escalável", "performático" são substituídas por métricas quantificáveis.
>
> ---
>
> **Se este documento falhar em qualquer um dos critérios acima, ele deve ser considerado INVÁLIDO e retificado antes de qualquer implementação prosseguir.**
>
> **Versão deste documento:** 1.2  
> **Data de emissão:** 2024-01-15  
> **Próxima revisão programada:** 2024-04-15 (trimestral) ou após qualquer mudança arquitetural significativa.

---

## 📎 APÊNDICE A — MAPAMENTO PARA SISTEMA DE ARQUIVAMENTO PROGRESSIVO

Após aprovação deste documento, ele alimenta diretamente o **Sistema de Arquivamento Progressivo** (Comando 1).

| Seção do NEXUS | Destino no Arquivamento | Conteúdo Específico |
|----------------|------------------------|---------------------|
| **Partes 1-4** (Visão, Arquitetura, Fluxos, Infra) | `CURRENT_STATE.md` — Estado inicial do projeto | Visão do produto, componentes principais, contratos, infraestrutura base |
| **Parte 5** (Resiliência) | `CURRENT_STATE.md` — Seção de tratamento de erros | Classificação de erros, padrões de recuperação, mapa de falhas |
| **Parte 6** (Requisitos) | `CURRENT_STATE.md` — Requisitos vigentes | RFs e RNFs aprovados para iteração atual |
| **Parte 6.3** (Matriz de Rastreabilidade) | `CURRENT_STATE.md` — Mapeamento código-requisito | Vínculo entre requisitos e implementação |
| **Parte 7** (Árvore de Arquivos) | `CURRENT_STATE.md` — Módulos e contratos | Estrutura completa do projeto com descrições |
| **Parte 8** (ADRs) | `DECISION_LOG.md` — Decisões da Fase 0 (planejamento) | Todas as decisões arquiteturais com alternativas rejeitadas |
| **Parte 9.1** (Definição do MVP) | `BACKLOG_FUTURO.md` — Meta da Onda 1 | Scope explícito do MVP (inclui/não-inclui) |
| **Parte 9.3** (Fases de Implementação) | `BACKLOG_FUTURO.md` — Ondas e critérios de aceite | Cronograma sequencial com dependências |
| **Parte 10** (Padrões) | `CURRENT_STATE.md` — Convenções vigentes | Padrões arquiteturais, design patterns, regras de modularização |
| **Parte 11** (Replicação) | `README.md` — Guia de setup | Instruções completas de instalação e execução |
| **Parte 12** (Extensibilidade) | `CONTRIBUTING.md` — Como contribuir | Tutorial de adição de módulos e integrações |
| **Parte 13** (Limitações) | `KNOWN_ISSUES.md` — Problemas conhecidos | Bugs, limites técnicos, dependências problemáticas |
| **Parte 14** (Roadmap) | `BACKLOG_FUTURO.md` — Visão de longo prazo | Próximas versões inferidas com features principais |

---

**FIM DO DOCUMENTO NEXUS PROTOCOL v1.2**

---

**Arquivos Gerados:**
1. `/workspace/NEXUS_Protocol_v1.1.md` — Partes 1-5 completas
2. `/workspace/NEXUS_Partes_6-8.md` — Requisitos, Estrutura de Arquivos, ADRs
3. `/workspace/NEXUS_Partes_9-11.md` — Implementação, Padrões, Replicação
4. `/workspace/NEXUS_Partes_12-14.md` — Extensibilidade, Limitações, Roadmap, Cláusula de Integridade

**Total:** Documento completo de ~2500+ linhas dividido em 4 arquivos para evitar erros de limite de tokens.
