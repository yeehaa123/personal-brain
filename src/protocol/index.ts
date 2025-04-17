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

// Re-export message formats and schemas
export * from './formats';

// Re-export translators
export * from './translators';

// Re-export adapters
export * from './adapters';

// Re-export router
export * from './router';

// Re-export schemas (for backward compatibility)
// These will be moved to formats/schemas in a future refactoring step
export * from './schemas/conversationContextConfig';
export * from './schemas/conversationSchemas';
export * from './schemas/standardResponseSchema';

// Re-export types
export * from './types';