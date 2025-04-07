/**
 * ConversationContext implementation using the BaseContext architecture
 * 
 * This refactored version extends BaseContext to ensure consistent behavior
 * with other context implementations.
 */

import { nanoid } from 'nanoid';
import { z } from 'zod';

import { ConversationStorageAdapter } from '@/mcp/contexts/conversations/adapters/conversationStorageAdapter';
import { ConversationFormatter, type FormattingOptions } from '@/mcp/contexts/conversations/formatters/conversationFormatter';
import {
  ConversationMcpFormatter,
  type McpFormattedConversation,
  type McpFormattingOptions,
} from '@/mcp/contexts/conversations/formatters/conversationMcpFormatter';
import { type TieredHistory, type TieredMemoryConfig, TieredMemoryManager } from '@/mcp/contexts/conversations/memory/tieredMemoryManager';
import type {
  ConversationInfo,
  ConversationStorage,
  ConversationSummary,
  SearchCriteria,
} from '@/mcp/contexts/conversations/storage/conversationStorage';
import { InMemoryStorage } from '@/mcp/contexts/conversations/storage/inMemoryStorage';
import { BaseContext } from '@/mcp/contexts/core/baseContext';
import type { Conversation, ConversationTurn } from '@/mcp/protocol/schemas/conversationSchemas';
import logger from '@/utils/logger';

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
   * Storage adapter or implementation
   */
  storage?: ConversationStorageAdapter | ConversationStorage;

  /**
   * Tiered memory configuration
   */
  tieredMemoryConfig?: Partial<TieredMemoryConfig>;

  /**
   * Name for the anchor (defaults to 'Host')
   */
  anchorName?: string;

  /**
   * ID for the anchor
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
 * ConversationContext - Refactored to use BaseContext
 * 
 * This context manages conversations, turns, and summaries in the MCP architecture.
 */
export class ConversationContext extends BaseContext {
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
   * Memory manager for summarization
   */
  private tieredMemoryManager: TieredMemoryManager;

  /**
   * Formatters for output
   */
  private formatter: ConversationFormatter;
  private mcpFormatter: ConversationMcpFormatter;

  /**
   * Get singleton instance of ConversationContext
   * @param config Configuration options
   * @returns The context instance
   */
  static override getInstance(config: Record<string, unknown> = {}): ConversationContext {
    if (!ConversationContext.instance) {
      ConversationContext.instance = new ConversationContext(config as ConversationContextConfig);
    }
    return ConversationContext.instance;
  }

  /**
   * Create a fresh instance for testing
   * @param config Configuration options
   * @returns A new context instance
   */
  static createFresh(config: Record<string, unknown> = {}): ConversationContext {
    return new ConversationContext(config as ConversationContextConfig);
  }

  /**
   * Reset the singleton instance
   */
  static override resetInstance(): void {
    ConversationContext.instance = null;
  }

  /**
   * Create a new ConversationContext
   * @param config Configuration options
   */
  constructor(config: ConversationContextConfig = {}) {
    // Extract values before calling super
    const name = config.name || 'ConversationBrain';
    const version = config.version || '1.0.0';

    // Call super first with the name and version
    super({
      name,
      version,
    } as Record<string, unknown>);

    // Now initialize the full config object
    this.contextConfig = {
      name,
      version,
      storage: config.storage || InMemoryStorage.getInstance(),
      tieredMemoryConfig: config.tieredMemoryConfig || {},
      anchorName: config.anchorName || 'Host',
      anchorId: config.anchorId || '',
      defaultUserName: config.defaultUserName || 'User',
      defaultUserId: config.defaultUserId || '',
    };

    // Create storage adapter if needed
    if (this.contextConfig.storage instanceof ConversationStorageAdapter) {
      this.storageAdapter = this.contextConfig.storage;
    } else {
      this.storageAdapter = new ConversationStorageAdapter(this.contextConfig.storage);
    }

    // Initialize components
    this.tieredMemoryManager = new TieredMemoryManager(
      this.getStorageImplementation(),
      this.contextConfig.tieredMemoryConfig,
    );

    // Initialize formatters
    this.formatter = new ConversationFormatter();
    this.mcpFormatter = new ConversationMcpFormatter();

    logger.debug('ConversationContext initialized with BaseContext architecture', {
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
   * Get the underlying storage implementation
   * @returns The storage implementation
   */
  private getStorageImplementation(): ConversationStorage {
    return this.storageAdapter.getStorageImplementation();
  }

  /**
   * Set a new storage adapter
   * @param storage The new storage adapter
   */
  setStorage(storage: ConversationStorageAdapter): void {
    this.storageAdapter = storage;
    this.tieredMemoryManager = new TieredMemoryManager(
      this.getStorageImplementation(),
      this.contextConfig.tieredMemoryConfig,
    );
  }

  /**
   * Initialize MCP components (resources and tools)
   */
  protected initializeMcpComponents(): void {
    // Define conversation resources
    this.resources = [
      // conversations://list
      {
        protocol: 'conversations',
        path: 'list',
        handler: async (_params: Record<string, unknown>, query: Record<string, unknown> = {}) => {
          const limit = query['limit'] !== undefined ? String(query['limit']) : undefined;
          const offset = query['offset'] !== undefined ? String(query['offset']) : undefined;
          const interfaceType = query['interfaceType'] !== undefined ? String(query['interfaceType']) : undefined;

          return this.storageAdapter.findConversations({
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

          const conversation = await this.storageAdapter.read(conversationId);
          if (!conversation) {
            throw new Error(`Conversation with ID ${conversationId} not found`);
          }

          const turns = await this.storageAdapter.getTurns(conversationId);
          const summaries = await this.storageAdapter.getSummaries(conversationId);

          // Format the response using the MCP formatter for better structure
          return this.mcpFormatter.formatConversationForMcp(
            conversation,
            turns,
            summaries,
            {
              includeFullTurns: true,
              includeFullMetadata: false,
            },
          );
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

          const conversations = await this.findConversations({
            query: q,
            interfaceType: interfaceType as 'cli' | 'matrix' | undefined,
            roomId,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            offset: offset ? parseInt(offset, 10) : undefined,
          });

          // Enhance the results with some basic statistics
          return {
            results: conversations,
            count: conversations.length,
            query: {
              text: q,
              interfaceType,
              roomId,
              startDate,
              endDate,
              limit: limit ? parseInt(limit, 10) : undefined,
            },
          };
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

      // conversations://turns/:id
      {
        protocol: 'conversations',
        path: 'turns/:id',
        handler: async (params: Record<string, unknown>, query: Record<string, unknown> = {}) => {
          const conversationId = params['id'] ? String(params['id']) : '';
          const limit = query['limit'] !== undefined ? String(query['limit']) : undefined;
          const offset = query['offset'] !== undefined ? String(query['offset']) : undefined;
          const includeMetadata = query['metadata'] === 'true';

          if (!conversationId) {
            throw new Error('Conversation ID is required');
          }

          const turns = await this.storageAdapter.getTurns(
            conversationId,
            limit ? parseInt(limit, 10) : undefined,
            offset ? parseInt(offset, 10) : undefined,
          );

          // Format using the MCP formatter
          return this.mcpFormatter.formatTurnsForMcp(
            conversationId,
            turns,
            { includeFullMetadata: includeMetadata },
          );
        },
      },

      // conversations://summaries/:id
      {
        protocol: 'conversations',
        path: 'summaries/:id',
        handler: async (params: Record<string, unknown>, query: Record<string, unknown> = {}) => {
          const conversationId = params['id'] ? String(params['id']) : '';
          const includeMetadata = query['metadata'] === 'true';

          if (!conversationId) {
            throw new Error('Conversation ID is required');
          }

          const summaries = await this.storageAdapter.getSummaries(conversationId);

          // Format using the MCP formatter
          return this.mcpFormatter.formatSummariesForMcp(
            conversationId,
            summaries,
            { includeFullMetadata: includeMetadata },
          );
        },
      },
    ];

    // Define conversation tools
    this.tools = [
      // create_conversation
      {
        protocol: 'conversations',
        path: 'create_conversation',
        name: 'create_conversation',
        description: 'Creates a new conversation',
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

      // export_conversation
      {
        protocol: 'conversations',
        path: 'export_conversation',
        name: 'export_conversation',
        description: 'Exports a conversation in various formats',
        handler: async (params: Record<string, unknown>) => {
          const conversationId = params['conversationId'] ? String(params['conversationId']) : '';
          const format = params['format'] ? String(params['format']) : 'text';
          const includeMetadata = !!params['includeMetadata'];
          const includeTimestamps = !!params['includeTimestamps'];
          const includeSummaries = !!params['includeSummaries'];

          // Get conversation data
          const conversation = await this.storageAdapter.read(conversationId);
          if (!conversation) {
            throw new Error(`Conversation with ID ${conversationId} not found`);
          }

          // Get turns and possibly summaries
          const turns = await this.storageAdapter.getTurns(conversationId);
          let summaries: ConversationSummary[] = [];
          if (includeSummaries) {
            summaries = await this.storageAdapter.getSummaries(conversationId);
          }

          // Format options
          const options: FormattingOptions = {
            format: format as 'text' | 'markdown' | 'json' | 'html',
            includeMetadata,
            includeTimestamps,
            anchorName: this.contextConfig.anchorName,
            anchorId: this.contextConfig.anchorId,
            highlightAnchor: true,
          };

          // Format conversation
          const formatted = this.formatter.formatConversation(turns, summaries, options);

          return {
            conversationId,
            content: formatted,
            metadata: {
              format,
              turnCount: turns.length,
              summaryCount: summaries.length,
              exportedAt: new Date().toISOString(),
            },
          };
        },
      },
    ];
  }

  /**
   * Get the Zod schema for a tool based on its name
   * @param tool Tool definition with parameters
   * @returns Zod schema object for tool parameters
   */
  protected getToolSchema(tool: { name?: string }): Record<string, z.ZodTypeAny> {
    // Return appropriate Zod schema based on tool name
    switch (tool.name) {
    case 'create_conversation':
      return {
        interfaceType: z.enum(['cli', 'matrix']).describe('Interface type of the conversation'),
        roomId: z.string().describe('Room ID for the conversation'),
      };

    case 'add_turn':
      return {
        conversationId: z.string().describe('ID of the conversation'),
        query: z.string().min(1).describe('User query'),
        response: z.string().optional().describe('Assistant response'),
        userId: z.string().optional().describe('User ID (optional)'),
        userName: z.string().optional().describe('User name (optional)'),
        metadata: z.record(z.unknown()).optional().describe('Additional metadata (optional)'),
      };

    case 'summarize_conversation':
      return {
        conversationId: z.string().describe('ID of the conversation to summarize'),
      };

    case 'get_conversation_history':
      return {
        conversationId: z.string().describe('ID of the conversation'),
        format: z.enum(['text', 'markdown', 'json', 'html']).optional()
          .describe('Format of the output'),
        maxTurns: z.number().optional().describe('Maximum number of turns to include'),
        includeSummaries: z.boolean().optional().describe('Whether to include summaries'),
        includeTimestamps: z.boolean().optional().describe('Whether to include timestamps'),
        includeMetadata: z.boolean().optional().describe('Whether to include metadata'),
      };

    case 'search_conversations':
      return {
        query: z.string().optional().describe('Search query'),
        interfaceType: z.enum(['cli', 'matrix']).optional().describe('Interface type filter'),
        roomId: z.string().optional().describe('Room ID filter'),
        startDate: z.string().optional().describe('Start date filter (ISO format)'),
        endDate: z.string().optional().describe('End date filter (ISO format)'),
        limit: z.number().optional().describe('Maximum number of results'),
      };

    case 'export_conversation':
      return {
        conversationId: z.string().describe('ID of the conversation to export'),
        format: z.enum(['text', 'markdown', 'json', 'html']).optional()
          .describe('Export format'),
        includeMetadata: z.boolean().optional().describe('Whether to include metadata'),
        includeTimestamps: z.boolean().optional().describe('Whether to include timestamps'),
        includeSummaries: z.boolean().optional().describe('Whether to include summaries'),
      };

    default:
      // For unknown tools, return an empty schema
      logger.warn(`No schema defined for tool: ${tool.name || ''}`, { context: 'ConversationContext' });
      return {};
    }
  }

  /**
   * Extract path parameters from a URL path based on a pattern
   * @param urlPath Actual URL path
   * @param pattern Pattern with parameter placeholders (:paramName)
   * @returns Object with extracted parameters
   */
  protected extractPathParams(urlPath: string, pattern: string): Record<string, unknown> {
    const params: Record<string, unknown> = {};

    // Remove leading slash from both
    const normalizedPath = urlPath.startsWith('/') ? urlPath.substring(1) : urlPath;
    const normalizedPattern = pattern.startsWith('/') ? pattern.substring(1) : pattern;

    // Split path and pattern into segments
    const pathSegments = normalizedPath.split('/');
    const patternSegments = normalizedPattern.split('/');

    // Match each segment
    for (let i = 0; i < patternSegments.length; i++) {
      if (i >= pathSegments.length) break;

      // If pattern segment starts with ':', it's a parameter
      if (patternSegments[i].startsWith(':')) {
        const paramName = patternSegments[i].substring(1);
        params[paramName] = pathSegments[i];
      }
    }

    return params;
  }

  // Public API methods

  /**
   * Create a new conversation
   * @param interfaceType Interface type (cli or matrix)
   * @param roomId Room ID
   * @returns The ID of the created conversation
   */
  async createConversation(interfaceType: 'cli' | 'matrix', roomId: string): Promise<string> {
    return this.storageAdapter.create({
      id: `conv-${nanoid()}`,
      interfaceType,
      roomId,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    });
  }

  /**
   * Get a conversation by ID
   * @param conversationId Conversation ID
   * @returns The conversation or null if not found
   */
  async getConversation(conversationId: string): Promise<Conversation | null> {
    return this.storageAdapter.read(conversationId);
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
    return this.storageAdapter.getConversationByRoom(roomId, interfaceType);
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
    return this.storageAdapter.getOrCreateConversation(roomId, interfaceType);
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
    const conversation = await this.storageAdapter.read(conversationId);
    if (!conversation) {
      throw new Error(`Conversation with ID ${conversationId} not found`);
    }

    // Default user ID and name from options or context defaults
    const userId = options?.userId || this.contextConfig.defaultUserId;
    const userName = options?.userName || this.contextConfig.defaultUserName;

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

    // Add turn to storage
    const turnId = await this.storageAdapter.addTurn(conversationId, turn);

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
    return this.storageAdapter.getTurns(conversationId, limit, offset);
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
    const turns = await this.storageAdapter.getTurns(
      conversationId,
      options.maxTurns || undefined,
    );

    // Get summaries if requested
    let summaries: ConversationSummary[] = [];
    if (options.includeSummaries) {
      summaries = await this.storageAdapter.getSummaries(conversationId);
    }

    // Format the conversation
    const formattingOptions: FormattingOptions = {
      format: options.format || 'text',
      includeTimestamps: options.includeTimestamps || false,
      includeMetadata: options.includeMetadata || false,
      anchorName: this.contextConfig.anchorName,
      anchorId: this.contextConfig.anchorId,
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
    return this.contextConfig.anchorId === userId;
  }

  /**
   * Find conversations matching search criteria
   * @param criteria Search criteria
   * @returns Array of matching conversations
   */
  async findConversations(criteria: SearchCriteria): Promise<ConversationInfo[]> {
    // Convert the specific SearchCriteria to a generic Record<string, unknown>
    const genericCriteria: Record<string, unknown> = {};
    Object.entries(criteria).forEach(([key, value]) => {
      genericCriteria[key] = value;
    });

    return this.storageAdapter.findConversations(genericCriteria);
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
    return this.storageAdapter.findConversations({
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
    return this.storageAdapter.getRecentConversations(limit, interfaceType);
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
    return this.storageAdapter.updateMetadata(conversationId, metadata);
  }

  /**
   * Delete a conversation
   * @param conversationId Conversation ID
   * @returns True if deleted
   */
  async deleteConversation(conversationId: string): Promise<boolean> {
    return this.storageAdapter.delete(conversationId);
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
    const conversation = await this.storageAdapter.read(conversationId);
    if (!conversation) {
      return null;
    }

    // Get turns and summaries
    const turns = await this.storageAdapter.getTurns(conversationId);
    const summaries = await this.storageAdapter.getSummaries(conversationId);

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
        const turns = await this.storageAdapter.getTurns(conversation.id);
        for (const turn of turns) {
          await newStorage.addTurn(newConversationId, turn);
        }

        // Migrate summaries
        const summaries = await this.storageAdapter.getSummaries(conversation.id);
        for (const summary of summaries) {
          await newStorage.addSummary(newConversationId, summary);
        }

        logger.debug(`Migrated conversation ${conversation.id} to new storage`, { context: 'ConversationContext' });
      } catch (error) {
        logger.error(`Error migrating conversation ${conversationInfo.id}:`, { error, context: 'ConversationContext' });
      }
    }

    logger.info(`Completed migration of ${conversations.length} conversations to new storage`, { context: 'ConversationContext' });
  }
}
