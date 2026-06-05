import { describe, it, expect, vi, beforeEach } from 'vitest';
import { connectMCPServer } from '@/server/src/mcp/client';

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
      }),
      callTool: vi.fn()
    };

    const mockClientConstructor = vi.fn().mockImplementation(function() {
      return mockClientInstance;
    });
    const mockTransportConstructor = vi.fn().mockImplementation(function() {
      return {};
    });

    const config: any = {
      name: 'sqlite',
      transport: 'stdio',
      command: 'npx',
      args: []
    };

    await connectMCPServer(config, mockRegistry as any, {
      Client: mockClientConstructor as any,
      StdioClientTransport: mockTransportConstructor as any
    });

    expect(mockClientConstructor).toHaveBeenCalled();
    expect(mockTransportConstructor).toHaveBeenCalled();
    expect(mockClientInstance.connect).toHaveBeenCalled();
    expect(mockClientInstance.listTools).toHaveBeenCalled();
    expect(mockRegistry.register).toHaveBeenCalledWith(expect.objectContaining({
      name: 'sqlite__read_db'
    }));
  });
});
