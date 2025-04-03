/**
 * Smoke test for HTTP Server with HeartbeatSSETransport
 * 
 * Simple test to verify that the HTTP server can be instantiated.
 */

import { describe, test, expect } from 'bun:test';
import { startMcpHttpServer } from '../../../src/mcp-http-server';

describe('HTTP Server with HeartbeatSSETransport Integration', () => {
  test('should instantiate the HTTP server without errors', () => {
    // Mock the listen method to prevent the server from actually starting
    const originalListen = Object.getPrototypeOf(Object.getPrototypeOf(startMcpHttpServer)).listen;
    
    // @ts-ignore - For testing
    Object.getPrototypeOf(Object.getPrototypeOf(startMcpHttpServer)).listen = function() {
      // Return a mock server object
      return {
        close: () => {}
      };
    };
    
    try {
      // Act - Just make sure the function doesn't throw
      const server = startMcpHttpServer();
      
      // Assert
      expect(server).toBeDefined();
    } finally {
      // Restore original method
      // @ts-ignore - For testing
      Object.getPrototypeOf(Object.getPrototypeOf(startMcpHttpServer)).listen = originalListen;
    }
  });
});