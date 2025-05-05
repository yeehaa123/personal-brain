/**
 * LandingPageNoteAdapter Tests
 */
import { beforeEach, describe, expect, test } from 'bun:test';

import type { NoteStorageAdapter } from '@/contexts/notes/noteStorageAdapter';
import { LandingPageNoteAdapter } from '@/contexts/website/adapters/landingPageNoteAdapter';
import type { LandingPageNoteAdapterDependencies } from '@/contexts/website/adapters/landingPageNoteAdapter';
import type { Note } from '@/models/note';
import { MockNoteStorageAdapter } from '@test/__mocks__/contexts/noteStorageAdapter';
import { createTestNote } from '@test/__mocks__/models/note';
import { createTestLandingPageData } from '@test/helpers/websiteTestHelpers';

// Helper interface for testing
interface NoteData {
  id?: string;
  title?: string;
  content?: string;
  tags?: string[];
  source?: 'import' | 'conversation' | 'user-created' | 'landing-page';
}

describe('LandingPageNoteAdapter', () => {
  // Reset instances before each test
  beforeEach(() => {
    LandingPageNoteAdapter.resetInstance();
    MockNoteStorageAdapter.resetInstance();
  });

  test('should create a fresh instance with dependencies', () => {
    const mockNoteStorage = MockNoteStorageAdapter.createFresh();
    const adapter = LandingPageNoteAdapter.createFresh({}, { 
      noteStorageAdapter: mockNoteStorage as unknown as NoteStorageAdapter, 
    });
    
    expect(adapter).toBeInstanceOf(LandingPageNoteAdapter);
  });

  test('should throw error when creating without required dependencies', () => {
    expect(() => LandingPageNoteAdapter.createFresh({}, {} as unknown as LandingPageNoteAdapterDependencies)).toThrow(
      'NoteStorageAdapter is required',
    );
  });

  test('should return null when landing page note is not found', async () => {
    const mockNoteStorage = MockNoteStorageAdapter.createFresh();
    const adapter = LandingPageNoteAdapter.createFresh({}, { 
      noteStorageAdapter: mockNoteStorage as unknown as NoteStorageAdapter, 
    });
    
    const result = await adapter.getLandingPageData();
    expect(result).toBeNull();
  });

  test('should return landing page data when note exists', async () => {
    // Prepare landing page data
    const landingPageData = createTestLandingPageData({
      name: 'Test User',
      title: 'Custom Title',
    });
    
    // Create a mock note with landing page content
    const mockNote = createTestNote({
      id: 'website-landing-page',
      title: 'Website Landing Page Data',
      content: JSON.stringify(landingPageData),
      tags: ['website', 'landing-page'],
      source: 'landing-page',
    });
    
    // Create adapter with the mock note
    const mockNoteStorage = MockNoteStorageAdapter.createFresh([mockNote]);
    const adapter = LandingPageNoteAdapter.createFresh({}, { 
      noteStorageAdapter: mockNoteStorage as unknown as NoteStorageAdapter, 
    });
    
    // Get the landing page data
    const result = await adapter.getLandingPageData();
    
    // Verify the data
    expect(result).not.toBeNull();
    expect(result).toEqual(landingPageData);
    expect(result?.name).toBe('Test User');
    expect(result?.title).toBe('Custom Title');
  });

  test('should handle JSON parsing errors', async () => {
    // Create a mock note with invalid JSON content
    const mockNote = createTestNote({
      id: 'website-landing-page',
      title: 'Website Landing Page Data',
      content: '{ "invalid": "json',
      tags: ['website', 'landing-page'],
      source: 'landing-page',
    });
    
    // Create adapter with the mock note
    const mockNoteStorage = MockNoteStorageAdapter.createFresh([mockNote]);
    const adapter = LandingPageNoteAdapter.createFresh({}, { 
      noteStorageAdapter: mockNoteStorage as unknown as NoteStorageAdapter, 
    });
    
    // Get the landing page data
    const result = await adapter.getLandingPageData();
    
    // Verify the data is null due to JSON parse error
    expect(result).toBeNull();
  });

  test('should create a new note when saving landing page data for the first time', async () => {
    // Prepare landing page data
    const landingPageData = createTestLandingPageData();
    
    // Create mock storage with spy on create method
    const mockNoteStorage = MockNoteStorageAdapter.createFresh();
    
    // Add a spy to track the create call
    let createdNote: NoteData | null = null;
    mockNoteStorage.create = async (item: Partial<Note>) => {
      createdNote = item as NoteData;
      mockNoteStorage.notes.push(item as Note);
      return item.id || 'note-id';
    };
    
    const adapter = LandingPageNoteAdapter.createFresh({}, { 
      noteStorageAdapter: mockNoteStorage as unknown as NoteStorageAdapter, 
    });
    
    // Save landing page data
    const result = await adapter.saveLandingPageData(landingPageData);
    
    // Verify the note was created
    expect(result).toBe(true);
    
    // Check that the create method was called with correct data
    expect(createdNote).not.toBeNull();
    
    // Use type assertion to bypass TypeScript compilation errors
    const note = createdNote as unknown as NoteData;
    expect(note.id).toBe('website-landing-page');
    expect(note.title).toBe('Website Landing Page Data');
    expect(note.tags).toContain('website');
    expect(note.tags).toContain('landing-page');
    expect(note.source).toBe('landing-page');
    
    // Verify content was stored correctly
    expect(typeof note.content).toBe('string');
    const content = note.content as string;
    const parsedContent = JSON.parse(content);
    expect(parsedContent.title).toBe(landingPageData.title);
    expect(parsedContent.name).toBe(landingPageData.name);
  });

  test('should update existing note when saving landing page data', async () => {
    // Prepare initial landing page data
    const initialData = createTestLandingPageData({
      name: 'Initial User',
      title: 'Initial Title',
    });
    
    // Create a mock note with the initial data
    const mockNote = createTestNote({
      id: 'website-landing-page',
      title: 'Website Landing Page Data',
      content: JSON.stringify(initialData),
      tags: ['website', 'landing-page'],
      source: 'landing-page',
    });
    
    // Create adapter with the mock note
    const mockNoteStorage = MockNoteStorageAdapter.createFresh([mockNote]);
    const adapter = LandingPageNoteAdapter.createFresh({}, { 
      noteStorageAdapter: mockNoteStorage as unknown as NoteStorageAdapter, 
    });
    
    // Prepare updated landing page data
    const updatedData = createTestLandingPageData({
      name: 'Updated User',
      title: 'Updated Title',
    });
    
    // Save the updated landing page data
    const result = await adapter.saveLandingPageData(updatedData);
    
    // Verify the note was updated
    expect(result).toBe(true);
    
    // Check that the note was updated
    const updatedNote = await mockNoteStorage.read('website-landing-page');
    expect(updatedNote).not.toBeNull();
    
    if (updatedNote && typeof updatedNote.content === 'string') {
      // Parse the content and verify it matches the updated data
      const parsedContent = JSON.parse(updatedNote.content);
      expect(parsedContent.title).toBe('Updated Title');
      expect(parsedContent.name).toBe('Updated User');
      
      // Verify it no longer matches the initial data
      expect(parsedContent.title).not.toBe('Initial Title');
      expect(parsedContent.name).not.toBe('Initial User');
    } else {
      // This will fail the test if note content is not a string
      expect(updatedNote?.content).toBeTruthy();
    }
  });

  test('should handle errors when saving landing page data', async () => {
    // Create mock storage that throws an error on create
    const mockNoteStorage = MockNoteStorageAdapter.createFresh();
    mockNoteStorage.create = async () => { throw new Error('Test error'); };
    
    const adapter = LandingPageNoteAdapter.createFresh({}, { 
      noteStorageAdapter: mockNoteStorage as unknown as NoteStorageAdapter, 
    });
    
    // Try to save landing page data
    const landingPageData = createTestLandingPageData();
    const result = await adapter.saveLandingPageData(landingPageData);
    
    // Verify the operation failed
    expect(result).toBe(false);
  });

  test('should convert note to landing page data', () => {
    // Prepare landing page data
    const landingPageData = createTestLandingPageData({
      name: 'Test User',
      title: 'Test Title',
    });
    
    // Create a mock note with the data
    const mockNote = createTestNote({
      id: 'website-landing-page',
      title: 'Website Landing Page Data',
      content: JSON.stringify(landingPageData),
      tags: ['website', 'landing-page'],
      source: 'landing-page',
    });
    
    // Create adapter
    const mockNoteStorage = MockNoteStorageAdapter.createFresh();
    const adapter = LandingPageNoteAdapter.createFresh({}, { 
      noteStorageAdapter: mockNoteStorage as unknown as NoteStorageAdapter, 
    });
    
    // Convert note to landing page data
    const result = adapter.convertNoteToLandingPageData(mockNote);
    
    // Verify the conversion
    expect(result).not.toBeNull();
    expect(result?.name).toBe('Test User');
    expect(result?.title).toBe('Test Title');
  });

  test('should convert landing page data to note', () => {
    // Prepare landing page data
    const landingPageData = createTestLandingPageData({
      name: 'Test User',
      title: 'Test Title',
    });
    
    // Create adapter
    const mockNoteStorage = MockNoteStorageAdapter.createFresh();
    const adapter = LandingPageNoteAdapter.createFresh({}, { 
      noteStorageAdapter: mockNoteStorage as unknown as NoteStorageAdapter, 
    });
    
    // Convert landing page data to note
    const result = adapter.convertLandingPageDataToNote(landingPageData);
    
    // Verify the conversion
    expect(result.id).toBe('website-landing-page');
    expect(result.title).toBe('Website Landing Page Data');
    expect(result.tags).toContain('website');
    expect(result.tags).toContain('landing-page');
    expect(result.source).toBe('landing-page');
    
    // Parse the content and verify it matches the original data
    const parsedContent = JSON.parse(result.content || '{}');
    expect(parsedContent.title).toBe('Test Title');
    expect(parsedContent.name).toBe('Test User');
  });
});