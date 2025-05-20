import { beforeEach, describe, expect, test } from 'bun:test';
import { z } from 'zod';

import { BrainProtocol } from '@/protocol/brainProtocol';
import type { BrainProtocolDependencies } from '@/protocol/core/brainProtocol';
import type { ConfigurationManager } from '@/protocol/core/configurationManager';
import type { ContextOrchestrator } from '@/protocol/core/contextOrchestrator';
import type { FeatureCoordinator } from '@/protocol/core/featureCoordinator';
import type { McpServerManager } from '@/protocol/core/mcpServerManager';
import type { StatusManager } from '@/protocol/core/statusManager';
import type { ConversationManager } from '@/protocol/managers/conversationManager';
import type { ContextIntegrator } from '@/protocol/messaging/contextIntegrator';
import type { ContextMediator } from '@/protocol/messaging/contextMediator';
import type { QueryProcessor } from '@/protocol/pipeline/queryProcessor';
import { MockConfigurationManager } from '@test/__mocks__/protocol/core/configurationManager';
import { MockContextOrchestrator } from '@test/__mocks__/protocol/core/contextOrchestrator';
import { MockFeatureCoordinator } from '@test/__mocks__/protocol/core/featureCoordinator';
import { MockMcpServerManager } from '@test/__mocks__/protocol/core/mcpServerManager';
import { MockStatusManager } from '@test/__mocks__/protocol/core/statusManager';
import { MockConversationManager } from '@test/__mocks__/protocol/managers/conversationManager';
import { MockContextIntegrator } from '@test/__mocks__/protocol/messaging/contextIntegrator';
import { MockContextMediator } from '@test/__mocks__/protocol/messaging/contextMediator';
import { MockQueryProcessor } from '@test/__mocks__/protocol/pipeline/queryProcessor';

describe('BrainProtocol Behavior', () => {
  let brainProtocol: BrainProtocol;
  let mockQueryProcessor: MockQueryProcessor;
  let mockStatusManager: MockStatusManager;
  
  beforeEach(() => {
    // Reset all instances
    BrainProtocol.resetInstance();
    MockQueryProcessor.resetInstance();
    
    // Set up environment
    process.env['ANTHROPIC_API_KEY'] = 'test-key';
    process.env['OPENAI_API_KEY'] = 'test-key';
    
    // Create mock instances
    mockQueryProcessor = MockQueryProcessor.createFresh();
    mockStatusManager = MockStatusManager.createFresh();
    
    // Configure status manager to control ready state - starts not ready
    mockStatusManager.setReady(false);
    
    // Set up custom response for JS query
    mockQueryProcessor.setCustomResponse({
      answer: 'JavaScript is a programming language',
      citations: [],
      relatedNotes: [],
    });
    
    // Create dependencies with type casting to satisfy the type system
    const dependencies: BrainProtocolDependencies = {
      ConfigManager: MockConfigurationManager as unknown as typeof ConfigurationManager,
      ContextOrchestrator: MockContextOrchestrator as unknown as typeof ContextOrchestrator,
      ContextMediator: MockContextMediator as unknown as typeof ContextMediator,
      ContextIntegrator: MockContextIntegrator as unknown as typeof ContextIntegrator,
      McpServerManager: MockMcpServerManager as unknown as typeof McpServerManager,
      ConversationManager: MockConversationManager as unknown as typeof ConversationManager,
      StatusManager: MockStatusManager as unknown as typeof StatusManager,
      FeatureCoordinator: MockFeatureCoordinator as unknown as typeof FeatureCoordinator,
      QueryProcessor: MockQueryProcessor as unknown as typeof QueryProcessor,
    };
    
    // Create BrainProtocol with mocked dependencies
    brainProtocol = BrainProtocol.createFresh({}, dependencies);
  });
  
  test('brainProtocol reports ready after initialization', async () => {
    // Initialize the brain protocol
    await brainProtocol.initialize();
    
    // Check if it reports ready
    expect(brainProtocol.isReady()).toBe(true);
  });
  
  test('brainProtocol integration with standard mock', async () => {
    // Set system to ready state
    mockStatusManager.setReady(true);
    
    // The standard mock returns a known answer by default
    const result = await brainProtocol.processQuery('general query');
    
    // Verify we get the expected response from the standard mock
    expect(result.answer).toBe('Mock answer from QueryProcessor');
  });
  
  test('processes queries successfully after initialization', async () => {
    // Set system to ready state and initialize
    mockStatusManager.setReady(true);
    await brainProtocol.initialize();
    
    // Process a query 
    const result = await brainProtocol.processQuery('test query');
    
    // Verify we got a response (not testing specific content)
    expect(result).toBeDefined();
    expect(result.answer).toBeDefined();
    expect(typeof result.answer).toBe('string');
  });
  
  test('processes queries with schemas by using MockQueryProcessor for user data', async () => {
    // Set system to ready state
    mockStatusManager.setReady(true);
    await brainProtocol.initialize();
    
    // Define a schema that matches what our MockQueryProcessor returns for user data queries
    // See the if (_query.includes('user data')) block in MockQueryProcessor.processQuery
    const UserSchema = z.object({
      name: z.string(),
      email: z.string().email(),
      preferences: z.object({
        theme: z.string(),
        notifications: z.boolean(),
      }),
    });
    
    type User = z.infer<typeof UserSchema>;
    
    // Process with schema - our MockQueryProcessor is designed to respond to 'user data' queries
    // with structured data that should match UserSchema (see the mock implementation)
    const result = await brainProtocol.processQuery<User>(
      'user data',
      { schema: UserSchema },
    );
    
    // Test the behavior we expect from the mock
    expect(result.answer).toBe('Mock answer with structured user data');
    expect(result.object).toBeDefined();
    expect(result.object?.name).toBe('Mock User');
    expect(result.object?.email).toBe('mock@example.com');
    expect(result.object?.preferences.theme).toBe('light');
  });
  
  test('processes queries with options successfully', async () => {
    // Set system to ready state and initialize
    mockStatusManager.setReady(true);
    await brainProtocol.initialize();
    
    // Process with options
    const options = { userId: 'test-user', roomId: 'test-room' };
    const result = await brainProtocol.processQuery('test query', options);
    
    // Verify we got a valid response
    expect(result).toBeDefined();
    expect(result.answer).toBeDefined();
  });
});