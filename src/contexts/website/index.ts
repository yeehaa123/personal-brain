/**
 * Website Context - Manages website generation and publication
 * 
 * During migration: Exports both old and new implementations
 */

// Export both old and new implementation
export { WebsiteContext } from './websiteContext';
export { MCPWebsiteContext } from './MCPWebsiteContext';

// Export configuration types
export type { WebsiteContextConfig, WebsiteContextDependencies } from './websiteContext';
export type { MCPWebsiteContextConfig, MCPWebsiteContextDependencies } from './MCPWebsiteContext';

// Type exports for configuration
export type { WebsiteStorageAdapter } from './adapters/websiteStorageAdapter';
export type { DeploymentAdapter } from './adapters/deploymentAdapter';