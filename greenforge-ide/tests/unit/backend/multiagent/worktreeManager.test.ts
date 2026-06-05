import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorktreeManager } from '@/server/src/multiagent/worktreeManager';
import * as child_process from 'child_process';
import * as fs from 'fs';

vi.mock('child_process', () => ({
  execSync: vi.fn(),
  spawn: vi.fn()
}));
vi.mock('fs', () => ({
  mkdirSync: vi.fn(),
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  promises: {
    readdir: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
  }
}));

describe('WorktreeManager', () => {
  let manager: WorktreeManager;
  let mockedChildProcess = vi.mocked(child_process);
  let mockedFs = vi.mocked(fs);

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new WorktreeManager('/workspace');
    mockedChildProcess = vi.mocked(child_process);
    mockedFs = vi.mocked(fs);
  });

  it('should create a worktree', () => {
    manager.create('task1');

    expect(mockedFs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining('.greenforge-workers'), { recursive: true });
    expect(mockedChildProcess.execSync).toHaveBeenCalledWith(
      expect.stringContaining('git worktree add'),
      expect.any(Object)
    );
  });

  it('should merge and remove worktree', () => {
    mockedFs.existsSync.mockReturnValue(true as any);
    manager.merge('task1');

    expect(mockedChildProcess.execSync).toHaveBeenCalledWith(
      expect.stringContaining('git merge'),
      expect.any(Object)
    );
    expect(mockedChildProcess.execSync).toHaveBeenCalledWith(
      expect.stringContaining('git worktree remove'),
      expect.any(Object)
    );
  });

  it('should list worktrees', () => {
    const mockOutput = 'worktree /workspace/.greenforge-workers/task-task1\nbranch refs/heads/greenforge/task1\n\n';
    mockedChildProcess.execSync.mockReturnValue(mockOutput as any);

    const list = manager.list();

    expect(list).toHaveLength(1);
    expect(list[0].taskId).toBe('task1');
  });
});
