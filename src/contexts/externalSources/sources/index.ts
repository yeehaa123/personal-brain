/**
 * External sources module for Model Context Protocol
 * Exports interface and implementations for external knowledge sources
 * This barrel file simplifies imports from external sources
 */
import type {
  ExternalSourceInterface,
  ExternalSourceResult,
  ExternalSearchOptions,
} from './externalSourceInterface';

import { WikipediaSource } from './wikipediaSource';
import { NewsApiSource } from './newsApiSource';

// Export class implementations
export { WikipediaSource, NewsApiSource };

export type {
  ExternalSourceInterface,
  ExternalSourceResult,
  ExternalSearchOptions,
} 
