/**
 * Mock ProfileTagService Implementation
 * 
 * This file provides a standardized mock implementation of the ProfileTagService
 * for use in tests across the codebase.
 */

import { mock } from 'bun:test';

import type { Profile } from '@/models/profile';
import type { ProfileTagService } from '@/services/profiles/profileTagService';

/**
 * MockProfileTagService class with standardized interface
 * 
 * Follows the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */
export class MockProfileTagService {
  private static instance: MockProfileTagService | null = null;

  /**
   * Get singleton instance
   */
  public static getInstance(): ProfileTagService {
    if (!MockProfileTagService.instance) {
      MockProfileTagService.instance = new MockProfileTagService();
    }
    return MockProfileTagService.instance as unknown as ProfileTagService;
  }

  /**
   * Reset singleton instance
   */
  public static resetInstance(): void {
    MockProfileTagService.instance = null;
  }

  /**
   * Create fresh instance for isolated testing
   */
  public static createFresh(
    _config?: Record<string, unknown>,
    _dependencies?: Record<string, unknown>,
  ): ProfileTagService {
    return new MockProfileTagService() as unknown as ProfileTagService;
  }

  /**
   * Create instance with dependencies
   */
  public static createWithDependencies(
    _config: Record<string, unknown> = {},
    _dependencies: Record<string, unknown> = {},
  ): MockProfileTagService {
    return new MockProfileTagService();
  }

  // Mock methods with default implementations
  generateProfileTags = mock((_text: string): Promise<string[]> => {
    // Check for software engineer pattern
    if (_text.toLowerCase().includes('software') && _text.toLowerCase().includes('engineer')) {
      return Promise.resolve(['software-development', 'typescript', 'react']);
    }
    
    // Check for software developer pattern
    if (_text.toLowerCase().includes('software') && _text.toLowerCase().includes('developer')) {
      return Promise.resolve(['software-development', 'typescript', 'react']);
    }
    
    // Default case
    return Promise.resolve(['mock-tag', 'profile', 'test']);
  });

  updateProfileTags = mock((_forceRegenerate: boolean = false): Promise<string[] | null> => {
    return Promise.resolve(['updated-tag', 'profile', 'test']);
  });

  extractProfileKeywords = mock((_profile: Partial<Profile>): string[] => {
    // Default keywords for the mock profile
    const keywords = ['software', 'engineer', 'typescript', 'developer'];
    
    // Add specific keywords for experience
    if (_profile.experiences?.length) {
      if (_profile.experiences[0].title?.includes('Data')) {
        keywords.push('data', 'scientist', 'analyst');
      }
    }
    
    // If summary mentions React, add it
    if (_profile.summary?.includes('React')) {
      keywords.push('react', 'skills');
    }
    
    return keywords;
  });

  // Add missing methods needed by ProfileSearchService
  prepareProfileTextForEmbedding = mock((_profile: Partial<Profile>): string => {
    return `Mock profile text for ${_profile.fullName || 'Unknown User'}`;
  });

  getProfileTextForTagGeneration = mock((_profile: Partial<Profile>): string => {
    return `Mock profile text for tagging ${_profile.fullName || 'Unknown User'}`;
  });
}
