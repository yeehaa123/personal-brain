/**
 * Tests for baseStorageInterface mock
 */

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import { MockStorageInterface } from './baseStorageInterface';

// Type for testing
interface TestItem {
  id: string;
  name: string;
  value: number;
}

describe('MockStorageInterface', () => {
  let storage: MockStorageInterface<TestItem>;
  
  beforeEach(() => {
    // Create a fresh instance for each test
    storage = MockStorageInterface.createFresh<TestItem>();
  });
  
  afterEach(() => {
    // Clear data and reset instance
    storage.clear();
    MockStorageInterface.resetInstance();
  });
  
  describe('getInstance and createFresh', () => {
    test('getInstance should return the same instance', () => {
      const instance1 = MockStorageInterface.getInstance<TestItem>();
      const instance2 = MockStorageInterface.getInstance<TestItem>();
      
      expect(instance1).toBe(instance2);
    });
    
    test('createFresh should create an isolated instance', () => {
      const instance1 = MockStorageInterface.createFresh<TestItem>();
      const instance2 = MockStorageInterface.createFresh<TestItem>();
      
      expect(instance1).not.toBe(instance2);
    });
    
    test('resetInstance should clear the singleton instance', () => {
      const instance1 = MockStorageInterface.getInstance<TestItem>();
      MockStorageInterface.resetInstance();
      const instance2 = MockStorageInterface.getInstance<TestItem>();
      
      expect(instance1).not.toBe(instance2);
    });
  });
  
  describe('CRUD operations', () => {
    test('create should store an item and return its ID', async () => {
      const item: TestItem = { id: 'test-1', name: 'Test Item', value: 42 };
      const id = await storage.create(item);
      
      expect(id).toBe('test-1');
      const retrieved = await storage.read('test-1');
      expect(retrieved).toEqual(item);
    });
    
    test('create should generate an ID if not provided', async () => {
      const item: Partial<TestItem> = { name: 'Test Item', value: 42 };
      const id = await storage.create(item);
      
      expect(typeof id).toBe('string');
      expect(id).toBeDefined();
      
      const retrieved = await storage.read(id);
      expect(retrieved).toBeDefined();
    });
    
    test('read should return null for non-existent items', async () => {
      const retrieved = await storage.read('non-existent');
      expect(retrieved).toBeNull();
    });
    
    test('update should modify an existing item', async () => {
      // Create an item
      const item: TestItem = { id: 'test-1', name: 'Test Item', value: 42 };
      await storage.create(item);
      
      // Update it
      const success = await storage.update('test-1', { name: 'Updated Name' });
      expect(success).toBe(true);
      
      // Verify update
      const retrieved = await storage.read('test-1');
      expect(retrieved).toEqual({
        id: 'test-1',
        name: 'Updated Name',
        value: 42,
      });
    });
    
    test('update should return false for non-existent items', async () => {
      const success = await storage.update('non-existent', { name: 'Updated Name' });
      expect(success).toBe(false);
    });
    
    test('delete should remove an item', async () => {
      // Create an item
      const item: TestItem = { id: 'test-1', name: 'Test Item', value: 42 };
      await storage.create(item);
      
      // Delete it
      const success = await storage.delete('test-1');
      expect(success).toBe(true);
      
      // Verify deletion
      const retrieved = await storage.read('test-1');
      expect(retrieved).toBeNull();
    });
    
    test('delete should return false for non-existent items', async () => {
      const success = await storage.delete('non-existent');
      expect(success).toBe(false);
    });
  });
  
  describe('Query operations', () => {
    test('search should return all items', async () => {
      // Create some items
      const items: TestItem[] = [
        { id: 'test-1', name: 'Item 1', value: 42 },
        { id: 'test-2', name: 'Item 2', value: 43 },
        { id: 'test-3', name: 'Item 3', value: 44 },
      ];
      
      for (const item of items) {
        await storage.create(item);
      }
      
      // Search
      const results = await storage.search({});
      expect(results.length).toBe(3);
      expect(results).toEqual(expect.arrayContaining(items));
    });
    
    test('list should return all items with pagination', async () => {
      // Create some items
      const items: TestItem[] = [
        { id: 'test-1', name: 'Item 1', value: 42 },
        { id: 'test-2', name: 'Item 2', value: 43 },
        { id: 'test-3', name: 'Item 3', value: 44 },
        { id: 'test-4', name: 'Item 4', value: 45 },
        { id: 'test-5', name: 'Item 5', value: 46 },
      ];
      
      for (const item of items) {
        await storage.create(item);
      }
      
      // List without pagination
      const allResults = await storage.list();
      expect(allResults.length).toBe(5);
      
      // List with pagination
      const page1 = await storage.list({ offset: 0, limit: 2 });
      expect(page1.length).toBe(2);
      
      const page2 = await storage.list({ offset: 2, limit: 2 });
      expect(page2.length).toBe(2);
      
      const page3 = await storage.list({ offset: 4, limit: 2 });
      expect(page3.length).toBe(1);
    });
    
    test('count should return the number of items', async () => {
      // Create some items
      const items: TestItem[] = [
        { id: 'test-1', name: 'Item 1', value: 42 },
        { id: 'test-2', name: 'Item 2', value: 43 },
        { id: 'test-3', name: 'Item 3', value: 44 },
      ];
      
      for (const item of items) {
        await storage.create(item);
      }
      
      // Count
      const count = await storage.count();
      expect(count).toBe(3);
    });
  });
});