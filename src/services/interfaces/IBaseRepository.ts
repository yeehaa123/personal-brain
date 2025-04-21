/**
 * Unified Repository Interface
 * 
 * This interface provides a standardized pattern for all storage operations
 * across the application, combining functionality previously split across
 * multiple interfaces.
 */

/**
 * Base entity interface - ensures entities have an ID
 */
export interface Entity<TId = string> {
  /** Unique entity identifier */
  id: TId;
}

/**
 * Common query options for searching and listing entities
 */
export interface QueryOptions {
  /** Filter criteria */
  filter?: Record<string, unknown>;
  /** Filter by tags */
  tags?: string[];
  /** Maximum number of results */
  limit?: number;
  /** Skip initial results (for pagination) */
  offset?: number;
  /** Use semantic search when available */
  semantic?: boolean;
  /** Sort options */
  sort?: {
    /** Field to sort by */
    field: string;
    /** Sort direction */
    direction: 'asc' | 'desc';
  };
}

/**
 * Base repository interface for all storage operations
 */
export interface IBaseRepository<TEntity extends Entity, TId = string> {
  /**
   * Create a new entity
   * @param item Entity data to create (without ID)
   * @returns The ID of the created entity
   */
  create(item: Omit<TEntity, 'id'>): Promise<TId>;
  
  /**
   * Retrieve an entity by ID
   * @param id Entity ID
   * @returns The entity or null if not found
   */
  read(id: TId): Promise<TEntity | null>;
  
  /**
   * Update an existing entity
   * @param id Entity ID
   * @param updates Partial entity with updates
   * @returns Success status
   */
  update(id: TId, updates: Partial<TEntity>): Promise<boolean>;
  
  /**
   * Delete an entity by ID
   * @param id Entity ID
   * @returns Success status
   */
  delete(id: TId): Promise<boolean>;
  
  /**
   * Find entities matching query options
   * @param options Query options
   * @returns Matching entities
   */
  find(options?: QueryOptions): Promise<TEntity[]>;
  
  /**
   * Count entities matching query options
   * @param options Query options
   * @returns Count of matching entities
   */
  count(options?: QueryOptions): Promise<number>;
  
  /**
   * Find entities related to a given entity
   * @param id Entity ID to find related items for
   * @param limit Maximum number of results
   * @returns Related entities
   */
  findRelated(id: TId, limit?: number): Promise<TEntity[]>;
}