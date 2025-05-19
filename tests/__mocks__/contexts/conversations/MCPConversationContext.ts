import type { MCPConversationContextOptions } from '@/contexts/conversations/MCPConversationContext';
import type { TieredHistory } from '@/contexts/conversations/memory/tieredMemoryManager';
import type { ConversationSummary } from '@/contexts/conversations/storage/conversationStorage';
import type { Conversation, ConversationTurn } from '@/protocol/schemas/conversationSchemas';

/**
 * Mock implementation of MCPConversationContext for testing
 */
export class MockMCPConversationContext {
  private static instance: MockMCPConversationContext | null = null;
  private conversations: Map<string, Conversation> = new Map();
  private activeConversationId?: string;

  private constructor(_options?: MCPConversationContextOptions) {
    // Options are not used in the mock implementation
    // Initialize with empty conversations map
  }

  public static getInstance(options?: MCPConversationContextOptions): MockMCPConversationContext {
    if (!MockMCPConversationContext.instance) {
      MockMCPConversationContext.instance = new MockMCPConversationContext(options);
    }
    return MockMCPConversationContext.instance;
  }

  public static resetInstance(): void {
    MockMCPConversationContext.instance = null;
  }

  public static createFresh(options?: MCPConversationContextOptions): MockMCPConversationContext {
    return new MockMCPConversationContext(options);
  }

  // Mock conversation methods
  public async createConversation(title?: string): Promise<Conversation> {
    const conversation: Conversation = {
      id: `mock-conversation-${Date.now()}`,
      activeTurns: [],
      summaries: [],
      archivedTurns: [],
      roomId: `mock-room-${Date.now()}`,
      interfaceType: 'cli',
      metadata: { title: title || 'Mock Conversation' },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.conversations.set(conversation.id, conversation);
    this.activeConversationId = conversation.id;
    return conversation;
  }

  public async getConversation(id: string): Promise<Conversation> {
    const conversation = this.conversations.get(id);
    if (!conversation) {
      throw new Error(`Conversation ${id} not found`);
    }
    return conversation;
  }

  public async updateConversation(id: string, updates: Partial<Conversation>): Promise<void> {
    const conversation = this.conversations.get(id);
    if (conversation) {
      Object.assign(conversation, updates, { updatedAt: new Date() });
    }
  }

  public async deleteConversation(id: string): Promise<void> {
    this.conversations.delete(id);
    if (this.activeConversationId === id) {
      this.activeConversationId = undefined;
    }
  }

  public async listConversations(): Promise<Conversation[]> {
    return Array.from(this.conversations.values());
  }

  // Mock message methods
  public async addMessage(conversationId: string, message: { query: string; response: string; userId?: string; userName?: string }): Promise<ConversationTurn> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }
    
    const turn: ConversationTurn = {
      id: `turn-${Date.now()}`,
      query: message.query,
      response: message.response,
      timestamp: new Date(),
      userId: message.userId,
      userName: message.userName,
    };
    
    conversation.activeTurns.push(turn);
    conversation.updatedAt = new Date();
    
    return turn;
  }

  public async getActiveConversation(): Promise<Conversation> {
    if (!this.activeConversationId) {
      throw new Error('No active conversation');
    }
    const conversation = this.conversations.get(this.activeConversationId);
    if (!conversation) {
      throw new Error('Active conversation not found');
    }
    return conversation;
  }

  public setActiveConversation(id: string): void {
    this.activeConversationId = id;
  }

  // Mock tool methods removed - not part of MCP implementation

  // Mock memory methods
  public getTieredHistory(): TieredHistory {
    if (!this.activeConversationId) {
      return {
        activeTurns: [],
        summaries: [],
        archivedTurns: [],
      };
    }
    
    const conversation = this.conversations.get(this.activeConversationId);
    if (!conversation) {
      return {
        activeTurns: [],
        summaries: [],
        archivedTurns: [],
      };
    }
    
    // Create proper ConversationSummary objects
    // The conversation uses schema ConversationSummary type, not storage type
    const summaries: ConversationSummary[] = (conversation.summaries || []).map((s, i: number) => ({
      id: s.id || `summary-${i}`,
      conversationId: this.activeConversationId!,
      content: s.content || '',
      createdAt: s.timestamp || new Date(),
      metadata: s.metadata,
      // Optional fields - map from schema type to storage type
      ...(s.startTurnIndex !== undefined && { startTurnId: `turn-${s.startTurnIndex}` }),
      ...(s.endTurnIndex !== undefined && { endTurnId: `turn-${s.endTurnIndex}` }),
      ...(s.turnCount && { turnCount: s.turnCount }),
    }));
    
    return {
      activeTurns: conversation.activeTurns || [],
      summaries,
      archivedTurns: conversation.archivedTurns || [],
    };
  }

  public formatHistoryForPrompt(): string {
    return 'Mock conversation history';
  }

  public getFlatHistory(): ConversationTurn[] {
    if (!this.activeConversationId) return [];
    const conversation = this.conversations.get(this.activeConversationId);
    return conversation?.activeTurns || [];
  }

  // Mock context methods
  public async handleMessage(message: unknown): Promise<unknown> {
    return {
      success: true,
      action: (message as { action?: string })?.action,
      data: null,
    };
  }

  public getMessagingSchema(): Record<string, unknown> {
    return {
      conversation: {},
    };
  }

  public async clearContext(): Promise<void> {
    this.conversations.clear();
    this.activeConversationId = undefined;
  }

  // Mock utility methods
  public async searchConversations(query: string): Promise<Conversation[]> {
    return Array.from(this.conversations.values())
      .filter(c => {
        const title = c.metadata?.['title'] as string;
        return title && title.toLowerCase().includes(query.toLowerCase());
      });
  }

  public async summarizeConversation(id: string): Promise<string> {
    return `Summary of conversation ${id}`;
  }

  public async getConversationTags(id: string): Promise<string[]> {
    const conversation = this.conversations.get(id);
    return (conversation?.metadata?.['tags'] as string[]) || [];
  }

  public async updateConversationTags(id: string, tags: string[]): Promise<void> {
    const conversation = this.conversations.get(id);
    if (conversation) {
      if (!conversation.metadata) {
        conversation.metadata = {};
      }
      conversation.metadata['tags'] = tags;
      conversation.updatedAt = new Date();
    }
  }
}