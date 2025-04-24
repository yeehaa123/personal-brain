/**
 * Contexts Layer
 * 
 * This module exports the context components for interacting with different data domains.
 * Each context provides a specialized interface for a specific type of data or service.
 * 
 * PUBLIC API: These exports are intended for use by upstream consumers
 */

// Export interfaces and base context
export { BaseContext } from './baseContext';
export type { 
  CoreContextInterface, 
  McpContextInterface, 
  ContextStatus,
  ContextCapabilities,
} from './contextInterface';
export type { FormatterInterface } from './formatterInterface';
export type { StorageInterface } from './storageInterface';

// Domain contexts - the main public API for each domain
export { ConversationContext } from './conversations';
export { ExternalSourceContext } from './externalSources'; 
export { NoteContext } from './notes';
export { ProfileContext } from './profiles';
export { WebsiteContext } from './website';