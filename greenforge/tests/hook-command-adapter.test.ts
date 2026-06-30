import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));

function createTempProject(): string {
  const dir = join(tmpdir(), `greenforge-hook-adapter-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(dir, '.git'), { recursive: true });
  return dir;
}

function cleanupDir(dir: string) {
  try { rmSync(dir, { recursive: true, force: true }); } catch {}
}

describe('Fase 20 — HookCommandAdapter', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempProject();
  });

  afterEach(() => {
    cleanupDir(tempDir);
  });

  // ===========================================
  // A. Mapeamento de hooks
  // ===========================================
  describe('A. Hook mapping to handlers', () => {
    it('1. HookCommandAdapter maps SessionStart to handleSessionStart', async () => {
      const { HookCommandAdapter } = await import('../src/integration/qwen/HookCommandAdapter.js');
      const adapter = new HookCommandAdapter({ projectRoot: tempDir });

      const handler = adapter.getHookHandler();
      const spy = vi.spyOn(handler, 'handleSessionStart').mockResolvedValue({ 
        ok: true, action: 'ALLOW', reason: 'test' 
      });

      await (adapter as any).processHook('SessionStart', {});
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('2. HookCommandAdapter maps UserPromptSubmit to handleUserPromptSubmit', async () => {
      const { HookCommandAdapter } = await import('../src/integration/qwen/HookCommandAdapter.js');
      const adapter = new HookCommandAdapter({ projectRoot: tempDir });

      const handler = adapter.getHookHandler();
      const spy = vi.spyOn(handler, 'handleUserPromptSubmit').mockResolvedValue({ 
        ok: true, action: 'ALLOW', reason: 'test' 
      });

      await (adapter as any).processHook('UserPromptSubmit', { prompt: 'test' });
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('3. HookCommandAdapter maps PreToolUse to handlePreToolUse', async () => {
      const { HookCommandAdapter } = await import('../src/integration/qwen/HookCommandAdapter.js');
      const adapter = new HookCommandAdapter({ projectRoot: tempDir });

      const handler = adapter.getHookHandler();
      const spy = vi.spyOn(handler, 'handlePreToolUse').mockReturnValue({ 
        ok: true, action: 'ALLOW', reason: 'test' 
      });

      await (adapter as any).processHook('PreToolUse', { tool: 'Write', path: 'file.ts' });
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('4. HookCommandAdapter maps PostToolUse to handlePostToolUse', async () => {
      const { HookCommandAdapter } = await import('../src/integration/qwen/HookCommandAdapter.js');
      const adapter = new HookCommandAdapter({ projectRoot: tempDir });

      const handler = adapter.getHookHandler();
      const spy = vi.spyOn(handler, 'handlePostToolUse').mockReturnValue({ 
        ok: true, action: 'ALLOW', reason: 'test' 
      });

      await (adapter as any).processHook('PostToolUse', {});
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('5. HookCommandAdapter maps SessionEnd to handleSessionEnd', async () => {
      const { HookCommandAdapter } = await import('../src/integration/qwen/HookCommandAdapter.js');
      const adapter = new HookCommandAdapter({ projectRoot: tempDir });

      const handler = adapter.getHookHandler();
      const spy = vi.spyOn(handler, 'handleSessionEnd').mockReturnValue({ 
        ok: true, action: 'ALLOW', reason: 'test' 
      });

      await (adapter as any).processHook('SessionEnd', {});
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('6. HookCommandAdapter maps SubagentStart adequately', async () => {
      const { HookCommandAdapter } = await import('../src/integration/qwen/HookCommandAdapter.js');
      const adapter = new HookCommandAdapter({ projectRoot: tempDir });
      const result = await (adapter as any).processHook('SubagentStart', {});
      expect(result).toBeDefined();
    });

    it('7. HookCommandAdapter maps SubagentStop adequately', async () => {
      const { HookCommandAdapter } = await import('../src/integration/qwen/HookCommandAdapter.js');
      const adapter = new HookCommandAdapter({ projectRoot: tempDir });
      const result = await (adapter as any).processHook('SubagentStop', {});
      expect(result).toBeDefined();
    });
  });

  // ===========================================
  // B. Formatos de saída
  // ===========================================
  describe('B. Output formats', () => {
    it('8. Output of PreToolUse has hookSpecificOutput.decision with behavior', async () => {
      const { HookCommandAdapter } = await import('../src/integration/qwen/HookCommandAdapter.js');
      const adapter = new HookCommandAdapter({ projectRoot: tempDir });

      const handler = adapter.getHookHandler();
      vi.spyOn(handler, 'handlePreToolUse').mockReturnValue({ 
        ok: true, action: 'ALLOW', reason: 'allowed' 
      });

      const output = await (adapter as any).processHook('PreToolUse', { 
        tool: 'Write', path: 'a.ts', allowedRoot: tempDir 
      });
      
      expect(output).toHaveProperty('hookSpecificOutput');
      expect(output.hookSpecificOutput).toHaveProperty('decision');
      expect(output.hookSpecificOutput.decision.behavior).toBe('allow');
    });

    it('9. Output of UserPromptSubmit has hookSpecificOutput.decision format', async () => {
      const { HookCommandAdapter } = await import('../src/integration/qwen/HookCommandAdapter.js');
      const adapter = new HookCommandAdapter({ projectRoot: tempDir });

      const handler = adapter.getHookHandler();
      vi.spyOn(handler, 'handleUserPromptSubmit').mockResolvedValue({ 
        ok: true, action: 'ALLOW', reason: 'dev task' 
      });

      const output = await (adapter as any).processHook('UserPromptSubmit', { prompt: 'create login' });
      expect(output.hookSpecificOutput?.decision?.behavior).toBeDefined();
    });

    it('10. Output of SessionStart has simple ok/action/reason format', async () => {
      const { HookCommandAdapter } = await import('../src/integration/qwen/HookCommandAdapter.js');
      const adapter = new HookCommandAdapter({ projectRoot: tempDir });

      const handler = adapter.getHookHandler();
      vi.spyOn(handler, 'handleSessionStart').mockResolvedValue({ 
        ok: true, action: 'ALLOW', reason: 'initialized' 
      });

      const output = await (adapter as any).processHook('SessionStart', {});
      expect(output).toHaveProperty('ok');
      expect(output).toHaveProperty('action');
      expect(output).toHaveProperty('reason');
    });
  });

  // ===========================================
  // C. Exit codes and error handling
  // ===========================================
  describe('C. Exit codes and malformed payloads', () => {
    it('11. Malformed payload in PreToolUse returns deny fallback (secure)', async () => {
      const { HookCommandAdapter } = await import('../src/integration/qwen/HookCommandAdapter.js');
      const adapter = new HookCommandAdapter({ projectRoot: tempDir });

      const output = await (adapter as any).processHook('PreToolUse', 'not-json');
      expect(output.hookSpecificOutput?.decision?.behavior).toBe('deny');
    });

    it('12. Malformed payload in SessionStart returns allow (safe fallback)', async () => {
      const { HookCommandAdapter } = await import('../src/integration/qwen/HookCommandAdapter.js');
      const adapter = new HookCommandAdapter({ projectRoot: tempDir });

      const output = await (adapter as any).processHook('SessionStart', null);
      expect(output.ok).toBe(true);
      expect(output.action).toBe('ALLOW');
    });

    it('13. Unknown hook returns error and lists valid hooks', async () => {
      const { HookCommandAdapter } = await import('../src/integration/qwen/HookCommandAdapter.js');
      const adapter = new HookCommandAdapter({ projectRoot: tempDir });

      const output = await (adapter as any).processHook('InvalidHook', {});
      expect(output.error).toBeDefined();
      expect(output.validHooks).toContain('SessionStart');
      expect(output.validHooks).toContain('PreToolUse');
    });

    it('14. Stdout contains only JSON (no logs) - tested via processHook returning clean object', async () => {
      const { HookCommandAdapter } = await import('../src/integration/qwen/HookCommandAdapter.js');
      const adapter = new HookCommandAdapter({ projectRoot: tempDir });

      const handler = adapter.getHookHandler();
      vi.spyOn(handler, 'handleSessionStart').mockResolvedValue({ 
        ok: true, action: 'ALLOW', reason: 'ok' 
      });

      const output = await (adapter as any).processHook('SessionStart', {});
      const json = JSON.stringify(output);
      expect(() => JSON.parse(json)).not.toThrow();
      expect(json).not.toMatch(/console|log|error/i);
    });
  });

  // ===========================================
  // D. CLI execution simulation
  // ===========================================
  describe('D. CLI execution simulation', () => {
    it('15. HookCommandAdapter handles full flow for blocking hook (via class)', async () => {
      const { HookCommandAdapter } = await import('../src/integration/qwen/HookCommandAdapter.js');
      const adapter = new HookCommandAdapter({ projectRoot: tempDir });

      const handler = adapter.getHookHandler();
      vi.spyOn(handler, 'handlePreToolUse').mockReturnValue({ 
        ok: true, action: 'ALLOW', reason: 'inside worktree' 
      });

      const result = await adapter.executeHook('PreToolUse', JSON.stringify({ 
        tool: 'Write', path: 'src/app.ts', allowedRoot: tempDir 
      }));
      
      expect(result).toHaveProperty('hookSpecificOutput');
      expect(result.hookSpecificOutput.decision.behavior).toBe('allow');
    });
  });
});
