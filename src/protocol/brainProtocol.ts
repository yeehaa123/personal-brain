/**
 * BrainProtocol orchestrates the interaction between models and context
 * This is the primary export from the protocol layer
 */

// Re-export from core implementation
export { BrainProtocol } from './core/brainProtocol';

// Export types needed by consumers of the protocol
export type { BrainProtocolOptions, ProtocolResponse, QueryOptions, QueryResult } from './types';