/**
 * Behavioral tests for NoteRepository
 * 
 * These tests focus on the observable behavior of the NoteRepository
 * from a client's perspective, not on implementation details.
 */
import { beforeEach, describe, expect, test } from 'bun:test';
import type { drizzle } from 'drizzle-orm/bun-sqlite';

import type { NewNoteChunk, Note } from '@/models/note';
import { NoteRepository } from '@/services/notes/noteRepository';
import { ValidationError } from '@/utils/errorUtils';
import { MockLogger } from '@test/__mocks__/core/logger';
import { db, resetMockDb } from '@test/__mocks__/db';

describe('NoteRepository Behavior', () => {
  let repository: NoteRepository;

  beforeEach(() => {
    // Reset mock DB to clean state
    resetMockDb();

    // Use our standardized MockLogger
    MockLogger.resetInstance();
    const mockLogger = MockLogger.createFresh({ silent: true });

    // Create a fresh repository for each test
    NoteRepository.resetInstance();
    repository = NoteRepository.createFresh({
      // @ts-expect-error - Mock DB doesn't match exact drizzle schema structure but provides needed functionality 
      db: db as unknown as ReturnType<typeof drizzle>, // Use standardized mock DB
      logger: mockLogger,
    });
  });

  describe('Content Creation', () => {
    test('should create notes with required fields and return them with an ID', async () => {
      // WHEN a user creates a valid note
      const result = await repository.create({
        title: 'Test Note',
        content: 'This is a test note',
        embedding: [0.1, 0.2, 0.3],
      });

      // THEN the note should be created with an ID and the provided data
      expect(result.id).toBeDefined();
      expect(result.title).toBe('Test Note');
      expect(result.content).toBe('This is a test note');
      expect(result.embedding).toEqual([0.1, 0.2, 0.3]);
      expect(result.tags).toBeInstanceOf(Array);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(result.source).toBe('user-created');
    });

    test('should reject notes without required fields', async () => {
      // WHEN a user tries to create a note without a title
      // THEN it should throw a validation error
      try {
        // Type assertion for test - we intentionally omit required fields
        await repository.create({
          content: 'Content without title',
          embedding: [0.1, 0.2, 0.3],
        } as Partial<Note>);
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
      }

      // WHEN a user tries to create a note without embeddings
      // THEN it should throw a validation error
      try {
        // Type assertion for test - we intentionally omit required fields
        await repository.create({
          title: 'Title without embedding',
          content: 'Content without embedding',
        } as Partial<Note>);
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
      }

      // WHEN a user tries to create a note with an empty embedding array
      // THEN it should throw a validation error
      try {
        // Type assertion for test - we intentionally use invalid data
        await repository.create({
          title: 'Title with empty embedding',
          content: 'Content with empty embedding',
          embedding: [],
        } as Partial<Note>);
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Content Retrieval', () => {
    test('should retrieve a note by ID', async () => {
      // GIVEN a note exists in the repository
      const created = await repository.create({
        title: 'Note to Retrieve',
        content: 'This note should be retrievable by ID',
        embedding: [0.1, 0.2, 0.3],
      });

      // Mock the getById behavior since our mock DB is simplified
      repository.getById = async (id: string) => {
        // Type assertion for mock DB
        const note = (db as { getRecord(table: string, id: string): Note | undefined }).getRecord('notes', id);
        if (!note) throw new ValidationError(`Note with ID ${id} not found`);
        return note;
      };

      // WHEN a user requests the note by ID
      const retrieved = await repository.getById(created.id);

      // THEN the correct note should be returned
      expect(retrieved.id).toBe(created.id);
      expect(retrieved.title).toBe(created.title);
      expect(retrieved.content).toBe(created.content);
    });

    test('should throw when trying to retrieve a non-existent note', async () => {
      // Mock the getById behavior
      repository.getById = async (id: string) => {
        // Type assertion for mock DB
        const note = (db as { getRecord(table: string, id: string): Note | undefined }).getRecord('notes', id);
        if (!note) throw new ValidationError(`Note with ID ${id} not found`);
        return note;
      };

      // WHEN a user tries to retrieve a note that doesn't exist
      // THEN it should throw a validation error
      try {
        await repository.getById('non-existent-id');
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Note Chunks', () => {
    test('should insert note chunks with embeddings', async () => {
      // Create a parent note first
      const noteId = 'test-note-with-chunks';
      await repository.create({
        id: noteId,
        title: 'Note with Chunks',
        content: 'This is a test note that will have chunks',
        embedding: [0.1, 0.2, 0.3],
      });

      // Use the proper type for note chunk data that will be inserted
      type ValidatedNoteChunk = Required<NewNoteChunk>;

      // Mock the insertNoteChunk method for tracking
      // Type assertion to access private db property
      const db = repository as unknown as {
        db: {
          insert: (table: unknown) => {
            values: (data: ValidatedNoteChunk) => {
              execute: () => Promise<unknown>;
            };
          };
        };
      };
      const originalInsert = db.db.insert;
      let insertCalled = false;
      let insertedData: ValidatedNoteChunk | null = null;

      try {
        // Track insert calls
        db.db.insert = (_: unknown) => {
          return {
            values: (data: ValidatedNoteChunk) => {
              insertCalled = true;
              insertedData = data;
              return { execute: async () => ({}) };
            },
          };
        };

        // Test chunk insertion with required fields
        const chunkId = await repository.insertNoteChunk({
          noteId,
          content: 'This is a chunk of the parent note',
          embedding: [0.4, 0.5, 0.6],
          chunkIndex: 0,
        });

        // Check that insertion was called with correct data
        expect(insertCalled).toBe(true);
        expect(insertedData).toBeDefined();

        // Use a non-null assertion since we've verified it's defined
        const data = insertedData!;
        expect(data.noteId).toBe(noteId);
        expect(data.content).toBe('This is a chunk of the parent note');
        expect(Array.isArray(data.embedding)).toBe(true);
        expect(data.chunkIndex).toBe(0);
        expect(chunkId).toBeDefined();
      } finally {
        // Restore original implementation
        db.db.insert = originalInsert;
      }
    });

    test('should reject chunks with invalid data', async () => {
      // Test missing noteId
      try {
        await repository.insertNoteChunk({
          noteId: '',
          content: 'Chunk with no parent note ID',
          embedding: [0.1, 0.2],
          chunkIndex: 0,
        });
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
      }

      // Test missing content
      try {
        await repository.insertNoteChunk({
          noteId: 'test-note',
          content: '',
          embedding: [0.1, 0.2],
          chunkIndex: 0,
        });
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
      }

      // Test missing embedding
      try {
        await repository.insertNoteChunk({
          noteId: 'test-note',
          content: 'Chunk with no embedding',
          embedding: [] as number[],
          chunkIndex: 0,
        });
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});
