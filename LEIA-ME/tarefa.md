# TAREFA PARA A IA

Leia atentamente os dois arquivos na pasta `LEIA-ME`:
- `readme.md`: contém a descrição completa do sistema, arquitetura, estado atual e pendências.
- `tarefa.md`: este arquivo, que contém as instruções que você deve executar.

Depois de entender o projeto, siga rigorosamente os passos abaixo.

## Passo 1 – Localize a pasta do sistema
O código fonte completo está na pasta:
```
c:\Users\Usuario\Desktop\xgeneric-storage\greenforge-ide\
```
Essa é a raiz do projeto. Dentro dela estão o frontend (Next.js), o backend (Node.js) e a nova suíte de testes.

## Passo 2 – Execute a suíte de testes
Abra um terminal na raiz do projeto e execute:
```bash
npx vitest run
```
Anote todos os testes que falham. Haverá aproximadamente 111 falhas (isso é esperado). Cada falha representa um comportamento que o sistema ainda não implementou corretamente.

## Passo 3 – Corrija o sistema para fazer os testes passarem
Sua missão é **modificar o código fonte** (os arquivos reais do sistema, não os testes) até que **todos os testes fiquem verdes**.

**Regras obrigatórias:**
1. Não altere os arquivos de teste. Eles são o contrato.
2. Não remova nem desabilite testes. A meta é corrigir o sistema, não esconder falhas.
3. Trabalhe iterativamente: corrija uma falha por vez, rode os testes novamente, confirme que aquela falha sumiu, e só então passe para a próxima.
4. Priorize as falhas na seguinte ordem:
   - Segurança: `trustedFolders.test.ts`, `secretRedactor.test.ts`, `workspaceIsolation.test.ts`
   - Tratamento de erro: `apiKeyError.test.ts`
   - Backend: `websocket.test.ts`, `agentLoop.test.ts`, `persistence.test.ts`, `toolRegistry.test.ts`
   - Frontend: `store.test.ts`, `fileExplorer.test.tsx`, `terminal.test.tsx`, `chatPanel.test.tsx`
   - E2E (Playwright): `approvalFlow.spec.ts`, `terminal.spec.ts`, `importExport.spec.ts`

## Passo 4 – Relate o progresso
Ao final de cada correção significativa (ou a cada 3‑4 testes corrigidos), escreva uma mensagem clara contendo:
- Quantos testes ainda estão falhando.
- Quais os próximos testes que você vai atacar.
- Se encontrar alguma dependência faltante ou decisão de projeto que impeça a correção, descreva o problema e proponha uma solução.

## Passo 5 – Critério de conclusão
A tarefa estará **100% completa** quando o comando `npx vitest run` não apresentar nenhuma falha (todos os testes passando) e os testes E2E do Playwright também estiverem verdes.

A partir desse momento, o sistema GreenForge IDE estará confiável e pronto para ser usado.

**Não invente funcionalidades novas. Apenas faça o sistema existente se comportar conforme os testes exigem.**


Copie esse texto exato para dentro do `tarefa.md`. Depois, instrua a IA a começar dizendo: "Leia os dois arquivos na pasta LEIA-ME e execute a tarefa descrita." Ela vai entender e começar o trabalho.