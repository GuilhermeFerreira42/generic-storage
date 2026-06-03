# NEXUS Protocol v1.2
**Meta-Comando Consolidado de Geração de Documentação Arquitetural de Excelência**

> **Origem:** Engenharia reversa do PRD NEXUS + fusão de 5 meta-comandos validados em produção (OpenClaw, Nexus Core, Archive System)
> **Versão:** 1.2 — Integração com Sistema de Arquivamento Progressivo + Validação Cruzada de Requisitos + Templates Exemplos
> **Uso:** Entregar a qualquer modelo frontier (Claude Opus 4, Gemini 2.5 Pro, GPT-4o, DeepSeek-V3) com a descrição do projeto
> **Nível de Rigor:** CRÍTICO — Documento deve ser executável como especificação técnica

---

## 📋 CONTEXTO DO PROJETO

### Instruções de Preenchimento

Preencha os campos abaixo **ANTES** de enviar este comando. Quanto mais contexto você fornecer, menos perguntas o modelo precisará fazer antes de gerar.

```markdown
PROJETO: [Descreva o projeto em 2-5 frases. Inclua:
         - Qual problema resolve
         - Para quem é
         - Qual tecnologia principal usa
         - Qual resultado esperado]

ESTADO ATUAL:
- Já existe PRD anterior? [Sim / Não] → Se sim, cole o link ou resumo
- Fases já implementadas: [liste ou escreva "nenhuma"]
- Decisões arquiteturais já tomadas: [liste ou escreva "nenhuma"]
- Restrições conhecidas (tecnologia, prazo, equipe, orçamento): [descreva ou escreva "nenhuma"]
- Stack tecnológico preferido: [ex: TypeScript/Node.js, Python/FastAPI, Go, etc.]
- Integrações obrigatórias: [ex: Stripe, AWS S3, PostgreSQL, Redis, etc.]

CONTEXTO ADICIONAL (opcional mas recomendado):
- Links para repositórios existentes: [URL ou "nenhum"]
- Documentação de referência: [URLs ou "nenhuma"]
- Projetos similares como inspiração: [nomes ou "nenhum"]
```

> **Regra de Ouro:** Se não houver estado anterior, deixe os campos como "nenhuma". O NEXUS gerará o documento do zero.  
> **Regra de Preservação:** Se houver estado anterior, o NEXUS incorporará as decisões já tomadas e não as questionará sem motivo técnico válido.

---

## 🎯 TAREFA

Gerar documentação completa — **PRD (Product Requirements Document)** + **Projeto Arquitetônico** + **Plano de Implementação** — para o projeto descrito acima, seguindo o padrão de qualidade e estrutura definidos abaixo.

**Escopo da Entrega:**
- Documento único em Markdown, autocontido e executável
- Todos os diagramas em Mermaid renderizável
- Todos os schemas JSON completos e funcionais
- Todos os requisitos com critérios de aceite binários
- Guia de replicação testável passo-a-passo

---

## ✦ PADRÃO DE QUALIDADE (TRÍADE NEXUS)

O documento gerado deve satisfazer **simultaneamente** três critérios independentes:

| Critério | Definição Operacional | Teste de Validação |
|----------|----------------------|-------------------|
| **REPLICABILIDADE** | Um engenheiro pleno que nunca viu o projeto pode iniciar implementação usando APENAS este documento | Engenheiro segue o Guia de Replicação (Parte 11) e consegue rodar o sistema em < 2 horas sem consultar código original |
| **DETERMINISMO** | Uma IA executora pode implementar a solução integralmente sem realizar inferências, suposições ou decisões arquiteturais próprias | IA recebe uma seção aleatória do documento e gera código que passa nos testes especificados sem ambiguidade |
| **AUDITABILIDADE** | Cada decisão é rastreável, cada requisito tem teste correspondente, cada mudança declara impacto | Auditor pega um RF/RNF aleatório e encontra: componente responsável → arquivo → método → teste → critério binário em < 30 segundos |

**Critério de Aprovação:** O documento só é considerado válido se passar em todos os 3 testes acima.

---

## ⛔ REGRAS INVIOLÁVEIS DE FORMATO

### Regras de Proibição (Violação = Rejeição Automática)

| # | Regra | Exemplo de Violação | Correção Esperada |
|---|-------|---------------------|-------------------|
| F1 | PROIBIDO parágrafos narrativos com mais de 3 linhas | Texto corrido explicando arquitetura | Usar tabela, bullet list ou lista numerada |
| F2 | PROIBIDO generalidades não verificáveis | "Implementar funcionalidades robustas", "Garantir boa performance" | Substituir por métrica concreta: "Latência p95 < 200ms para 1000 req/s" |
| F3 | PROIBIDO schemas JSON incompletos | `{"data": {...}}` sem valores reais | JSON completo com valores realistas copiáveis |
| F4 | PROIBIDO diagramas apenas mencionados | "Ver diagrama de sequência abaixo" sem o diagrama | Diagrama Mermaid completo e renderizável |
| F5 | PROIBIDO decisões sem justificativa | "Usaremos PostgreSQL" | "PostgreSQL (alternativa rejeitada: MongoDB — motivo: necessidade de transações ACID)" |
| F6 | PROIBIDO seções vazias ou com "A DEFINIR" | `Status: A DEFINIR` | PARAR e PERGUNTAR ao usuário (ver Regra de Parada) |
| F7 | PROIBIDO comportamento não especificado | Assumir funcionalidades não descritas | Considerar proibido tudo que não for explicitamente autorizado |
| F8 | PROIBIDO referências circulares | "Ver seção X" → "Ver seção Y" → "Ver seção X" | Cada seção deve ser autocontida ou referenciar com contexto |

### Regras Obrigatórias (Ausência = Rejeição Automática)

| # | Regra | Formato Exigido | Verificação |
|---|-------|-----------------|-------------|
| O1 | IDs únicos em requisitos | `RF-XX` para funcionais, `RNF-XX` para não-funcionais | Regex: `^(RF|RNF)-\d{2,3}$` |
| O2 | Critério de aceite verificável | Deve ser testável programaticamente | Ex: "Retornar HTTP 200 com JSON contendo campo `id` tipo string" |
| O3 | Matriz de rastreabilidade completa | RF/RNF → Componente → Arquivo → Método → Teste | Nenhuma célula vazia permitida |
| O4 | Resposta em Português (pt-BR) | Todo texto, comentários, mensagens de erro | Exceto: nomes de variáveis, APIs externas, termos técnicos consagrados |
| O5 | Exemplos concretos em TODOS os schemas | JSON, YAML, código, configs | Valores realistas, não placeholders genéricos |

---

## 🛑 REGRA DE PARADA POR INFORMAÇÃO FALTANTE

### Protocolo de Interrupção

Antes de gerar **cada seção**, o modelo deve executar esta verificação:

```
[HÁ INFORMAÇÃO SUFICIENTE PARA ESTA SEÇÃO?]
    │
    ├─ SIM → Gerar seção completa
    │
    └─ NÃO → EXECUTAR PROTOCOLO DE PARADA
```

### Formato do Protocolo de Parada

Se informação faltante for detectada, **PARAR IMEDIATAMENTE** e exibir:

```markdown
--- ⚠️ INFORMAÇÃO NECESSÁRIA ANTES DE CONTINUAR ---
Seção bloqueada: [nome da seção, ex: "4.3 Integrações Externas"]

Perguntas pendentes:
1. [pergunta objetiva com opções quando possível]
   Ex: "Qual provedor de email usar? [ ] SendGrid [ ] AWS SES [ ] Outro: ___"
2. [pergunta sobre restrições técnicas]
   Ex: "Há limite de orçamento mensal para esta integração? [Sim/Não] Se sim, qual?"
3. [pergunta sobre comportamento esperado]
   Ex: "Em caso de falha na integração, o sistema deve: [ ] Retentar [ ] Falhar silenciosamente [ ] Notificar usuário]"

Impacto da ausência:
- [descrever o que não pode ser definido sem esta informação]
- [riscos de assumir um valor padrão incorreto]

Aguardando resposta para continuar.
---
```

### Prioridade de Regras

```
REGRA DE PARADA > REGRA DE GERAÇÃO CONTÍNUA
```

**Justificativa:** É preferível pausar e obter informação correta do que gerar conteúdo inventado que causará retrabalho.

### Retomada

Após receber resposta do usuário:
1. Validar se todas as perguntas foram respondidas
2. Se sim: retomar a partir da seção bloqueada
3. Se não: listar perguntas restantes e aguardar novamente

---

## 📐 ESTRUTURA OBRIGATÓRIA DO DOCUMENTO

### Índice Remissivo

| Parte | Seção | Descrição | Páginas Estimadas |
|-------|-------|-----------|-------------------|
| 1 | Visão do Produto | Identidade, problema, solução, público, princípios | 2-3 |
| 2 | Arquitetura de Componentes | Fichas técnicas, responsabilidades, contratos | 4-6 |
| 3 | Fluxo e Contratos | Diagramas de sequência, estado, schemas | 3-4 |
| 4 | Infraestrutura | Hardware, integrações, configuração, segurança | 3-4 |
| 5 | Resiliência | Classificação de erros, self-healing, recuperação | 2-3 |
| 6 | Requisitos | RFs, RNFs, matriz de rastreabilidade | 4-5 |
| 7 | Estrutura de Arquivos | Árvore completa, descrições, convenções | 2-3 |
| 8 | ADRs | Decisões arquiteturais documentadas (mín. 6) | 3-4 |
| 9 | Implementação | MVP, fases, métricas, riscos | 3-4 |
| 10 | Padrões | Design patterns, modularização, observabilidade | 2-3 |
| 11 | Replicação | Guia passo-a-passo autocontido | 2-3 |
| 12 | Extensibilidade | Como adicionar módulos e integrações | 1-2 |
| 13 | Limitações | Bugs, limites técnicos, dependências | 1-2 |
| 14 | Roadmap | Próximas versões inferidas | 1 |

---

## 📦 PARTE 1 — VISÃO DO PRODUTO

### 1.1 Identidade

| Campo | Formato | Exemplo |
|-------|---------|---------|
| Codinome Interno | Nome memorável, não genérico | `Guardião`, `Nexus Core`, `Sentinela` |
| Versão Atual | Extraída do manifest (package.json, pyproject.toml) | `0.1.0` ou `v1.2.3` |
| Declaração de Visão | 1 frase, máx. 30 palavras, verbo no infinitivo | "Automatizar a extração de dados de PDFs complexos usando IA" |

### 1.2 Problema e Solução

**Tabela obrigatória (mínimo 4 linhas):**

| ID | Problema | Impacto (quantificável) | Como o Sistema Resolve | Métrica de Sucesso |
|----|----------|------------------------|------------------------|-------------------|
| P-01 | [descrição concreta] | [ex: 4h/semana perdidas] | [mecanismo específico] | [ex: reduzir para < 30min] |
| P-02 | ... | ... | ... | ... |
| P-03 | ... | ... | ... | ... |
| P-04 | ... | ... | ... | ... |

### 1.3 Público-Alvo

**Tabela obrigatória (mínimo 3 segmentos):**

| Segmento | Persona (nome + contexto) | Dor Específica | Prioridade | Critério de Satisfação |
|----------|---------------------------|----------------|------------|------------------------|
| Primário | "Ana, 32 anos, analista..." | [dor quantificada] | P0 | [métrica de satisfação] |
| Secundário | "Carlos, 45 anos, gerente..." | ... | P1 | ... |
| Terciário | "Equipe de compliance..." | ... | P2 | ... |

### 1.4 Princípios Arquiteturais

**Tabela obrigatória (mínimo 5 princípios):**

| ID | Princípio | Descrição Concreta | Implicação Técnica | Decisão Crítica Associada | Teste de Validação |
|----|-----------|-------------------|-------------------|---------------------------|-------------------|
| PR-01 | [ex: "Falhas são esperadas"] | [como se manifesta] | [tecnologia/padrão] | [regra verificável] | [teste automatizado] |
| PR-02 | ... | ... | ... | ... | ... |
| PR-03 | ... | ... | ... | ... | ... |
| PR-04 | ... | ... | ... | ... | ... |
| PR-05 | ... | ... | ... | ... | ... |

**Regra:** Cada princípio deve ter uma **DECISÃO ARQUITETURAL CRÍTICA** associada — uma regra verificável por testes automatizados ou auditoria.

### 1.5 Diferenciais Competitivos

**Tabela comparativa vs soluções existentes:**

| Abordagem Atual | Problema (com métrica) | Como Este Sistema Supera | Ganho Esperado |
|-----------------|------------------------|--------------------------|----------------|
| [ex: Processo manual] | [ex: 2h por tarefa, 15% erro] | [ex: Automação com validação] | [ex: 10min, < 1% erro] |
| [Solução X do mercado] | [limitação específica] | [diferencial técnico] | [vantagem mensurável] |
| [Solução Y do mercado] | ... | ... | ... |

---

## 🏗️ PARTE 2 — ARQUITETURA DE COMPONENTES

### Instruções de Preenchimento

Para **CADA componente principal** do sistema, preencher a ficha técnica completa abaixo.

**Critério de Componente Principal:** Qualquer módulo que:
- Processa dados de domínio
- Integra com sistemas externos
- Gerencia estado persistente
- Expõe API pública
- Orquestra outros componentes

---

### Template de Ficha Técnica (repetir para cada componente)

#### COMPONENTE: [Nome do Componente]

**Ficha Técnica**

| Atributo | Valor | Justificativa |
|----------|-------|---------------|
| ID interno | `[identificador único, ex: COMP-01]` | [por que este ID] |
| Classe Base | `[herança, se houver, ex: EventEmitter]` | [padrão utilizado] |
| Dependências | `[lista explícita: COMP-02, libX, serviceY]` | [motivo de cada dependência] |
| Modo de Operação | `[síncrono/assíncrono, stateful/stateless]` | [implicação de performance] |
| Permissões | `[leitura, escrita, execução — recursos acessíveis]` | [princípio do menor privilégio] |
| Ciclo de Vida | `[singleton, transient, scoped]` | [gestão de memória] |
| Thread Safety | `[thread-safe, reentrant, não seguro]` | [considerações de concorrência] |

**Responsabilidade (Declaração Formal)**

Formato obrigatório: **"Receber [X], processar [Y], produzir [Z]."**

Exemplo concreto:
> "Receber requisições HTTP POST /api/v1/documents, processar validação de schema e enfileiramento, produzir mensagens no tópico Kafka `documents.processing`."

**Inputs Detalhados**

| Input | Tipo | Schema/Validação | Origem | Frequência Esperada | Tratamento de Erro |
|-------|------|------------------|--------|---------------------|-------------------|
| [nome] | [ex: JSON, binary, string] | [referência ao schema] | [componente/sistema] | [ex: 100 req/s] | [ex: retry 3x, DLQ] |

**Outputs Produzidos**

| Output | Tipo | Schema/Validação | Destino | Garantia de Entrega |
|--------|------|------------------|---------|---------------------|
| [nome] | [ex: JSON, event, file] | [referência ao schema] | [componente/sistema] | [ex: at-least-once] |

**Exemplo de Output (JSON completo e funcional)**

```json
{
  "metadata": {
    "id": "doc_7f8a9b2c",
    "timestamp": "2025-01-15T14:32:10.123Z",
    "version": "1.0.0",
    "source": "COMP-01"
  },
  "data": {
    "status": "processed",
    "items": [
      {
        "key": "value",
        "nested": {
          "field": 42
        }
      }
    ]
  },
  "diagnostics": {
    "processingTimeMs": 156,
    "retries": 0
  }
}
```

**Configuração/System Prompt (se aplicável)**

Texto completo com regras invioláveis numeradas. Incluir placeholders dinâmicos com sintaxe `{{VARIAVEL}}`.

```
REGRAS INVARIÁVEIS DO COMPONENTE:
1. [Regra 1 — comportamento obrigatório]
2. [Regra 2 — restrição de acesso]
3. [Regra 3 — tratamento de erro]
...

PLACEHOLDERS DINÂMICOS:
- {{API_KEY}} → injetado via variável de ambiente
- {{TIMEOUT_MS}} → configurado em config.json
- {{LOG_LEVEL}} → definido por deployment
```

**Budget de Recursos**

Tabela de alocação percentual (tokens, memória, tempo, CPU — conforme aplicável):

| Recurso | Alocação Máxima | % do Total | Critério de Exaustão | Ação ao Exceder |
|---------|-----------------|------------|----------------------|-----------------|
| Memória RAM | [ex: 512 MB] | [ex: 15%] | [ex: > 90% uso] | [ex: GC forçado + alerta] |
| CPU | [ex: 2 cores] | [ex: 25%] | [ex: > 80% por 5min] | [ex: throttling] |
| Tokens (se LLM) | [ex: 8000 tokens/req] | [ex: 40% budget] | [ex: > 95% budget diário] | [ex: fallback para modelo menor] |
| Tempo de Processamento | [ex: 500ms p95] | [ex: N/A] | [ex: > 1s] | [ex: timeout + retry] |

**Métodos/Funções Públicas**

| Método | Assinatura | Descrição | Exceções Possíveis |
|--------|------------|-----------|-------------------|
| `process()` | `(input: InputType) => Promise<OutputType>` | [responsabilidade] | [ValidationError, TimeoutError] |
| `validate()` | `(data: any) => boolean` | [responsabilidade] | [SchemaMismatchError] |
| ... | ... | ... | ... |

**Testes Obrigatórios para Este Componente**

| Tipo de Teste | Cenário | Entrada | Saída Esperada | Critério de Aceite |
|---------------|---------|---------|----------------|-------------------|
| Unitário | [cenário normal] | [input válido] | [output esperado] | [asserção binária] |
| Unitário | [cenário de erro] | [input inválido] | [erro específico] | [tipo de exceção] |
| Integração | [fluxo completo] | [input end-to-end] | [resultado final] | [estado do sistema] |

---

## 🔄 PARTE 3 — FLUXO DE COMUNICAÇÃO E CONTRATOS

### 3.1 Diagrama de Sequência (Fluxo Principal)

**Instrução:** Criar diagrama Mermaid `sequenceDiagram` mostrando TODAS as interações entre componentes para o fluxo principal do sistema.

**Template obrigatório:**

```mermaid
sequenceDiagram
    autonumber
    participant U as Usuário
    participant API as Gateway API
    participant PROC as Processador
    participant DB as Banco de Dados
    participant EXT as Serviço Externo
    
    U->>API: POST /endpoint (payload)
    activate API
    API->>API: Validar auth & schema
    alt Válido
        API->>PROC: Enfileirar tarefa
        API-->>U: HTTP 202 Accepted
        deactivate API
        
        PROC->>PROC: Processar dados
        PROC->>EXT: Chamar API externa
        EXT-->>PROC: Resposta
        PROC->>DB: Persistir resultado
        deactivate PROC
    else Inválido
        API-->>U: HTTP 400 + erro detalhado
        deactivate API
    end
```

**Requisitos do diagrama:**
- [ ] Todos os participantes identificados com IDs únicos
- [ ] Todas as mensagens com verbo + recurso + payload resumido
- [ ] Blocos `alt/else` para caminhos alternativos
- [ ] Indicadores de ativação/desativação (`activate`/`deactivate`)
- [ ] Setas sólidas para requisições, tracejadas para respostas

### 3.2 Diagrama de Estado (Ciclo de Vida)

**Instrução:** Criar diagrama Mermaid `stateDiagram-v2` para o ciclo de vida da unidade principal de trabalho.

**Template obrigatório:**

```mermaid
stateDiagram-v2
    [*] --> Pendente: Criação
    
    state Pendente {
        [*] --> AguardandoRecursos
        AguardandoRecursos --> Pronto: Recursos disponíveis
    }
    
    Pendente --> EmProcessamento: Iniciar
    EmProcessamento --> EmProcessamento: Retry (max 3x)
    EmProcessamento --> Validando: Processamento completo
    
    state Validando {
        [*] --> ChecagemSchema
        ChecagemSchema --> ChecagemRegras: Schema OK
        ChecagemRegras --> [*]: Regras OK
    }
    
    Validando --> Concluido: Validação passed
    Validando --> Falhou: Validação failed
    EmProcessamento --> Falhou: Timeout > 30s
    EmProcessamento --> Falhou: Erro irrecoverável
    
    Concluido --> [*]: Sucesso
    Falhou --> [*]: Falha terminal
    
    note right of Falhou
        Estados de erro devem
        registrar causa raiz
    end note
```

**Requisitos do diagrama:**
- [ ] Todos os estados possíveis listados (mínimo 5)
- [ ] Todas as transições com evento disparador rotulado
- [ ] Estados terminais identificados (sucesso e falha)
- [ ] Subestados aninhados quando aplicável
- [ ] Notas explicativas para comportamentos complexos

### 3.3 Tabela de Transições de Estado

| ID | Estado Atual | Evento | Estado Novo | Condição (guard) | Ação (effect) | Handler |
|----|--------------|--------|-------------|------------------|---------------|---------|
| TR-01 | `Pendente` | `INICIAR` | `EmProcessamento` | `recursos_disponiveis == true` | `log("Iniciando")` | `process()` |
| TR-02 | `EmProcessamento` | `COMPLETAR` | `Validando` | `dados.processados != null` | `emit("validation.request")` | `validate()` |
| TR-03 | `EmProcessamento` | `FALHAR` | `Falhou` | `retry_count >= max_retries` | `alert("Falha crítica")` | `handle_failure()` |
| TR-04 | `Validando` | `APROVAR` | `Concluido` | `validation_errors == []` | `persist_result()` | `finalize()` |
| TR-05 | `Validando` | `REJEITAR` | `Falhou` | `validation_errors.length > 0` | `log_errors()` | `rollback()` |

**Regra:** Cada transição deve ter um handler implementável como função/método específico.

### 3.4 Schemas de Mensagens

**Instrução:** Para CADA tipo de mensagem trocada entre componentes, fornecer:

#### Template de Schema de Mensagem

**Nome da Mensagem:** `[ex: DocumentProcessingRequest]`

**Direção:** `[Componente A] → [Componente B]`

**JSON Schema Completo:**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://nexus.internal/schemas/document-processing-request.json",
  "title": "DocumentProcessingRequest",
  "description": "Requisição para processamento de documento",
  "type": "object",
  "required": ["id", "type", "payload", "metadata"],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
      "description": "ID único da requisição"
    },
    "type": {
      "type": "string",
      "enum": ["pdf", "image", "text", "spreadsheet"],
      "description": "Tipo de documento"
    },
    "payload": {
      "type": "object",
      "required": ["content", "encoding"],
      "properties": {
        "content": {
          "type": "string",
          "minLength": 1,
          "description": "Conteúdo codificado em base64"
        },
        "encoding": {
          "type": "string",
          "const": "base64",
          "description": "Codificação do conteúdo"
        },
        "filename": {
          "type": "string",
          "maxLength": 255,
          "pattern": "^[\\w\\-.]+$",
          "description": "Nome original do arquivo"
        }
      }
    },
    "metadata": {
      "type": "object",
      "required": ["timestamp", "source"],
      "properties": {
        "timestamp": {
          "type": "string",
          "format": "date-time"
        },
        "source": {
          "type": "string",
          "enum": ["api", "batch", "webhook"]
        },
        "priority": {
          "type": "integer",
          "minimum": 1,
          "maximum": 10,
          "default": 5
        }
      }
    },
    "options": {
      "type": "object",
      "properties": {
        "async": {
          "type": "boolean",
          "default": false
        },
        "callback_url": {
          "type": "string",
          "format": "uri"
        }
      }
    }
  },
  "additionalProperties": false
}
```

**Exemplo Concreto Preenchido:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "pdf",
  "payload": {
    "content": "JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlL0NhdGFsb2c+PgplbmRvYmoK...",
    "encoding": "base64",
    "filename": "relatorio_financeiro_2025.pdf"
  },
  "metadata": {
    "timestamp": "2025-01-15T14:32:10.123Z",
    "source": "api",
    "priority": 8
  },
  "options": {
    "async": true,
    "callback_url": "https://client.example.com/webhooks/processing-complete"
  }
}
```

**Regras de Validação:**

| Violação | Comportamento Esperado | Código de Erro | Mensagem ao Usuário |
|----------|----------------------|----------------|---------------------|
| Campo `required` ausente | Rejeitar imediatamente | `ERR_SCHEMA_MISSING_FIELD` | "Campo obrigatório '{field}' não fornecido" |
| Tipo incorreto | Rejeitar com hint de tipo | `ERR_SCHEMA_TYPE_MISMATCH` | "Campo '{field}' deve ser {expected}, recebido {actual}" |
| `additionalProperties` | Rejeitar propriedades extras | `ERR_SCHEMA_EXTRA_FIELDS` | "Propriedades extras não permitidas: {fields}" |
| Pattern inválido | Rejeitar com regex hint | `ERR_SCHEMA_PATTERN` | "Campo '{field}' não corresponde ao padrão esperado" |
| Enum fora dos valores | Listar valores válidos | `ERR_SCHEMA_ENUM` | "Valor '{value}' inválido. Opções: {allowed}" |

---

## 🏛️ PARTE 4 — INFRAESTRUTURA E INTEGRAÇÃO

### 4.1 Diagrama de Infraestrutura

**Instrução:** Criar diagrama Mermaid mostrando todos os componentes de infraestrutura e suas conexões.

**Template:**

```mermaid
graph TB
    subgraph Internet
        CDN[CDN CloudFlare]
        DNS[DNS Route53]
    end
    
    subgraph "Load Balancer Layer"
        LB[Application Load Balancer]
        WAF[WAF - Web Application Firewall]
    end
    
    subgraph "Application Layer (us-east-1)"
        API1[API Instance 1]
        API2[API Instance 2]
        API3[API Instance 3]
        ASG[Auto Scaling Group]
    end
    
    subgraph "Data Layer"
        primary[(PostgreSQL Primary)]
        replica[(PostgreSQL Replica)]
        cache[(Redis Cluster)]
        queue[(SQS Queue)]
    end
    
    subgraph "Storage"
        s3[S3 Bucket]
        backup[S3 Backup Vault]
    end
    
    subgraph "Monitoring"
        prom[Prometheus]
        graf[Grafana]
        elk[ELK Stack]
    end
    
    CDN --> LB
    DNS --> CDN
    LB --> WAF
    WAF --> API1
    WAF --> API2
    WAF --> API3
    API1 --> ASG
    API2 --> ASG
    API3 --> ASG
    
    API1 --> primary
    API2 --> primary
    API3 --> primary
    
    primary --> replica
    API1 --> cache
    API2 --> cache
    API3 --> cache
    
    API1 --> queue
    API2 --> queue
    API3 --> queue
    
    API1 --> s3
    API2 --> s3
    API3 --> s3
    
    s3 --> backup
    
    API1 --> prom
    API2 --> prom
    API3 --> prom
    
    prom --> graf
    API1 --> elk
    API2 --> elk
    API3 --> elk
```

### 4.2 Requisitos de Hardware/Ambiente

**Tabela com mínimo 3 perfis:**

| Perfil | Especificações | Casos de Uso | Notas de Configuração |
|--------|----------------|--------------|----------------------|
| **Desenvolvimento Local** | CPU: 4 cores<br>RAM: 8 GB<br>Storage: 50 GB SSD<br>SO: Linux/macOS/WSL2 | Desenvolvimento, testes unitários | Docker Desktop necessário, sem GPU |
| **Staging/QA** | CPU: 8 cores<br>RAM: 16 GB<br>Storage: 100 GB SSD<br>Network: 1 Gbps | Testes de integração, load testing | Réplica exata de produção em menor escala |
| **Produção (Standard)** | CPU: 16 cores<br>RAM: 32 GB<br>Storage: 500 GB NVMe<br>Network: 10 Gbps<br>GPU: Opcional (NVIDIA T4) | Carga normal (< 1000 req/s) | Auto-scaling habilitado, multi-AZ |
| **Produção (High-Performance)** | CPU: 32 cores<br>RAM: 64 GB<br>Storage: 2 TB NVMe RAID<br>Network: 25 Gbps<br>GPU: NVIDIA A10G | Carga pesada (> 5000 req/s), ML inference | Dedicated hosts, placement group |

**Variáveis de Ambiente Críticas por Perfil:**

```bash
# Desenvolvimento
NODE_ENV=development
LOG_LEVEL=debug
DATABASE_URL=postgresql://localhost:5432/nexus_dev
REDIS_URL=redis://localhost:6379/0

# Staging
NODE_ENV=staging
LOG_LEVEL=info
DATABASE_URL=postgresql://staging-db.internal:5432/nexus_staging
REDIS_URL=redis://staging-redis.internal:6379/0
ENABLE_METRICS=true

# Produção
NODE_ENV=production
LOG_LEVEL=warn
DATABASE_URL=postgresql://prod-db.cluster-xyz.us-east-1.rds.amazonaws.com:5432/nexus_prod
REDIS_URL=redis://prod-redis.cluster.xyz.us-east-1.cache.amazonaws.com:6379/0
ENABLE_METRICS=true
ENABLE_TRACING=true
OTEL_EXPORTER_OTLP_ENDPOINT=https://otel.internal:4317
```

### 4.3 Integrações Externas

**Instrução:** Para cada integração externa, preencher a ficha completa abaixo.

#### Template de Ficha de Integração

**Integração:** `[Nome do Serviço/API]`

| Campo | Valor |
|-------|-------|
| **Finalidade** | [por que esta integração existe] |
| **Tipo** | [REST API / GraphQL / gRPC / WebSocket / SDK] |
| **Provider** | [empresa/fornecedor] |
| **SLA Garantido** | [ex: 99.9% uptime] |
| **Custo Estimado** | [ex: $0.002/request ou $50/mês] |
| **Criticalidade** | [Crítica / Importante / Opcional] |
| **Fallback Disponível** | [Sim/Não + descrição] |

**Alternativa Rejeitada:**

| Alternativa | Motivo da Rejeição |
|-------------|-------------------|
| [Nome do concorrente] | [ex: API instável, documentação pobre, custo 3x maior] |
| [Solução self-hosted] | [ex: overhead operacional muito alto para equipe atual] |

**Variáveis de Ambiente Necessárias:**

```bash
# Obrigatórias
[SERVICE]_API_KEY=sk_xxxxxxxxxxxx
[SERVICE]_BASE_URL=https://api.service.com/v1
[SERVICE]_TIMEOUT_MS=5000

# Opcionais
[SERVICE]_RETRY_MAX=3
[SERVICE]_CACHE_TTL=3600
[SERVICE]_ENABLE_LOGGING=true
```

**Configuração Passo a Passo:**

1. **Obter credenciais:**
   ```bash
   # Acessar dashboard do provider
   https://dashboard.service.com/api-keys
   
   # Criar nova API key com permissões:
   # - read:documents
   # - write:results
   # - delete: none
   ```

2. **Configurar no sistema:**
   ```bash
   # Copiar para .env
   echo "[SERVICE]_API_KEY=$(pbpaste)" >> .env
   
   # Ou em secrets manager
   aws secretsmanager create-secret \
     --name nexus/service/api-key \
     --secret-string "sk_xxxxxxxxxxxx"
   ```

3. **Validar conexão:**
   ```bash
   curl -H "Authorization: Bearer $[SERVICE]_API_KEY" \
        https://api.service.com/v1/health
   
   # Esperado: {"status": "ok", "version": "1.2.3"}
   ```

**Como Estender (Novo Provider):**

```typescript
// 1. Criar adapter seguindo interface padrão
interface ServiceProvider {
  connect(): Promise<void>;
  process(data: any): Promise<Result>;
  healthcheck(): Promise<boolean>;
}

// 2. Implementar para novo provider
class NewProvider implements ServiceProvider {
  async connect() { /* ... */ }
  async process(data: any) { /* ... */ }
  async healthcheck() { /* ... */ }
}

// 3. Registrar no factory
const providers = {
  'provider-a': ProviderA,
  'provider-b': ProviderB,
  'new-provider': NewProvider, // ← novo
};

// 4. Configurar via environment
// SERVICE_PROVIDER=new-provider
```

**Fallback se Indisponível:**

| Cenário de Falha | Detecção | Ação de Fallback | Degradação |
|------------------|----------|------------------|------------|
| Timeout > 10s | `ETIMEDOUT` error | Retry com backoff exponencial (3x) | Latência aumentada |
| HTTP 5xx | Status code check | Circuit breaker abre por 60s | Cache stale servido |
| HTTP 429 (Rate Limit) | Status + header | Queue request, retry after | Processamento assíncrono |
| Auth falha | HTTP 401/403 | Alerta imediato, não retry | Feature desabilitada |
| DNS/Network error | `ENOTFOUND`, `ECONNREFUSED` | Failover para secondary endpoint | Sem degradação |

### 4.4 Configuração Completa

#### Arquivo de Configuração Principal (`config.json`)

```json
{
  "comment_version": "Config schema version: 1.2.0",
  "app": {
    "comment_name": "Nome da aplicação usado em logs e métricas",
    "name": "nexus-core",
    "comment_version": "Versão semântica do package.json",
    "version": "0.1.0",
    "comment_environment": "Ambiente de execução (development/staging/production)",
    "environment": "production"
  },
  "server": {
    "comment_host": "Hostname para binding (0.0.0.0 = todas interfaces)",
    "host": "0.0.0.0",
    "comment_port": "Porta HTTP principal",
    "port": 3000,
    "comment_timeout_ms": "Timeout global para requisições em milissegundos",
    "timeout_ms": 30000,
    "comment_max_connections": "Número máximo de conexões simultâneas",
    "max_connections": 1000,
    "comment_cors_origins": "Origens permitidas para CORS (empty = todas)",
    "cors_origins": ["https://app.example.com", "https://admin.example.com"]
  },
  "database": {
    "comment_driver": "Driver do banco de dados",
    "driver": "postgresql",
    "comment_connection_pool_min": "Conexões mínimas no pool (warm start)",
    "connection_pool_min": 5,
    "comment_connection_pool_max": "Conexões máximas no pool (limite superior)",
    "connection_pool_max": 50,
    "comment_query_timeout_ms": "Timeout para queries individuais",
    "query_timeout_ms": 5000,
    "comment_enable_ssl": "Habilitar SSL para conexão (obrigatório em produção)",
    "enable_ssl": true,
    "comment_retry_max_attempts": "Tentativas máximas de reconexão",
    "retry_max_attempts": 5,
    "comment_retry_delay_ms": "Delay entre retries em ms",
    "retry_delay_ms": 1000
  },
  "cache": {
    "comment_enabled": "Habilitar/desabilitar cache globalmente",
    "enabled": true,
    "comment_driver": "Backend de cache (redis/memory)",
    "driver": "redis",
    "comment_default_ttl_seconds": "TTL padrão para chaves em segundos",
    "default_ttl_seconds": 3600,
    "comment_prefix": "Prefixo para todas as chaves (namespacing)",
    "prefix": "nexus:",
    "comment_max_memory_mb": "Limite de memória para cache local (MB)",
    "max_memory_mb": 512
  },
  "logging": {
    "comment_level": "Nível mínimo de log (debug/info/warn/error)",
    "level": "info",
    "comment_format": "Formato de output (json/text)",
    "format": "json",
    "comment_include_stack_trace": "Incluir stack traces em erros",
    "include_stack_trace": true,
    "comment_redact_fields": "Campos sensíveis a serem ofuscados",
    "redact_fields": ["password", "api_key", "token", "credit_card"],
    "comment_output": "Destino dos logs (stdout/file/cloudwatch)",
    "output": ["stdout", "cloudwatch"]
  },
  "metrics": {
    "comment_enabled": "Habilitar coleta de métricas",
    "enabled": true,
    "comment_backend": "Sistema de métricas (prometheus/datadog/newrelic)",
    "backend": "prometheus",
    "comment_scrape_port": "Porta para scraping do Prometheus",
    "scrape_port": 9090,
    "comment_histogram_buckets": "Buckets para histogramas de latência (segundos)",
    "histogram_buckets": [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10]
  },
  "security": {
    "comment_jwt_secret_env": "Variável de ambiente contendo JWT secret",
    "jwt_secret_env": "NEXUS_JWT_SECRET",
    "comment_jwt_expiry_seconds": "Validade do token JWT em segundos",
    "jwt_expiry_seconds": 3600,
    "comment_rate_limit_requests": "Requests máximos por janela",
    "rate_limit_requests": 100,
    "comment_rate_limit_window_seconds": "Janela de tempo para rate limiting (segundos)",
    "rate_limit_window_seconds": 60,
    "comment_helmet_enabled": "Headers de segurança Helmet (Express)",
    "helmet_enabled": true,
    "comment_trust_proxy": "Nível de proxy trust (false/true/number)",
    "trust_proxy": 1
  },
  "features": {
    "comment_async_processing": "Habilitar processamento assíncrono via fila",
    "async_processing": true,
    "comment_batch_size": "Tamanho do batch para processamento em lote",
    "batch_size": 100,
    "comment_enable_webhooks": "Habilitar sistema de webhooks",
    "enable_webhooks": true,
    "comment_webhook_retry_max": "Tentativas máximas de entrega de webhook",
    "webhook_retry_max": 5
  },
  "integrations": {
    "comment_storage_provider": "Provider de armazenamento (s3/gcs/azure/local)",
    "storage_provider": "s3",
    "comment_storage_bucket": "Bucket/container principal",
    "storage_bucket": "nexus-documents-prod",
    "comment_storage_region": "Região do bucket",
    "storage_region": "us-east-1",
    "comment_llm_provider": "Provider de LLM (openai/anthropic/local)",
    "llm_provider": "anthropic",
    "comment_llm_model": "Modelo padrão para inferência",
    "llm_model": "claude-sonnet-4-20250514",
    "comment_llm_max_tokens": "Tokens máximos por resposta",
    "llm_max_tokens": 4096
  }
}
```

#### Arquivo `.env.example`

```bash
# =============================================================================
# NEXUS Core - Environment Configuration
# =============================================================================
# Copie este arquivo para .env e preencha os valores conforme instruções.
# Nunca committe o arquivo .env real no version control.
# =============================================================================

# -----------------------------------------------------------------------------
# APLICAÇÃO
# -----------------------------------------------------------------------------
# Ambiente de execução: development | staging | production
NODE_ENV=development

# Porta HTTP para o servidor principal
PORT=3000

# Hostname para binding (use 0.0.0.0 em containers)
HOST=0.0.0.0

# Secret key para sessões e cookies (gerar com: openssl rand -hex 32)
SESSION_SECRET=change_me_in_production_with_secure_random_string

# -----------------------------------------------------------------------------
# BANCO DE DADOS (PostgreSQL)
# -----------------------------------------------------------------------------
# Connection string completa (inclui user, pass, host, port, dbname)
# Formato: postgresql://user:password@host:port/database?sslmode=require
DATABASE_URL=postgresql://nexus:dev_password@localhost:5432/nexus_dev?sslmode=disable

# Pool de conexões (ajuste conforme carga esperada)
DB_POOL_MIN=2
DB_POOL_MAX=20

# -----------------------------------------------------------------------------
# CACHE (Redis)
# -----------------------------------------------------------------------------
# Redis connection string
# Formato: redis://username:password@host:port/database
REDIS_URL=redis://localhost:6379/0

# TTL padrão em segundos (3600 = 1 hora)
CACHE_TTL=3600

# -----------------------------------------------------------------------------
# SEGURANÇA
# -----------------------------------------------------------------------------
# JWT Secret (gerar com: openssl rand -hex 32)
# IMPORTANTE: Use valor único e seguro em produção
JWT_SECRET=change_me_in_production_with_secure_random_string

# JWT Expiry em segundos (3600 = 1 hora)
JWT_EXPIRY=3600

# Rate limiting: requests por minuto por IP
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60

# Chave de API para admin/internal endpoints (opcional)
ADMIN_API_KEY=

# -----------------------------------------------------------------------------
# LOGGING
# -----------------------------------------------------------------------------
# Nível de log: debug | info | warn | error
LOG_LEVEL=debug

# Formato: json | text (use json em produção para agregação)
LOG_FORMAT=text

# -----------------------------------------------------------------------------
# STORAGE (AWS S3 ou compatível)
# -----------------------------------------------------------------------------
# AWS Credentials (deixe vazio se usando IAM roles em EC2/ECS)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# Região do S3
AWS_REGION=us-east-1

# Bucket name para documentos
S3_BUCKET=nexus-documents-dev

# Endpoint customizado (para S3-compatible como MinIO, deixe vazio para AWS)
S3_ENDPOINT=

# -----------------------------------------------------------------------------
# LLM (Large Language Model)
# -----------------------------------------------------------------------------
# Provider: openai | anthropic | local
LLM_PROVIDER=anthropic

# API Key do provider escolhido
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# Modelo padrão
LLM_MODEL=claude-sonnet-4-20250514

# Max tokens por resposta
LLM_MAX_TOKENS=4096

# -----------------------------------------------------------------------------
# FILAS (AWS SQS ou alternativo)
# -----------------------------------------------------------------------------
# Queue URL para processamento assíncrono
SQS_QUEUE_URL=

# Region da fila SQS
SQS_REGION=us-east-1

# -----------------------------------------------------------------------------
# MONITORING & TRACING
# -----------------------------------------------------------------------------
# Habilitar métricas Prometheus
ENABLE_METRICS=true

# Endpoint OTLP para tracing (OpenTelemetry)
OTEL_EXPORTER_OTLP_ENDPOINT=

# Service name para tracing
OTEL_SERVICE_NAME=nexus-core

# -----------------------------------------------------------------------------
# FEATURE FLAGS
# -----------------------------------------------------------------------------
# Habilitar/desabilitar features específicas
FEATURE_ASYNC_PROCESSING=true
FEATURE_WEBHOOKS=true
FEATURE_BATCH_IMPORT=false
FEATURE_ADVANCED_ANALYTICS=false

# -----------------------------------------------------------------------------
# INTEGRAÇÕES EXTERNAS (opcionais)
# -----------------------------------------------------------------------------
# Stripe (pagamentos)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# SendGrid (emails transacionais)
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=noreply@example.com

# Slack (notificações)
SLACK_WEBHOOK_URL=
SLACK_CHANNEL=#alerts-nexus

# =============================================================================
# FIM DO ARQUIVO DE EXEMPLO
# =============================================================================
```

### 4.5 Segurança

#### Fluxo de Autenticação/Autorização

```mermaid
sequenceDiagram
    autonumber
    participant C as Cliente
    participant G as Gateway/API
    participant A as Auth Service
    participant D as Database
    participant R as Redis (cache)
    
    C->>G: POST /auth/login (credentials)
    activate G
    G->>A: Validar credenciais
    activate A
    A->>D: Buscar usuário por email
    D-->>A: User data (hash password)
    A->>A: Comparar password hash
    alt Credenciais válidas
        A->>A: Gerar JWT token
        A->>R: Cache token (blacklist)
        A-->>G: JWT + user info
        G-->>C: HTTP 200 + access_token + refresh_token
    else Credenciais inválidas
        A-->>G: AuthError
        G-->>C: HTTP 401 + "Invalid credentials"
    end
    deactivate A
    deactivate G
    
    Note over C,G: Requisições subsequentes
    
    C->>G: GET /protected/resource (Bearer token)
    activate G
    G->>R: Verificar token blacklist
    R-->>G: Token válido
    G->>G: Validar signature + expiry
    G->>G: Extrair claims (user_id, roles)
    G->>G: Verificar permissões (RBAC)
    alt Autorizado
        G->>D: Buscar recurso
        D-->>G: Resource data
        G-->>C: HTTP 200 + data
    else Não autorizado
        G-->>C: HTTP 403 + "Insufficient permissions"
    end
    deactivate G
```

#### Tabela de Proteções Implementadas

| Ameaça | Mitigação | Implementação | Teste de Validação |
|--------|-----------|---------------|-------------------|
| **SQL Injection** | Parameterized queries, ORM | Prisma/Sequelize com prepared statements | Teste com payloads OWASP SQLi |
| **XSS (Cross-Site Scripting)** | Sanitização de input, CSP headers | DOMPurify + Helmet CSP | Teste com payloads XSS polyglot |
| **CSRF** | CSRF tokens, SameSite cookies | csurf middleware + SameSite=strict | Tentativa de requisição cross-origin |
| **Brute Force Login** | Rate limiting, account lockout | express-rate-limit + fail2ban | 10 tentativas falhas em 1 min → bloqueio |
| **Token Theft** | Short-lived tokens, refresh rotation | JWT 15min + refresh token rotation | Token roubado expira em 15min |
| **Data Leakage** | Field-level encryption, redaction | AES-256 + log redaction | Logs não contêm dados sensíveis |
| **Privilege Escalation** | RBAC strict, least privilege | Middleware de autorização por role | User comum não acessa /admin/* |
| **DDoS** | Rate limiting, WAF, CDN | CloudFlare + nginx limit_req | 1000 req/s de mesmo IP → bloqueio |
| **Man-in-the-Middle** | HTTPS everywhere, HSTS | TLS 1.3 + HSTS header | HTTP redirect para HTTPS |
| **Secret Exposure** | Secrets manager, env vars | AWS Secrets Manager + .env | Secrets não em código ou logs |

#### Regras de Sandbox/Isolamento

| Operação | Permitido | Bloqueado | Justificativa |
|----------|-----------|-----------|---------------|
| **Acesso a filesystem** | `/tmp`, `/app/data` | `/`, `/etc`, `/home`, `/root` | Prevenir leitura de arquivos do sistema |
| **Execução de comandos** | Nenhum | `exec()`, `spawn()`, `system()` | Prevenir RCE (Remote Code Execution) |
| **Network outbound** | Domínios whitelistados | IPs diretos, portas não autorizadas | Prevenir data exfiltration |
| **Network inbound** | Portas 3000, 9090 | Todas outras | Superfície de ataque mínima |
| **Environment vars** | Leitura de vars prefixadas `NEXUS_` | Todas outras | Isolar segredos de outros processos |
| **Process spawning** | Nenhum | Qualquer child process | Prevenir escape de sandbox |
| **Memory allocation** | Até 512 MB por request | > 1 GB | Prevenir DoS por exhaustion |
| **CPU time** | Até 5s por request | > 30s | Prevenir crypto mining abuse |

#### Tratamento de Dados Sensíveis

**Classificação de Dados:**

| Categoria | Exemplos | Nível de Proteção | Retenção Máxima |
|-----------|----------|-------------------|-----------------|
| **Público** | Nome da empresa, descrições | Criptografia em trânsito apenas | Indefinida |
| **Interno** | Emails corporativos, logs operacionais | Criptografia em trânsito + repouso | 2 anos |
| **Confidencial** | CPF/CNPJ, endereços, telefones | Criptografia AES-256 + masking em logs | 5 anos (legal) |
| **Crítico** | Senhas, tokens, chaves API | Hash (Argon2) + secrets manager | Até revogação |
| **PII (Personal Identifiable Information)** | Dados pessoais LGPD | Criptografia + consentimento + direito ao esquecimento | Até withdraw consent |

**Masking em Logs:**

```javascript
// Antes: {"email": "usuario@example.com", "cpf": "123.456.789-00"}
// Depois: {"email": "usu***@example.com", "cpf": "***.***.***-**"}

const sensitiveFields = ['cpf', 'cnpj', 'email', 'phone', 'credit_card'];
const maskValue = (value, field) => {
  if (field === 'email') return value.replace(/(.{3}).*@/, '$1***@');
  if (field === 'cpf' || field === 'cnpj') return '***.***.***-**';
  if (field === 'phone') return value.replace(/(.{2}).*(.{2})/, '$1****$2');
  if (field === 'credit_card') return '****-****-****-' + value.slice(-4);
  return '[REDACTED]';
};
```

---

## 🛡️ PARTE 5 — RECUPERAÇÃO DE ERROS E RESILIÊNCIA

### 5.1 Classificação de Erros

| Nível | Tipo | Severidade | Exemplos Concretos | Ação Automática | Timeout | Máx Tentativas | Escalonamento |
|-------|------|------------|-------------------|-----------------|---------|----------------|---------------|
| **L1 - Trivial** | Warning operacional | Baixa | Input validation warning, deprecated field usage | Log + continuar | N/A | 0 | Nenhum |
| **L2 - Recuperável** | Erro transitório | Média | Timeout de rede, rate limit 429, connection drop | Retry exponencial | 5s | 3 | Se falhar após retry → L3 |
| **L3 - Sério** | Erro de negócio/recurs | Alta | DB constraint violation, auth failure, quota exceeded | Rollback + notificar | 10s | 1 | PagerDuty (non-urgent) |
| **L4 - Crítico** | Falha de componente | Muito Alta | DB down, cache cluster unreachable, disk full | Failover + circuit breaker | 30s | 0 | PagerDuty (urgent) + Slack |
| **L5 - Catastrófico** | Falha sistêmica | Emergência | Data corruption, security breach, region outage | Emergency shutdown + DR | N/A | 0 | All-hands + incident commander |

### 5.2 Fluxo de Self-Healing

```mermaid
flowchart TD
    A[🔍 Detecção de Erro] --> B{Classificar Nível}
    
    B -->|L1 - Trivial| C1[📝 Log warning]
    C1 --> C2[✅ Continuar operação]
    C2 --> Z[Fim]
    
    B -->|L2 - Recuperável| D1[🔄 Retry com backoff exponencial]
    D1 --> D2{Sucesso?}
    D2 -->|Sim| D3[✅ Normalizar operação]
    D3 --> Z
    D2 -->|Não após 3 retries| D4[⚠️ Degradar funcionalidade]
    D4 --> D5[📊 Incrementar métrica de erro]
    D5 --> Z
    
    B -->|L3 - Sério| E1[↩️ Rollback transação]
    E1 --> E2[🔒 Liberar locks]
    E2 --> E3[📧 Notificar equipe]
    E3 --> E4[📋 Criar ticket automático]
    E4 --> Z
    
    B -->|L4 - Crítico| F1[⚡ Ativar circuit breaker]
    F1 --> F2[🔄 Failover para réplica/secondary]
    F2 --> F3{Failover sucesso?}
    F3 -->|Sim| F4[✅ Operar em degraded mode]
    F4 --> F5[🔔 PagerDuty + Slack alert]
    F5 --> Z
    F3 -->|Não| F6[🚨 Escalar para L5]
    F6 --> G1
    
    B -->|L5 - Catastrófico| G1[🛑 Emergency shutdown]
    G1 --> G2[🗄️ Ativar disaster recovery]
    G2 --> G3[📞 Acionar incident commander]
    G3 --> G4[📢 Status page update]
    G4 --> G5[🔍 Post-mortem automático]
    G5 --> Z
    
    style A fill:#ff9999
    style Z fill:#99ff99
    style G1 fill:#ff0000,color:#fff
    style F1 fill:#ff6600
    style E1 fill:#ffcc00
    style D1 fill:#66ccff
    style C1 fill:#99ff99
```

### 5.3 Padrões de Recuperação

#### Padrão 1: Timeout de Rede

**DETECTOR:**
- Erro `ETIMEDOUT` ou `ECONNABORTED`
- HTTP status não recebido em > timeout configurado

**PATTERN:**
```typescript
{
  code: 'ETIMEDOUT' | 'ECONNABORTED',
  syscall: 'connect' | 'read',
  message: /timeout|timed out/i
}
```

**FLUXO:**
1. Capturar erro no interceptor de rede
2. Incrementar contador de retries no contexto da request
3. Se `retry_count < max_retries`:
   - Calcular delay: `delay = base_delay * 2^retry_count + jitter`
   - Aguardar `delay` ms
   - Re-executar request
4. Se `retry_count >= max_retries`:
   - Abrir circuit breaker por `breaker_timeout`
   - Retornar erro ao caller com contexto completo
   - Logar métrica `network.timeout.total`

#### Padrão 2: Rate Limit (HTTP 429)

**DETECTOR:**
- HTTP status 429
- Header `Retry-After` presente

**PATTERN:**
```typescript
{
  status: 429,
  headers: { 'retry-after': string | number }
}
```

**FLUXO:**
1. Detectar 429 na resposta
2. Extrair `Retry-After` header (segundos ou timestamp)
3. Calcular wait_time:
   - Se número: `wait_time = value * 1000`
   - Se timestamp: `wait_time = timestamp - Date.now()`
4. Enfileirar request para retry após `wait_time`
5. Se `retry_count >= 3`:
   - Notificar equipe (possível abuso ou config errada)
   - Fallback para cached response se disponível

#### Padrão 3: Falha de Banco de Dados

**DETECTOR:**
- Erro de conexão PostgreSQL
- Query timeout > threshold
- Deadlock detectado

**PATTERN:**
```typescript
{
  code: 'ECONNREFUSED' | 'ETIMEDOUT' | '23505' | '40P01',
  // 23505 = unique violation, 40P01 = deadlock
}
```

**FLUXO:**
1. Para erros de conexão:
   - Tentar reconnect com backoff (max 3x)
   - Se falhar: failover para réplica
   - Se réplica indisponível: ativar modo read-only
2. Para deadlocks:
   - Rollback transação
   - Retry com ordem de locks diferente (aleatorizar)
   - Se persistir: abortar e notificar
3. Para unique violations:
   - Não retry (erro de negócio)
   - Retornar erro específico ao usuário

#### Padrão 4: Falha de LLM (AI Provider)

**DETECTOR:**
- HTTP 5xx do provider
- Rate limit de tokens
- Timeout de geração

**PATTERN:**
```typescript
{
  provider: 'openai' | 'anthropic',
  error_type: 'api_error' | 'rate_limit_error' | 'timeout',
  status?: number
}
```

**FLUXO:**
1. Para api_error (5xx):
   - Retry com backoff (max 2x)
   - Se persistir: fallback para modelo menor
2. Para rate_limit:
   - Queue request
   - Processar quando quota resetar
   - Notificar se quota próxima do fim
3. Para timeout:
   - Reduzir `max_tokens` pela metade
   - Retry com parâmetros conservadores
   - Se persistir: retornar resposta parcial + indicar truncamento

#### Padrão 5: Corrupção de Dados

**DETECTOR:**
- Checksum mismatch
- Schema validation failure crítica
- Dados inconsistentes entre réplicas

**PATTERN:**
```typescript
{
  type: 'checksum_mismatch' | 'schema_violation' | 'replication_lag_critical',
  expected: string,
  actual: string,
  resource_id: string
}
```

**FLUXO:**
1. Imediatamente isolar recurso corrupto (quarantine)
2. Tentar restaurar de backup mais recente
3. Se restore falhar:
   - Notificar equipe de dados (urgente)
   - Flaggar recurso como `corrupted` no DB
   - Prevenir acesso downstream
4. Acionar processo de recuperação manual
5. Iniciar investigação de causa raiz

### 5.4 Mapa de Falhas

```mermaid
mindmap
  root((Falhas))
    Rede
      Timeout
        ::icon(fa fa-clock)
        Retry + Backoff
      DNS Failure
        ::icon(fa fa-exclamation-triangle)
        Fallback IP
      Connection Refused
        ::icon(fa fa-ban)
        Circuit Breaker
    Banco de Dados
      Connection Lost
        ::icon(fa fa-plug)
        Reconnect + Failover
      Query Timeout
        ::icon(fa fa-hourglass)
        Kill Query + Retry
      Deadlock
        ::icon(fa fa-lock)
        Rollback + Randomize Order
      Disk Full
        ::icon(fa fa-hdd)
        Emergency Cleanup + Alert
    Cache (Redis)
      Memory Limit
        ::icon(fa fa-memory)
        Eviction Policy
      Cluster Down
        ::icon(fa fa-server)
        Fallback to DB
      Key Explosion
        ::icon(fa fa-key)
        Rate Limit Writes
    LLM/AI
      API Error
        ::icon(fa fa-robot)
        Retry + Fallback Model
      Rate Limit
        ::icon(fa fa-tachometer)
        Queue + Throttle
      Token Overflow
        ::icon(fa fa-text-width)
        Truncate + Summarize
    Storage (S3)
      Upload Failure
        ::icon(fa fa-cloud-upload-alt)
        Multipart Retry
      Permission Denied
        ::icon(fa fa-user-lock)
        Rotate Credentials
      Object Lost
        ::icon(fa fa-search)
        Restore from Backup
    Segurança
      Auth Failure
        ::icon(fa fa-shield-alt)
        Lockout + Alert
      Suspicious Activity
        ::icon(fa fa-user-secret)
        Block IP + Investigate
      Data Leak Detected
        ::icon(fa fa-exclamation-circle)
        Emergency Shutdown
```

### 5.5 Tabela Resumo de Resiliência

| Cenário | Detecção | Recovery Automático | Tempo Máximo Recovery | Intervenção Humana Necessária? |
|---------|----------|---------------------|----------------------|-------------------------------|
| **Timeout de API externa** | `ETIMEDOUT` + retry count | Retry exponencial (3x) + fallback | 15 segundos | Não (a menos que persistente > 5min) |
| **Database primário cai** | Health check fail (2x) | Failover para réplica + promote | 30 segundos | Sim (validar integridade pós-failover) |
| **Cache cluster indisponível** | Redis connection error | Bypass cache → DB direto | 5 segundos | Não (auto-recovery quando voltar) |
| **Rate limit excedido** | HTTP 429 + header | Queue + throttle requests | Variável (até reset quota) | Sim (se quota insuficiente recorrente) |
| **Disk usage > 90%** | Metric threshold alert | Cleanup temporários + compress logs | 60 segundos | Sim (investigar causa do crescimento) |
| **Memory leak detectado** | Heap growth > threshold | Rolling restart pods (um por vez) | 5 minutos | Sim (debug leak em staging) |
| **SSL certificate expiring** | Cert expiry check (< 7 dias) | Auto-renew via ACME/Let's Encrypt | 1 minuto | Não (a menos que renew falhe) |
| **DDoS attack** | Request spike + WAF alerts | Enable aggressive rate limit + CDN shield | 30 segundos | Sim (ajustar regras WAF) |
| **Data corruption** | Checksum/validation fail | Quarantine + restore backup | 10 minutos | Sim (investigar origem corrupção) |
| **Security breach** | Anomaly detection + auth failures | Emergency lockdown + revoke tokens | Imediato | Sim (incident response team) |

---

*(Continua na próxima parte...)*

---

**GERAR CONTINUAÇÃO:** As Partes 6-14 serão geradas na próxima iteração para manter o documento dentro do limite de tokens.

--- CONTINUAÇÃO PENDENTE (próximo: Parte 6 — Requisitos Funcionais e Não-Funcionais) ---
