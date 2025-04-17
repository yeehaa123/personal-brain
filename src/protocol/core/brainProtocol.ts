/**
 * BrainProtocol Main Class
 * Coordinates protocol-level communication and integration between components
 * 
 * Acts as the main entry point for the protocol layer, handling high-level 
 * protocol concerns while delegating specific functionalities to dedicated components:
 * - Configuration management (ConfigurationManager)
 * - Context coordination (ContextOrchestrator)
 * - Status monitoring (StatusManager)
 * - MCP server management (McpServerManager)
 * - Conversation handling (ConversationManager)
 * - External knowledge (ExternalSourceManager)
 * - Query processing (QueryProcessor)
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */

import { Logger } from '@/utils/logger';

import { BrainProtocolConfig } from '../config/brainProtocolConfig';
import { ConversationManager } from '../managers/conversationManager';
import { QueryProcessor } from '../pipeline/queryProcessor';
import type { BrainProtocolOptions, QueryOptions, QueryResult } from '../types';

import { ConfigurationManager } from './configurationManager';
import { ContextOrchestrator } from './contextOrchestrator';
import { FeatureCoordinator } from './featureCoordinator';
import { McpServerManager } from './mcpServerManager';
import { StatusManager } from './statusManager';

/**
 * Main BrainProtocol class that coordinates protocol components
 * 
 * This is the central class of the personal-brain application, providing a unified
 * interface for the protocol layer. It delegates specialized concerns to a small set
 * of essential components:
 * 
 * - Context access → ContextOrchestrator (single point of access for all contexts)
 * - Conversation state → ConversationManager (for conversation memory and roomIds)
 * - Feature management → FeatureCoordinator (for system-wide feature flags)
 * - Query processing → QueryProcessor (for processing natural language queries)
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */
export class BrainProtocol {
  // Essential components only
  private configManager: ConfigurationManager;
  private contextOrchestrator: ContextOrchestrator;
  private featureCoordinator: FeatureCoordinator;
  private conversationManager: ConversationManager;
  private statusManager: StatusManager;
  private mcpServerManager: McpServerManager;
  private queryProcessor: QueryProcessor;

  // Singleton instance
  private static instance: BrainProtocol | null = null;

  // Logger instance
  private logger = Logger.getInstance();

  /**
   * Get the singleton instance of BrainProtocol
   * 
   * @param options - Configuration options (only used when creating a new instance)
   * @returns The singleton instance
   */
  public static getInstance(options?: BrainProtocolOptions): BrainProtocol {
    if (!BrainProtocol.instance) {
      BrainProtocol.instance = new BrainProtocol(options);

      const logger = Logger.getInstance();
      logger.debug('BrainProtocol singleton instance created');
    } else if (options) {
      // Log a warning if trying to get instance with different config
      const logger = Logger.getInstance();
      logger.warn('getInstance called with config but instance already exists. Config ignored.');
    }

    return BrainProtocol.instance;
  }

  /**
   * Reset the singleton instance
   * This is primarily used for testing to ensure a clean state between tests
   * Also resets all component singletons to ensure a clean state
   */
  public static resetInstance(): void {
    const logger = Logger.getInstance();

    // Reset all specialized component singletons
    if (ConfigurationManager.resetInstance) {
      ConfigurationManager.resetInstance();
    }
    if (ContextOrchestrator.resetInstance) {
      ContextOrchestrator.resetInstance();
    }
    if (McpServerManager.resetInstance) {
      McpServerManager.resetInstance();
    }
    if (StatusManager.resetInstance) {
      StatusManager.resetInstance();
    }
    if (FeatureCoordinator.resetInstance) {
      FeatureCoordinator.resetInstance();
    }
    if (ConversationManager.resetInstance) {
      ConversationManager.resetInstance();
    }
    // Profile, Note, and ExternalSource managers are no longer part of BrainProtocol
    if (QueryProcessor.resetInstance) {
      QueryProcessor.resetInstance();
    }

    // Finally reset the BrainProtocol instance
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
   * @returns A new BrainProtocol instance
   */
  public static createFresh(options?: BrainProtocolOptions): BrainProtocol {
    const logger = Logger.getInstance();
    logger.debug('Creating fresh BrainProtocol instance');

    return new BrainProtocol(options);
  }

  /**
   * Private constructor to enforce the use of getInstance() or createFresh()
   * 
   * @param optionsOrApiKey - Options object or legacy API key string
   * @param newsApiKey - Legacy news API key parameter
   * @param useExternalSources - Legacy external sources flag
   */
  private constructor(
    optionsOrApiKey?: BrainProtocolOptions | string,
    newsApiKey?: string,
    useExternalSources: boolean = false,
  ) {
    try {
      // Initialize configuration
      const config = new BrainProtocolConfig(optionsOrApiKey, newsApiKey, useExternalSources);

      // Initialize configuration manager
      this.configManager = ConfigurationManager.getInstance({
        config,
      });

      // Initialize context orchestrator
      this.contextOrchestrator = ContextOrchestrator.getInstance({
        config,
      });

      // Ensure contexts are ready before proceeding
      if (!this.contextOrchestrator.areContextsReady()) {
        throw new Error('Context orchestration failed: contexts not ready');
      }

      // Initialize MCP server manager
      this.mcpServerManager = McpServerManager.getInstance({
        contextOrchestrator: this.contextOrchestrator,
        configManager: this.configManager,
      });

      // Initialize conversation manager
      this.conversationManager = ConversationManager.getInstance({
        config,
      });

      // Initialize status manager
      this.statusManager = StatusManager.getInstance({
        contextOrchestrator: this.contextOrchestrator,
        conversationManager: this.conversationManager,
        mcpServer: this.mcpServerManager.getMcpServer(),
        externalSourcesEnabled: this.configManager.getUseExternalSources(),
      });

      // Initialize feature coordinator with direct access to essential components only
      this.featureCoordinator = FeatureCoordinator.getInstance({
        configManager: this.configManager,
        contextOrchestrator: this.contextOrchestrator,
        statusManager: this.statusManager,
      });

      // Initialize query processor with essential components only
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

  /**
   * NOTE: The following accessors have been removed in favor of using getContextManager():
   * - getNoteManager()
   * - getProfileManager()
   * - getExternalSourceManager()
   * 
   * Access contexts directly through getContextManager() instead:
   * 
   * Example:
   * - Old: brainProtocol.getNoteManager().getNoteContext()
   * - New: brainProtocol.getContextManager().getNoteContext()
   */

  /**
   * Primary access point for contexts (notes, profiles, conversations, etc.)
   * @returns ContextManager instance
   */
  getContextManager() {
    return this.contextOrchestrator.getContextManager();
  }

  /**
   * Get the conversation manager for conversation access and state management
   * @returns ConversationManager instance
   */
  getConversationManager(): ConversationManager {
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
   * Get the configuration manager for API settings (generally use FeatureCoordinator instead)
   * @returns ConfigurationManager instance
   */
  getConfigManager(): ConfigurationManager {
    return this.configManager;
  }

  /**
   * Get the MCP server instance
   * @returns MCP server instance
   */
  getMcpServer() {
    return this.mcpServerManager.getMcpServer();
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

      // Additional async initialization can be added here

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
