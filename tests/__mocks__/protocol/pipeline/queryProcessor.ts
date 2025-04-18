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
   */
  processQuery(_query: string, _options?: QueryOptions): Promise<QueryResult> {
    if (this.customResponse) {
      return Promise.resolve({...this.customResponse});
    }
    
    return Promise.resolve({
      answer: 'Mock answer from QueryProcessor',
      citations: [],
      relatedNotes: [],
    });
  }
  
  /**
   * For testing - set a custom response
   */
  setCustomResponse(response: QueryResult): void {
    this.customResponse = response;
  }
}