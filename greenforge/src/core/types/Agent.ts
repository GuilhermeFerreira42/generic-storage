import { z } from 'zod';

export type AgentRole = 'CODER' | 'TESTER' | 'REVIEWER';

export const AgentArtifactSchema = z.object({
  type: z.enum(['DIFF', 'TEST_REPORT', 'REVIEW_REPORT', 'DOCS', 'LINT_REPORT']),
  path: z.string().min(1),
  hash: z.string().nullable().optional(),
  content: z.unknown().optional(),
});

export type AgentArtifact = z.infer<typeof AgentArtifactSchema>;

export const AgentErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  retryable: z.boolean(),
});

export type AgentError = z.infer<typeof AgentErrorSchema>;

export const AgentContextSchema = z.object({
  taskId: z.string().min(1),
  subtaskId: z.string().min(1),
  worktreePath: z.string().min(1),
  planMarkdown: z.string().min(1),
  instructions: z.string().min(1),
  allowedTools: z.array(z.string()),
});

export type AgentContext = z.infer<typeof AgentContextSchema>;

export const AgentResultSchema = z.object({
  agent: z.enum(['CODER', 'TESTER', 'REVIEWER']),
  taskId: z.string().min(1),
  subtaskId: z.string().min(1),
  status: z.enum(['DONE', 'FAILED']),
  summary: z.string(),
  artifacts: z.array(AgentArtifactSchema),
  errors: z.array(AgentErrorSchema),
});

export type AgentResult = z.infer<typeof AgentResultSchema>;
