/**
 * Profiles Module Index
 * 
 * Exports only the public API of the profiles module
 * Implementation details should be imported directly from their source files
 */

// Export the ProfileContextV2 class and its configuration
export { ProfileContextV2 } from './profileContextV2';
export type { ProfileContextConfig, ProfileContextDependencies } from './profileContextV2';

// Export note adapter for profiles
export { ProfileNoteAdapter } from './adapters/profileNoteAdapter';