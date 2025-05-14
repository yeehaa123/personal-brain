/**
 * Contexts Layer
 * 
 * This module exports the domain contexts for interacting with different data domains.
 * Each context provides a specialized interface for a specific type of data or service.
 * 
 * PUBLIC API: These exports are intended for use by upstream consumers
 */

// Export domain contexts - the main public API
export { ConversationContext } from './conversations';
export { ExternalSourceContext } from './externalSources'; 
export { NoteContext } from './notes';
export { ProfileContext } from './profiles';
export { WebsiteContext } from './website';