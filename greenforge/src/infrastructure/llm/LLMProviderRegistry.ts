import { LLMProvider } from '../../core/ports/LLMProvider.js';
import { LLMProviderName, LLMProviderConfig, LLMTransport } from './LLMProviderConfig.js';
import { MockLLMProvider } from './providers/MockLLMProvider.js';
import { QwenLLMProvider } from './providers/QwenLLMProvider.js';
import { OpenAILLMProvider } from './providers/OpenAILLMProvider.js';
import { ClaudeLLMProvider } from './providers/ClaudeLLMProvider.js';
import { GeminiLLMProvider } from './providers/GeminiLLMProvider.js';
import { LiteLLMProvider } from './providers/LiteLLMProvider.js';

/**
 * Registry of LLM provider constructors.
 *
 * Maps provider names to their constructor functions.
 * Supports registration of custom providers.
 */
export class LLMProviderRegistry {
  private readonly constructors: Map<
    LLMProviderName,
    (config: LLMProviderConfig, transport?: LLMTransport) => LLMProvider
  > = new Map();

  constructor() {
    // Register built-in providers
    this.constructors.set('mock', () => new MockLLMProvider());
    this.constructors.set('qwen', (config, transport) => new QwenLLMProvider(config, transport));
    this.constructors.set('openai', (config, transport) => new OpenAILLMProvider(config, transport));
    this.constructors.set('claude', (config, transport) => new ClaudeLLMProvider(config, transport));
    this.constructors.set('gemini', (config, transport) => new GeminiLLMProvider(config, transport));
    this.constructors.set('litellm', (config, transport) => new LiteLLMProvider(config, transport));
  }

  /**
   * Check if a provider name is registered.
   */
  has(name: LLMProviderName): boolean {
    return this.constructors.has(name);
  }

  /**
   * Create a provider instance by name.
   * @throws Error if the provider name is not registered.
   */
  create(config: LLMProviderConfig, transport?: LLMTransport): LLMProvider {
    const ctor = this.constructors.get(config.provider);
    if (!ctor) {
      throw new Error(`LLMProviderRegistry: Unknown provider "${config.provider}". Registered providers: ${this.getRegisteredNames().join(', ')}`);
    }
    return ctor(config, transport);
  }

  /**
   * Register a custom provider constructor.
   */
  register(
    name: LLMProviderName,
    ctor: (config: LLMProviderConfig, transport?: LLMTransport) => LLMProvider,
  ): void {
    this.constructors.set(name, ctor);
  }

  /**
   * Get all registered provider names.
   */
  getRegisteredNames(): LLMProviderName[] {
    return Array.from(this.constructors.keys());
  }

  /**
   * Default singleton instance.
   */
  static readonly default = new LLMProviderRegistry();
}