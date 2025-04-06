/**
 * ConversationContext for managing conversations in the MCP architecture
 * 
 * NOTE: This is currently undergoing refactoring from ConversationMemory
 * to the MCP architecture pattern. There are some type issues and TODOs
 * that will be addressed in the next refactoring phase.
 */
import { nanoid } from 'nanoid';

import type { Conversation, ConversationTurn } from '@/mcp/protocol/schemas/conversationSchemas';
import logger from '@/utils/logger';

import { ConversationFormatter, type FormattingOptions } from './conversationFormatter';
import type { 
  ConversationInfo, 
  ConversationStorage,
  ConversationSummary,
  SearchCriteria,
} from './conversationStorage';
import { InMemoryStorage } from './inMemoryStorage';
import { type TieredHistory, type TieredMemoryConfig, TieredMemoryManager } from './tieredMemoryManager';

// Resource interface for ConversationContext
interface ResourceDefinition {
  protocol: string;
  path: string;
  handler: (params: Record<string, unknown>, query?: Record<string, unknown>) => Promise<unknown>;
  name?: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

/**
 * Configuration options for ConversationContext
 */
export interface ConversationContextOptions {
  storage?: ConversationStorage;
  tieredMemoryConfig?: Partial<TieredMemoryConfig>;
  anchorName?: string;
  anchorId?: string;
  defaultUserName?: string;
  defaultUserId?: string;
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
 * ConversationContext is the main facade for conversation operations
 * in the MCP architecture
 */
export class ConversationContext {
  private static instance: ConversationContext | null = null;
  
  private storage: ConversationStorage;
  private tieredMemoryManager: TieredMemoryManager;
  private formatter: ConversationFormatter;
  private options: Required<ConversationContextOptions>;
  
  // MCP Server elements
  private conversationResources: ResourceDefinition[] = [];
  private conversationTools: ResourceDefinition[] = [];
  
  /**
   * Create a new ConversationContext
   * Private constructor to ensure singleton pattern
   */
  private constructor(options?: ConversationContextOptions) {
    // Set default options
    this.options = {
      storage: options?.storage || InMemoryStorage.getInstance(),
      tieredMemoryConfig: options?.tieredMemoryConfig || {},
      anchorName: options?.anchorName || 'Host',
      anchorId: options?.anchorId || '',
      defaultUserName: options?.defaultUserName || 'User',
      defaultUserId: options?.defaultUserId || '',
    };
    
    // Initialize components
    this.storage = this.options.storage;
    this.tieredMemoryManager = new TieredMemoryManager(this.storage, this.options.tieredMemoryConfig);
    this.formatter = new ConversationFormatter();
    
    // Initialize MCP resources and tools
    this.initializeMcpResources();
    this.initializeMcpTools();
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(options?: ConversationContextOptions): ConversationContext {
    if (!ConversationContext.instance) {
      ConversationContext.instance = new ConversationContext(options);
    }
    return ConversationContext.instance;
  }
  
  /**
   * Create a fresh instance for testing
   */
  public static createFresh(options?: ConversationContextOptions): ConversationContext {
    // Force a new instance for testing
    const instance = new ConversationContext(options);
    return instance;
  }
  
  /**
   * Reset the singleton instance
   * Primarily used for testing and initialization
   */
  public static resetInstance(): void {
    ConversationContext.instance = null;
  }
  
  /**
   * Create a new conversation
   * @param interfaceType Interface type (cli or matrix)
   * @param roomId Room ID
   * @returns The ID of the created conversation
   */
  async createConversation(interfaceType: 'cli' | 'matrix', roomId: string): Promise<string> {
    return this.storage.createConversation({
      id: `conv-${nanoid()}`,
      interfaceType,
      roomId,
      startedAt: new Date(),
      updatedAt: new Date(),
    });
  }
  
  /**
   * Get a conversation by ID
   * @param conversationId Conversation ID
   * @returns The conversation or null if not found
   */
  async getConversation(conversationId: string): Promise<Conversation | null> {
    return this.storage.getConversation(conversationId);
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
    return this.storage.getConversationByRoom(roomId, interfaceType);
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
    // Try to find existing conversation for this room
    const existingConversationId = await this.storage.getConversationByRoom(roomId, interfaceType);
    
    if (existingConversationId) {
      return existingConversationId;
    }
    
    // Create a new conversation for this room
    return this.createConversation(interfaceType, roomId);
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
    const conversation = await this.storage.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation with ID ${conversationId} not found`);
    }
    
    // Default user ID and name from options or context defaults
    const userId = options?.userId || this.options.defaultUserId;
    const userName = options?.userName || this.options.defaultUserName;
    
    // Create turn
    const turn: ConversationTurn = {
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
    
    // Add turn to storage
    const turnId = await this.storage.addTurn(conversationId, turn);
    
    // Check and potentially summarize older turns
    await this.tieredMemoryManager.checkAndSummarize(conversationId);
    
    return turnId;
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
    return this.storage.getTurns(conversationId, limit, offset);
  }
  
  /**
   * Force summarization of active turns in a conversation
   * @param conversationId Conversation ID
   */
  async forceSummarize(conversationId: string): Promise<boolean> {
    return this.tieredMemoryManager.forceSummarize(conversationId);
  }
  
  /**
   * Get tiered history for a conversation
   * @param conversationId Conversation ID
   * @returns Tiered history object
   */
  async getTieredHistory(conversationId: string): Promise<TieredHistory> {
    return this.tieredMemoryManager.getTieredHistory(conversationId);
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
    const turns = await this.storage.getTurns(
      conversationId, 
      options.maxTurns || undefined,
    );
    
    // Get summaries if requested
    let summaries: ConversationSummary[] = [];
    if (options.includeSummaries) {
      summaries = await this.storage.getSummaries(conversationId);
    }
    
    // Format the conversation
    const formattingOptions: FormattingOptions = {
      format: options.format || 'text',
      includeTimestamps: options.includeTimestamps || false,
      includeMetadata: options.includeMetadata || false,
      anchorName: this.options.anchorName,
      anchorId: this.options.anchorId,
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
    return this.tieredMemoryManager.formatHistoryForPrompt(conversationId, maxTokens);
  }
  
  /**
   * Check if a user is the anchor
   * @param userId User ID to check
   * @returns True if user is the anchor
   */
  isAnchor(userId: string): boolean {
    return this.options.anchorId === userId;
  }
  
  /**
   * Find conversations matching search criteria
   * @param criteria Search criteria
   * @returns Array of matching conversations
   */
  async findConversations(criteria: SearchCriteria): Promise<ConversationInfo[]> {
    return this.storage.findConversations(criteria);
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
    return this.storage.findConversations({
      roomId,
      interfaceType,
    });
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
    return this.storage.getRecentConversations(limit, interfaceType);
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
    return this.storage.updateMetadata(conversationId, metadata);
  }
  
  /**
   * Delete a conversation
   * @param conversationId Conversation ID
   * @returns True if deleted
   */
  async deleteConversation(conversationId: string): Promise<boolean> {
    return this.storage.deleteConversation(conversationId);
  }
  
  /**
   * Register with an MCP server
   * @param _server MCP server to register with
   */
  registerWithMcpServer(_server: unknown): void {
    logger.info('ConversationContext MCP resources and tools registration is disabled');
    // Will be implemented in a future version when needed
  }
  
  /**
   * Get MCP resources
   * @returns Array of MCP resources
   */
  getResources(): ResourceDefinition[] {
    return [...this.conversationResources];
  }
  
  /**
   * Get MCP tools
   * @returns Array of MCP tools
   */
  getTools(): ResourceDefinition[] {
    return [...this.conversationTools];
  }
  
  /**
   * Get the storage instance
   * @returns Storage instance
   */
  getStorage(): ConversationStorage {
    return this.storage;
  }
  
  /**
   * Set a new storage instance
   * @param storage Storage instance
   */
  setStorage(storage: ConversationStorage): void {
    this.storage = storage;
    this.tieredMemoryManager = new TieredMemoryManager(
      this.storage,
      this.options.tieredMemoryConfig,
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
        const conversation = await this.storage.getConversation(conversationInfo.id);
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
        const turns = await this.storage.getTurns(conversation.id);
        for (const turn of turns) {
          await newStorage.addTurn(newConversationId, turn);
        }
        
        // Migrate summaries
        const summaries = await this.storage.getSummaries(conversation.id);
        for (const summary of summaries) {
          await newStorage.addSummary(newConversationId, summary);
        }
        
        logger.debug(`Migrated conversation ${conversation.id} to new storage`);
      } catch (error) {
        logger.error(`Error migrating conversation ${conversationInfo.id}:`, error);
      }
    }
    
    logger.info(`Completed migration of ${conversations.length} conversations to new storage`);
  }
  
  /**
   * Initialize MCP resources
   */
  private initializeMcpResources(): void {
    this.conversationResources = [
      // conversations://list
      {
        protocol: 'conversations',
        path: 'list',
        handler: async (_params: Record<string, unknown>, query: Record<string, unknown> = {}) => {
          const limit = query['limit'] !== undefined ? String(query['limit']) : undefined;
          const offset = query['offset'] !== undefined ? String(query['offset']) : undefined;
          const interfaceType = query['interfaceType'] !== undefined ? String(query['interfaceType']) : undefined;
          
          return this.storage.findConversations({
            limit: limit ? parseInt(limit, 10) : undefined,
            offset: offset ? parseInt(offset, 10) : undefined,
            interfaceType: interfaceType as 'cli' | 'matrix' | undefined,
          });
        },
      },
      
      // conversations://get/:id
      {
        protocol: 'conversations',
        path: 'get/:id',
        handler: async (params: Record<string, unknown>) => {
          const conversationId = params['id'] ? String(params['id']) : '';
          if (!conversationId) {
            throw new Error('Conversation ID is required');
          }
          
          const conversation = await this.storage.getConversation(conversationId);
          if (!conversation) {
            throw new Error(`Conversation with ID ${conversationId} not found`);
          }
          
          const turns = await this.storage.getTurns(conversationId);
          const summaries = await this.storage.getSummaries(conversationId);
          
          return {
            ...conversation,
            turns,
            summaries,
          };
        },
      },
      
      // conversations://search
      {
        protocol: 'conversations',
        path: 'search',
        handler: async (_params: Record<string, unknown>, query: Record<string, unknown> = {}) => {
          const q = query['q'] !== undefined ? String(query['q']) : undefined;
          const interfaceType = query['interfaceType'] !== undefined ? String(query['interfaceType']) : undefined;
          const roomId = query['roomId'] !== undefined ? String(query['roomId']) : undefined;
          const startDate = query['startDate'] !== undefined ? String(query['startDate']) : undefined;
          const endDate = query['endDate'] !== undefined ? String(query['endDate']) : undefined;
          const limit = query['limit'] !== undefined ? String(query['limit']) : undefined;
          const offset = query['offset'] !== undefined ? String(query['offset']) : undefined;
          
          return this.storage.findConversations({
            query: q,
            interfaceType: interfaceType as 'cli' | 'matrix' | undefined,
            roomId,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            offset: offset ? parseInt(offset, 10) : undefined,
          });
        },
      },
      
      // conversations://room/:roomId
      {
        protocol: 'conversations',
        path: 'room/:roomId',
        handler: async (params: Record<string, unknown>, query: Record<string, unknown> = {}) => {
          const roomId = params['roomId'] ? String(params['roomId']) : '';
          const interfaceType = query['interfaceType'] !== undefined ? String(query['interfaceType']) : undefined;
          
          if (!roomId) {
            throw new Error('Room ID is required');
          }
          
          return this.getConversationsByRoom(roomId, interfaceType as 'cli' | 'matrix' | undefined);
        },
      },
      
      // conversations://recent
      {
        protocol: 'conversations',
        path: 'recent',
        handler: async (_params: Record<string, unknown>, query: Record<string, unknown> = {}) => {
          const limit = query['limit'] !== undefined ? String(query['limit']) : undefined;
          const interfaceType = query['interfaceType'] !== undefined ? String(query['interfaceType']) : undefined;
          
          return this.getRecentConversations(
            limit ? parseInt(limit, 10) : undefined,
            interfaceType as 'cli' | 'matrix' | undefined,
          );
        },
      },
    ];
  }
  
  /**
   * Initialize MCP tools
   */
  private initializeMcpTools(): void {
    this.conversationTools = [
      // create_conversation
      {
        protocol: 'conversations',
        path: 'create_conversation',
        name: 'create_conversation',
        description: 'Creates a new conversation',
        parameters: {
          type: 'object',
          properties: {
            interfaceType: {
              type: 'string',
              enum: ['cli', 'matrix'],
              description: 'Interface type of the conversation',
            },
            roomId: {
              type: 'string',
              description: 'Room ID for the conversation',
            },
          },
          required: ['interfaceType', 'roomId'],
        },
        handler: async (params: Record<string, unknown>) => {
          const interfaceType = params['interfaceType'] ? String(params['interfaceType']) : '';
          const roomId = params['roomId'] ? String(params['roomId']) : '';
          
          const conversationId = await this.createConversation(
            interfaceType as 'cli' | 'matrix',
            roomId,
          );
          
          return { conversationId };
        },
      },
      
      // add_turn
      {
        protocol: 'conversations',
        path: 'add_turn',
        name: 'add_turn',
        description: 'Adds a turn to a conversation',
        parameters: {
          type: 'object',
          properties: {
            conversationId: {
              type: 'string',
              description: 'ID of the conversation',
            },
            query: {
              type: 'string',
              description: 'User query',
            },
            response: {
              type: 'string',
              description: 'Assistant response',
            },
            userId: {
              type: 'string',
              description: 'User ID (optional)',
            },
            userName: {
              type: 'string',
              description: 'User name (optional)',
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata (optional)',
            },
          },
          required: ['conversationId', 'query'],
        },
        handler: async (params: Record<string, unknown>) => {
          const conversationId = params['conversationId'] ? String(params['conversationId']) : '';
          const query = params['query'] ? String(params['query']) : '';
          const response = params['response'] ? String(params['response']) : undefined;
          const userId = params['userId'] ? String(params['userId']) : undefined;
          const userName = params['userName'] ? String(params['userName']) : undefined;
          const metadata = params['metadata'] as Record<string, unknown> | undefined;
          
          const turnId = await this.addTurn(
            conversationId,
            query,
            response,
            { userId, userName, metadata },
          );
          
          return { turnId };
        },
      },
      
      // summarize_conversation
      {
        protocol: 'conversations',
        path: 'summarize_conversation',
        name: 'summarize_conversation',
        description: 'Forces summarization of a conversation',
        parameters: {
          type: 'object',
          properties: {
            conversationId: {
              type: 'string',
              description: 'ID of the conversation to summarize',
            },
          },
          required: ['conversationId'],
        },
        handler: async (params: Record<string, unknown>) => {
          const conversationId = params['conversationId'] ? String(params['conversationId']) : '';
          const success = await this.forceSummarize(conversationId);
          
          return { success };
        },
      },
      
      // get_conversation_history
      {
        protocol: 'conversations',
        path: 'get_conversation_history',
        name: 'get_conversation_history',
        description: 'Retrieves formatted conversation history',
        parameters: {
          type: 'object',
          properties: {
            conversationId: {
              type: 'string',
              description: 'ID of the conversation',
            },
            format: {
              type: 'string',
              enum: ['text', 'markdown', 'json', 'html'],
              description: 'Format of the output',
            },
            maxTurns: {
              type: 'number',
              description: 'Maximum number of turns to include',
            },
            includeSummaries: {
              type: 'boolean',
              description: 'Whether to include summaries',
            },
            includeTimestamps: {
              type: 'boolean',
              description: 'Whether to include timestamps',
            },
            includeMetadata: {
              type: 'boolean',
              description: 'Whether to include metadata',
            },
          },
          required: ['conversationId'],
        },
        handler: async (params: Record<string, unknown>) => {
          const conversationId = params['conversationId'] ? String(params['conversationId']) : '';
          const format = params['format'] ? String(params['format']) : undefined;
          const maxTurns = params['maxTurns'] ? Number(params['maxTurns']) : undefined;
          const includeSummaries = !!params['includeSummaries'];
          const includeTimestamps = !!params['includeTimestamps'];
          const includeMetadata = !!params['includeMetadata'];
          
          const history = await this.getConversationHistory(conversationId, {
            format: format as 'text' | 'markdown' | 'json' | 'html',
            maxTurns,
            includeSummaries,
            includeTimestamps,
            includeMetadata,
          });
          
          return { history };
        },
      },
      
      // search_conversations
      {
        protocol: 'conversations',
        path: 'search_conversations',
        name: 'search_conversations',
        description: 'Searches conversations',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query',
            },
            interfaceType: {
              type: 'string',
              enum: ['cli', 'matrix'],
              description: 'Interface type filter',
            },
            roomId: {
              type: 'string',
              description: 'Room ID filter',
            },
            startDate: {
              type: 'string',
              format: 'date-time',
              description: 'Start date filter (ISO format)',
            },
            endDate: {
              type: 'string',
              format: 'date-time',
              description: 'End date filter (ISO format)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results',
            },
          },
        },
        handler: async (params: Record<string, unknown>) => {
          const query = params['query'] ? String(params['query']) : undefined;
          const interfaceType = params['interfaceType'] ? String(params['interfaceType']) : undefined;
          const roomId = params['roomId'] ? String(params['roomId']) : undefined;
          const startDate = params['startDate'] ? String(params['startDate']) : undefined;
          const endDate = params['endDate'] ? String(params['endDate']) : undefined;
          const limit = params['limit'] ? Number(params['limit']) : undefined;
          
          const results = await this.findConversations({
            query,
            interfaceType: interfaceType as 'cli' | 'matrix' | undefined,
            roomId,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            limit,
          });
          
          return { results };
        },
      },
    ];
  }
}