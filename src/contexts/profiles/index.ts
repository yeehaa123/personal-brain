/**
 * Profiles Module Index
 * 
 * Exports only the public API of the profiles module
 * Implementation details should be imported directly from their source files
 */

// Export the ProfileContext class and its configuration
export { ProfileContext } from './profileContext';
export type { ProfileContextConfig, ProfileContextDependencies } from './profileContext';

// Export note adapter for profiles
export { ProfileNoteAdapter } from './adapters/profileNoteAdapter';