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
      // Fase 24: detecção ampliada de conversa casual para evitar falsos positivos.
      const inputLower = prompt.toLowerCase();
      const chatPatterns = [
        'how are you', 'como vai', 'como estás', 'tudo bem', 'tudo bom',
        'hello', 'hi ', 'hey', 'olá', 'oi', 'e aí', 'e ai', 'bom dia',
        'boa tarde', 'boa noite', 'obrigado', 'obrigada', 'valeu', 'thanks',
        'thank you', 'qual é o seu nome', "what's your name", 'quem é você',
        'who are you', 'o que você faz', 'what do you do', 'como funciona',
        'me fale sobre', 'tell me about',
      ];
      if (chatPatterns.some(p => inputLower.includes(p))) {
        return JSON.stringify({ intention: 'NORMAL_CHAT', confidence: 0.95 });
      }
      return JSON.stringify({ intention: 'DEVELOPMENT_TASK', confidence: 0.95 });
    }

    // Plan generation prompts — return a valid plan JSON
    return this.defaultPlanResponse;
  }
}