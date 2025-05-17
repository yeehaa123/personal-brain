/**
 * ConversationContext module for managing conversations
 * 
 * During migration: Exports both old and new implementations
 */

// Export both old and new implementation
export { ConversationContext } from './conversationContext';
export { MCPConversationContext } from './MCPConversationContext';

// Export configuration types for both
export type { ConversationContextConfig } from './conversationContext';
export type { MCPConversationContextOptions, ConversationToolContext } from './MCPConversationContext';

// Export the storage adapter as it's needed for extension/configuration
export { ConversationStorageAdapter } from './conversationStorageAdapter';

// Export primary storage interfaces needed by public API users
export type { ConversationStorage } from './storage/conversationStorage';
export type { NewConversation, ConversationSummary, ConversationInfo } from './storage/conversationStorage';

// Export service interfaces needed for MCPConversationContext
export type { ConversationResourceService } from './resources/conversationResources';
export type { ConversationMemoryService } from './services/conversationMemoryService';
export type { ConversationQueryService } from './services/conversationQueryService';
export type { ConversationToolService } from './tools/conversationTools';
export type { ConversationNotifier } from './messaging/conversationNotifier';