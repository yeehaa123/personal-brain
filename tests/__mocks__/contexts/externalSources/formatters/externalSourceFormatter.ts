/**
 * MockExternalSourceFormatter - Mock implementation of ExternalSourceFormatter
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 * - createWithDependencies(): Creates a new instance with explicit dependencies
 */

import { mock } from 'bun:test';

import type { ExternalSourceResult } from '@/contexts/externalSources/sources';
import type { FormattingOptions } from '@/contexts/formatterInterface';

/**
 * Mock formatter for external source results
 */
export class MockExternalSourceFormatter {
  /** Singleton instance */
  private static instance: MockExternalSourceFormatter | null = null;
  
  /** Mock format method */
  format = mock((data: ExternalSourceResult[], _options?: FormattingOptions) => {
    if (!data || data.length === 0) {
      return 'No external source results found.';
    }
    
    // Simple mock implementation that returns formatted results
    return data.map(result => 
      `## ${result.title}\n\n${result.content}\n\n**Source:** ${result.source}`,
    ).join('\n\n---\n\n');
  });
  
  /** Mock formatSingleResult method */
  formatSingleResult = mock((result: ExternalSourceResult, options?: FormattingOptions) => {
    return this.format([result], options);
  });
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Initialize mock methods if needed
  }
  
  /**
   * Get singleton instance of MockExternalSourceFormatter
   * @returns Singleton instance
   */
  public static getInstance(): MockExternalSourceFormatter {
    if (!MockExternalSourceFormatter.instance) {
      MockExternalSourceFormatter.instance = new MockExternalSourceFormatter();
    }
    return MockExternalSourceFormatter.instance;
  }
  
  /**
   * Reset the singleton instance (primarily for testing)
   */
  public static resetInstance(): void {
    if (MockExternalSourceFormatter.instance) {
      // Reset mock counters
      MockExternalSourceFormatter.instance.format.mockClear();
      MockExternalSourceFormatter.instance.formatSingleResult.mockClear();
    }
    MockExternalSourceFormatter.instance = null;
  }
  
  /**
   * Create a fresh instance (primarily for testing)
   * @returns A new MockExternalSourceFormatter instance
   */
  public static createFresh(): MockExternalSourceFormatter {
    return new MockExternalSourceFormatter();
  }

  /**
   * Create a new instance with explicit dependencies
   * This is a mock implementation that matches the real component's interface
   * @param _config Optional configuration options (ignored in this mock)
   * @param _dependencies Optional dependencies (ignored in this mock)
   * @returns A new MockExternalSourceFormatter instance
   */
  public static createWithDependencies(
    _config: Record<string, unknown> = {},
    _dependencies: Record<string, unknown> = {}
  ): MockExternalSourceFormatter {
    return new MockExternalSourceFormatter();
  }
}