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
  
  /**
   * Get the singleton instance of the ResourceRegistry
   * 
   * @param options Configuration options
   * @returns The shared instance
   */
  public static getInstance(options?: ResourceRegistryOptions): ResourceRegistry {
    if (!ResourceRegistry.instance) {
      ResourceRegistry.instance = new ResourceRegistry(options || {});
      ResourceRegistry.instance.logger.debug('ResourceRegistry singleton instance created');
      ResourceRegistry.instance.registerStandardResources();
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
  public static resetInstance(): void {
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
  public static createFresh(options?: ResourceRegistryOptions): ResourceRegistry {
    const registry = new ResourceRegistry(options || {});
    registry.registerStandardResources();
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
   * This is called automatically by getInstance() and createFresh()
   */
  private registerStandardResources(): void {
    if (this.resourcesRegistered) {
      return;
    }
    
    this.logger.info('Registering standard resources');
    
    // Register Claude model
    this.register(
      ResourceIdentifiers.ClaudeModel,
      () => {
        const apiKey = this.options.anthropicApiKey || process.env['ANTHROPIC_API_KEY'];
        if (!apiKey) {
          throw new Error('Anthropic API key is required to use Claude');
        }
        return ClaudeModel.getInstance();
      },
    );
    
    // Register embedding service
    this.register(
      ResourceIdentifiers.EmbeddingService,
      () => {
        const apiKey = this.options.openAiApiKey || process.env['OPENAI_API_KEY'];
        if (!apiKey) {
          throw new Error('OpenAI API key is required to use embeddings');
        }
        return EmbeddingService.getInstance();
      },
    );
    
    this.resourcesRegistered = true;
    this.logger.info('Standard resources registered');
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