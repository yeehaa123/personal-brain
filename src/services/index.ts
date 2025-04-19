/**
 * Services Layer - Internal application services
 * 
 * This module serves as the entry point for the services layer,
 * providing access to internal services through a standardized interface.
 */

// Re-export ServiceRegistry
export * from './serviceRegistry';

// Re-export repositories
export * from './notes';
export * from './profiles';

// Re-export interfaces
export * from './interfaces/IEmbeddingService';
export * from './interfaces/IRepository';
export * from './interfaces/ISearchService';