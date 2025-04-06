# Personal Brain Technical Architecture

This document provides an overview of the Personal Brain system architecture and references to detailed documentation for specific components.

## System Architecture

Personal Brain is built with a modular, service-oriented architecture that follows several key patterns:

### Key Architectural Patterns

1. **Model-Context-Protocol (MCP)** - Core architecture for AI integration
2. **Facade Pattern** - Context classes as facades over specialized services
3. **Repository Pattern** - Data access abstraction
4. **Service Layer** - Focused business logic components
5. **Tiered Memory** - Multi-level conversation history management

## Core Components

### BrainProtocol

The central orchestration component that coordinates all interactions between AI models and context sources.

[Detailed Documentation](BRAIN_PROTOCOL_ARCHITECTURE.md)

Key responsibilities:
- Orchestrates interactions between all components
- Manages the query processing pipeline
- Handles conversation memory and context
- Provides the public API for client interfaces

### Tiered Memory System

A sophisticated conversation memory system that optimizes token usage while maintaining context.

[Detailed Documentation](TIERED_MEMORY.md)

Key features:
- Active tier for recent conversation turns
- Summary tier with AI-generated summaries
- Archive tier for historical turn storage
- Automatic summarization with token optimization

### Context Components

Context components provide access to different types of information:

- **NoteContext** - Access to notes and semantic search
- **ProfileContext** - Access to user profile information
- **ExternalSourceContext** - Access to external knowledge sources

Each context follows the facade pattern and delegates to specialized services.

### Service Layer

Services provide focused implementations of specific functionality:

- **Repository Services** - Database operations and persistence
- **Embedding Services** - Vector embeddings for semantic search
- **Search Services** - Searching across various content types
- **Tag Services** - Generation and management of tags

## Interface Layer

Personal Brain provides multiple interfaces:

- **CLI Interface** - Command-line interaction
- **Matrix Interface** - Chat integration via Matrix protocol
- **MCP Server** - HTTP and stdio server implementations for external tools

## Testing Architecture

The project follows a comprehensive testing approach with multiple levels of testing.

[Detailed Documentation](TEST_ARCHITECTURE.md)

Key aspects:
- Unit testing of individual components
- Integration testing of component interactions
- Mocking patterns for external dependencies
- Test utilities for common testing scenarios

## Database Architecture

Personal Brain uses Drizzle ORM with SQLite for persistence:

- **Notes** - Storage of note content with embeddings and metadata
- **Profiles** - User profile information and preferences
- **Tags** - Collection of automatically generated and user-defined tags
- **Schema Migrations** - Managed through Drizzle ORM

## Development Process

The Personal Brain project follows these development practices:

1. **Service-Oriented Development** - Building focused, reusable components
2. **Iterative Refactoring** - Continuous improvement of existing code
3. **Clean Architecture** - Separation of concerns and dependency management
4. **Type-Safe Development** - Strong TypeScript typing throughout the codebase
5. **Test-Driven Development** - Comprehensive test coverage

## Future Architecture Enhancements

Planned architectural improvements include:

1. **Conversation to Notes Integration** - Converting conversation insights to permanent notes
2. **Database-Backed Memory Storage** - Persistent storage for conversation memory
3. **Knowledge Graph Integration** - Building relationships between notes and concepts
4. **Multimodal Support** - Handling images and other non-text content
5. **Enhanced External Source Integration** - Additional knowledge sources and better integration