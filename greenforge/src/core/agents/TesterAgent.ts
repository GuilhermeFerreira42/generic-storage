import { BaseAgent } from './BaseAgent.js';
import { AgentContext, AgentResult } from '../types/Agent.js';
import { McpClientPort } from '../ports/McpClientPort.js';

export class TesterAgent extends BaseAgent {
  constructor(mcpClient: McpClientPort) {
    super(mcpClient, 'TESTER');
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    this.validateContext(context);
    const result = this.createInitialResult(context);

    try {
      const callResult = await this.callTool(context, 'run_test', { 
        command: 'npm test'
      });

      if (callResult.ok) {
        result.status = 'DONE';
        result.summary = 'Tests executed successfully.';
        result.artifacts.push({
          type: 'TEST_REPORT',
          path: 'reports/test.log',
          content: callResult.content
        });
      } else {
        result.status = 'FAILED';
        result.summary = `Test failure: ${callResult.error.message}`;
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
