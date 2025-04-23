/**
 * Mock BrainProtocol for testing
 * 
 * Follows the Component Interface Standardization pattern with
 * getInstance(), resetInstance(), and createFresh()
 * 
 * This is a mock of BrainProtocol, which has replaced BrainProtocol.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { BrainProtocolOptions, IContextManager, IConversationManager, QueryOptions, QueryResult } from '@/protocol/types';
import { Logger } from '@/utils/logger';
import { createMockMcpServer } from '@test/__mocks__/core/MockMcpServer';

import type { MockConfigurationManager } from './core/configurationManager';
import { MockConfigurationManager as ConfigManager } from './core/configurationManager';
import type { MockFeatureCoordinator } from './core/featureCoordinator';
import { MockFeatureCoordinator as FeatureCoord } from './core/featureCoordinator';
import { MockMcpServerManager } from './core/mcpServerManager';
import { MockContextManager } from './managers/contextManager';
import { MockConversationManager } from './managers/conversationManager';

/**
 * Options for configuring MockBrainProtocol behavior
 */
export interface MockBrainProtocolOptions extends BrainProtocolOptions {
  /**
   * Custom response for processQuery method
   */
  customQueryResponse?: QueryResult;
}

/**
 * Mock implementation of BrainProtocol
 * 
 * Follows the simplified BrainProtocol architecture:
 * - Provides access to essential managers (ContextManager, ConversationManager, etc.)
 * - Includes standard Component Interface Standardization pattern methods
 * - Returns mock data for query processing
 */

export class MockBrainProtocol {
  private static instance: MockBrainProtocol | null = null;
  private contextManager: IContextManager;
  private conversationManager: IConversationManager;
  private featureCoordinator: MockFeatureCoordinator;
  private configManager: MockConfigurationManager;
  private mcpServerManager: MockMcpServerManager;
  private mcpServer: McpServer;
  private options: MockBrainProtocolOptions = {};
  private logger = Logger.getInstance();

  /**
   * Get the singleton instance
   */
  static getInstance(options?: MockBrainProtocolOptions): MockBrainProtocol {
    if (!MockBrainProtocol.instance) {
      MockBrainProtocol.instance = new MockBrainProtocol(options);
    } else if (options) {
      MockBrainProtocol.instance.setOptions(options);
    }
    return MockBrainProtocol.instance;
  }

  /**
   * Reset the singleton instance only
   * 
   * This resets only the BrainProtocol instance itself, not its dependencies.
   * This is important for maintaining proper dependency injection - the control
   * of dependency lifecycle should be outside of BrainProtocol.
   * 
   * This perfectly matches the behavior of the real BrainProtocol.resetInstance()
   */
  static resetInstance(): void {
    const logger = Logger.getInstance();
    
    // Only reset the BrainProtocol instance - proper DI means we don't touch dependencies
    if (MockBrainProtocol.instance) {
      MockBrainProtocol.instance = null;
      logger.debug('MockBrainProtocol singleton instance reset');
    }
  }

  /**
   * Create a fresh instance
   */
  static createFresh(options?: MockBrainProtocolOptions): MockBrainProtocol {
    return new MockBrainProtocol(options);
  }

  /**
   * Private constructor to enforce the use of getInstance() or createFresh()
   */
  private constructor(options?: MockBrainProtocolOptions) {
    // Create mock managers
    this.contextManager = MockContextManager.createFresh() as unknown as IContextManager;
    this.conversationManager = MockConversationManager.createFresh() as unknown as IConversationManager;
    this.featureCoordinator = FeatureCoord.createFresh();
    this.configManager = ConfigManager.createFresh();
    this.mcpServerManager = MockMcpServerManager.createFresh();
    
    // Create MCP server using our standardized mock
    this.mcpServer = createMockMcpServer('TestMcpServer', '1.0.0');
    
    // Store options
    if (options) {
      this.options = { ...options };
    }
  }

  /**
   * Set custom options for this mock instance
   */
  setOptions(options: MockBrainProtocolOptions): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get the context manager
   * Primary access point for all contexts (notes, profiles, etc.)
   */
  getContextManager(): IContextManager {
    return this.contextManager;
  }

  /**
   * Get the conversation manager
   */
  getConversationManager(): IConversationManager {
    return this.conversationManager;
  }

  /**
   * Get the feature coordinator
   */
  getFeatureCoordinator(): MockFeatureCoordinator {
    return this.featureCoordinator;
  }

  /**
   * Get the configuration manager
   */
  getConfigManager(): MockConfigurationManager {
    return this.configManager;
  }
  
  /**
   * Get the MCP server
   * Returns our standardized mock MCP server
   */
  getMcpServer(): McpServer {
    return this.mcpServer;
  }

  /**
   * Get the MCP server manager
   * Returns our mock MCP server manager
   */
  getMcpServerManager(): MockMcpServerManager {
    return this.mcpServerManager;
  }

  /**
   * Check if MCP server is available
   */
  hasMcpServer(): boolean {
    return true;
  }

  /**
   * Check if all components are ready
   */
  isReady(): boolean {
    return true;
  }

  /**
   * Initialize all asynchronous components
   */
  async initialize(): Promise<void> {
    this.logger.info('Mock BrainProtocol initialized');
  }

  /**
   * Process a query
   * Returns mock query result
   */
  async processQuery(_query: string, _options?: QueryOptions): Promise<QueryResult> {
    // If we have a custom response configured, use it
    if (this.options.customQueryResponse) {
      return { ...this.options.customQueryResponse };
    }
    
    // Otherwise use the default mock response
    return {
      answer: 'Mock answer from BrainProtocol',
      citations: [],
      relatedNotes: [],
    };
  }
}