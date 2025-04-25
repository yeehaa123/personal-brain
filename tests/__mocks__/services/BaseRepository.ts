/**
 * Mock BaseRepository Implementation
 * 
 * This file provides a standardized mock implementation of the BaseRepository
 * for use in tests across the codebase.
 */

import { mock } from 'bun:test';
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';
import { nanoid } from 'nanoid';

import type { BaseRepository as IBaseRepository } from '@/services/BaseRepository';

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
> implements Partial<IBaseRepository<SQLiteTable, TEntity>> {
  private static instance: MockBaseRepository | null = null;
  
  // Mock storage
  private entities: TEntity[] = [];
  
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
    initialEntities: T[] = []
  ): MockBaseRepository<T> {
    const repo = new MockBaseRepository<T>();
    repo.entities = [...initialEntities];
    return repo;
  }
  
  // Mock properties
  protected get table() {
    return { id: { name: 'id' } } as unknown as SQLiteTable;
  }

  protected get entityName() {
    return 'mock';
  }

  protected getIdColumn() {
    return { name: 'id' } as unknown as SQLiteColumn;
  }
  
  // Mock methods
  getById = mock(async (id: string): Promise<TEntity | undefined> => {
    const entity = this.entities.find(e => e.id === id);
    return entity || undefined;
  });
  
  getAll = mock(async (): Promise<TEntity[]> => {
    return [...this.entities];
  });
  
  create = mock(async (entity: Partial<TEntity>): Promise<string> => {
    const id = entity.id || `mock-${nanoid(6)}`;
    const newEntity = {
      ...entity,
      id,
    } as TEntity;
    
    this.entities.push(newEntity);
    return id;
  });
  
  update = mock(async (id: string, updates: Partial<TEntity>): Promise<boolean> => {
    const index = this.entities.findIndex(e => e.id === id);
    if (index === -1) return false;
    
    this.entities[index] = {
      ...this.entities[index],
      ...updates,
    };
    
    return true;
  });
  
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
}