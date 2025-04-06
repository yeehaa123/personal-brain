/**
 * BrainProtocol Main Class
 * Orchestrates the interaction between models and contexts through specialized managers
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { createUnifiedMcpServer } from '@/mcp';
import type { ExternalSourceContext, NoteContext, ProfileContext } from '@/mcp';
import type { ConversationMemory } from '@/mcp/contexts/conversations';
import { EmbeddingService } from '@/mcp/model';
import { ProfileAnalyzer } from '@/mcp/protocol/components/profileAnalyzer';
import { PromptFormatter } from '@/mcp/protocol/components/promptFormatter';
import type { Conversation } from '@/mcp/protocol/schemas/conversationSchemas';
import logger from '@/utils/logger';

import { BrainProtocolConfig } from '../config/brainProtocolConfig';
import { ContextManager } from '../managers/contextManager';
import { ConversationManager } from '../managers/conversationManager';
import { ExternalSourceManager } from '../managers/externalSourceManager';
import { ProfileManager } from '../managers/profileManager';
import { QueryProcessor } from '../pipeline/queryProcessor';
import type { BrainProtocolOptions, QueryOptions, QueryResult } from '../types';

/**
 * Main BrainProtocol class that orchestrates all components
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

  /**
   * Get the singleton instance of BrainProtocol
   * @param options Configuration options
   * @param forceNew Force creation of a new instance (for testing)
   * @returns BrainProtocol instance
   */
  public static getInstance(options?: BrainProtocolOptions, forceNew = false): BrainProtocol {
    if (!BrainProtocol.instance || forceNew) {
      BrainProtocol.instance = new BrainProtocol(options);
    }
    return BrainProtocol.instance;
  }

  /**
   * Reset the singleton instance (for testing)
   */
  public static resetInstance(): void {
    BrainProtocol.instance = null;
  }

  /**
   * Create a new BrainProtocol instance
   * @param optionsOrApiKey Options object or legacy API key string
   * @param newsApiKey Legacy news API key parameter
   * @param useExternalSources Legacy external sources flag
   */
  constructor(
    optionsOrApiKey?: BrainProtocolOptions | string,
    newsApiKey?: string,
    useExternalSources: boolean = false,
  ) {
    try {
      // Initialize configuration
      this.config = new BrainProtocolConfig(optionsOrApiKey, newsApiKey, useExternalSources);
      
      // Create the unified MCP server using config
      this.unifiedMcpServer = createUnifiedMcpServer(this.config.getMcpServerConfig());
      
      // Initialize managers with proper error handling
      this.contextManager = new ContextManager(this.config);
      
      // Ensure contexts are ready before proceeding
      if (!this.contextManager.areContextsReady()) {
        throw new Error('Context manager initialization failed: contexts not ready');
      }
      
      // Initialize context links
      this.contextManager.initializeContextLinks();
      
      // Initialize conversation manager
      this.conversationManager = new ConversationManager(this.config);
      
      // Initialize profile manager with profile context
      this.profileManager = new ProfileManager(
        this.contextManager.getProfileContext(),
        this.config.getApiKey(),
      );
      
      // Initialize prompt formatter and profile analyzer for external source manager
      const promptFormatter = new PromptFormatter();
      const embeddingService = EmbeddingService.getInstance(
        this.config.getApiKey() ? { apiKey: this.config.getApiKey() } : undefined,
      );
      const profileAnalyzer = new ProfileAnalyzer(embeddingService);
      
      // Initialize external source manager
      this.externalSourceManager = new ExternalSourceManager(
        this.contextManager.getExternalSourceContext(),
        profileAnalyzer,
        promptFormatter,
        this.config.useExternalSources,
      );
      
      // Initialize query processor
      this.queryProcessor = new QueryProcessor(
        this.contextManager,
        this.conversationManager,
        this.profileManager,
        this.externalSourceManager,
        this.config.getApiKey(),
      );
      
      logger.info(`Brain protocol initialized with external sources ${this.config.useExternalSources ? 'enabled' : 'disabled'}`);
      logger.info(`Using interface type: ${this.config.interfaceType}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to initialize BrainProtocol: ${errorMessage}`);
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
   * Get the conversation memory
   * @returns Conversation memory instance
   */
  getConversationMemory(): ConversationMemory {
    return this.conversationManager.getConversationMemory();
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
    logger.debug('External sources setting updated in both managers');
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