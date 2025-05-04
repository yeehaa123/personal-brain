/**
 * Mock ProfileEmbeddingService Implementation
 * 
 * This file provides a standardized mock implementation of the ProfileEmbeddingService
 * for use in tests across the codebase.
 */

import { mock } from 'bun:test';

import type { Profile } from '@/models/profile';
import type { ProfileEmbeddingService } from '@/services/profiles/profileEmbeddingService';
import { EmbeddingService as MockEmbeddingService } from '@test/__mocks__/resources/ai/embedding/embeddings';

/**
 * MockProfileEmbeddingService class with standardized interface
 * 
 * Follows the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */
export class MockProfileEmbeddingService implements Partial<ProfileEmbeddingService> {
  private static instance: MockProfileEmbeddingService | null = null;

  /**
   * Get singleton instance
   */
  public static getInstance(): ProfileEmbeddingService {
    if (!MockProfileEmbeddingService.instance) {
      MockProfileEmbeddingService.instance = new MockProfileEmbeddingService();
    }
    return MockProfileEmbeddingService.instance as unknown as ProfileEmbeddingService;
  }

  /**
   * Reset singleton instance
   */
  public static resetInstance(): void {
    MockProfileEmbeddingService.instance = null;
  }

  /**
   * Create fresh instance for isolated testing
   */
  public static createFresh(): ProfileEmbeddingService {
    return new MockProfileEmbeddingService() as unknown as ProfileEmbeddingService;
  }

  // Mock methods with default implementations
  getProfileTextForEmbedding = mock((_profile: Partial<Profile>): string => {
    return `Mock profile text for ${_profile.fullName || 'Unknown User'}`;
  });

  generateEmbedding = mock(async (_text: string): Promise<number[]> => {
    const service = MockEmbeddingService.createFresh();
    return await service.getEmbedding(_text);
  });

  generateEmbeddingForProfile = mock((): Promise<{ updated: boolean }> => {
    return Promise.resolve({ updated: true });
  });

  shouldRegenerateEmbedding = mock((_profile: Partial<Profile>): boolean => {
    // Check if profile updates contain fields that would require re-embedding
    const keyFields = ['fullName', 'summary', 'headline', 'occupation'];
    return Object.keys(_profile).some(key => keyFields.includes(key));
  });
}
