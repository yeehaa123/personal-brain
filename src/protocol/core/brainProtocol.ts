/**
 * BrainProtocol Main Class
 * Coordinates protocol-level communication and integration between components
 * 
 * Acts as the main entry point for the protocol layer, handling high-level 
 * protocol concerns while delegating context orchestration, query processing,
 * and other specialized tasks to dedicated components.
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { ConversationContext } from '@/contexts';
import { createUnifiedMcpServer } from '@/mcpServer';
import type { Conversation } from '@/protocol/schemas/conversationSchemas';
import { Logger } from '@/utils/logger';

import { PromptFormatter } from '../components';
import { BrainProtocolConfig } from '../config/brainProtocolConfig';
import { ConversationManager } from '../managers/conversationManager';
import { ExternalSourceManager } from '../managers/externalSourceManager';
import { ProfileManager } from '../managers/profileManager';
import { QueryProcessor } from '../pipeline/queryProcessor';
import type { BrainProtocolOptions, QueryOptions, QueryResult } from '../types';

import { ContextOrchestrator } from './contextOrchestrator';

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
  // Core configuration
  private config: BrainProtocolConfig;
  
  // Specialized components
  private contextOrchestrator: ContextOrchestrator;
  private conversationManager: ConversationManager;
  private profileManager: ProfileManager;
  private externalSourceManager: ExternalSourceManager;
  private queryProcessor: QueryProcessor;
  
  // MCP Server
  private unifiedMcpServer: McpServer;
  
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
    
    // Reset all component singletons
    if (ContextOrchestrator.resetInstance) {
      ContextOrchestrator.resetInstance();
    }
    if (ConversationManager.resetInstance) {
      ConversationManager.resetInstance();
    }
    if (ProfileManager.resetInstance) {
      ProfileManager.resetInstance();
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
      this.config = new BrainProtocolConfig(optionsOrApiKey, newsApiKey, useExternalSources);
      
      // Create the unified MCP server using config
      this.unifiedMcpServer = createUnifiedMcpServer(this.config.getMcpServerConfig());
      
      // Initialize context orchestrator
      this.contextOrchestrator = ContextOrchestrator.getInstance({
        config: this.config,
      });
      
      // Ensure contexts are ready before proceeding
      if (!this.contextOrchestrator.areContextsReady()) {
        throw new Error('Context orchestration failed: contexts not ready');
      }
      
      // Initialize conversation manager
      this.conversationManager = ConversationManager.getInstance({ 
        config: this.config,
      });
      
      // Initialize profile manager with profile context
      this.profileManager = ProfileManager.getInstance({
        profileContext: this.contextOrchestrator.getProfileContext(),
        apiKey: this.config.getApiKey(),
      });
      
      // Initialize external source manager
      this.externalSourceManager = ExternalSourceManager.getInstance({
        externalSourceContext: this.contextOrchestrator.getExternalSourceContext(),
        profileAnalyzer: this.profileManager.getProfileAnalyzer(),
        promptFormatter: PromptFormatter.getInstance(),
        enabled: this.config.useExternalSources,
      });
      
      // Initialize query processor
      this.queryProcessor = QueryProcessor.getInstance({
        contextManager: this.contextOrchestrator.getContextManager(),
        conversationManager: this.conversationManager,
        profileManager: this.profileManager,
        externalSourceManager: this.externalSourceManager,
        apiKey: this.config.getApiKey(),
      });
      
      this.logger.info(`Brain protocol initialized with external sources ${this.config.useExternalSources ? 'enabled' : 'disabled'}`);
      this.logger.info(`Using interface type: ${this.config.interfaceType}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to initialize BrainProtocol: ${errorMessage}`);
      throw new Error(`BrainProtocol initialization failed: ${errorMessage}`);
    }
  }

  /**
   * Get the note context for external access
   * @returns NoteContext instance
   */
  getNoteContext() {
    return this.contextOrchestrator.getNoteContext();
  }

  /**
   * Get the profile context for external access
   * @returns ProfileContext instance
   */
  getProfileContext() {
    return this.contextOrchestrator.getProfileContext();
  }

  /**
   * Get the external source context for external access
   * @returns ExternalSourceContext instance
   */
  getExternalSourceContext() {
    return this.contextOrchestrator.getExternalSourceContext();
  }

  /**
   * Get the website context for website management
   * @returns WebsiteContext instance
   */
  getWebsiteContext() {
    return this.contextOrchestrator.getWebsiteContext();
  }

  /**
   * Get the MCP server instance
   * @returns Unified MCP server instance
   */
  getMcpServer(): McpServer {
    return this.unifiedMcpServer;
  }

  /**
   * Get the conversation context
   * @returns Conversation context instance
   */
  getConversationContext(): ConversationContext {
    return this.conversationManager.getConversationContext();
  }

  /**
   * Check if there is an active conversation
   * @returns Whether there is an active conversation
   */
  hasActiveConversation(): boolean {
    return this.conversationManager.hasActiveConversation();
  }

  /**
   * Get the current conversation ID
   * @returns Current conversation ID or null
   */
  getCurrentConversationId(): string | null {
    return this.conversationManager.getCurrentConversationId();
  }

  /**
   * Get a conversation by ID
   * @param conversationId Conversation ID
   * @returns Conversation or null
   */
  async getConversation(conversationId: string): Promise<Conversation | null> {
    return await this.conversationManager.getConversation(conversationId);
  }

  /**
   * Set the current room ID
   * @param roomId Room ID to set
   */
  async setCurrentRoom(roomId: string): Promise<void> {
    await this.conversationManager.setCurrentRoom(roomId);
  }

  /**
   * Enable or disable external sources
   * @param enabled Whether to enable external sources
   */
  setUseExternalSources(enabled: boolean): void {
    // Update both the context orchestrator and external source manager
    this.contextOrchestrator.setExternalSourcesEnabled(enabled);
    this.externalSourceManager.setEnabled(enabled);
    
    // This ensures both components stay in sync
    this.logger.debug('External sources setting updated in both components');
  }

  /**
   * Get whether external sources are enabled
   * @returns Whether external sources are enabled
   */
  getUseExternalSources(): boolean {
    // We get this from the external source manager as it's responsible for
    // processing external source requests
    return this.externalSourceManager.isEnabled();
  }

  /**
   * Check if Anthropic API key is available
   * @returns Whether Anthropic API key is available
   */
  hasAnthropicApiKey(): boolean {
    return this.config.hasAnthropicApiKey();
  }

  /**
   * Check if OpenAI API key is available
   * @returns Whether OpenAI API key is available
   */
  hasOpenAIApiKey(): boolean {
    return this.config.hasOpenAIApiKey();
  }

  /**
   * Check if all components of the BrainProtocol are ready
   * @returns Whether all components are ready
   */
  isReady(): boolean {
    return (
      this.contextOrchestrator.areContextsReady() && 
      this.hasActiveConversation() && 
      !!this.unifiedMcpServer
    );
  }

  /**
   * Get an object describing the status of all components
   * @returns Status object
   */
  getStatus(): Record<string, boolean> {
    return {
      contextOrchestrator: this.contextOrchestrator.areContextsReady(),
      conversationManager: this.hasActiveConversation(),
      mcpServer: !!this.unifiedMcpServer,
      externalSources: this.getUseExternalSources(),
      anthropicApiKey: this.hasAnthropicApiKey(),
      openaiApiKey: this.hasOpenAIApiKey(),
    };
  }

  /**
   * Process a query through the full pipeline
   * @param query User query
   * @param options Query options
   * @returns Query result
   */
  async processQuery(query: string, options?: QueryOptions): Promise<QueryResult> {
    // Check that contexts are ready before processing
    if (!this.contextOrchestrator.areContextsReady()) {
      throw new Error('Cannot process query: contexts not ready');
    }
    
    return await this.queryProcessor.processQuery(query, options);
  }
}