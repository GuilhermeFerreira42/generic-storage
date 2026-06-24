import { QwenExtensionRuntime } from './QwenExtensionRuntime.js';
import { QwenHookHandler } from './QwenHookHandler.js';
import { QwenCommandHandler } from './QwenCommandHandler.js';
import type { QwenSettings } from './manifestSchemas.js';
import type { HookHandlerResult } from './runtimeTypes.js';

/**
 * Route entry produced by reading a hook binding from settings.
 */
interface HookRoute {
  hookName: string;
  type: 'command' | 'http';
  command?: string;
  url?: string;
}

/**
 * QwenSettingsDispatcher bridges the gap between the Qwen settings manifest
 * (.qwen/settings.json) and the real handler implementations.
 *
 * It reads the declared hooks/commands from settings and maps them to the
 * actual QwenHookHandler / QwenCommandHandler methods.
 *
 * Key guarantees:
 * - Every declared hook (SessionStart, UserPromptSubmit, etc.) is routed to its handler.
 * - Every declared local command (greenforge-init, greenforge-cleanup) maps to
 *   a handler or fails explicitly.
 * - HTTP hooks declared in settings can be introspected for routing without
 *   making real network calls.
 * - No real HTTP server is started; no real network calls are made.
 */
export class QwenSettingsDispatcher {
  private runtime: QwenExtensionRuntime;
  private hookHandler: QwenHookHandler;
  private commandHandler: QwenCommandHandler;

  constructor(runtime: QwenExtensionRuntime) {
    this.runtime = runtime;
    this.runtime.ensureInitialized();
    this.hookHandler = new QwenHookHandler(runtime);
    this.commandHandler = new QwenCommandHandler(runtime);
  }

  // ─── Settings introspection ───

  /**
   * Extracts all hook routes declared in the settings.
   */
  getDeclaredHookRoutes(): HookRoute[] {
    const settings: QwenSettings = this.runtime.getSettings();
    const routes: HookRoute[] = [];

    for (const [hookName, bindings] of Object.entries(settings.hooks)) {
      for (const binding of bindings) {
        for (const action of binding.hooks) {
          routes.push({
            hookName,
            type: action.type,
            command: action.command,
            url: action.url,
          });
        }
      }
    }

    return routes;
  }

  // ─── Hook routing (no network) ───

  /**
   * Dispatches a hook event to the corresponding handler.
   * Returns the handler result directly — no HTTP, no network.
   */
  async dispatchHook(hookName: string, payload: unknown): Promise<HookHandlerResult> {
    switch (hookName) {
      case 'SessionStart':
        return this.hookHandler.handleSessionStart(payload);
      case 'UserPromptSubmit':
        return this.hookHandler.handleUserPromptSubmit(payload);
      case 'PreToolUse':
        return this.hookHandler.handlePreToolUse(payload);
      case 'PostToolUse':
        return this.hookHandler.handlePostToolUse(payload);
      case 'SessionEnd':
        return this.hookHandler.handleSessionEnd(payload);
      default:
        return {
          ok: false,
          action: 'BLOCK',
          reason: `Unknown hook: ${hookName}`,
        };
    }
  }

  // ─── Command routing ───

  /**
   * Checks whether a local command declared in settings (e.g. "greenforge-init")
   * has a corresponding handler or can be resolved.
   *
   * Local commands like "greenforge-init" map to SessionStart logic,
   * "greenforge-cleanup" maps to SessionEnd logic.
   */
  resolveLocalCommand(localCommand: string): { resolved: boolean; description: string } {
    switch (localCommand) {
      case 'greenforge-init':
        return { resolved: true, description: 'Maps to SessionStart handler — validates manifest, settings, and initializes repository' };
      case 'greenforge-cleanup':
        return { resolved: true, description: 'Maps to SessionEnd handler — closes repository and cleans up resources' };
      default:
        return { resolved: false, description: `No handler mapped for local command: ${localCommand}` };
    }
  }

  /**
   * Collects all local script/command hooks declared in settings
   * (type === 'command') and resolves them.
   */
  resolveAllLocalCommands(): Array<{ command: string; resolved: boolean; description: string }> {
    const routes = this.getDeclaredHookRoutes();
    const results: Array<{ command: string; resolved: boolean; description: string }> = [];

    for (const route of routes) {
      if (route.type === 'command' && route.command) {
        const resolution = this.resolveLocalCommand(route.command);
        results.push({
          command: route.command,
          resolved: resolution.resolved,
          description: resolution.description,
        });
      }
    }

    return results;
  }

  // ─── HTTP route introspection (no network) ───

  /**
   * Returns all HTTP hook URLs declared in settings for introspection.
   * These can be mapped to handlers without making real network calls.
   */
  getDeclaredHttpRoutes(): Array<{ hookName: string; url: string }> {
    const routes = this.getDeclaredHookRoutes();
    return routes
      .filter(r => r.type === 'http' && r.url)
      .map(r => ({ hookName: r.hookName, url: r.url! }));
  }
}