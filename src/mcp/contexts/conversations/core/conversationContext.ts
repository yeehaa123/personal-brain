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

import { ConversationStorageAdapter } from '@/mcp/contexts/conversations/adapters/conversationStorageAdapter';
import { ConversationFormatter, type FormattingOptions } from '@/mcp/contexts/conversations/formatters/conversationFormatter';
import {
  ConversationMcpFormatter,
  type McpFormattedConversation,
  type McpFormattingOptions,
} from '@/mcp/contexts/conversations/formatters/conversationMcpFormatter';
import type { TieredHistory } from '@/mcp/contexts/conversations/memory/tieredMemoryManager';
import { ConversationResourceService } from '@/mcp/contexts/conversations/resources';
import { ConversationMemoryService, ConversationQueryService } from '@/mcp/contexts/conversations/services';
import type {
  ConversationInfo,
  ConversationStorage,
  ConversationSummary,
  SearchCriteria,
} from '@/mcp/contexts/conversations/storage/conversationStorage';
import { InMemoryStorage } from '@/mcp/contexts/conversations/storage/inMemoryStorage';
import { ConversationToolService } from '@/mcp/contexts/conversations/tools';
import { BaseContext } from '@/mcp/contexts/core/baseContext';
import type { Conversation, ConversationTurn } from '@/mcp/protocol/schemas/conversationSchemas';
import { getService, ServiceIdentifiers } from '@/services/serviceRegistry';
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

  /**
   * Storage adapter for conversations
   */
  private storageAdapter: ConversationStorageAdapter;

  /**
   * Formatters for output
   */
  private formatter: ConversationFormatter;
  private mcpFormatter: ConversationMcpFormatter;

  /**
   * Services
   */
  private resourceService: ConversationResourceService;
  private toolService: ConversationToolService;
  private queryService: ConversationQueryService;
  private memoryService: ConversationMemoryService;

  /**
   * Get the singleton instance of ConversationContext
   * 
   * @param options Configuration options (only used when creating a new instance)
   * @returns The singleton instance
   */
  static override getInstance(options: Record<string, unknown> = {}): ConversationContext {
    if (!ConversationContext.instance) {
      ConversationContext.instance = new ConversationContext(options as ConversationContextConfig);
      
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
    
    return new ConversationContext(options as ConversationContextConfig);
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
   * Private constructor to enforce the use of getInstance() or createFresh()
   * @param config Configuration options
   */
  private constructor(config: ConversationContextConfig = {}) {
    // Extract values before calling super
    const name = config.name || 'ConversationBrain';
    const version = config.version || '1.0.0';

    // Call super first with the name and version
    super({
      name,
      version,
    } as Record<string, unknown>);

    // Now initialize the full config object with defaults
    this.contextConfig = {
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
      this.contextConfig.display.anchorName = config.anchorName as string || 'Host';
    }
    if ('anchorId' in config) {
      this.contextConfig.display.anchorId = config.anchorId as string || '';
    }
    if ('defaultUserName' in config) {
      this.contextConfig.display.defaultUserName = config.defaultUserName as string || 'User';
    }
    if ('defaultUserId' in config) {
      this.contextConfig.display.defaultUserId = config.defaultUserId as string || '';
    }

    // Get services from dependency injection container
    try {
      // Get all required services from the container
      this.storageAdapter = getService<ConversationStorageAdapter>(ServiceIdentifiers.ConversationStorageAdapter);
      this.formatter = getService<ConversationFormatter>(ServiceIdentifiers.ConversationFormatter);
      this.mcpFormatter = getService<ConversationMcpFormatter>(ServiceIdentifiers.ConversationMcpFormatter);
      this.resourceService = getService<ConversationResourceService>(ServiceIdentifiers.ConversationResourceService);
      this.toolService = getService<ConversationToolService>(ServiceIdentifiers.ConversationToolService);
      this.queryService = getService<ConversationQueryService>(ServiceIdentifiers.ConversationQueryService);
      this.memoryService = getService<ConversationMemoryService>(ServiceIdentifiers.ConversationMemoryService);
      
      // If tieredMemoryConfig is provided, update the memory service configuration
      if (Object.keys(this.contextConfig.tieredMemoryConfig).length > 0) {
        this.memoryService.updateConfig(this.contextConfig.tieredMemoryConfig);
      }
    } catch (error) {
      // Fall back to direct instantiation if DI fails
      this.logger.warn('Failed to resolve services via DI, falling back to direct instantiation', {
        context: 'ConversationContext',
        error,
      });
      
      // Create services directly as a fallback
      this.storageAdapter = ConversationStorageAdapter.getInstance(
        this.contextConfig.storage || InMemoryStorage.getInstance(),
      );
      this.formatter = ConversationFormatter.getInstance();
      this.mcpFormatter = ConversationMcpFormatter.getInstance();
      this.resourceService = ConversationResourceService.getInstance();
      this.toolService = ConversationToolService.getInstance();
      this.queryService = ConversationQueryService.getInstance(this.storageAdapter);
      this.memoryService = ConversationMemoryService.getInstance(
        this.storageAdapter,
        this.contextConfig.tieredMemoryConfig,
      );
    }

    // Now that services are initialized, set resources and tools
    this.resources = this.resourceService.getResources(this);
    this.tools = this.toolService.getTools(this);

    this.logger.debug('ConversationContext initialized with BaseContext architecture and services', {
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
    this.storageAdapter = storage;
    
    try {
      // Get the container instance from the imported registry - using dynamic import to avoid circular deps
      import('@/utils/dependencyContainer').then(module => {
        const container = module.DependencyContainer.getInstance();
        
        // Try to update the storage adapter in the container
        if (container.has(ServiceIdentifiers.ConversationStorageAdapter)) {
          container.unregister(ServiceIdentifiers.ConversationStorageAdapter);
          container.register(ServiceIdentifiers.ConversationStorageAdapter, () => storage);
          
          // Recreate services that depend on the storage adapter
          this.queryService = getService<ConversationQueryService>(ServiceIdentifiers.ConversationQueryService);
          this.memoryService = getService<ConversationMemoryService>(ServiceIdentifiers.ConversationMemoryService);
          
          // Update resources and tools with new services
          this.resources = this.resourceService.getResources(this);
          this.tools = this.toolService.getTools(this);
        } else {
          // Fall back to direct instantiation
          this.queryService = ConversationQueryService.getInstance(this.storageAdapter);
          this.memoryService = ConversationMemoryService.getInstance(
            this.storageAdapter,
            this.contextConfig.tieredMemoryConfig,
          );
          
          // Update resources and tools with new services
          this.resources = this.resourceService.getResources(this);
          this.tools = this.toolService.getTools(this);
        }
      }).catch(_error => {
        // Fall back to direct instantiation if dynamic import fails
        this.logger.warn('Failed to update DI container, falling back to direct instantiation', { 
          context: 'ConversationContext', 
        });
        
        this.queryService = ConversationQueryService.getInstance(this.storageAdapter);
        this.memoryService = ConversationMemoryService.getInstance(
          this.storageAdapter,
          this.contextConfig.tieredMemoryConfig,
        );
        
        // Refresh MCP components
        this.resources = this.resourceService.getResources(this);
        this.tools = this.toolService.getTools(this);
      });
    } catch (_error) {
      // Fall back to direct instantiation if DI fails
      this.logger.warn('Error in setStorage, falling back to direct instantiation', {
        context: 'ConversationContext',
      });
      
      this.queryService = ConversationQueryService.getInstance(this.storageAdapter);
      this.memoryService = ConversationMemoryService.getInstance(
        this.storageAdapter,
        this.contextConfig.tieredMemoryConfig,
      );
      
      // Refresh MCP components
      this.resources = this.resourceService.getResources(this);
      this.tools = this.toolService.getTools(this);
    }
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