/**
 * Export protocol module from MCP SDK
 * This barrel file simplifies imports from the protocol module
 */
export { BrainProtocol } from './brainProtocol';
export * from './types';
export * from './components';

// Common protocol types for easier access
export type { ProtocolResponse, ExternalCitation } from './types';