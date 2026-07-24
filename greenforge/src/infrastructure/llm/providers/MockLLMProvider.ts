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
    if (prompt.includes('Classifique a intenção') || prompt.includes('classify')) {
      // Extract user input from classification prompt if formatted like Input: "..."
      const matchInput = prompt.match(/Input:\s*"([^"]+)"/i);
      const userPrompt = matchInput ? matchInput[1].toLowerCase() : prompt.toLowerCase();

      const chatPatterns = [
        /\bhow are you\b/i, /\bcomo vai\b/i, /\bcomo estás\b/i, /\btudo bem\b/i, /\btudo bom\b/i,
        /\bhello\b/i, /\bhi\b/i, /\bhey\b/i, /\bolá\b/i, /\boi\b/i, /\be aí\b/i, /\be ai\b/i, /\bbom dia\b/i,
        /\bboa tarde\b/i, /\bboa noite\b/i, /\bobrigado\b/i, /\bobrigada\b/i, /\bvaleu\b/i, /\bthanks\b/i,
        /\bthank you\b/i, /\bqual é o seu nome\b/i, /\bwhat's your name\b/i, /\bquem é você\b/i,
        /\bwho are you\b/i, /\bo que você faz\b/i, /\bwhat do you do\b/i, /\bcomo funciona\b/i,
        /\bme fale sobre\b/i, /\btell me about\b/i,
      ];
      if (chatPatterns.some(pattern => pattern.test(userPrompt))) {
        return JSON.stringify({ intention: 'NORMAL_CHAT', confidence: 0.95 });
      }
      return JSON.stringify({ intention: 'DEVELOPMENT_TASK', confidence: 0.95 });
    }

    // Plan generation prompts — return a valid plan JSON
    return this.defaultPlanResponse;
  }
}