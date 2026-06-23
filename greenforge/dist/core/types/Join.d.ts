import { z } from 'zod';
/**
 * Schema para SubtaskNode dentro do contexto de Join.
 * Deve estar em sincronia com src/core/types/Task.ts
 */
export declare const SubtaskNodeJoinSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    assignedAgent: z.ZodNullable<z.ZodEnum<["CODER", "TESTER", "REVIEWER", "DOCS"]>>;
    dependsOn: z.ZodArray<z.ZodString, "many">;
    status: z.ZodEnum<["PENDING", "RUNNING", "DONE", "FAILED"]>;
    worktreePath: z.ZodNullable<z.ZodString>;
    artifactOutput: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "DONE" | "FAILED" | "PENDING" | "RUNNING";
    worktreePath: string | null;
    id: string;
    title: string;
    assignedAgent: "CODER" | "TESTER" | "REVIEWER" | "DOCS" | null;
    dependsOn: string[];
    artifactOutput: string | null;
}, {
    status: "DONE" | "FAILED" | "PENDING" | "RUNNING";
    worktreePath: string | null;
    id: string;
    title: string;
    assignedAgent: "CODER" | "TESTER" | "REVIEWER" | "DOCS" | null;
    dependsOn: string[];
    artifactOutput: string | null;
}>;
export declare const JoinInputSchema: z.ZodObject<{
    taskId: z.ZodString;
    subtasksGraph: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        assignedAgent: z.ZodNullable<z.ZodEnum<["CODER", "TESTER", "REVIEWER", "DOCS"]>>;
        dependsOn: z.ZodArray<z.ZodString, "many">;
        status: z.ZodEnum<["PENDING", "RUNNING", "DONE", "FAILED"]>;
        worktreePath: z.ZodNullable<z.ZodString>;
        artifactOutput: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: "DONE" | "FAILED" | "PENDING" | "RUNNING";
        worktreePath: string | null;
        id: string;
        title: string;
        assignedAgent: "CODER" | "TESTER" | "REVIEWER" | "DOCS" | null;
        dependsOn: string[];
        artifactOutput: string | null;
    }, {
        status: "DONE" | "FAILED" | "PENDING" | "RUNNING";
        worktreePath: string | null;
        id: string;
        title: string;
        assignedAgent: "CODER" | "TESTER" | "REVIEWER" | "DOCS" | null;
        dependsOn: string[];
        artifactOutput: string | null;
    }>, "many">;
    agentResults: z.ZodArray<z.ZodObject<{
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
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    taskId: string;
    subtasksGraph: {
        status: "DONE" | "FAILED" | "PENDING" | "RUNNING";
        worktreePath: string | null;
        id: string;
        title: string;
        assignedAgent: "CODER" | "TESTER" | "REVIEWER" | "DOCS" | null;
        dependsOn: string[];
        artifactOutput: string | null;
    }[];
    agentResults: {
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
    }[];
}, {
    taskId: string;
    subtasksGraph: {
        status: "DONE" | "FAILED" | "PENDING" | "RUNNING";
        worktreePath: string | null;
        id: string;
        title: string;
        assignedAgent: "CODER" | "TESTER" | "REVIEWER" | "DOCS" | null;
        dependsOn: string[];
        artifactOutput: string | null;
    }[];
    agentResults: {
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
    }[];
}>;
export type JoinInput = z.infer<typeof JoinInputSchema>;
export declare const JoinErrorSchema: z.ZodObject<{
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
export type JoinError = z.infer<typeof JoinErrorSchema>;
export declare const JoinResultSchema: z.ZodObject<{
    ok: z.ZodBoolean;
    taskId: z.ZodString;
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
    missingArtifacts: z.ZodArray<z.ZodString, "many">;
    failedSubtasks: z.ZodArray<z.ZodString, "many">;
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
    taskId: string;
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
    ok: boolean;
    missingArtifacts: string[];
    failedSubtasks: string[];
}, {
    taskId: string;
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
    ok: boolean;
    missingArtifacts: string[];
    failedSubtasks: string[];
}>;
export type JoinResult = z.infer<typeof JoinResultSchema>;
