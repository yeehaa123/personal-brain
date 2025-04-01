# Model Context Protocol (MCP)

This directory contains the integration of the Model Context Protocol (MCP) into the Personal Brain application.

## Architecture Overview

The Personal Brain application uses a unified MCP server architecture with the following components:

1. **Contexts** - Core context providers:
   - `NoteContext` - Manages notes and their embeddings
   - `ProfileContext` - Handles user profile information
   - `ExternalSourceContext` - Integrates with external knowledge sources

2. **Protocol** - Coordination and interaction:
   - `BrainProtocol` - Main orchestration class for all contexts
   - Protocol Components - Services for specific functionality

3. **Model** - AI model implementations:
   - `ClaudeModel` - Interface to the Claude API
   - `EmbeddingService` - Manages vector embeddings for semantic search

4. **Unified MCP Server** - Exposes all contexts through a standard interface:
   - Resources - RESTful-like endpoints for retrieving data
   - Tools - Function-like endpoints for performing actions

## Features

1. **Unified Resource Endpoints**:
   ```
   note://:id - Access a specific note by ID
   profile:// - Access the user's profile
   source://wiki/:query - Access Wikipedia information
   source://news/:query - Access news articles
   ```

2. **MCP Tools**:
   ```
   search_notes - Search notes by query or tags
   update_profile - Update the user's profile
   query_external_sources - Search external knowledge sources
   ```

3. **Transports**:
   - `StdioServerTransport` - Command-line interface
   - `SSEServerTransport` - Server-sent events for web interfaces

## Usage Examples

### Creating a Unified MCP Server

```typescript
import { createUnifiedMcpServer } from '@mcp';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Create a unified server with all contexts
const mcpServer = createUnifiedMcpServer({
  apiKey: process.env.ANTHROPIC_API_KEY,
  newsApiKey: process.env.NEWSAPI_KEY,
  name: 'PersonalBrain',
  version: '1.0.0',
  enableExternalSources: true,
});

// Add transport for CLI interaction
mcpServer.connect(new StdioServerTransport());
```

### Using the BrainProtocol with MCP Server

```typescript
import { BrainProtocol } from '@mcp/protocol';

// Create the brain protocol instance
const protocol = new BrainProtocol({
  apiKey: process.env.ANTHROPIC_API_KEY,
  useExternalSources: true,
});

// Get the MCP server for external interfaces
const mcpServer = protocol.getMcpServer();

// Connect transport
mcpServer.connect(new StdioServerTransport());
```

## Directory Structure

```
mcp/
├── contexts/           # Context providers
│   ├── externalSources/  # External knowledge sources
│   ├── notes/            # Note context and operations
│   └── profiles/         # User profile management
├── model/              # AI model implementations
│   ├── claude.ts         # Claude API interface
│   └── embeddings.ts     # Vector embedding services
├── protocol/           # Main coordination layer
│   ├── brainProtocol.ts  # Core orchestration class
│   └── components/       # Protocol service components
└── index.ts            # Entry point with exports
```

## Resources

- [MCP TypeScript SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Specification](https://github.com/modelcontextprotocol/mcp)
- [MIGRATION.md](./MIGRATION.md) - Migration status and history