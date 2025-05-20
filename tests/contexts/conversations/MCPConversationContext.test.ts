/**
 * Tests for MCPConversationContext
 * 
 * These tests focus purely on behavior rather than implementation details.
 * The goal is to verify WHAT the context does, not HOW it does it.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, test } from 'bun:test';

import type { 
  ConversationNotifier,
  ConversationStorage,
} from '@/contexts/conversations';
import { MCPConversationContext } from '@/contexts/conversations/MCPConversationContext';
import { ConversationSummarizer } from '@/contexts/conversations/memory/summarizer';
import { TieredMemoryManager } from '@/contexts/conversations/memory/tieredMemoryManager';
import type { Conversation, ConversationTurn } from '@/protocol/schemas/conversationSchemas';
import { ResourceRegistry } from '@/resources';

// Helper to create a test conversation context
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
      return `summary-${Date.now()}`;
    },
    getSummaries: async (conversationId: string) => {
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
    data: unknown;
  }> = [];
  const mockNotifier: ConversationNotifier = {
    notifyConversationStarted: async (conversation: Conversation) => {
      notifications.push({ type: 'started', data: conversation });
    },
    notifyConversationCleared: async () => {
      notifications.push({ type: 'cleared', data: null });
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
    // Also reset singletons to prevent interference between tests
    TieredMemoryManager.resetInstance();
    ConversationSummarizer.resetInstance();
    ResourceRegistry.resetInstance();
  });

  describe('Creating and Managing Conversations', () => {
    test('creates conversations with titles and retrieves them', async () => {
      const { context } = createTestableConversationContext();
      await context.initialize();

      // Create conversation with title
      const conversationId = await context.createConversation('Project Discussion');
      expect(conversationId).toBeDefined();
      expect(typeof conversationId).toBe('string');
      
      // Retrieve the conversation
      const conversation = await context.getConversation(conversationId);
      expect(conversation).toBeDefined();
      expect(conversation?.metadata?.['title']).toBe('Project Discussion');
    });

    test('creates conversations with default titles when none provided', async () => {
      const { context } = createTestableConversationContext();
      await context.initialize();

      const conversationId = await context.createConversation();
      const conversation = await context.getConversation(conversationId);
      
      expect(conversation?.metadata?.['title']).toContain('Conversation');
      expect(conversation?.metadata?.['title']).toContain(new Date().toLocaleDateString());
    });

    test('updates and retrieves conversation metadata', async () => {
      const { context } = createTestableConversationContext();
      await context.initialize();

      const conversationId = await context.createConversation('Original Title');
      
      // Update conversation
      const success = await context.updateConversation(conversationId, {
        metadata: { title: 'Updated Title', category: 'important' },
      });
      expect(success).toBe(true);
      
      // Verify updates
      const updated = await context.getConversation(conversationId);
      expect(updated?.metadata?.['title']).toBe('Updated Title');
      expect(updated?.metadata?.['category']).toBe('important');
    });

    test('deletes conversations and confirms they no longer exist', async () => {
      const { context } = createTestableConversationContext();
      await context.initialize();

      const conversationId = await context.createConversation('To Delete');
      
      // Delete conversation
      const deleted = await context.deleteConversation(conversationId);
      expect(deleted).toBe(true);
      
      // Verify it's gone
      const retrieved = await context.getConversation(conversationId);
      expect(retrieved).toBeNull();
    });

    test('lists and paginates conversations', async () => {
      const { context } = createTestableConversationContext();
      await context.initialize();

      // Create multiple conversations
      const ids = [];
      for (let i = 1; i <= 5; i++) {
        const id = await context.createConversation(`Conversation ${i}`);
        ids.push(id);
      }
      
      // List all
      const all = await context.listConversations();
      expect(all.total).toBe(5);
      expect(all.conversations).toHaveLength(5);
      
      // Paginate
      const page1 = await context.listConversations({ limit: 2, offset: 0 });
      const page2 = await context.listConversations({ limit: 2, offset: 2 });
      
      expect(page1.conversations).toHaveLength(2);
      expect(page2.conversations).toHaveLength(2);
    });
  });

  describe('Managing Active Conversation', () => {
    test('tracks and updates active conversation', async () => {
      const { context } = createTestableConversationContext();
      await context.initialize();

      const conversationId = await context.createConversation('Active Chat');
      
      // Initially no active conversation
      expect(context.getActiveConversationId()).toBeNull();
      
      // Set active conversation
      context.setActiveConversation(conversationId);
      expect(context.getActiveConversationId()).toBe(conversationId);
      
      // Active conversation is cleared when deleted
      await context.deleteConversation(conversationId);
      expect(context.getActiveConversationId()).toBeNull();
    });
  });

  describe('Message History Management', () => {
    test('adds messages to conversations and retrieves history', async () => {
      const { context } = createTestableConversationContext();
      await context.initialize();

      const conversationId = await context.createConversation('Chat');
      
      // Add message
      const message = await context.addMessage(conversationId, {
        query: 'Hello, world!',
        response: 'Hi there!',
        userId: 'test-user',
      });
      
      expect(message.id).toBeDefined();
      expect(message.query).toBe('Hello, world!');
      expect(message.response).toBe('Hi there!');
      expect(message.timestamp).toBeDefined();
      
      // Retrieve history
      const history = await context.formatHistoryForPrompt(conversationId);
      expect(history).toContain('Hello, world!');
      expect(history).toContain('Hi there!');
    });

    test('retrieves flat history combining summaries and active turns', async () => {
      const { context } = createTestableConversationContext();
      await context.initialize();

      const conversationId = await context.createConversation('History Test');
      
      // Add multiple messages
      for (let i = 1; i <= 3; i++) {
        await context.addMessage(conversationId, { 
          query: `Question ${i}`, 
          response: `Answer ${i}`,
        });
      }
      
      const flatHistory = await context.getFlatHistory(conversationId);
      
      expect(Array.isArray(flatHistory)).toBe(true);
      expect(flatHistory.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Search and Query Features', () => {
    test('searches conversations by title', async () => {
      const { context } = createTestableConversationContext();
      await context.initialize();

      await context.createConversation('Project Alpha');
      await context.createConversation('Project Beta');
      await context.createConversation('Random Chat');
      
      const results = await context.searchConversations('project');
      
      expect(results).toHaveLength(2);
      expect(results.every(conv => 
        conv.metadata?.['title']?.toString().toLowerCase().includes('project'),
      )).toBe(true);
    });

    test('searches with limit', async () => {
      const { context } = createTestableConversationContext();
      await context.initialize();

      // Create multiple matching conversations
      for (let i = 1; i <= 5; i++) {
        await context.createConversation(`Project ${i}`);
      }
      
      const results = await context.searchConversations('project', { limit: 3 });
      expect(results).toHaveLength(3);
    });
  });

  describe('Export Functionality', () => {
    test('exports conversation as JSON', async () => {
      const { context } = createTestableConversationContext();
      await context.initialize();

      const conversationId = await context.createConversation('Export Test');
      await context.addMessage(conversationId, {
        query: 'Test question',
        response: 'Test answer',
        userId: 'test-user',
      });
      
      const json = await context.exportConversation(conversationId, 'json');
      const parsed = JSON.parse(json);
      
      expect(parsed.conversation.metadata?.['title']).toBe('Export Test');
      expect(parsed.turns).toHaveLength(1);
      expect(parsed.turns[0].response).toBe('Test answer');
    });

    test('exports conversation as markdown', async () => {
      const { context } = createTestableConversationContext();
      await context.initialize();

      const conversationId = await context.createConversation('Markdown Export');
      await context.addMessage(conversationId, {
        query: 'Test question',
        response: 'Test answer',
        userId: 'test-user',
      });
      
      const markdown = await context.exportConversation(conversationId, 'markdown');
      
      expect(markdown).toContain('# Markdown Export');
      expect(markdown).toContain('## User');
      expect(markdown).toContain('Test question');
      expect(markdown).toContain('## Assistant');
      expect(markdown).toContain('Test answer');
    });

    test('handles export errors gracefully', async () => {
      const { context } = createTestableConversationContext();
      await context.initialize();

      // Try to export non-existent conversation
      await expect(context.exportConversation('non-existent')).rejects.toThrow();
    });
  });

  describe('MCP Server Integration', () => {
    test('registers with MCP server and provides capabilities', async () => {
      const { context } = createTestableConversationContext();
      await context.initialize();

      const registrations = { tools: 0, resources: 0 };
      const mockServer = {
        tool: () => { registrations.tools++; },
        resource: () => { registrations.resources++; },
      } as unknown as McpServer;

      const success = context.registerOnServer(mockServer);
      
      expect(success).toBe(true);
      expect(registrations.tools).toBeGreaterThan(0);
      expect(registrations.resources).toBeGreaterThan(0);
      
      // Verify capabilities
      const capabilities = context.getCapabilities();
      expect(capabilities.tools.length).toBeGreaterThan(0);
      expect(capabilities.resources.length).toBeGreaterThan(0);
      expect(capabilities.features).toContain('conversation-management');
      expect(capabilities.features).toContain('message-history');
    });

    test('handles server registration errors gracefully', async () => {
      const { context } = createTestableConversationContext();
      await context.initialize();

      const errorServer = {
        tool: () => { throw new Error('Registration error'); },
        resource: () => {},
      } as unknown as McpServer;

      const success = context.registerOnServer(errorServer);
      expect(success).toBe(false);
    });
  });

  describe('System Status and Cleanup', () => {
    test('provides system status information', async () => {
      const { context } = createTestableConversationContext({
        name: 'CustomConversation',
        version: '2.0.0',
      });

      expect(context.getContextName()).toBe('CustomConversation');
      expect(context.getContextVersion()).toBe('2.0.0');
      
      // Status before and after initialization
      const preInitStatus = context.getStatus();
      expect(preInitStatus.ready).toBe(false);
      
      await context.initialize();
      
      const postInitStatus = context.getStatus();
      expect(postInitStatus.ready).toBe(true);
    });

    test('cleans up resources properly', async () => {
      const { context } = createTestableConversationContext();
      await context.initialize();

      expect(context.isReady()).toBe(true);
      
      await context.cleanup();
      
      expect(context.isReady()).toBe(false);
      
      // Should not be able to access resources after cleanup
      expect(() => context.getMcpServer()).toThrow();
    });
  });
});