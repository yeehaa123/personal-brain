# Personal Brain Planning

## Current Priority: Unified Entity Model Architecture

The unified entity model is the **current top priority** for architectural improvements. This approach will standardize all entities (notes, profiles, conversations, website content) under a single model interface with consistent patterns for:

1. Storage as notes with specific `entityType` values
2. Markdown representation via `toMarkdown()` methods
3. Centralized embedding, tagging, and chunking
4. Clean interfaces using composition over inheritance
5. Simplified cross-entity search and operations

## Implementation Strategy: Phased Approach with Feature Flags

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

## Implementation Phases

### Phase 1: Feature Flag System (3 days)

1. **Create Context Feature Flags** (Day 1)
   - Implement `ContextFeatureFlags` configuration in `ConfigurationManager`
   - Add flags for each context type (Note, Profile, Conversation, etc.)
   - Set up environment variable-based configuration
   - Create fallback mechanism for disabled contexts

2. **Update ContextManager** (Day 2)
   - Modify context initialization to respect feature flags
   - Add graceful degradation when contexts are disabled
   - Implement context availability checking
   - Create logging for disabled contexts

3. **Modify BrainProtocol** (Day 3)
   - Update to handle missing contexts gracefully
   - Implement fallback behavior for disabled contexts
   - Add context availability checking before operations
   - Add diagnostic commands to show feature flag status

### Phase 2: Minimal Viable Architecture (1 week)

1. **Test with Only Note Context** (Days 1-2)
   - Set feature flags to enable only NoteContext
   - Verify system starts and operates with minimal functionality
   - Identify and fix critical dependencies
   - Document basic supported operations

2. **Update Note Model** (Days 2-3)
   - Add `entityType` field to Note model
   - Implement `EntityType` enum
   - Update database schema
   - Replace current source field with entityType

3. **Design Base Interfaces** (Days 3-4)
   - Create `BaseEntity` interface
   - Define `toMarkdown()` method standard
   - Implement metadata handling
   - Update Note to implement BaseEntity

4. **Content Processing Service** (Days 4-5)
   - Implement unified `ContentProcessingService`
   - Centralize embedding generation for Notes
   - Standardize tag extraction
   - Create content chunking utilities

### Phase 3: BrainProtocol & Note Layer (1 week)

1. **Adapt Repository** (Days 1-2)
   - Update NoteRepository to support EntityType filtering
   - Optimize query patterns for entity types
   - Create note-specific accessors
   - Build test coverage for new functions

2. **Update NoteContext** (Days 3-4)
   - Update MCPNoteContext to support entity typing
   - Create entity-specific creation methods
   - Update note tools for entity operations
   - Update tests for new functionality

3. **Update BrainProtocol** (Days 4-5)
   - Update BrainProtocol to support unified entities
   - Fix messaging for note operations
   - Update command handlers for notes
   - Get all note-related tests passing

### Phase 4: Enable and Migrate Profile Context (1 week)

1. **Profile Entity Implementation** (Days 1-2)
   - Create Profile entity implementation
   - Implement Profile toMarkdown method
   - Update Profile schema to use entityType
   - Create ProfileAdapter

2. **Update ProfileContext** (Days 3-5)
   - Update MCPProfileContext to use BaseEntity and ContentProcessingService
   - Remove direct NoteContext dependency
   - Update profile tools to use new model
   - Fix cross-context dependencies
   - Update profile test suite

3. **Enable Profile Context** (Day 5)
   - Update feature flags to enable ProfileContext
   - Test system with both Note and Profile contexts
   - Verify all profile-related functionality works
   - Fix any integration issues

### Phase 5: Enable and Migrate Website Context (1 week)

1. **Website Entity Implementation** (Days 1-2)
   - Create WebsiteSection entity implementation
   - Implement WebsiteSection toMarkdown method
   - Create WebsiteSectionAdapter

2. **Update WebsiteContext** (Days 3-4)
   - Update MCPWebsiteContext to use BaseEntity
   - Fix related tools and services
   - Update tests for website functionality

3. **Enable Website Context** (Day 5)
   - Update feature flags to enable WebsiteContext
   - Test system with Note, Profile, and Website contexts
   - Verify landing page generation works
   - Fix any integration issues

### Phase 6: Enable and Migrate Remaining Contexts (1 week)

1. **Conversation Entity Implementation** (Days 1-2)
   - Add Conversation entity
   - Implement Conversation toMarkdown method
   - Update ConversationContext
   - Ensure compatibility with tiered memory

2. **ExternalSource Entity Implementation** (Days 3-4)
   - Create ExternalSource entity
   - Implement ExternalSource toMarkdown method
   - Update ExternalSourceContext
   - Fix tests and functionality

3. **Enable All Contexts** (Day 5)
   - Update feature flags to enable all contexts
   - Test system with all contexts enabled
   - Fix any remaining integration issues
   - Verify all functionality works end-to-end

### Phase 7: Query Enhancements & Documentation (1 week)

1. **Query Enhancements** (Days 1-3)
   - Create unified search interface across entity types
   - Implement semantic search improvements
   - Add entity-type filtering
   - Create query optimization layer
   - Improve result formatting

2. **Documentation & Cleanup** (Days 4-5)
   - Update architectural documentation
   - Create usage examples
   - Clean up deprecated code
   - Update type definitions
   - Create developer guides for the new model
   - Remove feature flag system if no longer needed

## Feature Flag System Design

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

private getBooleanFromEnv(name: string, defaultValue: boolean): boolean {
  const value = process.env[name];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
}
```

```typescript
// In src/protocol/managers/contextManager.ts

export class ContextManager {
  // Existing code...

  public initializeContexts(): void {
    const featureFlags = this.configManager.getContextFeatureFlags();
    
    // Always initialize NoteContext
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
  
  // Helper to check context availability
  public isContextAvailable(contextType: 'note' | 'profile' | 'conversation' | 'website' | 'external'): boolean {
    const featureFlags = this.configManager.getContextFeatureFlags();
    
    switch (contextType) {
      case 'note': return featureFlags.enableNoteContext;
      case 'profile': return featureFlags.enableProfileContext;
      case 'conversation': return featureFlags.enableConversationContext;
      case 'website': return featureFlags.enableWebsiteContext;
      case 'external': return featureFlags.enableExternalSourceContext;
      default: return false;
    }
  }
}
```

## Implementation Principles

1. **Feature Flag-Driven Development**: Use flags to control context availability
2. **Gradual Implementation**: Verify functionality with minimal contexts before expanding
3. **Test-First Approach**: Update tests before changing implementation
4. **Composition Over Inheritance**: Use composition patterns consistently
5. **Clean Interfaces**: Maintain clear and explicit interfaces between components
6. **Performance Awareness**: Consider query performance, especially for vector operations
7. **Implementation Simplicity**: Focus on the simplest implementation that works

## Completed Initiatives

1. **Context System Simplification** ✅
   - Successfully migrated to MCPContext pattern
   - Removed excessive generic type parameters
   - Replaced inheritance with composition
   - Simplified interfaces to be more specific
   - Implemented all context types with the MCP pattern

2. **Service Architecture Simplification** ✅
   - Removed unnecessary abstraction layers
   - Simplified repository, search, and embedding services
   - Implemented direct service interfaces
   - Significantly reduced cognitive load

3. **MCP Context Migration** ⏳
   - Migrated 21/78 test files to behavioral testing approach
   - Implemented tiered memory in MCPConversationContext
   - Completed storage adapter implementations
   - Resolved TypeScript compilation errors

4. **MVP Core Components** ⏳
   - Protocol response simplification ✅
   - Deployment architecture with Caddy ✅
   - Website context and basic Astro setup ✅
   - Website identity service ✅
   - Landing page refinements 🔄

## Entity Type Schema

```typescript
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
```

## BaseEntity Interface

```typescript
export interface BaseEntity {
  // Core properties
  id: string;
  title: string;
  content: string;
  tags: string[];
  created: string;
  updated: string;
  entityType: EntityType;
  metadata: Record<string, unknown>;
  
  // Core methods
  toMarkdown(): string;
  toSearchableText(): string;
  
  // Optional helper methods
  getMetadata<T>(key: string): T | undefined;
  setMetadata<T>(key: string, value: T): void;
}
```

## ContentProcessingService

```typescript
export class ContentProcessingService {
  // Singleton implementation
  private static instance: ContentProcessingService | null = null;
  
  static getInstance(): ContentProcessingService {
    if (!ContentProcessingService.instance) {
      ContentProcessingService.instance = new ContentProcessingService();
    }
    return ContentProcessingService.instance;
  }
  
  static resetInstance(): void {
    ContentProcessingService.instance = null;
  }
  
  static createFresh(options?: Record<string, unknown>): ContentProcessingService {
    return new ContentProcessingService();
  }
  
  // Core functionality
  async generateEmbedding(text: string): Promise<number[]> {
    // Implementation...
  }
  
  extractTags(text: string): string[] {
    // Implementation...
  }
  
  chunkContent(text: string, maxChunkSize = 1000): string[] {
    // Implementation...
  }
  
  // Utility methods for different entity types
  processEntityContent(entity: BaseEntity): Promise<{
    embedding: number[];
    tags: string[];
    chunks: string[];
  }> {
    const markdownContent = entity.toMarkdown();
    
    return Promise.all([
      this.generateEmbedding(markdownContent),
      Promise.resolve(this.extractTags(markdownContent)),
      Promise.resolve(this.chunkContent(markdownContent))
    ]).then(([embedding, tags, chunks]) => ({
      embedding,
      tags,
      chunks
    }));
  }
}
```

## Testing with Feature Flags

To test the system with only NoteContext enabled:

```bash
# Test with only NoteContext enabled
ENABLE_PROFILE_CONTEXT=false ENABLE_CONVERSATION_CONTEXT=false ENABLE_WEBSITE_CONTEXT=false ENABLE_EXTERNAL_SOURCE_CONTEXT=false bun run src/index.ts

# Test with Note and Profile contexts
ENABLE_CONVERSATION_CONTEXT=false ENABLE_WEBSITE_CONTEXT=false ENABLE_EXTERNAL_SOURCE_CONTEXT=false bun run src/index.ts

# Gradually enable more contexts as implementation progresses
```

## Post-Implementation Benefits

1. **Simplified Codebase**: Significant reduction in code complexity and mental model
2. **Improved Search**: Cross-entity semantic search becomes straightforward
3. **Enhanced Extensibility**: Adding new entity types becomes trivial
4. **Better Performance**: Optimized storage and query patterns
5. **Easier Onboarding**: Clearer architectural patterns for new developers
6. **Future Features**: Enable more powerful features like entity relationships and knowledge graphs

## Success Metrics

1. **Code Reduction**: 15-25% reduction in total lines of code
2. **Type Safety**: Zero TypeScript errors without "any" casts
3. **Test Coverage**: >90% test coverage for all new code
4. **Query Performance**: Equal or better performance for entity queries
5. **Developer Experience**: Simplified onboarding and development workflow
6. **Feature Velocity**: Increased speed of feature development after implementation

## Next Steps

For detailed implementation plans, see:
- [Unified Entity Model Roadmap](/planning/current/unified-entity-model-roadmap.md)
- [MCP Migration TODOs](/planning/current/mcp-migration-todos.md)
- [MVP Implementation Plan](/planning/current/mvp-implementation-plan.md)
- [Service Architecture Simplification](/planning/current/service-architecture-simplification.md)
- [Context System Simplification](/planning/current/context-system-simplification.md)
- [Codebase Simplification Opportunities](/planning/current/codebase-simplification-opportunities.md)