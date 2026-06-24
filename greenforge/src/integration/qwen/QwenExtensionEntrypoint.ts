import { QwenExtensionRuntime } from './QwenExtensionRuntime.js';
import { QwenHookHandler } from './QwenHookHandler.js';
import { QwenCommandHandler } from './QwenCommandHandler.js';
import { RuntimeOptions } from './runtimeTypes.js';
import { HookHandlerResult, CommandHandlerResult } from './runtimeTypes.js';

/**
 * QwenExtensionEntrypoint is the importable entry point for the GreenForge Qwen extension.
 *
 * Design guarantees:
 * - Importable without side effects (no IIFE, no top-level execution).
 * - Delegates to pure/testable handler functions.
 * - Does not call real Qwen in automated tests.
 * - Does not make network calls.
 * - sem operações destrutivas de Git e sem shell explícito.
 * - sem chamadas a exec de processos filhos.
 */
export class QwenExtensionEntrypoint {
  private runtime: QwenExtensionRuntime;
  private hookHandler: QwenHookHandler;
  private commandHandler: QwenCommandHandler;

  constructor(options: RuntimeOptions) {
    this.runtime = new QwenExtensionRuntime(options);
    this.hookHandler = new QwenHookHandler(this.runtime);
    this.commandHandler = new QwenCommandHandler(this.runtime);
  }

  /**
   * Initializes the extension (loads manifest, settings, SKILL.md).
   * Must be called before handling any hook or command.
   */
  init(): void {
    this.runtime.initialize();
  }

  // ─── Hook Handlers ───

  async handleSessionStart(payload: unknown): Promise<HookHandlerResult> {
    return this.hookHandler.handleSessionStart(payload);
  }

  async handleUserPromptSubmit(payload: unknown): Promise<HookHandlerResult> {
    return this.hookHandler.handleUserPromptSubmit(payload);
  }

  handlePreToolUse(payload: unknown): HookHandlerResult {
    return this.hookHandler.handlePreToolUse(payload);
  }

  handlePostToolUse(payload: unknown): HookHandlerResult {
    return this.hookHandler.handlePostToolUse(payload);
  }

  handleSessionEnd(payload: unknown): HookHandlerResult {
    return this.hookHandler.handleSessionEnd(payload);
  }

  // ─── Command Handlers ───

  async handleCommand(name: string, args: string[]): Promise<CommandHandlerResult> {
    return this.commandHandler.handle(name, args);
  }

  // ─── Accessors for testing ───

  getRuntime(): QwenExtensionRuntime {
    return this.runtime;
  }

  getHookHandler(): QwenHookHandler {
    return this.hookHandler;
  }

  getCommandHandler(): QwenCommandHandler {
    return this.commandHandler;
  }

  cleanup(): void {
    this.runtime.cleanup();
  }
}

/**
 * Creates a QwenExtensionEntrypoint with the given options.
 * This is the primary factory function for the extension.
 */
export function createExtension(options: RuntimeOptions): QwenExtensionEntrypoint {
  return new QwenExtensionEntrypoint(options);
}