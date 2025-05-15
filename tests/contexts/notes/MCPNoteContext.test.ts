/**
 * Tests for MCPNoteContext
 * 
 * These tests focus purely on behavior rather than implementation details.
 * The goal is to verify WHAT the context does, not HOW it does it.
 */
import { beforeEach, describe, expect, test } from 'bun:test';

import { MCPNoteContext } from '@/contexts/notes/MCPNoteContext';
import type { McpServer } from '@/mcpServer';
import type { Note } from '@/models/note';
import { createMockNote } from '@test/__mocks__/models/note';
import { MockNoteRepository } from '@test/__mocks__/repositories/noteRepository';
import { MockNoteEmbeddingService } from '@test/__mocks__/services/notes/noteEmbeddingService';
import { MockNoteSearchService } from '@test/__mocks__/services/notes/noteSearchService';

/**
 * Creates a note context with predefined notes for testing
 */
function createTestableNoteContext(notes: Note[] = []) {
  // Create test components with dependencies
  // Pass notes directly to the constructor instead of using setNotes
  const repository = MockNoteRepository.createFresh(notes);
  
  const embeddingService = MockNoteEmbeddingService.createFresh();
  const searchService = MockNoteSearchService.createFresh();
  
  // Create clean context for this test with proper dependencies
  const context = MCPNoteContext.createFresh(
    { name: 'TestNoteBrain', version: '0.1.0' },
    { repository, embeddingService, searchService },
  );
  
  return { context, repository, embeddingService, searchService };
}

describe('Note Management System', () => {
  beforeEach(() => {
    // Always start with a clean state
    MCPNoteContext.resetInstance();
  });

  describe('System Status', () => {
    test('provides status information', async () => {
      const { context } = createTestableNoteContext();
      
      // Should initialize successfully
      await context.initialize();
      
      // Should provide status info
      const status = context.getStatus();
      
      // Status should contain basic information
      expect(status).toBeDefined();
      expect(typeof status.name).toBe('string');
      expect(typeof status.version).toBe('string');
      expect(typeof status.ready).toBe('boolean');
      expect(status.ready).toBe(true);
    });
  });

  describe('Creating and Retrieving Notes', () => {
    test('can create a note and retrieve it by ID', async () => {
      const { context } = createTestableNoteContext();
      
      // Create a new note
      const newNote = {
        title: 'Important Note',
        content: 'This is important information',
        tags: ['important', 'test'],
      };
      
      // Create should return an ID
      const noteId = await context.createNote(newNote);
      expect(typeof noteId).toBe('string');
      
      // Should be able to retrieve the note by ID
      const retrievedNote = await context.getNoteById(noteId);
      
      // Note should exist and have expected properties
      expect(retrievedNote).toBeDefined();
      if (retrievedNote) { // TypeScript guard
        expect(retrievedNote.title).toBe('Important Note');
        expect(retrievedNote.tags).toContain('important');
      }
    });
    
    test('returns null/undefined when retrieving non-existent note', async () => {
      const { context } = createTestableNoteContext();
      
      // Should handle non-existent notes gracefully
      const result = await context.getNoteById('non-existent-id');
      expect(result == null).toBe(true);
    });
  });

  describe('Updating Notes', () => {
    test('can update note properties', async () => {
      // Create initial test data
      const initialNote = createMockNote(
        'update-test-id', 
        'Initial Title', 
        ['original'],
      );
      
      const { context, repository } = createTestableNoteContext([initialNote]);
      
      // Update the note
      const updateResult = await context.updateNote('update-test-id', {
        title: 'Updated Title',
        tags: ['updated', 'modified'],
      });
      
      // Update should be successful
      expect(updateResult).toBe(true);
      
      // Repository should have the updated note
      const updatedNote = await repository.getNoteById('update-test-id');
      expect(updatedNote).toBeDefined();
      expect(updatedNote?.title).toBe('Updated Title');
      expect(updatedNote?.tags).toContain('updated');
    });
  });

  describe('Deleting Notes', () => {
    test('can delete notes by ID', async () => {
      // Create test note
      const testNote = createMockNote('delete-test-id', 'Note To Delete');
      const { context, repository } = createTestableNoteContext([testNote]);
      
      // Delete the note
      const deleteResult = await context.deleteNote('delete-test-id');
      
      // Delete should be successful
      expect(deleteResult).toBe(true);
      
      // Repository should no longer have the note
      const deletedNote = await repository.getNoteById('delete-test-id');
      expect(deletedNote).toBeUndefined();
    });
  });

  describe('Note Searching and Querying', () => {
    test('can retrieve most recent notes', async () => {
      // Create test data with multiple notes
      const testNotes = [
        createMockNote('note-1', 'First Note'),
        createMockNote('note-2', 'Second Note'),
        createMockNote('note-3', 'Third Note'),
        createMockNote('note-4', 'Fourth Note'),
        createMockNote('note-5', 'Fifth Note'),
      ];
      
      const { context } = createTestableNoteContext(testNotes);
      
      // Get recent notes with limit
      const recentNotes = await context.getRecentNotes(3);
      
      // Should respect the limit
      expect(recentNotes.length).toBe(3);
    });
    
    test('can search notes with query criteria', async () => {
      const { context } = createTestableNoteContext();
      
      // The mock search service will return results by default
      // No need to set up explicit expectations
      
      // Search with criteria
      const searchCriteria = {
        query: 'important information',
        tags: ['work'],
        limit: 10,
      };
      
      const results = await context.searchNotes(searchCriteria);
      
      // Should return search results
      expect(Array.isArray(results)).toBe(true);
      // MockNoteSearchService returns 'limit' notes
      expect(results.length).toBe(10);
    });
    
    test('can find semantically related notes', async () => {
      const { context } = createTestableNoteContext();
      
      // The mock search service will return related notes by default
      // No need to set up explicit expectations
      
      // Get related notes
      const relatedNotes = await context.getRelatedNotes('source-id', 2);
      
      // Should return related notes
      expect(Array.isArray(relatedNotes)).toBe(true);
      expect(relatedNotes.length).toBe(2);
    });
  });

  describe('Integration with MCP Framework', () => {
    test('registers resources and tools with MCP server', () => {
      const { context } = createTestableNoteContext();
      
      // Track registrations
      let resourcesRegistered = 0;
      let toolsRegistered = 0;
      
      // Create mock server
      const mockServer = {
        resource: () => { resourcesRegistered++; return true; },
        tool: () => { toolsRegistered++; return true; },
      };
      
      // Register with server with proper type casting
      const registered = context.registerOnServer(mockServer as unknown as McpServer);
      
      // Should successfully register
      expect(registered).toBe(true);
      expect(resourcesRegistered).toBeGreaterThan(0);
      expect(toolsRegistered).toBeGreaterThan(0);
    });
    
    test('provides capabilities metadata', () => {
      const { context } = createTestableNoteContext();
      
      // Get capabilities
      const capabilities = context.getCapabilities();
      
      // Should include expected capability information
      expect(capabilities).toBeDefined();
      expect(Array.isArray(capabilities.resources)).toBe(true);
      expect(Array.isArray(capabilities.tools)).toBe(true);
      
      // At least one resource and tool should be defined
      expect(capabilities.resources.length).toBeGreaterThan(0);
      expect(capabilities.tools.length).toBeGreaterThan(0);
    });
  });
});