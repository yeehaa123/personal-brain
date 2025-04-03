/**
 * Interface for repository services
 * Provides common CRUD operations that repositories should implement
 */

/**
 * Base repository interface for CRUD operations
 */
export interface IRepository<TEntity, TId = string> {
  /**
   * Get entity by ID
   * @param id Entity ID
   */
  getById(id: TId): Promise<TEntity | undefined>;
  
  /**
   * Delete entity by ID
   * @param id Entity ID
   */
  deleteById(id: TId): Promise<boolean>;
  
  /**
   * Get total count of entities
   */
  getCount(): Promise<number>;
}