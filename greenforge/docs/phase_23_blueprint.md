# Fase 23 — Blueprint: Transporte Real de LLM (Proxy litellm)

> **Status:** DECIDIDA / APROVADA (2026-07-22). Próximo passo: implementação.
> **Leitura complementar:** `documentacao/GREENFORGE_DESIGN.md` §10, `docs/CURRENT_STATE.md`, `docs/DECISION_LOG.md` (entradas F23).

## 1. Objetivo
Plugar o GreenForge a um LLM real via proxy **litellm**, mantendo a arquitetura hexagonal intacta. O litellm atua apenas como **CANO** de transporte OpenAI-compatível; o GreenForge mantém o controle da formatação e da validação dos dados.

## 2. Decisão de Arquitetura (resumo)
- **litellm = cano, não cérebro.** Qwen CLI continua host. O GreenForge fala com UM provider (porta `LLMProvider`); o litellm entra nessa tomada.
- **Adaptador interno com Zod.** O `LiteLLMProvider` forma e valida o payload antes de enviar → nada importante some (anti `drop_params`).
- **Roteamento assimétrico.** Duas instâncias litellm: **porta 4000** (pool grande) para trabalho braçal; **porta 4001** (pool pequeno/FAST) para classificação do `QwenRouter` (<1,2s).
- **Hard block na Factory.** `NODE_ENV==='test'` + transporte real → erro → 468 testes não vazam pra rede.
- **Hexagonal fortalecida.** Core limpo, 1 provider; complexidade de rede na infraestrutura + config do proxy.

## 3. Adaptador LiteLLMProvider (novo arquivo)
- **Caminho:** `src/infrastructure/llm/providers/LiteLLMProvider.ts`
- Implementa `LLMProvider.generate(prompt: string): Promise<string>`.
- Segue o padrão **safe-stub** das Fases 17, mas REALMENTE executa transporte via `LLMTransport.post(base_url + '/chat/completions', headers, body)`.
- **Config aceita:** `provider: 'litellm'`, `baseUrl` (endpoint, ex.: `http://localhost:4000`), `model` (nome do pool/modelo), `apiKeyEnv` **opcional** (self-host local não exige chave), `timeout`, `mockMode`.
- **Registro:** `LLMProviderRegistry` ganha built-in `'litellm'`.
- **Enum:** `LLMProviderNameSchema` (em `LLMProviderConfig.ts`) ganha `'litellm'`.

## 4. Blindagem Anti-Perda-de-Contexto (Zod no Adaptador)
- Antes de montar o body, o adaptador **valida/forma o payload com schema Zod** (`LiteLLMRequestSchema`) — garante que campos críticos (system, messages, instruções, temperature, etc.) estão presentes e bem tipados.
- O adaptador **NÃO confia no `drop_params` do litellm**: se um parâmetro suportado pelo GreenForge não for aceito pelo backend, isso é detectado/mapeado rigidamente, não silenciado.
- Se o litellm indicar que descartou algo → gravar warning **`DROP DETECTED`** no SQLite (tabela de auditoria), tornando a perda visível e debugável.

## 5. Roteamento Assimétrico (duas portas / dois pools)
- **Pool grande** (DeepSeek V4 Pro, Nemotron, GLM 5.2, etc.) → instância litellm na **porta 4000**. Usado por agentes (Planner/Coder/Reviewer/Tester) para trabalho braçal.
- **Pool pequeno/rápido** (modelo smaller/FAST capaz de classificar intent) → instância litellm na **porta 4001**. Usado pelo **QwenRouter** para classificação de intenção (<1,2s, RNF-01).
- GreenForge instancia **DUAS configs** apontando para as duas portas; o `QwenRouter` recebe a config da porta 4001, os agentes recebem a da porta 4000.
- **Perfis no header HTTP** (ex.: `x-greenforge-profile: small|large`) tornam o roteamento assimétrico explícito e debugável.

## 6. Trava Física de Testes (Hard Block na Factory)
- Em `LLMProviderFactory.create(...)`: se `process.env.NODE_ENV === 'test'` (ou flag de teste) **E** o provider configurado usa transporte real (não `mock`, não `mockMode`) → **LANÇAR** `LLMProviderError('TEST_HARD_BLOCK', ...)` **antes de qualquer chamada de rede**.
- Garante que nenhum dos **468 testes** bata no litellm real (porta 4000 ou 4001) por acidente.
- Os testes continuam com `MockLLMProvider` / `InternalMockLLMProvider` como padrão.

## 7. Por que a Hexagonal Sai Fortalecida
- **Core limpo**, fala com 1 provider (porta `LLMProvider`).
- Complexidade de rede (litellm, pools, retries 429/500, fallback) fica na **camada de infraestrutura + config do proxy**.
- GreenForge continua determinístico e testável; a inteligência do que é enviado fica sob nosso controle (adaptador interno).

## 8. Arquivos Impactados (previstos)
- `src/infrastructure/llm/LLMProviderConfig.ts` — enum `'litellm'` + schema aceita `base_url`/`model`/`apiKeyEnv` opcional.
- `src/infrastructure/llm/LLMProviderRegistry.ts` — registrar built-in `'litellm'`.
- `src/infrastructure/llm/providers/LiteLLMProvider.ts` — **NOVO** adaptador.
- `src/infrastructure/llm/LLMProviderFactory.ts` — **hard block** de testes.
- `src/core/ports/LLMProvider.ts` — **sem mudança** (porta estável).
- `src/infrastructure/db/SQLiteRepository.ts` — warning **DROP DETECTED** (se aplicável).
- `tests/llm-providers.test.ts` — testes do novo provider + hard block.

## 9. Critérios de Aceite
- GreenForge aponta para endpoint OpenAI-compatível do litellm (`base_url` + `model`; chave opcional em self-host).
- Erros 429/500 tratados sem código no orquestrador (litellm cuida).
- Suíte de 468 testes permanece isolada da rede real (hard block).
- Payload validado por Zod no adaptador; perda silenciosa detectada e registrada (DROP DETECTED).
- Latência do QwenRouter < 1,2s (pool pequeno na porta 4001).
