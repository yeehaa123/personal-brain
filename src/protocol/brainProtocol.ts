/**
 * BrainProtocol orchestrates the interaction between models and context
 * This is the primary export from the protocol layer
 */

// Re-export BrainProtocolIntegrated as BrainProtocol for backward compatibility
import { BrainProtocolIntegrated } from './core/brainProtocolIntegrated';
export { BrainProtocolIntegrated as BrainProtocol };

// Export types needed by consumers of the protocol
export type { BrainProtocolOptions, ProtocolResponse, QueryOptions, QueryResult } from './types';