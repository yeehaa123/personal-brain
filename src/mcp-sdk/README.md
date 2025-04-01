# MCP SDK Integration

This directory contains the integration of the Model Context Protocol (MCP) SDK into the Personal Brain application.

## Current Implementation

We've created an initial integration with a "drop-in" replacement for the `NoteContext` class that implements the same interface but uses the MCP SDK internally. The implementation:

1. Creates an MCP server instance within the `NoteContext` class
2. Preserves the existing API methods to ensure backward compatibility
3. Simplifies testing and allows for incremental migration

## Next Steps for MCP Integration

### 1. Implement MCP Resources

Add proper MCP resource endpoints to expose note data:

```typescript
mcpServer.resource(
  "note", 
  "note://:id",
  async (uri: URL) => {
    // Implementation here
  }
);
```

### 2. Implement MCP Tools

Add tool endpoints for write operations:

```typescript
mcpServer.tool(
  "create_note",
  async (args) => {
    // Implementation here
  }
);
```

### 3. Configure MCP Transports

Add support for transport mechanisms like stdio or HTTP with SSE:

```typescript
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

// Configure the server
const server = new McpServer({
  name: "PersonalBrain",
  version: "1.0.0"
});

// Add transports
server.addTransport(new StdioServerTransport());
server.addTransport(new SSEServerTransport({ port: 8000 }));
```

### 4. Migrate Other Contexts

Following the same pattern, migrate other contexts:

- `ProfileContext`
- `ExternalSourceContext`

### 5. Create Combined MCP Server

Create a unified MCP server that combines all the context functionalities.

## Resources

- [MCP TypeScript SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Specification](https://github.com/modelcontextprotocol/mcp)