/**
 * Resource Registry - Central access point for external resources
 * 
 * This module provides a centralized registry for accessing external resources
 * like AI services, databases, and external APIs.
 * 
 * @deprecated Use UnifiedServiceRegistry from @/utils/unifiedServiceRegistry instead.
 * This module is kept for backward compatibility during the transition period.
 */

import { UnifiedServiceRegistry, ServiceIdentifiers } from '@/utils/unifiedServiceRegistry';
import { ClaudeModel } from './ai/claude';
import { EmbeddingService } from './ai/embedding';
import type { EmbeddingModelAdapter, LanguageModelAdapter } from './ai/interfaces';

/**
 * ResourceRegistry configuration options
 */
export interface ResourceRegistryOptions {
  /** Anthropic API key for Claude */
  anthropicApiKey?: string;
  /** OpenAI API key for embeddings */
  openAiApiKey?: string;
}

/**
 * Central registry for accessing external resources
 * 
 * This registry provides a single point of access for all external resources,
 * ensuring consistent initialization and configuration.
 * 
 * @deprecated Use UnifiedServiceRegistry from @/utils/unifiedServiceRegistry instead
 */
export class ResourceRegistry {
  private static instance: ResourceRegistry | null = null;
  
  // AI resources
  private claudeModel: ClaudeModel | null = null;
  private embeddingService: EmbeddingService | null = null;
  
  // Configuration
  private options: ResourceRegistryOptions;
  
  // Reference to unified registry for transitional period
  private unifiedRegistry: UnifiedServiceRegistry;
  
  private constructor(options: ResourceRegistryOptions = {}) {
    this.options = options;
    this.unifiedRegistry = UnifiedServiceRegistry.getInstance({
      apiKey: options.anthropicApiKey || options.openAiApiKey,
    });
  }
  
  /**
   * Get the singleton instance of the ResourceRegistry
   * 
   * @param options Configuration options
   * @returns The shared instance
   */
  public static getInstance(options?: ResourceRegistryOptions): ResourceRegistry {
    if (!ResourceRegistry.instance) {
      ResourceRegistry.instance = new ResourceRegistry(options);
    }
    return ResourceRegistry.instance;
  }
  
  /**
   * Reset the singleton instance (primarily for testing)
   * This clears the instance and any resources it holds
   */
  public static resetInstance(): void {
    ResourceRegistry.instance = null;
  }
  
  /**
   * Create a fresh instance (primarily for testing)
   * This creates a new instance without affecting the singleton
   * 
   * @param options Configuration options
   * @returns A new instance
   */
  public static createFresh(options?: ResourceRegistryOptions): ResourceRegistry {
    return new ResourceRegistry(options);
  }
  
  /**
   * Get the Claude language model adapter
   * 
   * @returns The Claude model adapter
   */
  public getClaudeModel(): LanguageModelAdapter {
    if (!this.claudeModel) {
      if (!this.options.anthropicApiKey && !process.env['ANTHROPIC_API_KEY']) {
        throw new Error('Anthropic API key is required to use Claude');
      }
      
      // Try to get from unified registry first
      try {
        if (this.unifiedRegistry.has(ServiceIdentifiers.ClaudeModel)) {
          this.claudeModel = this.unifiedRegistry.resolve<ClaudeModel>(ServiceIdentifiers.ClaudeModel);
        } else {
          // Fall back to direct instantiation
          this.claudeModel = ClaudeModel.getInstance();
          
          // Register with unified registry for future use
          this.unifiedRegistry.register(
            ServiceIdentifiers.ClaudeModel,
            () => this.claudeModel as ClaudeModel
          );
        }
      } catch (e) {
        // Fall back to direct instantiation
        this.claudeModel = ClaudeModel.getInstance();
      }
    }
    return this.claudeModel;
  }
  
  /**
   * Get the embedding service adapter
   * 
   * @returns The embedding model adapter
   */
  public getEmbeddingService(): EmbeddingModelAdapter {
    if (!this.embeddingService) {
      if (!this.options.openAiApiKey && !process.env['OPENAI_API_KEY']) {
        throw new Error('OpenAI API key is required to use embeddings');
      }
      
      // Try to get from unified registry first
      try {
        if (this.unifiedRegistry.has(ServiceIdentifiers.EmbeddingService)) {
          this.embeddingService = this.unifiedRegistry.resolve<EmbeddingService>(ServiceIdentifiers.EmbeddingService);
        } else {
          // Fall back to direct instantiation
          this.embeddingService = EmbeddingService.getInstance();
          
          // Register with unified registry for future use
          this.unifiedRegistry.register(
            ServiceIdentifiers.EmbeddingService,
            () => this.embeddingService as EmbeddingService
          );
        }
      } catch (e) {
        // Fall back to direct instantiation
        this.embeddingService = EmbeddingService.getInstance();
      }
    }
    return this.embeddingService;
  }
  
  /**
   * Update configuration options
   * 
   * @param options New configuration options
   */
  public updateOptions(options: Partial<ResourceRegistryOptions>): void {
    this.options = { ...this.options, ...options };
    
    // Update unified registry options as well
    this.unifiedRegistry.updateOptions({
      apiKey: this.options.anthropicApiKey || this.options.openAiApiKey,
    });
  }
}