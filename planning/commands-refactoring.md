# Command Handler Refactoring Design

## Current Issues

The CommandHandler in `/src/commands/index.ts` is 603 lines long and responsible for handling all commands across different interfaces. Issues include:

1. Too many responsibilities in a single file
2. Difficult to extend with new commands
3. Command-specific logic mixed with general command handling
4. Poor separation of concerns between different command types

## Refactoring Approach

We'll reorganize the command system into a modular structure with specialized handlers for different command categories:

### 1. Directory Structure

```
/src/commands/
  /core/
    commandHandler.ts       # Main command dispatcher
    commandTypes.ts         # Command types and interfaces
    baseCommandHandler.ts   # Abstract base handler
  /handlers/
    noteCommands.ts         # Note-related commands
    profileCommands.ts      # Profile commands
    tagCommands.ts          # Tag commands
    conversationCommands.ts # Conversation and ask commands
    systemCommands.ts       # Status, help, external commands
  index.ts                  # Public exports
```

### 2. Command Types

**File:** `/src/commands/core/commandTypes.ts`

```typescript
export interface CommandInfo {
  name: string;
  description: string;
  usage: string;
  aliases?: string[];
  requiresApiKey?: boolean;
}

export interface CommandResult {
  success: boolean;
  type: 'text' | 'note' | 'list' | 'tags' | 'status' | 'profile' | 'save-note-preview' | 'save-note-confirm' | 'conversation-notes';
  data: any;
  error?: string;
}

export interface NoteCommandResult extends CommandResult {
  type: 'note';
  data: {
    id: string;
    title: string;
    content: string;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
  };
}

// Additional specialized result types
export interface ListCommandResult extends CommandResult { ... }
export interface TagsCommandResult extends CommandResult { ... }
export interface ProfileCommandResult extends CommandResult { ... }
export interface StatusCommandResult extends CommandResult { ... }
```

### 3. Base Command Handler

**File:** `/src/commands/core/baseCommandHandler.ts`

```typescript
export abstract class BaseCommandHandler {
  protected brainProtocol: BrainProtocol;
  
  constructor(brainProtocol: BrainProtocol) {
    this.brainProtocol = brainProtocol;
  }
  
  abstract getCommands(): CommandInfo[];
  abstract canHandle(command: string): boolean;
  abstract execute(command: string, args: string[]): Promise<CommandResult>;
  
  // Shared utilities for commands
  protected formatError(message: string): CommandResult { ... }
  protected requireApiKey(): string | null { ... }
  protected parseArgs(args: string[], expectedCount: number): string[] | null { ... }
}
```

### 4. Note Commands

**File:** `/src/commands/handlers/noteCommands.ts`

```typescript
export class NoteCommandHandler extends BaseCommandHandler {
  getCommands(): CommandInfo[] {
    return [
      { name: 'note', description: 'Display a note by ID', usage: 'note <id>' },
      { name: 'list', description: 'List notes, optionally filtered by tag', usage: 'list [tag]' },
      { name: 'search', description: 'Search notes by keyword or phrase', usage: 'search <query>' },
    ];
  }
  
  canHandle(command: string): boolean {
    return ['note', 'list', 'search'].includes(command);
  }
  
  async execute(command: string, args: string[]): Promise<CommandResult> {
    switch (command) {
      case 'note': return this.handleNote(args);
      case 'list': return this.handleList(args);
      case 'search': return this.handleSearch(args);
      default: return this.formatError(`Unknown command: ${command}`);
    }
  }
  
  private async handleNote(args: string[]): Promise<NoteCommandResult> { ... }
  private async handleList(args: string[]): Promise<ListCommandResult> { ... }
  private async handleSearch(args: string[]): Promise<ListCommandResult> { ... }
}
```

### 5. Profile Commands

**File:** `/src/commands/handlers/profileCommands.ts`

```typescript
export class ProfileCommandHandler extends BaseCommandHandler {
  getCommands(): CommandInfo[] {
    return [
      { name: 'profile', description: 'Display profile information', usage: 'profile [related]' },
    ];
  }
  
  canHandle(command: string): boolean {
    return command === 'profile';
  }
  
  async execute(command: string, args: string[]): Promise<CommandResult> {
    return this.handleProfile(args);
  }
  
  private async handleProfile(args: string[]): Promise<ProfileCommandResult> { ... }
}
```

### 6. Conversation Commands

**File:** `/src/commands/handlers/conversationCommands.ts`

```typescript
export class ConversationCommandHandler extends BaseCommandHandler {
  private conversationToNoteService: ConversationToNoteService;
  
  constructor(brainProtocol: BrainProtocol) {
    super(brainProtocol);
    this.conversationToNoteService = this.initializeConversationToNoteService();
  }
  
  getCommands(): CommandInfo[] {
    return [
      { name: 'ask', description: 'Ask a question to your brain', usage: 'ask <question>' },
      { name: 'save-note', description: 'Save current conversation as a note', usage: 'save-note [title]' },
      { name: 'conversation-notes', description: 'List notes derived from conversations', usage: 'conversation-notes' },
    ];
  }
  
  canHandle(command: string): boolean {
    return ['ask', 'save-note', 'confirm-save-note', 'conversation-notes'].includes(command);
  }
  
  async execute(command: string, args: string[]): Promise<CommandResult> {
    switch (command) {
      case 'ask': return this.handleAsk(args);
      case 'save-note': return this.handleSaveNote(args);
      case 'confirm-save-note': return this.confirmSaveNote(args);
      case 'conversation-notes': return this.handleConversationNotes();
      default: return this.formatError(`Unknown command: ${command}`);
    }
  }
  
  private async handleAsk(args: string[]): Promise<CommandResult> { ... }
  private async handleSaveNote(args: string[]): Promise<CommandResult> { ... }
  private async confirmSaveNote(args: string[]): Promise<CommandResult> { ... }
  private async handleConversationNotes(): Promise<CommandResult> { ... }
  private initializeConversationToNoteService(): ConversationToNoteService { ... }
}
```

### 7. System Commands

**File:** `/src/commands/handlers/systemCommands.ts`

```typescript
export class SystemCommandHandler extends BaseCommandHandler {
  getCommands(): CommandInfo[] {
    return [
      { name: 'help', description: 'Display help information', usage: 'help' },
      { name: 'external', description: 'Enable or disable external sources', usage: 'external <on|off>' },
      { name: 'status', description: 'Display system status', usage: 'status' },
    ];
  }
  
  canHandle(command: string): boolean {
    return ['help', 'external', 'status'].includes(command);
  }
  
  async execute(command: string, args: string[]): Promise<CommandResult> {
    switch (command) {
      case 'help': return this.handleHelp();
      case 'external': return this.handleExternal(args);
      case 'status': return this.handleStatus();
      default: return this.formatError(`Unknown command: ${command}`);
    }
  }
  
  private handleHelp(): CommandResult { ... }
  private handleExternal(args: string[]): CommandResult { ... }
  private handleStatus(): CommandResult { ... }
}
```

### 8. Main Command Handler

**File:** `/src/commands/core/commandHandler.ts`

```typescript
export class CommandHandler {
  private brainProtocol: BrainProtocol;
  private handlers: BaseCommandHandler[];
  
  constructor(brainProtocol: BrainProtocol) {
    this.brainProtocol = brainProtocol;
    
    // Register all command handlers
    this.handlers = [
      new NoteCommandHandler(brainProtocol),
      new ProfileCommandHandler(brainProtocol),
      new TagCommandHandler(brainProtocol),
      new ConversationCommandHandler(brainProtocol),
      new SystemCommandHandler(brainProtocol),
    ];
  }
  
  getCommands(): CommandInfo[] {
    return this.handlers.flatMap(handler => handler.getCommands());
  }
  
  async processCommand(input: string): Promise<CommandResult> {
    // Parse the command and arguments
    const { command, args } = this.parseCommand(input);
    
    // Find the appropriate handler
    const handler = this.handlers.find(h => h.canHandle(command));
    
    if (handler) {
      return handler.execute(command, args);
    }
    
    // No handler found
    return {
      success: false,
      type: 'text',
      data: `Unknown command: ${command}`,
      error: `Unknown command: ${command}`,
    };
  }
  
  private parseCommand(input: string): { command: string; args: string[] } { ... }
}
```

### 9. Public API

**File:** `/src/commands/index.ts`

```typescript
// Export the main command handler
export { CommandHandler } from './core/commandHandler';

// Export types
export type { CommandInfo, CommandResult } from './core/commandTypes';
```

## Implementation Strategy

1. Create the new directory structure
2. Extract command-specific code into respective handler classes
3. Create the base command handler and main command handler
4. Update imports and references to maintain functionality
5. Test thoroughly to ensure behavior is unchanged
6. Update documentation to reflect the new structure

## Testing Strategy

1. Create unit tests for each command handler
2. Test each command individually
3. Test command parsing and routing
4. Ensure all existing commands work as before
5. Test error handling and edge cases