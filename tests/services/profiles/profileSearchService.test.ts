/**
 * ProfileSearchService Tests
 * 
 * These tests verify that the ProfileSearchService properly uses the messaging
 * architecture for cross-context communication.
 */

import { beforeEach, describe, expect, test } from 'bun:test';

import type { Profile } from '@/models/profile';
import type { ContextMediator } from '@/protocol/messaging';
import { ProfileSearchService } from '@/services/profiles/profileSearchService';
import { MockLogger } from '@test/__mocks__/core/logger';
import { createTestNote } from '@test/__mocks__/models/note';
import { MockProfile } from '@test/__mocks__/models/profile';
import { MockContextMediator } from '@test/__mocks__/protocol/messaging/contextMediator';
import { MockProfileRepository } from '@test/__mocks__/repositories/profileRepository';
import { MockProfileEmbeddingService } from '@test/__mocks__/services/profiles/profileEmbeddingService';
import { MockProfileTagService } from '@test/__mocks__/services/profiles/profileTagService';
import { MockTextUtils } from '@test/__mocks__/utils/textUtils';

// Will be initialized in beforeEach
let mockProfile: Profile;

describe('ProfileSearchService', () => {
  let searchService: ProfileSearchService;
  let mockMediator: ContextMediator;

  beforeEach(async () => {
    // Reset all singletons
    ProfileSearchService.resetInstance();
    MockProfileRepository.resetInstance();
    MockProfileEmbeddingService.resetInstance();
    MockProfileTagService.resetInstance();
    MockContextMediator.resetInstance();

    // Initialize the mock profile
    mockProfile = await MockProfile.createDefault();

    // Create mediator with specific mock response data for note search
    mockMediator = MockContextMediator.createFresh({
      mockResponseData: {
        notes: [
          createTestNote({
            id: 'note-1',
            title: 'Related Note 1',
            tags: ['ecosystem-architecture', 'innovation'],
          }),
        ],
      },
    });

    searchService = ProfileSearchService.createFresh(
      { entityName: 'profile' },
      {
        repository: MockProfileRepository.createFresh([mockProfile]),
        embeddingService: MockProfileEmbeddingService.createFresh(),
        tagService: MockProfileTagService.createFresh(),
        mediator: mockMediator,
        logger: MockLogger.createFresh(),
        textUtils: MockTextUtils.createFresh(),
      },
    );
  });

  test('core functionality tests', () => {
    // Test singleton pattern
    const instance1 = ProfileSearchService.getInstance();
    const instance2 = ProfileSearchService.getInstance();

    expect(instance1).toBe(instance2);
    expect(instance1).toBeInstanceOf(ProfileSearchService);
  });

  test('search functionality with different scenarios', async () => {
    // Test all search scenarios with minimal assertions
    
    // Basic search cases just verify results are returned
    const semanticResults = await searchService.findRelatedNotes(5);
    expect(semanticResults.length).toBe(1);
    
    // Tags search - just verify it runs without error
    await searchService.findNotesWithSimilarTags(['typescript'], 5);
    
    // Error handling cases
    const serviceWithEmptyRepo = ProfileSearchService.createFresh(
      { entityName: 'profile' },
      {
        repository: MockProfileRepository.createFresh([]),
        embeddingService: MockProfileEmbeddingService.createFresh(),
        tagService: MockProfileTagService.createFresh(),
        mediator: mockMediator,
        logger: MockLogger.createFresh(),
        textUtils: MockTextUtils.createFresh(),
      },
    );
    
    // Check error handling with empty repository
    expect(await serviceWithEmptyRepo.findRelatedNotes(5)).toEqual([]);
    
    // Error handling with mediator errors
    (mockMediator as unknown as MockContextMediator)._configure({
      errorMode: { dataRequests: true },
    });
    
    expect(await searchService.findRelatedNotes(5)).toEqual([]);
  });
});
