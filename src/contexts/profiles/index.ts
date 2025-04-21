/**
 * Profiles Module Index
 * 
 * Exports only the public API of the profiles module
 * Implementation details should be imported directly from their source files
 */

// Export only the main context class and its configuration
export { ProfileContext } from './profileContext';
export type { ProfileContextConfig } from './profileContext';

// Export standardized adapter for extension/configuration
export { ProfileStorageAdapter } from './profileStorageAdapter';