import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { QwenExtensionEntrypoint } from './QwenExtensionEntrypoint.js';
import { PlanReviewHandler } from './PlanReviewHandler.js';

/**
 * Fase 19 — McpGreenForgeServer
 *
 * Instancia um McpServer do @modelcontextprotocol/sdk e registra todos os
 * comandos do GreenForge como MCP tools com prefixo `greenforge_`.
 *
 * Diretrizes:
 * - Cada tool usa inputSchema com Zod para validação.
 * - Cada tool delega para QwenCommandHandler ou PlanReviewHandler existentes.
 * - NÃO faz chamada de rede, LLM real, ou git destrutivo.
 * - Logs devem ir para stderr (console.error). Nunca escrever em stdout.
 */

export interface McpGreenForgeServerOptions {
  projectRoot: string;
}

export class McpGreenForgeServer {
  public readonly mcpServer: McpServer;
  private readonly entrypoint: QwenExtensionEntrypoint;
  private readonly reviewHandler: PlanReviewHandler;
  private readonly toolNames: string[] = [];

  constructor(options: McpGreenForgeServerOptions) {
    this.entrypoint = new QwenExtensionEntrypoint({
      projectRoot: options.projectRoot,
    });
    this.entrypoint.init();

    this.reviewHandler = new PlanReviewHandler(this.entrypoint.getRuntime());

    this.mcpServer = new McpServer({
      name: 'greenforge',
      version: '1.0.0',
    });

    this.registerTools();
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  /**
   * Returns the list of registered MCP tool names.
   */
  getToolNames(): string[] {
    return [...this.toolNames];
  }

  /**
   * Returns a registered tool by name, or undefined if not found.
   */
  getTool(name: string): {
    title?: string;
    description?: string;
    inputSchema?: object;
    handler: (args: Record<string, unknown>) => Promise<{
      content: Array<{ type: string; text: string }>;
    }>;
  } | undefined {
    // Accessing internal McpServer property — not part of public API
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tools = (this.mcpServer as any)._registeredTools;
    if (!tools) return undefined;

    // _registeredTools is a plain object with tool names as keys
    const registered = tools[name];
    if (!registered) return undefined;

    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      title: (registered as any).title,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      description: (registered as any).description,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      inputSchema: (registered as any).inputSchema,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      handler: (registered as any).handler as any,
    };
  }

  /**
   * Starts the server with StdioServerTransport.
   * Conecta via stdin/stdout (MCP JSON-RPC).
   */
  async connect(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.mcpServer.connect(transport);
    this.log('GreenForge MCP Server started via stdio');
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  /**
   * Log a message to stderr (never stdout — stdout is reserved for MCP JSON-RPC).
   */
  private log(message: string): void {
    console.error(`[McpGreenForgeServer] ${message}`);
  }

  /**
   * Wraps a CommandHandlerResult into MCP CallToolResult format.
   */
  private toMcpResult(result: {
    ok: boolean;
    command: string;
    result: string;
    data?: unknown;
  }): { content: Array<{ type: 'text'; text: string }> } {
    const text = result.ok ? result.result : `Error: ${result.result}`;
    return {
      content: [{ type: 'text', text }],
    };
  }

  /**
   * Handles start command: delegates to QwenCommandHandler via entrypoint.
   */
  private async handleStart(args: { prompt: string; workspaceRoot?: string }): Promise<{
    content: Array<{ type: 'text'; text: string }>;
  }> {
    this.log(`Starting new task with prompt: ${args.prompt.slice(0, 80)}...`);
    const cmdArgs = [args.prompt];
    if (args.workspaceRoot) cmdArgs.push(`--workspaceRoot=${args.workspaceRoot}`);
    const result = await this.entrypoint.handleCommand('start', cmdArgs);
    return this.toMcpResult(result);
  }

  /**
   * Handles status command: delegates to QwenCommandHandler.
   */
  private async handleStatus(): Promise<{
    content: Array<{ type: 'text'; text: string }>;
  }> {
    this.log('Fetching runtime status');
    const result = await this.entrypoint.handleCommand('status', []);
    return this.toMcpResult(result);
  }

  /**
   * Handles list command: delegates to QwenCommandHandler.
   */
  private async handleList(args: { filter?: string }): Promise<{
    content: Array<{ type: 'text'; text: string }>;
  }> {
    const listArgs: string[] = [];
    if (args.filter) listArgs.push(args.filter);
    this.log('Listing tasks');
    const result = await this.entrypoint.handleCommand('list', listArgs);
    return this.toMcpResult(result);
  }

  /**
   * Handles approve command: delegates to QwenCommandHandler.
   */
  private async handleApprove(args: { taskId: string }): Promise<{
    content: Array<{ type: 'text'; text: string }>;
  }> {
    this.log(`Approving task: ${args.taskId}`);
    const result = await this.entrypoint.handleCommand('approve', [args.taskId]);
    return this.toMcpResult(result);
  }

  /**
   * Handles abort command: delegates to QwenCommandHandler.
   */
  private async handleAbort(args: { taskId: string }): Promise<{
    content: Array<{ type: 'text'; text: string }>;
  }> {
    this.log(`Aborting task: ${args.taskId}`);
    const result = await this.entrypoint.handleCommand('abort', [args.taskId]);
    return this.toMcpResult(result);
  }

  /**
   * Handles review command: delegates to PlanReviewHandler.
   */
  private async handleReview(args: { taskId: string }): Promise<{
    content: Array<{ type: 'text'; text: string }>;
  }> {
    this.log(`Reviewing plan for task: ${args.taskId}`);
    const result = await this.reviewHandler.handle('review', [args.taskId]);
    return this.toMcpResult(result);
  }

  /**
   * Handles feedback command: delegates to PlanReviewHandler.
   */
  private async handleFeedback(args: {
    taskId: string;
    feedback: string;
    answers?: string;
  }): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
    this.log(`Submitting feedback for task: ${args.taskId}`);
    const cmdArgs = [args.taskId, args.feedback];
    if (args.answers) cmdArgs.push(`--answers=${args.answers}`);
    const result = await this.reviewHandler.handle('feedback', cmdArgs);
    return this.toMcpResult(result);
  }

  /**
   * Handles reject command: delegates to PlanReviewHandler.
   */
  private async handleReject(args: {
    taskId: string;
    reason: string;
  }): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
    this.log(`Rejecting plan for task: ${args.taskId}`);
    const result = await this.reviewHandler.handle('reject', [args.taskId, args.reason]);
    return this.toMcpResult(result);
  }

  /**
   * Handles needs-changes command: delegates to PlanReviewHandler.
   */
  private async handleNeedsChanges(args: {
    taskId: string;
    reason: string;
  }): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
    this.log(`Requesting changes for task: ${args.taskId}`);
    const result = await this.reviewHandler.handle('needs-changes', [
      args.taskId,
      args.reason,
    ]);
    return this.toMcpResult(result);
  }

  /**
   * Handles review-status command: delegates to PlanReviewHandler.
   */
  private async handleReviewStatus(args: {
    taskId: string;
  }): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
    this.log(`Checking review status for task: ${args.taskId}`);
    const result = await this.reviewHandler.handle('review-status', [args.taskId]);
    return this.toMcpResult(result);
  }

  // ─── Tool Registration ───────────────────────────────────────────────────

  /**
   * Registers all 10 GreenForge MCP tools.
   */
  private registerTools(): void {
    // 1. greenforge_start
    this.mcpServer.tool(
      'greenforge_start',
      'Start a new GreenForge task with a given prompt.',
      {
        prompt: z.string().describe('The task description/prompt'),
        workspaceRoot: z.string().optional().describe('Optional user workspace root; GreenForge initializes git here when missing'),
      },
      async ({ prompt, workspaceRoot }) => this.handleStart({ prompt, workspaceRoot }),
    );
    this.toolNames.push('greenforge_start');

    // 2. greenforge_status
    this.mcpServer.tool(
      'greenforge_status',
      'Get runtime status of GreenForge.',
      {},
      async () => this.handleStatus(),
    );
    this.toolNames.push('greenforge_status');

    // 3. greenforge_list
    this.mcpServer.tool(
      'greenforge_list',
      'List GreenForge tasks, optionally filtered.',
      {
        filter: z
          .string()
          .optional()
          .describe('Optional filter for task listing'),
      },
      async ({ filter }) => this.handleList({ filter }),
    );
    this.toolNames.push('greenforge_list');

    // 4. greenforge_approve
    this.mcpServer.tool(
      'greenforge_approve',
      'Approve a GreenForge plan by task ID.',
      {
        taskId: z.string().describe('The task ID to approve'),
      },
      async ({ taskId }) => this.handleApprove({ taskId }),
    );
    this.toolNames.push('greenforge_approve');

    // 5. greenforge_abort
    this.mcpServer.tool(
      'greenforge_abort',
      'Abort a GreenForge task by task ID.',
      {
        taskId: z.string().describe('The task ID to abort'),
      },
      async ({ taskId }) => this.handleAbort({ taskId }),
    );
    this.toolNames.push('greenforge_abort');

    // 6. greenforge_review
    this.mcpServer.tool(
      'greenforge_review',
      'Review a GreenForge plan by task ID.',
      {
        taskId: z.string().describe('The task ID to review'),
      },
      async ({ taskId }) => this.handleReview({ taskId }),
    );
    this.toolNames.push('greenforge_review');

    // 7. greenforge_feedback
    this.mcpServer.tool(
      'greenforge_feedback',
      'Submit feedback for a GreenForge plan review.',
      {
        taskId: z.string().describe('The task ID to submit feedback for'),
        feedback: z.string().describe('The feedback text'),
        answers: z
          .string()
          .optional()
          .describe('Optional answers in q1:a1,q2:a2 format'),
      },
      async ({ taskId, feedback, answers }) =>
        this.handleFeedback({ taskId, feedback, answers }),
    );
    this.toolNames.push('greenforge_feedback');

    // 8. greenforge_reject
    this.mcpServer.tool(
      'greenforge_reject',
      'Reject a GreenForge plan by task ID with a reason.',
      {
        taskId: z.string().describe('The task ID to reject'),
        reason: z.string().describe('The rejection reason'),
      },
      async ({ taskId, reason }) => this.handleReject({ taskId, reason }),
    );
    this.toolNames.push('greenforge_reject');

    // 9. greenforge_needs_changes
    this.mcpServer.tool(
      'greenforge_needs_changes',
      'Request changes for a GreenForge plan by task ID.',
      {
        taskId: z.string().describe('The task ID to request changes for'),
        reason: z.string().describe('The reason changes are needed'),
      },
      async ({ taskId, reason }) =>
        this.handleNeedsChanges({ taskId, reason }),
    );
    this.toolNames.push('greenforge_needs_changes');

    // 10. greenforge_review_status
    this.mcpServer.tool(
      'greenforge_review_status',
      'Check the review status of a GreenForge plan by task ID.',
      {
        taskId: z.string().describe('The task ID to check review status for'),
      },
      async ({ taskId }) => this.handleReviewStatus({ taskId }),
    );
    this.toolNames.push('greenforge_review_status');

    this.log(`Registered ${this.toolNames.length} MCP tools`);
  }
}