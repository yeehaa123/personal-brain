# BrainProtocol Refactoring Design

## Current Issues

The BrainProtocol class is 528 lines long and has multiple responsibilities:

1. Managing the MCP server
2. Initializing contexts and services
3. Managing conversation memory
4. Processing queries through a complex pipeline
5. Handling external sources
6. Managing profile information

This makes the class difficult to maintain, test, and extend.

## Refactoring Approach

We'll divide BrainProtocol into several specialized components:

### 1. Core BrainProtocol

**File:** `/src/mcp/protocol/core/brainProtocol.ts`

This will be a thin orchestration layer that delegates to specialized managers:

```typescript
export class BrainProtocol {
  private static instance: BrainProtocol | null = null;
  
  private config: BrainProtocolConfig;
  private contextManager: ContextManager;
  private conversationManager: ConversationManager;
  private profileManager: ProfileManager;
  private externalSourceManager: ExternalSourceManager;
  private queryProcessor: QueryProcessor;
  
  // Singleton pattern
  public static getInstance(options?: BrainProtocolOptions): BrainProtocol
  public static resetInstance(): void
  
  // Constructor and initialization
  constructor(options?: BrainProtocolOptions)
  
  // Public API methods
  toggleExternalSources(enabled: boolean): void
  getExternalSourceContext(): ExternalSourceContext | null
  getConversationMemory(): ConversationMemory
  setCurrentRoom(roomId: string): Promise<void>
  async processQuery(query: string, options?: QueryOptions): Promise<QueryResult>
}
```

### 2. Configuration Management

**File:** `/src/mcp/protocol/config/brainProtocolConfig.ts`

Handles configuration parsing and defaults:

```typescript
export class BrainProtocolConfig {
  readonly interfaceType: 'cli' | 'matrix';
  readonly useExternalSources: boolean;
  readonly roomId?: string;
  readonly apiKey: string;
  readonly memoryStorage?: ConversationMemoryStorage;
  
  constructor(options?: BrainProtocolOptions)
  validate(): void
  getApiKey(): string
}
```

### 3. Context Manager

**File:** `/src/mcp/protocol/managers/contextManager.ts`

Manages all contexts (note, profile, external):

```typescript
export class ContextManager {
  private noteContext: NoteContext;
  private profileContext: ProfileContext | null;
  private externalSourceContext: ExternalSourceContext | null;
  
  constructor(config: BrainProtocolConfig)
  getNoteContext(): NoteContext
  getProfileContext(): ProfileContext | null
  getExternalSourceContext(): ExternalSourceContext | null
  setExternalSourcesEnabled(enabled: boolean): void
}
```

### 4. Conversation Manager

**File:** `/src/mcp/protocol/managers/conversationManager.ts`

Handles conversation memory and persistence:

```typescript
export class ConversationManager {
  private conversationMemory: ConversationMemory;
  
  constructor(config: BrainProtocolConfig)
  getConversationMemory(): ConversationMemory
  setCurrentRoom(roomId: string): Promise<void>
  initializeConversation(): Promise<void>
  saveTurn(query: string, response: string, options?: TurnOptions): Promise<void>
  getConversationHistory(): Promise<string>
}
```

### 5. Profile Manager

**File:** `/src/mcp/protocol/managers/profileManager.ts`

Manages profile information and relevance:

```typescript
export class ProfileManager {
  private profileContext: ProfileContext | null;
  private profileAnalyzer: ProfileAnalyzer;
  
  constructor(profileContext: ProfileContext | null)
  getProfile(): Promise<Profile | undefined>
  getProfileText(): Promise<string | null>
  analyzeProfileRelevance(query: string): Promise<ProfileRelevanceResult>
}
```

### 6. External Source Manager

**File:** `/src/mcp/protocol/managers/externalSourceManager.ts`

Manages external knowledge sources:

```typescript
export class ExternalSourceManager {
  private externalSourceService: ExternalSourceService | null;
  private enabled: boolean;
  
  constructor(externalSourceContext: ExternalSourceContext | null, enabled: boolean)
  isEnabled(): boolean
  setEnabled(enabled: boolean): void
  getExternalResults(query: string, relevantNotes: Note[]): Promise<ExternalSourceResult[] | null>
}
```

### 7. Query Processor

**File:** `/src/mcp/protocol/pipeline/queryProcessor.ts`

Handles the entire query processing pipeline:

```typescript
export class QueryProcessor {
  private contextManager: ContextManager;
  private conversationManager: ConversationManager;
  private profileManager: ProfileManager;
  private externalSourceManager: ExternalSourceManager;
  private promptFormatter: PromptFormatter;
  private model: ClaudeAPI;
  
  constructor(
    contextManager: ContextManager,
    conversationManager: ConversationManager,
    profileManager: ProfileManager,
    externalSourceManager: ExternalSourceManager,
    apiKey: string
  )

  async processQuery(query: string, options?: QueryOptions): Promise<QueryResult>
  
  // Pipeline stages
  private async analyzeProfile(query: string): Promise<ProfileAnalysisResult>
  private async retrieveContext(query: string, profileRelevance: number): Promise<ContextResult>
  private async getConversationHistory(): Promise<string>
  private async fetchExternalSources(query: string, relevantNotes: Note[]): Promise<ExternalSourceResult[] | null>
  private formatPrompt(query: string, context: ContextResult, history: string, externalResults: ExternalSourceResult[] | null): string
  private async callModel(systemPrompt: string, userPrompt: string): Promise<ModelResponse>
  private async saveTurn(query: string, response: string, options?: TurnOptions): Promise<void>
}
```

### 8. Types and Interfaces

**File:** `/src/mcp/protocol/types/index.ts`

```typescript
export interface BrainProtocolOptions {
  interfaceType?: 'cli' | 'matrix';
  roomId?: string;
  useExternalSources?: boolean;
  memoryStorage?: ConversationMemoryStorage;
}

export interface QueryOptions {
  userId?: string;
  userName?: string;
  roomId?: string;
}

export interface QueryResult {
  answer: string;
  sources?: {
    notes?: Note[];
    profile?: boolean;
    external?: ExternalSourceResult[];
  };
}

// Additional interfaces for internal pipeline components
export interface ProfileAnalysisResult { ... }
export interface ContextResult { ... }
export interface ModelResponse { ... }
export interface TurnOptions { ... }
```

## Implementation Strategy

1. Create the new directory structure
2. Implement each component, moving code from the original class
3. Update BrainProtocol to use the new components
4. Update imports and references throughout the codebase
5. Test thoroughly to ensure behavior is unchanged
6. Update documentation to reflect the new structure

## Testing Strategy

1. Create unit tests for each new component
2. Create integration tests for component interactions
3. Ensure all existing tests pass with the refactored code
4. Add new tests for edge cases that may have been missed