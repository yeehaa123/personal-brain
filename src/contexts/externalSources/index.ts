/**
 * External Sources Context
 * 
 * During migration: Exports both old and new implementations
 */

// Export both old and new implementation
export { ExternalSourceContext } from './externalSourceContext';
export { MCPExternalSourceContext } from './MCPExternalSourceContext';

// Export configuration types
export type { ExternalSourceContextConfig } from './externalSourceContext';
export type { MCPExternalSourceContextConfig } from './MCPExternalSourceContext';

// Export storage adapter for extension/configuration
export { ExternalSourceStorageAdapter } from './externalSourceStorageAdapter';