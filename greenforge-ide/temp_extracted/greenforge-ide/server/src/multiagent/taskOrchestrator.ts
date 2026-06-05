// server/src/multiagent/taskOrchestrator.ts
import { randomUUID } from 'crypto';
import { WorktreeManager } from './worktreeManager.js';
import { runAgentLoop } from '../agent/loop.js';
import { buildToolRegistry } from '../tools/registry.js';
import type { OutgoingMessageType } from '../ws/schemas.js';

const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT_AGENTS ?? '3', 10);

interface Task {
  id: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  worktreePath?: string;
  result?: string;
  error?: string;
}

export class TaskOrchestrator {
  private tasks = new Map<string, Task>();
  private runningCount = 0;
  private queue: string[] = [];
  private worktreeManager: WorktreeManager;

  constructor(
    workspaceRoot: string,
    private onEvent: (taskId: string, msg: OutgoingMessageType) => void,
  ) {
    this.worktreeManager = new WorktreeManager(workspaceRoot);
  }

  enqueue(description: string): string {
    const taskId = randomUUID();
    this.tasks.set(taskId, { id: taskId, description, status: 'pending' });
    this.queue.push(taskId);
    this.flush();
    return taskId;
  }

  private flush(): void {
    while (this.runningCount < MAX_CONCURRENT && this.queue.length > 0) {
      const taskId = this.queue.shift()!;
      this.runTask(taskId);
    }
  }

  private async runTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId)!;
    this.runningCount++;
    task.status = 'running';

    let worktreePath: string;

    try {
      worktreePath = this.worktreeManager.create(taskId);
      task.worktreePath = worktreePath;

      const registry = buildToolRegistry(worktreePath);
      const controller = new AbortController();

      await runAgentLoop({
        userMessage: task.description,
        sessionId: taskId,
        workspacePath: worktreePath,
        toolRegistry: registry,
        mode: 'yolo', // agentes paralelos rodam em yolo por padrão
        signal: controller.signal,
        pendingApprovals: new Map(),
        onEvent: (msg) => this.onEvent(taskId, msg),
      });

      task.status = 'completed';

    } catch (err) {
      task.status = 'failed';
      task.error = (err as Error).message;
    } finally {
      this.runningCount--;
      this.flush();
    }
  }

  acceptTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'completed') return;
    this.worktreeManager.merge(taskId);
    this.tasks.delete(taskId);
  }

  rejectTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;
    this.worktreeManager.remove(taskId);
    this.tasks.delete(taskId);
  }

  getTasks(): Task[] {
    return Array.from(this.tasks.values());
  }
}
