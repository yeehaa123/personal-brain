/**
 * Contexts Layer
 * 
 * This module exports the context components for interacting with different data domains.
 * Each context provides a specialized interface for a specific type of data or service.
 * 
 * PUBLIC API: These exports are intended for use by upstream consumers
 */

// Export core interfaces and base context
export { BaseContext } from './core';
export type { 
  CoreContextInterface, 
  McpContextInterface, 
  FormatterInterface, 
  StorageInterface, 
  ContextStatus,
  ContextCapabilities,
} from './core';

// Domain contexts - the main public API for each domain
export { ConversationContext } from './conversations';
export { ExternalSourceContext } from './externalSources'; 
export { NoteContext } from './notes';
export { ProfileContext } from './profiles';
export { WebsiteContext } from './website';