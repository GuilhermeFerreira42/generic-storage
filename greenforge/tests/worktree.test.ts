import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WorktreeManager } from '../src/infrastructure/git/WorktreeManager.js';
import { execa } from 'execa';
import { mkdir, rm, writeFile, mkdtemp } from 'fs/promises';
import path from 'path';
import os from 'os';

describe('WorktreeManager', () => {
  let tempRepoPath: string;
  let worktreeManager: WorktreeManager;

  const setupTempRepo = async () => {
    // Uso de mkdtemp para evitar colisões
    tempRepoPath = await mkdtemp(path.join(os.tmpdir(), 'gf-test-repo-'));
    
    // Initialize git repo
    await execa('git', ['init'], { cwd: tempRepoPath });
    await execa('git', ['config', 'user.email', 'test@example.com'], { cwd: tempRepoPath });
    await execa('git', ['config', 'user.name', 'Test User'], { cwd: tempRepoPath });
    
    // Create an initial commit (needed for worktree)
    await writeFile(path.join(tempRepoPath, 'README.md'), '# Test Repo');
    await execa('git', ['add', '.'], { cwd: tempRepoPath });
    await execa('git', ['commit', '-m', 'initial commit'], { cwd: tempRepoPath });
  };

  beforeEach(async () => {
    await setupTempRepo();
    worktreeManager = new WorktreeManager(tempRepoPath);
  });

  afterEach(async () => {
    try {
      const { stdout } = await execa('git', ['worktree', 'list', '--porcelain'], { cwd: tempRepoPath });
      const lines = stdout.split('\n');
      for (const line of lines) {
        if (line.startsWith('worktree ')) {
          const wtPath = line.replace('worktree ', '');
          if (wtPath !== tempRepoPath) {
            await execa('git', ['worktree', 'remove', wtPath, '--force'], { cwd: tempRepoPath });
          }
        }
      }
    } catch (e) {
      // Ignore errors during worktree removal in cleanup
    }
    
    await rm(tempRepoPath, { recursive: true, force: true });
  });

  it('should provision a worktree successfully', async () => {
    const taskId = 'task-123';
    const info = await worktreeManager.provision(taskId);
    
    expect(info.taskId).toBe(taskId);
    expect(info.branch).toBe(`forge/task-${taskId}`);
    
    // Verify directory exists
    const { stdout: gitWtList } = await execa('git', ['worktree', 'list'], { cwd: tempRepoPath });
    expect(gitWtList).toContain(taskId);
  });

  it('should fail if taskId already exists (directory exists)', async () => {
    const taskId = 'task-dup';
    await worktreeManager.provision(taskId);
    
    await expect(worktreeManager.provision(taskId))
      .rejects.toThrow(/Worktree already exists/);
  });

  it('should fail if branch already exists', async () => {
    const taskId = 'task-branch-dup';
    const branchName = `forge/task-${taskId}`;
    
    // Create branch manually
    await execa('git', ['branch', branchName], { cwd: tempRepoPath });
    
    await expect(worktreeManager.provision(taskId))
      .rejects.toThrow(/Branch already exists/);
  });

  it('should deprovision a worktree and its branch successfully', async () => {
    const taskId = 'task-to-remove';
    await worktreeManager.provision(taskId);
    
    await worktreeManager.deprovision(taskId);
    
    // Verify worktree directory is gone from git list
    const { stdout: gitWtList } = await execa('git', ['worktree', 'list'], { cwd: tempRepoPath });
    expect(gitWtList).not.toContain(taskId);

    // Verify branch is gone
    const branchName = `forge/task-${taskId}`;
    try {
      await execa('git', ['show-ref', '--verify', '--quiet', `refs/heads/${branchName}`], { cwd: tempRepoPath });
      throw new Error('Branch still exists');
    } catch (error: any) {
      // Expect error because branch should not exist
      if (error.message === 'Branch still exists') throw error;
    }
  });

  it('should list active worktrees', async () => {
    await worktreeManager.provision('task-a');
    await worktreeManager.provision('task-b');
    
    const list = await worktreeManager.list();
    const taskIds = list.map(wt => wt.taskId);
    
    expect(taskIds).toContain('task-a');
    expect(taskIds).toContain('task-b');
    expect(list.length).toBe(2);
  });

  describe('Invalid taskId validation', () => {
    const invalidIds = [
      '',                // vazio
      '../../outside',   // path traversal
      'abc/def',         // barra
      'abc\\def',        // contra-barra
      '..',              // apenas pontos (duplo)
      '.',               // apenas um ponto
      '.task',           // começa com ponto
      'task.',           // termina com ponto
      'task;rm-rf',      // metacaracteres perigosos
      'a'.repeat(81),    // muito longo
    ];

    it.each(invalidIds)('should reject invalid taskId: "%s"', async (id) => {
      await expect(worktreeManager.provision(id))
        .rejects.toThrow();
      
      await expect(worktreeManager.deprovision(id))
        .rejects.toThrow();
    });
  });
});
