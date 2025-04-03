/**
 * Tests for BaseRepository
 */
import { describe, test, expect, beforeAll, mock, afterAll } from 'bun:test';
import { BaseRepository } from '@/services/BaseRepository';
import { db } from '@/db';
import { DatabaseError, ValidationError } from '@/utils/errorUtils';
import logger from '@/utils/logger';
import { mockLogger, restoreLogger } from '../mocks';
import type { SQLiteTable, SQLiteColumn } from 'drizzle-orm/sqlite-core';

// Create a mock table with the minimum interface we need
const mockTable = {
  id: { name: 'id', tableName: 'test' }
} as unknown as SQLiteTable;

// Create a mock column object for the id column
const mockIdColumn = { name: 'id', tableName: 'test' } as unknown as SQLiteColumn;

// Mock the db module
mock.module('@/db', () => ({
  db: {
    select: mock(() => ({ from: mock(() => ({ where: mock(() => ({ limit: mock(() => [{ id: 'test-id', value: 'test' }]) })) })) })),
    delete: mock(() => ({ where: mock(() => Promise.resolve()) })),
  }
}));

// Implementation of BaseRepository for testing
class TestRepository extends BaseRepository<SQLiteTable, { id: string; value: string }> {
  protected get table() {
    return mockTable;
  }

  protected get entityName() {
    return 'test';
  }
  
  protected getIdColumn(): SQLiteColumn {
    return mockIdColumn;
  }
}

describe('BaseRepository', () => {
  let repository: TestRepository;
  let originalLogger: Record<string, unknown>;

  beforeAll(() => {
    // Silence logger during tests using the existing mockLogger utility
    originalLogger = mockLogger(logger);

    repository = new TestRepository();
  });

  afterAll(() => {
    // Restore original logger functions
    restoreLogger(logger, originalLogger);
  });

  test('getById should return an entity when found', async () => {
    const result = await repository.getById('test-id');
    expect(result).toEqual({ id: 'test-id', value: 'test' });
  });

  test('getById should throw ValidationError with invalid ID', async () => {
    await expect(repository.getById('')).rejects.toThrow(ValidationError);
  });

  test('deleteById should return true on success', async () => {
    const result = await repository.deleteById('test-id');
    expect(result).toBe(true);
  });

  test('deleteById should return false on error', async () => {
    // Force an error by mocking db.delete to throw
    const originalDelete = db.delete;
    db.delete = mock(() => { throw new Error('Test error'); });
    
    const result = await repository.deleteById('test-id');
    expect(result).toBe(false);
    
    // Restore db.delete
    db.delete = originalDelete;
  });

  test('getCount should return entity count', async () => {
    // Create a more complete mock that satisfies the necessary type requirements
    const mockSelectResponse = [{ id: '1' }, { id: '2' }];
    const originalMethod = db.select;
    
    // Replace the select method with a simpler mock for this test
    db.select = mock(() => {
      return {
        from: () => {
          return Promise.resolve(mockSelectResponse) as any;
        },
      } as any;
    });
    
    const count = await repository.getCount();
    expect(count).toBe(2);
    
    // Restore original method
    db.select = originalMethod;
  });

  test('getCount should handle error gracefully', async () => {
    // Save the original method
    const originalMethod = db.select;
    
    // Create a mock that throws an error
    db.select = mock(() => {
      throw new Error('Test error');
    }) as any;
    
    await expect(repository.getCount()).rejects.toThrow(DatabaseError);
    
    // Restore original method
    db.select = originalMethod;
  });
});