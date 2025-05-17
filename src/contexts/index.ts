/**
 * Contexts Layer
 * 
 * This module exports the domain contexts for interacting with different data domains.
 * Each context provides a specialized interface for a specific type of data or service.
 * 
 * PUBLIC API: These exports are intended for use by upstream consumers
 */

// Export domain contexts - the old implementations (to be removed)
export { ConversationContext } from './conversations';
export { ExternalSourceContext } from './externalSources'; 
export { NoteContext } from './notes';
export { ProfileContext } from './profiles';
export { WebsiteContext } from './website';

// Export new MCP implementations - the future public API
export { MCPConversationContext } from './conversations';
export { MCPExternalSourceContext } from './externalSources';
export { MCPNoteContext } from './notes';
export { MCPProfileContext } from './profiles';
export { MCPWebsiteContext } from './website';