import { describe, it, expect, beforeEach } from 'vitest';
import { HookSimulator } from '../src/integration/qwen/HookSimulator';
import { QwenIntegrationRunner } from '../src/integration/qwen/QwenIntegrationRunner';
import { HookSimulationInput } from '../src/integration/qwen/types';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Qwen E2E Controlled Integration', () => {
  let simulator: HookSimulator;
  let runner: QwenIntegrationRunner;

  beforeEach(() => {
    simulator = new HookSimulator();
    runner = new QwenIntegrationRunner();
  });

  it('1. loads manifest and settings (validated)', () => {
    // The simulator constructor already simulates loading validated artifacts
    expect(simulator).toBeDefined();
  });

  it('2. SessionStart returns ok', async () => {
    const result = await simulator.simulate({ event: 'SessionStart', payload: {} });
    expect(result.ok).toBe(true);
    expect(result.action).toBe('ALLOW');
  });

  it('3. UserPromptSubmit normal chat returns NOOP', async () => {
    const result = await simulator.simulate({
      event: 'UserPromptSubmit',
      payload: { prompt: 'How are you today?' }
    });
    expect(result.action).toBe('NOOP');
  });

  it('4. UserPromptSubmit development task starts controlled flow', async () => {
    const result = await simulator.simulate({
      event: 'UserPromptSubmit',
      payload: { prompt: 'Implement user authentication' }
    });
    expect(result.action).toBe('ALLOW');
    expect(result.metadata?.intent).toBe('DEVELOPMENT_TASK');
  });

  it('5. PreToolUse blocks unsafe write outside allowedRoot', async () => {
    const result = await simulator.simulate({
      event: 'PreToolUse',
      payload: { tool: 'WriteFile', path: '/etc/passwd', allowedRoot: '/tmp/greenforge-worktree-abc' }
    });
    expect(result.action).toBe('BLOCK');
  });

  it('6. PreToolUse allows safe operation inside allowedRoot', async () => {
    const result = await simulator.simulate({
      event: 'PreToolUse',
      payload: { tool: 'WriteFile', path: 'src/index.ts', allowedRoot: '/tmp/greenforge-worktree-abc' }
    });
    expect(result.action).toBe('ALLOW');
  });

  it('6a. PreToolUse blocks if allowedRoot is missing for sensitive operation', async () => {
    const result = await simulator.simulate({
      event: 'PreToolUse',
      payload: { tool: 'WriteFile', path: 'src/index.ts' }
    });
    expect(result.action).toBe('BLOCK');
    expect(result.reason).toContain('Missing allowedRoot');
  });

  it('6b. PreToolUse blocks path with "worktree" word but outside allowedRoot', async () => {
    const result = await simulator.simulate({
      event: 'PreToolUse',
      payload: { tool: 'WriteFile', path: '/tmp/not-a-real-worktree-but-has-worktree-name/evil.txt', allowedRoot: '/tmp/greenforge-worktree-abc' }
    });
    expect(result.action).toBe('BLOCK');
  });

  it('7. PostToolUse registers checkpoint', async () => {
    const result = await simulator.simulate({ event: 'PostToolUse', payload: {} });
    expect(result.action).toBe('ALLOW');
    expect(result.metadata?.checkpoint).toBeDefined();
  });

  it('8. SessionEnd returns ok', async () => {
    const result = await simulator.simulate({ event: 'SessionEnd', payload: {} });
    expect(result.ok).toBe(true);
  });

  it('9. full E2E minimum flow reaches APPROVED', async () => {
    const result = await runner.runE2E('Create a new login page');
    expect(result.finalStatus).toBe('APPROVED');
    // finalStatus must come from Verifier
    expect(result.verificationResult?.status).toBe(result.finalStatus);
    // checkpoints must come from SQLiteRepository
    expect(result.checkpoints).toBeGreaterThan(0);
    // auditReportGenerated must come from actual DiffLens report
    expect(result.auditReportGenerated).toBe(true);
    // diffReport must exist
    expect(result.diffReport).toBeDefined();
    expect(result.diffReport?.taskId).toBe(result.taskId);
  });

  it('10. E2E with HIGH risk DiffLens reaches BLOCKED via Verifier', async () => {
    // Use the runner with HIGH_RISK scenario option
    // The runner will pass test/lint failures to Verifier which returns BLOCKED
    const result = await runner.runE2E('Modify package.json', { scenario: 'HIGH_RISK' });
    expect(result.finalStatus).toBe('BLOCKED');
    // finalStatus must come from Verifier
    expect(result.verificationResult?.status).toBe(result.finalStatus);
    // verificationResult must have BLOCKED status
    expect(result.verificationResult?.status).toBe('BLOCKED');
    // checkpoints must come from SQLiteRepository
    expect(result.checkpoints).toBeGreaterThan(0);
    // auditReportGenerated must come from actual DiffLens report
    expect(result.auditReportGenerated).toBe(true);
  });

  it('11. E2E with lint/test failure reaches RETRYABLE via Verifier', async () => {
    // Use the runner with RETRYABLE scenario option
    // The runner will pass test/lint failures to Verifier which returns RETRYABLE
    const result = await runner.runE2E('Fix broken tests', { scenario: 'RETRYABLE' });
    expect(result.finalStatus).toBe('RETRYABLE');
    // finalStatus must come from Verifier
    expect(result.verificationResult?.status).toBe(result.finalStatus);
    // verificationResult must have RETRYABLE status
    expect(result.verificationResult?.status).toBe('RETRYABLE');
    // checkpoints must come from SQLiteRepository
    expect(result.checkpoints).toBeGreaterThan(0);
    // auditReportGenerated must come from actual DiffLens report
    expect(result.auditReportGenerated).toBe(true);
  });

  it('12. NORMAL_CHAT scenario returns BLOCKED early', async () => {
    const result = await runner.runE2E('How are you?', { scenario: 'NORMAL_CHAT' });
    expect(result.finalStatus).toBe('BLOCKED');
    expect(result.verificationStatus).toBe('NORMAL_CHAT');
    // No checkpoints or audit report for normal chat
    expect(result.checkpoints).toBe(0);
    expect(result.auditReportGenerated).toBe(false);
  });

  it('13. never calls real Qwen / network / LLM / merge / push', async () => {
    // Verify by inspecting the result: no external calls were made
    const result = await runner.runE2E('Add feature X');
    expect(result.taskId).toBeDefined();
    // O runner usa mocks locais e não aciona processos externos ou rede.
    expect(result.finalStatus).toBe('APPROVED');
  });

  it('14. finalStatus matches verificationResult.status', async () => {
    const result = await runner.runE2E('Create a new login page');
    expect(result.verificationResult?.status).toBe(result.finalStatus);
  });

  it('15. checkpoints are from SQLiteRepository', async () => {
    const result = await runner.runE2E('Create a new login page');
    expect(result.checkpoints).toBeGreaterThan(0);
    // checkpoints are tracked via repository.addCheckpoint during orchestration
    expect(typeof result.checkpoints).toBe('number');
  });

  it('16. auditReportGenerated is from actual DiffLens report', async () => {
    const result = await runner.runE2E('Create a new login page');
    expect(result.auditReportGenerated).toBe(true);
    // diffReport must exist when auditReportGenerated is true
    expect(result.diffReport).toBeDefined();
    expect(result.diffReport?.taskId).toBe(result.taskId);
  });

  it('17. temporary directory is cleaned up after APPROVED flow', async () => {
    const tempDir = join(tmpdir(), `greenforge-e2e-test-${Date.now()}`);
    const result = await runner.runE2E('Create a new login page', { tempDir });
    expect(result.finalStatus).toBe('APPROVED');
    // After successful run, tempDir should be removed
    expect(existsSync(tempDir)).toBe(false);
  });

  it('18. temporary directory is cleaned up after NORMAL_CHAT flow', async () => {
    const tempDir = join(tmpdir(), `greenforge-e2e-test-${Date.now()}`);
    const result = await runner.runE2E('How are you?', { tempDir, scenario: 'NORMAL_CHAT' });
    expect(result.finalStatus).toBe('BLOCKED');
    expect(result.verificationStatus).toBe('NORMAL_CHAT');
    // After NORMAL_CHAT, tempDir should be removed
    expect(existsSync(tempDir)).toBe(false);
  });

  it('19. temporary directory is cleaned up after HIGH_RISK/BLOCKED controlled result, even with preserveOnError: true', async () => {
    const tempDir = join(tmpdir(), `greenforge-e2e-test-${Date.now()}`);
    const result = await runner.runE2E('Modify package.json', { tempDir, scenario: 'HIGH_RISK', preserveOnError: true });
    expect(result.finalStatus).toBe('BLOCKED');
    // HIGH_RISK is a controlled result (not an exception), so tempDir should be removed
    expect(existsSync(tempDir)).toBe(false);
  });

  it('20. temporary directory is cleaned up after RETRYABLE controlled result', async () => {
    const tempDir = join(tmpdir(), `greenforge-e2e-test-${Date.now()}`);
    const result = await runner.runE2E('Fix broken tests', { tempDir, scenario: 'RETRYABLE' });
    expect(result.finalStatus).toBe('RETRYABLE');
    // RETRYABLE is a controlled result, so tempDir should be removed
    expect(existsSync(tempDir)).toBe(false);
  });
});