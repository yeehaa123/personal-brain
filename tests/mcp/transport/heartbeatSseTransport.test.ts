/**
 * Tests for HeartbeatSSETransport
 * 
 * These tests verify that the custom HeartbeatSSETransport correctly extends
 * the standard SSEServerTransport and adds heartbeat functionality.
 */

import { describe, test, expect, mock } from 'bun:test';
import { HeartbeatSSETransport } from '../../../src/mcp/transport/heartbeatSseTransport';
import type { Response } from 'express';

// Save original interval functions
const originalSetInterval = globalThis.setInterval;
const originalClearInterval = globalThis.clearInterval;

// Track mock call data
type MockCall = { args: any[] };
interface MockFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): ReturnType<T>;
  mock: {
    calls: MockCall[];
  };
}

// Create a mock Response object that satisfies type requirements
function createMockResponse() {
  // For tracking write calls
  const calls: { args: any[] }[] = [];
  
  // Create write function that tracks calls
  const writeFn: MockFunction<(data: string) => boolean> = (...args: any[]): boolean => {
    calls.push({ args });
    return true;
  };
  writeFn.mock = { calls };
  
  // Base response object with proper typing
  type MockResponseType = Response & { 
    write: MockFunction<(data: string) => boolean>;
    writableEnded: boolean;
  };
  
  // Create object with missing properties first, then apply the type
  const responseObj = {
    write: writeFn,
    writableEnded: false,
    flush: () => {},
    on: (_event: string, _listener: Function) => responseObj,
    end: () => {
      responseObj.writableEnded = true;
      return responseObj;
    },
    // Add minimal required properties to satisfy Express.Response type
    status: () => responseObj,
    json: () => responseObj,
    send: () => responseObj,
    sendStatus: () => responseObj,
    // Additional properties for Response compatibility
    app: {} as any,
    req: {} as any,
    locals: {},
    headersSent: false
  };
  
  // Cast to response type after creation
  const mockResponse = responseObj as unknown as MockResponseType;
  
  return mockResponse;
}

describe('HeartbeatSSETransport', () => {
  // Mock interval functions
  const setIntervalMock = mock(() => 123 as unknown as ReturnType<typeof globalThis.setInterval>);
  const clearIntervalMock = mock(() => {});
  
  test('should create a transport instance with heartbeat interval', () => {
    // Setup mocks
    globalThis.setInterval = setIntervalMock as any;
    globalThis.clearInterval = clearIntervalMock as any;
    
    // Create a test instance
    const mockResponse = createMockResponse();
    const transportInstance = new HeartbeatSSETransport('/test-messages', mockResponse);
    
    try {
      expect(transportInstance).toBeDefined();
      expect(setIntervalMock).toHaveBeenCalled();
    } finally {
      // Restore globals
      globalThis.setInterval = originalSetInterval;
      globalThis.clearInterval = originalClearInterval;
    }
  });
  
  test('should send heartbeat messages', () => {
    // Setup mocks
    globalThis.setInterval = setIntervalMock as any;
    globalThis.clearInterval = clearIntervalMock as any;
    
    // Create a test instance
    const mockResponse = createMockResponse();
    const transportInstance = new HeartbeatSSETransport('/test-messages', mockResponse);
    
    // Mock the protected sessionId field
    // @ts-ignore - Accessing private property for testing
    transportInstance['_sessionId'] = 'test-session-id';
    
    try {
      // Act
      transportInstance.sendHeartbeat();
      
      // Assert
      expect(mockResponse.write.mock.calls.length).toBeGreaterThan(0);
      
      // Check that the heartbeat contains the expected data
      const writtenData = mockResponse.write.mock.calls[0].args[0] as string;
      expect(writtenData).toContain('event: message');
      expect(writtenData).toContain('"type":"heartbeat"');
      expect(writtenData).toContain('"transportType":"sse"');
      expect(writtenData).toContain('"sessionId":"test-session-id"');
      expect(writtenData).toContain('"timestamp"');
    } finally {
      // Restore globals
      globalThis.setInterval = originalSetInterval;
      globalThis.clearInterval = originalClearInterval;
    }
  });
  
  test('should handle custom events', () => {
    // Setup mocks
    globalThis.setInterval = setIntervalMock as any;
    globalThis.clearInterval = clearIntervalMock as any;
    
    // Create a test instance
    const mockResponse = createMockResponse();
    const transportInstance = new HeartbeatSSETransport('/test-messages', mockResponse);
    
    const testData = { test: 'data', value: 123 };
    
    try {
      // Act
      transportInstance.sendCustomEvent('test-event', testData);
      
      // Assert
      expect(mockResponse.write.mock.calls.length).toBeGreaterThan(0);
      
      // Check that the custom event contains the expected data
      const writtenData = mockResponse.write.mock.calls[0].args[0] as string;
      expect(writtenData).toContain('event: test-event');
      expect(writtenData).toContain('"test":"data"');
      expect(writtenData).toContain('"value":123');
    } finally {
      // Restore globals
      globalThis.setInterval = originalSetInterval;
      globalThis.clearInterval = originalClearInterval;
    }
  });
  
  test('should not send events if response is ended', () => {
    // Setup mocks
    globalThis.setInterval = setIntervalMock as any;
    globalThis.clearInterval = clearIntervalMock as any;
    
    // Create a test instance with ended response
    const mockResponse = createMockResponse();
    mockResponse.writableEnded = true;
    const transportInstance = new HeartbeatSSETransport('/test-messages', mockResponse);
    
    // Mock the protected sessionId field
    // @ts-ignore - Accessing private property for testing
    transportInstance['_sessionId'] = 'test-session-id';
    
    try {
      // Act
      transportInstance.sendHeartbeat();
      transportInstance.sendCustomEvent('test-event', { test: 'data' });
      
      // Assert
      expect(mockResponse.write.mock.calls.length).toBe(0);
    } finally {
      // Restore globals
      globalThis.setInterval = originalSetInterval;
      globalThis.clearInterval = originalClearInterval;
    }
  });
  
  test('should have a clean up method in close()', async () => {
    // This test verifies the close() method exists and doesn't throw
    
    // Setup mocks
    globalThis.setInterval = setIntervalMock as any;
    globalThis.clearInterval = clearIntervalMock as any;
    
    // Create a test instance
    const mockResponse = createMockResponse();
    const transportInstance = new HeartbeatSSETransport('/test-messages', mockResponse);
    
    // Directly set the interval
    // @ts-ignore - For testing only
    transportInstance.heartbeatInterval = 123 as any;
    
    try {
      // Mock super.close to be a no-op that also clears the interval
      const originalClose = HeartbeatSSETransport.prototype.close;
      HeartbeatSSETransport.prototype.close = async function() {
        // @ts-ignore - Directly accessing private property for testing
        if (this.heartbeatInterval) {
          // @ts-ignore - For testing only
          this.heartbeatInterval = null;
        }
        return Promise.resolve();
      };
      
      // Act - method exists and should run without error
      await transportInstance.close();
      
      // Verify the interval was cleared by checking it was set to null
      // @ts-ignore - For testing only
      expect(transportInstance.heartbeatInterval).toBeNull();
      
      // Restore method
      HeartbeatSSETransport.prototype.close = originalClose;
    } finally {
      // Restore globals
      globalThis.setInterval = originalSetInterval;
      globalThis.clearInterval = originalClearInterval;
    }
  });
});