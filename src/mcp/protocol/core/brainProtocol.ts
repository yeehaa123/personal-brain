/**
 * BrainProtocol Main Class
 * Orchestrates the interaction between models and contexts through specialized managers
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { createUnifiedMcpServer } from '@/mcp';
import type { ExternalSourceContext, NoteContext, ProfileContext } from '@/mcp';
import type { ConversationContext } from '@/mcp/contexts/conversations';
import { EmbeddingService } from '@/mcp/model';
import { ProfileAnalyzer } from '@/mcp/protocol/components/profileAnalyzer';
import { PromptFormatter } from '@/mcp/protocol/components/promptFormatter';
import type { Conversation } from '@/mcp/protocol/schemas/conversationSchemas';
import { Logger } from '@/utils/logger';

import { BrainProtocolConfig } from '../config/brainProtocolConfig';
import { ContextManager } from '../managers/contextManager';
import { ConversationManager } from '../managers/conversationManager';
import { ExternalSourceManager } from '../managers/externalSourceManager';
import { ProfileManager } from '../managers/profileManager';
import { QueryProcessor } from '../pipeline/queryProcessor';
import type { BrainProtocolOptions, QueryOptions, QueryResult } from '../types';

/**
 * Main BrainProtocol class that orchestrates all components
 * 
 * This is the central class of the personal-brain application, responsible for:
 * - Coordinating interactions between all component managers
 * - Processing user queries through the query pipeline
 * - Managing conversation and profile data
 * - Providing access to external knowledge sources
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */
export class BrainProtocol {
  // Core configuration
  private config: BrainProtocolConfig;
  
  // Specialized managers
  private contextManager: ContextManager;
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
   * Also resets all manager singletons to ensure a clean state
   */
  public static resetInstance(): void {
    const logger = Logger.getInstance();
    
    // Reset all manager singletons
    if (ContextManager.resetInstance) {
      ContextManager.resetInstance();
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
      
      // Initialize managers with proper error handling using getInstance pattern
      this.contextManager = ContextManager.getInstance({ config: this.config });
      
      // Ensure contexts are ready before proceeding
      if (!this.contextManager.areContextsReady()) {
        throw new Error('Context manager initialization failed: contexts not ready');
      }
      
      // Initialize context links
      this.contextManager.initializeContextLinks();
      
      // Initialize conversation manager
      this.conversationManager = ConversationManager.getInstance({ config: this.config });
      
      // Initialize profile manager with profile context
      this.profileManager = ProfileManager.getInstance({
        profileContext: this.contextManager.getProfileContext(),
        apiKey: this.config.getApiKey(),
      });
      
      // Initialize prompt formatter and profile analyzer for external source manager
      const promptFormatter = PromptFormatter.getInstance();
      const embeddingService = EmbeddingService.getInstance(
        this.config.getApiKey() ? { apiKey: this.config.getApiKey() } : undefined,
      );
      const profileAnalyzer = ProfileAnalyzer.getInstance({
        embeddingService,
      });
      
      // Initialize external source manager
      this.externalSourceManager = ExternalSourceManager.getInstance({
        externalSourceContext: this.contextManager.getExternalSourceContext(),
        profileAnalyzer,
        promptFormatter,
        enabled: this.config.useExternalSources,
      });
      
      // Initialize query processor
      this.queryProcessor = QueryProcessor.getInstance({
        contextManager: this.contextManager,
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
  getNoteContext(): NoteContext {
    return this.contextManager.getNoteContext();
  }

  /**
   * Get the profile context for external access
   * @returns ProfileContext instance
   */
  getProfileContext(): ProfileContext {
    return this.contextManager.getProfileContext();
  }

  /**
   * Get the external source context for external access
   * @returns ExternalSourceContext instance or null
   */
  getExternalSourceContext(): ExternalSourceContext {
    return this.contextManager.getExternalSourceContext();
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
    // Update both the context manager and external source manager
    this.contextManager.setExternalSourcesEnabled(enabled);
    this.externalSourceManager.setEnabled(enabled);
    
    // This ensures both components stay in sync
    this.logger.debug('External sources setting updated in both managers');
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
      this.contextManager.areContextsReady() && 
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
      contextManager: this.contextManager.areContextsReady(),
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
    if (!this.contextManager.areContextsReady()) {
      throw new Error('Cannot process query: contexts not ready');
    }
    
    return await this.queryProcessor.processQuery(query, options);
  }
}

// No longer need to define ProtocolResponse here as it's imported from types