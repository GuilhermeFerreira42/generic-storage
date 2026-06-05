import { describe, it, expect, vi, beforeEach } from 'vitest';
import { connectMCPServer } from '@/server/src/mcp/client';
import { ToolRegistry } from '@/server/src/tools/registry';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

vi.mock('@modelcontextprotocol/sdk/client/index.js');
vi.mock('@modelcontextprotocol/sdk/client/stdio.js');

describe('connectMCPServer', () => {
  let mockRegistry: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRegistry = {
      register: vi.fn()
    };
  });

  it('should connect to server and register tools', async () => {
    const mockClientInstance = {
      connect: vi.fn().mockResolvedValue(undefined),
      listTools: vi.fn().mockResolvedValue({
        tools: [
          { name: 'read_db', description: 'Read database', inputSchema: {} }
        ]
      })
    };

    (Client as any).mockImplementation(() => mockClientInstance);

    const config: any = {
      name: 'sqlite',
      transport: 'stdio',
      command: 'npx',
      args: []
    };

    await connectMCPServer(config, mockRegistry as any);

    expect(mockClientInstance.connect).toHaveBeenCalled();
    expect(mockClientInstance.listTools).toHaveBeenCalled();
    expect(mockRegistry.register).toHaveBeenCalledWith(expect.objectContaining({
      name: 'sqlite__read_db'
    }));
  });
});
