import {
  HookSimulationInput,
  HookSimulationResult,
  HookSimulationInputSchema
} from './types.js';
import { QwenRouter } from '../../infrastructure/llm/QwenRouter.js';
import { LLMProvider } from '../../core/ports/LLMProvider.js';
import path from 'path';

  /**
   * Mock LLM Provider for controlled E2E testing.
   * Returns deterministic responses for classification and planning.
   */
  class MockLLMProvider implements LLMProvider {
    async generate(prompt: string): Promise<string> {
      if (prompt.includes('Classifique a intenção') || prompt.includes('classify')) {
        // Classify "How are you today?" as NORMAL_CHAT
        if (prompt.includes('How are you today') || prompt.includes('como vai') || prompt.includes('hello') || prompt.includes('hi ')) {
          return JSON.stringify({ intention: 'NORMAL_CHAT', confidence: 0.95 });
        }
        return JSON.stringify({ intention: 'DEVELOPMENT_TASK', confidence: 0.95 });
      }
      // Return a valid plan JSON for PlannerEngine
      return JSON.stringify({
        id: 'task-mock',
        title: 'Mock Plan',
        originalPrompt: 'Mock prompt',
        questions: [
          { id: 'q1', question: 'What framework?', required: true },
          { id: 'q2', question: 'What database?', required: true },
          { id: 'q3', question: 'Authentication method?', required: true },
          { id: 'q4', question: 'API design?', required: true },
          { id: 'q5', question: 'Testing strategy?', required: true }
        ],
        subtasksGraph: [
          { id: 'ST-01', title: 'Setup project', assignedAgent: 'CODER', dependsOn: [], status: 'PENDING', worktreePath: null, artifactOutput: null },
          { id: 'ST-02', title: 'Write tests', assignedAgent: 'TESTER', dependsOn: ['ST-01'], status: 'PENDING', worktreePath: null, artifactOutput: null },
          { id: 'ST-03', title: 'Review code', assignedAgent: 'REVIEWER', dependsOn: ['ST-02'], status: 'PENDING', worktreePath: null, artifactOutput: null }
        ],
        acceptanceCriteria: ['Tests pass', 'Code reviewed'],
        risks: ['Complexity'],
        createdAt: new Date().toISOString()
      });
    }
  }

export class HookSimulator {
  private router: QwenRouter;
  private manifestLoaded = false;
  private settingsLoaded = false;

  constructor() {
    const llm = new MockLLMProvider();
    this.router = new QwenRouter(llm);
    // In a real scenario would load from disk, but here we simulate validated state
    this.manifestLoaded = true;
    this.settingsLoaded = true;
  }

  async simulate(input: HookSimulationInput): Promise<HookSimulationResult> {
    const parsed = HookSimulationInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        event: input.event,
        action: 'BLOCK',
        reason: 'Invalid input schema'
      };
    }

    const { event, payload } = parsed.data;

    switch (event) {
      case 'SessionStart':
        return this.handleSessionStart();
      case 'UserPromptSubmit':
        return await this.handleUserPromptSubmit(payload);
      case 'PreToolUse':
        return this.handlePreToolUse(payload);
      case 'PostToolUse':
        return this.handlePostToolUse();
      case 'SessionEnd':
        return this.handleSessionEnd();
      default:
        return {
          ok: false,
          event,
          action: 'BLOCK',
          reason: 'Unknown event'
        };
    }
  }

  private handleSessionStart(): HookSimulationResult {
    if (!this.manifestLoaded || !this.settingsLoaded) {
      return { ok: false, event: 'SessionStart', action: 'BLOCK', reason: 'Manifest or settings missing' };
    }
    return { ok: true, event: 'SessionStart', action: 'ALLOW', reason: 'Session initialized safely' };
  }

  private async handleUserPromptSubmit(payload: Record<string, unknown>): Promise<HookSimulationResult> {
    const prompt = (payload.prompt as string) || '';
    
    // Use real QwenRouter to classify intent
    const intent = await this.router.classify(prompt);

    if (intent === 'NORMAL_CHAT') {
      return { ok: true, event: 'UserPromptSubmit', action: 'NOOP', reason: 'NORMAL_CHAT' };
    }

    return {
      ok: true,
      event: 'UserPromptSubmit',
      action: 'ALLOW',
      reason: 'DEVELOPMENT_TASK',
      metadata: { intent: 'DEVELOPMENT_TASK' }
    };
  }

  private handlePreToolUse(payload: Record<string, unknown>): HookSimulationResult {
    const tool = (payload.tool as string) || '';
    const targetPath = (payload.path as string) || '';
    const allowedRoot = (payload.allowedRoot as string) || (payload.worktreeRoot as string) || '';

    // Sensitive tools that modify filesystem
    const sensitiveTools = ['WriteFile', 'Edit', 'MultiEdit', 'Write', 'Bash'];

    if (sensitiveTools.includes(tool)) {
      // Require allowedRoot for sensitive operations
      if (!allowedRoot) {
        return { ok: true, event: 'PreToolUse', action: 'BLOCK', reason: 'Missing allowedRoot for sensitive operation' };
      }

      // Validate target path is inside allowedRoot using path.resolve + path.relative
      const resolvedTarget = path.resolve(allowedRoot, targetPath);
      const relative = path.relative(allowedRoot, resolvedTarget);
      const isInside = relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));

      if (!isInside) {
        return { ok: true, event: 'PreToolUse', action: 'BLOCK', reason: 'Write outside allowedRoot forbidden' };
      }
    }

    return { ok: true, event: 'PreToolUse', action: 'ALLOW', reason: 'Operation allowed inside worktree' };
  }

  private handlePostToolUse(): HookSimulationResult {
    return {
      ok: true,
      event: 'PostToolUse',
      action: 'ALLOW',
      reason: 'Checkpoint registered',
      metadata: { checkpoint: Date.now() }
    };
  }

  private handleSessionEnd(): HookSimulationResult {
    return { ok: true, event: 'SessionEnd', action: 'ALLOW', reason: 'Cleanup completed' };
  }
}