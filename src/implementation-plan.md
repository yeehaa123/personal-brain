# Implementation Plan: Conversation to Notes Integration

Based on the design document and analysis of the existing codebase, this implementation plan outlines the specific files that need to be modified or created to implement the conversation-to-notes integration feature.

## Database Schema Changes

### 1. Update Notes Schema (`src/db/schema.ts`)

```typescript
export const notes = sqliteTable('notes', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  tags: text('tags', { mode: 'json' }).$type<string[]>(),
  embedding: text('embedding', { mode: 'json' }).$type<number[]>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  // New fields
  source: text('source').default('import'),  // 'import', 'conversation', 'user-created'
  sourceMetadata: text('source_metadata', { mode: 'json' }),
  confidence: integer('confidence'),  // 0-100 scale
  verified: integer('verified', { mode: 'boolean' }).default(false),
});
```

### 2. Create Migration File (`drizzle/migration_conversation_to_notes.sql`)

```sql
-- Add new columns to notes table
ALTER TABLE notes ADD COLUMN source TEXT DEFAULT 'import';
ALTER TABLE notes ADD COLUMN source_metadata TEXT;
ALTER TABLE notes ADD COLUMN confidence INTEGER;
ALTER TABLE notes ADD COLUMN verified INTEGER DEFAULT 0;

-- Create indices
CREATE INDEX IF NOT EXISTS idx_notes_source ON notes(source);
```

## Model Updates

### 1. Update Note Model (`src/models/note.ts`)

```typescript
// Add to the existing schemas:
export const insertNoteSchema = baseInsertNoteSchema.extend({
  tags: z.array(z.string()).nullable().optional(),
  embedding: z.array(z.number()).nullable().optional(),
  // New fields
  source: z.enum(['import', 'conversation', 'user-created']).default('import'),
  sourceMetadata: z.object({
    conversationId: z.string().optional(),
    timestamp: z.date().optional(),
    userName: z.string().optional(),
    promptSegment: z.string().optional(),
  }).optional(),
  confidence: z.number().min(0).max(100).optional(),
  verified: z.boolean().default(false),
});
```

### 2. Update Conversation Turn Schema (`src/mcp/protocol/schemas/conversationSchemas.ts`)

```typescript
export const ConversationTurnSchema = z.object({
  // Existing fields...
  
  // New fields
  linkedNoteIds: z.array(z.string()).optional(),
  highlightedSegments: z.array(
    z.object({
      text: z.string(),
      startPos: z.number(),
      endPos: z.number(),
    })
  ).optional(),
  savedAsNoteId: z.string().optional(),
});
```

## New Service

### Create ConversationToNoteService (`src/services/notes/conversationToNoteService.ts`)

```typescript
import { v4 as uuidv4 } from 'uuid';
import type { Conversation, ConversationTurn } from '@/mcp/protocol/schemas/conversationSchemas';
import type { Note, NewNote } from '@/models/note';
import { NoteRepository } from './noteRepository';
import { NoteEmbeddingService } from './noteEmbeddingService';
import logger from '@/utils/logger';
import { generateTags } from '@/utils/tagExtractor';

export class ConversationToNoteService {
  private noteRepository: NoteRepository;
  private embeddingService: NoteEmbeddingService;

  constructor(noteRepository: NoteRepository, embeddingService: NoteEmbeddingService) {
    this.noteRepository = noteRepository;
    this.embeddingService = embeddingService;
  }

  /**
   * Create a note from conversation turns
   */
  async createNoteFromConversation(
    conversation: Conversation,
    turns: ConversationTurn[],
    title?: string,
    userEdits?: string
  ): Promise<Note> {
    // Generate note content from conversation turns with attribution
    const content = this.formatConversationAsNote(turns, userEdits);
    
    // Generate title if not provided
    const noteTitle = title || this.generateTitleFromConversation(turns);
    
    // Extract tags from content
    const tags = await this.generateTagsFromContent(content);
    
    // Create new note
    const newNote: NewNote = {
      id: `note-${uuidv4().substring(0, 8)}`,
      title: noteTitle,
      content,
      tags,
      createdAt: new Date(),
      updatedAt: new Date(),
      source: 'conversation',
      sourceMetadata: {
        conversationId: conversation.id,
        timestamp: new Date(),
        userName: this.getMainUserName(turns),
        promptSegment: turns.map(t => t.query).join(' ').substring(0, 100),
      },
      confidence: 75, // Default confidence score
      verified: false,
    };
    
    // Save note
    const note = await this.noteRepository.insert(newNote);
    
    // Generate embeddings
    await this.embeddingService.generateNoteEmbedding(note.id);
    
    // Update conversation to link to the note
    await this.updateConversationWithNoteLink(conversation.id, turns, note.id);
    
    return note;
  }

  /**
   * Format conversation turns into a note with attribution
   */
  private formatConversationAsNote(turns: ConversationTurn[], userEdits?: string): string {
    // Use userEdits content if provided (user has edited the conversation)
    if (userEdits) {
      return this.addAttributionHeader(userEdits, turns);
    }
    
    // Format the conversation as a note with attribution
    const formattedContent = turns.map(turn => {
      const userName = turn.userName || 'User';
      const isUser = !turn.userId?.startsWith('assistant');
      
      return isUser
        ? `**Question**: ${turn.query}\n\n`
        : `**Answer**: ${turn.response}\n\n`;
    }).join('');
    
    return this.addAttributionHeader(formattedContent, turns);
  }
  
  /**
   * Add attribution header to note content
   */
  private addAttributionHeader(content: string, turns: ConversationTurn[]): string {
    const firstTurn = turns[0];
    const lastTurn = turns[turns.length - 1];
    const dateStr = firstTurn.timestamp.toISOString().split('T')[0];
    
    const header = `> **Note**: This content was derived from a conversation on ${dateStr}.
> **Source**: Conversation with AI assistant
> **Original Query**: "${firstTurn.query}"

`;
    
    return header + content;
  }
  
  /**
   * Generate a title from conversation turns
   */
  private generateTitleFromConversation(turns: ConversationTurn[]): string {
    // Use the first user query as the basis for the title
    const firstQuery = turns[0]?.query || '';
    
    // Limit to a reasonable title length
    return firstQuery.length > 50
      ? `${firstQuery.substring(0, 47)}...`
      : firstQuery;
  }
  
  /**
   * Generate tags for note content
   */
  private async generateTagsFromContent(content: string): Promise<string[]> {
    try {
      return await generateTags(content);
    } catch (error) {
      logger.error('Error generating tags:', error);
      // Extract keywords as fallback
      return this.extractKeywords(content);
    }
  }
  
  /**
   * Extract keywords from content as a fallback for tag generation
   */
  private extractKeywords(content: string): string[] {
    // Simple keyword extraction logic
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);
      
    // Count word frequency
    const wordCount: Record<string, number> = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    // Sort by frequency and return top 5
    return Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }
  
  /**
   * Get the main user name from conversation turns
   */
  private getMainUserName(turns: ConversationTurn[]): string {
    // Filter to user turns only
    const userTurns = turns.filter(turn => !turn.userId?.startsWith('assistant'));
    
    // Get the most frequent user name
    const userNameCount: Record<string, number> = {};
    userTurns.forEach(turn => {
      const name = turn.userName || 'User';
      userNameCount[name] = (userNameCount[name] || 0) + 1;
    });
    
    // Return the most frequent user name
    return Object.entries(userNameCount)
      .sort((a, b) => b[1] - a[1])
      [0]?.[0] || 'User';
  }
  
  /**
   * Update conversation to link to the created note
   */
  private async updateConversationWithNoteLink(
    conversationId: string,
    turns: ConversationTurn[],
    noteId: string
  ): Promise<void> {
    // This will be implemented to update the conversation metadata
    // with the note ID link
    logger.debug(`Linking conversation ${conversationId} to note ${noteId}`);
    // Implementation will depend on how conversation memory is stored
  }
  
  /**
   * Find notes created from conversations
   */
  async findConversationNotes(limit = 10, offset = 0): Promise<Note[]> {
    return this.noteRepository.findBySource('conversation', limit, offset);
  }
  
  /**
   * Find notes linked to a specific conversation
   */
  async findNotesByConversationId(conversationId: string): Promise<Note[]> {
    return this.noteRepository.findBySourceMetadata('conversationId', conversationId);
  }
}
```

## Command Extensions

### Update Command Handler (`src/commands/index.ts`)

```typescript
// Add new commands to the getCommands method
getCommands(): CommandInfo[] {
  return [
    // Existing commands...
    
    {
      command: 'save-note',
      description: 'Create a note from recent conversation',
      usage: 'save-note [title]',
      examples: ['save-note "Ecosystem Architecture"'],
    },
    {
      command: 'highlight',
      description: 'Mark conversation segment as important',
      usage: 'highlight [text]',
      examples: ['highlight "The key insight is..."'],
    },
    {
      command: 'conversation-history',
      description: 'View conversation history',
      usage: 'conversation-history [limit]',
      examples: ['conversation-history 5'],
    },
    {
      command: 'list-conversation-notes',
      description: 'List notes created from conversations',
      usage: 'list-conversation-notes',
    },
  ];
}

// Add new command handlers
async processCommand(command: string, args: string): Promise<CommandResult> {
  try {
    switch (command) {
      // Existing cases...
      
      case 'save-note':
        return await this.handleSaveNote(args);
      case 'highlight':
        return await this.handleHighlight(args);
      case 'conversation-history':
        return await this.handleConversationHistory(args);
      case 'list-conversation-notes':
        return await this.handleListConversationNotes();
      default:
        return { type: 'error', message: `Unknown command: ${command}` };
    }
  } catch (error: unknown) {
    // Error handling...
  }
}

// Add new result types to CommandResult type
export type CommandResult =
  // Existing types...
  | { type: 'save-note-preview'; noteContent: string; title: string }
  | { type: 'save-note-confirm'; noteId: string; title: string }
  | { type: 'highlight-success'; text: string }
  | { type: 'conversation-history'; turns: Array<{ query: string, response: string, timestamp: Date, userName?: string }> }
  | { type: 'conversation-notes'; notes: Note[] };
```

## Update Renderers

### Update CLI Renderer (`src/commands/cli-renderer.ts`)

```typescript
// Add handlers for new command result types
export class CLIRenderer {
  // Existing methods...
  
  renderResult(result: CommandResult): void {
    switch (result.type) {
      // Existing cases...
      
      case 'save-note-preview':
        this.renderSaveNotePreview(result);
        break;
      case 'save-note-confirm':
        this.renderSaveNoteConfirm(result);
        break;
      case 'highlight-success':
        this.renderHighlightSuccess(result);
        break;
      case 'conversation-history':
        this.renderConversationHistory(result);
        break;
      case 'conversation-notes':
        this.renderConversationNotes(result);
        break;
    }
  }
  
  private renderSaveNotePreview(result: { noteContent: string; title: string }): void {
    // Implementation...
  }
  
  private renderSaveNoteConfirm(result: { noteId: string; title: string }): void {
    // Implementation...
  }
  
  private renderHighlightSuccess(result: { text: string }): void {
    // Implementation...
  }
  
  private renderConversationHistory(result: { turns: Array<{ query: string, response: string, timestamp: Date, userName?: string }> }): void {
    // Implementation...
  }
  
  private renderConversationNotes(result: { notes: Note[] }): void {
    // Implementation...
  }
}
```

### Update Matrix Renderer (`src/commands/matrix-renderer.ts`)

```typescript
// Implement similar changes as in CLI renderer
```

## Testing

### Create Conversation-to-Note Test (`tests/services/notes/conversationToNoteService.test.ts`)

```typescript
import { describe, expect, test, mock } from 'bun:test';
import { ConversationToNoteService } from '@/services/notes/conversationToNoteService';
import { NoteRepository } from '@/services/notes/noteRepository';
import { NoteEmbeddingService } from '@/services/notes/noteEmbeddingService';
import type { Conversation, ConversationTurn } from '@/mcp/protocol/schemas/conversationSchemas';

describe('ConversationToNoteService', () => {
  // Test setup and mocks...
  
  test('should create a note from conversation turns', async () => {
    // Implementation...
  });
  
  test('should format conversation with attribution', async () => {
    // Implementation...
  });
  
  test('should handle user-edited content', async () => {
    // Implementation...
  });
  
  test('should generate tags from conversation content', async () => {
    // Implementation...
  });
  
  test('should link conversation to created note', async () => {
    // Implementation...
  });
});
```

## Implementation Order

1. Database schema updates and migration
2. Model updates (Note and ConversationTurn)
3. ConversationToNoteService implementation
4. Basic command handlers and result types
5. CLI and Matrix renderer updates
6. Integration with BrainProtocol
7. Tests
8. Documentation updates