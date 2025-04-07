/**
 * Conversation Resources for MCP
 * 
 * This file contains the resource definitions for the ConversationContext
 * extracted to follow the single responsibility principle.
 */


import type { ConversationStorageAdapter } from '@/mcp/contexts/conversations/adapters/conversationStorageAdapter';
import type { ConversationContext } from '@/mcp/contexts/conversations/core/conversationContext';
import type { ConversationMcpFormatter } from '@/mcp/contexts/conversations/formatters/conversationMcpFormatter';
import type { ResourceDefinition } from '@/mcp/contexts/core/contextInterface';

/**
 * Service responsible for providing MCP resources for conversations
 */
export class ConversationResourceService {
  /**
   * Get MCP resources for Conversation Context
   * 
   * @param context The conversation context instance
   * @returns Array of MCP resources
   */
  getResources(context: ConversationContext): ResourceDefinition[] {
    const storageAdapter = context.getStorage();
    const mcpFormatter = context.getMcpFormatter();

    return [
      // conversations://list
      this.createListResource(storageAdapter),
      
      // conversations://get/:id
      this.createGetResource(storageAdapter, mcpFormatter),
      
      // conversations://search
      this.createSearchResource(context),
      
      // conversations://room/:roomId
      this.createRoomResource(context),
      
      // conversations://recent
      this.createRecentResource(context),
      
      // conversations://turns/:id
      this.createTurnsResource(storageAdapter, mcpFormatter),
      
      // conversations://summaries/:id
      this.createSummariesResource(storageAdapter, mcpFormatter),
    ];
  }

  /**
   * Create list resource
   */
  private createListResource(adapter: ConversationStorageAdapter): ResourceDefinition {
    return {
      protocol: 'conversations',
      path: 'list',
      handler: async (_params: Record<string, unknown>, query: Record<string, unknown> = {}) => {
        const limit = query['limit'] !== undefined ? String(query['limit']) : undefined;
        const offset = query['offset'] !== undefined ? String(query['offset']) : undefined;
        const interfaceType = query['interfaceType'] !== undefined ? String(query['interfaceType']) : undefined;

        return adapter.findConversations({
          limit: limit ? parseInt(limit, 10) : undefined,
          offset: offset ? parseInt(offset, 10) : undefined,
          interfaceType: interfaceType as 'cli' | 'matrix' | undefined,
        });
      },
    };
  }

  /**
   * Create get resource
   */
  private createGetResource(
    adapter: ConversationStorageAdapter, 
    formatter: ConversationMcpFormatter,
  ): ResourceDefinition {
    return {
      protocol: 'conversations',
      path: 'get/:id',
      handler: async (params: Record<string, unknown>) => {
        const conversationId = params['id'] ? String(params['id']) : '';
        if (!conversationId) {
          throw new Error('Conversation ID is required');
        }

        const conversation = await adapter.read(conversationId);
        if (!conversation) {
          throw new Error(`Conversation with ID ${conversationId} not found`);
        }

        const turns = await adapter.getTurns(conversationId);
        const summaries = await adapter.getSummaries(conversationId);

        // Format the response using the MCP formatter for better structure
        return formatter.formatConversationForMcp(
          conversation,
          turns,
          summaries,
          {
            includeFullTurns: true,
            includeFullMetadata: false,
          },
        );
      },
    };
  }

  /**
   * Create search resource
   */
  private createSearchResource(context: ConversationContext): ResourceDefinition {
    return {
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

        const conversations = await context.findConversations({
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
    };
  }

  /**
   * Create room resource
   */
  private createRoomResource(context: ConversationContext): ResourceDefinition {
    return {
      protocol: 'conversations',
      path: 'room/:roomId',
      handler: async (params: Record<string, unknown>, query: Record<string, unknown> = {}) => {
        const roomId = params['roomId'] ? String(params['roomId']) : '';
        const interfaceType = query['interfaceType'] !== undefined ? String(query['interfaceType']) : undefined;

        if (!roomId) {
          throw new Error('Room ID is required');
        }

        return context.getConversationsByRoom(roomId, interfaceType as 'cli' | 'matrix' | undefined);
      },
    };
  }

  /**
   * Create recent resource
   */
  private createRecentResource(context: ConversationContext): ResourceDefinition {
    return {
      protocol: 'conversations',
      path: 'recent',
      handler: async (_params: Record<string, unknown>, query: Record<string, unknown> = {}) => {
        const limit = query['limit'] !== undefined ? String(query['limit']) : undefined;
        const interfaceType = query['interfaceType'] !== undefined ? String(query['interfaceType']) : undefined;

        return context.getRecentConversations(
          limit ? parseInt(limit, 10) : undefined,
          interfaceType as 'cli' | 'matrix' | undefined,
        );
      },
    };
  }

  /**
   * Create turns resource
   */
  private createTurnsResource(
    adapter: ConversationStorageAdapter, 
    formatter: ConversationMcpFormatter,
  ): ResourceDefinition {
    return {
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

        const turns = await adapter.getTurns(
          conversationId,
          limit ? parseInt(limit, 10) : undefined,
          offset ? parseInt(offset, 10) : undefined,
        );

        // Format using the MCP formatter
        return formatter.formatTurnsForMcp(
          conversationId,
          turns,
          { includeFullMetadata: includeMetadata },
        );
      },
    };
  }

  /**
   * Create summaries resource
   */
  private createSummariesResource(
    adapter: ConversationStorageAdapter, 
    formatter: ConversationMcpFormatter,
  ): ResourceDefinition {
    return {
      protocol: 'conversations',
      path: 'summaries/:id',
      handler: async (params: Record<string, unknown>, query: Record<string, unknown> = {}) => {
        const conversationId = params['id'] ? String(params['id']) : '';
        const includeMetadata = query['metadata'] === 'true';

        if (!conversationId) {
          throw new Error('Conversation ID is required');
        }

        const summaries = await adapter.getSummaries(conversationId);

        // Format using the MCP formatter
        return formatter.formatSummariesForMcp(
          conversationId,
          summaries,
          { includeFullMetadata: includeMetadata },
        );
      },
    };
  }
}