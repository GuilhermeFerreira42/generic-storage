import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskOrchestrator } from '@/server/src/multiagent/taskOrchestrator';
import { WorktreeManager } from '@/server/src/multiagent/worktreeManager';
import { runAgentLoop } from '@/server/src/agent/loop';

vi.mock('@/server/src/multiagent/worktreeManager');
vi.mock('@/server/src/agent/loop');
vi.mock('@/server/src/tools/registry');

describe('TaskOrchestrator', () => {
  let orchestrator: TaskOrchestrator;
  let mockOnEvent: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnEvent = vi.fn();
    orchestrator = new TaskOrchestrator('/workspace', mockOnEvent);
  });

  it('should enqueue and run a task', async () => {
    (WorktreeManager.prototype.create as any).mockReturnValue('/worktree/path');
    (runAgentLoop as any).mockResolvedValue(undefined);

    const taskId = orchestrator.enqueue('Test task');
    
    expect(taskId).toBeDefined();
    expect(orchestrator.getTasks()).toContainEqual(expect.objectContaining({ id: taskId, status: 'running' }));
    
    // Wait for the async task execution
    await vi.waitFor(() => expect(orchestrator.getTasks().find(t => t.id === taskId)?.status).toBe('completed'));

    expect(WorktreeManager.prototype.create).toHaveBeenCalledWith(taskId);
    expect(runAgentLoop).toHaveBeenCalled();
  });

  it('should handle concurrency limits', async () => {
    (WorktreeManager.prototype.create as any).mockReturnValue('/worktree/path');
    
    // Make agent loop hang for a bit
    let resolveLoop: any;
    const loopPromise = new Promise(res => resolveLoop = res);
    (runAgentLoop as any).mockReturnValue(loopPromise);

    // Enqueue 5 tasks (limit is 3)
    orchestrator.enqueue('task 1');
    orchestrator.enqueue('task 2');
    orchestrator.enqueue('task 3');
    orchestrator.enqueue('task 4');
    orchestrator.enqueue('task 5');

    const tasks = orchestrator.getTasks();
    expect(tasks.filter(t => t.status === 'running')).toHaveLength(3);
    expect(tasks.filter(t => t.status === 'pending')).toHaveLength(2);

    resolveLoop();
  });
});
