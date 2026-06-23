# BACKLOG ESTRATÉGICO — GreenForge
  
 ## Intenção Original
 - **Objetivo:** Transformar o Qwen CLI em um engenheiro autônomo com isolamento físico e auditoria visual de mudanças.
 - **Estado Atual:** Fase 13 concluída (Qwen Integration E2E Controlada com validação de fluxo ponta a ponta simulado).
 
 ---
 
 ## Onda 1 — Núcleo e Isolamento
 **Status:** CONCLUÍDO ✅
 
 ---
 
 ## Onda 2 — Orquestração e Persistência
 **Status:** CONCLUÍDO ✅
 
 ---
 
 ## Onda 3 — Agentes e MCP
 **Status:** CONCLUÍDO ✅
 
 ---
 
 ## Onda 4 — Visualização e Auditoria
 > Pré-requisito: Onda 3 concluída
 
 ### Itens
 
 | ID | Entregável | Descrição (entregue ou planejada) | Arquivos Impactados | Critério de Aceite | Status |
 |----|------------|-----------------------------------|----------------------|---------------------|--------|
 | W4-01 | DiffLens Engine | Motor de auditoria refinado com validação de revisões, análise de risco e relatório Markdown `GREENFORGE_AUDIT.md`. | `DiffLens.ts` | 13/13 testes PASS | CONCLUÍDO |
 | W4-02 | Verifier (Fase 11) | Componente final de aceitação que consolida o veredito humano e automatizado. | `Verifier.ts`, `types/Verifier.ts` | 15/15 testes PASS | CONCLUÍDO |
 | W4-03 | Qwen Integration Base (Fase 12) | Integração estática e declarativa da extensão no Qwen CLI. | `qwen-extension.json`, `.qwen/settings.json`, `.qwen/skills/greenforge/SKILL.md`, `src/integration/qwen/manifestSchemas.ts` | 24/24 testes PASS | CONCLUÍDO |
 | W4-04 | Qwen Integration E2E Controlada (Fase 13) | Simulação controlada de fluxo ponta a ponta dos hooks Qwen conectando ao core. | `src/integration/qwen/types.ts`, `HookSimulator.ts`, `QwenIntegrationRunner.ts`, `tests/qwen-e2e.test.ts` | 12/12 testes PASS | CONCLUÍDO |
 
 ### Meta da Onda 4
 - **Critério binário:** Sistema capaz de auditar mudanças, reportar riscos críticos, expor a base estática de contratos da extensão do Qwen CLI e validar fluxo E2E simulado.
 - **Status:** CONCLUÍDO
 
 ### CONTRATOS_DA_ONDA 4
 ```
 OUTPUT_SCHEMAS:
   W4-01: (DiffReport) Strict Zod schema; (Markdown) GREENFORGE_AUDIT.md literal
   W4-03: (QwenExtensionManifest, QwenSettings, SkillManifest) Zod validation
   W4-04: (HookSimulationInput, HookSimulationResult, QwenE2EResult) Zod validation
 ESCOPO_CONGELADO:
   - src/core/JoinGate.ts
   - src/core/agents/BaseAgent.ts
   - src/core/DiffLens.ts (Refinado)
   - src/core/Verifier.ts (Fase 11)
   - src/integration/qwen/manifestSchemas.ts
   - src/integration/qwen/types.ts
   - src/integration/qwen/HookSimulator.ts
   - src/integration/qwen/QwenIntegrationRunner.ts
 ```
 
 ---
 
 ## Regras do Backlog
 1. Itens movem para `CONCLUÍDO` após validação binária.
 2. Nenhuma Onda inicia sem a anterior concluída.