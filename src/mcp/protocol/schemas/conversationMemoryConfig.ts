/**
 * Configuration interfaces for ConversationMemory
 */
import type { ConversationMemoryStorage } from './conversationMemoryStorage';
import type { ConversationMemoryOptions } from './conversationSchemas';

/**
 * Configuration options for ConversationMemory constructor
 */
export interface ConversationMemoryConfig {
  interfaceType: 'cli' | 'matrix';
  storage?: ConversationMemoryStorage;
  options?: Partial<ConversationMemoryOptions>;
  apiKey?: string;
}