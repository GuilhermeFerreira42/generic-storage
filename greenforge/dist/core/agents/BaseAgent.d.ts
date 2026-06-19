import { McpClientPort } from '../ports/McpClientPort.js';
import { AgentContext, AgentResult, AgentRole } from '../types/Agent.js';
import { McpCallResult } from '../types/Mcp.js';
/**
 * Classe base para todos os agentes especialistas.
 * Centraliza validações de contexto, segurança de ferramentas e integridade de resultados.
 */
export declare abstract class BaseAgent {
    protected readonly mcpClient: McpClientPort;
    protected readonly role: AgentRole;
    constructor(mcpClient: McpClientPort, role: AgentRole);
    /**
     * Executa a lógica do agente baseado no contexto.
     */
    abstract execute(context: AgentContext): Promise<AgentResult>;
    /**
     * Valida o contexto do agente usando o schema Zod.
     */
    protected validateContext(context: AgentContext): void;
    /**
     * Valida o resultado final do agente usando o schema Zod.
     */
    protected validateResult(result: AgentResult): AgentResult;
    /**
     * Chama uma ferramenta MCP validando se ela está no escopo permitido do agente.
     */
    protected callTool(context: AgentContext, name: string, args: Record<string, unknown>): Promise<McpCallResult>;
    /**
     * Método auxiliar para testes: tenta chamar uma ferramenta não autorizada.
     */
    callUnauthorizedTool(name: string, args: Record<string, unknown>): Promise<void>;
    /**
     * Método auxiliar para testes: expõe a execução protegida.
     */
    executeWithTool(context: AgentContext, toolName: string, args: Record<string, unknown>): Promise<McpCallResult>;
    /**
     * Cria um resultado inicial para o agente.
     */
    protected createInitialResult(context: AgentContext): AgentResult;
}
