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
export class MockProfileTagService implements Partial<ProfileTagService> {
  private static instance: MockProfileTagService | null = null;
  
  /**
   * Get singleton instance
   */
  public static getInstance(): MockProfileTagService {
    if (!MockProfileTagService.instance) {
      MockProfileTagService.instance = new MockProfileTagService();
    }
    return MockProfileTagService.instance;
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
  public static createFresh(): MockProfileTagService {
    return new MockProfileTagService();
  }
  
  /**
   * Create instance with dependencies
   */
  public static createWithDependencies(
    _config: Record<string, unknown> = {},
    _dependencies: Record<string, unknown> = {}
  ): MockProfileTagService {
    return new MockProfileTagService();
  }
  
  // Mock methods with default implementations
  generateProfileTags = mock((_text: string): Promise<string[]> => {
    return Promise.resolve(['mock-tag', 'profile', 'test']);
  });
  
  updateProfileTags = mock((_forceRegenerate: boolean = false): Promise<string[] | null> => {
    return Promise.resolve(['updated-tag', 'profile', 'test']);
  });
  
  extractProfileKeywords = mock((_profile: Partial<Profile>): string[] => {
    const keywords = [];
    
    if (_profile.fullName) keywords.push(_profile.fullName);
    if (_profile.headline) keywords.push(_profile.headline);
    if (_profile.occupation) keywords.push(_profile.occupation);
    
    // Add some default keywords if the list is empty
    if (keywords.length === 0) {
      keywords.push('profile', 'user', 'skills');
    }
    
    return keywords;
  });
}