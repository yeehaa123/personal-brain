/**
 * Lightweight mock for Drizzle database for testing purposes
 * 
 * This mock focuses on behavior rather than implementation details.
 * It provides the minimal interface needed for repository tests to work.
 */

// Define common types for the mock
export type MockRecord = Record<string, unknown>;

// Required table schema definition
export const notes = {
  id: { name: 'id' },
  title: { name: 'title' },
  content: { name: 'content' },
  tags: { name: 'tags' },
  embedding: { name: 'embedding' },
  createdAt: { name: 'createdAt' },
  updatedAt: { name: 'updatedAt' },
  source: { name: 'source' },
};

export const noteChunks = {
  id: { name: 'id' },
  noteId: { name: 'noteId' },
  content: { name: 'content' },
  embedding: { name: 'embedding' },
  chunkIndex: { name: 'chunkIndex' },
  createdAt: { name: 'createdAt' },
};

/**
 * Simple behavioral mock database for testing
 * 
 * Focuses on the behavior expected by repositories:
 * - Storing and retrieving records
 * - Supporting Drizzle-style query patterns
 * - Matching the actual behavior without complex implementation
 */
export class MockDatabase {
  // Internal storage for records by table
  private storage: Record<string, Record<string, MockRecord>> = {
    notes: {},
    noteChunks: {},
  };

  constructor() {
    this.resetStorage();
  }

  /**
   * Reset all storage
   */
  resetStorage(): void {
    this.storage = {
      notes: {},
      noteChunks: {},
    };
  }

  /**
   * Access storage for a specific table
   */
  getStorage(table: string = 'notes'): Record<string, MockRecord> {
    return this.storage[table] || {};
  }

  /**
   * Add a record to storage
   */
  addRecord(table: string, id: string, data: MockRecord): void {
    if (!this.storage[table]) {
      this.storage[table] = {};
    }
    this.storage[table][id] = { ...data };
  }

  /**
   * Get all records for a table
   */
  getAllRecords(table: string = 'notes'): MockRecord[] {
    return Object.values(this.getStorage(table));
  }

  /**
   * Get a record by ID
   */
  getRecord(table: string, id: string): MockRecord | undefined {
    return this.getStorage(table)[id];
  }

  /**
   * Delete a record
   */
  deleteRecord(table: string, id: string): void {
    if (this.storage[table] && this.storage[table][id]) {
      delete this.storage[table][id];
    }
  }

  /**
   * Create example records for testing
   */
  createExampleRecords(): void {
    const now = new Date();
    const examples = [
      {
        id: 'test-note-1',
        title: 'Test Note 1',
        content: 'This is the first test note',
        tags: ['test', 'example'],
        embedding: [0.1, 0.2, 0.3],
        createdAt: now,
        updatedAt: now,
        source: 'user-created',
      },
      {
        id: 'test-note-2',
        title: 'Test Note 2',
        content: 'This is the second test note',
        tags: ['test', 'sample'],
        embedding: [0.4, 0.5, 0.6],
        createdAt: now,
        updatedAt: now,
        source: 'import',
      },
    ];

    for (const example of examples) {
      this.addRecord('notes', example.id, example);
    }
  }

  /**
   * Query interface (matching Drizzle's query API)
   */
  select(): Record<string, unknown> {
    return {
      from: () => ({
        where: (condition: { operator?: string; left?: { name?: string }; right?: string }) => {
          // Handle ID conditions (most common case)
          if (condition?.operator === '=' && condition?.left?.name === 'id') {
            const id = condition.right;
            const record = this.getRecord('notes', id);
            return {
              limit: () => record ? [record] : [],
              all: async () => record ? [record] : [],
              orderBy: () => ({
                limit: () => record ? [record] : [],
              }),
            };
          }

          // Handle source conditions
          if (condition?.operator === '=' && condition?.left?.name === 'source') {
            const source = condition.right;
            const filtered = this.getAllRecords('notes').filter(r => r['source'] === source);
            return {
              limit: (limit: number) => filtered.slice(0, limit),
              offset: (offset: number) => ({
                limit: (limit: number) => filtered.slice(offset, offset + limit),
              }),
              orderBy: () => ({
                limit: (limit: number) => filtered.slice(0, limit),
                offset: (offset: number) => filtered.slice(offset),
              }),
              all: async () => filtered,
            };
          }

          // Default case - return all records
          return {
            limit: (limit: number = 10) => this.getAllRecords().slice(0, limit),
            offset: (offset: number) => ({
              limit: (limit: number) => this.getAllRecords().slice(offset, offset + limit),
            }),
            orderBy: () => ({
              limit: (limit: number) => this.getAllRecords().slice(0, limit),
              offset: (offsetVal: number) => this.getAllRecords().slice(offsetVal),
              all: async () => this.getAllRecords(),
            }),
            all: async () => this.getAllRecords(),
          };
        },
        limit: (limit: number = 10) => this.getAllRecords().slice(0, limit),
        orderBy: () => ({
          limit: (limit: number) => this.getAllRecords().slice(0, limit),
          all: async () => this.getAllRecords(),
        }),
        all: async () => this.getAllRecords(),
      }),
    };
  }

  /**
   * Insert query interface
   */
  insert(_: unknown): Record<string, unknown> {
    return {
      values: (data: Record<string, unknown> & { id: string }) => {
        // Store the record
        if (!data.id) {
          throw new Error('ID is required for mock DB insert');
        }

        this.addRecord('notes', data.id, data);

        return {
          returning: () => [this.getRecord('notes', data.id)],
        };
      },
    };
  }

  /**
   * Update query interface
   */
  update(_: unknown): Record<string, unknown> {
    return {
      set: (updates: Record<string, unknown>) => ({
        where: (condition: { operator?: string; left?: { name?: string }; right?: string }) => {
          if (condition?.operator === '=' && condition?.left?.name === 'id') {
            const id = condition.right;
            const record = this.getRecord('notes', id);

            if (record) {
              // Update the record
              const updated = { ...record, ...updates };
              this.addRecord('notes', id, updated);

              return {
                returning: () => [updated],
                execute: async () => ({ success: true }),
              };
            }
          }

          // No match
          return {
            returning: () => [],
            execute: async () => ({ success: false }),
          };
        },
      }),
    };
  }

  /**
   * Delete query interface
   */
  delete(_: unknown): Record<string, unknown> {
    return {
      where: (condition: { operator?: string; left?: { name?: string }; right?: string }) => {
        if (condition?.operator === '=' && condition?.left?.name === 'id') {
          const id = condition.right;
          this.deleteRecord('notes', id);
        }
        return {
          execute: async () => ({ success: true }),
        };
      },
    };
  }
}

// Export a single instance for tests to use
export const db = new MockDatabase();

// Create example records for initial test data
db.createExampleRecords();

// Export a reset function for cleaning between tests 
export const resetMockDb = () => {
  db.resetStorage();
  db.createExampleRecords();
};
