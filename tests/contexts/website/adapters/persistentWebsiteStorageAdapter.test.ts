/**
 * PersistentWebsiteStorageAdapter Tests
 */
import { beforeEach, describe, expect, mock, test } from 'bun:test';

import type { NoteStorageAdapter } from '@/contexts/notes/noteStorageAdapter';
import { LandingPageNoteAdapter } from '@/contexts/website/adapters/landingPageNoteAdapter';
import { PersistentWebsiteStorageAdapter } from '@/contexts/website/adapters/persistentWebsiteStorageAdapter';
import type { PersistentWebsiteStorageAdapterDependencies } from '@/contexts/website/adapters/persistentWebsiteStorageAdapter';
import type { WebsiteDataItem } from '@/contexts/website/adapters/websiteStorageAdapter';
import { MockNoteStorageAdapter } from '@test/__mocks__/contexts/noteStorageAdapter';
import { createTestLandingPageData } from '@test/helpers/websiteTestHelpers';

describe('PersistentWebsiteStorageAdapter', () => {
  // Reset instances before each test
  beforeEach(() => {
    PersistentWebsiteStorageAdapter.resetInstance();
    LandingPageNoteAdapter.resetInstance();
    MockNoteStorageAdapter.resetInstance();
  });

  test('should create a fresh instance with dependencies', () => {
    // Create mock LandingPageNoteAdapter
    const mockNoteStorage = MockNoteStorageAdapter.createFresh();
    const mockLandingPageAdapter = LandingPageNoteAdapter.createFresh({}, { 
      noteStorageAdapter: mockNoteStorage as unknown as NoteStorageAdapter, 
    });
    
    // Create adapter with the mock
    const adapter = PersistentWebsiteStorageAdapter.createFresh({}, { landingPageAdapter: mockLandingPageAdapter });
    
    expect(adapter).toBeInstanceOf(PersistentWebsiteStorageAdapter);
  });

  test('should throw error when creating without required dependencies', () => {
    expect(() => PersistentWebsiteStorageAdapter.createFresh({}, {} as unknown as PersistentWebsiteStorageAdapterDependencies)).toThrow(
      'LandingPageNoteAdapter is required',
    );
  });

  test('should initialize successfully', async () => {
    // Create mock LandingPageNoteAdapter
    const mockNoteStorage = MockNoteStorageAdapter.createFresh();
    const mockLandingPageAdapter = LandingPageNoteAdapter.createFresh({}, { 
      noteStorageAdapter: mockNoteStorage as unknown as NoteStorageAdapter, 
    });
    
    // Mock the getLandingPageData method
    const getLandingPageDataMock = mock(() => Promise.resolve(null));
    mockLandingPageAdapter.getLandingPageData = getLandingPageDataMock;
    
    // Create adapter with the mock
    const adapter = PersistentWebsiteStorageAdapter.createFresh({}, { landingPageAdapter: mockLandingPageAdapter });
    
    // Initialize the adapter
    await adapter.initialize();
    
    // Verify the adapter was initialized
    expect(adapter.isInitialized()).toBe(true);
    
    // Verify the landing page adapter was called
    expect(getLandingPageDataMock).toHaveBeenCalled();
  });

  test('should handle initialization errors gracefully', async () => {
    // Create mock LandingPageNoteAdapter that throws on getLandingPageData
    const mockNoteStorage = MockNoteStorageAdapter.createFresh();
    const mockLandingPageAdapter = LandingPageNoteAdapter.createFresh({}, { 
      noteStorageAdapter: mockNoteStorage as unknown as NoteStorageAdapter, 
    });
    
    // Mock the getLandingPageData method to throw an error
    mockLandingPageAdapter.getLandingPageData = mock(() => Promise.reject(new Error('Test error')));
    
    // Create adapter with the mock
    const adapter = PersistentWebsiteStorageAdapter.createFresh({}, { landingPageAdapter: mockLandingPageAdapter });
    
    // Initialize the adapter
    await adapter.initialize();
    
    // Verify the adapter was still marked as initialized despite the error
    expect(adapter.isInitialized()).toBe(true);
  });

  // Configuration methods have been moved to use config.ts directly
  // Config tests removed as getWebsiteConfig and updateWebsiteConfig no longer exist

  test('should return null for landing page data when not available', async () => {
    // Create mock LandingPageNoteAdapter
    const mockNoteStorage = MockNoteStorageAdapter.createFresh();
    const mockLandingPageAdapter = LandingPageNoteAdapter.createFresh({}, { 
      noteStorageAdapter: mockNoteStorage as unknown as NoteStorageAdapter, 
    });
    
    // Mock the getLandingPageData method
    mockLandingPageAdapter.getLandingPageData = mock(() => Promise.resolve(null));
    
    // Create adapter with the mock
    const adapter = PersistentWebsiteStorageAdapter.createFresh({}, { landingPageAdapter: mockLandingPageAdapter });
    
    // Get landing page data
    const data = await adapter.getLandingPageData();
    
    // Verify null is returned
    expect(data).toBeNull();
  });

  test('should save and retrieve landing page data', async () => {
    // Prepare landing page data
    const landingPageData = createTestLandingPageData();
    
    // Create mock LandingPageNoteAdapter
    const mockNoteStorage = MockNoteStorageAdapter.createFresh();
    const mockLandingPageAdapter = LandingPageNoteAdapter.createFresh({}, { 
      noteStorageAdapter: mockNoteStorage as unknown as NoteStorageAdapter, 
    });
    
    // Mock the saveLandingPageData method
    const saveLandingPageDataMock = mock(() => Promise.resolve(true));
    mockLandingPageAdapter.saveLandingPageData = saveLandingPageDataMock;
    
    // Mock the getLandingPageData method to return the data we save
    mockLandingPageAdapter.getLandingPageData = mock(() => Promise.resolve(landingPageData));
    
    // Create adapter with the mock
    const adapter = PersistentWebsiteStorageAdapter.createFresh({}, { landingPageAdapter: mockLandingPageAdapter });
    
    // Save landing page data
    await adapter.saveLandingPageData(landingPageData);
    
    // Verify the landing page adapter was called
    expect(saveLandingPageDataMock).toHaveBeenCalledWith(landingPageData);
    
    // Get landing page data
    const retrievedData = await adapter.getLandingPageData();
    
    // Verify the data is returned
    expect(retrievedData).toEqual(landingPageData);
  });

  test('should handle errors when saving landing page data', async () => {
    // Prepare landing page data
    const landingPageData = createTestLandingPageData();
    
    // Create mock LandingPageNoteAdapter
    const mockNoteStorage = MockNoteStorageAdapter.createFresh();
    const mockLandingPageAdapter = LandingPageNoteAdapter.createFresh({}, { 
      noteStorageAdapter: mockNoteStorage as unknown as NoteStorageAdapter, 
    });
    
    // Mock the saveLandingPageData method to return false (failure)
    mockLandingPageAdapter.saveLandingPageData = mock(() => Promise.resolve(false));
    
    // Create adapter with the mock
    const adapter = PersistentWebsiteStorageAdapter.createFresh({}, { landingPageAdapter: mockLandingPageAdapter });
    
    // Save landing page data
    await adapter.saveLandingPageData(landingPageData);
    
    // Verify the item was not added to the cache
    const items = await adapter.list();
    expect(items.find(i => i.id === 'landingPage')).toBeUndefined();
  });

  test('should create item and save landing page data', async () => {
    // Prepare landing page data
    const landingPageData = createTestLandingPageData();
    
    // Create mock LandingPageNoteAdapter
    const mockNoteStorage = MockNoteStorageAdapter.createFresh();
    const mockLandingPageAdapter = LandingPageNoteAdapter.createFresh({}, { 
      noteStorageAdapter: mockNoteStorage as unknown as NoteStorageAdapter, 
    });
    
    // Mock the saveLandingPageData method
    const saveLandingPageDataMock = mock(() => Promise.resolve(true));
    mockLandingPageAdapter.saveLandingPageData = saveLandingPageDataMock;
    
    // Create adapter with the mock
    const adapter = PersistentWebsiteStorageAdapter.createFresh({}, { landingPageAdapter: mockLandingPageAdapter });
    
    // Create a landing page item
    const item: Partial<WebsiteDataItem> = {
      id: 'landingPage',
      type: 'landingPage',
      data: landingPageData,
    };
    
    const id = await adapter.create(item);
    
    // Verify the item was created
    expect(id).toBe('landingPage');
    
    // Verify the landing page adapter was called
    expect(saveLandingPageDataMock).toHaveBeenCalledWith(landingPageData);
  });

  test('should update item and save landing page data', async () => {
    // Prepare landing page data
    const landingPageData = createTestLandingPageData();
    
    // Create mock LandingPageNoteAdapter
    const mockNoteStorage = MockNoteStorageAdapter.createFresh();
    const mockLandingPageAdapter = LandingPageNoteAdapter.createFresh({}, { 
      noteStorageAdapter: mockNoteStorage as unknown as NoteStorageAdapter, 
    });
    
    // Mock the methods
    mockLandingPageAdapter.getLandingPageData = mock(() => Promise.resolve(landingPageData));
    const saveLandingPageDataMock = mock(() => Promise.resolve(true));
    mockLandingPageAdapter.saveLandingPageData = saveLandingPageDataMock;
    
    // Create adapter with the mock
    const adapter = PersistentWebsiteStorageAdapter.createFresh({}, { landingPageAdapter: mockLandingPageAdapter });
    
    // Initialize to populate the cache
    await adapter.initialize();
    
    // Create initial item
    await adapter.create({
      id: 'landingPage',
      type: 'landingPage',
      data: landingPageData,
    });
    
    // Update with new data
    const updatedData = createTestLandingPageData({
      name: 'Updated User',
      title: 'Updated Title',
    });
    
    const success = await adapter.update('landingPage', {
      data: updatedData,
    });
    
    // Verify the update was successful
    expect(success).toBe(true);
    
    // Verify the landing page adapter was called
    expect(saveLandingPageDataMock).toHaveBeenCalledWith(updatedData);
  });

  test('should handle search criteria', async () => {
    // Prepare landing page data
    const landingPageData = createTestLandingPageData({
      name: 'Test User',
      title: 'Test Website',
    });
    
    // Create mock LandingPageNoteAdapter
    const mockNoteStorage = MockNoteStorageAdapter.createFresh();
    const mockLandingPageAdapter = LandingPageNoteAdapter.createFresh({}, { 
      noteStorageAdapter: mockNoteStorage as unknown as NoteStorageAdapter, 
    });
    
    // Mock the getLandingPageData method
    mockLandingPageAdapter.getLandingPageData = mock(() => Promise.resolve(landingPageData));
    
    // Create adapter with the mock
    const adapter = PersistentWebsiteStorageAdapter.createFresh({}, { landingPageAdapter: mockLandingPageAdapter });
    
    // Initialize to populate the cache
    await adapter.initialize();
    
    // Search by type
    const results = await adapter.search({ type: 'landingPage' });
    
    // Verify the search results
    expect(results.length).toBe(1);
    expect(results[0].type).toBe('landingPage');
    expect(results[0].data).toEqual(landingPageData);
    
    // Search by nested data property
    const nameResults = await adapter.search({ 'data.name': 'Test User' });
    
    // Verify the search results
    expect(nameResults.length).toBe(1);
    
    // Search by non-matching criteria
    const noResults = await adapter.search({ 'data.name': 'Non-existent User' });
    
    // Verify no results
    expect(noResults.length).toBe(0);
  });
});