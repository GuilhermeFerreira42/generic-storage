import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SQLiteRepository } from '../src/infrastructure/db/SQLiteRepository.js';
import { TaskRecord, SubtaskNode } from '../src/core/types/Task.js';
import { mkdtemp, rm } from 'fs/promises';
import path from 'path';
import os from 'os';

describe('SQLiteRepository', () => {
  let tempDir: string;
  let dbPath: string;
  let repository: SQLiteRepository;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'gf-db-test-'));
    dbPath = path.join(tempDir, 'test.db');
    repository = new SQLiteRepository(dbPath);
    repository.initialize();
  });

  afterEach(async () => {
    repository.close();
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should initialize with WAL mode and Foreign Keys enabled', () => {
    expect(repository.getJournalMode()).toBe('wal');
    expect(repository.getForeignKeysEnabled()).toBe(true);
  });

  it('should create and retrieve a task with all fields', () => {
    const graph: SubtaskNode[] = [{
      id: 'ST-01', title: 'Sub 1', assignedAgent: 'CODER', dependsOn: [], status: 'PENDING', worktreePath: null, artifactOutput: null
    }];
    
    const task: Omit<TaskRecord, 'createdAt' | 'updatedAt'> = {
      id: 'task-full',
      title: 'Full Task',
      originalPrompt: 'Initial prompt',
      branchName: 'forge/task-full',
      worktreePath: '/tmp/task-full',
      status: 'PENDING',
      planMarkdown: '# Plan',
      subtasksGraph: graph
    };

    repository.createTask(task);
    const retrieved = repository.getTask('task-full');

    expect(retrieved).toBeDefined();
    expect(retrieved?.planMarkdown).toBe('# Plan');
    expect(retrieved?.subtasksGraph).toHaveLength(1);
    expect(retrieved?.subtasksGraph?.[0].id).toBe('ST-01');
  });

  it('should update task status', () => {
    const taskId = 'task-update';
    repository.createTask({
      id: taskId,
      title: 'Update Title',
      originalPrompt: '...',
      branchName: 'forge/update',
      worktreePath: '/tmp/update',
      status: 'PENDING'
    });

    repository.updateTaskStatus(taskId, 'PLANNING');
    const retrieved = repository.getTask(taskId);
    expect(retrieved?.status).toBe('PLANNING');
  });

  it('should fail when updating status of non-existent task', () => {
    expect(() => repository.updateTaskStatus('non-existent', 'PLANNING'))
      .toThrow(/Task non-existent not found/);
  });

  it('should fail when saving graph for non-existent task', () => {
    expect(() => repository.saveSubtasksGraph('non-existent', []))
      .toThrow(/Task non-existent not found/);
  });

  it('should add and retrieve checkpoints', () => {
    const taskId = 'task-checkpoint';
    repository.createTask({
      id: taskId,
      title: 'Checkpoint Title',
      originalPrompt: '...',
      branchName: 'forge/checkpoint',
      worktreePath: '/tmp/checkpoint',
      status: 'BUILDING'
    });

    repository.addCheckpoint(taskId, 'INTENT_WRITTEN', { file: 'index.ts' });
    const checkpoints = repository.getCheckpoints(taskId);

    expect(checkpoints).toHaveLength(1);
    expect(checkpoints[0].phase).toBe('INTENT_WRITTEN');
    expect(checkpoints[0].metadata).toEqual({ file: 'index.ts' });
  });

  it('should fail to add checkpoint for non-existent task (Foreign Key)', () => {
    expect(() => repository.addCheckpoint('ghost-task', 'PHASE', null))
      .toThrow(); // SQLite constraint violation
  });

  it('should record and retrieve audit warnings for visible LLM transport drops', () => {
    repository.recordAuditWarning('LiteLLMProvider', 'DROP DETECTED: temperature', {
      droppedParams: ['temperature'],
    });

    const warnings = repository.getAuditWarnings('LiteLLMProvider');

    expect(warnings).toHaveLength(1);
    expect(warnings[0].source).toBe('LiteLLMProvider');
    expect(warnings[0].message).toContain('DROP DETECTED');
    expect(warnings[0].metadata).toEqual({ droppedParams: ['temperature'] });
  });

  it('should list all audit warnings when no source filter is provided', () => {
    repository.recordAuditWarning('LiteLLMProvider', 'DROP DETECTED: temperature', null);
    repository.recordAuditWarning('Verifier', 'Risk warning', { risk: 'HIGH' });

    const warnings = repository.getAuditWarnings();

    expect(warnings.map(warning => warning.source)).toEqual(['LiteLLMProvider', 'Verifier']);
  });

  describe('Transactions', () => {
    it('should commit changes on success', () => {
      const taskId = 'task-tx-success';
      repository.runInTransaction(() => {
        repository.createTask({
          id: taskId, title: 'TX', originalPrompt: '...', branchName: 'b1', worktreePath: 'p1', status: 'PENDING'
        });
        repository.addCheckpoint(taskId, 'START', null);
      });

      expect(repository.getTask(taskId)).toBeDefined();
      expect(repository.getCheckpoints(taskId)).toHaveLength(1);
    });

    it('should rollback changes on error', () => {
      const taskId = 'task-tx-fail';
      
      expect(() => {
        repository.runInTransaction(() => {
          repository.createTask({
            id: taskId, title: 'TX', originalPrompt: '...', branchName: 'b2', worktreePath: 'p2', status: 'PENDING'
          });
          throw new Error('Forced failure');
        });
      }).toThrow('Forced failure');

      // Task should NOT exist due to rollback
      expect(repository.getTask(taskId)).toBeUndefined();
    });
  });
});
