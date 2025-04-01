# Model Context Protocol Migration Plan

This document outlines the migration plan for integrating the Model Context Protocol (MCP) SDK into the Personal Brain application.

## Current Progress

1. ✅ Installed the MCP SDK package
2. ✅ Created a basic NoteContext implementation using the MCP SDK
3. ✅ Made the new implementation a drop-in replacement for the original NoteContext
4. ✅ Updated the BrainProtocol class to use the new implementation
5. ✅ Added a README.md with next steps and usage instructions
6. ✅ Verified the application runs with the new implementation

## Next Steps

### 1. Implement Complete MCP Resource Endpoints

Enhance the NoteContext to fully expose note data through MCP resources:

```typescript
// Resource to get a note by ID
mcpServer.resource(
  "note", 
  "note://:id",
  async (uri) => {
    // Implementation details
  }
);

// Resource to search notes
mcpServer.resource(
  "notes",
  "notes://search?query&tags&limit&offset&semantic",
  async (uri) => {
    // Implementation details
  }
);

// Resource to get recent notes
mcpServer.resource(
  "recent_notes",
  "notes://recent?limit",
  async (uri) => {
    // Implementation details
  }
);

// Resource to get related notes
mcpServer.resource(
  "related_notes",
  "notes://related/:id?limit",
  async (uri) => {
    // Implementation details
  }
);
```

### 2. Implement MCP Tools

Add tools for write operations:

```typescript
// Tool to create a new note
mcpServer.tool(
  "create_note",
  async (args) => {
    // Implementation details
  }
);

// Tool to generate embeddings for notes
mcpServer.tool(
  "generate_embeddings",
  async () => {
    // Implementation details
  }
);

// Tool to search notes with embedding
mcpServer.tool(
  "search_with_embedding",
  async (args) => {
    // Implementation details
  }
);
```

### 3. Implement Transports

Add support for different transport mechanisms:

```typescript
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

// Add transports to the server
mcpServer.addTransport(new StdioServerTransport());
mcpServer.addTransport(new SSEServerTransport({ port: 8000 }));
```

### 4. Migrate Other Contexts

Migrate the following contexts using the same approach:

- `ProfileContext`
- `ExternalSourceContext`

### 5. Create Unified MCP Server

Create a single MCP server that combines all functionalities:

```typescript
// Create a unified MCP server
const mcpServer = new McpServer({
  name: "PersonalBrain",
  version: "1.0.0"
});

// Register resources and tools from different contexts
noteContext.registerResources(mcpServer);
profileContext.registerResources(mcpServer);
externalSourceContext.registerResources(mcpServer);

// Start the server with the appropriate transports
mcpServer.addTransport(new StdioServerTransport());
mcpServer.start();
```

### 6. Update Tests

Ensure all tests pass with the new implementation:

1. Update existing tests to work with MCP-based contexts
2. Add specific tests for MCP resources and tools
3. Add integration tests for the unified MCP server

### 7. Documentation

Update the project documentation:

1. Add usage instructions for MCP resources and tools
2. Document available endpoints and their parameters
3. Provide examples of using the MCP SDK with the application

## Reference

- [MCP TypeScript SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Specification](https://github.com/modelcontextprotocol/mcp)