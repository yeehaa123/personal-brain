/**
 * Mock TagExtractor Implementation
 * 
 * This file provides a standardized mock implementation of the TagExtractor class
 * for use in tests across the codebase.
 */

import type { TagExtractor } from '@/utils/tagExtractor';

/**
 * Mock TagExtractor class with singleton pattern
 */
export class MockTagExtractor {
  private static instance: MockTagExtractor | null = null;

  // Tracking extracted tags for assertions
  public extractedTags: string[][] = [];

  // Default tags to return
  private tags: string[] = ['ecosystem', 'architecture', 'example'];

  // Flag to control if extractTags throws an error
  private shouldThrowError = false;

  /**
   * Get singleton instance
   */
  public static getInstance(): TagExtractor {
    if (!MockTagExtractor.instance) {
      MockTagExtractor.instance = new MockTagExtractor();
    }
    return MockTagExtractor.instance as unknown as TagExtractor;
  }

  /**
   * Reset the singleton instance
   */
  public static resetInstance(): void {
    MockTagExtractor.instance = null;
  }

  /**
   * Create a fresh instance for isolated testing
   */
  public static createFresh(options?: { tags?: string[], shouldThrowError?: boolean }): TagExtractor {
    const instance = new MockTagExtractor();
    if (options?.tags) {
      instance.tags = options.tags;
    }
    if (options?.shouldThrowError) {
      instance.shouldThrowError = options.shouldThrowError;
    }
    return instance as unknown as TagExtractor;
  }

  /**
   * Mock implementation of extractTags method
   */
  public async extractTags(
    _content: string,
    _existingTags: string[] = [],
    maxTags: number = 5,
    _apiKey?: string,
  ): Promise<string[]> {
    if (this.shouldThrowError) {
      throw new Error('Mock tag extraction error');
    }

    // Record the call for assertions
    this.extractedTags.push([...this.tags]);

    // Return a copy of the configured tags
    return [...this.tags].slice(0, maxTags);
  }

  /**
   * Configure mock to throw an error
   */
  public setShouldThrowError(shouldThrow: boolean): void {
    this.shouldThrowError = shouldThrow;
  }

  /**
   * Configure the tags to return
   */
  public setTags(tags: string[]): void {
    this.tags = [...tags];
  }

  /**
   * Clear recorded data
   */
  public clear(): void {
    this.extractedTags = [];
  }
}
