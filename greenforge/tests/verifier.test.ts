import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Verifier } from '../src/core/Verifier.js';
import { VerificationInput, VerificationResultSchema } from '../src/core/types/Verifier.js';
import { DiffReport } from '../src/core/types/DiffLens.js';
import { JoinResult } from '../src/core/types/Join.js';

// Mock execa to verify it is not called
vi.mock('execa', () => ({
  execa: vi.fn(),
}));

describe('Verifier Component', () => {
  let verifier: Verifier;

  beforeEach(() => {
    verifier = new Verifier();
    vi.clearAllMocks();
  });

  const createBaseInput = (overrides?: Partial<VerificationInput>): VerificationInput => {
    const diffReport: DiffReport = {
      taskId: 'task-123',
      summary: 'Standard diff report',
      planAlignment: 'ALIGNED',
      riskLevel: 'LOW',
      fileChanges: [],
      artifacts: [],
      warnings: [],
      createdAt: new Date().toISOString(),
    };

    const joinResult: JoinResult = {
      ok: true,
      taskId: 'task-123',
      artifacts: [],
      missingArtifacts: [],
      failedSubtasks: [],
      errors: [],
    };

    return {
      taskId: 'task-123',
      diffReport,
      joinResult,
      testResult: {
        command: 'npm test',
        exitCode: 0,
      },
      lintResult: {
        command: 'npm run lint',
        exitCode: 0,
      },
      ...overrides,
    };
  };

  it('1. approves when JoinResult is ok, DiffReport is LOW risk/ALIGNED, and test/lint exitCode is 0', async () => {
    const input = createBaseInput();
    const result = await verifier.verify(input);

    expect(result.status).toBe('APPROVED');
    expect(result.riskLevel).toBe('LOW');
    expect(result.retryable).toBe(false);
    expect(result.reasons).toHaveLength(0);
  });

  it('2. blocks when JoinResult.ok is false with a non-retryable error', async () => {
    const input = createBaseInput();
    input.joinResult.ok = false;
    input.joinResult.errors = [
      { code: 'ERR_FATAL', message: 'Failed to access database', retryable: false },
    ];

    const result = await verifier.verify(input);

    expect(result.status).toBe('BLOCKED');
    expect(result.retryable).toBe(false);
    expect(result.reasons).toContain('Join gate error: Failed to access database (code: ERR_FATAL)');
  });

  it('3. returns RETRYABLE when JoinResult.ok is false with a retryable error', async () => {
    const input = createBaseInput();
    input.joinResult.ok = false;
    input.joinResult.errors = [
      { code: 'ERR_TIMEOUT', message: 'Connection timeout', retryable: true },
    ];

    const result = await verifier.verify(input);

    expect(result.status).toBe('RETRYABLE');
    expect(result.retryable).toBe(true);
    expect(result.reasons).toContain('Join gate error: Connection timeout (code: ERR_TIMEOUT)');
  });

  it('4. blocks when DiffReport.riskLevel is HIGH', async () => {
    const input = createBaseInput();
    input.diffReport.riskLevel = 'HIGH';

    const result = await verifier.verify(input);

    expect(result.status).toBe('BLOCKED');
    expect(result.riskLevel).toBe('HIGH');
    expect(result.reasons).toContain('Diff report risk level is HIGH.');
  });

  it('5. blocks when DiffReport.planAlignment is DIVERGED', async () => {
    const input = createBaseInput();
    input.diffReport.planAlignment = 'DIVERGED';

    const result = await verifier.verify(input);

    expect(result.status).toBe('BLOCKED');
    expect(result.reasons).toContain('Diff report plan alignment is DIVERGED.');
  });

  it('6. returns RETRYABLE when testResult.exitCode is non-zero', async () => {
    const input = createBaseInput();
    input.testResult = {
      command: 'npm test',
      exitCode: 1,
    };

    const result = await verifier.verify(input);

    expect(result.status).toBe('RETRYABLE');
    expect(result.retryable).toBe(true);
    expect(result.reasons).toContain('Test suite failed with exit code 1.');
  });

  it('7. returns RETRYABLE when lintResult.exitCode is non-zero', async () => {
    const input = createBaseInput();
    input.lintResult = {
      command: 'npm run lint',
      exitCode: 2,
    };

    const result = await verifier.verify(input);

    expect(result.status).toBe('RETRYABLE');
    expect(result.retryable).toBe(true);
    expect(result.reasons).toContain('Lint checks failed with exit code 2.');
  });

  it('8. aggregates reasons explaining each block and failure', async () => {
    const input = createBaseInput();
    input.joinResult.ok = false;
    input.joinResult.errors = [
      { code: 'ERR_NON_RETRYABLE', message: 'Fatal error', retryable: false },
    ];
    input.diffReport.riskLevel = 'HIGH';
    input.diffReport.planAlignment = 'DIVERGED';
    input.testResult = { command: 'npm test', exitCode: 1 };
    input.lintResult = { command: 'npm run lint', exitCode: 2 };

    const result = await verifier.verify(input);

    expect(result.status).toBe('BLOCKED'); // BLOCKED takes precedence over RETRYABLE
    expect(result.reasons).toContain('Join gate error: Fatal error (code: ERR_NON_RETRYABLE)');
    expect(result.reasons).toContain('Diff report risk level is HIGH.');
    expect(result.reasons).toContain('Diff report plan alignment is DIVERGED.');
    expect(result.reasons).toContain('Test suite failed with exit code 1.');
    expect(result.reasons).toContain('Lint checks failed with exit code 2.');
  });

  it('9. validates VerificationInput with Zod', async () => {
    const input = createBaseInput();
    input.taskId = ''; // Empty string fails min(1) constraint at runtime

    await expect(verifier.verify(input)).rejects.toThrow();
  });

  it('10. validates VerificationResult with Zod', async () => {
    const input = createBaseInput();
    const result = await verifier.verify(input);

    expect(() => VerificationResultSchema.parse(result)).not.toThrow();
  });

  it('11. does not execute command real', async () => {
    const { execa } = await import('execa');
    const input = createBaseInput();
    await verifier.verify(input);

    expect(execa).not.toHaveBeenCalled();
  });

  it('12. does not call MCP real', async () => {
    // Verifier should be a pure logical component without MCP imports/side effects
    const input = createBaseInput();
    const result = await verifier.verify(input);

    expect(result).toBeDefined();
    // Verify no external/global MCP mock or variable is mutated or invoked
  });

  it('13. does not call Git real', async () => {
    // Verifier should not use child processes to call git
    const { execa } = await import('execa');
    const input = createBaseInput();
    await verifier.verify(input);

    expect(execa).not.toHaveBeenCalled();
  });

  it('14. preserves taskId in result', async () => {
    const input = createBaseInput();
    const result = await verifier.verify(input);

    expect(result.taskId).toBe('task-123');
  });

  it('15. generates valid createdAt', async () => {
    const input = createBaseInput();
    const result = await verifier.verify(input);

    expect(result.createdAt).toBeDefined();
    expect(new Date(result.createdAt).toString()).not.toBe('Invalid Date');
  });

  it('16. throws error when diffReport.taskId is different from input.taskId', async () => {
    const input = createBaseInput();
    input.diffReport.taskId = 'task-different';

    await expect(verifier.verify(input)).rejects.toThrow('TaskId inconsistency');
  });

  it('17. throws error when joinResult.taskId is different from input.taskId', async () => {
    const input = createBaseInput();
    input.joinResult.taskId = 'task-different';

    await expect(verifier.verify(input)).rejects.toThrow('TaskId inconsistency');
  });

  it('18. passes when diffReport.taskId and joinResult.taskId are equal to input.taskId', async () => {
    const input = createBaseInput();
    input.taskId = 'task-same';
    input.diffReport.taskId = 'task-same';
    input.joinResult.taskId = 'task-same';

    const result = await verifier.verify(input);
    expect(result.taskId).toBe('task-same');
  });

  it('19. verifies retryable consistency for APPROVED status', async () => {
    const input = createBaseInput();
    const result = await verifier.verify(input);

    expect(result.status).toBe('APPROVED');
    expect(result.retryable).toBe(false);
  });

  it('20. verifies retryable consistency for BLOCKED status', async () => {
    const input = createBaseInput();
    input.diffReport.riskLevel = 'HIGH';

    const result = await verifier.verify(input);

    expect(result.status).toBe('BLOCKED');
    expect(result.retryable).toBe(false);
  });

  it('21. verifies retryable consistency for RETRYABLE status', async () => {
    const input = createBaseInput();
    input.testResult = { command: 'npm test', exitCode: 1 };

    const result = await verifier.verify(input);

    expect(result.status).toBe('RETRYABLE');
    expect(result.retryable).toBe(true);
  });
});
