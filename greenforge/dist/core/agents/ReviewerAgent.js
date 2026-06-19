import { BaseAgent } from './BaseAgent.js';
import { z } from 'zod';
const ReviewContentSchema = z.object({
    status: z.enum(['APPROVED', 'VIOLATIONS']),
    comments: z.array(z.string()).optional(),
});
export class ReviewerAgent extends BaseAgent {
    constructor(mcpClient) {
        super(mcpClient, 'REVIEWER');
    }
    async execute(context) {
        this.validateContext(context);
        const result = this.createInitialResult(context);
        try {
            const callResult = await this.callTool(context, 'review_code', {
                worktree: context.worktreePath
            });
            if (callResult.ok) {
                // Validação do conteúdo da revisão
                try {
                    const reviewData = ReviewContentSchema.parse(callResult.content);
                    const isApproved = reviewData.status === 'APPROVED';
                    result.status = isApproved ? 'DONE' : 'FAILED';
                    result.summary = isApproved ? 'Code review approved.' : 'Code review found violations.';
                    result.artifacts.push({
                        type: 'REVIEW_REPORT',
                        path: 'reports/review.json',
                        content: reviewData
                    });
                }
                catch (schemaError) {
                    const message = schemaError instanceof Error ? schemaError.message : String(schemaError);
                    result.status = 'FAILED';
                    result.summary = `Invalid review format: ${message}`;
                    result.errors.push({
                        code: 'INVALID_FORMAT',
                        message: 'The review tool returned an unexpected format',
                        retryable: false
                    });
                }
            }
            else {
                result.status = 'FAILED';
                result.summary = `Review failed to execute: ${callResult.error.message}`;
                result.errors.push({
                    code: callResult.error.code,
                    message: callResult.error.message,
                    retryable: callResult.error.retryable
                });
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            result.status = 'FAILED';
            result.summary = message;
            result.errors.push({
                code: 'EXECUTION_ERROR',
                message,
                retryable: false
            });
        }
        return this.validateResult(result);
    }
}
//# sourceMappingURL=ReviewerAgent.js.map