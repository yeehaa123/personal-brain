# Planning Document: Unified Entity Model Architecture

## Overview

This document outlines a plan to simplify and streamline the architecture by enhancing the existing Note-centric storage model with a more consistent handling of markdown generation, embedding, tagging, and chunking across all entity types. The system already uses Notes as the central storage mechanism, with adapters for converting other entity types (profiles, website sections, etc.) to Notes.

## Current Architecture

- **Note Repository**: Central storage mechanism for all content
- **Entity-Specific Adapters**: Convert between domain models (Profile, WebsiteSection, etc.) and Notes
- **Context Classes**: Handle entity-specific operations and adapters
- **Multiple Processing Services**: Different services for embedding, tagging, and search for different entity types
- **Source Field**: Currently used to differentiate entity types in some cases

## Goals of the Unified Approach

1. Standardize the model interface across all entity types
2. Consolidate embedding, tagging, and chunking into a single service
3. Ensure all entities have a consistent toMarkdown method
4. Standardize chunk generation for better search and processing
5. Replace "source" field with more consistent "entityType"
6. Reduce code duplication and complexity
7. Improve cross-entity search capabilities

## Unified Model Architecture

### Enhanced Database Schema with EntityType

```typescript
// In src/db/schema.ts
import { sqliteTable, text, integer, blob } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// EntityType enum to standardize entity types across the system
export enum EntityType {
  Note = 'note',
  Profile = 'profile',
  WebsiteSection = 'website_section',
  Conversation = 'conversation',
  ExternalSource = 'external_source',
  // Add more as needed
}

// Update notes table to include entityType
export const notes = sqliteTable('notes', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  tags: text('tags', { mode: 'json' }).$type<string[]>().default('[]'),
  created: text('created').notNull(),
  updated: text('updated').notNull(),
  // Replace source field with entityType
  entityType: text('entity_type').default(EntityType.Note),
  // Keep metadata for entity-specific properties
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>().default('{}'),
});

// Update note_chunks table to reference entityType
export const noteChunks = sqliteTable('note_chunks', {
  id: text('id').primaryKey(),
  noteId: text('note_id').notNull().references(() => notes.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  chunkIndex: integer('chunk_index').notNull(),
  embedding: blob('embedding', { mode: 'json' }).$type<number[]>(),
  // Add entityType from the parent note for efficient filtering
  entityType: text('entity_type').notNull(),
});

// Create indexes for efficient searching
export const notesEntityTypeIndex = sqliteTable('notes_entity_type_idx', {
  id: text('id').primaryKey(),
  entityType: text('entity_type').notNull(),
});

export const noteChunksEntityTypeIndex = sqliteTable('note_chunks_entity_type_idx', {
  id: text('id').primaryKey(),
  entityType: text('entity_type').notNull(),
});
```

### Enhanced Model Interface

```typescript
/**
 * Enhanced interface for all content models in the system
 */
export interface IContentModel {
  /** Unique identifier */
  id: string;
  
  /** Creation timestamp */
  created: string;
  
  /** Last update timestamp */
  updated: string;
  
  /** Tags associated with the entity */
  tags: string[];
  
  /** Entity type for categorization */
  entityType: EntityType;
  
  /** 
   * Convert entity to markdown format for processing
   * This is used for embedding, tagging, and chunking
   */
  toMarkdown(): string;
}

/**
 * Enhanced Note model that implements IContentModel
 */
export class Note implements IContentModel {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created: string;
  updated: string;
  entityType: EntityType;
  
  // Optional metadata for entity-specific properties
  metadata?: Record<string, unknown>;
  
  constructor(data: Partial<Note>) {
    this.id = data.id || generateId();
    this.title = data.title || '';
    this.content = data.content || '';
    this.tags = data.tags || [];
    this.created = data.created || new Date().toISOString();
    this.updated = data.updated || new Date().toISOString();
    this.entityType = data.entityType || EntityType.Note;
    this.metadata = data.metadata || {};
  }
  
  /**
   * Convert note to markdown format
   */
  toMarkdown(): string {
    return `# ${this.title}\n\n${this.content}`;
  }
  
  /**
   * Static validators using zod schema
   */
  static readonly schema = createSelectSchema(notes, {
    tags: z.array(z.string()).default([]),
    entityType: z.nativeEnum(EntityType).default(EntityType.Note),
    metadata: z.record(z.unknown()).default({}),
  });
  
  static readonly insertSchema = createInsertSchema(notes, {
    tags: z.array(z.string()).default([]),
    entityType: z.nativeEnum(EntityType).default(EntityType.Note),
    metadata: z.record(z.unknown()).default({}),
  });
}

/**
 * Represents a chunk of content with its embedding
 */
export interface ContentChunk {
  /** ID of the chunk */
  id: string;
  
  /** ID of the parent note */
  noteId: string;
  
  /** Index of this chunk within the entity */
  chunkIndex: number;
  
  /** The text content of this chunk */
  content: string;
  
  /** Vector embedding of the chunk */
  embedding?: number[];
  
  /** Type of the parent entity */
  entityType: EntityType;
}

/**
 * Static validators for ContentChunk using zod schema
 */
export const contentChunkSchema = createSelectSchema(noteChunks, {
  embedding: z.array(z.number()).optional(),
  entityType: z.nativeEnum(EntityType),
});

export const insertContentChunkSchema = createInsertSchema(noteChunks, {
  embedding: z.array(z.number()).optional(),
  entityType: z.nativeEnum(EntityType),
});

export type NewContentChunk = z.infer<typeof insertContentChunkSchema>;
```

### Standardized Entity Adapter Interface

```typescript
/**
 * Enhanced adapter interface for converting between domain models and notes
 * With standardized markdown generation
 */
export interface IEntityAdapter<T> {
  /**
   * Convert domain model to note for storage
   */
  toNote(model: T): Note;
  
  /**
   * Convert note to domain model
   */
  fromNote(note: Note): T;
  
  /**
   * Get entity type for this adapter
   */
  getEntityType(): EntityType;
  
  /**
   * Convert model to markdown format for consistent processing
   */
  toMarkdown(model: T): string;
}
```

### Unified Content Processing Service

```typescript
/**
 * Central service for processing content across all entity types
 * Handles embedding, tagging, and chunking in a unified way
 */
export class ContentProcessingService {
  private static instance: ContentProcessingService | null = null;
  
  private embeddingService: EmbeddingService;
  private tagService: TagService;
  private noteRepository: NoteRepository;
  
  // Registry of entity adapters
  private adapters: Map<EntityType, IEntityAdapter<any>> = new Map();
  
  /**
   * Get singleton instance
   */
  public static getInstance(): ContentProcessingService {
    if (!ContentProcessingService.instance) {
      ContentProcessingService.instance = new ContentProcessingService();
    }
    return ContentProcessingService.instance;
  }
  
  /**
   * Reset instance (for testing)
   */
  public static resetInstance(): void {
    ContentProcessingService.instance = null;
  }
  
  /**
   * Create fresh instance (for testing)
   */
  public static createFresh(options?: Record<string, unknown>): ContentProcessingService {
    return new ContentProcessingService(options);
  }
  
  private constructor(options?: Record<string, unknown>) {
    this.embeddingService = EmbeddingService.getInstance();
    this.tagService = TagService.getInstance();
    this.noteRepository = NoteRepository.getInstance();
  }
  
  /**
   * Register an entity adapter
   */
  registerAdapter<T>(entityType: EntityType, adapter: IEntityAdapter<T>): void {
    this.adapters.set(entityType, adapter);
  }
  
  /**
   * Get adapter for an entity type
   */
  getAdapter<T>(entityType: EntityType): IEntityAdapter<T> {
    const adapter = this.adapters.get(entityType);
    if (!adapter) {
      throw new Error(`No adapter registered for entity type: ${entityType}`);
    }
    return adapter as IEntityAdapter<T>;
  }
  
  /**
   * Process any model to generate chunks and embeddings
   * Returns the processed note
   */
  async processModel<T>(model: T, entityType: EntityType): Promise<Note> {
    const adapter = this.getAdapter<T>(entityType);
    
    // Convert model to markdown for processing
    const markdown = adapter.toMarkdown(model);
    
    // Convert to note for storage
    const note = adapter.toNote(model);
    
    // Generate tags if none exist
    if (!note.tags || note.tags.length === 0) {
      note.tags = await this.tagService.generateTags(markdown);
    }
    
    // Save the note first to ensure it has an ID
    const savedNote = await this.noteRepository.saveNote(note);
    
    // Generate chunks from the markdown
    const chunks = await this.createChunks(markdown, savedNote.id, entityType);
    
    // Generate embeddings for the chunks
    await this.embeddingService.createEmbeddingsForChunks(chunks);
    
    // Return the saved note
    return savedNote;
  }
  
  /**
   * Create chunks from markdown content
   */
  async createChunks(markdown: string, noteId: string, entityType: EntityType): Promise<ContentChunk[]> {
    // Split content into chunks using a sliding window approach
    const chunks = this.splitIntoChunks(markdown);
    
    // Create chunk objects
    const contentChunks: NewContentChunk[] = chunks.map((content, index) => ({
      id: generateId(),
      noteId,
      content,
      chunkIndex: index,
      entityType,
    }));
    
    // Save chunks to database
    await this.noteRepository.saveNoteChunks(contentChunks);
    
    return contentChunks as ContentChunk[];
  }
  
  /**
   * Split text into overlapping chunks
   */
  private splitIntoChunks(text: string, maxChunkSize = 1000, overlap = 200): string[] {
    if (!text || text.length <= maxChunkSize) {
      return [text];
    }
    
    const chunks: string[] = [];
    let startPos = 0;
    
    while (startPos < text.length) {
      // Determine end position for this chunk
      let endPos = startPos + maxChunkSize;
      
      // Adjust to end at a sentence or paragraph boundary if possible
      if (endPos < text.length) {
        // Look for paragraph break
        const paragraphBreak = text.lastIndexOf('\n\n', endPos);
        // Look for sentence end
        const sentenceEnd = text.lastIndexOf('. ', endPos);
        
        // Prefer paragraph break if it's within reasonable distance
        if (paragraphBreak > startPos && paragraphBreak > endPos - 200) {
          endPos = paragraphBreak + 2;
        } 
        // Otherwise use sentence end if available
        else if (sentenceEnd > startPos && sentenceEnd > endPos - 100) {
          endPos = sentenceEnd + 2;
        }
      } else {
        endPos = text.length;
      }
      
      // Extract the chunk
      chunks.push(text.substring(startPos, endPos));
      
      // Move to next position with overlap
      startPos = endPos - overlap;
      // Ensure we don't go backwards (in case of small chunks)
      if (startPos <= 0 || startPos <= chunks.length * overlap) {
        startPos = endPos;
      }
    }
    
    return chunks;
  }
  
  /**
   * Search across all entity types
   */
  async search(query: string, options?: { entityTypes?: EntityType[], limit?: number }): Promise<SearchResult[]> {
    // Generate embedding for the query
    const queryEmbedding = await this.embeddingService.embedText(query);
    
    // Search for relevant chunks across all entity types or specified types
    const relevantChunks = await this.noteRepository.findSimilarChunks(
      queryEmbedding, 
      options?.entityTypes, 
      options?.limit || 10
    );
    
    // Group chunks by entity
    const chunksByEntity = this.groupChunksByEntity(relevantChunks);
    
    // Fetch the full notes for each chunk
    const notes = await this.noteRepository.findNotesByIds(Array.from(chunksByEntity.keys()));
    
    // Convert notes to their original types if needed
    return this.convertNotesToSearchResults(notes, chunksByEntity);
  }
  
  // Helper methods
  private groupChunksByEntity(chunks: ContentChunk[]): Map<string, ContentChunk[]> {
    const result = new Map<string, ContentChunk[]>();
    
    for (const chunk of chunks) {
      if (!result.has(chunk.noteId)) {
        result.set(chunk.noteId, []);
      }
      result.get(chunk.noteId)!.push(chunk);
    }
    
    return result;
  }
  
  private convertNotesToSearchResults(notes: Note[], chunksByEntity: Map<string, ContentChunk[]>): SearchResult[] {
    const results: SearchResult[] = [];
    
    for (const note of notes) {
      const chunks = chunksByEntity.get(note.id) || [];
      
      // Create result object with relevant chunks
      results.push({
        id: note.id,
        title: note.title,
        excerpt: this.createExcerptFromChunks(chunks),
        entityType: note.entityType,
        relevance: this.calculateRelevance(chunks),
        note,
      });
    }
    
    // Sort by relevance
    return results.sort((a, b) => b.relevance - a.relevance);
  }
  
  private createExcerptFromChunks(chunks: ContentChunk[]): string {
    // Sort chunks by relevance or index
    return chunks[0]?.content.substring(0, 150) + '...' || '';
  }
  
  private calculateRelevance(chunks: ContentChunk[]): number {
    // Calculate an average relevance score based on embedding similarity
    // This would use the similarity score stored with each chunk
    return chunks.length > 0 ? 0.9 : 0.1; // Placeholder
  }
}
```

### NoteRepository Enhancement

```typescript
/**
 * Enhanced NoteRepository with entityType support
 */
export class NoteRepository {
  private static instance: NoteRepository | null = null;
  private db: DbConnection;
  
  // Singleton implementation...
  
  /**
   * Find notes by entity type
   */
  async findNotesByEntityType(entityType: EntityType, options?: { limit?: number, offset?: number }): Promise<Note[]> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    
    const result = await this.db.select().from(notes)
      .where(eq(notes.entityType, entityType))
      .limit(limit)
      .offset(offset);
      
    return result.map(row => this.mapRowToNote(row));
  }
  
  /**
   * Find similar chunks based on embedding
   * For SQLite, we need to implement vector similarity manually since it doesn't have
   * native vector operations like PostgreSQL
   */
  async findSimilarChunks(
    embedding: number[], 
    entityTypes?: EntityType[], 
    limit = 10
  ): Promise<ContentChunk[]> {
    // Fetch chunks, optionally filtered by entity type
    let query = this.db.select().from(noteChunks);
      
    if (entityTypes && entityTypes.length > 0) {
      query = query.where(inArray(noteChunks.entityType, entityTypes));
    }
    
    const chunks = await query;
    
    // Calculate similarity manually since SQLite doesn't have vector operations
    const chunksWithSimilarity = chunks.map(chunk => {
      const chunkEmbedding = chunk.embedding as number[] || [];
      const similarity = this.calculateCosineSimilarity(embedding, chunkEmbedding);
      return { ...chunk, similarity };
    });
    
    // Sort by similarity and take top results
    return chunksWithSimilarity
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(chunk => this.mapRowToContentChunk(chunk));
  }
  
  /**
   * Save note chunks
   */
  async saveNoteChunks(chunks: NewContentChunk[]): Promise<void> {
    if (chunks.length === 0) return;
    
    // Use transaction for better performance
    await this.db.transaction(async (tx) => {
      for (const chunk of chunks) {
        await tx.insert(noteChunks).values(chunk);
      }
    });
  }
  
  /**
   * Calculate cosine similarity between two vectors
   */
  private calculateCosineSimilarity(a: number[], b: number[]): number {
    if (!a.length || !b.length || a.length !== b.length) {
      return 0;
    }
    
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }
    
    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);
    
    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }
    
    return dotProduct / (magnitudeA * magnitudeB);
  }
  
  // Helper methods for mapping rows to objects
  private mapRowToNote(row: any): Note {
    return new Note({
      id: row.id,
      title: row.title,
      content: row.content,
      tags: row.tags,
      created: row.created,
      updated: row.updated,
      entityType: row.entityType,
      metadata: row.metadata,
    });
  }
  
  private mapRowToContentChunk(row: any): ContentChunk {
    return {
      id: row.id,
      noteId: row.noteId,
      content: row.content,
      chunkIndex: row.chunkIndex,
      embedding: row.embedding,
      entityType: row.entityType,
    };
  }
}
```

### Adapter Implementation Example

```typescript
/**
 * Profile to Note adapter with enhanced functionality
 */
export class ProfileAdapter implements IEntityAdapter<Profile> {
  /**
   * Convert profile to note for storage
   */
  toNote(profile: Profile): Note {
    return new Note({
      id: profile.id,
      title: `Profile: ${profile.name}`,
      content: JSON.stringify(profile, null, 2),
      tags: profile.tags || [],
      created: profile.created,
      updated: profile.updated,
      // Use EntityType enum directly on the note
      entityType: EntityType.Profile,
      // Keep profile-specific data in metadata
      metadata: {
        profileType: profile.profileType,
        // Other profile-specific fields that aren't part of the Note schema
      },
    });
  }
  
  /**
   * Convert note to profile
   */
  fromNote(note: Note): Profile {
    try {
      const profileData = JSON.parse(note.content);
      return new Profile({
        ...profileData,
        id: note.id,
        // Include any additional metadata if needed
        profileType: note.metadata?.profileType as string,
      });
    } catch (error) {
      throw new Error(`Failed to parse profile data from note: ${error.message}`);
    }
  }
  
  /**
   * Get entity type
   */
  getEntityType(): EntityType {
    return EntityType.Profile;
  }
  
  /**
   * Convert profile to markdown for processing
   */
  toMarkdown(profile: Profile): string {
    let markdown = `# ${profile.name}\n\n`;
    
    if (profile.tagline) {
      markdown += `${profile.tagline}\n\n`;
    }
    
    if (profile.bio) {
      markdown += `## About\n\n${profile.bio}\n\n`;
    }
    
    if (profile.skills && profile.skills.length) {
      markdown += `## Skills\n\n`;
      for (const skill of profile.skills) {
        markdown += `- ${skill}\n`;
      }
      markdown += '\n';
    }
    
    if (profile.experience && profile.experience.length) {
      markdown += `## Experience\n\n`;
      for (const exp of profile.experience) {
        markdown += `### ${exp.title} at ${exp.company}\n`;
        markdown += `${exp.startDate} - ${exp.endDate || 'Present'}\n\n`;
        markdown += `${exp.description}\n\n`;
      }
    }
    
    return markdown;
  }
}
```

## Implementation Plan: Phased Approach with Feature Flags

To minimize risk and ensure functionality throughout the transition, we'll use a **feature flag approach**:

1. Create a feature flag system to conditionally enable/disable contexts
2. Implement the unified model with only Note context enabled initially
3. Verify core functionality works with minimal context configuration
4. Gradually enable and migrate each context one by one
5. Use feature flags rather than physically moving code until proven stable

This approach will:
- Allow testing the architecture without major structural changes
- Minimize risk by keeping original code intact until verified
- Provide easy rollback capabilities if needed
- Let us test the system's behavior with partial context availability

### Phase 1: Feature Flag System (3 days)

1. **Create Context Feature Flags** (Day 1)
   - Implement `ContextFeatureFlags` configuration in `ConfigurationManager`
   - Add flags for each context type (Note, Profile, Conversation, etc.)
   - Set up environment variable-based configuration
   - Create fallback mechanism for disabled contexts

   ```typescript
   // In src/protocol/core/configurationManager.ts
   export interface ContextFeatureFlags {
     enableNoteContext: boolean;
     enableProfileContext: boolean;
     enableConversationContext: boolean;
     enableWebsiteContext: boolean;
     enableExternalSourceContext: boolean;
   }

   export const DEFAULT_CONTEXT_FEATURE_FLAGS: ContextFeatureFlags = {
     enableNoteContext: true,
     enableProfileContext: true, 
     enableConversationContext: true,
     enableWebsiteContext: true,
     enableExternalSourceContext: true
   };

   // Add to ConfigurationManager class
   public getContextFeatureFlags(): ContextFeatureFlags {
     return {
       enableNoteContext: this.getBooleanFromEnv('ENABLE_NOTE_CONTEXT', true),
       enableProfileContext: this.getBooleanFromEnv('ENABLE_PROFILE_CONTEXT', true),
       enableConversationContext: this.getBooleanFromEnv('ENABLE_CONVERSATION_CONTEXT', true),
       enableWebsiteContext: this.getBooleanFromEnv('ENABLE_WEBSITE_CONTEXT', true),
       enableExternalSourceContext: this.getBooleanFromEnv('ENABLE_EXTERNAL_SOURCE_CONTEXT', true),
     };
   }
   ```

2. **Update ContextManager** (Day 2)
   - Modify context initialization to respect feature flags
   - Add graceful degradation when contexts are disabled
   - Implement context availability checking
   - Create logging for disabled contexts
   
   ```typescript
   // In src/protocol/managers/contextManager.ts
   public initializeContexts(): void {
     const featureFlags = this.configManager.getContextFeatureFlags();
     
     // Always initialize NoteContext as our base functionality
     if (featureFlags.enableNoteContext) {
       this.noteContext = MCPNoteContext.getInstance();
       this.noteContext.initialize();
     } else {
       this.logger.warn('Note context is disabled by feature flags!');
     }
     
     // Initialize other contexts based on feature flags
     if (featureFlags.enableProfileContext) {
       this.profileContext = MCPProfileContext.getInstance();
       this.profileContext.initialize();
     } else {
       this.logger.info('Profile context is disabled by feature flags');
     }
     
     // Similar conditional initialization for other contexts...
   }
   ```

3. **Modify BrainProtocol** (Day 3)
   - Update to handle missing contexts gracefully
   - Implement fallback behavior for disabled contexts
   - Add context availability checking before operations
   - Add diagnostic commands to show feature flag status

### Phase 2: Schema and Model Updates with Minimal Context (1 week)

1. **Test with Only Note Context** (Days 1-2)
   - Set feature flags to enable only NoteContext
   - Verify system starts and operates with minimal functionality
   - Identify and fix critical dependencies
   - Document basic supported operations

2. **Update the database schema**
   - Add entityType to notes table (replacing source field where applicable)
   - Update note_chunks table to include entityType
   - Let Drizzle generate the migration
   - Update schemas and types

3. **Enhance the Note model**
   - Implement IContentModel interface
   - Add entityType property
   - Add standardized toMarkdown method

4. **Create the EntityType enum**
   - Define all supported entity types
   - Update existing code to use the enum

### Phase 3: Standardize Entity Adapters and Note Processing (1 week)

1. **Define the enhanced IEntityAdapter interface**
   - Add toMarkdown method requirement
   - Add getEntityType method

2. **Update Note adapter first**
   - Focus on getting the base Note adapter working properly
   - Implement consistent markdown generation for Notes
   - Create helpers for common markdown patterns
   - Keep other adapters unchanged but flag-disabled

3. **Implement the ContentProcessingService for Notes**
   - Create the adapter registry
   - Implement processModel method for Notes
   - Implement search method that works for Note entities
   - Ensure embeddings and tagging work for Notes

4. **Update NoteRepository**
   - Add entityType-based queries
   - Enhance chunk storage and retrieval
   - Implement manual vector similarity for SQLite

### Phase 4: Enable and Migrate Profile Context (1 week)

1. **Update Profile adapter**
   - Implement to use the enhanced interface with toMarkdown method
   - Ensure proper entityType handling
   - Test with sample profiles

2. **Extend ContentProcessingService for Profiles**
   - Update to handle Profile entities
   - Ensure embeddings and tagging work for Profiles

3. **Update ProfileContext**
   - Modify to use the new ContentProcessingService
   - Retain backward compatibility through feature flags
   - Test with flag enabled vs disabled

4. **Enable Profile Context**
   - Set feature flag to enable ProfileContext
   - Test full system with both Note and Profile contexts
   - Verify interoperability and search across types

### Phase 5: Enable and Migrate Website Context (1 week)

1. **Update Website adapters**
   - Implement enhanced interface for website sections
   - Add toMarkdown method for website content
   - Test markdown generation for website content

2. **Extend ContentProcessingService for Website**
   - Update to handle Website entities
   - Ensure embeddings and tagging work for website content

3. **Update WebsiteContext**
   - Modify to use the new ContentProcessingService
   - Retain backward compatibility through feature flags
   - Test website generation and deployment

4. **Enable Website Context**
   - Set feature flag to enable WebsiteContext
   - Test full system with Note, Profile, and Website contexts
   - Verify interoperability and search across types

### Phase 6: Enable Remaining Contexts (1 week)

1. **Update Conversation adapter**
   - Implement enhanced interface for conversations
   - Add toMarkdown method for conversation content
   - Test with tiered memory system

2. **Update ExternalSource adapter**
   - Implement enhanced interface for external sources
   - Add toMarkdown method for external content
   - Test with news and Wikipedia

3. **Enable All Contexts**
   - Set feature flags to enable all contexts
   - Test full system with all contexts enabled
   - Verify interoperability and search across all types

### Phase 7: Search Enhancement and Migration Completion (1 week)

1. **Implement unified search across all entity types**
   - Create a common search interface
   - Support filtering by entity type
   - Implement relevance ranking that works across types

2. **Complete migration and cleanup**
   - Process existing notes to add entityType based on metadata or source
   - Process existing content to generate standardized markdown
   - Create chunks for existing content
   - Generate embeddings for all chunks

3. **Implement advanced relationship features**
   - Content recommendation across entity types
   - Related content discovery
   - Content clustering

## Benefits

1. **Simplified architecture** with consistent interfaces
2. **Reduced code duplication** across entity types
3. **Improved schema** with explicit entityType field on notes and chunks
4. **Better cross-entity search** with standardized approach
5. **More maintainable codebase** with consistent patterns
6. **Enhanced content processing** with standardized markdown generation
7. **Better testability** with clear interface boundaries
8. **Easier onboarding** for new developers due to consistency

## Risks and Mitigation

1. **Migration complexity**
   - Mitigation: Use feature flags to enable only the Note context initially
   - Gradually enable additional contexts one at a time after verification
   - Use Drizzle to handle schema changes
   - Create data validation tools to ensure integrity
   - Keep original code paths intact until full verification

2. **Performance impact**
   - Mitigation: Add appropriate indexes for entityType
   - Implement manual vector similarity calculation optimized for SQLite
   - Optimize chunk size and embedding generation
   - Implement batch processing and caching
   - Test performance with different feature flag configurations

3. **SQLite limitations**
   - Mitigation: Implement custom vector similarity calculation
   - Consider using SQLite extensions for vector operations if needed
   - Optimize queries for SQLite's strengths

4. **Integration failures**
   - Mitigation: Use feature flags to isolate problematic components
   - Test system with only Note context before adding others
   - Implement graceful degradation for disabled contexts
   - Add comprehensive error handling for partial context configurations

## Next Steps

1. **Implement Feature Flag System**
   - Create ContextFeatureFlags interface in ConfigurationManager
   - Add environment variable controls for each context
   - Implement context initialization with feature flag checks
   - Update BrainProtocol to handle partial context configurations

2. **Start with Note Context Only**
   - Set feature flags to enable only NoteContext initially
   - Create the EntityType enum and update Note schema
   - Update the Note model to implement IContentModel interface
   - Let Drizzle generate the migration

3. **Build Core Processing Service**
   - Create a prototype of the ContentProcessingService for Notes only
   - Implement essential services (embedding, tagging, chunking) for Notes
   - Test thoroughly with only Note context enabled

4. **Validate with Note Context**
   - Run full system tests with only Note context
   - Verify all note-based functionality works properly
   - Fix any issues before proceeding to other contexts

5. **Gradually Enable Profile Context**
   - Update Profile adapter to implement enhanced interface
   - Enable ProfileContext via feature flag
   - Test system with both Note and Profile contexts
   - Verify cross-entity functionality works

6. **Continue with Remaining Contexts**
   - Enable each additional context one by one via feature flags
   - Test thoroughly after each addition
   - Maintain the ability to disable problematic contexts

7. **Testing Command for Feature Flag Configurations**
   ```bash
   # Test with only NoteContext enabled
   ENABLE_PROFILE_CONTEXT=false ENABLE_CONVERSATION_CONTEXT=false ENABLE_WEBSITE_CONTEXT=false ENABLE_EXTERNAL_SOURCE_CONTEXT=false bun run src/index.ts
   
   # Test with Note and Profile contexts
   ENABLE_CONVERSATION_CONTEXT=false ENABLE_WEBSITE_CONTEXT=false ENABLE_EXTERNAL_SOURCE_CONTEXT=false bun run src/index.ts
   
   # Gradually enable more contexts as implementation progresses
   ```

## Implementation Principles

1. **Feature Flag-Driven Development**: Use feature flags as the primary control mechanism for enabling/disabling components during the transition.

2. **Minimal Context First**: Start with only the Note context enabled and verify all core functionality before proceeding.

3. **Gradual Migration**: Enable contexts one by one, ensuring each is thoroughly tested before moving to the next.

4. **Parallel Code Paths**: Keep original code intact alongside new implementations until fully verified with feature flags.

5. **Test-First Approach**: Update tests for each context before changing implementation to ensure they pass in both configurations.

6. **Fallback Mechanisms**: Implement graceful degradation for disabled contexts to maintain partial functionality.

7. **Composition Over Inheritance**: Use composition patterns consistently across all entity implementations.

8. **Clear Interfaces**: Maintain explicit interfaces between components to enable easy feature flagging.

9. **Documentation**: Document the feature flag approach and provide examples of different configurations.

10. **Performance Awareness**: Monitor and optimize performance with each context addition.