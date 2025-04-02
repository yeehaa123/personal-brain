/**
 * Simple MCP HTTP Server for testing SSE connections
 * 
 * This is a minimal server implementation with no dependencies on the rest of the codebase.
 */

/* global setInterval, clearInterval */

/**
 * Initialize a simple HTTP server with Bun
 */
function main() {
  console.log('Starting simple MCP HTTP server...');

  // Create a Bun HTTP server
  const port = 8080;
  
  const server = Bun.serve({
    port,
    async fetch(req) {
      // Add CORS headers for all responses
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      };

      // Handle CORS preflight requests
      if (req.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: corsHeaders,
        });
      }

      const url = new URL(req.url);
      
      // Basic info endpoint
      if (url.pathname === '/mcp' && req.method === 'GET') {
        return new Response(
          JSON.stringify({
            name: 'Simple MCP Server',
            version: '1.0.0',
            resources: [],
            tools: [],
          }),
          { 
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders,
            }, 
          },
        );
      }
      
      // SSE endpoint at root level
      if (url.pathname === '/sse' && req.method === 'GET') {
        console.log(`SSE connection request received at /sse: ${req.url}`);
        
        // Generate a session ID for tracking this connection
        const sessionId = Math.random().toString(36).substring(2, 15);
        
        // Create a ReadableStream for the SSE connection
        return new Response(
          new ReadableStream({
            start(controller) {
              // Send an initial connection_ready message
              const message = JSON.stringify({
                type: 'connection_ready',
                sessionId,
                serverName: 'Simple MCP Server',
                serverVersion: '1.0.0',
                timestamp: new Date().toISOString(),
              });
              
              console.log(`Sending initial SSE message: ${message}`);
              controller.enqueue(`data: ${message}\n\n`);
              
              // Set up a heartbeat to keep the connection alive
              const intervalId = setInterval(() => {
                const heartbeat = JSON.stringify({
                  type: 'heartbeat',
                  timestamp: new Date().toISOString(),
                });
                controller.enqueue(`data: ${heartbeat}\n\n`);
              }, 30000); // Send heartbeat every 30 seconds
              
              // Clean up the interval when the request is aborted
              req.signal.addEventListener('abort', () => {
                clearInterval(intervalId);
                console.log(`SSE connection closed: ${sessionId}`);
              });
              
              console.log(`SSE connection established with session ID: ${sessionId}`);
            },
          }),
          {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
              ...corsHeaders,
            },
          },
        );
      }
      
      // SSE endpoint under /mcp path - for MCP Inspector compatibility
      if (url.pathname === '/mcp/sse' && req.method === 'GET') {
        console.log(`SSE connection request received at /mcp/sse: ${req.url}`);
        
        // Generate a session ID for tracking this connection
        const sessionId = Math.random().toString(36).substring(2, 15);
        
        // Create a ReadableStream for the SSE connection
        return new Response(
          new ReadableStream({
            start(controller) {
              // Send an initial connection_ready message
              const message = JSON.stringify({
                type: 'connection_ready',
                sessionId,
                serverName: 'Simple MCP Server',
                serverVersion: '1.0.0',
                timestamp: new Date().toISOString(),
              });
              
              console.log(`Sending initial SSE message: ${message}`);
              controller.enqueue(`data: ${message}\n\n`);
              
              // Set up a heartbeat to keep the connection alive
              const intervalId = setInterval(() => {
                const heartbeat = JSON.stringify({
                  type: 'heartbeat',
                  timestamp: new Date().toISOString(),
                });
                controller.enqueue(`data: ${heartbeat}\n\n`);
              }, 30000); // Send heartbeat every 30 seconds
              
              // Clean up the interval when the request is aborted
              req.signal.addEventListener('abort', () => {
                clearInterval(intervalId);
                console.log(`SSE connection closed: ${sessionId}`);
              });
              
              console.log(`SSE connection established with session ID: ${sessionId}`);
            },
          }),
          {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
              ...corsHeaders,
            },
          },
        );
      }
      
      // Default response
      return new Response(
        JSON.stringify({ error: 'Endpoint not found' }), 
        { 
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        },
      );
    },
  });

  console.log(`Simple MCP HTTP server running at http://localhost:${port}`);
  console.log('Available endpoints:');
  console.log(`- Server info: http://localhost:${port}/mcp`);
  console.log(`- SSE endpoint (standard): http://localhost:${port}/sse`);
  console.log(`- SSE endpoint (MCP Inspector): http://localhost:${port}/mcp/sse`);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('Shutting down HTTP server...');
    server.stop();
    process.exit(0);
  });
}

// Run the main function
main();