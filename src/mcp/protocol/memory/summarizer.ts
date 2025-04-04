/**
 * Conversation Summarizer for Tiered Memory
 */
import { v4 as uuidv4 } from 'uuid';

import { ClaudeModel } from '@/mcp/model';
import logger from '@utils/logger';

import type { ConversationSummary, ConversationTurn } from '../schemas/conversationSchemas';

/**
 * Service for summarizing conversation turns
 */
export class ConversationSummarizer {
  private model: ClaudeModel;

  /**
   * Create a new summarizer
   * @param apiKey Optional API key for Claude
   */
  constructor(apiKey?: string) {
    this.model = new ClaudeModel(apiKey);
  }

  /**
   * Summarize a sequence of conversation turns
   * @param turns The conversation turns to summarize
   * @returns A summary object
   */
  async summarizeTurns(turns: ConversationTurn[]): Promise<ConversationSummary> {
    if (!turns || turns.length === 0) {
      throw new Error('Cannot summarize empty turns array');
    }

    // Sort turns by timestamp to ensure chronological order
    const sortedTurns = [...turns].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime(),
    );

    const turnTexts = sortedTurns.map(turn => {
      const userPrefix = turn.userName || 'User';
      return `${userPrefix}: ${turn.query}\nAssistant: ${turn.response}`;
    });

    // Combine turns and create a prompt
    const conversationText = turnTexts.join('\n\n');
    const prompt = this.createSummarizationPrompt(conversationText);

    try {
      // Get summary from Claude
      const response = await this.model.complete(
        this.getSystemPrompt(),
        prompt,
      );

      // Create summary object
      const summary: ConversationSummary = {
        id: uuidv4(),
        timestamp: new Date(),
        content: response.response.trim(),
        startTurnIndex: 0, // These will be set by the caller
        endTurnIndex: turns.length - 1,
        startTimestamp: sortedTurns[0].timestamp,
        endTimestamp: sortedTurns[sortedTurns.length - 1].timestamp,
        turnCount: turns.length,
        metadata: {
          originalTurnIds: sortedTurns.map(turn => turn.id),
        },
      };

      return summary;
    } catch (error) {
      logger.error('Failed to generate conversation summary:', error);
      
      // Fallback to a basic summary if the model fails
      return this.createFallbackSummary(sortedTurns);
    }
  }

  /**
   * Create a system prompt for summarization
   */
  private getSystemPrompt(): string {
    return `You are a specialized AI assistant that creates concise, informative summaries of conversations. 
    Your task is to extract the key points, main topics, and important details from a conversation between a user and an assistant.
    Your summary should:
    - Be under 250 words
    - Highlight the main topics discussed
    - Note any important decisions, information, or action items
    - Capture the overall flow of the conversation
    - Maintain an objective, neutral tone
    - Focus on factual content rather than opinions
    - Exclude any irrelevant or redundant information
    
    You MUST maintain the third-person perspective and avoid adding your own commentary or analysis.`;
  }

  /**
   * Create a prompt for summarizing conversation text
   */
  private createSummarizationPrompt(conversationText: string): string {
    return `Please summarize the following conversation, focusing on the key topics and important details:

${conversationText}

Summary:`;
  }

  /**
   * Create a fallback summary if the model fails
   */
  private createFallbackSummary(turns: ConversationTurn[]): ConversationSummary {
    // Create a basic summary from the first and last few turns
    const topics = new Set<string>();
    
    // Extract potential topics from the first 3 words of each query
    turns.forEach(turn => {
      const words = turn.query.split(/\s+/).slice(0, 3);
      if (words.length > 0 && words[0].length > 3) {
        topics.add(words[0]);
      }
    });
    
    const topicsList = Array.from(topics).slice(0, 5).join(', ');
    const firstQuery = turns[0].query.length > 50 
      ? turns[0].query.substring(0, 50) + '...' 
      : turns[0].query;
    
    const lastQuery = turns[turns.length - 1].query.length > 50 
      ? turns[turns.length - 1].query.substring(0, 50) + '...' 
      : turns[turns.length - 1].query;
    
    const content = `This conversation contains ${turns.length} turns, starting with "${firstQuery}" and ending with "${lastQuery}". Topics include: ${topicsList || 'various subjects'}.`;

    return {
      id: uuidv4(),
      timestamp: new Date(),
      content,
      startTurnIndex: 0,
      endTurnIndex: turns.length - 1,
      startTimestamp: turns[0].timestamp,
      endTimestamp: turns[turns.length - 1].timestamp,
      turnCount: turns.length,
      metadata: {
        isFallback: true,
        originalTurnIds: turns.map(turn => turn.id),
      },
    };
  }
}