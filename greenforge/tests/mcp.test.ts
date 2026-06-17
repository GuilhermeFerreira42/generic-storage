import { describe, it, expect, beforeEach } from 'vitest';
import { MockMcpClient } from '../src/infrastructure/mcp/MockMcpClient.js';

describe('MCP Client Base Integration', () => {
  let mcpClient: MockMcpClient;

  beforeEach(() => {
    mcpClient = new MockMcpClient();
  });

  it('1. should list available tools via mock', async () => {
    const tools = [
      { name: 'test_tool', description: 'A test tool' }
    ];
    mcpClient.setTools(tools);

    const result = await mcpClient.listTools();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('test_tool');
  });

  it('2. should call tool successfully', async () => {
    mcpClient.setTools([{ name: 'success_tool' }]);
    mcpClient.setResponse('success_tool', { ok: true, content: { result: 'success' } });

    const result = await mcpClient.callTool('success_tool', { param: 1 });
    expect(result.ok).toBe(true);
    expect(result.ok === true && result.content).toEqual({ result: 'success' });
  });

  it('3. should register and clear calls', async () => {
    mcpClient.setTools([{ name: 't1' }]);
    mcpClient.setResponse('t1', { ok: true });

    await mcpClient.callTool('t1', { input: 'a' });
    await mcpClient.callTool('t1', { input: 'b' });

    const calls = mcpClient.getCalls();
    expect(calls).toHaveLength(2);
    expect(calls[0]).toEqual({ name: 't1', input: { input: 'a' } });

    mcpClient.clearCalls();
    expect(mcpClient.getCalls()).toHaveLength(0);
  });

  it('4. should reject malformed tools in setTools', () => {
    // @ts-expect-error missing name
    expect(() => mcpClient.setTools([{ description: 'no name' }]))
        .toThrow();
    
    expect(() => mcpClient.setTools([{ name: '' }]))
        .toThrow();
  });

  it('5. should return structured error when tool does not exist', async () => {
    const result = await mcpClient.callTool('ghost_tool', {});
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error?.code).toBe('TOOL_NOT_FOUND');
  });

  it('6. should reject contradictory response (ok: true with error)', async () => {
    mcpClient.setTools([{ name: 'bad_tool' }]);
    // @ts-expect-error contradictory state
    mcpClient.setResponse('bad_tool', { ok: true, error: { code: 'X', message: 'Y', retryable: false } });

    const result = await mcpClient.callTool('bad_tool', {});
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error?.code).toBe('MALFORMED_RESPONSE');
  });

  it('7. should reject contradictory response (ok: false without error)', async () => {
    mcpClient.setTools([{ name: 'bad_tool_2' }]);
    // @ts-expect-error missing error in ok: false
    mcpClient.setResponse('bad_tool_2', { ok: false });

    const result = await mcpClient.callTool('bad_tool_2', {});
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error?.code).toBe('MALFORMED_RESPONSE');
  });

  it('8. should reject malformed error (retryable not boolean)', async () => {
    mcpClient.setTools([{ name: 'bad_tool_3' }]);
    // @ts-expect-error bad retryable
    mcpClient.setResponse('bad_tool_3', { ok: false, error: { code: 'X', message: 'Y', retryable: 'no' } });

    const result = await mcpClient.callTool('bad_tool_3', {});
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error?.code).toBe('MALFORMED_RESPONSE');
  });

  it('9. ensures core depends only on MCP port/interface', () => {
    const client: import('../src/core/ports/McpClientPort.js').McpClientPort = mcpClient;
    expect(client).toBeDefined();
  });
});
