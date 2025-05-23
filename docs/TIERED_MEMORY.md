# Tiered Memory System Documentation

The Personal Brain system implements a sophisticated tiered memory system to efficiently manage conversation history while optimizing context window usage. This document explains the architecture, components, and configuration options for the tiered memory system.

## Overview

The tiered memory system manages conversation history across three distinct tiers:

1. **Active Tier**: Contains recent conversation turns in full detail
2. **Summary Tier**: Contains AI-generated summaries of older conversation segments
3. **Archive Tier**: Stores original conversation turns that have been summarized

This approach optimizes token usage while preserving context by keeping recent conversations in full detail while condensing older content into informative summaries.

## Architecture

The tiered memory system is implemented through the following key components, all located in `src/mcp/contexts/conversations`:

### ConversationContext

The main facade class for conversation management following the MCP architecture pattern. It:
- Provides public API for conversation operations
- Coordinates between storage, tiered memory, and formatters
- Implements MCP resources and tools for external access
- Follows singleton pattern with getInstance() method

### ConversationMemory

The class responsible for managing conversation memory. It handles:
- Adding new conversation turns
- Maintaining tier thresholds
- Triggering summarization of older turns
- Formatting conversation history for inclusion in prompts

### TieredMemoryManager

Specialized class that manages the tiered memory system. It:
- Coordinates between active, summary, and archive tiers
- Triggers summarization when thresholds are reached
- Formats conversation history for prompts
- Provides configuration management

### ConversationSummarizer

Responsible for creating summaries of conversation segments. It:
- Uses Claude to generate concise summaries of conversation turns
- Includes a fallback system for when AI summarization fails
- Maintains metadata about the original turns being summarized

### ConversationStorage

An interface defining the contract for storage implementations, with methods for:
- Storing conversations, turns, and summaries
- Retrieving and querying conversation history
- Managing metadata and search operations

### InMemoryStorage

The default implementation of the storage interface that keeps conversations in memory. For production use, this would typically be replaced with a database-backed implementation.

## How It Works

### Tier Management Process

1. **Adding New Turns**: New conversation turns are added to the active tier
2. **Tier Transition**: When the active tier exceeds its configured maximum size, the oldest turns are moved to the archive tier
3. **Summarization**: The moved turns are summarized using AI, and the summary is added to the summary tier
4. **Prompt Formatting**: When formatting history for prompts, summaries are presented first, followed by the active turns

### Automatic Summarization

The system automatically summarizes older conversations when:
- The number of active turns exceeds `maxActiveTurns`
- At least `summaryTurnCount` turns are available to summarize

The summarization process:
1. Selects the oldest turns from the active tier
2. Sends them to Claude with a specialized summarization prompt
3. Creates a summary object with metadata linking to the original turns
4. Stores the summary in the summary tier
5. Moves the original turns to the archive tier

## Configuration Options

The tiered memory system can be configured with the following options:

| Option | Description | Default |
|--------|-------------|---------|
| `maxActiveTurns` | Maximum number of turns to keep in active memory | 10 |
| `maxSummaries` | Maximum number of summaries to keep | 3 |
| `summaryTurnCount` | Number of turns to summarize in each batch | 5 |
| `maxArchivedTurns` | Maximum number of archived turns to keep | 50 |
| `maxTokens` | Maximum token count to include in context | 2000 |
| `relevanceDecay` | Decay factor for older messages (1.0 = no decay) | 0.9 |

## Example Usage

### Basic Usage with ConversationContext

```typescript
// Get the singleton instance of ConversationContext
const context = ConversationContext.getInstance();

// Create a new conversation
const conversationId = await context.createConversation('cli', 'room-123');

// Add turns to the conversation
await context.addTurn(
  conversationId,
  "What is the capital of France?",
  "The capital of France is Paris.",
  { userId: "user1", userName: "User" }
);

// Get formatted history for prompt inclusion
const promptHistory = await context.formatHistoryForPrompt(conversationId);

// Get formatted conversation history
const history = await context.getConversationHistory(conversationId, {
  format: 'markdown',
  includeSummaries: true
});
```

### Forcing Summarization

For testing or manual management, you can force summarization of turns:

```typescript
// Force summarize the conversation
await context.forceSummarize(conversationId);
```

### Getting Tiered History

To access the full tiered history:

```typescript
const { activeTurns, summaries, archivedTurns } = await context.getTieredHistory(conversationId);

console.log(`Active turns: ${activeTurns.length}`);
console.log(`Summaries: ${summaries.length}`);
console.log(`Archived turns: ${archivedTurns.length}`);
```

## Implementation Details

### Prompt Engineering

The system uses carefully crafted prompts for the summarization process:

1. **System Prompt**: Instructs the AI to create concise, informative summaries of conversations while maintaining objectivity
2. **User Prompt**: Provides the conversation text and requests a summary

### Fallback Mechanism

If AI summarization fails (e.g., due to API issues), the system uses a local fallback that:
1. Extracts potential topics from queries
2. Creates a basic summary with conversation statistics
3. Marks the summary as a fallback in the metadata

## Integration with BrainProtocol

The tiered memory system is integrated with the BrainProtocol via the ContextManager:

```typescript
// In ContextManager
export class ContextManager implements IContextManager {
  private conversationContext: ConversationContext;
  
  constructor() {
    // Initialize ConversationContext
    this.conversationContext = ConversationContext.getInstance();
  }
  
  getConversationContext(): ConversationContext {
    return this.conversationContext;
  }
}
```

During query processing, the conversation history is retrieved and included in the prompt:

```typescript
// In QueryProcessor
// Get conversation context from the context manager
const conversationContext = this.contextManager.getConversationContext();

// Get conversation history from the current conversation
let conversationHistory = '';
try {
  const conversationId = await conversationContext.getConversationIdByRoom(roomId);
  if (conversationId) {
    conversationHistory = await conversationContext.formatHistoryForPrompt(conversationId);
  }
} catch (error) {
  logger.warn('Failed to get conversation history:', error);
}

// Include history in the prompt
const userPrompt = this.promptFormatter.formatPrompt(
  query,
  relevantNotes,
  profileInfo,
  externalResults,
  conversationHistory
);
```

## Future Enhancements

Planned improvements to the tiered memory system include:

1. **Token Counting**: Replace turn counting with actual token counting for more precise memory management
2. **Database Storage**: Implement persistent storage for conversations across sessions
3. **Memory Visualization**: Create visualizations of conversation history structure
4. **Integration with Notes**: Connect conversations with the note system for bidirectional references
5. **Enhanced Summarization**: Improve summary quality with more sophisticated prompts and techniques

## Development Metrics

The tiered memory system was implemented with the following resources:

- Development cost: Portion of $60.72 total project cost
- Development time: Approximately 4 hours of the total 20+ hour development
- Code size: ~1,000 lines of the total 9,000+ lines added
- Test coverage: 40+ tests specifically for the memory system

## Conclusion

The tiered memory system represents a significant architectural enhancement to the Personal Brain system, allowing for more efficient and effective conversation management. By balancing detailed recent context with summarized historical context, it optimizes token usage while maintaining the ability to reference past interactions.