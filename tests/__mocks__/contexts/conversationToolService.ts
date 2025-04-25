/**
 * MockConversationToolService
 * 
 * Standard mock for ConversationToolService that follows the Component Interface Standardization pattern
 * 
 * Implements:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 * - createWithDependencies(): Creates a new instance with explicit dependencies
 */

import { mock } from 'bun:test';
import { z } from 'zod';

import type { ResourceDefinition } from '@/contexts/contextInterface';
import type { ConversationToolServiceConfig } from '@/contexts/conversations/tools/conversationTools';

/**
 * Mock implementation of ConversationToolService
 */
export class MockConversationToolService {
  private static instance: MockConversationToolService | null = null;
  
  /** Config values for the mock instance */
  // Used in real implementation to configure tool behavior
  private readonly config: ConversationToolServiceConfig;
  
  /**
   * Get singleton instance
   * 
   * @param config Optional configuration
   * @returns The shared MockConversationToolService instance
   */
  public static getInstance(config?: ConversationToolServiceConfig): MockConversationToolService {
    if (!MockConversationToolService.instance) {
      MockConversationToolService.instance = new MockConversationToolService(config);
    } else if (config) {
      // In actual implementation this would log a warning
      // No need to log in mock since this is expected test behavior
    }
    return MockConversationToolService.instance;
  }
  
  /**
   * Reset singleton instance
   */
  public static resetInstance(): void {
    MockConversationToolService.instance = null;
  }
  
  /**
   * Create fresh instance for testing
   * 
   * @param config Optional configuration
   * @returns A new MockConversationToolService instance
   */
  public static createFresh(config?: ConversationToolServiceConfig): MockConversationToolService {
    return new MockConversationToolService(config);
  }
  
  /**
   * Create a new instance with explicit dependencies
   * 
   * @param config Configuration options
   * @param dependencies External dependencies
   * @returns A new MockConversationToolService instance
   */
  public static createWithDependencies(
    config: Record<string, unknown> = {},
    _dependencies: Record<string, unknown> = {},
  ): MockConversationToolService {
    // Convert config to typed config
    const toolServiceConfig: ConversationToolServiceConfig = {
      includeMetadata: config['includeMetadata'] as boolean,
      includeTimestamps: config['includeTimestamps'] as boolean,
      includeSummaries: config['includeSummaries'] as boolean,
      defaultFormat: config['defaultFormat'] as 'text' | 'markdown' | 'json' | 'html',
    };
    
    return new MockConversationToolService(toolServiceConfig);
  }
  
  /**
   * Private constructor to enforce factory methods
   * 
   * @param config Optional configuration
   * @param dependencies Optional dependencies
   */
  private constructor(
    config?: ConversationToolServiceConfig,
    _dependencies?: Record<string, unknown>,
  ) {
    this.config = {
      includeMetadata: config?.includeMetadata ?? false,
      includeTimestamps: config?.includeTimestamps ?? true,
      includeSummaries: config?.includeSummaries ?? false,
      defaultFormat: config?.defaultFormat ?? 'markdown',
    };
  }
  
  // Mock methods with default implementations
  public getTools = mock((_context: unknown) => {
    // Use the config to determine if we should include additional tools
    const tools = [
      {
        protocol: 'conversations',
        path: 'create_conversation',
        name: 'create_conversation',
        description: 'Creates a new conversation',
        handler: mock(() => Promise.resolve({ conversationId: 'conv-123' })),
      },
      {
        protocol: 'conversations',
        path: 'add_turn',
        name: 'add_turn',
        description: 'Adds a turn to a conversation',
        handler: mock(() => Promise.resolve({ turnId: 'turn-123' })),
      },
      {
        protocol: 'conversations',
        path: 'get_conversation_history',
        name: 'get_conversation_history',
        description: 'Retrieves formatted conversation history',
        handler: mock(() => Promise.resolve({ 
          history: `Mock conversation history (format: ${this.config.defaultFormat})`,
          includeMetadata: this.config.includeMetadata,
          includeTimestamps: this.config.includeTimestamps,
          includeSummaries: this.config.includeSummaries,
        })),
      },
    ] as ResourceDefinition[];
    
    return tools;
  });
  
  public getToolSchema = mock((tool: { name?: string }) => {
    // Use config to modify default schema values based on configuration
    const defaultFormat = this.config.defaultFormat || 'markdown';
    
    switch (tool.name) {
    case 'create_conversation':
      return {
        interfaceType: z.enum(['cli', 'matrix']).describe('Interface type of the conversation'),
        roomId: z.string().describe('Room ID for the conversation'),
      };
      
    case 'add_turn':
      return {
        conversationId: z.string().describe('ID of the conversation'),
        query: z.string().min(1).describe('User query'),
        response: z.string().optional().describe('Assistant response'),
        userId: z.string().optional().describe('User ID (optional)'),
        userName: z.string().optional().describe('User name (optional)'),
        metadata: z.record(z.unknown()).optional().describe('Additional metadata (optional)'),
      };
      
    case 'get_conversation_history':
      return {
        conversationId: z.string().describe('ID of the conversation'),
        format: z.enum(['text', 'markdown', 'json', 'html']).default(defaultFormat).optional()
          .describe('Format of the output'),
        maxTurns: z.number().optional().describe('Maximum number of turns to include'),
      };
      
    case 'export_conversation':
      return {
        conversationId: z.string().describe('ID of the conversation to export'),
        format: z.enum(['text', 'markdown', 'json', 'html']).default(defaultFormat).optional()
          .describe('Export format'),
        includeMetadata: z.boolean().default(this.config.includeMetadata ?? false).optional()
          .describe('Whether to include metadata'),
        includeTimestamps: z.boolean().default(this.config.includeTimestamps ?? true).optional()
          .describe('Whether to include timestamps'),
        includeSummaries: z.boolean().default(this.config.includeSummaries ?? false).optional()
          .describe('Whether to include summaries'),
      };
      
    default:
      return {};
    }
  });
}