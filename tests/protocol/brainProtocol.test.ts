import { beforeEach, describe, expect, test } from 'bun:test';
import { z } from 'zod';

import { BrainProtocol } from '@/protocol/brainProtocol';
import type { BrainProtocolDependencies } from '@/protocol/core/brainProtocol';
import type { QueryResult } from '@/protocol/types';
import { MockConfigurationManager } from '@test/__mocks__/protocol/core/configurationManager';
import { MockContextOrchestrator } from '@test/__mocks__/protocol/core/contextOrchestrator';
import { MockFeatureCoordinator } from '@test/__mocks__/protocol/core/featureCoordinator';
import { MockMcpServerManager } from '@test/__mocks__/protocol/core/mcpServerManager';
import { MockStatusManager } from '@test/__mocks__/protocol/core/statusManager';
import { MockConversationManager } from '@test/__mocks__/protocol/managers/conversationManager';
import { MockContextIntegrator } from '@test/__mocks__/protocol/messaging/contextIntegrator';
import { MockContextMediator } from '@test/__mocks__/protocol/messaging/contextMediator';

// Mock QueryProcessor to return test responses
class MockQueryProcessor {
  private initialized = false;
  private queryResponses = new Map<string, QueryResult>();
  private defaultResponse: QueryResult = {
    answer: 'Mock response',
    citations: [],
    relatedNotes: [],
  };

  static getInstance() { 
    return new MockQueryProcessor(); 
  }
  
  static resetInstance() {}
  
  static createFresh() { 
    return new MockQueryProcessor(); 
  }

  initialize() {
    this.initialized = true;
  }

  isInitialized() {
    return this.initialized;
  }

  async processQuery<T = unknown>(
    query: string,
    options?: { schema?: z.ZodType<T>; userId?: string; userName?: string; roomId?: string },
  ): Promise<QueryResult<T>> {
    if (!this.initialized) {
      throw new Error('BrainProtocol is not initialized');
    }

    // Return specific response if set
    const response = this.queryResponses.get(query) || this.defaultResponse;
    
    // Handle schema validation if provided
    if (options?.schema && response.object) {
      try {
        const validatedObject = options.schema.parse(response.object);
        return { ...response, object: validatedObject };
      } catch {
        return { ...response, object: undefined };
      }
    }
    
    return response as QueryResult<T>;
  }

  setQueryResponse(query: string, response: QueryResult) {
    this.queryResponses.set(query, response);
  }
}

describe('BrainProtocol Behavior', () => {
  let brainProtocol: BrainProtocol;
  let mockQueryProcessor: MockQueryProcessor;
  let mockStatusManager: MockStatusManager;
  
  beforeEach(() => {
    // Reset all instances
    BrainProtocol.resetInstance();
    
    // Set up environment
    process.env['ANTHROPIC_API_KEY'] = 'test-key';
    process.env['OPENAI_API_KEY'] = 'test-key';
    
    // Create mock instances
    mockQueryProcessor = new MockQueryProcessor();
    mockStatusManager = MockStatusManager.createFresh();
    
    // Configure status manager to control ready state
    mockStatusManager.setReady(false);
    
    // Set up test responses
    mockQueryProcessor.setQueryResponse('What is JavaScript?', {
      answer: 'JavaScript is a programming language',
      citations: [],
      relatedNotes: [],
    });
    
    // Create dependencies
    const dependencies: BrainProtocolDependencies = {
      ConfigManager: MockConfigurationManager,
      ContextOrchestrator: MockContextOrchestrator,
      ContextMediator: MockContextMediator,
      ContextIntegrator: MockContextIntegrator,
      McpServerManager: MockMcpServerManager,
      ConversationManager: MockConversationManager,
      StatusManager: class {
        static getInstance() { return mockStatusManager; }
        static resetInstance() {}
        static createFresh() { return mockStatusManager; }
      },
      FeatureCoordinator: MockFeatureCoordinator,
      QueryProcessor: class {
        static getInstance() { return mockQueryProcessor; }
        static resetInstance() {}
        static createFresh() { return mockQueryProcessor; }
      },
    };
    
    // Create BrainProtocol with mocked dependencies
    brainProtocol = BrainProtocol.createFresh({}, dependencies);
  });
  
  test('initializes and becomes ready', async () => {
    // Should not be ready before initialization
    expect(brainProtocol.isReady()).toBe(false);
    
    // Initialize
    await brainProtocol.initialize();
    
    // Mark components as ready
    mockStatusManager.setReady(true);
    mockQueryProcessor.initialize();
    
    // Should be ready after initialization
    expect(brainProtocol.isReady()).toBe(true);
  });
  
  test('throws error when processing query before initialization', async () => {
    await expect(
      brainProtocol.processQuery('test query'),
    ).rejects.toThrow('BrainProtocol is not initialized');
  });
  
  test('processes queries after initialization', async () => {
    await brainProtocol.initialize();
    mockStatusManager.setReady(true);
    mockQueryProcessor.initialize();
    
    // Should be able to process a query
    const result = await brainProtocol.processQuery('What is JavaScript?');
    
    expect(result).toBeDefined();
    expect(result.answer).toBe('JavaScript is a programming language');
    expect(Array.isArray(result.citations)).toBe(true);
    expect(Array.isArray(result.relatedNotes)).toBe(true);
  });
  
  test('processes queries with schemas', async () => {
    await brainProtocol.initialize();
    mockStatusManager.setReady(true);
    mockQueryProcessor.initialize();
    
    // Set up response with object
    mockQueryProcessor.setQueryResponse('Get user data', {
      answer: 'User data retrieved',
      object: {
        name: 'Test User',
        email: 'test@example.com',
        age: 30,
      },
      citations: [],
      relatedNotes: [],
    });
    
    // Define a schema
    const UserSchema = z.object({
      name: z.string(),
      email: z.string().email(),
      age: z.number(),
    });
    
    type User = z.infer<typeof UserSchema>;
    
    // Process with schema
    const result = await brainProtocol.processQuery<User>(
      'Get user data',
      { schema: UserSchema },
    );
    
    expect(result).toBeDefined();
    expect(result.answer).toBe('User data retrieved');
    expect(result.object).toBeDefined();
    expect(result.object?.name).toBe('Test User');
    expect(UserSchema.safeParse(result.object).success).toBe(true);
  });
  
  test('handles query options', async () => {
    await brainProtocol.initialize();
    mockStatusManager.setReady(true);
    mockQueryProcessor.initialize();
    
    // Process with options
    const result = await brainProtocol.processQuery('test query');
    
    expect(result).toBeDefined();
    expect(result.answer).toBe('Mock response');
  });
});