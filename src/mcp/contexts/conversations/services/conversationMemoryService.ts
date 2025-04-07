/**
 * Conversation Memory Service
 * 
 * Handles conversation memory management operations.
 */

import type { ConversationStorageAdapter } from '@/mcp/contexts/conversations/adapters/conversationStorageAdapter';
import type { TieredHistory, TieredMemoryConfig } from '@/mcp/contexts/conversations/memory/tieredMemoryManager';
import { TieredMemoryManager } from '@/mcp/contexts/conversations/memory/tieredMemoryManager';
import type { ConversationStorage, ConversationSummary } from '@/mcp/contexts/conversations/storage/conversationStorage';
import type { ConversationTurn } from '@/mcp/protocol/schemas/conversationSchemas';
import logger from '@/utils/logger';

/**
 * Service for handling conversation memory management
 */
export class ConversationMemoryService {
  private tieredMemoryManager: TieredMemoryManager;

  /**
   * Constructor
   * 
   * @param storageAdapter The storage adapter to use
   * @param tieredMemoryConfig Configuration for tiered memory management
   */
  constructor(
    private storageAdapter: ConversationStorageAdapter,
    tieredMemoryConfig: Partial<TieredMemoryConfig> = {},
  ) {
    // Initialize the tiered memory manager
    this.tieredMemoryManager = new TieredMemoryManager(
      this.getStorageImplementation(),
      tieredMemoryConfig,
    );

    logger.debug('ConversationMemoryService initialized', { context: 'ConversationMemoryService' });
  }

  /**
   * Get the underlying storage implementation
   * 
   * @returns The storage implementation
   */
  private getStorageImplementation(): ConversationStorage {
    return this.storageAdapter.getStorageImplementation();
  }

  /**
   * Add a turn to a conversation
   * 
   * @param conversationId The conversation ID
   * @param turn The turn to add
   * @returns The ID of the added turn
   */
  async addTurn(conversationId: string, turn: Partial<ConversationTurn>): Promise<string> {
    const turnId = await this.storageAdapter.addTurn(conversationId, turn);
    
    // Check if summarization is needed
    await this.checkAndSummarize(conversationId);
    
    return turnId;
  }

  /**
   * Get turns for a conversation
   * 
   * @param conversationId The conversation ID
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
   * Get summaries for a conversation
   * 
   * @param conversationId The conversation ID
   * @returns Array of conversation summaries
   */
  async getSummaries(conversationId: string): Promise<ConversationSummary[]> {
    return this.storageAdapter.getSummaries(conversationId);
  }

  /**
   * Check and potentially summarize older turns
   * 
   * @param conversationId The conversation ID
   * @returns True if summarization was performed
   */
  async checkAndSummarize(conversationId: string): Promise<boolean> {
    return this.tieredMemoryManager.checkAndSummarize(conversationId);
  }

  /**
   * Force summarization of active turns in a conversation
   * 
   * @param conversationId The conversation ID
   * @returns True if summarization was successful
   */
  async forceSummarize(conversationId: string): Promise<boolean> {
    return this.tieredMemoryManager.forceSummarize(conversationId);
  }

  /**
   * Get tiered history for a conversation
   * 
   * @param conversationId The conversation ID
   * @returns Tiered history object
   */
  async getTieredHistory(conversationId: string): Promise<TieredHistory> {
    return this.tieredMemoryManager.getTieredHistory(conversationId);
  }

  /**
   * Format history for inclusion in prompts
   * 
   * @param conversationId The conversation ID
   * @param maxTokens Maximum tokens to include
   * @returns Formatted history string
   */
  async formatHistoryForPrompt(conversationId: string, maxTokens?: number): Promise<string> {
    return this.tieredMemoryManager.formatHistoryForPrompt(conversationId, maxTokens);
  }

  /**
   * Update tiered memory configuration
   * 
   * @param config New configuration options
   */
  updateConfig(config: Partial<TieredMemoryConfig>): void {
    this.tieredMemoryManager.setConfig(config);
  }
}