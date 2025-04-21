/**
 * Protocol Layer
 * 
 * Coordinates interactions between contexts and resources using the brain protocol architecture.
 * This layer contains the main protocol implementation and its supporting components.
 * 
 * This barrel file only exports the public API components that should be used by external consumers.
 * Implementation details should be imported directly from their source files.
 */

// Export only the main protocol implementation
export { BrainProtocol } from './core/brainProtocol';
export type { BrainProtocolConfig } from './config/brainProtocolConfig';

// Export the primary types for public API usage
export type { IBrainProtocol, QueryResult, QueryOptions } from './types';

// Export public adapter interfaces
export type { ProtocolAdapter } from './adapters/adapterInterface';