/**
 * Base mock implementation of StorageInterface
 * 
 * This file provides a mock implementation of the base StorageInterface used in the MCP architecture.
 * It serves as a foundation for more specialized storage mocks.
 */

import type { ListOptions, SearchCriteria, StorageInterface } from '@/mcp/contexts/core/storageInterface';

/**
 * Generic in-memory storage map for mocking
 */
export class MockStorageInterface<T, ID = string> implements StorageInterface<T, ID> {
  private static instances: Map<string, MockStorageInterface<any, any>> = new Map();
  private items: Map<string, T> = new Map();
  
  /**
   * Private constructor to enforce singleton pattern
   */
  protected constructor(initialItems: Record<string, T> = {}) {
    this.items = new Map(Object.entries(initialItems));
  }

  /**
   * Get the singleton instance for a specific storage type
   * @param key The key to identify this storage type
   * @returns The singleton instance
   */
  public static getInstance<T, ID = string>(key = 'default'): MockStorageInterface<T, ID> {
    if (!this.instances.has(key)) {
      this.instances.set(key, new MockStorageInterface<T, ID>());
    }
    return this.instances.get(key) as MockStorageInterface<T, ID>;
  }

  /**
   * Reset the singleton instance for a specific storage type
   * @param key The key to identify this storage type
   */
  public static resetInstance(key = 'default'): void {
    this.instances.delete(key);
  }

  /**
   * Create a fresh instance for isolated testing
   * @param initialItems Optional initial items for the storage
   */
  public static createFresh<T, ID = string>(initialItems: Record<string, T> = {}): MockStorageInterface<T, ID> {
    const instance = new MockStorageInterface<T, ID>(initialItems);
    return instance;
  }

  /**
   * Create a new entity
   * @param item The entity to create
   * @returns Promise that resolves to the ID of the created entity
   */
  async create(item: Partial<T>): Promise<ID> {
    const id = (item as any).id || `id-${Math.random().toString(36).substring(2, 9)}`;
    this.items.set(String(id), item as T);
    return id as unknown as ID;
  }
  
  /**
   * Read an entity by ID
   * @param id The ID of the entity to read
   * @returns Promise that resolves to the entity or null if not found
   */
  async read(id: ID): Promise<T | null> {
    const item = this.items.get(String(id));
    return item ? { ...item } : null;
  }
  
  /**
   * Update an existing entity
   * @param id The ID of the entity to update
   * @param updates The partial entity with updates to apply
   * @returns Promise that resolves to true if update was successful
   */
  async update(id: ID, updates: Partial<T>): Promise<boolean> {
    const item = this.items.get(String(id));
    if (!item) {
      return false;
    }
    
    this.items.set(String(id), { ...item, ...updates });
    return true;
  }
  
  /**
   * Delete an entity by ID
   * @param id The ID of the entity to delete
   * @returns Promise that resolves to true if deletion was successful
   */
  async delete(id: ID): Promise<boolean> {
    return this.items.delete(String(id));
  }
  
  /**
   * Search for entities matching criteria
   * @param criteria The search criteria to use
   * @returns Promise that resolves to an array of matching entities
   */
  async search(_criteria: SearchCriteria): Promise<T[]> {
    // For mock purposes, just return all items
    // In a real implementation, this would filter by criteria
    return [...this.items.values()];
  }
  
  /**
   * List entities with pagination
   * @param options Options for listing entities
   * @returns Promise that resolves to an array of entities
   */
  async list(options?: ListOptions): Promise<T[]> {
    const values = [...this.items.values()];
    
    if (options?.offset || options?.limit) {
      const start = options?.offset || 0;
      const end = options?.limit ? start + options.limit : undefined;
      return values.slice(start, end);
    }
    
    return values;
  }
  
  /**
   * Count entities matching criteria
   * @param criteria Optional search criteria to count matching entities
   * @returns Promise that resolves to the count of matching entities
   */
  async count(_criteria?: SearchCriteria): Promise<number> {
    return this.items.size;
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.items.clear();
  }
}

// Export a factory function for creating instances
export function createMockStorageInterface<T, ID = string>(
  initialItems: Record<string, T> = {}
): MockStorageInterface<T, ID> {
  return MockStorageInterface.createFresh<T, ID>(initialItems);
}