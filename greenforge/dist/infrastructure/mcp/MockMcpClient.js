import { McpToolSchema, McpCallResultSchema } from '../../core/types/Mcp.js';
/**
 * Implementação Mock refinada para testes do McpClientPort.
 * Inclui validação de contrato e inspeção de chamadas.
 */
export class MockMcpClient {
    tools = [];
    responses = new Map();
    calls = [];
    /**
     * Configura as ferramentas disponíveis, validando o contrato.
     */
    setTools(tools) {
        for (const tool of tools) {
            McpToolSchema.parse(tool);
        }
        this.tools = tools;
    }
    /**
     * Define uma resposta simulada para uma ferramenta.
     */
    setResponse(toolName, result) {
        this.responses.set(toolName, result);
    }
    /**
     * Retorna o histórico de chamadas realizadas.
     */
    getCalls() {
        return [...this.calls];
    }
    /**
     * Limpa o histórico de chamadas.
     */
    clearCalls() {
        this.calls = [];
    }
    async listTools() {
        return [...this.tools];
    }
    async callTool(name, input) {
        // Registrar a chamada
        this.calls.push({ name, input });
        const tool = this.tools.find(t => t.name === name);
        if (!tool) {
            return {
                ok: false,
                error: {
                    code: 'TOOL_NOT_FOUND',
                    message: `Tool ${name} not found`,
                    retryable: false
                }
            };
        }
        const response = this.responses.get(name);
        if (!response) {
            return {
                ok: false,
                error: {
                    code: 'NO_MOCK_RESPONSE',
                    message: `No mock response set for tool ${name}`,
                    retryable: true
                }
            };
        }
        // Validação estrutural rigorosa do resultado (Union Discriminada)
        try {
            McpCallResultSchema.parse(response);
        }
        catch {
            return {
                ok: false,
                error: {
                    code: 'MALFORMED_RESPONSE',
                    message: 'The tool returned a malformed response contradicting the MCP contract',
                    retryable: false
                }
            };
        }
        return response;
    }
}
//# sourceMappingURL=MockMcpClient.js.map