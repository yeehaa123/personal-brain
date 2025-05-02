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
    
    test('should return default config when no updates have been made', async () => {
      const config = await adapter.getWebsiteConfig();
      
      expect(config).toEqual({
        title: 'Personal Brain',
        description: 'My personal website',
        author: 'Anonymous',
        baseUrl: 'http://localhost:4321',
        astroProjectPath: 'src/website',
        deployment: {
          type: 'local-dev',
          previewPort: 4321,
          livePort: 4322,
        },
      });
    });
    
    test('should update config and return updated values', async () => {
      const updates = {
        title: 'Updated Title',
        author: 'Updated Author',
      };
      
      const updatedConfig = await adapter.updateWebsiteConfig(updates);
      
      expect(updatedConfig.title).toBe('Updated Title');
      expect(updatedConfig.author).toBe('Updated Author');
      
      // Verify persistence between calls
      const retrievedConfig = await adapter.getWebsiteConfig();
      expect(retrievedConfig).toEqual(updatedConfig);
    });
    
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