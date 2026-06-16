import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Orchestrator } from '../src/core/Orchestrator.js';
import { SQLiteRepository } from '../src/infrastructure/db/SQLiteRepository.js';
import { mkdtemp, rm } from 'fs/promises';
import path from 'path';
import os from 'os';
import { TaskRecord, SubtaskNode } from '../src/core/types/Task.js';

describe('Orchestrator State Machine', () => {
  let tempDir: string;
  let dbPath: string;
  let repository: SQLiteRepository;
  let orchestrator: Orchestrator;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'gf-orch-test-'));
    dbPath = path.join(tempDir, 'test.db');
    repository = new SQLiteRepository(dbPath);
    repository.initialize();
    orchestrator = new Orchestrator(repository);
  });

  afterEach(async () => {
    repository.close();
    await rm(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  const createInitialTask = (id = 'task-1'): TaskRecord => {
    const task: Omit<TaskRecord, 'createdAt' | 'updatedAt'> = {
      id,
      title: 'Test',
      originalPrompt: 'Prompt',
      branchName: `forge/${id}`,
      worktreePath: `/tmp/${id}`,
      status: 'PENDING'
    };
    repository.createTask(task);
    return repository.getTask(id)!;
  };

  it('1. initial state of a task is PENDING', () => {
    const task = createInitialTask();
    expect(task.status).toBe('PENDING');
  });

  it('2. PENDING -> CLARIFYING with ROUTE_TASK', async () => {
    createInitialTask();
    await orchestrator.trigger('task-1', 'ROUTE_TASK');
    const updated = repository.getTask('task-1');
    expect(updated?.status).toBe('CLARIFYING');
  });

  it('3. CLARIFYING -> PLANNING after clarification', async () => {
    createInitialTask();
    await orchestrator.trigger('task-1', 'ROUTE_TASK');
    await orchestrator.trigger('task-1', 'CLARIFICATION_DONE');
    const updated = repository.getTask('task-1');
    expect(updated?.status).toBe('PLANNING');
  });

  it('4. PLANNING should not go to BUILDING without APPROVE_PLAN', async () => {
    createInitialTask();
    await orchestrator.trigger('task-1', 'ROUTE_TASK');
    await orchestrator.trigger('task-1', 'CLARIFICATION_DONE');
    await orchestrator.trigger('task-1', 'PLAN_GENERATED');
    
    await expect(orchestrator.trigger('task-1', 'START_BUILD'))
      .rejects.toThrow(/Invalid transition/);
  });

  it('5. PLANNING -> BUILDING with approved plan and 1 subtask', async () => {
    const taskId = 'task-single';
    repository.createTask({
      id: taskId, title: 'T', originalPrompt: 'P', branchName: 'b', worktreePath: 'w', status: 'PLANNING',
      subtasksGraph: [{ id: 'S1', title: 'S1', assignedAgent: 'CODER', dependsOn: [], status: 'PENDING', worktreePath: null, artifactOutput: null }]
    });

    await orchestrator.trigger(taskId, 'APPROVE_PLAN');
    await orchestrator.trigger(taskId, 'START_BUILD');
    
    const updated = repository.getTask(taskId);
    expect(updated?.status).toBe('BUILDING');
  });

  it('6. PLANNING -> BUILDING_PARALLEL with approved plan and 2+ independent subtasks', async () => {
    const taskId = 'task-multi';
    repository.createTask({
      id: taskId, title: 'T', originalPrompt: 'P', branchName: 'b', worktreePath: 'w', status: 'PLANNING',
      subtasksGraph: [
        { id: 'S1', title: 'S1', assignedAgent: 'CODER', dependsOn: [], status: 'PENDING', worktreePath: null, artifactOutput: null },
        { id: 'S2', title: 'S2', assignedAgent: 'CODER', dependsOn: [], status: 'PENDING', worktreePath: null, artifactOutput: null }
      ]
    });

    await orchestrator.trigger(taskId, 'APPROVE_PLAN');
    await orchestrator.trigger(taskId, 'START_BUILD');
    
    const updated = repository.getTask(taskId);
    expect(updated?.status).toBe('BUILDING_PARALLEL');
  });

  it('7. invalid transition should throw error', async () => {
    createInitialTask();
    await expect(orchestrator.trigger('task-1', 'BUILD_DONE'))
      .rejects.toThrow(/Invalid transition/);
  });

  it('8. BUILDING -> REVIEWING after BUILD_DONE', async () => {
    const taskId = 'task-build';
    repository.createTask({ id: taskId, title: 'T', originalPrompt: 'P', branchName: 'b', worktreePath: 'w', status: 'BUILDING' });
    
    await orchestrator.trigger(taskId, 'BUILD_DONE');
    const updated = repository.getTask(taskId);
    expect(updated?.status).toBe('REVIEWING');
  });

  it('9. REVIEWING -> VERIFYING when review approved', async () => {
    const taskId = 'task-review';
    repository.createTask({ id: taskId, title: 'T', originalPrompt: 'P', branchName: 'b', worktreePath: 'w', status: 'REVIEWING' });
    
    await orchestrator.trigger(taskId, 'REVIEW_APPROVED');
    const updated = repository.getTask(taskId);
    expect(updated?.status).toBe('VERIFYING');
  });

  it('10. REVIEWING -> BUILDING when there are violations', async () => {
    const taskId = 'task-violations';
    repository.createTask({ id: taskId, title: 'T', originalPrompt: 'P', branchName: 'b', worktreePath: 'w', status: 'REVIEWING' });
    
    await orchestrator.trigger(taskId, 'REVIEW_VIOLATIONS');
    const updated = repository.getTask(taskId);
    expect(updated?.status).toBe('BUILDING');
  });

  it('11. VERIFYING -> COMPLETED when verification passes', async () => {
    const taskId = 'task-verify-pass';
    repository.createTask({ id: taskId, title: 'T', originalPrompt: 'P', branchName: 'b', worktreePath: 'w', status: 'VERIFYING' });
    
    await orchestrator.trigger(taskId, 'VERIFY_SUCCESS');
    const updated = repository.getTask(taskId);
    expect(updated?.status).toBe('COMPLETED');
  });

  it('12. VERIFYING -> BUILDING when verification fails and retry < 3', async () => {
    const taskId = 'task-verify-retry';
    repository.createTask({ id: taskId, title: 'T', originalPrompt: 'P', branchName: 'b', worktreePath: 'w', status: 'VERIFYING' });
    
    await orchestrator.trigger(taskId, 'VERIFY_FAILED');
    const updated = repository.getTask(taskId);
    expect(updated?.status).toBe('BUILDING');
  });

  it('13. VERIFYING -> FAILED when retry >= 3', async () => {
    const taskId = 'task-verify-final-fail';
    repository.createTask({ id: taskId, title: 'T', originalPrompt: 'P', branchName: 'b', worktreePath: 'w', status: 'VERIFYING' });
    
    // Simulate 3 failures
    await orchestrator.trigger(taskId, 'VERIFY_FAILED'); // retry 1 -> BUILDING
    await orchestrator.trigger(taskId, 'BUILD_DONE');    // -> REVIEWING
    await orchestrator.trigger(taskId, 'REVIEW_APPROVED');// -> VERIFYING
    
    await orchestrator.trigger(taskId, 'VERIFY_FAILED'); // retry 2 -> BUILDING
    await orchestrator.trigger(taskId, 'BUILD_DONE');
    await orchestrator.trigger(taskId, 'REVIEW_APPROVED');

    await orchestrator.trigger(taskId, 'VERIFY_FAILED'); // retry 3 -> FAILED
    
    const updated = repository.getTask(taskId);
    expect(updated?.status).toBe('FAILED');
  });

  it('14. BUILDING_PARALLEL -> JOINING only when all subtasks are DONE', async () => {
    const taskId = 'task-parallel-join';
    const graph: SubtaskNode[] = [
      { id: 'S1', title: 'S1', assignedAgent: 'CODER', dependsOn: [], status: 'DONE', worktreePath: null, artifactOutput: 'out1' },
      { id: 'S2', title: 'S2', assignedAgent: 'CODER', dependsOn: [], status: 'RUNNING', worktreePath: null, artifactOutput: null }
    ];
    repository.createTask({ id: taskId, title: 'T', originalPrompt: 'P', branchName: 'b', worktreePath: 'w', status: 'BUILDING_PARALLEL', subtasksGraph: graph });
    
    await expect(orchestrator.trigger(taskId, 'BUILD_DONE'))
      .rejects.toThrow(/Not all subtasks are DONE/);

    graph[1].status = 'DONE';
    graph[1].artifactOutput = 'out2';
    repository.saveSubtasksGraph(taskId, graph);

    await orchestrator.trigger(taskId, 'BUILD_DONE');
    const updated = repository.getTask(taskId);
    expect(updated?.status).toBe('JOINING');
  });

  it('15. JOINING should not go to REVIEWING if artifactOutput is missing', async () => {
    const taskId = 'task-joining-fail';
    const graph: SubtaskNode[] = [
        { id: 'S1', title: 'S1', assignedAgent: 'CODER', dependsOn: [], status: 'DONE', worktreePath: null, artifactOutput: null }
    ];
    repository.createTask({ id: taskId, title: 'T', originalPrompt: 'P', branchName: 'b', worktreePath: 'w', status: 'JOINING', subtasksGraph: graph });
    
    await expect(orchestrator.trigger(taskId, 'BUILD_DONE'))
      .rejects.toThrow(/Missing artifactOutput/);
  });

  it('16. positive test for JOINING -> REVIEWING with all artifacts', async () => {
    const taskId = 'task-joining-pass';
    const graph: SubtaskNode[] = [
        { id: 'S1', title: 'S1', assignedAgent: 'CODER', dependsOn: [], status: 'DONE', worktreePath: 'p1', artifactOutput: 'out1' }
    ];
    repository.createTask({ id: taskId, title: 'T', originalPrompt: 'P', branchName: 'b', worktreePath: 'w', status: 'JOINING', subtasksGraph: graph });
    
    await orchestrator.trigger(taskId, 'BUILD_DONE');
    const updated = repository.getTask(taskId);
    expect(updated?.status).toBe('REVIEWING');
  });

  it('17. COMPLETED state should be terminal', async () => {
    const taskId = 'task-terminal-completed';
    repository.createTask({ id: taskId, title: 'T', originalPrompt: 'P', branchName: 'b', worktreePath: 'w', status: 'COMPLETED' });
    
    await expect(orchestrator.trigger(taskId, 'FAIL_TASK'))
      .rejects.toThrow(/terminal state/);
    
    const unchanged = repository.getTask(taskId);
    expect(unchanged?.status).toBe('COMPLETED');
  });

  it('18. FAILED state should be terminal', async () => {
    const taskId = 'task-terminal-failed';
    repository.createTask({ id: taskId, title: 'T', originalPrompt: 'P', branchName: 'b', worktreePath: 'w', status: 'FAILED' });
    
    await expect(orchestrator.trigger(taskId, 'ROUTE_TASK'))
      .rejects.toThrow(/terminal state/);
    
    const unchanged = repository.getTask(taskId);
    expect(unchanged?.status).toBe('FAILED');
  });

  it('19. PLAN_GENERATED should register checkpoint but keep status', async () => {
    const taskId = 'task-plan-gen';
    repository.createTask({ id: taskId, title: 'T', originalPrompt: 'P', branchName: 'b', worktreePath: 'w', status: 'PLANNING' });
    
    await orchestrator.trigger(taskId, 'PLAN_GENERATED');
    
    const updated = repository.getTask(taskId);
    expect(updated?.status).toBe('PLANNING');
    
    const checkpoints = repository.getCheckpoints(taskId);
    expect(checkpoints.some(c => c.phase === 'PLAN_GENERATED')).toBe(true);
  });

  it('20. APPROVE_PLAN should register checkpoint with metadata', async () => {
    const taskId = 'task-approve';
    repository.createTask({ id: taskId, title: 'T', originalPrompt: 'P', branchName: 'b', worktreePath: 'w', status: 'PLANNING' });
    
    await orchestrator.trigger(taskId, 'APPROVE_PLAN');
    
    const checkpoints = repository.getCheckpoints(taskId);
    const approveCp = checkpoints.find(c => c.phase === 'APPROVE_PLAN');
    expect(approveCp).toBeDefined();
    expect(approveCp?.metadata).toEqual({ approved: true });
  });

  it('21. should rollback status update if checkpoint registration fails', async () => {
    const taskId = 'task-rollback';
    createInitialTask(taskId);
    
    // Mocking addCheckpoint to throw error inside transaction
    const originalAddCheckpoint = repository.addCheckpoint;
    vi.spyOn(repository, 'addCheckpoint').mockImplementation((tid, phase) => {
        if (tid === taskId && phase === 'ROUTE_TASK') {
            throw new Error('Database Error during checkpoint');
        }
        return originalAddCheckpoint.call(repository, tid, phase, null);
    });

    await expect(orchestrator.trigger(taskId, 'ROUTE_TASK'))
      .rejects.toThrow('Database Error during checkpoint');

    // Status should still be PENDING because of transaction rollback
    const task = repository.getTask(taskId);
    expect(task?.status).toBe('PENDING');
  });

  it('22. all status changes should include from/to/event in metadata', async () => {
    const taskId = 'task-metadata';
    createInitialTask(taskId);
    await orchestrator.trigger(taskId, 'ROUTE_TASK');
    
    const checkpoints = repository.getCheckpoints(taskId);
    const routeCp = checkpoints.find(c => c.phase === 'ROUTE_TASK');
    expect(routeCp?.metadata).toEqual({
        from: 'PENDING',
        to: 'CLARIFYING',
        event: 'ROUTE_TASK'
    });
  });
});
