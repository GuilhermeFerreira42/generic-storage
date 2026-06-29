#!/usr/bin/env node

/**
 * GreenForge — Entry Point
 *
 * Modos de operação:
 *   - `mcp`:   Inicia servidor MCP via stdio (JSON-RPC)
 *   - `hook`:  Modo hook (Fase 20 — não implementado ainda)
 *   - sem args ou arg desconhecido: imprime ajuda breve e sai
 *
 * REGRA CRÍTICA: No modo MCP, TODOS os logs vão para stderr.
 * stdout é reservado para o protocolo JSON-RPC do MCP.
 */

import { McpGreenForgeServer } from './integration/qwen/McpGreenForgeServer.js';

function printHelp(): void {
  console.log(`GreenForge — AI-Assisted Plan-Driven Development

Usage:
  greenforge mcp    Start MCP server (stdio transport)
  greenforge hook   Hook mode (not yet implemented)
  greenforge        Show this help message

Modes:
  mcp    Starts the GreenForge MCP server via stdio. This allows
         AI assistants (like Qwen CLI) to call GreenForge tools
         using the Model Context Protocol.
  hook   Reserved for future implementation (Phase 20).
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const mode = args[0];

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
    return;
  }

  if (mode === 'hook') {
    console.log('Hook mode not yet implemented');
    process.exit(0);
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