# ProfileContext Refactoring Design

## Current Issues

The ProfileContext class is currently 725 lines long, making it hard to navigate and understand. It has multiple responsibilities:

1. Managing the MCP server and resource registration
2. Handling profile data through the repository
3. Generating and managing embeddings
4. Managing tags
5. Formatting profile data for display
6. Finding related notes

## Refactoring Approach

We'll split the ProfileContext into several focused modules:

### 1. Core ProfileContext

**File:** `/src/mcp/contexts/profiles/core/profileContext.ts`

This will be the main facade that orchestrates the other components:

```typescript
export class ProfileContext {
  private repository: ProfileRepository;
  private embeddingService: ProfileEmbeddingService;
  private tagService: ProfileTagService;
  private searchService: ProfileSearchService;
  private mcpServer: McpServer;
  private mcpResources: ProfileMcpResources;
  private mcpTools: ProfileMcpTools;
  private formatter: ProfileFormatter;
  
  // Singleton pattern methods
  public static getInstance(apiKey?: string, forceNew = false): ProfileContext
  public static resetInstance(): void

  // Constructor and initialization
  constructor(apiKey?: string)
  getMcpServer(): McpServer
  registerOnServer(server: McpServer): void

  // Core profile methods
  async getProfile(): Promise<Profile | undefined>
  async saveProfile(profileData: Profile): Promise<void>
  async updateProfile(profileData: Partial<Profile>): Promise<void>
  async generateEmbeddingForProfile(): Promise<{ updated: boolean }>
  async updateProfileTags(forceRegenerate = false): Promise<string[] | null>
  async findRelatedNotes(noteContext: NoteContext, limit = 5): Promise<NoteWithSimilarity[]>
  async findNotesWithSimilarTags(noteContext: NoteContext, profileTags?: string[], limit = 5): Promise<NoteWithSimilarity[]>
  extractProfileKeywords(profile: Profile): string[]
  getProfileTextForEmbedding(profile: Profile): string
}
```

### 2. MCP Resources

**File:** `/src/mcp/contexts/profiles/mcp/profileMcpResources.ts`

Responsible for defining and registering MCP resources:

```typescript
export class ProfileMcpResources {
  private mcpServer: McpServer;
  private profileContext: ProfileContext;

  constructor(server: McpServer, profileContext: ProfileContext)
  registerResources(): void
  
  // Resource handlers
  private handleProfileResource()
  private handleProfileKeywordsResource()
  private handleRelatedNotesResource()
}
```

### 3. MCP Tools

**File:** `/src/mcp/contexts/profiles/mcp/profileMcpTools.ts`

Responsible for defining and registering MCP tools:

```typescript
export class ProfileMcpTools {
  private mcpServer: McpServer;
  private profileContext: ProfileContext;

  constructor(server: McpServer, profileContext: ProfileContext)
  registerTools(): void
  
  // Tool handlers
  private handleSaveProfileTool()
  private handleUpdateProfileTagsTool()
  private handleGenerateProfileEmbeddingTool()
}
```

### 4. Profile Formatter

**File:** `/src/mcp/contexts/profiles/formatters/profileFormatter.ts`

Responsible for formatting profile data for display:

```typescript
export class ProfileFormatter {
  formatProfileForDisplay(profile: Profile): string
  private formatDate(date: { year: number | null; month: number | null; day: number | null }): string
  private formatExperience(experience: ProfileExperience): string
  private formatEducation(education: ProfileEducation): string
  // Other formatting helpers
}
```

### 5. Shared Types

**File:** `/src/mcp/contexts/profiles/types/profileTypes.ts`

Contains shared interfaces and types:

```typescript
export interface NoteWithSimilarity {
  id: string;
  title: string;
  content: string;
  tags?: string[] | null;
  embedding?: number[] | null;
  similarity?: number;
  createdAt: Date;
  updatedAt: Date;
  source?: 'import' | 'conversation' | 'user-created';
  confidence?: number | null;
  conversationMetadata?: {
    conversationId: string;
    timestamp: Date;
    userName?: string;
    promptSegment?: string;
  } | null;
  verified?: boolean | null;
}

export interface NoteContext {
  searchNotesWithEmbedding: (embedding: number[], limit?: number) => Promise<NoteWithSimilarity[]>;
  searchNotes: (options: { query?: string; tags?: string[]; limit?: number; includeContent?: boolean }) => Promise<NoteWithSimilarity[]>;
}
```

## Implementation Strategy

1. Create the new directory structure
2. Copy/extract the respective code segments to their new files
3. Update imports and references to maintain functionality
4. Update facade references in other parts of the codebase
5. Test thoroughly to ensure behavior is unchanged