import { z } from 'zod';
/**
 * Schema para validação de ferramentas MCP.
 */
export declare const McpToolSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    inputSchema: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strict", z.ZodTypeAny, {
    name: string;
    description?: string | undefined;
    inputSchema?: Record<string, unknown> | undefined;
}, {
    name: string;
    description?: string | undefined;
    inputSchema?: Record<string, unknown> | undefined;
}>;
export type McpTool = z.infer<typeof McpToolSchema>;
/**
 * Schema para validação de resultados de chamadas MCP (Union Discriminada e Estrita).
 */
export declare const McpCallResultSchema: z.ZodDiscriminatedUnion<"ok", [z.ZodObject<{
    ok: z.ZodLiteral<true>;
    content: z.ZodOptional<z.ZodUnknown>;
}, "strict", z.ZodTypeAny, {
    ok: true;
    content?: unknown;
}, {
    ok: true;
    content?: unknown;
}>, z.ZodObject<{
    ok: z.ZodLiteral<false>;
    error: z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        retryable: z.ZodBoolean;
    }, "strict", z.ZodTypeAny, {
        code: string;
        message: string;
        retryable: boolean;
    }, {
        code: string;
        message: string;
        retryable: boolean;
    }>;
}, "strict", z.ZodTypeAny, {
    ok: false;
    error: {
        code: string;
        message: string;
        retryable: boolean;
    };
}, {
    ok: false;
    error: {
        code: string;
        message: string;
        retryable: boolean;
    };
}>]>;
export type McpCallResult = z.infer<typeof McpCallResultSchema>;
