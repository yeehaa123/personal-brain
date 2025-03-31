/**
 * Wikipedia external knowledge source implementation
 */
import logger from '../../../utils/logger';
import type { ExternalSourceInterface, ExternalSourceResult, ExternalSearchOptions } from './externalSourceInterface';
import { EmbeddingService } from '../../model/embeddings';

// Define interfaces for Wikipedia API response structures
interface WikipediaSearchResult {
  pageid: number;
  title: string;
  snippet: string;
  size: number;
  wordcount: number;
  timestamp: string;
}

interface WikipediaSearchResponse {
  query?: {
    search?: WikipediaSearchResult[];
  };
  error?: {
    code: string;
    info: string;
  };
}

interface WikipediaContentResponse {
  query?: {
    pages?: Record<number, {
      pageid: number;
      ns: number;
      title: string;
      extract?: string;
    }>;
  };
  error?: {
    code: string;
    info: string;
  };
}

interface WikipediaSiteInfoResponse {
  query?: {
    general?: {
      sitename: string;
      [key: string]: unknown;
    };
  };
  sitename?: string;
  error?: {
    code: string;
    info: string;
  };
}

export class WikipediaSource implements ExternalSourceInterface {
  readonly name = 'Wikipedia';
  private embeddingService: EmbeddingService | null = null;
  private baseUrl = 'https://en.wikipedia.org/w/api.php';
  private userAgent = 'PersonalBrain/1.0 (personal use)';

  constructor(apiKey?: string) {
    if (apiKey) {
      this.embeddingService = new EmbeddingService({ apiKey });
      logger.debug('Wikipedia source initialized with embedding service');
    } else {
      logger.debug('Wikipedia source initialized without embedding service');
    }
  }

  /**
   * Search Wikipedia for information related to the query
   */
  async search(options: ExternalSearchOptions): Promise<ExternalSourceResult[]> {
    const { query, limit = 3, addEmbeddings = false } = options;
    logger.info(`Searching Wikipedia for: "${query}"`);
    
    try {
      // First search for relevant articles
      const searchResults = await this.searchWikipedia(query, limit);
      if (searchResults.length === 0) {
        logger.info('No Wikipedia results found');
        return [];
      }
      
      // For each result, fetch the content
      const results: ExternalSourceResult[] = [];
      for (const article of searchResults) {
        try {
          const content = await this.fetchArticleExcerpt(article.pageid);
          
          const result: ExternalSourceResult = {
            content,
            title: article.title,
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(article.title.replace(/ /g, '_'))}`,
            source: this.name,
            sourceType: 'encyclopedia',
            timestamp: new Date(),
            confidence: this.calculateConfidence(article),
          };
          
          // Add embeddings if requested and available
          if (addEmbeddings && this.embeddingService) {
            try {
              const embeddingResult = await this.embeddingService.getEmbedding(content);
              result.embedding = embeddingResult.embedding;
            } catch (embeddingError) {
              logger.error('Error generating embedding for Wikipedia content:', embeddingError);
            }
          }
          
          results.push(result);
        } catch (contentError) {
          logger.error(`Error fetching content for Wikipedia article: ${article.title}`, contentError);
        }
      }
      
      return results;
    } catch (error) {
      logger.error('Error searching Wikipedia:', error);
      return [];
    }
  }

  /**
   * Check if the Wikipedia API is accessible
   */
  async checkAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}?action=query&meta=siteinfo&siprop=general&format=json`);
      const data = await response.json() as WikipediaSiteInfoResponse;
      // Handle both response formats: nested format with data.query.general or flat format with data.sitename
      return !!(data && (data.query?.general || data.sitename));
    } catch (error) {
      logger.error('Wikipedia API not available:', error);
      return false;
    }
  }

  /**
   * Get metadata about the Wikipedia source
   */
  async getSourceMetadata(): Promise<Record<string, unknown>> {
    return {
      name: this.name,
      type: 'encyclopedia',
      limitPerMinute: 200, // Wikipedia has a soft limit of 200 requests per minute
      requiresAuthentication: false,
      supportsEmbeddings: !!this.embeddingService,
      lastUpdated: new Date(),
    };
  }

  /**
   * Search Wikipedia for articles matching the query
   */
  private async searchWikipedia(query: string, limit: number): Promise<WikipediaSearchResult[]> {
    const searchUrl = new URL(this.baseUrl);
    searchUrl.searchParams.append('action', 'query');
    searchUrl.searchParams.append('list', 'search');
    searchUrl.searchParams.append('srsearch', query);
    searchUrl.searchParams.append('srlimit', limit.toString());
    searchUrl.searchParams.append('format', 'json');
    searchUrl.searchParams.append('origin', '*');
    
    try {
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': this.userAgent,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Wikipedia search API responded with ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json() as WikipediaSearchResponse;
      return data.query?.search || [];
    } catch (error) {
      logger.error('Error in Wikipedia search:', error);
      return [];
    }
  }

  /**
   * Fetch an excerpt of the Wikipedia article
   */
  private async fetchArticleExcerpt(pageId: number): Promise<string> {
    const contentUrl = new URL(this.baseUrl);
    contentUrl.searchParams.append('action', 'query');
    contentUrl.searchParams.append('pageids', pageId.toString());
    contentUrl.searchParams.append('prop', 'extracts');
    contentUrl.searchParams.append('exintro', '1');
    contentUrl.searchParams.append('explaintext', '1');
    contentUrl.searchParams.append('format', 'json');
    contentUrl.searchParams.append('origin', '*');
    
    try {
      const response = await fetch(contentUrl, {
        headers: {
          'User-Agent': this.userAgent,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Wikipedia content API responded with ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json() as WikipediaContentResponse;
      const page = data.query?.pages?.[pageId];
      return page?.extract || 'No content available.';
    } catch (error) {
      logger.error('Error fetching Wikipedia article excerpt:', error);
      return 'Error retrieving content.';
    }
  }

  /**
   * Calculate a confidence score for the result
   */
  private calculateConfidence(article: WikipediaSearchResult): number {
    // Simple confidence score based on word count and position in results
    const wordCount = article.wordcount || 0;
    // Higher word count generally indicates more detailed articles
    const wordScore = Math.min(wordCount / 1000, 0.5);
    // Base score starts at 0.5
    return 0.5 + wordScore;
  }
}