/**
 * MCP SDK implementation for Personal Brain
 * Main entry point for the MCP SDK integration
 */

// Export the NoteContext implementation using MCP SDK
export { NoteContext } from './noteContext';

// Export the ProfileContext implementation using MCP SDK
export { ProfileContext } from './profiles';

// Export the ExternalSourceContext implementation using MCP SDK
export { ExternalSourceContext } from './contexts/externalSources';

// Export our type definitions
export * from './types';