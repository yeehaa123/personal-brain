/**
 * External Sources Context
 * 
 * Provides access to external knowledge sources like Wikipedia and NewsAPI.
 * Exports only the public API components.
 */

// Export core context implementation
export { ExternalSourceContext } from './externalSourceContext';
export type { ExternalSourceContextConfig } from './externalSourceContext';

// Export storage adapter for extension/configuration
export { ExternalSourceStorageAdapter } from './externalSourceStorageAdapter';