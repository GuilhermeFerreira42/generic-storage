import { z } from 'zod';

/**
 * Schema para validação de ferramentas MCP.
 */
export const McpToolSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  inputSchema: z.record(z.string(), z.unknown()).optional(),
}).strict();

export type McpTool = z.infer<typeof McpToolSchema>;

/**
 * Schema para validação de resultados de chamadas MCP (Union Discriminada e Estrita).
 */
export const McpCallResultSchema = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    content: z.unknown().optional(),
  }).strict(),
  z.object({
    ok: z.literal(false),
    error: z.object({
      code: z.string(),
      message: z.string(),
      retryable: z.boolean(),
    }).strict(),
  }).strict()
]);

export type McpCallResult = z.infer<typeof McpCallResultSchema>;
