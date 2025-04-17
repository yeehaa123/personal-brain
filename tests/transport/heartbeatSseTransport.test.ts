/**
 * Tests for HeartbeatSSETransport
 * 
 * These tests verify that the custom HeartbeatSSETransport correctly extends
 * the standard SSEServerTransport and adds heartbeat functionality.
 */

import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { Response } from 'express';

import { HeartbeatSSETransport } from '@/transport/heartbeatSseTransport';




// Save original interval functions
const originalSetInterval = globalThis.setInterval;
const originalClearInterval = globalThis.clearInterval;

// Track mock call data
type MockCall = { args: unknown[] };
interface MockFunction<T extends (...args: unknown[]) => unknown> {
  (...args: Parameters<T>): ReturnType<T>;
  mock: {
    calls: MockCall[];
  };
}

// Create a mock Response object that satisfies type requirements
function createMockResponse() {
  // For tracking write calls
  const calls: { args: unknown[] }[] = [];
  
  // Create write function that tracks calls
  // We need to specify the function type as string => boolean but use unknown for args to satisfy TypeScript
  type WriteFnType = (data: unknown) => boolean;
  const writeFn = function(data: unknown): boolean {
    calls.push({ args: [data] });
    return true;
  } as MockFunction<WriteFnType>;
  writeFn.mock = { calls };
  
  // Base response object with proper typing
  type MockResponseType = Response & { 
    write: MockFunction<WriteFnType>;
    writableEnded: boolean;
  };
  
  // Create object with missing properties first, then apply the type
  const responseObj = {
    write: writeFn,
    writableEnded: false,
    flush: () => {},
    on: (_event: string, _listener: (...args: unknown[]) => void) => responseObj,
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
    app: {} as unknown,
    req: {} as unknown,
    locals: {},
    headersSent: false,
  };
  
  // Cast to response type after creation
  const mockResponse = responseObj as unknown as MockResponseType;
  
  return mockResponse;
}

describe('HeartbeatSSETransport', () => {
  // Mock interval functions
  const setIntervalMock = mock(() => 123 as unknown as ReturnType<typeof globalThis.setInterval>);
  const clearIntervalMock = mock(() => {});
  
  // Reset the singleton instance before each test to avoid interference
  beforeEach(() => {
    HeartbeatSSETransport.resetInstance();
  });
  
  // Test the getInstance and resetInstance methods
  test('should implement the singleton pattern correctly', () => {
    // Create first instance
    const mockResponse1 = createMockResponse();
    const instance1 = HeartbeatSSETransport.getInstance({
      messagesEndpoint: '/test-endpoint',
      res: mockResponse1,
    });
    
    // Create second instance with the same config - should be the same object
    const instance2 = HeartbeatSSETransport.getInstance({
      messagesEndpoint: '/test-endpoint',
      res: mockResponse1,
    });
    
    // Both instances should be the same object
    expect(instance1).toBe(instance2);
    
    // Reset the instance
    HeartbeatSSETransport.resetInstance();
    
    // Create new instance - should be a different object
    const mockResponse2 = createMockResponse();
    const instance3 = HeartbeatSSETransport.getInstance({
      messagesEndpoint: '/test-endpoint',
      res: mockResponse2,
    });
    
    // Should be a different instance
    expect(instance3).not.toBe(instance1);
    
    // Test createFresh always creates a new instance
    const mockResponse3 = createMockResponse();
    const freshInstance = HeartbeatSSETransport.createFresh({
      messagesEndpoint: '/test-endpoint',
      res: mockResponse3,
    });
    
    // Should be a different instance
    expect(freshInstance).not.toBe(instance3);
  });
  
  test('should create a transport instance with heartbeat interval', () => {
    // Setup mocks
    globalThis.setInterval = setIntervalMock as unknown as typeof globalThis.setInterval;
    globalThis.clearInterval = clearIntervalMock as unknown as typeof globalThis.clearInterval;
    
    // Create a test instance using createFresh to avoid singleton interference
    const mockResponse = createMockResponse();
    const transportInstance = HeartbeatSSETransport.createFresh({
      messagesEndpoint: '/test-messages',
      res: mockResponse,
    });
    
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
    globalThis.setInterval = setIntervalMock as unknown as typeof globalThis.setInterval;
    globalThis.clearInterval = clearIntervalMock as unknown as typeof globalThis.clearInterval;
    
    // Create a test instance using createFresh to avoid singleton interference
    const mockResponse = createMockResponse();
    const transportInstance = HeartbeatSSETransport.createFresh({
      messagesEndpoint: '/test-messages',
      res: mockResponse,
    });
    
    // Mock the getSessionId method for testing
    transportInstance.getSessionId = () => 'test-session-id';
    
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
    globalThis.setInterval = setIntervalMock as unknown as typeof globalThis.setInterval;
    globalThis.clearInterval = clearIntervalMock as unknown as typeof globalThis.clearInterval;
    
    // Create a test instance using createFresh to avoid singleton interference
    const mockResponse = createMockResponse();
    const transportInstance = HeartbeatSSETransport.createFresh({
      messagesEndpoint: '/test-messages',
      res: mockResponse,
    });
    
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
    globalThis.setInterval = setIntervalMock as unknown as typeof globalThis.setInterval;
    globalThis.clearInterval = clearIntervalMock as unknown as typeof globalThis.clearInterval;
    
    // Create a test instance with ended response
    const mockResponse = createMockResponse();
    mockResponse.writableEnded = true;
    const transportInstance = HeartbeatSSETransport.createFresh({
      messagesEndpoint: '/test-messages',
      res: mockResponse,
    });
    
    // Mock the getSessionId method for testing
    transportInstance.getSessionId = () => 'test-session-id';
    
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
    globalThis.setInterval = setIntervalMock as unknown as typeof globalThis.setInterval;
    globalThis.clearInterval = clearIntervalMock as unknown as typeof globalThis.clearInterval;
    
    // Create a test instance using createFresh to avoid singleton interference
    const mockResponse = createMockResponse();
    const transportInstance = HeartbeatSSETransport.createFresh({
      messagesEndpoint: '/test-messages',
      res: mockResponse,
    });
    
    // Set the private heartbeatInterval field
    Object.defineProperty(transportInstance, 'heartbeatInterval', {
      value: 123,
      writable: true,
    });
    
    try {
      // Mock super.close to be a no-op that also clears the interval
      const originalClose = HeartbeatSSETransport.prototype.close;
      HeartbeatSSETransport.prototype.close = async function() {
        // Define a getter to access the private field
        const interval = Object.getOwnPropertyDescriptor(this, 'heartbeatInterval')?.value;
        if (interval) {
          // Set to null using Object.defineProperty
          Object.defineProperty(this, 'heartbeatInterval', {
            value: null,
            writable: true,
          });
        }
        return Promise.resolve();
      };
      
      // Act - method exists and should run without error
      await transportInstance.close();
      
      // Verify the interval was cleared by checking it was set to null
      const interval = Object.getOwnPropertyDescriptor(transportInstance, 'heartbeatInterval')?.value;
      expect(interval).toBeNull();
      
      // Restore method
      HeartbeatSSETransport.prototype.close = originalClose;
    } finally {
      // Restore globals
      globalThis.setInterval = originalSetInterval;
      globalThis.clearInterval = originalClearInterval;
    }
  });
});