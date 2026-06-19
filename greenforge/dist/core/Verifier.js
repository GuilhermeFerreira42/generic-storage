import { VerificationInputSchema, VerificationResultSchema, } from './types/Verifier.js';
export class Verifier {
    /**
     * Consolidates technical signals and produces a structured final verification result.
     */
    async verify(input) {
        // 1. Validar entrada com Zod
        const validatedInput = VerificationInputSchema.parse(input);
        // Validar consistência de taskId
        if (validatedInput.diffReport.taskId !== validatedInput.taskId) {
            throw new Error(`TaskId inconsistency: input.taskId ("${validatedInput.taskId}") does not match input.diffReport.taskId ("${validatedInput.diffReport.taskId}")`);
        }
        if (validatedInput.joinResult.taskId !== validatedInput.taskId) {
            throw new Error(`TaskId inconsistency: input.taskId ("${validatedInput.taskId}") does not match input.joinResult.taskId ("${validatedInput.joinResult.taskId}")`);
        }
        const reasons = [];
        let status = 'APPROVED';
        const riskLevel = validatedInput.diffReport.riskLevel;
        // 2. Se JoinResult.ok for false, status deve ser BLOCKED ou RETRYABLE conforme erros.
        if (!validatedInput.joinResult.ok) {
            if (validatedInput.joinResult.errors.length > 0) {
                let hasNonRetryable = false;
                let hasRetryable = false;
                for (const error of validatedInput.joinResult.errors) {
                    reasons.push(`Join gate error: ${error.message} (code: ${error.code})`);
                    if (error.retryable) {
                        hasRetryable = true;
                    }
                    else {
                        hasNonRetryable = true;
                    }
                }
                if (hasNonRetryable) {
                    status = 'BLOCKED';
                }
                else if (hasRetryable) {
                    status = 'RETRYABLE';
                }
            }
            else {
                reasons.push('Join gate failed without specific errors.');
                status = 'BLOCKED';
            }
        }
        // 3. Se DiffReport.riskLevel for HIGH, status deve ser BLOCKED.
        if (validatedInput.diffReport.riskLevel === 'HIGH') {
            reasons.push('Diff report risk level is HIGH.');
            status = 'BLOCKED';
        }
        // 4. Se DiffReport.planAlignment for DIVERGED, status deve ser BLOCKED.
        if (validatedInput.diffReport.planAlignment === 'DIVERGED') {
            reasons.push('Diff report plan alignment is DIVERGED.');
            status = 'BLOCKED';
        }
        // 5. Se testResult.exitCode != 0, status deve ser RETRYABLE se o erro for técnico recuperável.
        if (validatedInput.testResult && validatedInput.testResult.exitCode !== 0) {
            reasons.push(`Test suite failed with exit code ${validatedInput.testResult.exitCode}.`);
            if (status !== 'BLOCKED') {
                status = 'RETRYABLE';
            }
        }
        // 6. Se lintResult.exitCode != 0, status deve ser RETRYABLE.
        if (validatedInput.lintResult && validatedInput.lintResult.exitCode !== 0) {
            reasons.push(`Lint checks failed with exit code ${validatedInput.lintResult.exitCode}.`);
            if (status !== 'BLOCKED') {
                status = 'RETRYABLE';
            }
        }
        const result = {
            taskId: validatedInput.taskId,
            status,
            riskLevel,
            reasons,
            retryable: status === 'RETRYABLE',
            createdAt: new Date().toISOString(),
        };
        // 7. Validar saída com Zod
        return VerificationResultSchema.parse(result);
    }
}
//# sourceMappingURL=Verifier.js.map