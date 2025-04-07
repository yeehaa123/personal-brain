# Conversation Context Design

This document outlines the design for the ConversationContext component, which will manage conversation data and operations through the Model-Context-Protocol (MCP) architecture.

## Overview

The ConversationContext will be a full-fledged context in the MCP architecture, similar to NoteContext and ProfileContext. It will manage conversations, including creation, retrieval, storage, and tiered memory functionality.

## Objectives

1. **Architectural Alignment**: Create a consistent architecture with other contexts
2. **Separation of Concerns**: Remove conversation management from BrainProtocol
3. **MCP Integration**: Expose conversations through MCP resources and tools
4. **Storage Flexibility**: Support multiple storage backends (in-memory, SQLite)
5. **Tiered Memory**: Maintain the existing tiered memory functionality

## Architecture

```
                  ┌───────────────────┐
                  │  BrainProtocol    │
                  └─────────┬─────────┘
                            │
                  ┌─────────▼─────────┐
                  │  ContextManager   │
                  └─────────┬─────────┘
                            │
           ┌────────────────┼───────────────────┐
           │                │                   │
┌──────────▼─────────┐    ┌─▼───────────────┐ ┌─▼─────────────────┐
│    NoteContext     │    │ConversationContext│ │  ProfileContext   │
└──────────┬─────────┘    └─┬───────────────┘ └─┬─────────────────┘
           │                │                   │
┌──────────▼─────────┐    ┌─▼───────────────┐ ┌─▼─────────────────┐
│  Repository Layer  │    │  Storage Layer   │ │  Repository Layer  │
└────────────────────┘    └─────────────────┘ └───────────────────┘
```

### Core Components

1. **ConversationContext**
   - Main facade providing conversation operations
   - Manages MCP resources and tools
   - Delegates to specialized components
   - Maintains singleton pattern for global access

2. **ConversationStorage**
   - Interface defining storage operations
   - Multiple implementations (InMemory, SQLite)
   - Handles persistence and retrieval

3. **TieredMemoryManager**
   - Manages active, summary, and archive tiers
   - Handles summarization of older turns
   - Optimizes memory usage

4. **ConversationFormatter**
   - Formats conversations for different outputs
   - Handles prompt formatting
   - Manages attribution and styling

5. **ConversationIndexer**
   - Indexes conversations for search
   - Manages metadata and tags
   - Provides efficient querying

## Component Details

### ConversationContext

```typescript
export class ConversationContext {
  private static instance: ConversationContext | null = null;
  
  private storage: ConversationStorage;
  private tieredMemoryManager: TieredMemoryManager;
  private formatter: ConversationFormatter;
  private indexer: ConversationIndexer;
  
  // MCP Server elements
  private mcpServer: McpServer | null = null;
  private conversationResources: McpResource[] = [];
  private conversationTools: McpTool[] = [];
  
  private constructor(options?: ConversationContextOptions) {
    // Initialize components
    this.storage = options?.storage || new InMemoryStorage();
    this.tieredMemoryManager = new TieredMemoryManager(this.storage);
    this.formatter = new ConversationFormatter();
    this.indexer = new ConversationIndexer(this.storage);
    
    // Initialize MCP resources and tools
    this.initializeMcpResources();
    this.initializeMcpTools();
  }
  
  public static getInstance(options?: ConversationContextOptions): ConversationContext {
    if (!ConversationContext.instance) {
      ConversationContext.instance = new ConversationContext(options);
    }
    return ConversationContext.instance;
  }
  
  // Core conversation operations
  async createConversation(interfaceType: 'cli' | 'matrix', roomId: string): Promise<string>;
  async getConversation(conversationId: string): Promise<Conversation | null>;
  async addTurn(conversationId: string, query: string, response?: string, options?: TurnOptions): Promise<void>;
  async getConversationHistory(conversationId: string, options?: HistoryOptions): Promise<string>;
  
  // Tiered memory operations
  async forceSummarize(conversationId: string): Promise<void>;
  async getTieredHistory(conversationId: string): Promise<TieredHistory>;
  
  // Search and indexing
  async findConversations(criteria: SearchCriteria): Promise<ConversationSummary[]>;
  async getConversationsByRoom(roomId: string): Promise<ConversationSummary[]>;
  async getRecentConversations(limit?: number): Promise<ConversationSummary[]>;
  
  // MCP resource and tool registration
  registerWithMcpServer(mcpServer: McpServer): void;
  getResources(): McpResource[];
  getTools(): McpTool[];
  
  // Storage management
  getStorage(): ConversationStorage;
  setStorage(storage: ConversationStorage): void;
  migrateStorage(newStorage: ConversationStorage): Promise<void>;
}
```

### ConversationStorage Interface

```typescript
export interface ConversationStorage {
  // Conversation operations
  createConversation(conversation: NewConversation): Promise<string>;
  getConversation(conversationId: string): Promise<Conversation | null>;
  getConversationByRoom(roomId: string, interfaceType?: 'cli' | 'matrix'): Promise<string | null>;
  updateConversation(conversationId: string, updates: Partial<Conversation>): Promise<boolean>;
  deleteConversation(conversationId: string): Promise<boolean>;
  
  // Turn operations
  addTurn(conversationId: string, turn: ConversationTurn): Promise<string>;
  getTurns(conversationId: string, limit?: number, offset?: number): Promise<ConversationTurn[]>;
  updateTurn(turnId: string, updates: Partial<ConversationTurn>): Promise<boolean>;
  
  // Summary operations
  addSummary(conversationId: string, summary: ConversationSummary): Promise<string>;
  getSummaries(conversationId: string): Promise<ConversationSummary[]>;
  
  // Search and querying
  findConversations(criteria: SearchCriteria): Promise<ConversationSummary[]>;
  getRecentConversations(limit?: number, interfaceType?: 'cli' | 'matrix'): Promise<ConversationSummary[]>;
  
  // Metadata operations
  updateMetadata(conversationId: string, metadata: Record<string, any>): Promise<boolean>;
  getMetadata(conversationId: string): Promise<Record<string, any> | null>;
}
```

### TieredMemoryManager

```typescript
export class TieredMemoryManager {
  private storage: ConversationStorage;
  private summarizer: ConversationSummarizer;
  private tieredMemoryConfig: TieredMemoryConfig;
  
  constructor(storage: ConversationStorage, config?: Partial<TieredMemoryConfig>) {
    this.storage = storage;
    this.summarizer = new ConversationSummarizer();
    this.tieredMemoryConfig = {
      maxActiveTurns: config?.maxActiveTurns || 10,
      maxSummaries: config?.maxSummaries || 3,
      summaryTurnCount: config?.summaryTurnCount || 5,
      maxArchivedTurns: config?.maxArchivedTurns || 50,
      maxTokens: config?.maxTokens || 2000,
      relevanceDecay: config?.relevanceDecay || 0.9,
    };
  }
  
  // Tier management
  async checkAndSummarize(conversationId: string): Promise<boolean>;
  async forceSummarize(conversationId: string): Promise<boolean>;
  async getTieredHistory(conversationId: string): Promise<TieredHistory>;
  
  // Formatting for prompts
  async formatHistoryForPrompt(conversationId: string, maxTokens?: number): Promise<string>;
  
  // Configuration management
  setConfig(config: Partial<TieredMemoryConfig>): void;
  getConfig(): TieredMemoryConfig;
}
```

## MCP Resources and Tools

### MCP Resources

1. **conversations://list**
   - Lists all conversations
   - Supports filtering by interface type, date range
   - Pagination support

2. **conversations://get/:id**
   - Get details of a specific conversation
   - Includes metadata, turns, and summaries

3. **conversations://search**
   - Search conversations by content
   - Support for keyword and semantic search

4. **conversations://room/:roomId**
   - Get conversations associated with a specific room

5. **conversations://recent**
   - Get most recent conversations
   - Configurable limit parameter

### MCP Tools

1. **create_conversation**
   - Creates a new conversation
   - Parameters: interfaceType, roomId

2. **add_turn**
   - Adds a turn to a conversation
   - Parameters: conversationId, query, response, userId, userName

3. **summarize_conversation**
   - Forces summarization of a conversation
   - Parameters: conversationId

4. **get_conversation_history**
   - Retrieves formatted conversation history
   - Parameters: conversationId, format

5. **search_conversations**
   - Searches conversations
   - Parameters: query, filter criteria

## Storage Implementation Plan

### Phase 1: In-Memory Implementation

The initial implementation will continue to use the existing InMemoryStorage class, refactored to implement the ConversationStorage interface.

```typescript
export class InMemoryStorage implements ConversationStorage {
  private conversations: Map<string, Conversation> = new Map();
  private turns: Map<string, ConversationTurn> = new Map();
  private summaries: Map<string, ConversationSummary[]> = new Map();
  private roomIndex: Map<string, string> = new Map();
  
  // Implementation of ConversationStorage interface methods
  // ...
}
```

### Phase 2: SQLite Implementation

After the ConversationContext API is stable, we'll implement a SQLiteStorage class that uses Drizzle ORM to persist conversations to the database.

```typescript
export class SQLiteStorage implements ConversationStorage {
  private db: SQLiteDatabase;
  
  constructor(dbPath?: string) {
    this.db = connectToDatabase(dbPath || './brain.db');
  }
  
  // Implementation of ConversationStorage interface methods using SQLite
  // ...
}
```

#### Database Schema

```typescript
// Conversations table
export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  interfaceType: text('interface_type').notNull(),
  roomId: text('room_id').notNull(),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  metadata: text('metadata'), // JSON string
});

// Turns table
export const turns = sqliteTable('conversation_turns', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => conversations.id),
  userId: text('user_id'),
  userName: text('user_name'),
  query: text('query').notNull(),
  response: text('response'),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
  metadata: text('metadata'), // JSON string
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  summaryId: text('summary_id').references(() => summaries.id),
});

// Summaries table
export const summaries = sqliteTable('conversation_summaries', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => conversations.id),
  content: text('content').notNull(),
  startTurnId: text('start_turn_id').references(() => turns.id),
  endTurnId: text('end_turn_id').references(() => turns.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  metadata: text('metadata'), // JSON string
});

// Room index for quick lookup
export const roomIndex = sqliteTable('conversation_room_index', {
  roomId: text('room_id').notNull(),
  interfaceType: text('interface_type').notNull(),
  conversationId: text('conversation_id').notNull().references(() => conversations.id),
  
  // Composite primary key
  primaryKey: { columns: ['room_id', 'interface_type'] },
});
```

## Integration with BrainProtocol

The BrainProtocol will be updated to:

1. **Initialize ConversationContext** in the ContextManager
2. **Replace ConversationManager** with forwarding methods to ConversationContext
3. **Use ConversationContext in QueryProcessor** for history retrieval

```typescript
// Updated ContextManager
export class ContextManager implements IContextManager {
  private noteContext: NoteContext;
  private profileContext: ProfileContext;
  private externalSourceContext: ExternalSourceContext;
  private conversationContext: ConversationContext; // New

  constructor(config: BrainProtocolConfig) {
    // Initialize contexts
    this.noteContext = NoteContext.getInstance();
    this.profileContext = ProfileContext.getInstance();
    this.externalSourceContext = ExternalSourceContext.getInstance();
    this.conversationContext = ConversationContext.getInstance(); // New
    
    // More initialization...
  }
  
  // Getter for ConversationContext
  getConversationContext(): ConversationContext {
    return this.conversationContext;
  }
  
  // More methods...
}
```

## Migration Strategy

The migration from the previous architecture to ConversationContext:

1. **Preserve Interfaces**: Maintained backward compatibility where possible
2. **Gradual Adoption**: Updated one component at a time
3. **Comprehensive Testing**: Ensured extensive test coverage
4. **Proper Mocking**: Updated tests to use proper mock implementations

The ConversationManager has been updated to delegate to ConversationContext, providing a smooth transition.

## Testing Strategy

1. **Unit Tests**:
   - Test each component in isolation
   - Mock dependencies appropriately
   - Test edge cases and error handling

2. **Integration Tests**:
   - Test ConversationContext with InMemoryStorage
   - Test tiered memory functionality end-to-end
   - Test MCP resource and tool behavior

3. **Storage-Specific Tests**:
   - Test InMemoryStorage implementation
   - Test SQLiteStorage implementation
   - Test storage migration

4. **BrainProtocol Integration Tests**:
   - Test conversation functions through BrainProtocol
   - Ensure consistent behavior across interfaces

## Implementation Status

The ConversationContext migration has been fully completed with the following achievements:

1. ✅ Created the basic structure for ConversationContext extending BaseContext
2. ✅ Refactored InMemoryStorage to implement the ConversationStorage interface
3. ✅ Moved tiered memory functionality into specialized services
4. ✅ Moved conversation management components to the proper directory structure
5. ✅ Implemented MCP resources and tools in dedicated service classes
6. ✅ Created formatters for different output formats (text, MCP)
7. ✅ Added comprehensive tests for all components
8. ✅ Removed redundant implementations in protocol/memory
9. ✅ Implemented dependency injection through the service registry
10. ✅ Fixed all test failures related to the migration
11. ✅ Updated documentation to reflect the new architecture

### Architecture Modernization

The ConversationContext now follows the standardized context architecture:

**Component Structure**
- **Core Implementation**: `ConversationContext` extends `BaseContext` and coordinates services
- **Storage Adapter**: `ConversationStorageAdapter` adapts storage implementations to a standard interface
- **Service Components**:
  - `ConversationQueryService`: Handles conversation retrieval and search operations
  - `ConversationMemoryService`: Manages tiered memory and summarization
  - `ConversationResourceService`: Provides MCP resources
  - `ConversationToolService`: Provides MCP tools
- **Formatters**:
  - `ConversationFormatter`: Formats conversation data for display
  - `ConversationMcpFormatter`: Formats conversation data for MCP responses

**Dependency Management**
- All components are registered in the service registry
- Services are resolved through dependency injection
- Component dependencies are explicit and testable
- Context delegates operations to specialized services

**Improved Testing**
- Mock implementations allow for isolated testing
- Tests focus on contracts rather than implementation details
- Test isolation prevents cross-test contamination
- Better error handling and diagnostics

## Future Enhancements

With the ConversationContext now fully established, future enhancements include:

1. Implement SQLiteStorage for persistent storage
2. Add conversation indexing for efficient search
3. Add conversation analytics capabilities
4. Enhance tiered memory with token-based management
5. Add conversation export/import functionality
6. Improve summarization with configurable strategies
7. Add conversation-level vector embeddings for semantic search