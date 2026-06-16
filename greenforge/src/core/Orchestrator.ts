import { SQLiteRepository } from '../infrastructure/db/SQLiteRepository.js';
import { TaskStatus } from './types/Task.js';
import { OrchestratorEvent } from './types/Orchestrator.js';

export class Orchestrator {
  constructor(private readonly repository: SQLiteRepository) {}

  async trigger(taskId: string, event: OrchestratorEvent): Promise<void> {
    const task = this.repository.getTask(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    const currentStatus = task.status;

    // 1. Bloqueio de Estados Terminais
    if (currentStatus === 'COMPLETED' || currentStatus === 'FAILED') {
        throw new Error(`Invalid transition: Task ${taskId} is in terminal state ${currentStatus}`);
    }

    let nextStatus: TaskStatus | null = null;
    const metadata: Record<string, unknown> = { from: currentStatus, event };

    switch (currentStatus) {
      case 'PENDING':
        if (event === 'ROUTE_TASK') nextStatus = 'CLARIFYING';
        break;
      case 'CLARIFYING':
        if (event === 'CLARIFICATION_DONE') nextStatus = 'PLANNING';
        break;
      case 'PLANNING':
        if (event === 'PLAN_GENERATED') {
            this.repository.addCheckpoint(taskId, 'PLAN_GENERATED', { status: 'PLANNING' });
            return; 
        }
        if (event === 'APPROVE_PLAN') {
            this.repository.addCheckpoint(taskId, 'APPROVE_PLAN', { approved: true });
            return;
        }
        if (event === 'START_BUILD') {
            const checkpoints = this.repository.getCheckpoints(taskId);
            const isApproved = checkpoints.some(c => c.phase === 'APPROVE_PLAN');
            if (!isApproved) throw new Error('Invalid transition: Plan not approved');

            const graph = this.repository.getSubtasksGraph(taskId);
            if (!graph || graph.length === 0) throw new Error('Invalid transition: No subtasks');

            const independentTasks = graph.filter(st => st.dependsOn.length === 0);
            nextStatus = independentTasks.length >= 2 ? 'BUILDING_PARALLEL' : 'BUILDING';
        }
        break;
      case 'BUILDING':
      case 'BUILDING_PARALLEL':
        if (event === 'BUILD_DONE') {
            if (currentStatus === 'BUILDING_PARALLEL') {
                const graph = this.repository.getSubtasksGraph(taskId);
                const allDone = graph?.every(st => st.status === 'DONE');
                if (!allDone) throw new Error('Invalid transition: Not all subtasks are DONE');
                nextStatus = 'JOINING';
            } else {
                nextStatus = 'REVIEWING';
            }
        }
        break;
      case 'JOINING':
        if (event === 'BUILD_DONE') {
            const graph = this.repository.getSubtasksGraph(taskId);
            const allArtifactsPresent = graph?.every(st => st.artifactOutput !== null);
            if (!allArtifactsPresent) throw new Error('Invalid transition: Missing artifactOutput');
            nextStatus = 'REVIEWING';
        }
        break;
      case 'REVIEWING':
        if (event === 'REVIEW_APPROVED') nextStatus = 'VERIFYING';
        if (event === 'REVIEW_VIOLATIONS') nextStatus = 'BUILDING';
        break;
      case 'VERIFYING':
        if (event === 'VERIFY_SUCCESS') nextStatus = 'COMPLETED';
        if (event === 'VERIFY_FAILED') {
            const failures = this.repository.getCheckpoints(taskId).filter(c => c.phase === 'VERIFY_FAILED').length;
            if (failures < 2) { // 0, 1 -> total 3 tentativas
                nextStatus = 'BUILDING';
            } else {
                nextStatus = 'FAILED';
            }
        }
        break;
    }

    if (event === 'FAIL_TASK') nextStatus = 'FAILED';

    if (!nextStatus) {
      throw new Error(`Invalid transition: ${event} from ${currentStatus}`);
    }

    metadata.to = nextStatus;

    this.repository.runInTransaction(() => {
      this.repository.updateTaskStatus(taskId, nextStatus!);
      this.repository.addCheckpoint(taskId, event, metadata);
    });
  }
}
