/**
 * Mock BrainProtocol for testing
 * 
 * Follows the Component Interface Standardization pattern with
 * getInstance(), resetInstance(), and createFresh()
 */

import type { BrainProtocolOptions, IContextManager, IConversationManager, QueryOptions, QueryResult } from '@/protocol/types';
import { Logger } from '@/utils/logger';

import type { MockConfigurationManager } from './core/configurationManager';
import { MockConfigurationManager as ConfigManager } from './core/configurationManager';
import type { MockFeatureCoordinator } from './core/featureCoordinator';
import { MockFeatureCoordinator as FeatureCoord } from './core/featureCoordinator';
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
   * Reset the singleton instance
   * Also resets all component singletons to ensure a clean state
   */
  static resetInstance(): void {
    // Reset all specialized component singletons
    MockContextManager.resetInstance();
    MockConversationManager.resetInstance();
    ConfigManager.resetInstance();
    FeatureCoord.resetInstance();
    
    // Reset the BrainProtocol instance itself
    MockBrainProtocol.instance = null;
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