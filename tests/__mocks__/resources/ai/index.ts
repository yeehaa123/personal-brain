/**
 * Export all AI resource mock implementations
 */
export * from './claude';
export * from './embedding';

// Re-export this as MockEmbeddingService for compatibility
export { EmbeddingService as MockEmbeddingService } from './embedding/embeddings';