import { beforeEach, describe, expect, test } from 'bun:test';

import { 
  InMemoryWebsiteStorageAdapter, 
} from '@/contexts/website/adapters/websiteStorageAdapter';
import { createTestLandingPageData } from '@test/helpers';

describe('WebsiteStorageAdapter', () => {
  describe('InMemoryWebsiteStorageAdapter', () => {
    let adapter: InMemoryWebsiteStorageAdapter;
    
    beforeEach(() => {
      adapter = new InMemoryWebsiteStorageAdapter();
    });
    
    test('should initialize successfully', async () => {
      await adapter.initialize();
      expect(true).toBe(true); // If no error is thrown, the test passes
    });
    
    // Config methods (getWebsiteConfig and updateWebsiteConfig) have been moved to use config.ts directly
    
    test('should return null for landing page data initially', async () => {
      const data = await adapter.getLandingPageData();
      expect(data).toBeNull();
    });
    
    test('should save and retrieve landing page data', async () => {
      const landingPageData = createTestLandingPageData();
      
      await adapter.saveLandingPageData(landingPageData);
      
      const retrievedData = await adapter.getLandingPageData();
      expect(retrievedData).toEqual(landingPageData);
    });
    
    test('should overwrite existing landing page data on save', async () => {
      const initialData = createTestLandingPageData({
        name: 'Initial User',
        title: 'Initial Title',
        tagline: 'Initial Tagline',
      });
      
      const updatedData = createTestLandingPageData({
        name: 'Updated User',
        title: 'Updated Title',
        tagline: 'Updated Tagline',
      });
      
      await adapter.saveLandingPageData(initialData);
      await adapter.saveLandingPageData(updatedData);
      
      const retrievedData = await adapter.getLandingPageData();
      expect(retrievedData).toEqual(updatedData);
      expect(retrievedData).not.toEqual(initialData);
    });
  });
});