/**
 * Tests for the BrainProtocol class
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import { 
  BrainProtocol, 
  type BrainProtocolDependencies,
} from '@/protocol/core/brainProtocol';
import { MockConfigurationManager } from '@test/__mocks__/protocol/core/configurationManager';
import { MockContextOrchestrator } from '@test/__mocks__/protocol/core/contextOrchestrator';
import { MockFeatureCoordinator } from '@test/__mocks__/protocol/core/featureCoordinator';
import { MockMcpServerManager } from '@test/__mocks__/protocol/core/mcpServerManager';
import { MockStatusManager } from '@test/__mocks__/protocol/core/statusManager';
import { MockConversationManager } from '@test/__mocks__/protocol/managers/conversationManager';
import { MockContextIntegrator } from '@test/__mocks__/protocol/messaging/contextIntegrator';
import { MockContextMediator } from '@test/__mocks__/protocol/messaging/contextMediator';
import { MockQueryProcessor } from '@test/__mocks__/protocol/pipeline/queryProcessor';

describe('BrainProtocol', () => {
  // Reset all singleton instances before each test
  beforeEach(() => {
    BrainProtocol.resetInstance();
    MockConfigurationManager.resetInstance();
    MockContextOrchestrator.resetInstance();
    MockContextMediator.resetInstance();
    MockContextIntegrator.resetInstance();
    MockMcpServerManager.resetInstance();
    MockConversationManager.resetInstance();
    MockStatusManager.resetInstance();
    MockFeatureCoordinator.resetInstance();
    MockQueryProcessor.resetInstance();
  });
  
  // Reset after each test to clean up
  afterEach(() => {
    BrainProtocol.resetInstance();
    MockConfigurationManager.resetInstance();
    MockContextOrchestrator.resetInstance();
    MockContextMediator.resetInstance();
    MockContextIntegrator.resetInstance();
    MockMcpServerManager.resetInstance();
    MockConversationManager.resetInstance();
    MockStatusManager.resetInstance();
    MockFeatureCoordinator.resetInstance();
    MockQueryProcessor.resetInstance();
  });
  
  test('should initialize with proper dependencies', () => {
    // Create standardized mock dependencies
    const mockDependencies = {
      ConfigManager: MockConfigurationManager,
      ContextOrchestrator: MockContextOrchestrator,
      ContextMediator: MockContextMediator,
      ContextIntegrator: MockContextIntegrator,
      McpServerManager: MockMcpServerManager,
      ConversationManager: MockConversationManager,
      StatusManager: MockStatusManager,
      FeatureCoordinator: MockFeatureCoordinator,
      QueryProcessor: MockQueryProcessor,
    } as unknown as BrainProtocolDependencies;

    // Should not throw errors when initialized with dependencies
    const brainProtocol = BrainProtocol.createFresh({}, mockDependencies);
    
    // Basic verification that we have an object
    expect(brainProtocol).toBeDefined();
    expect(typeof brainProtocol.isReady).toBe('function');
  });
});