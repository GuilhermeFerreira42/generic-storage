import { z } from 'zod';
export declare const RiskLevelSchema: z.ZodEnum<["LOW", "MEDIUM", "HIGH"]>;
export type RiskLevel = z.infer<typeof RiskLevelSchema>;
export declare const PlanAlignmentSchema: z.ZodEnum<["ALIGNED", "PARTIAL", "DIVERGED"]>;
export type PlanAlignment = z.infer<typeof PlanAlignmentSchema>;
export declare const FileChangeSchema: z.ZodObject<{
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
}>;
export type FileChange = z.infer<typeof FileChangeSchema>;
export declare const DiffReportSchema: z.ZodObject<{
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
export type DiffReport = z.infer<typeof DiffReportSchema>;
