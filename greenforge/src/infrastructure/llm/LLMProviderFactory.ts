import { LLMProvider } from '../../core/ports/LLMProvider.js';
import {
  LLMProviderName,
  LLMProviderConfig,
  LLMProviderConfigSchema,
  LLMProviderFactoryOptions,
  LLMProviderFactoryOptionsSchema,
  LLMTransport,
  LLMProviderError,
} from './LLMProviderConfig.js';
import { LLMProviderRegistry } from './LLMProviderRegistry.js';

/**
 * LLMProviderFactory — creates LLMProvider instances from configuration.
 *
 * Features:
 * - Validates configuration via Zod schemas.
 * - Supports fallback to a safe provider when the requested one is unavailable.
 * - Falls back to 'mock' for unknown providers (configurable).
 * - Uses LLMProviderRegistry for provider instantiation.
 */
export class LLMProviderFactory {
  private readonly registry: LLMProviderRegistry;

  constructor(registry?: LLMProviderRegistry) {
    this.registry = registry ?? LLMProviderRegistry.default;
  }

  /**
   * Create an LLMProvider from factory options.
   *
   * @param options - Factory options including config and fallback settings.
   * @param transport - Optional transport for real providers.
   * @returns An LLMProvider instance.
   */
  create(options: LLMProviderFactoryOptions, transport?: LLMTransport): LLMProvider {
    // First validate the factory options structure
    const parsed = LLMProviderFactoryOptionsSchema.parse(options);
    const { config, fallbackProvider, fallbackOnUnknown } = parsed;

    // Check if the provider name is known BEFORE full config validation
    // This allows fallback to work for unknown providers
    const providerName = config.provider as LLMProviderName;

    if (!this.registry.has(providerName)) {
      if (fallbackOnUnknown) {
        const fallback = fallbackProvider ?? 'mock';
        const fallbackConfig: LLMProviderConfig = { ...config, provider: fallback };
        // Validate the fallback config
        const validatedFallbackConfig = LLMProviderConfigSchema.parse(fallbackConfig);
        this.assertNotRealTransportDuringTests(validatedFallbackConfig, transport);
        return this.registry.create(validatedFallbackConfig, transport);
      }
      throw new Error(
        `LLMProviderFactory: Unknown provider "${providerName}" and fallback is disabled. ` +
        `Registered providers: ${this.registry.getRegisteredNames().join(', ')}`,
      );
    }

    // Validate the full config for known providers
    const validatedConfig = LLMProviderConfigSchema.parse(config);
    this.assertNotRealTransportDuringTests(validatedConfig, transport);
    return this.registry.create(validatedConfig, transport);
  }

  /**
   * Create a provider directly from a config object.
   * Convenience method that wraps config in factory options.
   */
  createFromConfig(config: LLMProviderConfig, transport?: LLMTransport): LLMProvider {
    return this.create({ config, fallbackOnUnknown: true }, transport);
  }

  /**
   * Prevent accidental real network transport usage from the factory while tests run.
   */
  private assertNotRealTransportDuringTests(config: LLMProviderConfig, transport?: LLMTransport): void {
    if (
      process.env.NODE_ENV === 'test' &&
      config.provider !== 'mock' &&
      config.mockMode !== true &&
      Boolean(transport)
    ) {
      throw new LLMProviderError(
        'TEST_HARD_BLOCK',
        `LLMProviderFactory: real transport for provider "${config.provider}" is blocked when NODE_ENV is test. Use mockMode or MockLLMProvider.`,
        config.provider,
        false,
      );
    }
  }

  /**
   * Create a mock provider for testing.
   * Always returns a MockLLMProvider regardless of config.
   */
  createMock(): LLMProvider {
    return this.registry.create({ provider: 'mock' });
  }

  /**
   * Get the underlying registry.
   */
  getRegistry(): LLMProviderRegistry {
    return this.registry;
  }

  /**
   * Default singleton instance.
   */
  static readonly default = new LLMProviderFactory();
}