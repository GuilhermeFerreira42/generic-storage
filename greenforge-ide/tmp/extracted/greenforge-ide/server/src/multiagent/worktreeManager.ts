// server/src/multiagent/worktreeManager.ts
import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';

export interface WorktreeInfo {
  taskId: string;
  path: string;
  branch: string;
  status: 'running' | 'awaiting_approval' | 'completed' | 'failed';
}

export class WorktreeManager {
  private worktreesDir: string;

  constructor(private workspaceRoot: string) {
    this.worktreesDir = path.join(workspaceRoot, '.greenforge-workers');
  }

  create(taskId: string): string {
    mkdirSync(this.worktreesDir, { recursive: true });

    const worktreePath = path.join(this.worktreesDir, `task-${taskId}`);
    const branchName = `greenforge/${taskId}`;

    execSync(
      `git worktree add "${worktreePath}" -b "${branchName}"`,
      { cwd: this.workspaceRoot, stdio: 'pipe' }
    );

    return worktreePath;
  }

  merge(taskId: string): void {
    execSync(
      `git merge --no-ff "greenforge/${taskId}" -m "GreenForge: merge task ${taskId}"`,
      { cwd: this.workspaceRoot, stdio: 'pipe' }
    );

    this.remove(taskId);
  }

  remove(taskId: string): void {
    const worktreePath = path.join(this.worktreesDir, `task-${taskId}`);

    if (existsSync(worktreePath)) {
      try {
        execSync(
          `git worktree remove "${worktreePath}" --force`,
          { cwd: this.workspaceRoot, stdio: 'pipe' }
        );
      } catch (e) {
        console.error(`Erro ao remover worktree: ${(e as Error).message}`);
      }
    }

    try {
      execSync(
        `git branch -D "greenforge/${taskId}"`,
        { cwd: this.workspaceRoot, stdio: 'pipe' }
      );
    } catch {
      // Branch pode já não existir
    }
  }

  list(): WorktreeInfo[] {
    try {
      const output = execSync('git worktree list --porcelain', {
        cwd: this.workspaceRoot,
        encoding: 'utf-8',
        stdio: 'pipe',
      });

      return output
        .split('\n\n')
        .filter((block) => block.includes('greenforge/'))
        .map((block) => {
          const worktreeLine = block.match(/^worktree (.+)/m);
          const branchLine = block.match(/^branch refs\/heads\/(.+)/m);
          const branch = branchLine?.[1] ?? '';
          const taskId = branch.replace('greenforge/', '');

          return {
            taskId,
            path: worktreeLine?.[1] ?? '',
            branch,
            status: 'running' as const,
          };
        });
    } catch {
      return [];
    }
  }
}
