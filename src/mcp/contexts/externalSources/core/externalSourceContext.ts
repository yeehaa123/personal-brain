/**
 * ExternalSourceContext implementation using the BaseContext architecture
 * 
 * This version extends BaseContext to ensure consistent behavior
 * with other context implementations.
 */

import { z } from 'zod';

import { BaseContext } from '@/mcp/contexts/core/baseContext';
import type { StorageInterface } from '@/mcp/contexts/core/storageInterface';
import { EmbeddingService } from '@/mcp/model';
import logger from '@/utils/logger';

import { 
  ExternalSourceStorageAdapter, 
  type ExternalSourceStorageConfig, 
} from '../adapters/externalSourceStorageAdapter';
import type { 
  ExternalSearchOptions, 
  ExternalSourceInterface,
  ExternalSourceResult, 
} from '../sources';

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
 * Context for working with external knowledge sources
 * 
 * Acts as a facade for external source operations, coordinating between
 * sources, embedding service, and MCP components.
 */
export class ExternalSourceContext extends BaseContext {
  // Dependencies
  private embeddingService: EmbeddingService;
  
  // Storage adapter
  private storage: ExternalSourceStorageAdapter;
  
  // Singleton instance
  private static instance: ExternalSourceContext | null = null;
  
  /**
   * Get singleton instance of ExternalSourceContext 
   * @param config Configuration for the context
   * @returns The ExternalSourceContext instance
   */
  static override getInstance(config: Record<string, unknown> = {}): ExternalSourceContext {
    if (!ExternalSourceContext.instance) {
      ExternalSourceContext.instance = new ExternalSourceContext(config as ExternalSourceContextConfig);
    }
    return ExternalSourceContext.instance;
  }
  
  /**
   * Create a fresh instance of ExternalSourceContext (for testing)
   * @param config Configuration for the context
   * @returns A new ExternalSourceContext instance
   */
  static createFresh(config: Record<string, unknown> = {}): ExternalSourceContext {
    return new ExternalSourceContext(config as ExternalSourceContextConfig);
  }
  
  /**
   * Reset the singleton instance (for testing)
   */
  static override resetInstance(): void {
    ExternalSourceContext.instance = null;
  }

  /**
   * Create a new ExternalSourceContext
   * @param config Configuration for the context
   */
  constructor(config: ExternalSourceContextConfig = {}) {
    super(config as Record<string, unknown>);
    
    // Initialize storage adapter
    this.storage = new ExternalSourceStorageAdapter({
      apiKey: config.apiKey,
      newsApiKey: config.newsApiKey,
      enabledSources: config.enabledSources,
      maxResults: config.maxResults,
      cacheTtl: config.cacheTtl,
    });
    
    // Initialize embedding service
    this.embeddingService = EmbeddingService.getInstance({ apiKey: config.apiKey });
    
    logger.debug('ExternalSourceContext initialized with BaseContext architecture', { context: 'ExternalSourceContext' });
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
    // Register external search resources
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
          logger.error('Error in external search resource', { error, context: 'ExternalSourceContext' });
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
          logger.error('Error in external sources resource', { error, context: 'ExternalSourceContext' });
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
    
    // Register external source tools
    this.tools.push({
      protocol: 'external',
      path: 'search',
      handler: async (params) => {
        try {
          const query = params['query'] as string;
          const limit = params['limit'] as number || 5;
          const semantic = params['semantic'] as boolean !== false;
          
          const results = semantic
            ? await this.semanticSearch(query, limit)
            : await this.search(query, { limit });
          
          if (results.length === 0) {
            return {
              content: [{
                type: 'text',
                text: `No results found for query: "${query}"`,
              }],
            };
          }
          
          return {
            content: results.map(result => ({
              type: 'text',
              text: `### ${result.title}\nSource: ${result.source}\n\n${result.content}\n`,
            })),
          };
        } catch (error) {
          logger.error('Error searching external sources via MCP tool', { error, context: 'ExternalSourceContext' });
          return {
            content: [{
              type: 'text',
              text: `Failed to search external sources: ${error instanceof Error ? error.message : String(error)}`,
            }],
            isError: true,
          };
        }
      },
      name: 'search_external_sources',
      description: 'Search across multiple external knowledge sources with optional semantic search',
      parameters: {
        query: z.string().min(1, 'Query must not be empty'),
        limit: z.number().min(1).max(20).optional(),
        semantic: z.boolean().optional(),
      },
    });
    
    // Tool to toggle external sources
    this.tools.push({
      protocol: 'external',
      path: 'toggle_source',
      handler: async (params) => {
        try {
          const sourceName = params['sourceName'] as string;
          const enabled = params['enabled'] as boolean;
          
          // Get the storage adapter
          const adapter = this.storage;
          const sources = Array.from(adapter.getEnabledSources());
          const sourceNames = sources.map(s => s.name);
          
          // Update the enabled sources list based on the toggle
          if (enabled && !sourceNames.includes(sourceName)) {
            // Add the source if not already enabled
            sourceNames.push(sourceName);
          } else if (!enabled) {
            // Remove the source if enabled
            const index = sourceNames.indexOf(sourceName);
            if (index >= 0) {
              sourceNames.splice(index, 1);
            }
          }
          
          // Update the storage adapter with the new enabled sources
          const newAdapter = new ExternalSourceStorageAdapter({
            ...this.config as ExternalSourceStorageConfig,
            enabledSources: sourceNames,
          });
          
          // Replace the current adapter
          Object.assign(this.storage, newAdapter);
          
          return {
            content: [{
              type: 'text',
              text: `Source "${sourceName}" is now ${enabled ? 'enabled' : 'disabled'}. Enabled sources: ${sourceNames.join(', ') || 'None'}`,
            }],
          };
        } catch (error) {
          logger.error('Error toggling external source via MCP tool', { error, context: 'ExternalSourceContext' });
          return {
            content: [{
              type: 'text',
              text: `Failed to toggle external source: ${error instanceof Error ? error.message : String(error)}`,
            }],
            isError: true,
          };
        }
      },
      name: 'toggle_external_source',
      description: 'Enable or disable a specific external knowledge source',
      parameters: {
        sourceName: z.string(),
        enabled: z.boolean(),
      },
    });
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
        logger.warn('No external results with embeddings found', { context: 'ExternalSourceContext' });
        return results.slice(0, limit); // Return basic results instead
      }
      
      // Generate embedding for the query
      const queryEmbedding = await this.embeddingService.getEmbedding(query);
      
      // Calculate similarity scores
      const scoredResults = resultsWithEmbeddings.map(result => {
        if (!result.embedding) return { ...result, similarityScore: 0 };
        
        const similarity = this.embeddingService.cosineSimilarity(
          queryEmbedding.embedding,
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
      logger.error('Error in semantic search for external sources', { error, context: 'ExternalSourceContext' });
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
  getStorage(): StorageInterface<ExternalSourceResult> {
    return this.storage;
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
}