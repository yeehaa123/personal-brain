/**
 * Base repository class for common database operations
 * Provides shared functionality for entity repositories
 */
import { eq } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';

import { db } from '@/db';
import { DatabaseError, safeExec, tryExec, ValidationError } from '@/utils/errorUtils';
import logger from '@/utils/logger';
import { isNonEmptyString } from '@/utils/safeAccessUtils';

import type { IRepository } from './interfaces/IRepository';

/**
 * Base repository with common database operation patterns
 */
export abstract class BaseRepository<TTable extends SQLiteTable, TEntity = InferSelectModel<TTable>> 
implements IRepository<TEntity, string> {
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
   * Get an entity by ID
   * @param id Entity ID
   * @returns The entity or undefined if not found
   * @throws DatabaseError If there's an error accessing the database
   * @throws ValidationError If the ID is invalid
   */
  async getById(id: string): Promise<TEntity | undefined> {
    if (!isNonEmptyString(id)) {
      throw new ValidationError(`Invalid ${this.entityName} ID provided`, { id });
    }

    try {
      const result = await db.select()
        .from(this.table)
        .where(eq(this.getIdColumn(), id))
        .limit(1);
      return result[0] as TEntity | undefined;
    } catch (error) {
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
      // We need to use a more specific type that drizzle expects
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.insert(this.table).values(entity as any);
      return entity;
    } catch (error) {
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
        throw new ValidationError(`${this.entityName} ID is required`, { id });
      }
      
      await db.delete(this.table)
        .where(eq(this.getIdColumn(), id));
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
        // Get just the IDs for efficiency
        const allEntities = await db.select({ id: this.getIdColumn() })
          .from(this.table);
        
        // Handle potential null or undefined return
        if (!Array.isArray(allEntities)) {
          logger.warn(`Database query returned non-array result for ${this.entityName} count`);
          return 0;
        }
        
        return allEntities.length;
      } catch (error) {
        throw new DatabaseError(
          `Error getting ${this.entityName} count: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }, `Error getting ${this.entityName} count`);
  }
}