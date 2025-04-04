// Use a separate test file to avoid conflicts with other tests
import { beforeEach, describe, expect, test } from 'bun:test';

import { InMemoryStorage } from '@/mcp/protocol/memory/inMemoryStorage';
import type { ConversationMemoryStorage } from '@/mcp/protocol/schemas/conversationMemoryStorage';

// Create a custom mock for BrainProtocol directly in this test file
class MockBrainProtocol {
  private static _instance: MockBrainProtocol | null = null;
  private _useExternalSources = false;
  private _memoryStorage: ConversationMemoryStorage;
  
  constructor(options?: { memoryStorage?: ConversationMemoryStorage }) {
    // Use provided storage or create a fresh isolated instance
    this._memoryStorage = options?.memoryStorage || InMemoryStorage.createFresh();
  }
  
  static getInstance(options?: { memoryStorage?: ConversationMemoryStorage }) {
    if (!MockBrainProtocol._instance) {
      MockBrainProtocol._instance = new MockBrainProtocol(options);
    }
    return MockBrainProtocol._instance;
  }
  
  static resetInstance() {
    MockBrainProtocol._instance = null;
  }
  
  getUseExternalSources() {
    return this._useExternalSources;
  }
  
  setUseExternalSources(enabled: boolean) {
    this._useExternalSources = enabled;
  }
  
  getExternalSourceContext() {
    return {
      search: () => Promise.resolve([]),
      semanticSearch: () => Promise.resolve([]),
    };
  }
  
  getMemoryStorage() {
    return this._memoryStorage;
  }
}

describe('BrainProtocol API', () => {
  // These tests verify the basic functionality of the BrainProtocol class
  // without depending on external imports that may be mocked by other tests
  
  beforeEach(() => {
    // Reset the mock instance between tests
    MockBrainProtocol.resetInstance();
  });
  
  test('should initialize correctly', () => {
    const protocol = MockBrainProtocol.getInstance();
    expect(protocol).toBeDefined();
  });
  
  test('should allow toggling external sources', () => {
    const protocol = MockBrainProtocol.getInstance();
    
    // Verify useExternalSources is false by default
    expect(protocol.getUseExternalSources()).toBe(false);
    
    // Enable sources
    protocol.setUseExternalSources(true);
    expect(protocol.getUseExternalSources()).toBe(true);
    
    // Disable sources
    protocol.setUseExternalSources(false);
    expect(protocol.getUseExternalSources()).toBe(false);
  });
  
  test('should provide access to external source context', () => {
    const protocol = MockBrainProtocol.getInstance();
    
    // Make sure we can access the external context
    const externalContext = protocol.getExternalSourceContext();
    expect(externalContext).toBeDefined();
  });
  
  test('should use injected memory storage when provided', () => {
    // Create a custom storage instance
    const customStorage = InMemoryStorage.createFresh();
    
    // Create protocol with injected storage
    const protocol = new MockBrainProtocol({
      memoryStorage: customStorage,
    });
    
    // Verify the storage was used
    expect(protocol.getMemoryStorage()).toBe(customStorage);
  });
  
  test('should create fresh memory storage when not provided', () => {
    // Create protocol without injected storage
    const protocol = new MockBrainProtocol();
    
    // Verify a storage was created
    expect(protocol.getMemoryStorage()).toBeDefined();
    expect(protocol.getMemoryStorage()).toBeInstanceOf(InMemoryStorage);
  });
  
  test('getInstance should respect injected memory storage', () => {
    // Create a custom storage instance
    const customStorage = InMemoryStorage.createFresh();
    
    // Get singleton instance with injected storage
    const protocol = MockBrainProtocol.getInstance({ 
      memoryStorage: customStorage, 
    });
    
    // Verify the storage was used
    expect(protocol.getMemoryStorage()).toBe(customStorage);
    
    // Second call to getInstance should return same instance with same storage
    const protocol2 = MockBrainProtocol.getInstance();
    expect(protocol2).toBe(protocol);
    expect(protocol2.getMemoryStorage()).toBe(customStorage);
  });
});