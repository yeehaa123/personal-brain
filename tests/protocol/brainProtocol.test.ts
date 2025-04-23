/**
 * Tests for the BrainProtocol class
 * 
 * Tests for the refactored BrainProtocol with proper mock dependencies
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import { BrainProtocol } from '@/protocol/brainProtocol';
import type { BrainProtocolDependencies } from '@/protocol/core/brainProtocol';
import type { QueryOptions } from '@/protocol/types';
import {
  MockConfigurationManager,
} from '@test/__mocks__/protocol/core/configurationManager';
import {
  MockContextOrchestrator,
} from '@test/__mocks__/protocol/core/contextOrchestrator';
import {
  MockFeatureCoordinator,
} from '@test/__mocks__/protocol/core/featureCoordinator';
import {
  MockMcpServerManager,
} from '@test/__mocks__/protocol/core/mcpServerManager';
import {
  MockStatusManager,
} from '@test/__mocks__/protocol/core/statusManager';
import { MockConversationManager } from '@test/__mocks__/protocol/managers/conversationManager';
import { MockContextIntegrator } from '@test/__mocks__/protocol/messaging/contextIntegrator';
import { MockContextMediator } from '@test/__mocks__/protocol/messaging/contextMediator';
import { MockQueryProcessor } from '@test/__mocks__/protocol/pipeline/queryProcessor';

// Add a debug check to see what's being imported
console.log('Imported BrainProtocol:', BrainProtocol);
console.log('BrainProtocol.resetInstance exists:', Boolean(BrainProtocol.resetInstance));

/**
 * Create a set of mock dependencies for BrainProtocol
 * 
 * @param overrides - Specific dependency class overrides
 * @returns A complete set of mock dependencies
 */
function createMockDependencies(
  overrides: Partial<BrainProtocolDependencies> = {},
): BrainProtocolDependencies {
  // Create a properly typed dependencies object
  // We need to use type assertions since the mock classes don't exactly match the expected types
  // but this is safer than using 'any'
  return {
    ConfigManager: MockConfigurationManager as unknown as BrainProtocolDependencies['ConfigManager'],
    ContextOrchestrator: MockContextOrchestrator as unknown as BrainProtocolDependencies['ContextOrchestrator'],
    ContextMediator: MockContextMediator as unknown as BrainProtocolDependencies['ContextMediator'],
    ContextIntegrator: MockContextIntegrator as unknown as BrainProtocolDependencies['ContextIntegrator'],
    McpServerManager: MockMcpServerManager as unknown as BrainProtocolDependencies['McpServerManager'],
    ConversationManager: MockConversationManager as unknown as BrainProtocolDependencies['ConversationManager'],
    StatusManager: MockStatusManager as unknown as BrainProtocolDependencies['StatusManager'],
    FeatureCoordinator: MockFeatureCoordinator as unknown as BrainProtocolDependencies['FeatureCoordinator'],
    QueryProcessor: MockQueryProcessor as unknown as BrainProtocolDependencies['QueryProcessor'],
    ...overrides,
  };
}

/**
 * Tests for the BrainProtocol class
 */
describe('BrainProtocol', () => {
  // Reset all the mock class instances before each test
  beforeEach(() => {
    resetMocks();
  });

  // Reset all the mock class instances after each test
  afterEach(() => {
    resetMocks();
  });

  test('getInstance should create a singleton instance', () => {
    // No need to get instances before to show that they're created
    // Just document it in comments

    // Create an instance with dependencies
    const instance1 = BrainProtocol.createFresh({}, createMockDependencies());

    // Check that it's the right type
    expect(instance1).toBeDefined();
    expect(typeof instance1.isReady).toBe('function');
    expect(typeof instance1.getContextManager).toBe('function');
    expect(typeof instance1.getConversationManager).toBe('function');
    expect(typeof instance1.getFeatureCoordinator).toBe('function');

    // Create a second instance with the same dependencies
    const instance2 = BrainProtocol.createFresh({}, createMockDependencies());

    // These should be different instances since we used createFresh
    expect(instance1).not.toBe(instance2);

    // But getInstance should return the same singleton instance
    const singleton1 = BrainProtocol.getInstance();
    const singleton2 = BrainProtocol.getInstance();

    expect(singleton1).toBe(singleton2);

    // And they should be different from our fresh instances
    expect(singleton1).not.toBe(instance1);
    expect(singleton1).not.toBe(instance2);
  });

  test('resetInstance should clear the singleton instance', () => {
    // Get an instance
    const instance1 = BrainProtocol.getInstance();

    // Reset
    BrainProtocol.resetInstance();

    // Get a new instance
    const instance2 = BrainProtocol.getInstance();

    // Should be different instances
    expect(instance1).not.toBe(instance2);
  });

  test('createFresh should create an instance without affecting the singleton', () => {
    // First, create a fresh instance
    const freshInstance = BrainProtocol.createFresh({}, createMockDependencies());

    // Then create a singleton instance
    const singleton = BrainProtocol.getInstance();

    // They should be different instances
    expect(freshInstance).not.toBe(singleton);

    // Getting the singleton again should return the same instance
    const singleton2 = BrainProtocol.getInstance();
    expect(singleton).toBe(singleton2);

    // Getting a fresh instance should return a new instance
    const freshInstance2 = BrainProtocol.createFresh({}, createMockDependencies());
    expect(freshInstance).not.toBe(freshInstance2);
  });

  test('isReady should return the status from StatusManager', () => {

    // Create a mock StatusManager that will return false for isReady
    const mockStatusManager = MockStatusManager.createFresh();

    // Use a more specific type assertion
    type StatusManagerWithOverride = typeof mockStatusManager & { isReady: () => boolean };
    (mockStatusManager as StatusManagerWithOverride).isReady = () => false;

    // Create the dependencies with our modified StatusManager
    const mockDeps = createMockDependencies({
      StatusManager: {
        getInstance: () => mockStatusManager,
      } as unknown as BrainProtocolDependencies['StatusManager'],
    });

    // Create a fresh instance with our explicit dependencies
    const brainProtocol = BrainProtocol.createFresh({}, mockDeps);

    // The ready state should be taken from the StatusManager
    expect(brainProtocol.isReady()).toBe(false);

    // Singleton should be unaffected by our mock StatusManager
    (mockStatusManager as StatusManagerWithOverride).isReady = () => true;
    expect(brainProtocol.isReady()).toBe(true);
  });

  test('initialize should call conversationManager.initializeConversation', async () => {
    // Create a fresh instance
    const brainProtocol = BrainProtocol.createFresh({}, createMockDependencies());

    // Initialize
    await brainProtocol.initialize();

    // Check that the conversation manager was initialized
    const conversationManager = MockConversationManager.getInstance();
    expect(conversationManager.initializeConversation).toHaveBeenCalled();
  });

  test('processQuery should call queryProcessor.processQuery', async () => {
    // First, test with a ready system
    // Set up MockQueryProcessor to customize response
    const testQueryProcessor = MockQueryProcessor.createFresh();
    testQueryProcessor.setCustomResponse({
      answer: 'Processed: test',
      citations: [],
      relatedNotes: [],
    });

    // Set up status manager in "ready" state
    const readyStatusManager = MockStatusManager.createFresh();
    readyStatusManager.setReady(true);

    // Create dependencies with custom status and processor
    const mockDepsReady = createMockDependencies({
      QueryProcessor: {
        getInstance: () => testQueryProcessor,
      } as unknown as BrainProtocolDependencies['QueryProcessor'],
      StatusManager: {
        getInstance: () => readyStatusManager,
      } as unknown as BrainProtocolDependencies['StatusManager'],
    });

    // Create brain protocol instance with ready system
    const brainProtocolReady = BrainProtocol.createFresh({}, mockDepsReady);

    // Should be able to process a query when ready
    const result = await brainProtocolReady.processQuery('test');
    expect(result.answer).toBe('Processed: test');

    // Now test with not-ready system
    // Set up a not-ready status manager
    const notReadyStatusManager = MockStatusManager.createFresh();
    notReadyStatusManager.setReady(false);

    // Set up a query processor that checks ready state
    const notReadyQueryProcessor = MockQueryProcessor.createFresh();
    // Override processQuery to check ready state
    const originalProcessQuery = notReadyQueryProcessor.processQuery;
    notReadyQueryProcessor.processQuery = async function(query: string, options?: QueryOptions) {
      if (!notReadyStatusManager.isReady()) {
        throw new Error('Cannot process query: system not ready');
      }
      return originalProcessQuery.call(this, query, options);
    };

    // Create dependencies with not-ready status and processor that checks status
    const mockDepsNotReady = createMockDependencies({
      StatusManager: {
        getInstance: () => notReadyStatusManager,
      } as unknown as BrainProtocolDependencies['StatusManager'],
      QueryProcessor: {
        getInstance: () => notReadyQueryProcessor,
      } as unknown as BrainProtocolDependencies['QueryProcessor'],
    });

    // Create brain protocol with not-ready status
    const brainProtocolNotReady = BrainProtocol.createFresh({}, mockDepsNotReady);

    // Should reject when processor checks ready state
    await expect(brainProtocolNotReady.processQuery('test')).rejects.toThrow('Cannot process query: system not ready');
  });

  test('processQuery should support custom options', async () => {
    // Set up MockQueryProcessor that handles custom options
    const customQueryProcessor = MockQueryProcessor.createFresh();

    // Override processQuery method to handle the custom option
    customQueryProcessor.processQuery = async (query: string, options?: QueryOptions) => {
      // Get includeContext from options or default to false
      const includeContext = Boolean(options && 'includeContext' in options && options.includeContext);

      return {
        answer: `Processed: ${query} (with context: ${includeContext ? 'yes' : 'no'})`,
        citations: [],
        relatedNotes: [],
      };
    };

    // Create mock dependencies with our custom query processor
    const mockDeps = createMockDependencies({
      QueryProcessor: {
        getInstance: () => customQueryProcessor,
      } as unknown as BrainProtocolDependencies['QueryProcessor'],
      ConversationManager: MockConversationManager as unknown as BrainProtocolDependencies['ConversationManager'],
    });

    // Create brain protocol instance with our custom dependencies
    const brainProtocol = BrainProtocol.createFresh({}, mockDeps);

    // Process a query without options
    const result1 = await brainProtocol.processQuery('test');
    expect(result1.answer).toBe('Processed: test (with context: no)');

    // Process a query with custom options
    // Note: We're using a type assertion here since we're testing with a mock
    // processor that accepts additional options beyond the standard interface
    const customOptions = { includeContext: true } as QueryOptions;
    const result2 = await brainProtocol.processQuery('test', customOptions);
    expect(result2.answer).toBe('Processed: test (with context: yes)');
  });
});

/**
 * Reset all mock classes used in the tests
 */
function resetMocks() {
  BrainProtocol.resetInstance();
  MockConfigurationManager.resetInstance();
  MockContextOrchestrator.resetInstance();
  MockMcpServerManager.resetInstance();
  MockConversationManager.resetInstance();
  MockStatusManager.resetInstance();
  MockFeatureCoordinator.resetInstance();
  MockQueryProcessor.resetInstance();
}
