/**
 * ConversationContext for managing conversations in the MCP architecture
 * 
 * NOTE: This is currently undergoing refactoring from ConversationMemory
 * to the MCP architecture pattern. There are some type issues and TODOs
 * that will be addressed in the next refactoring phase.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import type { Conversation, ConversationTurn } from '@/mcp/protocol/schemas/conversationSchemas';
import logger from '@/utils/logger';

import { ConversationFormatter, type FormattingOptions } from './conversationFormatter';
import { 
  ConversationMcpFormatter, 
  type McpFormattedConversation,
  type McpFormattingOptions, 
} from './conversationMcpFormatter';
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
  private mcpFormatter: ConversationMcpFormatter;
  private options: Required<ConversationContextOptions>;
  private mcpServer: McpServer;
  
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
    this.mcpFormatter = new ConversationMcpFormatter();
    
    // Initialize MCP server
    this.mcpServer = new McpServer({
      name: 'ConversationBrain',
      version: '1.0.0',
    });
    
    // Initialize MCP components (resources and tools)
    this.initializeMcpComponents();
    
    // Register them on our internal server
    this.registerMcpResources(this.mcpServer);
    this.registerMcpTools(this.mcpServer);
    
    logger.debug('ConversationContext initialized with resources and tools');
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
   * Register all conversation resources and tools on an external MCP server
   * @param server The MCP server to register with
   * @returns True if registration was successful, false otherwise
   */
  registerOnServer(server: McpServer): boolean {
    try {
      if (!server) {
        logger.warn('Cannot register ConversationContext on undefined server');
        return false;
      }
      
      // Register resources and tools on the external server
      const resourceCount = this.registerMcpResources(server);
      const toolCount = this.registerMcpTools(server);
      
      logger.debug(`ConversationContext registered on external MCP server: ${resourceCount} resources, ${toolCount} tools`);
      return true;
    } catch (error) {
      logger.error(`Error registering ConversationContext on MCP server: ${
        error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * Register all conversation resources on the specified MCP server
   * This method is also used to define resources and register them on the server
   * @param server The server to register resources on
   */
  private registerMcpResources(server: McpServer): number {
    // Use provided server or internal server
    const targetServer = server || this.mcpServer;
    let successCount = 0;
    
    // Register each resource in our collection
    for (const resource of this.conversationResources) {
      try {
        // Validate resource has required properties
        if (!resource.path || !resource.protocol || !resource.handler) {
          logger.warn(`Skipping invalid resource: ${resource.name || resource.path}`);
          continue;
        }
        
        // Create the resource URI
        const resourceUri = `${resource.protocol}://${resource.path}`;
        
        // Register the resource
        targetServer.resource(
          resource.name || resource.path,
          `${resource.protocol}://${resource.path}`,
          async (uri) => {
            try {
            // Extract path parameters from URI
              const pathParams = this.extractPathParams(uri.pathname, resource.path);
              // Parse query parameters
              const queryParams = Object.fromEntries(new URLSearchParams(uri.search));
              // Execute the handler with path parameters and query
              const result = await resource.handler(pathParams, queryParams);
            
              // Format result according to MCP requirements
              return {
                contents: [{
                  uri: uri.toString(),
                  text: typeof result === 'string' 
                    ? result 
                    : JSON.stringify(result, null, 2),
                }],
              };
            } catch (error) {
              logger.error(`Error in ${resourceUri} resource:`, 
                error instanceof Error ? error.message : String(error));
              return {
                contents: [{
                  uri: uri.toString(),
                  text: `Error: ${error instanceof Error ? error.message : String(error)}`,
                }],
              };
            }
          },
        );
      
        successCount++;
        logger.debug(`Registered resource: ${resourceUri}`);
      } catch (error) {
        logger.error(`Failed to register resource ${resource.name || resource.path}: ${
          error instanceof Error ? error.message : String(error)}`);
      }
    }
  
    logger.info(`Successfully registered ${successCount} of ${this.conversationResources.length} resources`);
    return successCount;
  }
  
  /**
   * Register all conversation tools on the specified MCP server
   * This method is also used to define tools and register them on the server
   * @param server The server to register tools on
   * @returns Number of successfully registered tools
   */
  private registerMcpTools(server: McpServer): number {
    // Use provided server or internal server
    const targetServer = server || this.mcpServer;
    let successCount = 0;
    
    // Register each tool in our collection
    for (const tool of this.conversationTools) {
      try {
        // Validate the tool
        if (!tool.name) {
          logger.warn(`Cannot register tool without name: ${tool.path}`);
          continue;
        }
        
        if (!tool.handler) {
          logger.warn(`Cannot register tool without handler: ${tool.name}`);
          continue;
        }
        
        // Use proper Zod schemas based on the tool name
        const schema = this.getToolSchema(tool);
      
        targetServer.tool(
          tool.name,
          tool.description || `Tool for ${tool.path}`,
          schema,
          async (args) => {
            try {
            // Execute the handler with the arguments
              const result = await tool.handler(args);
              return {
                content: [{
                  type: 'text',
                  text: typeof result === 'string' 
                    ? result 
                    : JSON.stringify(result, null, 2),
                }],
              };
            } catch (error) {
              logger.error(`Error executing tool ${tool.name}: ${
                error instanceof Error ? error.message : String(error)}`);
              return {
                content: [{
                  type: 'text',
                  text: `Error: ${error instanceof Error ? error.message : String(error)}`,
                }],
                isError: true,
              };
            }
          },
        );
      
        successCount++;
        logger.debug(`Registered tool: ${tool.name}`);
      } catch (error) {
        logger.error(`Failed to register tool ${tool.name}: ${
          error instanceof Error ? error.message : String(error)}`);
      }
    }
  
    logger.info(`Successfully registered ${successCount} of ${this.conversationTools.length} tools`);
    return successCount;
  }
  
  /**
   * Gets the Zod schema for a tool based on its name
   * @param tool Tool definition with parameters
   * @returns Zod schema object for tool parameters
   */
  private getToolSchema(tool: ResourceDefinition): Record<string, z.ZodTypeAny> {
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
      logger.warn(`No schema defined for tool: ${tool.name || tool.path}`);
      return {};
    }
  }

  /**
   * Extract path parameters from a URL path based on a pattern
   * @param urlPath Actual URL path
   * @param pattern Pattern with parameter placeholders (:paramName)
   * @returns Object with extracted parameters
   */
  private extractPathParams(urlPath: string, pattern: string): Record<string, unknown> {
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
  
  /**
   * Get the MCP server instance
   * @returns The MCP server
   */
  getMcpServer(): McpServer {
    return this.mcpServer;
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
   * Get formatted conversation data for MCP responses
   * @param conversationId The conversation ID
   * @param options MCP formatting options
   */
  async getFormattedConversationForMcp(
    conversationId: string,
    options: McpFormattingOptions = {},
  ): Promise<McpFormattedConversation | null> {
    // Get conversation
    const conversation = await this.storage.getConversation(conversationId);
    if (!conversation) {
      return null;
    }

    // Get turns and summaries
    const turns = await this.storage.getTurns(conversationId);
    const summaries = await this.storage.getSummaries(conversationId);

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
   * Initialize resources and tools during construction
   * Called by the constructor to setup MCP integration
   */
  private initializeMcpComponents(): void {
    // Define all conversation resources
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
          
          const conversations = await this.storage.findConversations({
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
          
          const turns = await this.storage.getTurns(
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
          
          const summaries = await this.storage.getSummaries(conversationId);
          
          // Format using the MCP formatter
          return this.mcpFormatter.formatSummariesForMcp(
            conversationId,
            summaries,
            { includeFullMetadata: includeMetadata },
          );
        },
      },
    ];
    
    // Define all conversation tools
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
      
      // export_conversation
      {
        protocol: 'conversations',
        path: 'export_conversation',
        name: 'export_conversation',
        description: 'Exports a conversation in various formats',
        parameters: {
          type: 'object',
          properties: {
            conversationId: {
              type: 'string',
              description: 'ID of the conversation to export',
            },
            format: {
              type: 'string',
              enum: ['text', 'markdown', 'json', 'html'],
              description: 'Export format',
            },
            includeMetadata: {
              type: 'boolean',
              description: 'Whether to include metadata in the export',
            },
            includeTimestamps: {
              type: 'boolean',
              description: 'Whether to include timestamps in the export',
            },
            includeSummaries: {
              type: 'boolean',
              description: 'Whether to include summaries in the export',
            },
          },
          required: ['conversationId'],
        },
        handler: async (params: Record<string, unknown>) => {
          const conversationId = params['conversationId'] ? String(params['conversationId']) : '';
          const format = params['format'] ? String(params['format']) : 'text';
          const includeMetadata = !!params['includeMetadata'];
          const includeTimestamps = !!params['includeTimestamps'];
          const includeSummaries = !!params['includeSummaries'];
          
          // Get conversation data
          const conversation = await this.storage.getConversation(conversationId);
          if (!conversation) {
            throw new Error(`Conversation with ID ${conversationId} not found`);
          }
          
          // Get turns and possibly summaries
          const turns = await this.storage.getTurns(conversationId);
          let summaries: ConversationSummary[] = [];
          if (includeSummaries) {
            summaries = await this.storage.getSummaries(conversationId);
          }
          
          // Format options
          const options: FormattingOptions = {
            format: format as 'text' | 'markdown' | 'json' | 'html',
            includeMetadata,
            includeTimestamps,
            anchorName: this.options.anchorName,
            anchorId: this.options.anchorId,
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
}