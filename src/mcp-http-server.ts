/**
 * MCP HTTP Server for Personal Brain
 * 
 * This script creates a basic HTTP server that implements the Model-Context-Protocol (MCP) standard,
 * allowing the Personal Brain to connect with MCP Inspector and other clients.
 */

import logger from './utils/logger';
import { serverConfig } from './config';

// Tell ESLint that we're using global browser APIs in Node.js
/* global setInterval, clearInterval */

// Define a type for the server state
interface ServerInfo {
  name: string;
  version: string;
  resources: string[];
  tools: string[];
}

/**
 * Initialize the MCP server and create an HTTP server with Bun
 */
function main() {
  // Server info
  const serverInfo: ServerInfo = {
    name: 'Personal Brain MCP Server',
    version: '1.0.0',
    resources: [],
    tools: [],
  };

  // Create a Bun HTTP server
  const port = serverConfig.mcpHttpPort;
  
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
          JSON.stringify(serverInfo),
          { 
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders,
            }, 
          },
        );
      }
      
      // SSE endpoint at root level - preferred for standard compatibility
      if (url.pathname === '/sse' && req.method === 'GET') {
        logger.info(`SSE connection request received at /sse: ${req.url}`);
        
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
                serverName: serverInfo.name,
                serverVersion: serverInfo.version,
                timestamp: new Date().toISOString(),
              });
              
              logger.debug(`Sending initial SSE message: ${message}`);
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
                logger.info(`SSE connection closed: ${sessionId}`);
              });
              
              logger.info(`SSE connection established with session ID: ${sessionId}`);
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
        logger.info(`SSE connection request received at /mcp/sse: ${req.url}`);
        
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
                serverName: serverInfo.name,
                serverVersion: serverInfo.version,
                timestamp: new Date().toISOString(),
              });
              
              logger.debug(`Sending initial SSE message: ${message}`);
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
                logger.info(`SSE connection closed: ${sessionId}`);
              });
              
              logger.info(`SSE connection established with session ID: ${sessionId}`);
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

  logger.info(`MCP HTTP server running at http://${server.hostname}:${server.port}`);
  logger.info('Available endpoints:');
  logger.info(`- Server info: http://${server.hostname}:${server.port}/mcp`);
  logger.info(`- SSE endpoint (standard): http://${server.hostname}:${server.port}/sse`);
  logger.info(`- SSE endpoint (MCP Inspector): http://${server.hostname}:${server.port}/mcp/sse`);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    logger.info('Shutting down MCP HTTP server...');
    server.stop();
    process.exit(0);
  });
}

// Run the main function
main();