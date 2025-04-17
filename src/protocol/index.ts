/**
 * Protocol Layer
 * 
 * Coordinates interactions between contexts and resources using the brain protocol architecture.
 * This layer contains the main protocol implementation and its supporting components.
 */

// Re-export protocol core implementations
export * from './core/brainProtocol';
export * from './brainProtocol';

// Re-export protocol components
export * from './components';

// Re-export managers
export * from './managers';

// Re-export config
export * from './config/brainProtocolConfig';

// Re-export schemas
export * from './schemas/conversationContextConfig';
export * from './schemas/conversationSchemas';
export * from './schemas/standardResponseSchema';

// Re-export types
export * from './types';