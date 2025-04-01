/**
 * MCP SDK implementation for Personal Brain
 * Main entry point for the MCP SDK integration
 */

// Export all the context implementations from their respective directories
export { NoteContext } from './contexts/notes';
export { ProfileContext } from './contexts/profiles';
export { ExternalSourceContext } from './contexts/externalSources';

// Export our type definitions
export * from './types';