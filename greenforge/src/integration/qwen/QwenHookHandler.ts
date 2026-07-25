import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  HookHandlerResult,
  HookHandlerResultSchema,
  SessionStartPayloadSchema,
  UserPromptSubmitPayloadSchema,
  PreToolUsePayloadSchema,
  PostToolUsePayloadSchema,
  SessionEndPayloadSchema,
} from './runtimeTypes.js';
import { QwenExtensionRuntime } from './QwenExtensionRuntime.js';

/**
 * QwenHookHandler provides real handlers for the Qwen CLI extension hooks.
 *
 * Each hook delegates to real GreenForge components loaded by the runtime.
 * No hardcoded success: handlers call real QwenRouter, PlannerEngine, Orchestrator,
 * SQLiteRepository when applicable.
 *
 * Security:
 * - PreToolUse usa path.resolve + path.relative (não usa validação textual frágil baseada no nome do diretório).
 * - Sensitive tools require allowedRoot.
 * - Paths outside allowedRoot are blocked.
 */
export class QwenHookHandler {
  private runtime: QwenExtensionRuntime;

  constructor(runtime: QwenExtensionRuntime) {
    this.runtime = runtime;
  }

  /**
   * Validates and returns a hook handler result via Zod.
   * All public outputs must pass through this helper.
   */
  private valid(result: unknown): HookHandlerResult {
    return HookHandlerResultSchema.parse(result);
  }

  /**
   * SessionStart: validates environment/config and returns ALLOW when valid.
   */
  async handleSessionStart(payload: unknown): Promise<HookHandlerResult> {
    const parsed = SessionStartPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return this.valid({ ok: false, action: 'BLOCK', reason: 'Invalid SessionStart payload' });
    }

    // Validate that all extension artifacts loaded successfully
    try {
      this.runtime.getManifest();
      this.runtime.getSettings();
      this.runtime.getSkillManifest();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.valid({ ok: false, action: 'BLOCK', reason: `Session initialization failed: ${message}` });
    }

    // Initialize repository for the session
    this.runtime.getRepository();

    return this.valid({
      ok: true,
      action: 'ALLOW',
      reason: 'Session initialized safely',
      metadata: { initialized: true }
    });
  }

  /**
   * Extracts a workspace root from Qwen payload variants observed in real CLI sessions.
   */
  private extractWorkspaceRoot(payload: Record<string, unknown>): string | undefined {
    const direct = payload.cwd ?? payload.workspaceRoot ?? payload.workspace_root;
    if (typeof direct === 'string' && direct.trim()) return direct;

    const session = payload.session;
    if (session && typeof session === 'object') {
      const sessionRecord = session as Record<string, unknown>;
      const sessionCwd = sessionRecord.cwd ?? sessionRecord.workspaceRoot;
      if (typeof sessionCwd === 'string' && sessionCwd.trim()) return sessionCwd;
    }

    return undefined;
  }

  /**
   * UserPromptSubmit: uses QwenRouter to classify intent.
   * - NORMAL_CHAT returns NOOP
   * - DEVELOPMENT_TASK creates GreenForge task context and strongly directs Qwen CLI to call the MCP tool
   * - Non-code intents are classified without forcing the code/worktree pipeline
   */
  async handleUserPromptSubmit(payload: unknown): Promise<HookHandlerResult> {
    const parsed = UserPromptSubmitPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return this.valid({ ok: false, action: 'BLOCK', reason: 'Invalid UserPromptSubmit payload' });
    }

    const { prompt } = parsed.data;
    const payloadRecord = parsed.data as Record<string, unknown>;
    const workspaceRoot = this.extractWorkspaceRoot(payloadRecord);
    const router = this.runtime.getRouter();

    // Call real QwenRouter (with MockLLM in test context)
    const intent = await router.classify(prompt);

    if (intent === 'NORMAL_CHAT') {
      return this.valid({
        ok: true,
        action: 'NOOP',
        reason: 'NORMAL_CHAT',
      });
    }

    if (intent !== 'DEVELOPMENT_TASK') {
      return this.valid({
        ok: true,
        action: 'ALLOW',
        reason: `${intent}: classified as non-code task. GreenForge code pipeline was not started; answer using the appropriate non-code workflow.`,
        metadata: { intent, workspaceRoot }
      });
    }

    // DEVELOPMENT_TASK: initiate GreenForge flow
    // Create task in repository and route it via orchestrator
    const repo = this.runtime.getRepository();
    const orch = this.runtime.getOrchestrator();
    const tempDir = this.runtime.getTempDir();
    const taskId = `task-${Date.now()}`;
    const worktreePath = join(tempDir, taskId);

    mkdirSync(worktreePath, { recursive: true });

    repo.createTask({
      id: taskId,
      title: prompt.slice(0, 80),
      originalPrompt: prompt,
      branchName: `feature/${taskId}`,
      worktreePath,
      status: 'PENDING',
      planMarkdown: null,
      subtasksGraph: null
    });

    await orch.trigger(taskId, 'ROUTE_TASK');

    const workspaceInstruction = workspaceRoot
      ? ` Use workspaceRoot: ${workspaceRoot}.`
      : ' If the Qwen payload has a current workspace/cwd, pass it as workspaceRoot.';

    return this.valid({
      ok: true,
      action: 'ALLOW',
      reason: `DEVELOPMENT_TASK: call MCP tool mcp__greenforge__greenforge_start with the original prompt.${workspaceInstruction} Do not solve with native write_file before GreenForge starts.`,
      metadata: {
        intent: 'DEVELOPMENT_TASK',
        taskId,
        suggestedTool: 'mcp__greenforge__greenforge_start',
        workspaceRoot,
      }
    });
  }

  /**
   * PreToolUse: security gate for sensitive operations.
   *
   * Validation strategy:
   * 1. Sensitive tools (Write, WriteFile, Edit, MultiEdit, Bash) require allowedRoot.
   * 2. Uses path.resolve + path.relative to check if target is inside allowedRoot.
   * 3. Blocks paths outside allowedRoot.
   * 4. Não usa validação textual frágil baseada no nome do diretório como critério de segurança.
   */
  handlePreToolUse(payload: unknown): HookHandlerResult {
    const parsed = PreToolUsePayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return this.valid({ ok: true, action: 'BLOCK', reason: 'Invalid PreToolUse payload' });
    }

    const { tool, path: targetPath, allowedRoot, worktreeRoot } = parsed.data;
    const root = allowedRoot || worktreeRoot;

    const sensitiveTools = ['WriteFile', 'Edit', 'MultiEdit', 'Write', 'Bash'];

    if (sensitiveTools.includes(tool)) {
      // Require allowedRoot for sensitive operations
      if (!root) {
        return this.valid({ ok: true, action: 'BLOCK', reason: 'Missing allowedRoot for sensitive operation' });
      }

      // Validate target path is inside allowedRoot using path.resolve + path.relative
      // This is the secure approach: não usa validação textual frágil baseada no nome do diretório
      const resolvedTarget = path.resolve(root, targetPath || '');
      const relative = path.relative(root, resolvedTarget);
      const isInside = relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));

      if (!isInside) {
        return this.valid({ ok: true, action: 'BLOCK', reason: 'Write outside allowedRoot forbidden' });
      }
    }

    return this.valid({ ok: true, action: 'ALLOW', reason: 'Operation allowed inside worktree' });
  }

  /**
   * PostToolUse: registers real checkpoint when taskId exists in payload.
   * If no taskId, returns ALLOW with clear reason (no fake "Checkpoint registered").
   */
  handlePostToolUse(payload: unknown): HookHandlerResult {
    const parsed = PostToolUsePayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return this.valid({ ok: true, action: 'ALLOW', reason: 'PostToolUse event received (unvalidated)' });
    }

    const { tool, taskId } = parsed.data;

    if (taskId) {
      // Register real checkpoint in SQLiteRepository
      const repo = this.runtime.getRepository();
      repo.addCheckpoint(taskId, 'PostToolUse', { tool, timestamp: Date.now() });

      return this.valid({
        ok: true,
        action: 'ALLOW',
        reason: 'Checkpoint registered',
        metadata: { checkpoint: true, tool, taskId }
      });
    }

    // No task context — do not pretend checkpoint was registered
    return this.valid({
      ok: true,
      action: 'ALLOW',
      reason: 'No task context — checkpoint not registered',
      metadata: { tool }
    });
  }

  /**
   * SessionEnd: executes cleanup/resource closing.
   */
  handleSessionEnd(payload: unknown): HookHandlerResult {
    const parsed = SessionEndPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return this.valid({ ok: false, action: 'BLOCK', reason: 'Invalid SessionEnd payload' });
    }

    // Close repository and cleanup resources
    this.runtime.cleanup();

    return this.valid({
      ok: true,
      action: 'ALLOW',
      reason: 'Cleanup completed'
    });
  }
}