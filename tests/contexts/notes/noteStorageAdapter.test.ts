/**
 * Tests for NoteStorageAdapter
 */
import { beforeEach, describe, expect, mock, test } from 'bun:test';

import { NoteStorageAdapter } from '@/contexts/notes/noteStorageAdapter';
import type { Note } from '@/models/note';
import type { NoteRepository } from '@/services/notes/noteRepository'; import { createMockNote } from '@test/__mocks__/models/note';
import { MockNoteRepository } from '@test/__mocks__/repositories/noteRepository';

// Create mock notes for testing
const mockNotes = [createMockNote('note-1', 'Test Note')];

// Create a mock repository instance that will be reset for each test
const mockRepository = MockNoteRepository.createFresh(mockNotes);

describe('NoteStorageAdapter', () => {
  // Create an instance of the adapter with the mock repository
  let adapter: NoteStorageAdapter;

  beforeEach(() => {
    // Reset mock repository instance
    MockNoteRepository.resetInstance();

    // Re-initialize with test data
    mockRepository.notes = [...mockNotes];

    // Create a new adapter for each test
    adapter = new NoteStorageAdapter(mockRepository as unknown as NoteRepository);
  });

  test('create should call repository insertNote', async () => {
    // Create a new mock repository for this test
    const mockRepo = MockNoteRepository.createFresh([]);

    // Spy on the method
    const insertNoteSpy = mock(() => Promise.resolve('note-1'));
    mockRepo.insertNote = insertNoteSpy;

    // Create adapter with the configured mock
    const testAdapter = new NoteStorageAdapter(mockRepo as unknown as NoteRepository);

    // Call the create method
    const note = { title: 'Test Note', content: 'Test content' } as Partial<Note>;
    await testAdapter.create(note);

    // Verify the insertNote method was called
    expect(insertNoteSpy).toHaveBeenCalled();
  });

  test('read should call repository getNoteById', async () => {
    // Create a new mock repository for this test
    const mockRepo = MockNoteRepository.createFresh([]);

    // Spy on the method
    const getNoteByIdSpy = mock(() => Promise.resolve(createMockNote('note-1', 'Test Note')));
    mockRepo.getNoteById = getNoteByIdSpy;

    // Create adapter with the configured mock
    const testAdapter = new NoteStorageAdapter(mockRepo as unknown as NoteRepository);

    // Call the read method
    await testAdapter.read('note-1');

    // Verify the getNoteById method was called with the correct ID
    expect(getNoteByIdSpy).toHaveBeenCalledWith('note-1');
  });

  test('read should return null for non-matching ID', async () => {
    // Create a new mock repository for this test
    const mockRepo = MockNoteRepository.createFresh([]);

    // Mock getNoteById to return undefined (not found)
    mockRepo.getNoteById = mock(() => Promise.resolve(undefined));

    // Create adapter with the configured mock
    const testAdapter = new NoteStorageAdapter(mockRepo as unknown as NoteRepository);

    // Call the read method
    const result = await testAdapter.read('non-existent');

    // Verify the result is null (adapter converts undefined to null)
    expect(result).toBeNull();
  });

  test('update should call repository getById and insert', async () => {
    const updates = { title: 'Updated Title' };

    // Create a new mock repository for this test
    const mockRepo = MockNoteRepository.createFresh([createMockNote('note-1', 'Test Note')]);

    // Spy on the methods
    const getByIdSpy = mock(() => Promise.resolve(createMockNote('note-1', 'Test Note')));
    const insertSpy = mock(() => Promise.resolve(createMockNote('note-1', 'Updated Title')));

    mockRepo.getById = getByIdSpy;
    mockRepo.insert = insertSpy;

    // Create adapter with the configured mock
    const testAdapter = new NoteStorageAdapter(mockRepo as unknown as NoteRepository);

    // Call the update method
    await testAdapter.update('note-1', updates);

    // Verify the correct methods were called
    expect(getByIdSpy).toHaveBeenCalledWith('note-1');
    expect(insertSpy).toHaveBeenCalled();
  });

  test('delete should call repository deleteById', async () => {
    // Create a new mock repository for this test
    const mockRepo = MockNoteRepository.createFresh([createMockNote('note-1', 'Test Note')]);

    // Spy on the method
    const deleteByIdSpy = mock(() => Promise.resolve(true));
    mockRepo.deleteById = deleteByIdSpy;

    // Create adapter with the configured mock
    const testAdapter = new NoteStorageAdapter(mockRepo as unknown as NoteRepository);

    // Call the delete method
    await testAdapter.delete('note-1');

    // Verify the correct method was called
    expect(deleteByIdSpy).toHaveBeenCalledWith('note-1');
  });

  test('search should call repository searchNotesByKeywords with query and tags', async () => {
    // Create a new mock repository for this test
    const mockRepo = MockNoteRepository.createFresh([]);

    // Spy on the method
    const searchSpy = mock(() => Promise.resolve([createMockNote('note-2', 'JavaScript Test', ['tag1'])]));
    mockRepo.searchNotesByKeywords = searchSpy;

    // Create adapter with the configured mock
    const testAdapter = new NoteStorageAdapter(mockRepo as unknown as NoteRepository);

    // Call the search method
    const criteria = { query: 'javascript', tags: ['tag1'], limit: 5 };
    await testAdapter.search(criteria);

    // Verify the searchNotesByKeywords method was called with the correct arguments
    expect(searchSpy).toHaveBeenCalledWith('javascript', ['tag1'], 5, undefined);
  });

  test('search should fall back to list when no query or tags', async () => {
    // Create a new mock repository for this test
    const mockRepo = MockNoteRepository.createFresh([]);

    // Spy on the method
    const getRecentNotesSpy = mock(() => Promise.resolve([createMockNote('note-1', 'Test Note')]));
    mockRepo.getRecentNotes = getRecentNotesSpy;

    // Create adapter with the configured mock
    const testAdapter = new NoteStorageAdapter(mockRepo as unknown as NoteRepository);

    // Call the search method without query or tags
    const criteria = { limit: 5 };
    await testAdapter.search(criteria);

    // Verify the getRecentNotes method was called
    expect(getRecentNotesSpy).toHaveBeenCalledWith(5);
  });

  test('list should call repository getRecentNotes', async () => {
    // Create a new mock repository for this test
    const mockRepo = MockNoteRepository.createFresh([]);

    // Spy on the method
    const getRecentNotesSpy = mock(() => Promise.resolve([createMockNote('note-1', 'Test Note')]));
    mockRepo.getRecentNotes = getRecentNotesSpy;

    // Create adapter with the configured mock
    const testAdapter = new NoteStorageAdapter(mockRepo as unknown as NoteRepository);

    // Call the list method
    const options = { limit: 20 };
    await testAdapter.list(options);

    // Verify the getRecentNotes method was called with the correct limit
    expect(getRecentNotesSpy).toHaveBeenCalledWith(20);
  });

  test('count should call repository getNoteCount', async () => {
    // Create a new mock repository for this test
    const mockRepo = MockNoteRepository.createFresh([]);

    // Spy on the method
    const getNoteCountSpy = mock(() => Promise.resolve(3));
    mockRepo.getNoteCount = getNoteCountSpy;

    // Create adapter with the configured mock
    const testAdapter = new NoteStorageAdapter(mockRepo as unknown as NoteRepository);

    // Call the count method
    await testAdapter.count();

    // Verify the getNoteCount method was called
    expect(getNoteCountSpy).toHaveBeenCalled();
  });

  test('findBySource should call repository findBySource', async () => {
    // Create a new mock repository for this test
    const mockRepo = MockNoteRepository.createFresh([]);

    // Spy on the method
    const findBySourceSpy = mock(() => Promise.resolve([createMockNote('note-2', 'Conversation Note')]));
    mockRepo.findBySource = findBySourceSpy;

    // Create adapter with the configured mock
    const testAdapter = new NoteStorageAdapter(mockRepo as unknown as NoteRepository);

    // Call the findBySource method
    await testAdapter.findBySource('conversation', 5, 0);

    // Verify the findBySource method was called with the correct arguments
    expect(findBySourceSpy).toHaveBeenCalledWith('conversation', 5, 0);
  });

  test('adapter should handle repository errors gracefully', async () => {
    // Create a new mock repository for this test
    const mockRepo = MockNoteRepository.createFresh([]);

    // Mock getNoteById to throw an error
    mockRepo.getNoteById = mock(() => {
      throw new Error('Repository error');
    });

    // Create adapter with the configured mock
    const testAdapter = new NoteStorageAdapter(mockRepo as unknown as NoteRepository);

    // Call the read method - should handle the error and return null
    const result = await testAdapter.read('note-1');

    // Verify the error was handled gracefully
    expect(result).toBeNull();
  });

  test('getRepository should return the repository instance', () => {
    const result = adapter.getRepository();
    expect(result).toBe(mockRepository as unknown as NoteRepository);
  });
});
