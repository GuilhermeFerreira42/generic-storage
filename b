## **NÃO OK** — Documentação com falhas bloqueantes para TDD

Aqui estão os pontos que impedem iniciar o primeiro teste falhando, em ordem de prioridade:

---

**1. INTEGRACAO_STATUS.md lista todos os componentes como "⬜ Pendente" (Bloqueante crítico)**
O critério 9 exige que componentes obrigatórios do MVP não estejam com status "Pendente". O arquivo `INTEGRACAO_STATUS.md` marca todos os 9 componentes de integração como pendentes, incluindo MCP Server, hooks e comandos slash. Isso contradiz diretamente o critério de prontidão para TDD.

**Comando de correção:**
```
Atualize o arquivo INTEGRACAO_STATUS.md: altere o status de todos os componentes de integração de "⬜ Pendente" para "✅ Especificado" (não implementado, mas com contrato documentado suficiente para TDD). Adicione uma coluna "Arquivo de Referência" apontando para o documento que contém o contrato de cada componente.
```

---

**2. GREENFORGE_MAESTRO.md ainda menciona "Gemini 1.5 Flash" e "Gemini 1.5 Pro" como modelos (Bloqueante — critério 8)**
O arquivo `GREENFORGE_MAESTRO.md` (linha 1534) cita explicitamente `Gemini 1.5 Flash (Router)` e `Gemini 1.5 Pro (Planner)`. O critério 8 exige que todas as referências a modelos Gemini estejam substituídas por Qwen 2.5 / 2.5 Max. Isso cria contradição direta com o `GREENFORGE_DESIGN.md` e pode confundir o agente de implementação.

**Comando de correção:**
```
No arquivo GREENFORGE_MAESTRO.md, substitua todas as ocorrências de "Gemini 1.5 Flash" por "Qwen 2.5" e "Gemini 1.5 Pro" por "Qwen 2.5-Max". Verifique também se existe qualquer outra referência a modelos Gemini no mesmo arquivo e substitua.
```

---

**3. NEXUS_GREENFORGE_DEEPENED.md (linha ~2265) contém `GEMINI_API_KEY` e `.gemini/worktrees/` no Guia de Replicação (Bloqueante — critério 8)**
O "Guia de Replicação (10 Passos)" dentro do dossiê NEXUS instrui explicitamente `cp .env.example .env` com `GEMINI_API_KEY` e valida o isolamento com `ls .gemini/worktrees/`. Isso contradiz o critério de consistência e pode fazer o agente criar estrutura de pastas errada.

**Comando de correção:**
```
No arquivo NEXUS_GREENFORGE_DEEPENED.md, no "Guia de Replicação (10 Passos)", substitua "GEMINI_API_KEY" por "QWEN_API_KEY" e "ls .gemini/worktrees/" por "ls .qwen/worktrees/". Revise o documento inteiro buscando por ".gemini" e substitua por ".qwen" em todos os casos.
```

---

**4. INTEGRACAO_STATUS.md lista 3 dívidas técnicas sem resolução, incluindo "mocks do Gemini CLI" ainda pendentes (Bloqueante — critério 9)**
A seção "Dívidas Técnicas Herdadas" diz que os mocks de testes de integração são do Gemini CLI e "precisam ser reescritos para MockQwenHookRunner", que o error handling do MCP Server "não tem tratamento uniforme definido", e que o contrato de `onStateChange` ainda precisa ser definido. Itens sem definição de contrato bloqueam a escrita do primeiro teste RED.

**Comando de correção:**
```
No arquivo INTEGRACAO_STATUS.md, na seção "Dívidas Técnicas Herdadas", adicione para cada item: (a) o arquivo de referência onde o contrato está ou será definido, (b) se é bloqueante para o MVP ou pode ser adiado. Para o item de MockQwenHookRunner, adicione a interface mínima necessária (métodos mockados: dispatchHook, getHookLog). Para o error handling do MCP Server, defina o contrato: erros devem retornar JSON com campos "error", "code" e "retryable". Para onStateChange, confirme que a solução é PreToolUse + PostToolUse conforme o GREENFORGE_DESIGN.md.
```

---

**5. `safeResolve` no documento 09-hardening usa `allowedRoot` sem `realpath` prévio — vulnerabilidade no próprio contrato de segurança (Critério 6)**
O código de exemplo em `09-hardening-deterministic-contracts.md` chama `path.resolve(allowedRoot, inputPath)` e depois `fs.realpath(absolutePath)`, mas não aplica `realpath` no próprio `allowedRoot` antes da comparação de prefixo. Se `allowedRoot` for um symlink, a comparação `realPath.startsWith(allowedRoot)` pode falhar ou ser bypassada. O contrato de segurança deve ser inviolável para servir de base aos testes.

**Comando de correção:**
```
No arquivo 09-hardening-deterministic-contracts.md, na função safeResolve, adicione uma linha no início do corpo da função para resolver o próprio allowedRoot: "const resolvedRoot = await fs.realpath(allowedRoot);" e substitua todas as comparações subsequentes que usam "allowedRoot" por "resolvedRoot". Isso garante que symlinks no root não burlam a validação de prefixo.
```

---

**6. Tabela de rastreabilidade no `GREENFORGE_DESIGN.md` não cobre RF-03.4 (auto-cleanup) nem RNF-02 (persistência WAL) — lacuna na rastreabilidade (Critério 5)**
A tabela de rastreabilidade da Parte 9 do `GREENFORGE_DESIGN.md` lista RF-01 a RF-09 e RNF-01 a RNF-05, mas não inclui RF-03.4 (auto-cleanup de worktrees após deprovision) nem RNF-02 (modo WAL do SQLite), que estão definidos em `02-functional-requirements.md`. Sem mapeamento, esses requisitos ficam sem arquivo de teste associado.

**Comando de correção:**
```
No arquivo GREENFORGE_DESIGN.md, na tabela de rastreabilidade da Parte 9, adicione duas linhas: uma para RF-03.4 com critério "Após deprovision(), git worktree list não deve conter o path removido" e arquivo de teste "worktree.test.ts"; e uma para RNF-02 com critério "PRAGMA journal_mode retorna WAL após inicialização" e arquivo de teste "handoff.test.ts".
```

---

Esses 6 pontos são suficientes para bloquear o início do TDD. Após corrigidos, a documentação estará pronta para o primeiro `router.test.ts` falhando. Os demais documentos (`GREENFORGE_DESIGN.md`, `03-technical-spec-and-data.md`, `09-hardening`, `06-api-and-extensibility`) estão bem especificados e consistentes entre si.