import { readFileSync } from 'node:fs';
import { QwenHookHandler } from './QwenHookHandler.js';
import { QwenExtensionRuntime } from './QwenExtensionRuntime.js';
import {
  HookHandlerResult,
  HookHandlerResultSchema,
} from './runtimeTypes.js';

export interface HookAdapterOptions {
  projectRoot: string;
}

export class HookCommandAdapter {
  private runtime: QwenExtensionRuntime;
  private hookHandler: QwenHookHandler;

  private readonly BLOCKING_HOOKS = new Set(['PreToolUse', 'UserPromptSubmit']);
  private readonly VALID_HOOKS = [
    'SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse',
    'SessionEnd', 'SubagentStart', 'SubagentStop',
  ];

  constructor(options: HookAdapterOptions) {
    this.runtime = new QwenExtensionRuntime(options);
    this.hookHandler = new QwenHookHandler(this.runtime);
    try { this.runtime.initialize(); } catch { /* initialization errors are handled per-hook */ }
  }

  getHookHandler(): QwenHookHandler {
    return this.hookHandler;
  }

  private readStdinPayload(): unknown {
    try {
      const raw = readFileSync(0, 'utf-8').trim();
      if (!raw) return {};
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private toQwenOutput(hookName: string, result: HookHandlerResult): Record<string, unknown> {
    const isBlocking = this.BLOCKING_HOOKS.has(hookName);
    if (isBlocking) {
      const behaviorMap: Record<string, 'allow' | 'deny' | 'ask'> = {
        ALLOW: 'allow', BLOCK: 'deny', NOOP: 'allow',
      };
      const behavior = behaviorMap[result.action] || 'allow';
      return {
        hookSpecificOutput: {
          decision: {
            behavior,
            message: result.reason || (behavior === 'allow' ? 'Operation allowed' : 'Operation denied'),
            interrupt: behavior === 'deny',
          },
        },
      };
    }
    return {
      ok: result.ok,
      action: result.action,
      reason: result.reason,
      ...(result.metadata ? { metadata: result.metadata } : {}),
    };
  }

  async processHook(hookName: string, rawPayload?: unknown): Promise<Record<string, unknown>> {
    const payload = rawPayload !== undefined ? rawPayload : this.readStdinPayload();

    if (!this.VALID_HOOKS.includes(hookName)) {
      return { error: `Unknown hook: ${hookName}`, validHooks: this.VALID_HOOKS };
    }

    if (payload === null || typeof payload !== 'object') {
      const isBlocking = this.BLOCKING_HOOKS.has(hookName);
      if (isBlocking) {
        return {
          hookSpecificOutput: {
            decision: { behavior: 'deny', message: 'Malformed payload - operation denied for safety', interrupt: true },
          },
        };
      }
      return { ok: true, action: 'ALLOW', reason: 'Malformed payload - defaulting to allow (non-blocking)' };
    }

    try {
      let result: HookHandlerResult;

      switch (hookName) {
        case 'SessionStart': result = await this.hookHandler.handleSessionStart(payload); break;
        case 'UserPromptSubmit': result = await this.hookHandler.handleUserPromptSubmit(payload); break;
        case 'PreToolUse': result = this.hookHandler.handlePreToolUse(payload); break;
        case 'PostToolUse': result = this.hookHandler.handlePostToolUse(payload); break;
        case 'SessionEnd': result = this.hookHandler.handleSessionEnd(payload); break;
        case 'SubagentStart':
        case 'SubagentStop':
          result = { ok: true, action: 'ALLOW', reason: `${hookName} acknowledged (no-op)` };
          break;
        default:
          result = { ok: false, action: 'BLOCK', reason: `Hook ${hookName} not implemented` };
      }

      const validated = HookHandlerResultSchema.parse(result);
      return this.toQwenOutput(hookName, validated);
    } catch (err) {
      const isBlocking = this.BLOCKING_HOOKS.has(hookName);
      const message = err instanceof Error ? err.message : String(err);
      if (isBlocking) {
        return { hookSpecificOutput: { decision: { behavior: 'deny', message: `Internal error: ${message}`, interrupt: true } } };
      }
      return { ok: false, action: 'BLOCK', reason: `Internal error processing ${hookName}: ${message}` };
    }
  }

  async executeHook(hookName: string, payloadOverride?: string): Promise<Record<string, unknown>> {
    let payload: unknown = undefined;
    if (payloadOverride) {
      try { payload = JSON.parse(payloadOverride); } catch { payload = null; }
    }
    return this.processHook(hookName, payload);
  }

  cleanup(): void {
    this.runtime.cleanup();
  }
}

export function createHookAdapter(options: HookAdapterOptions): HookCommandAdapter {
  return new HookCommandAdapter(options);
}
