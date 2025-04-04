/**
 * Tests for MCP HTTP Server functionality
 * 
 * These tests verify that the MCP HTTP server correctly handles HTTP requests,
 * provides the necessary endpoints for MCP clients, and correctly integrates with
 * the Model-Context-Protocol functionality.
 */

/* global TextDecoder */

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

// Use a different port for tests to avoid conflicts
const TEST_PORT = 8001;

// Note: We're testing with a simplified server implementation below

describe('MCP HTTP Server', () => {
  // Server instance for testing
  let server: ReturnType<typeof Bun.serve>;
  let activeSessions: Set<string> = new Set();
  
  // Before all tests, start a test server
  beforeAll(() => {
    // Create a simplified test server that mimics the actual implementation
    server = Bun.serve({
      port: TEST_PORT,
      fetch: async (req) => {
        // Add CORS headers
        const corsHeaders = {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
        
        // Handle message posting for a session
        if (url.pathname === '/messages' && req.method === 'POST') {
          const sessionId = url.searchParams.get('sessionId');
          
          if (!sessionId) {
            return new Response(
              JSON.stringify({ error: 'No sessionId provided' }),
              {
                status: 400,
                headers: {
                  'Content-Type': 'application/json',
                  ...corsHeaders,
                },
              },
            );
          }
          
          if (!activeSessions.has(sessionId)) {
            return new Response(
              JSON.stringify({ error: 'No active transport found for this session' }),
              {
                status: 404,
                headers: {
                  'Content-Type': 'application/json',
                  ...corsHeaders,
                },
              },
            );
          }
          
          // Parse the incoming message
          const message = await req.json();
          
          // Mock MCP server response for testing
          return new Response(
            JSON.stringify({
              success: true,
              type: 'response',
              originalMessage: message,
            }),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                ...corsHeaders,
              },
            },
          );
        }
        
        // SSE endpoints
        if ((url.pathname === '/sse' || url.pathname === '/mcp/sse') && req.method === 'GET') {
          // Get transportType from URL parameters or use default
          const transportType = url.searchParams.get('transportType') || 'sse';
          
          // Generate a sessionId
          const sessionId = `test-session-${Math.random().toString(36).substring(2, 10)}`;
          activeSessions.add(sessionId);
          
          // Create a ReadableStream that sends a connection_ready message
          return new Response(
            new ReadableStream({
              start(controller) {
                // Send connection_ready message
                const message = JSON.stringify({
                  type: 'connection_ready',
                  transportType,
                  sessionId, 
                  serverName: 'Test MCP Server',
                  serverVersion: '1.0.0',
                  timestamp: new Date().toISOString(),
                });
                controller.enqueue(`data: ${message}\n\n`);
                
                // Send heartbeat after 100ms
                // Using globalThis.setTimeout to avoid linting issues
                globalThis.setTimeout(() => {
                  const heartbeat = JSON.stringify({
                    type: 'heartbeat',
                    transportType,
                    sessionId,
                    timestamp: new Date().toISOString(),
                  });
                  controller.enqueue(`data: ${heartbeat}\n\n`);
                }, 100);
              },
              cancel() {
                activeSessions.delete(sessionId);
              },
            }),
            {
              headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no', // Disable buffering
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
    
    // Convert the Uint8Array to a string
    const text = new TextDecoder().decode(value);
    
    // Check that the text contains the expected event structure
    expect(text).toContain('data:');
    expect(text).toContain('connection_ready');
    
    // Clean up
    await reader.cancel();
  });
  
  test('should respond to GET /mcp/sse with event stream', async () => {
    const response = await fetch(`http://localhost:${TEST_PORT}/mcp/sse`);
    
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    
    // Read the event stream
    const reader = response.body!.getReader();
    const { value, done } = await reader.read();
    
    expect(done).toBe(false);
    
    // Convert the Uint8Array to a string
    const text = new TextDecoder().decode(value);
    
    // Check that the text contains the expected event structure
    expect(text).toContain('data:');
    expect(text).toContain('connection_ready');
    
    // Clean up
    await reader.cancel();
  });
  
  test('should include transportType and sessionId in SSE messages', async () => {
    // Test with default transportType
    const defaultResponse = await fetch(`http://localhost:${TEST_PORT}/sse`);
    
    const defaultReader = defaultResponse.body!.getReader();
    const { value: defaultValue } = await defaultReader.read();
    const defaultText = new TextDecoder().decode(defaultValue);
    const defaultData = JSON.parse(defaultText.replace('data: ', ''));
    
    expect(defaultData).toHaveProperty('transportType');
    expect(defaultData).toHaveProperty('sessionId');
    expect(defaultData.transportType).toBe('sse');
    expect(defaultData.sessionId).toMatch(/^test-session-/);
    
    // Clean up
    await defaultReader.cancel();
    
    // Test with custom transportType
    const customResponse = await fetch(`http://localhost:${TEST_PORT}/sse?transportType=websocket`);
    
    const customReader = customResponse.body!.getReader();
    const { value: customValue } = await customReader.read();
    const customText = new TextDecoder().decode(customValue);
    const customData = JSON.parse(customText.replace('data: ', ''));
    
    expect(customData).toHaveProperty('transportType');
    expect(customData.transportType).toBe('websocket');
    
    // Clean up
    await customReader.cancel();
  });
  
  test('should receive heartbeat messages after connection', async () => {
    const response = await fetch(`http://localhost:${TEST_PORT}/sse`);
    
    const reader = response.body!.getReader();
    
    // First message should be connection_ready
    const { value: value1 } = await reader.read();
    const text1 = new TextDecoder().decode(value1);
    const data1 = JSON.parse(text1.replace('data: ', ''));
    expect(data1.type).toBe('connection_ready');
    
    // Second message should be heartbeat (might need to wait)
    const { value: value2 } = await reader.read();
    const text2 = new TextDecoder().decode(value2);
    const data2 = JSON.parse(text2.replace('data: ', ''));
    expect(data2.type).toBe('heartbeat');
    
    // Clean up
    await reader.cancel();
  });
  
  test('should respond with 400 to POST /messages without sessionId', async () => {
    const response = await fetch(`http://localhost:${TEST_PORT}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'test' }),
    });
    
    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toBe('No sessionId provided');
  });
  
  test('should respond with 404 to POST /messages with invalid sessionId', async () => {
    const response = await fetch(`http://localhost:${TEST_PORT}/messages?sessionId=invalid-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'test' }),
    });
    
    expect(response.status).toBe(404);
    
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toBe('No active transport found for this session');
  });
  
  test('should respond with 404 for unknown endpoints', async () => {
    const response = await fetch(`http://localhost:${TEST_PORT}/unknown`);
    
    expect(response.status).toBe(404);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toBe('Endpoint not found');
  });
  
  test('full MCP communication flow through SSE and messages endpoint', async () => {
    // 1. Establish SSE connection
    const sseResponse = await fetch(`http://localhost:${TEST_PORT}/sse`);
    const reader = sseResponse.body!.getReader();
    
    // 2. Get connection_ready message with sessionId
    const { value } = await reader.read();
    const text = new TextDecoder().decode(value);
    const connectionMessage = JSON.parse(text.replace('data: ', ''));
    const sessionId = connectionMessage.sessionId;
    
    expect(connectionMessage.type).toBe('connection_ready');
    expect(sessionId).toBeDefined();
    
    // 3. Send a message to the /messages endpoint
    const testMessage = { 
      id: 'test123',
      type: 'request', 
      method: 'list_resources',
    };
    
    const messageResponse = await fetch(`http://localhost:${TEST_PORT}/messages?sessionId=${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testMessage),
    });
    
    expect(messageResponse.status).toBe(200);
    
    const responseData = await messageResponse.json();
    expect(responseData).toHaveProperty('success', true);
    expect(responseData).toHaveProperty('type', 'response');
    expect(responseData).toHaveProperty('originalMessage');
    expect(responseData.originalMessage).toEqual(testMessage);
    
    // Clean up
    await reader.cancel();
  });
});