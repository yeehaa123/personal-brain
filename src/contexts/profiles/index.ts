/**
 * Profiles Module Index
 * 
 * Exports all components of the profiles module for easy access
 */

// Export the main context class
export { ProfileContext } from './profileContext';
export type { ProfileContextConfig } from './profileContext';

// Export standardized adapters
export { ProfileStorageAdapter } from './profileStorageAdapter';

// Export formatters
export { ProfileFormatter } from './formatters/profileFormatter';

// Export types
export type { 
  NoteContext, 
  NoteWithSimilarity,
  ProfileFormattingOptions, 
} from './profileTypes';

// Export messaging
export { ProfileContextMessaging } from './messaging/profileContextMessaging';
export { ProfileMessageHandler } from './messaging/profileMessageHandler';
export { ProfileNotifier } from './messaging/profileNotifier';