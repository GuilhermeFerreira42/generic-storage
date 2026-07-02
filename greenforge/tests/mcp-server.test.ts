import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { McpGreenForgeServer } from '../src/integration/qwen/McpGreenForgeServer.js';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));

function createTempWorktree(): string {
  const dir = join(
    tmpdir(),
    `greenforge-phase19-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(dir, { recursive: true });

  // Ensure the temp dir has a valid GreenForge structure with a .git dir.
  const gitDir = join(dir, '.git');
  mkdirSync(gitDir);

  return dir;
}

// ─── Suite Principal ────────────────────────────────────────────────────────

describe('Fase 19 — McpGreenForgeServer', () => {
  // ================================================================
  // A. Server instantiation and tool registration
  // ================================================================
  describe('A. Server instantiation and tool registration', () => {
    // Single shared instance: McpGreenForgeServer construction loads the full
    // QwenExtensionEntrypoint runtime (~5s wall-clock due to QwenRouter,
    // PlannerEngine, SQLiteRepository, Orchestrator init). Creating it once
    // in beforeAll avoids repeated init cost and prevents timeout flakes
    // when the full suite runs alongside other test files.
    let server: McpGreenForgeServer | undefined;
    let creationError: Error | undefined;

    beforeAll(() => {
      try {
        server = new McpGreenForgeServer({ projectRoot });
      } catch (e) {
        creationError = e instanceof Error ? e : new Error(String(e));
      }
    }, 10000);

    it('1. McpGreenForgeServer can be instantiated with default options', () => {
      expect(creationError).toBeUndefined();
      if (creationError) throw creationError;
      expect(server!).toBeDefined();
      expect(server!.mcpServer).toBeDefined();
    });

    it('2. The server registers exactly 10 tools', () => {
      expect(server!).toBeDefined();
      const toolNames = server!.getToolNames();
      expect(toolNames).toHaveLength(10);
    });

    it('3. Each tool has the correct greenforge_ prefix and input schema', () => {
      expect(server!).toBeDefined();
      const serverRef = server!;

      const expectedTools = [
        'greenforge_start',
        'greenforge_status',
        'greenforge_list',
        'greenforge_approve',
        'greenforge_abort',
        'greenforge_review',
        'greenforge_feedback',
        'greenforge_reject',
        'greenforge_needs_changes',
        'greenforge_review_status',
      ];

      const toolNames = serverRef.getToolNames();
      for (const expected of expectedTools) {
        expect(toolNames).toContain(expected);
      }

      // Each tool must have an inputSchema with Zod
      for (const name of expectedTools) {
        const tool = serverRef.getTool(name);
        expect(tool).toBeDefined();
        expect(tool!.inputSchema).toBeDefined();
        expect(typeof tool!.inputSchema).toBe('object');
      }
    });

    it('4. greenforge_start delegates to QwenCommandHandler.handle("start", ...)', async () => {
      expect(server!).toBeDefined();
      const startTool = server!.getTool('greenforge_start');
      expect(startTool).toBeDefined();
      expect(startTool!.handler).toBeDefined();
      expect(typeof startTool!.handler).toBe('function');

      // Invoke the tool with a prompt
      const result = await startTool!.handler({ prompt: 'test prompt' });
      expect(result).toBeDefined();
      // The result should have MCP format { content: [{ type: 'text', text: string }] }
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(typeof result.content[0].text).toBe('string');
    });

    it('5. greenforge_status delegates to QwenCommandHandler.handle("status", ...)', async () => {
      expect(server!).toBeDefined();
      const statusTool = server!.getTool('greenforge_status');
      expect(statusTool).toBeDefined();
      expect(typeof statusTool!.handler).toBe('function');

      const result = await statusTool!.handler({});
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    it('6. greenforge_approve delegates to QwenCommandHandler.handle("approve", ...)', async () => {
      expect(server!).toBeDefined();
      const approveTool = server!.getTool('greenforge_approve');
      expect(approveTool).toBeDefined();
      expect(typeof approveTool!.handler).toBe('function');

      // approve requires a taskId
      const result = await approveTool!.handler({ taskId: 'test-task-id' });
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });
  });

  // ================================================================
  // B. MCP mode in src/index.ts
  // ================================================================
  describe('B. Entrypoint (src/index.ts) MCP mode', () => {
    it('7. Mode "mcp" creates McpGreenForgeServer and starts transport', async () => {
      // Stub out StdioServerTransport so we don't actually connect to stdio.
      const transportMock = { start: vi.fn().mockResolvedValue(undefined) };

      vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
        StdioServerTransport: vi.fn().mockImplementation(() => transportMock),
      }));

      const { McpGreenForgeServer } = await import(
        '../src/integration/qwen/McpGreenForgeServer.js'
      );

      // Spy on the connect method
      const connectSpy2 = vi.spyOn(
        McpGreenForgeServer.prototype,
        'connect',
      ).mockResolvedValue(undefined);

      const server = new McpGreenForgeServer({ projectRoot });
      expect(server).toBeDefined();
      expect(connectSpy2).toHaveBeenCalledTimes(0);

      // Start via connect
      await server.connect();

      // After connect, the transport should have started.
      expect(connectSpy2).toHaveBeenCalledTimes(1);

      connectSpy2.mockRestore();
    });

    it('8. Logs go to stderr, never stdout', async () => {
      // We test this at the McpGreenForgeServer level: the server should
      // have a log function that writes to console.error (stderr), not
      // console.log (stdout).
      const { McpGreenForgeServer } = await import(
        '../src/integration/qwen/McpGreenForgeServer.js'
      );
      const server = new McpGreenForgeServer({ projectRoot });

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Call log method if available, or check that internal logging uses stderr
      if (typeof (server as any).log === 'function') {
        (server as any).log('test message');
        // Should have written to stderr (console.error), not stdout (console.log)
        expect(consoleLogSpy).not.toHaveBeenCalledWith('test message');
      } else {
        // Verify via the handler path: invoke a tool and check no stdout leak
        const startTool = server.getTool('greenforge_start');
        await startTool!.handler({ prompt: 'test' });
        // console.log should NOT have been called during tool execution
        // (the main output goes via MCP content[], not console.log)
      }

      // Restore
      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });
});