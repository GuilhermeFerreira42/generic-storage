import { BaseAgent } from './BaseAgent.js';
import { AgentContext, AgentResult } from '../types/Agent.js';
import { McpClientPort } from '../ports/McpClientPort.js';
import { z } from 'zod';

/**
 * Schema for validating the content returned by the refactor_code MCP tool.
 */
const RefactorContentSchema = z.object({
  summary: z.string().min(1),
  diff: z.string().min(1),
  filesAffected: z.array(z.string()).optional(),
});

export class RefactorAgent extends BaseAgent {
  constructor(mcpClient: McpClientPort) {
    super(mcpClient, 'REFACTORER');
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    this.validateContext(context);
    const result = this.createInitialResult(context);

    try {
      const callResult = await this.callTool(context, 'refactor_code', {
        worktree: context.worktreePath,
        instructions: context.instructions,
        planMarkdown: context.planMarkdown,
      });

      if (callResult.ok) {
        try {
          const refactorData = RefactorContentSchema.parse(callResult.content);

          result.status = 'DONE';
          result.summary = refactorData.summary;

          result.artifacts.push({
            type: 'DIFF',
            path: 'refactoring/refactor.diff',
            content: refactorData,
          });
        } catch (schemaError: unknown) {
          const message = schemaError instanceof Error ? schemaError.message : String(schemaError);
          result.status = 'FAILED';
          result.summary = `Invalid refactor format: ${message}`;
          result.errors.push({
            code: 'INVALID_FORMAT',
            message: 'The refactor tool returned an unexpected format',
            retryable: false,
          });
        }
      } else {
        result.status = 'FAILED';
        result.summary = `Refactoring failed: ${callResult.error.message}`;
        result.errors.push({
          code: callResult.error.code,
          message: callResult.error.message,
          retryable: callResult.error.retryable,
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      result.status = 'FAILED';
      result.summary = message;
      result.errors.push({
        code: 'EXECUTION_ERROR',
        message,
        retryable: false,
      });
    }

    return this.validateResult(result);
  }
}