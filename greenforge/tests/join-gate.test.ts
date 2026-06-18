import { describe, it, expect, beforeEach } from 'vitest';
import { JoinGate } from '../src/core/JoinGate.js';
import { JoinInput, JoinResultSchema } from '../src/core/types/Join.js';

describe('JoinGate', () => {
  let joinGate: JoinGate;

  beforeEach(() => {
    joinGate = new JoinGate();
  });

  const createValidInput = (): JoinInput => ({
    taskId: 'task-1',
    subtasksGraph: [
      { id: 'ST-01', title: 'T1', assignedAgent: 'CODER', dependsOn: [], status: 'DONE', worktreePath: 'p1', artifactOutput: 'out1' }
    ],
    agentResults: [
      { 
        agent: 'CODER', taskId: 'task-1', subtaskId: 'ST-01', status: 'DONE', summary: 'ok', 
        artifacts: [{ type: 'DIFF', path: 'src/index.ts', content: 'diff' }], 
        errors: [] 
      }
    ]
  });

  it('1. returns ok=true when all subtasks are DONE and artifacts exist', async () => {
    const input = createValidInput();
    const result = await joinGate.join(input);

    expect(result.ok).toBe(true);
    expect(result.artifacts).toHaveLength(1);
    expect(result.failedSubtasks).toHaveLength(0);
    JoinResultSchema.parse(result);
  });

  it('2. fails if a subtask is PENDING', async () => {
    const input = createValidInput();
    input.subtasksGraph[0].status = 'PENDING';
    
    const result = await joinGate.join(input);
    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.code === 'SUBTASK_NOT_DONE')).toBe(true);
  });

  it('3. fails if a subtask is RUNNING', async () => {
    const input = createValidInput();
    input.subtasksGraph[0].status = 'RUNNING';
    
    const result = await joinGate.join(input);
    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.code === 'SUBTASK_NOT_DONE')).toBe(true);
  });

  it('4. fails if a subtask is FAILED', async () => {
    const input = createValidInput();
    input.subtasksGraph[0].status = 'FAILED';

    const result = await joinGate.join(input);
    expect(result.ok).toBe(false);
    expect(result.failedSubtasks).toContain('ST-01');
  });

  it('5. fails if artifactOutput is null in graph', async () => {
    const input = createValidInput();
    input.subtasksGraph[0].artifactOutput = null;

    const result = await joinGate.join(input);
    expect(result.ok).toBe(false);
    expect(result.missingArtifacts).toContain('ST-01');
  });

  it('6. fails if some AgentResult has FAILED status and does NOT consolidate its artifacts', async () => {
    const input = createValidInput();
    input.agentResults[0].status = 'FAILED';
    input.agentResults[0].errors = [{ code: 'ERR', message: 'fail', retryable: false }];
    input.agentResults[0].artifacts = [{ type: 'DIFF', path: 'bad.ts', content: 'failed diff' }];

    const result = await joinGate.join(input);
    expect(result.ok).toBe(false);
    expect(result.failedSubtasks).toContain('ST-01');
    expect(result.artifacts).toHaveLength(0); // Should not consolidate artifacts from FAILED results
  });

  it('7. consolidates artifacts from multiple DONE agents', async () => {
    const input: JoinInput = {
      taskId: 'task-1',
      subtasksGraph: [
        { id: 'ST-01', title: 'T1', assignedAgent: 'CODER', dependsOn: [], status: 'DONE', worktreePath: 'p1', artifactOutput: 'out1' },
        { id: 'ST-02', title: 'T2', assignedAgent: 'TESTER', dependsOn: ['ST-01'], status: 'DONE', worktreePath: 'p2', artifactOutput: 'out2' }
      ],
      agentResults: [
        { 
          agent: 'CODER', taskId: 'task-1', subtaskId: 'ST-01', status: 'DONE', summary: 'ok', 
          artifacts: [{ type: 'DIFF', path: 'src/index.ts' }], errors: [] 
        },
        { 
          agent: 'TESTER', taskId: 'task-1', subtaskId: 'ST-02', status: 'DONE', summary: 'ok', 
          artifacts: [{ type: 'TEST_REPORT', path: 'tests.log' }], errors: [] 
        }
      ]
    };

    const result = await joinGate.join(input);
    expect(result.ok).toBe(true);
    expect(result.artifacts).toHaveLength(2);
    expect(result.artifacts.map(a => a.type)).toContain('DIFF');
    expect(result.artifacts.map(a => a.type)).toContain('TEST_REPORT');
  });

  it('8. preserves artifact metadata', async () => {
    const input = createValidInput();
    input.agentResults[0].artifacts[0].hash = 'sha256-abc';
    input.agentResults[0].artifacts[0].content = { data: 123 };

    const result = await joinGate.join(input);
    expect(result.artifacts[0].hash).toBe('sha256-abc');
    expect(result.artifacts[0].content).toEqual({ data: 123 });
  });

  it('9. detects duplicate AgentResults for the same subtask', async () => {
    const input = createValidInput();
    input.agentResults.push({ ...input.agentResults[0] }); // Duplicate result for ST-01

    const result = await joinGate.join(input);
    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.code === 'DUPLICATE_AGENT_RESULT')).toBe(true);
  });

  it('10. detects orphan AgentResults (not in graph)', async () => {
    const input = createValidInput();
    input.agentResults.push({
        agent: 'CODER', taskId: 'task-1', subtaskId: 'ST-GHOST', status: 'DONE', summary: 'ghost', 
        artifacts: [], errors: []
    });

    const result = await joinGate.join(input);
    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.code === 'ORPHAN_AGENT_RESULT')).toBe(true);
  });

  it('11. rejects malformed input (Zod validation)', async () => {
    const input = createValidInput();
    // @ts-expect-error forcing malformed input
    input.taskId = '';
    
    await expect(joinGate.join(input)).rejects.toThrow();
  });

  it('12. rejects malformed subtask node (Zod validation)', async () => {
    const input = createValidInput();
    // @ts-expect-error forcing malformed status
    input.subtasksGraph[0].status = 'UNKNOWN';
    
    await expect(joinGate.join(input)).rejects.toThrow();
  });

  it('13. validates JoinResult schema in all main paths', async () => {
    // Success path
    const res1 = await joinGate.join(createValidInput());
    expect(() => JoinResultSchema.parse(res1)).not.toThrow();

    // Failure path (Subtask not done)
    const input2 = createValidInput();
    input2.subtasksGraph[0].status = 'PENDING';
    const res2 = await joinGate.join(input2);
    expect(() => JoinResultSchema.parse(res2)).not.toThrow();
  });

  it('14. returns failedSubtasks and missingArtifacts correctly in failures', async () => {
    const input = createValidInput();
    input.subtasksGraph[0].status = 'FAILED';
    input.subtasksGraph[0].artifactOutput = null;

    const result = await joinGate.join(input);
    expect(result.ok).toBe(false);
    expect(result.failedSubtasks).toContain('ST-01');
    expect(result.missingArtifacts).toContain('ST-01');
  });
});
