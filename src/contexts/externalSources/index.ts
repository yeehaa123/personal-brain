/**
 * External Sources Context
 * 
 * Provides access to external knowledge sources like Wikipedia and NewsAPI.
 */

// Export core context implementation
export { ExternalSourceContext } from './externalSourceContext';
export type { ExternalSourceContextConfig } from './externalSourceContext';

// Export storage adapter
export { 
  ExternalSourceStorageAdapter, 
} from './externalSourceStorageAdapter';
export type { 
  ExternalSourceStorageConfig, 
} from './externalSourceStorageAdapter';

// Export sources
export { 
  type ExternalSearchOptions,
  type ExternalSourceInterface,
  type ExternalSourceResult,
  NewsApiSource,
  WikipediaSource,
} from './sources';

// Export messaging
export { ExternalSourceContextMessaging } from './messaging/externalSourceContextMessaging';
export { ExternalSourceMessageHandler } from './messaging/externalSourceMessageHandler';
export { ExternalSourceNotifier } from './messaging/externalSourceNotifier';