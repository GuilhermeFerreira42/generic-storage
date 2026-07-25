export type Intent =
  | 'NORMAL_CHAT'
  | 'DEVELOPMENT_TASK'
  | 'WRITING_TASK'
  | 'PLANNING_TASK'
  | 'RESEARCH_TASK';

export interface IntentResult {
  intention: Intent;
  confidence: number;
}
