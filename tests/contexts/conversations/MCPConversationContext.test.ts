import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, mock, test } from 'bun:test';

import type { 
  ConversationNotifier,
  ConversationStorage,
} from '@/contexts/conversations';
import { MCPConversationContext } from '@/contexts/conversations/MCPConversationContext';
import type { Conversation, ConversationTurn } from '@/protocol/schemas/conversationSchemas';

// Test helpers for creating testable conversation contexts
function createTestableConversationContext(overrides?: Partial<{
  name: string;
  version: string;
  storage: ConversationStorage;
  notifier: ConversationNotifier;
}>) {
  // Mock storage
  const conversations = new Map<string, Conversation>();
  const turns = new Map<string, ConversationTurn[]>();
  
  const mockStorage: ConversationStorage = {
    createConversation: async (conversation) => {
      const id = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const fullConversation: Conversation = {
        id,
        interfaceType: conversation.interfaceType,
        roomId: conversation.roomId,
        createdAt: conversation.startedAt,
        updatedAt: conversation.updatedAt,
        metadata: conversation.metadata || {},
        activeTurns: [],
        summaries: [],
        archivedTurns: [],
      };
      conversations.set(id, fullConversation);
      turns.set(id, []);
      return id;
    },
    getConversation: async (id: string) => conversations.get(id) || null,
    getConversationByRoom: async (roomId: string) => {
      for (const [id, conv] of conversations) {
        if (conv.roomId === roomId) return id;
      }
      return null;
    },
    updateConversation: async (id: string, updates: Partial<Conversation>) => {
      const conv = conversations.get(id);
      if (!conv) return false;
      Object.assign(conv, updates);
      return true;
    },
    deleteConversation: async (id: string) => {
      const exists = conversations.has(id);
      conversations.delete(id);
      turns.delete(id);
      return exists;
    },
    addTurn: async (conversationId: string, turn: ConversationTurn) => {
      const conversationTurns = turns.get(conversationId) || [];
      turn.id = `turn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      conversationTurns.push(turn);
      turns.set(conversationId, conversationTurns);
      return turn.id;
    },
    getTurns: async (conversationId: string, limit?: number, offset?: number) => {
      const conversationTurns = turns.get(conversationId) || [];
      const start = offset || 0;
      const end = limit ? start + limit : conversationTurns.length;
      return conversationTurns.slice(start, end);
    },
    updateTurn: async (turnId: string, updates: Partial<ConversationTurn>) => {
      for (const conversationTurns of turns.values()) {
        const turn = conversationTurns.find(t => t.id === turnId);
        if (turn) {
          Object.assign(turn, updates);
          return true;
        }
      }
      return false;
    },
    addSummary: async (_conversationId: string, _summary: unknown) => {
      // Mock implementation
      return `summary-${Date.now()}`;
    },
    getSummaries: async (conversationId: string) => {
      // Mock implementation
      return [{
        id: 'summary-1',
        conversationId,
        content: 'Conversation summary',
        createdAt: new Date(),
      }];
    },
    findConversations: async (criteria) => {
      const results: Array<{
        id: string;
        interfaceType: 'cli' | 'matrix';
        roomId: string;
        startedAt: Date;
        updatedAt: Date;
        turnCount: number;
        metadata?: Record<string, unknown>;
      }> = [];
      for (const [id, conv] of conversations) {
        if (criteria.query && !conv.metadata?.['title']?.toString().toLowerCase().includes(criteria.query.toLowerCase())) {
          continue;
        }
        results.push({
          id,
          interfaceType: conv.interfaceType,
          roomId: conv.roomId,
          startedAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          turnCount: turns.get(id)?.length || 0,
          metadata: conv.metadata,
        });
      }
      
      const offset = criteria.offset || 0;
      const limit = criteria.limit || results.length;
      return results.slice(offset, offset + limit);
    },
    getRecentConversations: async (limit?: number) => {
      const all = Array.from(conversations.entries())
        .map(([id, conv]) => ({
          id,
          interfaceType: conv.interfaceType,
          roomId: conv.roomId,
          startedAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          turnCount: turns.get(id)?.length || 0,
          metadata: conv.metadata,
        }))
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      
      return limit ? all.slice(0, limit) : all;
    },
    updateMetadata: async (conversationId: string, metadata: Record<string, unknown>) => {
      const conv = conversations.get(conversationId);
      if (!conv) return false;
      conv.metadata = { ...conv.metadata, ...metadata };
      return true;
    },
    getMetadata: async (conversationId: string) => {
      const conv = conversations.get(conversationId);
      return conv?.metadata || null;
    },
  };


  // Mock notifier
  const notifications: Array<{
    type: string;
    conversation?: Conversation;
    conversationId?: string;
    messageId?: string;
  }> = [];
  const mockNotifier: ConversationNotifier = {
    notifyConversationStarted: async (conversation: Conversation) => {
      notifications.push({ type: 'started', conversation });
    },
    notifyConversationCleared: async () => {
      notifications.push({ type: 'cleared' });
    },
  } as unknown as ConversationNotifier;

  const options = {
    name: 'TestConversationContext',
    version: '1.0.0',
    storage: mockStorage,
    notifier: mockNotifier,
    ...overrides,
  };

  const context = MCPConversationContext.createFresh(options);

  return {
    context,
    storage: conversations,
    turns,
    notifications,
    options,
  };
}

describe('Conversation Management System', () => {
  beforeEach(() => {
    MCPConversationContext.resetInstance();
  });

  describe('System Status', () => {
    test('reports context information correctly', () => {
      const { context } = createTestableConversationContext({
        name: 'CustomConversationContext',
        version: '2.0.0',
      });

      expect(context.getContextName()).toBe('CustomConversationContext');
      expect(context.getContextVersion()).toBe('2.0.0');
    });

    test('initializes system components', async () => {
      const { context } = createTestableConversationContext();

      expect(context.isReady()).toBe(false);
      
      const result = await context.initialize();
      expect(result).toBe(true);
      expect(context.isReady()).toBe(true);
    });

    test('maintains initialization state across calls', async () => {
      const { context } = createTestableConversationContext();

      await context.initialize();
      const firstState = context.isReady();
      
      await context.initialize(); // Second call
      const secondState = context.isReady();
      
      expect(firstState).toBe(true);
      expect(secondState).toBe(true);
    });
  });

  describe('Conversation Operations', () => {
    test('creates conversations with titles', async () => {
      const { context, storage } = createTestableConversationContext();
      await context.initialize();

      const conversationId = await context.createConversation('Project Discussion');
      
      expect(conversationId).toBeDefined();
      expect(typeof conversationId).toBe('string');
      
      const conversation = storage.get(conversationId);
      expect(conversation).toBeDefined();
      expect(conversation?.metadata?.['title']).toBe('Project Discussion');
    });

    test('creates conversations with default titles', async () => {
      const { context, storage } = createTestableConversationContext();
      await context.initialize();

      const conversationId = await context.createConversation();
      const conversation = storage.get(conversationId);
      
      expect(conversation?.metadata?.['title']).toContain('Conversation');
      expect(conversation?.metadata?.['title']).toContain(new Date().toLocaleDateString());
    });

    test('retrieves conversations by ID', async () => {
      const { context } = createTestableConversationContext();
      await context.initialize();

      const conversationId = await context.createConversation('Test Conversation');
      const retrieved = await context.getConversation(conversationId);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(conversationId);
      expect(retrieved?.metadata?.['title']).toBe('Test Conversation');
    });

    test('updates conversation details', async () => {
      const { context } = createTestableConversationContext();
      await context.initialize();

      const conversationId = await context.createConversation('Original Title');
      
      const success = await context.updateConversation(conversationId, {
        metadata: { title: 'Updated Title', category: 'important' },
      });
      
      expect(success).toBe(true);
      
      const updated = await context.getConversation(conversationId);
      expect(updated?.metadata?.['title']).toBe('Updated Title');
      expect(updated?.metadata?.['category']).toBe('important');
    });

    test('deletes conversations', async () => {
      const { context } = createTestableConversationContext();
      await context.initialize();

      const conversationId = await context.createConversation('To Delete');
      
      const deleted = await context.deleteConversation(conversationId);
      expect(deleted).toBe(true);
      
      const retrieved = await context.getConversation(conversationId);
      expect(retrieved).toBeNull();
    });

    test('lists all conversations', async () => {
      const { context } = createTestableConversationContext();
      await context.initialize();

      const id1 = await context.createConversation('First');
      const id2 = await context.createConversation('Second');
      const id3 = await context.createConversation('Third');
      
      const result = await context.listConversations();
      
      expect(result.total).toBe(3);
      expect(result.conversations).toHaveLength(3);
      expect(result.conversations.map(c => c.id)).toContain(id1);
      expect(result.conversations.map(c => c.id)).toContain(id2);
      expect(result.conversations.map(c => c.id)).toContain(id3);
    });

    test('paginates conversation lists', async () => {
      const { context } = createTestableConversationContext();
      await context.initialize();

      // Create 5 conversations
      for (let i = 1; i <= 5; i++) {
        await context.createConversation(`Conversation ${i}`);
      }
      
      const page1 = await context.listConversations({ limit: 2, offset: 0 });
      const page2 = await context.listConversations({ limit: 2, offset: 2 });
      const page3 = await context.listConversations({ limit: 2, offset: 4 });
      
      expect(page1.conversations).toHaveLength(2);
      expect(page1.total).toBe(2);
      
      expect(page2.conversations).toHaveLength(2);
      expect(page2.total).toBe(2);
      
      expect(page3.conversations).toHaveLength(1);
      expect(page3.total).toBe(1);
    });
  });

  describe('Active Conversation Management', () => {
    test('tracks active conversation', async () => {
      const { context } = createTestableConversationContext();
      await context.initialize();

      const conversationId = await context.createConversation('Active Chat');
      
      expect(context.getActiveConversationId()).toBeNull();
      
      context.setActiveConversation(conversationId);
      expect(context.getActiveConversationId()).toBe(conversationId);
    });

    test('clears active conversation when deleted', async () => {
      const { context } = createTestableConversationContext();
      await context.initialize();

      const conversationId = await context.createConversation('To Delete');
      context.setActiveConversation(conversationId);
      
      expect(context.getActiveConversationId()).toBe(conversationId);
      
      await context.deleteConversation(conversationId);
      expect(context.getActiveConversationId()).toBeNull();
    });
  });

  describe('Message Management', () => {
    test('adds messages to conversations', async () => {
      const { context } = createTestableConversationContext();
      await context.initialize();

      const conversationId = await context.createConversation('Chat');
      
      const message = await context.addMessage(conversationId, {
        query: 'Hello, world!',
        response: 'Hi there!',
        userId: 'test-user',
      });
      
      expect(message.id).toBeDefined();
      expect(message.query).toBe('Hello, world!');
      expect(message.response).toBe('Hi there!');
      expect(message.userId).toBe('test-user');
      expect(message.timestamp).toBeDefined();
    });
  });

  describe('Search and Query Operations', () => {
    test('searches conversations by title', async () => {
      const { context } = createTestableConversationContext();
      await context.initialize();

      await context.createConversation('Project Alpha');
      await context.createConversation('Project Beta');
      await context.createConversation('Random Chat');
      
      const results = await context.searchConversations('project');
      
      expect(results).toHaveLength(2);
      expect(results.every(conv => conv.metadata?.['title']?.toString().toLowerCase().includes('project'))).toBe(true);
    });

    test('searches with limit', async () => {
      const { context } = createTestableConversationContext();
      await context.initialize();

      for (let i = 1; i <= 5; i++) {
        await context.createConversation(`Project ${i}`);
      }
      
      const results = await context.searchConversations('project', { limit: 3 });
      
      expect(results).toHaveLength(3);
    });

    test('generates embeddings for conversation', async () => {
      const { context } = createTestableConversationContext();
      await context.initialize();

      const conversationId = await context.createConversation('Test Chat');
      
      const result = await context.generateEmbeddingsForConversation(conversationId);
      
      expect(result.updated).toBe(0);
      expect(result.failed).toBe(0);
    });

    test('gets conversation summary', async () => {
      const { context } = createTestableConversationContext();
      await context.initialize();

      const conversationId = await context.createConversation('Test Chat');
      
      const summary = await context.getSummary(conversationId);
      
      expect(summary).toBe('Conversation summary');
    });
  });

  describe('Export Operations', () => {
    test('exports conversation as JSON', async () => {
      const { context } = createTestableConversationContext();
      await context.initialize();

      const conversationId = await context.createConversation('Export Test');
      await context.addMessage(conversationId, {
        query: 'Test question',
        response: 'Test message',
        userId: 'test-user',
      });
      
      const json = await context.exportConversation(conversationId, 'json');
      const parsed = JSON.parse(json);
      
      expect(parsed.conversation.metadata?.['title']).toBe('Export Test');
      expect(parsed.turns).toHaveLength(1);
      expect(parsed.turns[0].response).toBe('Test message');
    });

    test('exports conversation as markdown', async () => {
      const { context } = createTestableConversationContext();
      await context.initialize();

      const conversationId = await context.createConversation('Export Test');
      await context.addMessage(conversationId, {
        query: 'Test question',
        response: 'Test message',
        userId: 'test-user',
      });
      
      const markdown = await context.exportConversation(conversationId, 'markdown');
      
      expect(markdown).toContain('# Export Test');
      expect(markdown).toContain('## User');
      expect(markdown).toContain('Test question');
      expect(markdown).toContain('## Assistant');
      expect(markdown).toContain('Test message');
    });

    test('throws error when exporting non-existent conversation', async () => {
      const { context } = createTestableConversationContext();
      await context.initialize();

      await expect(context.exportConversation('non-existent')).rejects.toThrow();
    });
  });

  describe('Notification System', () => {
    test('notifies on conversation creation', async () => {
      const { context, notifications } = createTestableConversationContext();
      await context.initialize();

      await context.createConversation('New Chat');
      
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('started');
      expect(notifications[0].conversation?.metadata?.['title']).toBe('New Chat');
    });

    test('notifies on conversation update', async () => {
      const { context, notifications } = createTestableConversationContext();
      await context.initialize();

      const conversationId = await context.createConversation('Chat');
      notifications.length = 0; // Clear creation notification
      
      await context.updateConversation(conversationId, { 
        metadata: { title: 'Updated Chat' }, 
      });
      
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('started');
      expect(notifications[0].conversation?.metadata?.['title']).toBe('Updated Chat');
    });

    test('notifies on message addition', async () => {
      const { context, notifications } = createTestableConversationContext();
      await context.initialize();

      const conversationId = await context.createConversation('Chat');
      notifications.length = 0; // Clear creation notification
      
      await context.addMessage(conversationId, {
        query: 'Hello',
        response: 'Hi there!',
        userId: 'test-user',
      });
      
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('started');
    });
  });

  describe('MCP Server Integration', () => {
    test('registers conversation tools with MCP server', async () => {
      const { context } = createTestableConversationContext();
      await context.initialize();

      const toolsAdded: Array<{
        name: string;
        description: string;
        handler: unknown;
      }> = [];
      const mockServer = {
        tool: (name: string, description: string, handler: unknown) => {
          toolsAdded.push({ name, description, handler });
        },
        resource: mock(() => {}),
      } as unknown as McpServer;

      const success = context.registerOnServer(mockServer);
      
      expect(success).toBe(true);
      expect(toolsAdded.length).toBeGreaterThan(0);
      expect(toolsAdded[0].name).toBe('create_conversation');
    });

    test('handles server registration errors gracefully', async () => {
      const { context } = createTestableConversationContext();
      await context.initialize();

      const mockServer = {
        tool: () => { throw new Error('Server error'); },
        resource: () => {},
      } as unknown as McpServer;

      const success = context.registerOnServer(mockServer);
      
      expect(success).toBe(false);
    });

    test('can retrieve registered MCP server', async () => {
      const { context } = createTestableConversationContext();
      await context.initialize();

      const mockServer = {
        tool: mock(() => {}),
        resource: mock(() => {}),
      } as unknown as McpServer;

      context.registerOnServer(mockServer);
      const retrievedServer = context.getMcpServer();
      
      expect(retrievedServer).toBe(mockServer);
    });
  });

  describe('Context Capabilities', () => {
    test('provides complete capability information', async () => {
      const { context } = createTestableConversationContext();
      await context.initialize();

      const capabilities = context.getCapabilities();
      
      expect(capabilities.resources).toHaveLength(1);
      expect(capabilities.tools).toHaveLength(4);
      expect(capabilities.features).toContain('conversation-management');
      expect(capabilities.features).toContain('message-history');
      expect(capabilities.features).toContain('summaries');
      expect(capabilities.features).toContain('embeddings');
    });

    test('returns correct context status', async () => {
      const { context } = createTestableConversationContext();
      
      const preInitStatus = context.getStatus();
      expect(preInitStatus.ready).toBe(false);
      expect(preInitStatus.name).toBe('TestConversationContext');
      expect(preInitStatus.version).toBe('1.0.0');
      
      await context.initialize();
      
      const postInitStatus = context.getStatus();
      expect(postInitStatus.ready).toBe(true);
      expect(postInitStatus['activeConversationId']).toBeNull();
      expect(postInitStatus['resourceCount']).toBe(1);
      expect(postInitStatus['toolCount']).toBe(4);
    });
  });

  describe('Cleanup Operations', () => {
    test('cleans up context resources', async () => {
      const { context } = createTestableConversationContext();
      await context.initialize();

      await context.cleanup();
      
      expect(context.isReady()).toBe(false);
      
      // Should throw error when accessing MCP server after cleanup
      expect(() => context.getMcpServer()).toThrow();
    });
  });
});