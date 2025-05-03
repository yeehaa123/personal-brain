/**
 * Mock TextUtils Implementation
 * 
 * This file provides a standardized mock implementation of the TextUtils
 * for use in tests across the codebase.
 */

import type { TextConfig, TextUtils } from '@/utils/textUtils';

/**
 * Mock TextUtils class with singleton pattern
 */
export class MockTextUtils {
  static instance: MockTextUtils | null = null;

  // Configuration options
  private config: TextConfig;

  // Tracking calls for assertions
  calls: {
    prepareText: { input: string, output: string }[];
    chunkText: { input: string, output: string[] }[];
    extractKeywords: { input: string, output: string[] }[];
    sanitizeHtml: { input: string, output: string }[];
    calculateReadingTime: { input: string, output: number }[];
  };

  constructor(config?: Partial<TextConfig>) {
    // Default config values
    this.config = {
      defaultChunkSize: 1000,
      defaultChunkOverlap: 200,
      defaultMaxKeywords: 10,
      defaultWordsPerMinute: 200,
      ...config,
    };

    // Initialize empty call tracking
    this.calls = {
      prepareText: [],
      chunkText: [],
      extractKeywords: [],
      sanitizeHtml: [],
      calculateReadingTime: [],
    };
  }

  /**
   * Get singleton instance
   * @param config Configuration options
   */
  public static getInstance(config?: Partial<TextConfig>): TextUtils {
    if (!MockTextUtils.instance) {
      MockTextUtils.instance = new MockTextUtils(config);
    }
    return MockTextUtils.instance as unknown as TextUtils;
  }

  /**
   * Reset the singleton instance
   */
  public static resetInstance(): void {
    MockTextUtils.instance = null;
  }

  /**
   * Create a fresh instance for isolated testing
   * @param config Configuration options
   */
  public static createFresh(config?: Partial<TextConfig>): TextUtils {
    return new MockTextUtils(config) as unknown as TextUtils;
  }

  /**
   * Update the configuration
   * @param config New configuration options
   */
  public updateConfig(config: Partial<TextConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }

  /**
   * Mock prepareText method
   */
  prepareText(text: string): string {
    const result = text.replace(/\s+/g, ' ').trim();
    this.calls.prepareText.push({ input: text, output: result });
    return result;
  }

  /**
   * Mock chunkText method
   */
  chunkText(
    text: string,
    chunkSize = this.config.defaultChunkSize,
    overlap = this.config.defaultChunkOverlap,
  ): string[] {
    // Simple mock implementation
    const result = text.length <= chunkSize
      ? [text]
      : [text.substring(0, chunkSize), text.substring(chunkSize - overlap)];

    this.calls.chunkText.push({ input: text, output: result });
    return result;
  }

  /**
   * Mock extractKeywords method
   */
  extractKeywords(text: string, maxKeywords = this.config.defaultMaxKeywords): string[] {
    // Simple mock implementation
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 4)
      .slice(0, maxKeywords);

    // Make unique
    const result = [...new Set(words)];

    this.calls.extractKeywords.push({ input: text, output: result });
    return result;
  }

  /**
   * Mock sanitizeHtml method
   */
  sanitizeHtml(html: string): string {
    // Simple mock implementation that strips all tags
    const result = html.replace(/<[^>]*>?/gm, '');
    this.calls.sanitizeHtml.push({ input: html, output: result });
    return result;
  }

  /**
   * Mock calculateReadingTime method
   */
  calculateReadingTime(text: string, wordsPerMinute = this.config.defaultWordsPerMinute): number {
    const wordCount = text.split(/\s+/).length;
    const result = Math.ceil(wordCount / wordsPerMinute);
    this.calls.calculateReadingTime.push({ input: text, output: result });
    return result;
  }

  /**
   * Clear tracked calls
   */
  clear(): void {
    this.calls.prepareText = [];
    this.calls.chunkText = [];
    this.calls.extractKeywords = [];
    this.calls.sanitizeHtml = [];
    this.calls.calculateReadingTime = [];
  }
}
