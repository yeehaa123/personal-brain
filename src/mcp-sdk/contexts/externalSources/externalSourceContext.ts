/**
 * ExternalSourceContext implementation using the Model Context Protocol SDK
 * This provides the same interface as the original ExternalSourceContext but uses MCP SDK internally
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import logger from '@/utils/logger';
import { EmbeddingService } from '@mcp/model/embeddings';
import type { 
  ExternalSourceInterface, 
  ExternalSourceResult, 
  ExternalSearchOptions, 
} from '@mcp/context/sources/externalSourceInterface';
import { WikipediaSource } from '@mcp/context/sources/wikipediaSource';
import { NewsApiSource } from '@mcp/context/sources/newsApiSource';
import { getEnv } from '@/utils/configUtils';

export interface ExternalContextOptions {
  enabledSources?: string[];
  maxResults?: number;
  cacheTtl?: number; // Time to live in milliseconds
}

/**
 * Manages retrieval of information from external knowledge sources using MCP SDK
 */
export class ExternalSourceContext {
  private sources: Map<string, ExternalSourceInterface> = new Map();
  private embeddingService: EmbeddingService;
  private sourceCache: Map<string, {data: ExternalSourceResult[], timestamp: number}> = new Map();
  private options: ExternalContextOptions;
  private mcpServer: McpServer;
  
  constructor(apiKey?: string, newsApiKey?: string, options: ExternalContextOptions = {}) {
    // Initialize with default options
    this.options = {
      enabledSources: options.enabledSources || ['Wikipedia', 'NewsAPI'],
      maxResults: options.maxResults || 10,
      cacheTtl: options.cacheTtl || 1000 * 60 * 60, // 1 hour by default
    };
    
    // Initialize embedding service with singleton pattern
    this.embeddingService = EmbeddingService.getInstance(apiKey ? { apiKey } : undefined);
    
    // Register available sources
    this.registerSource(new WikipediaSource(apiKey));
    
    // Register NewsAPI source if key is provided
    if (newsApiKey || getEnv('NEWSAPI_KEY')) {
      this.registerSource(new NewsApiSource(newsApiKey, apiKey));
      logger.info('NewsAPI source registered');
    }
    
    // Initialize MCP server
    this.mcpServer = new McpServer({
      name: 'ExternalSourceContext',
      version: '1.0.0',
    });
    
    // Register MCP resources
    this.registerMcpResources();
    
    // Register MCP tools
    this.registerMcpTools();
    
    logger.info(`External source context initialized with ${this.sources.size} sources and MCP SDK integration`);
  }
  
  /**
   * Register MCP resources for external sources
   */
  private registerMcpResources(): void {
    // Resource to search external sources
    this.mcpServer.resource(
      'external_search',
      'external://search',
      async (uri) => {
        try {
          const params = new URLSearchParams(uri.search);
          const query = params.get('query') || '';
          
          if (!query) {
            return {
              contents: [{
                uri: uri.toString(),
                text: 'Error: No search query provided',
              }],
            };
          }
          
          const limit = params.has('limit') ? parseInt(params.get('limit') || '5', 10) : 5;
          const semantic = params.has('semantic') ? params.get('semantic') === 'true' : true;
          
          const results = semantic 
            ? await this.semanticSearch(query, limit)
            : await this.search(query, { limit });
          
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
          logger.error(`Error in external search resource: ${error instanceof Error ? error.message : String(error)}`);
          return {
            contents: [{
              uri: uri.toString(),
              text: `Error searching external sources: ${error instanceof Error ? error.message : String(error)}`,
            }],
          };
        }
      },
    );
    
    // Resource to get external source availability
    this.mcpServer.resource(
      'external_sources',
      'external://sources',
      async () => {
        try {
          const availability = await this.checkSourcesAvailability();
          const sources = this.getEnabledSources();
          
          const sourcesList = sources.map(source => {
            const isAvailable = availability[source.name] || false;
            return `- ${source.name}: ${isAvailable ? '✅ Available' : '❌ Unavailable'}`;
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
          logger.error(`Error in external sources resource: ${error instanceof Error ? error.message : String(error)}`);
          return {
            contents: [{
              uri: 'external://sources',
              text: `Error retrieving external sources: ${error instanceof Error ? error.message : String(error)}`,
            }],
          };
        }
      },
    );
  }
  
  /**
   * Register MCP tools for external source operations
   */
  private registerMcpTools(): void {
    // Tool to search external sources
    this.mcpServer.tool(
      'search_external_sources',
      'Search across multiple external knowledge sources with optional semantic search',
      {
        query: z.string().min(1, 'Query must not be empty'),
        limit: z.number().min(1).max(20).optional(),
        semantic: z.boolean().optional(),
      },
      async (args) => {
        try {
          const results = args.semantic !== false
            ? await this.semanticSearch(args.query, args.limit || 5)
            : await this.search(args.query, { limit: args.limit || 5 });
          
          if (results.length === 0) {
            return {
              content: [{
                type: 'text',
                text: `No results found for query: "${args.query}"`,
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
          logger.error(`Error searching external sources via MCP tool: ${error instanceof Error ? error.message : String(error)}`);
          return {
            content: [{
              type: 'text',
              text: `Failed to search external sources: ${error instanceof Error ? error.message : String(error)}`,
            }],
            isError: true,
          };
        }
      },
    );
    
    // Tool to toggle external sources
    this.mcpServer.tool(
      'toggle_external_source',
      'Enable or disable a specific external knowledge source',
      {
        sourceName: z.string(),
        enabled: z.boolean(),
      },
      async (args) => {
        try {
          // Get current enabled sources
          const currentSources = this.options.enabledSources || [];
          
          // Check if the source exists
          const sourceExists = Array.from(this.sources.keys()).includes(args.sourceName);
          if (!sourceExists) {
            return {
              content: [{
                type: 'text',
                text: `Source "${args.sourceName}" not found. Available sources: ${Array.from(this.sources.keys()).join(', ')}`,
              }],
              isError: true,
            };
          }
          
          // Toggle the source
          if (args.enabled) {
            // Add the source if not already enabled
            if (!currentSources.includes(args.sourceName)) {
              this.options.enabledSources = [...currentSources, args.sourceName];
            }
          } else {
            // Remove the source if enabled
            this.options.enabledSources = currentSources.filter(name => name !== args.sourceName);
          }
          
          return {
            content: [{
              type: 'text',
              text: `Source "${args.sourceName}" is now ${args.enabled ? 'enabled' : 'disabled'}. Enabled sources: ${this.options.enabledSources?.join(', ') || 'None'}`,
            }],
          };
        } catch (error) {
          logger.error(`Error toggling external source via MCP tool: ${error instanceof Error ? error.message : String(error)}`);
          return {
            content: [{
              type: 'text',
              text: `Failed to toggle external source: ${error instanceof Error ? error.message : String(error)}`,
            }],
            isError: true,
          };
        }
      },
    );
  }
  
  /**
   * Get the MCP server instance
   */
  getMcpServer(): McpServer {
    return this.mcpServer;
  }
  
  /**
   * Register a new external source
   */
  registerSource(source: ExternalSourceInterface): void {
    this.sources.set(source.name, source);
    logger.debug(`Registered external source: ${source.name}`);
  }
  
  /**
   * Search across all enabled external sources
   */
  async search(query: string, options: Partial<ExternalSearchOptions> = {}): Promise<ExternalSourceResult[]> {
    logger.info(`Searching external sources for: "${query}"`);
    
    // Check cache first
    const cacheKey = this.getCacheKey(query, options);
    const cachedResults = this.getCachedResults(cacheKey);
    if (cachedResults) {
      logger.debug(`Using cached results for: "${query}"`);
      return cachedResults;
    }
    
    const enabledSources = this.getEnabledSources();
    if (enabledSources.length === 0) {
      logger.warn('No enabled external sources found');
      return [];
    }
    
    // Default search options
    const searchOptions: ExternalSearchOptions = {
      query,
      limit: options.limit || Math.ceil(this.options.maxResults! / enabledSources.length),
      addEmbeddings: options.addEmbeddings || false,
    };
    
    // Search all enabled sources in parallel
    const searchPromises = enabledSources.map(source => 
      source.search(searchOptions)
        .catch(error => {
          logger.error(`Error searching ${source.name}:`, error);
          return [] as ExternalSourceResult[];
        }),
    );
    
    const results = await Promise.all(searchPromises);
    const allResults = results.flat();
    
    // Sort by confidence and limit total results
    const sortedResults = allResults
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, this.options.maxResults);
      
    // Cache results
    this.cacheResults(cacheKey, sortedResults);
    
    logger.info(`Found ${sortedResults.length} results from external sources`);
    return sortedResults;
  }
  
  /**
   * Get semantic search results using embeddings
   */
  async semanticSearch(query: string, limit: number = 5): Promise<ExternalSourceResult[]> {
    try {
      // First get results from external sources with embeddings
      const results = await this.search(query, { addEmbeddings: true });
      
      // Filter out results without embeddings
      const resultsWithEmbeddings = results.filter(result => result.embedding);
      
      if (resultsWithEmbeddings.length === 0) {
        logger.warn('No external results with embeddings found');
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
      logger.error('Error in semantic search for external sources:', error);
      // Fall back to regular search
      return this.search(query, { limit });
    }
  }
  
  /**
   * Get available sources that are enabled
   */
  getEnabledSources(): ExternalSourceInterface[] {
    if (!this.options.enabledSources || this.options.enabledSources.length === 0) {
      return Array.from(this.sources.values());
    }
    
    return this.options.enabledSources
      .map(name => this.sources.get(name))
      .filter(source => source !== undefined) as ExternalSourceInterface[];
  }
  
  /**
   * Check availability of all sources
   */
  async checkSourcesAvailability(): Promise<Record<string, boolean>> {
    const availabilityMap: Record<string, boolean> = {};
    
    // If no sources, return empty object
    if (this.sources.size === 0) {
      return availabilityMap;
    }
    
    // Check each source in parallel
    const checkPromises: Promise<void>[] = [];
    
    for (const [name, source] of this.sources.entries()) {
      checkPromises.push(
        source.checkAvailability()
          .then(available => {
            availabilityMap[name] = available;
          })
          .catch(() => {
            availabilityMap[name] = false;
          }),
      );
    }
    
    await Promise.all(checkPromises);
    return availabilityMap;
  }
  
  /**
   * Create a cache key for a query and options
   */
  private getCacheKey(query: string, options: Partial<ExternalSearchOptions>): string {
    return `${query}:${JSON.stringify(options)}`;
  }
  
  /**
   * Get cached results if they exist and are not expired
   */
  private getCachedResults(cacheKey: string): ExternalSourceResult[] | null {
    const cached = this.sourceCache.get(cacheKey);
    
    if (!cached) return null;
    
    const now = Date.now();
    const isExpired = now - cached.timestamp > this.options.cacheTtl!;
    
    if (isExpired) {
      this.sourceCache.delete(cacheKey);
      return null;
    }
    
    return cached.data;
  }
  
  /**
   * Cache search results
   */
  private cacheResults(cacheKey: string, results: ExternalSourceResult[]): void {
    this.sourceCache.set(cacheKey, {
      data: results,
      timestamp: Date.now(),
    });
    
    // Prune cache if it gets too large
    if (this.sourceCache.size > 100) {
      this.pruneCache();
    }
  }
  
  /**
   * Remove oldest items from cache
   */
  private pruneCache(): void {
    // Get entries from cache
    const entries = Array.from(this.sourceCache.entries());
    
    // Sort by age (oldest first)
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest 20% of entries
    const removeCount = Math.ceil(entries.length * 0.2);
    for (let i = 0; i < removeCount; i++) {
      if (entries[i]) {
        this.sourceCache.delete(entries[i][0]);
      }
    }
    
    logger.debug(`Pruned ${removeCount} items from external source cache`);
  }
}