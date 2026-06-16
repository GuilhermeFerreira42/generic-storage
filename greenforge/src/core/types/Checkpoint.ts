export interface CheckpointRecord {
  id: number;
  taskId: string;
  phase: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}
