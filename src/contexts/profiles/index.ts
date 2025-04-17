/**
 * Profiles Module Index
 * 
 * Exports all components of the profiles module for easy access
 */

// Export the main context class using the new standardized implementation
export { ProfileContext } from './core/profileContext';
export type { ProfileContextConfig } from './core/profileContext';

// Export standardized adapters
export { ProfileStorageAdapter } from './adapters/profileStorageAdapter';

// Export formatters
export { ProfileFormatter } from './formatters/profileFormatter';

// Export types
export type { 
  NoteContext, 
  NoteWithSimilarity,
  ProfileFormattingOptions, 
} from './types/profileTypes';