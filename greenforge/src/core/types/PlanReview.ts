import { z } from 'zod';

/**
 * Fase 15 — Tipos e schemas Zod para a camada de revisão de planos.
 *
 * Define os contratos públicos para:
 * - visualização de plano para revisão humana
 * - feedback textual e respostas de clarificação
 * - aprovação e rejeição de plano
 * - status de revisão
 */

// ─── Review Status ───

export const PlanReviewStatusSchema = z.enum([
  'PENDING_REVIEW',
  'APPROVED',
  'REJECTED',
  'NEEDS_CHANGES',
]);

export type PlanReviewStatus = z.infer<typeof PlanReviewStatusSchema>;

// ─── Review Input ───

export const PlanReviewInputSchema = z.object({
  taskId: z.string().min(1),
});

export type PlanReviewInput = z.infer<typeof PlanReviewInputSchema>;

// ─── Review View (rendered structured output) ───

export const PlanReviewViewSchema = z.object({
  taskId: z.string().min(1),
  title: z.string().min(1),
  originalPrompt: z.string().min(1),
  questions: z.array(z.object({
    id: z.string().min(1),
    question: z.string().min(1),
    required: z.boolean(),
  })),
  subtasks: z.array(z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    assignedAgent: z.enum(['CODER', 'TESTER', 'REVIEWER', 'REFACTORER', 'DOCS']).nullable(),
    dependsOn: z.array(z.string()),
  })),
  acceptanceCriteria: z.array(z.string()),
  risks: z.array(z.string()),
  dependencies: z.array(z.object({
    subtaskId: z.string().min(1),
    dependsOn: z.array(z.string()),
  })),
  agents: z.array(z.enum(['CODER', 'TESTER', 'REVIEWER', 'REFACTORER', 'DOCS'])),
  reviewStatus: PlanReviewStatusSchema,
  createdAt: z.string(),
});

export type PlanReviewView = z.infer<typeof PlanReviewViewSchema>;

// ─── Feedback Input ───

export const PlanFeedbackInputSchema = z.object({
  taskId: z.string().min(1),
  feedback: z.string().min(1),
  questionAnswers: z.array(z.object({
    questionId: z.string().min(1),
    answer: z.string().min(1),
  })).optional(),
});

export type PlanFeedbackInput = z.infer<typeof PlanFeedbackInputSchema>;

// ─── Feedback Result ───

export const PlanFeedbackResultSchema = z.object({
  ok: z.boolean(),
  taskId: z.string().min(1),
  feedback: z.string().min(1),
  questionAnswersCount: z.number().int().nonnegative(),
});

export type PlanFeedbackResult = z.infer<typeof PlanFeedbackResultSchema>;

// ─── Approval Input ───

export const PlanApprovalInputSchema = z.object({
  taskId: z.string().min(1),
});

export type PlanApprovalInput = z.infer<typeof PlanApprovalInputSchema>;

// ─── Approval Result ───

export const PlanApprovalResultSchema = z.object({
  ok: z.boolean(),
  taskId: z.string().min(1),
  reviewStatus: z.literal('APPROVED'),
  orchestratorCalled: z.boolean(),
});

export type PlanApprovalResult = z.infer<typeof PlanApprovalResultSchema>;

// ─── Rejection Input ───

export const PlanRejectionInputSchema = z.object({
  taskId: z.string().min(1),
  reason: z.string().min(1),
});

export type PlanRejectionInput = z.infer<typeof PlanRejectionInputSchema>;

// ─── Rejection Result ───

export const PlanRejectionResultSchema = z.object({
  ok: z.boolean(),
  taskId: z.string().min(1),
  reviewStatus: z.literal('REJECTED'),
  reason: z.string().min(1),
});

export type PlanRejectionResult = z.infer<typeof PlanRejectionResultSchema>;

// ─── Needs Changes Input ───

export const PlanNeedsChangesInputSchema = z.object({
  taskId: z.string().min(1),
  reason: z.string().min(1),
});

export type PlanNeedsChangesInput = z.infer<typeof PlanNeedsChangesInputSchema>;

// ─── Needs Changes Result ───

export const PlanNeedsChangesResultSchema = z.object({
  ok: z.boolean(),
  taskId: z.string().min(1),
  reviewStatus: z.literal('NEEDS_CHANGES'),
  reason: z.string().min(1),
});

export type PlanNeedsChangesResult = z.infer<typeof PlanNeedsChangesResultSchema>;

// ─── Review Status Query ───

export const PlanReviewStatusQuerySchema = z.object({
  taskId: z.string().min(1),
});

export type PlanReviewStatusQuery = z.infer<typeof PlanReviewStatusQuerySchema>;

// ─── Review Status Result ───

export const PlanReviewStatusResultSchema = z.object({
  taskId: z.string().min(1),
  reviewStatus: PlanReviewStatusSchema,
  feedbackCount: z.number().int().nonnegative(),
  lastFeedback: z.string().nullable(),
});

export type PlanReviewStatusResult = z.infer<typeof PlanReviewStatusResultSchema>;

// ─── Unified Review Result ───

export const PlanReviewResultSchema = z.discriminatedUnion('reviewStatus', [
  z.object({
    ok: z.boolean(),
    taskId: z.string().min(1),
    reviewStatus: z.literal('APPROVED'),
    orchestratorCalled: z.boolean(),
  }),
  z.object({
    ok: z.boolean(),
    taskId: z.string().min(1),
    reviewStatus: z.literal('REJECTED'),
    reason: z.string().min(1),
  }),
  z.object({
    ok: z.boolean(),
    taskId: z.string().min(1),
    reviewStatus: z.literal('NEEDS_CHANGES'),
    reason: z.string().min(1),
  }),
  z.object({
    ok: z.boolean(),
    taskId: z.string().min(1),
    reviewStatus: z.literal('PENDING_REVIEW'),
  }),
]);

export type PlanReviewResult = z.infer<typeof PlanReviewResultSchema>;