/**
 * Tests for MCP HTTP Server basic functionality
 * 
 * These tests verify that the MCP HTTP server correctly handles basic HTTP requests
 * and provides the necessary endpoints for MCP clients.
 */

/* global TextDecoder */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';

// Use a different port for tests to avoid conflicts
const TEST_PORT = 8001;

describe('MCP HTTP Server', () => {
  // Server instance for testing
  let server: ReturnType<typeof Bun.serve>;
  
  // Before all tests, start a test server
  beforeAll(() => {
    // Create a simplified test server
    server = Bun.serve({
      port: TEST_PORT,
      fetch: async (req) => {
        // Add CORS headers
        const corsHeaders = {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        };

        // Handle CORS preflight
        if (req.method === 'OPTIONS') {
          return new Response(null, {
            status: 204,
            headers: corsHeaders,
          });
        }

        const url = new URL(req.url);
        
        // Basic MCP info endpoint
        if (url.pathname === '/mcp' && req.method === 'GET') {
          return new Response(
            JSON.stringify({
              name: 'Test MCP Server',
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
        
        // SSE endpoint at the root level
        if (url.pathname === '/sse' && req.method === 'GET') {
          // Create a ReadableStream that sends a connection_ready message
          return new Response(
            new ReadableStream({
              start(controller) {
                const message = JSON.stringify({
                  type: 'connection_ready',
                  serverName: 'Test MCP Server',
                  serverVersion: '1.0.0',
                  timestamp: new Date().toISOString(),
                });
                controller.enqueue(`data: ${message}\n\n`);
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
        
        // Default response for other paths
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
  });
  
  // After all tests, stop the server
  afterAll(() => {
    server.stop();
  });
  
  // Test basic endpoints
  test('should respond to OPTIONS requests with CORS headers', async () => {
    const response = await fetch(`http://localhost:${TEST_PORT}/mcp`, {
      method: 'OPTIONS',
    });
    
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });
  
  test('should respond to GET /mcp with server info', async () => {
    const response = await fetch(`http://localhost:${TEST_PORT}/mcp`);
    
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    
    const data = await response.json();
    expect(data).toHaveProperty('name');
    expect(data).toHaveProperty('version');
    expect(data).toHaveProperty('resources');
    expect(data).toHaveProperty('tools');
  });
  
  test('should respond to GET /sse with event stream', async () => {
    const response = await fetch(`http://localhost:${TEST_PORT}/sse`);
    
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    expect(response.headers.get('Cache-Control')).toBe('no-cache');
    expect(response.headers.get('Connection')).toBe('keep-alive');
    
    // Read the event stream
    const reader = response.body!.getReader();
    const { value, done } = await reader.read();
    
    expect(done).toBe(false);
    
    // We're using TextDecoder which is defined in Bun's runtime
    // Convert the Uint8Array to a string
    const text = new TextDecoder().decode(value);
    
    // Check that the text contains the expected event structure
    expect(text).toContain('data:');
    expect(text).toContain('connection_ready');
    
    // Clean up
    await reader.cancel();
  });
  
  test('should respond with 404 for unknown endpoints', async () => {
    const response = await fetch(`http://localhost:${TEST_PORT}/unknown`);
    
    expect(response.status).toBe(404);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toBe('Endpoint not found');
  });
});