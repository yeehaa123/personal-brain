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
export type { NewConversation, ConversationSummary } from './storage/conversationStorage';