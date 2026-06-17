import { McpClientPort } from '../ports/McpClientPort.js';
import { AgentContext, AgentResult, AgentRole, AgentContextSchema, AgentResultSchema } from '../types/Agent.js';
import { McpCallResult } from '../types/Mcp.js';

/**
 * Classe base para todos os agentes especialistas.
 * Centraliza validações de contexto, segurança de ferramentas e integridade de resultados.
 */
export abstract class BaseAgent {
  constructor(
    protected readonly mcpClient: McpClientPort,
    protected readonly role: AgentRole
  ) {}

  /**
   * Executa a lógica do agente baseado no contexto.
   */
  abstract execute(context: AgentContext): Promise<AgentResult>;

  /**
   * Valida o contexto do agente usando o schema Zod.
   */
  protected validateContext(context: AgentContext): void {
    AgentContextSchema.parse(context);
  }

  /**
   * Valida o resultado final do agente usando o schema Zod.
   */
  protected validateResult(result: AgentResult): AgentResult {
    return AgentResultSchema.parse(result);
  }

  /**
   * Chama uma ferramenta MCP validando se ela está no escopo permitido do agente.
   */
  protected async callTool(
    context: AgentContext,
    name: string,
    args: Record<string, unknown>
  ): Promise<McpCallResult> {
    if (!context.allowedTools.includes(name)) {
      throw new Error(`Security Violation: Tool "${name}" is not allowed for this agent.`);
    }

    return this.mcpClient.callTool(name, args);
  }

  /**
   * Método auxiliar para testes: tenta chamar uma ferramenta não autorizada.
   */
  async callUnauthorizedTool(name: string, args: Record<string, unknown>): Promise<void> {
    const dummyContext: AgentContext = {
        taskId: 't', subtaskId: 's', worktreePath: 'w', planMarkdown: 'p', instructions: 'i',
        allowedTools: [] // No tools allowed
    };
    await this.callTool(dummyContext, name, args);
  }

  /**
   * Método auxiliar para testes: expõe a execução protegida.
   */
  async executeWithTool(context: AgentContext, toolName: string, args: Record<string, unknown>): Promise<McpCallResult> {
    return this.callTool(context, toolName, args);
  }

  /**
   * Cria um resultado inicial para o agente.
   */
  protected createInitialResult(context: AgentContext): AgentResult {
    return {
      agent: this.role,
      taskId: context.taskId,
      subtaskId: context.subtaskId,
      status: 'FAILED',
      summary: '',
      artifacts: [],
      errors: []
    };
  }
}
