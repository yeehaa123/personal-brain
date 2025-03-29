/**
 * ExternalSourceContext manages retrieving information from external sources
 */
import logger from '../../utils/logger';
import { EmbeddingService } from '../model/embeddings';
import type { ExternalSourceInterface, ExternalSourceResult, ExternalSearchOptions } from './sources/externalSourceInterface';
import { WikipediaSource } from './sources/wikipediaSource';
import { NewsApiSource } from './sources/newsApiSource';

export interface ExternalContextOptions {
  enabledSources?: string[];
  maxResults?: number;
  cacheTtl?: number; // Time to live in milliseconds
}

/**
 * Manages retrieval of information from external knowledge sources
 */
export class ExternalSourceContext {
  private sources: Map<string, ExternalSourceInterface> = new Map();
  private embeddingService: EmbeddingService;
  private sourceCache: Map<string, {data: ExternalSourceResult[], timestamp: number}> = new Map();
  private options: ExternalContextOptions;
  
  constructor(apiKey?: string, newsApiKey?: string, options: ExternalContextOptions = {}) {
    // Initialize with default options
    this.options = {
      enabledSources: options.enabledSources || ['Wikipedia', 'NewsAPI'],
      maxResults: options.maxResults || 10,
      cacheTtl: options.cacheTtl || 1000 * 60 * 60 // 1 hour by default
    };
    
    // Initialize embedding service
    this.embeddingService = new EmbeddingService(apiKey);
    
    // Register available sources
    this.registerSource(new WikipediaSource(apiKey));
    
    // Register NewsAPI source if key is provided
    if (newsApiKey || process.env.NEWSAPI_KEY) {
      this.registerSource(new NewsApiSource(newsApiKey, apiKey));
      logger.info('NewsAPI source registered');
    }
    
    logger.info(`External source context initialized with ${this.sources.size} sources`);
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
      addEmbeddings: options.addEmbeddings || false
    };
    
    // Search all enabled sources in parallel
    const searchPromises = enabledSources.map(source => 
      source.search(searchOptions)
        .catch(error => {
          logger.error(`Error searching ${source.name}:`, error);
          return [] as ExternalSourceResult[];
        })
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
          result.embedding
        );
        
        return {
          ...result,
          similarityScore: similarity
        };
      });
      
      // Sort by similarity and limit
      const sortedResults = scoredResults
        .sort((a, b) => (b.similarityScore || 0) - (a.similarityScore || 0))
        .slice(0, limit);
      
      // Remove the similarity score property before returning
      return sortedResults.map(({ similarityScore, ...result }) => result);
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
          })
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
      timestamp: Date.now()
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
    const now = Date.now();
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