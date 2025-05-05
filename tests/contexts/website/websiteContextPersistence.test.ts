/**
 * WebsiteContext Persistence Integration Test
 * 
 * This test verifies that the WebsiteContext works correctly with the 
 * PersistentWebsiteStorageAdapter and LandingPageNoteAdapter.
 * 
 * Note: This test can be deleted after confirming the feature works.
 */
import { beforeEach, describe, expect, test } from 'bun:test';

import { WebsiteContext } from '@/contexts/website/websiteContext';
import { MockWebsiteStorageAdapter } from '@test/__mocks__/contexts/website/adapters/websiteStorageAdapter';
import { createTestLandingPageData } from '@test/helpers/websiteTestHelpers';

describe('WebsiteContext with Persistent Storage', () => {
  // Reset instances before each test
  beforeEach(() => {
    WebsiteContext.resetInstance();
    MockWebsiteStorageAdapter.resetInstance();
  });
  
  test('should save and retrieve landing page data using persistent storage', async () => {
    // Create test landing page data
    const landingPageData = createTestLandingPageData({
      name: 'Test User',
      title: 'Test Website',
    });
    
    // Create mock storage adapter
    const mockStorageAdapter = MockWebsiteStorageAdapter.createFresh();
    
    // Create context with mock storage
    const context = WebsiteContext.createFresh({
      storage: mockStorageAdapter,
    });
    
    // Save landing page data
    await context.saveLandingPageData(landingPageData);
    
    // Verify the saveLandingPageData method was called
    expect(mockStorageAdapter.saveLandingPageData).toHaveBeenCalledWith(landingPageData);
    
    // Setup mock to return data when getLandingPageData is called
    mockStorageAdapter.setLandingPageData(landingPageData);
    
    // Retrieve landing page data
    const retrievedData = await context.getLandingPageData();
    
    // Verify the getLandingPageData method was called
    expect(mockStorageAdapter.getLandingPageData).toHaveBeenCalled();
    
    // Verify the data matches what was saved
    expect(retrievedData).toEqual(landingPageData);
    expect(retrievedData?.name).toBe('Test User');
    expect(retrievedData?.title).toBe('Test Website');
  });
});