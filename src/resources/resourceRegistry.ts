/**
 * Resource Registry - Central access point for external resources
 * 
 * This module provides a centralized registry for accessing external resources
 * like AI services, databases, and external APIs.
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */

import { getEnv, getEnvAsFloat, getEnvAsInt } from '@/utils/configUtils';
import { Registry, type RegistryOptions, SimpleContainer } from '@/utils/registry';

import { ClaudeModel } from './ai/claude';
import { EmbeddingService } from './ai/embedding';
import type { EmbeddingModelAdapter, LanguageModelAdapter } from './ai/interfaces';

/**
 * ResourceRegistry configuration options
 */
export interface ResourceRegistryOptions extends RegistryOptions {
  /** Anthropic API key for Claude */
  anthropicApiKey?: string;
  /** OpenAI API key for embeddings */
  openAiApiKey?: string;
}

/**
 * Resource identifiers for consistent naming across the application
 */
export const ResourceIdentifiers = {
  // AI resource identifiers
  ClaudeModel: 'resource.ai.claude',
  EmbeddingService: 'resource.ai.embedding',
};

/**
 * Central registry for accessing external resources
 * 
 * This registry provides a single point of access for all external resources,
 * ensuring consistent initialization and configuration.
 */
export class ResourceRegistry extends Registry<ResourceRegistryOptions> {
  /** Singleton instance storage */
  private static instance: ResourceRegistry | null = null;
  
  /** Track if resources have been registered */
  private resourcesRegistered = false;
  
  /** Registry type for context-specific operations */
  protected readonly registryType = 'resource';
  
  /**
   * Get the singleton instance of the ResourceRegistry
   * 
   * @param options Configuration options
   * @returns The shared instance
   */
  public static override getInstance(options?: ResourceRegistryOptions): ResourceRegistry {
    if (!ResourceRegistry.instance) {
      ResourceRegistry.instance = new ResourceRegistry(options || {});
      ResourceRegistry.instance.logger.debug('ResourceRegistry singleton instance created');
      // Auto-initialize on getInstance
      ResourceRegistry.instance.initialize();
    } else if (options) {
      // Update options if instance exists but options were provided
      ResourceRegistry.instance.updateOptions(options);
    }
    
    return ResourceRegistry.instance;
  }
  
  /**
   * Reset the singleton instance (primarily for testing)
   * This clears the instance and any resources it holds
   */
  public static override resetInstance(): void {
    if (ResourceRegistry.instance) {
      ResourceRegistry.instance.clear();
      ResourceRegistry.instance = null;
    }
  }
  
  /**
   * Create a fresh instance (primarily for testing)
   * This creates a new instance without affecting the singleton
   * 
   * @param options Configuration options
   * @returns A new instance
   */
  public static override createFresh(options?: ResourceRegistryOptions): ResourceRegistry {
    const registry = new ResourceRegistry(options || {});
    registry.initialize();
    return registry;
  }
  
  /**
   * Protected constructor to enforce the use of getInstance() or createFresh()
   * 
   * @param options Configuration options
   */
  protected constructor(options: ResourceRegistryOptions) {
    super({
      name: 'ResourceRegistry',
      ...options,
    });
  }
  
  /**
   * Create the dependency container
   * 
   * @returns A new SimpleContainer
   */
  protected override createContainer(): SimpleContainer {
    return new SimpleContainer();
  }
  
  /**
   * Register standard resources with the registry
   * This is called automatically by initialize()
   */
  protected registerComponents(): void {
    if (this.resourcesRegistered) {
      return;
    }
    
    this.logger.info('Registering standard resources');
    
    // Register Claude model with validation
    this.registerResource(
      ResourceIdentifiers.ClaudeModel,
      () => {
        const anthropicApiKey = this.validateAnthropicApiKey(); // Validate Anthropic API key exists
        return ClaudeModel.getInstance({
          model: getEnv('ANTHROPIC_MODEL', 'claude-3-7-sonnet-20250219'),
          apiKey: anthropicApiKey,
          defaultMaxTokens: getEnvAsInt('ANTHROPIC_MAX_TOKENS', 1000),
          defaultTemperature: getEnvAsFloat('ANTHROPIC_TEMPERATURE', 0.0),
        });
      },
    );
    
    // Register embedding service with validation
    this.registerResource(
      ResourceIdentifiers.EmbeddingService,
      () => {
        const openAiApiKey = this.validateOpenAiApiKey(); // Validate OpenAI API key exists
        return EmbeddingService.getInstance({
          apiKey: openAiApiKey,
          embeddingModel: getEnv('OPENAI_EMBEDDING_MODEL', 'text-embedding-3-small'),
          embeddingDimension: getEnvAsInt('OPENAI_EMBEDDING_DIMENSION', 1536),
        });
      },
    );
    
    this.resourcesRegistered = true;
    this.logger.info('Standard resources registered');
  }
  
  /**
   * Standardized resource registration helper
   * 
   * @param id Resource identifier
   * @param factory Factory function to create the resource
   * @param dependencies Optional array of dependency identifiers
   */
  private registerResource<T>(
    id: string,
    factory: () => T,
    dependencies: string[] = [],
  ): void {
    // Validate dependencies before registration
    for (const dependencyId of dependencies) {
      this.validateDependency(id, dependencyId);
    }
    
    this.register(id, () => factory());
  }
  
  /**
   * Validate and retrieve Anthropic API key
   * 
   * @returns The validated Anthropic API key
   * @throws Error if API key is missing
   */
  protected validateAnthropicApiKey(): string {
    const anthropicApiKey = this.options.anthropicApiKey || getEnv('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      const error = new Error('ANTHROPIC API key is required but not provided');
      this.logger.error('Missing Anthropic API key', { error });
      throw error;
    }
    
    return anthropicApiKey;
  }
  
  /**
   * Validate and retrieve OpenAI API key
   * 
   * @returns The validated OpenAI API key
   * @throws Error if API key is missing
   */
  protected validateOpenAiApiKey(): string {
    const openAiApiKey = this.options.openAiApiKey || getEnv('OPENAI_API_KEY');
    if (!openAiApiKey) {
      const error = new Error('OPENAI API key is required but not provided');
      this.logger.error('Missing OpenAI API key', { error });
      throw error;
    }
    
    return openAiApiKey;
  }
  
  /**
   * Get the Claude language model adapter
   * 
   * @returns The Claude model adapter
   */
  public getClaudeModel(): LanguageModelAdapter {
    return this.resolve<LanguageModelAdapter>(ResourceIdentifiers.ClaudeModel);
  }
  
  /**
   * Get the embedding service adapter
   * 
   * @returns The embedding model adapter
   */
  public getEmbeddingService(): EmbeddingModelAdapter {
    return this.resolve<EmbeddingModelAdapter>(ResourceIdentifiers.EmbeddingService);
  }
  
  /**
   * Get a resource by its identifier with proper typing
   * 
   * @param resourceId Resource identifier
   * @returns The resource instance
   */
  public getResource<T>(resourceId: string): T {
    return this.resolve<T>(resourceId);
  }
}