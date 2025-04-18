/**
 * Tests for the BrainProtocolIntegrated class
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import { 
  BrainProtocolIntegrated, 
  type BrainProtocolIntegratedDependencies,
} from '@/protocol/core/brainProtocolIntegrated';
import { MockConfigurationManager } from '@test/__mocks__/protocol/core/configurationManager';
import { MockContextOrchestrator } from '@test/__mocks__/protocol/core/contextOrchestrator';
import { MockContextOrchestratorExtended } from '@test/__mocks__/protocol/core/contextOrchestratorExtended';
import { MockFeatureCoordinator } from '@test/__mocks__/protocol/core/featureCoordinator';
import { MockMcpServerManager } from '@test/__mocks__/protocol/core/mcpServerManager';
import { MockStatusManager } from '@test/__mocks__/protocol/core/statusManager';
import { MockConversationManager } from '@test/__mocks__/protocol/managers/conversationManager';
import { MockContextIntegrator } from '@test/__mocks__/protocol/messaging/contextIntegrator';
import { MockContextMediator } from '@test/__mocks__/protocol/messaging/contextMediator';
import { MockQueryProcessor } from '@test/__mocks__/protocol/pipeline/queryProcessor';

describe('BrainProtocolIntegrated', () => {
  // Reset all singleton instances before each test
  beforeEach(() => {
    BrainProtocolIntegrated.resetInstance();
    MockConfigurationManager.resetInstance();
    MockContextOrchestrator.resetInstance();
    MockContextOrchestratorExtended.resetInstance();
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
    BrainProtocolIntegrated.resetInstance();
    MockConfigurationManager.resetInstance();
    MockContextOrchestrator.resetInstance();
    MockContextOrchestratorExtended.resetInstance();
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
      ContextOrchestratorExtended: MockContextOrchestratorExtended,
      ContextMediator: MockContextMediator,
      ContextIntegrator: MockContextIntegrator,
      McpServerManager: MockMcpServerManager,
      ConversationManager: MockConversationManager,
      StatusManager: MockStatusManager,
      FeatureCoordinator: MockFeatureCoordinator,
      QueryProcessor: MockQueryProcessor,
    } as unknown as BrainProtocolIntegratedDependencies;

    // Should not throw errors when initialized with dependencies
    const brainProtocol = BrainProtocolIntegrated.createFresh({}, mockDependencies);
    
    // Basic verification that we have an object
    expect(brainProtocol).toBeDefined();
    expect(typeof brainProtocol.isReady).toBe('function');
  });
});