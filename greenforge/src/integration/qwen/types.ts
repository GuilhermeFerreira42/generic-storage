import { z } from 'zod';
import { DiffReportSchema } from '../../core/types/DiffLens.js';
import { JoinResultSchema } from '../../core/types/Join.js';
import { VerificationResultSchema } from '../../core/types/Verifier.js';

export const HookEventSchema = z.enum([
  'SessionStart',
  'SessionEnd',
  'UserPromptSubmit',
  'PreToolUse',
  'PostToolUse'
]);

export type HookEvent = z.infer<typeof HookEventSchema>;

export const HookSimulationInputSchema = z.object({
  event: HookEventSchema,
  payload: z.record(z.unknown())
});

export type HookSimulationInput = z.infer<typeof HookSimulationInputSchema>;

export const HookSimulationResultSchema = z.object({
  ok: z.boolean(),
  event: HookEventSchema,
  action: z.enum(['ALLOW', 'BLOCK', 'NOOP']),
  reason: z.string(),
  metadata: z.record(z.unknown()).optional()
});

export type HookSimulationResult = z.infer<typeof HookSimulationResultSchema>;

export const QwenE2EResultSchema = z.object({
  taskId: z.string(),
  finalStatus: z.enum(['APPROVED', 'BLOCKED', 'RETRYABLE']),
  checkpoints: z.number(),
  auditReportGenerated: z.boolean(),
  verificationStatus: z.string(),
  diffReport: DiffReportSchema.optional(),
  joinResult: JoinResultSchema.optional(),
  verificationResult: VerificationResultSchema.optional()
});

export type QwenE2EResult = z.infer<typeof QwenE2EResultSchema>;