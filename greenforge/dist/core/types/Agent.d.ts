import { z } from 'zod';
export type AgentRole = 'CODER' | 'TESTER' | 'REVIEWER';
export declare const AgentArtifactSchema: z.ZodObject<{
    type: z.ZodEnum<["DIFF", "TEST_REPORT", "REVIEW_REPORT", "DOCS", "LINT_REPORT"]>;
    path: z.ZodString;
    hash: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    content: z.ZodOptional<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    type: "DIFF" | "TEST_REPORT" | "REVIEW_REPORT" | "DOCS" | "LINT_REPORT";
    path: string;
    hash?: string | null | undefined;
    content?: unknown;
}, {
    type: "DIFF" | "TEST_REPORT" | "REVIEW_REPORT" | "DOCS" | "LINT_REPORT";
    path: string;
    hash?: string | null | undefined;
    content?: unknown;
}>;
export type AgentArtifact = z.infer<typeof AgentArtifactSchema>;
export declare const AgentErrorSchema: z.ZodObject<{
    code: z.ZodString;
    message: z.ZodString;
    retryable: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    code: string;
    message: string;
    retryable: boolean;
}, {
    code: string;
    message: string;
    retryable: boolean;
}>;
export type AgentError = z.infer<typeof AgentErrorSchema>;
export declare const AgentContextSchema: z.ZodObject<{
    taskId: z.ZodString;
    subtaskId: z.ZodString;
    worktreePath: z.ZodString;
    planMarkdown: z.ZodString;
    instructions: z.ZodString;
    allowedTools: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    taskId: string;
    subtaskId: string;
    worktreePath: string;
    planMarkdown: string;
    instructions: string;
    allowedTools: string[];
}, {
    taskId: string;
    subtaskId: string;
    worktreePath: string;
    planMarkdown: string;
    instructions: string;
    allowedTools: string[];
}>;
export type AgentContext = z.infer<typeof AgentContextSchema>;
export declare const AgentResultSchema: z.ZodObject<{
    agent: z.ZodEnum<["CODER", "TESTER", "REVIEWER"]>;
    taskId: z.ZodString;
    subtaskId: z.ZodString;
    status: z.ZodEnum<["DONE", "FAILED"]>;
    summary: z.ZodString;
    artifacts: z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["DIFF", "TEST_REPORT", "REVIEW_REPORT", "DOCS", "LINT_REPORT"]>;
        path: z.ZodString;
        hash: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        content: z.ZodOptional<z.ZodUnknown>;
    }, "strip", z.ZodTypeAny, {
        type: "DIFF" | "TEST_REPORT" | "REVIEW_REPORT" | "DOCS" | "LINT_REPORT";
        path: string;
        hash?: string | null | undefined;
        content?: unknown;
    }, {
        type: "DIFF" | "TEST_REPORT" | "REVIEW_REPORT" | "DOCS" | "LINT_REPORT";
        path: string;
        hash?: string | null | undefined;
        content?: unknown;
    }>, "many">;
    errors: z.ZodArray<z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        retryable: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        retryable: boolean;
    }, {
        code: string;
        message: string;
        retryable: boolean;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    status: "DONE" | "FAILED";
    taskId: string;
    subtaskId: string;
    agent: "CODER" | "TESTER" | "REVIEWER";
    summary: string;
    artifacts: {
        type: "DIFF" | "TEST_REPORT" | "REVIEW_REPORT" | "DOCS" | "LINT_REPORT";
        path: string;
        hash?: string | null | undefined;
        content?: unknown;
    }[];
    errors: {
        code: string;
        message: string;
        retryable: boolean;
    }[];
}, {
    status: "DONE" | "FAILED";
    taskId: string;
    subtaskId: string;
    agent: "CODER" | "TESTER" | "REVIEWER";
    summary: string;
    artifacts: {
        type: "DIFF" | "TEST_REPORT" | "REVIEW_REPORT" | "DOCS" | "LINT_REPORT";
        path: string;
        hash?: string | null | undefined;
        content?: unknown;
    }[];
    errors: {
        code: string;
        message: string;
        retryable: boolean;
    }[];
}>;
export type AgentResult = z.infer<typeof AgentResultSchema>;
