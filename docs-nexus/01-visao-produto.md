# Parte 1 — Visão do Produto (Aprofundada)

## 1.1 Identidade

| Campo | Valor |
|---|---|
| **Codinome Interno** | OpenClaw |
| **Versão Atual** | 0.3.0 (extraída de `package.json` na raiz) |
| **Declaração de Visão** | Orquestrar agentes de IA heterogêneos através de um protocolo unificado de comunicação, permitindo integração plug-and-play com qualquer LLM, ferramenta ou canal de mensageria sem reescrever código do núcleo. |

**Trade-off Explícito:** Escolhemos generalidade sobre otimização específica. O sistema suporta múltiplos provedores LLM (OpenAI, Anthropic, Google) mas não será tão rápido quanto uma implementação dedicada para um único provedor. Ganhamos flexibilidade, perdemos ~15-20% de latência em cenários homogêneos.

---

## 1.2 Problema e Solução

| Problema | Impacto | Como o Sistema Resolve | Critério Binário de Validação |
|---|---|---|---|
| Cada provedor LLM exige implementação customizada de parsing, streaming e tratamento de erro | Time de engenharia gasta 40-60 horas por integração nova; inconsistências entre implementações geram bugs silenciosos | Camada de abstração `LLMProvider` com interface padronizada (`generate()`, `stream()`, `countTokens()`); novos provedores exigem apenas implementar esta interface | Nova integração completada em ≤8 horas; testes de contrato validam conformidade com interface em <30s |
| Ferramentas (tools) são hard-coded no agente; adicionar nova tool requer modificar código do core | Risco de regressão em produção a cada nova tool; deploy necessário para mudanças triviais | Sistema de registro dinâmico via JSON Schema; tools carregadas de diretório `/extensions` sem restart | Tool nova disponível em ≤5min após deploy do arquivo JSON; zero downtime comprovado por health check contínuo |
| Canais de comunicação (Slack, WhatsApp, Telegram) exigem bots separados com lógica duplicada | Manutenção multiplica por N canais; features novas chegam com atraso em alguns canais | Gateway unificado com adaptadores por canal; mensagem normalizada para formato interno comum | Mensagem recebida no Slack e Telegram gera mesmo evento interno; latência p95 <150ms entre canal e dispatcher |
| Estado da conversa fragmentado entre memória volátil e banco; reinício perde contexto | Usuário precisa repetir informações; experiência degradada após crash | Persistência obrigatória de estado em SQLite/PostgreSQL com checkpoint a cada turno; recuperação automática on-start | Restart do serviço recupera 100% das conversas ativas; teste de caos valida em <2min |
| Debug de fluxos multi-agente é impossível sem logs estruturados | Engenheiros gastam horas reproduzindo bugs; issues ficam abertas >7 dias | Trace ID único por sessão; logs JSON com correlação; replay de sessão via CLI | Qualquer sessão dos últimos 30 dias pode ser replayada em ambiente local com `openclaw replay --session-id=<ID>` |

---

## 1.3 Público-Alvo

| Segmento | Perfil (Nome + Dor Específica) | Prioridade | Métrica de Sucesso para Este Segmento |
|---|---|---|---|
| **Startups de IA** | "Marina, CTO de startup com 3 pessoas" — Precisa integrar GPT-4, Claude e Gemini no mesmo produto mas não tem tempo para manter 3 implementations distintas | P0 | Time-to-market reduzido de 6 semanas para 1 semana; custo de manutenção <4h/semana |
| **Empresas Médias** | "Roberto, Head de Automação em empresa de 200 funcionários" — Quer bots no WhatsApp, Telegram e Slack mas cada canal exige código diferente | P0 | Único código base atende todos os canais; novo canal adicionado em ≤2 dias |
| **Desenvolvedores Independentes** | "João, freelancer que cria bots customizados" — Precisa de framework que escale de protótipo a produção sem reescrever | P1 | Protótipo funcional em <4h; escala para 1000 usuários sem mudança arquitetural |
| **Equipes de Pesquisa** | "Dra. Ana, pesquisadora de multi-agent systems" — Quer testar novas arquiteturas de orquestração sem lidar com boilerplate de API | P2 | Novo algoritmo de orquestração implementável modificando ≤3 arquivos; experimentos reproducíveis |

**Decisão Crítica:** Focamos em P0 antes de P1/P2. Isso significa que a DX (Developer Experience) para startups e empresas médias tem prioridade sobre features avançadas para pesquisadores. Consequência: APIs complexas de baixo nível serão documentadas mas não terão SDKs dedicados inicialmente.

---

## 1.4 Princípios Arquiteturais

| Princípio | Descrição Concreta | Implicação Técnica | Decisão Arquitetural Crítica (Verificável por Teste) |
|---|---|---|---|
| **Protocolo sobre Implementação** | Definir contratos claros (schemas JSON) antes de codificar; implementação é detalhe secundário | Todos os componentes se comunicam via mensagens JSON validadas contra schema; nenhuma chamada direta de método entre módulos | Teste de contrato falha se qualquer componente aceitar mensagem fora do schema; CI bloqueia merge sem schema atualizado |
| **Extensibilidade por Composição** | Novas capacidades surgem combinando blocos existentes, não modificando-os | Extensions são plugins stateless que recebem input, processam, retornam output; core não conhece lógica interna | Adicionar nova extension não modifica linhas no core; teste de cobertura do core permanece ≥95% após adição |
| **Estado Externalizado** | Nenhum componente guarda estado interno persistente; tudo vai para store externo | Componentes são stateless ou guardam apenas cache volátil; SQLite/PostgreSQL é fonte da verdade | Reiniciar qualquer componente não perde dados; teste de caos mata componente aleatório e valida integridade |
| **Observabilidade Nativa** | Logs, métricas e traces não são afterthought; embutidos desde o dia 0 | Todo request tem trace ID; todo log é JSON estruturado; métricas expostas em `/metrics` no formato Prometheus | Dashboard mostra latência p95 por endpoint; alerta dispara se erro rate >1% por 5min |
| **Fallback Graceful** | Dependências externas falham; sistema degrada funcionalidade sem crash total | Circuit breaker em cada integração externa; fallback retorna erro estruturado ao invés de exception | Se OpenAI cai, sistema retorna `{"error": "provider_unavailable", "retry_after": 30}` ao invés de HTTP 500 |

**Tensão Explícita:** "Protocolo sobre Implementação" vs "Baixa Latência". Validar schemas JSON adiciona ~5-10ms por mensagem. Aceitamos este custo porque debugging de erros de tipo consome 100x mais tempo. Trade-off documentado em ADR-002.

---

## 1.5 Diferenciais vs Abordagens Existentes

| Abordagem Atual | Problema Concreto | Como OpenClaw Supera | Evidência Mensurável |
|---|---|---|---|
| **LangChain** | Acoplamento forte entre chains e providers; mudar de GPT-4 para Claude exige reescrever chain inteira | Separação clara entre orchestration (independente) e provider (plugável); mesma chain roda em qualquer LLM | Mesma config YAML funciona com OpenAI e Anthropic trocando apenas `provider_id`; teste E2E valida em <60s |
| **LlamaIndex** | Focado em RAG; orquestração multi-agente é secondary; difícil estender para canais como WhatsApp | Arquitetura centrada em agente; RAG é uma tool entre muitas; canais são adaptadores intercambiáveis | Bot com RAG + WhatsApp + tool customizada implementado em 1 arquivo de config; demo rodando em staging |
| **Implementação Customizada** | Cada empresa constrói do zero; reinventa wheel; bugs de concorrência; sem observabilidade | Framework pronto com patterns testados; observabilidade nativa; comunidade reporta bugs | Time-to-production: 1 semana (OpenClaw) vs 6-8 semanas (customizado); redução de 85% |
| **No-Code Builders** (Bubble, Zapier) | Lock-in de vendor; custos escalam linearmente com uso; customização limitada a UI | Código aberto; self-hostable; custo marginal próximo de zero após infra básica | Custo mensal: $50 (self-hosted OpenClaw) vs $500+ (Zapier para 10k execuções) |
| **Multi-Agent Frameworks Acadêmicos** | Foco em pesquisa; produção é afterthought; sem suporte a canais reais | Produçãofirst; Slack/Telegram/WhatsApp suportados; deploy em Kubernetes documentado | Deploy em produção com 1000 usuários/dia; uptime >99.5% em 30 dias |

**Limitação Honesta:** OpenClaw não é silver bullet. Se seu caso de uso é apenas "chatbot simples com GPT-4 no site", use uma solução mais simples como Chatbase. OpenClaw brilha quando você precisa de: múltiplos LLMs, múltiplos canais, tools customizadas, ou orquestração multi-agente.

---

## 1.6 Escopo Congelado (O Que Não Será Feito)

| Feature | Motivo da Exclusão | Alternativa Recomendada |
|---|---|---|
| UI de admin built-in | Foco em API-first; UIs são efêmeras e específicas por cliente | Usar Retool, Appsmith ou construir UI customizada consumindo API OpenClaw |
| Banco de vetores embutido | Especialização dilui foco; existem soluções maduras (Pinecone, Weaviate, pgvector) | Integrar via tool externa; exemplo em `/examples/rag-with-pinecone` |
| Agendamento de tarefas (cron) | Complexidade desnecessária; sistemas externos fazem melhor | Usar cron do SO, GitHub Actions, ou AWS EventBridge chamando webhook OpenClaw |
| Autenticação de usuários finais | Cada projeto tem regras diferentes; provedores OAuth variam | Delegar para Auth0, Clerk, ou implementar middleware customizado no gateway |

---

*Próxima seção: [Parte 2 — Arquitetura de Componentes](./02-arquitetura-componentes.md)*
