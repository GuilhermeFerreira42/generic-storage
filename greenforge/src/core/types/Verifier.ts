import { z } from 'zod';
import { DiffReportSchema, RiskLevelSchema } from './DiffLens.js';
import { JoinResultSchema } from './Join.js';

export const CommandCheckResultSchema = z.object({
  command: z.string().min(1),
  exitCode: z.number().int(),
  stdout: z.string().optional(),
  stderr: z.string().optional(),
  durationMs: z.number().nonnegative().optional(),
});

export type CommandCheckResult = z.infer<typeof CommandCheckResultSchema>;

export const VerificationInputSchema = z.object({
  taskId: z.string().min(1),
  diffReport: DiffReportSchema,
  joinResult: JoinResultSchema,
  testResult: CommandCheckResultSchema.optional(),
  lintResult: CommandCheckResultSchema.optional(),
});

export type VerificationInput = z.infer<typeof VerificationInputSchema>;

export const VerificationStatusSchema = z.enum(['APPROVED', 'BLOCKED', 'RETRYABLE']);
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;

export const VerificationResultSchema = z.object({
  taskId: z.string().min(1),
  status: VerificationStatusSchema,
  riskLevel: RiskLevelSchema,
  reasons: z.array(z.string()),
  retryable: z.boolean(),
  createdAt: z.string().datetime(),
});

export type VerificationResult = z.infer<typeof VerificationResultSchema>;
