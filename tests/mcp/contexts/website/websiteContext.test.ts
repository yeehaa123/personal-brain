import { WebsiteContext } from '@/mcp/contexts/website/core/websiteContext';
import { MockWebsiteStorageAdapter } from '@test/__mocks__/website/websiteStorageAdapter';
import type { LandingPageData } from '@/mcp/contexts/website/storage/websiteStorage';
import { beforeEach, afterEach, describe, test, expect } from 'bun:test';

describe('WebsiteContext', () => {
  // Set up and tear down for each test
  beforeEach(() => {
    // Reset singletons
    WebsiteContext.resetInstance();
    MockWebsiteStorageAdapter.resetInstance();
  });
  
  afterEach(() => {
    WebsiteContext.resetInstance();
    MockWebsiteStorageAdapter.resetInstance();
  });
  
  // Test Component Interface Standardization pattern
  test('getInstance should return a singleton instance', () => {
    const context1 = WebsiteContext.getInstance();
    const context2 = WebsiteContext.getInstance();
    
    expect(context1).toBe(context2);
  });
  
  test('createFresh should return a new instance', () => {
    const context1 = WebsiteContext.getInstance();
    const context2 = WebsiteContext.createFresh();
    
    expect(context1).not.toBe(context2);
  });
  
  test('resetInstance should clear the singleton instance', () => {
    const context1 = WebsiteContext.getInstance();
    WebsiteContext.resetInstance();
    const context2 = WebsiteContext.getInstance();
    
    expect(context1).not.toBe(context2);
  });
  
  // Test methods
  test('initialize should set readyState to true', async () => {
    const mockStorage = MockWebsiteStorageAdapter.createFresh();
    const context = WebsiteContext.createFresh({ storage: mockStorage });
    
    await context.initialize();
    
    expect(context.isReady()).toBe(true);
    expect(mockStorage.initialize).toHaveBeenCalled();
  });
  
  test('getConfig should return website configuration', async () => {
    const mockStorage = MockWebsiteStorageAdapter.createFresh();
    const context = WebsiteContext.createFresh({ storage: mockStorage });
    
    await context.getConfig();
    
    expect(mockStorage.getWebsiteConfig).toHaveBeenCalled();
  });
  
  test('updateConfig should update website configuration', async () => {
    const mockStorage = MockWebsiteStorageAdapter.createFresh();
    const context = WebsiteContext.createFresh({ storage: mockStorage });
    
    const updates = {
      title: 'Updated Title',
      author: 'Updated Author',
    };
    
    await context.updateConfig(updates);
    
    expect(mockStorage.updateWebsiteConfig).toHaveBeenCalledWith(updates);
  });
  
  test('saveLandingPageData should save landing page data', async () => {
    const mockStorage = MockWebsiteStorageAdapter.createFresh();
    const context = WebsiteContext.createFresh({ storage: mockStorage });
    
    const landingPageData: LandingPageData = {
      name: 'Test User',
      title: 'Test User - Personal Website',
      tagline: 'Web Developer',
    };
    
    await context.saveLandingPageData(landingPageData);
    
    expect(mockStorage.saveLandingPageData).toHaveBeenCalledWith(landingPageData);
  });
  
  test('getLandingPageData should retrieve landing page data', async () => {
    const mockStorage = MockWebsiteStorageAdapter.createFresh();
    mockStorage.setLandingPageData({
      name: 'Test User',
      title: 'Test User - Personal Website',
      tagline: 'Web Developer',
    });
    
    const context = WebsiteContext.createFresh({ storage: mockStorage });
    
    await context.getLandingPageData();
    
    expect(mockStorage.getLandingPageData).toHaveBeenCalled();
  });
  
  test('getStorage should return the storage adapter', () => {
    const mockStorage = MockWebsiteStorageAdapter.createFresh();
    const context = WebsiteContext.createFresh({ storage: mockStorage });
    
    expect(context.getStorage()).toBe(mockStorage);
  });
  
  test('setStorage should update the storage adapter', () => {
    const mockStorage1 = MockWebsiteStorageAdapter.createFresh();
    const mockStorage2 = MockWebsiteStorageAdapter.createFresh();
    
    const context = WebsiteContext.createFresh({ storage: mockStorage1 });
    context.setStorage(mockStorage2);
    
    expect(context.getStorage()).toBe(mockStorage2);
  });
  
  test('getContextName should return the configured name', () => {
    const context1 = WebsiteContext.createFresh();
    const context2 = WebsiteContext.createFresh({ name: 'custom-website' });
    
    expect(context1.getContextName()).toBe('website');
    expect(context2.getContextName()).toBe('custom-website');
  });
  
  test('getContextVersion should return the configured version', () => {
    const context1 = WebsiteContext.createFresh();
    const context2 = WebsiteContext.createFresh({ version: '2.0.0' });
    
    expect(context1.getContextVersion()).toBe('1.0.0');
    expect(context2.getContextVersion()).toBe('2.0.0');
  });
});