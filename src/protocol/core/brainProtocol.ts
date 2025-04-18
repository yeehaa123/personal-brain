/**
 * BrainProtocol Main Class
 * 
 * The central coordination point for the protocol layer that connects
 * all components of the personal brain system.
 * 
 * Core Responsibilities:
 * - Provide access to all contexts through ContextManager
 * - Manage conversations through ConversationManager
 * - Control system-wide features through FeatureCoordinator
 * - Process natural language queries through QueryProcessor
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { Logger } from '@/utils/logger';

import { BrainProtocolConfig } from '../config/brainProtocolConfig';
import { ConversationManager } from '../managers/conversationManager';
import { QueryProcessor } from '../pipeline/queryProcessor';
import type {
  BrainProtocolOptions,
  IBrainProtocol,
  IContextManager,
  IConversationManager,
  QueryOptions,
  QueryResult,
} from '../types';

import { ConfigurationManager } from './configurationManager';
import { ContextOrchestrator } from './contextOrchestrator';
import { FeatureCoordinator } from './featureCoordinator';
import { McpServerManager } from './mcpServerManager';
import { StatusManager } from './statusManager';

/**
 * Dependency classes for BrainProtocol
 * Allows overriding which classes to use without changing the instantiation logic
 */
export interface BrainProtocolDependencies {
  ConfigManager: typeof ConfigurationManager;
  ContextOrchestrator: typeof ContextOrchestrator;
  McpServerManager: typeof McpServerManager;
  ConversationManager: typeof ConversationManager;
  StatusManager: typeof StatusManager;
  FeatureCoordinator: typeof FeatureCoordinator;
  QueryProcessor: typeof QueryProcessor;
}

/**
 * Default dependency classes for BrainProtocol
 * Makes constructor parameter optional while still providing proper defaults
 */
const defaultDependencies: BrainProtocolDependencies = {
  ConfigManager: ConfigurationManager,
  ContextOrchestrator: ContextOrchestrator,
  McpServerManager: McpServerManager,
  ConversationManager: ConversationManager,
  StatusManager: StatusManager,
  FeatureCoordinator: FeatureCoordinator,
  QueryProcessor: QueryProcessor,
};

/**
 * Main BrainProtocol class that coordinates protocol components
 * 
 * This is the central class of the personal-brain application, providing a unified
 * interface for the protocol layer. It delegates specialized concerns to a small set
 * of essential components.
 */

export class BrainProtocol implements IBrainProtocol {
  // Essential components only
  private configManager: ConfigurationManager;
  private contextOrchestrator: ContextOrchestrator;
  private featureCoordinator: FeatureCoordinator;
  private conversationManager: ConversationManager;
  private statusManager: StatusManager;
  private mcpServerManager: McpServerManager;
  private queryProcessor: QueryProcessor;

  // Singleton instance - but completely separate from dependencies
  private static instance: BrainProtocol | null = null;

  // Logger instance
  private logger = Logger.getInstance();

  /**
   * Get the singleton instance of BrainProtocol
   * 
   * @param options - Configuration options (only used when creating a new instance)
   * @param dependencies - Optional dependency classes to use (only used when creating a new instance)
   * @returns The singleton instance
   */
  public static getInstance(
    options?: BrainProtocolOptions,
    dependencies: BrainProtocolDependencies = defaultDependencies,
  ): BrainProtocol {
    if (!BrainProtocol.instance) {
      // Create a new instance with the provided dependencies
      BrainProtocol.instance = new BrainProtocol(options || {}, dependencies);
      const logger = Logger.getInstance();
      logger.debug('BrainProtocol singleton instance created');
    } else if (options || (dependencies !== defaultDependencies)) {
      // Log a warning if trying to get instance with different config
      const logger = Logger.getInstance();
      logger.warn('getInstance called with config but instance already exists. Config ignored.');
    }

    return BrainProtocol.instance;
  }

  /**
   * Reset the singleton instance only
   * 
   * This resets only the BrainProtocol instance itself, not its dependencies.
   * This is important for maintaining proper dependency injection - the control
   * of dependency lifecycle should be outside of BrainProtocol.
   * 
   * Tests should explicitly create instances with the dependencies they need.
   */
  public static resetInstance(): void {
    const logger = Logger.getInstance();
    
    // Only reset the BrainProtocol instance - proper DI means we don't touch dependencies
    if (BrainProtocol.instance) {
      BrainProtocol.instance = null;
      logger.debug('BrainProtocol singleton instance reset');
    }
  }

  /**
   * Create a fresh instance that is not the singleton
   * This method is primarily used for testing to create isolated instances
   * 
   * @param options - Configuration options
   * @param dependencies - Alternative classes to use for dependencies
   * @returns A new BrainProtocol instance
   */
  public static createFresh(
    options?: BrainProtocolOptions,
    dependencies: BrainProtocolDependencies = defaultDependencies,
  ): BrainProtocol {
    const logger = Logger.getInstance();
    logger.debug('Creating fresh BrainProtocol instance');

    return new BrainProtocol(options || {}, dependencies);
  }

  /**
   * Constructor with class-based dependency injection
   * Takes complete class dependencies for instantiating all components
   * 
   * @param options - Configuration options
   * @param dependencies - Alternative classes to use for dependencies
   */
  constructor(
    options: BrainProtocolOptions = {},
    dependencies: BrainProtocolDependencies = defaultDependencies,
  ) {
    // Destructure all dependencies to ensure we catch any missing ones
    const {
      ConfigManager,
      ContextOrchestrator,
      McpServerManager,
      ConversationManager,
      StatusManager,
      FeatureCoordinator,
      QueryProcessor,
    } = dependencies;
    try {
      // Initialize configuration
      const config = new BrainProtocolConfig(options);

      // Initialize components using the specified classes
      this.configManager = ConfigManager.getInstance({ config });
      this.contextOrchestrator = ContextOrchestrator.getInstance({ config });

      // Ensure contexts are ready before proceeding
      if (!this.contextOrchestrator.areContextsReady()) {
        throw new Error('Context orchestration failed: contexts not ready');
      }

      this.mcpServerManager = McpServerManager.getInstance({
        contextOrchestrator: this.contextOrchestrator,
        configManager: this.configManager,
      });

      this.conversationManager = ConversationManager.getInstance({ config });

      this.statusManager = StatusManager.getInstance({
        contextOrchestrator: this.contextOrchestrator,
        conversationManager: this.conversationManager,
        mcpServer: this.mcpServerManager.getMcpServer(),
        externalSourcesEnabled: this.configManager.getUseExternalSources(),
      });

      this.featureCoordinator = FeatureCoordinator.getInstance({
        configManager: this.configManager,
        contextOrchestrator: this.contextOrchestrator,
        statusManager: this.statusManager,
      });

      this.queryProcessor = QueryProcessor.getInstance({
        contextManager: this.contextOrchestrator.getContextManager(),
        conversationManager: this.conversationManager,
        apiKey: this.configManager.getApiKey(),
      });

      this.logger.info(`Brain protocol initialized with external sources ${this.configManager.getUseExternalSources() ? 'enabled' : 'disabled'}`);
      this.logger.info(`Using interface type: ${this.configManager.getInterfaceType()}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to initialize BrainProtocol: ${errorMessage}`);
      throw new Error(`BrainProtocol initialization failed: ${errorMessage}`);
    }
  }

  // PUBLIC API METHODS

  /**
   * Primary access point for contexts (notes, profiles, conversations, etc.)
   * @returns ContextManager instance
   */
  getContextManager(): IContextManager {
    return this.contextOrchestrator.getContextManager();
  }

  /**
   * Get the conversation manager for conversation access and state management
   * @returns ConversationManager instance
   */
  getConversationManager(): IConversationManager {
    return this.conversationManager;
  }

  /**
   * Get the feature coordinator for managing system-wide features
   * @returns FeatureCoordinator instance
   */
  getFeatureCoordinator(): FeatureCoordinator {
    return this.featureCoordinator;
  }

  /**
   * Get the configuration manager for API settings
   * Generally use FeatureCoordinator instead for feature flags
   * 
   * @returns ConfigurationManager instance
   */
  getConfigManager(): ConfigurationManager {
    return this.configManager;
  }

  /**
   * Get the MCP server instance
   * @returns MCP server instance
   * @throws If MCP server is not available
   */
  getMcpServer(): McpServer {
    const server = this.mcpServerManager.getMcpServer();
    if (!server) {
      throw new Error('MCP server not available');
    }
    return server;
  }

  /**
   * Check if all components of the BrainProtocol are ready
   * @returns Whether all components are ready
   */
  isReady(): boolean {
    return this.statusManager.isReady();
  }

  /**
   * Initialize all asynchronous components of the BrainProtocol
   * This must be called after construction and before using other methods
   * @returns Promise that resolves when initialization is complete
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing BrainProtocol components...');

      // Initialize conversation by ensuring there's at least one active conversation
      if (!this.conversationManager.hasActiveConversation()) {
        this.logger.info('Initializing conversation...');
        await this.conversationManager.initializeConversation();

        if (!this.conversationManager.hasActiveConversation()) {
          throw new Error('Failed to initialize conversation');
        }

        this.logger.info('Conversation initialization complete');
      }

      this.logger.info('BrainProtocol initialization complete');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to complete async initialization: ${errorMessage}`);
      throw new Error(`BrainProtocol async initialization failed: ${errorMessage}`);
    }
  }

  /**
   * Process a query through the full pipeline
   * @param query User query
   * @param options Query options
   * @returns Query result
   */
  async processQuery(query: string, options?: QueryOptions): Promise<QueryResult> {
    // Check that the system is ready
    if (!this.isReady()) {
      throw new Error('Cannot process query: system not ready');
    }

    return await this.queryProcessor.processQuery(query, options);
  }
}
