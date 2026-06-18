import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DiffLens } from '../src/core/DiffLens.js';
import { AgentArtifact } from '../src/core/types/Agent.js';
import { mkdtemp, rm, readFile } from 'fs/promises';
import path from 'path';
import os from 'os';
import { SecurityError } from '../src/shared/errors.js';
import { DiffReportSchema } from '../src/core/types/DiffLens.js';

describe('DiffLens Engine', () => {
  let diffLens: DiffLens;
  let tempDir: string;

  beforeEach(async () => {
    diffLens = new DiffLens();
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'gf-difflens-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  const createMockArtifacts = (): AgentArtifact[] => [
    { type: 'DIFF', path: 'src/index.ts', content: '@@ -1 +1 @@\n-old\n+new' },
    { type: 'TEST_REPORT', path: 'reports/test.log', content: 'PASS' },
    { type: 'REVIEW_REPORT', path: 'reports/review.json', content: { status: 'APPROVED' } }
  ];

  it('1. generates basic DiffReport from consolidated artifacts', async () => {
    const artifacts = createMockArtifacts();
    const report = await diffLens.generateReport('task-1', artifacts);

    expect(report.taskId).toBe('task-1');
    expect(report.artifacts).toHaveLength(3);
    expect((report as any).ok).toBeUndefined(); // Garante que o campo 'ok' foi removido
    DiffReportSchema.parse(report);
  });

  it('2. includes all artifacts in the report', async () => {
    const artifacts = createMockArtifacts();
    const report = await diffLens.generateReport('task-1', artifacts);
    expect(report.artifacts).toEqual(artifacts);
  });

  it('3. generates fileChanges for artifacts type DIFF', async () => {
    const artifacts = [{ type: 'DIFF', path: 'src/core/logic.ts', content: 'change' }] as AgentArtifact[];
    const report = await diffLens.generateReport('task-1', artifacts);
    
    expect(report.fileChanges).toHaveLength(1);
    expect(report.fileChanges[0].path).toBe('src/core/logic.ts');
    expect(report.fileChanges[0].artifactType).toBe('DIFF');
  });

  it('4. calculates riskLevel LOW for simple change', async () => {
    const artifacts = [{ type: 'DIFF', path: 'src/ui/Component.ts', content: 'color: blue' }] as AgentArtifact[];
    const report = await diffLens.generateReport('task-1', artifacts);
    expect(report.riskLevel).toBe('LOW');
  });

  it('5. calculates riskLevel HIGH for sensitive file', async () => {
    const sensitiveFiles = ['.env', 'package.json', 'src/shared/SafeResolve.ts', 'src/infrastructure/git/WorktreeManager.ts'];
    
    for (const file of sensitiveFiles) {
      const artifacts = [{ type: 'DIFF', path: file, content: 'malicious' }] as AgentArtifact[];
      const report = await diffLens.generateReport('task-1', artifacts);
      expect(report.riskLevel).toBe('HIGH');
    }
  });

  it('6. generates warning when there are no artifacts', async () => {
    const report = await diffLens.generateReport('task-1', []);
    expect(report.warnings).toContain('No artifacts found for this task.');
  });

  it('7. marks planAlignment ALIGNED in normal case with APPROVED review', async () => {
    const artifacts = createMockArtifacts();
    const report = await diffLens.generateReport('task-1', artifacts);
    expect(report.planAlignment).toBe('ALIGNED');
  });

  it('8. marks planAlignment DIVERGED and risk HIGH when review report contains violations', async () => {
    const artifacts = [
      { type: 'REVIEW_REPORT', path: 'rev.json', content: { status: 'VIOLATIONS', comments: ['bad code'] } }
    ] as AgentArtifact[];
    const report = await diffLens.generateReport('task-1', artifacts);
    expect(report.planAlignment).toBe('DIVERGED');
    expect(report.riskLevel).toBe('HIGH');
  });

  it('9. generates warning and PARTIAL alignment when review report is malformed', async () => {
    const artifacts = [
      { type: 'REVIEW_REPORT', path: 'bad_rev.json', content: { status: 'UNKNOWN_STATUS' } }
    ] as AgentArtifact[];
    const report = await diffLens.generateReport('task-1', artifacts);
    expect(report.planAlignment).toBe('PARTIAL');
    expect(report.warnings.some(w => w.includes('Invalid review report format'))).toBe(true);
  });

  it('10. renders Markdown with summary, riskLevel, fileChanges and warnings', async () => {
    const artifacts = createMockArtifacts();
    const report = await diffLens.generateReport('task-1', artifacts);
    const md = diffLens.renderMarkdown(report);

    expect(md).toContain('# GREENFORGE AUDIT — task-1');
    expect(md).toContain('**Risk Level:** LOW');
    expect(md).toContain('src/index.ts');
    expect(md).not.toContain('http'); // Garante integridade do texto
  });

  it('11. saves exactly GREENFORGE_AUDIT.md inside allowed root', async () => {
    const artifacts = createMockArtifacts();
    const report = await diffLens.generateReport('task-1', artifacts);
    
    const filePath = await diffLens.saveAuditReport(report, tempDir);
    
    expect(path.basename(filePath)).toBe('GREENFORGE_AUDIT.md');
    expect(filePath).not.toContain('[');
    expect(filePath).not.toContain(']');
    expect(filePath).not.toContain('(');
    expect(filePath).not.toContain(')');
    expect(filePath).not.toContain('http://');
    expect(filePath).not.toContain('https://');
    const content = await readFile(filePath, 'utf8');
    expect(content).toContain('GREENFORGE AUDIT');
  });

  it('12. rejects malformed input (empty taskId)', async () => {
    // @ts-expect-error forcing malformed input
    await expect(diffLens.generateReport('', []))
      .rejects.toThrow();
  });

  it('13. validates output with Zod in generateReport', async () => {
    const report = await diffLens.generateReport('task-1', []);
    expect(() => DiffReportSchema.parse(report)).not.toThrow();
  });
});
