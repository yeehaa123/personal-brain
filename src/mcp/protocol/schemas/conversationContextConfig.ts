/**
 * Configuration interfaces for ConversationContext
 */
import type { ConversationStorage } from '@/mcp/contexts/conversations/storage/conversationStorage';

import type { ConversationOptions } from './conversationSchemas';

/**
 * Configuration options for ConversationContext constructor
 */
export interface ConversationContextConfig {
  name?: string;
  version?: string;
  storage?: ConversationStorage;
  options?: Partial<ConversationOptions>;
  apiKey?: string;
  anchorName?: string;
  defaultUserName?: string;
}