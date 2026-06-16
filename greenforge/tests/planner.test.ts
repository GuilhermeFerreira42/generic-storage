import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PlannerEngine } from '../src/core/PlannerEngine.js';
import { LLMProvider } from '../src/core/ports/LLMProvider.js';
import { mkdtemp, rm, readFile } from 'fs/promises';
import path from 'path';
import os from 'os';

describe('PlannerEngine', () => {
  let tempDir: string;
  const mockLLM: LLMProvider = {
    generate: vi.fn(),
  };

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'gf-planner-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  const createValidPlan = (overrides = {}) => ({
    id: 'plan-1',
    title: 'Valid Plan',
    originalPrompt: 'Prompt',
    questions: Array(5).fill(null).map((_, i) => ({ id: `Q${i}`, question: `Q${i}?`, required: true })),
    subtasksGraph: [
      { id: 'ST-01', title: 'Task 1', assignedAgent: 'CODER', dependsOn: [], status: 'PENDING', worktreePath: null, artifactOutput: null }
    ],
    acceptanceCriteria: ['Pass tests'],
    risks: ['None'],
    createdAt: new Date().toISOString(),
    ...overrides
  });

  it('1. should generate a valid plan with 5 to 7 questions', async () => {
    const validPlan = createValidPlan();
    vi.mocked(mockLLM.generate).mockResolvedValue(JSON.stringify(validPlan));
    
    const planner = new PlannerEngine(mockLLM);
    const plan = await planner.generatePlan('taskId', 'Prompt');
    
    expect(plan.questions.length).toBeGreaterThanOrEqual(5);
    expect(plan.questions.length).toBeLessThanOrEqual(7);
  });

  it('2. should reject plan with less than 5 questions', async () => {
    const invalidPlan = createValidPlan({ questions: Array(4).fill({ id: 'q', question: 'q?', required: true }) });
    vi.mocked(mockLLM.generate).mockResolvedValue(JSON.stringify(invalidPlan));
    
    const planner = new PlannerEngine(mockLLM);
    await expect(planner.generatePlan('id', 'prompt')).rejects.toThrow();
  });

  it('3. should reject plan with more than 7 questions', async () => {
    const invalidPlan = createValidPlan({ questions: Array(8).fill({ id: 'q', question: 'q?', required: true }) });
    vi.mocked(mockLLM.generate).mockResolvedValue(JSON.stringify(invalidPlan));
    
    const planner = new PlannerEngine(mockLLM);
    await expect(planner.generatePlan('id', 'prompt')).rejects.toThrow();
  });

  it('4. should reject invalid JSON from LLM', async () => {
    vi.mocked(mockLLM.generate).mockResolvedValue('Not JSON');
    const planner = new PlannerEngine(mockLLM);
    await expect(planner.generatePlan('id', 'prompt')).rejects.toThrow();
  });

  it('5. should reject plan without subtasksGraph', async () => {
    const invalidPlan = createValidPlan();
    delete (invalidPlan as any).subtasksGraph;
    vi.mocked(mockLLM.generate).mockResolvedValue(JSON.stringify(invalidPlan));
    
    const planner = new PlannerEngine(mockLLM);
    await expect(planner.generatePlan('id', 'prompt')).rejects.toThrow();
  });

  it('6. should reject subtask with non-existent dependency', async () => {
    const invalidPlan = createValidPlan({
      subtasksGraph: [
        { id: 'ST-01', title: 'T1', assignedAgent: 'CODER', dependsOn: ['NON_EXISTENT'], status: 'PENDING', worktreePath: null, artifactOutput: null }
      ]
    });
    vi.mocked(mockLLM.generate).mockResolvedValue(JSON.stringify(invalidPlan));
    
    const planner = new PlannerEngine(mockLLM);
    try {
      await planner.generatePlan('id', 'prompt');
      expect.fail('Should have thrown');
    } catch (e: any) {
      expect(e.message).toContain('depends on non-existent subtask');
    }
  });

  it('7. should reject cyclic dependency', async () => {
    const invalidPlan = createValidPlan({
      subtasksGraph: [
        { id: 'ST-01', title: 'T1', assignedAgent: 'CODER', dependsOn: ['ST-02'], status: 'PENDING', worktreePath: null, artifactOutput: null },
        { id: 'ST-02', title: 'T2', assignedAgent: 'CODER', dependsOn: ['ST-01'], status: 'PENDING', worktreePath: null, artifactOutput: null }
      ]
    });
    vi.mocked(mockLLM.generate).mockResolvedValue(JSON.stringify(invalidPlan));
    
    const planner = new PlannerEngine(mockLLM);
    try {
      await planner.generatePlan('id', 'prompt');
      expect.fail('Should have thrown');
    } catch (e: any) {
      expect(e.message).toContain('Cyclic dependency detected');
    }
  });

  it('8. should accept simple graph without dependencies', async () => {
    const validPlan = createValidPlan();
    vi.mocked(mockLLM.generate).mockResolvedValue(JSON.stringify(validPlan));
    
    const planner = new PlannerEngine(mockLLM);
    const plan = await planner.generatePlan('id', 'prompt');
    expect(plan.subtasksGraph[0].dependsOn).toHaveLength(0);
  });

  it('9. should accept graph with valid dependency', async () => {
    const validPlan = createValidPlan({
      subtasksGraph: [
        { id: 'ST-01', title: 'T1', assignedAgent: 'CODER', dependsOn: [], status: 'PENDING', worktreePath: null, artifactOutput: null },
        { id: 'ST-02', title: 'T2', assignedAgent: 'CODER', dependsOn: ['ST-01'], status: 'PENDING', worktreePath: null, artifactOutput: null }
      ]
    });
    vi.mocked(mockLLM.generate).mockResolvedValue(JSON.stringify(validPlan));
    
    const planner = new PlannerEngine(mockLLM);
    const plan = await planner.generatePlan('id', 'prompt');
    expect(plan.subtasksGraph[1].dependsOn).toContain('ST-01');
  });

  it('10. should generate markdown with required sections', async () => {
    const planner = new PlannerEngine(mockLLM);
    const plan = createValidPlan({ title: 'Sample Title' });
    
    const markdown = planner.renderToMarkdown(plan);
    
    expect(markdown).toContain('# GREENFORGE_PLAN — Sample Title');
    expect(markdown).toContain('## Questions');
    expect(markdown).toContain('## Subtasks');
    expect(markdown).toContain('## Acceptance Criteria');
    expect(markdown).toContain('## Risks');
  });

  it('11. should write GREENFORGE_PLAN.md inside allowed root', async () => {
    const planner = new PlannerEngine(mockLLM);
    const plan = createValidPlan();
    
    const filePath = await planner.savePlan(plan, tempDir);
    
    expect(path.basename(filePath)).toBe('GREENFORGE_PLAN.md');
    const content = await readFile(filePath, 'utf8');
    expect(content).toContain(plan.title);
  });

  it('12. should overwrite id and originalPrompt with provided values, ignoring LLM', async () => {
    const maliciousPlan = createValidPlan({
        id: 'fake-id',
        originalPrompt: 'Fake Prompt'
    });
    vi.mocked(mockLLM.generate).mockResolvedValue(JSON.stringify(maliciousPlan));
    
    const planner = new PlannerEngine(mockLLM);
    const plan = await planner.generatePlan('real-task-id', 'Real Prompt');
    
    expect(plan.id).toBe('real-task-id');
    expect(plan.originalPrompt).toBe('Real Prompt');
  });

  it('13. should reject plan with duplicate subtask IDs', async () => {
    const duplicatePlan = createValidPlan({
      subtasksGraph: [
        { id: 'ST-DUP', title: 'T1', assignedAgent: 'CODER', dependsOn: [], status: 'PENDING', worktreePath: null, artifactOutput: null },
        { id: 'ST-DUP', title: 'T2', assignedAgent: 'CODER', dependsOn: [], status: 'PENDING', worktreePath: null, artifactOutput: null }
      ]
    });
    vi.mocked(mockLLM.generate).mockResolvedValue(JSON.stringify(duplicatePlan));
    
    const planner = new PlannerEngine(mockLLM);
    await expect(planner.generatePlan('id', 'prompt'))
        .rejects.toThrow(/Duplicate subtask IDs/);
  });
});
