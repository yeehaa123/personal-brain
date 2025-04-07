/**
 * Tests for NoteStorageAdapter
 */
import { beforeEach, describe, expect, mock, test } from 'bun:test';

import { NoteStorageAdapter } from '@/mcp/contexts/notes/adapters/noteStorageAdapter';
import type { Note } from '@/models/note';
import type { NoteRepository } from '@/services/notes/noteRepository';
import { createMockNote } from '@test/__mocks__/models/note';

describe('NoteStorageAdapter', () => {
  // Mock the logger and log functions to prevent console noise during tests
  beforeEach(() => {
    // Mock is applied at the module level in tests/setup.ts
  });

  // Create a mock repository
  const mockRepository = {
    getNoteById: mock(() => Promise.resolve(createMockNote('note-1', 'Test Note'))),
    insertNote: mock(() => Promise.resolve('note-1')),
    // For the update we'll use a different approach since updateNote doesn't exist
    getById: mock(() => Promise.resolve(createMockNote('note-1', 'Test Note'))),
    insert: mock(() => Promise.resolve()),
    deleteById: mock(() => Promise.resolve(true)),
    searchNotesByKeywords: mock(() => Promise.resolve([createMockNote('note-1', 'Test Note')])),
    getRecentNotes: mock((limit) => Promise.resolve([createMockNote('note-1', 'Test Note')].slice(0, limit))),
    getNoteCount: mock(() => Promise.resolve(10)),
    findBySource: mock(() => Promise.resolve([createMockNote('note-1', 'Test Note')])),
  } as unknown as NoteRepository;

  // Create an instance of the adapter with the mock repository
  const adapter = new NoteStorageAdapter(mockRepository);

  test('create should call repository insertNote', async () => {
    const note = { title: 'Test Note', content: 'Test content' } as Partial<Note>;
    const result = await adapter.create(note);
    
    expect(mockRepository.insertNote).toHaveBeenCalled();
    expect(result).toBe('note-1');
  });

  test('read should retrieve note by ID', async () => {
    const result = await adapter.read('note-1');
    
    expect(mockRepository.getNoteById).toHaveBeenCalledWith('note-1');
    expect(result).toEqual(createMockNote('note-1', 'Test Note'));
  });

  test('read should return null for non-matching ID', async () => {
    // Override the mock to return undefined
    mockRepository.getNoteById = mock(() => Promise.resolve(undefined));
    
    const result = await adapter.read('non-existent');
    
    expect(result).toBeNull();
  });

  test('update should call repository getById and insert', async () => {
    const updates = { title: 'Updated Title' };
    const result = await adapter.update('note-1', updates);
    
    // Should first retrieve the note
    expect(mockRepository.getById).toHaveBeenCalledWith('note-1');
    
    // Then insert the updated version
    expect(mockRepository.insert).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  test('delete should call repository deleteById', async () => {
    const result = await adapter.delete('note-1');
    
    expect(mockRepository.deleteById).toHaveBeenCalledWith('note-1');
    expect(result).toBe(true);
  });

  test('search should call repository searchNotesByKeywords with query and tags', async () => {
    const criteria = { query: 'test', tags: ['tag1', 'tag2'], limit: 5 };
    const result = await adapter.search(criteria);
    
    expect(mockRepository.searchNotesByKeywords).toHaveBeenCalledWith('test', ['tag1', 'tag2'], 5, undefined);
    expect(result).toEqual([createMockNote('note-1', 'Test Note')]);
  });

  test('search should fall back to list when no query or tags', async () => {
    const criteria = { limit: 5 };
    await adapter.search(criteria);
    
    // Should call getRecentNotes instead of searchNotesByKeywords
    expect(mockRepository.getRecentNotes).toHaveBeenCalledWith(5);
  });

  test('list should call repository getRecentNotes', async () => {
    const options = { limit: 20 };
    const result = await adapter.list(options);
    
    expect(mockRepository.getRecentNotes).toHaveBeenCalledWith(20);
    expect(result).toEqual([createMockNote('note-1', 'Test Note')]);
  });

  test('count should call repository getNoteCount', async () => {
    const result = await adapter.count();
    
    expect(mockRepository.getNoteCount).toHaveBeenCalled();
    expect(result).toBe(10);
  });

  test('findBySource should call repository findBySource', async () => {
    const result = await adapter.findBySource('import', 5, 0);
    
    expect(mockRepository.findBySource).toHaveBeenCalledWith('import', 5, 0);
    expect(result).toEqual([createMockNote('note-1', 'Test Note')]);
  });

  test('adapter should handle repository errors gracefully', async () => {
    // Override a method to throw
    mockRepository.getNoteById = mock(() => { throw new Error('Repository error'); });
    
    // Should return null instead of throwing
    const result = await adapter.read('note-1');
    expect(result).toBeNull();
  });

  test('getRepository should return the repository instance', () => {
    const result = adapter.getRepository();
    expect(result).toBe(mockRepository);
  });
});