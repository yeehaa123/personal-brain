# Model-Context-Protocol (MCP) Implementation

This directory contains the MCP implementation for the Personal Brain project. MCP is a standard protocol that allows AI models to interact with various context sources in a structured way.

## Architecture

The MCP implementation in Personal Brain is organized as follows:

- **Main Entry Point**: `index.ts` exports the `createUnifiedMcpServer` function which creates an MCP server with all contexts.
- **Contexts**: These provide access to different types of data in the Personal Brain:
  - `NoteContext`: Access to notes and related functionality
  - `ProfileContext`: Access to user profile information
  - `ExternalSourceContext`: Access to external information sources like Wikipedia

## Server Implementations

We provide two different server implementations to expose the MCP functionality:

### HTTP Server

- **File**: `/src/mcp-http-server.ts`
- **Usage**: `bun run mcp:server`
- **Description**: Implements an HTTP server that exposes the MCP resources and tools via RESTful endpoints.
- **Features**: 
  - Server-Sent Events (SSE) for real-time messaging
  - JSON-based message API
  - CORS support for cross-origin requests
- **Testing**: `bun run mcp:test`

### StdIO Server (for MCP Inspector)

- **File**: `/src/mcp-stdio-server.ts`
- **Usage**: `bun run mcp:stdio` or `bun run mcp:inspect`
- **Description**: Implements an MCP server that communicates via standard input/output (stdin/stdout), which is required for the MCP Inspector tool.
- **Testing**: `bun run mcp:test:stdio`

## MCP Inspector Integration

The MCP Inspector is a tool for visualizing and debugging MCP implementations. Personal Brain supports connecting to the MCP Inspector in two ways:

### 1. Using StdIO (Default)

The MCP Inspector primarily works with the stdin/stdout protocol:

```bash
# Make sure no other MCP Inspector instances are running (port 5173 must be available)
bun run mcp:inspect
```

### 2. Using HTTP/SSE

You can also connect to the MCP Inspector using Server-Sent Events over HTTP:

```bash
# First, start the HTTP server in one terminal
bun run mcp:server

# In another terminal, run the MCP Inspector with SSE transport
bun run mcp:inspect:http
```

This approach provides a more robust connection that works even when the stdio connection has issues.

### Troubleshooting

For detailed instructions and troubleshooting tips, see [INSPECTOR.md](INSPECTOR.md).

## Available Resources and Tools

The Personal Brain MCP implementation provides the following resources and tools:

### Resources

- `note://:id` - Get a specific note by ID
- `notes://search` - Search notes
- `notes://recent` - Get recently created/updated notes
- `notes://related/:id` - Get notes related to a specific note
- `profile://me` - Get the user's profile
- `profile://keywords` - Get profile keywords
- `profile://related?limit` - Get content related to the profile
- `external://search` - Search external sources
- `external://sources` - List available external sources

### Tools

- `create_note` - Create a new note
- `generate_embeddings` - Generate embeddings for text
- `search_with_embedding` - Search using an embedding vector
- `save_profile` - Save the user profile
- `update_profile_tags` - Update profile tags
- `generate_profile_embedding` - Generate embedding for a profile
- `search_external_sources` - Search external knowledge sources
- `toggle_external_source` - Enable/disable an external source


## Troubleshooting

Common issues and solutions when working with the MCP Inspector:

### 1. Connection issues

- **Port conflicts**: If the MCP Inspector fails with "address already in use" errors, use `bun run mcp:inspect:kill` to terminate existing processes.
- **SSE connection failures**: Start with the stdio transport first, and if that works, try the HTTP/SSE transport. Use the debug option `bun run mcp:inspect:http:debug` for verbose logging.
- **No resources or tools showing up**: Make sure the server is properly initialized. Check the logs for any initialization errors.

### 2. JSON serialization issues

- Verify that all resources and tools are properly registered in the MCP server
- Check that all objects can be serialized to JSON without circular references
- Use the `safeSerialize` function in `mcp-stdio-server.ts` to handle complex objects
- Run the test suite with `bun run mcp:test:stdio` to verify serialization works

### 3. Inspector navigation

- If the Inspector shows resources but clicking on them doesn't load details, check that your message handling implementation correctly processes requests for resource details.
- If tool execution fails, verify the error messages in the server logs and make sure the tool implementation correctly handles all parameters.

