/**
 * External sources module for MCP SDK
 * Exports interface and implementations for external knowledge sources
 * This barrel file simplifies imports from external sources
 */
export * from './externalSourceInterface';
export { WikipediaSource } from './wikipediaSource';
export { NewsApiSource } from './newsApiSource';

// Re-export common types for easier access
export type { 
  ExternalSourceInterface,
  ExternalSourceResult,
  ExternalSearchOptions
} from './externalSourceInterface';