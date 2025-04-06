/**
 * Export all MCP contexts
 */

// Export Profiles context - includes NoteContext interface
// Export Notes context - includes NoteContext class implementation
// Re-export with explicit name to avoid ambiguity with the interface
import { NoteContext } from './notes';

export * from './profiles';
export { NoteContext };

// Export ExternalSources context
export * from './externalSources';

// Export Conversations context
export * from './conversations';