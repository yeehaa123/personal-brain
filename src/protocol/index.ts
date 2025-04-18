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

// Re-export router (avoiding naming conflicts) - only include what's needed 
export type { Route, MessageHandler } from './router/router';
// Re-export other router components, but avoid exporting everything
export { TargetResolver } from './router/resolvers/targetResolver';
export * from './router/rules/queryRules';
export * from './router/rules/commandRules';

// Re-export messaging system for cross-context communication
export * from './messaging';

// Re-export schemas (for backward compatibility, with explicit exports to avoid naming conflicts)
// These will be moved to formats/schemas in a future refactoring step
export type { ConversationContextConfig } from './schemas/conversationContextConfig';
export type { 
  Conversation, 
  ConversationOptions, 
  ConversationSummary, 
  ConversationTurn,
  MemoryTier,
} from './schemas/conversationSchemas';
export { 
  ConversationOptionsSchema, 
  ConversationSchema, 
  ConversationSummarySchema, 
  ConversationTurnSchema,
  MemoryTierEnum,
} from './schemas/conversationSchemas';
export * from './schemas/standardResponseSchema';

// Re-export types
export * from './types';