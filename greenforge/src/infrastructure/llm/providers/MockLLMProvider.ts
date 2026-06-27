import { LLMProvider } from '../../../core/ports/LLMProvider.js';

/**
 * MockLLMProvider — deterministic mock for automated tests.
 *
 * Returns predictable responses based on prompt content.
 * Never makes network calls. Never requires API keys.
 *
 * This is the default provider used in all automated tests.
 */
export class MockLLMProvider implements LLMProvider {
  private readonly defaultPlanResponse: string;

  constructor() {
    this.defaultPlanResponse = JSON.stringify({
      id: 'task-mock',
      title: 'Mock Plan',
      originalPrompt: 'Mock prompt',
      questions: [
        { id: 'q1', question: 'What framework?', required: true },
        { id: 'q2', question: 'What database?', required: true },
        { id: 'q3', question: 'Authentication method?', required: true },
        { id: 'q4', question: 'API design?', required: true },
        { id: 'q5', question: 'Testing strategy?', required: true },
      ],
      subtasksGraph: [
        {
          id: 'ST-01',
          title: 'Setup project',
          assignedAgent: 'CODER',
          dependsOn: [],
          status: 'PENDING',
          worktreePath: null,
          artifactOutput: null,
        },
        {
          id: 'ST-02',
          title: 'Write tests',
          assignedAgent: 'TESTER',
          dependsOn: ['ST-01'],
          status: 'PENDING',
          worktreePath: null,
          artifactOutput: null,
        },
        {
          id: 'ST-03',
          title: 'Review code',
          assignedAgent: 'REVIEWER',
          dependsOn: ['ST-02'],
          status: 'PENDING',
          worktreePath: null,
          artifactOutput: null,
        },
      ],
      acceptanceCriteria: ['Tests pass', 'Code reviewed'],
      risks: ['Complexity'],
      createdAt: new Date().toISOString(),
    });
  }

  async generate(prompt: string): Promise<string> {
    // Classification prompts
    if (prompt.includes('Classifique a intenção') || prompt.includes('classify')) {
      // NORMAL_CHAT triggers
      if (
        prompt.includes('How are you') ||
        prompt.includes('como vai') ||
        prompt.includes('hello') ||
        prompt.includes('hi ')
      ) {
        return JSON.stringify({ intention: 'NORMAL_CHAT', confidence: 0.95 });
      }
      return JSON.stringify({ intention: 'DEVELOPMENT_TASK', confidence: 0.95 });
    }

    // Plan generation prompts — return a valid plan JSON
    return this.defaultPlanResponse;
  }
}