/**
 * Tests for the StorageInterface
 * 
 * These tests validate that the interface can be implemented correctly
 * and that implementations behave as expected.
 */
import { describe, expect, test } from 'bun:test';

import type { 
  ListOptions,
  SearchCriteria,
  StorageInterface,
} from '@/contexts/storageInterface';

// Define a simple entity type for testing
interface TestEntity {
  id: string;
  name: string;
  value: number;
  active: boolean;
}

// Mock implementation of StorageInterface for testing
class MockStorage implements StorageInterface<TestEntity> {
  private entities: Map<string, TestEntity> = new Map();

  async create(item: Partial<TestEntity>): Promise<string> {
    const id = item.id || `entity-${Date.now()}`;
    const entity: TestEntity = {
      id,
      name: item.name || '',
      value: item.value || 0,
      active: item.active !== undefined ? item.active : true,
    };
    
    this.entities.set(id, entity);
    return id;
  }

  async read(id: string): Promise<TestEntity | null> {
    const entity = this.entities.get(id);
    return entity || null;
  }

  async update(id: string, updates: Partial<TestEntity>): Promise<boolean> {
    const entity = this.entities.get(id);
    if (!entity) return false;
    
    const updatedEntity = { ...entity, ...updates };
    this.entities.set(id, updatedEntity);
    return true;
  }

  async delete(id: string): Promise<boolean> {
    return this.entities.delete(id);
  }

  async search(criteria: SearchCriteria): Promise<TestEntity[]> {
    // Simple implementation that filters entities based on exact property matches
    return Array.from(this.entities.values()).filter(entity => {
      for (const [key, value] of Object.entries(criteria)) {
        // @ts-expect-error - Dynamic property access for filtering
        if (entity[key] !== value) return false;
      }
      return true;
    });
  }

  async list(options?: ListOptions): Promise<TestEntity[]> {
    let entities = Array.from(this.entities.values());
    
    // Apply pagination if options are provided
    if (options) {
      const offset = options.offset || 0;
      const limit = options.limit !== undefined ? options.limit : entities.length;
      entities = entities.slice(offset, offset + limit);
    }
    
    return entities;
  }

  async count(criteria?: SearchCriteria): Promise<number> {
    if (!criteria) return this.entities.size;
    
    // Count entities matching criteria
    const matches = await this.search(criteria);
    return matches.length;
  }
}

describe('StorageInterface', () => {
  // Create a fresh storage instance for each test
  const getStorage = () => new MockStorage();

  test('create should store an entity and return its ID', async () => {
    const storage = getStorage();
    const entity: Partial<TestEntity> = {
      name: 'Test Entity',
      value: 42,
      active: true,
    };
    
    const id = await storage.create(entity);
    expect(id).toBeDefined();
    
    const retrieved = await storage.read(id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.name).toBe('Test Entity');
    expect(retrieved?.value).toBe(42);
    expect(retrieved?.active).toBe(true);
  });

  test('read should return null for non-existent entity', async () => {
    const storage = getStorage();
    const result = await storage.read('non-existent-id');
    expect(result).toBeNull();
  });

  test('update should modify an existing entity', async () => {
    const storage = getStorage();
    // Create an entity
    const id = await storage.create({
      name: 'Original Name',
      value: 10,
    });
    
    // Update it
    const updateResult = await storage.update(id, {
      name: 'Updated Name',
      value: 20,
    });
    
    expect(updateResult).toBe(true);
    
    // Verify the update
    const updated = await storage.read(id);
    expect(updated).not.toBeNull();
    expect(updated?.name).toBe('Updated Name');
    expect(updated?.value).toBe(20);
  });

  test('update should return false for non-existent entity', async () => {
    const storage = getStorage();
    const result = await storage.update('non-existent-id', { name: 'New Name' });
    expect(result).toBe(false);
  });

  test('delete should remove an entity', async () => {
    const storage = getStorage();
    // Create an entity
    const id = await storage.create({
      name: 'To Be Deleted',
    });
    
    // Verify it exists
    let entity = await storage.read(id);
    expect(entity).not.toBeNull();
    
    // Delete it
    const deleteResult = await storage.delete(id);
    expect(deleteResult).toBe(true);
    
    // Verify it's gone
    entity = await storage.read(id);
    expect(entity).toBeNull();
  });

  test('delete should return false for non-existent entity', async () => {
    const storage = getStorage();
    const result = await storage.delete('non-existent-id');
    expect(result).toBe(false);
  });

  test('search should find entities matching criteria', async () => {
    const storage = getStorage();
    // Create some test entities
    await storage.create({ id: 'e1', name: 'Entity 1', value: 10, active: true });
    await storage.create({ id: 'e2', name: 'Entity 2', value: 20, active: true });
    await storage.create({ id: 'e3', name: 'Entity 3', value: 30, active: false });
    
    // Search by active status
    const activeEntities = await storage.search({ active: true });
    expect(activeEntities.length).toBe(2);
    
    // Search by value
    const highValueEntities = await storage.search({ value: 30 });
    expect(highValueEntities.length).toBe(1);
    expect(highValueEntities[0].id).toBe('e3');
    
    // Search by multiple criteria
    const specificEntities = await storage.search({ active: true, value: 20 });
    expect(specificEntities.length).toBe(1);
    expect(specificEntities[0].id).toBe('e2');
  });

  test('list should return all entities with pagination', async () => {
    const storage = getStorage();
    // Create some test entities
    await storage.create({ id: 'e1', name: 'Entity 1' });
    await storage.create({ id: 'e2', name: 'Entity 2' });
    await storage.create({ id: 'e3', name: 'Entity 3' });
    
    // Get all entities
    const allEntities = await storage.list();
    expect(allEntities.length).toBe(3);
    
    // Get first page
    const firstPage = await storage.list({ limit: 2, offset: 0 });
    expect(firstPage.length).toBe(2);
    
    // Get second page
    const secondPage = await storage.list({ limit: 2, offset: 2 });
    expect(secondPage.length).toBe(1);
  });

  test('count should return the number of entities', async () => {
    const storage = getStorage();
    // Create some test entities
    await storage.create({ id: 'e1', name: 'Entity 1', active: true });
    await storage.create({ id: 'e2', name: 'Entity 2', active: true });
    await storage.create({ id: 'e3', name: 'Entity 3', active: false });
    
    // Count all entities
    const totalCount = await storage.count();
    expect(totalCount).toBe(3);
    
    // Count active entities
    const activeCount = await storage.count({ active: true });
    expect(activeCount).toBe(2);
  });
});