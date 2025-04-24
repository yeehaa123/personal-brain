/**
 * Conversation Tools for MCP
 * 
 * This file contains the tool definitions for the ConversationContext
 * extracted to follow the single responsibility principle.
 * 
 * Implements the Component Interface Standardization pattern with:
 * - getInstance(): Returns the singleton instance
 * - resetInstance(): Resets the singleton instance (mainly for testing)
 * - createFresh(): Creates a new instance without affecting the singleton
 */

import { z } from 'zod';

import type { ConversationContext } from '@/contexts';
import type { ResourceDefinition } from '@/contexts/contextInterface';
import type { ConversationStorageAdapter } from '@/contexts/conversations/conversationStorageAdapter';
import type { ConversationFormatter, FormattingOptions } from '@/contexts/conversations/formatters/conversationFormatter';
import type { ConversationMcpFormatter } from '@/contexts/conversations/formatters/conversationMcpFormatter';
import type { ConversationSummary } from '@/contexts/conversations/storage/conversationStorage';
import { Logger } from '@/utils/logger';

/**
 * Service responsible for providing MCP tools for conversations
 * Follows the Component Interface Standardization pattern
 */
export class ConversationToolService {
  /** The singleton instance */
  private static instance: ConversationToolService | null = null;
  
  /** Logger instance for this class */
  private logger = Logger.getInstance({ silent: process.env.NODE_ENV === 'test' });
  
  /**
   * Get the singleton instance of ConversationToolService
   * 
   * @returns The shared ConversationToolService instance
   */
  public static getInstance(): ConversationToolService {
    if (!ConversationToolService.instance) {
      ConversationToolService.instance = new ConversationToolService();
    }
    return ConversationToolService.instance;
  }
  
  /**
   * Reset the singleton instance (primarily for testing)
   * This clears the instance and any resources it holds
   */
  public static resetInstance(): void {
    ConversationToolService.instance = null;
  }
  
  /**
   * Create a fresh instance (primarily for testing)
   * This creates a new instance without affecting the singleton
   * 
   * @returns A new ConversationToolService instance
   */
  public static createFresh(): ConversationToolService {
    return new ConversationToolService();
  }
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    this.logger.debug('ConversationToolService initialized', { context: 'ConversationToolService' });
  }
  /**
   * Get the MCP tools for the conversation context
   * 
   * @param context The conversation context
   * @returns Array of MCP tools
   */
  getTools(context: ConversationContext): ResourceDefinition[] {
    const storageAdapter = context.getStorage();
    const formatter = context.getFormatter();
    const mcpFormatter = context.getMcpFormatter();
    const anchorName = context.getAnchorName();
    const anchorId = context.getAnchorId();

    return [
      // create_conversation
      this.createConversationTool(context),
      
      // add_turn
      this.addTurnTool(context),
      
      // summarize_conversation
      this.summarizeConversationTool(context),
      
      // get_conversation_history
      this.getConversationHistoryTool(context, formatter, anchorName, anchorId),
      
      // search_conversations
      this.searchConversationsTool(context),
      
      // export_conversation
      this.exportConversationTool(storageAdapter, formatter, mcpFormatter, anchorName, anchorId),
    ];
  }

  /**
   * Get the Zod schema for a tool based on its name
   * 
   * @param tool Tool definition with parameters
   * @returns Zod schema object for tool parameters
   */
  getToolSchema(tool: { name?: string }): Record<string, z.ZodTypeAny> {
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
      return {};
    }
  }

  /**
   * Create the create_conversation tool
   */
  private createConversationTool(context: ConversationContext): ResourceDefinition {
    return {
      protocol: 'conversations',
      path: 'create_conversation',
      name: 'create_conversation',
      description: 'Creates a new conversation',
      handler: async (params: Record<string, unknown>) => {
        const interfaceType = params['interfaceType'] ? String(params['interfaceType']) : '';
        const roomId = params['roomId'] ? String(params['roomId']) : '';

        const conversationId = await context.createConversation(
          interfaceType as 'cli' | 'matrix',
          roomId,
        );

        return { conversationId };
      },
    };
  }

  /**
   * Create the add_turn tool
   */
  private addTurnTool(context: ConversationContext): ResourceDefinition {
    return {
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

        const turnId = await context.addTurn(
          conversationId,
          query,
          response,
          { userId, userName, metadata },
        );

        return { turnId };
      },
    };
  }

  /**
   * Create the summarize_conversation tool
   */
  private summarizeConversationTool(context: ConversationContext): ResourceDefinition {
    return {
      protocol: 'conversations',
      path: 'summarize_conversation',
      name: 'summarize_conversation',
      description: 'Forces summarization of a conversation',
      handler: async (params: Record<string, unknown>) => {
        const conversationId = params['conversationId'] ? String(params['conversationId']) : '';
        const success = await context.forceSummarize(conversationId);

        return { success };
      },
    };
  }

  /**
   * Create the get_conversation_history tool
   */
  private getConversationHistoryTool(
    context: ConversationContext,
    _formatter: ConversationFormatter,
    _anchorName: string,
    _anchorId?: string,
  ): ResourceDefinition {
    return {
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

        const history = await context.getConversationHistory(conversationId, {
          format: format as 'text' | 'markdown' | 'json' | 'html',
          maxTurns,
          includeSummaries,
          includeTimestamps,
          includeMetadata,
        });

        return { history };
      },
    };
  }

  /**
   * Create the search_conversations tool
   */
  private searchConversationsTool(context: ConversationContext): ResourceDefinition {
    return {
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

        const results = await context.findConversations({
          query,
          interfaceType: interfaceType as 'cli' | 'matrix' | undefined,
          roomId,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          limit,
        });

        return { results };
      },
    };
  }

  /**
   * Create the export_conversation tool
   */
  private exportConversationTool(
    storageAdapter: ConversationStorageAdapter,
    formatter: ConversationFormatter,
    _mcpFormatter: ConversationMcpFormatter,
    anchorName: string,
    anchorId?: string,
  ): ResourceDefinition {
    return {
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
        const conversation = await storageAdapter.read(conversationId);
        if (!conversation) {
          throw new Error(`Conversation with ID ${conversationId} not found`);
        }

        // Get turns and possibly summaries
        const turns = await storageAdapter.getTurns(conversationId);
        let summaries: ConversationSummary[] = [];
        if (includeSummaries) {
          summaries = await storageAdapter.getSummaries(conversationId);
        }

        // Format options
        const options: FormattingOptions = {
          format: format as 'text' | 'markdown' | 'json' | 'html',
          includeMetadata,
          includeTimestamps,
          anchorName,
          anchorId,
          highlightAnchor: true,
        };

        // Format conversation
        const formatted = formatter.formatConversation(turns, summaries, options);

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
    };
  }
}