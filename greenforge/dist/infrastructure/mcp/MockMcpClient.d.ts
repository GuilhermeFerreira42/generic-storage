import { McpClientPort } from '../../core/ports/McpClientPort.js';
import { McpTool, McpCallResult } from '../../core/types/Mcp.js';
export interface McpCallRecord {
    name: string;
    input: Record<string, unknown>;
}
/**
 * Implementação Mock refinada para testes do McpClientPort.
 * Inclui validação de contrato e inspeção de chamadas.
 */
export declare class MockMcpClient implements McpClientPort {
    private tools;
    private responses;
    private calls;
    /**
     * Configura as ferramentas disponíveis, validando o contrato.
     */
    setTools(tools: McpTool[]): void;
    /**
     * Define uma resposta simulada para uma ferramenta.
     */
    setResponse(toolName: string, result: McpCallResult): void;
    /**
     * Retorna o histórico de chamadas realizadas.
     */
    getCalls(): McpCallRecord[];
    /**
     * Limpa o histórico de chamadas.
     */
    clearCalls(): void;
    listTools(): Promise<McpTool[]>;
    callTool(name: string, input: Record<string, unknown>): Promise<McpCallResult>;
}
