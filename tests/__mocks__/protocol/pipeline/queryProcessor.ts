/**
 * Mock QueryProcessor for testing
 * 
 * Follows the Component Interface Standardization pattern with
 * getInstance(), resetInstance(), and createFresh()
 */
import type { QueryOptions, QueryResult } from '@/protocol/types';

/**
 * Mock QueryProcessor for testing protocol layer
 */
export class MockQueryProcessor {
  private static instance: MockQueryProcessor | null = null;
  private customResponse: QueryResult | null = null;
  
  /**
   * Get the singleton instance
   */
  static getInstance(options?: Record<string, unknown>): MockQueryProcessor {
    if (!MockQueryProcessor.instance) {
      MockQueryProcessor.instance = new MockQueryProcessor(options);
    }
    return MockQueryProcessor.instance;
  }
  
  /**
   * Reset the singleton instance
   */
  static resetInstance(): void {
    MockQueryProcessor.instance = null;
  }
  
  /**
   * Create a fresh instance
   */
  static createFresh(options?: Record<string, unknown>): MockQueryProcessor {
    return new MockQueryProcessor(options);
  }
  
  private constructor(options?: Record<string, unknown>) {
    // Set up with options if provided
    if (options && options['customResponse']) {
      this.customResponse = options['customResponse'] as QueryResult;
    }
  }
  
  /**
   * Process a query
   * Returns a mock query result or the configured custom response
   * Supports generic types and schemas for structured responses
   */
  processQuery<T = unknown>(_query: string, options?: QueryOptions<T>): Promise<QueryResult<T>> {
    if (this.customResponse) {
      return Promise.resolve({...this.customResponse} as unknown as QueryResult<T>);
    }
    
    // If a schema is provided, generate a structured response
    if (options?.schema) {
      // Check the query to determine what kind of structured data to return
      if (_query.includes('user data')) {
        // For user data queries
        return Promise.resolve({
          answer: 'Mock answer with structured user data',
          citations: [],
          relatedNotes: [],
          object: {
            name: 'Mock User',
            email: 'mock@example.com',
            preferences: { theme: 'light', notifications: true },
          } as unknown as T,
        });
      } else if (_query.includes('landing page')) {
        // For landing page queries
        return Promise.resolve({
          answer: 'Mock landing page generation response',
          citations: [],
          relatedNotes: [],
          object: {
            title: 'Mock Landing Page',
            description: 'A mock landing page for testing',
            name: 'Mock Professional',
            tagline: 'Expert mock services',
            hero: {
              headline: 'Welcome to My Services',
              subheading: 'Professional testing services',
              ctaText: 'Get Started',
              ctaLink: '#contact',
            },
            services: {
              title: 'Services',
              items: [
                { title: 'Mock Service 1', description: 'First mock service' },
                { title: 'Mock Service 2', description: 'Second mock service' },
              ],
            },
            sectionOrder: ['hero', 'services', 'about', 'cta', 'footer'],
          } as unknown as T,
        });
      }
    }
    
    // Default response without structured data
    return Promise.resolve({
      answer: 'Mock answer from QueryProcessor',
      citations: [],
      relatedNotes: [],
    } as QueryResult<T>);
  }
  
  /**
   * For testing - set a custom response
   */
  setCustomResponse(response: QueryResult): void {
    this.customResponse = response;
  }
}