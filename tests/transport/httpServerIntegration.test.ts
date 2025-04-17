/**
 * HTTP Server with HeartbeatSSETransport Integration
 * 
 * Simple test to verify that the MCP HTTP server components work correctly together.
 */
/* global setInterval, clearInterval */

import { describe, expect, mock, test } from 'bun:test';
import type { Response } from 'express';

import { HeartbeatSSETransport } from '@/transport/heartbeatSseTransport';

// Type for our mock response to satisfy TypeScript
interface MockResponse extends Partial<Response> {
  writableEnded?: boolean;
  write?: (data: string) => boolean;
  flush?: () => void;
  _events?: Record<string, Array<(...args: unknown[]) => void>>;
}

describe('HTTP Server with HeartbeatSSETransport Integration', () => {
  // The test name explains what we're verifying
  test('should properly initialize HeartbeatSSETransport', () => {
    let closeCallback: (() => void) | null = null;
    
    // Create a simpler write mock for easier testing
    const writeMock = mock((_data: string) => true);
    
    // Create mock response with just the methods we need
    const mockResponse: MockResponse = {
      writableEnded: false,
      write: writeMock,
      flush: mock(() => {}),
      setHeader: mock(() => {}) as unknown as Response['setHeader'],
      on: mock((event: string, callback: (() => void)) => {
        if (event === 'close') {
          closeCallback = callback;
        }
        return mockResponse;
      }) as unknown as Response['on'],
    };
    
    // Create a transport instance using createFresh to avoid singleton interference
    const transport = HeartbeatSSETransport.createFresh({
      messagesEndpoint: '/test-endpoint',
      res: mockResponse as Response,
    });
    
    // Check that the transport is initialized
    expect(transport).toBeDefined();
    
    // Test sending a custom event
    transport.sendCustomEvent('test-event', { data: 'test-data' });
    
    // Verify write was called
    expect(writeMock).toHaveBeenCalled();
    
    // Test sending a heartbeat
    transport.sendHeartbeat();
    
    // Verify write was called at least twice
    expect(writeMock.mock.calls.length).toBeGreaterThan(1);
    
    // Test the close handler was registered
    expect(closeCallback).not.toBeNull();
  });
  
  test('should stop sending messages when response is ended', () => {
    // Create mock response that's already ended
    const mockResponse: MockResponse = {
      writableEnded: true, // Already ended
      write: mock((_data: string) => true),
      on: mock(() => mockResponse) as unknown as Response['on'],
    };
    
    // Create a transport instance using createFresh to avoid singleton interference
    const transport = HeartbeatSSETransport.createFresh({
      messagesEndpoint: '/test-endpoint',
      res: mockResponse as Response,
    });
    
    // Send events that should be ignored
    transport.sendCustomEvent('test-event', { data: 'test-data' });
    transport.sendHeartbeat();
    
    // Verify no writes happened
    expect(mockResponse.write).not.toHaveBeenCalled();
  });
  
  test('should clean up resources on close', async () => {
    // Create a mock to verify the heartbeat interval gets cleared
    const originalSetInterval = globalThis.setInterval;
    const originalClearInterval = globalThis.clearInterval;
    
    // Original setInterval returns a number, so we mock it to return a dummy value
    const mockSetInterval = mock(() => 123);
    const mockClearInterval = mock(() => {});
    
    // Install mocks
    globalThis.setInterval = mockSetInterval as unknown as typeof setInterval;
    globalThis.clearInterval = mockClearInterval as unknown as typeof clearInterval;
    
    try {
      // Create minimal mock response
      const mockResponse: MockResponse = {
        writableEnded: false,
        write: mock((_data: string) => true),
        on: mock(() => mockResponse) as unknown as Response['on'],
      };
      
      // Create transport using createFresh to avoid singleton interference
      const transport = HeartbeatSSETransport.createFresh({
        messagesEndpoint: '/test-endpoint',
        res: mockResponse as Response,
      });
      
      // Verify setInterval was called during initialization
      expect(mockSetInterval).toHaveBeenCalled();
      
      // Close the transport
      await transport.close();
      
      // Verify clearInterval was called
      expect(mockClearInterval).toHaveBeenCalled();
    } finally {
      // Restore original timers
      globalThis.setInterval = originalSetInterval;
      globalThis.clearInterval = originalClearInterval;
    }
  });
});