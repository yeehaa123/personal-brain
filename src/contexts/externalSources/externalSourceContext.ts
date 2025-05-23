/**
 * ExternalSourceContext implementation using the BaseContext architecture
 * 
 * This version extends BaseContext to ensure consistent behavior
 * with other context implementations.
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance 
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 * 
 * Uses the Dependency Injection pattern to improve testability and reduce coupling.
 */

import { BaseContext } from '@/contexts/baseContext';
import type {
  ContextInterface,
} from '@/contexts/contextInterface';
import type { FormattingOptions } from '@/contexts/formatterInterface';
// Importing from core interfaces
import { EmbeddingService } from '@/resources/ai/embedding';
import { Logger } from '@/utils/logger';
import { Registry } from '@/utils/registry';

import {
  ExternalSourceStorageAdapter,
  type ExternalSourceStorageConfig,
} from './externalSourceStorageAdapter';
import { ExternalSourceFormatter } from './formatters';
import type {
  ExternalSearchOptions,
  ExternalSourceInterface,
  ExternalSourceResult,
} from './sources';
import { ExternalSourceToolService } from './tools';

/**
 * Configuration for the ExternalSourceContext
 */
export interface ExternalSourceContextConfig extends ExternalSourceStorageConfig {
  /**
   * Name for the context (defaults to 'ExternalBrain')
   */
  name?: string;

  /**
   * Version for the context (defaults to '1.0.0')
   */
  version?: string;
}

/**
 * Dependencies for ExternalSourceContext
 */
export interface ExternalSourceContextDependencies {
  /** Storage adapter instance */
  storage?: ExternalSourceStorageAdapter;
  /** Formatter instance */
  formatter?: ExternalSourceFormatter;
  /** Embedding service instance */
  embeddingService?: EmbeddingService;
}

/**
 * Context for working with external knowledge sources
 * 
 * Acts as a facade for external source operations, coordinating between
 * sources, embedding service, and MCP components.
 * 
 * Implements FullContextInterface to provide standardized access methods
 * for storage, formatting, and service dependencies.
 */
export class ExternalSourceContext extends BaseContext<
  ExternalSourceStorageAdapter,
  ExternalSourceFormatter,
  ExternalSourceResult[],
  string
> implements ContextInterface<
  ExternalSourceStorageAdapter,
  ExternalSourceFormatter,
  ExternalSourceResult[],
  string
> {
  /** Logger instance - overrides the protected one from BaseContext */
  protected override logger = Logger.getInstance();

  // Singleton instance
  private static instance: ExternalSourceContext | null = null;

  /**
   * Get singleton instance of ExternalSourceContext 
   * 
   * @param options Configuration options (only used when creating a new instance)
   * @returns The singleton instance
   */
  static override getInstance(options: ExternalSourceContextConfig = {}): ExternalSourceContext {
    if (!ExternalSourceContext.instance) {
      ExternalSourceContext.instance = ExternalSourceContext.createFresh(options);

      const logger = Logger.getInstance();
      logger.debug('ExternalSourceContext singleton instance created');
    } else if (Object.keys(options).length > 0) {
      // Log at debug level if trying to get instance with different config
      const logger = Logger.getInstance();
      logger.debug('getInstance called with config but instance already exists. Config ignored.');
    }

    return ExternalSourceContext.instance;
  }

  /**
   * Reset the singleton instance (primarily for testing)
   * This clears the instance and any resources it holds
   */
  static override resetInstance(): void {
    if (ExternalSourceContext.instance) {
      // Any cleanup needed before destroying the instance
      const logger = Logger.getInstance();
      logger.debug('ExternalSourceContext singleton instance reset');

      ExternalSourceContext.instance = null;
    }
  }

  /**
   * Create a fresh instance (primarily for testing)
   * This creates a new instance without affecting the singleton
   * 
   * @param config Configuration options
   * @param dependencies Optional dependencies
   * @returns A new ExternalSourceContext instance
   */
  static override createFresh(
    config: ExternalSourceContextConfig = {},
    dependencies?: ExternalSourceContextDependencies,
  ): ExternalSourceContext {
    const logger = Logger.getInstance();
    logger.debug('Creating fresh ExternalSourceContext instance');

    // Handle the dependencies if provided
    if (dependencies) {
      // Create and return context with explicit dependencies
      return new ExternalSourceContext(
        config,
        dependencies.storage || ExternalSourceStorageAdapter.getInstance(),
        dependencies.embeddingService || EmbeddingService.getInstance(),
        dependencies.formatter || ExternalSourceFormatter.getInstance(),
      );
    }

    // Create instances of required dependencies with explicit dependency injection
    // Following Component Interface Standardization pattern - no params to getInstance
    const embeddingService = EmbeddingService.getInstance();

    // Create storage adapter
    const storageAdapter = ExternalSourceStorageAdapter.getInstance({
      apiKey: config.apiKey,
      newsApiKey: config.newsApiKey,
      enabledSources: config.enabledSources,
      maxResults: config.maxResults,
      cacheTtl: config.cacheTtl,
    });

    // Create formatter
    const formatter = ExternalSourceFormatter.getInstance();

    // Create and return context with explicit dependencies
    return new ExternalSourceContext(
      config,
      storageAdapter,
      embeddingService,
      formatter,
    );
  }

  /**
   * Constructor for ExternalSourceContext
   * 
   * Note: When not testing, prefer using getInstance() or createFresh() factory methods
   * @param config Configuration for the context
   * @param storage External source storage adapter
   * @param embeddingService Service for generating and comparing embeddings
   */
  /**
   * Private reference to formatter instance
   */
  private formatter: ExternalSourceFormatter;

  /**
   * Constructor for ExternalSourceContext
   * 
   * Note: When not testing, prefer using getInstance() or createFresh() factory methods
   * @param config Configuration for the context
   * @param storage External source storage adapter
   * @param embeddingService Service for generating and comparing embeddings
   * @param formatter Formatter for external source results
   */
  constructor(
    config: ExternalSourceContextConfig = {},
    private readonly storage: ExternalSourceStorageAdapter,
    private readonly embeddingService: EmbeddingService,
    formatter?: ExternalSourceFormatter,
  ) {
    super(config as Record<string, unknown>);
    this.formatter = formatter || ExternalSourceFormatter.getInstance();
    this.logger.debug('ExternalSourceContext initialized with BaseContext architecture', { context: 'ExternalSourceContext' });
  }

  /**
   * Get the context name
   * @returns The name of this context
   */
  override getContextName(): string {
    return (this.config['name'] as string) || 'ExternalBrain';
  }

  /**
   * Get the context version
   * @returns The version of this context
   */
  override getContextVersion(): string {
    return (this.config['version'] as string) || '1.0.0';
  }

  /**
   * Initialize MCP components
   */
  protected override initializeMcpComponents(): void {
    // Get the tool service instance
    const toolService = ExternalSourceToolService.getInstance();

    // Register external resources
    this.resources.push({
      protocol: 'external',
      path: 'search',
      handler: async (_params, query) => {
        try {
          const q = query ? query['query'] as string : '';

          if (!q) {
            return {
              contents: [{
                uri: 'external://search',
                text: 'Error: No search query provided',
              }],
            };
          }

          const limit = query && query['limit'] ? Number(query['limit']) : 5;
          const semantic = query && query['semantic'] ? String(query['semantic']) === 'true' : true;

          const results = semantic
            ? await this.semanticSearch(q, limit)
            : await this.search(q, { limit });

          return {
            contents: results.map(result => ({
              uri: `external://${result.sourceType}/${encodeURIComponent(result.title)}`,
              text: `# ${result.title}\n\n${result.content}`,
              metadata: {
                source: result.source,
                sourceType: result.sourceType,
                url: result.url,
                timestamp: result.timestamp,
              },
            })),
          };
        } catch (error) {
          this.logger.error('Error in external search resource', { error, context: 'ExternalSourceContext' });
          return {
            contents: [{
              uri: 'external://search',
              text: `Error searching external sources: ${error instanceof Error ? error.message : String(error)}`,
            }],
          };
        }
      },
      name: 'External Search',
      description: 'Search external knowledge sources',
    });

    // Resource to get external source availability
    this.resources.push({
      protocol: 'external',
      path: 'sources',
      handler: async () => {
        try {
          const availability = await this.checkSourcesAvailability();

          const sourcesList = Object.entries(availability).map(([name, isAvailable]) => {
            return `- ${name}: ${isAvailable ? '✅ Available' : '❌ Unavailable'}`;
          }).join('\n');

          return {
            contents: [{
              uri: 'external://sources',
              text: `# External Knowledge Sources\n\n${sourcesList}`,
              metadata: {
                sources: Object.keys(availability),
                availability,
              },
            }],
          };
        } catch (error) {
          this.logger.error('Error in external sources resource', { error, context: 'ExternalSourceContext' });
          return {
            contents: [{
              uri: 'external://sources',
              text: `Error retrieving external sources: ${error instanceof Error ? error.message : String(error)}`,
            }],
          };
        }
      },
      name: 'External Sources',
      description: 'List available external knowledge sources',
    });

    // Register external source tools using the tool service
    this.tools = toolService.getTools(this);
  }

  // Public API methods

  /**
   * Search external sources for information
   * @param query The search query
   * @param options Search options
   * @returns Promise that resolves to an array of results
   */
  async search(
    query: string,
    options: Partial<ExternalSearchOptions> = {},
  ): Promise<ExternalSourceResult[]> {
    return this.storage.search({
      query,
      limit: options.limit,
      addEmbeddings: options.addEmbeddings,
    });
  }

  /**
   * Search external sources using semantic search with embeddings
   * @param query The search query
   * @param limit Maximum number of results to return
   * @returns Promise that resolves to an array of semantically relevant results
   */
  async semanticSearch(query: string, limit: number = 5): Promise<ExternalSourceResult[]> {
    try {
      // First get results from external sources with embeddings
      const results = await this.search(query, { addEmbeddings: true });

      // Filter out results without embeddings
      const resultsWithEmbeddings = results.filter(result => result.embedding);

      if (resultsWithEmbeddings.length === 0) {
        this.logger.warn('No external results with embeddings found', { context: 'ExternalSourceContext' });
        return results.slice(0, limit); // Return basic results instead
      }

      // Generate embedding for the query
      const queryEmbedding = await this.embeddingService.getEmbedding(query);

      // Calculate similarity scores
      const scoredResults = resultsWithEmbeddings.map(result => {
        if (!result.embedding) return { ...result, similarityScore: 0 };

        const similarity = this.embeddingService.calculateSimilarity(
          queryEmbedding,
          result.embedding,
        );

        return {
          ...result,
          similarityScore: similarity,
        };
      });

      // Sort by similarity and limit
      const sortedResults = scoredResults
        .sort((a, b) => (b.similarityScore || 0) - (a.similarityScore || 0))
        .slice(0, limit);

      // Remove the similarity score property before returning
      return sortedResults.map(({ similarityScore: _score, ...result }) => result);
    } catch (error) {
      this.logger.error('Error in semantic search for external sources', { error, context: 'ExternalSourceContext' });
      // Fall back to regular search
      return this.search(query, { limit });
    }
  }

  /**
   * Check availability of all sources
   * @returns Record mapping source names to availability status
   */
  async checkSourcesAvailability(): Promise<Record<string, boolean>> {
    return this.storage.checkSourcesAvailability();
  }

  /**
   * Get the storage adapter
   * @returns The storage interface for external sources
   */
  override getStorage(): ExternalSourceStorageAdapter {
    return this.storage;
  }

  /**
   * Get the formatter implementation
   * @returns The formatter for external source results
   */
  override getFormatter(): ExternalSourceFormatter {
    return this.formatter;
  }

  /**
   * Format external source results using the formatter
   * @param data The external source results to format
   * @param options Optional formatting options
   * @returns Formatted string representation
   */
  override format(data: ExternalSourceResult[], options?: FormattingOptions): string {
    return this.formatter.format(data, options);
  }

  /**
   * Get a service by type
   * @param serviceType Type of service to retrieve
   * @returns Service instance
   */
  override getService<T>(serviceType: new () => T): T {
    if (serviceType === EmbeddingService as unknown as new () => T) {
      return this.embeddingService as unknown as T;
    }

    // Use registry for other service types
    const registry = Registry.getInstance();
    return registry.resolve<T>(serviceType.name);
  }

  /**
   * Get the enabled sources
   * @returns Array of enabled external sources
   */
  getEnabledSources() {
    return this.storage.getEnabledSources();
  }

  /**
   * Register a new external source
   * @param source The source to register
   */
  registerSource(source: ExternalSourceInterface): void {
    this.storage.registerSource(source);
  }

  /**
   * Update enabled sources
   * @param sourceNames Array of source names to enable
   * @returns The updated storage adapter
   */
  updateEnabledSources(sourceNames: string[]): ExternalSourceStorageAdapter {
    // Update the storage adapter with the new enabled sources
    const newAdapter = new ExternalSourceStorageAdapter({
      ...this.config as ExternalSourceStorageConfig,
      enabledSources: sourceNames,
    });

    // Replace the current adapter
    Object.assign(this.storage, newAdapter);

    return this.storage;
  }
}
