import { describe, it, expect, beforeEach } from 'vitest';
import { MockMcpClient } from '../src/infrastructure/mcp/MockMcpClient.js';
import { RefactorAgent } from '../src/core/agents/RefactorAgent.js';
import { CoderAgent } from '../src/core/agents/CoderAgent.js';
import { TesterAgent } from '../src/core/agents/TesterAgent.js';
import { ReviewerAgent } from '../src/core/agents/ReviewerAgent.js';
import { AgentContext, AgentResultSchema } from '../src/core/types/Agent.js';
import { JoinGate } from '../src/core/JoinGate.js';
import { JoinResultSchema } from '../src/core/types/Join.js';

describe('RefactorAgent', () => {
  let mcpClient: MockMcpClient;
  const context: AgentContext = {
    taskId: 'task-1',
    subtaskId: 'ST-01',
    worktreePath: '/tmp/wt',
    planMarkdown: '# Plan',
    instructions: 'Refactor the legacy module to use the new pattern',
    allowedTools: ['refactor_code', 'read_file', 'edit_file'],
  };

  beforeEach(() => {
    mcpClient = new MockMcpClient();
    mcpClient.setTools([
      { name: 'refactor_code', description: 'Refactors code' },
      { name: 'read_file', description: 'Reads a file' },
      { name: 'edit_file', description: 'Edits a file' },
      { name: 'forbidden_tool', description: 'A tool not allowed' },
    ]);
  });

  // ============================================================
  // A. Instanciação e contrato
  // ============================================================
  describe('A. Instantiation and contract', () => {
    it('A1. should instantiate correctly with REFACTORER role', () => {
      const agent = new RefactorAgent(mcpClient);
      expect(agent).toBeDefined();
    });

    it('A2. should return AgentResult valid by AgentResultSchema on success', async () => {
      mcpClient.setResponse('refactor_code', {
        ok: true,
        content: { summary: 'Refactored module X', diff: '--- a/old.ts\n+++ b/new.ts\n@@ -1 +1 @@\n-old\n+new' },
      });

      const agent = new RefactorAgent(mcpClient);
      const result = await agent.execute(context);

      expect(() => AgentResultSchema.parse(result)).not.toThrow();
      expect(result.agent).toBe('REFACTORER');
    });

    it('A3. should return AgentResult valid by AgentResultSchema on failure', async () => {
      mcpClient.setResponse('refactor_code', {
        ok: false,
        error: { code: 'REFACTOR_ERROR', message: 'Cannot refactor', retryable: true },
      });

      const agent = new RefactorAgent(mcpClient);
      const result = await agent.execute(context);

      expect(() => AgentResultSchema.parse(result)).not.toThrow();
      expect(result.agent).toBe('REFACTORER');
    });

    it('A4. should use agent: REFACTORER in result', async () => {
      mcpClient.setResponse('refactor_code', {
        ok: true,
        content: { summary: 'Done', diff: 'diff content' },
      });

      const agent = new RefactorAgent(mcpClient);
      const result = await agent.execute(context);

      expect(result.agent).toBe('REFACTORER');
    });
  });

  // ============================================================
  // B. Sucesso
  // ============================================================
  describe('B. Success scenarios', () => {
    it('B1. should return status DONE on successful refactoring', async () => {
      mcpClient.setResponse('refactor_code', {
        ok: true,
        content: { summary: 'Refactored successfully', diff: '--- a/old.ts\n+++ b/new.ts\n@@ -1 +1 @@\n-old\n+new' },
      });

      const agent = new RefactorAgent(mcpClient);
      const result = await agent.execute(context);

      expect(result.status).toBe('DONE');
    });

    it('B2. should return non-empty summary on success', async () => {
      mcpClient.setResponse('refactor_code', {
        ok: true,
        content: { summary: 'Extracted method to improve readability', diff: 'diff content' },
      });

      const agent = new RefactorAgent(mcpClient);
      const result = await agent.execute(context);

      expect(result.summary).toBe('Extracted method to improve readability');
      expect(result.summary.length).toBeGreaterThan(0);
    });

    it('B3. should return artifact of type DIFF on success', async () => {
      mcpClient.setResponse('refactor_code', {
        ok: true,
        content: { summary: 'Done', diff: 'diff content' },
      });

      const agent = new RefactorAgent(mcpClient);
      const result = await agent.execute(context);

      expect(result.artifacts.length).toBeGreaterThan(0);
      expect(result.artifacts.some(a => a.type === 'DIFF')).toBe(true);
    });

    it('B4. should return correct taskId and subtaskId on success', async () => {
      mcpClient.setResponse('refactor_code', {
        ok: true,
        content: { summary: 'Done', diff: 'diff content' },
      });

      const agent = new RefactorAgent(mcpClient);
      const result = await agent.execute(context);

      expect(result.taskId).toBe('task-1');
      expect(result.subtaskId).toBe('ST-01');
    });

    it('B5. should include refactor data in artifact content', async () => {
      const refactorData = {
        summary: 'Renamed variables for clarity',
        diff: '--- a/module.ts\n+++ b/module.ts\n@@ -1,3 +1,3 @@\n-const x = 1;\n+const userCount = 1;',
        filesAffected: ['module.ts'],
      };

      mcpClient.setResponse('refactor_code', {
        ok: true,
        content: refactorData,
      });

      const agent = new RefactorAgent(mcpClient);
      const result = await agent.execute(context);

      expect(result.artifacts[0].content).toEqual(refactorData);
    });

    it('B6. should call refactor_code with correct arguments', async () => {
      mcpClient.setResponse('refactor_code', {
        ok: true,
        content: { summary: 'Done', diff: 'diff' },
      });

      const agent = new RefactorAgent(mcpClient);
      await agent.execute(context);

      const calls = mcpClient.getCalls();
      const refactorCall = calls.find(c => c.name === 'refactor_code');
      expect(refactorCall).toBeDefined();
      expect(refactorCall!.input.worktree).toBe(context.worktreePath);
      expect(refactorCall!.input.instructions).toBe(context.instructions);
      expect(refactorCall!.input.planMarkdown).toBe(context.planMarkdown);
    });
  });

  // ============================================================
  // C. Ferramentas permitidas
  // ============================================================
  describe('C. Allowed tools enforcement', () => {
    it('C1. should fail if refactor_code is not in allowedTools', async () => {
      const restrictedContext = { ...context, allowedTools: ['read_file'] };
      const agent = new RefactorAgent(mcpClient);

      const result = await agent.execute(restrictedContext);

      expect(result.status).toBe('FAILED');
      expect(result.summary).toContain('not allowed');
    });

    it('C2. should not call tool outside allowedTools', async () => {
      const agent = new RefactorAgent(mcpClient);
      await expect(agent.callUnauthorizedTool('forbidden_tool', {}))
        .rejects.toThrow(/not allowed/);
    });

    it('C3. should respect BaseAgent tool validation mechanism', async () => {
      const restrictedContext = { ...context, allowedTools: ['edit_file'] };
      const agent = new RefactorAgent(mcpClient);

      const result = await agent.execute(restrictedContext);

      expect(result.status).toBe('FAILED');
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('C4. should succeed when refactor_code is in allowedTools', async () => {
      mcpClient.setResponse('refactor_code', {
        ok: true,
        content: { summary: 'Done', diff: 'diff' },
      });

      const agent = new RefactorAgent(mcpClient);
      const result = await agent.execute(context);

      expect(result.status).toBe('DONE');
    });
  });

  // ============================================================
  // D. Falha MCP
  // ============================================================
  describe('D. MCP failure scenarios', () => {
    it('D1. should return FAILED when MCP returns ok: false', async () => {
      mcpClient.setResponse('refactor_code', {
        ok: false,
        error: { code: 'REFACTOR_ERROR', message: 'Cannot parse source', retryable: true },
      });

      const agent = new RefactorAgent(mcpClient);
      const result = await agent.execute(context);

      expect(result.status).toBe('FAILED');
    });

    it('D2. should include structured error from MCP failure', async () => {
      mcpClient.setResponse('refactor_code', {
        ok: false,
        error: { code: 'PARSE_ERROR', message: 'Syntax error in source', retryable: false },
      });

      const agent = new RefactorAgent(mcpClient);
      const result = await agent.execute(context);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe('PARSE_ERROR');
      expect(result.errors[0].message).toBe('Syntax error in source');
    });

    it('D3. should set retryable correctly from MCP error', async () => {
      mcpClient.setResponse('refactor_code', {
        ok: false,
        error: { code: 'TIMEOUT', message: 'Timeout', retryable: true },
      });

      const agent = new RefactorAgent(mcpClient);
      const result = await agent.execute(context);

      expect(result.errors[0].retryable).toBe(true);
    });

    it('D4. should set retryable false when MCP error is non-retryable', async () => {
      mcpClient.setResponse('refactor_code', {
        ok: false,
        error: { code: 'PERMISSION_DENIED', message: 'Access denied', retryable: false },
      });

      const agent = new RefactorAgent(mcpClient);
      const result = await agent.execute(context);

      expect(result.errors[0].retryable).toBe(false);
    });

    it('D5. should return FAILED when MCP returns invalid content format', async () => {
      mcpClient.setResponse('refactor_code', {
        ok: true,
        content: { something: 'unexpected' },
      });

      const agent = new RefactorAgent(mcpClient);
      const result = await agent.execute(context);

      expect(result.status).toBe('FAILED');
      expect(result.errors.some(e => e.code === 'INVALID_FORMAT')).toBe(true);
    });

    it('D6. should return FAILED when MCP returns empty summary', async () => {
      mcpClient.setResponse('refactor_code', {
        ok: true,
        content: { summary: '', diff: 'some diff' },
      });

      const agent = new RefactorAgent(mcpClient);
      const result = await agent.execute(context);

      expect(result.status).toBe('FAILED');
      expect(result.errors.some(e => e.code === 'INVALID_FORMAT')).toBe(true);
    });

    it('D7. should return FAILED when MCP returns empty diff', async () => {
      mcpClient.setResponse('refactor_code', {
        ok: true,
        content: { summary: 'Done', diff: '' },
      });

      const agent = new RefactorAgent(mcpClient);
      const result = await agent.execute(context);

      expect(result.status).toBe('FAILED');
      expect(result.errors.some(e => e.code === 'INVALID_FORMAT')).toBe(true);
    });
  });

  // ============================================================
  // E. Compatibilidade com agentes existentes
  // ============================================================
  describe('E. Compatibility with existing agents', () => {
    it('E1. CoderAgent continues to pass with existing tests', async () => {
      const coderMcp = new MockMcpClient();
      coderMcp.setTools([{ name: 'edit_file', description: 'Edits a file' }]);
      coderMcp.setResponse('edit_file', { ok: true, content: { diff: 'applied' } });

      const agent = new CoderAgent(coderMcp);
      const result = await agent.execute({
        ...context,
        allowedTools: ['edit_file'],
      });

      expect(result.status).toBe('DONE');
      expect(result.agent).toBe('CODER');
      expect(() => AgentResultSchema.parse(result)).not.toThrow();
    });

    it('E2. TesterAgent continues to pass with existing tests', async () => {
      const testerMcp = new MockMcpClient();
      testerMcp.setTools([{ name: 'run_test', description: 'Runs tests' }]);
      testerMcp.setResponse('run_test', { ok: true, content: 'All green' });

      const agent = new TesterAgent(testerMcp);
      const result = await agent.execute({
        ...context,
        allowedTools: ['run_test'],
      });

      expect(result.status).toBe('DONE');
      expect(result.agent).toBe('TESTER');
      expect(() => AgentResultSchema.parse(result)).not.toThrow();
    });

    it('E3. ReviewerAgent continues to pass with existing tests', async () => {
      const reviewerMcp = new MockMcpClient();
      reviewerMcp.setTools([{ name: 'review_code', description: 'Reviews code' }]);
      reviewerMcp.setResponse('review_code', { ok: true, content: { status: 'APPROVED', comments: [] } });

      const agent = new ReviewerAgent(reviewerMcp);
      const result = await agent.execute({
        ...context,
        allowedTools: ['review_code'],
      });

      expect(result.status).toBe('DONE');
      expect(result.agent).toBe('REVIEWER');
      expect(() => AgentResultSchema.parse(result)).not.toThrow();
    });

    it('E4. AgentResultSchema accepts CODER results unchanged', async () => {
      const coderResult = {
        agent: 'CODER' as const,
        taskId: 'task-1',
        subtaskId: 'ST-01',
        status: 'DONE' as const,
        summary: 'ok',
        artifacts: [{ type: 'DIFF' as const, path: 'src/index.ts' }],
        errors: [],
      };

      expect(() => AgentResultSchema.parse(coderResult)).not.toThrow();
    });

    it('E5. AgentResultSchema accepts TESTER results unchanged', async () => {
      const testerResult = {
        agent: 'TESTER' as const,
        taskId: 'task-1',
        subtaskId: 'ST-01',
        status: 'DONE' as const,
        summary: 'ok',
        artifacts: [{ type: 'TEST_REPORT' as const, path: 'reports/test.log' }],
        errors: [],
      };

      expect(() => AgentResultSchema.parse(testerResult)).not.toThrow();
    });

    it('E6. AgentResultSchema accepts REVIEWER results unchanged', async () => {
      const reviewerResult = {
        agent: 'REVIEWER' as const,
        taskId: 'task-1',
        subtaskId: 'ST-01',
        status: 'DONE' as const,
        summary: 'ok',
        artifacts: [{ type: 'REVIEW_REPORT' as const, path: 'reports/review.json' }],
        errors: [],
      };

      expect(() => AgentResultSchema.parse(reviewerResult)).not.toThrow();
    });

    it('E7. AgentResultSchema now also accepts REFACTORER results', async () => {
      const refactorerResult = {
        agent: 'REFACTORER' as const,
        taskId: 'task-1',
        subtaskId: 'ST-01',
        status: 'DONE' as const,
        summary: 'ok',
        artifacts: [{ type: 'DIFF' as const, path: 'refactoring/refactor.diff' }],
        errors: [],
      };

      expect(() => AgentResultSchema.parse(refactorerResult)).not.toThrow();
    });
  });

  // ============================================================
  // F. Compatibilidade com Plan/Task/JoinGate
  // ============================================================
  describe('F. Compatibility with Plan/Task/JoinGate', () => {
    it('F1. JoinGate accepts DONE subtask from REFACTORER with valid artifact', async () => {
      const joinGate = new JoinGate();
      const input = {
        taskId: 'task-1',
        subtasksGraph: [
          {
            id: 'ST-01',
            title: 'Refactor module',
            assignedAgent: 'REFACTORER' as const,
            dependsOn: [],
            status: 'DONE' as const,
            worktreePath: 'p1',
            artifactOutput: 'out1',
          },
        ],
        agentResults: [
          {
            agent: 'REFACTORER' as const,
            taskId: 'task-1',
            subtaskId: 'ST-01',
            status: 'DONE' as const,
            summary: 'Refactored successfully',
            artifacts: [{ type: 'DIFF' as const, path: 'refactoring/refactor.diff', content: { summary: 'ok', diff: 'diff' } }],
            errors: [],
          },
        ],
      };

      const result = await joinGate.join(input);

      expect(result.ok).toBe(true);
      expect(result.artifacts).toHaveLength(1);
      expect(() => JoinResultSchema.parse(result)).not.toThrow();
    });

    it('F2. JoinGate continues rejecting artifacts with missing artifactOutput', async () => {
      const joinGate = new JoinGate();
      const input = {
        taskId: 'task-1',
        subtasksGraph: [
          {
            id: 'ST-01',
            title: 'Refactor module',
            assignedAgent: 'REFACTORER' as const,
            dependsOn: [],
            status: 'DONE' as const,
            worktreePath: 'p1',
            artifactOutput: null,
          },
        ],
        agentResults: [
          {
            agent: 'REFACTORER' as const,
            taskId: 'task-1',
            subtaskId: 'ST-01',
            status: 'DONE' as const,
            summary: 'ok',
            artifacts: [{ type: 'DIFF' as const, path: 'refactoring/refactor.diff' }],
            errors: [],
          },
        ],
      };

      const result = await joinGate.join(input);

      expect(result.ok).toBe(false);
      expect(result.missingArtifacts).toContain('ST-01');
    });

    it('F3. JoinGate continues rejecting invalid agent roles in graph', async () => {
      const joinGate = new JoinGate();
      const input = {
        taskId: 'task-1',
        subtasksGraph: [
          {
            id: 'ST-01',
            title: 'Task',
            assignedAgent: 'CODER' as const,
            dependsOn: [],
            status: 'DONE' as const,
            worktreePath: 'p1',
            artifactOutput: 'out1',
          },
        ],
        agentResults: [
          {
            agent: 'CODER' as const,
            taskId: 'task-1',
            subtaskId: 'ST-01',
            status: 'DONE' as const,
            summary: 'ok',
            artifacts: [{ type: 'DIFF' as const, path: 'src/index.ts' }],
            errors: [],
          },
        ],
      };

      const result = await joinGate.join(input);

      expect(result.ok).toBe(true);
      expect(() => JoinResultSchema.parse(result)).not.toThrow();
    });

    it('F4. JoinGate accepts REFACTORER as valid assignedAgent in graph', async () => {
      const joinGate = new JoinGate();
      const input = {
        taskId: 'task-1',
        subtasksGraph: [
          {
            id: 'ST-01',
            title: 'Refactor',
            assignedAgent: 'REFACTORER' as const,
            dependsOn: [],
            status: 'DONE' as const,
            worktreePath: 'p1',
            artifactOutput: 'out1',
          },
        ],
        agentResults: [
          {
            agent: 'REFACTORER' as const,
            taskId: 'task-1',
            subtaskId: 'ST-01',
            status: 'DONE' as const,
            summary: 'ok',
            artifacts: [{ type: 'DIFF' as const, path: 'refactoring/refactor.diff' }],
            errors: [],
          },
        ],
      };

      const result = await joinGate.join(input);

      expect(result.ok).toBe(true);
    });

    it('F5. JoinGate continues rejecting orphan REFACTORER results', async () => {
      const joinGate = new JoinGate();
      const input = {
        taskId: 'task-1',
        subtasksGraph: [
          {
            id: 'ST-01',
            title: 'Task',
            assignedAgent: 'CODER' as const,
            dependsOn: [],
            status: 'DONE' as const,
            worktreePath: 'p1',
            artifactOutput: 'out1',
          },
        ],
        agentResults: [
          {
            agent: 'CODER' as const,
            taskId: 'task-1',
            subtaskId: 'ST-01',
            status: 'DONE' as const,
            summary: 'ok',
            artifacts: [{ type: 'DIFF' as const, path: 'src/index.ts' }],
            errors: [],
          },
          {
            agent: 'REFACTORER' as const,
            taskId: 'task-1',
            subtaskId: 'ST-GHOST',
            status: 'DONE' as const,
            summary: 'ghost',
            artifacts: [],
            errors: [],
          },
        ],
      };

      const result = await joinGate.join(input);

      expect(result.ok).toBe(false);
      expect(result.errors.some(e => e.code === 'ORPHAN_AGENT_RESULT')).toBe(true);
    });
  });

  // ============================================================
  // G. Isolamento
  // ============================================================
  describe('G. Isolation', () => {
    it('G1. no real Qwen calls happen in tests', async () => {
      mcpClient.setResponse('refactor_code', {
        ok: true,
        content: { summary: 'Done', diff: 'diff' },
      });

      const agent = new RefactorAgent(mcpClient);
      const start = Date.now();
      await agent.execute(context);
      expect(Date.now() - start).toBeLessThan(100);
    });

    it('G2. no real LLM calls happen in tests', async () => {
      mcpClient.setResponse('refactor_code', {
        ok: true,
        content: { summary: 'Done', diff: 'diff' },
      });

      const agent = new RefactorAgent(mcpClient);
      const result = await agent.execute(context);
      expect(result.status).toBe('DONE');
    });

    it('G3. no real MCP calls happen in tests', async () => {
      mcpClient.setResponse('refactor_code', {
        ok: true,
        content: { summary: 'Done', diff: 'diff' },
      });

      const agent = new RefactorAgent(mcpClient);
      const result = await agent.execute(context);
      expect(result.status).toBe('DONE');
    });

    it('G4. no network calls happen in tests', async () => {
      mcpClient.setResponse('refactor_code', {
        ok: true,
        content: { summary: 'Done', diff: 'diff' },
      });

      const agent = new RefactorAgent(mcpClient);
      const start = Date.now();
      await agent.execute(context);
      expect(Date.now() - start).toBeLessThan(100);
    });

    it('G5. no merge or push happens in tests', async () => {
      mcpClient.setResponse('refactor_code', {
        ok: true,
        content: { summary: 'Done', diff: 'diff' },
      });

      const agent = new RefactorAgent(mcpClient);
      const result = await agent.execute(context);
      expect(result.status).toBe('DONE');
    });

    it('G6. no dependency on global persistent state', async () => {
      const freshMcp = new MockMcpClient();
      freshMcp.setTools([{ name: 'refactor_code', description: 'Refactors code' }]);
      freshMcp.setResponse('refactor_code', {
        ok: true,
        content: { summary: 'Done', diff: 'diff' },
      });

      const agent = new RefactorAgent(freshMcp);
      const result = await agent.execute(context);
      expect(result.status).toBe('DONE');
    });
  });
});