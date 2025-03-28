/**
 * NewsAPI external knowledge source implementation
 * Requires a NewsAPI key from https://newsapi.org/
 */
import logger from '../../../utils/logger';
import { ExternalSourceInterface, ExternalSourceResult, ExternalSearchOptions } from './externalSourceInterface';
import { EmbeddingService } from '../../model/embeddings';

export class NewsApiSource implements ExternalSourceInterface {
  readonly name = 'NewsAPI';
  private embeddingService: EmbeddingService | null = null;
  private apiKey: string;
  private baseUrl = 'https://newsapi.org/v2';
  private maxAgeHours = 24 * 7; // 1 week by default

  constructor(apiKey?: string, openAiKey?: string, maxAgeHours = 24 * 7) {
    this.apiKey = apiKey || process.env.NEWSAPI_KEY || '';
    this.maxAgeHours = maxAgeHours;
    
    if (!this.apiKey) {
      logger.warn('NewsAPI source initialized without API key');
    }
    
    if (openAiKey) {
      this.embeddingService = new EmbeddingService(openAiKey);
      logger.debug('NewsAPI source initialized with embedding service');
    } else {
      logger.debug('NewsAPI source initialized without embedding service');
    }
  }

  /**
   * Search NewsAPI for recent information related to the query
   */
  async search(options: ExternalSearchOptions): Promise<ExternalSourceResult[]> {
    const { query, limit = 5, addEmbeddings = false } = options;
    
    if (!this.apiKey) {
      logger.warn('NewsAPI key not provided, cannot search');
      return [];
    }
    
    logger.info(`Searching NewsAPI for: "${query}"`);
    
    try {
      // First search for everything with the query
      const searchResults = await this.searchEverything(query, limit);
      
      if (searchResults.length === 0) {
        logger.info('No NewsAPI results found');
        return [];
      }
      
      // Process the results
      const results: ExternalSourceResult[] = [];
      
      for (const article of searchResults) {
        const content = this.formatArticleContent(article);
        
        const result: ExternalSourceResult = {
          content,
          title: article.title,
          url: article.url,
          source: `${this.name} - ${article.source.name || 'Unknown Source'}`,
          sourceType: 'news',
          timestamp: new Date(article.publishedAt),
          confidence: this.calculateConfidence(article, query),
        };
        
        // Add embeddings if requested and available
        if (addEmbeddings && this.embeddingService) {
          try {
            const embeddingResult = await this.embeddingService.getEmbedding(content);
            result.embedding = embeddingResult.embedding;
          } catch (embeddingError) {
            logger.error('Error generating embedding for news content:', embeddingError);
          }
        }
        
        results.push(result);
      }
      
      return results;
    } catch (error) {
      logger.error('Error searching NewsAPI:', error);
      return [];
    }
  }

  /**
   * Check if the NewsAPI is accessible
   */
  async checkAvailability(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/top-headlines?country=us&pageSize=1`, {
        headers: {
          'X-Api-Key': this.apiKey
        }
      });
      
      const data = await response.json();
      return data.status === 'ok';
    } catch (error) {
      logger.error('NewsAPI not available:', error);
      return false;
    }
  }

  /**
   * Get metadata about the NewsAPI source
   */
  async getSourceMetadata(): Promise<Record<string, any>> {
    return {
      name: this.name,
      type: 'news',
      limitPerDay: 100, // Free plan has 100 requests per day
      requiresAuthentication: true,
      hasApiKey: !!this.apiKey,
      supportsEmbeddings: !!this.embeddingService,
      maxArticleAge: `${this.maxAgeHours} hours`,
      lastUpdated: new Date()
    };
  }

  /**
   * Search NewsAPI "everything" endpoint
   */
  private async searchEverything(query: string, limit: number): Promise<any[]> {
    // Calculate date range (last maxAgeHours)
    const fromDate = new Date();
    fromDate.setHours(fromDate.getHours() - this.maxAgeHours);
    
    const searchUrl = new URL(`${this.baseUrl}/everything`);
    searchUrl.searchParams.append('q', query);
    searchUrl.searchParams.append('from', fromDate.toISOString().split('T')[0]);
    searchUrl.searchParams.append('sortBy', 'relevancy');
    searchUrl.searchParams.append('language', 'en');
    searchUrl.searchParams.append('pageSize', limit.toString());
    
    try {
      const response = await fetch(searchUrl, {
        headers: {
          'X-Api-Key': this.apiKey
        }
      });
      
      if (!response.ok) {
        throw new Error(`NewsAPI responded with ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.status !== 'ok') {
        logger.error(`NewsAPI error: ${data.message || 'Unknown error'}`);
        return [];
      }
      
      return data.articles || [];
    } catch (error) {
      logger.error('Error in NewsAPI search:', error);
      return [];
    }
  }

  /**
   * Format article content for consistent presentation
   */
  private formatArticleContent(article: any): string {
    const publishedDate = new Date(article.publishedAt).toLocaleString();
    
    let content = '';
    
    if (article.author) {
      content += `By ${article.author}\n`;
    }
    
    content += `Published: ${publishedDate}\n\n`;
    
    if (article.description) {
      content += `${article.description}\n\n`;
    }
    
    if (article.content) {
      // Remove the truncation indicator from NewsAPI
      const cleanContent = article.content.replace(/\[\+\d+ chars\]$/, '');
      content += cleanContent;
    }
    
    return content.trim();
  }

  /**
   * Calculate a confidence score for the result
   */
  private calculateConfidence(article: any, query: string): number {
    // Base confidence starts at 0.5
    let confidence = 0.5;
    
    // Content length factor (longer content might be more informative)
    const contentLength = (article.content || '').length;
    confidence += Math.min(contentLength / 2000, 0.2); // Max 0.2 bonus for length
    
    // Recency factor (more recent articles get higher confidence)
    const ageInHours = (Date.now() - new Date(article.publishedAt).getTime()) / (1000 * 60 * 60);
    const recencyScore = Math.max(0, 0.2 * (1 - (ageInHours / this.maxAgeHours)));
    confidence += recencyScore; // Max 0.2 bonus for very recent articles
    
    // Title relevance (simple heuristic - title contains query words)
    const queryWords = query.toLowerCase().split(/\s+/);
    const titleWords = article.title.toLowerCase();
    let titleMatchCount = 0;
    
    queryWords.forEach(word => {
      if (word.length > 3 && titleWords.includes(word)) {
        titleMatchCount++;
      }
    });
    
    confidence += Math.min(titleMatchCount / queryWords.length, 0.1); // Max 0.1 bonus
    
    // Cap at 0.95 to leave room for semantic ranking
    return Math.min(confidence, 0.95);
  }
}