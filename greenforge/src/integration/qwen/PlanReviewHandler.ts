import {
  CommandHandlerResult,
  CommandHandlerResultSchema,
} from './runtimeTypes.js';
import { QwenExtensionRuntime } from './QwenExtensionRuntime.js';
import { PlanReviewController } from '../../core/PlanReviewController.js';
import { PlanReviewRenderer } from '../../core/PlanReviewRenderer.js';

/**
 * Fase 15 — PlanReviewHandler
 *
 * Handler de integração Qwen para comandos de revisão de planos.
 * Expõe comandos textuais de review, feedback, approve e reject
 * que delegam para o PlanReviewController (core) e
 * PlanReviewRenderer (core).
 *
 * Comandos:
 * - review <task-id>: mostra visão de revisão do plano
 * - feedback <task-id> <text> [--answers=q1:answer1,q2:answer2]: registra feedback
 * - approve <task-id>: aprova o plano
 * - reject <task-id> <reason>: rejeita o plano com motivo
 * - needs-changes <task-id> <reason>: solicita mudanças
 * - review-status <task-id>: consulta status de revisão
 */
export class PlanReviewHandler {
  private controller: PlanReviewController | null = null;
  private renderer: PlanReviewRenderer;

  /** Supported review command names */
  static readonly COMMANDS = [
    'review',
    'feedback',
    'approve',
    'reject',
    'needs-changes',
    'review-status',
  ] as const;

  constructor(private readonly runtime: QwenExtensionRuntime) {
    this.renderer = new PlanReviewRenderer();
  }

  /**
   * Validates and returns a command handler result via Zod.
   */
  private valid(result: unknown): CommandHandlerResult {
    return CommandHandlerResultSchema.parse(result);
  }

  /**
   * Returns the PlanReviewController, creating it lazily.
   */
  private getController(): PlanReviewController {
    if (!this.controller) {
      this.runtime.ensureInitialized();
      const repo = this.runtime.getRepository();
      const orch = this.runtime.getOrchestrator();
      const planner = this.runtime.getPlanner();
      this.controller = new PlanReviewController(repo, orch, planner);
    }
    return this.controller;
  }

  /**
   * Checks if a named command has a handler registered.
   */
  hasHandler(name: string): boolean {
    return (PlanReviewHandler.COMMANDS as readonly string[]).includes(name);
  }

  /**
   * Dispatches a command to its handler.
   */
  async handle(name: string, args: string[]): Promise<CommandHandlerResult> {
    if (!this.hasHandler(name)) {
      return this.valid({
        ok: false,
        command: name,
        result: `Unknown review command: ${name}`,
      });
    }

    switch (name) {
      case 'review':
        return this.handleReview(args);
      case 'feedback':
        return this.handleFeedback(args);
      case 'approve':
        return await this.handleApprove(args);
      case 'reject':
        return this.handleReject(args);
      case 'needs-changes':
        return this.handleNeedsChanges(args);
      case 'review-status':
        return this.handleReviewStatus(args);
      default:
        return this.valid({
          ok: false,
          command: name,
          result: `Unknown review command: ${name}`,
        });
    }
  }

  /**
   * review <task-id>: mostra visão de revisão do plano.
   */
  private handleReview(args: string[]): CommandHandlerResult {
    const taskId = args[0];
    if (!taskId) {
      return this.valid({
        ok: false,
        command: 'review',
        result: 'Missing task-id argument. Usage: review <task-id>',
      });
    }

    try {
      const controller = this.getController();
      const view = controller.buildReviewView(taskId);
      const markdown = this.renderer.render(view);

      return this.valid({
        ok: true,
        command: 'review',
        result: markdown,
        data: view,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return this.valid({
        ok: false,
        command: 'review',
        result: `Review failed: ${message}`,
      });
    }
  }

  /**
   * feedback <task-id> <text> [--answers=q1:answer1,q2:answer2]
   * Registra feedback textual e opcionalmente respostas a perguntas.
   */
  private handleFeedback(args: string[]): CommandHandlerResult {
    const taskId = args[0];
    if (!taskId) {
      return this.valid({
        ok: false,
        command: 'feedback',
        result: 'Missing task-id argument. Usage: feedback <task-id> <text> [--answers=q1:a1,q2:a2]',
      });
    }

    // Encontrar o texto de feedback (todos args exceto taskId e --answers)
    const restArgs = args.slice(1);
    const answersArg = restArgs.find(a => a.startsWith('--answers='));
    const feedbackParts = restArgs.filter(a => !a.startsWith('--answers='));

    const feedback = feedbackParts.join(' ').trim();
    if (!feedback) {
      return this.valid({
        ok: false,
        command: 'feedback',
        result: 'Missing feedback text. Usage: feedback <task-id> <text> [--answers=q1:a1]',
      });
    }

    // Parse answers se fornecidas
    const questionAnswers: Array<{ questionId: string; answer: string }> = [];
    if (answersArg) {
      const answersStr = answersArg.split('=')[1] ?? '';
      const pairs = answersStr.split(',').filter(p => p.includes(':'));
      for (const pair of pairs) {
        const [questionId, ...answerParts] = pair.split(':');
        const answer = answerParts.join(':').trim();
        if (questionId && answer) {
          questionAnswers.push({ questionId, answer });
        }
      }
    }

    try {
      const controller = this.getController();
      const result = controller.submitFeedback({
        taskId,
        feedback,
        questionAnswers: questionAnswers.length > 0 ? questionAnswers : undefined,
      });

      return this.valid({
        ok: true,
        command: 'feedback',
        result: `Feedback registered for task ${taskId}`,
        data: result,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return this.valid({
        ok: false,
        command: 'feedback',
        result: `Feedback failed: ${message}`,
      });
    }
  }

  /**
   * approve <task-id>: aprova o plano via Orchestrator.
   */
  private async handleApprove(args: string[]): Promise<CommandHandlerResult> {
    const taskId = args[0];
    if (!taskId) {
      return this.valid({
        ok: false,
        command: 'approve',
        result: 'Missing task-id argument. Usage: approve <task-id>',
      });
    }

    try {
      const controller = this.getController();
      const result = await controller.approvePlan({ taskId });

      return this.valid({
        ok: true,
        command: 'approve',
        result: `Plan ${taskId} approved`,
        data: result,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return this.valid({
        ok: false,
        command: 'approve',
        result: `Approve failed: ${message}`,
      });
    }
  }

  /**
   * reject <task-id> <reason>: rejeita o plano com motivo.
   */
  private handleReject(args: string[]): CommandHandlerResult {
    const taskId = args[0];
    if (!taskId) {
      return this.valid({
        ok: false,
        command: 'reject',
        result: 'Missing task-id argument. Usage: reject <task-id> <reason>',
      });
    }

    const reason = args.slice(1).join(' ').trim();
    if (!reason) {
      return this.valid({
        ok: false,
        command: 'reject',
        result: 'Missing rejection reason. Usage: reject <task-id> <reason>',
      });
    }

    try {
      const controller = this.getController();
      const result = controller.rejectPlan({ taskId, reason });

      return this.valid({
        ok: true,
        command: 'reject',
        result: `Plan ${taskId} rejected: ${reason}`,
        data: result,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return this.valid({
        ok: false,
        command: 'reject',
        result: `Reject failed: ${message}`,
      });
    }
  }

  /**
   * needs-changes <task-id> <reason>: solicita mudanças no plano.
   */
  private handleNeedsChanges(args: string[]): CommandHandlerResult {
    const taskId = args[0];
    if (!taskId) {
      return this.valid({
        ok: false,
        command: 'needs-changes',
        result: 'Missing task-id argument. Usage: needs-changes <task-id> <reason>',
      });
    }

    const reason = args.slice(1).join(' ').trim();
    if (!reason) {
      return this.valid({
        ok: false,
        command: 'needs-changes',
        result: 'Missing reason. Usage: needs-changes <task-id> <reason>',
      });
    }

    try {
      const controller = this.getController();
      const result = controller.requestChanges({ taskId, reason });

      return this.valid({
        ok: true,
        command: 'needs-changes',
        result: `Plan ${taskId} needs changes: ${reason}`,
        data: result,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return this.valid({
        ok: false,
        command: 'needs-changes',
        result: `Needs-changes failed: ${message}`,
      });
    }
  }

  /**
   * review-status <task-id>: consulta status de revisão.
   */
  private handleReviewStatus(args: string[]): CommandHandlerResult {
    const taskId = args[0];
    if (!taskId) {
      return this.valid({
        ok: false,
        command: 'review-status',
        result: 'Missing task-id argument. Usage: review-status <task-id>',
      });
    }

    try {
      const controller = this.getController();
      const result = controller.getReviewStatus(taskId);

      return this.valid({
        ok: true,
        command: 'review-status',
        result: `Review status for ${taskId}: ${result.reviewStatus}`,
        data: result,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return this.valid({
        ok: false,
        command: 'review-status',
        result: `Status query failed: ${message}`,
      });
    }
  }
}