/**
 * External Sources Context
 * 
 * Provides access to external knowledge sources like Wikipedia and NewsAPI.
 */

// Export core context implementation
export { ExternalSourceContext } from './core/externalSourceContext';
export type { ExternalSourceContextConfig } from './core/externalSourceContext';

// Export storage adapter
export { 
  ExternalSourceStorageAdapter, 
} from './adapters/externalSourceStorageAdapter';
export type { 
  ExternalSourceStorageConfig, 
} from './adapters/externalSourceStorageAdapter';

// Export sources
export { 
  type ExternalSearchOptions,
  type ExternalSourceInterface,
  type ExternalSourceResult,
  NewsApiSource,
  WikipediaSource,
} from './sources';