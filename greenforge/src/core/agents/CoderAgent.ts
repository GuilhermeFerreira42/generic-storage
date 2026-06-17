import { BaseAgent } from './BaseAgent.js';
import { AgentContext, AgentResult } from '../types/Agent.js';
import { McpClientPort } from '../ports/McpClientPort.js';

export class CoderAgent extends BaseAgent {
  constructor(mcpClient: McpClientPort) {
    super(mcpClient, 'CODER');
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    this.validateContext(context);
    const result = this.createInitialResult(context);

    try {
      // O CoderAgent MVP tenta chamar 'edit_file' se disponível
      const callResult = await this.callTool(context, 'edit_file', { 
        path: `${context.worktreePath}/src/index.ts`,
        content: '// Code' 
      });

      if (callResult.ok) {
        result.status = 'DONE';
        result.summary = 'Code changes applied successfully.';
        result.artifacts.push({
          type: 'DIFF',
          path: 'src/index.ts',
          content: callResult.content
        });
      } else {
        result.status = 'FAILED';
        result.summary = `Failed to apply changes: ${callResult.error.message}`;
        result.errors.push({
          code: callResult.error.code,
          message: callResult.error.message,
          retryable: callResult.error.retryable
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      result.status = 'FAILED';
      result.summary = message;
      result.errors.push({
        code: 'EXECUTION_ERROR',
        message,
        retryable: false
      });
    }

    return this.validateResult(result);
  }
}
