# Using the MCP Inspector with Personal Brain

This guide explains how to use the MCP Inspector to visualize and debug your Personal Brain MCP implementation.

## What is the MCP Inspector?

The MCP Inspector is a graphical tool that allows you to:

- Explore available MCP resources and tools
- Execute MCP operations and see results in real-time
- Debug your MCP implementation
- Visualize the structure of your MCP server

## Connection Methods

The Personal Brain project supports two ways to connect to the MCP Inspector:

### Method 1: StdIO (Default)

This is the simplest method, where the MCP Inspector launches the Personal Brain as a subprocess and communicates with it via stdin/stdout.

1. Make sure no MCP Inspector is currently running
2. Run the following command:

```bash
bun run mcp:inspect
```

This will launch the MCP Inspector and connect it to a new instance of the Personal Brain MCP server.

### Method 2: HTTP/SSE

This method provides a more robust connection by using HTTP and Server-Sent Events (SSE).

1. Start the MCP HTTP server:

```bash
bun run mcp:server
```

2. In a separate terminal, start the MCP Inspector with the SSE transport:

```bash
bun run mcp:inspect:http
```

This will connect the MCP Inspector to your running HTTP server via SSE.

If you need more detailed debugging information, you can use:

```bash
bun run mcp:inspect:http:debug
```

This will run the MCP Inspector with verbose logging enabled.

## Troubleshooting

### Port Already in Use

If you see an error like "listen EADDRINUSE: address already in use :::5173", it means another MCP Inspector is already running. Kill it using:

```bash
bun run mcp:inspect:kill
```

Then try again.

### Connection Issues

If the MCP Inspector can't connect to your server:

1. Make sure the MCP server is running
2. Check if the SSE connection is properly established
3. Look for error messages in both the server and inspector logs

### JSON Serialization Issues

If you see JSON parsing errors:

1. Run the tests to validate serialization:

```bash
bun run mcp:test:stdio
```

2. Try the alternative connection method (if using stdio, try HTTP/SSE, or vice versa)

## Advanced Usage

### Customizing the Inspector URL

If you're running the MCP HTTP server on a different port or host, you can customize the inspector URL:

```bash
mcp-inspector --transport=sse --url=http://your-host:port/mcp/sse
```

### Running a Custom Inspector Command

You can create your own npm script in package.json to run the inspector with custom options:

```json
"scripts": {
  "mcp:inspector:custom": "mcp-inspector --transport=sse --url=http://localhost:9000/mcp/sse"
}
```

Then run it with:

```bash
bun run mcp:inspector:custom
```