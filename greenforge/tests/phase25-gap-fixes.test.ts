import { describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { QwenRouter } from '../src/infrastructure/llm/QwenRouter.js';
import { LLMProvider } from '../src/core/ports/LLMProvider.js';
import { QwenExtensionRuntime } from '../src/integration/qwen/QwenExtensionRuntime.js';
import { QwenHookHandler } from '../src/integration/qwen/QwenHookHandler.js';
import { HookCommandAdapter } from '../src/integration/qwen/HookCommandAdapter.js';
import { QwenCommandHandler } from '../src/integration/qwen/QwenCommandHandler.js';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));

describe('Fase 25 gap fixes — real Qwen CLI blockers', () => {
  it('QwenExtensionRuntime can opt into real LiteLLM providers from environment without network on construction', () => {
    const originalEnv = {
      NODE_ENV: process.env.NODE_ENV,
      GREENFORGE_USE_REAL_LITELLM: process.env.GREENFORGE_USE_REAL_LITELLM,
      GREENFORGE_LITELLM_LARGE_URL: process.env.GREENFORGE_LITELLM_LARGE_URL,
      GREENFORGE_LITELLM_SMALL_URL: process.env.GREENFORGE_LITELLM_SMALL_URL,
      GREENFORGE_LITELLM_LARGE_MODEL: process.env.GREENFORGE_LITELLM_LARGE_MODEL,
      GREENFORGE_LITELLM_SMALL_MODEL: process.env.GREENFORGE_LITELLM_SMALL_MODEL,
    };

    process.env.NODE_ENV = 'production';
    process.env.GREENFORGE_USE_REAL_LITELLM = 'true';
    process.env.GREENFORGE_LITELLM_LARGE_URL = 'http://localhost:4000';
    process.env.GREENFORGE_LITELLM_SMALL_URL = 'http://localhost:4001';
    process.env.GREENFORGE_LITELLM_LARGE_MODEL = 'meu-pool';
    process.env.GREENFORGE_LITELLM_SMALL_MODEL = 'meu-pool';

    try {
      const runtime = new QwenExtensionRuntime({ projectRoot });
      expect(runtime.usesRealLLM()).toBe(true);
      expect(runtime.makesNetworkCalls()).toBe(true);
      runtime.cleanup();
    } finally {
      for (const [key, value] of Object.entries(originalEnv)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
  it('expands QwenRouter contract to classify writing, planning and research intents', async () => {
    const outputs = [
      JSON.stringify({ intention: 'WRITING_TASK', confidence: 0.94 }),
      JSON.stringify({ intention: 'PLANNING_TASK', confidence: 0.93 }),
      JSON.stringify({ intention: 'RESEARCH_TASK', confidence: 0.92 }),
    ];
    const llm: LLMProvider = { generate: async () => outputs.shift() ?? '' };
    const router = new QwenRouter(llm);

    await expect(router.classify('Escreva um capítulo de livro')).resolves.toBe('WRITING_TASK');
    await expect(router.classify('Planeje um negócio novo')).resolves.toBe('PLANNING_TASK');
    await expect(router.classify('Pesquise alternativas técnicas')).resolves.toBe('RESEARCH_TASK');
  });

  it('UserPromptSubmit directive tells Qwen CLI to call the MCP greenforge_start tool for development tasks', async () => {
    const runtime = new QwenExtensionRuntime({ projectRoot });
    const handler = new QwenHookHandler(runtime);

    const result = await handler.handleUserPromptSubmit({
      prompt: 'Crie uma página HTML simples',
      cwd: 'C:/Users/Usuario/Desktop/Nova Pasta',
    });

    expect(result.action).toBe('ALLOW');
    expect(result.reason).toContain('mcp__greenforge__greenforge_start');
    expect(result.metadata).toMatchObject({
      intent: 'DEVELOPMENT_TASK',
      suggestedTool: 'mcp__greenforge__greenforge_start',
      workspaceRoot: 'C:/Users/Usuario/Desktop/Nova Pasta',
    });
    runtime.cleanup();
  });

  it('HookCommandAdapter preserves the MCP tool directive in the blocking hook decision message', async () => {
    const adapter = new HookCommandAdapter({ projectRoot });

    const output = await adapter.processHook('UserPromptSubmit', {
      prompt: 'Implementar sistema de login',
      cwd: 'C:/tmp/app',
    });

    expect(output.hookSpecificOutput).toBeDefined();
    const decision = (output.hookSpecificOutput as { decision: { message: string } }).decision;
    expect(decision.message).toContain('mcp__greenforge__greenforge_start');
    expect(decision.message).toContain('C:/tmp/app');
    adapter.cleanup();
  });

  it('QwenCommandHandler can initialize git automatically for an explicit workspaceRoot', async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), 'greenforge-no-git-'));
    const runtime = new QwenExtensionRuntime({ projectRoot });
    const handler = new QwenCommandHandler(runtime);

    try {
      expect(existsSync(join(workspaceRoot, '.git'))).toBe(false);
      const result = await handler.handle('start', [
        'Criar página HTML',
        `--workspaceRoot=${workspaceRoot}`,
      ]);

      expect(result.ok).toBe(true);
      expect(existsSync(join(workspaceRoot, '.git'))).toBe(true);
      expect(result.data).toMatchObject({ workspaceRoot, gitInitialized: true });
    } finally {
      runtime.cleanup();
      await rm(workspaceRoot, { recursive: true, force: true });
    }
  });
});
