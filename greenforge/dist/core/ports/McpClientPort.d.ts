import { McpTool, McpCallResult } from '../types/Mcp.js';
/**
 * Porta para interação com o Model Context Protocol (MCP).
 * Desacopla o core de qualquer SDK específico.
 */
export interface McpClientPort {
    /**
     * Lista ferramentas disponíveis no servidor MCP.
     */
    listTools(): Promise<McpTool[]>;
    /**
     * Chama uma ferramenta específica.
     * @param name Nome da ferramenta.
     * @param input Argumentos da ferramenta.
     */
    callTool(name: string, input: Record<string, unknown>): Promise<McpCallResult>;
}
