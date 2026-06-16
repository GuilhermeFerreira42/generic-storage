import { TaskStatus } from './Task.js';

export type OrchestratorEvent =
  | 'ROUTE_TASK'
  | 'CLARIFICATION_DONE'
  | 'PLAN_GENERATED'
  | 'APPROVE_PLAN'
  | 'START_BUILD'
  | 'BUILD_DONE'
  | 'REVIEW_APPROVED'
  | 'REVIEW_VIOLATIONS'
  | 'VERIFY_SUCCESS'
  | 'VERIFY_FAILED'
  | 'FAIL_TASK';

export interface StateTransitionResult {
  previousStatus: TaskStatus;
  newStatus: TaskStatus;
  taskId: string;
}
