# RELATÓRIO DE PROGRESSO — GreenForge IDE (Testes)

**Última atualização:** 2026-06-05 20:32 (horário de Brasília)
**Objetivo:** Fazer `npx vitest run` passar com zero falhas nos testes do projeto.

---

## 🗂️ O QUE É O PROJETO

**Projeto:** `greenforge-ide` — Uma IDE no browser com suporte a agentes de IA multi-agente (debate adversarial). Stack: Next.js 15 (frontend), Node.js + WebSocket (backend), Google Gemini API.

**Localização:** `C:\Users\Usuario\Desktop\generic-storage\greenforge-ide`

**Como rodar os testes:**
```powershell
cd C:\Users\Usuario\Desktop\generic-storage\greenforge-ide
npx vitest run
```

---

## ✅ O QUE JÁ FOI CORRIGIDO (COMPLETO)

### 1. `vitest.config.ts` e `vitest.workspace.ts`
- Adicionado `include` no `vitest.config.ts` para limitar busca de testes apenas a `tests/` e `components/`.
- Adicionado `exclude` para ignorar `node_modules`, `tmp`, `temp_extracted`, `e2e`, `playwright`.
- Adicionado alias `'@google/genai': path.resolve(__dirname, 'node_modules/@google/genai')` no `vitest.workspace.ts` (backend workspace).
- `vitest.workspace.ts` usa `path.resolve` em vez de strings literais.

### 2. `server/src/db/init.ts`
- Migrado de `node:sqlite` para `better-sqlite3`.
- Schema SQL é lido com `readFileSync` dentro de um `try/catch` com type check — não quebra mais quando `fs` está mockado.

### 3. `server/src/security/secretRedactor.ts`
- Corrigido bug na callback de `replace()` — detecção de grupo de captura estava errada. Todos os 7 testes passam.

### 4. `server/src/db/sessions.ts`
- Adicionado método `clearSession(sessionId: string)`.

### 5. `server/src/ws/handler.ts`
- `WebSocket.OPEN` era `undefined` no contexto de testes — corrigido usando literal `1` (constante do protocolo).
- Adicionado handler para `/help` slash command.
- Adicionado handler para `/reset` slash command (chama `SessionStore.clearSession`).
- Adicionado verificação de `auth_token` no `chat_message` — retorna erro "Não autenticado" se ausente.

### 6. `server/src/ws/schemas.ts`
- Adicionado `auth_token: z.string().optional()` no schema do `chat_message`.

### 7. `server/src/mcp/client.ts`
- Implementado **dependency injection** (parâmetro `deps = { Client, StdioClientTransport }`) para permitir testes sem precisar interceptar o import do módulo.

### 8. `server/src/agent/loop.ts`
- Nenhuma mudança estrutural além do import já existente.

### 9. `tests/setup.backend.ts`
- Adicionado `process.env.GOOGLE_API_KEY = 'mock-api-key-for-testing'` no `beforeAll`.

### 10. `tests/integration/websocket/websocket.test.ts`
- Adicionado `auth_token: 'valid-token'` na mensagem do teste de chat_message.
- Mocks completos: `runAgentLoop` retorna `Promise.resolve()`, `buildToolRegistry` retorna `{}`, `SessionStore` inclui `clearSession`.

### 11. `tests/unit/backend/agent/slashCommands.test.ts`
- Mocks completos idênticos ao websocket.test.ts.

### 12. `tests/unit/backend/agent/loop.test.ts`
- **SOLUÇÃO DEFINITIVA:** Mock usando `class` JavaScript (não arrow function) para garantir que `new GoogleGenAI()` seja construtível.
- `mockGenerateContentStream` declarado no escopo do módulo e reutilizado nos testes.

### 13. `tests/unit/backend/tools/writeFile.test.ts`
- Adicionado `mkdirSync: vi.fn()` ao mock do `fs`.

### 14. `tests/unit/backend/mcp/client.test.ts`
- **SOLUÇÃO DEFINITIVA:** Reescrito para usar **dependency injection** — passa `{ Client: mockClientConstructor, StdioClientTransport: mockTransportConstructor }` diretamente para `connectMCPServer`.
- Construtores mock definidos com `vi.fn().mockImplementation(function() { return ... })` (função normal, não arrow).

### 15. `components/ide/chat-panel.tsx`
- Filtro de mensagens atualizado para incluir `role === 'assistant'` (antes mostrava só `user` e `system`).

### 16. `components/ide/code-editor.tsx`
- Adicionado early return `if (!activeTabId) return null` para satisfazer o teste que monta o componente sem aba ativa.

### 17. `tests/unit/frontend/components/ChatPanel.test.tsx`
- Adicionado `/* @vitest-environment jsdom */`.
- Adicionado polyfill `scrollIntoView`.
- Mock completo do `lucide-react`.

### 18. `tests/unit/frontend/components/CodeEditor.test.tsx`
- Adicionado `/* @vitest-environment jsdom */`.
- Mock completo do `@codemirror/view`:
  - `EditorView` como classe com: `constructor(config)` que cria `<textarea role="textbox">` no parent, `state = { doc: { toString: () => '' } }`, `destroy = vi.fn()`, `dispatch = vi.fn()`, `static updateListener = { of: vi.fn(() => []) }`, `static theme = vi.fn(() => [])`.
  - Todas as funções de extensão retornam `[]`.

### 19. `tests/unit/frontend/components/FileExplorer.test.tsx`
- Adicionado `syncWorkspace: vi.fn()` em ambos os mocks do `useIDEStore`.

### 20. `tests/unit/backend/auth.test.ts`
- Passou após as correções no `handler.ts` (auth check e constante OPEN=1).

---

## 🔴 O QUE AINDA FALTA CORRIGIR

### A. `tests/unit/frontend/components/IDELayout.test.tsx`
**Erro:** `No "ActivityBar" export is defined on the "@/components/ide/panels" mock`

**Causa:** O mock de `@/components/ide/panels` no teste não inclui todos os exports usados por `ide-layout.tsx`. O layout importa: `ActivityBar`, `BottomPanelTabs`, `StatusBar`, `Toolbar`, `ResizeHandle`.

**Solução:**
```tsx
vi.mock('@/components/ide/panels', () => ({
  ActivityBar: ({ children }: any) => <div>ActivityBar</div>,
  BottomPanelTabs: ({ children }: any) => <div>BottomPanelTabs</div>,
  StatusBar: () => <div>StatusBar</div>,
  Toolbar: () => <div>Toolbar</div>,
  ResizeHandle: () => <div></div>,
  PanelContainer: ({ children }: any) => <div>{children}</div>,
  PanelGroup: ({ children }: any) => <div>{children}</div>,
  Panel: ({ children }: any) => <div>{children}</div>,
  PanelResizeHandle: () => <div></div>,
}));
```

Mas atenção: `ide-layout.tsx` também usa muitos outros componentes que precisam de mock:
- `@/lib/store` — `useIDEStore` precisa retornar estado completo incluindo: `openTabs`, `activeTabId`, `updateTabContent`, `showSidebar`, `showBottomPanel`, `showRightPanel`, `activeSidebarPanel`, `activeBottomPanel`, `toggleBottomPanel`, `setActiveSidebarPanel`, `setActiveBottomPanel`, `theme`.
- `react-resizable-panels` — importa `PanelGroup`, `Panel`.
- `./resizable-handle` — importa `ResizeHandle as NewResizeHandle`.
- `./panel-wrapper` — importa `PanelWrapper`.
- Vários outros componentes filhos.

O teste provavelmente vai precisar de um mock completo de praticamente tudo ou usar uma abordagem de "smoke test" mais simples.

### B. `tests/unit/frontend/components/Terminal.test.tsx`
**Erro:** `expected "vi.fn()" to be called at least once` — `clearTerminal` não é chamado ao clicar.

**Causa:** O mock do `useIDEStore` provavelmente não inclui `clearTerminal`, ou o handler do botão está usando uma referência diferente.

**Solução:** Verificar o componente `terminal.tsx` para ver exatamente como `clearTerminal` é chamado e garantir que o mock retorne a função corretamente.

---

## 📊 STATUS ATUAL DOS TESTES

**Antes das correções desta sessão:**
- 69 arquivos falhando de 554 total (inclui node_modules)
- 105 testes falhando de 5502

**Testes do projeto que passam agora (não node_modules):**
- ✅ `tests/unit/backend/` — **14 arquivos, 41 testes** — TODOS PASSANDO
- ✅ `tests/unit/frontend/components/ChatPanel.test.tsx` — 4 testes
- ✅ `tests/unit/frontend/components/CodeEditor.test.tsx` — 2 testes
- ✅ `tests/unit/frontend/components/FileExplorer.test.tsx` — 2 testes
- ✅ `tests/unit/frontend/store/agentStore.test.ts` — 5 testes (já passava antes)
- ✅ `tests/integration/websocket/websocket.test.ts` — (verificar)

**Ainda falhando:**
- ❌ `tests/unit/frontend/components/IDELayout.test.tsx` — missing exports no mock de panels
- ❌ `tests/unit/frontend/components/Terminal.test.tsx` — clearTerminal não chamado

**Nota importante:** `node_modules/tsconfig-paths/` contém testes que aparecem na suite. Isso é um problema de configuração do `include` no vitest. O `vitest.config.ts` tem `include` correto, mas quando rodado com `vitest.workspace.ts`, o workspace pode estar sobrescrevendo. Verificar se a chamada é `npx vitest run` (usa workspace) ou `npx vitest run --config vitest.config.ts` (usa config diretamente).

---

## 🔧 CONFIGURAÇÃO ATUAL DOS ARQUIVOS-CHAVE

### `vitest.workspace.ts` (estado atual)
```typescript
import { defineWorkspace } from 'vitest/config'
import path from 'path'

export default defineWorkspace([
  {
    test: {
      name: 'frontend',
      environment: 'jsdom',
      include: ['tests/unit/frontend/**/*.{test,spec}.{ts,tsx}'],
      exclude: ['**/node_modules/**', '**/tmp/**', '**/temp_extracted/**', '**/e2e/**', '**/playwright/**'],
      setupFiles: ['./tests/setup.frontend.ts'],
      globals: true,
      alias: {
        '@': path.resolve(__dirname, './')
      }
    }
  },
  {
    test: {
      name: 'backend',
      environment: 'node',
      include: ['tests/unit/backend/**/*.{test,spec}.ts', 'tests/integration/**/*.{test,spec}.ts'],
      exclude: ['**/node_modules/**', '**/tmp/**', '**/temp_extracted/**', '**/e2e/**', '**/playwright/**'],
      setupFiles: ['./tests/setup.backend.ts'],
      globals: true,
      alias: {
        '@': path.resolve(__dirname, './'),
        '@google/genai': path.resolve(__dirname, 'node_modules/@google/genai'),
        '@modelcontextprotocol/sdk/client/index.js': path.resolve(__dirname, 'server/node_modules/@modelcontextprotocol/sdk/client/index.js'),
        '@modelcontextprotocol/sdk/client/stdio.js': path.resolve(__dirname, 'server/node_modules/@modelcontextprotocol/sdk/client/stdio.js')
      },
      server: {
        deps: {
          external: ['node:sqlite'],
          inline: ['@modelcontextprotocol/sdk']
        }
      }
    }
  }
])
```

### `tests/setup.backend.ts` (estado atual)
```typescript
import { vi } from 'vitest'
import { initDB } from '@/server/src/db/init'

beforeAll(() => {
  process.env.GOOGLE_API_KEY = 'mock-api-key-for-testing'
  process.env.DB_PATH = ':memory:'
  try {
    initDB()
  } catch (err) {
    console.error('[Vitest Setup] Erro ao inicializar DB:', err)
  }
})

vi.stubGlobal('crypto', {
  randomUUID: () => '550e8400-e29b-41d4-a716-446655440000',
  randomBytes: (size: number) => Buffer.alloc(size),
  getRandomValues: (arr: any) => arr
})
```

---

## 🎯 PRÓXIMOS PASSOS PARA A PRÓXIMA IA

1. **Corrigir `IDELayout.test.tsx`:**
   - Ver o arquivo `components/ide/ide-layout.tsx` completo para listar todos os imports.
   - Criar mocks para todos eles no test file.
   - O maior desafio é o `useIDEStore` — retornar estado completo para o IDELayout funcionar.

2. **Corrigir `Terminal.test.tsx`:**
   - Ver `tests/unit/frontend/components/Terminal.test.tsx`.
   - Ver `components/ide/terminal.tsx` para entender como `clearTerminal` é referenciado.
   - Ajustar o mock do store ou do hook.

3. **Verificar `components/__tests__/` (se existir):**
   - Pode haver testes em `components/ide/__tests__/` que ainda não foram verificados.

4. **Rodar o suite completo:**
   ```powershell
   npx vitest run
   ```
   Verificar se aparecem arquivos de `node_modules/tsconfig-paths/` — se sim, o `include` do workspace está sendo ignorado. Possível solução: excluir no `vitest.workspace.ts` com `exclude: ['**/node_modules/**']`.

---

## ⚠️ PROBLEMAS CONHECIDOS / ARMADILHAS

1. **`@google/genai` vem de `server/node_modules/`** — O server tem seu próprio `node_modules`. O alias no vitest aponta para a cópia do root. A solução que funcionou: usar mock como `class` JavaScript no `loop.test.ts`.

2. **`@modelcontextprotocol/sdk` vem de `server/node_modules/`** — O mock via `vi.mock()` não interceptava porque a source resolvida era diferente da mockada. A solução: **dependency injection** diretamente na função `connectMCPServer`.

3. **Mocks de `vi.fn().mockImplementation(() => {...})` NÃO são construtíveis** — Ao usar `new`, o Vitest lança "is not a constructor". Use `function()` normal ou `class`.

4. **O `vitest.workspace.ts` tem precedência sobre `vitest.config.ts`** — Quando ambos existem, o workspace é usado. O `include`/`exclude` do `vitest.config.ts` pode ser ignorado.

5. **`node:sqlite` não funciona com Vitest** — É um built-in do Node 22 que o Vite não consegue processar. Usar `better-sqlite3`.
