# BrainProtocol Architecture Reference

This document provides a comprehensive overview of the BrainProtocol architecture, which is the core orchestration layer in the Personal Brain system.

## Architecture Overview

The BrainProtocol architecture follows a modular, service-oriented approach with clear separation of concerns:

```
                                 ┌─────────────────┐
                                 │  BrainProtocol  │
                                 └────────┬────────┘
                                          │
         ┌──────────┬──────────┬─────────┼──────────┐
         │          │          │         │          │
         ▼          ▼          ▼         ▼          ▼
┌─────────────┐ ┌────────┐ ┌────────┐ ┌─────┐ ┌────────┐
│ContextManager│ │Profile │ │External│ │Query│ │Config  │
│             │ │Manager │ │Source  │ │Proc.│ │Manager │
└─────────────┘ └────────┘ └────────┘ └─────┘ └────────┘
    │  │  │  │      │          │         │     
    │  │  │  │      │          │         │     
    ▼  ▼  ▼  ▼      ▼          ▼         ▼     
┌─────────────────────────────────────────────────────────┐
│                   Services & Resources                   │
└─────────────────────────────────────────────────────────┘
      │       │        │          │
      ▼       ▼        ▼          ▼
┌─────────┐ ┌─────┐ ┌─────────┐ ┌───────────┐
│ Notes   │ │Prof.│ │External │ │Conversation│
│ Context │ │Cntxt│ │ Context │ │ Context   │
└─────────┘ └─────┘ └─────────┘ └───────────┘
```

## Core Components and Responsibilities

### BrainProtocol

The main orchestration class that:
- Initializes and coordinates all specialized managers
- Provides a unified public API for clients
- Implements the singleton pattern for global access
- Handles high-level error handling and readiness checks

### Specialized Managers

#### ContextManager
- Manages all context objects (notes, profile, external sources)
- Handles initialization of contexts
- Provides access control to context objects
- Ensures contexts are properly linked

#### ProfileManager
- Handles user profile information
- Analyzes query relevance to profile
- Provides profile text and metadata

#### ExternalSourceManager
- Manages external knowledge sources (Wikipedia, News API)
- Determines when to query external sources
- Processes and formats external results

#### ContextManager (Conversation Access)
- Provides access to ConversationContext
- Initializes and coordinates all context objects
- Ensures conversation data is accessible to query processor
- Manages context dependencies and readiness

#### QueryProcessor
- Implements the full query processing pipeline
- Orchestrates interactions between all managers
- Calls the AI model with formatted prompts
- Processes and returns structured responses

### Memory System

The tiered memory system manages conversation history across:
- **Active Tier**: Recent conversation turns in full detail
- **Summary Tier**: AI-generated summaries of older segments
- **Archive Tier**: Original turns that have been summarized

Memory management includes:
- Automatic tier transitions based on configuration
- AI-powered summarization of conversation segments
- User attribution and anchoring
- Metadata tracking for turns and summaries

## Data Flow

### Query Processing Pipeline

1. User submits a query
2. BrainProtocol delegates to QueryProcessor
3. QueryProcessor analyzes profile relevance
4. Relevant notes are retrieved from the database
5. External sources are queried if needed
6. Conversation history is retrieved and formatted
7. A prompt is constructed with all relevant context
8. The AI model is called with the formatted prompt
9. The response is processed and formatted
10. The conversation turn is saved to memory
11. A structured response is returned to the client

### Component Interactions

```
┌──────────┐    ┌─────────────┐    ┌────────────┐
│  Client  │───►│BrainProtocol│───►│ManagerLayer│
└──────────┘    └─────────────┘    └─────┬──────┘
                                         │
                                         ▼
┌──────────┐    ┌─────────────┐    ┌────────────┐
│   Model  │◄───│QueryProcessor│◄───│ServiceLayer│
└──────────┘    └─────────────┘    └────────────┘
      │                 │
      └─────────────────┘
```

## Configuration

BrainProtocol is configured through the BrainProtocolConfig class, which:
- Parses options from environment variables or constructor parameters
- Provides default values for missing configuration
- Validates configuration values
- Makes configuration available to all components

## Usage Examples

### Basic Usage

```typescript
import { BrainProtocol } from '@/mcp/protocol/core/brainProtocol';

// Get the singleton instance
const brain = BrainProtocol.getInstance({
  apiKey: process.env.ANTHROPIC_API_KEY,
  useExternalSources: true,
  interfaceType: 'cli'
});

// Process a query
const result = await brain.processQuery('What is ecosystem architecture?');
console.log(result.answer);
```

### Advanced Usage with Component Access

```typescript
// Access specific contexts
const noteContext = brain.getNoteContext();
const profileContext = brain.getProfileContext();

// Control external sources
brain.setUseExternalSources(false);

// Check component status
const status = brain.getStatus();
console.log(status);

// Manage conversation rooms
await brain.setCurrentRoom('new-room-id');
const conversationId = brain.getCurrentConversationId();
```

## Error Handling

BrainProtocol implements comprehensive error handling:
- Initialization errors are caught and logged
- Component failures are isolated and reported
- Query processing errors are handled gracefully
- Context readiness is verified before operations

## Extension Points

The architecture provides several extension points:
- Implement new managers for additional functionality
- Extend the QueryProcessor with new pipeline stages
- Add specialized implementations of memory storage
- Create new prompt formatters for different use cases

## Implementation Details

- **Singleton Pattern**: Ensures consistent state across the application
- **Dependency Injection**: Components receive dependencies through constructors
- **Interface-Based Design**: Components interact through well-defined interfaces
- **Error Isolation**: Failures in one component don't crash the entire system
- **Readiness Checks**: Components explicitly indicate their initialization status

## Testing Approach

The BrainProtocol architecture is designed for testability:
- Each component can be tested in isolation
- Mock implementations available for testing
- Integration tests verify component interactions
- Singleton reset functionality for test isolation