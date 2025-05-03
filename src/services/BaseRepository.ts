/**
 * Base repository class for common database operations
 * Provides shared functionality for entity repositories
 * 
 * This class defines abstract methods and shared implementation for repositories.
 * Derived classes should implement the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */
import { eq } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';

import { db } from '@/db';
import { DatabaseError, safeExec, tryExec, ValidationError } from '@/utils/errorUtils';
import { Logger } from '@/utils/logger';
import { isNonEmptyString } from '@/utils/safeAccessUtils';

import type { IRepository } from './interfaces/IRepository';

/**
 * Base repository with common database operation patterns
 */
export abstract class BaseRepository<TTable extends SQLiteTable, TEntity = InferSelectModel<TTable>> 
implements IRepository<TEntity, string> {
  /**
   * Logger instance for this class and its subclasses
   * Protected so derived classes can access it
   */
  protected logger = Logger.getInstance();
  
  /**
   * Get the table that this repository uses
   */
  protected abstract get table(): TTable;

  /**
   * Get entity name for error messages and logging
   */
  protected abstract get entityName(): string;

  /**
   * Get the ID column for the table
   */
  protected abstract getIdColumn(): SQLiteColumn;
  
  /**
   * Constructor for base repository
   * 
   * Initializes the logger and could handle other shared setup.
   * Derived classes should call super() in their constructors.
   * 
   * NOTE: The constructor is public to allow for direct instantiation in tests.
   * In production code, you should use the getInstance() method of the derived classes.
   */
  constructor() {
    // We can't reference abstract properties in the constructor
    // Derived classes should log their creation if needed
  }

  /**
   * Get an entity by ID
   * @param id Entity ID
   * @returns The entity or undefined if not found
   * @throws DatabaseError If there's an error accessing the database
   * @throws ValidationError If the ID is invalid
   */
  async getById(id: string): Promise<TEntity | undefined> {
    if (!isNonEmptyString(id)) {
      this.logger.warn(`Invalid ${this.entityName} ID provided for getById: ${id}`);
      throw new ValidationError(`Invalid ${this.entityName} ID provided`, { id });
    }

    try {
      this.logger.debug(`Getting ${this.entityName} with ID: ${id}`);
      const result = await db.select()
        .from(this.table)
        .where(eq(this.getIdColumn(), id))
        .limit(1);
      
      if (result[0]) {
        this.logger.debug(`Found ${this.entityName} with ID: ${id}`);
      } else {
        this.logger.debug(`No ${this.entityName} found with ID: ${id}`);
      }
      
      return result[0] as TEntity | undefined;
    } catch (error) {
      this.logger.error(`Database error retrieving ${this.entityName} with ID: ${id}`, { 
        error: error instanceof Error ? error.message : String(error), 
      });
      
      throw new DatabaseError(
        `Failed to retrieve ${this.entityName} with ID: ${id}`, 
        { id, error: error instanceof Error ? error.message : String(error) },
      );
    }
  }
  
  /**
   * Insert an entity
   * @param entity The entity to insert
   * @returns The inserted entity
   * @throws DatabaseError If there's an error accessing the database
   */
  async insert(entity: TEntity): Promise<TEntity> {
    try {
      this.logger.debug(`Inserting new ${this.entityName}`);
      
      // We need to use a type assertion here for Drizzle ORM
      // This is a limitation of TypeScript with Drizzle's complex generic types
      // The entity is validated at runtime by Drizzle against the schema
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.insert(this.table).values(entity as any);
      
      // Try to get ID for better logging
      const id = (entity as unknown as { id?: string }).id;
      if (id) {
        this.logger.debug(`Successfully inserted ${this.entityName} with ID: ${id}`);
      } else {
        this.logger.debug(`Successfully inserted ${this.entityName}`);
      }
      
      return entity;
    } catch (error) {
      this.logger.error(`Failed to insert ${this.entityName}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      
      throw new DatabaseError(
        `Failed to insert ${this.entityName}`, 
        { error: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  /**
   * Delete an entity by ID
   * @param id Entity ID
   * @returns true if successful
   */
  async deleteById(id: string): Promise<boolean> {
    return safeExec(async () => {
      if (!isNonEmptyString(id)) {
        this.logger.warn(`Invalid ${this.entityName} ID provided for deleteById: ${id}`);
        throw new ValidationError(`${this.entityName} ID is required`, { id });
      }
      
      this.logger.debug(`Deleting ${this.entityName} with ID: ${id}`);
      await db.delete(this.table)
        .where(eq(this.getIdColumn(), id));
      
      this.logger.debug(`Successfully deleted ${this.entityName} with ID: ${id}`);
      return true;
    }, false, 'error');
  }

  /**
   * Get the total count of entities in the database
   * @returns The total count
   */
  async getCount(): Promise<number> {
    return tryExec(async () => {
      try {
        this.logger.debug(`Getting count of all ${this.entityName} entities`);
        
        // Get just the IDs for efficiency
        const allEntities = await db.select({ id: this.getIdColumn() })
          .from(this.table);
        
        // Handle potential null or undefined return
        if (!Array.isArray(allEntities)) {
          this.logger.warn(`Database query returned non-array result for ${this.entityName} count`);
          return 0;
        }
        
        this.logger.debug(`Found ${allEntities.length} ${this.entityName} entities`);
        return allEntities.length;
      } catch (error) {
        this.logger.error(`Database error getting ${this.entityName} count`, {
          error: error instanceof Error ? error.message : String(error),
        });
        
        throw new DatabaseError(
          `Error getting ${this.entityName} count: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }, `Error getting ${this.entityName} count`);
  }
}