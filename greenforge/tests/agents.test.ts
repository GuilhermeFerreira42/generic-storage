import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MockMcpClient } from '../src/infrastructure/mcp/MockMcpClient.js';
import { CoderAgent } from '../src/core/agents/CoderAgent.js';
import { TesterAgent } from '../src/core/agents/TesterAgent.js';
import { ReviewerAgent } from '../src/core/agents/ReviewerAgent.js';
import { AgentContext } from '../src/core/types/Agent.js';

describe('Specialist Agents MVP', () => {
  let mcpClient: MockMcpClient;
  const context: AgentContext = {
    taskId: 'task-1',
    subtaskId: 'ST-01',
    worktreePath: '/tmp/wt',
    planMarkdown: '# Plan',
    instructions: 'Implement feature X',
    allowedTools: ['edit_file', 'read_file', 'run_test', 'review_code']
  };

  beforeEach(() => {
    mcpClient = new MockMcpClient();
    mcpClient.setTools([
      { name: 'edit_file', description: 'Edits a file' },
      { name: 'run_test', description: 'Runs tests' },
      { name: 'review_code', description: 'Reviews code' },
      { name: 'forbidden_tool', description: 'A tool not allowed' }
    ]);
  });

  describe('CoderAgent', () => {
    it('1. should call the correct tool via McpClientPort', async () => {
      mcpClient.setResponse('edit_file', { ok: true, content: { diff: 'applied' } });
      const agent = new CoderAgent(mcpClient);
      
      await agent.execute(context);
      
      const calls = mcpClient.getCalls();
      expect(calls.some(c => c.name === 'edit_file')).toBe(true);
    });

    it('2. should return DONE with artifact DIFF on success', async () => {
      mcpClient.setResponse('edit_file', { ok: true, content: 'diff content' });
      const agent = new CoderAgent(mcpClient);
      
      const result = await agent.execute(context);
      
      expect(result.status).toBe('DONE');
      expect(result.artifacts.some(a => a.type === 'DIFF')).toBe(true);
    });

    it('3. should return FAILED with AgentError on failure', async () => {
      mcpClient.setResponse('edit_file', { 
        ok: false, 
        error: { code: 'WRITE_ERROR', message: 'Disk full', retryable: true } 
      });
      const agent = new CoderAgent(mcpClient);
      
      const result = await agent.execute(context);
      
      expect(result.status).toBe('FAILED');
      expect(result.errors[0].code).toBe('WRITE_ERROR');
      expect(result.errors[0].retryable).toBe(true);
    });

    it('4. should fail controlled if edit_file is not in allowedTools', async () => {
        const restrictedContext = { ...context, allowedTools: ['read_file'] };
        const agent = new CoderAgent(mcpClient);
        
        const result = await agent.execute(restrictedContext);
        expect(result.status).toBe('FAILED');
        expect(result.summary).toContain('not allowed');
    });
  });

  describe('TesterAgent', () => {
    it('5. should call test tool via McpClientPort', async () => {
      mcpClient.setResponse('run_test', { ok: true, content: 'All green' });
      const agent = new TesterAgent(mcpClient);
      
      await agent.execute(context);
      
      expect(mcpClient.getCalls().some(c => c.name === 'run_test')).toBe(true);
    });

    it('6. should return TEST_REPORT on success', async () => {
      mcpClient.setResponse('run_test', { ok: true, content: 'PASS: 10/10' });
      const agent = new TesterAgent(mcpClient);
      
      const result = await agent.execute(context);
      
      expect(result.artifacts.some(a => a.type === 'TEST_REPORT')).toBe(true);
    });

    it('7. should fail controlled if run_test is not in allowedTools', async () => {
        const restrictedContext = { ...context, allowedTools: ['edit_file'] };
        const agent = new TesterAgent(mcpClient);
        
        const result = await agent.execute(restrictedContext);
        expect(result.status).toBe('FAILED');
        expect(result.summary).toContain('not allowed');
    });
  });

  describe('ReviewerAgent', () => {
    it('8. should return REVIEW_REPORT approved on success', async () => {
      mcpClient.setResponse('review_code', { ok: true, content: { status: 'APPROVED', comments: [] } });
      const agent = new ReviewerAgent(mcpClient);
      
      const result = await agent.execute(context);
      
      expect(result.status).toBe('DONE');
      expect(result.artifacts.some(a => a.type === 'REVIEW_REPORT')).toBe(true);
    });

    it('9. should return FAILED when review has violations', async () => {
      mcpClient.setResponse('review_code', { ok: true, content: { status: 'VIOLATIONS', comments: ['Issue 1'] } });
      const agent = new ReviewerAgent(mcpClient);
      
      const result = await agent.execute(context);
      
      expect(result.status).toBe('FAILED');
      expect(result.summary).toContain('violations');
    });

    it('10. should return FAILED when review tool returns invalid format', async () => {
        mcpClient.setResponse('review_code', { ok: true, content: { something: 'else' } });
        const agent = new ReviewerAgent(mcpClient);
        
        const result = await agent.execute(context);
        expect(result.status).toBe('FAILED');
        expect(result.errors.some(e => e.code === 'INVALID_FORMAT')).toBe(true);
    });

    it('11. should fail controlled if review_code is not in allowedTools', async () => {
        const restrictedContext = { ...context, allowedTools: ['read_file'] };
        const agent = new ReviewerAgent(mcpClient);
        
        const result = await agent.execute(restrictedContext);
        expect(result.status).toBe('FAILED');
        expect(result.summary).toContain('not allowed');
    });
  });

  describe('General Agent Rules', () => {
    it('12. should reject invalid AgentContext', async () => {
      const agent = new CoderAgent(mcpClient);
      // @ts-expect-error invalid context
      await expect(agent.execute({ taskId: '' }))
        .rejects.toThrow();
    });

    it('13. Agent cannot call tool outside allowedTools (BaseAgent enforcement)', async () => {
      const agent = new CoderAgent(mcpClient);
      await expect(agent.callUnauthorizedTool('forbidden_tool', {}))
        .rejects.toThrow(/not allowed/);
    });

    it('14. No network or real MCP server calls happen in tests', async () => {
      const start = Date.now();
      const agent = new CoderAgent(mcpClient);
      mcpClient.setResponse('edit_file', { ok: true });
      await agent.execute(context);
      expect(Date.now() - start).toBeLessThan(100);
    });
  });
});
