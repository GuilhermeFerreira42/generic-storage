# NEXUS Protocol v1.2 — Partes 6 a 8
**Requisitos, Estrutura de Arquivos e Decisões Arquiteturais**

---

## 📋 PARTE 6 — REQUISITOS FUNCIONAIS E NÃO-FUNCIONAIS

### 6.1 Requisitos Funcionais

**Tabela completa de RFs:**

| ID | Requisito | Descrição Detalhada | Componente Responsável | Critério de Aceite (verificável) | Prioridade (MoSCoW) | Complexidade (S/M/L) |
|----|-----------|---------------------|------------------------|----------------------------------|---------------------|----------------------|
| RF-01 | [Nome do requisito] | [O que o sistema deve fazer] | [Componente ID] | [Teste binário: "Quando X, então Y com Z resultado"] | Must/Should/Could/Wont | S/M/L |
| RF-02 | Autenticação de Usuário | Permitir que usuários se autentiquem via email/senha ou OAuth | AuthModule | "Quando credenciais válidas são enviadas para POST /auth/login, retornar HTTP 200 com JWT token no formato `eyJhbG...` expirando em 3600s" | Must | M |
| RF-03 | [Adicionar conforme projeto] | ... | ... | ... | ... | ... |

**Regras de Preenchimento:**
- Mínimo: cobrir todos os fluxos identificados na arquitetura
- Cada RF deve referenciar exatamente um componente responsável
- Critério de aceite deve ser executável como teste automatizado
- Formato do critério: `"Quando [ação], então [resultado] com [métrica verificável]"`

**Template de Expansão para RF Detalhado:**

```markdown
#### RF-XX: [Nome do Requisito]

**Descrição:**
[2-3 linhas descrevendo o comportamento esperado]

**Fluxo Principal:**
1. [passo 1]
2. [passo 2]
3. [passo 3]

**Fluxos Alternativos:**
- A1: [condição] → [comportamento alternativo]
- A2: [condição] → [comportamento alternativo]

**Pré-condições:**
- [condição 1]
- [condição 2]

**Pós-condições:**
- [estado resultante 1]
- [estado resultante 2]

**Critérios de Aceite:**
| # | Cenário | Dado | Quando | Então | Status Esperado |
|---|---------|------|--------|-------|-----------------|
| CA-01 | [nome] | [contexto] | [ação] | [resultado] | Pass/Fail |
```

---

### 6.2 Requisitos Não-Funcionais

**Tabela completa de RNFs:**

| ID | Categoria | Requisito | Métrica de Avaliação | Target | Como Medir |
|----|-----------|-----------|---------------------|--------|------------|
| RNF-01 | Performance | Tempo de resposta da API | Latência p95 em ms | < 200ms | Prometheus histogram `http_request_duration_seconds` |
| RNF-02 | Performance | Throughput máximo | Requests por segundo | ≥ 1000 req/s | Load test com k6, 1000 VUs |
| RNF-03 | Segurança | Proteção contra brute force | Máx tentativas de login falhas | 5 tentativas/hora/IP | Contador Redis `login_failures:{ip}` |
| RNF-04 | Disponibilidade | Uptime do sistema | Porcentagem de tempo online | ≥ 99.9% mensal | Uptime monitoring externo |
| RNF-05 | Escalabilidade | Auto-scaling horizontal | Tempo para adicionar nova instância | < 3 minutos | Kubernetes HPA metrics |
| RNF-06 | Observabilidade | Cobertura de logs | % de requisições com trace ID | 100% | Log correlation check |
| RNF-07 | Compatibilidade | Versões de navegador suportadas | Navegadores compatíveis | Chrome/FF/Safari últimas 2 versões | Test suite cross-browser |
| RNF-08 | Usabilidade | Tempo de aprendizado | Tempo para usuário completar primeira tarefa | < 5 minutos | User testing sessions |
| RNF-09 | Manutenibilidade | Cobertura de testes | % de código coberto por testes | ≥ 80% | `npm run test:coverage` |
| RNF-10 | Portabilidade | Containers Docker | Sistema roda em qualquer host com Docker | 100% funcional | `docker-compose up` em host limpo |

**Categorias Obrigatórias (quando aplicáveis):**
- Performance
- Segurança
- Escalabilidade
- Compatibilidade
- Usabilidade
- Observabilidade
- Manutenibilidade
- Portabilidade

**Regra:** Todo RNF deve ter métrica quantificável e método de medição documentado.

---

### 6.3 Matriz de Rastreabilidade

**Tabela obrigatória conectando requisitos à implementação:**

| RF/RNF | Componente Responsável | Arquivo(s) | Método/Função | Teste que Valida | Critério Binário de Aceite |
|--------|------------------------|------------|---------------|------------------|---------------------------|
| RF-01 | AuthModule | `src/auth/auth.service.ts` | `authenticateUser()` | `auth.service.spec.ts → should return JWT on valid credentials` | "Retornar string começando com 'eyJhbG' com length > 100" |
| RF-02 | UserService | `src/users/user.repository.ts` | `createUser()` | `user.repository.spec.ts → should persist user to database` | "Inserir row em table `users` com email único" |
| RNF-01 | APIGateway | `src/middleware/latency.middleware.ts` | `trackLatency()` | `performance.e2e.spec.ts → p95 latency under 200ms` | "p95 < 200ms em load test de 1000 req/s" |
| [RF-XX] | [Componente] | [caminho relativo] | [assinatura exata] | [arquivo de teste + nome do caso] | [condição pass/fail inequívoca] |

**Regras de Completude:**
- Nenhum requisito pode ficar sem teste correspondente
- Cada linha deve ser verificável em < 30 segundos por auditor
- Arquivos devem usar caminhos relativos à raiz do projeto
- Métodos/funções devem incluir assinatura completa com tipos

**Template de Verificação:**
```bash
# Script de auditoria de rastreabilidade
for each RF/RNF in requirements:
    assert component_exists(RF.component)
    assert file_exists(RF.file_path)
    assert method_exists(RF.file_path, RF.method)
    assert test_exists(RF.test_file, RF.test_name)
    assert criterion_is_binary(RF.acceptance_criteria)
```

---

## 📁 PARTE 7 — ÁRVORE DE ARQUIVOS E BLUEPRINT ESTRUTURAL

### 7.1 Árvore Completa de Diretórios

**Formato exigido:**

```
projeto-nexus/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                    # Pipeline de CI/CD principal
│   │   ├── cd-staging.yml            # Deploy automático para staging
│   │   └── cd-production.yml         # Deploy manual para produção
│   └── ISSUE_TEMPLATE/
│       ├── bug_report.md
│       └── feature_request.md
├── src/
│   ├── main.ts                       # Entry point da aplicação
│   ├── app.module.ts                 # Módulo raiz do NestJS
│   ├── auth/                         # Módulo de autenticação
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.guard.ts
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts
│   │   │   └── local.strategy.ts
│   │   └── dto/
│   │       ├── login.dto.ts
│   │       └── refresh-token.dto.ts
│   ├── users/                        # Módulo de usuários
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── user.entity.ts
│   │   └── dto/
│   │       ├── create-user.dto.ts
│   │       └── update-user.dto.ts
│   ├── shared/                       # Módulos compartilhados
│   │   ├── decorators/
│   │   ├── filters/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   └── utils/
│   └── config/                       # Configurações
│       ├── database.config.ts
│       ├── jwt.config.ts
│       └── env.validation.ts
├── tests/
│   ├── unit/                         # Testes unitários
│   ├── integration/                  # Testes de integração
│   └── e2e/                          # Testes end-to-end
│       ├── jest-e2e.json
│       └── setup.ts
├── prisma/                           # Schema do banco de dados
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── docker/
│   ├── Dockerfile.dev
│   ├── Dockerfile.prod
│   └── docker-compose.yml
├── docs/
│   ├── api/                          # Documentação da API
│   ├── architecture/                 # Diagramas e ADRs
│   └── guides/                       # Guias de uso
├── scripts/
│   ├── setup.sh
│   ├── migrate.sh
│   └── seed-db.sh
├── .env.example                      # Template de variáveis de ambiente
├── .gitignore
├── .eslintrc.js
├── .prettierrc
├── nest-cli.json
├── package.json
├── tsconfig.json
├── README.md
└── COMMIT_CONVENTION.md
```

**Regra:** A árvore deve incluir TODOS os arquivos do projeto, sem omitir arquivos de configuração, documentação ou scripts.

---

### 7.2 Descrição por Arquivo Crítico

**Template de documentação por arquivo:**

```markdown
#### Arquivo: `src/auth/auth.service.ts`

**Propósito:**
Implementar lógica de negócio de autenticação incluindo login, logout, refresh token e validação de sessão.

**Responsabilidades:**
- Validar credenciais do usuário
- Gerar e validar tokens JWT
- Gerenciar refresh tokens
- Invalidar sessões (logout)

**Dependências:**
- `UserService` — para buscar dados do usuário
- `JwtService` — para gerar/validar tokens
- `RedisService` — para armazenar blacklist de tokens
- `ConfigService` — para configurações de JWT

**Interfaces Públicas:**
```typescript
class AuthService {
  // Autenticar usuário e retornar tokens
  authenticate(credentials: LoginDto): Promise<AuthTokens>
  
  // Refresh de access token usando refresh token
  refreshTokens(refreshToken: string): Promise<AuthTokens>
  
  // Invalidar todos os tokens de um usuário (logout)
  invalidateUserTokens(userId: string): Promise<void>
  
  // Validar se um token está ativo
  validateToken(token: string): Promise<boolean>
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}
```

**Quem Usa Este Arquivo:**
- `AuthController` — chama métodos em response a HTTP requests
- `AuthGuard` — chama `validateToken()` para proteger rotas
- `UsersService` — chama `invalidateUserTokens()` ao resetar senha

**Quando é Modificado:**
- Mudanças em estratégia de autenticação
- Adição de novos provedores OAuth
- Alterações em claims do JWT
- Otimizações de performance em validação de tokens
```

**Regra:** Documentar todos os arquivos com mais de 50 linhas ou que exponham interfaces públicas.

---

### 7.3 Convenções de Nomenclatura

#### Arquivos

| Tipo | Convenção | Exemplo |
|------|-----------|---------|
| Controllers | `[nome].controller.ts` | `users.controller.ts` |
| Services | `[nome].service.ts` | `auth.service.ts` |
| Repositories | `[nome].repository.ts` | `user.repository.ts` |
| Entities | `[nome].entity.ts` | `user.entity.ts` |
| DTOs | `[ação]-[recurso].dto.ts` | `create-user.dto.ts` |
| Guards | `[nome].guard.ts` | `jwt-auth.guard.ts` |
| Interceptors | `[nome].interceptor.ts` | `transform.interceptor.ts` |
| Filters | `[nome].filter.ts` | `http-exception.filter.ts` |
| Utils | `[função].util.ts` ou `[nome].ts` | `date.util.ts` |
| Tests | `[arquivo-original].spec.ts` | `auth.service.spec.ts` |

#### Classes e Funções

| Elemento | Convenção | Exemplo |
|----------|-----------|---------|
| Classes | PascalCase | `AuthService`, `UserController` |
| Funções/Métodos | camelCase | `authenticateUser()`, `findByID()` |
| Variáveis | camelCase | `userProfile`, `accessToken` |
| Constantes | UPPER_SNAKE_CASE | `MAX_RETRY_ATTEMPTS`, `JWT_EXPIRY` |
| Interfaces | PascalCase com prefixo I (opcional) | `IUser`, `AuthResponse` |
| Types | PascalCase | `AuthTokens`, `UserRole` |
| Enums | PascalCase | `UserRole`, `TokenType` |

#### Branches Git

| Tipo | Convenção | Exemplo |
|------|-----------|---------|
| Feature | `feature/[ID-ticket]-[descricao]` | `feature/AUTH-01-login-oauth` |
| Bugfix | `fix/[ID-ticket]-[descricao]` | `fix/AUTH-02-token-expiry` |
| Hotfix | `hotfix/[descricao-curta]` | `hotfix/security-patch-cve` |
| Release | `release/v[major].[minor].[patch]` | `release/v1.2.0` |
| Docs | `docs/[descricao]` | `docs/update-readme-setup` |

#### Commits

**Formato:** Conventional Commits

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `docs`: Mudança em documentação
- `style`: Formatação, sem mudança de lógica
- `refactor`: Refatoração, sem mudança de comportamento
- `test`: Adição/modificação de testes
- `chore`: Tarefas de build, config, tooling

**Exemplos:**
```
feat(auth): add OAuth Google provider

- Implement Google OAuth strategy
- Add google.auth.controller endpoint
- Update user entity with provider field

Closes AUTH-01
```

```
fix(users): prevent duplicate email registration

Validate email uniqueness before creating user record.

Fixes USERS-23
```

---

## 🏛️ PARTE 8 — DECISÕES ARQUITETURAIS (ADRs)

### Template de ADR

Para cada decisão significativa, preencher:

```markdown
# ADR-XXX: [Título Descritivo da Decisão]

## Status
ACEITA / REJEITADA / PROPOSTA / SUPERSEDED BY ADR-YYY

## Data
YYYY-MM-DD

## Autores
[Nome(s)]

## Contexto
[Descrever o problema que motivou a decisão. Incluir:
- Qual situação estamos enfrentando
- Quais forças conflitantes existem
- Por que precisamos decidir agora
- Quais restrições técnicas/business aplicam]

## Decisão
[Descrever claramente o que foi escolhido. Usar linguagem imperativa:
"Vamos usar X", "Adotaremos Y", "Implementaremos Z"]

## Alternativas Rejeitadas

### Alternativa A: [Nome]
**Descrição:** [O que seria]
**Prós:**
- [pró 1]
- [pró 2]
**Contras:**
- [contra 1]
- [contra 2]
**Motivo da Rejeição:** [Por que não foi escolhida]

### Alternativa B: [Nome]
**Descrição:** [O que seria]
**Prós:**
- [pró 1]
**Contras:**
- [contra 1]
- [contra 2]
**Motivo da Rejeição:** [Por que não foi escolhida]

## Consequências

### Positivas
- [consequência positiva 1]
- [consequência positiva 2]

### Negativas
- [consequência negativa 1]
- [consequência negativa 2]

## Mitigação dos Contras
[Como vamos lidar com as consequências negativas]

## Impacto nas Outras Decisões
[Esta decisão afeta quais outras áreas do sistema?]

## Referências
- [Link para documentação, issues, discussões]
```

---

### ADRs Obrigatórios (Mínimo 6)

| ID | Tema | Status | Prioridade |
|----|------|--------|------------|
| ADR-001 | Escolha do Banco de Dados | ACEITA | P0 |
| ADR-002 | Framework Backend Principal | ACEITA | P0 |
| ADR-003 | Estratégia de Autenticação | ACEITA | P0 |
| ADR-004 | Padrão de Comunicação entre Serviços | ACEITA | P0 |
| ADR-005 | Estratégia de Cache | ACEITA | P1 |
| ADR-006 | Abordagem de Testing | ACEITA | P1 |
| ADR-007 | [Específico do projeto] | PROPOSTA | P2 |
| ADR-008 | [Específico do projeto] | PROPOSTA | P2 |

---

### Exemplo Completo: ADR-001

```markdown
# ADR-001: Escolha do Banco de Dados Relacional vs NoSQL

## Status
ACEITA

## Data
2024-01-15

## Autores
Equipe de Arquitetura

## Contexto
Precisamos selecionar um banco de dados para armazenar:
- Dados de usuários (perfil, autenticação, preferências)
- Transações financeiras (requer ACID)
- Logs de auditoria (alta volumetria, escrita sequencial)
- Sessões ativas (leitura rápida, expiração automática)

Requisitos críticos:
- Transações ACID para operações financeiras
- Consultas complexas com joins frequentes
- Escala horizontal para leitura
- Backup e recovery robustos
- Suporte a migrações versionadas

Forças conflitantes:
- Flexibilidade do schema vs consistência de dados
- Performance de escrita vs capacidade de query
- Curva de aprendizado da equipe vs tecnologia moderna

## Decisão
**Vamos usar PostgreSQL como banco de dados primário.**

Justificativa técnica:
- Suporte completo a transações ACID
- SQL padrão com extensões poderosas (window functions, CTEs)
- JSONB para dados semi-estruturados quando necessário
- Replicação nativa e ferramentas maduras de backup
- Ecossistema robusto de ORMs e ferramentas de migração

## Alternativas Rejeitadas

### Alternativa A: MongoDB
**Descrição:** Banco de dados documental NoSQL

**Prós:**
- Schema flexível, fácil evolução
- Alta performance em escritas
- Escala horizontal nativa (sharding)
- Bom para dados hierárquicos

**Contras:**
- Transações multi-documento limitadas (versões antigas)
- Joins requerem application-level ou $lookup (lento)
- Consistência eventual em configurações distribuídas
- Menor maturidade em relatórios complexos

**Motivo da Rejeição:**
Nossos requisitos de transações financeiras e consultas complexas com joins tornam MongoDB inadequado como banco primário.

### Alternativa B: MySQL
**Descrição:** Banco de dados relacional tradicional

**Prós:**
- Maduro e amplamente adotado
- Performance sólida em leituras
- Boa ferramenta de replicação

**Contras:**
- Recursos avançados limitados vs PostgreSQL (CTEs, window functions)
- JSON support menos maduro
- Menor flexibilidade em tipos de dados
- Comunidade menor em features inovadoras

**Motivo da Rejeição:**
PostgreSQL oferece recursos mais avançados para nossos casos de uso complexos sem sacrificar performance ou confiabilidade.

### Alternativa C: Arquitetura Poliglota (PostgreSQL + Redis + MongoDB)
**Descrição:** Usar múltiplos bancos especializados

**Prós:**
- Cada banco otimizado para seu caso de uso
- Performance máxima em cada cenário

**Contras:**
- Complexidade operacional elevada
- Múltiplos sistemas para backup/monitoring
- Maior custo de infraestrutura
- Curva de aprendizado acentuada
- Consistência distribuída desafiadora

**Motivo da Rejeição:**
Complexidade adicional não justificada no MVP. Podemos introduzir bancos especializados posteriormente se gargalos específicos surgirem.

## Consequências

### Positivas
- Desenvolvedores podem escrever queries complexas facilmente
- Garantias fortes de consistência para transações financeiras
- Ferramentas maduras de migração (Prisma, TypeORM)
- Grande pool de talentos no mercado
- Documentação abundante e comunidade ativa

### Negativas
- Schema migrations requerem planejamento cuidadoso
- Escala horizontal de escrita limitada (single master)
- Overhead de ORM pode impactar performance em queries complexas
- Custo de instâncias gerenciadas maior que NoSQL simples

## Mitigação dos Contras
- **Schema migrations:** Usar Prisma Migrate com versionamento rigoroso e review em PRs
- **Escala de escrita:** Implementar read replicas para queries analíticas; particionamento por tenant se necessário
- **ORM overhead:** Usar query builder raw para operações críticas de performance; profiling contínuo
- **Custo:** Começar com instância menor; escalar sob demanda; considerar self-hosted em produção avançada

## Impacto nas Outras Decisões
- Influencia ADR-003 (ORM vs Query Builder)
- Afeta estratégia de cache (necessidade de invalidation baseada em eventos do DB)
- Define requisitos de backup e disaster recovery
- Impacta estrutura de testes de integração (necessidade de DB real ou testcontainers)

## Referências
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Prisma ORM](https://www.prisma.io/)
- Issue #12: Database selection discussion
```

---

### Checklist de Validação de ADRs

Antes de marcar um ADR como "ACEITA":

- [ ] Contexto descreve claramente o problema e restrições
- [ ] Pelo menos 2 alternativas foram consideradas
- [ ] Cada alternativa tem ≥2 Prós e ≥2 Contras documentados
- [ ] Motivo de rejeição é específico e técnico (não "preferência da equipe")
- [ ] Consequências negativas têm plano de mitigação
- [ ] Impacto em outras decisões foi identificado
- [ ] Referências relevantes foram incluídas
- [ ] ADR foi revisado por ≥2 membros da equipe técnica

---

**FIM DAS PARTES 6-8**

Próximo arquivo: `NEXUS_Partes_9-11.md` — Implementação, Padrões e Replicação
