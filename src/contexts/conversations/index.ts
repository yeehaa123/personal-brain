/**
 * ConversationContext module for managing conversations
 * 
 * Exports the context class and its dependencies
 * Organized using the BaseContext architecture with modular components
 */

// Export the core context class
export { ConversationContext } from './core/conversationContext';
export type { 
  ConversationContextConfig,
  TurnOptions,
  HistoryOptions,
} from './core/conversationContext';

// Export the storage adapter
export { ConversationStorageAdapter } from './adapters/conversationStorageAdapter';

// Export the storage interfaces and implementations
export { type ConversationStorage } from './storage/conversationStorage';
export type {
  NewConversation,
  ConversationSummary,
  SearchCriteria,
  ConversationInfo,
} from './storage/conversationStorage';
export { InMemoryStorage } from './storage/inMemoryStorage';

// Export tiered memory components
export { TieredMemoryManager } from './memory/tieredMemoryManager';
export type { TieredMemoryConfig, TieredHistory } from './memory/tieredMemoryManager';
export { ConversationSummarizer } from './memory/summarizer';

// Export formatting components
export { ConversationFormatter } from './formatters/conversationFormatter';
export type { FormattingOptions } from './formatters/conversationFormatter';
export { 
  ConversationMcpFormatter,
  type McpFormattedConversation,
  type McpFormattingOptions,
} from './formatters/conversationMcpFormatter';

// Export service components
export { ConversationMemoryService, ConversationQueryService } from './services';
export { ConversationResourceService } from './resources';
export { ConversationToolService } from './tools';