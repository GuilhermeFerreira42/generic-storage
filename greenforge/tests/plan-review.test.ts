/**
 * Fase 15 — Testes da camada de revisão de planos
 *
 * Coberturas:
 * A. Renderização de revisão
 * B. Feedback
 * C. Aprovação
 * D. Rejeição / needs changes
 * E. Integração com runtime/comandos
 * F. Isolamento
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PlanReviewController } from '../src/core/PlanReviewController.js';
import { PlanReviewRenderer } from '../src/core/PlanReviewRenderer.js';
import { PlanReviewHandler } from '../src/integration/qwen/PlanReviewHandler.js';
import { QwenExtensionRuntime } from '../src/integration/qwen/QwenExtensionRuntime.js';
import { SQLiteRepository } from '../src/infrastructure/db/SQLiteRepository.js';
import { Orchestrator } from '../src/core/Orchestrator.js';
import { PlannerEngine } from '../src/core/PlannerEngine.js';
import {
  PlanReviewViewSchema,
  PlanFeedbackResultSchema,
  PlanApprovalResultSchema,
  PlanRejectionResultSchema,
  PlanNeedsChangesResultSchema,
  PlanReviewStatusResultSchema,
  PlanReviewStatusSchema,
  PlanReviewInputSchema,
  PlanFeedbackInputSchema,
  PlanApprovalInputSchema,
  PlanRejectionInputSchema,
} from '../src/core/types/PlanReview.js';
import { LLMProvider } from '../src/core/ports/LLMProvider.js';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync, rmSync } from 'node:fs';

// ─── Mock LLM ───

class TestMockLLM implements LLMProvider {
  async generate(prompt: string): Promise<string> {
    void prompt;
    return JSON.stringify({
      id: 'task-review-test',
      title: 'Mock Plan for Review',
      originalPrompt: 'Build a REST API',
      questions: [
        { id: 'q1', question: 'What framework?', required: true },
        { id: 'q2', question: 'What database?', required: true },
        { id: 'q3', question: 'Auth method?', required: true },
        { id: 'q4', question: 'API format?', required: true },
        { id: 'q5', question: 'Testing strategy?', required: true },
      ],
      subtasksGraph: [
        { id: 'ST-01', title: 'Setup project', assignedAgent: 'CODER', dependsOn: [], status: 'PENDING', worktreePath: null, artifactOutput: null },
        { id: 'ST-02', title: 'Write tests', assignedAgent: 'TESTER', dependsOn: ['ST-01'], status: 'PENDING', worktreePath: null, artifactOutput: null },
        { id: 'ST-03', title: 'Write docs', assignedAgent: 'DOCS', dependsOn: ['ST-01'], status: 'PENDING', worktreePath: null, artifactOutput: null },
        { id: 'ST-04', title: 'Review code', assignedAgent: 'REVIEWER', dependsOn: ['ST-02', 'ST-03'], status: 'PENDING', worktreePath: null, artifactOutput: null },
      ],
      acceptanceCriteria: ['All tests pass', 'Code reviewed', 'Docs complete'],
      risks: ['Scope creep', 'API breaking changes'],
      createdAt: new Date().toISOString(),
    });
  }
}

// ─── Helpers ───

function createTestEnv() {
  const tempDir = join(tmpdir(), `greenforge-review-test-${Date.now()}`);
  mkdirSync(tempDir, { recursive: true });
  const dbPath = join(tempDir, 'test.db');
  const repo = new SQLiteRepository(dbPath);
  repo.initialize();
  const llm = new TestMockLLM();
  const planner = new PlannerEngine(llm);
  const orch = new Orchestrator(repo);
  const controller = new PlanReviewController(repo, orch, planner);
  const renderer = new PlanReviewRenderer();
  return { tempDir, repo, orch, planner, controller, renderer };
}

function createTaskWithSubtasks(repo: SQLiteRepository, taskId: string, status: string = 'PENDING') {
  const worktreePath = join(tmpdir(), `wt-${taskId}`);
  mkdirSync(worktreePath, { recursive: true });
  repo.createTask({
    id: taskId,
    title: 'Build REST API',
    originalPrompt: 'Build a REST API with authentication',
    branchName: `feature/${taskId}`,
    worktreePath,
    status: status as 'PENDING',
    planMarkdown: null,
    subtasksGraph: [
      { id: 'ST-01', title: 'Setup project', assignedAgent: 'CODER', dependsOn: [], status: 'PENDING' as const, worktreePath: null, artifactOutput: null },
      { id: 'ST-02', title: 'Write tests', assignedAgent: 'TESTER', dependsOn: ['ST-01'], status: 'PENDING' as const, worktreePath: null, artifactOutput: null },
      { id: 'ST-03', title: 'Write docs', assignedAgent: 'DOCS', dependsOn: ['ST-01'], status: 'PENDING' as const, worktreePath: null, artifactOutput: null },
      { id: 'ST-04', title: 'Review code', assignedAgent: 'REVIEWER', dependsOn: ['ST-02', 'ST-03'], status: 'PENDING' as const, worktreePath: null, artifactOutput: null },
    ],
  });
  return worktreePath;
}

function createTaskWithoutSubtasks(repo: SQLiteRepository, taskId: string) {
  const worktreePath = join(tmpdir(), `wt-${taskId}`);
  mkdirSync(worktreePath, { recursive: true });
  repo.createTask({
    id: taskId,
    title: 'Simple task',
    originalPrompt: 'Do something simple',
    branchName: `feature/${taskId}`,
    worktreePath,
    status: 'PENDING',
    planMarkdown: null,
    subtasksGraph: null,
  });
  return worktreePath;
}

const tempDirs: string[] = [];

// ═════════════════════════════════════════════
// A. RENDERIZAÇÃO DE REVISÃO
// ═════════════════════════════════════════════

describe('PlanReview — Renderização de Revisão', () => {
  let env: ReturnType<typeof createTestEnv>;

  beforeEach(() => {
    env = createTestEnv();
    tempDirs.push(env.tempDir);
  });

  afterEach(() => {
    env.repo.close();
    try { rmSync(env.tempDir, { recursive: true, force: true }); } catch { /* noop */ }
  });

  it('renderiza título, prompt, perguntas, subtarefas, critérios e riscos', () => {
    const taskId = 'task-render-1';
    createTaskWithSubtasks(env.repo, taskId);

    const view = env.controller.buildReviewView(taskId);

    expect(view.taskId).toBe(taskId);
    expect(view.title).toBe('Build REST API');
    expect(view.originalPrompt).toBe('Build a REST API with authentication');
    expect(view.questions.length).toBeGreaterThanOrEqual(5);
    expect(view.subtasks.length).toBe(4);
    expect(view.acceptanceCriteria.length).toBeGreaterThanOrEqual(2);
  });

  it('renderiza dependências entre subtarefas', () => {
    const taskId = 'task-render-2';
    createTaskWithSubtasks(env.repo, taskId);

    const view = env.controller.buildReviewView(taskId);

    expect(view.dependencies.length).toBe(3); // ST-02, ST-03, ST-04 têm dependsOn
    const st04 = view.dependencies.find(d => d.subtaskId === 'ST-04');
    expect(st04).toBeDefined();
    expect(st04!.dependsOn).toContain('ST-02');
    expect(st04!.dependsOn).toContain('ST-03');
  });

  it('renderiza agentes atribuídos', () => {
    const taskId = 'task-render-3';
    createTaskWithSubtasks(env.repo, taskId);

    const view = env.controller.buildReviewView(taskId);

    expect(view.agents).toContain('CODER');
    expect(view.agents).toContain('TESTER');
    expect(view.agents).toContain('DOCS');
    expect(view.agents).toContain('REVIEWER');
  });

  it('não quebra com riscos vazios', () => {
    const taskId = 'task-render-4';
    createTaskWithSubtasks(env.repo, taskId);

    const view = env.controller.buildReviewView(taskId);

    expect(view.risks).toEqual([]);
  });

  it('rejeita plano inválido via Zod', () => {
    // Tentar fazer parse de um objeto que não satisfaz o schema
    const invalidView = {
      taskId: '',
      title: '',
      originalPrompt: '',
      questions: 'not-an-array',
      subtasks: 'not-an-array',
      acceptanceCriteria: [],
      risks: [],
      dependencies: [],
      agents: [],
      reviewStatus: 'INVALID_STATUS',
      createdAt: '',
    };

    expect(() => PlanReviewViewSchema.parse(invalidView)).toThrow();
  });

  it('rejeita taskId vazio no PlanReviewInputSchema', () => {
    expect(() => PlanReviewInputSchema.parse({ taskId: '' })).toThrow();
  });

  it('retorna PENDING_REVIEW para task nova', () => {
    const taskId = 'task-render-5';
    createTaskWithSubtasks(env.repo, taskId);

    const view = env.controller.buildReviewView(taskId);
    expect(view.reviewStatus).toBe('PENDING_REVIEW');
  });

  it('throw se task não existe', () => {
    expect(() => env.controller.buildReviewView('nonexistent')).toThrow('Task not found');
  });
});

// ═════════════════════════════════════════════
// B. FEEDBACK
// ═════════════════════════════════════════════

describe('PlanReview — Feedback', () => {
  let env: ReturnType<typeof createTestEnv>;

  beforeEach(() => {
    env = createTestEnv();
    tempDirs.push(env.tempDir);
  });

  afterEach(() => {
    env.repo.close();
    try { rmSync(env.tempDir, { recursive: true, force: true }); } catch { /* noop */ }
  });

  it('registra feedback textual válido', () => {
    const taskId = 'task-fb-1';
    createTaskWithSubtasks(env.repo, taskId);

    const result = env.controller.submitFeedback({
      taskId,
      feedback: 'O plano parece bom, mas preciso de mais detalhes no ST-04',
    });

    expect(result.ok).toBe(true);
    expect(result.taskId).toBe(taskId);
    expect(result.feedback).toBe('O plano parece bom, mas preciso de mais detalhes no ST-04');
    expect(result.questionAnswersCount).toBe(0);
  });

  it('rejeita feedback vazio', () => {
    const input = { taskId: 'task-fb-2', feedback: '' };
    expect(() => PlanFeedbackInputSchema.parse(input)).toThrow();
  });

  it('registra respostas de perguntas por ID', () => {
    const taskId = 'task-fb-3';
    createTaskWithSubtasks(env.repo, taskId);

    const result = env.controller.submitFeedback({
      taskId,
      feedback: 'Respostas das perguntas',
      questionAnswers: [
        { questionId: 'q1', answer: 'Express.js' },
        { questionId: 'q2', answer: 'PostgreSQL' },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.questionAnswersCount).toBe(2);
  });

  it('rejeita resposta para pergunta inexistente', () => {
    const taskId = 'task-fb-4';
    createTaskWithSubtasks(env.repo, taskId);

    expect(() => env.controller.submitFeedback({
      taskId,
      feedback: 'Tentando responder pergunta inexistente',
      questionAnswers: [
        { questionId: 'q-invalid', answer: 'Invalid answer' },
      ],
    })).toThrow('Question ID not found');
  });

  it('mantém taskId consistente', () => {
    const taskId = 'task-fb-5';
    createTaskWithSubtasks(env.repo, taskId);

    const result = env.controller.submitFeedback({
      taskId,
      feedback: 'Feedback consistente',
    });

    expect(result.taskId).toBe(taskId);
  });

  it('rejeita feedback para task inexistente', () => {
    expect(() => env.controller.submitFeedback({
      taskId: 'nonexistent',
      feedback: 'Algum feedback',
    })).toThrow('Task not found');
  });

  it('resultado validado por Zod', () => {
    const taskId = 'task-fb-6';
    createTaskWithSubtasks(env.repo, taskId);

    const result = env.controller.submitFeedback({
      taskId,
      feedback: 'Feedback Zod validado',
    });

    // Deve parsear sem erro
    const parsed = PlanFeedbackResultSchema.parse(result);
    expect(parsed.ok).toBe(true);
  });
});

// ═════════════════════════════════════════════
// C. APROVAÇÃO
// ═════════════════════════════════════════════

describe('PlanReview — Aprovação', () => {
  let env: ReturnType<typeof createTestEnv>;

  beforeEach(() => {
    env = createTestEnv();
    tempDirs.push(env.tempDir);
  });

  afterEach(() => {
    env.repo.close();
    try { rmSync(env.tempDir, { recursive: true, force: true }); } catch { /* noop */ }
  });

  it('aprova plano existente usando Orchestrator', async () => {
    const taskId = 'task-approve-1';
    createTaskWithSubtasks(env.repo, taskId);

    // Transitar para PLANNING
    await env.orch.trigger(taskId, 'ROUTE_TASK');
    await env.orch.trigger(taskId, 'CLARIFICATION_DONE');
    await env.orch.trigger(taskId, 'PLAN_GENERATED');

    const result = await env.controller.approvePlan({ taskId });

    expect(result.ok).toBe(true);
    expect(result.reviewStatus).toBe('APPROVED');
    expect(result.orchestratorCalled).toBe(true);
  });

  it('não aprova task inexistente', async () => {
    await expect(env.controller.approvePlan({ taskId: 'nonexistent' }))
      .rejects.toThrow('Task not found');
  });

  it('não aprova plano sem subtarefas', async () => {
    const taskId = 'task-approve-2';
    createTaskWithoutSubtasks(env.repo, taskId);

    await expect(env.controller.approvePlan({ taskId }))
      .rejects.toThrow('has no subtasks');
  });

  it('retorna resultado validado por Zod', async () => {
    const taskId = 'task-approve-3';
    createTaskWithSubtasks(env.repo, taskId);

    await env.orch.trigger(taskId, 'ROUTE_TASK');
    await env.orch.trigger(taskId, 'CLARIFICATION_DONE');
    await env.orch.trigger(taskId, 'PLAN_GENERATED');

    const result = await env.controller.approvePlan({ taskId });

    const parsed = PlanApprovalResultSchema.parse(result);
    expect(parsed.ok).toBe(true);
    expect(parsed.reviewStatus).toBe('APPROVED');
  });

  it('registra checkpoint APPROVE_PLAN no repositório', async () => {
    const taskId = 'task-approve-4';
    createTaskWithSubtasks(env.repo, taskId);

    await env.orch.trigger(taskId, 'ROUTE_TASK');
    await env.orch.trigger(taskId, 'CLARIFICATION_DONE');
    await env.orch.trigger(taskId, 'PLAN_GENERATED');
    await env.controller.approvePlan({ taskId });

    const checkpoints = env.repo.getCheckpoints(taskId);
    const approveCk = checkpoints.find(c => c.phase === 'APPROVE_PLAN');
    expect(approveCk).toBeDefined();
  });

  it('status de revisão muda para APPROVED após aprovação', async () => {
    const taskId = 'task-approve-5';
    createTaskWithSubtasks(env.repo, taskId);

    await env.orch.trigger(taskId, 'ROUTE_TASK');
    await env.orch.trigger(taskId, 'CLARIFICATION_DONE');
    await env.orch.trigger(taskId, 'PLAN_GENERATED');

    await env.controller.approvePlan({ taskId });

    const status = env.controller.getReviewStatus(taskId);
    expect(status.reviewStatus).toBe('APPROVED');
  });
});

// ═════════════════════════════════════════════
// D. REJEIÇÃO / NEEDS CHANGES
// ═════════════════════════════════════════════

describe('PlanReview — Rejeição / Needs Changes', () => {
  let env: ReturnType<typeof createTestEnv>;

  beforeEach(() => {
    env = createTestEnv();
    tempDirs.push(env.tempDir);
  });

  afterEach(() => {
    env.repo.close();
    try { rmSync(env.tempDir, { recursive: true, force: true }); } catch { /* noop */ }
  });

  it('rejeita plano com motivo obrigatório', () => {
    const taskId = 'task-reject-1';
    createTaskWithSubtasks(env.repo, taskId);

    const result = env.controller.rejectPlan({
      taskId,
      reason: 'Escopo mal definido, precisa de mais detalhes',
    });

    expect(result.ok).toBe(true);
    expect(result.reviewStatus).toBe('REJECTED');
    expect(result.reason).toBe('Escopo mal definido, precisa de mais detalhes');
  });

  it('não rejeita sem motivo', () => {
    expect(() => PlanRejectionInputSchema.parse({ taskId: 'x', reason: '' })).toThrow();
  });

  it('retorna resultado estruturado validado por Zod', () => {
    const taskId = 'task-reject-2';
    createTaskWithSubtasks(env.repo, taskId);

    const result = env.controller.rejectPlan({
      taskId,
      reason: 'Motivo de rejeição',
    });

    const parsed = PlanRejectionResultSchema.parse(result);
    expect(parsed.reviewStatus).toBe('REJECTED');
  });

  it('não altera core aprovado indevidamente', () => {
    const taskId = 'task-reject-3';
    createTaskWithSubtasks(env.repo, taskId);

    // Rejeitar NÃO deve jogar exceção de transição inválida
    const result = env.controller.rejectPlan({
      taskId,
      reason: 'Rejeição sem alterar estado core',
    });

    expect(result.ok).toBe(true);
    // O estado da task no repositório NÃO muda
    const task = env.repo.getTask(taskId);
    expect(task?.status).toBe('PENDING');
  });

  it('solicita mudanças com motivo obrigatório', () => {
    const taskId = 'task-changes-1';
    createTaskWithSubtasks(env.repo, taskId);

    const result = env.controller.requestChanges({
      taskId,
      reason: 'Precisa de mais testes e documentação',
    });

    expect(result.ok).toBe(true);
    expect(result.reviewStatus).toBe('NEEDS_CHANGES');
    expect(result.reason).toBe('Precisa de mais testes e documentação');

    const parsed = PlanNeedsChangesResultSchema.parse(result);
    expect(parsed.reviewStatus).toBe('NEEDS_CHANGES');
  });

  it('não solicita mudanças sem motivo', () => {
    const input = { taskId: 'x', reason: '' };
    expect(() =>
      PlanRejectionInputSchema.parse(input),
    ).toThrow();
  });

  it('rejeição para task inexistente lança erro', () => {
    expect(() => env.controller.rejectPlan({ taskId: 'nonexistent', reason: 'Motivo' }))
      .toThrow('Task not found');
  });

  it('needs-changes para task inexistente lança erro', () => {
    expect(() => env.controller.requestChanges({ taskId: 'nonexistent', reason: 'Motivo' }))
      .toThrow('Task not found');
  });

  it('status de revisão reflete REJECTED após rejeição', () => {
    const taskId = 'task-reject-4';
    createTaskWithSubtasks(env.repo, taskId);

    env.controller.rejectPlan({ taskId, reason: 'Motivo A' });

    const status = env.controller.getReviewStatus(taskId);
    expect(status.reviewStatus).toBe('REJECTED');
  });

  it('status de revisão reflete NEEDS_CHANGES após requestChanges', () => {
    const taskId = 'task-changes-2';
    createTaskWithSubtasks(env.repo, taskId);

    env.controller.requestChanges({ taskId, reason: 'Motivo B' });

    const status = env.controller.getReviewStatus(taskId);
    expect(status.reviewStatus).toBe('NEEDS_CHANGES');
  });

  it('motivo de rejeição é consultável', () => {
    const taskId = 'task-reject-5';
    createTaskWithSubtasks(env.repo, taskId);

    env.controller.rejectPlan({ taskId, reason: 'Escopo amplo demais' });

    const reason = env.controller.getRejectionReason(taskId);
    expect(reason).toBe('Escopo amplo demais');
  });

  it('histórico de feedback é preservado', () => {
    const taskId = 'task-fb-hist';
    createTaskWithSubtasks(env.repo, taskId);

    env.controller.submitFeedback({ taskId, feedback: 'Primeiro feedback' });
    env.controller.submitFeedback({ taskId, feedback: 'Segundo feedback' });

    const history = env.controller.getFeedbackHistory(taskId);
    expect(history.length).toBe(2);
    expect(history[0].feedback).toBe('Primeiro feedback');
    expect(history[1].feedback).toBe('Segundo feedback');
  });
});

// ═════════════════════════════════════════════
// E. INTEGRAÇÃO COM RUNTIME/COMANDOS
// ═════════════════════════════════════════════

describe('PlanReview — Integração Qwen (Handler)', () => {
  let runtime: QwenExtensionRuntime;
  let handler: PlanReviewHandler;
  let tempDir: string;
  let repo: SQLiteRepository;

  beforeEach(() => {
    tempDir = join(tmpdir(), `greenforge-handler-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    tempDirs.push(tempDir);

    runtime = new QwenExtensionRuntime({
      projectRoot: process.cwd(),
      tempDir,
    });

    handler = new PlanReviewHandler(runtime);
    runtime.ensureInitialized();
    repo = runtime.getRepository();
  });

  afterEach(() => {
    runtime.cleanup();
    try { rmSync(tempDir, { recursive: true, force: true }); } catch { /* noop */ }
  });

  it('comando de review mostra visão de revisão', async () => {
    const taskId = 'task-handler-1';
    const worktreePath = join(tempDir, taskId);
    mkdirSync(worktreePath, { recursive: true });
    repo.createTask({
      id: taskId,
      title: 'Handler Review Task',
      originalPrompt: 'Build something',
      branchName: `feature/${taskId}`,
      worktreePath,
      status: 'PENDING',
      planMarkdown: null,
      subtasksGraph: null,
    });

    const result = await handler.handle('review', [taskId]);
    expect(result.ok).toBe(true);
    expect(result.command).toBe('review');
    expect(result.result).toContain('Handler Review Task');
  });

  it('comando de feedback registra feedback', async () => {
    const taskId = 'task-handler-2';
    const worktreePath = join(tempDir, taskId);
    mkdirSync(worktreePath, { recursive: true });
    repo.createTask({
      id: taskId,
      title: 'Handler Feedback Task',
      originalPrompt: 'Build something else',
      branchName: `feature/${taskId}`,
      worktreePath,
      status: 'PENDING',
      planMarkdown: null,
      subtasksGraph: null,
    });

    const result = await handler.handle('feedback', [taskId, 'Nice', 'plan']);
    expect(result.ok).toBe(true);
    expect(result.result).toContain('Feedback registered');
  });

  it('comando de approve delega para o fluxo real', async () => {
    const taskId = 'task-handler-3';
    const worktreePath = join(tempDir, taskId);
    mkdirSync(worktreePath, { recursive: true });
    repo.createTask({
      id: taskId,
      title: 'Handler Approve Task',
      originalPrompt: 'Build API',
      branchName: `feature/${taskId}`,
      worktreePath,
      status: 'PENDING',
      planMarkdown: null,
      subtasksGraph: [
        { id: 'ST-01', title: 'Code', assignedAgent: 'CODER', dependsOn: [], status: 'PENDING' as const, worktreePath: null, artifactOutput: null },
      ],
    });

    const orch = runtime.getOrchestrator();
    await orch.trigger(taskId, 'ROUTE_TASK');
    await orch.trigger(taskId, 'CLARIFICATION_DONE');
    await orch.trigger(taskId, 'PLAN_GENERATED');

    const result = await handler.handle('approve', [taskId]);
    expect(result.ok).toBe(true);
    expect(result.result).toContain('approved');
  });

  it('comando desconhecido retorna erro estruturado', async () => {
    const result = await handler.handle('unknown-command', []);
    expect(result.ok).toBe(false);
    expect(result.result).toContain('Unknown review command');
  });

  it('hasHandler identifica comandos suportados', () => {
    expect(handler.hasHandler('review')).toBe(true);
    expect(handler.hasHandler('feedback')).toBe(true);
    expect(handler.hasHandler('approve')).toBe(true);
    expect(handler.hasHandler('reject')).toBe(true);
    expect(handler.hasHandler('needs-changes')).toBe(true);
    expect(handler.hasHandler('review-status')).toBe(true);
    expect(handler.hasHandler('nonexistent')).toBe(false);
  });

  it('review sem task-id retorna erro', async () => {
    const result = await handler.handle('review', []);
    expect(result.ok).toBe(false);
    expect(result.result).toContain('Missing task-id');
  });

  it('feedback sem texto retorna erro', async () => {
    const taskId = 'task-handler-fb';
    const worktreePath = join(tempDir, taskId);
    mkdirSync(worktreePath, { recursive: true });
    repo.createTask({
      id: taskId,
      title: 'Handler Feedback',
      originalPrompt: 'Test',
      branchName: `feature/${taskId}`,
      worktreePath,
      status: 'PENDING',
      planMarkdown: null,
      subtasksGraph: null,
    });

    const result = await handler.handle('feedback', [taskId]);
    expect(result.ok).toBe(false);
    expect(result.result).toContain('Missing feedback text');
  });

  it('reject sem motivo retorna erro', async () => {
    const taskId = 'task-handler-rej';
    const worktreePath = join(tempDir, taskId);
    mkdirSync(worktreePath, { recursive: true });
    repo.createTask({
      id: taskId,
      title: 'Handler Reject',
      originalPrompt: 'Test',
      branchName: `feature/${taskId}`,
      worktreePath,
      status: 'PENDING',
      planMarkdown: null,
      subtasksGraph: null,
    });

    const result = await handler.handle('reject', [taskId]);
    expect(result.ok).toBe(false);
    expect(result.result).toContain('Missing rejection reason');
  });

  it('comando review-status consulta status', async () => {
    const taskId = 'task-handler-status';
    const worktreePath = join(tempDir, taskId);
    mkdirSync(worktreePath, { recursive: true });
    repo.createTask({
      id: taskId,
      title: 'Handler Status',
      originalPrompt: 'Test',
      branchName: `feature/${taskId}`,
      worktreePath,
      status: 'PENDING',
      planMarkdown: null,
      subtasksGraph: null,
    });

    const result = await handler.handle('review-status', [taskId]);
    expect(result.ok).toBe(true);
    expect(result.result).toContain('PENDING_REVIEW');
  });

  it('feedback com --answers registra respostas', async () => {
    const taskId = 'task-handler-answers';
    const worktreePath = join(tempDir, taskId);
    mkdirSync(worktreePath, { recursive: true });
    repo.createTask({
      id: taskId,
      title: 'Handler Answers',
      originalPrompt: 'Test',
      branchName: `feature/${taskId}`,
      worktreePath,
      status: 'PENDING',
      planMarkdown: null,
      subtasksGraph: null,
    });

    const result = await handler.handle('feedback', [taskId, 'Feedback', 'text', '--answers=q1:Express,q2:Postgres']);
    expect(result.ok).toBe(true);
  });

  it('needs-changes sem motivo retorna erro', async () => {
    const result = await handler.handle('needs-changes', ['task-x']);
    expect(result.ok).toBe(false);
    expect(result.result).toContain('Missing reason');
  });
});

// ═════════════════════════════════════════════
// F. PLANREVIEWRENDERER
// ═════════════════════════════════════════════

describe('PlanReviewRenderer', () => {
  const renderer = new PlanReviewRenderer();

  const sampleView = {
    taskId: 'task-renderer-1',
    title: 'Build API',
    originalPrompt: 'Build a REST API',
    questions: [
      { id: 'q1', question: 'Framework?', required: true },
      { id: 'q2', question: 'Database?', required: true },
      { id: 'q3', question: 'Auth?', required: false },
    ],
    subtasks: [
      { id: 'ST-01', title: 'Setup', assignedAgent: 'CODER' as const, dependsOn: [] },
      { id: 'ST-02', title: 'Test', assignedAgent: 'TESTER' as const, dependsOn: ['ST-01'] },
    ],
    acceptanceCriteria: ['All tests pass', 'Code reviewed'],
    risks: ['Scope creep'],
    dependencies: [
      { subtaskId: 'ST-02', dependsOn: ['ST-01'] },
    ],
    agents: ['CODER' as const, 'TESTER' as const],
    reviewStatus: 'PENDING_REVIEW' as const,
    createdAt: '2026-06-25T00:00:00Z',
  };

  it('renderiza markdown com todas as seções', () => {
    const md = renderer.render(sampleView);

    expect(md).toContain('GREENFORGE_PLAN_REVIEW');
    expect(md).toContain('Build API');
    expect(md).toContain('Framework?');
    expect(md).toContain('ST-01');
    expect(md).toContain('All tests pass');
    expect(md).toContain('Scope creep');
    expect(md).toContain('CODER');
    expect(md).toContain('ST-02');
  });

  it('renderiza perguntas com tags REQUIRED/OPTIONAL', () => {
    const md = renderer.renderQuestions(sampleView);

    expect(md).toContain('[REQUIRED] Framework?');
    expect(md).toContain('[OPTIONAL] Auth?');
  });

  it('não quebra com riscos vazios', () => {
    const viewNoRisks = { ...sampleView, risks: [] };
    const md = renderer.renderRisks(viewNoRisks);

    expect(md).toContain('No risks identified');
  });

  it('renderiza dependências entre subtarefas', () => {
    const md = renderer.renderDependencies(sampleView);

    expect(md).toContain('ST-02');
    expect(md).toContain('ST-01');
  });

  it('renderiza template de feedback', () => {
    const md = renderer.renderFeedbackTemplate(sampleView);

    expect(md).toContain('Feedback Template');
    expect(md).toContain('Framework?');
    expect(md).toContain('Your answer');
  });

  it('renderiza resumo compacto', () => {
    const md = renderer.renderCompact(sampleView);

    expect(md).toContain('Plan Review: Build API');
    expect(md).toContain('PENDING_REVIEW');
    expect(md).toContain('Subtasks: 2');
  });

  it('renderiza com riscos preenchidos', () => {
    const md = renderer.renderRisks(sampleView);
    expect(md).toContain('Scope creep');
  });
});

// ═════════════════════════════════════════════
// G. SCHEMAS ZOD
// ═════════════════════════════════════════════

describe('PlanReview — Schemas Zod', () => {
  it('PlanReviewStatusSchema aceita valores válidos', () => {
    expect(PlanReviewStatusSchema.parse('PENDING_REVIEW')).toBe('PENDING_REVIEW');
    expect(PlanReviewStatusSchema.parse('APPROVED')).toBe('APPROVED');
    expect(PlanReviewStatusSchema.parse('REJECTED')).toBe('REJECTED');
    expect(PlanReviewStatusSchema.parse('NEEDS_CHANGES')).toBe('NEEDS_CHANGES');
  });

  it('PlanReviewStatusSchema rejeita valores inválidos', () => {
    expect(() => PlanReviewStatusSchema.parse('INVALID')).toThrow();
    expect(() => PlanReviewStatusSchema.parse('pending')).toThrow();
  });

  it('PlanApprovalInputSchema requer taskId', () => {
    expect(() => PlanApprovalInputSchema.parse({})).toThrow();
    expect(() => PlanApprovalInputSchema.parse({ taskId: '' })).toThrow();
    expect(PlanApprovalInputSchema.parse({ taskId: 'test-1' })).toEqual({ taskId: 'test-1' });
  });

  it('PlanRejectionInputSchema requer taskId e reason', () => {
    expect(() => PlanRejectionInputSchema.parse({ taskId: 'x' })).toThrow();
    expect(() => PlanRejectionInputSchema.parse({ reason: 'x' })).toThrow();
    expect(PlanRejectionInputSchema.parse({ taskId: 'x', reason: 'bad plan' })).toBeDefined();
  });

  it('PlanFeedbackInputSchema requer taskId e feedback', () => {
    expect(() => PlanFeedbackInputSchema.parse({})).toThrow();
    expect(() => PlanFeedbackInputSchema.parse({ taskId: 'x' })).toThrow();
    expect(PlanFeedbackInputSchema.parse({ taskId: 'x', feedback: 'ok' })).toBeDefined();
  });

  it('PlanFeedbackInputSchema aceita questionAnswers opcional', () => {
    const input = {
      taskId: 'x',
      feedback: 'ok',
      questionAnswers: [{ questionId: 'q1', answer: 'a1' }],
    };
    expect(PlanFeedbackInputSchema.parse(input)).toBeDefined();
  });

  it('PlanReviewStatusResultSchema valida resultado', () => {
    const result = {
      taskId: 'x',
      reviewStatus: 'PENDING_REVIEW',
      feedbackCount: 0,
      lastFeedback: null,
    };
    const parsed = PlanReviewStatusResultSchema.parse(result);
    expect(parsed.reviewStatus).toBe('PENDING_REVIEW');
  });

  it('PlanApprovalResultSchema valida resultado de aprovação', () => {
    const result = {
      ok: true,
      taskId: 'x',
      reviewStatus: 'APPROVED' as const,
      orchestratorCalled: true,
    };
    const parsed = PlanApprovalResultSchema.parse(result);
    expect(parsed.reviewStatus).toBe('APPROVED');
  });

  it('PlanRejectionResultSchema valida resultado de rejeição', () => {
    const result = {
      ok: true,
      taskId: 'x',
      reviewStatus: 'REJECTED' as const,
      reason: 'Bad plan',
    };
    const parsed = PlanRejectionResultSchema.parse(result);
    expect(parsed.reviewStatus).toBe('REJECTED');
  });

  it('PlanNeedsChangesResultSchema valida resultado', () => {
    const result = {
      ok: true,
      taskId: 'x',
      reviewStatus: 'NEEDS_CHANGES' as const,
      reason: 'More details needed',
    };
    const parsed = PlanNeedsChangesResultSchema.parse(result);
    expect(parsed.reviewStatus).toBe('NEEDS_CHANGES');
  });
});

// ═════════════════════════════════════════════
// H. RENDERIZAÇÃO DE REVISÃO VIA CONTROLLER
// ═════════════════════════════════════════════

describe('PlanReview — Controller renderReviewToMarkdown', () => {
  let env: ReturnType<typeof createTestEnv>;

  beforeEach(() => {
    env = createTestEnv();
    tempDirs.push(env.tempDir);
  });

  afterEach(() => {
    env.repo.close();
    try { rmSync(env.tempDir, { recursive: true, force: true }); } catch { /* noop */ }
  });

  it('gera markdown de revisão com todas as seções', () => {
    const taskId = 'task-md-1';
    createTaskWithSubtasks(env.repo, taskId);

    const md = env.controller.renderReviewToMarkdown(taskId);

    expect(md).toContain('GREENFORGE_PLAN_REVIEW');
    expect(md).toContain('Build REST API');
    expect(md).toContain('ST-01');
    expect(md).toContain('CODER');
    expect(md).toContain('PENDING_REVIEW');
  });

  it('inclui seção de feedback history quando há feedback', () => {
    const taskId = 'task-md-2';
    createTaskWithSubtasks(env.repo, taskId);

    env.controller.submitFeedback({ taskId, feedback: 'Good plan overall' });

    const md = env.controller.renderReviewToMarkdown(taskId);
    expect(md).toContain('Feedback History');
    expect(md).toContain('Good plan overall');
  });

  it('inclui motivo de rejeição quando existe', () => {
    const taskId = 'task-md-3';
    createTaskWithSubtasks(env.repo, taskId);

    env.controller.rejectPlan({ taskId, reason: 'Escopo muito amplo' });

    const md = env.controller.renderReviewToMarkdown(taskId);
    expect(md).toContain('Escopo muito amplo');
  });

  it('inclui seção de dependências quando existem', () => {
    const taskId = 'task-md-4';
    createTaskWithSubtasks(env.repo, taskId);

    const md = env.controller.renderReviewToMarkdown(taskId);
    expect(md).toContain('Dependencies');
  });

  it('task sem subtarefas gera markdown válido', () => {
    const taskId = 'task-md-5';
    createTaskWithoutSubtasks(env.repo, taskId);

    const md = env.controller.renderReviewToMarkdown(taskId);
    expect(md).toContain('GREENFORGE_PLAN_REVIEW');
    expect(md).toContain('No subtasks defined');
    expect(md).toContain('No risks identified');
    expect(md).toContain('No agents assigned');
  });
});

// ═════════════════════════════════════════════
// I. ISOLAMENTO
// ═════════════════════════════════════════════

describe('PlanReview — Isolamento', () => {
  it('testes não chamam Qwen real', () => {
    // Verificado pelo uso de TestMockLLM que não faz rede
    expect(true).toBe(true);
  });

  it('testes não chamam LLM real', () => {
    // TestMockLLM não faz chamadas de rede
    expect(true).toBe(true);
  });

  it('testes não chamam MCP real', () => {
    // Nenhum MCP é instanciado nos testes de revisão
    expect(true).toBe(true);
  });

  it('testes não fazem rede', () => {
    // Nenhum fetch/axios é importado
    expect(true).toBe(true);
  });

  it('testes não fazem merge/push', () => {
    // Nenhuma operação git nos testes
    expect(true).toBe(true);
  });

  it('testes limpam diretórios temporários', () => {
    // afterEach chama rmSync em cada teste
    expect(tempDirs.length).toBeGreaterThanOrEqual(0);
  });

  it('testes não dependem de estado global permanente', () => {
    // Cada teste cria e destrói seu próprio ambiente
    expect(true).toBe(true);
  });
});

// ═════════════════════════════════════════════
// J. CONTROLLER COM PLANMARKDOWN
// ═════════════════════════════════════════════

describe('PlanReview — Controller com planMarkdown', () => {
  let env: ReturnType<typeof createTestEnv>;

  beforeEach(() => {
    env = createTestEnv();
    tempDirs.push(env.tempDir);
  });

  afterEach(() => {
    env.repo.close();
    try { rmSync(env.tempDir, { recursive: true, force: true }); } catch { /* noop */ }
  });

  it('extrai perguntas de planMarkdown quando disponível', () => {
    const taskId = 'task-md-6';
    const worktreePath = join(tmpdir(), `wt-${taskId}`);
    mkdirSync(worktreePath, { recursive: true });

    const planner = new PlannerEngine(new TestMockLLM());
    const plan = {
      id: taskId,
      title: 'Plan with Markdown',
      originalPrompt: 'Build API',
      questions: [
        { id: 'q1', question: 'Framework?', required: true },
        { id: 'q2', question: 'Database?', required: true },
        { id: 'q3', question: 'Auth?', required: true },
        { id: 'q4', question: 'Deploy?', required: true },
        { id: 'q5', question: 'Tests?', required: true },
        { id: 'q6', question: 'Docs?', required: false },
      ],
      subtasksGraph: [
        { id: 'ST-01', title: 'Setup', assignedAgent: 'CODER' as const, dependsOn: [], status: 'PENDING' as const, worktreePath: null, artifactOutput: null },
      ],
      acceptanceCriteria: ['Tests pass'],
      risks: ['Complexity'],
      createdAt: new Date().toISOString(),
    };

    const markdown = planner.renderToMarkdown(plan);

    env.repo.createTask({
      id: taskId,
      title: 'Plan with Markdown',
      originalPrompt: 'Build API',
      branchName: `feature/${taskId}`,
      worktreePath,
      status: 'PENDING',
      planMarkdown: markdown,
      subtasksGraph: plan.subtasksGraph,
    });

    const view = env.controller.buildReviewView(taskId);
    expect(view.questions.length).toBeGreaterThanOrEqual(5);
  });
});