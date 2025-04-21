/**
 * ConversationContext implementation using the BaseContext architecture
 * 
 * This refactored version extends BaseContext to ensure consistent behavior
 * with other context implementations. It also uses specialized services
 * for different responsibilities.
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance 
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */

import { nanoid } from 'nanoid';

import { ConversationStorageAdapter } from '@/contexts/conversations/conversationStorageAdapter';
import { ConversationFormatter, type FormattingOptions } from '@/contexts/conversations/formatters/conversationFormatter';
import {
  ConversationMcpFormatter,
  type McpFormattedConversation,
  type McpFormattingOptions,
} from '@/contexts/conversations/formatters/conversationMcpFormatter';
import type { TieredHistory } from '@/contexts/conversations/memory/tieredMemoryManager';
import { ConversationResourceService } from '@/contexts/conversations/resources';
import { ConversationMemoryService, ConversationQueryService } from '@/contexts/conversations/services';
import type {
  ConversationInfo,
  ConversationStorage,
  ConversationSummary,
  SearchCriteria,
} from '@/contexts/conversations/storage/conversationStorage';
import { InMemoryStorage } from '@/contexts/conversations/storage/inMemoryStorage';
import { ConversationToolService } from '@/contexts/conversations/tools';
import { BaseContext } from '@/contexts/core/baseContext';
import type { ResourceDefinition } from '@/contexts/core/contextInterface';
import type { Conversation, ConversationTurn } from '@/protocol/formats/schemas/conversationSchemas';
// No need to import ServiceRegistry anymore
import { Logger } from '@/utils/logger';

/**
 * Configuration options for ConversationContext
 */
export interface ConversationContextConfig {
  /**
   * Name for the context (defaults to 'ConversationBrain')
   */
  name?: string;

  /**
   * Version for the context (defaults to '1.0.0')
   */
  version?: string;

  /**
   * Storage implementation - if provided, will override the registered storage adapter
   */
  storage?: ConversationStorage;

  /**
   * Tiered memory configuration
   */
  tieredMemoryConfig?: Record<string, unknown>;

  /**
   * Display configuration
   */
  display?: {
    /**
     * Name for the anchor/assistant (defaults to 'Host')
     */
    anchorName?: string;

    /**
     * ID for the anchor/assistant
     */
    anchorId?: string;

    /**
     * Default user name (defaults to 'User')
     */
    defaultUserName?: string;

    /**
     * Default user ID
     */
    defaultUserId?: string;
  };
}

/**
 * Dependencies for ConversationContext
 */
export interface ConversationContextDependencies {
  /** Storage adapter for managing conversation storage */
  storageAdapter: ConversationStorageAdapter;
  /** Formatter for conversation text formatting */
  formatter: ConversationFormatter;
  /** Formatter for MCP-specific responses */
  mcpFormatter: ConversationMcpFormatter;
  /** Service for providing conversation resources */
  resourceService: ConversationResourceService;
  /** Service for providing conversation tools */
  toolService: ConversationToolService;
  /** Service for conversation queries and searches */
  queryService: ConversationQueryService;
  /** Service for memory management */
  memoryService: ConversationMemoryService;
}

/**
 * Options for adding a turn
 */
export interface TurnOptions {
  userId?: string;
  userName?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Options for retrieving history
 */
export interface HistoryOptions {
  format?: 'text' | 'markdown' | 'json' | 'html';
  maxTurns?: number;
  includeTimestamps?: boolean;
  includeMetadata?: boolean;
  includeSummaries?: boolean;
}

/**
 * ConversationContext - Refactored to use BaseContext and services
 * 
 * This context manages conversations, turns, and summaries in the MCP architecture.
 * It delegates specialized functionality to service components.
 */
export class ConversationContext extends BaseContext {
  /** The singleton instance */
  private static instance: ConversationContext | null = null;

  /**
   * Configuration with defaults
   */
  declare protected config: Record<string, unknown>;
  protected contextConfig: Required<ConversationContextConfig>;
  
  // Service dependencies
  private readonly storageAdapter: ConversationStorageAdapter;
  private readonly formatter: ConversationFormatter;
  private readonly mcpFormatter: ConversationMcpFormatter;
  private readonly resourceService: ConversationResourceService;
  private readonly toolService: ConversationToolService;
  private readonly queryService: ConversationQueryService;
  private readonly memoryService: ConversationMemoryService;

  // Properties are declared in the constructor with private readonly modifiers

  /**
   * Get the singleton instance of ConversationContext
   * 
   * @param options Configuration options (only used when creating a new instance)
   * @returns The singleton instance
   */
  static override getInstance(options: Record<string, unknown> = {}): ConversationContext {
    if (!ConversationContext.instance) {
      ConversationContext.instance = ConversationContext.createWithDependencies(options as ConversationContextConfig);
      
      const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
      logger.debug('ConversationContext singleton instance created');
    } else if (Object.keys(options).length > 0) {
      // Log at debug level if trying to get instance with different config
      const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
      logger.debug('getInstance called with config but instance already exists. Config ignored.');
    }
    
    return ConversationContext.instance;
  }

  /**
   * Reset the singleton instance (primarily for testing)
   * This clears the instance and any resources it holds
   */
  static override resetInstance(): void {
    if (ConversationContext.instance) {
      // Any cleanup needed before destroying the instance
      const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
      logger.debug('ConversationContext singleton instance reset');
      
      ConversationContext.instance = null;
    }
  }

  /**
   * Create a fresh instance (primarily for testing)
   * This creates a new instance without affecting the singleton
   * 
   * @param options Configuration options
   * @returns A new ConversationContext instance
   */
  static override createFresh(options: Record<string, unknown> = {}): ConversationContext {
    const logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
    logger.debug('Creating fresh ConversationContext instance');
    
    return ConversationContext.createWithDependencies(options as ConversationContextConfig);
  }

  /**
   * Initialize MCP components (resources and tools)
   * Required by BaseContext - called from BaseContext constructor
   */
  protected initializeMcpComponents(): void {
    // Placeholder implementation - resources and tools will be set in the constructor
    // after services are initialized
    this.resources = [];
    this.tools = [];
  }

  /**
   * Factory method for creating an instance with explicit dependencies
   * 
   * @param config Configuration options
   * @returns A new ConversationContext instance with resolved dependencies
   */
  public static createWithDependencies(config: ConversationContextConfig = {}): ConversationContext {
    // Extract values for use in config preparation
    const name = config.name || 'ConversationBrain';
    const version = config.version || '1.0.0';
    
    // Prepare full configuration with defaults
    const fullConfig: Required<ConversationContextConfig> = {
      name,
      version,
      storage: config.storage || InMemoryStorage.getInstance(),
      tieredMemoryConfig: config.tieredMemoryConfig || {},
      display: {
        anchorName: config.display?.anchorName || 'Host',
        anchorId: config.display?.anchorId || '',
        defaultUserName: config.display?.defaultUserName || 'User',
        defaultUserId: config.display?.defaultUserId || '',
      },
    };
    
    // Handle backwards compatibility with old config format
    if ('anchorName' in config) {
      fullConfig.display.anchorName = config.anchorName as string || 'Host';
    }
    if ('anchorId' in config) {
      fullConfig.display.anchorId = config.anchorId as string || '';
    }
    if ('defaultUserName' in config) {
      fullConfig.display.defaultUserName = config.defaultUserName as string || 'User';
    }
    if ('defaultUserId' in config) {
      fullConfig.display.defaultUserId = config.defaultUserId as string || '';
    }
    
    // Create storage adapter instance with explicit dependency injection
    const storageAdapter = ConversationStorageAdapter.createWithDependencies(
      fullConfig.storage
    );
    
    // Create service instances with explicit dependency injection
    const formatter = ConversationFormatter.getInstance();
    const mcpFormatter = ConversationMcpFormatter.getInstance();
    const resourceService = ConversationResourceService.getInstance();
    const toolService = ConversationToolService.getInstance();
    const queryService = ConversationQueryService.getInstance(storageAdapter);
    const memoryService = ConversationMemoryService.getInstance(
      storageAdapter,
      fullConfig.tieredMemoryConfig,
    );
    
    // Create context with dependencies object
    return new ConversationContext(
      fullConfig,
      {
        storageAdapter,
        formatter,
        mcpFormatter,
        resourceService,
        toolService,
        queryService,
        memoryService,
      }
    );
  }
  
  /**
   * Constructor for ConversationContext with explicit dependency injection
   * 
   * @param config Configuration options
   * @param dependencies Service dependencies for the context
   */
  constructor(
    config: Required<ConversationContextConfig>,
    dependencies: ConversationContextDependencies,
  ) {
    // Call super first with the name and version
    super({
      name: config.name,
      version: config.version,
    } as Record<string, unknown>);

    // Store dependencies
    this.storageAdapter = dependencies.storageAdapter;
    this.formatter = dependencies.formatter;
    this.mcpFormatter = dependencies.mcpFormatter;
    this.resourceService = dependencies.resourceService;
    this.toolService = dependencies.toolService;
    this.queryService = dependencies.queryService;
    this.memoryService = dependencies.memoryService;
    
    // Store the full config
    this.contextConfig = config;
    
    // If tieredMemoryConfig is provided, update the memory service configuration
    if (Object.keys(this.contextConfig.tieredMemoryConfig).length > 0) {
      this.memoryService.updateConfig(this.contextConfig.tieredMemoryConfig);
    }

    // Now that services are initialized, set resources and tools
    this.resources = this.resourceService.getResources(this);
    this.tools = this.toolService.getTools(this);

    this.logger.debug('ConversationContext initialized with dependency injection', {
      context: 'ConversationContext',
    });
  }

  /**
   * Get the context name
   * @returns The name of this context
   */
  override getContextName(): string {
    return this.contextConfig?.name || 'ConversationBrain';
  }

  /**
   * Get the context version
   * @returns The version of this context
   */
  override getContextVersion(): string {
    return this.contextConfig?.version || '1.0.0';
  }

  /**
   * Get capabilities of this context
   * @returns Object containing resources, tools, and features
   */
  override getCapabilities(): { resources: ResourceDefinition[]; tools: ResourceDefinition[]; features: string[] } {
    return {
      resources: this.getResources(),
      tools: this.getTools(),
      features: [],
    };
  }

  /**
   * Get the storage adapter
   * @returns The storage adapter
   */
  getStorage(): ConversationStorageAdapter {
    return this.storageAdapter;
  }

  /**
   * Get the conversation formatter
   * @returns The conversation formatter
   */
  getFormatter(): ConversationFormatter {
    return this.formatter;
  }

  /**
   * Get the MCP formatter
   * @returns The MCP formatter
   */
  getMcpFormatter(): ConversationMcpFormatter {
    return this.mcpFormatter;
  }

  /**
   * Get the anchor name
   * @returns The anchor name
   */
  getAnchorName(): string {
    return this.contextConfig.display.anchorName || 'Host';
  }

  /**
   * Get the anchor ID
   * @returns The anchor ID
   */
  getAnchorId(): string | undefined {
    return this.contextConfig.display.anchorId;
  }
  
  /**
   * Get the query service
   * @returns The query service
   */
  getQueryService(): ConversationQueryService {
    return this.queryService;
  }
  
  /**
   * Get the memory service
   * @returns The memory service
   */
  getMemoryService(): ConversationMemoryService {
    return this.memoryService;
  }
  
  /**
   * Get the resource service
   * @returns The resource service
   */
  getResourceService(): ConversationResourceService {
    return this.resourceService;
  }
  
  /**
   * Get the tool service
   * @returns The tool service
   */
  getToolService(): ConversationToolService {
    return this.toolService;
  }

  /**
   * Set a new storage adapter 
   * @param storage The new storage adapter
   */
  setStorage(storage: ConversationStorageAdapter): void {
    // Create new dependent services with explicit dependency injection
    const queryService = ConversationQueryService.getInstance(storage);
    const memoryService = ConversationMemoryService.getInstance(
      storage,
      this.contextConfig.tieredMemoryConfig
    );
    
    // Use assignment with type assertion to modify the readonly properties for internal use
    (this.storageAdapter as ConversationStorageAdapter) = storage;
    (this.queryService as ConversationQueryService) = queryService;
    (this.memoryService as ConversationMemoryService) = memoryService;
    
    // Update memory service config if needed
    if (Object.keys(this.contextConfig.tieredMemoryConfig).length > 0) {
      this.memoryService.updateConfig(this.contextConfig.tieredMemoryConfig);
    }
    
    // Refresh MCP components
    this.resources = this.resourceService.getResources(this);
    this.tools = this.toolService.getTools(this);
    
    this.logger.debug('Storage adapter updated with direct dependency injection', {
      context: 'ConversationContext',
    });
  }

  /**
   * Public API methods - Most delegate to specialized services
   */

  /**
   * Create a new conversation
   * @param interfaceType Interface type (cli or matrix)
   * @param roomId Room ID
   * @returns The ID of the created conversation
   */
  async createConversation(interfaceType: 'cli' | 'matrix', roomId: string): Promise<string> {
    return this.queryService.createConversation(interfaceType, roomId);
  }

  /**
   * Get a conversation by ID
   * @param conversationId Conversation ID
   * @returns The conversation or null if not found
   */
  async getConversation(conversationId: string): Promise<Conversation | null> {
    return this.queryService.getConversation(conversationId);
  }

  /**
   * Get a conversation ID by room ID
   * @param roomId Room ID
   * @param interfaceType Optional interface type filter
   * @returns Conversation ID or null if not found
   */
  async getConversationIdByRoom(
    roomId: string,
    interfaceType?: 'cli' | 'matrix',
  ): Promise<string | null> {
    return this.queryService.getConversationIdByRoom(roomId, interfaceType);
  }

  /**
   * Get or create a conversation for a room
   * @param roomId Room ID
   * @param interfaceType Interface type
   * @returns Conversation ID
   */
  async getOrCreateConversationForRoom(
    roomId: string,
    interfaceType: 'cli' | 'matrix',
  ): Promise<string> {
    return this.queryService.getOrCreateConversationForRoom(roomId, interfaceType);
  }

  /**
   * Add a turn to a conversation
   * @param conversationId Conversation ID
   * @param query User query
   * @param response Assistant response
   * @param options Turn options
   */
  async addTurn(
    conversationId: string,
    query: string,
    response?: string,
    options?: TurnOptions,
  ): Promise<string> {
    // Ensure conversation exists
    const conversation = await this.queryService.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation with ID ${conversationId} not found`);
    }

    // Default user ID and name from options or context defaults
    const userId = options?.userId || this.contextConfig.display.defaultUserId;
    const userName = options?.userName || this.contextConfig.display.defaultUserName;

    // Create turn
    const turn: Partial<ConversationTurn> = {
      id: `turn-${nanoid()}`,
      timestamp: new Date(),
      query,
      response: response || '',
      userId,
      userName,
      metadata: {
        ...(options?.metadata || {}),
        isActive: true,
      },
    };

    // Add turn and check for summarization via memory service
    return this.memoryService.addTurn(conversationId, turn);
  }

  /**
   * Get turns for a conversation
   * @param conversationId Conversation ID
   * @param limit Maximum number of turns to retrieve
   * @param offset Number of turns to skip
   * @returns Array of conversation turns
   */
  async getTurns(
    conversationId: string,
    limit?: number,
    offset?: number,
  ): Promise<ConversationTurn[]> {
    return this.memoryService.getTurns(conversationId, limit, offset);
  }

  /**
   * Force summarization of active turns in a conversation
   * @param conversationId Conversation ID
   */
  async forceSummarize(conversationId: string): Promise<boolean> {
    return this.memoryService.forceSummarize(conversationId);
  }

  /**
   * Get tiered history for a conversation
   * @param conversationId Conversation ID
   * @returns Tiered history object
   */
  async getTieredHistory(conversationId: string): Promise<TieredHistory> {
    return this.memoryService.getTieredHistory(conversationId);
  }

  /**
   * Get formatted conversation history
   * @param conversationId Conversation ID
   * @param options Formatting options
   * @returns Formatted conversation history
   */
  async getConversationHistory(
    conversationId: string,
    options: HistoryOptions = {},
  ): Promise<string> {
    // Get turns based on options
    const turns = await this.memoryService.getTurns(
      conversationId,
      options.maxTurns || undefined,
    );

    // Get summaries if requested
    let summaries: ConversationSummary[] = [];
    if (options.includeSummaries) {
      summaries = await this.memoryService.getSummaries(conversationId);
    }

    // Format the conversation
    const formattingOptions: FormattingOptions = {
      format: options.format || 'text',
      includeTimestamps: options.includeTimestamps || false,
      includeMetadata: options.includeMetadata || false,
      anchorName: this.contextConfig.display.anchorName,
      anchorId: this.contextConfig.display.anchorId,
      highlightAnchor: true,
    };

    return this.formatter.formatConversation(turns, summaries, formattingOptions);
  }

  /**
   * Format conversation history for inclusion in prompts
   * @param conversationId Conversation ID
   * @param maxTokens Maximum tokens to include
   * @returns Formatted history string
   */
  async formatHistoryForPrompt(conversationId: string, maxTokens?: number): Promise<string> {
    return this.memoryService.formatHistoryForPrompt(conversationId, maxTokens);
  }

  /**
   * Check if a user is the anchor
   * @param userId User ID to check
   * @returns True if user is the anchor
   */
  isAnchor(userId: string): boolean {
    return this.contextConfig.display.anchorId === userId;
  }

  /**
   * Find conversations matching search criteria
   * @param criteria Search criteria
   * @returns Array of matching conversations
   */
  async findConversations(criteria: SearchCriteria): Promise<ConversationInfo[]> {
    return this.queryService.findConversations(criteria);
  }

  /**
   * Get conversations for a specific room
   * @param roomId Room ID
   * @param interfaceType Optional interface type filter
   * @returns Array of conversation info objects
   */
  async getConversationsByRoom(
    roomId: string,
    interfaceType?: 'cli' | 'matrix',
  ): Promise<ConversationInfo[]> {
    return this.queryService.getConversationsByRoom(roomId, interfaceType);
  }

  /**
   * Get recent conversations
   * @param limit Maximum number of conversations to return
   * @param interfaceType Optional interface type filter
   * @returns Array of conversation info objects
   */
  async getRecentConversations(
    limit?: number,
    interfaceType?: 'cli' | 'matrix',
  ): Promise<ConversationInfo[]> {
    return this.queryService.getRecentConversations(limit, interfaceType);
  }

  /**
   * Update conversation metadata
   * @param conversationId Conversation ID
   * @param metadata Metadata to update
   * @returns True if updated
   */
  async updateMetadata(
    conversationId: string,
    metadata: Record<string, unknown>,
  ): Promise<boolean> {
    return this.queryService.updateMetadata(conversationId, metadata);
  }

  /**
   * Delete a conversation
   * @param conversationId Conversation ID
   * @returns True if deleted
   */
  async deleteConversation(conversationId: string): Promise<boolean> {
    return this.queryService.deleteConversation(conversationId);
  }

  /**
   * Get formatted conversation data for MCP responses
   * @param conversationId The conversation ID
   * @param options MCP formatting options
   */
  async getFormattedConversationForMcp(
    conversationId: string,
    options: McpFormattingOptions = {},
  ): Promise<McpFormattedConversation | null> {
    // Get conversation
    const conversation = await this.queryService.getConversation(conversationId);
    if (!conversation) {
      return null;
    }

    // Get turns and summaries
    const turns = await this.memoryService.getTurns(conversationId);
    const summaries = await this.memoryService.getSummaries(conversationId);

    // Format them with MCP formatter
    return this.mcpFormatter.formatConversationForMcp(
      conversation,
      turns,
      summaries,
      options,
    );
  }

  /**
   * Migrate data from current storage to a new storage
   * @param newStorage New storage implementation
   */
  async migrateStorage(newStorage: ConversationStorage): Promise<void> {
    // Get all conversations
    const conversations = await this.findConversations({});

    for (const conversationInfo of conversations) {
      try {
        // Get full conversation details
        const conversation = await this.storageAdapter.read(conversationInfo.id);
        if (!conversation) continue;

        // Create conversation in new storage
        const newConversationId = await newStorage.createConversation({
          id: conversation.id,
          interfaceType: conversation.interfaceType,
          roomId: conversation.roomId,
          startedAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
          metadata: conversation.metadata,
        });

        // Migrate turns
        const turns = await this.memoryService.getTurns(conversation.id);
        for (const turn of turns) {
          await newStorage.addTurn(newConversationId, turn);
        }

        // Migrate summaries
        const summaries = await this.memoryService.getSummaries(conversation.id);
        for (const summary of summaries) {
          await newStorage.addSummary(newConversationId, summary);
        }

        this.logger.debug(`Migrated conversation ${conversation.id} to new storage`, { context: 'ConversationContext' });
      } catch (error) {
        this.logger.error(`Error migrating conversation ${conversationInfo.id}:`, { error, context: 'ConversationContext' });
      }
    }

    this.logger.info(`Completed migration of ${conversations.length} conversations to new storage`, { context: 'ConversationContext' });
  }
}