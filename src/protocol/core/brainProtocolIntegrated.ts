/**
 * BrainProtocolIntegrated
 * 
 * Enhanced version of BrainProtocol that integrates the cross-context messaging system.
 * This version uses ContextOrchestrator instead of ContextOrchestrator
 * to enable message-based communication between contexts.
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
import { ContextIntegrator } from '../messaging/contextIntegrator';
import { ContextMediator } from '../messaging/contextMediator';
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
 * Dependency classes for BrainProtocolIntegrated
 * Allows overriding which classes to use without changing the instantiation logic
 */
export interface BrainProtocolIntegratedDependencies {
  ConfigManager: typeof ConfigurationManager;
  ContextOrchestrator: typeof ContextOrchestrator;
  ContextMediator: typeof ContextMediator;
  ContextIntegrator: typeof ContextIntegrator;
  McpServerManager: typeof McpServerManager;
  ConversationManager: typeof ConversationManager;
  StatusManager: typeof StatusManager;
  FeatureCoordinator: typeof FeatureCoordinator;
  QueryProcessor: typeof QueryProcessor;
}

// Default dependencies are now defined in the constructor to avoid circular references

/**
 * Enhanced BrainProtocol that integrates cross-context messaging
 */
export class BrainProtocolIntegrated implements IBrainProtocol {
  private static instance: BrainProtocolIntegrated | null = null;

  // Essential components only
  private configManager: ConfigurationManager;
  private contextOrchestrator: ContextOrchestrator;
  private contextMediator: ContextMediator;
  private contextIntegrator: ContextIntegrator;
  private mcpServerManager: McpServerManager;
  private conversationManager: ConversationManager;
  private statusManager: StatusManager;
  private featureCoordinator: FeatureCoordinator;
  private queryProcessor: QueryProcessor;

  // Utility logger
  private logger = Logger.getInstance();

  /**
   * Get the singleton instance of BrainProtocolIntegrated
   * 
   * @param options Configuration options
   * @param dependencies Class overrides for dependencies
   * @returns The singleton instance
   */
  public static getInstance(
    options?: BrainProtocolOptions,
    dependencies?: BrainProtocolIntegratedDependencies,
  ): BrainProtocolIntegrated {
    if (!BrainProtocolIntegrated.instance) {
      // Create a new instance with the provided dependencies
      BrainProtocolIntegrated.instance = new BrainProtocolIntegrated(options || {}, dependencies);
      const logger = Logger.getInstance();
      logger.debug('BrainProtocolIntegrated singleton instance created');
    } else if (options || dependencies) {
      // Log a warning if trying to get instance with different config
      const logger = Logger.getInstance();
      logger.warn('getInstance called with config but instance already exists. Config ignored.');
    }

    return BrainProtocolIntegrated.instance;
  }

  /**
   * Reset the singleton instance
   */
  public static resetInstance(): void {
    const logger = Logger.getInstance();

    // Only reset the instance - proper DI means we don't touch dependencies
    if (BrainProtocolIntegrated.instance) {
      BrainProtocolIntegrated.instance = null;
      logger.debug('BrainProtocolIntegrated singleton instance reset');
    }
  }

  /**
   * Create a fresh instance that is not the singleton
   * 
   * @param options Configuration options
   * @param dependencies Alternative classes to use for dependencies
   * @returns A new BrainProtocolIntegrated instance
   */
  public static createFresh(
    options?: BrainProtocolOptions,
    dependencies?: BrainProtocolIntegratedDependencies,
  ): BrainProtocolIntegrated {
    const logger = Logger.getInstance();
    logger.debug('Creating fresh BrainProtocolIntegrated instance');

    return new BrainProtocolIntegrated(options || {}, dependencies);
  }

  /**
   * Private constructor to enforce getInstance() usage
   * 
   * @param options Configuration options
   * @param dependencies Alternative classes to use for dependencies
   */
  private constructor(
    options: BrainProtocolOptions = {},
    dependencies?: BrainProtocolIntegratedDependencies,
  ) {
    // Use default dependencies individually to avoid circular reference issues
    const deps = dependencies || {
      ConfigManager: ConfigurationManager,
      ContextOrchestrator: ContextOrchestrator,
      ContextMediator: ContextMediator,
      ContextIntegrator: ContextIntegrator,
      McpServerManager: McpServerManager,
      ConversationManager: ConversationManager,
      StatusManager: StatusManager,
      FeatureCoordinator: FeatureCoordinator,
      QueryProcessor: QueryProcessor,
    };

    try {
      // Initialize configuration
      const config = new BrainProtocolConfig(options);

      // Initialize core components
      this.configManager = deps.ConfigManager.getInstance({ config });

      // Initialize the messaging infrastructure first
      this.contextMediator = deps.ContextMediator.getInstance();

      // Initialize the base context orchestrator
      this.contextOrchestrator = deps.ContextOrchestrator.getInstance({ config });

      // Ensure contexts are ready before proceeding
      if (!this.contextOrchestrator.areContextsReady()) {
        throw new Error('Context orchestration failed: contexts not ready');
      }

      // Initialize the context integrator to create messaging-enabled contexts
      this.contextIntegrator = deps.ContextIntegrator.getInstance({
        noteContext: this.contextOrchestrator.getNoteContext(),
        profileContext: this.contextOrchestrator.getProfileContext(),
        conversationContext: this.contextOrchestrator.getConversationContext(),
        externalSourceContext: this.contextOrchestrator.getExternalSourceContext(),
        websiteContext: this.contextOrchestrator.getWebsiteContext(),
        mediator: this.contextMediator,
      });

      // Initialize remaining components
      this.mcpServerManager = deps.McpServerManager.getInstance({
        contextOrchestrator: this.contextOrchestrator, // Keep using the original for compatibility
        configManager: this.configManager,
      });

      this.conversationManager = deps.ConversationManager.getInstance({ config });

      this.statusManager = deps.StatusManager.getInstance({
        contextOrchestrator: this.contextOrchestrator, // Keep using the original for compatibility
        conversationManager: this.conversationManager,
        mcpServer: this.mcpServerManager.getMcpServer(),
        externalSourcesEnabled: this.configManager.getUseExternalSources(),
      });

      this.featureCoordinator = deps.FeatureCoordinator.getInstance({
        configManager: this.configManager,
        contextOrchestrator: this.contextOrchestrator, // Keep using the original for compatibility
        statusManager: this.statusManager,
      });

      this.queryProcessor = deps.QueryProcessor.getInstance({
        contextManager: this.contextOrchestrator.getContextManager(), // Keep using the original for compatibility
        conversationManager: this.conversationManager,
        apiKey: this.configManager.getApiKey(),
      });

      this.logger.info(`Brain protocol initialized with external sources ${this.configManager.getUseExternalSources() ? 'enabled' : 'disabled'}`);
      this.logger.info(`Using interface type: ${this.configManager.getInterfaceType()}`);
      this.logger.info('Cross-context messaging system enabled');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to initialize BrainProtocolIntegrated: ${errorMessage}`);
      throw new Error(`BrainProtocolIntegrated initialization failed: ${errorMessage}`);
    }
  }

  // PUBLIC API METHODS

  /**
   * Primary access point for contexts (notes, profiles, conversations, etc.)
   * @returns ContextManager instance
   */
  getContextManager(): IContextManager {
    // Use the original context orchestrator's context manager for compatibility
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
   * Get the MCP server
   * @returns MCP server instance
   * @throws Error if MCP server is not initialized
   */
  getMcpServer(): McpServer {
    try {
      return this.mcpServerManager.getMcpServer();
    } catch (error) {
      this.logger.error('Failed to get MCP server:', error);
      throw error;
    }
  }

  /**
   * Check if the MCP server is available
   * @returns True if available, false otherwise
   */
  hasMcpServer(): boolean {
    return this.mcpServerManager.hasMcpServer();
  }

  /**
   * Check if the protocol is ready
   * @returns True if ready, false otherwise
   */
  isReady(): boolean {
    return this.statusManager.isReady();
  }

  /**
   * Initialize asynchronous components
   * This is called after construction to complete async initialization
   */
  async initialize(): Promise<void> {
    await this.conversationManager.initializeConversation();
  }

  /**
   * Process a natural language query
   * @param query Query text
   * @param options Query options
   * @returns Query result
   */
  async processQuery(query: string, options?: QueryOptions): Promise<QueryResult> {
    return this.queryProcessor.processQuery(query, options);
  }

  /**
   * Get the context mediator for direct messaging operations
   * @returns ContextMediator instance
   */
  getContextMediator(): ContextMediator {
    return this.contextMediator;
  }

  /**
   * Get the context integrator for messaging-enabled contexts
   * @returns ContextIntegrator instance
   */
  getContextIntegrator(): ContextIntegrator {
    return this.contextIntegrator;
  }

  /**
   * Get the messaging-enabled note context
   * @returns NoteContextMessaging instance
   */
  getMessagingNoteContext() {
    return this.contextIntegrator.getNoteContext();
  }

  /**
   * Get the messaging-enabled profile context
   * @returns ProfileContextMessaging instance
   */
  getMessagingProfileContext() {
    return this.contextIntegrator.getProfileContext();
  }
}
