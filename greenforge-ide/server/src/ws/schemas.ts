// server/src/ws/schemas.ts
import { z } from 'zod';

export const IncomingMessage = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('chat_message'),
    sessionId: z.string().uuid(),
    content: z.string().min(1).max(32000),
    mode: z.enum(['plan', 'auto_edit', 'yolo']).default('auto_edit'),
    workspacePath: z.string(),
    auth_token: z.string().optional(),
  }),
  z.object({
    type: z.literal('approve_action'),
    actionId: z.string().uuid(),
    approved: z.boolean(),
  }),
  z.object({
    type: z.literal('cancel_agent'),
    sessionId: z.string().uuid(),
  }),
  z.object({
    type: z.literal('switch_mode'),
    sessionId: z.string().uuid(),
    mode: z.enum(['plan', 'auto_edit', 'yolo']),
  }),
  z.object({
    type: z.literal('terminal_command'),
    sessionId: z.string().uuid(),
    command: z.string(),
    workspacePath: z.string(),
  }),
  z.object({
    type: z.literal('create_checkpoint'),
    sessionId: z.string().uuid(),
    description: z.string(),
  }),
]);

export const OutgoingMessage = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('agent_token'),
    token: z.string(),
    sessionId: z.string(),
  }),
  z.object({
    type: z.literal('agent_thinking_done'),
    fullText: z.string(),
    sessionId: z.string(),
  }),
  z.object({
    type: z.literal('tool_call'),
    actionId: z.string(),
    toolName: z.string(),
    args: z.record(z.unknown()),
    sessionId: z.string(),
  }),
  z.object({
    type: z.literal('approval_required'),
    actionId: z.string(),
    toolName: z.string(),
    diff: z.string().optional(),
    description: z.string(),
    sessionId: z.string(),
  }),
  z.object({
    type: z.literal('tool_result'),
    actionId: z.string(),
    result: z.string(),
    isError: z.boolean(),
    sessionId: z.string(),
  }),
  z.object({
    type: z.literal('agent_done'),
    sessionId: z.string(),
    summary: z.string(),
  }),
  z.object({
    type: z.literal('terminal_output'),
    data: z.string(),
    isError: z.boolean(),
    sessionId: z.string(),
  }),
  z.object({
    type: z.literal('session_list'),
    sessions: z.array(z.object({
      id: z.string(),
      title: z.string().nullable(),
      createdAt: z.number(),
      updatedAt: z.number(),
    })),
  }),
  z.object({
    type: z.literal('error'),
    message: z.string(),
    sessionId: z.string().optional(),
  }),
  z.object({
    type: z.literal('agent_event'),
    event: z.string(),
    data: z.any(),
    sessionId: z.string(),
  }),
  z.object({
    type: z.literal('session_history'),
    messages: z.array(z.any()),
    sessionId: z.string(),
  }),
]);

export type IncomingMessageType = z.infer<typeof IncomingMessage>;
export type OutgoingMessageType = z.infer<typeof OutgoingMessage>;
