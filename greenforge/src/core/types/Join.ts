import { z } from 'zod';
import { AgentResultSchema, AgentArtifactSchema, AgentErrorSchema } from './Agent.js';

/**
 * Schema para SubtaskNode dentro do contexto de Join.
 * Deve estar em sincronia com src/core/types/Task.ts
 */
export const SubtaskNodeJoinSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  assignedAgent: z.enum(['CODER', 'TESTER', 'DOCS']).nullable(),
  dependsOn: z.array(z.string()),
  status: z.enum(['PENDING', 'RUNNING', 'DONE', 'FAILED']),
  worktreePath: z.string().nullable(),
  artifactOutput: z.string().nullable(),
});

export const JoinInputSchema = z.object({
  taskId: z.string().min(1),
  subtasksGraph: z.array(SubtaskNodeJoinSchema),
  agentResults: z.array(AgentResultSchema),
});

export type JoinInput = z.infer<typeof JoinInputSchema>;

export const JoinErrorSchema = AgentErrorSchema;

export type JoinError = z.infer<typeof JoinErrorSchema>;

export const JoinResultSchema = z.object({
  ok: z.boolean(),
  taskId: z.string().min(1),
  artifacts: z.array(AgentArtifactSchema),
  missingArtifacts: z.array(z.string()),
  failedSubtasks: z.array(z.string()),
  errors: z.array(JoinErrorSchema),
});

export type JoinResult = z.infer<typeof JoinResultSchema>;
