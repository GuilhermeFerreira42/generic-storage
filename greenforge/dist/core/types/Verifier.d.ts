import { z } from 'zod';
export declare const CommandCheckResultSchema: z.ZodObject<{
    command: z.ZodString;
    exitCode: z.ZodNumber;
    stdout: z.ZodOptional<z.ZodString>;
    stderr: z.ZodOptional<z.ZodString>;
    durationMs: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    command: string;
    exitCode: number;
    stdout?: string | undefined;
    stderr?: string | undefined;
    durationMs?: number | undefined;
}, {
    command: string;
    exitCode: number;
    stdout?: string | undefined;
    stderr?: string | undefined;
    durationMs?: number | undefined;
}>;
export type CommandCheckResult = z.infer<typeof CommandCheckResultSchema>;
export declare const VerificationInputSchema: z.ZodObject<{
    taskId: z.ZodString;
    diffReport: z.ZodObject<{
        taskId: z.ZodString;
        summary: z.ZodString;
        planAlignment: z.ZodEnum<["ALIGNED", "PARTIAL", "DIVERGED"]>;
        riskLevel: z.ZodEnum<["LOW", "MEDIUM", "HIGH"]>;
        fileChanges: z.ZodArray<z.ZodObject<{
            path: z.ZodString;
            reason: z.ZodString;
            artifactType: z.ZodEnum<["DIFF", "TEST_REPORT", "REVIEW_REPORT", "DOCS", "LINT_REPORT"]>;
            riskLevel: z.ZodEnum<["LOW", "MEDIUM", "HIGH"]>;
        }, "strip", z.ZodTypeAny, {
            path: string;
            reason: string;
            artifactType: "DIFF" | "TEST_REPORT" | "REVIEW_REPORT" | "DOCS" | "LINT_REPORT";
            riskLevel: "LOW" | "MEDIUM" | "HIGH";
        }, {
            path: string;
            reason: string;
            artifactType: "DIFF" | "TEST_REPORT" | "REVIEW_REPORT" | "DOCS" | "LINT_REPORT";
            riskLevel: "LOW" | "MEDIUM" | "HIGH";
        }>, "many">;
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
        warnings: z.ZodArray<z.ZodString, "many">;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        taskId: string;
        summary: string;
        artifacts: {
            type: "DIFF" | "TEST_REPORT" | "REVIEW_REPORT" | "DOCS" | "LINT_REPORT";
            path: string;
            hash?: string | null | undefined;
            content?: unknown;
        }[];
        riskLevel: "LOW" | "MEDIUM" | "HIGH";
        planAlignment: "ALIGNED" | "PARTIAL" | "DIVERGED";
        fileChanges: {
            path: string;
            reason: string;
            artifactType: "DIFF" | "TEST_REPORT" | "REVIEW_REPORT" | "DOCS" | "LINT_REPORT";
            riskLevel: "LOW" | "MEDIUM" | "HIGH";
        }[];
        warnings: string[];
        createdAt: string;
    }, {
        taskId: string;
        summary: string;
        artifacts: {
            type: "DIFF" | "TEST_REPORT" | "REVIEW_REPORT" | "DOCS" | "LINT_REPORT";
            path: string;
            hash?: string | null | undefined;
            content?: unknown;
        }[];
        riskLevel: "LOW" | "MEDIUM" | "HIGH";
        planAlignment: "ALIGNED" | "PARTIAL" | "DIVERGED";
        fileChanges: {
            path: string;
            reason: string;
            artifactType: "DIFF" | "TEST_REPORT" | "REVIEW_REPORT" | "DOCS" | "LINT_REPORT";
            riskLevel: "LOW" | "MEDIUM" | "HIGH";
        }[];
        warnings: string[];
        createdAt: string;
    }>;
    joinResult: z.ZodObject<{
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
    testResult: z.ZodOptional<z.ZodObject<{
        command: z.ZodString;
        exitCode: z.ZodNumber;
        stdout: z.ZodOptional<z.ZodString>;
        stderr: z.ZodOptional<z.ZodString>;
        durationMs: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        command: string;
        exitCode: number;
        stdout?: string | undefined;
        stderr?: string | undefined;
        durationMs?: number | undefined;
    }, {
        command: string;
        exitCode: number;
        stdout?: string | undefined;
        stderr?: string | undefined;
        durationMs?: number | undefined;
    }>>;
    lintResult: z.ZodOptional<z.ZodObject<{
        command: z.ZodString;
        exitCode: z.ZodNumber;
        stdout: z.ZodOptional<z.ZodString>;
        stderr: z.ZodOptional<z.ZodString>;
        durationMs: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        command: string;
        exitCode: number;
        stdout?: string | undefined;
        stderr?: string | undefined;
        durationMs?: number | undefined;
    }, {
        command: string;
        exitCode: number;
        stdout?: string | undefined;
        stderr?: string | undefined;
        durationMs?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    taskId: string;
    diffReport: {
        taskId: string;
        summary: string;
        artifacts: {
            type: "DIFF" | "TEST_REPORT" | "REVIEW_REPORT" | "DOCS" | "LINT_REPORT";
            path: string;
            hash?: string | null | undefined;
            content?: unknown;
        }[];
        riskLevel: "LOW" | "MEDIUM" | "HIGH";
        planAlignment: "ALIGNED" | "PARTIAL" | "DIVERGED";
        fileChanges: {
            path: string;
            reason: string;
            artifactType: "DIFF" | "TEST_REPORT" | "REVIEW_REPORT" | "DOCS" | "LINT_REPORT";
            riskLevel: "LOW" | "MEDIUM" | "HIGH";
        }[];
        warnings: string[];
        createdAt: string;
    };
    joinResult: {
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
    };
    testResult?: {
        command: string;
        exitCode: number;
        stdout?: string | undefined;
        stderr?: string | undefined;
        durationMs?: number | undefined;
    } | undefined;
    lintResult?: {
        command: string;
        exitCode: number;
        stdout?: string | undefined;
        stderr?: string | undefined;
        durationMs?: number | undefined;
    } | undefined;
}, {
    taskId: string;
    diffReport: {
        taskId: string;
        summary: string;
        artifacts: {
            type: "DIFF" | "TEST_REPORT" | "REVIEW_REPORT" | "DOCS" | "LINT_REPORT";
            path: string;
            hash?: string | null | undefined;
            content?: unknown;
        }[];
        riskLevel: "LOW" | "MEDIUM" | "HIGH";
        planAlignment: "ALIGNED" | "PARTIAL" | "DIVERGED";
        fileChanges: {
            path: string;
            reason: string;
            artifactType: "DIFF" | "TEST_REPORT" | "REVIEW_REPORT" | "DOCS" | "LINT_REPORT";
            riskLevel: "LOW" | "MEDIUM" | "HIGH";
        }[];
        warnings: string[];
        createdAt: string;
    };
    joinResult: {
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
    };
    testResult?: {
        command: string;
        exitCode: number;
        stdout?: string | undefined;
        stderr?: string | undefined;
        durationMs?: number | undefined;
    } | undefined;
    lintResult?: {
        command: string;
        exitCode: number;
        stdout?: string | undefined;
        stderr?: string | undefined;
        durationMs?: number | undefined;
    } | undefined;
}>;
export type VerificationInput = z.infer<typeof VerificationInputSchema>;
export declare const VerificationStatusSchema: z.ZodEnum<["APPROVED", "BLOCKED", "RETRYABLE"]>;
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;
export declare const VerificationResultSchema: z.ZodObject<{
    taskId: z.ZodString;
    status: z.ZodEnum<["APPROVED", "BLOCKED", "RETRYABLE"]>;
    riskLevel: z.ZodEnum<["LOW", "MEDIUM", "HIGH"]>;
    reasons: z.ZodArray<z.ZodString, "many">;
    retryable: z.ZodBoolean;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "APPROVED" | "BLOCKED" | "RETRYABLE";
    retryable: boolean;
    taskId: string;
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
    createdAt: string;
    reasons: string[];
}, {
    status: "APPROVED" | "BLOCKED" | "RETRYABLE";
    retryable: boolean;
    taskId: string;
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
    createdAt: string;
    reasons: string[];
}>;
export type VerificationResult = z.infer<typeof VerificationResultSchema>;
