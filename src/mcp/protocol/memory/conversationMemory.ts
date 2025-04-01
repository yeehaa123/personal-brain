/**
 * ConversationMemory class for managing conversation history
 */
import { getEnv } from '@/utils/configUtils';
import type {
  Conversation,
  ConversationMemoryOptions,
  ConversationTurn,
} from '../schemas/conversationSchemas';
import { ConversationMemoryOptionsSchema } from '../schemas/conversationSchemas';
import type { ConversationMemoryStorage } from '../schemas/conversationMemoryStorage';
import { InMemoryStorage } from './inMemoryStorage';

/**
 * ConversationMemory class that manages conversation history with
 * pluggable storage backend and Anchor recognition
 */
export class ConversationMemory {
  private storage: ConversationMemoryStorage;
  private options: ConversationMemoryOptions;
  private currentConversationId: string | null = null;
  private anchorId: string | null = null;
  private anchorName: string;
  private interfaceType: 'cli' | 'matrix';

  /**
   * Create a new ConversationMemory instance
   * @param storage Storage adapter to use (defaults to InMemoryStorage)
   * @param options Configuration options
   * @param interfaceType The interface type ('cli' or 'matrix')
   */
  constructor(
    interfaceType: 'cli' | 'matrix',
    storage?: ConversationMemoryStorage,
    options?: Partial<ConversationMemoryOptions>,
  ) {
    // Store the interface type
    this.interfaceType = interfaceType;
    
    // Use provided storage or create in-memory storage as default
    this.storage = storage || new InMemoryStorage();
    
    // Parse and validate options with defaults from the schema
    this.options = ConversationMemoryOptionsSchema.parse(options || {});
    
    // Initialize anchor information from environment/options
    this.initializeAnchorInfo();
    
    // Store anchor name from options
    this.anchorName = this.options.anchorName;
  }

  /**
   * Initialize anchor information from environment variables and options
   */
  private initializeAnchorInfo(): void {
    // Try to get Matrix user ID from environment variables
    const matrixUserId = getEnv('MATRIX_USER_ID', '');
    
    // Use Matrix user ID if available, otherwise use the default from options
    this.anchorId = this.options.anchorId || matrixUserId || null;
  }

  /**
   * Get the ID of the current active conversation
   */
  get currentConversation(): string | null {
    return this.currentConversationId;
  }

  /**
   * Start a new conversation
   * @param roomId Optional room ID for Matrix conversations
   * @returns The ID of the new conversation
   */
  async startConversation(roomId?: string): Promise<string> {
    const conversation = await this.storage.createConversation({
      interfaceType: this.interfaceType,
      roomId,
    });
    
    this.currentConversationId = conversation.id;
    return conversation.id;
  }

  /**
   * Get or create a conversation for a specific room
   * @param roomId The Matrix room ID
   * @returns The conversation ID
   */
  async getOrCreateConversationForRoom(roomId: string): Promise<string> {
    // Try to find existing conversation for this room
    const existingConversation = await this.storage.getConversationByRoomId(roomId);
    
    if (existingConversation) {
      this.currentConversationId = existingConversation.id;
      return existingConversation.id;
    }
    
    // Create a new conversation for this room
    return this.startConversation(roomId);
  }

  /**
   * Switch to an existing conversation
   * @param id The conversation ID to switch to
   * @throws Error if conversation not found
   */
  async switchConversation(id: string): Promise<void> {
    const conversation = await this.storage.getConversation(id);
    if (!conversation) {
      throw new Error(`Conversation with ID ${id} not found`);
    }
    this.currentConversationId = id;
  }

  /**
   * Check if a user is the anchor
   * @param userId The user ID to check
   * @returns True if the user is the anchor
   */
  isAnchor(userId: string): boolean {
    return this.anchorId === userId;
  }

  /**
   * Add a turn to the current conversation
   * @param query The user's query
   * @param response The AI's response
   * @param options User information and metadata
   * @throws Error if no current conversation
   */
  async addTurn(
    query: string,
    response: string,
    options?: {
      userId?: string;
      userName?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    if (!this.currentConversationId) {
      throw new Error('No active conversation. Call startConversation first.');
    }

    // Default user ID and name for CLI if not provided
    const userId = options?.userId || this.options.defaultUserId;
    const userName = options?.userName || this.options.defaultUserName;

    const turn: Omit<ConversationTurn, 'id'> = {
      timestamp: new Date(),
      query,
      response,
      userId,
      userName,
      metadata: options?.metadata,
    };

    await this.storage.addTurn(this.currentConversationId, turn);
  }

  /**
   * Get conversation history for the current conversation
   * @param maxTurns Maximum number of turns to retrieve (defaults to options.maxTurns)
   * @returns Array of conversation turns, newest last
   * @throws Error if no current conversation
   */
  async getHistory(maxTurns?: number): Promise<ConversationTurn[]> {
    if (!this.currentConversationId) {
      throw new Error('No active conversation. Call startConversation first.');
    }

    const conversation = await this.storage.getConversation(this.currentConversationId);
    if (!conversation) {
      throw new Error(`Current conversation with ID ${this.currentConversationId} not found`);
    }

    // Apply the maxTurns limit (either from parameters or from options)
    const limit = maxTurns || this.options.maxTurns;
    
    // Return most recent turns, with the most recent at the end
    return conversation.turns.slice(-limit);
  }

  /**
   * Format conversation history for inclusion in prompts
   * @returns Formatted conversation history string
   */
  async formatHistoryForPrompt(): Promise<string> {
    const history = await this.getHistory();
    
    if (history.length === 0) {
      return '';
    }

    // Format each turn with user attribution and anchor highlighting
    const formattedTurns = history.map(turn => {
      // Format user query
      let userPrefix = turn.userName || 'User';
      
      // Dynamically determine if this user is the anchor
      if (turn.userId && this.isAnchor(turn.userId)) {
        userPrefix = `${this.anchorName} (${turn.userName || 'User'})`;
      }
      
      return `${userPrefix}: ${turn.query}\nAssistant: ${turn.response}`;
    });

    return formattedTurns.join('\n\n') + '\n\n';
  }

  /**
   * Get a list of recent conversations
   * @param limit Maximum number of conversations to retrieve
   * @param interfaceType Optional filter by interface type
   */
  async getRecentConversations(limit?: number, interfaceType?: 'cli' | 'matrix'): Promise<Conversation[]> {
    return this.storage.getRecentConversations({ 
      limit,
      interfaceType: interfaceType || this.interfaceType,
    });
  }

  /**
   * Update metadata for the current conversation
   * @param metadata Metadata to update or add
   * @throws Error if no current conversation
   */
  async updateMetadata(metadata: Record<string, unknown>): Promise<void> {
    if (!this.currentConversationId) {
      throw new Error('No active conversation. Call startConversation first.');
    }

    await this.storage.updateMetadata(this.currentConversationId, metadata);
  }

  /**
   * End the current conversation (just resets the current conversation ID)
   */
  endCurrentConversation(): void {
    this.currentConversationId = null;
  }

  /**
   * Delete a conversation
   * @param id The conversation ID to delete (defaults to current conversation)
   * @returns true if deleted, false if not found
   */
  async deleteConversation(id?: string): Promise<boolean> {
    const conversationId = id || this.currentConversationId;
    
    if (!conversationId) {
      throw new Error('No conversation ID provided and no active conversation.');
    }

    const result = await this.storage.deleteConversation(conversationId);
    
    // If we deleted the current conversation, reset the current ID
    if (result && conversationId === this.currentConversationId) {
      this.currentConversationId = null;
    }
    
    return result;
  }
}