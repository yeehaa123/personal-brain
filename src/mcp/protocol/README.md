# BrainProtocol Architecture

This directory contains the implementation of the BrainProtocol system, which orchestrates interaction between AI models and context sources using the Model-Context-Protocol (MCP) architecture.

## Directory Structure

```
protocol/
├── brainProtocol.ts     [Legacy implementation, maintained for backward compatibility]
├── components/          [Specialized service components]
│   ├── externalSourceService.ts
│   ├── noteService.ts
│   ├── profileAnalyzer.ts
│   ├── promptFormatter.ts
│   └── systemPromptGenerator.ts
├── config/              [Configuration management]
│   └── brainProtocolConfig.ts
├── core/                [Core orchestration layer]
│   └── brainProtocol.ts
├── index.ts             [Public API exports]
├── managers/            [Specialized context and service managers]
│   ├── contextManager.ts
│   ├── conversationManager.ts
│   ├── externalSourceManager.ts
│   └── profileManager.ts
├── memory/              [Conversation memory system]
│   ├── conversationMemory.ts
│   ├── inMemoryStorage.ts
│   ├── index.ts
│   └── summarizer.ts
├── pipeline/            [Query processing pipeline]
│   └── queryProcessor.ts
├── schemas/             [Data validation schemas]
│   ├── conversationMemoryConfig.ts
│   ├── conversationMemoryStorage.ts
│   └── conversationSchemas.ts
└── types/               [Type definitions]
    └── index.ts
```

## Key Components

### Core BrainProtocol

Located in `core/brainProtocol.ts`, this is the main orchestration layer that:
- Initializes and coordinates all specialized managers
- Provides the public API for interacting with the brain
- Delegates specific responsibilities to appropriate managers
- Implements the singleton pattern for global access

### Specialized Managers

- **ContextManager**: Manages access to various contexts (notes, profile, external sources)
- **ConversationManager**: Handles conversation memory and room-based state
- **ProfileManager**: Manages user profile information and relevance analysis
- **ExternalSourceManager**: Handles external knowledge sources like Wikipedia

### Query Processor

Located in `pipeline/queryProcessor.ts`, this component:
- Implements the full query processing pipeline
- Orchestrates context retrieval, profile analysis, and external source integration
- Formats prompts for the AI model
- Processes and returns model responses

### Other Components

- **Types and Interfaces**: Define contracts between components
- **Configuration**: Manages settings and environment variables
- **Memory**: Handles conversation history with tiered storage
- **Schemas**: Define data validation schemas for conversations

## Usage Example

```typescript
import { BrainProtocol } from '@/mcp/protocol/core/brainProtocol';

// Create an instance (or get the singleton)
const brain = BrainProtocol.getInstance({
  apiKey: 'your-api-key',
  useExternalSources: true,
  interfaceType: 'cli',
  roomId: 'default-room'
});

// Process a query
const result = await brain.processQuery('What is ecosystem architecture?');
console.log(result.answer);

// Access contexts directly if needed
const noteContext = brain.getNoteContext();
const profileContext = brain.getProfileContext();
```

## Design Philosophy

The BrainProtocol architecture follows these principles:

1. **Separation of Concerns**: Each component has a clear, focused responsibility
2. **Dependency Injection**: Components receive their dependencies through constructors
3. **Interface-Based Design**: Components interact through well-defined interfaces
4. **Error Isolation**: Failures in one component shouldn't crash the entire system
5. **Readiness Checking**: Components explicitly indicate their initialization status

## For Developers

When extending or modifying the BrainProtocol system:

1. Identify which specific component is responsible for your feature
2. Extend or modify that component while maintaining its interface
3. Update tests for the affected component
4. If adding new capabilities, consider defining a new interface