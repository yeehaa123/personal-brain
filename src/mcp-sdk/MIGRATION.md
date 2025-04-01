# Model Context Protocol Migration Plan

This document outlines the migration plan for integrating the Model Context Protocol (MCP) SDK into the Personal Brain application.

## Current Progress

1. ✅ Installed the MCP SDK package
2. ✅ Created a basic NoteContext implementation using the MCP SDK
3. ✅ Made the new implementation a drop-in replacement for the original NoteContext
4. ✅ Updated the BrainProtocol class to use the new implementation
5. ✅ Added a README.md with next steps and usage instructions
6. ✅ Verified the application runs with the new implementation
7. ✅ Migrated ProfileContext to MCP SDK
8. ✅ Migrated ExternalSourceContext to MCP SDK
9. ✅ Streamlined directory structure for all contexts
10. ✅ Created Unified MCP Server for all contexts
11. ✅ Modified context classes to support external server registration
12. ✅ Added tests for the unified MCP server

## Next Steps

### 1. Implement Transports

Add support for different transport mechanisms:

```typescript
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

// Add transports to the unified server
const unifiedServer = createUnifiedMcpServer({
  apiKey: process.env.ANTHROPIC_API_KEY,
  newsApiKey: process.env.NEWSAPI_KEY,
});

// Add transports to the server
unifiedServer.addTransport(new StdioServerTransport());
unifiedServer.addTransport(new SSEServerTransport({ port: 8000 }));
```

### 2. Update BrainProtocol to Use Unified Server

Modify the BrainProtocol class to use the unified MCP server:

```typescript
// In BrainProtocol constructor
this.unifiedMcpServer = createUnifiedMcpServer({
  apiKey,
  newsApiKey,
  name: 'BrainProtocol',
  version: '1.0.0',
  enableExternalSources: useExternalSources,
});

// Add method to get unified server
getMcpServer() {
  return this.unifiedMcpServer;
}
```

### 3. Add MCP Server CLI Interface

Create a CLI interface specifically for the MCP server:

```typescript
// In a new file: src/interfaces/mcp-cli.ts
import { createUnifiedMcpServer } from '@/mcp-sdk';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

export async function startMcpServer(options: { apiKey?: string, newsApiKey?: string }) {
  const server = createUnifiedMcpServer({
    apiKey: options.apiKey,
    newsApiKey: options.newsApiKey,
  });
  
  server.addTransport(new StdioServerTransport());
  return server;
}
```

### 4. Update Documentation

Update the project documentation:

1. Add usage instructions for the unified MCP server
2. Document available resources and tools
3. Provide examples of using the MCP SDK with the application
4. Document transport options

## Reference

- [MCP TypeScript SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Specification](https://github.com/modelcontextprotocol/mcp)