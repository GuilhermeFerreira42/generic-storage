import { z } from 'zod';
import { AgentArtifactSchema } from './Agent.js';
export const RiskLevelSchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);
export const PlanAlignmentSchema = z.enum(['ALIGNED', 'PARTIAL', 'DIVERGED']);
export const FileChangeSchema = z.object({
    path: z.string().min(1),
    reason: z.string(),
    artifactType: z.enum(['DIFF', 'TEST_REPORT', 'REVIEW_REPORT', 'DOCS', 'LINT_REPORT']),
    riskLevel: RiskLevelSchema,
});
export const DiffReportSchema = z.object({
    taskId: z.string().min(1),
    summary: z.string(),
    planAlignment: PlanAlignmentSchema,
    riskLevel: RiskLevelSchema,
    fileChanges: z.array(FileChangeSchema),
    artifacts: z.array(AgentArtifactSchema),
    warnings: z.array(z.string()),
    createdAt: z.string(),
});
//# sourceMappingURL=DiffLens.js.map