/**
 * ConversationContext module for managing conversations
 * 
 * Exports only the core public API for the conversation context
 * Consumers should import implementation details directly from their source files
 */

// Export only the main context class and its public configuration types
export { ConversationContext } from './conversationContext';
export type { ConversationContextConfig } from './conversationContext';

// Export the storage adapter as it's needed for extension/configuration
export { ConversationStorageAdapter } from './conversationStorageAdapter';

// Export primary storage interfaces needed by public API users
export type { ConversationStorage } from './storage/conversationStorage';
export type { NewConversation, ConversationSummary, ConversationInfo } from './storage/conversationStorage';

// Export new MCP context during migration
export { MCPConversationContext } from './MCPConversationContext';
export type { MCPConversationContextOptions, ConversationToolContext } from './MCPConversationContext';

// Export service interfaces needed for MCPConversationContext
export type { ConversationResourceService } from './resources/conversationResources';
export type { ConversationMemoryService } from './services/conversationMemoryService';
export type { ConversationQueryService } from './services/conversationQueryService';
export type { ConversationToolService } from './tools/conversationTools';
export type { ConversationNotifier } from './messaging/conversationNotifier';