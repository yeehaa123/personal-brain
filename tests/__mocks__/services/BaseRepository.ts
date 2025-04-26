/**
 * Mock BaseRepository Implementation
 * 
 * This file provides a standardized mock implementation of the BaseRepository
 * for use in tests across the codebase.
 */

import { mock } from 'bun:test';
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';
import { nanoid } from 'nanoid';

import { BaseRepository } from '@/services/BaseRepository';
import type { Logger } from '@/utils/logger';
import { MockLogger } from '@test/__mocks__/core/logger';

/**
 * Generic entity type for testing
 */
export interface MockEntity {
  id: string;
  name: string;
  tags?: string[];
  embedding?: number[] | null;
  [key: string]: unknown;
}

/**
 * MockBaseRepository class with standardized interface
 * 
 * Follows the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */
export class MockBaseRepository<
  TEntity extends MockEntity = MockEntity
> extends BaseRepository<SQLiteTable, TEntity> {
  private static instance: MockBaseRepository | null = null;
  
  // Mock storage
  public entities: TEntity[] = [];
  
  /**
   * Constructor
   */
  constructor() {
    super();
    // Override logger with MockLogger
    this.logger = MockLogger.createFresh({ silent: true }) as unknown as Logger;
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): MockBaseRepository {
    if (!MockBaseRepository.instance) {
      MockBaseRepository.instance = new MockBaseRepository();
    }
    return MockBaseRepository.instance;
  }
  
  /**
   * Reset singleton instance
   */
  public static resetInstance(): void {
    MockBaseRepository.instance = null;
  }
  
  /**
   * Create fresh instance for isolated testing
   * @param initialEntities Initial entities to populate the repository with
   */
  public static createFresh<T extends MockEntity = MockEntity>(
    initialEntities: T[] = [],
  ): MockBaseRepository<T> {
    const repo = new MockBaseRepository<T>();
    repo.entities = [...initialEntities];
    return repo;
  }
  
  // Mock properties required by BaseRepository
  protected get table() {
    return { id: { name: 'id' } } as unknown as SQLiteTable;
  }

  protected get entityName() {
    return 'mock';
  }

  protected getIdColumn() {
    return { name: 'id' } as unknown as SQLiteColumn;
  }
  
  // Override methods with mocked implementations
  
  /**
   * Get an entity by ID
   */
  override getById = mock(async (id: string): Promise<TEntity | undefined> => {
    const entity = this.entities.find(e => e.id === id);
    return entity || undefined;
  });
  
  /**
   * Get all entities
   */
  getAll = mock(async (): Promise<TEntity[]> => {
    return [...this.entities];
  });
  
  /**
   * Create an entity
   */
  create = mock(async (entity: Partial<TEntity>): Promise<string> => {
    const id = entity.id || `mock-${nanoid(6)}`;
    const newEntity = {
      ...entity,
      id,
    } as TEntity;
    
    this.entities.push(newEntity);
    return id;
  });
  
  /**
   * Update an entity
   */
  update = mock(async (id: string, updates: Partial<TEntity>): Promise<boolean> => {
    const index = this.entities.findIndex(e => e.id === id);
    if (index === -1) return false;
    
    this.entities[index] = {
      ...this.entities[index],
      ...updates,
    };
    
    return true;
  });
  
  /**
   * Delete an entity
   */
  delete = mock(async (id: string): Promise<boolean> => {
    const initialLength = this.entities.length;
    this.entities = this.entities.filter(e => e.id !== id);
    return this.entities.length < initialLength;
  });
  
  // Additional methods for search capabilities
  searchByKeywords = mock(async (_query?: string, _tags?: string[]): Promise<TEntity[]> => {
    return [
      { id: '1', name: 'Test 1', tags: ['tag1'] } as TEntity,
      { id: '2', name: 'Test 2', tags: ['tag2'] } as TEntity,
    ];
  });

  getRecentEntities = mock(async (): Promise<TEntity[]> => {
    return [
      { id: '3', name: 'Recent 1' } as TEntity,
      { id: '4', name: 'Recent 2' } as TEntity,
    ];
  });
  
  /**
   * Override insert method
   */
  override insert = mock(async (entity: TEntity): Promise<TEntity> => {
    // Make sure we have an ID
    if (!entity.id) {
      (entity as unknown as Record<string, string>)['id'] = `mock-${nanoid(6)}`;
    }
    
    // Add to our collection
    this.entities.push(entity);
    
    // Return the entity
    return entity;
  });
  
  /**
   * Override deleteById method
   */
  override deleteById = mock(async (id: string): Promise<boolean> => {
    // Delegate to delete method for consistency
    return this.delete(id);
  });
  
  /**
   * Override getCount method
   */
  override getCount = mock(async (): Promise<number> => {
    return this.entities.length;
  });
}