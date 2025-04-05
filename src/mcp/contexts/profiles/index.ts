/**
 * Profiles Module Index
 * 
 * Exports all components of the profiles module for easy access
 */

// Export the main context class
export { ProfileContext } from './profileContext';

// Export subcomponents
export { ProfileFormatter } from './formatters/profileFormatter';
export { ProfileMcpResources } from './mcp/profileMcpResources';
export { ProfileMcpTools } from './mcp/profileMcpTools';

// Export types
export type { 
  NoteContext, 
  NoteWithSimilarity,
  ProfileFormattingOptions, 
} from './types/profileTypes';