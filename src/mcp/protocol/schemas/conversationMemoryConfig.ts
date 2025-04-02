/**
 * Configuration interfaces for ConversationMemory
 */
import type { ConversationMemoryOptions } from './conversationSchemas';
import type { ConversationMemoryStorage } from './conversationMemoryStorage';

/**
 * Configuration options for ConversationMemory constructor
 */
export interface ConversationMemoryConfig {
  interfaceType: 'cli' | 'matrix';
  storage?: ConversationMemoryStorage;
  options?: Partial<ConversationMemoryOptions>;
  apiKey?: string;
}