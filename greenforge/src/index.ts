#!/usr/bin/env node

/**
 * GreenForge — Entry Point
 *
 * Modos de operação:
 *   - `mcp`:   Inicia servidor MCP via stdio (JSON-RPC)
 *   - `hook`:  Modo hook para Qwen CLI (Fase 20)
 *   - sem args ou arg desconhecido: imprime ajuda breve e sai
 *
 * REGRA CRÍTICA:
 *   - No modo MCP, TODOS os logs vão para stderr.
 *   - No modo hook, stdout é reservado EXCLUSIVAMENTE para o JSON de resposta do hook.
 *   - Logs de diagnóstico vão para stderr.
 */

import { McpGreenForgeServer } from './integration/qwen/McpGreenForgeServer.js';
import { HookCommandAdapter } from './integration/qwen/HookCommandAdapter.js';

function printHelp(): void {
  console.log(`GreenForge — AI-Assisted Plan-Driven Development

Usage:
  greenforge mcp                    Start MCP server (stdio transport)
  greenforge hook <HookName>        Run hook mode (reads JSON payload from stdin)
  greenforge                        Show this help message

Modes:
  mcp    Starts the GreenForge MCP server via stdio. This allows
         AI assistants (like Qwen CLI) to call GreenForge tools
         using the Model Context Protocol.

  hook   Executes a Qwen CLI hook.
         Example: node dist/index.js hook SessionStart
         Payload is read from stdin as JSON.

Supported hooks:
  SessionStart, UserPromptSubmit, PreToolUse, PostToolUse,
  SessionEnd, SubagentStart, SubagentStop
`);
}

async function runHookMode(hookName: string | undefined): Promise<void> {
  if (!hookName) {
    console.error('[GreenForge] Error: hook mode requires a hook name.');
    console.error('Example: greenforge hook SessionStart');
    console.error('Valid hooks: SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, SessionEnd, SubagentStart, SubagentStop');
    process.exit(1);
  }

  const adapter = new HookCommandAdapter({
    projectRoot: process.cwd(),
  });

  let exitCode = 0;

  try {
    // processHook reads from stdin internally when no override provided
    const output = await adapter.processHook(hookName);

    // IMPORTANT: stdout must contain ONLY the JSON response
    // No console.log before or after this
    console.log(JSON.stringify(output, null, 0)); // compact JSON

    // Determine exit code
    if (output.error) {
      exitCode = 1; // unknown hook or invalid
    } else {
      // For blocking hooks, if behavior === 'deny' we still exit 0 (Qwen expects the decision)
      exitCode = 0;
    }
  } catch (err) {
    // System error (rare)
    console.error('[GreenForge] Hook system error:', err instanceof Error ? err.message : err);
    // Safe fallback JSON on stdout
    console.log(JSON.stringify({
      ok: false,
      action: 'BLOCK',
      reason: 'System error in hook adapter',
    }));
    exitCode = 2;
  } finally {
    try {
      adapter.cleanup();
    } catch { /* cleanup is best-effort */ }
    process.exit(exitCode);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const mode = args[0];
  const subArg = args[1]; // for hook mode: the hook name

  if (!mode) {
    printHelp();
    process.exit(0);
  }

  if (mode === 'mcp') {
    // All logs MUST go to stderr — stdout is reserved for MCP JSON-RPC
    console.error('[GreenForge] Starting MCP server via stdio...');

    const server = new McpGreenForgeServer({
      projectRoot: process.cwd(),
    });

    await server.connect();

    console.error('[GreenForge] MCP server running. Press Ctrl+C to stop.');
    // Keep process alive
    return;
  }

  if (mode === 'hook') {
    await runHookMode(subArg);
    return;
  }

  // Unknown argument
  console.error(`[GreenForge] Unknown mode: "${mode}"`);
  printHelp();
  process.exit(1);
}

main().catch((err) => {
  console.error('[GreenForge] Fatal error:', err);
  process.exit(1);
});
