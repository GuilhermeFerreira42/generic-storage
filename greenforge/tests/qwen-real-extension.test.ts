import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));

function createTempWorktree(): string {
  const dir = join(tmpdir(), `greenforge-phase14-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

// We'll import real modules after they exist
// For now, declare the interfaces we expect

interface ExtensionRuntimeOptions {
  projectRoot?: string;
  tempDir?: string;
}

interface HookHandlerResult {
  ok: boolean;
  action: 'ALLOW' | 'BLOCK' | 'NOOP';
  reason: string;
  metadata?: Record<string, unknown>;
}

interface CommandHandlerResult {
  ok: boolean;
  command: string;
  result: string;
  data?: unknown;
}

describe('Fase 14 — Qwen CLI Extension Real', () => {
  // ================================================================
  // A. Manifest / Settings / SKILL validation (real + schemas)
  // ================================================================
  describe('A. Manifest / Settings / SKILL validation', () => {
    it('1. runtime loads and validates qwen-extension.json', async () => {
      const { QwenExtensionRuntime } = await import('../src/integration/qwen/QwenExtensionRuntime.js');
      const runtime = new QwenExtensionRuntime({ projectRoot });

      const manifest = runtime.getManifest();
      expect(manifest).toBeDefined();
      expect(manifest.name).toBe('greenforge');
      expect(manifest.version).toBeTypeOf('string');
      expect(manifest.mcpServers).toBeDefined();
      expect(Object.keys(manifest.mcpServers).length).toBeGreaterThan(0);
    });

    it('2. runtime loads and validates .qwen/settings.json', async () => {
      const { QwenExtensionRuntime } = await import('../src/integration/qwen/QwenExtensionRuntime.js');
      const runtime = new QwenExtensionRuntime({ projectRoot });

      const settings = runtime.getSettings();
      expect(settings).toBeDefined();
      expect(settings.hooks).toBeDefined();
      expect(Object.keys(settings.hooks)).toEqual(
        expect.arrayContaining(['SessionStart', 'SessionEnd', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse'])
      );
    });

    it('3. runtime validates .qwen/skills/greenforge/SKILL.md', async () => {
      const { QwenExtensionRuntime } = await import('../src/integration/qwen/QwenExtensionRuntime.js');
      const runtime = new QwenExtensionRuntime({ projectRoot });

      const skill = runtime.getSkillManifest();
      expect(skill).toBeDefined();
      expect(skill.frontmatter.name).toBe('greenforge');
      expect(skill.body).toBeTruthy();
      // Commands must be listed
      for (const cmd of ['start', 'status', 'list', 'approve', 'abort']) {
        expect(skill.body).toMatch(new RegExp(`\\b${cmd}\\b`));
      }
    });

    it('4. no paths/configs contain markdown artifacts', async () => {
      const { QwenExtensionRuntime } = await import('../src/integration/qwen/QwenExtensionRuntime.js');
      const runtime = new QwenExtensionRuntime({ projectRoot });

      const manifest = runtime.getManifest();
      const settings = runtime.getSettings();

      const manifestPaths = [manifest.skills, manifest.contextFileName, manifest.hooks].filter(Boolean);
      for (const p of manifestPaths) {
        expect(p).not.toMatch(/[[\]()]/);
        expect(p).not.toMatch(/\]\(http/);
      }

      // Check that no hook URL has markdown artifacts
      const allUrls: string[] = [];
      for (const hookList of Object.values(settings.hooks)) {
        for (const binding of hookList) {
          for (const action of binding.hooks) {
            if (action.type === 'http' && action.url) {
              allUrls.push(action.url);
            }
          }
        }
      }
      for (const url of allUrls) {
        expect(url).not.toMatch(/[[\]()]/);
      }
    });
  });

  // ================================================================
  // B. Hooks reais
  // ================================================================
  describe('B. Hooks reais', () => {
    let tempDir: string;
    let hookHandler: any;
    let QwenHookHandler: any;
    let QwenExtensionRuntime: any;

    beforeEach(async () => {
      tempDir = createTempWorktree();
      const imports = await Promise.all([
        import('../src/integration/qwen/QwenExtensionRuntime.js'),
        import('../src/integration/qwen/QwenHookHandler.js'),
      ]);
      QwenExtensionRuntime = imports[0].QwenExtensionRuntime;
      QwenHookHandler = imports[1].QwenHookHandler;

      const runtime = new QwenExtensionRuntime({
        projectRoot,
        tempDir
      });
      hookHandler = new QwenHookHandler(runtime);
    });

    afterEach(() => {
      try {
        if (existsSync(tempDir)) {
          rmSync(tempDir, { recursive: true, force: true });
        }
      } catch {
        // ignore cleanup errors
      }
    });

    it('5. SessionStart validates environment/config and returns ALLOW when valid', async () => {
      const result = await hookHandler.handleSessionStart({});
      expect(result.ok).toBe(true);
      expect(result.action).toBe('ALLOW');
      expect(result.reason).toContain('initialized');
    });

    it('6. UserPromptSubmit uses real QwenRouter with mocked LLM', async () => {
      // QwenRouter is called with a MockLLMProvider inside the handler
      const result = await hookHandler.handleUserPromptSubmit({
        prompt: 'Create a new REST API endpoint'
      });
      expect(result.ok).toBe(true);
      expect(result.metadata?.intent).toBeDefined();
    });

    it('7. UserPromptSubmit returns NOOP for NORMAL_CHAT', async () => {
      const result = await hookHandler.handleUserPromptSubmit({
        prompt: 'How are you today?'
      });
      expect(result.action).toBe('NOOP');
      expect(result.reason).toContain('NORMAL_CHAT');
    });

    it('8. UserPromptSubmit initiates/routea GreenForge flow for technical task, not hardcoded success', async () => {
      const result = await hookHandler.handleUserPromptSubmit({
        prompt: 'Implement user authentication system'
      });
      // Should not be NOOP for a technical task
      expect(result.action).not.toBe('NOOP');
      expect(result.ok).toBe(true);
      // Should have intent metadata
      expect(result.metadata?.intent).toBeDefined();
    });

    it('9. PreToolUse allows operation inside allowedRoot', async () => {
      // Create a file inside tempDir to validate it exists
      const safePath = join(tempDir, 'src', 'index.ts');
      mkdirSync(join(tempDir, 'src'), { recursive: true });
      writeFileSync(safePath, 'test content');

      const result = await hookHandler.handlePreToolUse({
        tool: 'WriteFile',
        path: 'src/index.ts',
        allowedRoot: tempDir
      });
      expect(result.action).toBe('ALLOW');
    });

    it('10. PreToolUse blocks without allowedRoot', async () => {
      const result = await hookHandler.handlePreToolUse({
        tool: 'WriteFile',
        path: 'src/index.ts'
        // No allowedRoot
      });
      expect(result.action).toBe('BLOCK');
      expect(result.reason).toContain('allowedRoot');
    });

    it('11. PreToolUse blocks outside allowedRoot', async () => {
      const result = await hookHandler.handlePreToolUse({
        tool: 'Edit',
        path: '../../../etc/passwd',
        allowedRoot: tempDir
      });
      expect(result.action).toBe('BLOCK');
      expect(result.reason).toContain('outside');
    });

    it('12. PreToolUse blocks fake path containing "worktree" outside root', async () => {
      const result = await hookHandler.handlePreToolUse({
        tool: 'Bash',
        path: '/tmp/fake-worktree-but-not-real/evil.sh',
        allowedRoot: tempDir
      });
      expect(result.action).toBe('BLOCK');
      // Must NOT use string 'includes("worktree")' as security check
      // It must use path.resolve + path.relative
    });

    it('13. PostToolUse without taskId returns ALLOW with no-checkpoint reason', async () => {
      const result = await hookHandler.handlePostToolUse({
        tool: 'WriteFile',
        path: 'src/index.ts',
        result: { ok: true }
      });
      expect(result.ok).toBe(true);
      expect(result.action).toBe('ALLOW');
      expect(result.reason).toContain('No task context');
      expect(result.metadata?.checkpoint).toBeUndefined();
    });

    it('14. SessionEnd executes cleanup/resource closing when applicable', async () => {
      const result = await hookHandler.handleSessionEnd({});
      expect(result.ok).toBe(true);
      expect(result.action).toBe('ALLOW');
      expect(result.reason).toContain('leanup');
    });
  });

  // ================================================================
  // C. Commands of the extension
  // ================================================================
  describe('C. Commands of the extension', () => {
    let tempDir: string;
    let commandHandler: any;
    let QwenCommandHandler: any;
    let QwenExtensionRuntime: any;

    beforeEach(async () => {
      tempDir = createTempWorktree();
      const imports = await Promise.all([
        import('../src/integration/qwen/QwenExtensionRuntime.js'),
        import('../src/integration/qwen/QwenCommandHandler.js'),
      ]);
      QwenExtensionRuntime = imports[0].QwenExtensionRuntime;
      QwenCommandHandler = imports[1].QwenCommandHandler;

      const runtime = new QwenExtensionRuntime({
        projectRoot,
        tempDir
      });
      commandHandler = new QwenCommandHandler(runtime);
    });

    afterEach(() => {
      try {
        if (existsSync(tempDir)) {
          rmSync(tempDir, { recursive: true, force: true });
        }
      } catch {
        // ignore cleanup errors
      }
    });

    it('15. every command declared in manifest/SKILL has a handler', async () => {
      const declaredCommands = ['start', 'status', 'list', 'approve', 'abort'];

      for (const cmd of declaredCommands) {
        const hasHandler = commandHandler.hasHandler(cmd);
        expect(hasHandler).toBe(true);
      }
    });

    it('16. plan command (start) calls PlannerEngine or real equivalent flow', async () => {
      const result = await commandHandler.handle('start', ['Implement login page']);
      expect(result.ok).toBe(true);
      // Should have created a plan or task
      expect(result.data).toBeDefined();
    });

    it('17. approve command calls Orchestrator or real equivalent flow', async () => {
      // First create a plan
      const planResult = await commandHandler.handle('start', ['Test task for approval']);
      expect(planResult.ok).toBe(true);
      const taskId = planResult.data?.taskId as string;
      expect(taskId).toBeDefined();

      // Now approve it
      const result = await commandHandler.handle('approve', [taskId]);
      expect(result.ok).toBe(true);
      expect(result.data?.status).toBeDefined();
    });

    it('18. status command queries real state from repository or runtime', async () => {
      const result = await commandHandler.handle('status', []);
      expect(result.ok).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('19. unknown command returns structured error, not silent success', async () => {
      const result = await commandHandler.handle('nonexistent-command', []);
      expect(result.ok).toBe(false);
      expect(result.result).toContain('nknown');
    });
  });

  // ================================================================
  // D. Isolation
  // ================================================================
  describe('D. Isolation guarantees', () => {
    it('20. tests do not call Qwen real', async () => {
      const { QwenExtensionRuntime } = await import('../src/integration/qwen/QwenExtensionRuntime.js');
      const runtime = new QwenExtensionRuntime({ projectRoot, tempDir: createTempWorktree() });
      // Runtime uses MockLLMProvider internally, never real Qwen
      expect(runtime.usesRealQwen()).toBe(false);
    });

    it('21. tests do not call MCP real', async () => {
      const { QwenExtensionRuntime } = await import('../src/integration/qwen/QwenExtensionRuntime.js');
      const runtime = new QwenExtensionRuntime({ projectRoot, tempDir: createTempWorktree() });
      expect(runtime.usesRealMCP()).toBe(false);
    });

    it('22. tests do not call LLM real', async () => {
      const { QwenExtensionRuntime } = await import('../src/integration/qwen/QwenExtensionRuntime.js');
      const runtime = new QwenExtensionRuntime({ projectRoot, tempDir: createTempWorktree() });
      expect(runtime.usesRealLLM()).toBe(false);
    });

    it('23. tests do not make network calls', async () => {
      const { QwenExtensionRuntime } = await import('../src/integration/qwen/QwenExtensionRuntime.js');
      const runtime = new QwenExtensionRuntime({ projectRoot, tempDir: createTempWorktree() });
      expect(runtime.makesNetworkCalls()).toBe(false);
    });

    it('24. tests do not do merge/push', async () => {
      const { QwenExtensionRuntime } = await import('../src/integration/qwen/QwenExtensionRuntime.js');
      const runtime = new QwenExtensionRuntime({ projectRoot, tempDir: createTempWorktree() });
      expect(runtime.canDoDestructiveGitOps()).toBe(false);
    });

    it('25. tests clean up temporary directories', async () => {
      const testDir = createTempWorktree();
      const { QwenExtensionRuntime } = await import('../src/integration/qwen/QwenExtensionRuntime.js');
      const runtime = new QwenExtensionRuntime({ projectRoot, tempDir: testDir });

      // Use runtime which creates resources in tempDir
      runtime.initialize();

      // Verify tempDir was used
      const wasUsed = existsSync(testDir);

      // Cleanup
      runtime.cleanup();

      // After cleanup, db resources should be closed
      expect(runtime.isClosed()).toBe(true);

      // Clean up our test dir
      if (wasUsed && existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
    });

    it('26. no test depends on permanent global state', async () => {
      const { QwenExtensionRuntime } = await import('../src/integration/qwen/QwenExtensionRuntime.js');
      // Each runtime is self-contained with its own tempDir
      const runtime1 = new QwenExtensionRuntime({ projectRoot, tempDir: createTempWorktree() });
      const runtime2 = new QwenExtensionRuntime({ projectRoot, tempDir: createTempWorktree() });

      // They should be independent
      expect(runtime1.getTempDir()).not.toBe(runtime2.getTempDir());

      runtime1.cleanup();
      runtime2.cleanup();
    });
  });

  // ================================================================
  // E. Contracts and schemas
  // ================================================================
  describe('E. Contracts and schemas', () => {
    it('27. runtime types use Zod validation for inputs/outputs', async () => {
      const { RuntimeOptionsSchema } = await import('../src/integration/qwen/runtimeTypes.js');
      expect(RuntimeOptionsSchema).toBeDefined();

      // Valid options should pass
      const valid = RuntimeOptionsSchema.safeParse({ projectRoot, tempDir: createTempWorktree() });
      expect(valid.success).toBe(true);

      // Invalid options should fail
      const invalid = RuntimeOptionsSchema.safeParse({});
      expect(invalid.success).toBe(false);
    });

    it('28. handler results match HookHandlerResult schema', async () => {
      const { HookHandlerResultSchema } = await import('../src/integration/qwen/runtimeTypes.js');

      const validResult = {
        ok: true,
        action: 'ALLOW',
        reason: 'test'
      };
      expect(HookHandlerResultSchema.safeParse(validResult).success).toBe(true);

      const invalidResult = {
        ok: 'not-boolean',
        action: 'INVALID'
      };
      expect(HookHandlerResultSchema.safeParse(invalidResult).success).toBe(false);
    });

    it('29. existing Fase 13 contracts are not broken', async () => {
      // Fase 13 types should still be importable and valid
      const { HookSimulationInputSchema, HookSimulationResultSchema } = await import('../src/integration/qwen/types.js');

      const validInput = HookSimulationInputSchema.safeParse({
        event: 'SessionStart',
        payload: {}
      });
      expect(validInput.success).toBe(true);

      const validResult = HookSimulationResultSchema.safeParse({
        ok: true,
        event: 'SessionStart',
        action: 'ALLOW',
        reason: 'test'
      });
      expect(validResult.success).toBe(true);
    });
  });

  // ================================================================
  // F. Blocker fixes (Phase 14 review)
  // ================================================================
  describe('F. Settings Dispatcher — hooks declared in settings dispatch to real handlers', () => {
    let tempDir: string;
    let dispatcher: any;
    let QwenSettingsDispatcher: any;
    let QwenExtensionRuntime: any;

    beforeEach(async () => {
      tempDir = createTempWorktree();
      const imports = await Promise.all([
        import('../src/integration/qwen/QwenExtensionRuntime.js'),
        import('../src/integration/qwen/QwenSettingsDispatcher.js'),
      ]);
      QwenExtensionRuntime = imports[0].QwenExtensionRuntime;
      QwenSettingsDispatcher = imports[1].QwenSettingsDispatcher;

      const runtime = new QwenExtensionRuntime({ projectRoot, tempDir });
      dispatcher = new QwenSettingsDispatcher(runtime);
    });

    afterEach(() => {
      try {
        if (existsSync(tempDir)) rmSync(tempDir, { recursive: true, force: true });
      } catch { /* ignore */ }
    });

    it('30. SessionStart declared in settings calls handleSessionStart', async () => {
      const result = await dispatcher.dispatchHook('SessionStart', {});
      expect(result.ok).toBe(true);
      expect(result.action).toBe('ALLOW');
      expect(result.reason).toContain('initialized');
    });

    it('31. UserPromptSubmit declared in settings calls handleUserPromptSubmit', async () => {
      const result = await dispatcher.dispatchHook('UserPromptSubmit', { prompt: 'Test task' });
      expect(result.ok).toBe(true);
      expect(result.metadata?.intent).toBeDefined();
    });

    it('32. PreToolUse declared in settings calls handlePreToolUse', async () => {
      const safePath = join(tempDir, 'src', 'file.ts');
      mkdirSync(join(tempDir, 'src'), { recursive: true });
      writeFileSync(safePath, 'content');

      const result = await dispatcher.dispatchHook('PreToolUse', {
        tool: 'WriteFile',
        path: 'src/file.ts',
        allowedRoot: tempDir
      });
      expect(result.action).toBe('ALLOW');
    });

    it('33. PostToolUse declared in settings calls handlePostToolUse', async () => {
      const result = await dispatcher.dispatchHook('PostToolUse', { tool: 'WriteFile' });
      expect(result.ok).toBe(true);
      expect(result.action).toBe('ALLOW');
    });

    it('34. SessionEnd declared in settings calls handleSessionEnd', async () => {
      const result = await dispatcher.dispatchHook('SessionEnd', {});
      expect(result.ok).toBe(true);
      expect(result.reason).toContain('leanup');
    });

    it('35. local commands greenforge-init and greenforge-cleanup resolve to handlers', async () => {
      const results = dispatcher.resolveAllLocalCommands();
      expect(results.length).toBeGreaterThanOrEqual(2);

      const initCmd = results.find((r: any) => r.command === 'greenforge-init');
      expect(initCmd).toBeDefined();
      expect(initCmd.resolved).toBe(true);
      expect(initCmd.description).toContain('SessionStart');

      const cleanupCmd = results.find((r: any) => r.command === 'greenforge-cleanup');
      expect(cleanupCmd).toBeDefined();
      expect(cleanupCmd.resolved).toBe(true);
      expect(cleanupCmd.description).toContain('SessionEnd');
    });

    it('36. unknown local command fails explicitly', async () => {
      const result = dispatcher.resolveLocalCommand('nonexistent-cmd');
      expect(result.resolved).toBe(false);
    });

    it('37. HTTP endpoints declared in settings are introspectable without network', async () => {
      const httpRoutes = dispatcher.getDeclaredHttpRoutes();
      expect(httpRoutes.length).toBeGreaterThan(0);

      const hookNames = httpRoutes.map((r: any) => r.hookName);
      expect(hookNames).toEqual(expect.arrayContaining(['UserPromptSubmit', 'PreToolUse', 'PostToolUse']));

      for (const route of httpRoutes) {
        expect(route.url).toMatch(/^http:\/\/localhost:7777\//);
      }
    });
  });

  describe('G. PostToolUse registers real checkpoint when taskId present', () => {
    let tempDir: string;
    let hookHandler: any;
    let QwenHookHandler: any;
    let QwenExtensionRuntime: any;

    beforeEach(async () => {
      tempDir = createTempWorktree();
      const imports = await Promise.all([
        import('../src/integration/qwen/QwenExtensionRuntime.js'),
        import('../src/integration/qwen/QwenHookHandler.js'),
      ]);
      QwenExtensionRuntime = imports[0].QwenExtensionRuntime;
      QwenHookHandler = imports[1].QwenHookHandler;

      const runtime = new QwenExtensionRuntime({ projectRoot, tempDir });
      hookHandler = new QwenHookHandler(runtime);
    });

    afterEach(() => {
      try {
        if (existsSync(tempDir)) rmSync(tempDir, { recursive: true, force: true });
      } catch { /* ignore */ }
    });

    it('38. PostToolUse with taskId registers real checkpoint in repository', async () => {
      // First create a task to associate the checkpoint
      const result = await hookHandler.handleUserPromptSubmit({
        prompt: 'Test task for checkpoint'
      });
      const taskId = result.metadata?.taskId as string;
      expect(taskId).toBeDefined();

      // Now fire PostToolUse with that taskId
      const postResult = hookHandler.handlePostToolUse({
        tool: 'WriteFile',
        path: 'src/test.ts',
        taskId
      });

      expect(postResult.ok).toBe(true);
      expect(postResult.action).toBe('ALLOW');
      expect(postResult.reason).toBe('Checkpoint registered');
      expect(postResult.metadata?.checkpoint).toBe(true);
      expect(postResult.metadata?.taskId).toBe(taskId);

      // Verify checkpoint was actually persisted
      const repo = hookHandler.runtime.getRepository();
      const checkpoints = repo.getCheckpoints(taskId);
      expect(checkpoints.length).toBeGreaterThanOrEqual(1);
      // Find the PostToolUse checkpoint (others like ROUTE_TASK may exist)
      const postCp = checkpoints.find((c: any) => c.phase === 'PostToolUse');
      expect(postCp).toBeDefined();
    });

    it('39. PostToolUse without taskId does not pretend checkpoint was registered', async () => {
      const result = hookHandler.handlePostToolUse({ tool: 'Bash' });
      expect(result.ok).toBe(true);
      expect(result.action).toBe('ALLOW');
      expect(result.reason).toContain('No task context');
      expect(result.reason).not.toContain('Checkpoint registered');
    });
  });

  describe('H. list command returns real data from repository', () => {
    let tempDir: string;
    let commandHandler: any;
    let QwenCommandHandler: any;
    let QwenExtensionRuntime: any;

    beforeEach(async () => {
      tempDir = createTempWorktree();
      const imports = await Promise.all([
        import('../src/integration/qwen/QwenExtensionRuntime.js'),
        import('../src/integration/qwen/QwenCommandHandler.js'),
      ]);
      QwenExtensionRuntime = imports[0].QwenExtensionRuntime;
      QwenCommandHandler = imports[1].QwenCommandHandler;

      const runtime = new QwenExtensionRuntime({ projectRoot, tempDir });
      commandHandler = new QwenCommandHandler(runtime);
    });

    afterEach(() => {
      try {
        if (existsSync(tempDir)) rmSync(tempDir, { recursive: true, force: true });
      } catch { /* ignore */ }
    });

    it('40. list after start shows created task', async () => {
      // Create a task via start
      const startResult = await commandHandler.handle('start', ['List test task']);
      expect(startResult.ok).toBe(true);
      expect(startResult.data?.taskId).toBeDefined();

      // Now list
      const listResult = await commandHandler.handle('list', []);
      expect(listResult.ok).toBe(true);
      expect(listResult.data?.tasks).toBeDefined();
      expect(listResult.data.tasks.length).toBeGreaterThanOrEqual(1);

      const found = listResult.data.tasks.find((t: any) => t.id === startResult.data.taskId);
      expect(found).toBeDefined();
      expect(found.status).toBeDefined();
    });

    it('41. list count reflects total tasks', async () => {
      const listBefore = await commandHandler.handle('list', []);
      const countBefore = listBefore.data?.count ?? 0;

      await commandHandler.handle('start', ['Task A']);
      await commandHandler.handle('start', ['Task B']);

      const listAfter = await commandHandler.handle('list', []);
      expect(listAfter.data.count).toBeGreaterThanOrEqual(countBefore + 2);
    });
  });

  describe('I. Zod output validation on real handler results', () => {
    let tempDir: string;
    let hookHandler: any;
    let commandHandler: any;
    let QwenHookHandler: any;
    let QwenCommandHandler: any;
    let QwenExtensionRuntime: any;

    beforeEach(async () => {
      tempDir = createTempWorktree();
      const imports = await Promise.all([
        import('../src/integration/qwen/QwenExtensionRuntime.js'),
        import('../src/integration/qwen/QwenHookHandler.js'),
        import('../src/integration/qwen/QwenCommandHandler.js'),
      ]);
      QwenExtensionRuntime = imports[0].QwenExtensionRuntime;
      QwenHookHandler = imports[1].QwenHookHandler;
      QwenCommandHandler = imports[2].QwenCommandHandler;

      const runtime = new QwenExtensionRuntime({ projectRoot, tempDir });
      hookHandler = new QwenHookHandler(runtime);
      commandHandler = new QwenCommandHandler(runtime);
    });

    afterEach(() => {
      try {
        if (existsSync(tempDir)) rmSync(tempDir, { recursive: true, force: true });
      } catch { /* ignore */ }
    });

    it('42. all hook handler outputs pass HookHandlerResultSchema', async () => {
      const { HookHandlerResultSchema } = await import('../src/integration/qwen/runtimeTypes.js');

      // Test SessionStart
      const r1 = await hookHandler.handleSessionStart({});
      expect(HookHandlerResultSchema.safeParse(r1).success).toBe(true);

      // Test UserPromptSubmit (NORMAL_CHAT)
      const r2 = await hookHandler.handleUserPromptSubmit({ prompt: 'Hello' });
      expect(HookHandlerResultSchema.safeParse(r2).success).toBe(true);

      // Test PreToolUse
      const r3 = hookHandler.handlePreToolUse({ tool: 'ReadFile' });
      expect(HookHandlerResultSchema.safeParse(r3).success).toBe(true);

      // Test PostToolUse (no taskId)
      const r4 = hookHandler.handlePostToolUse({ tool: 'WriteFile' });
      expect(HookHandlerResultSchema.safeParse(r4).success).toBe(true);

      // Test SessionEnd
      const r5 = hookHandler.handleSessionEnd({});
      expect(HookHandlerResultSchema.safeParse(r5).success).toBe(true);
    });

    it('43. all command handler outputs pass CommandHandlerResultSchema', async () => {
      const { CommandHandlerResultSchema } = await import('../src/integration/qwen/runtimeTypes.js');

      // Test start
      const r1 = await commandHandler.handle('start', ['Validation test task']);
      expect(CommandHandlerResultSchema.safeParse(r1).success).toBe(true);

      // Test status
      const r2 = await commandHandler.handle('status', []);
      expect(CommandHandlerResultSchema.safeParse(r2).success).toBe(true);

      // Test list
      const r3 = await commandHandler.handle('list', []);
      expect(CommandHandlerResultSchema.safeParse(r3).success).toBe(true);

      // Test unknown command
      const r4 = await commandHandler.handle('nonexistent', []);
      expect(CommandHandlerResultSchema.safeParse(r4).success).toBe(true);
    });
  });

  describe('J. Runtime tempDir creation and cleanup', () => {
    it('44. runtime creates tempDir with mkdirSync before SQLite use', async () => {
      const { QwenExtensionRuntime } = await import('../src/integration/qwen/QwenExtensionRuntime.js');
      // Auto tempDir (no injected path) — must auto-create
      const runtime = new QwenExtensionRuntime({ projectRoot });
      const tempDir = runtime.getTempDir();

      // Directory must exist after construction
      expect(existsSync(tempDir)).toBe(true);

      runtime.cleanup();
    });

    it('45. runtime cleanup removes auto-created tempDir', async () => {
      const { QwenExtensionRuntime } = await import('../src/integration/qwen/QwenExtensionRuntime.js');
      const runtime = new QwenExtensionRuntime({ projectRoot });
      const tempDir = runtime.getTempDir();

      expect(existsSync(tempDir)).toBe(true);

      runtime.cleanup();

      // Auto tempDir should be cleaned up
      expect(runtime.isClosed()).toBe(true);
      // Since autoTempDir, cleanup should remove it
      expect(existsSync(tempDir)).toBe(false);
    });

    it('46. injected tempDir is NOT removed on cleanup', async () => {
      const { QwenExtensionRuntime } = await import('../src/integration/qwen/QwenExtensionRuntime.js');
      const injectedDir = createTempWorktree();

      const runtime = new QwenExtensionRuntime({ projectRoot, tempDir: injectedDir });
      expect(runtime.getTempDir()).toBe(injectedDir);

      runtime.cleanup();

      // Injected tempDir should still exist
      expect(existsSync(injectedDir)).toBe(true);

      // Clean it up ourselves
      rmSync(injectedDir, { recursive: true, force: true });
    });
  });
});