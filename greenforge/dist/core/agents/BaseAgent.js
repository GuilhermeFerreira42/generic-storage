import { AgentContextSchema, AgentResultSchema } from '../types/Agent.js';
/**
 * Classe base para todos os agentes especialistas.
 * Centraliza validações de contexto, segurança de ferramentas e integridade de resultados.
 */
export class BaseAgent {
    mcpClient;
    role;
    constructor(mcpClient, role) {
        this.mcpClient = mcpClient;
        this.role = role;
    }
    /**
     * Valida o contexto do agente usando o schema Zod.
     */
    validateContext(context) {
        AgentContextSchema.parse(context);
    }
    /**
     * Valida o resultado final do agente usando o schema Zod.
     */
    validateResult(result) {
        return AgentResultSchema.parse(result);
    }
    /**
     * Chama uma ferramenta MCP validando se ela está no escopo permitido do agente.
     */
    async callTool(context, name, args) {
        if (!context.allowedTools.includes(name)) {
            throw new Error(`Security Violation: Tool "${name}" is not allowed for this agent.`);
        }
        return this.mcpClient.callTool(name, args);
    }
    /**
     * Método auxiliar para testes: tenta chamar uma ferramenta não autorizada.
     */
    async callUnauthorizedTool(name, args) {
        const dummyContext = {
            taskId: 't', subtaskId: 's', worktreePath: 'w', planMarkdown: 'p', instructions: 'i',
            allowedTools: [] // No tools allowed
        };
        await this.callTool(dummyContext, name, args);
    }
    /**
     * Método auxiliar para testes: expõe a execução protegida.
     */
    async executeWithTool(context, toolName, args) {
        return this.callTool(context, toolName, args);
    }
    /**
     * Cria um resultado inicial para o agente.
     */
    createInitialResult(context) {
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
//# sourceMappingURL=BaseAgent.js.map