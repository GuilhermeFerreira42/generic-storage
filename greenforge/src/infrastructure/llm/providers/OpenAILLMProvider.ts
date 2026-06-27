import { LLMProvider } from '../../../core/ports/LLMProvider.js';
import { LLMProviderConfig, LLMTransport, LLMProviderError } from '../LLMProviderConfig.js';

/**
 * OpenAILLMProvider — safe stub for OpenAI API.
 *
 * Implements LLMProvider but:
 * - Does NOT make network calls without an injected transport.
 * - Does NOT require API keys in tests.
 * - Returns a structured error when called without transport/credentials.
 *
 * Real network integration is deferred to a future phase.
 */
export class OpenAILLMProvider implements LLMProvider {
  private readonly config: LLMProviderConfig;
  private readonly transport: LLMTransport | null;

  constructor(config: LLMProviderConfig, transport?: LLMTransport) {
    this.config = config;
    this.transport = transport ?? null;
  }

  async generate(prompt: string): Promise<string> {
    // mockMode: delegate to mock behavior
    if (this.config.mockMode) {
      return this.mockGenerate(prompt);
    }

    // No transport configured — cannot make real calls
    if (!this.transport) {
      throw new LLMProviderError(
        'NO_TRANSPORT',
        `OpenAILLMProvider: No transport configured. Cannot make real API calls without an injected transport. Provider: openai, Model: ${this.config.model ?? 'default'}`,
        'openai',
        false,
      );
    }

    // No API key env configured — cannot authenticate
    if (!this.config.apiKeyEnv) {
      throw new LLMProviderError(
        'NO_API_KEY_CONFIG',
        'OpenAILLMProvider: No apiKeyEnv configured. Cannot authenticate without an API key environment variable name.',
        'openai',
        false,
      );
    }

    // Resolve API key from environment
    const apiKey = process.env[this.config.apiKeyEnv];
    if (!apiKey) {
      throw new LLMProviderError(
        'NO_API_KEY',
        `OpenAILLMProvider: Environment variable ${this.config.apiKeyEnv} is not set. Cannot authenticate.`,
        'openai',
        false,
      );
    }

    // If we have transport + API key, we could make a real call.
    const baseUrl = this.config.baseUrl || 'https://api.openai.com/v1/chat/completions';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };

    const body = JSON.stringify({
      model: this.config.model ?? 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
    });

    const response = await this.transport.post(baseUrl, headers, body);

    if (response.status !== 200) {
      throw new LLMProviderError(
        'API_ERROR',
        `OpenAILLMProvider: API returned status ${response.status}`,
        'openai',
        response.status >= 500,
      );
    }

    return response.body;
  }

  private async mockGenerate(prompt: string): Promise<string> {
    if (prompt.includes('Classifique a intenção') || prompt.includes('classify')) {
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

    return JSON.stringify({
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
        { id: 'ST-01', title: 'Setup project', assignedAgent: 'CODER', dependsOn: [], status: 'PENDING', worktreePath: null, artifactOutput: null },
        { id: 'ST-02', title: 'Write tests', assignedAgent: 'TESTER', dependsOn: ['ST-01'], status: 'PENDING', worktreePath: null, artifactOutput: null },
        { id: 'ST-03', title: 'Review code', assignedAgent: 'REVIEWER', dependsOn: ['ST-02'], status: 'PENDING', worktreePath: null, artifactOutput: null },
      ],
      acceptanceCriteria: ['Tests pass', 'Code reviewed'],
      risks: ['Complexity'],
      createdAt: new Date().toISOString(),
    });
  }
}