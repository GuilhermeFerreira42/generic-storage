import { z } from 'zod';
// HookEventSchema intentionally not imported — runtime types are self-contained

/**
 * Fase 14 — Runtime types and schemas for the Qwen CLI Extension Real layer.
 * All public inputs/outputs of the runtime are validated via Zod.
 */

// ─── Runtime Options ───

export const RuntimeOptionsSchema = z.object({
  projectRoot: z.string().min(1),
  tempDir: z.string().min(1).optional(),
});

export type RuntimeOptions = z.infer<typeof RuntimeOptionsSchema>;

// ─── Hook Handler Results ───

export const HookActionSchema = z.enum(['ALLOW', 'BLOCK', 'NOOP']);

export const HookHandlerResultSchema = z.object({
  ok: z.boolean(),
  action: HookActionSchema,
  reason: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});

export type HookHandlerResult = z.infer<typeof HookHandlerResultSchema>;

// ─── Command Handler Results ───

export const CommandHandlerResultSchema = z.object({
  ok: z.boolean(),
  command: z.string().min(1),
  result: z.string().min(1),
  data: z.unknown().optional(),
});

export type CommandHandlerResult = z.infer<typeof CommandHandlerResultSchema>;

// ─── Hook Event Payload Schemas ───

export const SessionStartPayloadSchema = z.object({}).passthrough();

export const UserPromptSubmitPayloadSchema = z.object({
  prompt: z.string().min(1),
}).passthrough();

export const PreToolUsePayloadSchema = z.object({
  tool: z.string().min(1),
  path: z.string().optional().default(''),
  allowedRoot: z.string().optional(),
  worktreeRoot: z.string().optional(),
}).passthrough();

export const PostToolUsePayloadSchema = z.object({
  tool: z.string().min(1),
  path: z.string().optional(),
  result: z.unknown().optional(),
  taskId: z.string().min(1).optional(),
}).passthrough();

export const SessionEndPayloadSchema = z.object({}).passthrough();

// ─── Extension Command Schema ───

export const ExtensionCommandSchema = z.object({
  name: z.string().min(1),
  args: z.array(z.string()).default([]),
});

export type ExtensionCommand = z.infer<typeof ExtensionCommandSchema>;
