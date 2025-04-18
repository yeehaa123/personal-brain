/**
 * Protocol Adapters
 * 
 * This module provides adapters for translating between external interfaces
 * and the internal protocol message format.
 */

// Export adapter interfaces
export * from './protocolAdapter';

// Export concrete adapter implementations
export * from './cliAdapter';
export * from './matrixAdapter';