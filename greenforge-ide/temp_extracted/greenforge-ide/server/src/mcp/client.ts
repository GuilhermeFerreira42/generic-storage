// server/src/mcp/client.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { ToolRegistry } from '../tools/registry.js';
import type { Tool } from '../tools/types.js';
import type { MCPServerConfig } from './loader.js';

// Adaptador que envolve uma ferramenta MCP na interface Tool do GreenForge
class MCPToolAdapter implements Tool {
  isDestructive = true; // assume destrutivo por segurança

  constructor(
    public name: string,
    public description: string,
    public inputSchema: Record<string, unknown>,
    private client: Client,
    private originalName: string,
  ) {}

  async execute(input: Record<string, unknown>): Promise<string> {
    const result = (await this.client.callTool({
      name: this.originalName,
      arguments: input,
    })) as any;

    return (result.content || [])
      .filter((c: any) => c.type === 'text')
      .map((c: any) => c.text ?? '')
      .join('\n');
  }

  describeAction(input: Record<string, unknown>): string {
    return `Executar ferramenta MCP "${this.originalName}" com args: ${JSON.stringify(input)}`;
  }
}

export async function connectMCPServer(
  config: MCPServerConfig,
  registry: ToolRegistry,
): Promise<void> {
  if (config.transport !== 'stdio' || !config.command) {
    console.error(`[MCP] Transporte "${config.transport}" não suportado ainda para servidor "${config.name}"`);
    return;
  }

  const transport = new StdioClientTransport({
    command: config.command,
    args: config.args ?? [],
    env: {
      ...process.env,
      ...config.env,
    } as Record<string, string>,
  });

  const client = new Client(
    { name: 'greenforge-mcp-client', version: '1.0.0' },
    { capabilities: {} }
  );

  try {
    await client.connect(transport);

    const { tools } = await client.listTools();

    for (const tool of tools) {
      // Prefixo com nome do servidor para evitar colisões
      const prefixedName = `${config.name}__${tool.name}`;

      registry.register(new MCPToolAdapter(
        prefixedName,
        `[${config.name}] ${tool.description ?? ''}`,
        tool.inputSchema as Record<string, unknown>,
        client,
        tool.name,
      ));

      console.error(`[MCP] Ferramenta registrada: ${prefixedName}`);
    }
  } catch (err) {
    console.error(`[MCP] Falha ao conectar "${config.name}":`, (err as Error).message);
  }
}
