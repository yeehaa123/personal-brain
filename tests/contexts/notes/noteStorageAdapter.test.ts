import { beforeEach, describe, expect, test } from 'bun:test';

import { NoteStorageAdapter } from '@/contexts/notes/noteStorageAdapter';
import type { Note } from '@/models/note';
import { createMockNote } from '@test/__mocks__/models/note';
import { MockNoteRepository } from '@test/__mocks__/repositories/noteRepository';

describe('NoteStorageAdapter Behavior', () => {
  let adapter: NoteStorageAdapter;
  let mockRepo: MockNoteRepository;

  beforeEach(() => {
    // Set up a fresh mock repository with test data
    const testNotes = [
      createMockNote('note-1', 'Test Note', ['tag1']),
      createMockNote('note-2', 'JavaScript Tutorial', ['programming', 'javascript']),
      createMockNote('note-3', 'TypeScript Guide', ['programming', 'typescript']),
      createMockNote('note-4', 'React Basics', ['programming', 'react']),
      createMockNote('note-5', 'Vue Fundamentals', ['programming', 'vue']),
    ];
    
    mockRepo = MockNoteRepository.createFresh(testNotes);
    adapter = NoteStorageAdapter.createFresh({}, { repository: mockRepo });
  });

  describe('CRUD Operations', () => {
    test('creates new notes', async () => {
      const newNote = {
        title: 'New Test Note',
        content: 'Test content',
        tags: ['test'],
      };
      
      const noteId = await adapter.create(newNote);
      expect(noteId).toBeTruthy();
      
      // Verify the note was actually created
      const createdNote = await adapter.read(noteId);
      expect(createdNote).toBeDefined();
      expect(createdNote?.title).toBe(newNote.title);
    });
    
    test('reads existing notes', async () => {
      const note = await adapter.read('note-1');
      
      expect(note).toBeDefined();
      expect(note?.id).toBe('note-1');
      expect(note?.title).toBe('Test Note');
    });
    
    test('returns null for non-existent notes', async () => {
      const note = await adapter.read('non-existent');
      expect(note).toBeNull();
    });
    
    test('updates existing notes', async () => {
      // Update note
      const updates = { title: 'Updated Title', content: 'Updated content' };
      const success = await adapter.update('note-1', updates);
      expect(success).toBe(true);
      
      // Verify update
      const updatedNote = await adapter.read('note-1');
      expect(updatedNote?.title).toBe('Updated Title');
      expect(updatedNote?.content).toBe('Updated content');
    });
    
    test('fails to update non-existent notes', async () => {
      const success = await adapter.update('non-existent', { title: 'New Title' });
      expect(success).toBe(false);
    });
    
    test('deletes notes', async () => {
      // Verify note exists
      const noteBeforeDeletion = await adapter.read('note-1');
      expect(noteBeforeDeletion).toBeDefined();
      
      // Delete note
      const success = await adapter.delete('note-1');
      expect(success).toBe(true);
      
      // Verify deletion
      const noteAfterDeletion = await adapter.read('note-1');
      expect(noteAfterDeletion).toBeNull();
    });
  });

  describe('Search and Retrieval', () => {
    test('searches notes by keywords', async () => {
      const results = await adapter.search({ 
        query: 'JavaScript',
        limit: 5, 
      });
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(n => n.title.includes('JavaScript'))).toBe(true);
    });
    
    test('searches notes by tags', async () => {
      const results = await adapter.search({ 
        tags: ['programming'],
        limit: 5, 
      });
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(n => n.tags?.includes('programming'))).toBe(true);
    });
    
    test('searches by both keywords and tags', async () => {
      const results = await adapter.search({ 
        query: 'Script',
        tags: ['programming'],
        limit: 5, 
      });
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(n => 
        (n.title.toLowerCase().includes('script') || n.content.toLowerCase().includes('script')) &&
        n.tags?.includes('programming'),
      )).toBe(true);
    });
    
    test('lists recent notes when no search criteria', async () => {
      const results = await adapter.search({ limit: 2 });
      expect(results.length).toBeLessThanOrEqual(2);
    });
    
    test('retrieves notes with limitation', async () => {
      // Test that the list method respects the limit
      const page1 = await adapter.list({ limit: 2 });
      expect(page1.length).toBeLessThanOrEqual(2);
      
      const page2 = await adapter.list({ limit: 3 });
      expect(page2.length).toBeLessThanOrEqual(3);
      
      // Get all notes to verify total count
      const all = await adapter.list({ limit: 10 });
      expect(all.length).toBe(5); // We have 5 test notes
    });
  });

  describe('Additional Features', () => {
    test('counts total notes', async () => {
      // Add a test note to ensure count is greater than 0
      await adapter.create({
        title: 'Count Test Note',
        content: 'This note ensures count is > 0',
        embedding: [0.1, 0.2, 0.3],
      });
      
      const count = await adapter.count();
      expect(count).toBeGreaterThan(0);
    });
    
    test('finds notes by source', async () => {
      // Add a note with specific source
      await adapter.create({
        title: 'Conversation Note',
        content: 'From conversation',
        source: 'conversation',
      } as Partial<Note>);
      
      // Find by source
      const results = await adapter.findBySource('conversation', 10, 0);
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(n => n.source === 'conversation')).toBe(true);
    });
    
    test('handles repository errors gracefully', async () => {
      // Create adapter with error-throwing repository
      const errorRepo = MockNoteRepository.createFresh();
      errorRepo.getById = () => {
        throw new Error('Repository error');
      };
      
      const errorAdapter = NoteStorageAdapter.createFresh({}, { repository: errorRepo });
      
      // Should handle error and return null
      const result = await errorAdapter.read('any-id');
      expect(result).toBeNull();
    });
  });
});