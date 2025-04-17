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
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { Logger } from '@/utils/logger';

import { PromptFormatter } from '../components';
import { BrainProtocolConfig } from '../config/brainProtocolConfig';
import { ConversationManager } from '../managers/conversationManager';
import { ExternalSourceManager } from '../managers/externalSourceManager';
import { NoteManager } from '../managers/noteManager';
import { ProfileManager } from '../managers/profileManager';
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
 * interface for the protocol layer. It delegates specialized concerns to dedicated components:
 * - Context coordination → ContextOrchestrator
 * - Conversation management → ConversationManager
 * - Profile handling → ProfileManager
 * - External knowledge → ExternalSourceManager
 * - Query processing → QueryProcessor
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */
export class BrainProtocol {
  // Specialized components
  private configManager: ConfigurationManager;
  private contextOrchestrator: ContextOrchestrator;
  private mcpServerManager: McpServerManager;
  private statusManager: StatusManager;
  private featureCoordinator: FeatureCoordinator;
  private conversationManager: ConversationManager;
  private profileManager: ProfileManager;
  private noteManager: NoteManager;
  private externalSourceManager: ExternalSourceManager;
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
    if (ProfileManager.resetInstance) {
      ProfileManager.resetInstance();
    }
    if (NoteManager.resetInstance) {
      NoteManager.resetInstance();
    }
    if (ExternalSourceManager.resetInstance) {
      ExternalSourceManager.resetInstance();
    }
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
      
      // Initialize profile manager with profile context
      this.profileManager = ProfileManager.getInstance({
        profileContext: this.contextOrchestrator.getProfileContext(),
        apiKey: this.configManager.getApiKey(),
      });
      
      // Initialize note manager with note context
      this.noteManager = NoteManager.getInstance({
        noteContext: this.contextOrchestrator.getNoteContext(),
      });
      
      // Initialize external source manager
      this.externalSourceManager = ExternalSourceManager.getInstance({
        externalSourceContext: this.contextOrchestrator.getExternalSourceContext(),
        profileAnalyzer: this.profileManager.getProfileAnalyzer(),
        promptFormatter: PromptFormatter.getInstance(),
        enabled: this.configManager.getUseExternalSources(),
      });
      
      // Initialize status manager
      this.statusManager = StatusManager.getInstance({
        contextOrchestrator: this.contextOrchestrator,
        conversationManager: this.conversationManager,
        mcpServer: this.mcpServerManager.getMcpServer(),
        externalSourcesEnabled: this.configManager.getUseExternalSources(),
      });
      
      // Initialize feature coordinator
      this.featureCoordinator = FeatureCoordinator.getInstance({
        configManager: this.configManager,
        contextOrchestrator: this.contextOrchestrator,
        externalSourceManager: this.externalSourceManager,
        statusManager: this.statusManager,
      });
      
      // Initialize query processor
      this.queryProcessor = QueryProcessor.getInstance({
        contextManager: this.contextOrchestrator.getContextManager(),
        conversationManager: this.conversationManager,
        profileManager: this.profileManager,
        noteManager: this.noteManager,
        externalSourceManager: this.externalSourceManager,
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
   * Get the note manager for external access
   * @returns NoteManager instance
   */
  getNoteManager() {
    return this.noteManager;
  }

  /**
   * Get the profile manager for external access
   * @returns ProfileManager instance
   */
  getProfileManager() {
    return this.profileManager;
  }

  /**
   * Get the context manager for accessing context components
   * @returns ContextManager instance
   */
  getContextManager() {
    return this.contextOrchestrator.getContextManager();
  }
  
  /**
   * Get the MCP server instance
   * @returns MCP server instance
   */
  getMcpServer(): McpServer | null {
    return this.mcpServerManager.getMcpServer();
  }

  /**
   * Get the conversation manager for external access
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
   * Get the configuration manager for API settings
   * @returns ConfigurationManager instance
   */
  getConfigManager(): ConfigurationManager {
    return this.configManager;
  }

  /**
   * Get the status manager for system status
   * @returns StatusManager instance
   */
  getStatusManager(): StatusManager {
    return this.statusManager;
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