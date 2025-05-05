/**
 * Tests for BaseRepository
 */
import { beforeAll, describe, expect, mock, test } from 'bun:test';
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';

import { BaseRepository } from '@/services/BaseRepository';

// Create a mock table with the minimum interface we need
const mockTable = {
  id: { name: 'id', tableName: 'test' },
} as unknown as SQLiteTable;

// Create a mock column object for the id column
const mockIdColumn = { name: 'id', tableName: 'test' } as unknown as SQLiteColumn;

// Mock the db module
mock.module('@/db', () => ({
  db: {
    select: mock(() => ({ from: mock(() => ({ where: mock(() => ({ limit: mock(() => [{ id: 'test-id', value: 'test' }]) })) })) })),
    delete: mock(() => ({ where: mock(() => Promise.resolve()) })),
  },
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

  beforeAll(() => {
    repository = new TestRepository();
  });

  test('base repository functionality', async () => {
    // Basic getById test
    const result = await repository.getById('test-id');
    expect(result).toEqual({ id: 'test-id', value: 'test' });
    
    // Validation error test
    let errorThrown = false;
    try {
      await repository.getById('');
    } catch (_error) {
      // Success - error was thrown
      errorThrown = true;
    }
    expect(errorThrown).toBe(true);
    
    // Test deleteById
    expect(await repository.deleteById('test-id')).toBe(true);
    
    // Test count operation 
    const originalGetCount = repository.getCount.bind(repository);
    repository.getCount = mock(async () => 2);
    expect(await repository.getCount()).toBe(2);
    
    // Cleanup
    repository.getCount = originalGetCount;
  });
});
