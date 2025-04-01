/**
 * Export model implementations from MCP SDK
 * This barrel file simplifies imports from the model module
 */
export { ClaudeModel } from './claude';
export { EmbeddingService } from './embeddings';

// Re-export types that are commonly used
export type { EmbeddingResult } from './embeddings';