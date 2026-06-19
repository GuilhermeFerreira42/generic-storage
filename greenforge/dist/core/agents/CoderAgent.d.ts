import { BaseAgent } from './BaseAgent.js';
import { AgentContext, AgentResult } from '../types/Agent.js';
import { McpClientPort } from '../ports/McpClientPort.js';
export declare class CoderAgent extends BaseAgent {
    constructor(mcpClient: McpClientPort);
    execute(context: AgentContext): Promise<AgentResult>;
}
