/**
 * Tiered ConversationMemory class for managing conversation history
 */
import { getEnv } from '@/utils/configUtils';
import logger from '@utils/logger';


// nanoid is used for ID generation across the application
import type { ConversationMemoryStorage } from '../schemas/conversationMemoryStorage';
import { ConversationMemoryOptionsSchema } from '../schemas/conversationSchemas';
import type {
  Conversation,
  ConversationMemoryOptions,
  ConversationSummary,
  ConversationTurn,
} from '../schemas/conversationSchemas';

import { InMemoryStorage } from './inMemoryStorage';
import { ConversationSummarizer } from './summarizer';



/**
 * Configuration options for ConversationMemory constructor
 */
interface ConversationMemoryConfig {
  interfaceType: 'cli' | 'matrix';
  storage?: ConversationMemoryStorage;
  options?: Partial<ConversationMemoryOptions>;
  apiKey?: string;
}

/**
 * Tiered ConversationMemory class that manages conversation history with
 * active, summary, and archive tiers for efficient token usage
 */
export class ConversationMemory {
  private storage: ConversationMemoryStorage;
  private options: ConversationMemoryOptions;
  private currentConversationId: string | null = null;
  private anchorId: string | null = null;
  private anchorName: string;
  private interfaceType: 'cli' | 'matrix';
  private summarizer: ConversationSummarizer;

  /**
   * Create a new ConversationMemory instance
   * @param config Configuration object
   */
  constructor(config: ConversationMemoryConfig) {
    // Store the interface type
    this.interfaceType = config.interfaceType;
    
    // Use provided storage or create in-memory storage as default
    // Note: In production, we use the singleton instance, but tests should use createFresh()
    // for proper isolation. This way we avoid test interference.
    this.storage = config.storage || InMemoryStorage.getInstance();
    
    // Parse and validate options with defaults from the schema
    this.options = ConversationMemoryOptionsSchema.parse(config.options || {});
    
    // Initialize anchor information from environment/options
    this.initializeAnchorInfo();
    
    // Store anchor name from options
    this.anchorName = this.options.anchorName;
    
    // Initialize summarizer
    this.summarizer = new ConversationSummarizer(config.apiKey);
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
   * Access the storage directly
   */
  getConversationMemory(): { storage: ConversationMemoryStorage } {
    return { storage: this.storage };
  }

  /**
   * Start a new conversation with a specified room ID
   * @param roomId Room ID (required for both CLI and Matrix)
   * @returns The ID of the new conversation
   */
  async startConversation(roomId: string): Promise<string> {
    const conversation = await this.storage.createConversation({
      interfaceType: this.interfaceType,
      roomId,
    });
    
    this.currentConversationId = conversation.id;
    return conversation.id;
  }

  /**
   * Get or create a conversation for a specific room
   * This is now the primary method for both CLI and Matrix
   * @param roomId The room ID (CLI or Matrix)
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

    // Add the turn to the active tier
    const updatedConversation = await this.storage.addTurn(this.currentConversationId, turn);
    
    // Check if we need to manage the memory tiers
    await this.manageTiers(updatedConversation);
  }

  /**
   * Manage memory tiers by summarizing and archiving as needed
   * @param conversation The current conversation
   */
  private async manageTiers(conversation: Conversation): Promise<void> {
    try {
      // If active turns exceed the max, summarize older turns
      if (conversation.activeTurns.length > this.options.maxActiveTurns) {
        await this.summarizeOldestActiveTurns(conversation);
      }
      
      // If summaries exceed the max, remove the oldest summaries
      if (conversation.summaries.length > this.options.maxSummaries) {
        // For now, we just remove the oldest summaries over the limit
        // In a more advanced implementation, we could merge older summaries
        const excessSummaries = conversation.summaries.length - this.options.maxSummaries;
        if (excessSummaries > 0) {
          // We don't actually delete them, just accept there will be excess
          // In a database implementation, we might want to remove them
          logger.debug(`Conversation has ${excessSummaries} excess summaries over the limit`);
        }
      }
      
      // If archived turns exceed the max, remove the oldest archived turns
      if (conversation.archivedTurns.length > this.options.maxArchivedTurns) {
        // For now, we just accept there will be excess archived turns
        // In a database implementation, we might want to remove them
        const excessArchives = conversation.archivedTurns.length - this.options.maxArchivedTurns;
        if (excessArchives > 0) {
          logger.debug(`Conversation has ${excessArchives} excess archived turns over the limit`);
        }
      }
    } catch (error) {
      logger.error('Error managing memory tiers:', error);
      // Continue even if tier management fails
    }
  }

  /**
   * Summarize the oldest turns in the active tier and move them to archive
   * @param conversation The current conversation
   */
  private async summarizeOldestActiveTurns(conversation: Conversation): Promise<void> {
    if (!this.currentConversationId) {
      return;
    }

    if (conversation.activeTurns.length <= this.options.maxActiveTurns) {
      // No need to summarize if we're under the limit
      return;
    }

    try {
      // Determine how many turns to summarize (keeping the most recent ones)
      const turnsToSummarize = Math.min(
        this.options.summaryTurnCount,
        conversation.activeTurns.length - Math.floor(this.options.maxActiveTurns * 0.8),
      );
      
      if (turnsToSummarize < 2) {
        // Need at least 2 turns to make a meaningful summary
        return;
      }
      
      // Get the oldest turns to summarize
      const turnsToProcess = conversation.activeTurns.slice(0, turnsToSummarize);
      
      // Create a summary
      const summary = await this.summarizer.summarizeTurns(turnsToProcess);
      
      // Add the summary to the summary tier
      await this.storage.addSummary(this.currentConversationId, summary);
      
      // Move the turns from active to archive
      const turnIndices = Array.from({ length: turnsToSummarize }, (_, i) => i);
      await this.storage.moveTurnsToArchive(this.currentConversationId, turnIndices);
      
      logger.debug(`Summarized ${turnsToSummarize} turns into memory tier: summary`);
    } catch (error) {
      logger.error('Error summarizing turns:', error);
      // Continue even if summarization fails
    }
  }

  /**
   * Get conversation history from all tiers
   * @param maxActiveTurns Maximum number of active turns to retrieve (defaults to options.maxActiveTurns)
   * @returns Object containing turns from each tier
   * @throws Error if no current conversation
   */
  async getTieredHistory(maxActiveTurns?: number): Promise<{
    activeTurns: ConversationTurn[];
    summaries: ConversationSummary[];
    archivedTurns: ConversationTurn[];
  }> {
    if (!this.currentConversationId) {
      throw new Error('No active conversation. Call startConversation first.');
    }

    const conversation = await this.storage.getConversation(this.currentConversationId);
    if (!conversation) {
      throw new Error(`Current conversation with ID ${this.currentConversationId} not found`);
    }

    // Apply the maxTurns limit to active turns (either from parameters or from options)
    const limit = maxActiveTurns || this.options.maxActiveTurns;
    
    // Return most recent active turns, with the most recent at the end
    return {
      activeTurns: conversation.activeTurns.slice(-limit),
      summaries: conversation.summaries,
      archivedTurns: conversation.archivedTurns,
    };
  }

  /**
   * Get active conversation turns
   * @param maxTurns Maximum number of turns to retrieve (defaults to options.maxActiveTurns)
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
    const limit = maxTurns || this.options.maxActiveTurns;
    
    // Return most recent turns, with the most recent at the end
    return conversation.activeTurns.slice(-limit);
  }

  /**
   * Format conversation history for inclusion in prompts
   * @returns Formatted conversation history string
   */
  async formatHistoryForPrompt(): Promise<string> {
    if (!this.currentConversationId) {
      return '';
    }
    
    try {
      // Get tiered history
      const { activeTurns, summaries } = await this.getTieredHistory();
      
      let historyText = '';
      
      // Add summaries first (oldest to newest)
      if (summaries.length > 0) {
        historyText += 'CONVERSATION SUMMARIES:\n';
        
        // Sort summaries by timestamp (oldest first)
        const sortedSummaries = [...summaries].sort(
          (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
        );
        
        sortedSummaries.forEach((summary, index) => {
          historyText += `Summary ${index + 1}: ${summary.content}\n\n`;
        });
        
        historyText += 'RECENT CONVERSATION:\n';
      }
      
      // Add active turns
      if (activeTurns.length === 0) {
        return historyText;
      }
      
      // Format each turn with user attribution and anchor highlighting
      const formattedTurns = activeTurns.map(turn => {
        // Format user query
        let userPrefix = turn.userName || 'User';
        
        // Dynamically determine if this user is the anchor
        if (turn.userId && this.isAnchor(turn.userId)) {
          userPrefix = `${this.anchorName} (${turn.userName || 'User'})`;
        }
        
        return `${userPrefix}: ${turn.query}\nAssistant: ${turn.response}`;
      });
      
      historyText += formattedTurns.join('\n\n') + '\n\n';
      
      return historyText;
    } catch (error) {
      logger.error('Error formatting history for prompt:', error);
      return '';
    }
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
  
  /**
   * Force summarize the active turns (for testing or manual management)
   * @returns The created summary if successful
   */
  async forceSummarizeActiveTurns(): Promise<ConversationSummary | null> {
    if (!this.currentConversationId) {
      throw new Error('No active conversation. Call startConversation first.');
    }
    
    const conversation = await this.storage.getConversation(this.currentConversationId);
    if (!conversation) {
      throw new Error(`Current conversation with ID ${this.currentConversationId} not found`);
    }
    
    if (conversation.activeTurns.length < 2) {
      throw new Error('Need at least 2 turns to create a summary');
    }
    
    // Take the oldest half of active turns to summarize
    const turnsToSummarize = Math.max(2, Math.floor(conversation.activeTurns.length / 2));
    const turnsToProcess = conversation.activeTurns.slice(0, turnsToSummarize);
    
    try {
      // Create a summary
      const summary = await this.summarizer.summarizeTurns(turnsToProcess);
      
      // Add the summary to the summary tier
      await this.storage.addSummary(this.currentConversationId, summary);
      
      // Move the turns from active to archive
      const turnIndices = Array.from({ length: turnsToSummarize }, (_, i) => i);
      await this.storage.moveTurnsToArchive(this.currentConversationId, turnIndices);
      
      logger.info(`Manually summarized ${turnsToSummarize} turns into the summary tier`);
      
      return summary;
    } catch (error) {
      logger.error('Error during manual summarization:', error);
      return null;
    }
  }
}