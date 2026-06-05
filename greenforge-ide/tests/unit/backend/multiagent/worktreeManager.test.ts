import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorktreeManager } from '@/server/src/multiagent/worktreeManager';
import * as child_process from 'child_process';
import * as fs from 'fs';

vi.mock('child_process');
vi.mock('fs');

describe('WorktreeManager', () => {
  let manager: WorktreeManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new WorktreeManager('/workspace');
  });

  it('should create a worktree', () => {
    manager.create('task1');

    expect(fs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining('.greenforge-workers'), { recursive: true });
    expect(child_process.execSync).toHaveBeenCalledWith(
      expect.stringContaining('git worktree add'),
      expect.any(Object)
    );
  });

  it('should merge and remove worktree', () => {
    manager.merge('task1');

    expect(child_process.execSync).toHaveBeenCalledWith(
      expect.stringContaining('git merge'),
      expect.any(Object)
    );
    expect(child_process.execSync).toHaveBeenCalledWith(
      expect.stringContaining('git worktree remove'),
      expect.any(Object)
    );
  });

  it('should list worktrees', () => {
    const mockOutput = 'worktree /workspace/.greenforge-workers/task-task1\nbranch refs/heads/greenforge/task1\n\n';
    (child_process.execSync as any).mockReturnValue(mockOutput);

    const list = manager.list();

    expect(list).toHaveLength(1);
    expect(list[0].taskId).toBe('task1');
  });
});
